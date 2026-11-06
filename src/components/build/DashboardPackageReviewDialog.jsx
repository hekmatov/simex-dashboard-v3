import React from "react";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import ControlTooltip from "../common/ControlTooltip.jsx";
import PackageImportMap from "./PackageImportMap.jsx";
import PackageImportDestinations from "./PackageImportDestinations.jsx";
import { buildDashboardPackageImportInventory, dashboardPackageSelectionState } from "../../lib/dashboardPackageSelection.js";
import { buildDashboardPackageMerge, createDashboardPackageIdentityMap, dashboardPackageMergeRevision } from "../../lib/dashboardPackageMerge.js";

export default function DashboardPackageReviewDialog({ candidate, current,
  busy = false, error = "", onConfirm = noop, onImportSelected = noop, onSavePending = noop,
  getPendingState = () => ({}), onCancel = noop, onChooseAnother } = {}) {
  const receiving = current ?? candidate?.config;
  const [reviewed, setReviewed] = React.useState(() => receiving);
  const [mode, setMode] = React.useState("partial");
  const [selection, setSelection] = React.useState({});
  const [search, setSearch] = React.useState("");
  const [resolutions, setResolutions] = React.useState({});
  const [replacementAcknowledged, setReplacementAcknowledged] = React.useState(false);
  const [savingPending, setSavingPending] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);
  const [localError, setLocalError] = React.useState("");
  const [reviewGeneration, setReviewGeneration] = React.useState(0);
  const [destination, setDestination] = React.useState({ scope: "mixed" });
  const [choosingDestinations, setChoosingDestinations] = React.useState(false);
  const identityMap = React.useMemo(() => candidate ? createDashboardPackageIdentityMap(candidate) : null, [candidate]);
  const inventory = React.useMemo(() => candidate ? buildDashboardPackageImportInventory(candidate) : null, [candidate]);
  const view = React.useMemo(() => candidate ? dashboardPackageSelectionState(candidate, selection, mode) : null, [candidate, selection, mode]);
  const proposal = React.useMemo(() => candidate && reviewed && mode !== "replace" ? buildDashboardPackageMerge({
    current: reviewed, candidate, selection: view.selection, destination, resolutions, identityMap,
  }) : null, [candidate, reviewed, mode, view, destination, resolutions, identityMap]);
  const transactionId = React.useMemo(() => globalThis.crypto.randomUUID(), [candidate, mode, selection, destination, resolutions, reviewGeneration]);
  if (!candidate) return null;
  const stale = dashboardPackageMergeRevision(receiving) !== dashboardPackageMergeRevision(reviewed);
  const pending = getPendingState();
  const locked = busy || savingPending || submitting;
  const blocking = proposal?.issues.some(issue => issue.blocking && issue.code !== "destination-required");
  const destinationBlocking = proposal?.issues.some(issue => issue.blocking);
  const choose = (key, ids, checked) => setSelection(value => ({ ...value, [key]: checked
    ? [...new Set([...(value[key] ?? []), ...ids])] : (value[key] ?? []).filter(id => !ids.includes(id)) }));
  const resolve = (key, value) => setResolutions(previous => ({ ...previous, [key]: value }));
  const refresh = value => { setReviewed(value ?? receiving); setReviewGeneration(n => n + 1); setLocalError(""); };
  const savePending = async () => {
    setSavingPending(true); setLocalError("");
    try { refresh(await onSavePending()); } catch (failure) { setLocalError(failure.message); }
    finally { setSavingPending(false); }
  };
  const submit = async () => {
    if (submittingRef.current || locked || stale || pending.needsSave || destinationBlocking) return;
    submittingRef.current = true; setSubmitting(true); setLocalError("");
    try { await onImportSelected({ proposal, transactionId }); }
    catch (failure) { setLocalError(failure.message); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  if (choosingDestinations) return <PackageImportDestinations requests={proposal.requirements} destination={destination}
    locked={locked} blocked={destinationBlocking || stale || pending.needsSave} error={localError || error || (stale ? "The dashboard changed. Return to selection and refresh the review." : proposal.issues.filter(issue => issue.blocking && issue.code !== "destination-required").map(issue => issue.message).join(" "))}
    onChange={setDestination} onCancel={() => setChoosingDestinations(false)} onImport={submit} />;
  const matches = item => `${item.name} ${item.breadcrumb ?? ""}`.toLowerCase().includes(search.toLowerCase());
  const nameItems = proposal ? [
    ["pages", inventory.pages.filter(item => proposal.selection.pageIds.includes(item.id))],
    ["sections", inventory.sections.filter(item => proposal.selection.sectionIds.includes(item.id))],
    ["charts", inventory.placements.filter(item => proposal.selection.placementIds.includes(item.id)).map(item => ({ ...item, id: item.chartId }))],
    ["sources", inventory.sources.filter(item => proposal.selection.sourceIds.includes(item.id))],
    ["media", inventory.media.filter(item => proposal.selection.mediaIds.includes(item.id))],
  ] : [];
  const contentCheckbox = (key, item, automatic) => <ControlTooltip key={item.id} explain={automatic} reason="Automatically imported">
    <label className="package-selection-check" tabIndex={automatic ? 0 : undefined} data-automatic={automatic || undefined}>
      <input type="checkbox" aria-label={item.name} checked={view.resolved[key].includes(item.id)} disabled={locked || automatic}
        onChange={event => choose(key, [item.id], event.target.checked)} />
      <span>{item.name}<small>{item.mediaType ?? (item.rowCount === undefined ? "" : `${item.rowCount} rows`)}{item.byteLength ? ` · ${item.byteLength} bytes` : ""}</small></span>
    </label>
  </ControlTooltip>;
  return <ModalFocusScope as="div" open className="confirm-dialog-backdrop dashboard-package-review-backdrop dashboard-dialog-backdrop"
    role="dialog" aria-modal="true" aria-labelledby="dashboard-package-review-title" onEscape={locked ? noop : onCancel} tabIndex={-1}>
    <section className="dashboard-package-review dashboard-package-review--selective dashboard-dialog dashboard-dialog--wide">
      <header className="dashboard-dialog__header"><h2 id="dashboard-package-review-title">Review package contents</h2>
        <p>Created <time dateTime={candidate.exportedAt ?? undefined}>{candidate.exportedAt ? formatPackageTimestamp(candidate.exportedAt) : "Creation date unavailable"}</time></p></header>
      <div className="dashboard-dialog__body package-import-workspace">
        <fieldset className="package-import-modes" disabled={locked}><legend>Import choice</legend>
          {[["replace", "Replace"], ["append", "Full Append"], ["partial", "Partial Append"]].map(([id, label]) => <label key={id}>
            <input type="radio" name="dashboard-package-import-mode" value={id} checked={mode === id}
              onChange={() => { setMode(id); setLocalError(""); }} />{label}</label>)}
        </fieldset>
        {mode === "replace" && <div className="package-import-replacement"><p>This replaces the current dashboard and its pending work with the entire package.</p>
          <label><input type="checkbox" checked={replacementAcknowledged} disabled={locked} onChange={event => setReplacementAcknowledged(event.target.checked)} />Replace current dashboard and its pending work</label></div>}
        <fieldset className="package-import-selection-panel" disabled={locked || mode !== "partial"} aria-label="Package selection">
          <legend className="sr-only">Package selection</legend>
          <label className="package-import-search">Search package<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <section className="package-import-selection" aria-label="Charts and panels selection"><h3>Charts and panels</h3>
            <PackageImportMap candidate={candidate} inventory={inventory} resolved={view.resolved} search={mode === "partial" ? search : ""}
              disabled={locked || mode !== "partial"} onChoose={choose} />
          </section>
          <section className="package-import-content" aria-label="Content selection"><h3>Content</h3>
            {["csv", "geojson", "media"].map(kind => {
              const items = (kind === "media" ? inventory.media : inventory.sources.filter(item => item.kind === kind)).filter(item => mode !== "partial" || matches(item));
              const key = kind === "media" ? "mediaIds" : "sourceIds";
              return <fieldset key={kind}><legend>{kind === "csv" ? "Datasets" : kind === "geojson" ? "Maps / GeoJSON" : "Media"}</legend>
                {items.length ? items.map(item => contentCheckbox(key, item, (kind === "media" ? view.automaticMediaIds : view.automaticSourceIds).includes(item.id))) : <p>No matching content.</p>}
              </fieldset>;
            })}
          </section>
        </fieldset>
        {mode !== "replace" && <section className="package-import-review" aria-label="Import review">
          <p aria-live="polite">{proposal.selection.pageIds.length} pages, {proposal.selection.sectionIds.length} sections, {proposal.selection.placementIds.length} panels · {proposal.selection.sourceIds.length} data sources and {proposal.selection.mediaIds.length} media included</p>
          <p>Current dashboard settings are retained. Matching page and section names append into existing containers; charts and sources remain independent copies.</p>
          {proposal.requirements.length > 0 && <p>Choose destinations after clicking Import selected. <button type="button" className="secondary" disabled={locked || stale || pending.needsSave} onClick={() => setChoosingDestinations(true)}>Change destinations</button></p>}
          {proposal.selection.externalReferences.some(ref => ref.kind === "drill") && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.detachDrills)} onChange={event => resolve("detachDrills", event.target.checked)} />Remove drill links to unselected objects</label>}
          {proposal.selection.externalReferences.some(ref => ref.kind === "scene") && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.detachScenes)} onChange={event => resolve("detachScenes", event.target.checked)} />Import these charts independently of source Scenes</label>}
          {(resolutions.standardAttention || proposal.issues.some(issue => issue.code === "attention")) && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.standardAttention)} onChange={event => resolve("standardAttention", event.target.checked)} />Convert incoming Attention strips to Standard sections</label>}
          {(resolutions.detachConvertedDrills || proposal.issues.some(issue => issue.code === "converted-drill")) && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.detachConvertedDrills)} onChange={event => resolve("detachConvertedDrills", event.target.checked)} />Remove drill links from converted Attention sections</label>}
          {nameItems.some(([, items]) => items.length) && <details><summary>Review object names</summary>{nameItems.map(([kind, items]) => items.map(item => {
            const summaryKind = kind === "charts" ? "placements" : kind;
            const imported = proposal.summary[summaryKind]?.find(row => row.id === proposal.identityMap[kind][item.id] || row.chartId === proposal.identityMap[kind][item.id]);
            return <label key={`${kind}:${item.id}`}>{item.name}<input aria-label={`Imported ${kind} name: ${item.name}`} disabled={locked}
              value={resolutions.names?.[kind]?.[item.id] ?? imported?.name ?? item.name}
              onChange={event => setResolutions(value => ({ ...value, names: { ...value.names, [kind]: { ...value.names?.[kind], [item.id]: event.target.value } } }))} /></label>;
          }))}</details>}
          <ul aria-label="Import consequences">{proposal.issues.filter(issue => !["empty", "destination-required"].includes(issue.code)).map((issue, index) => <li key={index} data-blocking={issue.blocking}>{issue.message}</li>)}</ul>
          {pending.retainedDrafts?.length > 0 && <p>Existing drafts stay open: {[...new Set(pending.retainedDrafts)].join(", ")}.</p>}
          {pending.needsSave && <div role="status"><p>Pending page or layout changes need to be saved before reviewing insertion into this dashboard.</p><button type="button" disabled={locked || !pending.canSave} onClick={savePending}>Save pending changes and review</button></div>}
          {stale && <div role="status"><p>The current dashboard changed after this review.</p><button type="button" className="secondary" disabled={locked} onClick={() => refresh()}>Refresh import review</button></div>}
        </section>}
        {(error || localError) && <p role="alert">{localError || error}</p>}
      </div>
      <footer className="dashboard-dialog__footer dashboard-dialog__actions">
        <button type="button" className="secondary" disabled={locked} onClick={onCancel}>Cancel</button>
        {onChooseAnother && <button type="button" className="secondary" disabled={locked} onClick={onChooseAnother}>Choose another file</button>}
        {mode === "replace" ? <button type="button" disabled={locked || !replacementAcknowledged} onClick={onConfirm}>{busy ? "Loading…" : "Load package"}</button>
          : <button type="button" disabled={locked || stale || pending.needsSave || blocking}
            onClick={() => proposal.requirements.length ? setChoosingDestinations(true) : void submit()}>{busy ? "Importing…" : "Import selected"}</button>}
      </footer>
    </section>
  </ModalFocusScope>;
}

export function formatPackageTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "Creation date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}
function noop() {}
