import React from "react";

import ConfirmDialog from "../common/ConfirmDialog.jsx";
import ControlTooltip from "../common/ControlTooltip.jsx";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import {
  STATIC_CONTENT_STAGES,
  STATIC_CONTENT_STAGE_LABELS,
  createStaticContentDraft,
  finalizeStaticContentDraft,
  isStaticContentDraftDirty,
  reduceStaticContentDraft,
  staticContentStageReadiness,
} from "../../static-content/forms/staticContentDraft.js";
import { listStaticContentTypeOptions } from "../../static-content/staticPanelCapabilities.js";
import StaticContentStateBoundary from "./StaticContentStateBoundary.jsx";
import FreeTextSourceEditor from "./FreeTextSourceEditor.jsx";
import ImageSourceEditor from "./ImageSourceEditor.jsx";
import ImageTransformEditor from "./ImageTransformEditor.jsx";
import ChartView from "../charts/ChartView.jsx";
import { compilePortableQmd } from "../../static-content/qmd/compilePortableQmd.js";
import {
  discardUnreferencedSessionImageAssets,
  resolveSessionImageAsset,
} from "../../static-content/image/imageAssetValidation.js";
import { buildStaticPanelContentDraftCandidate } from "../../content-library/contentDraftTransaction.js";
import ChartFootprintPicker from "../chart-authoring/ChartFootprintPicker.jsx";
import { legacySizeForFootprint, resolveChartFootprint } from "../chartPanelLayout.js";

const STATIC_CONTENT_PENDING_REASON = "Text/Image authoring is unavailable while this draft action is pending.";

export function getStaticContentSubmissionState({
  draft,
  editor = false,
  disabled = false,
  freeTextInvalid = false,
} = {}) {
  const busy = draft?.status === "committing";
  const retrying = draft?.status === "failed";
  const finalStage = draft?.stage === "preview-and-add";
  return {
    busy,
    disabled: disabled || busy || freeTextInvalid,
    label: finalStage
      ? retrying ? (editor ? "Retry Save" : "Retry Add") : (editor ? "Save" : "Add")
      : "Continue",
  };
}

export function getStaticContentDiscardAction({ dirty = false, disabled = false } = {}) {
  if (disabled) return "ignore";
  return dirty ? "confirm" : "close";
}

export function StaticContentWizard({
  open = false,
  dashboard = {},
  destination,
  initialDraft,
  restoration = null,
  editor = false,
  disabled = false,
  contentDraftCoordinator = null,
  contentRenderContext = {},
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
  onDraftChange,
  onDirtyChange,
  onRestorationChange,
  onCreate,
  onClose,
  onSuspend,
} = {}) {
  const [draft, dispatch] = React.useReducer(
    reduceStaticContentDraft,
    initialDraft,
    (provided) => provided
      ? structuredClone(provided)
      : createStaticContentDraft({
          destination,
          mode: editor ? "edit" : "create",
          assets: dashboard.assets ?? {},
        }),
  );
  const [submitError, setSubmitError] = React.useState("");
  const [freeTextValidation, setFreeTextValidation] = React.useState(null);
  const recoveredContentDraft = React.useMemo(
    () => recoverContentDraftAuthority(contentDraftCoordinator, initialDraft),
    [contentDraftCoordinator, initialDraft],
  );
  const contentDraftIdRef = React.useRef(recoveredContentDraft?.ownerId ?? null);
  const retainedAssetIdsRef = React.useRef(new Set(recoveredContentDraft?.assetIds ?? []));
  const retainedMediaIdsRef = React.useRef(new Set(recoveredContentDraft?.mediaIds ?? []));
  const submitPromiseRef = React.useRef(null);
  const suspendedRef = React.useRef(false);
  const dirty = isStaticContentDraftDirty(draft);
  const freeTextRequiresValidation = draft.contentTypeId === "freeText"
    && (draft.stage === "content" || draft.stage === "preview-and-add");
  const freeTextInvalid = freeTextRequiresValidation && !isCurrentFreeTextValidation(
      freeTextValidation,
      draft.source?.qmd ?? "",
    );
  const submissionState = getStaticContentSubmissionState({ draft, editor, disabled, freeTextInvalid });
  const submitting = submissionState.busy;
  const workflowDisabled = disabled || submitting;
  React.useEffect(() => { onDraftChange?.(draft); }, [draft, onDraftChange]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  React.useEffect(() => {
    if (!draft.focusRequest || typeof document === "undefined") return undefined;
    const frame = globalThis.requestAnimationFrame?.(() => {
      document.getElementById(draft.focusRequest)?.focus();
    });
    return () => {
      if (frame !== undefined) globalThis.cancelAnimationFrame?.(frame);
    };
  }, [draft.focusRequest, draft.validation]);
  React.useEffect(() => () => {
    if (suspendedRef.current) return;
    if (contentDraftIdRef.current) onContentDraftDiscard?.(contentDraftIdRef.current, "static-content-unmount");
    contentDraftIdRef.current = null;
  }, [onContentDraftDiscard]);
  if (!open) return null;

  const stageIndex = STATIC_CONTENT_STAGES.indexOf(draft.stage);
  const discardActiveContentDraft = async (reason) => {
    const draftId = contentDraftIdRef.current;
    contentDraftIdRef.current = null;
    retainedAssetIdsRef.current.clear();
    retainedMediaIdsRef.current.clear();
    if (draftId) await onContentDraftDiscard?.(draftId, reason);
  };
  const retainMedia = async ({ mediaItem, assetId = null, owner, replace = false }) => {
    if (!mediaItem || !onContentDraftStage) return;
    if (replace && contentDraftIdRef.current) await discardActiveContentDraft("static-media-selection-replaced");
    retainedMediaIdsRef.current.add(mediaItem.mediaId);
    if (assetId) retainedAssetIdsRef.current.add(assetId);
    const input = {
      draftId: contentDraftIdRef.current ?? `${owner}-${draft.draftIdentity.panelId}`,
      owner,
      kind: owner === "qmd-panel" ? "qmd-panel-media" : "image-panel-media",
      payload: {},
      assetIds: [...retainedAssetIdsRef.current],
      mediaIds: [...retainedMediaIdsRef.current],
      sourceIds: [],
    };
    if (contentDraftIdRef.current && contentDraftCoordinator?.updateDraft) {
      contentDraftCoordinator.updateDraft(contentDraftIdRef.current, input);
      return;
    }
    const staged = onContentDraftStage(input);
    contentDraftIdRef.current = staged?.draftId ?? input.draftId;
  };
  const requestClose = () => {
    if (workflowDisabled) return;
    if (!dirty) {
      void discardActiveContentDraft("static-content-close").finally(() => onClose?.({ discarded: false, draft }));
      return;
    }
    const restoration = focusRestoration(draft.stage);
    if (onSuspend) {
      suspendedRef.current = true;
      onSuspend({ draft, restoration });
      return;
    }
    dispatch({ type: "requestCancel", restoration });
  };
  const requestDiscard = () => {
    const action = getStaticContentDiscardAction({ dirty, disabled: workflowDisabled });
    if (action === "ignore") return;
    if (action === "close") {
      requestClose();
      return;
    }
    dispatch({ type: "requestCancel", restoration: focusRestoration(draft.stage) });
  };
  const reportSurface = React.useCallback((surface) => {
    onRestorationChange?.({ ...focusRestoration(draft.stage), surface });
  }, [draft.stage, onRestorationChange]);
  const reset = async () => {
    if (workflowDisabled) return;
    cleanupImageDraftAssets(draft, dashboard);
    await discardActiveContentDraft("static-content-reset");
    dispatch({ type: "reset" });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (disabled || submitPromiseRef.current) return;
    setSubmitError("");
    try {
      if (draft.stage !== "preview-and-add") {
        dispatch({ type: "tryNext", previewReady: !freeTextInvalid });
        return;
      }
      validateCompiledFreeText(draft);
      const result = finalizeStaticContentDraft(draft);
      dispatch({ type: "commitStarted" });
      const commitPromise = (async () => {
        if (contentDraftIdRef.current && contentDraftCoordinator?.updateDraft && onContentDraftCommit) {
          const draftId = ensureContentDraftAuthority({
            contentDraftCoordinator,
            draftId: contentDraftIdRef.current,
            draft,
            result,
            assetIds: [...retainedAssetIdsRef.current],
            mediaIds: [...retainedMediaIdsRef.current],
            onContentDraftStage,
          });
          contentDraftIdRef.current = draftId;
          const pendingMediaItems = structuredClone(draft.pendingMediaItems ?? {});
          const pendingAssets = Object.fromEntries(Object.values(pendingMediaItems)
            .filter((item) => item.current?.kind === "asset" && draft.assets?.[item.current.assetId])
            .map((item) => [item.current.assetId, structuredClone(draft.assets[item.current.assetId])]));
          await onContentDraftCommit(
            draftId,
            ({ dashboard: currentDashboard, draft: coordinatorDraft }) => (
              buildStaticPanelContentDraftCandidate({
                dashboard: currentDashboard,
                draft: coordinatorDraft,
                operation: editor ? "update" : "create",
                panelId: editor ? result.panel.id : undefined,
                pendingMediaItems,
                pendingAssets,
              })
            ),
            {
              operationKey: "static-content-save",
              operationLabel: editor ? "Saving Text/Image changes" : "Adding Text/Image",
              successMessage: editor ? "Text/Image changes saved." : "Text/Image added.",
            },
          );
          contentDraftIdRef.current = null;
          retainedAssetIdsRef.current.clear();
          retainedMediaIdsRef.current.clear();
          onClose?.({ committed: true, draft, result });
          return;
        }
        await onCreate?.(result);
      })();
      submitPromiseRef.current = commitPromise;
      await commitPromise;
      cleanupImageDraftAssets(draft, dashboard, result);
      dispatch({ type: "committed" });
    } catch (error) {
      setSubmitError(error?.message ?? "Static content could not be saved.");
      if (draft.stage === "preview-and-add") dispatch({ type: "commitFailed", error });
    } finally {
      submitPromiseRef.current = null;
    }
  };

  return (
    <div className="static-content-dialog-backdrop dashboard-dialog-backdrop">
      <ModalFocusScope
        as="form"
        open={open}
        className="static-content-dialog dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide dashboard-authoring-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="static-content-dialog-title"
        aria-busy={submitting ? "true" : undefined}
        initialFocusSelector={'[data-static-initial-focus="true"]'}
        onEscape={workflowDisabled ? undefined : requestClose}
        onSubmit={submit}
      >
        <header className="dashboard-dialog__header">
          <h2 id="static-content-dialog-title" className="dashboard-dialog__eyebrow">
            {editor ? "Text/Image editor" : "Add Text/Image"}
          </h2>
          <ControlTooltip disabled={workflowDisabled} reason={STATIC_CONTENT_PENDING_REASON}>
            <button type="button" className="secondary" aria-label="Close Text/Image editor" disabled={workflowDisabled} onClick={requestClose}>Close</button>
          </ControlTooltip>
        </header>
        <nav className="dashboard-dialog__progress" aria-label="Text/Image stages">
          {(editor ? STATIC_CONTENT_STAGES.slice(2) : STATIC_CONTENT_STAGES).map((stage) => {
            const index = STATIC_CONTENT_STAGES.indexOf(stage);
            const readiness = staticContentStageReadiness(draft, stage, {
              previewReady: !freeTextInvalid,
            });
            return (
              <button
                key={stage}
                type="button"
                className="secondary"
                aria-current={draft.stage === stage ? "step" : undefined}
                disabled={workflowDisabled || !readiness.ready}
                title={readiness.ready ? undefined : readiness.reason}
                onClick={() => dispatch({
                  type: "trySetStage",
                  stage,
                  previewReady: !freeTextInvalid,
                })}
              >
                {STATIC_CONTENT_STAGE_LABELS[index]}
              </button>
            );
          })}
        </nav>

        <section
          className="static-content-dialog__body dashboard-dialog__body dashboard-authoring-body"
          data-static-content-stage={draft.stage}
          onFocusCapture={() => onRestorationChange?.(focusRestoration(draft.stage))}
          onScroll={() => onRestorationChange?.(focusRestoration(draft.stage))}
        >
          {workflowDisabled && <p id="static-content-workflow-status" role="status">{STATIC_CONTENT_PENDING_REASON}</p>}
          {draft.stage === "destination" && <DestinationFields dashboard={dashboard} draft={draft} dispatch={dispatch} disabled={workflowDisabled} />}
          {draft.stage === "content-type" && <ContentTypeFields draft={draft} dispatch={dispatch} disabled={workflowDisabled} />}
          {draft.stage === "content" && (
            <StaticContentFields
              draft={draft}
              dashboard={dashboard}
              contentRenderContext={contentRenderContext}
              disabled={workflowDisabled}
              dispatch={dispatch}
              onFreeTextValidation={setFreeTextValidation}
              restoration={restoration}
              onSurfaceChange={reportSurface}
              onRetainMedia={retainMedia}
              onRestorePreviousImage={() => void discardActiveContentDraft("restore-previous-image")}
            />
          )}
          {draft.stage === "preview-and-add" && <StaticPreview draft={draft} contentRenderContext={contentRenderContext} />}
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
        </section>

        <footer className="dashboard-dialog__footer dashboard-authoring-footer">
          <div data-footer-slot="cancel">
            <PendingAction disabled={workflowDisabled}><button type="button" className="secondary" disabled={workflowDisabled} onClick={requestDiscard}>Cancel</button></PendingAction>
          </div>
          <div data-footer-slot="reset">
            {editor
              ? <PendingAction disabled={workflowDisabled || !dirty}><button type="button" className="secondary" disabled={workflowDisabled || !dirty} onClick={() => void reset()}>Reset</button></PendingAction>
              : <span aria-hidden="true" />}
          </div>
          <div data-footer-slot="back">
            <PendingAction disabled={workflowDisabled || stageIndex <= (editor ? 2 : 0)}><button type="button" className="secondary" disabled={workflowDisabled || stageIndex <= (editor ? 2 : 0)} onClick={() => dispatch({ type: "previous" })}>Back</button></PendingAction>
          </div>
          <div data-footer-slot="primary">
            <PendingAction disabled={workflowDisabled}>
              <button type="submit" disabled={submissionState.disabled}>{submissionState.label}</button>
            </PendingAction>
          </div>
        </footer>
      </ModalFocusScope>
      <ConfirmDialog
        open={draft.confirmation === "discard"}
        title="Discard Text/Image changes?"
        message="Your unsaved Text/Image changes last only for this application session."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        disabled={workflowDisabled}
        onCancel={() => dispatch({ type: "keepEditing" })}
        onConfirm={async () => {
          cleanupImageDraftAssets(draft, dashboard);
          await discardActiveContentDraft("static-content-explicit-discard");
          dispatch({ type: "discard" });
          onClose?.({ discarded: true, draft });
        }}
      />
    </div>
  );
}

function DestinationFields({ dashboard, draft, dispatch, disabled }) {
  const pages = (dashboard.pages ?? []).filter(({ landing }) => !landing);
  const page = pages.find(({ id }) => id === draft.destination?.pageId) ?? pages[0];
  return (
    <fieldset>
      <legend>Destination</legend>
      <label htmlFor="static-destination-page">Page</label>
      <select
        id="static-destination-page"
        data-static-initial-focus="true"
        disabled={disabled}
        value={draft.destination?.pageId ?? ""}
        onChange={(event) => {
          const nextPage = pages.find(({ id }) => id === event.target.value);
          dispatch({ type: "setDestination", destination: { pageId: nextPage?.id, sectionId: nextPage?.sections?.[0]?.id } });
        }}
      >
        <option value="">Choose a Page</option>
        {pages.map((item) => <option key={item.id} value={item.id}>{item.label ?? item.title ?? item.id}</option>)}
      </select>
      <label htmlFor="static-destination-section">Section</label>
      <select
        id="static-destination-section"
        disabled={disabled}
        value={draft.destination?.sectionId ?? ""}
        onChange={(event) => dispatch({ type: "setDestination", destination: { pageId: page?.id, sectionId: event.target.value } })}
      >
        <option value="">Choose a Section</option>
        {(page?.sections ?? []).map((section) => <option key={section.id} value={section.id}>{section.title ?? section.id}</option>)}
      </select>
    </fieldset>
  );
}

function ContentTypeFields({ draft, dispatch, disabled }) {
  return (
    <fieldset>
      <legend>Content type</legend>
      {listStaticContentTypeOptions().map((option, index) => (
        <label key={option.id}>
          <input
            data-static-initial-focus={index === 0 ? "true" : undefined}
            type="radio"
            disabled={disabled}
            name="static-content-type"
            value={option.id}
            checked={draft.contentTypeId === option.id}
            onChange={() => dispatch({ type: "setContentType", contentTypeId: option.id })}
          />
          <strong>{option.label}</strong> {option.description}
        </label>
      ))}
    </fieldset>
  );
}

export function StaticContentFields({ draft, dashboard = {}, contentRenderContext = {}, restoration, disabled = false, dispatch, onFreeTextValidation, onRetainMedia, onRestorePreviousImage, onSurfaceChange }) {
  const titleError = draft.validation?.errors?.find((error) => error.field === "title");
  const titleDescription = [
    disabled ? "static-content-pending-reason" : null,
    titleError ? "static-panel-title-error" : null,
  ].filter(Boolean).join(" ") || undefined;
  return (
    <div className="static-content-fields dashboard-authoring-grid">
      {disabled && <p id="static-content-pending-reason" role="status">Text/Image authoring is unavailable while this draft action is pending.</p>}
      <div className="static-content-dialog__title-choice">
        <label className="static-content-dialog__title-label" htmlFor="static-panel-title">Panel Title</label>
        <input
          id="static-panel-title"
          data-static-initial-focus="true"
          disabled={disabled}
          aria-invalid={titleError ? "true" : undefined}
          aria-describedby={titleDescription}
          value={draft.panel?.title ?? ""}
          onChange={(event) => dispatch({ type: "setPanel", updates: { title: event.target.value } })}
        />
        <label className="static-content-dialog__no-title dashboard-authoring-boolean-row" htmlFor="static-panel-no-title">
          <input
            id="static-panel-no-title"
            type="checkbox"
            disabled={disabled}
            checked={draft.noTitle === true}
            aria-invalid={titleError ? "true" : undefined}
            aria-describedby={titleDescription}
            onChange={(event) => dispatch({ type: "setNoTitle", noTitle: event.target.checked })}
          />
          <span>No title</span>
        </label>
      </div>
      {titleError && <p id="static-panel-title-error" className="form-error dashboard-authoring-field--wide" role="alert">{titleError.message}</p>}
      {draft.validation?.errors?.filter((error) => error.field !== "title").map((error, index) => (
        <p key={`${error.message}-${index}`} className="form-error dashboard-authoring-field--wide" role="alert">{error.message}</p>
      ))}
      <ChartFootprintPicker
        subject="Panel"
        idPrefix={`static-panel-${draft.draftIdentity?.panelId ?? "draft"}`}
        showTextLabels={false}
        value={resolveChartFootprint(draft.panel?.layout)}
        disabled={disabled}
        onChange={({ columns, rows }) => dispatch({
          type: "setPanel",
          updates: {
            layout: {
              ...(draft.panel?.layout ?? {}),
              size: legacySizeForFootprint({ columns, rows }),
              width: columns,
              height: rows,
            },
          },
        })}
      />
      <div className="dashboard-authoring-field--wide">
        {draft.contentTypeId === "freeText"
          ? <FreeTextFields draft={draft} dashboard={dashboard} contentRenderContext={contentRenderContext} restoration={restoration} disabled={disabled} dispatch={dispatch} onValidationChange={onFreeTextValidation} onRetainMedia={onRetainMedia} onSurfaceChange={onSurfaceChange} />
          : <ImageFields draft={draft} dashboard={dashboard} disabled={disabled} dispatch={dispatch} onRetainMedia={onRetainMedia} onRestorePreviousImage={onRestorePreviousImage} />}
      </div>
    </div>
  );
}

function FreeTextFields({ draft, dashboard, contentRenderContext, restoration, disabled, dispatch, onValidationChange, onRetainMedia, onSurfaceChange }) {
  return (
    <FreeTextSourceEditor
      id="static-qmd-source"
      value={draft.source?.qmd ?? ""}
      panelId={draft.panel?.id ?? "static-text-preview"}
      panelTitle={draft.panel?.title ?? ""}
      initialSurface={restoration?.surface}
      disabled={disabled}
      onSurfaceChange={onSurfaceChange}
      mediaItems={{ ...(dashboard.contentLibrary?.mediaItems ?? {}), ...(draft.pendingMediaItems ?? {}) }}
      assets={draft.assets}
      contentRenderContext={contentRenderContext}
      onChange={(qmd) => dispatch({ type: "updateSource", updates: { qmd } })}
      onValidationChange={onValidationChange}
      onMediaSelect={(mediaItem) => {
        dispatch({ type: "insertQmdMedia", mediaItem });
        void onRetainMedia?.({ mediaItem, owner: "qmd-panel" });
      }}
      onMediaCreate={(candidate) => {
        dispatch({ type: "insertQmdMedia", mediaItem: candidate.mediaItem, manifestEntry: candidate.assets[candidate.assetId] });
        return onRetainMedia?.({ mediaItem: candidate.mediaItem, assetId: candidate.assetId, owner: "qmd-panel" });
      }}
    />
  );
}

function ImageFields({ draft, dashboard, disabled, dispatch, onRetainMedia, onRestorePreviousImage }) {
  const source = draft.source ?? {};
  const mediaItem = draft.mediaItem;
  const editorSource = { ...source, origin: mediaItem?.current };
  const sourceControls = (
    <ImageSourceEditor
      source={editorSource}
      assets={draft.assets}
      mediaItems={dashboard.contentLibrary?.mediaItems ?? {}}
      imageEditing={draft.imageEditing}
      disabled={disabled}
      onOriginChange={(current) => dispatch({ type: "setMediaCurrent", current })}
      onReplace={({ origin, manifestEntry }) => {
        const action = { type: "replaceImage", current: origin, origin, manifestEntry };
        const next = reduceStaticContentDraft(draft, action);
        dispatch(action);
        void onRetainMedia?.({ mediaItem: next.mediaItem, assetId: origin.assetId, owner: "image", replace: true });
      }}
      onMediaSelect={(selected) => {
        dispatch({ type: "selectMediaItem", mediaItem: selected });
        void onRetainMedia?.({ mediaItem: selected, owner: "image", replace: true });
      }}
      onMediaCreate={(candidate) => {
        dispatch({ type: "selectMediaItem", mediaItem: candidate.mediaItem, manifestEntry: candidate.assets[candidate.assetId] });
        return onRetainMedia?.({ mediaItem: candidate.mediaItem, assetId: candidate.assetId, owner: "image", replace: true });
      }}
      onRestorePreviousImage={() => {
        const retained = Object.keys(draft.imageEditing?.replacementUndo?.assets ?? {});
        discardUnreferencedSessionImageAssets(Object.keys(draft.assets ?? {}), retained);
        dispatch({ type: "undoImageReplacement" });
        onRestorePreviousImage?.();
      }}
      onAltChange={(alt) => dispatch({ type: "setImageAlt", alt })}
      onDecorativeChange={(decorative) => dispatch({ type: "setImageDecorative", decorative })}
    />
  );
  return (
    <div data-image-media-id={source.mediaId} data-image-media-revision={mediaItem?.revision}>
    <ImageTransformEditor
      source={source}
      sourceUrl={resolveImageDraftUrl(mediaItem)}
      containedPackagePath={mediaItem?.current?.kind === "package"}
      disabled={disabled}
      sourceControls={sourceControls}
      onTransformChange={({ crop, rotation, fit }) => dispatch({ type: "setImageTransform", crop, rotation, fit })}
      onReset={() => dispatch({ type: "resetImage" })}
    />
    </div>
  );
}

function StaticPreview({ draft, contentRenderContext = {} }) {
  const sourceId = draft.panel?.sourceId;
  const draftMediaItems = {
    ...(draft.pendingMediaItems ?? {}),
    ...(draft.mediaItem ? { [draft.mediaItem.mediaId]: draft.mediaItem } : {}),
  };
  const renderContext = {
    ...contentRenderContext,
    sources: { ...(contentRenderContext.sources ?? {}), [sourceId]: draft.source },
    mediaItems: { ...(contentRenderContext.mediaItems ?? {}), ...draftMediaItems },
    assets: { ...(contentRenderContext.assets ?? {}), ...(draft.assets ?? {}) },
  };
  return (
    <section className="static-content-dialog__preview" aria-label="Text/Image preview">
      {draft.panel?.title?.trim() && <h3>{draft.panel.title.trim()}</h3>}
      <StaticContentStateBoundary state={{ status: "ready" }} surface="build">
        {draft.contentTypeId === "freeText" ? (
          <div data-static-preview-type="freeText">
            <ChartView
              chart={draft.panel}
              renderContext={renderContext}
              interactionMode="active"
            />
          </div>
        ) : (
          <div data-static-preview-type="image">
            <ChartView
              chart={draft.panel}
              renderContext={renderContext}
              interactionMode="passive"
              surface="build"
            />
          </div>
        )}
      </StaticContentStateBoundary>
      <p>Text/Image panels have no CSV, Chrono Group, Scene, or time controls.</p>
    </section>
  );
}

function resolveImageDraftUrl(mediaItem) {
  const current = mediaItem?.current;
  if (current?.kind === "asset") return resolveSessionImageAsset(current.assetId)?.url ?? "";
  if (current?.kind === "url") return current.url;
  if (current?.kind === "package") return current.path;
  return "";
}

export function cleanupImageDraftAssets(draft, dashboard, committed = null) {
  if (draft?.contentTypeId !== "image") return;
  const retained = new Set();
  const replacementMediaId = committed?.mediaItem?.mediaId;
  for (const [mediaId, item] of Object.entries(dashboard?.contentLibrary?.mediaItems ?? {})) {
    const effectiveItem = mediaId === replacementMediaId ? committed.mediaItem : item;
    if (effectiveItem?.current?.kind === "asset") {
      retained.add(effectiveItem.current.assetId);
    }
  }
  if (committed?.mediaItem?.current?.kind === "asset") {
    retained.add(committed.mediaItem.current.assetId);
  }
  discardUnreferencedSessionImageAssets(Object.keys(draft.assets ?? {}), retained);
}

function focusRestoration(stage) {
  const active = typeof document === "undefined" ? null : document.activeElement;
  const editor = typeof document === "undefined" ? null : document.querySelector(".free-text-source-editor");
  const rawSource = editor?.querySelector(".portable-qmd-composer__raw-source");
  const formattedSource = editor?.querySelector(".portable-qmd-composer__surface");
  const editorSurface = rawSource ? "advanced" : editor ? "composer" : null;
  const surface = editorSurface
    || (typeof document !== "undefined" && document.querySelector("[data-image-media-id]") ? "image" : "composer");
  const activeInsideEditor = Boolean(active && editor?.contains(active));
  const surfaceFocusId = rawSource?.id || formattedSource?.id || null;
  const body = typeof document === "undefined" ? null : document.querySelector(".static-content-dialog__body");
  return {
    stage,
    surface,
    focusId: activeInsideEditor ? active?.id || surfaceFocusId : surfaceFocusId,
    invokerId: active?.id || null,
    scrollTop: Number.isFinite(body?.scrollTop) ? body.scrollTop : 0,
  };
}

function isCurrentFreeTextValidation(validation, source) {
  return validation?.ok === true
    && validation.pending !== true
    && validation.source === source
    && validation.sourceRevision === validation.previewRevision;
}

function validateCompiledFreeText(draft) {
  if (draft.source?.kind !== "staticText") return;
  const compiled = compilePortableQmd(draft.source.qmd, {
    panelId: draft.panel?.id ?? "static-text-preview",
    hostHeadingLevel: 2,
  });
  if (compiled.ok) return;
  const first = compiled.errors[0];
  throw new Error(`${first.message} Line ${first.location.line}, column ${first.location.column}. ${first.guidance}`);
}

function PendingAction({ disabled, children }) {
  return <ControlTooltip disabled={disabled} reason={STATIC_CONTENT_PENDING_REASON}>{children}</ControlTooltip>;
}

function recoverContentDraftAuthority(coordinator, draft) {
  if (!coordinator?.getActiveRetainers || !draft?.draftIdentity?.panelId) return null;
  const owner = staticContentMediaOwner(draft);
  const ownerId = `${owner}-${draft.draftIdentity.panelId}`;
  return coordinator.getActiveRetainers().records?.find((record) => record.ownerId === ownerId) ?? null;
}

function ensureContentDraftAuthority({
  contentDraftCoordinator,
  draftId,
  draft,
  result,
  assetIds,
  mediaIds,
  onContentDraftStage,
}) {
  const owner = staticContentMediaOwner(draft);
  const input = {
    draftId,
    owner,
    kind: owner === "qmd-panel" ? "qmd-panel-media" : "image-panel-media",
    payload: result,
    assetIds,
    mediaIds,
    sourceIds: [result.panel.sourceId],
  };
  const retained = contentDraftCoordinator.getActiveRetainers().records
    .some((record) => record.ownerId === draftId);
  if (retained) {
    contentDraftCoordinator.updateDraft(draftId, input);
    return draftId;
  }
  const staged = onContentDraftStage?.(input);
  if (!staged) throw new Error("The Text/Image media transaction is no longer available. Choose the image again and retry.");
  return staged.draftId ?? draftId;
}

function staticContentMediaOwner(draft) {
  return draft?.contentTypeId === "freeText" ? "qmd-panel" : "image";
}

export default StaticContentWizard;
