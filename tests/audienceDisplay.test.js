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
      sourceVersion: 2,
      mediaId: "media-image-source",
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
  contentLibrary: {
    mediaItems: {
      "media-image-source": {
        mediaId: "media-image-source",
        revision: 3,
        current: { kind: "url", url: "https://example.test/response-map.png" },
        displayName: "Response map",
        defaultDescription: "Response map",
        origin: "external",
        health: "external",
      },
    },
    sourceEntries: {},
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

const defaultItems = [
    { kind: "chart", chart_id: "chart-b" },
    { kind: "chart", chart_id: "chart-a" },
];
const defaultFacts = {
    dashboard_name: true,
    page: true,
    parent_chrono_group: true,
    scene_name: true,
    scene_date: true,
};
const twoChartScene = audienceProjection();

test("audience display shows the neutral waiting state before a scene arrives", () => {
  assert.equal(typeof audienceModule?.default, "function", "AudienceDisplay must be implemented");
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "waiting",
    projection: null,
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
    projection: audienceProjection({
      epoch: dateEpoch,
      facts: {
        dashboard_name: true,
        page: false,
        parent_chrono_group: true,
        scene_name: true,
        scene_date: true,
      },
    }),
  }));
  const dateOnly = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    projection: audienceProjection({
      epoch: dateEpoch,
      facts: {
        dashboard_name: false,
        page: false,
        parent_chrono_group: false,
        scene_name: false,
        scene_date: true,
      },
    }),
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
    projection: audienceProjection({
      facts: {
        dashboard_name: false,
        page: true,
        parent_chrono_group: false,
        scene_name: false,
        scene_date: false,
      },
    }),
  }));

  assert.doesNotMatch(html, />Biomedical response</);
  assert.match(html, /data-displayed-chart-id="chart-a"/);
});

test("audience retains a disconnected scene and blackouts it without unmounting charts or exposing chrome", () => {
  assert.equal(typeof audienceModule?.default, "function", "AudienceDisplay must be implemented");
  const disconnected = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "disconnected",
    projection: twoChartScene,
  }));
  const blackedOut = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    projection: audienceProjection({ blackout: true }),
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
  const imageItems = [
      { kind: "chart", chart_id: "chart-a" },
      { kind: "image", panel_id: "image-a", media_id: "media-image-source", revision: 3 },
  ];
  const imageScene = audienceProjection({ items: imageItems });
  const imageHtml = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    projection: imageScene,
  }));
  assert.match(imageHtml, /data-presentation-item-kind="image"/);
  assert.match(imageHtml, /data-image-media-id="media-image-source"/);
  assert.match(imageHtml, /data-image-revision="3"/);
  assert.match(imageHtml, /alt="Response map"/);
  assert.doesNotMatch(imageHtml, /<button|Image viewer actions|Moderator only/);
});

test("Audience overlays approved passive connection glyphs without visible status copy or dimming", () => {
  for (const [connectionStatus, accessibleName] of [
    ["disconnected", "Audience display disconnected"],
    ["reconnecting", "Audience display reconnecting"],
  ]) {
    const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
      dashboard,
      connectionStatus,
      projection: audienceProjection({ blackout: connectionStatus === "reconnecting" }),
    }));

    assert.match(html, new RegExp(`data-connection-indicator="${connectionStatus}"`));
    assert.match(html, new RegExp(`aria-label="${accessibleName}"`));
    assert.match(html, /data-displayed-chart-id="chart-a"/);
    assert.match(html, /data-displayed-chart-id="chart-b"/);
    assert.doesNotMatch(html, new RegExp(`>${accessibleName}<`));
    assert.doesNotMatch(html, /opacity:/);
    if (connectionStatus === "reconnecting") assert.match(html, /audience-blackout/);
  }
});

test("Audience retains its accepted last-valid output when a recovery-only Image is rejected upstream", () => {
  const recoveryDashboard = {
    ...dashboard,
    dataSources: {
      ...dashboard.dataSources,
      "recovery-source": {
        ...dashboard.dataSources["image-source"],
        mediaId: "media-recovery-source",
      },
    },
    contentLibrary: {
      ...dashboard.contentLibrary,
      mediaItems: {
        ...dashboard.contentLibrary.mediaItems,
        "media-recovery-source": {
          mediaId: "media-recovery-source",
          revision: 3,
          current: { kind: "asset", assetId: "missing-recovery-source" },
          displayName: "Recovery image",
          defaultDescription: "Recovery image",
          origin: "legacy-import",
          health: "needs-relink",
        },
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
  const retained = audienceProjection();
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard: recoveryDashboard,
    connectionStatus: "connected",
    projection: retained,
  }));

  assert.match(html, /data-displayed-chart-id="chart-b"/);
  assert.match(html, /data-displayed-chart-id="chart-a"/);
  assert.doesNotMatch(html, /Recovery image|data-presentation-item-kind="image"/);
});

test("Audience renders holding and deliberate blank as distinct passive states", () => {
  const holding = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    projection: audienceProjection({ outputMode: "holding" }),
  }));
  const blank = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    projection: audienceProjection({ outputMode: "blank" }),
  }));

  assert.match(holding, /data-output-mode="holding"/);
  assert.match(holding, /Waiting for the next scene\./);
  assert.doesNotMatch(holding, /data-displayed-chart-id/);
  assert.match(blank, /data-output-mode="blank"/);
  assert.doesNotMatch(blank, /Response overview|Waiting|data-displayed-chart-id/);
  assert.doesNotMatch(blank, /<button|<nav|tabindex/);
});

test("Audience uses saved permille date geometry and preserves direct-seek trace projection", () => {
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    projection: audienceProjection({
      epoch: Date.UTC(2027, 2, 15),
      frameIndex: 1,
      traceMode: "full",
      datePosition: { x_permille: 125, y_permille: 250, width_permille: 375 },
    }),
  }));

  assert.match(html, /data-frame-index="1"/);
  assert.match(html, /data-trace-mode="full"/);
  assert.match(html, /left:12\.5%/);
  assert.match(html, /top:25%/);
  assert.match(html, /width:37\.5%/);
  assert.match(html, /2027-03-15/);
});

test("Audience keeps the exact y=1000 date endpoint inside its surface with a proportional self-anchor", () => {
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    projection: audienceProjection({
      epoch: Date.UTC(2027, 2, 15),
      datePosition: { x_permille: 125, y_permille: 1000, width_permille: 375 },
    }),
  }));

  assert.match(html, /top:100%/);
  assert.match(html, /transform:translateY\(-100%\)/);
});

test("Audience ended is exact, neutral, passive, and contains no retained output or technical recovery copy", () => {
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "ended",
    projection: {
      kind: "ended",
      heading: "Presentation ended",
      body: "This display is no longer active.",
    },
  }));

  assert.match(html, />Presentation ended</);
  assert.match(html, />This display is no longer active\.</);
  assert.doesNotMatch(html, /chart-|scene-|group-|session-|channel|reconnect|disconnect/i);
  assert.doesNotMatch(html, /<button|<nav|<a |tabindex|data-displayed-chart-id/);
});

test("Audience render boundary retains the last committed output without retrying a failed projection", () => {
  const committed = audienceProjection();
  const failed = audienceProjection({ traceMode: "full" });
  const boundary = new audienceModule.AudienceRenderBoundary({ projection: failed });
  boundary.lastCommittedProjection = structuredClone(committed);
  boundary.state = { renderFailed: true, failedProjection: null };
  let scheduledState = null;
  boundary.setState = (next) => { scheduledState = next; };

  boundary.componentDidUpdate();
  assert.equal(scheduledState, null, "the same failed projection must not be retried before it is identified");
  boundary.componentDidCatch();
  assert.deepEqual(scheduledState, { failedProjection: failed });
  boundary.state = { renderFailed: true, failedProjection: failed };
  const retained = boundary.render();
  assert.deepEqual(retained.props.projection, committed);
  assert.equal(retained.props.renderStatus, "retained");
});

test("Audience Image fit/transform is passive and one failed cell leaves chart siblings rendered", () => {
  const imageItem = { kind: "image", panel_id: "image-a", media_id: "media-image-source", revision: 3 };
  const ready = renderToStaticMarkup(React.createElement(gridModule.default, {
    dashboard,
    contentRenderContext: { mediaItems: dashboard.contentLibrary.mediaItems },
    items: [imageItem],
    layout: "solo",
    surface: "audience",
    staticAssetReadiness: new Map([["image-a", {
      status: "ready",
      kind: "staticImage",
      sourceId: "image-source",
      mediaId: "media-image-source",
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
    contentRenderContext: { mediaItems: dashboard.contentLibrary.mediaItems },
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
      mediaId: "media-image-source",
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

function audienceProjection({
  items = defaultItems,
  layout = items.length === 1 ? "solo" : "sideBySide",
  facts = defaultFacts,
  epoch = Date.UTC(2027, 0, 1),
  frameIndex = 0,
  traceMode = "reveal",
  outputMode = "active",
  blackout = false,
  datePosition = { x_permille: 680, y_permille: 40, width_permille: 280 },
} = {}) {
  const itemIds = items.map((item) => item.kind === "chart" ? item.chart_id : item.panel_id);
  return {
    kind: "output",
    mode: outputMode,
    blackout,
    dashboardRevision: "dashboard-r1",
    source: { kind: "Chrono Group", scene_id: null, chrono_group_id: "epidemic-time" },
    composition: {
      active_page_id: "biomedical",
      displayed_chart_ids: itemIds,
      layout,
    },
    timeline: {
      frame_epochs: [epoch, epoch],
      frame_index: frameIndex,
      period: { start: epoch, end: epoch },
      trace_mode: traceMode,
      seconds_per_frame: 1,
    },
    matching: { use_authored_settings: true },
    audience: {
      date_position: datePosition,
    },
    payload: { items, audience_facts: facts },
  };
}
