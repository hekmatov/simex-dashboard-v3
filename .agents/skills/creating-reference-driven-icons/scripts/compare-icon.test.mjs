import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "compare-icon.mjs");

test("builds a deterministic self-contained fidelity report", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reference-icon-"));
  const referencePath = join(directory, "reference.svg");
  const candidatePath = join(directory, "candidate.svg");
  const firstOutput = join(directory, "first.html");
  const secondOutput = join(directory, "second.html");

  try {
    await writeFile(
      referencePath,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#111"/></svg>',
    );
    await writeFile(
      candidatePath,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="#082552"/></svg>',
    );

    for (const outputPath of [firstOutput, secondOutput]) {
      await execFileAsync(process.execPath, [
        scriptPath,
        "--reference",
        referencePath,
        "--candidate",
        candidatePath,
        "--output",
        outputPath,
      ]);
    }

    const first = await readFile(firstOutput, "utf8");
    const second = await readFile(secondOutput, "utf8");

    assert.equal(first, second);
    assert.match(first, /data:image\/svg\+xml;base64,/);
    assert.match(first, /Same-scale comparison/);
    assert.match(first, /50% overlay/);
    assert.match(first, /Silhouette difference/);
    assert.match(first, /data-preview-size="16"/);
    assert.match(first, /data-preview-size="24"/);
    assert.match(first, /data-preview-size="192"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
