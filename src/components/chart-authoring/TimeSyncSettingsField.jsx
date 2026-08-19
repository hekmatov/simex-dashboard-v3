import React from "react";
import { validateTimeSyncGroups } from "../../charting/time/timeSyncModel.js";
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
function TimeSyncSettingsField({
  field,
  chart,
  charts = [],
  loadedData = {},
  profiles = {},
  onMembershipChange = noop,
  onGroupsChange = noop,
  onValidationError = noop
} = {}) {
  if (!field || typeof field !== "object") return null;
  const groups = Array.isArray(field.groups) ? field.groups : [];
  const matching = matchingValue(field.memberMatching ?? field.groupMatching);
  const id = fieldControlId(field);
  const commitMatching = (nextMatching) => {
    try {
      const nextGroups = proposeTimeSyncGroupMatching({
        groups,
        target: field.groupTarget,
        matching: nextMatching,
        charts: chartCollection(charts, chart),
        loadedData,
        profiles
      });
      onGroupsChange(nextGroups);
    } catch (error) {
      onValidationError(error);
    }
  };
  return /* @__PURE__ */ React.createElement(GroupShell, { field, className: "chart-authoring-time-sync" }, /* @__PURE__ */ React.createElement("div", { id, className: "chart-authoring-control-grid" }, /* @__PURE__ */ React.createElement("label", null, "Playback group", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: typeof field.groupId === "string" ? field.groupId : "",
      "aria-describedby": field.help ? `${id}-help` : void 0,
      onChange: (event) => onMembershipChange(event.target.value || null)
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Not synchronized"),
    groups.flatMap((group) => typeof group?.id === "string" && typeof group?.name === "string" ? [/* @__PURE__ */ React.createElement("option", { key: group.id, value: group.id, disabled: field.ineligible === true }, group.name)] : [])
  )), field.groupId && field.groupTarget && field.ineligible !== true ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Member matching", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: matching.policy,
      onChange: (event) => commitMatching(
        matchingForPolicy(event.target.value, matching)
      )
    },
    MATCHING_POLICIES.map(([policy, label]) => /* @__PURE__ */ React.createElement("option", { key: policy, value: policy }, label))
  )), matching.policy === "nearest" ? /* @__PURE__ */ React.createElement("label", null, "Tolerance (milliseconds)", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "0",
      value: matching.toleranceMs,
      onChange: (event) => commitMatching({
        policy: "nearest",
        toleranceMs: Number(event.target.value)
      })
    }
  )) : null) : null));
}
function proposeTimeSyncGroupMatching({
  groups,
  target,
  matching,
  charts,
  loadedData,
  profiles
} = {}) {
  if (!Array.isArray(groups)) {
    throw new TypeError("Time synchronization groups must be an array.");
  }
  if (!target || typeof target !== "object" || typeof target.groupId !== "string" || typeof target.chartId !== "string" || target.property !== "matching") {
    throw new Error("Time synchronization matching requires a semantic member target.");
  }
  const proposed = structuredClone(groups);
  const group = proposed.find(({ id }) => id === target.groupId);
  if (!group) {
    throw new Error(`Unknown time synchronization group "${target.groupId}".`);
  }
  const member = Array.isArray(group.members) ? group.members.find(({ chartId }) => chartId === target.chartId) : null;
  if (!member) {
    throw new Error(`Unknown member chart "${target.chartId}" in time synchronization group "${target.groupId}".`);
  }
  member.matching = structuredClone(matching);
  validateTimeSyncGroups(proposed, {
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
  TimeSyncSettingsField as default,
  proposeTimeSyncGroupMatching
};
