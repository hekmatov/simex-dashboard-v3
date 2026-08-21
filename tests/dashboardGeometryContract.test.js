import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CANONICAL_KINDS = Object.freeze([
  "page",
  "canvas",
  "grid",
  "section",
  "panel",
  "placement",
  "plot",
]);

const CENTRAL_CANVAS_KINDS = Object.freeze([
  "canvas",
  "grid",
  "section",
  "panel",
  "plot",
]);

export function canonicalDelta(viewValue, buildValue) {
  return Math.abs(viewValue - buildValue).toFixed(2);
}

export function compareCanonicalGeometry(viewGeometry, buildGeometry, expectedGeometryIds) {
  const idErrors = [];
  const requiredSingletons = new Set(["page", "canvas", "grid"]);
  const requiredCollections = new Set(["section", "panel", "placement", "plot"]);

  for (const kind of CANONICAL_KINDS) {
    const viewEntries = viewGeometry.geometry[kind] ?? [];
    const buildEntries = buildGeometry.geometry[kind] ?? [];
    const viewIds = viewEntries.map(({ id }) => id);
    const buildIds = buildEntries.map(({ id }) => id);
    const viewSet = new Set(viewIds);
    const buildSet = new Set(buildIds);
    const expectedIds = expectedGeometryIds?.[kind];

    if (expectedIds) {
      const expectedSet = new Set(expectedIds);
      if (expectedSet.size !== expectedIds.length) {
        idErrors.push(`${kind}: duplicate expected IDs`);
      }
      for (const [mode, actualIds, actualSet] of [
        ["View", viewIds, viewSet],
        ["Build", buildIds, buildSet],
      ]) {
        const missingExpected = expectedIds.filter((id) => !actualSet.has(id));
        const unexpected = actualIds.filter((id) => !expectedSet.has(id));
        if (missingExpected.length > 0) {
          idErrors.push(`${kind}: ${mode} missing expected ${missingExpected.join(", ")}`);
        }
        if (unexpected.length > 0) idErrors.push(`${kind}: ${mode} unexpected ${unexpected.join(", ")}`);
      }
    }

    if (viewSet.size !== viewIds.length) idErrors.push(`${kind}: duplicate View IDs`);
    if (buildSet.size !== buildIds.length) idErrors.push(`${kind}: duplicate Build IDs`);
    if (requiredSingletons.has(kind) && (viewIds.length !== 1 || buildIds.length !== 1)) {
      idErrors.push(`${kind}: expected one View and one Build ID, got ${viewIds.length}/${buildIds.length}`);
    }
    if (requiredCollections.has(kind) && (viewIds.length === 0 || buildIds.length === 0)) {
      idErrors.push(`${kind}: missing View or Build IDs (${viewIds.length}/${buildIds.length})`);
    }

    const missingInBuild = viewIds.filter((id) => !buildSet.has(id));
    const extraInBuild = buildIds.filter((id) => !viewSet.has(id));
    if (missingInBuild.length > 0) idErrors.push(`${kind}: missing in Build ${missingInBuild.join(", ")}`);
    if (extraInBuild.length > 0) idErrors.push(`${kind}: extra in Build ${extraInBuild.join(", ")}`);
  }

  if (idErrors.length > 0) {
    throw new Error(`Canonical ID mismatch:\n${idErrors.join("\n")}`);
  }

  const comparisons = [];
  for (const kind of CANONICAL_KINDS) {
    const buildById = new Map(
      buildGeometry.geometry[kind].map((entry) => [entry.id, entry]),
    );
    for (const view of viewGeometry.geometry[kind]) {
      const build = buildById.get(view.id);
      comparisons.push({
        kind,
        id: view.id,
        view,
        build,
        delta: {
          x: canonicalDelta(view.x, build.x),
          y: canonicalDelta(view.y, build.y),
          width: canonicalDelta(view.width, build.width),
          height: canonicalDelta(view.height, build.height),
        },
      });
    }
  }
  return comparisons;
}

export function compareCentralCanvasGeometry(viewGeometry, buildGeometry, expectedGeometryIds) {
  const idErrors = [];

  for (const kind of CENTRAL_CANVAS_KINDS) {
    const viewEntries = viewGeometry.geometry[kind] ?? [];
    const buildEntries = buildGeometry.geometry[kind] ?? [];
    const viewIds = viewEntries.map(({ id }) => id);
    const buildIds = buildEntries.map(({ id }) => id);
    const expectedIds = expectedGeometryIds?.[kind] ?? [];

    if (new Set(viewIds).size !== viewIds.length) idErrors.push(`${kind}: duplicate View IDs`);
    if (new Set(buildIds).size !== buildIds.length) idErrors.push(`${kind}: duplicate Build IDs`);
    if (viewIds.join("\u0000") !== expectedIds.join("\u0000")) {
      idErrors.push(`${kind}: View IDs do not match the fixture`);
    }
    if (buildIds.join("\u0000") !== expectedIds.join("\u0000")) {
      idErrors.push(`${kind}: Build IDs do not match the fixture`);
    }
  }

  if (idErrors.length > 0) {
    throw new Error(`Central canvas ID mismatch:\n${idErrors.join("\n")}`);
  }

  return CENTRAL_CANVAS_KINDS.flatMap((kind) => {
    const buildById = new Map(buildGeometry.geometry[kind].map((entry) => [entry.id, entry]));
    return viewGeometry.geometry[kind].map((view) => {
      const build = buildById.get(view.id);
      return {
        kind,
        id: view.id,
        view,
        build,
        delta: {
          width: canonicalDelta(view.width, build.width),
          height: canonicalDelta(view.height, build.height),
          relativeX: canonicalDelta(view.relativeX, build.relativeX),
          relativeY: canonicalDelta(view.relativeY, build.relativeY),
        },
      };
    });
  });
}

export function requireExactCanonicalGeometry(comparisons) {
  const mismatch = comparisons.find(({ delta }) => (
    delta.x !== "0.00"
    || delta.y !== "0.00"
    || delta.width !== "0.00"
    || delta.height !== "0.00"
  ));
  if (mismatch) {
    throw new Error(`Non-zero canonical geometry delta for ${mismatch.kind} ${mismatch.id}`);
  }
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const [{ default: assert }, { default: test }] = await Promise.all([
    import("node:assert/strict"),
    import("node:test"),
  ]);

  test("canonical delta uses exact two-decimal string rounding with no tolerance", () => {
    for (const value of [0, 0.001, 0.004]) {
      assert.equal(canonicalDelta(0, value), "0.00");
      assert.doesNotThrow(() => requireExactCanonicalGeometry([{
        kind: "canvas",
        id: "biomedical",
        delta: { x: canonicalDelta(0, value), y: "0.00", width: "0.00", height: "0.00" },
      }]));
    }

    for (const value of [0.005, 0.009, 0.01, 1]) {
      assert.notEqual(canonicalDelta(0, value), "0.00");
      assert.throws(() => requireExactCanonicalGeometry([{
        kind: "canvas",
        id: "biomedical",
        delta: { x: canonicalDelta(0, value), y: "0.00", width: "0.00", height: "0.00" },
      }]), /Non-zero canonical geometry delta/);
    }
  });

  test("canonical IDs must exactly match an independent fixture", () => {
    const expectedIds = {
      page: ["biomedical"],
      canvas: ["biomedical"],
      grid: ["biomedical"],
      section: ["outbreak_dynamics"],
      panel: ["bio_confirmed_cases", "bio_daily_cases_bar"],
      placement: ["bio_confirmed_cases", "bio_daily_cases_bar"],
      plot: ["bio_confirmed_cases", "bio_daily_cases_bar"],
    };
    const geometryFor = (ids) => ({
      geometry: Object.fromEntries(Object.entries(ids).map(([kind, values]) => [
        kind,
        values.map((id) => ({ id, x: 0, y: 0, width: 100, height: 100 })),
      ])),
    });
    const omittedIds = {
      ...expectedIds,
      panel: ["bio_confirmed_cases"],
      placement: ["bio_confirmed_cases"],
      plot: ["bio_confirmed_cases"],
    };
    const extraIds = {
      ...expectedIds,
      panel: [...expectedIds.panel, "unexpected_chart"],
      placement: [...expectedIds.placement, "unexpected_chart"],
      plot: [...expectedIds.plot, "unexpected_chart"],
    };

    assert.throws(
      () => compareCanonicalGeometry(geometryFor(omittedIds), geometryFor(omittedIds), expectedIds),
      /missing expected/,
    );
    assert.throws(
      () => compareCanonicalGeometry(geometryFor(extraIds), geometryFor(extraIds), expectedIds),
      /unexpected/,
    );
  });

  test("central canvas geometry ignores outer offsets but rejects an internal reflow", () => {
    const expectedIds = {
      canvas: ["biomedical"], grid: ["biomedical"], section: ["outbreak_dynamics"],
      panel: ["confirmed", "daily"], plot: ["confirmed", "daily"],
    };
    const geometry = (outerX, outerY, dailyRelativeY = 120) => ({
      geometry: {
        canvas: [{ id: "biomedical", x: outerX, y: outerY, width: 960, height: 640, relativeX: 0, relativeY: 0 }],
        grid: [{ id: "biomedical", x: outerX + 18, y: outerY + 80, width: 924, height: 520, relativeX: 18, relativeY: 80 }],
        section: [{ id: "outbreak_dynamics", x: outerX, y: outerY + 64, width: 960, height: 560, relativeX: 0, relativeY: 64 }],
        panel: [
          { id: "confirmed", x: outerX + 18, y: outerY + 80, width: 446, height: 104, relativeX: 18, relativeY: 80 },
          { id: "daily", x: outerX + 478, y: outerY + dailyRelativeY, width: 446, height: 104, relativeX: 478, relativeY: dailyRelativeY },
        ],
        plot: [
          { id: "confirmed", x: outerX + 30, y: outerY + 92, width: 422, height: 80, relativeX: 30, relativeY: 92 },
          { id: "daily", x: outerX + 490, y: outerY + dailyRelativeY + 12, width: 422, height: 80, relativeX: 490, relativeY: dailyRelativeY + 12 },
        ],
      },
    });

    const offsetOnly = compareCentralCanvasGeometry(geometry(20, 110), geometry(-380, 112), expectedIds);
    assert.equal(offsetOnly.every(({ delta }) => Object.values(delta).every((value) => value === "0.00")), true);

    const reflowed = compareCentralCanvasGeometry(geometry(20, 110), geometry(-380, 112, 180), expectedIds);
    assert.equal(reflowed.some(({ id, delta }) => id === "daily" && delta.relativeY !== "0.00"), true);
  });
}
