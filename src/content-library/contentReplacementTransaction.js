import { validateContentLibrary } from "./contentLibrarySchema.js";
import { replaceMediaItemRevision, validateMediaItem } from "./mediaItems.js";
import { pruneStaticOwnership } from "../static-content/staticPanelTransaction.js";
import {
  authoredAssetManifestBytes,
  decodeBrowserImageAsset,
  discardSessionImageAsset,
  IMAGE_ASSET_LIMITS,
  stageSessionImageAsset,
} from "../static-content/image/imageAssetValidation.js";
import {
  validateAuthoredAssetManifest,
  validateStaticSource,
} from "../static-content/staticSourceSchema.js";

export async function prepareMediaReplacement({ dashboard, mediaId, candidate = {}, viewerState = {} } = {}) {
  const previousDashboard = cloneRecord(dashboard, "Media replacement dashboard");
  const id = requiredText(mediaId, "Media replacement mediaId");
  const previous = previousDashboard.contentLibrary?.mediaItems?.[id];
  if (!previous) throw new Error(`Unknown media item "${id}".`);
  validateMediaItem(previous, { assets: previousDashboard.assets ?? {} });

  const oldAssetId = previous.current?.kind === "asset" ? previous.current.assetId : null;
  const oldAssetShared = oldAssetId && Object.values(previousDashboard.contentLibrary?.mediaItems ?? {})
    .some((item) => item?.mediaId !== id && item?.current?.kind === "asset" && item.current.assetId === oldAssetId);
  const retainedAssetIds = Object.keys(previousDashboard.assets ?? {})
    .filter((assetId) => assetId !== oldAssetId || oldAssetShared);
  const retainedAssetBytes = retainedAssetIds.reduce(
    (total, assetId) => total + Number(previousDashboard.assets?.[assetId]?.byteLength ?? 0),
    0,
  );
  const staged = await stageSessionImageAsset({
    file: candidate.file,
    bytes: candidate.bytes,
    declaredMediaType: candidate.declaredMediaType ?? candidate.file?.type,
    decoded: candidate.decoded,
    decode: candidate.decode ?? decodeBrowserImageAsset,
    currentAssetBytes: retainedAssetBytes,
    currentAssetIds: retainedAssetIds,
  });
  if (!staged.ok) throw replacementValidationError(staged);

  try {
    if (staged.assetId === oldAssetId) throw new Error("Choose an image with different content for global replacement.");
    const nextMediaItem = {
      ...replaceMediaItemRevision(previous, { kind: "asset", assetId: staged.assetId }),
      dimensions: { width: staged.asset.width, height: staged.asset.height },
      byteLength: staged.asset.byteLength,
      mediaType: staged.asset.mediaType,
    };
    validateMediaItem(nextMediaItem, { assets: { [staged.assetId]: staged.manifestEntry } });
    return deepFreeze({
      kind: "media-replacement",
      mediaId: id,
      expectedRevision: previous.revision,
      expectedCurrent: currentAuthority(previous, previousDashboard.assets),
      oldAssetId,
      newAssetId: staged.assetId,
      newManifest: structuredClone(staged.manifestEntry),
      nextMediaItem,
      placementSnapshot: {
        dataSources: structuredClone(previousDashboard.dataSources ?? {}),
        viewerState: structuredClone(viewerState),
      },
      draft: {
        draftId: `media-replacement-${id}-${previous.revision + 1}`,
        owner: "manager",
        kind: "media-replacement",
        payload: { mediaId: id, expectedRevision: previous.revision, newAssetId: staged.assetId },
        assetIds: [oldAssetId, staged.assetId].filter(Boolean),
        mediaIds: [id],
        sourceIds: [],
      },
    });
  } catch (error) {
    discardSessionImageAsset(staged.assetId);
    throw error;
  }
}

export async function commitMediaReplacement(plan, {
  contentDraftCoordinator,
  commitDraft,
  retireAsset,
} = {}) {
  if (plan?.kind !== "media-replacement") throw new TypeError("A prepared media replacement is required.");
  if (!contentDraftCoordinator || typeof contentDraftCoordinator.stageDraft !== "function" || typeof contentDraftCoordinator.commitDraft !== "function") {
    throw new TypeError("Media replacement requires the content draft coordinator.");
  }
  const active = contentDraftCoordinator.getActiveRetainers().records
    .some(({ ownerId }) => ownerId === plan.draft.draftId);
  if (!active) contentDraftCoordinator.stageDraft(plan.draft);
  const publish = typeof commitDraft === "function"
    ? commitDraft
    : (draftId, buildCandidate) => contentDraftCoordinator.commitDraft(draftId, { buildCandidate });
  const result = await publish(plan.draft.draftId, ({ dashboard }) => replacementCandidate(plan, dashboard));
  let retirement = null;
  const oldAssetUnreferenced = plan.oldAssetId
    && plan.oldAssetId !== plan.newAssetId
    && !Object.hasOwn(result?.dashboard?.assets ?? {}, plan.oldAssetId);
  if (oldAssetUnreferenced && typeof retireAsset === "function") {
    try {
      const retired = await retireAsset(plan.oldAssetId);
      retirement = { assetId: plan.oldAssetId, deferred: retired === false };
    } catch (error) {
      retirement = { assetId: plan.oldAssetId, cleanupRequired: true, message: error?.message ?? "Asset retirement failed." };
    }
  }
  return deepFreeze({
    status: "committed",
    mediaId: plan.mediaId,
    revision: plan.nextMediaItem.revision,
    dashboard: structuredClone(result?.dashboard),
    cleanup: result?.cleanup ?? null,
    retirement,
  });
}

function replacementCandidate(plan, currentDashboard) {
  const current = currentDashboard?.contentLibrary?.mediaItems?.[plan.mediaId];
  if (!current || !sameCurrentAuthority(plan.expectedCurrent, currentAuthority(current, currentDashboard?.assets))) {
    throw new Error("Media replacement plan is stale; the current media authority changed.");
  }
  const next = structuredClone(currentDashboard);
  next.contentLibrary.mediaItems[plan.mediaId] = {
    ...structuredClone(current),
    revision: current.revision + 1,
    current: structuredClone(plan.nextMediaItem.current),
    origin: plan.nextMediaItem.origin,
    health: plan.nextMediaItem.health,
    dimensions: structuredClone(plan.nextMediaItem.dimensions),
    byteLength: plan.nextMediaItem.byteLength,
    mediaType: plan.nextMediaItem.mediaType,
  };
  next.assets ??= {};
  const alreadyDurable = Object.hasOwn(next.assets, plan.newAssetId);
  next.assets[plan.newAssetId] = {
    ...structuredClone(plan.newManifest),
    storageState: alreadyDurable ? next.assets[plan.newAssetId].storageState ?? "durable" : "staged",
  };
  if (plan.oldAssetId && plan.oldAssetId !== plan.newAssetId) {
    pruneStaticOwnership(next, { assetIds: [plan.oldAssetId] });
  }
  validateAuthoredAssetManifest(next.assets);
  if (authoredAssetManifestBytes(next.assets) > IMAGE_ASSET_LIMITS.dashboardBudgetBytes) {
    throw new Error("The media replacement exceeds the dashboard's 200 MiB authored-asset budget.");
  }
  validateContentLibrary(next.contentLibrary, { assets: next.assets, dataSources: next.dataSources });
  for (const source of Object.values(next.dataSources ?? {})) {
    if (source?.kind === "staticImage" || source?.kind === "staticText") validateStaticSource(source, { assets: next.assets });
  }
  return {
    dashboard: next,
    commitAssetIds: alreadyDurable ? [] : [plan.newAssetId],
    discardAssetIds: alreadyDurable ? [plan.newAssetId] : [],
    itemIds: [plan.mediaId],
  };
}

function currentAuthority(item, assets = {}) {
  const current = structuredClone(item.current);
  return {
    revision: item.revision,
    current,
    sha256: current.kind === "asset" ? assets?.[current.assetId]?.sha256 ?? null : null,
  };
}

function sameCurrentAuthority(expected, actual) {
  return expected?.revision === actual?.revision
    && expected?.sha256 === actual?.sha256
    && JSON.stringify(expected?.current) === JSON.stringify(actual?.current);
}

function replacementValidationError(validation) {
  const error = new Error(validation?.errors?.[0]?.message ?? "The image did not pass raster validation.");
  error.validation = validation;
  return error;
}

function cloneRecord(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${description} is required.`);
  return structuredClone(value);
}

function requiredText(value, description) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${description} is required.`);
  return value.trim();
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || ArrayBuffer.isView(value) || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}
