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

test("text panels avoid a scrollbar when visible text exactly fits", () => {
  assert.equal(typeof textPanelFitsWithoutScroll, "function");
  assert.equal(textPanelFitsWithoutScroll({
    contentBottom: 400,
    panelTop: 100,
    panelHeight: 300,
  }), true);
  assert.equal(textPanelFitsWithoutScroll({
    contentBottom: 401,
    panelTop: 100,
    panelHeight: 300,
  }), false);
});
