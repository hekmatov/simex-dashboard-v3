import React from "react";
import { normalizeCollectionSettings } from "../../charting/collection/collectionModel.js";
import {
  GroupShell,
  fieldControlId
} from "./StandardField.jsx";
const PRIORITY_METHODS = [
  ["highestCurrent", "Highest current value"],
  ["lowestCurrent", "Lowest current value"],
  ["largestAbsoluteChange", "Largest absolute change"],
  ["largestPercentageChange", "Largest percentage change"],
  ["furthestFromTarget", "Furthest from target"],
  ["riskScore", "Highest risk score"]
];
const PRIORITY_METRICS = [
  ["current", "Current value"],
  ["absoluteDelta", "Absolute change"],
  ["percentageDelta", "Percentage change"],
  ["target", "Target"],
  ["distanceFromTarget", "Distance from target"],
  ["riskScore", "Risk score"]
];
function CollectionSettingsField({
  field,
  value = field?.value,
  onChange = noop
} = {}) {
  if (!field || typeof field !== "object") return null;
  let settings;
  try {
    settings = normalizeCollectionSettings(value ?? {});
  } catch {
    settings = normalizeCollectionSettings();
  }
  const id = fieldControlId(field);
  const emit = (path, nextValue) => onChange(
    updateCollectionSettings(settings, path, nextValue)
  );
  const rankingSelection = settings.ranking.mode === "priority" && settings.ranking.expression
    ? "custom"
    : settings.ranking.mode;
  return /* @__PURE__ */ React.createElement(GroupShell, { field, className: "chart-authoring-collection" }, /* @__PURE__ */ React.createElement("div", { id, className: "chart-authoring-control-grid" }, /* @__PURE__ */ React.createElement("label", null, "Display mode", /* @__PURE__ */ React.createElement("select", { value: settings.layout, onChange: (event) => emit(["layout"], event.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "fixed" }, "Fixed grid"), /* @__PURE__ */ React.createElement("option", { value: "scroll" }, "Scrollable grid"), /* @__PURE__ */ React.createElement("option", { value: "carousel" }, "Auto carousel"))), /* @__PURE__ */ React.createElement("label", null, "Rows", /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "4", value: settings.rows, onChange: (event) => emit(["rows"], Number(event.target.value)) })), /* @__PURE__ */ React.createElement("label", null, "Columns", /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "4", value: settings.columns, onChange: (event) => emit(["columns"], Number(event.target.value)) })), /* @__PURE__ */ React.createElement("label", null, "Card spacing", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", max: "64", value: settings.gap, onChange: (event) => emit(["gap"], Number(event.target.value)) })), overflowControl(settings, emit), /* @__PURE__ */ React.createElement("label", null, "Ranking", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: rankingSelection,
      onChange: (event) => emit(
        ["ranking"],
        defaultRanking(event.target.value)
      )
    },
    /* @__PURE__ */ React.createElement("option", { value: "fixed" }, "Fixed order"),
    /* @__PURE__ */ React.createElement("option", { value: "sort" }, "Sort by field"),
    /* @__PURE__ */ React.createElement("option", { value: "priority" }, "Priority"),
    /* @__PURE__ */ React.createElement("option", { value: "custom" }, "Custom priority")
  )), settings.ranking.mode === "sort" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Sort field", /* @__PURE__ */ React.createElement("input", { value: settings.ranking.field, onChange: (event) => emit(["ranking", "field"], event.target.value) })), /* @__PURE__ */ React.createElement("label", null, "Sort direction", /* @__PURE__ */ React.createElement("select", { value: settings.ranking.direction, onChange: (event) => emit(["ranking", "direction"], event.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "asc" }, "Ascending"), /* @__PURE__ */ React.createElement("option", { value: "desc" }, "Descending")))) : null, rankingSelection === "priority" ? /* @__PURE__ */ React.createElement("label", null, "Priority method", /* @__PURE__ */ React.createElement("select", { value: settings.ranking.method ?? "highestCurrent", onChange: (event) => emit(["ranking"], {
    mode: "priority",
    method: event.target.value,
    stabilize: settings.ranking.stabilize
  }) }, PRIORITY_METHODS.map(([method, label]) => /* @__PURE__ */ React.createElement("option", { key: method, value: method }, label)))) : null, rankingSelection === "custom" ? customPriorityControls(settings.ranking, emit) : null, ["sort", "priority", "custom"].includes(rankingSelection) ? toggle(
    "Keep positions stable for ties",
    settings.ranking.stabilize,
    (checked) => emit(["ranking", "stabilize"], checked)
  ) : null, settings.layout === "carousel" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Rotation interval (seconds)", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "5",
      value: settings.carousel.intervalMs / 1e3,
      onChange: (event) => emit(["carousel", "intervalMs"], Number(event.target.value) * 1e3)
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Transition", /* @__PURE__ */ React.createElement("select", { value: settings.carousel.transition, onChange: (event) => emit(["carousel", "transition"], event.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "none" }, "None"), /* @__PURE__ */ React.createElement("option", { value: "fade" }, "Fade"), /* @__PURE__ */ React.createElement("option", { value: "slide" }, "Slide"))), toggle("Loop continuously", settings.carousel.loop, (checked) => emit(["carousel", "loop"], checked)), toggle("Pause on hover", settings.carousel.pauseOnHover, (checked) => emit(["carousel", "pauseOnHover"], checked))) : null, toggle("Re-rank during playback", settings.playback.rerank, (checked) => emit(["playback", "rerank"], checked)), toggle("Pause carousel during playback", settings.playback.pauseCarousel, (checked) => emit(["playback", "pauseCarousel"], checked))));
}
function updateCollectionSettings(current, path, value) {
  const normalized = normalizeCollectionSettings(current ?? {});
  if (!Array.isArray(path) || path.length < 1 || path.length > 2) {
    throw new Error("Collection updates require a one- or two-part path.");
  }
  const [section, property] = path;
  let next = structuredClone(normalized);
  if (property === void 0) {
    next[section] = structuredClone(value);
  } else {
    if (!["ranking", "carousel", "playback"].includes(section)) {
      throw new Error(`Collection section "${section}" cannot be edited as an object.`);
    }
    next[section] = { ...next[section], [property]: structuredClone(value) };
  }
  if (section === "layout") delete next.overflow;
  return normalizeCollectionSettings(next);
}
function defaultRanking(mode) {
  if (mode === "sort") {
    return { mode: "sort", field: "label", direction: "asc", stabilize: false };
  }
  if (mode === "priority") {
    return { mode: "priority", method: "highestCurrent", stabilize: false };
  }
  if (mode === "custom") {
    return {
      mode: "priority",
      expression: {
        operator: "weightedSum",
        terms: [{ metric: "riskScore", weight: 1 }]
      },
      stabilize: false
    };
  }
  return { mode: "fixed" };
}
function overflowControl(settings, emit) {
  const options = {
    fixed: [["manualPages", "Manual pages"], ["limit", "Show visible limit"]],
    scroll: [["scroll", "Scroll"], ["limit", "Show visible limit"]],
    carousel: [["autoRotate", "Rotate automatically"], ["limit", "Show visible limit"]]
  }[settings.layout] ?? [];
  return /* @__PURE__ */ React.createElement("label", null, "Overflow behavior", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: settings.overflow,
      onChange: (event) => emit(["overflow"], event.target.value)
    },
    options.map(([value, label]) => /* @__PURE__ */ React.createElement("option", { key: value, value }, label))
  ));
}
function customPriorityControls(ranking, emit) {
  const terms = Array.isArray(ranking.expression?.terms) && ranking.expression.terms.length > 0
    ? ranking.expression.terms
    : [{ metric: "riskScore", weight: 1 }];
  const emitTerms = (nextTerms) => emit(["ranking"], {
    mode: "priority",
    expression: {
      operator: "weightedSum",
      terms: nextTerms
    },
    stabilize: ranking.stabilize
  });
  const replaceTerm = (index, property, value) => emitTerms(
    terms.map((term, itemIndex) => itemIndex === index
      ? { ...term, [property]: value }
      : term)
  );
  return /* @__PURE__ */ React.createElement("fieldset", { className: "chart-authoring-priority-expression" }, /* @__PURE__ */ React.createElement("legend", null, "Custom priority score"), /* @__PURE__ */ React.createElement("small", null, "Combine approved operational metrics. Free-form code is not accepted."), terms.map((term, index) => /* @__PURE__ */ React.createElement("div", { key: `${term.metric}-${index}`, className: "chart-authoring-priority-term" }, /* @__PURE__ */ React.createElement("label", null, "Metric", /* @__PURE__ */ React.createElement("select", {
    value: term.metric,
    onChange: (event) => replaceTerm(index, "metric", event.target.value)
  }, PRIORITY_METRICS.map(([metric, label]) => /* @__PURE__ */ React.createElement("option", { key: metric, value: metric }, label)))), /* @__PURE__ */ React.createElement("label", null, "Weight", /* @__PURE__ */ React.createElement("input", {
    type: "number",
    step: "0.1",
    value: term.weight,
    onChange: (event) => replaceTerm(index, "weight", Number(event.target.value))
  })), terms.length > 1 ? /* @__PURE__ */ React.createElement("button", {
    type: "button",
    className: "secondary",
    onClick: () => emitTerms(terms.filter((_, itemIndex) => itemIndex !== index))
  }, "Remove factor") : null)), terms.length < 64 ? /* @__PURE__ */ React.createElement("button", {
    type: "button",
    className: "secondary",
    onClick: () => emitTerms([...terms, { metric: "current", weight: 1 }])
  }, "Add factor") : null);
}
function toggle(label, checked, onChange) {
  return /* @__PURE__ */ React.createElement("label", { className: "chart-authoring-inline-toggle" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked, onChange: (event) => onChange(event.target.checked) }), label);
}
function noop() {
}
export {
  CollectionSettingsField as default,
  updateCollectionSettings
};
