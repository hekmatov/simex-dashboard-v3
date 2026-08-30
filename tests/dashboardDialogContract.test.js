import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const DIALOG_SURFACES = [];

test("dashboard dialog contract loads after the base dashboard grammar", async () => {
  const main = await read("src/main.jsx");
  assert.ok(
    main.indexOf('import "./styles/dashboard-style-grammar.css"')
      < main.indexOf('import "./styles/dashboard-dialogs.css"'),
  );
});

test("dashboard dialog contract exposes every semantic variant using dashboard tokens", async () => {
  const css = await read("src/styles/dashboard-dialogs.css");
  for (const selector of [
    ".dashboard-dialog-backdrop",
    ".dashboard-dialog",
    ".dashboard-dialog--wizard",
    ".dashboard-dialog--workspace",
    ".dashboard-dialog--utility",
    ".dashboard-dialog--danger",
    ".dashboard-dialog__header",
    ".dashboard-dialog__eyebrow",
    ".dashboard-dialog__title",
    ".dashboard-dialog__progress",
    ".dashboard-dialog__body",
    ".dashboard-dialog__footer",
    ".dashboard-dialog__actions",
  ]) assert.match(css, new RegExp(selector.replaceAll(".", "\\.")));
  for (const token of [
    "--simex-surface-panel",
    "--simex-surface-panel-alt",
    "--simex-surface-canvas",
    "--simex-border-subtle",
    "--simex-border-strong",
    "--simex-text-strong",
    "--simex-text-muted",
    "--simex-selected",
    "--simex-error",
    "--simex-focus",
    "--simex-control-min",
  ]) assert.match(css, new RegExp(`var\\(${token}`));
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});

test("every registered dialog surface adopts a dashboard dialog variant", async () => {
  for (const path of DIALOG_SURFACES) {
    const source = await read(path);
    assert.match(
      source,
      /dashboard-dialog--(?:wizard|workspace|utility|danger)/,
      `${path} must opt into a dashboard dialog variant`,
    );
  }
});
