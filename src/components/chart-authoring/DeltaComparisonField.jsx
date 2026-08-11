import React from "react";
import {
  GroupShell,
  fieldControlId
} from "./StandardField.jsx";
const MODE_LABELS = {
  previousObservation: "Previous observation",
  fixedTime: "Specific point in time"
};
const POLICY_LABELS = {
  exact: "Exact time only",
  lastKnown: "Last known value",
  nearest: "Nearest within tolerance",
  interpolate: "Interpolate"
};
function DeltaComparisonField({
  field,
  value = field?.value,
  chart,
  profile,
  allowInterpolation = false,
  onChange = noop
} = {}) {
  if (!field || typeof field !== "object") return null;
  const comparison = comparisonValue(value, field);
  const policies = deltaMatchingPolicies({
    field,
    chart,
    profile,
    allowInterpolation
  });
  const id = fieldControlId(field);
  return /* @__PURE__ */ React.createElement(GroupShell, { field, className: "chart-authoring-delta-comparison" }, /* @__PURE__ */ React.createElement("div", { id, className: "chart-authoring-control-grid" }, /* @__PURE__ */ React.createElement("label", null, "Comparison basis", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: comparison.mode,
      onChange: (event) => onChange(
        event.target.value === "fixedTime" ? {
          mode: "fixedTime",
          at: "",
          matching: { policy: policies[0] ?? "exact" }
        } : { mode: "previousObservation" }
      )
    },
    safeStrings(field.modes).map((mode) => /* @__PURE__ */ React.createElement("option", { key: mode, value: mode }, MODE_LABELS[mode] ?? mode))
  )), comparison.mode === "fixedTime" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Comparison time", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: typeof comparison.at === "string" ? comparison.at : "",
      placeholder: "2027-05-01T00:00:00.000Z",
      onChange: (event) => onChange({
        ...comparison,
        at: event.target.value
      })
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Matching policy", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: comparison.matching.policy,
      onChange: (event) => onChange({
        ...comparison,
        matching: event.target.value === "nearest" ? {
          policy: "nearest",
          toleranceMs: Number.isFinite(comparison.matching.toleranceMs) ? comparison.matching.toleranceMs : 0
        } : { policy: event.target.value }
      })
    },
    policies.map((policy) => /* @__PURE__ */ React.createElement("option", { key: policy, value: policy }, POLICY_LABELS[policy] ?? policy))
  )), comparison.matching.policy === "nearest" ? /* @__PURE__ */ React.createElement("label", null, "Tolerance (milliseconds)", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "0",
      value: comparison.matching.toleranceMs,
      onChange: (event) => onChange({
        ...comparison,
        matching: {
          policy: "nearest",
          toleranceMs: Number(event.target.value)
        }
      })
    }
  )) : null) : null));
}
function deltaMatchingPolicies({
  field,
  chart,
  profile,
  allowInterpolation = false
} = {}) {
  const descriptorPolicies = safeStrings(field?.matchingPolicies);
  if (!descriptorPolicies.includes("interpolate")) return descriptorPolicies;
  if (!allowInterpolation || !numericInterpolationPermission(chart, profile)) {
    return descriptorPolicies.filter((policy) => policy !== "interpolate");
  }
  return descriptorPolicies;
}
function numericInterpolationPermission(chart, profile) {
  const binding = chart?.roles?.measurement;
  const column = Array.isArray(profile?.columns) ? profile.columns.find(({ name }) => name === binding?.field) : null;
  return canonicalType(column?.type) === "number" && (binding?.interpolationAllowed === true || column?.interpolationAllowed === true);
}
function comparisonValue(value, field) {
  if (value?.mode === "fixedTime") {
    return {
      mode: "fixedTime",
      at: typeof value.at === "string" ? value.at : "",
      matching: value.matching?.policy === "nearest" ? {
        policy: "nearest",
        toleranceMs: Number.isFinite(value.matching.toleranceMs) ? value.matching.toleranceMs : 0
      } : {
        policy: typeof value.matching?.policy === "string" ? value.matching.policy : safeStrings(field?.matchingPolicies)[0] ?? "exact"
      }
    };
  }
  return { mode: "previousObservation" };
}
function safeStrings(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === "string" && value.trim() !== "") : [];
}
function canonicalType(type) {
  return type === "numeric" ? "number" : type;
}
function noop() {
}
export {
  DeltaComparisonField as default,
  deltaMatchingPolicies
};
