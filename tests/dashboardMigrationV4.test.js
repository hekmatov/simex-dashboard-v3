import assert from "node:assert/strict";
import test from "node:test";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import {
  isolateStaticTemporalMembership,
  migrateDashboardV3ToV4,
} from "../src/charting/config/migrateDashboardV3ToV4.js";
import { migrateDashboardV4ToV5 } from "../src/content-library/migrateDashboardV4ToV5.js";
import {
  createStaticContentDraft,
  finalizeStaticContentDraft,
} from "../src/static-content/forms/staticContentDraft.js";
import { validateScene } from "../src/charting/time/sceneSchema.js";
import { prepareStaticPanelTransaction } from "../src/static-content/staticPanelTransaction.js";

test("legacy Image URL migration is deterministic, idempotent, and keeps chart config v3", () => {
  const legacy = legacyImageDashboard({ src: "https://example.test/briefing.png", fit: "fill", alt: "" });
  legacy.chronoGroups = [{
    id: "legacy-group",
    name: "Legacy group",
    period: { start: "2027-05-01", end: "2027-05-01" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: "briefing-image", timeRole: "observation" }],
  }];
  legacy.scenes = [{
    id: "legacy-scene",
    name: "Legacy scene",
    pageId: "overview",
    chronoGroupId: "legacy-group",
    period: { start: "2027-05-01T00:00:00.000Z", end: "2027-05-01T00:00:00.000Z" },
    frames: { mode: "source", chartId: "briefing-image", selection: "selected", selectedValues: ["2027-05-01T00:00:00.000Z"] },
    matching: { policy: "authored" },
    present: { chartIds: ["briefing-image"], layout: { columns: 1 }, audience: { width: 1000, height: 1000 } },
  }];

  const migrated = migrateDashboardV3ToV4(legacy);

  assert.equal(migrated.configVersion, 4);
  assert.equal(migrated.pages[0].sections[0].panels[0].id, "briefing-image");
  assert.equal(migrated.pages[0].sections[0].panels[0].typeId, "image");
  assert.equal(migrated.pages[0].sections[0].panels[0].configVersion, 3);
  assert.deepEqual(migrated.dataSources.briefing, {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 1,
    origin: { kind: "url", url: "https://example.test/briefing.png" },
    alt: "",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
    migrationWarnings: ["legacy-fit-fill", "missing-alt"],
  });
  assert.deepEqual(migrated.chronoGroups, []);
  assert.deepEqual(migrated.scenes, []);
  assert.deepEqual(migrateDashboardV3ToV4(migrated), migrated);
  assert.equal(legacy.configVersion, 3);
  assert.equal(legacy.dataSources.briefing.kind, "inline");
});

test("legacy Image paths stay packaged while blob and unsafe sources require replacement", () => {
  const packaged = migrateDashboardV3ToV4(legacyImageDashboard({
    src: "images/briefing.webp",
    fit: "cover",
    alt: "Briefing",
  }));
  assert.deepEqual(packaged.dataSources.briefing.origin, {
    kind: "package",
    path: "images/briefing.webp",
  });
  assert.deepEqual(packaged.dataSources.briefing.migrationWarnings, undefined);

  for (const src of ["blob:https://example.test/ephemeral", "../outside.png", "data:image/png;base64,AQID"]) {
    const migrated = migrateDashboardV3ToV4(legacyImageDashboard({ src, alt: "Briefing" }));
    assert.equal(migrated.dataSources.briefing.origin.kind, "replacementRequired", src);
    assert.deepEqual(migrated.dataSources.briefing.migrationWarnings, ["replacement-required"]);
  }
});

test("multiply-used legacy Image sources split deterministically without leaving the original orphan", () => {
  const legacy = legacyImageDashboard({ src: "images/briefing.png", alt: "Briefing" });
  const second = createChartDraft({
    typeId: "image",
    id: "briefing-image-b",
    sourceId: "briefing",
    title: "Briefing image B",
  });
  legacy.pages[0].sections[0].panels.push(second);

  const migrated = migrateDashboardV3ToV4(legacy);
  const panels = migrated.pages[0].sections[0].panels;
  assert.equal(panels[0].sourceId, "briefing--static-briefing-image");
  assert.equal(panels[1].sourceId, "briefing--static-briefing-image-b");
  assert.equal(Object.hasOwn(migrated.dataSources, "briefing"), false);
  assert.deepEqual(migrated.dataSources[panels[0].sourceId], migrated.dataSources[panels[1].sourceId]);
  assert.deepEqual(migrateDashboardV3ToV4(migrated), migrated);

  const current = migrateDashboardV4ToV5(migrated);
  const currentPanels = current.pages[0].sections[0].panels;
  const placement = current.dataSources[currentPanels[0].sourceId];
  const mediaItem = current.contentLibrary.mediaItems[placement.mediaId];
  const siblingBefore = structuredClone(current.dataSources[currentPanels[1].sourceId]);
  const prepared = prepareStaticPanelTransaction({
    dashboard: current,
    operation: "update",
    panelId: currentPanels[0].id,
    panel: currentPanels[0],
    placement: { ...placement, alt: "Edited A" },
    mediaItem,
  });
  assert.equal(prepared.candidateDashboard.dataSources[currentPanels[0].sourceId].alt, "Edited A");
  assert.deepEqual(
    prepared.candidateDashboard.dataSources[currentPanels[1].sourceId],
    siblingBefore,
  );
});

test("mixed legacy source usage retains the original inline source for its non-Image consumer", () => {
  const legacy = legacyImageDashboard({ src: "images/briefing.png", alt: "Briefing" });
  legacy.pages[0].sections[0].panels.push(createChartDraft({
    typeId: "table",
    id: "briefing-table",
    sourceId: "briefing",
    title: "Briefing table",
  }));

  const migrated = migrateDashboardV3ToV4(legacy);
  const [image, table] = migrated.pages[0].sections[0].panels;
  assert.equal(image.sourceId, "briefing--static-briefing-image");
  assert.equal(table.sourceId, "briefing");
  assert.deepEqual(migrated.dataSources.briefing, legacy.dataSources.briefing);
  assert.equal(migrated.dataSources[image.sourceId].kind, "staticImage");
});

test("temporal isolation removes only static membership and dependent invalid scenes", () => {
  const dashboard = legacyImageDashboard({ src: "images/briefing.png", alt: "Briefing" });
  const ordinary = createChartDraft({
    typeId: "pie",
    id: "status-chart",
    sourceId: "status",
    title: "Status",
  });
  dashboard.dataSources.status = { kind: "inline", rows: [{ label: "Ready", value: 1 }] };
  dashboard.pages[0].sections[0].panels.push(ordinary);
  dashboard.chronoGroups = [{
    id: "mixed",
    name: "Mixed",
    period: { start: "2027-05-01", end: "2027-05-01" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [
      { chartId: "briefing-image", timeRole: "observation" },
      { chartId: "status-chart", timeRole: "observation" },
    ],
  }];

  const isolated = isolateStaticTemporalMembership(dashboard, new Set(["briefing-image"]));
  assert.deepEqual(isolated.chronoGroups[0].members, [
    { chartId: "status-chart", timeRole: "observation" },
  ]);
  assert.equal(isolated.pages[0].sections[0].panels.length, 2);
});

test("temporal isolation leaves unrelated malformed Scenes for strict validation", () => {
  const dashboard = legacyImageDashboard({ src: "images/briefing.png", alt: "Briefing" });
  const ordinary = createChartDraft({
    typeId: "pie",
    id: "status-chart",
    sourceId: "status",
    title: "Status",
  });
  dashboard.dataSources.status = { kind: "inline", rows: [{ label: "Ready", value: 1 }] };
  dashboard.pages[0].sections[0].panels.push(ordinary);
  dashboard.chronoGroups = [{
    id: "ordinary-group",
    name: "Ordinary",
    period: { start: "2027-05-01", end: "2027-05-01" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: "status-chart", timeRole: "observation" }],
  }];
  const missingParent = ordinaryScene({
    id: "missing-parent",
    chronoGroupId: "does-not-exist",
  });
  const emptyPresent = ordinaryScene({
    id: "empty-present",
    present: { chartIds: [], layout: "single" },
  });
  dashboard.scenes = [missingParent, emptyPresent];

  const isolated = isolateStaticTemporalMembership(dashboard, new Set(["briefing-image"]));

  assert.deepEqual(isolated.scenes, [missingParent, emptyPresent]);
  const sceneContext = {
    chronoGroups: dashboard.chronoGroups,
    pages: [{ id: "overview" }],
    charts: [{ id: "status-chart", pageId: "overview" }],
  };
  assert.throws(() => validateScene(isolated.scenes[0], sceneContext), /parent Chrono Group/);
  assert.throws(() => validateScene(isolated.scenes[1], sceneContext), /one to four charts/);
  assert.deepEqual(
    isolateStaticTemporalMembership(isolated, new Set(["briefing-image"])),
    isolated,
  );
});

test("a migrated missing alt remains viewable but must be corrected before an authoring save", () => {
  const migrated = migrateDashboardV3ToV4(legacyImageDashboard({
    src: "images/briefing.png",
    alt: "",
  }));
  const current = migrateDashboardV4ToV5(migrated);
  const panel = current.pages[0].sections[0].panels[0];
  const placement = current.dataSources[panel.sourceId];
  const mediaItem = current.contentLibrary.mediaItems[placement.mediaId];
  const draft = createStaticContentDraft({
    mode: "edit",
    stage: "content",
    contentTypeId: "image",
    destination: { pageId: "overview", sectionId: "briefing" },
    panel,
    placement,
    mediaItem,
  });

  assert.throws(
    () => finalizeStaticContentDraft({ ...draft, stage: "preview-and-add" }),
    /requires alternative text/i,
  );

  const corrected = createStaticContentDraft({
    mode: "edit",
    stage: "content",
    contentTypeId: "image",
    destination: { pageId: "overview", sectionId: "briefing" },
    panel,
    placement: { ...placement, alt: "Briefing map" },
    mediaItem,
  });
  const finalized = finalizeStaticContentDraft({ ...corrected, stage: "preview-and-add" });
  assert.equal(Object.hasOwn(finalized.placement, "migrationWarnings"), false);
});

function legacyImageDashboard({ src, alt = "", fit = "contain" }) {
  return {
    configVersion: 3,
    id: "legacy-image-dashboard",
    title: "Legacy image dashboard",
    timezone: "UTC",
    dataSources: {
      briefing: { kind: "inline", rows: [{ src, alt, fit }] },
    },
    chronoGroups: [],
    scenes: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "briefing",
        title: "Briefing",
        panels: [createChartDraft({
          typeId: "image",
          id: "briefing-image",
          sourceId: "briefing",
          title: "Briefing image",
        })],
      }],
    }],
  };
}

function ordinaryScene(overrides = {}) {
  return {
    id: "ordinary-scene",
    name: "Ordinary scene",
    pageId: "overview",
    chronoGroupId: "ordinary-group",
    period: {
      start: "2027-05-01T00:00:00.000Z",
      end: "2027-05-01T00:00:00.000Z",
    },
    frames: { mode: "source", chartId: "status-chart", selection: "all" },
    members: [{ chartId: "status-chart", width: 1 }],
    present: { chartIds: ["status-chart"], layout: "single" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
    ...overrides,
  };
}
