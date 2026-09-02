import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = {
  sourceViewer: readFileSync(new URL("../src/source-viewer/sourceViewer.css", import.meta.url), "utf8"),
  core: readFileSync(new URL("../src/styles.css", import.meta.url), "utf8"),
  dialogs: readFileSync(new URL("../src/styles/dashboard-dialogs.css", import.meta.url), "utf8"),
  immersive: readFileSync(new URL("../src/styles/immersive-display.css", import.meta.url), "utf8"),
  modes: readFileSync(new URL("../src/styles/modes.css", import.meta.url), "utf8"),
  staticContent: readFileSync(new URL("../src/styles/static-content.css", import.meta.url), "utf8"),
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function propertyValues(source, selector, property) {
  const values = [];
  const uncommentedSource = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of uncommentedSource.matchAll(rulePattern)) {
    const selectors = match[1].split(",").map((candidate) => candidate.trim());
    if (!selectors.includes(selector)) continue;

    const propertyPattern = new RegExp(`(?:^|;)\\s*${escapeRegExp(property)}\\s*:\\s*([^;]+)`, "g");
    for (const propertyMatch of match[2].matchAll(propertyPattern)) {
      values.push(propertyMatch[1].trim());
    }
  }
  return values;
}

function expectProperty(file, selector, property, expected) {
  const values = propertyValues(styles[file], selector, property);
  assert.ok(
    values.includes(expected),
    `${file} ${selector} should set ${property}: ${expected}; found ${values.join(", ") || "no declaration"}`,
  );
}

test("active desktop gaps use the dense semantic spacing scale", () => {
  const expectations = [
    ["sourceViewer", ".source-viewer-provenance", "row-gap", "var(--simex-space-3)"],
    ["core", ".device-layout-control > div", "gap", "var(--simex-gap-control-group)"],
    ["core", ".dashboard-footer", "gap", "var(--simex-gap-section)"],
    ["core", ".dashboard-footer div", "gap", "var(--simex-gap-control-group)"],
    ["core", ".dashboard-footer nav", "gap", "var(--simex-gap-control-group)"],
    ["core", ".page-tab-edit", "gap", "var(--simex-gap-control-group)"],
    ["core", ".settings-gradient-grid", "gap", "var(--simex-gap-control-group)"],
    ["core", ".chrono-availability ul", "gap", "var(--simex-space-3)"],
    ["core", ".multi-cell-controls", "gap", "var(--simex-gap-control-group)"],
    ["core", ".wizard-choice-card > label", "gap", "var(--simex-gap-label-control)"],
    ["core", ".accessible-listbox-select", "gap", "var(--simex-gap-label-control)"],
    ["core", ".delete-dashboard-content-summary", "gap", "var(--simex-space-3)"],
    ["core", ".chart-panel-action-rail", "gap", "var(--simex-gap-control-group)"],
    ["core", ".source-csv-viewer-action", "gap", "var(--simex-gap-label-control)"],
    ["immersive", ".fullscreen-backdrop--immersive .multi-fullscreen-grid", "gap", "var(--simex-space-3)"],
    ["modes", ".build-page-tab-scroller", "gap", "var(--simex-gap-control-group)"],
    ["modes", ".build-page-tab-item", "gap", "var(--simex-space-2)"],
    ["modes", ".build-structure-list", "gap", "var(--simex-space-3)"],
    ["modes", ".build-structure-list ul", "gap", "var(--simex-space-3)"],
    ["modes", ".build-chrono-group-summary ul", "gap", "var(--simex-space-3)"],
    ["modes", ".build-structure-list > li", "gap", "var(--simex-space-3)"],
    ["modes", ".scene-details-stage fieldset", "gap", "var(--simex-gap-control-group)"],
    ["modes", ".scene-frame-selection", "gap", "var(--simex-gap-control-group)"],
    ["modes", ".chrono-group-studio label", "gap", "var(--simex-gap-label-control)"],
    ["modes", ".scene-studio label", "gap", "var(--simex-gap-label-control)"],
    ["modes", ".scene-chart-authoring-overlay", "gap", "var(--simex-space-3)"],
    ["modes", ".scene-chart-authoring-overlay__boundaries", "gap", "var(--simex-gap-control-group)"],
    ["modes", ".scene-chart-authoring-overlay__title-row", "gap", "var(--simex-gap-control-group)"],
    ["modes", ".scene-unit-orbit fieldset", "gap", "var(--simex-gap-control-group)"],
    ["modes", ".scene-unit-orbit__moves", "gap", "var(--simex-gap-control-group)"],
    ["staticContent", ".chart-image-view", "gap", "var(--simex-space-3)"],
    ["staticContent", ".chart-image-actions", "gap", "var(--simex-gap-control-group)"],
    ["dialogs", ".dashboard-dialog__footer", "gap", "var(--simex-gap-control-group)"],
    ["dialogs", ".dashboard-dialog__actions", "gap", "var(--simex-gap-control-group)"],
  ];

  for (const expectation of expectations) expectProperty(...expectation);
});

test("intentional six-pixel micro-spacing exceptions remain explicit", () => {
  expectProperty("modes", ".build-add-section-row button", "gap", "6px");
  expectProperty("modes", ".temporal-content-card", "gap", "6px");
  expectProperty("modes", ".dashboard-package-manifest ul", "gap", "6px");
});
