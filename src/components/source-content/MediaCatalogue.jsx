import React from "react";
import ContentCatalogue from "./ContentCatalogue.jsx";
import {
  createLocalMediaCandidate,
  importExternalMediaFile,
  stageLocalMediaFile,
} from "./MediaPicker.jsx";

export default function MediaCatalogue({ dashboard, onContentDraftStage, onContentDraftCommit, onContentDraftDiscard, ...props }) {
  return (
    <div>
      <ManagerMediaIntake
        dashboard={dashboard}
        onContentDraftStage={onContentDraftStage}
        onContentDraftCommit={onContentDraftCommit}
        onContentDraftDiscard={onContentDraftDiscard}
      />
      <ContentCatalogue {...props} label="Media catalogue" searchLabel="Search media" addLabel="Catalogue" />
    </div>
  );
}

export function ManagerMediaIntake({
  dashboard = {},
  externalItem = null,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
  onAdded,
} = {}) {
  const [open, setOpen] = React.useState(false);
  const [candidate, setCandidate] = React.useState(null);
  const [displayName, setDisplayName] = React.useState(externalItem?.displayName ?? "");
  const [defaultDescription, setDefaultDescription] = React.useState(externalItem?.defaultDescription ?? "");
  const [choice, setChoice] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const draftIdRef = React.useRef(null);

  React.useEffect(() => () => {
    if (draftIdRef.current) onContentDraftDiscard?.(draftIdRef.current, "manager-intake-unmount");
    draftIdRef.current = null;
  }, [onContentDraftDiscard]);

  const duplicate = candidate
    ? findDuplicateMedia(dashboard, candidate.assetId)
    : null;

  const stageFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (draftIdRef.current) {
        await onContentDraftDiscard?.(draftIdRef.current, "manager-intake-replaced");
        draftIdRef.current = null;
      }
      const next = await stageLocalMediaFile({
        file,
        assets: dashboard.assets ?? {},
        displayName: file.name || externalItem?.displayName || "New media",
        defaultDescription: externalItem?.defaultDescription ?? "",
      });
      const stagedInput = buildManagerMediaDraft({ dashboard, candidate: next, duplicate: findDuplicateMedia(dashboard, next.assetId), choice: "separate" });
      const { buildCandidate: _buildCandidate, ...input } = stagedInput;
      const staged = onContentDraftStage?.(input);
      draftIdRef.current = staged?.draftId ?? input.draftId;
      setCandidate(next);
      setDisplayName(file.name || externalItem?.displayName || "New media");
      setDefaultDescription(externalItem?.defaultDescription ?? "");
      setChoice(findDuplicateMedia(dashboard, next.assetId) ? null : "separate");
    } catch (caught) {
      setError(caught?.message ?? "The image could not be added.");
    } finally {
      setBusy(false);
    }
  };

  const directImport = async () => {
    setBusy(true);
    setError("");
    try {
      await stageFile(await importExternalMediaFile(externalItem));
    } catch (caught) {
      setError(caught?.message ?? "Direct import failed. Choose a local file upload instead.");
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (draftIdRef.current) await onContentDraftDiscard?.(draftIdRef.current, "manager-explicit-cancel");
    draftIdRef.current = null;
    setCandidate(null);
    setChoice(null);
    setError("");
    setOpen(false);
  };

  const add = async () => {
    if (!candidate || !draftIdRef.current || !choice) return;
    setBusy(true);
    setError("");
    try {
      const renamed = createLocalMediaCandidate({
        mediaId: candidate.mediaItem.mediaId,
        displayName,
        defaultDescription,
        assetId: candidate.assetId,
        manifestEntry: candidate.assets[candidate.assetId],
      });
      const input = buildManagerMediaDraft({ dashboard, candidate: renamed, duplicate, choice });
      const result = await onContentDraftCommit?.(draftIdRef.current, input.buildCandidate);
      draftIdRef.current = null;
      setCandidate(null);
      setOpen(false);
      onAdded?.(result?.itemIds?.[0] ?? input.mediaIds[0]);
    } catch (caught) {
      draftIdRef.current = null;
      setError(caught?.message ?? "Media could not be added to the dashboard.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={externalItem ? `Import ${externalItem.displayName} as local media` : "Add media to dashboard"}>
      {!open && (
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          {externalItem ? "Import as local media" : "Add media"}
        </button>
      )}
      {open && (
        <div>
          <h3>{externalItem ? "Import as local media" : "Add media"}</h3>
          {externalItem && (
            <button type="button" className="secondary" disabled={busy} onClick={() => void directImport()}>
              Try direct HTTPS import
            </button>
          )}
          <label>
            <span>{externalItem ? "Or choose a local copy" : "PNG, JPEG, or WebP file"}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => void stageFile(event.target.files?.[0])} />
          </label>
          {candidate?.previewUrl && <img src={candidate.previewUrl} alt="" />}
          {candidate && (
            <>
              <label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
              <label><span>Default description</span><textarea value={defaultDescription} onChange={(event) => setDefaultDescription(event.target.value)} /></label>
              {duplicate && (
                <fieldset>
                  <legend>Identical image already exists</legend>
                  <p>The stored bytes match {duplicate.displayName}. Choose whether to reuse its logical identity or create a separate item.</p>
                  <label><input type="radio" name={`duplicate-${candidate.mediaItem.mediaId}`} checked={choice === "reuse"} onChange={() => setChoice("reuse")} /> Reuse existing</label>
                  <label><input type="radio" name={`duplicate-${candidate.mediaItem.mediaId}`} checked={choice === "separate"} onChange={() => setChoice("separate")} /> Create separate item</label>
                </fieldset>
              )}
              <button type="button" disabled={busy || !displayName.trim() || !choice} onClick={() => void add()}>Add to dashboard</button>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <button type="button" className="secondary" disabled={busy} onClick={() => void cancel()}>Cancel</button>
        </div>
      )}
    </section>
  );
}

export function buildManagerMediaDraft({ dashboard = {}, candidate, duplicate = null, choice = "separate" } = {}) {
  if (!candidate?.mediaItem || !candidate.assetId) throw new TypeError("A validated manager media candidate is required.");
  if (!new Set(["reuse", "separate"]).has(choice)) throw new Error("Choose Reuse existing or Create separate item.");
  if (choice === "reuse" && !duplicate) throw new Error("Reuse existing requires an identical committed media item.");
  const selectedMediaId = choice === "reuse" ? duplicate.mediaId : candidate.mediaItem.mediaId;
  const assetAlreadyDurable = Object.hasOwn(dashboard.assets ?? {}, candidate.assetId);
  const draftId = `manager-media-${candidate.mediaItem.mediaId}`;
  const buildCandidate = ({ dashboard: currentDashboard }) => {
    const next = structuredClone(currentDashboard);
    next.contentLibrary ??= { mediaItems: {}, sourceEntries: {} };
    next.contentLibrary.mediaItems ??= {};
    next.assets ??= {};
    if (choice === "separate") {
      next.contentLibrary.mediaItems[candidate.mediaItem.mediaId] = structuredClone(candidate.mediaItem);
      next.assets[candidate.assetId] = {
        ...structuredClone(candidate.assets[candidate.assetId]),
        storageState: assetAlreadyDurable ? next.assets[candidate.assetId]?.storageState ?? "durable" : "staged",
      };
    }
    return {
      dashboard: next,
      commitAssetIds: choice === "separate" && !assetAlreadyDurable ? [candidate.assetId] : [],
      discardAssetIds: choice === "reuse" || assetAlreadyDurable ? [candidate.assetId] : [],
      itemIds: [selectedMediaId],
    };
  };
  return {
    draftId,
    owner: "manager",
    kind: duplicate ? "manager-media-deduplicate" : "manager-media-add",
    payload: { choice, mediaItem: candidate.mediaItem, duplicateMediaId: duplicate?.mediaId ?? null },
    assetIds: [candidate.assetId],
    mediaIds: [selectedMediaId],
    sourceIds: [],
    buildCandidate,
  };
}

function findDuplicateMedia(dashboard, assetId) {
  return Object.values(dashboard.contentLibrary?.mediaItems ?? {})
    .find((item) => item.current?.kind === "asset" && item.current.assetId === assetId) ?? null;
}
