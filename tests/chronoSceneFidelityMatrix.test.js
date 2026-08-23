import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const matrixUrl = new URL("../docs/audits/2026-08-22-v3-step-7-build-view/CHRONO-SCENE-FIDELITY-MATRIX.md", import.meta.url);

test("Sketch 005, 006, and 012 fidelity matrix has no incomplete binding row", async () => {
  const markdown = await readFile(matrixUrl, "utf8");
  const rows = markdown.split(/\r?\n/).filter((line) => /^\| (005|006|012)-/.test(line));
  assert.ok(rows.length > 0);
  for (const sketch of ["005", "006", "012"]) {
    assert.ok(rows.some((row) => row.startsWith(`| ${sketch}-`)), `Missing Sketch ${sketch} binding rows`);
  }
  for (const row of rows) {
    const fields = row.split("|").slice(1, -1).map((field) => field.trim());
    assert.equal(fields.length, 9, `Expected nine fidelity fields in ${fields[0]}`);
    assert.ok(fields.every(Boolean), `Every fidelity field must be populated in ${fields[0]}`);
    assert.equal(fields[7], "Passing", `${fields[0]} is not ready for review`);
    assert.doesNotMatch(row, /\b(?:Missing|Partial)\b/);
  }
});
