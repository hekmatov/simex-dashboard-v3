import React from "react";
import { listChartSchemaGroups } from "../../charting/schemas/chartSchemaRegistry.js";
function ChartTypePicker({
  value = "",
  query = "",
  onChange = noop,
  onQueryChange = noop
} = {}) {
  const search = typeof query === "string" ? query.trim().toLocaleLowerCase() : "";
  const groups = listChartSchemaGroups().map((group) => ({
    ...group,
    charts: group.charts.filter((chart) => search === "" || `${chart.label} ${chart.description} ${group.label}`.toLocaleLowerCase().includes(search))
  })).filter(({ charts }) => charts.length > 0);
  return /* @__PURE__ */ React.createElement("section", { className: "chart-type-picker", "aria-labelledby": "chart-type-picker-heading" }, /* @__PURE__ */ React.createElement("h3", { id: "chart-type-picker-heading" }, "Choose a chart type"), /* @__PURE__ */ React.createElement("label", { htmlFor: "chart-type-search" }, "Search chart types"), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "chart-type-search",
      type: "search",
      value: typeof query === "string" ? query : "",
      onChange: (event) => onQueryChange(event.target.value),
      placeholder: "Search by purpose or chart name"
    }
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
        className: "chart-type-card",
        key: chart.typeId,
        type: "button",
        "aria-pressed": value === chart.typeId,
        onClick: () => onChange(chart.typeId)
      },
      /* @__PURE__ */ React.createElement("strong", null, chart.label),
      /* @__PURE__ */ React.createElement("span", null, chart.description)
    )))
  ))), groups.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "chart-authoring-empty", role: "status" }, "No chart types match this search.") : null);
}
function noop() {
}
export {
  ChartTypePicker as default
};
