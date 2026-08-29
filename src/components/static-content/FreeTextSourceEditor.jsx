import React from "react";

import FreeTextChartView from "../charts/FreeTextChartView.jsx";
import { compilePortableQmd } from "../../static-content/qmd/compilePortableQmd.js";
import { parsePortableQmd } from "../../static-content/qmd/parsePortableQmd.js";
import { parsePortableQmdEditorDocument } from "../../static-content/qmd/portableQmdEditorDocument.js";
import { parsePortableQmdWithMedia, serializePortableMediaReference } from "../../static-content/qmd/portableQmdMedia.js";
import { applyQmdToolbarCommand } from "../../static-content/qmd/sourceToolbarCommands.js";
import MediaPicker from "../source-content/MediaPicker.jsx";
import PortableQmdRichTextEditor from "./PortableQmdRichTextEditor.jsx";
import QmdMediaInspector from "./QmdMediaInspector.jsx";

const NARROW_EDITOR_QUERY = "(max-width: 860px)";

export function FreeTextSourceEditor({
  id = "static-qmd-source", value = "", panelId = "static-text-preview", panelTitle = "",
  disabled = false, mediaItems = {}, assets = {}, contentRenderContext = {},
  onChange, onValidationChange, onMediaSelect, onMediaCreate, onOpenMediaItem,
} = {}) {
  const initial = React.useMemo(() => analyze(value, panelId), []);
  const initialEditorDocument = React.useMemo(() => parsePortableQmdEditorDocument(value), []);
  const [analysis, setAnalysis] = React.useState(initial);
  const [lastValidSource, setLastValidSource] = React.useState(initial.ok ? value : null);
  const [pending, setPending] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(initialEditorDocument.mode === "advanced" ? "advanced" : "composer");
  const [narrow, setNarrow] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState("insert");
  const [selectedMediaIdentity, setSelectedMediaIdentity] = React.useState(null);
  const revision = React.useRef(0);
  const lastValidRevision = React.useRef(initial.ok ? 0 : null);
  const observedSource = React.useRef(value);
  const analysisCache = React.useRef(new Map([[value, initial]]));
  const panesRef = React.useRef({});
  const lastFocused = React.useRef({ composer: null, preview: null, advanced: null });
  const editorRef = React.useRef(null);
  const sourceInputRef = React.useRef(null);
  const changeTriggerRef = React.useRef(null);
  const editorDocument = React.useMemo(() => parsePortableQmdEditorDocument(value), [value]);
  const previewRenderContext = React.useMemo(() => ({
    ...contentRenderContext,
    mediaItems: { ...(contentRenderContext.mediaItems ?? {}), ...mediaItems },
    assets: { ...(contentRenderContext.assets ?? {}), ...assets },
  }), [assets, contentRenderContext, mediaItems]);

  React.useEffect(() => {
    onValidationChange?.({ ...initial, pending: false, source: value, sourceRevision: 0, previewRevision: lastValidRevision.current });
  }, []);

  React.useEffect(() => {
    if (value === observedSource.current) return undefined;
    observedSource.current = value;
    revision.current += 1;
    if (editorDocument.mode === "advanced") setActiveTab("advanced");
    const cached = analysisCache.current.get(value);
    if (cached) {
      applyAnalysis(cached, value, revision.current);
      return undefined;
    }
    setPending(true);
    onValidationChange?.(pendingValidation(value, revision.current, lastValidRevision.current));
    const timer = setTimeout(() => {
      const next = analyze(value, panelId);
      analysisCache.current.set(value, next);
      applyAnalysis(next, value, revision.current);
    }, 200);
    return () => clearTimeout(timer);
  }, [editorDocument.mode, onValidationChange, panelId, value]);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(NARROW_EDITOR_QUERY);
    const apply = (matches) => {
      const focusOwner = Object.entries(panesRef.current).find(([, pane]) => pane?.contains(document.activeElement))?.[0];
      setNarrow(matches);
      if (matches && focusOwner) setActiveTab(focusOwner);
      if (focusOwner) window.requestAnimationFrame(() => lastFocused.current[focusOwner]?.focus({ preventScroll: true }));
    };
    apply(media.matches);
    const listener = (event) => apply(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  function applyAnalysis(next, source, sourceRevision) {
    setAnalysis(next);
    setPending(false);
    if (next.ok) { setLastValidSource(source); lastValidRevision.current = sourceRevision; }
    onValidationChange?.({ ...next, pending: false, source, sourceRevision, previewRevision: next.ok ? sourceRevision : lastValidRevision.current });
  }

  const changeSource = (nextSource) => {
    revision.current += 1;
    setPending(true);
    onValidationChange?.(pendingValidation(nextSource, revision.current, lastValidRevision.current));
    onChange?.(nextSource);
  };
  const mediaNodes = React.useMemo(() => parsePortableQmdWithMedia(value).ast?.mediaNodes ?? [], [value]);
  const selectedMediaNode = Number.isInteger(selectedMediaIdentity?.mediaNodeIndex) ? mediaNodes[selectedMediaIdentity.mediaNodeIndex] : null;
  const selectedPlacement = selectedMediaNode ? { mediaId: selectedMediaNode.mediaId, alt: selectedMediaNode.alt, ...selectedMediaNode.attributes } : null;
  const updateSelectedPlacement = (placement) => {
    if (!selectedMediaNode || !Number.isInteger(selectedMediaNode.sourceStart) || !Number.isInteger(selectedMediaNode.sourceEnd)) return;
    changeSource(`${value.slice(0, selectedMediaNode.sourceStart)}${serializePortableMediaReference(placement)}${value.slice(selectedMediaNode.sourceEnd)}`);
  };
  const chooseMedia = (item) => {
    if (pickerMode === "change" && selectedPlacement) {
      updateSelectedPlacement({ ...selectedPlacement, mediaId: item.mediaId });
      closeChangePicker();
    } else { onMediaSelect?.(item); setPickerOpen(false); }
  };
  const closeChangePicker = () => {
    setPickerOpen(false);
    window.requestAnimationFrame(() => {
      const trigger = changeTriggerRef.current;
      (trigger?.isConnected ? trigger : editorRef.current?.querySelector('[aria-label="Insert image"]'))?.focus({ preventScroll: true });
    });
  };
  const applyToolbarCommand = (command) => {
    const input = sourceInputRef.current;
    if (!input || disabled) return;
    const result = applyQmdToolbarCommand(value, input.selectionStart, input.selectionEnd, command);
    changeSource(result.source);
    window.requestAnimationFrame(() => { input.focus({ preventScroll: true }); input.setSelectionRange(result.selectionStart, result.selectionEnd); });
  };
  const recordFocus = (pane) => (event) => { lastFocused.current[pane] = event.target; };
  const selectTabFromKeyboard = (tab, event) => {
    const order = ["composer", "preview", "advanced"];
    const index = order.indexOf(tab);
    const next = event.key === "Home" ? order[0] : event.key === "End" ? order.at(-1) : event.key === "ArrowRight" ? order[(index + 1) % order.length] : event.key === "ArrowLeft" ? order[(index - 1 + order.length) % order.length] : null;
    if (!next) return;
    event.preventDefault(); setActiveTab(next);
    window.requestAnimationFrame(() => document.getElementById(`${id}-${next}-tab`)?.focus());
  };
  const hidden = (pane) => narrow ? activeTab !== pane : activeTab === "advanced" ? pane !== "advanced" : pane === "advanced";
  const stale = !pending && !analysis.ok && lastValidSource !== null;
  const status = pending ? "Updating preview…" : analysis.ok ? "Preview is up to date." : `${analysis.errors.length} blocking ${analysis.errors.length === 1 ? "error" : "errors"}. The last valid preview is unchanged.`;

  return (
    <section ref={editorRef} className="free-text-source-editor" data-layout={narrow ? "tabs" : "split"} data-active-tab={activeTab} data-source-revision={revision.current} data-preview-revision={lastValidRevision.current ?? "none"}>
      <div className="free-text-source-editor__tabs" role="tablist" aria-label="Text/Image authoring panes">
        {[["composer", "Composer"], ["preview", "Preview"], ["advanced", "Advanced QMD"]].map(([tab, label]) => <button key={tab} type="button" role="tab" id={`${id}-${tab}-tab`} aria-controls={`${id}-${tab}-pane`} aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} onClick={() => setActiveTab(tab)} onKeyDown={(event) => selectTabFromKeyboard(tab, event)}>{label}</button>)}
      </div>
      <div className="free-text-source-editor__panes">
        <section ref={(node) => { panesRef.current.composer = node; }} id={`${id}-composer-pane`} className="free-text-source-editor__pane free-text-source-editor__source" data-free-text-pane="composer" role="tabpanel" aria-labelledby={`${id}-composer-tab`} hidden={hidden("composer")} onFocusCapture={recordFocus("composer")}>
          {editorDocument.mode === "visual" ? <PortableQmdRichTextEditor source={value} disabled={disabled} mediaItems={mediaItems} assets={assets} onSourceChange={changeSource} onMediaSelect={() => { setPickerMode("insert"); setPickerOpen(true); }} /> : <div className="free-text-advanced-required" role="note"><h3>Advanced QMD required</h3><p>{editorDocument.reason}</p><button type="button" className="secondary" onClick={() => setActiveTab("advanced")}>Open Advanced QMD</button></div>}
        </section>
        <section ref={(node) => { panesRef.current.preview = node; }} id={`${id}-preview-pane`} className="free-text-source-editor__pane free-text-source-editor__preview" data-free-text-pane="preview" role="tabpanel" aria-labelledby={`${id}-preview-tab`} hidden={hidden("preview")} onFocusCapture={recordFocus("preview")}>
          <header className="free-text-source-editor__preview-header"><h3>{panelTitle.trim() || "Preview"}</h3>{stale && <span className="free-text-preview-stale">Preview is stale</span>}</header>
          {lastValidSource !== null && typeof document !== "undefined" ? <FreeTextChartView model={{ qmd: lastValidSource, sourceId: `${panelId}-source`, revision: lastValidRevision.current ?? 1 }} chart={{ id: panelId, title: panelTitle.trim() || "Preview" }} contentRenderContext={previewRenderContext} onMediaActivate={({ mediaNodeIndex, sourceStart, sourceEnd }) => setSelectedMediaIdentity({ mediaNodeIndex, sourceStart, sourceEnd })} /> : lastValidSource !== null ? <p className="static-content-state">Preview is available in the browser.</p> : <p className="static-content-state static-content-state--error">Enter valid portable QMD to create a preview.</p>}
        </section>
        <section ref={(node) => { panesRef.current.advanced = node; }} id={`${id}-advanced-pane`} className="free-text-source-editor__pane free-text-source-editor__advanced" data-free-text-pane="advanced" role="tabpanel" aria-labelledby={`${id}-advanced-tab`} hidden={hidden("advanced")} onFocusCapture={recordFocus("advanced")}>
          <h3>Advanced QMD</h3>
          {editorDocument.mode === "advanced" && <p className="free-text-advanced-reason" role="note">{editorDocument.reason}</p>}
          <div role="toolbar" aria-label="Format Advanced QMD" className="free-text-source-editor__toolbar">
            <ToolbarButton label="Bold" command={{ type: "wrap", before: "**", after: "**", placeholder: "bold text" }} onCommand={applyToolbarCommand} disabled={disabled} />
            <ToolbarButton label="Underline" command={{ type: "wrap", before: "++", after: "++", placeholder: "underlined text" }} onCommand={applyToolbarCommand} disabled={disabled} />
            <ToolbarButton label="Italics" command={{ type: "wrap", before: "*", after: "*", placeholder: "italic text" }} onCommand={applyToolbarCommand} disabled={disabled} />
            <ToolbarButton label="Bulleted list" command={{ type: "line-prefix", prefix: "- " }} onCommand={applyToolbarCommand} disabled={disabled} />
            <ToolbarButton label="Insert table" command={{ type: "table" }} onCommand={applyToolbarCommand} disabled={disabled} />
          </div>
          <label htmlFor={id}>Portable QMD source</label>
          <textarea ref={sourceInputRef} id={id} value={value} disabled={disabled} aria-describedby={`${id}-advanced-help ${id}-status`} aria-invalid={!pending && !analysis.ok ? "true" : undefined} onChange={(event) => changeSource(event.target.value)} />
          <small id={`${id}-advanced-help`}>Advanced QMD preserves exact authored source. Preview rendering remains local and inert.</small>
          <button type="button" className="secondary" disabled={disabled} onClick={() => { setPickerMode("insert"); setPickerOpen(true); }}>Insert image</button>
          {!pending && analysis.errors.length > 0 && <ValidationErrors id={id} value={value} errors={analysis.errors} />}
        </section>
      </div>
      {pickerOpen && pickerMode === "change" && <ChangeMediaPicker mediaItems={mediaItems} selectedMediaId={selectedPlacement?.mediaId} onSelect={chooseMedia} onCancel={closeChangePicker} />}
      {pickerOpen && pickerMode === "insert" && <MediaPicker mediaItems={mediaItems} assets={assets} mode="qmd" onSelect={chooseMedia} onCreateLocal={async (candidate, context) => { await onMediaCreate?.(candidate, context); setPickerOpen(false); }} onCancel={() => setPickerOpen(false)} />}
      {selectedPlacement && <QmdMediaInspector placement={selectedPlacement} mediaItem={valueForId(mediaItems, selectedPlacement.mediaId)} disabled={disabled} onChange={updateSelectedPlacement} onChangeImage={(_mediaId, { trigger } = {}) => { changeTriggerRef.current = trigger ?? null; setPickerMode("change"); setPickerOpen(true); }} onOpenMediaItem={(mediaId) => (onOpenMediaItem ?? contentRenderContext.openMediaItem)?.(mediaId)} />}
      <p id={`${id}-status`} className="free-text-source-editor__status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
    </section>
  );
}

function ValidationErrors({ id, value, errors }) {
  return <div className="free-text-validation-errors" aria-labelledby={`${id}-errors-title`}><h3 id={`${id}-errors-title`}>Fix before continuing</h3><ol>{errors.map((error, index) => <li key={`${error.rule}-${index}`} data-validation-rule={error.rule}><a href={`#${id}`} onClick={(event) => { event.preventDefault(); const input = document.getElementById(id); input?.focus(); const offset = sourceOffset(value, error.location); input?.setSelectionRange(offset, offset); }}>Line {error.location.line}, column {error.location.column}: {error.message}</a><span>{error.guidance}</span></li>)}</ol></div>;
}

function pendingValidation(source, sourceRevision, previewRevision) { return { ok: false, pending: true, errors: [], warnings: [], source, sourceRevision, previewRevision }; }
function ToolbarButton({ label, command, onCommand, disabled }) { return <button type="button" aria-label={label} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => onCommand(command)}>{label}</button>; }

function ChangeMediaPicker({ mediaItems, selectedMediaId, onSelect, onCancel }) {
  const eligible = collectionValues(mediaItems).filter((item) => item?.health === "ready" && ["asset", "package"].includes(item?.current?.kind)).sort((left, right) => left.mediaId.localeCompare(right.mediaId));
  const focusId = eligible.some((item) => item.mediaId === selectedMediaId) ? selectedMediaId : eligible[0]?.mediaId;
  return <section className="source-content-detail-card" aria-label="Media picker" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel(); } }}><header><h3>Change image</h3><p>Choose an existing portable local media item for this placement.</p></header><fieldset><legend>Available local media</legend>{eligible.length === 0 ? <p>No eligible media is available.</p> : eligible.map((item) => <label key={item.mediaId}><input type="radio" name="qmd-media-change-selection" value={item.mediaId} checked={item.mediaId === selectedMediaId} autoFocus={item.mediaId === focusId} onChange={() => onSelect(item)} /><strong>{item.displayName}</strong> {item.origin} · {item.health}</label>)}</fieldset><button type="button" className="secondary" autoFocus={eligible.length === 0} onClick={onCancel}>Close media picker</button></section>;
}

function analyze(source, panelId) {
  try {
    if (typeof document === "undefined") { const parsed = parsePortableQmd(source); return { ok: parsed.ok, errors: parsed.errors, warnings: parsed.warnings }; }
    const result = compilePortableQmd(source, { panelId, hostHeadingLevel: 2 });
    return { ok: result.ok, errors: result.errors, warnings: result.warnings };
  } catch (error) { return { ok: false, errors: [{ rule: "parse-failure", message: error?.message ?? "This source could not be parsed.", guidance: "Review the source and try again.", location: { line: 1, column: 1 } }], warnings: [] }; }
}

function sourceOffset(source, location) { const lines = source.split("\n"); let offset = 0; for (let index = 0; index < Math.max(0, location.line - 1); index += 1) offset += (lines[index]?.length ?? 0) + 1; return Math.min(source.length, offset + Math.max(0, location.column - 1)); }
function valueForId(collection, id) { if (collection instanceof Map) return collection.get(id); if (Array.isArray(collection)) return collection.find((entry) => entry?.mediaId === id); return collection?.[id]; }
function collectionValues(collection) { if (collection instanceof Map) return [...collection.values()]; if (Array.isArray(collection)) return collection; return Object.values(collection ?? {}); }

export default FreeTextSourceEditor;
