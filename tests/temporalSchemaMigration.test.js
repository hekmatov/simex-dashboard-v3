import assert from "node:assert/strict";
import test from "node:test";

import {
  validateTemporalBundle,
} from "../src/charting/time/temporalSchema.js";
import {
  migrateDashboardTimezoneToUtc,
} from "../src/charting/time/migrateTemporalConfig.js";

function temporalBundle(overrides = {}) {
  return {
    dashboard: {
      id: "dashboard-1",
      timeZone: "Europe/Berlin",
      timeGroups: [{
        id: "group-1",
        period: {
          start: "2027-01-31T11:00:00.000Z",
          end: "2027-03-31T10:00:00.000Z",
        },
        scenes: [{
          id: "scene-1",
          period: {
            start: "2027-01-31T11:00:00.000Z",
            end: "2027-03-31T10:00:00.000Z",
          },
          frameRule: {
            type: "source",
            mode: "selected",
            selectedInstants: ["2027-02-28T11:00:00.000Z"],
          },
        }],
      }],
      ...overrides,
    },
  };
}

test("migration adds explicit UTC to a legacy dashboard without a timezone", () => {
  const legacy = temporalBundle();
  delete legacy.dashboard.timeZone;

  const migrated = migrateDashboardTimezoneToUtc(legacy);

  assert.equal(migrated.dashboard.timeZone, "UTC");
  assert.equal(Object.hasOwn(legacy.dashboard, "timeZone"), false);
  assert.strictEqual(validateTemporalBundle(migrated), migrated);
});

test("migration preserves an explicit IANA zone, canonicalizes offset instants, and is idempotent", () => {
  const legacy = temporalBundle({
    timeZone: undefined,
    timezone: "Europe/Berlin",
    timeGroups: [{
      id: "group-1",
      period: {
        start: "2027-01-31T12:00:00+01:00",
        end: "2027-03-31T12:00:00+02:00",
      },
      scenes: [{
        id: "scene-1",
        period: {
          start: "2027-01-31T12:00:00+01:00",
          end: "2027-03-31T12:00:00+02:00",
        },
        frameRule: {
          type: "source",
          mode: "selected",
          selectedInstants: ["2027-02-28T12:00:00+01:00"],
        },
      }],
    }],
  });

  const migrated = migrateDashboardTimezoneToUtc(legacy);

  assert.equal(migrated.dashboard.timeZone, "Europe/Berlin");
  assert.equal(Object.hasOwn(migrated.dashboard, "timezone"), false);
  assert.deepEqual(migrated.dashboard.timeGroups[0].period, {
    start: "2027-01-31T11:00:00.000Z",
    end: "2027-03-31T10:00:00.000Z",
  });
  assert.deepEqual(
    migrated.dashboard.timeGroups[0].scenes[0].frameRule.selectedInstants,
    ["2027-02-28T11:00:00.000Z"],
  );
  assert.deepEqual(migrateDashboardTimezoneToUtc(migrated), migrated);
  assert.strictEqual(validateTemporalBundle(migrated), migrated);
});

test("post-migration validation requires exactly one valid dashboard IANA timezone", () => {
  const missing = temporalBundle();
  delete missing.dashboard.timeZone;
  assert.throws(() => validateTemporalBundle(missing), /dashboard\.timeZone is required/);

  assert.throws(
    () => validateTemporalBundle(temporalBundle({ timeZone: "Mars\/Olympus" })),
    /valid IANA timezone/,
  );
  assert.throws(
    () => validateTemporalBundle(temporalBundle({ timezone: "UTC" })),
    /exactly one timezone field/,
  );
});

test("migration rejects ambiguous stored timestamps instead of silently reinterpreting them", () => {
  const legacy = temporalBundle({
    timeGroups: [{
      id: "group-1",
      period: {
        start: "2027-01-31T12:00:00",
        end: "2027-03-31T12:00:00+02:00",
      },
      scenes: [],
    }],
  });

  assert.throws(
    () => migrateDashboardTimezoneToUtc(legacy),
    /explicit UTC or numeric offset/,
  );
});

test("validation rejects non-UTC persisted temporal instants", () => {
  const invalid = temporalBundle();
  invalid.dashboard.timeGroups[0].period.start = "2027-01-31T12:00:00+01:00";

  assert.throws(
    () => validateTemporalBundle(invalid),
    /canonical UTC instant/,
  );
});
