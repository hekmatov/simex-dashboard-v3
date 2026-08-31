import React from "react";

import GeneratedFormSection from "./GeneratedFormSection.jsx";
import { IconControl } from "../common/SimExIcon.js";

const SECTION_TABS = Object.freeze({
  data: Object.freeze({ id: "data", label: "Data" }),
  appearance: Object.freeze({ id: "appearance", label: "Appearance" }),
  labels: Object.freeze({ id: "appearance", label: "Appearance" }),
  targets: Object.freeze({ id: "appearance", label: "Appearance" }),
  axes: Object.freeze({ id: "axes", label: "Axes" }),
  map: Object.freeze({ id: "map", label: "Map" }),
  timeline: Object.freeze({ id: "timeline", label: "Timeline" }),
  collection: Object.freeze({ id: "collection", label: "Collection" }),
  interactions: Object.freeze({ id: "interactions", label: "Interactions" }),
  advanced: Object.freeze({ id: "advanced", label: "Advanced" }),
});

export function buildContextualTabs(sections = []) {
  if (!Array.isArray(sections)) return [];
  const tabs = [];
  const byId = new Map();
  for (const section of sections) {
    if (
      !section
      || typeof section !== "object"
      || typeof section.id !== "string"
      || !Array.isArray(section.fields)
      || section.fields.length === 0
    ) {
      continue;
    }
    const descriptor = SECTION_TABS[section.id] ?? {
      id: section.id,
      label: typeof section.label === "string" && section.label.trim()
        ? section.label
        : "Advanced",
    };
    let tab = byId.get(descriptor.id);
    if (!tab) {
      tab = {
        id: descriptor.id,
        label: descriptor.label,
        sections: [],
      };
      byId.set(tab.id, tab);
      tabs.push(tab);
    }
    tab.sections.push(section);
  }
  return tabs;
}

export default function ContextualTabs({
  sections = [],
  activeTabId,
  onSelect = noop,
  onChange = noop,
  shellLayout = false,
  shellLead = null,
  shellTail = null,
  ...context
} = {}) {
  const tabs = buildContextualTabs(sections);
  if (tabs.length === 0 && !shellLayout) return null;
  const active = tabs.find(({ id }) => id === activeTabId) ?? tabs[0];
  const tabList = React.createElement(
    "nav",
    {
      className: `chart-editor-tab-list${shellLayout ? " dashboard-dialog__progress" : ""}`,
      "data-authoring-track": shellLayout ? "tabs" : undefined,
      "aria-label": "Chart settings",
    },
    tabs.map((tab) => React.createElement(IconControl, {
      key: tab.id,
      interactionId: `editor.tab.${tab.id}`,
      className: "chart-editor-tab",
      ariaLabel: tab.label,
      tooltip: tab.label,
      "aria-current": active?.id === tab.id ? "page" : undefined,
      pressed: active?.id === tab.id,
      onClick: () => onSelect(tab.id),
    })),
  );
  const tabPanel = active
    ? React.createElement(
        "div",
        {
          className: "chart-editor-tab-panel",
          "data-tab-id": active.id,
        },
        active.sections.map((section) => React.createElement(
          GeneratedFormSection,
          {
            key: section.id,
            section,
            onChange,
            ...context,
          },
        )),
      )
    : null;
  if (shellLayout) {
    return React.createElement(
      React.Fragment,
      null,
      tabList,
      React.createElement(
        "div",
        {
          className: "chart-editor-layout dashboard-authoring-body",
          "data-authoring-track": "body",
        },
        shellLead,
        tabPanel,
        shellTail,
      ),
    );
  }
  return React.createElement(
    "div",
    { className: "chart-editor-contextual-tabs" },
    tabList,
    tabPanel,
  );
}

function noop() {}
