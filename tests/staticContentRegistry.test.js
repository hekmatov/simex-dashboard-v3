import assert from "node:assert/strict";
import test from "node:test";

import { listChartTypeOptions } from "../src/charting/forms/chartCatalogue.js";
import {
  chartSchemaRegistry,
  getChartSchema,
  listChartSchemas,
} from "../src/charting/schemas/chartSchemaRegistry.js";
import { CHART_TYPE_GLYPHS } from "../src/iconography/iconCatalog.js";
import {
  buildPresentableItemIndex,
  getStaticPanelCapabilities,
  listStaticContentTypeOptions,
  validateStaticDestination,
} from "../src/static-content/staticPanelCapabilities.js";

test("Add chart and Add Text/Image expose disjoint registry-owned catalogues", () => {
  const chartIds = listChartTypeOptions({ registry: chartSchemaRegistry })
    .map(({ id }) => id);
  const staticOptions = listStaticContentTypeOptions({ registry: chartSchemaRegistry });

  assert.deepEqual(staticOptions.map(({ id }) => id), ["image", "freeText"]);
  assert.equal(staticOptions.every(({ schemaRevision }) => (
    typeof schemaRevision === "string" && schemaRevision.length > 0
  )), true);
  assert.equal(chartIds.includes("image"), false);
  assert.equal(chartIds.includes("freeText"), false);
  assert.equal(chartIds.length + staticOptions.length, listChartSchemas().length);
  assert.equal(new Set([...chartIds, ...staticOptions.map(({ id }) => id)]).size, listChartSchemas().length);
});

test("the registry retains one Image identity and gives both static types typed sources", () => {
  assert.equal(listChartSchemas().filter(({ typeId }) => typeId === "image").length, 1);
  assert.equal(listChartSchemas().filter(({ typeId }) => typeId === "staticImage").length, 0);
  assert.deepEqual(getChartSchema("freeText").sources, ["staticText"]);
  assert.deepEqual(getChartSchema("image").sources, ["staticImage", "inline"]);
  assert.equal(getChartSchema("image").manualData, null);
  assert.equal(getChartSchema("freeText").authoringWorkflow, "static");
  assert.equal(getChartSchema("image").authoringWorkflow, "static");
  assert.equal(CHART_TYPE_GLYPHS.freeText, "description");
});

test("surface, authoring, and time capabilities are exact for static content", () => {
  assert.deepEqual(getStaticPanelCapabilities("freeText"), {
    typeId: "freeText",
    authoringWorkflow: "static",
    sourceKind: "staticText",
    surfaces: {
      build: true,
      view: true,
      fullscreen: true,
      present: false,
      audience: false,
    },
    sourceCsv: false,
    timeContext: false,
    chronoGroups: false,
    scenes: false,
  });
  assert.deepEqual(getStaticPanelCapabilities("image"), {
    typeId: "image",
    authoringWorkflow: "static",
    sourceKind: "staticImage",
    surfaces: {
      build: true,
      view: true,
      fullscreen: true,
      present: true,
      audience: true,
    },
    sourceCsv: false,
    timeContext: false,
    chronoGroups: false,
    scenes: false,
  });
});

test("presentable index includes charts and saved Image identity/revision but excludes Free text", () => {
  const dashboard = fixtureDashboard();
  const index = buildPresentableItemIndex(dashboard);

  assert.deepEqual([...index.keys()], ["chart-panel", "image-panel"]);
  assert.deepEqual(index.get("chart-panel")?.descriptor, {
    kind: "chart",
    chart_id: "chart-panel",
  });
  assert.deepEqual(index.get("image-panel"), {
    id: "image-panel",
    title: "Response map",
    typeId: "image",
    pageId: "page-a",
    sectionId: "section-a",
    descriptor: {
      kind: "image",
      panel_id: "image-panel",
      media_id: "media-image-source",
      revision: 4,
    },
  });
});

test("presentable index is empty while the dashboard is still loading", () => {
  assert.deepEqual([...buildPresentableItemIndex(null)], []);
});

test("presentable index excludes every recovery-only or incomplete saved Image", () => {
  const dashboard = fixtureDashboard();
  const validSource = dashboard.dataSources["image-source"];
  const validMedia = dashboard.contentLibrary.mediaItems["media-image-source"];
  const recoveryCases = {
    replacement: {
      source: { ...validSource, mediaId: "media-replacement" },
      media: {
        ...assetMediaItem("media-replacement", "asset-replacement", "needs-relink"),
        origin: "legacy-import",
      },
    },
    missingAlt: {
      source: { ...validSource, mediaId: "media-missing-alt", alt: "" },
      media: { ...validMedia, mediaId: "media-missing-alt" },
    },
    unsafeUrl: {
      source: { ...validSource, mediaId: "media-unsafe-url" },
      media: {
        ...validMedia,
        mediaId: "media-unsafe-url",
        current: { kind: "url", url: "http://example.test/map.png" },
      },
    },
    missingManifest: {
      source: { ...validSource, mediaId: "media-missing-manifest" },
      media: assetMediaItem("media-missing-manifest", "asset-missing"),
    },
    missingBytes: {
      source: { ...validSource, mediaId: "media-missing-bytes" },
      media: assetMediaItem("media-missing-bytes", "asset-missing-bytes"),
    },
    stagedRecovery: {
      source: { ...validSource, mediaId: "media-staged" },
      media: assetMediaItem("media-staged", "asset-staged"),
    },
  };
  dashboard.dataSources = {
    ...dashboard.dataSources,
    ...Object.fromEntries(Object.entries(recoveryCases).map(([id, { source }]) => [`source-${id}`, source])),
    "source-durable": {
      ...validSource,
      mediaId: "media-durable",
    },
  };
  dashboard.contentLibrary.mediaItems = {
    ...dashboard.contentLibrary.mediaItems,
    ...Object.fromEntries(Object.values(recoveryCases).map(({ media }) => [media.mediaId, media])),
    "media-durable": assetMediaItem("media-durable", "asset-durable"),
  };
  dashboard.assets = {
    "asset-missing-bytes": assetManifestEntry("b", "missing"),
    "asset-staged": assetManifestEntry("c", "staged"),
    "asset-durable": assetManifestEntry("d", "durable"),
  };
  dashboard.pages[0].sections[0].panels.push(
    ...Object.keys(recoveryCases).map((id) => ({
      id: `image-${id}`,
      typeId: "image",
      title: id,
      sourceId: `source-${id}`,
    })),
    {
      id: "image-durable",
      typeId: "image",
      title: "Durable",
      sourceId: "source-durable",
    },
  );

  const index = buildPresentableItemIndex(dashboard);

  assert.equal(index.has("image-durable"), true);
  for (const id of Object.keys(recoveryCases)) {
    assert.equal(index.has(`image-${id}`), false, id);
  }
});

test("static destinations accept dashboard sections and reject temporal ownership", () => {
  const dashboard = fixtureDashboard();
  assert.deepEqual(
    validateStaticDestination({ pageId: "page-a", sectionId: "section-a" }, dashboard),
    { pageId: "page-a", sectionId: "section-a" },
  );
  assert.throws(
    () => validateStaticDestination({ pageId: "page-a", sectionId: "section-a", sceneId: "scene-a" }, dashboard),
    /Scene/i,
  );
  assert.throws(
    () => validateStaticDestination({ pageId: "page-a", sectionId: "missing" }, dashboard),
    /section/i,
  );
});

function fixtureDashboard() {
  return {
    dataSources: {
      "text-source": {
        kind: "staticText",
        sourceVersion: 1,
        revision: 2,
        renderingPolicy: "portable-qmd-v1",
        qmd: "# Brief",
      },
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
    },
    contentLibrary: {
      mediaItems: {
        "media-image-source": {
          mediaId: "media-image-source",
          revision: 4,
          current: { kind: "url", url: "https://example.test/map.png" },
          displayName: "Response map",
          defaultDescription: "Response map",
          origin: "external",
          health: "external",
        },
      },
      sourceEntries: {},
    },
    assets: {},
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a",
        panels: [
          { id: "text-panel", chart: { id: "text-panel", typeId: "freeText", title: "Brief", sourceId: "text-source" } },
          { id: "chart-panel", chart: { id: "chart-panel", typeId: "kpi", title: "Status", sourceId: "chart-source" } },
          { id: "image-panel", chart: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" } },
        ],
      }],
    }],
  };
}

function assetMediaItem(mediaId, assetId, health = "ready") {
  return {
    mediaId,
    revision: 4,
    current: { kind: "asset", assetId },
    displayName: "Response map",
    defaultDescription: "Response map",
    origin: "uploaded",
    health,
  };
}

function assetManifestEntry(seed, storageState) {
  return {
    mediaType: "image/png",
    byteLength: 68,
    width: 2,
    height: 3,
    sha256: seed.repeat(64),
    storageState,
  };
}
