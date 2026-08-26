import React from "react";

import FreeTextChartView from "../charts/FreeTextChartView.jsx";
import { compilePortableQmd } from "../../static-content/qmd/compilePortableQmd.js";
import { parsePortableQmdWithMedia, serializePortableMediaReference } from "../../static-content/qmd/portableQmdMedia.js";
import MediaPicker from "../source-content/MediaPicker.jsx";
import QmdMediaInspector from "./QmdMediaInspector.jsx";

const NARROW_EDITOR_QUERY = "(max-width: 860px)";

export function FreeTextSourceEditor({
  id = "static-qmd-source",
  value = "",
  panelId = "static-text-preview",
  disabled = false,
  mediaItems = {},
  assets = {},
  contentRenderContext = {},
  onChange,
  onValidationChange,
  onMediaSelect,
  onMediaCreate,
  onOpenMediaItem,
} = {}) {
  const initial = React.useMemo(() => analyze(value, panelId), []);
  const [analysis, setAnalysis] = React.useState(initial);
  const [lastValidSource, setLastValidSource] = React.useState(initial.ok ? value : null);
  const [pending, setPending] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("source");
  const [narrow, setNarrow] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState("insert");
  const [selectedMediaKey, setSelectedMediaKey] = React.useState(null);
  const evaluatedSource = React.useRef(value);
  const observedSource = React.useRef(value);
  const pendingChange = React.useRef(null);
  const analysisCache = React.useRef(new Map([[value, initial]]));
  const revision = React.useRef(0);
  const lastValidRevision = React.useRef(initial.ok ? 0 : null);
  const sourcePaneRef = React.useRef(null);
  const previewPaneRef = React.useRef(null);
  const lastFocused = React.useRef({ source: null, preview: null });
  const previewRenderContext = React.useMemo(() => ({
    ...contentRenderContext,
    mediaItems: { ...(contentRenderContext.mediaItems ?? {}), ...mediaItems },
    assets: { ...(contentRenderContext.assets ?? {}), ...assets },
  }), [assets, contentRenderContext, mediaItems]);

  React.useEffect(() => {
    onValidationChange?.({
      ...initial,
      pending: false,
      source: value,
      sourceRevision: 0,
      previewRevision: lastValidRevision.current,
    });
  }, []);

  React.useEffect(() => {
    const authoredChange = pendingChange.current?.source === value
      ? pendingChange.current
      : null;
    if (value === observedSource.current && !authoredChange) return undefined;
    observedSource.current = value;
    const sourceRevision = authoredChange?.revision ?? revision.current + 1;
    revision.current = sourceRevision;
    if (authoredChange) pendingChange.current = null;

    const cached = analysisCache.current.get(value);
    if (cached) {
      evaluatedSource.current = value;
      setAnalysis(cached);
      setPending(false);
      if (cached.ok) {
        setLastValidSource(value);
        lastValidRevision.current = sourceRevision;
      }
      onValidationChange?.({
        ...cached,
        pending: false,
        source: value,
        sourceRevision,
        previewRevision: cached.ok ? sourceRevision : lastValidRevision.current,
      });
      return undefined;
    }

    setPending(true);
    if (!authoredChange) {
      onValidationChange?.(pendingValidation(value, sourceRevision, lastValidRevision.current));
    }
    const timer = setTimeout(() => {
      const next = analyze(value, panelId);
      evaluatedSource.current = value;
      analysisCache.current.set(value, next);
      setAnalysis(next);
      setPending(false);
      if (next.ok) {
        setLastValidSource(value);
        lastValidRevision.current = sourceRevision;
      }
      onValidationChange?.({
        ...next,
        pending: false,
        source: value,
        sourceRevision,
        previewRevision: next.ok ? sourceRevision : lastValidRevision.current,
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [onValidationChange, value]);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(NARROW_EDITOR_QUERY);
    const apply = (matches) => {
      const activeElement = document.activeElement;
      let focusOwner = null;
      if (sourcePaneRef.current?.contains(activeElement)) focusOwner = "source";
      else if (previewPaneRef.current?.contains(activeElement)) focusOwner = "preview";
      const owner = focusOwner ?? activeTab;
      setNarrow(matches);
      if (matches) setActiveTab(owner);
      if (focusOwner) {
        const target = lastFocused.current[focusOwner];
        window.requestAnimationFrame(() => target?.isConnected && target.focus({ preventScroll: true }));
      }
    };
    apply(media.matches);
    const listener = (event) => apply(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [activeTab]);

  const stale = !pending && !analysis.ok && lastValidSource !== null;
  const status = pending
    ? "Updating preview…"
    : analysis.ok
      ? "Preview is up to date."
      : `${analysis.errors.length} blocking ${analysis.errors.length === 1 ? "error" : "errors"}. The last valid preview is unchanged.`;

  const recordFocus = (owner) => (event) => {
    lastFocused.current[owner] = event.target;
  };
  const selectTabFromKeyboard = (tab, event) => {
    const order = ["source", "preview"];
    const currentIndex = order.indexOf(tab);
    const next = event.key === "Home"
      ? order[0]
      : event.key === "End"
        ? order[order.length - 1]
        : event.key === "ArrowRight"
          ? order[(currentIndex + 1) % order.length]
          : event.key === "ArrowLeft"
            ? order[(currentIndex - 1 + order.length) % order.length]
            : null;
    if (!next) return;
    event.preventDefault();
    setActiveTab(next);
    window.requestAnimationFrame(() => document.getElementById(`${id}-${next}-tab`)?.focus());
  };
  const changeSource = (nextSource) => {
    const sourceRevision = revision.current + 1;
    revision.current = sourceRevision;
    pendingChange.current = { source: nextSource, revision: sourceRevision };
    setPending(true);
    onValidationChange?.(pendingValidation(nextSource, sourceRevision, lastValidRevision.current));
    onChange?.(nextSource);
  };
  const mediaNodes = React.useMemo(() => {
    const parsed = parsePortableQmdWithMedia(value);
    return parsed.ast?.mediaNodes ?? [];
  }, [value]);
  const selectedMediaIndex = mediaIndexFromKey(selectedMediaKey);
  const selectedMediaNode = Number.isInteger(selectedMediaIndex) ? mediaNodes[selectedMediaIndex] : null;
  const selectedPlacement = selectedMediaNode ? {
    mediaId: selectedMediaNode.mediaId,
    alt: selectedMediaNode.alt,
    ...selectedMediaNode.attributes,
  } : null;
  const updateSelectedPlacement = (placement) => {
    if (!selectedMediaNode || !Number.isInteger(selectedMediaIndex)) return;
    const replacement = serializePortableMediaReference(placement);
    changeSource(replaceMediaNodeSource(value, mediaNodes, selectedMediaIndex, replacement));
  };
  const chooseMedia = (item) => {
    if (pickerMode === "change" && selectedPlacement) {
      updateSelectedPlacement({ ...selectedPlacement, mediaId: item.mediaId });
      setPickerOpen(false);
      return;
    }
    onMediaSelect?.(item);
    setPickerOpen(false);
  };

  return (
    <section
      className="free-text-source-editor"
      data-layout={narrow ? "tabs" : "split"}
      data-active-tab={activeTab}
      data-source-revision={revision.current}
      data-preview-revision={lastValidRevision.current ?? "none"}
    >
      <div className="free-text-source-editor__tabs" role="tablist" aria-label="Free text editor panes">
        {[
          ["source", "Source"],
          ["preview", "Preview"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${id}-${tab}-tab`}
            aria-controls={`${id}-${tab}-pane`}
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(event) => selectTabFromKeyboard(tab, event)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="free-text-source-editor__panes">
        <section
          ref={sourcePaneRef}
          id={`${id}-source-pane`}
          className="free-text-source-editor__pane free-text-source-editor__source"
          data-free-text-pane="source"
          role="tabpanel"
          aria-labelledby={`${id}-source-tab`}
          hidden={narrow && activeTab !== "source"}
          onFocusCapture={recordFocus("source")}
        >
          <label htmlFor={id}>QMD-style source</label>
          <textarea
            id={id}
            value={value}
            disabled={disabled}
            aria-describedby={`${id}-help ${id}-status`}
            aria-invalid={!pending && !analysis.ok ? "true" : undefined}
            onChange={(event) => changeSource(event.target.value)}
          />
          <small id={`${id}-help`}>Portable QMD v1 renders locally. Unknown syntax is shown as text; code never executes.</small>
          <button type="button" className="secondary" disabled={disabled} onClick={() => { setPickerMode("insert"); setPickerOpen(true); }}>Insert image</button>
          {pickerOpen && pickerMode === "change" && (
            <ChangeMediaPicker mediaItems={mediaItems} onSelect={chooseMedia} onCancel={() => setPickerOpen(false)} />
          )}
          {pickerOpen && pickerMode === "insert" && (
            <MediaPicker
              mediaItems={mediaItems}
              assets={assets}
              mode="qmd"
              onSelect={chooseMedia}
              onCreateLocal={async (candidate, context) => { await onMediaCreate?.(candidate, context); setPickerOpen(false); }}
              onCancel={() => setPickerOpen(false)}
            />
          )}
          {!pending && analysis.errors.length > 0 && (
            <div className="free-text-validation-errors" aria-labelledby={`${id}-errors-title`}>
              <h3 id={`${id}-errors-title`}>Fix before continuing</h3>
              <ol>
                {analysis.errors.map((error, index) => (
                  <li
                    key={`${error.rule}-${error.location.line}-${error.location.column}-${index}`}
                    data-validation-rule={error.rule}
                  >
                    <a
                      href={`#${id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        const editor = document.getElementById(id);
                        editor?.focus({ preventScroll: false });
                        const offset = sourceOffset(value, error.location);
                        editor?.setSelectionRange(offset, offset);
                      }}
                    >
                      Line {error.location.line}, column {error.location.column}: {error.message}
                    </a>
                    <span>{error.guidance}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
        <section
          ref={previewPaneRef}
          id={`${id}-preview-pane`}
          className="free-text-source-editor__pane free-text-source-editor__preview"
          data-free-text-pane="preview"
          role="tabpanel"
          aria-labelledby={`${id}-preview-tab`}
          hidden={narrow && activeTab !== "preview"}
          onFocusCapture={recordFocus("preview")}
        >
          <header className="free-text-source-editor__preview-header">
            <h3>Canonical preview</h3>
            {stale && <span className="free-text-preview-stale">Preview is stale</span>}
          </header>
          {lastValidSource !== null ? (
            <FreeTextChartView
              model={{ qmd: lastValidSource, sourceId: `${panelId}-source`, revision: lastValidRevision.current ?? 1 }}
              chart={{ id: panelId, title: "Preview" }}
              contentRenderContext={previewRenderContext}
              onMediaActivate={({ key }) => setSelectedMediaKey(key)}
            />
          ) : (
            <p className="static-content-state static-content-state--error">Enter valid portable QMD to create a preview.</p>
          )}
        </section>
      </div>
      {selectedPlacement && (
        <QmdMediaInspector
          placement={selectedPlacement}
          mediaItem={valueForId(mediaItems, selectedPlacement.mediaId)}
          disabled={disabled}
          onChange={updateSelectedPlacement}
          onChangeImage={() => { setPickerMode("change"); setPickerOpen(true); }}
          onOpenMediaItem={(mediaId) => (onOpenMediaItem ?? contentRenderContext.openMediaItem)?.(mediaId)}
        />
      )}
      <p id={`${id}-status`} className="free-text-source-editor__status" role="status" aria-live="polite" aria-atomic="true">
        {status}
      </p>
    </section>
  );
}

function pendingValidation(source, sourceRevision, previewRevision) {
  return {
    ok: false,
    pending: true,
    errors: [],
    warnings: [],
    source,
    sourceRevision,
    previewRevision,
  };
}

function ChangeMediaPicker({ mediaItems, onSelect, onCancel }) {
  const eligible = collectionValues(mediaItems)
    .filter((item) => item?.health === "ready" && ["asset", "package"].includes(item?.current?.kind))
    .sort((left, right) => left.mediaId.localeCompare(right.mediaId));
  return (
    <section className="source-content-detail-card" aria-label="Media picker">
      <header>
        <h3>Change image</h3>
        <p>Choose an existing portable local media item for this placement.</p>
      </header>
      <fieldset>
        <legend>Available local media</legend>
        {eligible.length === 0 ? <p>No eligible media is available.</p> : eligible.map((item) => (
          <label key={item.mediaId}>
            <input type="radio" name="qmd-media-change-selection" value={item.mediaId} onChange={() => onSelect(item)} />
            <strong>{item.displayName}</strong> {item.origin} · {item.health}
          </label>
        ))}
      </fieldset>
      <button type="button" className="secondary" onClick={onCancel}>Close media picker</button>
    </section>
  );
}

function analyze(source, panelId) {
  try {
    const result = compilePortableQmd(source, { panelId, hostHeadingLevel: 2 });
    return { ok: result.ok, errors: result.errors, warnings: result.warnings };
  } catch (error) {
    return {
      ok: false,
      errors: [{
        rule: "parse-failure",
        message: error?.message ?? "This source could not be parsed.",
        guidance: "Review the source and try again.",
        location: { line: 1, column: 1 },
      }],
      warnings: [],
    };
  }
}

function sourceOffset(source, location) {
  const lines = source.split("\n");
  let offset = 0;
  for (let index = 0; index < Math.max(0, location.line - 1); index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }
  return Math.min(source.length, offset + Math.max(0, location.column - 1));
}

function mediaIndexFromKey(key) {
  const match = /:(\d+)$/.exec(String(key ?? ""));
  return match ? Number(match[1]) - 1 : null;
}

function replaceMediaNodeSource(source, mediaNodes, targetIndex, replacement) {
  let cursor = 0;
  for (let index = 0; index < mediaNodes.length; index += 1) {
    const sourceText = mediaNodes[index].sourceText;
    const start = source.indexOf(sourceText, cursor);
    if (start < 0) throw new Error("The selected media placement is no longer present in the source.");
    if (index === targetIndex) return `${source.slice(0, start)}${replacement}${source.slice(start + sourceText.length)}`;
    cursor = start + sourceText.length;
  }
  throw new Error("The selected media placement is no longer present in the source.");
}

function valueForId(collection, id) {
  if (collection instanceof Map) return collection.get(id);
  if (Array.isArray(collection)) return collection.find((entry) => entry?.mediaId === id);
  return collection?.[id];
}

function collectionValues(collection) {
  if (collection instanceof Map) return [...collection.values()];
  if (Array.isArray(collection)) return collection;
  return Object.values(collection ?? {});
}

export default FreeTextSourceEditor;
