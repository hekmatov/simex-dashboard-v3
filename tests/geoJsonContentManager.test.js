import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  buildGeoJsonContentDraft,
} from "../src/content-library/contentDraftTransaction.js";
import { validateGeoJson } from "../src/lib/geoJsonValidation.js";
import { validatedGeoSourceOptions } from "../src/charting/forms/geographySource.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: GeoJsonDetail },
  { createBuildMapBudget, mapBudgetNotice },
  { default: DataSourceStep },
  { default: DataSourceCatalogue },
  { clearStagedGeoJsonSelection, discardStagedGeoJsonDraft, parseUploadedGeoJsonFile },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/source-content/GeoJsonDetail.jsx"),
  vite.ssrLoadModule("/src/components/build/BuildMapBudgetContext.jsx"),
  vite.ssrLoadModule("/src/components/chart-authoring/DataSourceStep.jsx"),
  vite.ssrLoadModule("/src/components/source-content/DataSourceCatalogue.jsx"),
  vite.ssrLoadModule("/src/components/chart-authoring/ChartWizardV3.jsx"),
]);
await vite.close();

const geoJson = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: { zeta: "Z", alpha: "A" },
    geometry: { type: "Polygon", coordinates: [[
      [4, 51], [6, 51], [6, 53], [4, 51],
    ]] },
  }],
};

test("manager GeoJSON Add publishes descriptor, payload, summary, and unused source identity together", () => {
  const validation = validateGeoJson(geoJson, { includeDiagnostics: true });
  const input = buildGeoJsonContentDraft({
    owner: "manager",
    sourceId: "uploaded-boundaries",
    fileName: "uploaded-boundaries.geojson",
    geoJson,
    validation,
    displayName: "Uploaded boundaries",
  });
  const dashboard = {
    dataSources: {}, loadedData: {}, datasetProfiles: {},
    contentLibrary: { mediaItems: {}, sourceEntries: {} },
  };
  const result = input.buildCandidate({ dashboard, draft: { payload: input.payload } });

  assert.deepEqual(result.itemIds, ["uploaded-boundaries"]);
  assert.equal(result.dashboard.dataSources["uploaded-boundaries"].type, "uploadedGeoJson");
  assert.deepEqual(result.dashboard.loadedData["uploaded-boundaries"], geoJson);
  assert.equal(result.dashboard.contentLibrary.sourceEntries["uploaded-boundaries"].origin, "uploaded");
  assert.equal(Object.hasOwn(result.dashboard.datasetProfiles, "uploaded-boundaries"), false);
  assert.deepEqual(input.summary.propertyKeys, ["alpha", "zeta"]);
  assert.deepEqual(dashboard.dataSources, {});
});

test("GeoJSON detail renders the lean summary, bounded property controls, and accessible preview fallback", () => {
  const validation = validateGeoJson(geoJson, { includeDiagnostics: true });
  const html = renderToStaticMarkup(React.createElement(GeoJsonDetail, {
    item: {
      id: "uploaded-boundaries",
      record: { displayName: "Uploaded boundaries", origin: "uploaded", health: "ready" },
    },
    source: { kind: "dataset", type: "uploadedGeoJson", geoJson },
    geoData: geoJson,
    summary: validation.summary,
  }));

  assert.match(html, /1 feature/);
  assert.match(html, /Polygon/);
  assert.match(html, /4, 51.*6, 53/);
  assert.match(html, /alpha/);
  assert.match(html, /zeta/);
  assert.match(html, /Search property keys/);
  assert.match(html, /GeoJSON preview summary/);
  assert.match(html, /data-map-budget-status=/);
  assert.doesNotMatch(html, /maxDepth|structuralNodes|propertyValueBytes/);
});

test("one shared Build map budget activates deferred work without exceeding the eager limit", () => {
  const budget = createBuildMapBudget();
  const releasePreviewA = budget.acquire({ ownerId: "preview:a", kind: "preview", visible: true, active: true });
  budget.acquire({ ownerId: "preview:b", kind: "preview", visible: true, active: true });
  budget.acquire({ ownerId: "preview:c", kind: "preview", visible: true, active: true });
  budget.acquire({ ownerId: "preview:d", kind: "preview", visible: true, active: true });
  budget.acquire({ ownerId: "preview:e", kind: "preview", visible: true, active: true });
  budget.acquire({ ownerId: "dashboard:map", kind: "dashboard", visible: true, active: true });

  assert.equal(budget.getSnapshot("dashboard:map").status, "normal");
  assert.equal(budget.getSnapshot("preview:a").status, "normal");
  assert.equal(budget.getSnapshot("preview:b").status, "degraded");
  assert.equal(budget.getSnapshot("preview:c").status, "degraded");
  assert.equal(budget.getSnapshot("preview:d").status, "deferred");
  assert.equal(budget.getSnapshot("preview:e").status, "deferred");

  assert.equal(budget.activate("preview:e"), true);
  assert.equal(budget.getSnapshot("preview:e").allocated, true);
  assert.equal([
    "dashboard:map", "preview:a", "preview:b", "preview:c", "preview:d", "preview:e",
  ].filter((ownerId) => budget.getSnapshot(ownerId).allocated).length, 4);
  assert.equal(budget.getSnapshot("dashboard:map").status, "normal");
  assert.equal(mapBudgetNotice("degraded"), "Additional live map — performance may be reduced.");
  assert.equal(mapBudgetNotice("normal"), "");

  releasePreviewA();
  assert.equal(budget.getSnapshot("preview:c").allocated, true);
  assert.equal(budget.activate("missing"), false);
});

test("managed tracked, packaged, and uploaded GeoJSON are selectable and upload stays in the same data-source stage", () => {
  const dataSources = {
    tracked: { kind: "geojson", path: "data/tracked.geojson", provenance: { label: "Tracked" } },
    packaged: { kind: "dataset", type: "uploadedGeoJson", fileName: "packaged.geojson", geoJson },
    uploaded: { kind: "dataset", type: "uploadedGeoJson", fileName: "uploaded.geojson", browserAssetId: "asset-1", geoJson },
    generated: { kind: "geojson", path: "data/generated.geojson", provenance: { label: "Generated" } },
  };
  const sourceEntries = {
    tracked: { sourceId: "tracked", origin: "linked-project", ownership: "builder", displayName: "Tracked", provenance: {}, health: "ready" },
    packaged: { sourceId: "packaged", origin: "packaged", ownership: "builder", displayName: "Packaged", provenance: {}, health: "ready" },
    uploaded: { sourceId: "uploaded", origin: "uploaded", ownership: "builder", displayName: "Uploaded", provenance: {}, health: "ready" },
    generated: { sourceId: "generated", origin: "generated", ownership: "dashboard", displayName: "Generated", provenance: {}, health: "ready" },
  };
  assert.deepEqual(validatedGeoSourceOptions(dataSources, {
    tracked: geoJson, packaged: geoJson, uploaded: geoJson, generated: geoJson,
  }, sourceEntries).map(({ value }) => value), ["tracked", "packaged", "uploaded"]);

  const html = renderToStaticMarkup(React.createElement(DataSourceStep, {
    geographyRequired: true,
    geoSources: [{ value: "uploaded", label: "Uploaded" }],
    onUploadGeoJson() {},
  }));
  assert.match(html, /Map geography/);
  assert.match(html, /Upload GeoJSON/);
  assert.equal((html.match(/chart-wizard-step/g) ?? []).length, 1);
});

test("chart GeoJSON close and Escape cleanup discard staged authority while preserving suspension state", async () => {
  for (const reason of ["chart-geojson-close", "chart-geojson-escape"]) {
    const draftRef = { current: { draftId: `draft:${reason}`, candidate: { sourceId: "staged-boundaries" } } };
    const discarded = [];
    const wizard = {
      stage: "data-source",
      draft: {
        id: "chart-draft",
        title: "Preserved title",
        presentation: { map: { geoSource: "staged-boundaries", scale: "sequential" } },
      },
    };
    const cleared = clearStagedGeoJsonSelection(wizard, "staged-boundaries");
    await discardStagedGeoJsonDraft(draftRef, (draftId, discardReason) => {
      discarded.push([draftId, discardReason]);
    }, reason);

    assert.equal(draftRef.current, null);
    assert.deepEqual(discarded, [[`draft:${reason}`, reason]]);
    assert.equal(cleared.stage, "data-source");
    assert.equal(cleared.draft.title, "Preserved title");
    assert.equal(cleared.draft.presentation?.map?.geoSource, undefined);
  }
});

test("manager exposes GeoJSON Add and the shared parser rejects invalid input before staging", async () => {
  const html = renderToStaticMarkup(React.createElement(DataSourceCatalogue, {
    dashboard: { dataSources: {}, contentLibrary: { sourceEntries: {} } },
    items: [], filters: {},
  }));
  assert.match(html, /Add GeoJSON/);

  const parsed = await parseUploadedGeoJsonFile({
    name: "districts.geojson",
    async text() { return JSON.stringify(geoJson); },
  }, {});
  assert.equal(parsed.source.type, "uploadedGeoJson");
  assert.equal(parsed.validation.schema.ok, true);
  await assert.rejects(
    parseUploadedGeoJsonFile({ name: "bad.geojson", async text() { return "not-json"; } }, {}),
    /valid JSON|could not be validated/i,
  );
});
