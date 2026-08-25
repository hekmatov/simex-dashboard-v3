import assert from "node:assert/strict";
import test from "node:test";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import {
  isolateStaticTemporalMembership,
  migrateDashboardV3ToV4,
} from "../src/charting/config/migrateDashboardV3ToV4.js";
import {
  createStaticContentDraft,
  finalizeStaticContentDraft,
} from "../src/static-content/forms/staticContentDraft.js";

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

test("a migrated missing alt remains viewable but must be corrected before an authoring save", () => {
  const migrated = migrateDashboardV3ToV4(legacyImageDashboard({
    src: "images/briefing.png",
    alt: "",
  }));
  const panel = migrated.pages[0].sections[0].panels[0];
  const source = migrated.dataSources[panel.sourceId];
  const draft = createStaticContentDraft({
    mode: "edit",
    stage: "content",
    contentTypeId: "image",
    destination: { pageId: "overview", sectionId: "briefing" },
    panel,
    source,
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
    source: { ...source, alt: "Briefing map" },
  });
  const finalized = finalizeStaticContentDraft({ ...corrected, stage: "preview-and-add" });
  assert.equal(Object.hasOwn(finalized.source, "migrationWarnings"), false);
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
