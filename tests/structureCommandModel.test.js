import assert from "node:assert/strict";
import test from "node:test";

import { validateScene } from "../src/charting/time/sceneSchema.js";

import {
  addBuildLayoutPage,
  addBuildLayoutSection,
  createBuildLayoutDraft,
  mergeBuildLayoutPage,
  mergeBuildLayoutSection,
  moveBuildLayoutSection,
  previewBuildStructureConsequences,
  removeBuildLayoutPage,
  removeBuildLayoutSection,
  renameBuildLayoutPage,
  renameBuildLayoutSection,
} from "../src/components/build/buildLayoutDraft.js";

test("cross-Page Section movement preserves chart/group identity and removes only invalid Scene references", () => {
  const saved = fixture();
  const proof = previewBuildStructureConsequences(saved, {
    kind: "move-section",
    pageId: "biomedical",
    sectionId: "pressure",
    targetPageId: "operations",
  });

  assert.deepEqual(proof.charts, ["Admissions", "Occupancy"]);
  assert.deepEqual(proof.chronoGroups, ["National outbreak playback"]);
  assert.deepEqual(proof.scenes, ["National pressure briefing"]);
  assert.match(proof.summary, /remains attached/);
  assert.match(proof.summary, /loses Admissions and Occupancy/);

  const moved = moveBuildLayoutSection(
    createBuildLayoutDraft(saved),
    "biomedical",
    "pressure",
    "operations",
    { afterSectionId: "briefing" },
  );
  assert.deepEqual(saved, fixture());
  assert.deepEqual(moved.value.pages[2].sections.map(({ id }) => id), ["briefing", "pressure"]);
  assert.deepEqual(moved.value.chronoGroups[0].members.map(({ chartId }) => chartId), ["admissions", "occupancy"]);
  assert.deepEqual(moved.value.scenes[0].chartIds, []);
  assert.equal(moved.status, "dirty");
});

test("rename, merge, and explicit removal dispositions mutate only the Structure draft", () => {
  const saved = fixture();
  let draft = createBuildLayoutDraft(saved);
  draft = renameBuildLayoutPage(draft, "operations", "Operations briefing");
  draft = renameBuildLayoutSection(draft, "operations", "briefing", "Briefing highlights");
  draft = mergeBuildLayoutSection(draft, "biomedical", "pressure", "surveillance");

  assert.equal(draft.value.pages[2].label, "Operations briefing");
  assert.equal(draft.value.pages[2].sections[0].title, "Briefing highlights");
  assert.deepEqual(draft.value.pages[1].sections.map(({ id }) => id), ["surveillance"]);
  assert.deepEqual(draft.value.pages[1].sections[0].panels.map(({ id }) => id), ["admissions-panel", "occupancy-panel", "signals-panel"]);
  assert.equal(saved.pages[1].sections.length, 2);

  const deleted = removeBuildLayoutSection(
    createBuildLayoutDraft(saved),
    "biomedical",
    "pressure",
    { disposition: "delete-charts" },
  );
  assert.deepEqual(deleted.value.chronoGroups, []);
  assert.deepEqual(deleted.value.scenes[0].chartIds, []);
});

test("Page and Section creation extend the visible collections inside the same layout draft", () => {
  let draft = addBuildLayoutPage(createBuildLayoutDraft(fixture()), {
    id: "new-page",
    label: "New Page",
    sections: [{ id: "new-page-section", title: "New Section", panels: [] }],
  });
  draft = addBuildLayoutSection(draft, "new-page", {
    id: "second-section",
    title: "Second Section",
    panels: [],
  });
  assert.deepEqual(draft.value.pages.at(-1).sections.map(({ id }) => id), ["new-page-section", "second-section"]);
  assert.equal(draft.status, "dirty");
});

test("Page merge and Page removal require eligible destinations and preserve source ordering", () => {
  const saved = fixture();
  const mergeSaved = fixture();
  mergeSaved.pages[0].landing = {
    domainRoutes: [{ pageId: "operations" }],
    hero: { primaryAction: { pageId: "operations" } },
  };
  const merged = mergeBuildLayoutPage(createBuildLayoutDraft(mergeSaved), "operations", "biomedical");
  assert.deepEqual(merged.value.pages.map(({ id }) => id), ["landing", "biomedical"]);
  assert.deepEqual(merged.value.pages[1].sections.map(({ id }) => id), ["pressure", "surveillance", "briefing"]);
  assert.equal(merged.value.pages[0].landing.hero.primaryAction.pageId, "biomedical");
  assert.deepEqual(merged.value.pages[0].landing.domainRoutes, [{ pageId: "biomedical" }]);

  const routed = fixture();
  routed.pages.push({ id: "community", label: "Community", sections: [] });
  routed.pages[0].landing = {
    domainRoutes: [
      { pageId: "operations", label: "Operational route" },
      { pageId: "community", label: "Community route" },
      { pageId: "biomedical", label: "Existing target route" },
    ],
    hero: { primaryAction: { pageId: "operations" } },
  };
  const routedMerge = mergeBuildLayoutPage(createBuildLayoutDraft(routed), "operations", "biomedical");
  assert.equal(routedMerge.value.pages[0].landing.hero.primaryAction.pageId, "biomedical");
  assert.deepEqual(routedMerge.value.pages[0].landing.domainRoutes, [
    { pageId: "biomedical", label: "Operational route" },
    { pageId: "community", label: "Community route" },
  ]);

  const moved = removeBuildLayoutPage(
    createBuildLayoutDraft(saved),
    "biomedical",
    { disposition: "move-sections", targetPageId: "operations" },
  );
  assert.deepEqual(moved.value.pages.map(({ id }) => id), ["landing", "operations"]);
  assert.deepEqual(moved.value.pages[1].sections.map(({ id }) => id), ["briefing", "pressure", "surveillance"]);
  assert.match(previewBuildStructureConsequences(saved, { kind: "remove-page", pageId: "biomedical", disposition: "move-sections", targetPageId: "operations" }).summary, /moves to the destination Page without losing chart membership/);
  assert.match(previewBuildStructureConsequences(saved, { kind: "remove-page", pageId: "biomedical", disposition: "delete-charts" }).summary, /loses membership/);

  const protectedDraft = removeBuildLayoutPage(createBuildLayoutDraft({ ...saved, pages: [saved.pages[2]] }), "operations", { disposition: "delete-charts" });
  assert.equal(protectedDraft.status, "error");
  assert.equal(protectedDraft.error.code, "FINAL_PAGE_PROTECTED");
});

test("deleting every chart in a Page drops Chrono Groups whose membership becomes empty", () => {
  const removed = removeBuildLayoutPage(
    createBuildLayoutDraft(fixture()),
    "biomedical",
    { disposition: "delete-charts" },
  );

  assert.deepEqual(removed.value.chronoGroups, []);
});

test("chart and Page deletion prune only canonical Scenes whose parent disappears", () => {
  const saved = canonicalPartialSurvivalFixture();
  const removedSection = removeBuildLayoutSection(
    createBuildLayoutDraft(saved),
    "biomedical",
    "removable",
    { disposition: "delete-charts" },
  );

  assert.deepEqual(removedSection.value.chronoGroups.map(({ id }) => id), ["shared-group", "operations-group"]);
  assert.deepEqual(removedSection.value.scenes.map(({ id }) => id), ["biomedical-shared-scene", "operations-scene"]);

  const removedPage = removeBuildLayoutPage(
    createBuildLayoutDraft(saved),
    "biomedical",
    { disposition: "delete-charts" },
  );

  assert.deepEqual(removedPage.value.pages.map(({ id }) => id), ["landing", "operations"]);
  assert.deepEqual(removedPage.value.chronoGroups.map(({ id }) => id), ["shared-group", "operations-group"]);
  assert.deepEqual(removedPage.value.scenes, [saved.scenes.at(-1)]);
  assert.doesNotThrow(() => validateScene(removedPage.value.scenes[0], {
    pages: removedPage.value.pages,
    chronoGroups: removedPage.value.chronoGroups,
    charts: [{ id: "operations-chart", pageId: "operations" }],
    scenes: removedPage.value.scenes,
  }));
});

function fixture() {
  return {
    id: "dashboard",
    pages: [
      { id: "landing", label: "Dashboard overview", landing: {}, sections: [{ id: "hero", title: "Hero", panels: [] }] },
      {
        id: "biomedical",
        label: "Biomedical",
        sections: [
          { id: "pressure", title: "Hospital pressure", panels: [panel("admissions", "Admissions"), panel("occupancy", "Occupancy")] },
          { id: "surveillance", title: "Surveillance", panels: [panel("signals", "Signals")] },
        ],
      },
      { id: "operations", label: "Operations", sections: [{ id: "briefing", title: "Briefing", panels: [] }] },
    ],
    chronoGroups: [{ id: "national", name: "National outbreak playback", members: [{ chartId: "admissions" }, { chartId: "occupancy" }] }],
    scenes: [{ id: "pressure-scene", name: "National pressure briefing", pageId: "biomedical", chartIds: ["admissions", "occupancy"] }],
  };
}

function panel(id, title) {
  return { id: `${id}-panel`, chart: { id, title, footprint: { columns: 2, rows: 1 } } };
}

function canonicalPartialSurvivalFixture() {
  return {
    id: "canonical-partial-survival",
    pages: [
      { id: "landing", label: "Dashboard overview", landing: {}, sections: [{ id: "hero", title: "Hero", panels: [] }] },
      {
        id: "biomedical",
        label: "Biomedical",
        sections: [
          { id: "removable", title: "Removable", panels: [panel("removed-chart", "Removed chart")] },
          { id: "retained", title: "Retained", panels: [panel("shared-biomedical-chart", "Shared biomedical chart")] },
        ],
      },
      {
        id: "operations",
        label: "Operations",
        sections: [{ id: "operations-section", title: "Operations", panels: [panel("operations-chart", "Operations chart")] }],
      },
    ],
    chronoGroups: [
      canonicalGroup("removed-group", ["removed-chart"]),
      canonicalGroup("shared-group", ["shared-biomedical-chart", "operations-chart"]),
      canonicalGroup("operations-group", ["operations-chart"]),
    ],
    scenes: [
      canonicalScene("removed-group-scene", "Removed group scene", "biomedical", "removed-group", "removed-chart"),
      canonicalScene("biomedical-shared-scene", "Biomedical shared scene", "biomedical", "shared-group", "shared-biomedical-chart"),
      canonicalScene("operations-scene", "Operations scene", "operations", "operations-group", "operations-chart"),
    ],
  };
}

function canonicalGroup(id, chartIds) {
  return {
    id,
    name: id,
    period: { start: "2027-01-01", end: "2027-01-02" },
    members: chartIds.map((chartId) => ({ chartId })),
  };
}

function canonicalScene(id, name, pageId, chronoGroupId, chartId) {
  return {
    id,
    name,
    pageId,
    chronoGroupId,
    period: { start: "2027-01-01T00:00:00.000Z", end: "2027-01-02T00:00:00.000Z" },
    members: [{ chartId, width: 1 }],
    frames: { mode: "calendar", interval: { value: 1, unit: "day" } },
    present: { chartIds: [chartId], layout: "single" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
  };
}
