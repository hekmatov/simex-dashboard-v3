import React from "react";
import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function PackageImportDestinations({ requests, destination, locked, blocked, error, onChange, onCancel, onImport }) {
  const update = (request, patch) => {
    const field = request.kind === "section" ? "sectionTargets" : "placementTargets";
    onChange({ ...destination, [field]: { ...destination[field], [request.key]: { ...destination[field]?.[request.key], ...patch } } });
  };
  return <ModalFocusScope className="confirm-dialog-backdrop dashboard-dialog-backdrop" role="dialog" aria-modal="true"
    aria-labelledby="package-destinations-title" onEscape={locked ? () => {} : onCancel}>
    <section className="dashboard-package-review dashboard-package-destinations dashboard-dialog dashboard-dialog--wide">
      <header className="dashboard-dialog__header"><h2 id="package-destinations-title">Choose import destinations</h2>
        <p>Choose where to append items whose parent is not selected, or resolve an ambiguous matching name.</p></header>
      <div className="dashboard-dialog__body package-import-targets">
        {requests.map(request => {
          const choice = (request.kind === "section" ? destination.sectionTargets : destination.placementTargets)?.[request.key] ?? {};
          const label = request.breadcrumb ? `${request.breadcrumb} / ${request.name}` : request.name;
          return <fieldset key={`${request.kind}:${request.key}`} disabled={locked}><legend>{label}</legend>
            {request.kind === "page" ? <label>Matching page<select aria-label={`Matching page: ${label}`} value={request.pageId ?? ""}
              onChange={event => onChange({ ...destination, pageTargets: { ...destination.pageTargets, [request.key]: event.target.value } })}>
              <option value="">Choose a matching page</option>{request.pageOptions.map(page => <option key={page.id} value={page.id}>{page.label ?? page.name}</option>)}
            </select></label> : <>
              {!request.pageFixed && <label>Destination page<select aria-label={`Destination page: ${label}`}
                value={choice.newPageTitle !== undefined ? "__new" : choice.pageId ?? ""}
                onChange={event => update(request, { pageId: event.target.value === "__new" ? undefined : event.target.value,
                  newPageTitle: event.target.value === "__new" ? "Imported page" : undefined, sectionId: undefined, newSectionTitle: undefined })}>
                <option value="">Choose a page</option>{request.pageOptions.map(page => <option key={page.id} value={page.id}>{page.label ?? page.name}</option>)}
                <option value="__new">Create new page</option>
              </select></label>}
              {choice.newPageTitle !== undefined && <label>New page title<input value={choice.newPageTitle} onChange={event => update(request, { newPageTitle: event.target.value })} /></label>}
              {request.kind === "section" && request.matchingSections.length > 1 && <label>Matching section<select aria-label={`Matching section: ${label}`} value={choice.sectionId ?? ""}
                onChange={event => update(request, { sectionId: event.target.value })}>
                <option value="">Choose a matching section</option>{request.matchingSections.map(section => <option key={section.id} value={section.id}>{section.label ?? section.name}</option>)}
              </select></label>}
              {request.kind === "placements" && <>
                <label>Destination section<select aria-label={`Destination section: ${label}`} disabled={!request.pageId}
                  value={choice.newSectionTitle !== undefined || choice.newPageTitle !== undefined ? "__new" : choice.sectionId ?? ""}
                  onChange={event => update(request, { sectionId: event.target.value === "__new" ? undefined : event.target.value,
                    newSectionTitle: event.target.value === "__new" ? "Imported charts" : undefined })}>
                  <option value="">Choose a section</option>{request.sectionOptions.map(section => <option key={section.id} value={section.id}>{section.label ?? section.name}</option>)}
                  <option value="__new">Create new section</option>
                </select></label>
                {(choice.newSectionTitle !== undefined || choice.newPageTitle !== undefined) && <label>New section title<input value={choice.newSectionTitle ?? "Imported charts"}
                  onChange={event => update(request, { newSectionTitle: event.target.value })} /></label>}
              </>}
            </>}
          </fieldset>;
        })}
        {error && <p role="alert">{error}</p>}
      </div>
      <footer className="dashboard-dialog__footer dashboard-dialog__actions"><button type="button" className="secondary" disabled={locked} onClick={onCancel}>Back to selection</button>
        <button type="button" disabled={locked || blocked} onClick={onImport}>{locked ? "Importing…" : "Import selected"}</button></footer>
    </section>
  </ModalFocusScope>;
}
