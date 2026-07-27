import assert from "node:assert/strict";
import test from "node:test";

import {
  createWizardState,
  finalizeWizardDraft,
  reduceWizardState,
} from "../src/charting/forms/wizardDraft.js";
import {
  createChartDraft,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { validateTimeSyncGroups } from "../src/charting/time/timeSyncModel.js";

function profile() {
  return {
    rowCount: 2,
    columns: [
      {
        name: "reportedAt",
        type: "temporal",
        temporal: {
          values: ["2027-05-01", "2027-05-02"],
          diagnostics: [],
          parsingMetadata: {
            interpretation: "temporal",
            format: "YYYY-MM-DD",
            timezone: "date-only",
          },
        },
      },
      {
        name: "value",
        type: "numeric",
        values: [10, 12],
      },
    ],
  };
}

const loadedRows = [
  { reportedAt: "2027-05-01", value: 10 },
  { reportedAt: "2027-05-02", value: 12 },
];

function synchronizedState() {
  let state = createWizardState({
    timeSyncGroups: [{
      id: "exercise-clock",
      name: "Exercise clock",
      primaryClock: {
        sourceId: "exercise-data",
        timeField: "reportedAt",
      },
      matching: { policy: "exact" },
      members: [{
        chartId: "exercise-trend",
        timeRole: "observation",
      }],
    }],
    loadedData: {
      "exercise-data": loadedRows,
    },
    profiles: {
      "exercise-data": profile(),
    },
  });
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "line",
    chart: {
      id: "exercise-trend",
      title: "Exercise trend",
    },
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "exercise-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "measurements",
    value: [{ field: "value", axis: "primary" }],
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "observation",
    value: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  });
  return reduceWizardState(state, {
    type: "updateChart",
    path: ["interaction", "timeSync"],
    value: { groupId: "exercise-clock" },
  });
}

test("every wizard tab is directly navigable before prerequisites are complete", () => {
  const initial = createWizardState();
  const next = reduceWizardState(initial, {
    type: "navigate",
    step: "style",
  });

  assert.equal(next.activeStep, "style");
  assert.equal(initial.activeStep, "type");
  assert.throws(
    () => reduceWizardState(initial, {
      type: "navigate",
      step: "not-a-step",
    }),
    /unknown wizard step/i,
  );
});

test("schema roles update immutably without a chart-type branch", () => {
  for (const fixture of [
    {
      typeId: "line",
      roleId: "measurements",
      value: [{ field: "value", axis: "secondary" }],
    },
    {
      typeId: "pie",
      roleId: "category",
      value: { field: "status" },
    },
    {
      typeId: "deltaCard",
      roleId: "measurement",
      value: { field: "value" },
    },
  ]) {
    const selected = reduceWizardState(createWizardState(), {
      type: "selectType",
      typeId: fixture.typeId,
    });
    const next = reduceWizardState(selected, {
      type: "updateRole",
      roleId: fixture.roleId,
      value: fixture.value,
    });

    assert.notEqual(next, selected);
    assert.notEqual(next.draft, selected.draft);
    assert.deepEqual(next.draft.roles[fixture.roleId], fixture.value);
    assert.equal(selected.draft.roles[fixture.roleId], undefined);
  }
});

test("clear-source and close actions require explicit confirmation", () => {
  let state = reduceWizardState(createWizardState(), {
    type: "selectType",
    typeId: "line",
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "exercise-data",
  });
  const requestedClear = reduceWizardState(state, {
    type: "requestClearSource",
  });
  const canceled = reduceWizardState(requestedClear, {
    type: "cancelConfirmation",
  });
  const requestedClose = reduceWizardState(canceled, {
    type: "requestClose",
  });

  assert.equal(requestedClear.confirmation, "clearSource");
  assert.equal(requestedClear.draft.sourceId, "exercise-data");
  assert.equal(canceled.confirmation, null);
  assert.equal(requestedClose.confirmation, "discardChart");
  assert.equal(requestedClose.closed, false);
  assert.equal(
    reduceWizardState(requestedClose, { type: "confirmClose" }).closed,
    true,
  );
});

test("confirming source removal clears incompatible role assignments immutably", () => {
  let state = reduceWizardState(createWizardState(), {
    type: "selectType",
    typeId: "line",
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "exercise-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "measurements",
    value: [{ field: "value" }],
  });
  const requested = reduceWizardState(state, {
    type: "requestClearSource",
  });
  const cleared = reduceWizardState(requested, {
    type: "confirmClearSource",
  });

  assert.equal(cleared.draft.sourceId, null);
  assert.deepEqual(cleared.draft.roles, {});
  assert.equal(cleared.source, null);
  assert.equal(cleared.confirmation, null);
  assert.equal(requested.draft.sourceId, "exercise-data");
  assert.deepEqual(requested.draft.roles, {
    measurements: [{ field: "value" }],
  });
});

test("a group-member matching edit is immutable and validates the whole group collection", () => {
  const state = synchronizedState();
  const next = reduceWizardState(state, {
    type: "updateTimeSyncMember",
    target: {
      groupId: "exercise-clock",
      chartId: "exercise-trend",
      property: "matching",
    },
    value: {
      policy: "nearest",
      toleranceMs: 3_600_000,
    },
  });

  assert.notEqual(next.timeSyncGroups, state.timeSyncGroups);
  assert.notEqual(
    next.timeSyncGroups[0].members,
    state.timeSyncGroups[0].members,
  );
  assert.equal(
    state.timeSyncGroups[0].members[0].matching,
    undefined,
  );
  assert.deepEqual(next.timeSyncGroups[0].members[0].matching, {
    policy: "nearest",
    toleranceMs: 3_600_000,
  });
  assert.doesNotThrow(() => validateTimeSyncGroups(next.timeSyncGroups, {
    charts: [next.draft],
    loadedData: next.loadedData,
    profiles: next.profiles,
  }));
});

test("invalid member edits fail before malformed groups enter wizard state", () => {
  const state = synchronizedState();

  assert.throws(
    () => reduceWizardState(state, {
      type: "updateTimeSyncMember",
      target: {
        groupId: "exercise-clock",
        chartId: "exercise-trend",
        property: "matching",
      },
      value: { policy: "nearest" },
    }),
    /nearest.*toleranceMs/i,
  );
  assert.equal(
    state.timeSyncGroups[0].members[0].matching,
    undefined,
  );
});

test("finalization normalizes the chart and returns group edits separately", () => {
  const synchronized = synchronizedState();
  const state = reduceWizardState(synchronized, {
    type: "updateTimeSyncMember",
    target: {
      groupId: "exercise-clock",
      chartId: "exercise-trend",
      property: "matching",
    },
    value: { policy: "lastKnown" },
  });
  const result = finalizeWizardDraft(state);

  assert.doesNotThrow(() => validateChartInstance(result.chart, {
    columnTypes: new Map(
      profile().columns.map((column) => [column.name, column]),
    ),
  }));
  assert.deepEqual(result.chart.interaction.timeSync, {
    groupId: "exercise-clock",
  });
  assert.equal("temporalMatch" in result.chart.transformations, false);
  assert.equal(
    result.timeSyncGroups[0].members[0].matching.policy,
    "lastKnown",
  );
  assert.notEqual(result.chart, state.draft);
  assert.notEqual(result.timeSyncGroups, state.timeSyncGroups);
});

test("unrelated populated synchronization groups validate against authoritative existing charts", () => {
  const existing = createChartDraft("line", {
    id: "existing-trend",
    title: "Existing trend",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: { timeSync: { groupId: "exercise-clock" } },
  });
  let state = createWizardState({
    charts: [existing],
    timeSyncGroups: [{
      id: "exercise-clock",
      name: "Exercise clock",
      primaryClock: {
        sourceId: "exercise-data",
        timeField: "reportedAt",
      },
      matching: { policy: "exact" },
      members: [{
        chartId: "existing-trend",
        timeRole: "observation",
      }],
    }],
    loadedData: { "exercise-data": loadedRows },
    profiles: { "exercise-data": profile() },
  });
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "kpi",
    chart: { id: "new-kpi", title: "Current value" },
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "exercise-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "value",
    value: { field: "value" },
  });

  const result = finalizeWizardDraft(state);
  assert.equal(result.chart.interaction.timeSync, null);
  assert.equal(result.timeSyncGroups[0].members[0].chartId, "existing-trend");
  assert.equal(state.charts[0].id, "existing-trend");
});

test("changing chart type keeps logical identity and removes only the draft's stale group membership", () => {
  const existing = createChartDraft("line", {
    id: "existing-trend",
    title: "Existing trend",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: { timeSync: { groupId: "exercise-clock" } },
  });
  const categoryRows = [
    { status: "Ready", value: 3 },
    { status: "Delayed", value: 1 },
  ];
  let state = createWizardState({
    charts: [existing],
    timeSyncGroups: [{
      id: "exercise-clock",
      name: "Exercise clock",
      primaryClock: {
        sourceId: "exercise-data",
        timeField: "reportedAt",
      },
      matching: { policy: "exact" },
      members: [
        { chartId: "existing-trend", timeRole: "observation" },
        { chartId: "changing-chart", timeRole: "observation" },
      ],
    }],
    loadedData: {
      "exercise-data": loadedRows,
      "category-data": categoryRows,
    },
    profiles: {
      "exercise-data": profile(),
      "category-data": profileDataset(categoryRows),
    },
  });
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "line",
    chart: { id: "changing-chart", title: "Changing chart" },
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "exercise-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "measurements",
    value: [{ field: "value", axis: "primary" }],
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "observation",
    value: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  });
  state = reduceWizardState(state, {
    type: "updateChart",
    path: ["interaction", "timeSync"],
    value: { groupId: "exercise-clock" },
  });

  const beforeTypeChange = state;
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "pie",
    chart: { title: "Readiness mix" },
  });

  assert.equal(state.draft.id, "changing-chart");
  assert.equal(state.draft.interaction.timeSync, null);
  assert.deepEqual(
    state.timeSyncGroups[0].members.map(({ chartId }) => chartId),
    ["existing-trend"],
  );
  assert.equal(beforeTypeChange.timeSyncGroups[0].members.length, 2);

  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "category-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "category",
    value: { field: "status" },
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "value",
    value: { field: "value" },
  });
  assert.doesNotThrow(() => finalizeWizardDraft(state));
});

test("changing the sole member's type preserves the empty group definition", () => {
  const existing = createChartDraft("line", {
    id: "unrelated-trend",
    title: "Unrelated trend",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: { timeSync: { groupId: "unrelated-clock" } },
  });
  const draftGroup = {
    id: "draft-clock",
    name: "Draft clock",
    primaryClock: {
      sourceId: "exercise-data",
      timeField: "reportedAt",
    },
    matching: {
      policy: "nearest",
      toleranceMs: 86_400_000,
    },
    members: [{
      chartId: "changing-chart",
      timeRole: "observation",
      matching: { policy: "lastKnown" },
    }],
  };
  const unrelatedGroup = {
    id: "unrelated-clock",
    name: "Unrelated clock",
    primaryClock: {
      sourceId: "exercise-data",
      timeField: "reportedAt",
    },
    matching: { policy: "exact" },
    members: [{
      chartId: "unrelated-trend",
      timeRole: "observation",
    }],
  };
  const categoryRows = [
    { status: "Ready", value: 3 },
    { status: "Delayed", value: 1 },
  ];
  let state = createWizardState({
    charts: [existing],
    timeSyncGroups: [draftGroup, unrelatedGroup],
    loadedData: {
      "exercise-data": loadedRows,
      "category-data": categoryRows,
    },
    profiles: {
      "exercise-data": profile(),
      "category-data": profileDataset(categoryRows),
    },
  });
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "line",
    chart: { id: "changing-chart", title: "Changing chart" },
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "exercise-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "measurements",
    value: [{ field: "value", axis: "primary" }],
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "observation",
    value: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  });
  state = reduceWizardState(state, {
    type: "updateChart",
    path: ["interaction", "timeSync"],
    value: { groupId: "draft-clock" },
  });
  const beforeTypeChange = state;

  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "pie",
    chart: { title: "Readiness mix" },
  });

  assert.equal(state.timeSyncGroups.length, 2);
  assert.deepEqual(state.timeSyncGroups[0], {
    ...beforeTypeChange.timeSyncGroups[0],
    members: [],
  });
  assert.equal(
    state.timeSyncGroups[1],
    beforeTypeChange.timeSyncGroups[1],
  );
  assert.equal(beforeTypeChange.timeSyncGroups[0].members.length, 1);

  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "category-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "category",
    value: { field: "status" },
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "value",
    value: { field: "value" },
  });
  const result = finalizeWizardDraft(state);
  assert.equal(result.timeSyncGroups[0].id, "draft-clock");
  assert.deepEqual(result.timeSyncGroups[0].members, []);
  assert.equal(result.timeSyncGroups[1].members[0].chartId, "unrelated-trend");
});

test("empty authoring groups do not make malformed member collections valid", () => {
  const state = createWizardState({ timeSyncGroups: [] });

  assert.throws(
    () => reduceWizardState(state, {
      type: "updateTimeSyncGroups",
      value: [{
        id: "malformed-clock",
        name: "Malformed clock",
        primaryClock: {
          sourceId: "exercise-data",
          timeField: "reportedAt",
        },
        matching: { policy: "exact" },
        members: null,
      }],
    }),
    /members must be a non-empty array/i,
  );
});

test("compatible source changes apply immediately and preserve mappings immutably", () => {
  const firstRows = [
    { period: "May", capacity: 4, region: "North" },
  ];
  const nextRows = [
    { period: "June", capacity: 6, region: "South" },
  ];
  const firstProfile = profileDataset(firstRows);
  const nextProfile = profileDataset(nextRows);
  let state = createWizardState({
    loadedData: { first: firstRows, next: nextRows },
    profiles: { first: firstProfile, next: nextProfile },
  });
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "line",
    chart: { id: "source-switch", title: "Capacity" },
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "first",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "measurements",
    value: [{ field: "capacity", axis: "primary" }],
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "observation",
    value: { field: "period" },
  });
  state = reduceWizardState(state, {
    type: "updateChart",
    path: ["transformations", "filters"],
    value: [{ field: "region", operator: "equals", value: "North" }],
  });
  const before = structuredClone(state);
  const next = reduceWizardState(state, {
    type: "requestSourceChange",
    sourceId: "next",
    source: null,
    rows: nextRows,
    profile: nextProfile,
  });

  assert.equal(next.confirmation, null);
  assert.equal(next.pendingSourceChange, null);
  assert.equal(next.draft.sourceId, "next");
  assert.deepEqual(next.draft.roles, state.draft.roles);
  assert.deepEqual(
    next.draft.transformations.filters,
    state.draft.transformations.filters,
  );
  assert.deepEqual(state, before);
});

test("incompatible source changes require explicit confirmation and cancellation preserves the draft", () => {
  const firstRows = [
    { period: "May", capacity: 4, region: "North" },
  ];
  const incompatibleRows = [
    { status: "Ready", total: 6 },
  ];
  let state = createWizardState({
    loadedData: { first: firstRows },
    profiles: { first: profileDataset(firstRows) },
  });
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "line",
    chart: { id: "source-switch", title: "Capacity" },
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "first",
    source: { kind: "dataset", url: "first.csv" },
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "measurements",
    value: [{ field: "capacity", axis: "primary" }],
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "observation",
    value: { field: "period" },
  });
  state = reduceWizardState(state, {
    type: "updateChart",
    path: ["transformations", "filters"],
    value: [{ field: "region", operator: "equals", value: "North" }],
  });
  const draft = state.draft;
  const source = state.source;
  const requested = reduceWizardState(state, {
    type: "requestSourceChange",
    sourceId: "replacement",
    source: {
      kind: "dataset",
      type: "uploadedCsv",
      fileName: "replacement.csv",
      csvText: "status,total\nReady,6\n",
    },
    rows: incompatibleRows,
    profile: profileDataset(incompatibleRows),
  });

  assert.equal(requested.confirmation, "changeSource");
  assert.equal(requested.draft, draft);
  assert.equal(requested.source, source);
  assert.match(requested.pendingSourceChange.message, /2 data roles/i);
  assert.match(requested.pendingSourceChange.message, /1 filter/i);

  const canceled = reduceWizardState(requested, {
    type: "cancelConfirmation",
  });
  assert.equal(canceled.draft, draft);
  assert.equal(canceled.source, source);
  assert.equal(canceled.pendingSourceChange, null);

  const confirmed = reduceWizardState(requested, {
    type: "confirmSourceChange",
  });
  assert.equal(confirmed.draft.sourceId, "replacement");
  assert.deepEqual(confirmed.draft.roles, {});
  assert.deepEqual(confirmed.draft.transformations.filters, []);
  assert.equal(confirmed.source.fileName, "replacement.csv");
  assert.deepEqual(confirmed.loadedData.replacement, incompatibleRows);
  assert.notEqual(confirmed.loadedData.replacement, incompatibleRows);
  assert.equal(state.draft.sourceId, "first");
});
