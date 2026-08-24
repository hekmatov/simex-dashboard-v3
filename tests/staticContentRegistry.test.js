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

test("Add chart and Add static content expose disjoint registry-owned catalogues", () => {
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

test("presentable index includes saved Image identity and revision but excludes Free text", () => {
  const dashboard = fixtureDashboard();
  const index = buildPresentableItemIndex(dashboard);

  assert.deepEqual([...index.keys()], ["image-panel"]);
  assert.deepEqual(index.get("image-panel"), {
    id: "image-panel",
    title: "Response map",
    typeId: "image",
    pageId: "page-a",
    sectionId: "section-a",
    descriptor: {
      kind: "image",
      panel_id: "image-panel",
      source_id: "image-source",
      revision: 4,
    },
  });
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
        sourceVersion: 1,
        revision: 4,
        origin: { kind: "url", url: "https://example.test/map.png" },
        alt: "Response map",
        decorative: false,
        fit: "contain",
        crop: { x: 0, y: 0, width: 1000, height: 1000 },
        rotation: 0,
      },
    },
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a",
        panels: [
          { id: "text-panel", chart: { id: "text-panel", typeId: "freeText", title: "Brief", sourceId: "text-source" } },
          { id: "image-panel", chart: { id: "image-panel", typeId: "image", title: "Response map", sourceId: "image-source" } },
        ],
      }],
    }],
  };
}
