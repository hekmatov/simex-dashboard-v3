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

test("shared dialog backdrop leaves overlay stacking to each component owner", async () => {
  const [dialogs, base, modes, immersive, drawer] = await Promise.all([
    read("src/styles/dashboard-dialogs.css"),
    read("src/styles.css"),
    read("src/styles/modes.css"),
    read("src/styles/immersive-display.css"),
    read("src/styles/right-side-drawer.css"),
  ]);
  const sharedBackdrop = dialogs.match(/\.dashboard-dialog-backdrop\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(sharedBackdrop, /z-index\s*:/);
  assert.match(dialogs, /:where\(\.dashboard-dialog-backdrop\)\s*\{[^}]*z-index:\s*1000;/s);
  assert.match(base, /\.confirm-dialog-backdrop\s*\{[^}]*z-index:\s*1450/s);
  assert.match(base, /\.chart-editor-backdrop\s*\{[^}]*z-index:\s*1350/s);
  assert.match(modes, /\.build-move-dialog-backdrop\{[^}]*z-index:1300/);
  assert.match(immersive, /\.fullscreen-backdrop--immersive\s*\{[^}]*z-index:\s*1200/s);
  assert.match(drawer, /\[data-drawer-modality="dialog"\]\s*\{[^}]*z-index:\s*1600/s);
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
  assert.match(staticSource, /<h2 id="static-content-dialog-title" className="dashboard-dialog__eyebrow">/);
  assert.doesNotMatch(staticSource, /Edit Text\/Image/);
  assert.match(staticSource, /className="static-content-dialog__title-choice"/);
  assert.match(staticSource, />No title</);
  assert.match(chartSource, /chart-wizard chart-wizard-v3 dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide/);
  assert.match(chartSource, /dashboard-dialog__body/);
  assert.match(editorHost, /chart-editor-backdrop dashboard-dialog-backdrop/);
});

test("authoring shells and fields keep fixed chrome around one responsive workbench", async () => {
  const [dialogs, grammar, staticCss] = await Promise.all([
    read("src/styles/dashboard-dialogs.css"),
    read("src/styles/dashboard-style-grammar.css"),
    read("src/styles/static-content.css"),
  ]);
  const css = `${dialogs}\n${grammar}\n${staticCss}`;

  assert.match(css, /\.dashboard-authoring-shell\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\) auto;/s);
  assert.match(css, /\.dashboard-authoring-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 220px\), 1fr\)\);/s);
  assert.match(css, /\.dashboard-authoring-field--wide\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
  assert.match(css, /\.dashboard-authoring-boolean-row\s*\{[^}]*grid-template-columns:\s*20px minmax\(0, 1fr\);/s);
  assert.match(css, /\.dashboard-authoring-body\s*\{[^}]*min-block-size:\s*0;[^}]*overflow:\s*auto;/s);
  assert.match(css, /\.chart-editor-form\.dashboard-authoring-shell > \.chart-editor-tab-list\s*\{[^}]*grid-row:\s*2;/s);
  assert.match(css, /\.chart-editor-form\.dashboard-authoring-shell > \.chart-editor-layout\s*\{[^}]*grid-row:\s*3;[^}]*overflow:\s*auto;/s);
  assert.match(css, /\.chart-editor-form\.dashboard-authoring-shell > \.dashboard-authoring-footer\s*\{[^}]*grid-row:\s*4;/s);
});

test("detached dashboard roots use typography tokens without fixed fallbacks", async () => {
  const grammar = await read("src/styles/dashboard-style-grammar.css");
  assert.match(grammar, /font-family:\s*var\(--simex-style-body-font\)/);
  assert.match(grammar, /font-family:\s*var\(--simex-style-heading-font\)/);
});

test("dialog eyebrows neutralize legacy global eyebrow paint inside every dialog", async () => {
  const css = await read("src/styles/dashboard-dialogs.css");
  assert.match(
    css,
    /\.dashboard-dialog__eyebrow,\s*\.dashboard-dialog__header h2\.dashboard-dialog__eyebrow,\s*\.dashboard-dialog__header \.eyebrow\s*\{[^}]*color:\s*var\(--simex-accent\)/s,
  );
});

test("base eyebrow paint contains no retired teal fallback", async () => {
  const css = await read("src/styles.css");
  assert.doesNotMatch(css, /#c8f6e7\b/i);
  assert.match(css, /\.eyebrow\s*\{[^}]*color:\s*var\(--simex-text-muted\)/s);
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
  assert.match(immersive, /\.fullscreen-backdrop--immersive\s*\{[^}]*padding:\s*12px;[^}]*overflow:\s*hidden;/s);
  assert.match(immersive, /\.multi-fullscreen-panel\.dashboard-dialog\s*\{[^}]*inline-size:\s*100%;[^}]*block-size:\s*100%;[^}]*max-block-size:\s*none;/s);
  assert.match(immersive, /\.multi-fullscreen-panel\.dashboard-dialog \.multi-fullscreen-grid\s*\{[^}]*block-size:\s*100%;/s);
  assert.match(dialogs, /\.scene-observation-dialog > \.dashboard-dialog\s*\{[^}]*inline-size:\s*min\(100%, 520px\);[^}]*overflow:\s*hidden;[^}]*padding:\s*0;/s);
  assert.match(drawer, /\.right-side-drawer\.dashboard-dialog\s*\{[^}]*max-block-size:\s*none;/s);
  assert.doesNotMatch(drawer, /\.right-side-drawer\.dashboard-dialog\s*\{[^}]*\n\s*block-size:/s);
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
