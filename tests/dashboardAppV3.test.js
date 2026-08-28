import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { register } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

async function source(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

test("the live shell is version 3 only", async () => {
  const app = await source("src/App.jsx");
  const dashboardMode = await source("src/lib/dashboardMode.js");
  assert.match(dashboardMode, /simex-dashboard-config-v3-three-mode-v1/);
  assert.doesNotMatch(app, /DASHBOARD_STORAGE_KEY = "simex-dashboard-config-v3"/);
  assert.match(app, /parseDashboardBundle/);
  assert.match(app, /serializeDashboardBundle/);
  assert.doesNotMatch(app, /migrateDashboardToDataModel/);
  assert.doesNotMatch(app, /simex-dashboard-v2-bundle/);
  assert.doesNotMatch(app, /simex-dashboard-v2-config/);
});

test("the shared runtime keeps version 3 authoring while App owns playback", async () => {
  const app = await source("src/App.jsx");
  const renderer = await source("src/components/DashboardRenderer.jsx");
  assert.match(app, /PlaybackProvider/);
  assert.match(renderer, /ChartWizardV3/);
  assert.match(renderer, /ChartEditorV3/);
  assert.doesNotMatch(renderer, /<PlaybackProvider\b/);
  assert.doesNotMatch(renderer, /AddChartWizard/);
  assert.doesNotMatch(renderer, /ChartSettingsPanelV2/);
  assert.doesNotMatch(renderer, /LegacyEditor/);
});

test("source runtime state is excluded from packages and gates only affected playback groups", async () => {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: process.cwd(),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const {
    configurationForEditBaseline,
    configurationForStorage,
    readyChronoGroups,
  } = await vite.ssrLoadModule("/src/App.jsx");
  await vite.close();
  const dashboard = minimalDashboard();
  dashboard.loadedData = {};
  dashboard.dataSourceStates = { status: { status: "loading" } };
  dashboard.chartDataStates = {
    "status-share": { status: "partial", unavailableSeries: "Exercise status" },
  };
  dashboard.chronoGroups = [{
    id: "status-group",
    members: [{ chartId: "status-share" }],
  }];

  assert.deepEqual(readyChronoGroups(dashboard), []);
  dashboard.dataSourceStates.status = { status: "ready" };
  assert.deepEqual(
    readyChronoGroups(dashboard).map(({ id }) => id),
    ["status-group"],
  );

  const stored = configurationForStorage(dashboard);
  assert.equal(Object.hasOwn(stored, "loadedData"), false);
  assert.equal(Object.hasOwn(stored, "dataSourceStates"), false);
  assert.equal(Object.hasOwn(stored, "chartDataStates"), false);

  const trackedProfile = { fields: { date: { type: "date" } } };
  dashboard.dataSources = { status: { kind: "csv" } };
  dashboard.datasetProfiles = { status: trackedProfile };
  const baseline = configurationForEditBaseline(dashboard, { status: trackedProfile });
  assert.equal(Object.hasOwn(baseline, "loadedData"), false);
  assert.equal(Object.hasOwn(baseline, "datasetProfiles"), false);

  dashboard.dataSources.status = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "status.csv",
    csvText: "date,value\n2026-08-25,1\n",
  };
  const importedTracked = configurationForStorage(dashboard, { status: trackedProfile });
  assert.equal(
    Object.hasOwn(importedTracked, "datasetProfiles"),
    false,
    "an imported copy of a tracked source must not duplicate its unchanged profile in localStorage",
  );
  dashboard.datasetProfiles.status = { fields: { date: { type: "string" } } };
  const importedChanged = configurationForStorage(dashboard, { status: trackedProfile });
  assert.deepEqual(importedChanged.datasetProfiles, dashboard.datasetProfiles);
});

test("App owns one scoped content coordinator and transports only its wrappers through authoring", async () => {
  const app = await source("src/App.jsx");
  const renderer = await source("src/components/DashboardRenderer.jsx");
  const modeWorkspace = await source("src/components/dashboard/DashboardModeWorkspace.jsx");
  const buildWorkspace = await source("src/components/build/BuildWorkspace.jsx");
  const chartWizard = await source("src/components/chart-authoring/ChartWizardV3.jsx");
  const staticWizard = await source("src/components/static-content/StaticContentWizard.jsx");

  assert.match(app, /createContentDraftCoordinator/);
  assert.match(app, /createDeferredCoordinatorDisposal/);
  assert.match(app, /contentDraftCoordinatorDisposalRef\.current\.retain\(contentDraftCoordinator\)/);
  assert.match(app, /contentDraftCoordinator\.subscribe\(\(activeRetainers\)/);
  assert.match(app, /reconcileSavedAuthoredAssets\(current, activeRetainers\)/);
  assert.match(app, /<DashboardRenderer[\s\S]*contentDraftCoordinator=/);
  assert.match(renderer, /onContentDraftStage[\s\S]*stageDraft/);
  assert.match(renderer, /onContentDraftCommit[\s\S]*commitDraft/);
  assert.match(renderer, /onContentDraftDiscard[\s\S]*discardDraft/);
  assert.match(renderer, /<DashboardModeWorkspace[\s\S]*contentDraftCoordinator=/);
  assert.match(renderer, /<BuildWorkspace[\s\S]*contentDraftCoordinator=/);
  assert.match(renderer, /<ChartWizardV3[\s\S]*onContentDraftStage=/);
  assert.match(renderer, /<StaticContentWizard[\s\S]*onContentDraftStage=/);
  assert.match(renderer, /<ChartWizardV3[\s\S]*contentDraftCoordinator=/);
  assert.match(renderer, /<StaticContentWizard[\s\S]*contentDraftCoordinator=/);
  for (const sourceText of [modeWorkspace, buildWorkspace]) {
    assert.match(sourceText, /contentDraftCoordinator/);
  }
  for (const sourceText of [chartWizard, staticWizard]) {
    assert.match(sourceText, /contentDraftCoordinator/);
    assert.match(sourceText, /onContentDraftStage/);
    assert.match(sourceText, /onContentDraftCommit/);
    assert.match(sourceText, /onContentDraftDiscard/);
  }
  assert.match(app, /commitDashboard: commitDurableContentDraftConfiguration/);
  assert.match(app, /replaceWith\([\s\S]*createDurableContentDraftCommit\(persistConfiguration\)/);
});

test("content draft dashboard commits require durable storage and survive a reload", async () => {
  const { createServer } = await import("vite");
  const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  const { createDurableContentDraftCommit } = await vite.ssrLoadModule("/src/App.jsx");
  await vite.close();
  let stored = null;
  for (const message of ["Dashboard asset storage is unavailable.", "Browser dashboard storage is unavailable."]) {
    const failing = createDurableContentDraftCommit(async (_candidate, options) => {
      assert.equal(options.requireDurableStorage, true);
      throw new Error(message);
    });
    await assert.rejects(failing({ contentLibrary: { mediaItems: { unused: {} } } }), /storage is unavailable/);
    assert.equal(stored, null);
  }
  const commit = createDurableContentDraftCommit(async (candidate, options) => {
    assert.equal(options.requireDurableStorage, true);
    stored = JSON.stringify(candidate);
    return structuredClone(candidate);
  });
  await commit({ contentLibrary: { mediaItems: { unused: { mediaId: "unused" } } } });
  assert.equal(JSON.parse(stored).contentLibrary.mediaItems.unused.mediaId, "unused");
});

test("legacy chart-system files are absent after the clean cutover", async () => {
  const legacyFiles = [
    "src/components/AddChartWizard.jsx",
    "src/components/DataBindingEditor.jsx",
    "src/components/ChartSettingsPanel.jsx",
    "src/components/ChartSettingsPanelV2.jsx",
    "src/lib/buildEchartsOption.js",
    "src/lib/chartDataModel.js",
    "src/lib/chartOptionRegistry.js",
    "src/lib/dashboardCompatibility.js",
    "src/lib/validateConfig.js",
    "scripts/migrate-chart-schema-v2.mjs",
    "tests/chartDataModel.test.js",
    "tests/dashboardBindings.test.js",
    "tests/dashboardCompatibility.test.js",
    "docs/chart-data-system-v2.md",
  ];

  for (const relativePath of legacyFiles) {
    await assert.rejects(
      access(path.join(ROOT, relativePath)),
      undefined,
      `${relativePath} must not survive the v3 cutover`,
    );
  }
});

test("only the v3 storage key is read and malformed current state fails closed", async () => {
  const {
    readDashboardStorage,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const storageKey = "simex-dashboard-config-v3";
  const values = new Map([
    ["simex-dashboard-v2-config-pages-v2", JSON.stringify(minimalDashboard())],
  ]);
  const storage = { getItem: (key) => values.get(key) ?? null };

  assert.equal(readDashboardStorage(storage, storageKey), null);

  values.set(storageKey, JSON.stringify({
    ...minimalDashboard(),
    configVersion: 2,
  }));
  assert.throws(
    () => readDashboardStorage(storage, storageKey),
    /version 5 or 6/i,
  );
});

test("chart creation and saving are immutable whole-dashboard mutations", async () => {
  const {
    integrateCreatedChart,
    integrateSavedChart,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const original = minimalDashboard();
  const snapshot = structuredClone(original);
  const createdChart = kpiChart({
    id: "current-capacity",
    title: "Current capacity",
  });

  const created = integrateCreatedChart(
    original,
    { chart: createdChart },
    { pageId: "overview", sectionId: "status" },
  );
  assert.deepEqual(original, snapshot);
  assert.deepEqual(
    created.pages[0].sections[0].panels.map(({ id }) => id),
    ["status-share", "current-capacity"],
  );

  const saved = integrateSavedChart(created, {
    chart: { ...createdChart, title: "Updated capacity" },
    chronoGroups: [],
  });
  assert.equal(created.pages[0].sections[0].panels[1].title, "Current capacity");
  assert.equal(saved.pages[0].sections[0].panels[1].title, "Updated capacity");
});

test("saving a wrapped chart preserves its stable panel placement", async () => {
  const {
    integrateSavedChart,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const dashboard = minimalDashboard();
  const chart = dashboard.pages[0].sections[0].panels[0];
  dashboard.pages[0].sections[0].panels[0] = {
    id: "status-placement",
    chart,
  };

  const saved = integrateSavedChart(dashboard, {
    chart: { ...chart, title: "Updated wrapped chart" },
    chronoGroups: [],
  });

  assert.equal(saved.pages[0].sections[0].panels[0].id, "status-placement");
  assert.equal(
    saved.pages[0].sections[0].panels[0].chart.title,
    "Updated wrapped chart",
  );
});

test("stored dashboards merge embedded profile overrides with tracked profiles", async () => {
  const {
    readDashboardStorage,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const dashboard = minimalDashboard();
  dashboard.dataSources.external = {
    kind: "csv",
    path: "data/external.csv",
    provenance: { label: "Imported exercise data" },
  };
  dashboard.dataSources.tracked = {
    kind: "csv",
    path: "data/tracked.csv",
    provenance: { label: "Tracked exercise data" },
  };
  dashboard.datasetProfiles = {
    external: csvDatasetProfile({
      sourceId: "external",
      path: "data/external.csv",
      provenance: { label: "Imported exercise data" },
    }),
  };
  const trackedProfiles = {
    tracked: csvDatasetProfile({
      sourceId: "tracked",
      path: "data/tracked.csv",
      provenance: { label: "Tracked exercise data" },
    }),
  };
  const storage = {
    getItem() {
      return JSON.stringify(dashboard);
    },
  };

  const stored = readDashboardStorage(storage, "simex-dashboard-config-v3", {
    profiles: trackedProfiles,
  });

  assert.equal(stored.datasetProfiles.external.sourceId, "external");
  assert.equal(stored.datasetProfiles.tracked.sourceId, "tracked");
});

test("replacement dashboards ignore fallback profiles for absent sources", async () => {
  const {
    readDashboardStorage,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const { loadDashboardConfig } = await import("../src/lib/loadDashboard.js");
  const dashboard = minimalDashboard();
  dashboard.dataSources = {
    external: {
      kind: "csv",
      path: "data/external.csv",
      provenance: { label: "Imported exercise data" },
    },
  };
  dashboard.pages[0].sections[0].panels[0].sourceId = "external";
  dashboard.datasetProfiles = {
    external: csvDatasetProfile({
      sourceId: "external",
      path: "data/external.csv",
      provenance: { label: "Imported exercise data" },
      columns: [
        {
          name: "label",
          type: "category",
          missingCount: 0,
          uniqueCount: 1,
          examples: ["Ready"],
          geographicHint: null,
        },
        {
          name: "value",
          type: "numeric",
          missingCount: 0,
          uniqueCount: 1,
          examples: [12],
          geographicHint: null,
        },
      ],
    }),
  };
  const fallbackProfiles = {
    orphan: csvDatasetProfile({
      sourceId: "orphan",
      path: "data/orphan.csv",
    }),
  };
  const storage = {
    getItem() {
      return JSON.stringify(dashboard);
    },
  };

  const stored = readDashboardStorage(storage, "simex-dashboard-config-v3", {
    profiles: fallbackProfiles,
  });
  const loaded = await loadDashboardConfig(stored, fallbackProfiles, {
    external: {
      kind: "csv",
      text: "label,value\nReady,12\n",
    },
  });

  assert.deepEqual(Object.keys(stored.datasetProfiles), ["external"]);
  assert.deepEqual(Object.keys(loaded.datasetProfiles), ["external"]);
  assert.deepEqual(loaded.loadedData.external, [{
    label: "Ready",
    value: 12,
  }]);
});

test("tracked descriptors and profiles round-trip through the portable V6 bundle", async () => {
  const {
    parseDashboardBundle,
    serializeDashboardBundle,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const [dashboard, datasetProfiles] = await Promise.all([
    readJson("public/config/dashboard.json"),
    readJson("public/config/dataset-profiles.json"),
  ]);
  const portable = { ...dashboard, datasetProfiles };
  const bundle = serializeDashboardBundle(portable, {
    now: "2026-07-27T00:00:00.000Z",
  });
  const parsed = parseDashboardBundle(JSON.stringify(bundle));

  assert.equal(parsed.configVersion, 6);
  assert.equal(parsed.pages.flatMap(({ sections }) => (
    sections.flatMap(({ panels }) => panels)
  )).length, 40);
  assert.equal(parsed.dataSources.bio_cases.kind, "csv");
  assert.equal(parsed.datasetProfiles.bio_cases.sourceId, "bio_cases");
});

test("the live loader hydrates inline and uploaded v3 sources with reusable profiles", async () => {
  const { loadDashboardConfig } = await import("../src/lib/loadDashboard.js");
  const dashboard = minimalDashboard();
  dashboard.dataSources.uploaded = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "capacity.csv",
    csvText: "facility,value\nClinic A,8\n",
  };

  const loaded = await loadDashboardConfig(dashboard, {});

  assert.deepEqual(loaded.loadedData.status, [{ label: "Ready", value: 12 }]);
  assert.deepEqual(loaded.loadedData.uploaded, [{
    facility: "Clinic A",
    value: 8,
  }]);
  assert.ok(loaded.datasetProfiles.status.columns.some(
    ({ name, type }) => name === "value" && type === "numeric",
  ));
  assert.ok(loaded.datasetProfiles.uploaded.columns.some(
    ({ name, type }) => name === "facility" && type === "category",
  ));
});

test("bundle promotion accepts V6 and materializes uploaded CSV descriptors", async () => {
  const {
    serializeDashboardBundle,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const {
    preparePromotedDashboard,
  } = await import("../scripts/promote-dashboard-bundle.mjs");
  const { loadDashboardConfig } = await import("../src/lib/loadDashboard.js");
  const dashboard = minimalDashboard();
  dashboard.dataSources.uploaded = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "clinic capacity.csv",
    csvText: "facility,value\nClinic A,8\n",
    provenance: { label: "Facilitator upload" },
  };
  const bundle = serializeDashboardBundle(dashboard, {
    now: "2026-07-27T00:00:00.000Z",
  });

  const promoted = preparePromotedDashboard(JSON.stringify(bundle));
  assert.deepEqual(promoted.config.dataSources.uploaded, {
    kind: "csv",
    path: "data/uploaded/clinic-capacity-uploaded.csv",
    provenance: { label: "Facilitator upload" },
  });
  assert.deepEqual(promoted.files, [{
    relativePath: "data/uploaded/clinic-capacity-uploaded.csv",
    contents: "facility,value\nClinic A,8\n",
  }]);
  assert.deepEqual(
    {
      sourceId: promoted.config.datasetProfiles.uploaded.sourceId,
      kind: promoted.config.datasetProfiles.uploaded.kind,
      path: promoted.config.datasetProfiles.uploaded.path,
      provenance: promoted.config.datasetProfiles.uploaded.provenance,
      rowCount: promoted.config.datasetProfiles.uploaded.rowCount,
      columns: promoted.config.datasetProfiles.uploaded.columns.map(
        ({ name, type }) => ({ name, type }),
      ),
    },
    {
      sourceId: "uploaded",
      kind: "csv",
      path: "data/uploaded/clinic-capacity-uploaded.csv",
      provenance: { label: "Facilitator upload" },
      rowCount: 1,
      columns: [
        { name: "facility", type: "category" },
        { name: "value", type: "numeric" },
      ],
    },
  );
  const staleExternalProfiles = {
    uploaded: {
      ...structuredClone(promoted.config.datasetProfiles.uploaded),
      columns: promoted.config.datasetProfiles.uploaded.columns.map(
        (column) => column.name === "facility"
          ? { ...column, examples: ["Stale external value"] }
          : column,
      ),
    },
  };
  const hydrated = await loadDashboardConfig(
    promoted.config,
    staleExternalProfiles,
    {
      uploaded: {
        kind: "csv",
        text: promoted.files[0].contents,
      },
    },
  );
  assert.deepEqual(hydrated.loadedData.uploaded, [{
    facility: "Clinic A",
    value: 8,
  }]);
  assert.deepEqual(
    hydrated.datasetProfiles.uploaded.columns.find(
      ({ name }) => name === "facility",
    ).examples,
    ["Clinic A"],
  );
  assert.throws(
    () => preparePromotedDashboard(JSON.stringify({
      bundleType: "simex-dashboard-v2-bundle",
      version: 2,
      config: {},
    })),
    /version 4, version 5, or version 6 bundles only/i,
  );
});

test("promotion rejects non-loadable dataset descriptors before writing", async () => {
  const {
    serializeDashboardBundle,
  } = await import("../src/charting/config/dashboardBundleV3.js");
  const {
    promoteDashboardBundle,
  } = await import("../scripts/promote-dashboard-bundle.mjs");
  const bundle = serializeDashboardBundle(minimalDashboard(), {
    now: "2026-07-27T00:00:00.000Z",
  });
  const rejectedSources = [
    {
      kind: "dataset",
      type: "arbitrary",
      rows: [{ value: 1 }],
    },
    {
      kind: "dataset",
      type: "profileSnapshot",
      parsingMetadata: {},
      profile: {
        rowCount: 1,
        columns: [{ name: "value", type: "numeric" }],
      },
    },
  ];

  for (const source of rejectedSources) {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "simex-promotion-"));
    try {
      const candidate = structuredClone(bundle);
      candidate.config.dataSources.unloadable = source;
      candidate.metadata.sourceFingerprints.unloadable = null;
      await writeFile(
        path.join(rootDir, "bundle.json"),
        JSON.stringify(candidate),
        "utf8",
      );

      await assert.rejects(
        promoteDashboardBundle({
          inputPath: "bundle.json",
          rootDir,
        }),
        /not supported|kind must be/i,
      );
      await assert.rejects(
        access(path.join(rootDir, "public")),
        { code: "ENOENT" },
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  }
});

test("debounced edits flush before chart saves and cancellation prevents stale callbacks", async () => {
  const {
    applyDashboardEdits,
    createDebouncedDashboardEdits,
    createSerializedDashboardCommitController,
  } = await import("../src/lib/dashboardCommitController.js");
  const { integrateSavedChart } = await import(
    "../src/charting/config/dashboardBundleV3.js"
  );
  const clock = fakeClock();
  const committed = [];
  const baseline = minimalDashboard();
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (candidate) => {
      committed.push(structuredClone(candidate));
      return structuredClone(candidate);
    },
  });
  const edits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: clock,
    onCommit: (pending) => controller.mutate((dashboard) => (
      applyDashboardEdits(dashboard, pending)
    )),
  });

  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { title: "Edited dashboard" },
  });
  const flushed = edits.flush();
  const saved = controller.mutate((dashboard) => integrateSavedChart(
    dashboard,
    {
      chart: pieChart({ title: "Edited chart" }),
      chronoGroups: [],
    },
  ));
  await Promise.all([flushed, saved]);
  assert.equal(controller.getCurrent().title, "Edited dashboard");
  assert.equal(
    controller.getCurrent().pages[0].sections[0].panels[0].title,
    "Edited chart",
  );

  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { title: "Must never return" },
  });
  edits.cancel();
  await controller.replace(baseline);
  await clock.advance(650);
  assert.equal(controller.getCurrent().title, "Exercise dashboard");
  assert.equal(edits.pendingCount(), 0);
  assert.equal(committed.at(-1).title, "Exercise dashboard");
});

test("failed debounced flush requeues the draft for the same-action retry", async () => {
  const {
    applyDashboardEdits,
    createDebouncedDashboardEdits,
    createSerializedDashboardCommitController,
  } = await import("../src/lib/dashboardCommitController.js");
  let rejectCommit = true;
  const controller = createSerializedDashboardCommitController({
    initialDashboard: minimalDashboard(),
    commit: async (candidate) => {
      if (rejectCommit) throw new Error("storage failed");
      return structuredClone(candidate);
    },
  });
  const edits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: fakeClock(),
    onCommit: (pending) => controller.mutate((dashboard) => (
      applyDashboardEdits(dashboard, pending)
    )),
  });

  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Retried exercise label" },
  });
  await assert.rejects(edits.flush(), /storage failed/);
  assert.equal(edits.pendingCount(), 1);

  rejectCommit = false;
  await edits.flush();
  assert.equal(edits.pendingCount(), 0);
  assert.equal(controller.getCurrent().programLabel, "Retried exercise label");
});

test("a moderator flush observes a timer-started failure and retains the draft for retry", async () => {
  const { createDebouncedDashboardEdits } = await import(
    "../src/lib/dashboardCommitController.js"
  );
  const clock = fakeClock();
  const commits = [];
  const timerErrors = [];
  const edits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: clock,
    onCommit: (pending) => new Promise((resolve, reject) => {
      commits.push({ pending, resolve, reject });
    }),
    onError: (error) => timerErrors.push(error),
  });

  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Timer-started retry draft" },
  });
  await clock.advance(650);
  assert.equal(commits.length, 1);

  const moderatorFlush = edits.flush();
  commits[0].reject(new Error("timer-started storage failed"));
  await assert.rejects(moderatorFlush, /timer-started storage failed/);
  assert.equal(timerErrors.length, 0);
  assert.equal(edits.pendingCount(), 1);

  const retry = edits.flush();
  assert.equal(
    commits[1].pending[0].updates.programLabel,
    "Timer-started retry draft",
  );
  commits[1].resolve();
  await retry;
  assert.equal(edits.pendingCount(), 0);
});

test("a moderator flush preserves active and newer distinct-key edits for one retry", async () => {
  const { createDebouncedDashboardEdits } = await import(
    "../src/lib/dashboardCommitController.js"
  );
  const clock = fakeClock();
  const commits = [];
  const timerErrors = [];
  const edits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: clock,
    onCommit: (pending) => new Promise((resolve, reject) => {
      commits.push({ pending, resolve, reject });
    }),
    onError: (error) => timerErrors.push(error),
  });

  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Active timer edit" },
  });
  await clock.advance(650);
  edits.schedule("page:overview", {
    type: "page",
    pageId: "overview",
    updates: { title: "Newer pending page edit" },
  });

  const moderatorFlush = edits.flush();
  assert.equal(commits.length, 1);
  commits[0].reject(new Error("active timer batch failed"));
  await assert.rejects(moderatorFlush, /active timer batch failed/);
  assert.equal(timerErrors.length, 0);
  assert.equal(edits.pendingCount(), 2);

  const retry = edits.flush();
  assert.deepEqual(
    commits[1].pending.map(({ type }) => type),
    ["page", "dashboard"],
  );
  commits[1].resolve();
  await retry;
  assert.equal(edits.pendingCount(), 0);
});

test("a renderer-owned background flush is claimable by a later moderator flush", async () => {
  const { createDebouncedDashboardEdits } = await import(
    "../src/lib/dashboardCommitController.js"
  );
  const commits = [];
  const backgroundErrors = [];
  const edits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: fakeClock(),
    onCommit: (pending) => new Promise((resolve, reject) => {
      commits.push({ pending, resolve, reject });
    }),
    onError: (error) => backgroundErrors.push(error),
  });

  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Renderer-owned active edit" },
  });
  const backgroundFlush = edits.flushInBackground();
  edits.schedule("page:overview", {
    type: "page",
    pageId: "overview",
    updates: { title: "Newer moderator edit" },
  });

  const moderatorFlush = edits.flush();
  assert.equal(commits.length, 1);
  commits[0].reject(new Error("renderer-owned flush failed"));
  await assert.rejects(moderatorFlush, /renderer-owned flush failed/);
  await assert.rejects(backgroundFlush, /renderer-owned flush failed/);
  assert.equal(backgroundErrors.length, 0);
  assert.equal(edits.pendingCount(), 2);

  const retry = edits.flush();
  assert.deepEqual(
    commits[1].pending.map(({ type }) => type),
    ["page", "dashboard"],
  );
  commits[1].resolve();
  await retry;
  assert.equal(edits.pendingCount(), 0);
});

test("an older rejected flush never replaces a newer same-key retry draft", async () => {
  const { createDebouncedDashboardEdits } = await import(
    "../src/lib/dashboardCommitController.js"
  );
  const commits = [];
  const edits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: fakeClock(),
    onCommit: (pending) => new Promise((resolve, reject) => {
      commits.push({ pending, resolve, reject });
    }),
  });

  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Older label" },
  });
  const olderFlush = edits.flush();
  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Newer label" },
  });
  const newerFlush = edits.flush();

  commits[0].reject(new Error("older failed"));
  await assert.rejects(olderFlush, /older failed/);
  commits[1].reject(new Error("newer failed"));
  await assert.rejects(newerFlush, /newer failed/);
  assert.equal(edits.pendingCount(), 1);

  const retry = edits.flush();
  assert.equal(
    commits[2].pending[0].updates.programLabel,
    "Newer label",
  );
  commits[2].resolve();
  await retry;
  assert.equal(edits.pendingCount(), 0);
});

test("failed reset can restore cancelled edits for a later save", async () => {
  const {
    applyDashboardEdits,
    createDebouncedDashboardEdits,
    createSerializedDashboardCommitController,
  } = await import("../src/lib/dashboardCommitController.js");
  let rejectCommit = true;
  const baseline = minimalDashboard();
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (candidate) => {
      if (rejectCommit) throw new Error("reset failed");
      return structuredClone(candidate);
    },
  });
  const edits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: fakeClock(),
    onCommit: (pending) => controller.mutate((dashboard) => (
      applyDashboardEdits(dashboard, pending)
    )),
  });
  edits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Draft retained after reset failure" },
  });

  const cancelled = edits.takePending();
  assert.equal(edits.pendingCount(), 0);
  await assert.rejects(controller.replace(baseline), /reset failed/);
  edits.restore(cancelled);
  assert.equal(edits.pendingCount(), 1);

  rejectCommit = false;
  await edits.flush();
  assert.equal(
    controller.getCurrent().programLabel,
    "Draft retained after reset failure",
  );
});

test("serialized dashboard commits compose rapid mutations and retain the last good state after validation failure", async () => {
  const {
    createSerializedDashboardCommitController,
  } = await import("../src/lib/dashboardCommitController.js");
  const releases = [];
  const controller = createSerializedDashboardCommitController({
    initialDashboard: minimalDashboard(),
    commit: async (candidate) => {
      if (candidate.title === "") throw new Error("Dashboard title is required.");
      await new Promise((resolve) => releases.push(resolve));
      return structuredClone(candidate);
    },
  });

  const first = controller.mutate((dashboard) => {
    dashboard.title = "First save";
  });
  const second = controller.mutate((dashboard) => {
    dashboard.pages[0].title = "Rapid second save";
  });
  await waitForRelease(releases);
  releases.shift()();
  await first;
  await waitForRelease(releases);
  releases.shift()();
  await second;

  assert.equal(controller.getCurrent().title, "First save");
  assert.equal(controller.getCurrent().pages[0].title, "Rapid second save");

  const invalid = controller.mutate((dashboard) => {
    dashboard.title = "";
  });
  await assert.rejects(invalid, /title is required/i);
  assert.equal(controller.getCurrent().title, "First save");
  assert.equal(controller.getCurrent().pages[0].title, "Rapid second save");
});

test("clean Build navigation waits for the commit queue without creating an identity save", async () => {
  const {
    awaitDashboardCommitQueue,
    createSerializedDashboardCommitController,
  } = await import("../src/lib/dashboardCommitController.js");
  let commitCount = 0;
  const controller = createSerializedDashboardCommitController({
    initialDashboard: minimalDashboard(),
    commit: async (candidate) => {
      commitCount += 1;
      return candidate;
    },
  });

  const settled = await awaitDashboardCommitQueue(controller);

  assert.equal(commitCount, 0);
  assert.equal(settled.configVersion, 3);
});

test("look-only mutations use their lightweight committer without bypassing serialization", async () => {
  const {
    createSerializedDashboardCommitController,
  } = await import("../src/lib/dashboardCommitController.js");
  const calls = [];
  const controller = createSerializedDashboardCommitController({
    initialDashboard: minimalDashboard(),
    commit: async (candidate) => {
      calls.push(`full:${candidate.title}`);
      return candidate;
    },
  });

  const full = controller.mutate((candidate) => {
    candidate.title = "Full save";
  });
  const look = controller.mutateWithCommit((candidate) => {
    candidate.globalStyles = { dashboardStyle: "humanist-standard" };
  }, async (candidate) => {
    calls.push(`look:${candidate.globalStyles.dashboardStyle}`);
    return candidate;
  });
  await Promise.all([full, look]);

  assert.deepEqual(calls, ["full:Full save", "look:humanist-standard"]);
  assert.equal(controller.getCurrent().title, "Full save");
});

test("the attached empty-chart case produces a canonical renderer-ready time point", async () => {
  const echarts = await import("echarts");
  const { profileDataset } = await import(
    "../src/charting/data/profileDataset.js"
  );
  const { prepareChartData } = await import(
    "../src/charting/data/prepareChartData.js"
  );
  const { buildRenderModel } = await import(
    "../src/charting/rendering/buildRenderModel.js"
  );
  const rows = [
    { date: "02/05/2027", "Age group": "0-19", deaths: 5 },
    { date: "02/05/2027", "Age group": "20-39", deaths: 42 },
    { date: "02/05/2027", "Age group": "40-59", deaths: 211 },
    { date: "02/05/2027", "Age group": "60-79", deaths: 932 },
    { date: "02/05/2027", "Age group": "80+", deaths: 1400 },
    { date: "02/05/2027", "Age group": "total_deaths", deaths: 2590 },
  ];
  const chart = chartBase({
    id: "dysfunctional-chart-regression",
    typeId: "bar",
    title: "Dysfunctional chart regression",
    sourceId: "mortality",
    roles: {
      measurements: [{ field: "deaths", axis: "primary" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "DD/MM/YYYY",
        timezone: "date-only",
      },
    },
    transformations: {
      filters: [{
        field: "Age group",
        operator: "equals",
        value: "total_deaths",
      }],
      grouping: null,
      aggregation: "max",
      duplicates: "aggregate",
      missingValues: "gap",
    },
    interaction: {
      zoom: { enabled: true },
      timeSync: null,
    },
  });
  const profile = profileDataset(rows, {
    date: {
      interpretation: "temporal",
      format: "DD/MM/YYYY",
      timezone: "date-only",
    },
  });

  const prepared = prepareChartData({
    chart,
    rows,
    datasetProfile: profile,
  });
  const model = buildRenderModel({ chart, prepared });

  assert.equal(prepared.status, "ready");
  assert.equal(prepared.marks.length, 1);
  assert.equal(prepared.marks[0].x, "2027-05-02");
  assert.deepEqual(model.option.series[0].data, [["2027-05-02", 2590]]);
  assert.ok(Number.isFinite(echarts.time.parse("2027-05-02").getTime()));
});

async function readJson(relativePath) {
  return JSON.parse(await source(relativePath));
}

function minimalDashboard() {
  return {
    configVersion: 3,
    id: "exercise-dashboard",
    title: "Exercise dashboard",
    timezone: "UTC",
    dataSources: {
      status: {
        kind: "inline",
        rows: [{ label: "Ready", value: 12 }],
      },
    },
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "status",
        title: "Status",
        panels: [pieChart()],
      }],
    }],
  };
}

function csvDatasetProfile(overrides = {}) {
  return {
    sourceId: "dataset",
    kind: "csv",
    path: "data/dataset.csv",
    provenance: { label: "Simulation exercise dataset" },
    rowCount: 1,
    fingerprint: "a".repeat(64),
    columns: [{
      name: "value",
      type: "numeric",
      missingCount: 0,
      uniqueCount: 1,
      examples: [1],
      geographicHint: null,
    }],
    ...overrides,
  };
}

function chartBase(overrides) {
  return {
    configVersion: 3,
    title: "Status",
    description: "Current exercise status.",
    sourceId: "status",
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: {
      background: { color: "#FFFFFF", transparent: false },
      title: { align: "left" },
      collection: null,
    },
    interaction: {
      zoom: { enabled: false },
      timeSync: null,
    },
    layout: { size: "standard" },
    ...overrides,
  };
}

function pieChart(overrides = {}) {
  return chartBase({
    id: "status-share",
    typeId: "pie",
    roles: {
      category: { field: "label" },
      value: { field: "value" },
    },
    ...overrides,
  });
}

function kpiChart(overrides = {}) {
  return chartBase({
    id: "status-kpi",
    typeId: "kpi",
    roles: {
      value: { field: "value" },
    },
    ...overrides,
  });
}

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    async advance(milliseconds) {
      now += milliseconds;
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort((left, right) => left[1].at - right[1].at);
      for (const [id, timer] of due) {
        timers.delete(id);
        await timer.callback();
      }
    },
  };
}

async function waitForRelease(releases) {
  while (releases.length === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}
