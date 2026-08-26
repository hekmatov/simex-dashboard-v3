import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateDatasetProfiles,
} from "../scripts/build-dataset-profiles.mjs";
import {
  buildPortableData,
} from "../scripts/build-portable-data.mjs";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import {
  buildChronoGroupClock,
  validateChronoGroups,
} from "../src/charting/time/chronoGroupModel.js";
import { parseCsvText } from "../src/lib/loadCsv.js";
import {
  loadDashboardConfig,
  validateDataSourceDescriptor,
  validateDashboardSourceDescriptors,
  validateGeoJson,
} from "../src/lib/loadDashboard.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardPath = path.join(rootDir, "public", "config", "dashboard.json");
const profilesPath = path.join(rootDir, "public", "config", "dataset-profiles.json");

async function trackedJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function trackedRows(source) {
  const text = await readFile(path.join(rootDir, "public", source.path), "utf8");
  return parseCsvText(text, source.path);
}

async function withTempDirectory(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "simex-profiles-"));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function portablePayload(source) {
  const prefix = "window.SIMEX_PORTABLE_DASHBOARD = ";
  assert.ok(source.startsWith(prefix));
  return JSON.parse(source.slice(prefix.length, -2));
}

function reusableProfile(sourceId, source, rows) {
  return {
    sourceId,
    kind: "csv",
    path: source.path,
    provenance: source.provenance,
    ...profileDataset(rows, source.parsingMetadata ?? {}),
  };
}

function sourceLoadingDashboard(dataSources) {
  return {
    configVersion: 3,
    id: "runtime-loader-fixture",
    title: "Runtime loader fixture",
    dataSources,
    pages: [{
      id: "runtime",
      sections: [{
        id: "sources",
        panels: [],
      }],
    }],
  };
}

function lineChart(sourceId, groupId = "national-outbreak") {
  return {
    id: "tracked-cases",
    typeId: "line",
    title: "Tracked cases",
    sourceId,
    roles: {
      measurements: [{ field: "national_total_cases" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    transformations: {
      filters: [],
      grouping: [],
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    interaction: { timeSync: { groupId } },
  };
}

test("every retained tabular source has exactly one reusable profile", async () => {
  const dashboard = await trackedJson(dashboardPath);
  const profiles = await trackedJson(profilesPath);
  const tabularIds = Object.entries(dashboard.dataSources)
    .filter(([, source]) => source.kind === "csv")
    .map(([sourceId]) => sourceId)
    .toSorted();

  assert.equal(tabularIds.length, Object.keys(profiles).length);
  assert.deepEqual(Object.keys(profiles), tabularIds);
  for (const sourceId of tabularIds) {
    assert.equal(profiles[sourceId].sourceId, sourceId);
    assert.equal(profiles[sourceId].kind, "csv");
    assert.equal(profiles[sourceId].path, dashboard.dataSources[sourceId].path);
    assert.ok(profiles[sourceId].columns.length > 0, `${sourceId} has no columns`);
  }
});

test("mortality dates retain the complete profileDataset temporal authority", async () => {
  const dashboard = await trackedJson(dashboardPath);
  const profiles = await trackedJson(profilesPath);
  const source = dashboard.dataSources.bio_mortality;
  const rows = await trackedRows(source);
  const date = profiles.bio_mortality.columns.find(({ name }) => name === "date");

  assert.deepEqual(date.temporal.parsingMetadata, {
    interpretation: "temporal",
    format: "DD/MM/YYYY",
    timezone: "date-only",
  });
  assert.equal(date.temporal.values.length, rows.length);
  assert.deepEqual(
    date.temporal.values,
    Array(rows.length).fill("2027-05-02"),
  );
  assert.deepEqual(date.temporal.diagnostics, []);
  assert.equal(Object.hasOwn(date, "parsing"), false);
  assert.equal(Object.hasOwn(date, "temporalValues"), false);
  assert.equal(Object.hasOwn(date, "warnings"), false);
});

test("profiles preserve representative numeric, temporal, and category facts", async () => {
  const profiles = await trackedJson(profilesPath);
  const caseColumns = Object.fromEntries(
    profiles.bio_cases.columns.map((column) => [column.name, column]),
  );
  const behaviourColumns = Object.fromEntries(
    profiles.socio_behaviour.columns.map((column) => [column.name, column]),
  );
  const testingColumns = Object.fromEntries(
    profiles.bio_testing.columns.map((column) => [column.name, column]),
  );

  assert.equal(profiles.bio_cases.rowCount, 177);
  assert.equal(caseColumns.national_total_cases.type, "numeric");
  assert.deepEqual(caseColumns.national_total_cases.examples, [2, 4, 15]);
  assert.equal(caseColumns.date.type, "temporal");
  assert.deepEqual(caseColumns.date.examples, [
    "2027-02-20",
    "2027-02-21",
    "2027-02-22",
  ]);
  assert.deepEqual(caseColumns.date.temporal.parsingMetadata, {
    interpretation: "temporal",
    format: "YYYY-MM-DD",
    timezone: "date-only",
  });
  assert.equal(behaviourColumns.Answer.type, "category");
  assert.deepEqual(behaviourColumns.Answer.examples, [
    "Agree",
    "Disagree",
    "Neutral",
  ]);
  assert.equal(testingColumns.tests_per_day.type, "numeric");
  assert.equal(Object.hasOwn(testingColumns.tests_per_day, "temporal"), false);
  assert.deepEqual(Object.keys(profiles.bio_cases.provenance), ["label"]);
});

test("generated columns exactly equal the runtime parser and profileDataset authority", async () => {
  const dashboard = await trackedJson(dashboardPath);
  const profiles = await trackedJson(profilesPath);
  for (const sourceId of ["bio_cases", "bio_mortality", "socio_behaviour"]) {
    const source = dashboard.dataSources[sourceId];
    const rows = await trackedRows(source);
    const authority = profileDataset(rows, source.parsingMetadata ?? {});
    assert.deepEqual(
      {
        rowCount: profiles[sourceId].rowCount,
        columns: profiles[sourceId].columns,
        fingerprint: profiles[sourceId].fingerprint,
      },
      authority,
      sourceId,
    );
  }
});

test("tracked profiles make chart binding and national time synchronization ready", async () => {
  const dashboard = await trackedJson(dashboardPath);
  const profiles = await trackedJson(profilesPath);
  const sourceId = "bio_cases";
  const rows = await trackedRows(dashboard.dataSources[sourceId]);
  const chart = lineChart(sourceId);
  const group = {
    id: "national-outbreak",
    name: "National outbreak",
    period: { start: "2027-02-20", end: "2027-08-15" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: chart.id, timeRole: "observation" }],
  };

  const prepared = prepareChartData({
    chart,
    rows,
    datasetProfile: profiles[sourceId],
  });
  assert.equal(prepared.status, "ready");
  assert.equal(prepared.meta.renderableMarkCount, 177);
  assert.equal(
    validateChronoGroups([group], {
      charts: [chart],
      loadedData: { [sourceId]: rows },
      profiles,
      timezone: dashboard.timezone,
    })[0],
    group,
  );
  const clock = buildChronoGroupClock(group, {
    charts: [chart],
    loadedData: { [sourceId]: rows },
    profiles,
    timezone: dashboard.timezone,
  });
  assert.equal(clock.length, 177);
  assert.equal(clock[0], Date.UTC(2027, 1, 20));
  assert.equal(clock.at(-1), Date.UTC(2027, 7, 15));
});

test("municipal repeated rows produce one playback clock point per distinct date", async () => {
  const dashboard = await trackedJson(dashboardPath);
  const profiles = await trackedJson(profilesPath);
  const sourceId = "bio_municipal_infections";
  const rows = await trackedRows(dashboard.dataSources[sourceId]);
  const profile = profiles[sourceId];
  const dateColumn = profile.columns.find(({ name }) => name === "Datum");
  const chart = {
    id: "municipal-map",
    typeId: "chronoChoroplethMap",
    sourceId,
    roles: {
      geography: { field: "MunicipalityCode" },
      value: { field: "infectionsPer10000" },
      time: { field: "Datum", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
    interaction: { timeSync: { groupId: "municipal-outbreak" } },
  };
  const group = {
    id: "municipal-outbreak",
    name: "Municipal outbreak",
    period: { start: "2020-02-27", end: "2021-04-17" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: chart.id, timeRole: "time" }],
  };

  assert.equal(dateColumn.temporal.values.length, rows.length);
  assert.equal(
    dateColumn.temporal.values.filter((value) => value === "2020-02-27").length,
    354,
  );
  assert.equal(
    validateChronoGroups([group], {
      charts: [chart],
      loadedData: { [sourceId]: rows },
      profiles,
      timezone: dashboard.timezone,
    })[0],
    group,
  );
  const clock = buildChronoGroupClock(group, {
    charts: [chart],
    loadedData: { [sourceId]: rows },
    profiles,
    timezone: dashboard.timezone,
  });
  assert.equal(clock.length, 415);
  assert.equal(clock[0], Date.UTC(2020, 1, 27));
  assert.equal(clock.at(-1), Date.UTC(2021, 3, 17));
});

test("profile generation is byte-identical and contains no flattened warnings or machine paths", async () => {
  await withTempDirectory(async (directory) => {
    const first = path.join(directory, "first.json");
    const second = path.join(directory, "second.json");
    await generateDatasetProfiles({ rootDir, outputPath: first });
    await generateDatasetProfiles({ rootDir, outputPath: second });
    const firstBytes = await readFile(first, "utf8");

    assert.equal(firstBytes, await readFile(second, "utf8"));
    assert.equal(firstBytes, await readFile(profilesPath, "utf8"));
    assert.doesNotMatch(firstBytes, /"warnings"\s*:/);
    assert.doesNotMatch(firstBytes, /[A-Za-z]:[\\/]|OneDrive|\\\\Users\\\\/i);
  });
});

test("profile generation rejects traversal, unsafe IDs, legacy strings, and missing files", async () => {
  await withTempDirectory(async (directory) => {
    const publicDir = path.join(directory, "public");
    const configDir = path.join(publicDir, "config");
    await mkdir(configDir, { recursive: true });
    const outputPath = path.join(configDir, "dataset-profiles.json");

    for (const [sourceId, source, message] of [
      ["unsafe", { kind: "csv", path: "../secret.csv" }, /safe relative public path/i],
      ["unsafe", { kind: "csv", path: "C:/secret.csv" }, /safe relative public path/i],
      [
        "unsafe",
        {
          kind: "csv",
          path: "data/%2e%2e/secret.csv",
          provenance: { label: "Encoded traversal fixture" },
        },
        /safe relative public path/i,
      ],
      [
        "unsafe",
        {
          kind: "csv",
          path: "data/file:stream.csv",
          provenance: { label: "Windows alternate stream fixture" },
        },
        /safe relative public path/i,
      ],
      ["__proto__", {
        kind: "csv",
        path: "data/cases.csv",
        provenance: { label: "Dangerous id fixture" },
      }, /source id/i],
      ["unsafe", "data/cases.csv", /descriptor must be an ordinary data object/i],
      [
        "unsafe",
        {
          kind: "csv",
          path: "data/missing.csv",
          provenance: { label: "Missing fixture" },
        },
        /could not be read/i,
      ],
    ]) {
      const configPath = path.join(configDir, "dashboard.json");
      const dataSources = Object.create(null);
      Object.defineProperty(dataSources, sourceId, {
        value: source,
        enumerable: true,
      });
      await writeFile(
        configPath,
        JSON.stringify({ dataSources }),
        "utf8",
      );
      await assert.rejects(
        generateDatasetProfiles({
          rootDir: directory,
          dashboardPath: configPath,
          outputPath,
        }),
        message,
      );
    }
  });
});

test("descriptor parsing rules accept only temporal-authority enums", () => {
  const base = {
    kind: "csv",
    path: "data/cases.csv",
    provenance: { label: "Fixture" },
  };
  assert.equal(validateDataSourceDescriptor("cases", {
    ...base,
    parsingMetadata: {
      date: {
        interpretation: "temporal",
        format: "DD/MM/YYYY",
        timezone: "date-only",
      },
      cases: { interpretation: "numeric" },
    },
  }), "data/cases.csv");

  for (const [rule, message] of [
    [{ interpretation: "date" }, /interpretation/i],
    [{ interpretation: "temporal", format: "browser-date" }, /format/i],
    [{ interpretation: "temporal", format: "YYYY-MM-DD", timezone: "local" }, /timezone/i],
    [{ interpretation: "numeric", format: "YYYY-MM-DD" }, /only temporal/i],
  ]) {
    assert.throws(
      () => validateDataSourceDescriptor("cases", {
        ...base,
        parsingMetadata: { date: rule },
      }),
      message,
    );
  }
});

test("runtime loading filters fallback extras and fails closed for invalid embedded profiles", async () => {
  const source = {
    kind: "csv",
    path: "data/cases.csv",
    provenance: { label: "Fixture" },
    parsingMetadata: {
      date: {
        interpretation: "temporal",
        format: "YYYY-MM-DD",
        timezone: "date-only",
      },
    },
  };
  const rows = [{ date: "2027-01-01", cases: 7 }];
  const validProfile = reusableProfile("cases", source, rows);

  await assert.rejects(
    loadDashboardConfig(sourceLoadingDashboard({ cases: source }), {}),
    /missing dataset profile/i,
  );
  const loaded = await loadDashboardConfig(
    sourceLoadingDashboard({ cases: source }),
    { cases: validProfile, extra: validProfile },
    {
      cases: {
        kind: "csv",
        text: "date,cases\n2027-01-01,7\n",
      },
    },
  );
  assert.deepEqual(Object.keys(loaded.datasetProfiles), ["cases"]);

  const embeddedExtra = sourceLoadingDashboard({ cases: source });
  embeddedExtra.datasetProfiles = { extra: validProfile };
  await assert.rejects(
    loadDashboardConfig(
      embeddedExtra,
      { cases: validProfile },
    ),
    /unexpected dataset profile/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({ cases: source }),
      { cases: { ...validProfile, path: "data/other.csv" } },
    ),
    /profile path does not match/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({ cases: source }),
      {
        cases: {
          ...validProfile,
          columns: validProfile.columns.map((column) => (
            column.name === "date"
              ? {
                  ...column,
                  temporal: {
                    ...column.temporal,
                    values: ["not-canonical"],
                  },
                }
              : column
          )),
        },
      },
    ),
    /canonical temporal/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({ cases: source }),
      {
        cases: {
          ...validProfile,
          columns: validProfile.columns.map((column) => (
            column.name === "date" ? { ...column, name: "constructor" } : column
          )),
        },
      },
    ),
    /column.*name/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({ cases: source }),
      {
        cases: {
          ...validProfile,
          warnings: [],
        },
      },
    ),
    /unknown dataset profile.*warnings/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({ cases: source }),
      {
        cases: {
          ...validProfile,
          columns: validProfile.columns.map((column) => (
            column.name === "date"
              ? {
                  ...column,
                  temporal: {
                    ...column.temporal,
                    parsingMetadata: { interpretation: "category" },
                  },
                }
              : column
          )),
        },
      },
    ),
    /temporal parsing interpretation/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({ cases: source }),
      {
        cases: {
          ...validProfile,
          columns: validProfile.columns.map((column) => (
            column.name === "date"
              ? {
                  ...column,
                  temporal: {
                    ...column.temporal,
                    values: [null],
                    diagnostics: [{
                      index: 0,
                      value: "not-a-date",
                      code: "made-up-warning",
                    }],
                  },
                }
              : column
          )),
        },
      },
    ),
    /diagnostic is invalid/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({ cases: source }),
      {
        cases: {
          ...validProfile,
          columns: validProfile.columns.map((column) => (
            column.name === "cases"
              ? {
                  ...column,
                  temporal: {
                    values: ["2027-01-01"],
                    diagnostics: [],
                    parsingMetadata: {
                      interpretation: "temporal",
                      format: "YYYY-MM-DD",
                    },
                  },
                }
              : column
          )),
        },
      },
    ),
    /non-temporal column cannot contain temporal evidence/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      sourceLoadingDashboard({
        cases: { ...source, path: "../cases.csv" },
      }),
      { cases: { ...validProfile, path: "../cases.csv" } },
    ),
    /safe relative public path/i,
  );
});

test("runtime and descriptor validation reject accessors without invoking them", async () => {
  let invocations = 0;
  const source = {};
  Object.defineProperty(source, "kind", {
    enumerable: true,
    get() {
      invocations += 1;
      return "csv";
    },
  });
  Object.defineProperties(source, {
    path: { value: "data/cases.csv", enumerable: true },
    provenance: {
      value: { label: "Accessor fixture" },
      enumerable: true,
    },
  });

  assert.throws(
    () => validateDataSourceDescriptor("cases", source),
    /data propert/i,
  );
  assert.equal(invocations, 0);
  await assert.rejects(
    loadDashboardConfig(sourceLoadingDashboard({ cases: source }), {}),
    /data propert/i,
  );
  assert.equal(invocations, 0);

  const dataSources = {};
  Object.defineProperty(dataSources, "cases", {
    enumerable: true,
    get() {
      invocations += 1;
      return source;
    },
  });
  assert.throws(
    () => validateDashboardSourceDescriptors({ dataSources }),
    /data propert/i,
  );
  assert.equal(invocations, 0);
  await assert.rejects(
    loadDashboardConfig(sourceLoadingDashboard(dataSources), {}),
    /data propert/i,
  );
  assert.equal(invocations, 0);
});

test("runtime loads descriptors with faithfully hydrated reusable profiles", async () => {
  const originalFetch = globalThis.fetch;
  const source = {
    kind: "csv",
    path: "data/cases.csv",
    provenance: { label: "Fixture cases" },
    parsingMetadata: {
      date: {
        interpretation: "temporal",
        format: "YYYY-MM-DD",
        timezone: "date-only",
      },
    },
  };
  const rows = [{ date: "2027-01-01", cases: 7 }];
  const profile = reusableProfile("cases", source, rows);
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url).endsWith("data/cases.csv")) {
      return new Response("date,cases\n2027-01-01,7\n");
    }
    if (String(url).endsWith("data/regions.geojson")) {
      return new Response(JSON.stringify({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { name: "North" },
          geometry: { type: "Point", coordinates: [4.9, 52.3] },
        }],
      }));
    }
    return new Response("", { status: 404 });
  };

  try {
    const loaded = await loadDashboardConfig(
      sourceLoadingDashboard({
        cases: source,
        regions: {
          kind: "geojson",
          path: "data/regions.geojson",
          provenance: { label: "Fixture boundaries" },
        },
      }),
      { cases: profile },
    );

    assert.deepEqual(loaded.loadedData.cases, rows);
    assert.equal(loaded.loadedData.regions.type, "FeatureCollection");
    assert.deepEqual(loaded.datasetProfiles.cases, profile);
    assert.notEqual(loaded.datasetProfiles.cases, profile);
    assert.equal(
      loaded.datasetProfiles.cases.columns[0].temporal.values.length,
      rows.length,
    );
    assert.deepEqual(requestedUrls, [
      "/data/cases.csv",
      "/data/regions.geojson",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("compatibility loading recovers a cached failure in configured source order", async () => {
  const originalFetch = globalThis.fetch;
  const laterSource = {
    kind: "csv",
    path: "data/task-3-round-2-later.csv",
    provenance: { label: "Later transient cases" },
    parsingMetadata: {
      date: {
        interpretation: "temporal",
        format: "YYYY-MM-DD",
        timezone: "date-only",
      },
    },
  };
  const earlierSource = {
    ...laterSource,
    path: "data/task-3-round-2-earlier.csv",
    provenance: { label: "Earlier uncached cases" },
  };
  const laterRows = [{ date: "2027-03-02", cases: 10 }];
  const earlierRows = [{ date: "2027-03-01", cases: 9 }];
  const laterProfile = reusableProfile(
    "task3CachedFailureLater",
    laterSource,
    laterRows,
  );
  const earlierProfile = reusableProfile(
    "task3UncachedEarlier",
    earlierSource,
    earlierRows,
  );
  const requestedUrls = [];
  let laterAttempts = 0;
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    requestedUrls.push(requestUrl);
    if (requestUrl === "/data/task-3-round-2-later.csv") {
      laterAttempts += 1;
      if (laterAttempts === 1) return new Response("", { status: 503 });
      return new Response("date,cases\n2027-03-02,10\n");
    }
    if (requestUrl === "/data/task-3-round-2-earlier.csv") {
      return new Response("date,cases\n2027-03-01,9\n");
    }
    return new Response("", { status: 404 });
  };

  try {
    const degraded = await loadDashboardConfig(
      sourceLoadingDashboard({ task3CachedFailureLater: laterSource }),
      { task3CachedFailureLater: laterProfile },
    );
    assert.deepEqual(requestedUrls, ["/data/task-3-round-2-later.csv"]);
    assert.equal(
      degraded.contentLibrary.sourceEntries.task3CachedFailureLater.sourceId,
      "task3CachedFailureLater",
    );
    assert.equal(
      degraded.contentLibrary.sourceEntries.task3CachedFailureLater.health,
      "ready",
    );
    assert.deepEqual(degraded.dataSourceStates.task3CachedFailureLater, {
      status: "error",
      code: "source-load-failed",
    });
    assert.equal(Object.hasOwn(degraded.loadedData, "task3CachedFailureLater"), false);
    assert.deepEqual(degraded.runtimeContentHealth.sourceEntries.task3CachedFailureLater, {
      health: "corrupt",
      repair: { action: "replace" },
    });
    requestedUrls.length = 0;

    const loaded = await loadDashboardConfig(
      sourceLoadingDashboard({
        task3UncachedEarlier: earlierSource,
        task3CachedFailureLater: laterSource,
      }),
      {
        task3UncachedEarlier: earlierProfile,
        task3CachedFailureLater: laterProfile,
      },
    );

    assert.deepEqual(requestedUrls, [
      "/data/task-3-round-2-earlier.csv",
      "/data/task-3-round-2-later.csv",
    ]);
    assert.equal(laterAttempts, 2);
    assert.deepEqual(loaded.loadedData.task3UncachedEarlier, earlierRows);
    assert.deepEqual(loaded.loadedData.task3CachedFailureLater, laterRows);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runtime eagerly hydrates uploaded and inline temporal sources with the public shape", async () => {
  const inlineRows = [{ reportDate: "2027-02-01", cases: 5 }];
  const dashboard = sourceLoadingDashboard({
    uploaded: {
      kind: "dataset",
      type: "uploadedCsv",
      fileName: "uploaded-cases.csv",
      csvText: "reportDate,cases\n31/01/2027,4\n",
      provenance: { label: "Uploaded cases" },
      parsingMetadata: {
        reportDate: {
          interpretation: "temporal",
          format: "DD/MM/YYYY",
          timezone: "date-only",
        },
      },
    },
    manual: {
      kind: "inline",
      rows: inlineRows,
      provenance: { label: "Manual cases" },
      parsingMetadata: {
        reportDate: {
          interpretation: "temporal",
          format: "YYYY-MM-DD",
          timezone: "date-only",
        },
      },
    },
  });

  const loaded = await loadDashboardConfig(dashboard, {});

  assert.deepEqual(loaded.loadedData.uploaded, [{
    reportDate: "31/01/2027",
    cases: 4,
  }]);
  assert.deepEqual(loaded.loadedData.manual, inlineRows);
  assert.notEqual(loaded.loadedData.manual, inlineRows);
  assert.notEqual(loaded.loadedData.manual[0], inlineRows[0]);
  assert.deepEqual(Object.keys(loaded.datasetProfiles), ["uploaded", "manual"]);

  const uploadedDate = loaded.datasetProfiles.uploaded.columns.find(
    ({ name }) => name === "reportDate",
  );
  assert.equal(uploadedDate.type, "temporal");
  assert.deepEqual(uploadedDate.temporal.values, ["2027-01-31"]);
  assert.deepEqual(uploadedDate.temporal.parsingMetadata, {
    interpretation: "temporal",
    format: "DD/MM/YYYY",
    timezone: "date-only",
  });

  const manualDate = loaded.datasetProfiles.manual.columns.find(
    ({ name }) => name === "reportDate",
  );
  assert.equal(manualDate.type, "temporal");
  assert.deepEqual(manualDate.temporal.values, ["2027-02-01"]);
  assert.deepEqual(manualDate.temporal.parsingMetadata, {
    interpretation: "temporal",
    format: "YYYY-MM-DD",
    timezone: "date-only",
  });

  assert.deepEqual(Object.keys(loaded), [
    "configVersion",
    "id",
    "title",
    "dataSources",
    "pages",
    "chronoGroups",
    "scenes",
    "contentLibrary",
    "timezone",
    "datasetProfiles",
    "loadedData",
    "dataSourceStates",
    "runtimeContentHealth",
  ]);
  assert.deepEqual(loaded.runtimeContentHealth, {
    mediaItems: {},
    sourceEntries: {},
  });
  assert.deepEqual(loaded.dataSources, dashboard.dataSources);
});

test("runtime retains malformed managed GeoJSON identity without exposing its payload to charts", async () => {
  const originalFetch = globalThis.fetch;
  const fixtures = [
    { type: "FeatureCollection" },
    { type: "FeatureCollection", features: [{}] },
    {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: ["east", 52.3] },
      }],
    },
  ];
  let index = 0;
  globalThis.fetch = async () => new Response(JSON.stringify(fixtures[index++]));

  try {
    for (const fixtureIndex of fixtures.keys()) {
      const sourceId = `regions-${fixtureIndex}`;
      const loaded = await loadDashboardConfig(sourceLoadingDashboard({
        [sourceId]: {
          kind: "geojson",
          path: `data/regions-${fixtureIndex}.geojson`,
          provenance: { label: "Malformed fixture" },
        },
      }), {});

      assert.equal(loaded.contentLibrary.sourceEntries[sourceId].sourceId, sourceId);
      assert.equal(loaded.contentLibrary.sourceEntries[sourceId].health, "ready");
      assert.deepEqual(loaded.dataSourceStates[sourceId], {
        status: "error",
        code: "source-load-failed",
      });
      assert.equal(Object.hasOwn(loaded.loadedData, sourceId), false);
      assert.deepEqual(loaded.runtimeContentHealth.sourceEntries[sourceId], {
        health: "corrupt",
        repair: { action: "replace" },
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GeoJSON validation enforces type-specific coordinate nesting and minima", () => {
  const featureCollection = (geometry, properties = {}) => ({
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties,
      geometry,
    }],
  });
  const ring = [
    [0, 0, 7],
    [1, 0, 7],
    [1, 1, 7],
    [0, 0, 7],
  ];

  for (const geometry of [
    null,
    { type: "Point", coordinates: [4.9, 52.3] },
    { type: "MultiPoint", coordinates: [[4.9, 52.3], [5, 52.4]] },
    { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    {
      type: "MultiLineString",
      coordinates: [
        [[0, 0], [1, 1]],
        [[2, 2], [3, 3]],
      ],
    },
    { type: "Polygon", coordinates: [ring] },
    { type: "MultiPolygon", coordinates: [[ring], [ring]] },
  ]) {
    assert.doesNotThrow(() => validateGeoJson(featureCollection(
      geometry,
      { label: "valid", nested: { values: [1, true, null] } },
    )));
  }

  for (const geometry of [
    { type: "Point", coordinates: [[0, 0]] },
    { type: "Point", coordinates: [0, Number.POSITIVE_INFINITY] },
    { type: "Point", coordinates: [0, 0], geometries: [] },
    { type: "MultiPoint", coordinates: [0, 0] },
    { type: "MultiPoint", coordinates: [] },
    { type: "LineString", coordinates: [[0, 0]] },
    { type: "MultiLineString", coordinates: [] },
    { type: "MultiLineString", coordinates: [[[0, 0]]] },
    { type: "Polygon", coordinates: [] },
    {
      type: "Polygon",
      coordinates: [[
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]],
    },
    {
      type: "Polygon",
      coordinates: [[
        [0, 0, 7],
        [1, 0, 7],
        [1, 1, 7],
        [0, 0],
      ]],
    },
    { type: "MultiPolygon", coordinates: [ring] },
    { type: "MultiPolygon", coordinates: [] },
    { type: "GeometryCollection", geometries: [] },
    {
      type: "GeometryCollection",
      geometries: [
        { type: "Point", coordinates: [0, 0] },
        { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      ],
    },
    {
      type: "GeometryCollection",
      geometries: [{ type: "Point", coordinates: [[0, 0]] }],
    },
    {
      type: "GeometryCollection",
      geometries: [{ type: "Point", coordinates: [0, 0] }],
      coordinates: [],
    },
    { type: "Circle", coordinates: [0, 0] },
  ]) {
    assert.throws(
      () => validateGeoJson(featureCollection(geometry)),
      /geojson/i,
    );
  }

  assert.throws(
    () => validateGeoJson({ type: "FeatureCollection", features: [] }),
    /geojson/i,
  );
});

test("GeoJSON features require inert object-or-null properties", () => {
  const featureCollection = (properties) => ({
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties,
      geometry: { type: "Point", coordinates: [0, 0] },
    }],
  });

  assert.doesNotThrow(() => validateGeoJson(featureCollection(null)));
  assert.doesNotThrow(() => validateGeoJson(featureCollection({
    label: "safe",
    metadata: { values: [1, "two", null] },
  })));

  for (const properties of [[], "unsafe", 42, true]) {
    assert.throws(
      () => validateGeoJson(featureCollection(properties)),
      /geojson/i,
    );
  }

  const dangerousProperties = Object.create(null);
  Object.defineProperty(dangerousProperties, "__proto__", {
    value: "unsafe",
    enumerable: true,
  });
  assert.throws(
    () => validateGeoJson(featureCollection(dangerousProperties)),
    /geojson/i,
  );

  let getterCalls = 0;
  const accessorProperties = {};
  Object.defineProperty(accessorProperties, "secret", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "unsafe";
    },
  });
  assert.throws(
    () => validateGeoJson(featureCollection(accessorProperties)),
    /geojson/i,
  );
  assert.equal(getterCalls, 0);

  const accessorFeature = {
    type: "Feature",
    properties: {},
  };
  Object.defineProperty(accessorFeature, "geometry", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return { type: "Point", coordinates: [0, 0] };
    },
  });
  assert.throws(
    () => validateGeoJson({
      type: "FeatureCollection",
      features: [accessorFeature],
    }),
    /geojson/i,
  );
  assert.equal(getterCalls, 0);
});

test("portable data embeds descriptors, full profiles, and source bytes deterministically", async () => {
  await withTempDirectory(async (directory) => {
    const first = path.join(directory, "portable-one.js");
    const second = path.join(directory, "portable-two.js");
    await buildPortableData({ rootDir, outputPath: first, embedPortableData: true });
    await buildPortableData({ rootDir, outputPath: second, embedPortableData: true });
    const firstBytes = await readFile(first, "utf8");

    assert.equal(firstBytes, await readFile(second, "utf8"));
    const payload = portablePayload(firstBytes);
    assert.equal(payload.type, "simex-dashboard-v3-portable-data");
    assert.deepEqual(payload.dataSources, payload.config.dataSources);
    assert.deepEqual(payload.datasetProfiles, await trackedJson(profilesPath));
    assert.deepEqual(
      Object.keys(payload.sources),
      Object.keys(payload.config.dataSources),
    );
    assert.equal(payload.sources.bio_cases.kind, "csv");
    assert.match(payload.sources.bio_cases.text, /^date,national_total_cases/);
    assert.equal(
      payload.sources.geo_netherlands_provinces.kind,
      "geojson",
    );
    assert.equal(
      payload.sources.geo_netherlands_provinces.data.type,
      "FeatureCollection",
    );
    assert.equal(Object.hasOwn(payload, "generatedAt"), false);
  });
});

test("portable data rejects legacy source inference instead of guessing from extensions", async () => {
  await withTempDirectory(async (directory) => {
    const publicDir = path.join(directory, "public");
    const configDir = path.join(publicDir, "config");
    await mkdir(configDir, { recursive: true });
    await writeFile(
      path.join(configDir, "dashboard.json"),
      JSON.stringify({ dataSources: { cases: "data/cases.csv" } }),
      "utf8",
    );
    await writeFile(
      path.join(configDir, "dataset-profiles.json"),
      JSON.stringify({}),
      "utf8",
    );

    await assert.rejects(
      buildPortableData({
        rootDir: directory,
        outputPath: path.join(directory, "portable.js"),
        embedPortableData: true,
      }),
      /descriptor must be an ordinary data object/i,
    );
  });
});
