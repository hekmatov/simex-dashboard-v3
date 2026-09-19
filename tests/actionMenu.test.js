import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: ActionMenu, actionMenuKeyTarget } = await vite.ssrLoadModule("/src/components/common/ActionMenu.jsx");
await vite.close();

test("closed ActionMenu renders only its trigger with menu semantics", () => {
  const html = renderToStaticMarkup(React.createElement(ActionMenu, {
    id: "section-menu-a",
    label: "Section actions for Hospital pressure",
    items: [{ id: "rename", label: "Rename", onSelect() {} }],
  }, "Actions"));
  assert.match(html, /<button(?=[^>]*aria-haspopup="menu")(?=[^>]*aria-expanded="false")(?=[^>]*aria-controls="section-menu-a")(?=[^>]*aria-label="Section actions for Hospital pressure")[^>]*>Actions<\/button>/);
  assert.doesNotMatch(html, /role="menu"/);
});

test("keyboard targets wrap and skip nothing", () => {
  assert.equal(actionMenuKeyTarget("ArrowDown", 0, 3), 1);
  assert.equal(actionMenuKeyTarget("ArrowDown", 2, 3), 0);
  assert.equal(actionMenuKeyTarget("ArrowUp", 0, 3), 2);
  assert.equal(actionMenuKeyTarget("Home", 2, 3), 0);
  assert.equal(actionMenuKeyTarget("End", 0, 3), 2);
  assert.equal(actionMenuKeyTarget("Tab", 1, 3), null);
});
