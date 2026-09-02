import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Dashboard Look uses the compact choice-row contract", async () => {
  const css = await readFile(
    new URL("../src/styles/dashboard-look.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.look-style-choice,\s*\.look-appearance-option\s*\{[^}]*min-height:\s*var\(--simex-control-compact,\s*28px\);[^}]*padding:\s*3px\s+8px;/s,
  );
  assert.match(
    css,
    /\.look-profile-option\s*\{[^}]*min-height:\s*var\(--simex-control-compact,\s*28px\);[^}]*padding:\s*2px\s+8px;/s,
  );
  assert.match(
    css,
    /\.look-segmented-options label\s*\{[^}]*gap:\s*8px;[^}]*padding:\s*3px\s+8px;/s,
  );
});
