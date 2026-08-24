import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

test("export readiness renders every unfinished draft with a direct recovery action", async () => {
  const { default: DashboardPackageExportDialog } = await import(
    "../src/components/build/DashboardPackageExportDialog.jsx"
  );
  const html = renderToStaticMarkup(React.createElement(DashboardPackageExportDialog, {
    open: true,
    issues: [
      { id: "chart-wizard", label: "New chart draft", actionLabel: "Resume chart draft" },
      { id: "scene", label: "Scene draft", actionLabel: "Open Scene Studio" },
    ],
  }));

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, />Finish unfinished work before download</);
  assert.match(html, />New chart draft</);
  assert.match(html, />Resume chart draft</);
  assert.match(html, />Scene draft</);
  assert.match(html, />Open Scene Studio</);
  assert.match(html, />Cancel download</);
});
