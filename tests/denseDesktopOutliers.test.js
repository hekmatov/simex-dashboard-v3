import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("confirmed dense desktop outliers have explicit semantic geometry", async () => {
  const [styles, modes, dialogs] = await Promise.all([
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/dashboard-dialogs.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    styles,
    /\.app-frame \.chart-authoring-field[\s\S]*?font-size:\s*var\(--simex-control-font-size\)[\s\S]*?line-height:\s*var\(--simex-control-line-height\)[\s\S]*?min-block-size:\s*var\(--simex-control-standard\)[\s\S]*?padding-block:\s*var\(--simex-space-2\)[\s\S]*?padding-inline:\s*var\(--simex-space-3\)/,
  );
  assert.match(
    styles,
    /\.app-frame \.chart-authoring-field[^{]*select:not\(\[multiple\]\)[^{]*\{[^}]*block-size:\s*var\(--simex-control-standard\)[^}]*max-block-size:\s*var\(--simex-control-standard\)/s,
  );
  assert.match(
    styles,
    /\.app-frame \.chart-authoring-field[^{]*select\[multiple\][^{]*\{[^}]*block-size:\s*auto[^}]*height:\s*auto/s,
  );
  assert.match(
    styles,
    /\.settings-color-preset-grid\s*\{[^}]*grid-auto-flow:\s*row[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*var\(--simex-control-standard\)\)/s,
  );
  assert.match(
    styles,
    /\.app-frame \.settings-color-preset-grid button\s*\{[^}]*block-size:\s*var\(--simex-control-standard\)[^}]*inline-size:\s*var\(--simex-control-standard\)[^}]*padding:\s*0/s,
  );
  assert.match(styles, /\.chart-authoring-field\s*\{[^}]*gap:\s*var\(--simex-gap-label-control\)/s);
  assert.match(styles, /\.chart-authoring-field > legend\s*\{[^}]*margin-bottom:\s*var\(--simex-gap-label-control\)/s);
  assert.match(styles, /\.settings-color-field\s*\{[^}]*gap:\s*var\(--simex-gap-label-control\)/s);
  assert.match(styles, /\.settings-color-palette-group\s*\{[^}]*gap:\s*var\(--simex-space-2\)/s);
  assert.match(styles, /\.settings-color-preset-grid\s*\{[^}]*gap:\s*var\(--simex-space-2\)/s);
  assert.match(
    modes,
    /\.scene-unit-orbit__moves\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.match(
    modes,
    /\.scene-unit-orbit__moves > button\s*\{[^}]*block-size:\s*var\(--simex-control-standard\)[^}]*white-space:\s*nowrap/s,
  );
  assert.match(
    modes,
    /\.scene-details-stage__fields\s*\{[^}]*align-items:\s*start[^}]*gap:\s*var\(--simex-gap-section\)[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.match(
    dialogs,
    /\.restore-online-dashboard-dialog \.dashboard-dialog__footer\s*\{[^}]*display:\s*grid[^}]*gap:\s*var\(--simex-gap-control-group\)[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.match(
    dialogs,
    /\.restore-online-dashboard-dialog \.dashboard-dialog__footer > \.control-tooltip\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*width:\s*100%/s,
  );
});
