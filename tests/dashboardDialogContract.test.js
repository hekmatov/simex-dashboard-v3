import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const DIALOG_SURFACES = [
  ["src/components/static-content/StaticContentWizard.jsx", "dashboard-dialog--wizard"],
  ["src/components/chart-authoring/ChartWizardV3.jsx", "dashboard-dialog--wizard"],
  ["src/components/chart-authoring/ChartEditorModal.jsx", "dashboard-dialog-backdrop"],
];

DIALOG_SURFACES.push(
  ["src/components/source-content/SourceContentWorkspace.jsx", "dashboard-dialog--workspace"],
  ["src/components/source-content/ContentActionDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/SourceViewer.jsx", "dashboard-dialog--workspace"],
  ["src/components/ColorField.jsx", "dashboard-dialog--compact"],
);

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

test("Text/Image and chart authoring expose dashboard wizard regions", async () => {
  const [staticSource, chartSource, editorHost] = await Promise.all([
    read("src/components/static-content/StaticContentWizard.jsx"),
    read("src/components/chart-authoring/ChartWizardV3.jsx"),
    read("src/components/chart-authoring/ChartEditorModal.jsx"),
  ]);
  assert.match(staticSource, /static-content-dialog dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide/);
  assert.match(staticSource, /dashboard-dialog__header/);
  assert.match(staticSource, /dashboard-dialog__progress/);
  assert.match(staticSource, /dashboard-dialog__footer/);
  assert.match(chartSource, /chart-wizard chart-wizard-v3 dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide/);
  assert.match(chartSource, /dashboard-dialog__body/);
  assert.match(editorHost, /chart-editor-backdrop dashboard-dialog-backdrop/);
});

test("every registered dialog surface adopts its dashboard contract class", async () => {
  for (const [path, contractClass] of DIALOG_SURFACES) {
    const source = await read(path);
    assert.match(
      source,
      new RegExp(contractClass),
      `${path} must opt into ${contractClass}`,
    );
  }
});
