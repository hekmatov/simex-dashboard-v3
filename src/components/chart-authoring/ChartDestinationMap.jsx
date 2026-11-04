import React from "react";
import BuildStructureRail from "../build/BuildStructureRail.jsx";
import { resolveDestination } from "../../charting/forms/chartDestination.js";

export function destinationMapDashboard(dashboard = {}) {
  return {
    pages: (dashboard?.pages ?? []).flatMap((page) => {
      const sections = (page.sections ?? []).filter((section) => (
        resolveDestination({ pageId: page.id, sectionId: section.id }, dashboard).status === "valid"
      ));
      return sections.length ? [{ ...page, sections }] : [];
    }),
  };
}

export function destinationMapSelection(dashboard, destination = {}) {
  const page = dashboard.pages.find(({ id }) => id === destination?.pageId);
  const section = page?.sections.find(({ id }) => id === destination?.sectionId);
  if (!section) return null;
  const relation = destination?.relation ?? destination?.position ?? "append";
  if (relation === "append" || relation === "start") return { kind: "section", pageId: page.id, sectionId: section.id };
  const panel = (section.panels ?? []).find((panel) => (panel.chart ?? panel).id === destination.anchorId);
  return panel ? { kind: "chart", pageId: page.id, sectionId: section.id, chartId: destination.anchorId, placementId: panel.id } : null;
}

export function destinationPatchForNode(dashboard, node, destination = {}) {
  const page = dashboard.pages.find(({ id }) => id === node?.pageId);
  const section = node?.kind === "page"
    ? page?.sections[0]
    : page?.sections.find(({ id }) => id === node?.sectionId);
  if (!section) return null;
  if (node.kind === "chart" && !(section.panels ?? []).some((panel) => (
    (panel.chart ?? panel).id === node.chartId && panel.id === node.placementId
  ))) return null;
  const previousRelation = destination?.relation ?? destination?.position;
  const relation = node.kind === "chart"
    ? previousRelation === "before" ? "before" : "after"
    : previousRelation === "start" ? "start" : "append";
  return { pageId: page.id, sectionId: section.id, relation, position: relation, anchorId: node.kind === "chart" ? node.chartId : null };
}

export default function ChartDestinationMap({ dashboard, destination, disabled = false, onChange = () => {} }) {
  const map = destinationMapDashboard(dashboard);
  const selection = destinationMapSelection(map, destination);
  const relation = destination?.relation ?? destination?.position ?? "append";
  const anchored = selection?.kind === "chart";
  return <div className="chart-destination-map" data-destination-page-id={destination?.pageId ?? ""}
    data-destination-section-id={destination?.sectionId ?? ""} data-destination-relation={relation}
    data-destination-anchor-id={destination?.anchorId ?? ""}>
    <p className="chart-destination-map__hint">Choose a section to add at its start or end, or a chart to insert beside it.</p>
    <fieldset className="chart-destination-map__insertion" disabled={disabled}>
      <legend>Insertion</legend>
      {[
        ["start", "Start of section"],
        ["append", "End of section"],
        ["before", "Before selected chart"],
        ["after", "After selected chart"],
      ].map(([value, label]) => <label key={value}>
        <input type="radio" name="chart-destination-insertion" value={value} checked={relation === value}
          disabled={!selection || (["before", "after"].includes(value) && !anchored)}
          onChange={() => onChange({ relation: value, position: value, anchorId: value === "append" || value === "start" ? null : destination.anchorId })} />
        {label}
      </label>)}
    </fieldset>
    {map.pages.length ? <div className="dashboard-map-panel build-rail--structure chart-destination-map__tree">
      <BuildStructureRail dashboard={map} selection={selection} disabled={disabled} selectionOnly ariaLabel="Destination map"
        onSelect={(node) => {
          const patch = destinationPatchForNode(map, node, destination);
          if (patch) onChange(patch);
        }} />
    </div> : <p role="status">No eligible destination sections.</p>}
    {!selection && destination?.sectionId && <p role="status">The previous destination is unavailable. Choose a section or chart in the map.</p>}
  </div>;
}
