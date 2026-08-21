import React from "react";
import { listChartTypeOptions } from "../../charting/forms/chartCatalogue.js";
import { chartSchemaRegistry } from "../../charting/schemas/chartSchemaRegistry.js";
import { CHART_TYPE_GLYPHS } from "../../iconography/iconCatalog.js";
import { SimExIcon } from "../common/SimExIcon.js";
function ChartTypePicker({
  value = "",
  query = "",
  category = "",
  sourceProfile = null,
  registry = chartSchemaRegistry,
  onChange = noop,
  onQueryChange = noop,
  onCategoryChange = noop,
} = {}) {
  const safeQuery = typeof query === "string" ? query : "";
  const options = listChartTypeOptions({
    registry,
    query: safeQuery,
    category: typeof category === "string" ? category : "",
    sourceProfile,
    selected: value ? { chartTypeId: value } : null,
  });
  const groupLabels = new Map(registry.groups().map(({ id, label }) => [id, label]));
  const groups = [...new Set(options.map(({ category: id }) => id))].map((id) => ({
    id,
    label: groupLabels.get(id) ?? "Unavailable",
    charts: options.filter(({ category: categoryId }) => categoryId === id),
  }));
  return /* @__PURE__ */ React.createElement("section", { className: "chart-type-picker", "aria-labelledby": "chart-type-picker-heading" }, /* @__PURE__ */ React.createElement("h3", { id: "chart-type-picker-heading" }, "Choose a chart type"), /* @__PURE__ */ React.createElement("label", { htmlFor: "chart-type-search" }, "Search chart types"), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "chart-type-search",
      type: "search",
      value: safeQuery,
      onChange: (event) => onQueryChange(event.target.value),
      placeholder: "Search by name, purpose, or description"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "chart-type-category" }, "Purpose"), /* @__PURE__ */ React.createElement(
    "select",
    {
      id: "chart-type-category",
      value: typeof category === "string" ? category : "",
      onChange: (event) => onCategoryChange(event.target.value),
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "All purposes"),
    registry.groups().map((group) => /* @__PURE__ */ React.createElement("option", { key: group.id, value: group.id }, group.label)),
  ), /* @__PURE__ */ React.createElement("div", { className: "chart-type-purpose-groups" }, groups.map((group) => /* @__PURE__ */ React.createElement(
    "section",
    {
      className: "chart-type-purpose-group",
      key: group.id,
      "aria-labelledby": `chart-purpose-${group.id}`
    },
    /* @__PURE__ */ React.createElement("h4", { id: `chart-purpose-${group.id}` }, group.label),
    /* @__PURE__ */ React.createElement("div", { className: "chart-type-card-grid" }, group.charts.map((chart) => /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "simex-icon-control chart-type-card",
        key: chart.id,
        type: "button",
        "aria-label": `${chart.label}. ${chart.description}. ${chart.reason}`,
        "aria-pressed": value === chart.id,
        disabled: chart.compatibility === "incompatible",
        onClick: () => onChange(chart.id)
      },
      /* @__PURE__ */ React.createElement(SimExIcon, {
        iconId: CHART_TYPE_GLYPHS[chart.id],
        size: 28
      }),
      /* @__PURE__ */ React.createElement("span", { className: "chart-type-card-label" }, chart.label),
      /* @__PURE__ */ React.createElement("span", { className: "chart-type-card-reason" }, chart.reason)
    )))
  ))), groups.length === 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "chart-authoring-empty", role: "status" }, "No chart types match this search by name, purpose, or description."), safeQuery ? /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onQueryChange("") }, "Clear search") : null) : null);
}
function noop() {
}
export {
  ChartTypePicker as default
};
