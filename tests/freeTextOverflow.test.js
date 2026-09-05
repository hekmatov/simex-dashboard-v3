import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { textPanelFitsWithoutScroll } = await vite.ssrLoadModule(
  "/src/components/charts/FreeTextChartView.jsx",
);
await vite.close();

test("text panels avoid a scrollbar only when visible text retains 12px of clearance", () => {
  assert.equal(typeof textPanelFitsWithoutScroll, "function");
  assert.equal(textPanelFitsWithoutScroll({
    contentBottom: 388,
    panelTop: 100,
    panelHeight: 300,
  }), true);
  assert.equal(textPanelFitsWithoutScroll({
    contentBottom: 389,
    panelTop: 100,
    panelHeight: 300,
  }), false);
});
