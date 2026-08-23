import React from "react";

export default function ChronoGroupContent({ content, onAction = () => {} }) {
  if (!content) return React.createElement("p", { role: "alert" }, "This Chrono Group is no longer available.");
  return React.createElement("article", { className: "temporal-content-page chrono-group-content", "aria-labelledby": "chrono-group-content-title" },
    React.createElement("header", { className: "temporal-content-page__header" },
      React.createElement("div", null,
        React.createElement("p", { className: "eyebrow" }, "Chrono Group"),
        React.createElement("h2", { id: "chrono-group-content-title" }, content.name),
        React.createElement("p", null, `${formatDate(content.period?.start ?? content.period?.startEpochMs)} – ${formatDate(content.period?.end ?? content.period?.endEpochMs)} · ${content.secondsPerFrame ?? 1}s per frame`),
      ),
      React.createElement("div", { className: "temporal-content-page__actions" },
        React.createElement("button", { type: "button", onClick: () => onAction({ type: "START_EDIT", itemType: "chronoGroup", itemId: content.id }) }, "Edit"),
        React.createElement("button", { type: "button", onClick: () => onAction({ type: "START_CREATE_SCENE", parentChronoGroupId: content.id }) }, "Create Scene"),
        React.createElement("button", { type: "button", className: "secondary", onClick: () => onAction({ type: "START_DUPLICATE", itemType: "chronoGroup", itemId: content.id }) }, "Duplicate"),
        React.createElement("button", { type: "button", className: "secondary", onClick: () => onAction({ type: "REQUEST_REMOVE", itemType: "chronoGroup", itemId: content.id }) }, "Remove"),
        content.status === "needs-attention" ? React.createElement("button", { type: "button", onClick: () => onAction({ type: "START_REPAIR", itemType: "chronoGroup", itemId: content.id }) }, "Repair") : null,
        React.createElement("button", { type: "button", className: "secondary", onClick: () => onAction({ type: "RETURN_TO_STUDIO" }) }, "Back to Chrono Studio"),
      ),
    ),
    React.createElement("p", { className: "temporal-content-page__status", "data-status": content.status }, content.status === "needs-attention" ? "Needs attention" : "Ready"),
    ...(content.statusReasons ?? []).map((reason) => React.createElement("p", { className: "temporal-content-page__reason", key: reason }, reason)),
    React.createElement("div", { className: "temporal-content-page__sections" }, ...(content.pageSections ?? []).map((section) => React.createElement("section", { key: section.pageId },
      React.createElement("h3", null, section.pageLabel),
      React.createElement("p", null, `${section.charts.length} member ${section.charts.length === 1 ? "chart" : "charts"} · ${section.sceneIds.length} ${section.sceneIds.length === 1 ? "Scene" : "Scenes"}`),
      section.charts.length ? React.createElement("ul", null, section.charts.map((chart) => React.createElement("li", { key: chart.id }, chart.title ?? chart.label ?? chart.id))) : null,
      section.sceneIds.length ? React.createElement("div", { className: "chrono-group-content__scenes" }, React.createElement("h4", null, "Scenes"), React.createElement("ul", null, section.sceneIds.map((sceneId) => {
        const scene = content.childScenes?.find(({ id }) => id === sceneId);
        return React.createElement("li", { key: sceneId }, React.createElement("button", { type: "button", className: "text-button", onClick: () => onAction({ type: "OPEN_CONTENT", itemType: "scene", itemId: sceneId }) }, scene?.name ?? sceneId));
      }))) : React.createElement("p", { className: "temporal-content-page__empty" }, "No Scenes yet on this page."),
    ))),
  );
}

function formatDate(value) {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  }
  return Number.isFinite(value) ? new Date(value).toISOString().slice(0, 10) : "No period";
}
