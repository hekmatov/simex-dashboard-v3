import React from "react";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import { buildDashboardPackageImportInventory } from "../../lib/dashboardPackageSelection.js";
import { buildDashboardPackageMerge, createDashboardPackageIdentityMap, dashboardPackageMergeRevision } from "../../lib/dashboardPackageMerge.js";

export default function DashboardPackageReviewDialog({ candidate, current, activePageId, initialDestination,
  busy = false, error = "", onConfirm = noop, onImportSelected = noop, onSavePending = noop,
  getPendingState = () => ({}), onCancel = noop, onChooseAnother } = {}) {
  const receiving = current ?? candidate?.config;
  const [reviewed, setReviewed] = React.useState(() => receiving);
  const [mode, setMode] = React.useState("placements");
  const [selection, setSelection] = React.useState({});
  const [search, setSearch] = React.useState("");
  const [resolutions, setResolutions] = React.useState({});
  const [replacementAcknowledged, setReplacementAcknowledged] = React.useState(false);
  const [savingPending, setSavingPending] = React.useState(false);
  const [localError, setLocalError] = React.useState("");
  const [reviewGeneration, setReviewGeneration] = React.useState(0);
  const initialPage = receiving?.pages?.find(p => p.id === (initialDestination?.pageId ?? activePageId)) ?? receiving?.pages?.[0];
  const [destination, setDestination] = React.useState(() => ({ scope: "placements", pageId: initialPage?.id,
    sectionId: initialDestination?.sectionId ?? initialPage?.sections?.[0]?.id, position: "append" }));
  const identityMap = React.useMemo(() => candidate ? createDashboardPackageIdentityMap(candidate) : null, [candidate]);
  const inventory = React.useMemo(() => candidate ? buildDashboardPackageImportInventory(candidate) : null, [candidate]);
  const proposal = React.useMemo(() => candidate && reviewed && mode !== "replace" ? buildDashboardPackageMerge({
    current: reviewed, candidate, selection, destination, resolutions, identityMap,
  }) : null, [candidate, reviewed, mode, selection, destination, resolutions, identityMap]);
  const transactionId = React.useMemo(() => globalThis.crypto.randomUUID(), [candidate, mode, selection, destination, resolutions, reviewGeneration]);
  if (!candidate) return null;
  const stale = dashboardPackageMergeRevision(receiving) !== dashboardPackageMergeRevision(reviewed);
  const pending = getPendingState();
  const locked = busy || savingPending;
  const blocking = proposal?.issues.some(issue => issue.blocking);
  const selectedIds = key => selection[key] ?? [];
  const choose = (key, ids, checked) => setSelection(value => ({ ...value, [key]: checked
    ? [...new Set([...(value[key] ?? []), ...ids])] : (value[key] ?? []).filter(id => !ids.includes(id)) }));
  const check = (key, items, label) => {
    const ids = items.map(item => item.id), count = ids.filter(id => selectedIds(key).includes(id)).length;
    return <label className="package-selection-check"><input type="checkbox" disabled={locked || !ids.length}
      checked={Boolean(ids.length) && count === ids.length} ref={node => { if (node) node.indeterminate = count > 0 && count < ids.length; }}
      onChange={event => choose(key, ids, event.target.checked)} />{label}</label>;
  };
  const matches = item => `${item.name} ${item.breadcrumb ?? ""} ${item.typeId ?? ""}`.toLowerCase().includes(search.toLowerCase());
  const changeMode = value => {
    setMode(value); setSelection({}); setResolutions({}); setLocalError("");
    setDestination({ scope: value, pageId: initialPage?.id, sectionId: initialDestination?.sectionId ?? initialPage?.sections?.[0]?.id,
      position: value === "pages" && initialPage ? "after" : "append", anchorId: value === "pages" ? initialPage?.id : undefined });
  };
  const destinationPage = receiving.pages.find(p => p.id === destination.pageId);
  const destinationSection = destinationPage?.sections.find(s => s.id === destination.sectionId);
  const anchors = mode === "pages" ? receiving.pages : mode === "sections" ? destinationPage?.sections ?? [] : destinationSection?.panels ?? [];
  const resolve = (key, value) => setResolutions(previous => ({ ...previous, [key]: value }));
  const refresh = value => { setReviewed(value ?? receiving); setReviewGeneration(n => n + 1); setLocalError(""); };
  const savePending = async () => {
    setSavingPending(true); setLocalError("");
    try { refresh(await onSavePending()); } catch (failure) { setLocalError(failure.message); }
    finally { setSavingPending(false); }
  };
  const nameItems = proposal ? [
    ["pages", inventory.pages.filter(item => proposal.selection.pageIds.includes(item.id))],
    ["sections", inventory.sections.filter(item => proposal.selection.sectionIds.includes(item.id))],
    ["charts", inventory.placements.filter(item => proposal.selection.placementIds.includes(item.id)).map(item => ({ ...item, id: item.chartId }))],
    ["sources", inventory.sources.filter(item => proposal.selection.sourceIds.includes(item.id))],
    ["media", inventory.media.filter(item => proposal.selection.mediaIds.includes(item.id))],
  ] : [];
  return <ModalFocusScope as="div" open className="confirm-dialog-backdrop dashboard-package-review-backdrop dashboard-dialog-backdrop"
    role="dialog" aria-modal="true" aria-labelledby="dashboard-package-review-title" initialFocusSelector='[data-modal-initial-focus="true"]'
    onEscape={locked ? noop : onCancel} tabIndex={-1}>
    <section className="dashboard-package-review dashboard-package-review--selective dashboard-dialog dashboard-dialog--wide">
      <header className="dashboard-dialog__header"><h2 id="dashboard-package-review-title">Review package contents</h2>
        <p>Created <time dateTime={candidate.exportedAt ?? undefined}>{candidate.exportedAt ? formatPackageTimestamp(candidate.exportedAt) : "Creation date unavailable"}</time></p>
      </header>
      <div className="dashboard-dialog__body package-import-workspace">
        <section className="package-import-selection" aria-label="Package selection">
          <label>Import choice<select aria-label="Import choice" value={mode} disabled={locked} onChange={event => changeMode(event.target.value)}>
            <option value="placements">Import charts/panels</option><option value="sections">Import sections</option>
            <option value="pages">Import pages</option><option value="content">Import content</option><option value="replace">Load entire dashboard</option>
          </select></label>
          {mode !== "replace" && <label>Search package<input type="search" value={search} disabled={locked} onChange={event => setSearch(event.target.value)} /></label>}
          {mode === "content" ? ["csv", "geojson", "media"].map(kind => {
            const items = (kind === "media" ? inventory.media : inventory.sources.filter(item => item.kind === kind)).filter(matches);
            const key = kind === "media" ? "mediaIds" : "sourceIds";
            return <fieldset key={kind}><legend>{kind === "csv" ? "Datasets" : kind === "geojson" ? "Maps / GeoJSON" : "Media"}</legend>
              {items.map(item => <div key={item.id}>{check(key, [item], item.name)}<small>{item.mediaType ?? (item.rowCount === undefined ? "" : `${item.rowCount} rows`)}{item.byteLength ? ` · ${item.byteLength} bytes` : ""}</small></div>)}
            </fieldset>;
          }) : inventory.pages.map(page => {
            const sections = inventory.sections.filter(s => s.pageId === page.id);
            const panels = inventory.placements.filter(p => p.pageId === page.id);
            if (mode === "pages" && !matches(page)) return null;
            if (["sections", "placements"].includes(mode) && ![...sections, ...panels].some(matches)) return null;
            return <details key={page.id} open><summary>{mode === "replace" ? `Page: ${page.name}` : mode === "pages"
              ? <label><input type="checkbox" checked={selectedIds("pageIds").includes(page.id)} disabled={locked || !page.eligible} onChange={event => choose("pageIds", [page.id], event.target.checked)} />{page.name}</label>
              : check(mode === "sections" ? "sectionIds" : "placementIds", mode === "sections" ? sections : panels, `All ${mode === "sections" ? "sections" : "panels"} in ${page.name}`)}</summary>
              {mode === "pages" ? <small>{sections.length} sections · {panels.length} panels{!page.eligible ? " · Canonical Home cannot be copied" : ""}</small> : sections.map(section => {
                const members = panels.filter(p => p.sectionKey === section.id);
                if (mode === "sections" && !matches(section)) return null;
                if (mode === "placements" && !members.some(matches)) return null;
                return <fieldset key={section.id}><legend>{mode === "replace" ? `Section: ${section.name}` : mode === "sections" ? check("sectionIds", [section], section.name) : check("placementIds", members, `All panels in ${section.name}`)}</legend>
                  {mode === "sections" ? <small>{members.length} panels</small> : members.filter(item => mode === "replace" || matches(item)).map(item => <div key={item.id}>
                    {mode === "replace" ? <span>Panel: {item.name}</span> : check("placementIds", [item], item.name)}<small>{item.typeId}</small>
                  </div>)}
                </fieldset>;
              })}
            </details>;
          })}
        </section>
        <section className="package-import-review" aria-label="Import destination and review">
          {mode === "replace" ? <>
            <h3>Replace the current dashboard</h3><p>This loads the entire package and replaces current content and pending work. Additive import preserves your current dashboard.</p>
            <label><input type="checkbox" checked={replacementAcknowledged} disabled={locked} onChange={event => setReplacementAcknowledged(event.target.checked)} />Replace current dashboard and its pending work</label>
          </> : <>
            <h3>Destination and review</h3>
            <p>Current dashboard settings are retained. Selected objects are copied independently.</p>
            {["sections", "placements"].includes(mode) && <>
              <label>Destination page<select aria-label="Destination page" disabled={locked} value={destination.newPageTitle ? "__new" : destination.pageId ?? ""} onChange={event => {
                const page = receiving.pages.find(p => p.id === event.target.value);
                setDestination(value => ({ ...value, pageId: page?.id, sectionId: page?.sections[0]?.id, newPageTitle: page ? undefined : "Imported page", newSectionTitle: undefined, position: "append", anchorId: undefined }));
              }}>{receiving.pages.filter(p => !p.landing && p.pageType !== "landing").map(p => <option key={p.id} value={p.id}>{p.label || p.title || "Untitled page"}</option>)}<option value="__new">Create new page</option></select></label>
              {destination.newPageTitle !== undefined && <label>New page title<input disabled={locked} value={destination.newPageTitle} onChange={event => setDestination(value => ({ ...value, newPageTitle: event.target.value }))} /></label>}
              {mode === "placements" && !destination.newPageTitle && <label>Destination section<select aria-label="Destination section" disabled={locked} value={destination.newSectionTitle !== undefined ? "__new" : destination.sectionId ?? ""} onChange={event => setDestination(value => ({ ...value, sectionId: event.target.value === "__new" ? undefined : event.target.value, newSectionTitle: event.target.value === "__new" ? "Imported charts" : undefined, position: "append", anchorId: undefined }))}>
                {destinationPage?.sections.map(s => <option key={s.id} value={s.id}>{s.title || "Untitled section"}</option>)}<option value="__new">Create new section</option></select></label>}
              {(destination.newSectionTitle !== undefined || (mode === "placements" && destination.newPageTitle)) && <label>New section title<input disabled={locked} value={destination.newSectionTitle ?? "Imported charts"} onChange={event => setDestination(value => ({ ...value, newSectionTitle: event.target.value }))} /></label>}
            </>}
            {mode !== "content" && !destination.newPageTitle && !destination.newSectionTitle && <>
              <label>Insertion<select aria-label="Insertion" disabled={locked} value={destination.position} onChange={event => setDestination(value => ({ ...value, position: event.target.value, anchorId: value.anchorId ?? anchors[0]?.id }))}>
                <option value="append">At end</option><option value="start">At start</option><option value="before" disabled={!anchors.length}>Before selected item</option><option value="after" disabled={!anchors.length}>After selected item</option>
              </select></label>
              {["before", "after"].includes(destination.position) && <label>Insertion anchor<select aria-label="Insertion anchor" disabled={locked} value={destination.anchorId ?? ""} onChange={event => setDestination(value => ({ ...value, anchorId: event.target.value }))}>
                {anchors.map(item => <option key={item.id} value={item.id}>{item.label || item.title || item.chart?.title || "Untitled item"}</option>)}
              </select></label>}
            </>}
            <p aria-live="polite">{proposal.summary.pages.length} pages, {proposal.summary.sections.length} sections, {proposal.summary.placements.length} panels · {proposal.selection.sourceIds.length} data sources and {proposal.selection.mediaIds.length} media included</p>
            {proposal.selection.externalReferences.some(ref => ref.kind === "drill") && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.detachDrills)} onChange={event => resolve("detachDrills", event.target.checked)} />Remove drill links to unselected objects</label>}
            {proposal.selection.externalReferences.some(ref => ref.kind === "scene") && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.detachScenes)} onChange={event => resolve("detachScenes", event.target.checked)} />Import these charts independently of source Scenes</label>}
            {(resolutions.standardAttention || proposal.issues.some(issue => issue.code === "attention")) && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.standardAttention)} onChange={event => resolve("standardAttention", event.target.checked)} />Convert incoming Attention strips to Standard sections</label>}
            {(resolutions.detachConvertedDrills || proposal.issues.some(issue => issue.code === "converted-drill")) && <label><input type="checkbox" disabled={locked} checked={Boolean(resolutions.detachConvertedDrills)} onChange={event => resolve("detachConvertedDrills", event.target.checked)} />Remove drill links from converted Attention sections</label>}
            {nameItems.some(([, items]) => items.length) && <details><summary>Review object names</summary>{nameItems.map(([kind, items]) => items.map(item => {
              const summaryKind = kind === "charts" ? "placements" : kind;
              const imported = proposal.summary[summaryKind]?.find(row => row.id === identityMap[kind][item.id] || row.chartId === identityMap[kind][item.id]);
              return <label key={`${kind}:${item.id}`}>{item.name}<input aria-label={`Imported ${kind} name: ${item.name}`} disabled={locked} value={resolutions.names?.[kind]?.[item.id] ?? imported?.name ?? item.name}
                onChange={event => setResolutions(value => ({ ...value, names: { ...value.names, [kind]: { ...value.names?.[kind], [item.id]: event.target.value } } }))} /></label>;
            }))}</details>}
            <ul aria-label="Import consequences">{proposal.issues.filter(issue => issue.code !== "empty").map((issue, index) => <li key={index} data-blocking={issue.blocking}>{issue.message}</li>)}</ul>
            {pending.retainedDrafts?.length > 0 && <p>Existing drafts stay open: {[...new Set(pending.retainedDrafts)].join(", ")}.</p>}
            {pending.needsSave && <div role="status"><p>Pending page or layout changes need to be saved before reviewing insertion into this dashboard.</p><button type="button" disabled={locked || !pending.canSave} onClick={savePending}>Save pending changes and review</button></div>}
            {stale && <div role="status"><p>The current dashboard changed after this review.</p><button type="button" className="secondary" disabled={locked} onClick={() => refresh()}>Refresh import review</button></div>}
          </>}
          {(error || localError) && <p role="alert">{localError || error}</p>}
        </section>
      </div>
      <footer className="dashboard-dialog__footer dashboard-dialog__actions">
        <button type="button" className="secondary" disabled={locked} data-modal-initial-focus="true" onClick={onCancel}>Cancel</button>
        {onChooseAnother && <button type="button" className="secondary" disabled={locked} onClick={onChooseAnother}>Choose another file</button>}
        {mode === "replace" ? <button type="button" disabled={locked || !replacementAcknowledged} onClick={onConfirm}>{busy ? "Loading…" : "Load package"}</button>
          : <button type="button" disabled={locked || stale || pending.needsSave || blocking} onClick={() => onImportSelected({ proposal, transactionId })}>{busy ? "Importing…" : "Import selected"}</button>}
      </footer>
    </section>
  </ModalFocusScope>;
}

export function formatPackageTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? "Creation date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp);
}

function noop() {}
