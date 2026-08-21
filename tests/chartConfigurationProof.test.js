import assert from "node:assert/strict";
import test from "node:test";

import {
  validateChartConfiguration,
} from "../src/charting/forms/chartConfiguration.js";
import {
  deriveCreateProofState,
  requestRenderProof,
} from "../src/charting/forms/chartProof.js";
import { getChartSchema } from "../src/charting/schemas/chartSchemaRegistry.js";
import {
  CHART_CREATION_STAGES,
} from "../src/charting/forms/wizardDraft.js";

test("configuration requires an authored human-readable title", () => {
  const schema = getChartSchema("line");
  assert.equal(validateChartConfiguration({
    schema,
    configuration: { title: "   " },
  }).valid, false);

  const suggested = validateChartConfiguration({
    schema,
    configuration: { title: "Cases by date", titleOrigin: "suggested" },
  });
  assert.equal(suggested.valid, false);
  assert.match(suggested.errors[0].message, /accept or edit/i);

  const accepted = validateChartConfiguration({
    schema,
    configuration: {
      title: "Cases by date",
      titleOrigin: "authored",
      showTitle: false,
      lineWidth: 3,
      referenceLine: { value: 8, label: "Target" },
    },
  });
  assert.equal(accepted.valid, true);
  assert.equal(accepted.value.title, "Cases by date");
  assert.equal(accepted.value.showTitle, false);
});

test("unsupported schema configuration is diagnosed without clearing supported values", () => {
  const result = validateChartConfiguration({
    schema: getChartSchema("area"),
    configuration: {
      title: "Coverage",
      titleOrigin: "authored",
      lineWidth: 2,
      barWidth: 18,
    },
  });
  assert.equal(result.valid, false);
  assert.equal(result.value.lineWidth, 2);
  assert.equal(result.value.barWidth, undefined);
  assert.equal(result.errors[0].code, "unsupported-configuration");
});

test("render proof is correlated to the current revision and non-empty output", () => {
  const valid = requestRenderProof({
    draftRevision: "draft-7",
    chart: { id: "chart-a", title: "Cases" },
    preparedData: { rows: [{ observed: 1, value: 4 }] },
  });
  assert.equal(valid.status, "valid");
  assert.equal(valid.rendererReadyCount, 1);
  assert.equal(valid.draftRevision, "draft-7");

  const empty = requestRenderProof({
    draftRevision: "draft-8",
    chart: { id: "chart-a", title: "Cases" },
    preparedData: { rows: [] },
  });
  assert.equal(empty.status, "invalid");
  assert.equal(empty.rendererReadyCount, 0);
  assert.match(empty.errors[0].message, /no renderer-ready output/i);
});

test("render and placement proofs remain independent and must both be current", () => {
  const draft = {
    revision: "draft-7",
    renderProofRevision: "render-7",
    placementProofRevision: "place-7",
  };
  const render = {
    revision: "render-7",
    draftRevision: "draft-7",
    status: "valid",
    rendererReadyCount: 4,
    errors: [],
  };
  const placement = {
    revision: "place-7",
    status: "valid",
    errors: [],
  };
  assert.deepEqual(deriveCreateProofState({
    renderProofRevision: render,
    placementProofRevision: placement,
    draft,
  }), {
    renderCurrent: true,
    placementCurrent: true,
    ready: true,
    reasons: [],
  });

  const stalePlacement = deriveCreateProofState({
    renderProofRevision: render,
    placementProofRevision: { ...placement, revision: "place-6" },
    draft,
  });
  assert.equal(stalePlacement.renderCurrent, true);
  assert.equal(stalePlacement.placementCurrent, false);
  assert.equal(stalePlacement.ready, false);
  assert.match(stalePlacement.reasons[0], /placement/i);
});

test("proofs are validations inside exactly six stages", () => {
  assert.deepEqual(CHART_CREATION_STAGES, [
    "destination",
    "chart-type",
    "data-source",
    "map-and-prepare-data",
    "configure-chart",
    "review-and-create",
  ]);
  assert.equal(CHART_CREATION_STAGES.includes("proof"), false);
});
