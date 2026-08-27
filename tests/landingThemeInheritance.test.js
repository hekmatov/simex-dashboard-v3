import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("showcase landing inherits the dashboard semantic theme and style grammar", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const start = styles.indexOf("/* Showcase landing */");
  const end = styles.indexOf("\n.section-title-block", start);
  assert.ok(start >= 0 && end > start, "showcase landing CSS block should be present");
  const landing = styles.slice(start, end);

  for (const token of [
    "--simex-surface-canvas",
    "--simex-surface-panel",
    "--simex-surface-panel-alt",
    "--simex-text-strong",
    "--simex-text-muted",
    "--simex-border-subtle",
    "--simex-accent",
    "--simex-accent-soft",
    "--simex-on-accent",
    "--simex-warning",
    "--simex-warning-soft",
    "--simex-focus",
    "--simex-style-heading-font",
    "--simex-style-body-font",
    "--simex-style-surface-radius",
    "--simex-style-control-radius",
    "--simex-style-panel-shadow",
    "--simex-style-transition-duration",
  ]) {
    assert.match(landing, new RegExp(token), `landing must consume ${token}`);
  }

  assert.doesNotMatch(
    landing,
    /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(?:white|black)\b/i,
    "landing must not define an independent raw color palette",
  );
});
