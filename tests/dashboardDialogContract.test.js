import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

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

DIALOG_SURFACES.push(
  ["src/components/common/ConfirmDialog.jsx", "dashboard-dialog--danger"],
  ["src/components/chart-authoring/ChartConversionDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/BuildLayoutCreateDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/BuildMoveConfirmationDialog.jsx", "dashboard-dialog--danger"],
  ["src/components/build/BuildMoveDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/DashboardPackageExportDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/DashboardPackageReviewDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/DeleteDashboardContentDialog.jsx", "dashboard-dialog--danger"],
  ["src/components/build/SectionStructureCommandDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/BuildWorkspace.jsx", "dashboard-dialog--workspace"],
  ["src/components/app-shell/ApplicationRecovery.jsx", "dashboard-dialog--utility"],
  ["src/components/app-shell/RestoreOnlineDashboardDialog.jsx", "dashboard-dialog--danger"],
);

DIALOG_SURFACES.push(
  ["src/components/FullscreenDisplay.jsx", "dashboard-dialog--fullscreen"],
  ["src/components/time/SceneEditor.jsx", "dashboard-dialog--utility"],
  ["src/components/common/RightSideDrawer.jsx", "dashboard-dialog--workspace"],
);

async function jsxFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) return jsxFiles(url);
    return entry.name.endsWith(".jsx") ? [url] : [];
  }));
  return files.flat();
}

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

test("source action dialog branches provide an internal body before the action footer", async () => {
  const source = await read("src/components/source-content/ContentActionDialog.jsx");
  assert.equal((source.match(/confirm-dialog-body dashboard-dialog__body/g) ?? []).length, 2);
  assert.equal((source.match(/confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions/g) ?? []).length, 2);
  assert.match(
    source,
    /confirm-dialog-body dashboard-dialog__body[\s\S]*?<\/div>\s*<div className="confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions"/,
  );
});

test("danger dialogs retain error paint inside the AppFrame cascade", async () => {
  const css = await read("src/styles/dashboard-dialogs.css");
  assert.match(
    css,
    /\.app-frame \.confirm-dialog\.dashboard-dialog--danger\s*\{[^}]*border-color:\s*var\(--simex-error\);[^}]*box-shadow:[^}]*var\(--simex-error\)/s,
  );
  assert.match(
    css,
    /\.app-frame \.confirm-dialog\.dashboard-dialog--danger button\.danger\s*\{[^}]*background:\s*var\(--simex-error\);[^}]*border-color:\s*var\(--simex-error\)/s,
  );
  assert.match(
    css,
    /\.app-frame \.confirm-dialog\.dashboard-dialog--danger button\.danger:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--simex-error-soft\);[^}]*border-color:\s*var\(--simex-error\)/s,
  );
});

test("Build auxiliary compatibility sizing preserves the narrow viewport contract", async () => {
  const [css, modes] = await Promise.all([
    read("src/styles/dashboard-dialogs.css"),
    read("src/styles/modes.css"),
  ]);
  assert.match(
    css,
    /@media \(min-width:\s*900px\)\s*\{[\s\S]*?\.build-authoring-auxiliary\.dashboard-dialog:is\([\s\S]*?inline-size:\s*min\(980px, calc\(100vw - 428px\)\);[\s\S]*?\}/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*899px\)\s*\{[\s\S]*?\.build-authoring-auxiliary\.dashboard-dialog\s*\{[^}]*inline-size:\s*min\(440px, calc\(100vw - 32px\)\);[\s\S]*?\.build-authoring-auxiliary\.dashboard-dialog:is\([\s\S]*?inline-size:\s*min\(720px, calc\(100vw - 32px\)\);/,
  );
  assert.match(
    modes,
    /@media \(max-width:\s*899px\)\s*\{[\s\S]*?\.build-authoring-auxiliary\s*\{[^}]*width:\s*min\(440px, calc\(100vw - 32px\)\);[\s\S]*?\.build-authoring-auxiliary:is\([\s\S]*?width:\s*min\(720px, calc\(100vw - 32px\)\);/,
  );
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

test("right drawer preserves complementary mode while styling dialog mode", async () => {
  const source = await read("src/components/common/RightSideDrawer.jsx");
  assert.match(source, /modality === "dialog"[\s\S]*?dashboard-dialog--workspace/);
  assert.match(source, /role: modality/);
});

test("display, temporal, and drawer dialog surfaces retain local scroll geometry", async () => {
  const [immersive, dialogs, drawer] = await Promise.all([
    read("src/styles/immersive-display.css"),
    read("src/styles/dashboard-dialogs.css"),
    read("src/styles/right-side-drawer.css"),
  ]);
  assert.match(immersive, /\.multi-fullscreen-panel\.dashboard-dialog\s*\{[^}]*block-size:\s*calc\(100dvh - 24px\);/s);
  assert.match(immersive, /\.multi-fullscreen-panel\.dashboard-dialog \.multi-fullscreen-grid\s*\{[^}]*block-size:\s*100%;/s);
  assert.match(dialogs, /\.scene-observation-dialog > \.dashboard-dialog\s*\{[^}]*inline-size:\s*min\(100%, 520px\);[^}]*overflow:\s*hidden;[^}]*padding:\s*0;/s);
  assert.match(drawer, /\.right-side-drawer\.dashboard-dialog\s*\{[^}]*block-size:\s*100%;[^}]*max-block-size:\s*none;/s);
});

test("every explicit first-party dialog role is registered", async () => {
  const registered = new Set(DIALOG_SURFACES.map(([path]) => path.replaceAll("\\", "/")));
  const files = await jsxFiles(new URL("../src/", import.meta.url));
  for (const url of files) {
    const source = await readFile(url, "utf8");
    const hasExplicitDialogRole = /<[A-Za-z][^>]*\brole\s*=\s*["'](?:alert)?dialog["']/.test(source);
    if (!hasExplicitDialogRole) continue;
    const path = `src/${url.pathname.split("/src/")[1]}`;
    assert.ok(registered.has(path), `${path} must register a dashboard dialog contract`);
  }
});
