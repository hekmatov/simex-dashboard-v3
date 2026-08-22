import assert from "node:assert/strict";
import test from "node:test";

import { validateChartMapping } from "../src/charting/forms/chartMapping.js";
import { applyChartPreparation } from "../src/charting/forms/chartPreparation.js";

test("schema roles enforce required, optional, single, and multiple cardinality", () => {
  const profile = profileFixture();
  const missing = validateChartMapping({
    chartTypeId: "line",
    profile,
    mapping: { measurements: [] },
    preparation: acceptedPreparation(),
  });
  assert.equal(missing.valid, false);
  assert.deepEqual(missing.errors.map(({ code, roleId }) => [code, roleId]), [
    ["ROLE_CARDINALITY_MIN", "measurements"],
    ["ROLE_CARDINALITY_MIN", "observation"],
  ]);

  const tooMany = validateChartMapping({
    chartTypeId: "line",
    profile,
    mapping: {
      measurements: ["cases"],
      observation: ["date", "region"],
    },
    preparation: acceptedPreparation(),
  });
  assert.equal(tooMany.valid, false);
  assert.equal(tooMany.errors.find(({ roleId }) => roleId === "observation").code, "ROLE_CARDINALITY_MAX");

  const valid = validateChartMapping({
    chartTypeId: "line",
    profile,
    mapping: {
      measurements: ["cases", "deaths"],
      observation: "date",
      cluster: "region",
    },
    preparation: acceptedPreparation(),
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.value.roles.measurements.cardinality, "multiple");
  assert.equal(valid.value.roles.observation.cardinality, "single");
  assert.equal(valid.value.roles.label.required, false);
});

test("field type, unit, and geography compatibility identify the owning role", () => {
  const profile = profileFixture();
  const incompatible = validateChartMapping({
    chartTypeId: "line",
    profile,
    mapping: {
      measurements: [{ field: "cases", unit: "percent" }],
      observation: "cases",
    },
    preparation: acceptedPreparation(),
  });
  assert.deepEqual(incompatible.errors.map(({ code }) => code), [
    "FIELD_UNIT_INCOMPATIBLE",
    "FIELD_TYPE_INCOMPATIBLE",
  ]);

  const map = validateChartMapping({
    chartTypeId: "mapScatter",
    profile,
    mapping: { geography: "province", value: "cases", time: "date" },
    preparation: acceptedPreparation(),
  });
  assert.equal(map.valid, true);
  assert.equal(map.value.roles.geography.fields[0], "province");
});

test("defaults remain explainable and ambiguous or consequential suggestions block until accepted", () => {
  const result = validateChartMapping({
    chartTypeId: "line",
    profile: profileFixture(),
    mapping: {
      measurements: {
        fields: ["cases"],
        origin: "suggestion",
        basis: "Only compatible numeric field selected by the profile",
        accepted: true,
      },
      observation: {
        field: "date",
        origin: "suggestion",
        basis: "Only temporal field",
        accepted: false,
      },
    },
    preparation: acceptedPreparation(),
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "SUGGESTION_ACCEPTANCE_REQUIRED");
  assert.equal(result.errors[0].roleId, "observation");
  assert.deepEqual(result.value.defaultLedger.map(({ path, origin, basis, accepted }) => ({ path, origin, basis, accepted })), [
    {
      path: "mapping.measurements",
      origin: "suggestion",
      basis: "Only compatible numeric field selected by the profile",
      accepted: true,
    },
    {
      path: "mapping.observation",
      origin: "suggestion",
      basis: "Only temporal field",
      accepted: false,
    },
  ]);
});

test("issue-triggered missing and duplicate rules require explicit acceptance", () => {
  const profile = profileFixture();
  const unresolved = validateChartMapping({
    chartTypeId: "line",
    profile,
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: {
      rows: sourceRows(),
      duplicateTimeCount: 1,
      missingValues: { rule: "drop", accepted: false, affectedCount: 1 },
      duplicates: { rule: "latest", accepted: false, affectedCount: 1 },
    },
  });
  assert.deepEqual(unresolved.errors.map(({ code }) => code), [
    "MISSING_VALUE_RULE_ACCEPTANCE_REQUIRED",
    "DUPLICATE_TIME_RULE_ACCEPTANCE_REQUIRED",
  ]);

  const resolved = validateChartMapping({
    chartTypeId: "line",
    profile,
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: acceptedPreparation(),
  });
  assert.equal(resolved.valid, true);
  assert.equal(resolved.value.preparation.missingValues.rule, "drop");
  assert.equal(resolved.value.preparation.duplicates.rule, "latest");
  assert.equal(resolved.value.preparationReview.length, 2);
});

test("preparation recomputes effective output and blocks a causally named empty result", () => {
  const prepared = applyChartPreparation({
    rows: sourceRows(),
    mappedFieldIds: ["date", "cases"],
    timeField: "date",
    preparation: {
      filters: [{ field: "region", operator: "equals", value: "Missing" }],
      missingValues: { rule: "drop", accepted: true },
      duplicates: { rule: "latest", accepted: true },
    },
  });
  assert.equal(prepared.effectiveOutputCount, 0);
  assert.equal(prepared.errors[0].code, "EFFECTIVE_OUTPUT_EMPTY");
  assert.equal(prepared.errors[0].owner, "filters");

  const validated = validateChartMapping({
    chartTypeId: "line",
    profile: profileFixture(),
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: {
      ...acceptedPreparation(),
      filters: [{ field: "region", operator: "equals", value: "Missing" }],
    },
  });
  assert.equal(validated.valid, false);
  assert.equal(validated.effectiveOutputCount, 0);
  assert.equal(validated.errors.at(-1).code, "EFFECTIVE_OUTPUT_EMPTY");
});

test("zero or multiple Chrono Group memberships preserve only group identity and time field", () => {
  const zero = validateChartMapping({
    chartTypeId: "line",
    profile: profileFixture(),
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: { ...acceptedPreparation(), chronoGroupMemberships: [] },
  });
  assert.equal(zero.valid, true);
  assert.deepEqual(zero.value.chronoGroupMemberships, []);

  const multiple = validateChartMapping({
    chartTypeId: "line",
    profile: profileFixture(),
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: {
      ...acceptedPreparation(),
      chronoGroupMemberships: [
        { groupId: "winter", timeField: "date" },
        { groupId: "executive", timeField: "date" },
      ],
    },
  });
  assert.equal(multiple.valid, true);
  assert.deepEqual(multiple.value.chronoGroupMemberships, [
    { groupId: "winter", timeField: "date" },
    { groupId: "executive", timeField: "date" },
  ]);
  assert.equal("matching" in multiple.value, false);
  assert.equal("fallback" in multiple.value, false);

  const policyLeak = validateChartMapping({
    chartTypeId: "line",
    profile: profileFixture(),
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: {
      ...acceptedPreparation(),
      chronoGroupMemberships: [{ groupId: "winter", timeField: "date", matching: "Interpolate" }],
    },
  });
  assert.equal(policyLeak.valid, false);
  assert.equal(policyLeak.errors[0].code, "TEMPORAL_POLICY_NOT_OWNED");

  const topLevelPolicyLeak = validateChartMapping({
    chartTypeId: "line",
    profile: profileFixture(),
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: {
      ...acceptedPreparation(),
      matchingPolicy: "Interpolate",
    },
  });
  assert.equal(topLevelPolicyLeak.valid, false);
  assert.equal(topLevelPolicyLeak.errors[0].code, "TEMPORAL_POLICY_NOT_OWNED");
});

function acceptedPreparation() {
  return {
    rows: sourceRows(),
    duplicateTimeCount: 1,
    missingValues: { rule: "drop", accepted: true, affectedCount: 1 },
    duplicates: { rule: "latest", accepted: true, affectedCount: 1 },
    chronoGroupMemberships: [],
  };
}

function profileFixture() {
  return {
    status: "partial",
    sourceId: "observations",
    schemaRevision: "observations:7",
    rowCount: sourceRows().length,
    fields: [
      { id: "date", type: "temporal", unit: null, nullable: false },
      { id: "cases", type: "number", unit: "count", nullable: true },
      { id: "deaths", type: "number", unit: "count", nullable: false },
      { id: "region", type: "category", unit: null, nullable: false },
      { id: "province", type: "geographic", unit: null, nullable: false },
    ],
  };
}

function sourceRows() {
  return [
    { date: "2027-01-01", cases: 10, deaths: 1, region: "North", province: "DE-BE" },
    { date: "2027-01-02", cases: null, deaths: 2, region: "North", province: "DE-BE" },
    { date: "2027-01-02", cases: 14, deaths: 2, region: "South", province: "DE-BY" },
  ];
}
