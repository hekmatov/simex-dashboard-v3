import assert from "node:assert/strict";
import test from "node:test";

import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const runtimeModule = await vite
  .ssrLoadModule("/src/components/presentation/usePresentationRuntime.js")
  .catch(() => null);
await vite.close();

test("Audience display information starts entirely hidden", () => {
  assert.deepEqual(runtimeModule?.DEFAULT_AUDIENCE_FACTS, {
    dashboard_name: false,
    page: false,
    parent_chrono_group: false,
    scene_name: false,
    scene_date: false,
  });
});

test("None and each Chrono Group restore their own ordered chart selection and layout", () => {
  const memory = runtimeModule.createPresentationSelectionMemory();
  const all = new Set(["a", "b", "c"]);
  const composition = (ids, layout = "solo") => ({ displayed_chart_ids: ids, layout });
  const a = { kind: "group", id: "group-a" }, b = { kind: "group", id: "group-b" }, none = { kind: "manual" };
  assert.deepEqual(memory.select(a, composition(["a"]), all, ["a", "b"]).chart_ids, []);
  assert.deepEqual(memory.select(b, composition(["b", "a"], "overUnder"), all, ["c"]).chart_ids, []);
  assert.deepEqual(memory.select(none, composition(["c"]), all).chart_ids, ["a"]);
  const restored = memory.select(a, composition([]), all, ["a", "b"]);
  assert.deepEqual(restored.chart_ids, ["b", "a"]);
  assert.equal(restored.layout, "overUnder");
  assert.deepEqual(memory.select(none, composition([]), all).chart_ids, []);
  assert.deepEqual(memory.select(a, composition([]), all, ["a", "b"]).chart_ids, []);
});

test("selection recall drops removed or ineligible charts and leaves saved Scene composition authoritative", () => {
  const memory = runtimeModule.createPresentationSelectionMemory();
  const all = new Set(["a", "b"]), a = { kind: "group", id: "a" };
  memory.select(a, { displayed_chart_ids: [], layout: "solo" }, all, ["a", "b"]);
  assert.equal(memory.select({ kind: "scene", id: "scene" }, { displayed_chart_ids: ["b", "a"], layout: "overUnder" }, all), null);
  const restored = memory.select(a, { displayed_chart_ids: ["b"], layout: "solo" }, new Set(["a"]), ["a"]);
  assert.deepEqual(restored.chart_ids, ["a"]);
});

test("Audience movement auto-saves saved Scenes but leaves raw Chrono Groups session-only", async () => {
  assert.equal(
    typeof runtimeModule?.persistAudienceDatePositionForSource,
    "function",
    "the presentation runtime must own the direct-drag persistence boundary",
  );
  const saves = [];
  const persist = (sceneId, position) => {
    saves.push({ sceneId, position: structuredClone(position) });
    return Promise.resolve("saved");
  };
  const wirePosition = {
    x_permille: 125,
    y_permille: 250,
    width_permille: 375,
  };

  const sceneResult = await runtimeModule.persistAudienceDatePositionForSource(
    { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    wirePosition,
    persist,
  );
  const groupResult = runtimeModule.persistAudienceDatePositionForSource(
    { kind: "Chrono Group", scene_id: null, chrono_group_id: "group-a" },
    wirePosition,
    persist,
  );

  assert.equal(sceneResult, "saved");
  assert.equal(groupResult, null);
  assert.deepEqual(saves, [{
    sceneId: "scene-a",
    position: { xPermille: 125, yPermille: 250, widthPermille: 375 },
  }]);
});
