import { validateDashboardSessionCandidate } from "../charting/config/dashboardBundleV3.js";
import { decodeAssetBase64, sha256HexSync } from "../static-content/assets/assetPayloadEnvelope.js";
import { IMAGE_ASSET_LIMITS, inspectRasterMetadata, inspectImageAnimation } from "../static-content/image/imageAssetValidation.js";
import { dashboardPackageMergeRevision } from "./dashboardPackageMerge.js";

const transactions = new WeakMap();

/** The controller serializes accepted configuration; the asset store serializes
 * staging owners across the snapshot/commit/compensation boundary. */
export function commitDashboardPackageMerge({ proposal, expectedRevision = proposal?.expectedRevision,
  transactionId, controller, store, prepare = async () => {}, persist, readCommitted, validateAsset = async () => {} } = {}) {
  if (!transactionId || !controller?.runTransaction || typeof readCommitted !== "function") return Promise.reject(new Error("A reviewed import identity and authoritative commit boundary are required."));
  proposal = structuredClone(proposal);
  let records = transactions.get(controller);
  if (!records) { records = new Map(); transactions.set(controller, records); }
  if ([...records.values()].some(record => record.uncertain)) return Promise.reject(ambiguous(new Error("An earlier import still requires authoritative recovery.")));
  const signature = JSON.stringify([expectedRevision, proposal?.config, proposal?.assetPayloads]);
  const existing = records.get(transactionId);
  if (existing && existing.signature !== signature) return Promise.reject(new Error("This import review changed. Confirm a new reviewed transaction."));
  if (existing?.promise) return existing.promise;
  const record = existing ?? { signature };
  const run = async () => {
    if (!proposal || proposal.issues.some(issue => issue.blocking)) throw new Error("Resolve the import review before committing.");
    await prepare();
    return controller.runTransaction(async boundary => {
      if ([...records.values()].some(record => record.uncertain)) throw ambiguous(new Error("An earlier queued import requires authoritative recovery."));
      const current = boundary.getCurrent();
      if (dashboardPackageMergeRevision(current) !== expectedRevision) throw new Error("The destination changed since review. Refresh the import review before confirming.");
      validateDashboardSessionCandidate(proposal.config);
      if (Object.values(proposal.config.assets ?? {}).reduce((sum, asset) => sum + asset.byteLength, 0) > IMAGE_ASSET_LIMITS.dashboardBudgetBytes) throw new Error("The combined dashboard exceeds the 200 MiB authored-image budget.");
      const perform = async assets => {
        const entries = Object.entries(proposal.assetPayloads ?? {}).sort();
        const snapshot = entries.length ? await assets.snapshot(entries.map(([id]) => id)) : null;
        try {
          for (const id of proposal.reusedAssetIds ?? []) await assets.verify(id);
          for (const [assetId, payload] of entries) {
            const manifest = proposal.config.assets?.[assetId];
            const bytes = decodeAssetBase64(payload.base64);
            validatePayload(assetId, bytes, payload, manifest);
            await validateAsset({ assetId, bytes, payload, manifest });
            const staged = await assets.stage({ bytes, ...manifest, transactionId });
            if (staged.assetId !== assetId) throw new Error("Imported image content identity does not match its bytes.");
            await assets.verify(assetId);
          }
          if (entries.length) await assets.commitMany(entries.map(([id]) => id), { transactionId });
          let committed;
          try {
            committed = await boundary.replaceWith(proposal.config, persist);
          } catch (error) {
            let authoritative;
            try { authoritative = await readCommitted(); }
            catch (cause) { throw ambiguous(error, cause); }
            if (mergeApplied(authoritative, proposal.config)) {
              committed = await boundary.replaceWith(authoritative, async value => value);
            } else if (comparable(authoritative) !== comparable(current)) {
              throw ambiguous(error);
            } else throw error;
          }
          return { config: committed, summary: proposal.summary, identityMap: proposal.identityMap, transactionId };
        } catch (error) {
          if (error.code === "IMPORT_OUTCOME_UNKNOWN") { record.uncertain = true; throw error; }
          // Only our selected IDs are restored, while all other owners are
          // excluded by the shared store transaction until compensation ends.
          if (snapshot) await assets.restore(snapshot);
          throw error;
        }
      };
      const hasAssets = Object.keys(proposal.assetPayloads ?? {}).length || proposal.reusedAssetIds?.length;
      if (hasAssets && typeof store?.runTransaction !== "function") throw new Error("Atomic authored image storage is required for this import.");
      return store?.runTransaction ? store.runTransaction(perform) : perform(null);
    });
  };
  record.promise = run().catch(error => {
    if (!record.uncertain) record.promise = null;
    throw error;
  });
  records.set(transactionId, record);
  return record.promise;
}

function validatePayload(id, bytes, payload, manifest) {
  if (!manifest || id !== `asset-${payload.sha256}` || payload.sha256 !== sha256HexSync(bytes)
    || payload.sha256 !== manifest.sha256 || payload.byteLength !== bytes.byteLength || payload.byteLength !== manifest.byteLength
    || payload.mediaType !== manifest.mediaType || bytes.byteLength > IMAGE_ASSET_LIMITS.maxBytes) throw new Error("Imported image payload does not match its verified manifest.");
  const intrinsic = inspectRasterMetadata(bytes), animation = inspectImageAnimation(bytes, intrinsic.mediaType);
  if (intrinsic.mediaType !== manifest.mediaType || intrinsic.width !== manifest.width || intrinsic.height !== manifest.height
    || animation.animated || manifest.width > IMAGE_ASSET_LIMITS.maxDimension || manifest.height > IMAGE_ASSET_LIMITS.maxDimension
    || manifest.width * manifest.height > IMAGE_ASSET_LIMITS.maxMegapixels * 1_000_000) throw new Error("Imported image dimensions or animation do not match the supported image contract.");
}

function mergeApplied(actual, expected) { return actual && comparable(actual) === comparable(expected); }
function comparable(config) {
  if (!config) return "null";
  const copy = JSON.parse(dashboardPackageMergeRevision(config));
  delete copy.datasetProfiles; delete copy.lastUpdated;
  for (const source of Object.values(copy.dataSources ?? {})) {
    delete source.browserAssetId; delete source.browserImageAssetIds;
    delete source.fingerprint; delete source.sourceFingerprint;
  }
  const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
  return JSON.stringify(sorted(copy));
}
function ambiguous(cause, verificationError) {
  const error = new Error("The import outcome could not be verified. Refresh the dashboard before starting another import; the reviewed copy identities are retained to prevent duplicates.", { cause });
  error.code = "IMPORT_OUTCOME_UNKNOWN";
  if (verificationError) error.verificationError = verificationError;
  return error;
}
