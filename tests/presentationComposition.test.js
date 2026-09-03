import assert from "node:assert/strict";
import test from "node:test";

import { createServer } from "vite";
import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const controllerModule = await vite.ssrLoadModule(
  "/src/components/presentation/PresentationController.jsx",
).catch(() => null);
const appModule = await vite.ssrLoadModule("/src/App.jsx").catch(() => null);
await vite.close();

const mutationModule = await import(
  "../src/lib/sceneDatePositionMutation.js"
).catch(() => null);

const savedPosition = Object.freeze({
  xPermille: 680,
  yPermille: 40,
  widthPermille: 280,
});

test("targeted date persistence rejects non-durable storage and preserves the accepted dashboard", async () => {
  assert.equal(typeof appModule?.saveSceneDatePositionDurably, "function");
  const dashboard = dashboardFixture();
  const controller = createSerializedDashboardCommitController({
    initialDashboard: dashboard,
    commit: async (candidate) => candidate,
  });
  let durableRequested = false;

  await assert.rejects(appModule.saveSceneDatePositionDurably({
    controller,
    persist: async (_candidate, options) => {
      durableRequested = options?.requireDurableStorage === true;
      throw new Error("Browser dashboard storage is unavailable.");
    },
    sceneId: "scene-a",
    datePosition: { xPermille: 125, yPermille: 250, widthPermille: 375 },
  }), /storage is unavailable/i);

  assert.equal(durableRequested, true);
  assert.deepEqual(controller.getCurrent(), dashboard);
});

test("targeted durable persistence commits the complete dashboard instead of the mutation result", async () => {
  const dashboard = dashboardFixture();
  const controller = createSerializedDashboardCommitController({
    initialDashboard: dashboard,
    commit: async (candidate) => candidate,
  });
  let persistedCandidate = null;

  await appModule.saveSceneDatePositionDurably({
    controller,
    persist: async (candidate, options) => {
      assert.equal(options?.requireDurableStorage, true);
      persistedCandidate = structuredClone(candidate);
      return candidate;
    },
    sceneId: "scene-a",
    datePosition: { xPermille: 125, yPermille: 250, widthPermille: 375 },
  });

  assert.equal(persistedCandidate.id, dashboard.id);
  assert.equal(persistedCandidate.configVersion, dashboard.configVersion);
  assert.equal(persistedCandidate.scenes.length, dashboard.scenes.length);
  assert.deepEqual(persistedCandidate.scenes[0].audience.datePosition, {
    xPermille: 125,
    yPermille: 250,
    widthPermille: 375,
  });
  assert.deepEqual(persistedCandidate.scenes[1], dashboard.scenes[1]);
});

test("the Scene mutation changes one camelCase datePosition and preserves every unrelated field", () => {
  assert.equal(typeof mutationModule?.mutateSceneDatePosition, "function");
  const dashboard = dashboardFixture();
  const beforeSibling = structuredClone(dashboard.scenes[1]);
  const beforeTarget = structuredClone(dashboard.scenes[0]);
  const result = mutationModule.mutateSceneDatePosition(
    dashboard,
    "scene-a",
    { xPermille: 125, yPermille: 250, widthPermille: 375 },
  );

  assert.deepEqual(result, { xPermille: 125, yPermille: 250, widthPermille: 375 });
  assert.deepEqual(dashboard.scenes[1], beforeSibling);
  assert.deepEqual(dashboard.scenes[0], {
    ...beforeTarget,
    audience: {
      ...beforeTarget.audience,
      datePosition: { xPermille: 125, yPermille: 250, widthPermille: 375 },
    },
  });
  assert.equal(Object.hasOwn(dashboard.scenes[0].audience.datePosition, "x_permille"), false);
});

test("the targeted mutation rejects missing or no-longer-valid Scenes without partial writes", () => {
  const dashboard = dashboardFixture();
  const before = structuredClone(dashboard);
  assert.throws(() => mutationModule.mutateSceneDatePosition(
    dashboard,
    "missing",
    savedPosition,
  ), /does not exist/i);
  assert.deepEqual(dashboard, before);

  dashboard.scenes[0].members = [];
  const invalidBefore = structuredClone(dashboard);
  assert.throws(() => mutationModule.mutateSceneDatePosition(
    dashboard,
    "scene-a",
    { xPermille: 100, yPermille: 100, widthPermille: 200 },
  ), /at least one chart/i);
  assert.deepEqual(dashboard, invalidBefore);
});

test("saved Scene date position maps from dashboard camelCase to Audience wire format", () => {
  const dashboard = dashboardFixture();
  const scene = dashboard.scenes[0];
  const playback = {
    activeScene: scene,
    activeSceneId: scene.id,
    activeGroup: dashboard.chronoGroups[0],
    activeGroupId: "group-a",
    activeIndex: 0,
    clock: [Date.parse(scene.period.start)],
    speed: 1,
    traceMode: "reveal",
  };
  const projected = controllerModule.buildPresentationState({
    dashboard,
    activePageId: "page-a",
    displayedChartIds: ["chart-a"],
    layout: "solo",
    playback,
    presentableItemIndex: new Map([
      ["chart-a", { descriptor: { kind: "chart", chart_id: "chart-a" } }],
    ]),
    audienceFacts: {},
  });

  assert.deepEqual(projected.audience.date_position, {
    x_permille: 680,
    y_permille: 40,
    width_permille: 280,
  });
});

function dashboardFixture() {
  const chart = { id: "chart-a", pageId: "page-a", title: "Cases" };
  const scene = {
    id: "scene-a",
    name: "Response scene",
    pageId: "page-a",
    chronoGroupId: "group-a",
    period: {
      start: "2027-01-01T00:00:00.000Z",
      end: "2027-01-02T23:59:59.999Z",
    },
    members: [{ chartId: "chart-a", width: 1 }],
    frames: { mode: "calendar", interval: { value: 1, unit: "day" } },
    present: { chartIds: ["chart-a"], layout: "single" },
    audience: { datePosition: structuredClone(savedPosition) },
    note: "preserve me",
  };
  return {
    id: "dashboard-a",
    configVersion: 3,
    pages: [{ id: "page-a", sections: [{ id: "section-a", panels: [chart] }] }],
    chronoGroups: [{
      id: "group-a",
      period: { start: "2027-01-01", end: "2027-01-31" },
      members: [{ chartId: "chart-a" }],
    }],
    scenes: [scene, { ...structuredClone(scene), id: "scene-b", name: "Sibling" }],
  };
}
