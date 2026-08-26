import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: DashboardModeWorkspace },
  { default: FullscreenDisplay },
  { PlaybackProvider },
  { ImageSourceEditor },
  { createStaticContentDraft, reduceStaticContentDraft },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/dashboard/DashboardModeWorkspace.jsx"),
  vite.ssrLoadModule("/src/components/FullscreenDisplay.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
  vite.ssrLoadModule("/src/components/static-content/ImageSourceEditor.jsx"),
  vite.ssrLoadModule("/src/static-content/forms/staticContentDraft.js"),
]);
await vite.close();

const dashboard = staticDashboard();

test("active Image replacement exposes Restore previous image and no global undo label", () => {
  const draft = createStaticContentDraft({
    mode: "edit", destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels.find(({ chart }) => chart.typeId === "image").chart,
    placement: dashboard.dataSources["image-source"],
    mediaItem: dashboard.contentLibrary.mediaItems["media-image-source"],
    assets: dashboard.assets,
  });
  const replaced = reduceStaticContentDraft(draft, {
    type: "selectMediaItem",
    mediaItem: { ...dashboard.contentLibrary.mediaItems["media-image-source"], mediaId: "media-other" },
  });
  const html = renderToStaticMarkup(React.createElement(ImageSourceEditor, {
    source: { ...replaced.source, origin: replaced.mediaItem.current }, imageEditing: replaced.imageEditing,
  }));
  assert.match(html, /Restore previous image/);
  assert.doesNotMatch(html, />Undo replacement</);
});

test("Build and View route one saved Image model through equal content and footprint owners", () => {
  const build = renderWorkspace("build", { buildStaticAuthoringOpen: true });
  const view = renderWorkspace("view");
  const buildImage = panelMarkup(build, "image-panel");
  const viewImage = panelMarkup(view, "image-panel");

  assert.match(build, /data-build-static-authoring-open="true"/);
  assert.equal(attribute(buildImage, "data-footprint"), attribute(viewImage, "data-footprint"));
  assert.equal(styleProperty(buildImage, "--chart-footprint-columns"), styleProperty(viewImage, "--chart-footprint-columns"));
  assert.equal(styleProperty(buildImage, "--chart-footprint-rows"), styleProperty(viewImage, "--chart-footprint-rows"));
  assert.equal(attribute(buildImage, "data-static-source-id"), "image-source");
  assert.equal(attribute(buildImage, "data-static-source-id"), attribute(viewImage, "data-static-source-id"));
  assert.equal(attribute(buildImage, "data-static-source-revision"), attribute(viewImage, "data-static-source-revision"));
  assert.equal(attribute(buildImage, "data-image-media-id"), "media-image-source");
  assert.equal(attribute(buildImage, "data-image-media-revision"), "7");
  assert.equal(attribute(buildImage, "data-content-media-count"), "1");
  assert.equal(attribute(buildImage, "data-image-media-id"), attribute(viewImage, "data-image-media-id"));
  assert.equal(attribute(buildImage, "src"), attribute(viewImage, "src"));
  assert.equal(attribute(buildImage, "alt"), attribute(viewImage, "alt"));

  assert.match(buildImage, /class="panel-actions"/);
  assert.doesNotMatch(viewImage, /class="panel-actions"|Edit chart|Start section here|Remove chart/);
  assert.doesNotMatch(buildImage + viewImage, /View source CSV/);
});

test("fullscreen reuses DisplayedChartGrid and the saved Image model with an active viewer", () => {
  const html = renderWithPlayback(React.createElement(FullscreenDisplay, {
    dashboard: ssrDashboard(),
    contentRenderContext: contentContext(ssrDashboard()),
    displayState: {
      display_revision: 1,
      displayed_chart_ids: ["image-panel"],
      layout: "solo",
    },
    onDisplayAction: () => {},
  }));

  assert.match(html, /data-display-surface="fullscreen"/);
  assert.equal((html.match(/data-displayed-chart-id=/g) ?? []).length, 1);
  assert.match(html, /data-static-source-revision="7"/);
  assert.match(html, /data-image-media-id="media-image-source"/);
  assert.match(html, /data-image-media-revision="7"/);
  assert.match(html, /src="https:\/\/example\.test\/saved-map\.png"/);
  assert.match(html, /alt="Saved response map"/);
  assert.match(html, /aria-label="Image viewer actions"/);
  assert.doesNotMatch(html, /class="panel-actions"|Edit chart|Start section here|Remove chart/);
});

test("a fullscreen static failure stays in its cell while a saved sibling still renders", () => {
  const failedDashboard = ssrDashboard();
  failedDashboard.contentLibrary.mediaItems["media-image-source"].current = {
    kind: "asset",
    assetId: "asset-missing",
  };
  failedDashboard.contentLibrary.mediaItems["media-image-source"].health = "missing";
  failedDashboard.assets = {};
  const html = renderWithPlayback(React.createElement(FullscreenDisplay, {
    dashboard: failedDashboard,
    contentRenderContext: contentContext(failedDashboard),
    displayState: {
      display_revision: 1,
      displayed_chart_ids: ["image-panel", "status-panel"],
      layout: "sideBySide",
    },
    onDisplayAction: () => {},
  }));

  assert.equal((html.match(/data-static-failure=/g) ?? []).length, 1);
  assert.match(html, /data-displayed-chart-id="image-panel"/);
  assert.match(html, /data-displayed-chart-id="status-panel"/);
  assert.match(html, /class="chart-card-view"/);
  assert.match(html, />Retry<\/button>/);
  assert.doesNotMatch(html, />Replace<\/button>|>Edit<\/button>/);
});

function renderWorkspace(mode, { buildStaticAuthoringOpen = false } = {}) {
  const renderedDashboard = ssrDashboard();
  return renderWithPlayback(React.createElement(DashboardModeWorkspace, {
    mode,
    activePage: renderedDashboard.pages[0],
    pageType: "analytical",
    dashboard: renderedDashboard,
    contentRenderContext: contentContext(renderedDashboard),
    buildStaticAuthoringOpen,
    buildState: mode === "build" ? {
      selection: { kind: "chart", placementId: "image-placement" },
      disabled: false,
      sectionDrafts: {},
      onSelect: () => {},
    } : null,
    buildWorkspace: mode === "build" ? React.createElement("div", null, "Build controls") : null,
    displayState: { displayed_chart_ids: [], layout: "solo" },
    geoDataSources: {},
    onDisplayAction: () => {},
  }));
}

function renderWithPlayback(child) {
  const charts = dashboard.pages.flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .map((placement) => placement.chart ?? placement);
  return renderToStaticMarkup(React.createElement(
    PlaybackProvider,
    { groups: [], scenes: [], charts, loadedData: {}, profiles: {} },
    child,
  ));
}

function ssrDashboard() {
  const value = structuredClone(dashboard);
  value.pages[0].sections[0].panels = value.pages[0].sections[0].panels
    .filter(({ chart }) => chart.typeId !== "freeText");
  return value;
}

function panelMarkup(html, panelId) {
  const escaped = panelId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<article[^>]*data-panel-id="${escaped}"[\\s\\S]*?<\\/article>`));
  assert.ok(match, `missing canonical panel ${panelId}`);
  return match[0];
}

function attribute(html, name) {
  return html.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
}

function styleProperty(html, name) {
  return html.match(new RegExp(`${name}:([^;\"]+)`))?.[1] ?? null;
}

function staticDashboard() {
  const baseChart = {
    configVersion: 3,
    roles: {},
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
    presentation: { background: { color: "#FFFFFF", transparent: false }, title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
  };
  return {
    id: "static-composition",
    title: "Static composition",
    scenario: "Task 5",
    lastUpdated: "2026-08-25",
    dataSources: {
      status: {
        kind: "inline",
        rows: [{ entity: "North", value: 12 }],
      },
      "image-source": {
        kind: "staticImage",
        sourceVersion: 2,
        mediaId: "media-image-source",
        alt: "Saved response map",
        decorative: false,
        fit: "cover",
        crop: { x: 100, y: 200, width: 600, height: 700 },
        rotation: 270,
      },
      "text-source": {
        kind: "staticText",
        sourceVersion: 1,
        revision: 4,
        renderingPolicy: "portable-qmd-v1",
        qmd: "# Situation\n\nSaved operational note.",
      },
    },
    contentLibrary: {
      mediaItems: {
        "media-image-source": {
          mediaId: "media-image-source",
          revision: 7,
          current: { kind: "url", url: "https://example.test/saved-map.png" },
          displayName: "Saved response map",
          defaultDescription: "Saved response map",
          origin: "external",
          health: "external",
        },
      },
      sourceEntries: {},
    },
    assets: {},
    loadedData: { status: [{ entity: "North", value: 12 }] },
    datasetProfiles: {
      status: { columns: [{ name: "entity", type: "category" }, { name: "value", type: "numeric" }] },
    },
    pages: [{
      id: "page-a",
      title: "Overview",
      sections: [{
        id: "section-a",
        title: "Static panels",
        panels: [
          {
            id: "image-placement",
            chart: {
              ...baseChart,
              id: "image-panel",
              typeId: "image",
              title: "Response map",
              sourceId: "image-source",
              layout: { size: "wide", width: 4, height: 1 },
            },
          },
          {
            id: "text-placement",
            chart: {
              ...baseChart,
              id: "text-panel",
              typeId: "freeText",
              title: "Situation note",
              sourceId: "text-source",
              layout: { size: "standard", width: 2, height: 2 },
            },
          },
          {
            id: "status-placement",
            chart: {
              ...baseChart,
              id: "status-panel",
              typeId: "kpi",
              title: "Status",
              sourceId: "status",
              roles: { value: { field: "value" }, entity: { field: "entity" } },
              layout: { size: "standard", width: 2, height: 1 },
            },
          },
        ],
      }],
    }],
    globalStyles: { accessibility: { enabled: false } },
    chronoGroups: [],
    scenes: [],
  };
}

function contentContext(value) {
  return {
    mediaItems: value.contentLibrary.mediaItems,
    assets: value.assets,
  };
}
