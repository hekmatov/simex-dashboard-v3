import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContentDependencyGraph,
  mediaDependencies,
  csvDependencies,
  geoJsonDependencies,
  activeRetentions,
  temporalImpactContexts,
} from "../src/content-library/contentDependencyGraph.js";
import { makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

const dashboard = {
  contentLibrary: {
    mediaItems: {
      "media-image": { mediaId: "media-image", revision: 2, current: { kind: "asset", assetId: "asset-image" } },
      "media-qmd": { mediaId: "media-qmd", revision: 1, current: { kind: "asset", assetId: "asset-qmd" }, health: "ready" },
    },
    sourceEntries: {
      cases: makeSourceEntry("csv", { sourceId: "cases" }),
      boundaries: makeSourceEntry("geojson", { sourceId: "boundaries" }),
    },
  },
  dataSources: {
    image: { kind: "staticImage", sourceVersion: 2, mediaId: "media-image" },
    notes: { kind: "staticText", qmd: "![Map](simex-media:media-qmd){width=50% align=center flow=block frame=none caption=\"\" decorative=false}" },
    cases: { kind: "dataset", type: "uploadedCsv", csvText: "value\n1\n" },
    boundaries: { kind: "dataset", type: "uploadedGeoJson", geoJson: { type: "FeatureCollection", features: [] } },
  },
  pages: [{
    id: "operations",
    title: "Operations",
    sections: [{
      id: "signals",
      title: "Signals",
      panels: [
        { id: "image-panel", title: "Image panel", chart: { id: "image-panel", typeId: "image", sourceId: "image" } },
        { id: "qmd-panel", title: "QMD panel", chart: { id: "qmd-panel", typeId: "freeText", sourceId: "notes" } },
        { id: "map-panel", title: "Map panel", chart: { id: "map-panel", typeId: "map", sourceId: "cases", presentation: { map: { geoSource: "boundaries" } } } },
      ],
    }],
  }],
  chronoGroups: [{ id: "chrono-a", name: "Chrono A", members: [{ chartId: "map-panel" }] }],
  scenes: [{
    id: "scene-a", name: "Scene A", members: [{ chartId: "map-panel" }],
    chartIds: ["legacy-chart"], frames: { chartId: "map-panel" },
    present: { chartIds: ["map-panel"] },
  }],
};

const retainers = {
  assetIds: ["asset-image"],
  mediaIds: ["media-image"],
  sourceIds: ["cases"],
  records: [
    { ownerId: "image-draft", kind: "image-replacement", status: "staged", assetIds: ["asset-image"], mediaIds: ["media-image"], sourceIds: [] },
    { ownerId: "csv-transaction", kind: "csv-replacement", status: "active", assetIds: [], mediaIds: [], sourceIds: ["cases"] },
  ],
};

test("saved dependencies contain only direct panel uses with breadcrumb context", () => {
  const graph = buildContentDependencyGraph({ dashboard, activeRetainers: retainers });
  assert.deepEqual(mediaDependencies(graph, "media-image"), [{
    id: "media:media-image:operations:signals:image-panel",
    kind: "static-image",
    itemKind: "media",
    itemId: "media-image",
    pageId: "operations",
    pageLabel: "Operations",
    sectionId: "signals",
    sectionLabel: "Signals",
    panelId: "image-panel",
    panelLabel: "Image panel",
  }]);
  assert.equal(mediaDependencies(graph, "media-qmd").length, 1);
  assert.equal(csvDependencies(graph, "cases").length, 1);
  assert.equal(geoJsonDependencies(graph, "boundaries").length, 1);
  assert.equal(graph.directUses.length, 4, "page and section breadcrumbs must not become extra edges");
});

test("active draft and transaction retainers stay distinct from saved uses", () => {
  const graph = buildContentDependencyGraph({ dashboard, activeRetainers: retainers });
  assert.deepEqual(activeRetentions(graph, { kind: "media", id: "media-image" }).map(({ ownerId, kind }) => ({ ownerId, kind })), [
    { ownerId: "image-draft", kind: "image-replacement" },
  ]);
  assert.deepEqual(activeRetentions(graph, { kind: "csv", id: "cases" }).map(({ ownerId }) => ownerId), ["csv-transaction"]);
  assert.equal(graph.directUses.some(({ id }) => id.includes("image-draft") || id.includes("transaction")), false);
});

test("temporal and presentation contexts never add saved dependency edges", () => {
  const baseline = buildContentDependencyGraph({ dashboard, activeRetainers: retainers });
  const runtime = buildContentDependencyGraph({
    dashboard,
    activeRetainers: retainers,
    presentationState: { scene_id: "scene-a", items: [{ kind: "chart", chart_id: "map-panel" }] },
    audienceMessages: [{ type: "state", payload: { scene_id: "scene-a" } }],
    mediaLeases: [{ mediaId: "media-image", revision: 2 }],
  });
  assert.deepEqual(runtime.directUses, baseline.directUses);
  assert.deepEqual(temporalImpactContexts(runtime, "cases").map(({ kind, id }) => ({ kind, id })), [
    { kind: "chrono-group", id: "chrono-a" },
    { kind: "scene", id: "scene-a" },
    { kind: "scene-presentation", id: "scene-a" },
  ]);
  assert.deepEqual(temporalImpactContexts(runtime, "boundaries"), []);
});
