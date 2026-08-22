import React from "react";

export default function SceneLibrary({ state, sections = [], onAction = () => {} }) {
  return React.createElement("section", { className: "scene-library temporal-studio", "aria-labelledby": "scene-library-title" },
    React.createElement("header", { className: "temporal-studio__header" },
      React.createElement("div", null,
        React.createElement("p", { className: "eyebrow" }, "Temporal authoring"),
        React.createElement("h2", { id: "scene-library-title" }, "Scene Studio"),
        React.createElement("p", null, "Browse saved Scenes by dashboard page before opening their content."),
      ),
      React.createElement("button", { type: "button", onClick: () => onAction({ type: "START_CREATE_SCENE" }) }, "Create Scene"),
    ),
    React.createElement("div", { className: "temporal-studio__filters", role: "search" },
      React.createElement("label", null, "Search", React.createElement("input", { type: "search", value: state?.query ?? "", onChange: (event) => onAction({ type: "SET_QUERY", query: event.target.value }) })),
      React.createElement("label", null, "Status", React.createElement("select", { value: state?.statusFilter ?? "all", onChange: (event) => onAction({ type: "SET_STATUS_FILTER", statusFilter: event.target.value }) },
        React.createElement("option", { value: "all" }, "All"), React.createElement("option", { value: "ready" }, "Ready"), React.createElement("option", { value: "needs-attention" }, "Needs attention"),
      )),
    ),
    sections.length === 0 ? React.createElement("p", { className: "temporal-studio__empty", role: "status" }, state?.query ? "No Scenes match this view." : "No Scenes have been created yet.") : null,
    ...sections.map((section) => React.createElement("section", { className: "scene-library__page", key: section.pageId },
      React.createElement("h3", null, section.pageLabel),
      React.createElement("ul", { className: "temporal-studio__cards" }, section.scenes.map((scene) => React.createElement("li", { key: scene.id }, React.createElement("button", {
        type: "button", className: "temporal-content-card", "data-action": "open-content", "data-status": scene.status,
        onClick: () => onAction({ type: "OPEN_CONTENT", itemType: "scene", itemId: scene.id }),
      }, React.createElement("span", { className: "temporal-content-card__type" }, "Scene"), React.createElement("strong", null, scene.name), React.createElement("span", null, scene.chronoGroupName), React.createElement("span", { className: "temporal-content-card__status" }, scene.status === "needs-attention" ? "Needs attention" : "Ready"))))),
    )),
  );
}
