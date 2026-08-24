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
import ChartView from "../charts/ChartView.jsx";

export function StaticContentWizard({
  open = false,
  dashboard = {},
  destination,
  initialDraft,
  editor = false,
  disabled = false,
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
      : createStaticContentDraft({ destination, mode: editor ? "edit" : "create" }),
  );
  const [submitError, setSubmitError] = React.useState("");
  const [freeTextValidation, setFreeTextValidation] = React.useState(null);
  const dirty = isStaticContentDraftDirty(draft);
  const freeTextInvalid = draft.contentTypeId === "freeText"
    && freeTextValidation?.ok !== true;
  const freeTextBlocked = draft.stage === "content" && freeTextInvalid;
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
        dispatch({ type: "next" });
        return;
      }
      const result = finalizeStaticContentDraft(draft);
      await onCreate?.(result);
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
          <button type="submit" disabled={disabled || freeTextBlocked}>
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
  const origin = source.origin ?? { kind: "url", url: "" };
  const update = (updates) => dispatch({ type: "updateSource", updates });
  const updateCrop = (key, value) => update({ crop: { ...source.crop, [key]: Number(value) } });
  return (
    <>
      <fieldset>
        <legend>Source</legend>
        <label htmlFor="static-image-origin-kind">Image origin</label>
        <select id="static-image-origin-kind" value={origin.kind} onChange={(event) => update({ origin: originForKind(event.target.value) })}>
          <option value="url">Linked HTTPS URL</option>
          <option value="asset">Local authored asset</option>
          <option value="package">Packaged asset</option>
        </select>
        <label htmlFor="static-image-origin-value">Source value</label>
        <input id="static-image-origin-value" value={originValue(origin)} onChange={(event) => update({ origin: withOriginValue(origin, event.target.value) })} />
      </fieldset>
      <fieldset>
        <legend>Accessibility</legend>
        <label><input type="checkbox" checked={source.decorative === true} onChange={(event) => update({ decorative: event.target.checked, alt: event.target.checked ? "" : source.alt })} /> Decorative image</label>
        {!source.decorative && <><label htmlFor="static-image-alt">Alternative text</label><input id="static-image-alt" value={source.alt ?? ""} onChange={(event) => update({ alt: event.target.value })} /></>}
      </fieldset>
      <fieldset>
        <legend>Image transform</legend>
        <label htmlFor="static-image-fit">Fit</label>
        <select id="static-image-fit" value={source.fit ?? "contain"} onChange={(event) => update({ fit: event.target.value })}><option value="contain">Contain</option><option value="cover">Cover</option></select>
        <label htmlFor="static-image-rotation">Rotation</label>
        <select id="static-image-rotation" value={source.rotation ?? 0} onChange={(event) => update({ rotation: Number(event.target.value) })}>{[0, 90, 180, 270].map((value) => <option key={value} value={value}>{value}°</option>)}</select>
        {[["x", "Crop x"], ["y", "Crop y"], ["width", "Crop width"], ["height", "Crop height"]].map(([key, label]) => <React.Fragment key={key}><label htmlFor={`static-image-crop-${key}`}>{label}</label><input id={`static-image-crop-${key}`} type="number" min={key === "width" || key === "height" ? 1 : 0} max="1000" value={source.crop?.[key] ?? (key === "width" || key === "height" ? 1000 : 0)} onChange={(event) => updateCrop(key, event.target.value)} /></React.Fragment>)}
        <button type="button" className="secondary" onClick={() => update({ fit: "contain", rotation: 0, crop: { x: 0, y: 0, width: 1000, height: 1000 } })}>Reset image</button>
      </fieldset>
    </>
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
          <article data-static-preview-type="image">
            <h4>{draft.panel?.title}</h4>
            <p>Image preview uses the saved {draft.source?.fit} fit at {draft.source?.rotation}°.</p>
          </article>
        )}
      </StaticContentStateBoundary>
      <p>Static content has no CSV, Chrono Group, Scene, or time controls.</p>
    </section>
  );
}

function originForKind(kind) {
  if (kind === "asset") return { kind, assetId: "" };
  if (kind === "package") return { kind, path: "" };
  return { kind: "url", url: "" };
}

function originValue(origin) {
  return origin.kind === "asset" ? origin.assetId ?? "" : origin.kind === "package" ? origin.path ?? "" : origin.url ?? "";
}

function withOriginValue(origin, value) {
  if (origin.kind === "asset") return { kind: "asset", assetId: value };
  if (origin.kind === "package") return { kind: "package", path: value };
  return { kind: "url", url: value };
}

function focusRestoration(stage) {
  const active = typeof document === "undefined" ? null : document.activeElement;
  return {
    stage,
    focusId: active?.id || null,
    invokerId: active?.id || null,
  };
}

export default StaticContentWizard;
