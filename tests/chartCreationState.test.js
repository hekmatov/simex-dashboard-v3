import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_CREATION_STAGE_LABELS,
  CHART_CREATION_STAGES,
  WIZARD_STEPS,
  createWizardState,
  deriveChartCreationStageStatuses,
  reduceWizardState,
} from "../src/charting/forms/wizardDraft.js";
import { isMeaningfulChartDraft } from "../src/charting/forms/chartDraftSession.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";

test("chart creation exposes exactly six stable stages and labels with no proof stage", () => {
  assert.deepEqual(CHART_CREATION_STAGES, [
    "destination",
    "data-source",
    "chart-type",
    "map-and-prepare-data",
    "configure-chart",
    "review-and-create",
  ]);
  assert.deepEqual(CHART_CREATION_STAGE_LABELS, [
    "Destination",
    "Data source",
    "Chart type",
    "Map and prepare",
    "Configure",
    "Review",
  ]);
  assert.equal(CHART_CREATION_STAGES.includes("proof"), false);

  // Existing mounted wizard consumers keep their compatible four-step API.
  assert.deepEqual(WIZARD_STEPS, ["source", "type", "roles", "style"]);
});

test("new wizard state has the exact session fields and starts in Destination", () => {
  const state = createWizardState({
    draftId: "draft-1",
    dashboardRevision: "dashboard-r1",
  });

  for (const key of [
    "draftId",
    "stage",
    "status",
    "destination",
    "chartTypeId",
    "sourceSelection",
    "source",
    "profileRevision",
    "mapping",
    "preparation",
    "configuration",
    "companions",
    "renderProofRevision",
    "placementProofRevision",
    "dashboardRevision",
    "errors",
    "suspension",
    "handoff",
  ]) {
    assert.equal(Object.hasOwn(state, key), true, key);
  }
  assert.equal(state.stage, "destination");
  assert.equal(state.status, "editing");
  assert.equal(state.dashboardRevision, "dashboard-r1");
  assert.equal(state.stageStatuses.destination, "In progress");
  assert.equal(state.stageStatuses["review-and-create"], "Waiting on prerequisite");
});

test("stage access is non-linear and dependency-aware without clearing compatible work", () => {
  let state = createWizardState({ draftId: "draft-1", dashboardRevision: "r1" });
  state = reduceWizardState(state, {
    type: "setDestination",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  state = reduceWizardState(state, {
    type: "requestSourceChange",
    sourceId: "source-a",
    source: { kind: "dataset", url: "source-a.csv" },
    rows: [{ date: "2026-08-29", value: 1 }],
    profile: {
      revision: "profile-r1",
      rowCount: 1,
      columns: [
        { name: "date", type: "temporal" },
        { name: "value", type: "numeric" },
      ],
    },
    kind: "existing",
  });
  state = reduceWizardState(state, {
    type: "setChartType",
    chartTypeId: "line-basic",
    schemaRevision: "schema-r1",
  });
  state = reduceWizardState(state, {
    type: "setMapping",
    mapping: { x: "date", y: "value" },
  });
  state = reduceWizardState(state, {
    type: "setPreparation",
    preparation: { missing: "drop" },
  });
  state = reduceWizardState(state, {
    type: "setConfiguration",
    configuration: { title: "Incidence" },
  });
  state = reduceWizardState(state, { type: "setStage", stage: "review-and-create" });

  assert.equal(state.stage, "review-and-create");
  assert.equal(state.stageStatuses.destination, "Complete");
  assert.equal(state.stageStatuses["chart-type"], "Complete");
  assert.equal(state.stageStatuses["data-source"], "Complete");
  assert.equal(state.stageStatuses["map-and-prepare-data"], "Complete");
  assert.equal(state.stageStatuses["configure-chart"], "Complete");
  assert.equal(state.stageStatuses["review-and-create"], "In progress");

  const mapping = state.mapping;
  const configuration = state.configuration;
  state = reduceWizardState(state, { type: "back" });
  assert.equal(state.stage, "configure-chart");
  assert.strictEqual(state.mapping, mapping);
  assert.strictEqual(state.configuration, configuration);

  const direct = reduceWizardState(
    createWizardState({ draftId: "draft-2", dashboardRevision: "r1" }),
    { type: "setStage", stage: "review-and-create" },
  );
  assert.equal(direct.stage, "review-and-create");
  assert.equal(direct.stageStatuses["review-and-create"], "Waiting on prerequisite");
});

test("live stage status separates current stage, errors, completion, and prerequisites", () => {
  let state = createWizardState({ draftId: "draft-1", dashboardRevision: "r1" });
  state = reduceWizardState(state, { type: "setStage", stage: "data-source" });
  assert.deepEqual(deriveChartCreationStageStatuses(state), {
    destination: "Not started",
    "chart-type": "Waiting on prerequisite",
    "data-source": "Waiting on prerequisite",
    "map-and-prepare-data": "Waiting on prerequisite",
    "configure-chart": "Waiting on prerequisite",
    "review-and-create": "Waiting on prerequisite",
  });

  state = reduceWizardState(state, {
    type: "revalidate",
    result: {
      ok: false,
      errors: [{ code: "SOURCE_DRIFT", stage: "data-source", focusId: "choose-source" }],
    },
  });
  assert.equal(state.status, "failed");
  assert.equal(state.stageStatuses["data-source"], "Needs attention");
  assert.equal(state.stageStatuses["review-and-create"], "Waiting on prerequisite");
});

test("meaningful detection distinguishes pristine, meaningful, committed, and discarded drafts", () => {
  const pristine = createWizardState({ draftId: "draft-1", dashboardRevision: "r1" });
  assert.equal(isMeaningfulChartDraft(pristine), false);

  const meaningful = reduceWizardState(pristine, {
    type: "setDestination",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  assert.equal(isMeaningfulChartDraft(meaningful), true);

  const committed = {
    ...meaningful,
    status: "committed",
  };
  assert.equal(isMeaningfulChartDraft(committed), false);
  assert.equal(isMeaningfulChartDraft(reduceWizardState(meaningful, { type: "discard" })), false);
});

test("copying an existing chart keeps its draft identity and destination while replacing configuration and size", () => {
  const template = createChartDraft("pie", {
    id: "template-chart",
    title: "Workforce distribution",
    description: "Copied description",
    sourceId: "workforce",
    roles: { category: { field: "sector" }, value: { field: "count" } },
    presentation: { labels: { labelWrap: true }, legend: { wrap: true } },
    layout: { size: "wide", width: 4, height: 1.5 },
  });
  const state = createWizardState({
    draftId: "new-chart",
    destination: { pageId: "page-a", sectionId: "section-a" },
    charts: [template],
    loadedData: { workforce: [{ sector: "Health", count: 4 }] },
    profiles: { workforce: { columns: [{ name: "sector", type: "string" }, { name: "count", type: "number" }] } },
  });
  const copied = reduceWizardState(state, {
    type: "copyExistingChart",
    chartId: "template-chart",
    source: null,
    rows: [{ sector: "Health", count: 4 }],
    profile: { columns: [{ name: "sector", type: "string" }, { name: "count", type: "number" }] },
  });

  assert.equal(copied.draft.id, "new-chart");
  assert.equal(copied.draft.typeId, "pie");
  assert.equal(copied.draft.title, "Workforce distribution");
  assert.equal(copied.draft.presentation.labels.labelWrap, true);
  assert.equal(copied.draft.presentation.legend.wrap, true);
  assert.deepEqual(copied.destination, {
    pageId: "page-a",
    sectionId: "section-a",
    footprint: { columns: 4, rows: 1.5 },
  });
});

test("serialized committing state is non-cancellable and duplicate-input safe", () => {
  let state = createWizardState({
    draftId: "draft-1",
    dashboardRevision: "r1",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  state = reduceWizardState(state, {
    type: "commitStarted",
    transactionId: "transaction-1",
  });
  assert.equal(state.status, "committing");
  assert.equal(state.handoff.transactionId, "transaction-1");

  for (const action of [
    { type: "discard" },
    { type: "back" },
    { type: "setStage", stage: "destination" },
    { type: "suspend", restoration: {} },
    { type: "commitStarted", transactionId: "transaction-2" },
  ]) {
    assert.strictEqual(reduceWizardState(state, action), state, action.type);
  }
});

test("commit failure, ambiguity, reconciliation, and success retain one transaction identity", () => {
  let state = createWizardState({
    draftId: "draft-1",
    dashboardRevision: "r1",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  state = reduceWizardState(state, { type: "commitStarted", transactionId: "tx-1" });
  state = reduceWizardState(state, {
    type: "commitResult",
    result: { status: "ambiguous", message: "Checking durable outcome" },
  });
  assert.equal(state.status, "ambiguous");
  assert.equal(state.handoff.transactionId, "tx-1");
  assert.strictEqual(reduceWizardState(state, {
    type: "commitStarted",
    transactionId: "tx-2",
  }), state);
  assert.strictEqual(reduceWizardState(state, {
    type: "setStage",
    stage: "destination",
  }), state);

  state = reduceWizardState(state, {
    type: "reconciled",
    result: { status: "committed", chartId: "chart-1" },
  });
  assert.equal(state.status, "committed");
  assert.equal(state.handoff.chartId, "chart-1");
});
