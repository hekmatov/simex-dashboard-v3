import React from "react";
import { commitMediaReplacement, prepareMediaReplacement } from "../../content-library/contentReplacementTransaction.js";
import { browserAuthoredAssetStore } from "../../static-content/assets/browserAuthoredAssetRuntime.js";
import { discardSessionImageAsset } from "../../static-content/image/imageAssetValidation.js";
import DependencyList from "./DependencyList.jsx";
import ContentActionDialog from "./ContentActionDialog.jsx";
import { ManagerMediaIntake } from "./MediaCatalogue.jsx";

export default function MediaDetail({
  item,
  dashboard,
  contentDraftCoordinator,
  onRename,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
}) {
  const [displayName, setDisplayName] = React.useState(item.record.displayName);
  const [defaultDescription, setDefaultDescription] = React.useState(item.record.defaultDescription);
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  const [replacementPlan, setReplacementPlan] = React.useState(null);
  const [replacementLabel, setReplacementLabel] = React.useState("");
  const [replacementBusy, setReplacementBusy] = React.useState(false);
  const [replacementError, setReplacementError] = React.useState("");
  const [replacementStatus, setReplacementStatus] = React.useState("");
  const mountedRef = React.useRef(false);
  const prepareGenerationRef = React.useRef(0);
  const replacementPlanRef = React.useRef(null);
  const lifecycleRef = React.useRef({ contentDraftCoordinator, onContentDraftDiscard });
  lifecycleRef.current = { contentDraftCoordinator, onContentDraftDiscard };
  React.useEffect(() => {
    setDisplayName(item.record.displayName);
    setDefaultDescription(item.record.defaultDescription);
  }, [item.id, item.record.defaultDescription, item.record.displayName]);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      prepareGenerationRef.current += 1;
      const plan = replacementPlanRef.current;
      replacementPlanRef.current = null;
      if (plan) {
        void discardPreparedReplacement(plan, "media-replacement-unmount", lifecycleRef.current)
          .catch((error) => console.error("Media replacement cleanup failed.", error));
      }
    };
  }, []);

  const chooseReplacement = async (file) => {
    if (!file) return;
    const generation = prepareGenerationRef.current + 1;
    prepareGenerationRef.current = generation;
    setReplacementBusy(true);
    setReplacementError("");
    try {
      if (replacementPlan?.draft?.draftId) {
        await discardPreparedReplacement(replacementPlan, "media-replacement-changed", { contentDraftCoordinator, onContentDraftDiscard });
        replacementPlanRef.current = null;
      }
      const plan = await prepareMediaReplacement({
        dashboard,
        mediaId: item.id,
        candidate: { file, declaredMediaType: file.type },
      });
      if (!mountedRef.current || prepareGenerationRef.current !== generation) {
        discardSessionImageAsset(plan.newAssetId);
        return;
      }
      try {
        await onContentDraftStage?.(plan.draft);
      } catch (error) {
        discardSessionImageAsset(plan.newAssetId);
        throw error;
      }
      if (!mountedRef.current || prepareGenerationRef.current !== generation) {
        await discardPreparedReplacement(plan, "media-replacement-stale-prepare", { contentDraftCoordinator, onContentDraftDiscard });
        return;
      }
      replacementPlanRef.current = plan;
      setReplacementPlan(plan);
      setReplacementLabel(file.name || "Validated image");
    } catch (error) {
      if (!mountedRef.current || prepareGenerationRef.current !== generation) return;
      replacementPlanRef.current = null;
      setReplacementPlan(null);
      setReplacementLabel("");
      setReplacementError(error?.message ?? "The replacement image could not be prepared.");
    } finally {
      if (mountedRef.current && prepareGenerationRef.current === generation) setReplacementBusy(false);
    }
  };

  const cancelReplacement = async () => {
    prepareGenerationRef.current += 1;
    if (replacementPlan?.draft?.draftId) {
      await discardPreparedReplacement(replacementPlan, "media-replacement-cancelled", { contentDraftCoordinator, onContentDraftDiscard });
    }
    replacementPlanRef.current = null;
    setReplacementPlan(null);
    setReplacementLabel("");
    setReplacementError("");
    setReplaceOpen(false);
  };

  const confirmReplacement = async () => {
    if (!replacementPlan) return;
    setReplacementBusy(true);
    setReplacementError("");
    try {
      await commitMediaReplacement(replacementPlan, {
        contentDraftCoordinator,
        commitDraft: (draftId, buildCandidate) => onContentDraftCommit?.(draftId, buildCandidate),
        retireAsset: (assetId) => browserAuthoredAssetStore.remove(assetId),
      });
      setReplacementStatus(`${item.record.displayName} was replaced everywhere at revision ${replacementPlan.nextMediaItem.revision}.`);
      replacementPlanRef.current = null;
      setReplacementPlan(null);
      setReplacementLabel("");
      setReplaceOpen(false);
    } catch (error) {
      replacementPlanRef.current = null;
      setReplacementPlan(null);
      setReplacementLabel("");
      setReplacementError(error?.message ?? "The media replacement failed. The previous revision remains active.");
    } finally {
      setReplacementBusy(false);
    }
  };
  return (
    <article className="source-content-detail-card">
      <section aria-labelledby="media-detail-heading">
        <h3 id="media-detail-heading">Media details</h3>
        <dl className="source-content-facts">
          <div><dt>Name</dt><dd>{item.record.displayName}</dd></div>
          <div><dt>Origin</dt><dd>{item.record.origin}</dd></div>
          <div><dt>Health</dt><dd>{item.record.health}</dd></div>
          <div><dt>Revision</dt><dd>{item.record.revision}</dd></div>
          {item.record.dimensions && <div><dt>Dimensions</dt><dd>{item.record.dimensions.width} × {item.record.dimensions.height}</dd></div>}
          {item.record.byteLength && <div><dt>Encoded size</dt><dd>{item.record.byteLength} bytes</dd></div>}
          <div><dt>Portability</dt><dd>{item.record.current.kind === "url" ? "Network required" : "Portable"}</dd></div>
        </dl>
        <p className="source-content-placeholder">Media preview is added with the media management flow.</p>
        <button type="button" className="secondary" disabled={!contentDraftCoordinator} onClick={() => { setReplacementStatus(""); setReplaceOpen(true); }}>Replace library file everywhere</button>
        {replacementStatus && <p role="status">{replacementStatus}</p>}
        {item.record.current.kind === "url" && item.record.origin === "external" && (
          <ManagerMediaIntake
            dashboard={dashboard}
            contentDraftCoordinator={contentDraftCoordinator}
            externalItem={item.record}
            onContentDraftStage={onContentDraftStage}
            onContentDraftCommit={onContentDraftCommit}
            onContentDraftDiscard={onContentDraftDiscard}
          />
        )}
      </section>
      <form className="source-content-rename" onSubmit={(event) => { event.preventDefault(); onRename?.({ displayName, defaultDescription }); }}>
        <label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
        <label><span>Default description</span><textarea value={defaultDescription} onChange={(event) => setDefaultDescription(event.target.value)} /></label>
        <button type="submit" className="secondary" disabled={!onRename || (displayName.trim() === item.record.displayName && defaultDescription === item.record.defaultDescription)}>Save metadata</button>
      </form>
      <DependencyList uses={item.uses} activeRetainers={item.activeRetainers} usageKnown={item.usageKnown} />
      <ContentActionDialog
        open={replaceOpen}
        action="replace"
        itemLabel={item.record.displayName}
        busy={replacementBusy}
        error={replacementError}
        replacementReady={Boolean(replacementPlan)}
        replacementLabel={replacementLabel}
        onReplacementFile={(file) => void chooseReplacement(file)}
        onConfirm={() => void confirmReplacement()}
        onCancel={() => void cancelReplacement()}
      />
    </article>
  );
}

async function discardPreparedReplacement(plan, reason, { contentDraftCoordinator, onContentDraftDiscard } = {}) {
  const draftId = plan?.draft?.draftId;
  if (!draftId) return false;
  const record = contentDraftCoordinator?.getActiveRetainers?.().records
    ?.find(({ ownerId }) => ownerId === draftId);
  if (!record) {
    discardSessionImageAsset(plan.newAssetId);
    return false;
  }
  if (record.status !== "staged") return false;
  return onContentDraftDiscard?.(draftId, reason) ?? false;
}
