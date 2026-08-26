import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyManagedSource,
  createUploadedCsvSourceEntry,
  listManageableSourceEntries,
  renameSourceEntry,
  validateSourceEntry,
} from "../src/content-library/sourceEntrySchema.js";
import { makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

test("managed source classification trusts descriptor kind and explicit provenance, never filenames", () => {
  const cases = [
    ["uploaded", {
      kind: "dataset", type: "uploadedCsv", fileName: "generated-summary.csv", browserAssetId: "csv-session",
    }, { kind: "csv", origin: "uploaded", ownership: "builder", manageable: true }],
    ["linked", {
      kind: "geojson", path: "data/generated-boundaries.geojson",
    }, { kind: "geojson", origin: "linked-project", ownership: "builder", manageable: true }],
    ["packaged", {
      kind: "dataset", type: "uploadedGeoJson", fileName: "boundaries.geojson",
    }, { kind: "geojson", origin: "packaged", ownership: "builder", manageable: true }],
    ["dashboard-owned", {
      kind: "csv", path: "data/cases.csv", provenance: { ownership: "dashboard", generated: true },
    }, { kind: "csv", origin: "generated", ownership: "dashboard", manageable: false }],
  ];

  for (const [sourceId, descriptor, expected] of cases) {
    assert.deepEqual(classifyManagedSource(sourceId, descriptor), expected);
  }
  assert.equal(classifyManagedSource("image", { kind: "staticImage" }), null);
});

test("source entry validation derives kind from the descriptor and rename returns a frozen copy", () => {
  const entry = makeSourceEntry("csv", { displayName: "Cases" });
  assert.equal(validateSourceEntry(entry, {
    sourceId: "cases",
    descriptor: { kind: "dataset", type: "uploadedCsv", fileName: "cases.csv" },
  }), entry);

  const renamed = renameSourceEntry(entry, " Updated cases ");
  assert.notEqual(renamed, entry);
  assert.equal(renamed.displayName, "Updated cases");
  assert.equal(entry.displayName, "Cases");
  assert.equal(Object.isFrozen(renamed), true);
  assert.throws(() => validateSourceEntry({ ...entry, sourceId: "other" }, {
    sourceId: "cases", descriptor: { kind: "csv" },
  }), /sourceId.*key|key.*sourceId/i);
  assert.throws(() => renameSourceEntry(entry, "   "), /display name.*required/i);
});

test("manageable source listing returns only valid builder-owned CSV and GeoJSON records", () => {
  const library = {
    sourceEntries: {
      cases: makeSourceEntry("csv", { displayName: "Cases" }),
      boundaries: makeSourceEntry("geojson", { displayName: "Boundaries" }),
      generated: makeSourceEntry("csv", {
        sourceId: "generated", origin: "generated", ownership: "dashboard", displayName: "Generated",
        provenance: { ownership: "dashboard", generated: true },
      }),
    },
  };
  const dataSources = {
    cases: { kind: "dataset", type: "uploadedCsv", fileName: "generated-cases.csv" },
    boundaries: { kind: "geojson", path: "data/boundaries.geojson" },
    generated: { kind: "csv", provenance: { ownership: "dashboard", generated: true } },
  };

  assert.deepEqual(listManageableSourceEntries(library, dataSources).map((item) => ({
    sourceId: item.sourceId,
    kind: item.kind,
  })), [
    { sourceId: "boundaries", kind: "geojson" },
    { sourceId: "cases", kind: "csv" },
  ]);
});

test("uploaded CSV registration derives one builder-owned entry without duplicating payload authority", () => {
  const entry = createUploadedCsvSourceEntry({
    sourceId: "upload-exercise-status",
    displayName: " Exercise status ",
    fileName: "exercise-status.csv",
    fingerprint: "f".repeat(64),
  });

  assert.deepEqual(entry, {
    sourceId: "upload-exercise-status",
    origin: "uploaded",
    ownership: "builder",
    displayName: "Exercise status",
    provenance: {
      fileName: "exercise-status.csv",
      profileFingerprint: "f".repeat(64),
    },
    health: "ready",
  });
  assert.equal(Object.isFrozen(entry), true);
  assert.equal("csvText" in entry, false);
  assert.equal("columns" in entry, false);
});
