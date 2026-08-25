import fs from "node:fs/promises";
import process from "node:process";
import { chromium } from "@playwright/test";
import {
  ACCEPTED_GEOMETRY_TYPES,
  LADDER_DEFINITIONS,
} from "./fixture-generator.mjs";

const baseUrl = argument("--base-url") ?? "http://127.0.0.1:4187";
const outputPath = argument("--output");
if (!outputPath) throw new Error("--output is required");
const onlyDimensions = new Set((argument("--dimensions") ?? "").split(",").filter(Boolean));
const onlyProfiles = new Set((argument("--profiles") ?? "").split(",").filter(Boolean));
const valueOverride = (argument("--values") ?? "").split(",").filter(Boolean).map(Number);

const profiles = [
  { id: "build-1440", viewport: { width: 1440, height: 900 }, cpuRate: 1, heapMiB: 1_024, ladder: "full" },
  { id: "build-1024", viewport: { width: 1024, height: 768 }, cpuRate: 1, heapMiB: 1_024, ladder: "checkpoints" },
  { id: "constrained-1024", viewport: { width: 1024, height: 768 }, cpuRate: 4, heapMiB: 512, ladder: "full" },
];
const projectFixtures = [
  "/data/geo/gemeente_2020.geojson",
  "/data/geo/gemeente_2021.geojson",
  "/data/geo/gemeente_2026.geojson",
  "/data/geo/netherlands-provinces.geojson",
];
const results = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  profiles: [],
};
const repetitions = 3;

for (const profile of profiles.filter((entry) => onlyProfiles.size === 0 || onlyProfiles.has(entry.id))) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      `--js-flags=--max-old-space-size=${profile.heapMiB}`,
      "--enable-precise-memory-info",
    ],
  });
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuRate });
  await page.goto(`${baseUrl}/.planning/spikes/001-geojson-limit-calibration/harness.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.calibrationHarness));
  const environment = await page.evaluate(() => window.calibrationHarness.environment());
  const project = [];
  const ladders = [];
  const profileResult = { ...profile, environment, project, ladders };
  results.profiles.push(profileResult);
  for (const fixture of onlyDimensions.size === 0 ? projectFixtures : []) {
    const result = await page.evaluate(
      ([path, repeats]) => window.calibrationHarness.measureProjectFixture(path, repeats),
      [fixture, repetitions],
    );
    project.push(result);
    progress(profile.id, `project:${result.metadata.id}`, result.phases);
  }
  if (onlyDimensions.has("rollbackProbe")) {
    const result = await page.evaluate(
      (repeats) => window.calibrationHarness.measureGeneratedFixture("totalPositions", 6_630, repeats),
      repetitions,
    );
    ladders.push(result);
    progress(profile.id, "rollbackProbe", result.phases);
  }
  for (const [dimension, values] of Object.entries(LADDER_DEFINITIONS)) {
    if (onlyDimensions.size > 0 && !onlyDimensions.has(dimension)) continue;
    const configuredValues = valueOverride.length > 0 ? valueOverride : values;
    const selected = profile.ladder === "full"
      ? configuredValues
      : [configuredValues[0], configuredValues[Math.floor(configuredValues.length / 2)], configuredValues.at(-1)];
    for (const value of selected) {
      try {
        const result = await page.evaluate(
          ([nextDimension, nextValue, repeats]) => window.calibrationHarness.measureGeneratedFixture(
            nextDimension,
            nextValue,
            repeats,
          ),
          [dimension, value, repetitions],
        );
        ladders.push(result);
        await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
        progress(profile.id, result.metadata.id, result.phases);
        if (hardKnee(result)) {
          process.stdout.write(`EARLY-STOP ${profile.id} ${dimension} after ${value}\n`);
          break;
        }
      } catch (error) {
        ladders.push({ dimension, requestedValue: value, harnessError: error.message });
        await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
        process.stdout.write(`ERROR ${profile.id} ${dimension}-${value}: ${error.message}\n`);
        break;
      }
    }
  }
  if (onlyDimensions.size === 0 || onlyDimensions.has("acceptedGeometryTypes")) {
    for (const geometryType of ACCEPTED_GEOMETRY_TYPES) {
      try {
        const result = await page.evaluate(
          ([value, repeats]) => window.calibrationHarness.measureGeneratedFixture(
            "acceptedGeometryTypes",
            value,
            repeats,
          ),
          [geometryType, repetitions],
        );
        ladders.push(result);
        process.stdout.write(`${profile.id} geometry:${geometryType} map=${result.samples[0]?.mapError ?? "usable"}\n`);
      } catch (error) {
        ladders.push({ dimension: "acceptedGeometryTypes", requestedValue: geometryType, harnessError: error.message });
      }
    }
  }
  await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await browser.close();
}

await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ outputPath, profiles: results.profiles.length })}\n`);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hardKnee(result) {
  const phases = result.phases ?? {};
  return (
    (phases.firstUsableMapMs?.p95 ?? 0) >= 2_000
    || (phases.packageImportMs?.p95 ?? 0) >= 2_000
    || (phases.stableStringifyMs?.p95 ?? 0) >= 2_000
    || (phases.longTasks?.maxDurationMs ?? 0) >= 2_000
  );
}

function progress(profileId, fixtureId, phases) {
  const compact = Object.fromEntries([
    "validateMs",
    "summaryMs",
    "stableStringifyMs",
    "packageImportMs",
    "firstUsableMapMs",
    "interactionResponseMs",
  ].map((key) => [key, phases?.[key]?.p95 ?? null]));
  process.stdout.write(`${profileId} ${fixtureId} ${JSON.stringify(compact)}\n`);
}
