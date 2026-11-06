import React from "react";
import BuildStructureRail from "./BuildStructureRail.jsx";
import { dashboardPackageSectionKey } from "../../lib/dashboardPackageSelection.js";

export default function PackageImportMap({ candidate, inventory, resolved, search, disabled, onChoose }) {
  const query = search.trim().toLowerCase();
  const matches = name => !query || String(name ?? "").toLowerCase().includes(query);
  const dashboard = { ...candidate.config, pages: candidate.config.pages.flatMap(page => {
    const pageMatch = matches(page.label || page.title);
    const sections = page.sections.flatMap(section => {
      const sectionMatch = pageMatch || matches(section.title);
      const panels = sectionMatch ? section.panels : section.panels.filter(panel => matches((panel.chart ?? panel).title));
      return sectionMatch || panels.length ? [{ ...section, panels }] : [];
    });
    return pageMatch || sections.length ? [{ ...page, sections }] : [];
  }) };
  const nodeControl = node => {
    const page = inventory.pages.find(page => page.id === node.pageId);
    const sectionKey = dashboardPackageSectionKey(node.pageId, node.sectionId);
    const key = node.kind === "page" ? "pageIds" : node.kind === "section" ? "sectionIds" : "placementIds";
    const id = node.kind === "page" ? node.pageId : node.kind === "section" ? sectionKey : node.placementId;
    const item = node.kind === "page" ? page : (node.kind === "section" ? inventory.sections : inventory.placements).find(item => item.id === id);
    const included = resolved.pageIds.includes(node.pageId) && node.kind !== "page"
      || node.kind === "chart" && resolved.sectionIds.includes(sectionKey);
    const checked = resolved[key].includes(id);
    const mixed = !checked && (node.kind === "page"
      ? inventory.sections.some(section => section.pageId === id && resolved.sectionIds.includes(section.id))
        || inventory.placements.some(panel => panel.pageId === id && resolved.placementIds.includes(panel.id))
      : node.kind === "section" && inventory.placements.some(panel => panel.sectionKey === id && resolved.placementIds.includes(panel.id)));
    return <input type="checkbox" aria-label={`Import ${node.kind === "chart" ? "panel" : node.kind}: ${item?.name}`}
      checked={checked} disabled={disabled || !page.eligible || included}
      title={included ? "Included with the selected parent" : !page.eligible ? "Canonical Home cannot be appended" : undefined}
      ref={input => { if (input) input.indeterminate = Boolean(mixed); }}
      onChange={event => onChoose(key, [id], event.target.checked)} />;
  };
  return <div className="dashboard-map-panel build-rail--structure package-import-map">
    <BuildStructureRail dashboard={dashboard} selectionOnly ariaLabel="Package dashboard map" disabled={disabled} renderNodeControl={nodeControl} />
    {!dashboard.pages.length && <p>No panels match this search.</p>}
  </div>;
}
