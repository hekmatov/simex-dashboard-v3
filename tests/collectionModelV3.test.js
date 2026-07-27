import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCollectionSettings } from "../src/charting/collection/collectionModel.js";
import { evaluatePriorityExpression } from "../src/charting/collection/priorityExpression.js";
import { rankCollection } from "../src/charting/collection/rankCollection.js";

const builtInItems = [
  {
    entityId: "clinic-c",
    label: "Clinic C",
    displayed: 6,
    comparison: 9,
    target: 10,
    delta: { absolute: -3, percentage: -33.333 },
    riskScore: 4,
  },
  {
    entityId: "clinic-a",
    label: "Clinic A",
    value: 12,
    target: 10,
    absoluteDelta: 2,
    percentageDelta: 20,
    riskScore: 8,
  },
  {
    entityId: "clinic-b",
    label: "Clinic B",
    actual: 9,
    target: 2,
    delta: { absolute: 1, percentage: 11.111 },
    riskScore: 6,
  },
];

function settings(ranking, collection = {}) {
  return normalizeCollectionSettings({ ...collection, ranking });
}

function ids(items) {
  return items.map(({ entityId }) => entityId);
}

test("documented defaults are detached, deeply immutable, and do not mutate input", () => {
  const input = {};
  const normalized = normalizeCollectionSettings(input);

  assert.deepEqual(normalized, {
    layout: "fixed",
    rows: 2,
    columns: 2,
    gap: 16,
    overflow: "manualPages",
    ranking: { mode: "fixed" },
    carousel: {
      intervalMs: 10000,
      loop: true,
      pauseOnHover: true,
      transition: "none",
    },
    playback: {
      rerank: true,
      pauseCarousel: true,
    },
  });
  assert.deepEqual(input, {});
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.ranking));
  assert.ok(Object.isFrozen(normalized.carousel));
  assert.ok(Object.isFrozen(normalized.playback));
  assert.throws(() => { normalized.rows = 4; }, TypeError);
});

test("every layout composes independently with every ranking mode", () => {
  const rankings = [
    { mode: "fixed" },
    { mode: "sort", field: "label", direction: "desc" },
    { mode: "priority", method: "furthestFromTarget", stabilize: true },
  ];

  for (const layout of ["fixed", "scroll", "carousel"]) {
    for (const ranking of rankings) {
      const normalized = normalizeCollectionSettings({ layout, ranking });
      assert.equal(normalized.layout, layout);
      assert.equal(normalized.ranking.mode, ranking.mode);
    }
  }
});

test("layout-aware overflow defaults and legal combinations are enforced", () => {
  assert.equal(normalizeCollectionSettings({ layout: "fixed" }).overflow, "manualPages");
  assert.equal(normalizeCollectionSettings({ layout: "scroll" }).overflow, "scroll");
  assert.equal(normalizeCollectionSettings({ layout: "carousel" }).overflow, "autoRotate");
  assert.equal(normalizeCollectionSettings({ layout: "fixed", overflow: "limit" }).overflow, "limit");
  assert.equal(normalizeCollectionSettings({ layout: "scroll", overflow: "limit" }).overflow, "limit");
  assert.equal(normalizeCollectionSettings({ layout: "carousel", overflow: "limit" }).overflow, "limit");

  assert.throws(
    () => normalizeCollectionSettings({ layout: "fixed", overflow: "scroll" }),
    /overflow.*fixed/i,
  );
  assert.throws(
    () => normalizeCollectionSettings({ layout: "scroll", overflow: "autoRotate" }),
    /overflow.*scroll/i,
  );
  assert.throws(
    () => normalizeCollectionSettings({ layout: "carousel", overflow: "manualPages" }),
    /overflow.*carousel/i,
  );
});

test("settings reject unknown keys, invalid values, and out-of-bound numbers", () => {
  const invalidInputs = [
    [{ surprise: true }, /Unknown collection settings property "surprise"/],
    [{ layout: "priority" }, /layout/i],
    [{ rows: 0 }, /rows.*between 1 and 4/i],
    [{ rows: 1.5 }, /rows.*between 1 and 4/i],
    [{ columns: 5 }, /columns.*between 1 and 4/i],
    [{ gap: -1 }, /gap.*between 0 and 64/i],
    [{ gap: Number.POSITIVE_INFINITY }, /gap.*between 0 and 64/i],
    [{ ranking: { mode: "fixed", extra: true } }, /Unknown collection ranking.*property "extra"/],
    [{ carousel: { intervalMs: 4999 } }, /intervalMs.*at least 5000/i],
    [{ carousel: { intervalMs: 5000.5 } }, /intervalMs.*integer/i],
    [{ carousel: { loop: "yes" } }, /loop.*boolean/i],
    [{ carousel: { pauseOnHover: 1 } }, /pauseOnHover.*boolean/i],
    [{ carousel: { transition: "zoom" } }, /transition/i],
    [{ carousel: { surprise: true } }, /Unknown collection carousel property "surprise"/],
    [{ playback: { rerank: "yes" } }, /rerank.*boolean/i],
    [{ playback: { pauseCarousel: 1 } }, /pauseCarousel.*boolean/i],
    [{ playback: { surprise: true } }, /Unknown collection playback property "surprise"/],
  ];

  for (const [input, expected] of invalidInputs) {
    assert.throws(() => normalizeCollectionSettings(input), expected);
  }
});

test("ranking modes accept only their documented strict shapes", () => {
  assert.deepEqual(
    normalizeCollectionSettings({
      ranking: { mode: "sort", field: "severity", direction: "desc", stabilize: true },
    }).ranking,
    { mode: "sort", field: "severity", direction: "desc", stabilize: true },
  );
  assert.deepEqual(
    normalizeCollectionSettings({
      ranking: { mode: "priority", method: "riskScore" },
    }).ranking,
    { mode: "priority", method: "riskScore", stabilize: false },
  );

  const invalidRankings = [
    [{ mode: "unknown" }, /ranking mode/i],
    [{ mode: "sort" }, /field.*required/i],
    [{ mode: "sort", field: " " }, /field.*non-empty/i],
    [{ mode: "sort", field: "value", direction: "up" }, /direction.*asc or desc/i],
    [{ mode: "fixed", field: "value" }, /fixed.*property "field"/i],
    [{ mode: "priority" }, /method or expression/i],
    [{ mode: "priority", method: "quorumRecommendation" }, /priority method/i],
    [{
      mode: "priority",
      method: "riskScore",
      expression: { operator: "weightedSum", terms: [{ metric: "riskScore", weight: 1 }] },
    }, /either method or expression/i],
    [{ mode: "priority", field: "value" }, /priority.*property "field"/i],
  ];

  for (const [ranking, expected] of invalidRankings) {
    assert.throws(() => normalizeCollectionSettings({ ranking }), expected);
  }
});

test("safe weighted sums evaluate only declared finite metrics", () => {
  const expression = {
    operator: "weightedSum",
    terms: [
      { metric: "riskScore", weight: 2 },
      { metric: "absoluteDelta", weight: 1 },
      { metric: "distanceFromTarget", weight: -0.5 },
    ],
  };
  const metrics = {
    current: 7,
    absoluteDelta: 3,
    percentageDelta: 25,
    target: 10,
    distanceFromTarget: 3,
    riskScore: 4,
  };

  assert.equal(evaluatePriorityExpression(expression, metrics), 9.5);
  assert.deepEqual(expression.terms[0], { metric: "riskScore", weight: 2 });
  assert.deepEqual(metrics, {
    current: 7,
    absoluteDelta: 3,
    percentageDelta: 25,
    target: 10,
    distanceFromTarget: 3,
    riskScore: 4,
  });
});

test("priority expressions reject executable, inherited, unknown, and unbounded structures", () => {
  const inheritedExpression = Object.create({
    operator: "weightedSum",
    terms: [{ metric: "riskScore", weight: 1 }],
  });
  const termsWithHiddenSource = [{ metric: "riskScore", weight: 1 }];
  Object.defineProperty(termsWithHiddenSource, "source", {
    value: "return process.env",
  });
  const accessorTerm = {};
  Object.defineProperty(accessorTerm, "metric", {
    enumerable: true,
    get() { throw new Error("must not execute"); },
  });
  accessorTerm.weight = 1;

  const invalidExpressions = [
    [{
      operator: "javascript",
      terms: [{ metric: "riskScore", weight: 1 }],
    }, /operator/i],
    [{ operator: "weightedSum", source: "return 1", terms: [] }, /property "source"/],
    [{ operator: "weightedSum", terms: [] }, /at least one term/i],
    [{
      operator: "weightedSum",
      terms: Array.from({ length: 65 }, () => ({ metric: "riskScore", weight: 1 })),
    }, /at most 64 terms/i],
    [{ operator: "weightedSum", terms: termsWithHiddenSource }, /terms property "source"/i],
    [{ operator: "weightedSum", terms: [{ metric: "unknown", weight: 1 }] }, /Unknown priority metric/],
    [{ operator: "weightedSum", terms: [{ metric: "riskScore", weight: Number.NaN }] }, /weight.*finite/i],
    [{ operator: "weightedSum", terms: [{ metric: "riskScore", weight: () => 1 }] }, /weight.*finite/i],
    [{ operator: "weightedSum", terms: [{ metric: "riskScore", weight: 1, source: "x" }] }, /property "source"/],
    [inheritedExpression, /plain object with own fields/i],
    [{ operator: "weightedSum", terms: [accessorTerm] }, /data properties/i],
  ];

  for (const [expression, expected] of invalidExpressions) {
    assert.throws(() => evaluatePriorityExpression(expression, { riskScore: 4 }), expected);
  }
  assert.throws(
    () => evaluatePriorityExpression(
      { operator: "weightedSum", terms: [{ metric: "riskScore", weight: 2 }] },
      { riskScore: Number.POSITIVE_INFINITY },
    ),
    /metric "riskScore".*finite/i,
  );
  assert.throws(
    () => evaluatePriorityExpression(
      {
        operator: "weightedSum",
        terms: [
          { metric: "riskScore", weight: Number.MAX_VALUE },
          { metric: "absoluteDelta", weight: Number.MAX_VALUE },
        ],
      },
      { riskScore: Number.MAX_VALUE, absoluteDelta: Number.MAX_VALUE },
    ),
    /finite result/i,
  );
});

test("ranking requires unique stable non-empty entity identifiers", () => {
  const fixed = settings({ mode: "fixed" });

  assert.throws(() => rankCollection([{ label: "Missing" }], fixed), /entityId.*non-empty string/i);
  assert.throws(() => rankCollection([{ entityId: " " }], fixed), /entityId.*non-empty string/i);
  assert.throws(
    () => rankCollection([{ entityId: "a" }, { entityId: "a" }], fixed),
    /Duplicate collection entityId "a"/,
  );
});

test("fixed ranking preserves order without mutating items, settings, or previous order", () => {
  const items = builtInItems.map((item) => structuredClone(item));
  const originalItems = structuredClone(items);
  const fixed = settings({ mode: "fixed" });
  const previousOrder = ["clinic-b", "clinic-a", "clinic-c"];
  const originalSettings = structuredClone(fixed);

  const ranked = rankCollection(items, fixed, previousOrder);

  assert.deepEqual(ids(ranked), ["clinic-c", "clinic-a", "clinic-b"]);
  assert.notEqual(ranked, items);
  assert.ok(Object.isFrozen(ranked));
  assert.deepEqual(items, originalItems);
  assert.deepEqual(fixed, originalSettings);
  assert.deepEqual(previousOrder, ["clinic-b", "clinic-a", "clinic-c"]);
});

test("field sorting supports both directions, direct own fields, missing-last, and deterministic ties", () => {
  const items = [
    { entityId: "z", label: "Zulu", severity: 2 },
    { entityId: "a", label: "Alpha", severity: 2 },
    { entityId: "m", label: "Missing" },
    { entityId: "n", label: "Nonfinite", severity: Number.NaN },
    Object.assign(Object.create({ severity: -100 }), { entityId: "i", label: "Inherited" }),
    { entityId: "h", label: "High", severity: 9 },
  ];

  assert.deepEqual(
    ids(rankCollection(items, settings({ mode: "sort", field: "severity", direction: "asc" }))),
    ["a", "z", "h", "i", "m", "n"],
  );
  assert.deepEqual(
    ids(rankCollection(items, settings({ mode: "sort", field: "severity", direction: "desc" }))),
    ["h", "a", "z", "i", "m", "n"],
  );
});

test("all approved operational methods rank target item shapes deterministically", () => {
  const expectedByMethod = {
    highestCurrent: ["clinic-a", "clinic-b", "clinic-c"],
    lowestCurrent: ["clinic-c", "clinic-b", "clinic-a"],
    largestAbsoluteChange: ["clinic-c", "clinic-a", "clinic-b"],
    largestPercentageChange: ["clinic-c", "clinic-a", "clinic-b"],
    furthestFromTarget: ["clinic-b", "clinic-c", "clinic-a"],
    riskScore: ["clinic-a", "clinic-b", "clinic-c"],
  };

  for (const [method, expected] of Object.entries(expectedByMethod)) {
    const priority = settings({ mode: "priority", method });
    const first = rankCollection(builtInItems, priority);
    const second = rankCollection(builtInItems, priority);
    assert.deepEqual(ids(first), expected, method);
    assert.deepEqual(ids(second), expected, `${method} repeated`);
  }
});

test("unavailable priority scores are always last and ties use text then entityId", () => {
  const items = [
    { entityId: "b", label: "Same", value: 5 },
    { entityId: "a", label: "Same", value: 5 },
    { entityId: "c", label: "Alpha", value: 5 },
    { entityId: "missing", label: "Missing", value: null },
    { entityId: "nan", label: "NaN", value: Number.NaN },
  ];

  assert.deepEqual(
    ids(rankCollection(items, settings({ mode: "priority", method: "highestCurrent" }))),
    ["c", "a", "b", "missing", "nan"],
  );
});

test("stabilization uses previous order only for true score ties", () => {
  const items = [
    { entityId: "a", label: "Alpha", riskScore: 3 },
    { entityId: "b", label: "Beta", riskScore: 9 },
    { entityId: "c", label: "Charlie", riskScore: 3 },
  ];
  const priority = settings({ mode: "priority", method: "riskScore", stabilize: true });

  assert.deepEqual(
    ids(rankCollection(items, priority, ["c", "a", "b"])),
    ["b", "c", "a"],
  );
});

test("safe custom expressions rank by finite weighted score and place unavailable scores last", () => {
  const expression = {
    operator: "weightedSum",
    terms: [
      { metric: "riskScore", weight: 2 },
      { metric: "absoluteDelta", weight: 1 },
    ],
  };
  const priority = settings({ mode: "priority", expression });
  const items = [
    { entityId: "a", label: "Alpha", riskScore: 3, absoluteDelta: 2 },
    { entityId: "b", label: "Beta", riskScore: 1, absoluteDelta: 9 },
    { entityId: "c", label: "Missing", riskScore: 10 },
  ];

  assert.deepEqual(ids(rankCollection(items, priority)), ["b", "a", "c"]);
  assert.notEqual(priority.ranking.expression, expression);
  assert.ok(Object.isFrozen(priority.ranking.expression));
  assert.ok(Object.isFrozen(priority.ranking.expression.terms));
  assert.ok(Object.isFrozen(priority.ranking.expression.terms[0]));
});
