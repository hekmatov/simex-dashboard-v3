import React from "react";

export default function ChronoStudio({ state, cards = [], onAction = () => {} }) {
  return React.createElement("section", { className: "chrono-studio temporal-studio", "aria-labelledby": "chrono-studio-title" },
    React.createElement("header", { className: "temporal-studio__header" },
      React.createElement("div", null,
        React.createElement("p", { className: "eyebrow" }, "Temporal authoring"),
        React.createElement("h2", { id: "chrono-studio-title" }, "Chrono Studio"),
        React.createElement("p", null, "Browse saved Chrono Groups, inspect their content, or begin a new group."),
      ),
      React.createElement("button", { type: "button", className: "temporal-studio__primary-action", onClick: () => onAction({ type: "START_CREATE_CHRONO_GROUP" }) }, "Create Chrono Group"),
    ),
    React.createElement(StudioFilters, { state, onAction }),
    React.createElement("p", { className: "temporal-studio__count", role: "status" }, `Showing ${cards.length} of ${state?.chronoGroups?.length ?? cards.length}`),
    cards.length === 0
      ? React.createElement("p", { className: "temporal-studio__empty", role: "status" }, state?.query ? "No Chrono Groups match this view." : "No Chrono Groups have been created yet.")
      : React.createElement("ul", { className: "temporal-studio__cards" }, cards.map((card) => React.createElement("li", { key: card.id },
        React.createElement("button", {
          type: "button",
          className: "temporal-content-card",
          "data-action": "open-content",
          "data-status": card.status,
          onClick: () => onAction({ type: "OPEN_CONTENT", itemType: "chronoGroup", itemId: card.id }),
        },
        React.createElement("span", { className: "temporal-content-card__type" }, "Chrono Group"),
        React.createElement("strong", null, card.name),
        React.createElement("span", null, `${card.chartIds?.length ?? card.members?.length ?? 0} member charts · ${card.sceneCount ?? 0} Scenes`),
        React.createElement("span", { className: "temporal-content-card__status" }, card.status === "needs-attention" ? "Needs attention" : "Ready"),
        ),
      ))),
  );
}

function StudioFilters({ state, onAction }) {
  return React.createElement("div", { className: "temporal-studio__filters", role: "search" },
    React.createElement("label", null, "Search", React.createElement("input", { type: "search", value: state?.query ?? "", onChange: (event) => onAction({ type: "SET_QUERY", query: event.target.value }) })),
    React.createElement("label", null, "Status", React.createElement("select", { value: state?.statusFilter ?? "all", onChange: (event) => onAction({ type: "SET_STATUS_FILTER", statusFilter: event.target.value }) },
      React.createElement("option", { value: "all" }, "All"),
      React.createElement("option", { value: "ready" }, "Ready"),
      React.createElement("option", { value: "needs-attention" }, "Needs attention"),
    )),
    React.createElement("label", null, "Page", React.createElement("select", { value: state?.pageId ?? "", onChange: (event) => onAction({ type: "SET_PAGE_FILTER", pageId: event.target.value || null }) },
      React.createElement("option", { value: "" }, "All pages"),
      ...(state?.pages ?? []).map((page) => React.createElement("option", { key: page.id, value: page.id }, page.label ?? page.title ?? page.id)),
    )),
  );
}
