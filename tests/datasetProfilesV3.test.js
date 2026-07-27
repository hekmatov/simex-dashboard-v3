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
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { parseCsvText } from "../src/lib/loadCsv.js";
import { loadDashboardConfig } from "../src/lib/loadDashboard.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardPath = path.join(rootDir, "public", "config", "dashboard.json");
const profilesPath = path.join(rootDir, "public", "config", "dataset-profiles.json");

async function trackedJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

test("every retained tabular source has exactly one reusable profile", async () => {
  const dashboard = await trackedJson(dashboardPath);
  const profiles = await trackedJson(profilesPath);
  const tabularIds = Object.entries(dashboard.dataSources)
    .filter(([, source]) => source.kind === "csv")
    .map(([sourceId]) => sourceId)
    .toSorted();

  assert.equal(tabularIds.length, 32);
  assert.deepEqual(Object.keys(profiles), tabularIds);
  for (const sourceId of tabularIds) {
    assert.equal(profiles[sourceId].sourceId, sourceId);
    assert.equal(profiles[sourceId].kind, "csv");
    assert.equal(profiles[sourceId].path, dashboard.dataSources[sourceId].path);
    assert.ok(profiles[sourceId].columns.length > 0, `${sourceId} has no columns`);
  }
});

test("mortality dates use the explicit day-month-year date-only rule", async () => {
  const profiles = await trackedJson(profilesPath);
  const date = profiles.bio_mortality.columns.find(({ name }) => name === "date");

  assert.deepEqual(date.parsing, {
    interpretation: "temporal",
    format: "DD/MM/YYYY",
    timezone: "date-only",
  });
  assert.deepEqual(date.temporalValues, [
    "2027-05-02",
    "2027-05-02",
    "2027-05-02",
  ]);
  assert.deepEqual(date.warnings, []);
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
  assert.deepEqual(caseColumns.date.parsing, {
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
  assert.deepEqual(testingColumns.tests_per_day.warnings, []);
  assert.ok(Array.isArray(profiles.socio_behaviour.warnings));
  assert.deepEqual(
    Object.keys(profiles.bio_cases.provenance),
    ["label"],
  );
});

test("generator and runtime use the same CSV parser and profiler authority", async () => {
  const dashboard = await trackedJson(dashboardPath);
  const profiles = await trackedJson(profilesPath);
  const source = dashboard.dataSources.bio_cases;
  const csvText = await readFile(path.join(rootDir, "public", source.path), "utf8");
  const rows = parseCsvText(csvText, source.path);
  const authorityProfile = profileDataset(rows, source.parsingMetadata);

  assert.equal(profiles.bio_cases.rowCount, authorityProfile.rowCount);
  assert.equal(profiles.bio_cases.fingerprint, authorityProfile.fingerprint);
  assert.deepEqual(
    profiles.bio_cases.columns.map(({ name, type, examples }) => ({
      name,
      type,
      examples,
    })),
    authorityProfile.columns.map(({ name, type, examples }) => ({
      name,
      type,
      examples,
    })),
  );
});

test("profile generation is byte-identical across repeated runs", async () => {
  await withTempDirectory(async (directory) => {
    const first = path.join(directory, "first.json");
    const second = path.join(directory, "second.json");
    await generateDatasetProfiles({ rootDir, outputPath: first });
    await generateDatasetProfiles({ rootDir, outputPath: second });

    assert.equal(await readFile(first, "utf8"), await readFile(second, "utf8"));
    assert.equal(await readFile(first, "utf8"), await readFile(profilesPath, "utf8"));
  });
});

test("profile generation rejects traversal, absolute paths, legacy strings, and missing files", async () => {
  await withTempDirectory(async (directory) => {
    const publicDir = path.join(directory, "public");
    const configDir = path.join(publicDir, "config");
    await mkdir(configDir, { recursive: true });
    const outputPath = path.join(configDir, "dataset-profiles.json");

    for (const [source, message] of [
      [{ kind: "csv", path: "../secret.csv" }, /safe relative public path/i],
      [{ kind: "csv", path: "C:/secret.csv" }, /safe relative public path/i],
      [
        {
          kind: "csv",
          path: "data/%2e%2e/secret.csv",
          provenance: { label: "Encoded traversal fixture" },
        },
        /safe relative public path/i,
      ],
      ["data/cases.csv", /descriptor must be an object/i],
      [
        {
          kind: "csv",
          path: "data/missing.csv",
          provenance: { label: "Missing fixture" },
        },
        /could not be read/i,
      ],
    ]) {
      const configPath = path.join(configDir, "dashboard.json");
      await writeFile(
        configPath,
        JSON.stringify({ dataSources: { unsafe: source } }),
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

test("runtime loading fails closed for missing, invalid, or mismatched profiles", async () => {
  const source = {
    kind: "csv",
    path: "data/cases.csv",
    provenance: { label: "Fixture" },
    parsingMetadata: {},
  };
  const validProfile = {
    sourceId: "cases",
    kind: "csv",
    path: "data/cases.csv",
    provenance: { label: "Fixture" },
    rowCount: 1,
    columns: [{ name: "date", type: "temporal", examples: ["2027-01-01"] }],
    warnings: [],
    fingerprint: "a".repeat(64),
  };

  await assert.rejects(
    loadDashboardConfig({ dataSources: { cases: source } }, {}),
    /missing dataset profile/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      { dataSources: { cases: source } },
      { cases: { ...validProfile, path: "data/other.csv" } },
    ),
    /profile path does not match/i,
  );
  await assert.rejects(
    loadDashboardConfig(
      {
        dataSources: {
          cases: { ...source, path: "../cases.csv" },
        },
      },
      { cases: { ...validProfile, path: "../cases.csv" } },
    ),
    /safe relative public path/i,
  );
});

test("runtime safely loads CSV and GeoJSON descriptors with reusable profiles", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("data/cases.csv")) {
      return new Response("date,cases\n2027-01-01,7\n");
    }
    if (String(url).endsWith("data/regions.geojson")) {
      return new Response(
        JSON.stringify({ type: "FeatureCollection", features: [] }),
        { headers: { "content-type": "application/json" } },
      );
    }
    return new Response("", { status: 404 });
  };

  try {
    const dashboard = await loadDashboardConfig(
      {
        dataSources: {
          cases: {
            kind: "csv",
            path: "data/cases.csv",
            provenance: { label: "Fixture cases" },
            parsingMetadata: {},
          },
          regions: {
            kind: "geojson",
            path: "data/regions.geojson",
            provenance: { label: "Fixture boundaries" },
          },
        },
      },
      {
        cases: {
          sourceId: "cases",
          kind: "csv",
          path: "data/cases.csv",
          provenance: { label: "Fixture cases" },
          rowCount: 1,
          columns: [
            {
              name: "date",
              type: "temporal",
              missingCount: 0,
              uniqueCount: 1,
              examples: ["2027-01-01"],
              parsing: { interpretation: "auto", format: "YYYY-MM-DD" },
              warnings: [],
            },
            {
              name: "cases",
              type: "numeric",
              missingCount: 0,
              uniqueCount: 1,
              examples: [7],
              warnings: [],
            },
          ],
          warnings: [],
          fingerprint: "a".repeat(64),
        },
      },
    );

    assert.deepEqual(dashboard.loadedData.cases, [
      { date: "2027-01-01", cases: 7 },
    ]);
    assert.deepEqual(dashboard.loadedData.regions, {
      type: "FeatureCollection",
      features: [],
    });
    assert.deepEqual(Object.keys(dashboard.datasetProfiles), ["cases"]);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("portable data embeds descriptors, profiles, and source bytes deterministically", async () => {
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
      /descriptor must be an object/i,
    );
  });
});
