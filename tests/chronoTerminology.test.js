import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const retired = [
  ["time", "Sync", "Groups"].join(""),
  ["time", "Sync", "Group"].join(""),
  ["Time", "Sync", "Group"].join(""),
  ["Time", "Group"].join(""),
  ["time", "Group"].join(""),
  ["Time", " Group"].join(""),
  ["time", " group"].join(""),
  ["Time", " groups"].join(""),
  ["time", "-group"].join(""),
  ["time", "_group"].join(""),
  ["TIME", "_GROUP"].join(""),
  ["time synchronization", " group"].join(""),
];
const HISTORICAL_DOCUMENTATION = [
  path.normalize("docs/audits"),
  path.normalize("docs/superpowers/plans"),
  path.normalize("docs/superpowers/sketches"),
];

function containsRetiredToken(value, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`).test(value);
}

async function filesUnder(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  }));
  return nested.flat();
}

test("source, tests, scripts, packaged config, and current documentation use only the Chrono Group domain", async () => {
  const findings = [];
  for (const root of ["src", "tests", "scripts", "public/config", "docs"]) {
    for (const file of await filesUnder(root)) {
      if (file.endsWith("chronoTerminology.test.js")) continue;
      if (HISTORICAL_DOCUMENTATION.some((directory) => file.startsWith(`${directory}${path.sep}`))) continue;
      const text = await readFile(file, "utf8");
      for (const token of retired) if (containsRetiredToken(text, token)) findings.push(`${file}: ${token}`);
      for (const token of retired) if (containsRetiredToken(path.basename(file), token)) findings.push(file);
    }
  }
  const readme = await readFile("README.md", "utf8");
  for (const token of retired) if (containsRetiredToken(readme, token)) findings.push(`README.md: ${token}`);
  assert.deepEqual(findings, []);
});
