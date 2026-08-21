import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: BuildStructureRail } = await vite.ssrLoadModule(
  "/src/components/build/BuildStructureRail.jsx",
);
await vite.close();

test("treeitem wrappers own selection, expansion, roving focus, label, and child group", () => {
  const html = renderToStaticMarkup(React.createElement(BuildStructureRail, {
    dashboard: {
      pages: [{
        id: "one",
        label: "One",
        sections: [{
          id: "overview",
          title: "Overview",
          panels: [{ id: "panel", chart: { id: "chart", title: "Chart" } }],
        }],
      }],
    },
    selection: { kind: "page", pageId: "one" },
  }));

  assert.match(html, /<li[^>]*role="treeitem"[^>]*aria-label="One"[^>]*aria-expanded="true"[^>]*aria-selected="true"[^>]*tabindex="0"[^>]*>/);
  assert.match(html, /role="treeitem"[\s\S]*<span class="build-tree-label">One<\/span>[\s\S]*<ul role="group"/);
  assert.match(html, /<ul role="group"[^>]*>[\s\S]*role="treeitem"[\s\S]*<\/ul><\/li>/);
  assert.equal((html.match(/role="treeitem"/g) ?? []).length, 3);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
  assert.match(html, /class="build-tree-caret"[^>]*tabindex="-1"/);
  assert.doesNotMatch(html, /class="build-tree-caret"[^>]*aria-expanded=/);
});
