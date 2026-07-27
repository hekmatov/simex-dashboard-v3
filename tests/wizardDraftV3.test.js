import assert from "node:assert/strict";
import test from "node:test";

import {
  createWizardState,
  finalizeWizardDraft,
  reduceWizardState,
} from "../src/charting/forms/wizardDraft.js";
import { validateChartInstance } from "../src/charting/config/chartConfigV3.js";
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
