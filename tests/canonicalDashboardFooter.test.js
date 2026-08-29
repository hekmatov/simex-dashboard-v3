import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const [modesCss, globalCss, operationStatusSource] = await Promise.all([
  readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8"),
  readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../src/components/app-shell/OperationStatusViewport.jsx", import.meta.url), "utf8"),
]);

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const {
  default: CanonicalDashboardFrame,
  CanonicalDashboardFooter,
  feedbackUrlForDashboard,
} = await vite.ssrLoadModule(
  "/src/components/dashboard/CanonicalDashboardFrame.jsx",
);
const { default: DashboardCanvas } = await vite.ssrLoadModule(
  "/src/components/dashboard/DashboardCanvas.jsx",
);
await vite.close();

function declarationsForSelector(css, selector) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(",").map((item) => item.trim()).includes(selector))
    .map(([, , declarations]) => declarations);
}

test("live footer derives the public repository Issues destination without package Pages", () => {
  assert.equal(
    feedbackUrlForDashboard({ pages: [] }),
    "https://github.com/hekmatov/simex-dashboard-v3/issues",
  );
  const html = renderToStaticMarkup(React.createElement(CanonicalDashboardFooter, {
    dashboard: { pages: [] },
  }));

  assert.match(
    html,
    /<a href="https:\/\/github\.com\/hekmatov\/simex-dashboard-v3\/issues" target="_blank" rel="noreferrer">Report a bug \/ request a feature<\/a>/,
  );
});

test("Build Add section remains in document flow above footer and notification clearance", () => {
  const pinnedProperties = declarationsForSelector(
    modesCss,
    ".canonical-dashboard-frame .build-add-section-row",
  ).flatMap((declarations) => (
    [...declarations.matchAll(/\b(position|inset(?:-[a-z]+)?|top|right|bottom|left)\s*:/g)]
      .map(([, property]) => property)
  ));
  assert.deepEqual(
    pinnedProperties,
    [],
    "canonical Build CSS must not capture Add section in absolute or pinned panel-action rules",
  );

  const addSectionDeclarations = declarationsForSelector(modesCss, ".build-add-section-row");
  assert.equal(addSectionDeclarations.length, 1);
  assert.match(addSectionDeclarations[0], /display:\s*flex/);
  assert.match(addSectionDeclarations[0], /padding:\s*8px 0 16px/);

  const footerDeclarations = declarationsForSelector(globalCss, ".dashboard-footer");
  assert.equal(footerDeclarations.length, 1);
  assert.match(footerDeclarations[0], /margin-top:\s*22px/);
  assert.match(
    operationStatusSource,
    /bottom:\s*"calc\(var\(--operation-status-footer-offset\) \+ max\(16px, env\(safe-area-inset-bottom\)\)\)"/,
  );

  const activePage = { id: "overview", title: "Overview", sections: [] };
  const dashboard = { globalStyles: {}, pages: [activePage] };
  const html = renderToStaticMarkup(React.createElement(CanonicalDashboardFrame, {
    mode: "build",
    pageType: "dashboard",
    pageId: activePage.id,
    pageContent: React.createElement(DashboardCanvas, {
      activePage,
      dashboard,
      surface: "build",
      buildState: { disabled: false, onAddSection() {} },
    }),
    footer: React.createElement(CanonicalDashboardFooter, { dashboard }),
  }));
  const addSectionIndex = html.indexOf('class="build-add-section-row"');
  const footerIndex = html.indexOf('<footer class="dashboard-footer"');

  assert.ok(addSectionIndex >= 0, "Build renders its Add section row");
  assert.ok(footerIndex > addSectionIndex, "Add section precedes the report-a-bug footer");
  assert.match(
    html,
    /class="build-add-section-row"><button type="button" class="secondary">[\s\S]*?<span>Add section<\/span>/,
  );
});
