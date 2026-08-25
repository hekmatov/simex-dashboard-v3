import React from "react";

import ConfirmDialog from "../common/ConfirmDialog.jsx";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import {
  STATIC_CONTENT_STAGES,
  STATIC_CONTENT_STAGE_LABELS,
  createStaticContentDraft,
  finalizeStaticContentDraft,
  isStaticContentDraftDirty,
  reduceStaticContentDraft,
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

export function StaticContentWizard({
  open = false,
  dashboard = {},
  destination,
  initialDraft,
  editor = false,
  disabled = false,
  contentDraftCoordinator = null,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
  onDraftChange,
  onDirtyChange,
  onCreate,
  onClose,
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
  const dirty = isStaticContentDraftDirty(draft);
  const freeTextRequiresValidation = draft.contentTypeId === "freeText"
    && (draft.stage === "content" || draft.stage === "preview-and-add");
  const freeTextInvalid = freeTextRequiresValidation && !isCurrentFreeTextValidation(
      freeTextValidation,
      draft.source?.qmd ?? "",
    );
  React.useEffect(() => { onDraftChange?.(draft); }, [draft, onDraftChange]);
  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  if (!open) return null;

  const stageIndex = STATIC_CONTENT_STAGES.indexOf(draft.stage);
  const requestClose = () => {
    if (!dirty) {
      onClose?.({ discarded: false, draft });
      return;
    }
    dispatch({ type: "requestCancel", restoration: focusRestoration(draft.stage) });
  };
  const submit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    try {
      if (draft.stage !== "preview-and-add") {
        if (freeTextInvalid) throw new Error("Wait for the Free-text preview to finish validating before continuing.");
        dispatch({ type: "next" });
        return;
      }
      validateCompiledFreeText(draft);
      const result = finalizeStaticContentDraft(draft);
      await onCreate?.(result);
      cleanupImageDraftAssets(draft, dashboard, result);
      dispatch({ type: "committed" });
    } catch (error) {
      setSubmitError(error?.message ?? "Static content could not be saved.");
    }
  };

  return (
    <div className="static-content-dialog-backdrop">
      <ModalFocusScope
        as="form"
        open={open}
        className="static-content-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="static-content-dialog-title"
        initialFocusSelector={'[data-static-initial-focus="true"]'}
        onEscape={requestClose}
        onSubmit={submit}
      >
        <header>
          <div>
            <p className="eyebrow">{editor ? "Static content editor" : "Add static content"}</p>
            <h2 id="static-content-dialog-title">{editor ? "Edit static content" : "Add static content"}</h2>
          </div>
          <button type="button" className="secondary" aria-label="Close static content editor" onClick={requestClose}>Close</button>
        </header>
        <nav aria-label="Static content stages">
          {(editor ? STATIC_CONTENT_STAGES.slice(2) : STATIC_CONTENT_STAGES).map((stage) => {
            const index = STATIC_CONTENT_STAGES.indexOf(stage);
            return (
              <button
                key={stage}
                type="button"
                className="secondary"
                aria-current={draft.stage === stage ? "step" : undefined}
                disabled={disabled
                  || (!editor && index > stageIndex + 1)
                  || (stage === "preview-and-add" && freeTextInvalid)}
                onClick={() => dispatch({ type: "setStage", stage })}
              >
                {STATIC_CONTENT_STAGE_LABELS[index]}
              </button>
            );
          })}
        </nav>

        <section className="static-content-dialog__body" data-static-content-stage={draft.stage}>
          {draft.stage === "destination" && <DestinationFields dashboard={dashboard} draft={draft} dispatch={dispatch} />}
          {draft.stage === "content-type" && <ContentTypeFields draft={draft} dispatch={dispatch} />}
          {draft.stage === "content" && <StaticContentFields draft={draft} dispatch={dispatch} onFreeTextValidation={setFreeTextValidation} />}
          {draft.stage === "preview-and-add" && <StaticPreview draft={draft} />}
        </section>

        {submitError && <p className="form-error" role="alert">{submitError}</p>}
        <footer>
          <button type="button" className="secondary" onClick={requestClose}>Cancel</button>
          {stageIndex > (editor ? 2 : 0) && <button type="button" className="secondary" onClick={() => dispatch({ type: "previous" })}>Back</button>}
          <button type="submit" disabled={disabled || freeTextInvalid}>
            {draft.stage === "preview-and-add" ? (editor ? "Save" : "Add") : "Continue"}
          </button>
        </footer>
      </ModalFocusScope>
      <ConfirmDialog
        open={draft.confirmation === "discard"}
        title="Discard static content changes?"
        message="Your unsaved static content changes last only for this application session."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        onCancel={() => dispatch({ type: "keepEditing" })}
        onConfirm={() => {
          cleanupImageDraftAssets(draft, dashboard);
          dispatch({ type: "discard" });
          onClose?.({ discarded: true, draft });
        }}
      />
    </div>
  );
}

function DestinationFields({ dashboard, draft, dispatch }) {
  const pages = (dashboard.pages ?? []).filter(({ landing }) => !landing);
  const page = pages.find(({ id }) => id === draft.destination?.pageId) ?? pages[0];
  return (
    <fieldset>
      <legend>Destination</legend>
      <label htmlFor="static-destination-page">Page</label>
      <select
        id="static-destination-page"
        data-static-initial-focus="true"
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
        value={draft.destination?.sectionId ?? ""}
        onChange={(event) => dispatch({ type: "setDestination", destination: { pageId: page?.id, sectionId: event.target.value } })}
      >
        <option value="">Choose a Section</option>
        {(page?.sections ?? []).map((section) => <option key={section.id} value={section.id}>{section.title ?? section.id}</option>)}
      </select>
    </fieldset>
  );
}

function ContentTypeFields({ draft, dispatch }) {
  return (
    <fieldset>
      <legend>Content type</legend>
      {listStaticContentTypeOptions().map((option, index) => (
        <label key={option.id}>
          <input
            data-static-initial-focus={index === 0 ? "true" : undefined}
            type="radio"
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

export function StaticContentFields({ draft, dispatch, onFreeTextValidation }) {
  return (
    <div>
      <label htmlFor="static-panel-title">Panel title</label>
      <input
        id="static-panel-title"
        data-static-initial-focus="true"
        value={draft.panel?.title ?? ""}
        onChange={(event) => dispatch({ type: "setPanel", updates: { title: event.target.value } })}
      />
      {draft.contentTypeId === "freeText"
        ? <FreeTextFields draft={draft} dispatch={dispatch} onValidationChange={onFreeTextValidation} />
        : <ImageFields draft={draft} dispatch={dispatch} />}
    </div>
  );
}

function FreeTextFields({ draft, dispatch, onValidationChange }) {
  return (
    <FreeTextSourceEditor
      id="static-qmd-source"
      value={draft.source?.qmd ?? ""}
      panelId={draft.panel?.id ?? "static-text-preview"}
      onChange={(qmd) => dispatch({ type: "updateSource", updates: { qmd } })}
      onValidationChange={onValidationChange}
    />
  );
}

function ImageFields({ draft, dispatch }) {
  const source = draft.source ?? {};
  const mediaItem = draft.mediaItem;
  const editorSource = { ...source, origin: mediaItem?.current };
  const sourceControls = (
    <ImageSourceEditor
      source={editorSource}
      assets={draft.assets}
      imageEditing={draft.imageEditing}
      onOriginChange={(current) => dispatch({ type: "setMediaCurrent", current })}
      onReplace={({ origin, manifestEntry }) => dispatch({ type: "replaceImage", current: origin, origin, manifestEntry })}
      onUndoReplacement={() => {
        const retained = Object.keys(draft.imageEditing?.replacementUndo?.assets ?? {});
        discardUnreferencedSessionImageAssets(Object.keys(draft.assets ?? {}), retained);
        dispatch({ type: "undoImageReplacement" });
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
      sourceControls={sourceControls}
      onTransformChange={({ crop, rotation, fit }) => dispatch({ type: "setImageTransform", crop, rotation, fit })}
      onReset={() => dispatch({ type: "resetImage" })}
    />
    </div>
  );
}

function StaticPreview({ draft }) {
  const sourceId = draft.panel?.sourceId;
  return (
    <section aria-label="Canonical static content preview">
      <h3>Preview &amp; add</h3>
      <StaticContentStateBoundary state={{ status: "ready" }} surface="build">
        {draft.contentTypeId === "freeText" ? (
          <div data-static-preview-type="freeText">
            <ChartView
              chart={draft.panel}
              renderContext={{ sources: { [sourceId]: draft.source } }}
              interactionMode="active"
            />
          </div>
        ) : (
          <div data-static-preview-type="image">
            <ChartView
              chart={draft.panel}
              renderContext={{
                sources: { [sourceId]: draft.source },
                mediaItems: draft.mediaItem ? { [draft.mediaItem.mediaId]: draft.mediaItem } : {},
                assets: draft.assets,
              }}
              interactionMode="passive"
              surface="build"
            />
          </div>
        )}
      </StaticContentStateBoundary>
      <p>Static content has no CSV, Chrono Group, Scene, or time controls.</p>
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
  return {
    stage,
    focusId: active?.id || null,
    invokerId: active?.id || null,
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

export default StaticContentWizard;
