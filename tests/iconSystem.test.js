import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { listChartSchemas } from "../src/charting/schemas/chartSchemaRegistry.js";
import { validateDashboardStructure } from "../src/charting/config/dashboardConfigStructure.js";
import {
  IconControl,
  SimExIcon,
} from "../src/components/common/SimExIcon.js";
import {
  ICON_GLYPHS,
  getIconGlyph,
} from "../src/iconography/iconGlyphs.js";
import {
  ATLAS_SURFACES,
  CHART_TYPE_GLYPHS,
  INTERACTION_ALIASES,
  INTERACTIONS,
  deriveIconAccentVariants,
  getInteraction,
  validateIconCatalog,
} from "../src/iconography/iconCatalog.js";

test("the icon catalogue resolves every approved interaction and surface reference", () => {
  assert.deepEqual(validateIconCatalog(), []);
  assert.ok(Object.keys(ICON_GLYPHS).length > 100);
  assert.equal(
    Object.keys(INTERACTIONS).some((id) => id.startsWith("atlas.")),
    false,
    "Atlas entries must describe approved interactions, not generated glyph filler",
  );
  assert.equal(ATLAS_SURFACES.length, 13);
  assert.deepEqual(
    ATLAS_SURFACES.map(({ id }) => id),
    [
      "refinements",
      "shell",
      "playback",
      "transport",
      "fullscreen",
      "layouts",
      "panels",
      "wizard",
      "editor-tabs",
      "editor-actions",
      "collection-modes",
      "collection-controls",
      "chart-types",
    ],
  );
  assert.equal(
    ATLAS_SURFACES.reduce(
      (count, surface) => count
        + (surface.interactionIds?.length ?? 0)
        + (surface.chartTypeIds?.length ?? 0),
      0,
    ),
    163,
  );
  for (const duplicateId of [
    "shell.open-editable-tab.1",
    "transport.fast-forward.2",
    "collection.loop.5",
  ]) {
    assert.equal(
      Object.hasOwn(INTERACTIONS, duplicateId),
      false,
      `Duplicate atlas reference ${duplicateId} must reuse its stable interaction ID`,
    );
  }
  assert.equal(INTERACTION_ALIASES["panel.fullscreen"], "fullscreen.open");
  assert.equal(
    getInteraction("panel.fullscreen"),
    getInteraction("fullscreen.open"),
  );
  assert.doesNotMatch(JSON.stringify(INTERACTIONS), /[ÂÃ]/);
  assert.equal(getIconGlyph("missing-dynamic-icon"), ICON_GLYPHS.unknown);
});

test("the refinement surface preserves the twelve visually approved decisions", () => {
  const refinements = ATLAS_SURFACES.find(({ id }) => id === "refinements");
  assert.deepEqual(refinements.interactionIds, [
    "shell.open-editable-tab",
    "image.zoom-reset",
    "transport.fast-forward",
    "fullscreen.select.1",
    "fullscreen.open",
    "panel.description",
    "collection.loop",
    "collection.periodic",
    "chart.mixed-axis",
    "chart.pie",
    "chart.chronological-choropleth",
    "chart.table",
  ]);
});

test("interaction metadata preserves the approved accessibility and state semantics", () => {
  assert.deepEqual(
    pick(getInteraction("fullscreen.open"), [
      "glyphId",
      "label",
      "tooltip",
      "renderMode",
      "tone",
      "status",
    ]),
    {
      glyphId: "fullscreen",
      label: "Open chart fullscreen",
      tooltip: "Fullscreen",
      renderMode: "icon",
      tone: "standard",
      status: "live",
    },
  );
  assert.equal(getInteraction("chart.remove").tone, "danger");
  assert.equal(getInteraction("transport.fast-forward").status, "planned");
  assert.equal(getInteraction("playback.current-time").renderMode, "text");
});

test("chart pictograms cover the chart schema authority exactly", () => {
  assert.deepEqual(
    Object.keys(CHART_TYPE_GLYPHS).sort(),
    listChartSchemas().map(({ typeId }) => typeId).sort(),
  );
  for (const glyphId of Object.values(CHART_TYPE_GLYPHS)) {
    assert.ok(ICON_GLYPHS[glyphId], `Missing chart glyph ${glyphId}`);
  }
});

test("accent variants preserve the approved default contrast treatment", () => {
  assert.deepEqual(deriveIconAccentVariants("#19D3C5"), {
    base: "#19D3C5",
    onLight: "#0D746D",
    onDark: "#32DED1",
  });
  assert.deepEqual(deriveIconAccentVariants("not-a-color"), {
    base: "#19D3C5",
    onLight: "#0D746D",
    onDark: "#32DED1",
  });
});

test("IconControl derives its visual and accessibility contract from metadata", () => {
  const fullscreen = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "fullscreen.open",
    disabled: false,
  }));
  const danger = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "chart.remove",
  }));

  assert.match(fullscreen, /aria-label="Open chart fullscreen"/);
  assert.match(fullscreen, /data-icon-tooltip="Fullscreen"/);
  assert.match(fullscreen, /data-icon-id="fullscreen"/);
  assert.match(danger, /data-icon-tone="danger"/);
  assert.match(danger, /data-icon-id="trash"/);
});

test("SimExIcon uses the deterministic unknown glyph for dynamic misses", () => {
  const html = renderToStaticMarkup(React.createElement(SimExIcon, {
    iconId: "not-registered",
    decorative: true,
  }));
  assert.match(html, /data-icon-id="unknown"/);
  assert.match(html, /aria-hidden="true"/);
});

test("version 3 global styles accept one icon accent and reject malformed values", async () => {
  const dashboard = JSON.parse(await readFile(
    new URL("../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  dashboard.globalStyles.iconAccent = "#19D3C5";
  assert.doesNotThrow(() => validateDashboardStructure(dashboard));

  dashboard.globalStyles.iconAccent = "teal";
  assert.throws(
    () => validateDashboardStructure(dashboard),
    /icon accent/i,
  );
});

test("selected application icon surfaces contain no private SVG implementations", async () => {
  for (const relativePath of [
    "src/components/charts/ChartPanelActions.jsx",
    "src/components/FullscreenDisplay.jsx",
    "src/components/ColorField.jsx",
  ]) {
    const file = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    assert.doesNotMatch(file, /<svg|createElement\(\s*["']svg["']/);
    assert.match(file, /SimExIcon|IconControl/);
  }
  const dashboardRenderer = await readFile(
    new URL("../src/components/DashboardRenderer.jsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(dashboardRenderer, /edit-sliders-icon/);
});

test("canonical icon references match deterministic generation", async () => {
  const {
    renderIconAtlas,
    renderIconSpecification,
  } = await import("../scripts/build-icon-reference.mjs");
  assert.equal(
    await readFile(
      new URL("../docs/icon-language-atlas.html", import.meta.url),
      "utf8",
    ),
    renderIconAtlas(),
  );
  assert.equal(
    await readFile(
      new URL("../docs/icon-and-interaction-specification.md", import.meta.url),
      "utf8",
    ),
    renderIconSpecification(),
  );
});

function pick(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}
