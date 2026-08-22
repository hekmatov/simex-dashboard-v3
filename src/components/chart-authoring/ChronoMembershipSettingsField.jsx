import React from "react";
import { validateChronoGroups } from "../../charting/time/chronoGroupModel.js";
import {
  GroupShell,
  fieldControlId
} from "./StandardField.jsx";
const MATCHING_POLICIES = [
  ["exact", "Exact time only"],
  ["lastKnown", "Last known value"],
  ["nearest", "Nearest within tolerance"],
  ["interpolate", "Interpolate"]
];
function ChronoMembershipSettingsField({
  field,
  chart,
  onMembershipChange = noop,
} = {}) {
  if (!field || typeof field !== "object") return null;
  const groups = Array.isArray(field.groups) ? field.groups : [];
  const selected = new Set(
    Array.isArray(field.selectedGroupIds) ? field.selectedGroupIds : []
  );
  const id = fieldControlId(field);
  return /* @__PURE__ */ React.createElement(
    GroupShell,
    { field, className: "chart-authoring-time-sync" },
    /* @__PURE__ */ React.createElement(
      "fieldset",
      { id, className: "chart-authoring-control-grid" },
      /* @__PURE__ */ React.createElement("legend", null, "Chrono Group memberships"),
      groups.flatMap((group) => (
        typeof group?.id === "string" && typeof group?.name === "string"
          ? [/* @__PURE__ */ React.createElement(
              "label",
              { key: group.id },
              /* @__PURE__ */ React.createElement("input", {
                type: "checkbox",
                checked: selected.has(group.id),
                disabled: field.ineligible === true && !selected.has(group.id),
                "aria-describedby": field.help ? `${id}-help` : void 0,
                onChange: (event) => onMembershipChange(
                  group.id,
                  event.target.checked
                )
              }),
              group.name
            )]
          : []
      ))
    )
  );
}
function proposeChronoGroupMatching({
  groups,
  target,
  matching,
  charts,
  loadedData,
  profiles
} = {}) {
  if (!Array.isArray(groups)) {
    throw new TypeError("Chrono Groups must be an array.");
  }
  if (!target || typeof target !== "object" || typeof target.groupId !== "string" || typeof target.chartId !== "string" || target.property !== "matching") {
    throw new Error("Time synchronization matching requires a semantic member target.");
  }
  const proposed = structuredClone(groups);
  const group = proposed.find(({ id }) => id === target.groupId);
  if (!group) {
    throw new Error(`Unknown Chrono Group "${target.groupId}".`);
  }
  const member = Array.isArray(group.members) ? group.members.find(({ chartId }) => chartId === target.chartId) : null;
  if (!member) {
    throw new Error(`Unknown member chart "${target.chartId}" in Chrono Group "${target.groupId}".`);
  }
  member.matching = structuredClone(matching);
  validateChronoGroups(proposed, {
    charts,
    loadedData,
    profiles
  });
  return proposed;
}
function matchingValue(value) {
  if (value?.policy === "nearest") {
    return {
      policy: "nearest",
      toleranceMs: Number.isFinite(value.toleranceMs) ? value.toleranceMs : 0
    };
  }
  return {
    policy: typeof value?.policy === "string" ? value.policy : "exact"
  };
}
function matchingForPolicy(policy, previous) {
  return policy === "nearest" ? {
    policy,
    toleranceMs: Number.isFinite(previous?.toleranceMs) ? previous.toleranceMs : 0
  } : { policy };
}
function chartCollection(charts, chart) {
  const values = Array.isArray(charts) ? charts : [];
  if (!chart?.id || values.some(({ id }) => id === chart.id)) return values;
  return [...values, chart];
}
function noop() {
}
export {
  ChronoMembershipSettingsField as default,
  proposeChronoGroupMatching
};
