import React from "react";

import AuthoringFootprintFrame from "../common/AuthoringFootprintFrame.jsx";
import FreeTextChartView from "../charts/FreeTextChartView.jsx";
import { compilePortableQmd } from "../../static-content/qmd/compilePortableQmd.js";
import { parsePortableQmd } from "../../static-content/qmd/parsePortableQmd.js";
import { parsePortableQmdWithMedia, serializePortableMediaReference } from "../../static-content/qmd/portableQmdMedia.js";
import MediaPicker from "../source-content/MediaPicker.jsx";
import PortableQmdRichTextEditor from "./PortableQmdRichTextEditor.jsx";
import QmdMediaInspector from "./QmdMediaInspector.jsx";

export function FreeTextSourceEditor({
  id = "static-qmd-source", value = "", panelId = "static-text-preview", panelTitle = "",
  layout,
  disabled = false, mediaItems = {}, assets = {}, contentRenderContext = {},
  initialSurface, onChange, onValidationChange, onMediaSelect, onMediaCreate, onOpenMediaItem, onSurfaceChange,
} = {}) {
  const initial = React.useMemo(() => analyze(value, panelId), []);
  const [analysis, setAnalysis] = React.useState(initial);
  const [lastValidSource, setLastValidSource] = React.useState(initial.ok ? value : null);
  const [pending, setPending] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState("insert");
  const [editorMode, setEditorMode] = React.useState(
    initialSurface === "advanced" || initialSurface === "raw" ? "raw" : "formatted",
  );
  const [selectedMediaIdentity, setSelectedMediaIdentity] = React.useState(null);
  const revision = React.useRef(0);
  const lastValidRevision = React.useRef(initial.ok ? 0 : null);
  const observedSource = React.useRef(value);
  const analysisCache = React.useRef(new Map([[value, initial]]));
  const editorRef = React.useRef(null);
  const changeTriggerRef = React.useRef(null);
  const previewRenderContext = React.useMemo(() => ({
    ...contentRenderContext,
    mediaItems: { ...(contentRenderContext.mediaItems ?? {}), ...mediaItems },
    assets: { ...(contentRenderContext.assets ?? {}), ...assets },
  }), [assets, contentRenderContext, mediaItems]);

  React.useEffect(() => {
    onValidationChange?.({ ...initial, pending: false, source: value, sourceRevision: 0, previewRevision: lastValidRevision.current });
  }, []);
  React.useEffect(() => {
    onSurfaceChange?.(editorMode === "raw" ? "advanced" : "composer");
  }, [editorMode, onSurfaceChange]);
  React.useEffect(() => { if (disabled) setPickerOpen(false); }, [disabled]);

  React.useEffect(() => {
    if (value === observedSource.current) return undefined;
    observedSource.current = value;
    revision.current += 1;
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
  }, [onValidationChange, panelId, value]);

  function applyAnalysis(next, source, sourceRevision) {
    setAnalysis(next);
    setPending(false);
    if (next.ok) { setLastValidSource(source); lastValidRevision.current = sourceRevision; }
    onValidationChange?.({ ...next, pending: false, source, sourceRevision, previewRevision: next.ok ? sourceRevision : lastValidRevision.current });
  }

  const changeSource = (nextSource) => {
    if (disabled) return;
    revision.current += 1;
    setPending(true);
    onValidationChange?.(pendingValidation(nextSource, revision.current, lastValidRevision.current));
    onChange?.(nextSource);
  };
  const mediaNodes = React.useMemo(() => parsePortableQmdWithMedia(value).ast?.mediaNodes ?? [], [value]);
  const selectedMediaNode = Number.isInteger(selectedMediaIdentity?.mediaNodeIndex) ? mediaNodes[selectedMediaIdentity.mediaNodeIndex] : null;
  const selectedPlacement = selectedMediaNode ? { mediaId: selectedMediaNode.mediaId, alt: selectedMediaNode.alt, ...selectedMediaNode.attributes } : null;
  const hasValidationErrors = !pending && analysis.errors.length > 0;
  const validationTarget = validationTargetId(editorMode === "raw" ? "advanced" : "visual", id);
  const updateSelectedPlacement = (placement) => {
    if (disabled) return;
    if (!selectedMediaNode || !Number.isInteger(selectedMediaNode.sourceStart) || !Number.isInteger(selectedMediaNode.sourceEnd)) return;
    changeSource(`${value.slice(0, selectedMediaNode.sourceStart)}${serializePortableMediaReference(placement)}${value.slice(selectedMediaNode.sourceEnd)}`);
  };
  const chooseMedia = (item) => {
    if (disabled) return;
    if (pickerMode === "change" && selectedPlacement) {
      updateSelectedPlacement({ ...selectedPlacement, mediaId: item.mediaId });
      closeChangePicker();
    } else { onMediaSelect?.(item); setPickerOpen(false); }
  };
  const createMedia = async (candidate, context) => {
    if (pickerMode === "change" && selectedPlacement) {
      await onMediaCreate?.(candidate, {
        ...context,
        intent: "change",
        sourceStart: selectedMediaNode?.sourceStart,
        sourceEnd: selectedMediaNode?.sourceEnd,
      });
      updateSelectedPlacement({ ...selectedPlacement, mediaId: candidate.mediaItem.mediaId });
      closeChangePicker();
      return;
    }
    await onMediaCreate?.(candidate, { ...context, intent: "insert" });
    setPickerOpen(false);
  };
  const closeChangePicker = () => {
    setPickerOpen(false);
    window.requestAnimationFrame(() => {
      const trigger = changeTriggerRef.current;
      (trigger?.isConnected ? trigger : editorRef.current?.querySelector('[aria-label="Insert image"]'))?.focus({ preventScroll: true });
    });
  };
  return (
    <section ref={editorRef} className="free-text-source-editor" data-source-revision={revision.current} data-preview-revision={lastValidRevision.current ?? "none"}>
      <AuthoringFootprintFrame layout={layout} kind="writer">
      <section className="free-text-source-editor__writer-card" aria-label="Text post editor">
        <header className="free-text-source-editor__writer-header">
          <div><h3>Write a text post</h3><p>Formatting stays active until you turn it off.</p></div>
          <p className="free-text-source-editor__shortcuts"><kbd>Ctrl</kbd> + <kbd>B</kbd> / <kbd>I</kbd> also work</p>
        </header>
        <div id="portable-qmd-composer-focus-target" data-qmd-editor-focus-target="true"><PortableQmdRichTextEditor source={value} disabled={disabled} initialMode={editorMode} rawSourceId={id} rawInvalid={hasValidationErrors} rawDescribedBy={hasValidationErrors ? `${id}-errors-title` : undefined} mediaItems={mediaItems} assets={assets} onModeChange={setEditorMode} onSourceChange={changeSource} onMediaSelect={() => { setPickerMode("insert"); setPickerOpen(true); }} /></div>
      </section>
      </AuthoringFootprintFrame>
      <div className="free-text-source-editor__reference-cards">
        <AuthoringFootprintFrame layout={layout} kind="preview">
        <section className="free-text-source-editor__reference-card free-text-source-editor__preview" aria-label="Rendered preview">
          <header><h3>Rendered preview</h3><p>what readers see</p></header>
          {lastValidSource !== null && typeof document !== "undefined" ? <FreeTextChartView model={{ qmd: lastValidSource, sourceId: `${panelId}-source`, revision: lastValidRevision.current ?? 1 }} chart={{ id: panelId, title: panelTitle.trim() }} contentRenderContext={previewRenderContext} onMediaActivate={({ mediaNodeIndex, sourceStart, sourceEnd }) => setSelectedMediaIdentity({ mediaNodeIndex, sourceStart, sourceEnd })} /> : lastValidSource !== null ? <p className="static-content-state">Preview is available in the browser.</p> : <p className="static-content-state static-content-state--error">Enter valid portable QMD to create a preview.</p>}
        </section>
        </AuthoringFootprintFrame>
        <section className="free-text-source-editor__reference-card free-text-source-editor__markdown" aria-label="Portable Markdown">
          <header><h3>Portable Markdown</h3><p>what is stored</p></header>
          <pre>{value}</pre>
        </section>
      </div>
      {pickerOpen && <MediaPicker mediaItems={mediaItems} assets={assets} mode="qmd" selectedMediaId={pickerMode === "change" ? selectedPlacement?.mediaId : undefined} onSelect={chooseMedia} onCreateLocal={createMedia} onCancel={pickerMode === "change" ? closeChangePicker : () => setPickerOpen(false)} />}
      {selectedPlacement && <QmdMediaInspector placement={selectedPlacement} mediaItem={valueForId(mediaItems, selectedPlacement.mediaId)} disabled={disabled} onChange={updateSelectedPlacement} onChangeImage={(_mediaId, { trigger } = {}) => { changeTriggerRef.current = trigger ?? null; setPickerMode("change"); setPickerOpen(true); }} onOpenMediaItem={(mediaId) => (onOpenMediaItem ?? contentRenderContext.openMediaItem)?.(mediaId)} />}
      {hasValidationErrors && <ValidationErrors id={validationTarget} errorId={`${id}-errors-title`} value={value} errors={analysis.errors} />}
    </section>
  );
}

function ValidationErrors({ id, errorId, value, errors }) {
  return <div className="free-text-validation-errors" aria-labelledby={errorId}><h3 id={errorId}>Fix before continuing</h3><ol>{errors.map((error, index) => <li key={`${error.rule}-${index}`} data-validation-rule={error.rule}><a href={`#${id}`} onClick={(event) => { event.preventDefault(); focusValidationTarget(document.getElementById(id), sourceOffset(value, error.location)); }}>Line {error.location.line}, column {error.location.column}: {error.message}</a><span>{error.guidance}</span></li>)}</ol></div>;
}

export function validationTargetId(mode, id) {
  return mode === "visual" ? "portable-qmd-composer-focus-target" : id;
}

export function focusValidationTarget(target, offset) {
  const input = target?.matches?.("textarea, input") ? target : target?.querySelector?.('[contenteditable="true"]');
  input?.focus?.();
  input?.setSelectionRange?.(offset, offset);
  return input ?? null;
}

function pendingValidation(source, sourceRevision, previewRevision) { return { ok: false, pending: true, errors: [], warnings: [], source, sourceRevision, previewRevision }; }

function analyze(source, panelId) {
  try {
    if (typeof document === "undefined") { const parsed = parsePortableQmd(source); return { ok: parsed.ok, errors: parsed.errors, warnings: parsed.warnings }; }
    const result = compilePortableQmd(source, { panelId, hostHeadingLevel: 2 });
    return { ok: result.ok, errors: result.errors, warnings: result.warnings };
  } catch (error) { return { ok: false, errors: [{ rule: "parse-failure", message: error?.message ?? "This source could not be parsed.", guidance: "Review the source and try again.", location: { line: 1, column: 1 } }], warnings: [] }; }
}

function sourceOffset(source, location) { const lines = source.split("\n"); let offset = 0; for (let index = 0; index < Math.max(0, location.line - 1); index += 1) offset += (lines[index]?.length ?? 0) + 1; return Math.min(source.length, offset + Math.max(0, location.column - 1)); }
function valueForId(collection, id) { if (collection instanceof Map) return collection.get(id); if (Array.isArray(collection)) return collection.find((entry) => entry?.mediaId === id); return collection?.[id]; }
export default FreeTextSourceEditor;
