import React from "react";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function ContentActionDialog({
  open = false,
  action = "delete",
  itemLabel = "this item",
  busy = false,
  error = "",
  replacementReady = false,
  replacementLabel = "",
  replacementStatus = "",
  replacementReason = null,
  replacementWarnings = [],
  canImportAsNew = false,
  remapTargets = [],
  impactContexts = [],
  importedSourceLabel = "",
  onReplacementFile,
  onImportAsNew,
  onNavigate,
  onConfirm,
  onCancel,
} = {}) {
  if (action === "replace-csv" || action === "relink-csv" || action === "replace-geojson") {
    if (!open) return null;
    const geoJson = action === "replace-geojson";
    const relinkCsv = action === "relink-csv";
    const id = `${geoJson ? "replace-geojson" : relinkCsv ? "relink-csv" : "replace-csv"}-${safeId(itemLabel)}`;
    const blocked = replacementStatus === "blocked";
    const requiresTemporalReview = replacementStatus === "requires-temporal-review";
    const requiresGeoJsonConfirmation = replacementStatus === "requires-confirmation";
    const nonCommittable = blocked;
    return (
      <ModalFocusScope
        as="div"
        open
        initialFocusSelector={'[data-modal-initial-focus="true"]'}
        onEscape={busy ? undefined : onCancel}
        className="confirm-dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        tabIndex={-1}
      >
        <section className="confirm-dialog">
          <h2 id={`${id}-title`}>{relinkCsv ? `Relink ${itemLabel}?` : `Replace ${itemLabel} file?`}</h2>
          <p id={`${id}-message`}>Choose a {geoJson ? "GeoJSON" : "CSV"} file. The current source identity is retained only when every directly dependent {geoJson ? "map" : "chart"} remains structurally valid.</p>
          <label><span>{relinkCsv ? "Relink CSV" : `Replacement ${geoJson ? "GeoJSON" : "CSV"}`}</span><input data-modal-initial-focus="true" type="file" accept={geoJson ? ".geojson,.json,application/geo+json,application/json" : ".csv,text/csv"} disabled={busy} onChange={(event) => onReplacementFile?.(event.target.files?.[0] ?? null)} /></label>
          {replacementLabel && <p role="status">Prepared: {replacementLabel}</p>}
          {(blocked || requiresTemporalReview) && replacementReason && <p className="confirm-dialog-error" role="alert" data-replacement-reason={replacementReason.code}>{replacementReason.message}</p>}
          {error && <p className="confirm-dialog-error" role="alert">{error}</p>}
          {requiresGeoJsonConfirmation && replacementWarnings.length > 0 && (
            <section aria-label="GeoJSON replacement warnings">
              <h3>Confirm changed map facts</h3>
              <ul>{replacementWarnings.map((warning) => <li key={`${warning.code}:${warning.chartId ?? "source"}`} data-replacement-warning={warning.code}>{warning.message}</li>)}</ul>
            </section>
          )}
          {remapTargets.length > 0 && (
            <section aria-label="Affected panels">
              <h3>Affected panels</h3>
              <ul>{remapTargets.map((target) => <li key={target.id}>
                {typeof onNavigate === "function" ? <button type="button" className="source-content-breadcrumb" onClick={() => onNavigate(target)}><RemapBreadcrumb target={target} /></button> : <span><RemapBreadcrumb target={target} /></span>}
              </li>)}</ul>
            </section>
          )}
          {requiresTemporalReview && impactContexts.length > 0 && (
            <section aria-label="Affected temporal content">
              <h3>Affected temporal content</h3>
              <ul>{impactContexts.map((impact) => (
                <li key={`${impact.kind}:${impact.id}`}>{temporalImpactLabel(impact.kind)}: {impact.label ?? impact.id}</li>
              ))}</ul>
            </section>
          )}
          {importedSourceLabel && <p role="status">Imported as {importedSourceLabel}. Choose an affected panel to remap it.</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button>
            {canImportAsNew && <button type="button" className="secondary" disabled={busy} onClick={onImportAsNew}>Import as new source</button>}
            <button type="button" disabled={busy || !replacementReady || nonCommittable} onClick={onConfirm}>
              {busy ? relinkCsv ? "Relinking…" : "Replacing…" : requiresTemporalReview ? relinkCsv ? "Confirm relink and mark affected temporal content" : "Confirm replacement and mark affected temporal content" : requiresGeoJsonConfirmation ? "Confirm GeoJSON replacement" : geoJson ? "Replace GeoJSON" : relinkCsv ? "Relink" : "Replace file"}
            </button>
          </div>
        </section>
      </ModalFocusScope>
    );
  }
  if (action === "replace") {
    if (!open) return null;
    const id = `replace-${safeId(itemLabel)}`;
    return (
      <ModalFocusScope
        as="div"
        open
        initialFocusSelector={'[data-modal-initial-focus="true"]'}
        onEscape={busy ? undefined : onCancel}
        className="confirm-dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        tabIndex={-1}
      >
        <section className="confirm-dialog">
          <h2 id={`${id}-title`}>Replace {itemLabel} everywhere?</h2>
          <p id={`${id}-message`}>Choose a validated PNG, JPEG, or WebP file. Every QMD and Image use updates to the next revision while its placement settings stay unchanged.</p>
          <label>
            <span>Replacement image</span>
            <input
              data-modal-initial-focus="true"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(event) => onReplacementFile?.(event.target.files?.[0] ?? null)}
            />
          </label>
          {replacementLabel && <p role="status">Ready: {replacementLabel}</p>}
          {error && <p className="confirm-dialog-error" role="alert">{error}</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button>
            <button type="button" disabled={busy || !replacementReady} onClick={onConfirm}>{busy ? "Replacing…" : "Replace everywhere"}</button>
          </div>
        </section>
      </ModalFocusScope>
    );
  }
  if (action !== "delete") return null;
  return (
    <ConfirmDialog
      open={open}
      title={`Delete ${itemLabel}?`}
      message="This removes the managed item from this dashboard. This action does not remove or change any panels."
      error={error}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      disabled={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function temporalImpactLabel(kind) {
  if (kind === "chrono-group") return "Chrono Group";
  if (kind === "scene-presentation") return "Scene presentation";
  return "Scene";
}

function RemapBreadcrumb({ target }) {
  return <>{target.pageLabel ?? target.pageId} <span aria-hidden="true">›</span> {target.sectionLabel ?? target.sectionId} <span aria-hidden="true">›</span> {target.panelLabel ?? target.panelId}</>;
}

function safeId(value) {
  return String(value ?? "item").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}
