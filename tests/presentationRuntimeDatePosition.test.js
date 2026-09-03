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
