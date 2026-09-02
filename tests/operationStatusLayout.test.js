import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("operation notices stay below an open dashboard dialog", async () => {
  const css = await readFile(
    new URL("../src/styles/operation-status.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.operation-status-viewport\s*\{[^}]*z-index:\s*1500;/s,
  );
  assert.match(
    css,
    /body:has\(\.dashboard-dialog-backdrop\) \.operation-status-viewport\s*\{[^}]*z-index:\s*900;/s,
  );
});
