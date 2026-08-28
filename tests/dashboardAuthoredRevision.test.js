import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareDashboardAuthoredPersistenceCandidate,
  projectDashboardAuthoredContent,
  stampDashboardAuthoredRevision,
} from "../src/lib/dashboardAuthoredRevision.js";

const REVISION_DATE = "2026-08-28";

test("authored revision uses the browser-local calendar date and never mutates the candidate", () => {
  const originalTimeZone = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    const previous = dashboardFixture();
    const candidate = structuredClone(previous);
    candidate.pages[0].sections[0].panels[0].chart.title = "Updated chart";

    const stamped = stampDashboardAuthoredRevision({
      previous,
      candidate,
      now: new Date("2026-01-01T01:30:00.000Z"),
    });

    assert.equal(stamped.lastUpdated, "2025-12-31");
    assert.equal(candidate.lastUpdated, "2026-08-01");
    assert.equal(stamped.pages[0].sections[0].panels[0].chart.title, "Updated chart");
    assert.notEqual(stamped, candidate);
    assert.notEqual(stamped.pages, candidate.pages);
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});

test("the authored projection covers durable content, hierarchy, order, and placement mutations", async (t) => {
  const mutations = [
    ["chart content", (next) => { next.pages[0].sections[0].panels[0].chart.roles.value.field = "alternate"; }],
    ["Text content", (next) => { next.dataSources.text_source.qmd = "Revised portable QMD"; }],
    ["Image content", (next) => { next.contentLibrary.mediaItems.media_one.defaultDescription = "Revised image"; }],
    ["authored asset", (next) => { next.assets.asset_one.sha256 = "revised-sha"; }],
    ["source authority", (next) => { next.contentLibrary.sourceEntries.csv_one.displayName = "Revised CSV"; }],
    ["dataset profile", (next) => { next.datasetProfiles.csv_one.fields[0].label = "Revised field"; }],
    ["page content", (next) => { next.pages[0].description = "Revised page"; }],
    ["page order", (next) => { next.pages.reverse(); }],
    ["section content", (next) => { next.pages[0].sections[0].title = "Revised section"; }],
    ["section order", (next) => { next.pages[0].sections.reverse(); }],
    ["panel order", (next) => { next.pages[0].sections[0].panels.reverse(); }],
    ["panel repositioning", (next) => {
      const [panel] = next.pages[0].sections[0].panels.splice(0, 1);
      next.pages[0].sections[1].panels.push(panel);
    }],
    ["panel deletion", (next) => { next.pages[0].sections[0].panels.splice(0, 1); }],
    ["Clear Dashboard", (next) => {
      next.pages = [];
      next.dataSources = {};
      next.contentLibrary = { mediaItems: {}, sourceEntries: {} };
      next.assets = {};
      next.datasetProfiles = {};
    }],
  ];

  for (const [name, mutate] of mutations) {
    await t.test(name, () => {
      const previous = dashboardFixture();
      const candidate = structuredClone(previous);
      mutate(candidate);

      const stamped = stampDashboardAuthoredRevision({
        previous,
        candidate,
        now: new Date(`${REVISION_DATE}T12:00:00`),
      });

      assert.equal(stamped.lastUpdated, REVISION_DATE);
    });
  }
});

test("no-op and manually authored Passport saves preserve the candidate date", () => {
  const previous = dashboardFixture();
  const noOp = stampDashboardAuthoredRevision({
    previous,
    candidate: structuredClone(previous),
    now: new Date(`${REVISION_DATE}T12:00:00`),
  });
  assert.equal(noOp.lastUpdated, previous.lastUpdated);

  const passport = structuredClone(previous);
  passport.programLabel = "Manual program";
  passport.scenarioLabel = "Manual scenario";
  passport.lastUpdated = "2024-03-14";
  passport.home.enabled = false;
  const savedPassport = stampDashboardAuthoredRevision({
    previous,
    candidate: passport,
    now: new Date(`${REVISION_DATE}T12:00:00`),
  });
  assert.equal(savedPassport.lastUpdated, "2024-03-14");
});

test("Look, Present, Chrono, Scene, navigation, and runtime state are excluded", () => {
  const previous = dashboardFixture();
  const candidate = structuredClone(previous);
  candidate.globalStyles.dashboardStyle = "different-look";
  candidate.present = { layout: "grid" };
  candidate.audience = { display: "secondary" };
  candidate.chronoGroups[0].name = "Revised Chrono Group";
  candidate.scenes[0].name = "Revised Scene";
  candidate.activePageId = "page_two";
  candidate.loadedData.csv_one = [{ value: 99 }];
  candidate.dataSourceStates = { csv_one: { status: "loading" } };

  const stamped = stampDashboardAuthoredRevision({
    previous,
    candidate,
    now: new Date(`${REVISION_DATE}T12:00:00`),
  });

  assert.equal(stamped.lastUpdated, previous.lastUpdated);
  assert.deepEqual(
    projectDashboardAuthoredContent(candidate),
    projectDashboardAuthoredContent(previous),
  );
});

test("durable persistence stamps successful authored work while preserve and rollback contexts retain their dates", () => {
  const previous = dashboardFixture();
  const authored = structuredClone(previous);
  authored.pages[0].sections[0].panels[0].chart.title = "Saved chart";
  assert.equal(prepareDashboardAuthoredPersistenceCandidate({
    previous,
    candidate: authored,
    now: new Date(`${REVISION_DATE}T12:00:00`),
  }).lastUpdated, REVISION_DATE);

  for (const context of [
    { preserveAuthoredRevision: true, transactionId: "dashboard-import" },
    { rollback: true, transactionId: "content-draft:rollback" },
  ]) {
    const replacement = structuredClone(authored);
    replacement.lastUpdated = "2023-02-07";
    assert.equal(prepareDashboardAuthoredPersistenceCandidate({
      previous,
      candidate: replacement,
      context,
      now: new Date(`${REVISION_DATE}T12:00:00`),
    }).lastUpdated, "2023-02-07");
  }
});

function dashboardFixture() {
  return {
    configVersion: 6,
    id: "dashboard-one",
    programLabel: "Program",
    scenarioLabel: "Scenario",
    lastUpdated: "2026-08-01",
    home: { enabled: true },
    globalStyles: { dashboardStyle: "baseline-look" },
    present: { layout: "single" },
    audience: { display: "primary" },
    chronoGroups: [{ id: "chrono_one", name: "Chrono One", members: [{ chartId: "chart_one" }] }],
    scenes: [{ id: "scene_one", name: "Scene One", members: [{ chartId: "chart_one" }] }],
    dataSources: {
      csv_one: { kind: "csv", path: "data/source.csv" },
      text_source: { kind: "staticText", qmd: "Portable QMD", revision: 1 },
      image_source: { kind: "staticImage", mediaId: "media_one" },
    },
    contentLibrary: {
      mediaItems: {
        media_one: {
          mediaId: "media_one",
          revision: 1,
          current: { kind: "asset", assetId: "asset_one" },
          defaultDescription: "Image",
        },
      },
      sourceEntries: {
        csv_one: { sourceId: "csv_one", displayName: "CSV", health: "ready" },
      },
    },
    assets: {
      asset_one: { mediaType: "image/png", byteLength: 4, sha256: "sha" },
    },
    datasetProfiles: {
      csv_one: { fields: [{ name: "value", label: "Value", type: "number" }] },
    },
    pages: [
      {
        id: "page_one",
        label: "Page One",
        title: "Page One",
        description: "First page",
        sections: [
          {
            id: "section_one",
            title: "Section One",
            description: "First section",
            panels: [
              { id: "placement_one", chart: { id: "chart_one", typeId: "bar", title: "Chart One", sourceId: "csv_one", roles: { value: { field: "value" } } } },
              { id: "placement_text", chart: { id: "text_one", typeId: "staticText", title: "Text", sourceId: "text_source" } },
            ],
          },
          {
            id: "section_two",
            title: "Section Two",
            description: "Second section",
            panels: [
              { id: "placement_image", chart: { id: "image_one", typeId: "staticImage", title: "Image", sourceId: "image_source" } },
            ],
          },
        ],
      },
      {
        id: "page_two",
        label: "Page Two",
        title: "Page Two",
        description: "Second page",
        sections: [],
      },
    ],
    loadedData: { csv_one: [{ value: 1 }] },
    dataSourceStates: { csv_one: { status: "ready" } },
  };
}
