import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const audienceModule = await vite
  .ssrLoadModule("/src/components/presentation/AudienceDisplay.jsx")
  .catch(() => null);
const gridModule = await vite
  .ssrLoadModule("/src/components/display/DisplayedChartGrid.jsx")
  .catch(() => null);
await vite.close();

const dashboard = {
  title: "Response overview",
  scenarioLabel: "Scenario identity must not be Audience scene identity",
  dataSources: {
    status: { kind: "inline", rows: [{ entity: "A", value: 1 }] },
    "image-source": {
      kind: "staticImage",
      sourceVersion: 1,
      revision: 3,
      origin: { kind: "url", url: "https://example.test/response-map.png" },
      alt: "Response map",
      decorative: false,
      fit: "contain",
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      rotation: 0,
    },
    "text-source": {
      kind: "staticText",
      sourceVersion: 1,
      revision: 1,
      renderingPolicy: "portable-qmd-v1",
      qmd: "## Moderator only",
    },
  },
  datasetProfiles: {
    status: {
      columns: [
        { name: "entity", type: "category" },
        { name: "value", type: "numeric" },
      ],
    },
  },
  loadedData: { status: [{ entity: "A", value: 1 }] },
  pages: [{
    id: "biomedical",
    title: "Biomedical response",
    sections: [{
      id: "overview",
      panels: [
        ...["chart-a", "chart-b", "chart-c", "chart-d"].map((id) => ({
        configVersion: 3,
        id,
        typeId: "kpi",
        title: `Chart ${id.slice(-1).toUpperCase()}`,
        description: "Current status.",
        sourceId: "status",
        roles: { value: { field: "value" }, entity: { field: "entity" } },
        transformations: {
          filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap",
        },
        presentation: { title: { align: "left" }, collection: null },
        interaction: { zoom: { enabled: true }, timeSync: null },
        layout: { size: "standard" },
        })),
        {
          id: "image-a",
          typeId: "image",
          title: "Response map",
          sourceId: "image-source",
        },
        {
          id: "free-text-a",
          typeId: "freeText",
          title: "Moderator only",
          sourceId: "text-source",
        },
      ],
    }],
  }],
  chronoGroups: [{
    id: "epidemic-time",
    name: "Winter response 2027",
    matching: { policy: "exact" },
    members: [{ chartId: "chart-a", timeRole: "observation" }],
  }],
};

const twoChartScene = {
  active_page_id: "biomedical",
  items: [
    { kind: "chart", chart_id: "chart-b" },
    { kind: "chart", chart_id: "chart-a" },
  ],
  layout: "sideBySide",
  time: null,
  audience_facts: {
    dashboard_name: true,
    page: true,
    parent_chrono_group: true,
    scene_name: true,
    scene_date: true,
  },
  blackout: false,
};

test("audience display shows the neutral waiting state before a scene arrives", () => {
  assert.equal(typeof audienceModule?.default, "function", "AudienceDisplay must be implemented");
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "waiting",
    presentationState: null,
  }));

  assert.match(html, /Audience display ready/);
  assert.match(html, /Waiting for the moderator\./);
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /<nav/);
});

test("displayed chart grid preserves one-to-four chart order and selected layout", () => {
  assert.equal(typeof gridModule?.default, "function", "DisplayedChartGrid must be implemented");
  const html = renderToStaticMarkup(React.createElement(gridModule.default, {
    dashboard,
    chartIds: ["chart-d", "chart-b", "chart-a", "chart-c"],
    layout: "grid2x2",
    surface: "audience",
    timeContextForChart: () => null,
  }));

  assert.match(html, /displayed-chart-grid/);
  assert.match(html, /displayed-count-4/);
  assert.match(html, /layout-grid2x2/);
  assert.ok(html.indexOf('data-displayed-chart-id="chart-d"') < html.indexOf('data-displayed-chart-id="chart-b"'));
  assert.ok(html.indexOf('data-displayed-chart-id="chart-b"') < html.indexOf('data-displayed-chart-id="chart-a"'));
  assert.ok(html.indexOf('data-displayed-chart-id="chart-a"') < html.indexOf('data-displayed-chart-id="chart-c"'));
  assert.doesNotMatch(html, /chart-zoom-guard/);
});

test("Audience facts hide independently, collapse the shared header, and never relabel Scenario as Scene", () => {
  const dateEpoch = Date.UTC(2027, 2, 15);
  const selective = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: {
      ...twoChartScene,
      time: { group_id: "epidemic-time", active_epoch_ms: dateEpoch },
      audience_facts: {
        dashboard_name: true,
        page: false,
        parent_chrono_group: true,
        scene_name: true,
        scene_date: true,
      },
    },
  }));
  const dateOnly = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: {
      ...twoChartScene,
      time: { group_id: "epidemic-time", active_epoch_ms: dateEpoch },
      audience_facts: {
        dashboard_name: false,
        page: false,
        parent_chrono_group: false,
        scene_name: false,
        scene_date: true,
      },
    },
  }));

  assert.match(selective, /Response overview/);
  assert.match(selective, /Winter response 2027/);
  assert.match(selective, /2027-03-15/);
  assert.doesNotMatch(selective, />Biomedical response</);
  assert.doesNotMatch(selective, /Scenario identity must not be Audience scene identity/);
  assert.match(dateOnly, /data-shared-header-visible="false"/);
  assert.doesNotMatch(dateOnly, /audience-shared-header/);
  assert.match(dateOnly, /2027-03-15/);
  assert.match(dateOnly, /data-displayed-chart-id="chart-a"/);
});

test("audience display never renders the page name from legacy audience facts", () => {
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: {
      ...twoChartScene,
      audience_facts: {
        dashboard_name: false,
        page: true,
        parent_chrono_group: false,
        scene_name: false,
        scene_date: false,
      },
    },
  }));

  assert.doesNotMatch(html, />Biomedical response</);
  assert.match(html, /data-displayed-chart-id="chart-a"/);
});

test("audience retains a disconnected scene and blackouts it without unmounting charts or exposing chrome", () => {
  assert.equal(typeof audienceModule?.default, "function", "AudienceDisplay must be implemented");
  const disconnected = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "disconnected",
    presentationState: twoChartScene,
  }));
  const blackedOut = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: { ...twoChartScene, blackout: true },
  }));

  assert.match(disconnected, /data-displayed-chart-id="chart-b"/);
  assert.match(disconnected, /data-displayed-chart-id="chart-a"/);
  assert.match(blackedOut, /audience-blackout/);
  assert.match(blackedOut, /data-displayed-chart-id="chart-b"/);
  assert.match(blackedOut, /data-displayed-chart-id="chart-a"/);
  for (const html of [disconnected, blackedOut]) {
    assert.doesNotMatch(html, /<button/);
    assert.doesNotMatch(html, /<nav/);
    assert.doesNotMatch(html, /Source information/);
    assert.doesNotMatch(html, /chart-panel-action-rail/);
    assert.doesNotMatch(html, /chart-zoom-guard/);
  }
});

test("Audience accepts a trusted Image descriptor passively and rejects Free text or stale Image injection", () => {
  const imageScene = {
    ...twoChartScene,
    items: [
      { kind: "chart", chart_id: "chart-a" },
      { kind: "image", panel_id: "image-a", source_id: "image-source", revision: 3 },
    ],
  };
  const imageHtml = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: imageScene,
  }));
  const staleHtml = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: {
      ...imageScene,
      items: [{ kind: "image", panel_id: "image-a", source_id: "image-source", revision: 2 }],
      layout: "solo",
    },
  }));
  const freeTextHtml = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: {
      ...imageScene,
      items: [{ kind: "freeText", panel_id: "free-text-a" }],
      layout: "solo",
    },
  }));

  assert.match(imageHtml, /data-presentation-item-kind="image"/);
  assert.match(imageHtml, /data-image-revision="3"/);
  assert.match(imageHtml, /Loading saved image/);
  assert.doesNotMatch(imageHtml, /<button|Image viewer actions|Moderator only/);
  assert.match(staleHtml, /Audience display ready/);
  assert.match(freeTextHtml, /Audience display ready/);
  assert.doesNotMatch(freeTextHtml, /Moderator only/);
});

test("Audience rejects an injected recovery-only Image descriptor", () => {
  const recoveryDashboard = {
    ...dashboard,
    dataSources: {
      ...dashboard.dataSources,
      "recovery-source": {
        ...dashboard.dataSources["image-source"],
        origin: { kind: "replacementRequired", reason: "Legacy blob source" },
        migrationWarnings: ["replacement-required"],
      },
    },
    pages: [{
      ...dashboard.pages[0],
      sections: [{
        ...dashboard.pages[0].sections[0],
        panels: [
          ...dashboard.pages[0].sections[0].panels,
          {
            id: "recovery-image",
            typeId: "image",
            title: "Recovery image",
            sourceId: "recovery-source",
          },
        ],
      }],
    }],
  };
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard: recoveryDashboard,
    connectionStatus: "connected",
    presentationState: {
      ...twoChartScene,
      items: [{
        kind: "image",
        panel_id: "recovery-image",
        source_id: "recovery-source",
        revision: 3,
      }],
      layout: "solo",
    },
  }));

  assert.match(html, /Audience display ready/);
  assert.doesNotMatch(html, /Recovery image|data-presentation-item-kind="image"/);
});

test("Audience Image fit/transform is passive and one failed cell leaves chart siblings rendered", () => {
  const imageItem = { kind: "image", panel_id: "image-a", source_id: "image-source", revision: 3 };
  const ready = renderToStaticMarkup(React.createElement(gridModule.default, {
    dashboard,
    items: [imageItem],
    layout: "solo",
    surface: "audience",
    staticAssetReadiness: new Map([["image-a", {
      status: "ready",
      kind: "staticImage",
      sourceId: "image-source",
      revision: 3,
      src: "https://example.test/response-map.png",
      url: "https://example.test/response-map.png",
      alt: "Response map",
      decorative: false,
      fit: "cover",
      crop: { x: 100, y: 50, width: 800, height: 900 },
      rotation: 90,
      width: 1600,
      height: 900,
    }]]),
  }));
  const failed = renderToStaticMarkup(React.createElement(gridModule.default, {
    dashboard,
    items: [
      { kind: "chart", chart_id: "chart-a" },
      imageItem,
      { kind: "chart", chart_id: "chart-b" },
      { kind: "chart", chart_id: "chart-c" },
    ],
    layout: "grid2x2",
    surface: "audience",
    staticAssetReadiness: new Map([["image-a", {
      status: "error",
      kind: "staticImage",
      sourceId: "image-source",
      revision: 3,
      failure: { code: "asset-read-failed", message: "Forced failure", retryable: true },
    }]]),
  }));

  assert.match(ready, /displayed-count-1/);
  assert.match(ready, /data-image-transform-order="rotation-crop-fit"/);
  assert.match(ready, /preserveAspectRatio="xMidYMid slice"/);
  assert.doesNotMatch(ready, /<button|Image viewer actions|tabindex/);
  assert.match(failed, /displayed-count-4/);
  assert.match(failed, /Image unavailable/);
  assert.match(failed, /Forced failure/);
  assert.match(failed, /data-displayed-chart-id="chart-a"/);
  assert.match(failed, /data-displayed-chart-id="chart-b"/);
  assert.match(failed, /data-displayed-chart-id="chart-c"/);
  assert.doesNotMatch(failed, /<button|Retry|Replace|Edit/);
});

test("presentation CSS reserves passive Image loading/error geometry in 1/2/4-cell layouts", async () => {
  const css = await readFile(new URL("../src/styles/presentation.css", import.meta.url), "utf8");
  assert.match(css, /\.displayed-count-1,[\s\S]*\.displayed-count-2,[\s\S]*\.displayed-count-4/);
  assert.match(css, /\.audience-static-image-cell :is\([\s\S]*\.chart-image-pending,[\s\S]*\.static-content-state/);
  assert.match(css, /\.chart-image-actions,[\s\S]*\.static-content-state__actions[\s\S]*display: none/);
});
