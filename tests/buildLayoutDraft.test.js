import assert from "node:assert/strict";
import test from "node:test";

import {
  addBuildLayoutPage,
  addBuildLayoutSection,
  beginBuildLayoutSave,
  completeBuildLayoutSave,
  createBuildLayoutDraft,
  discardBuildLayoutDraft,
  failBuildLayoutSave,
  mergeBuildLayoutPage,
  mergeBuildLayoutSection,
  moveBuildLayoutSection,
  renameBuildLayoutPage,
  removeBuildLayoutPage,
  removeBuildLayoutSection,
  reorderBuildLayoutPanel,
  reorderBuildLayoutPage,
  reorderBuildLayoutSection,
  renameBuildLayoutPanel,
  renameBuildLayoutSection,
} from "../src/components/build/buildLayoutDraft.js";

test("deferred layout save completion is generation-safe and mutations are rejected while saving", async () => {
  const dirty = renameBuildLayoutPanel(createBuildLayoutDraft(fixture()), "panel-a", "Ready");
  const saving = beginBuildLayoutSave(dirty);
  let releaseSave;
  const deferredSave = new Promise((resolve) => { releaseSave = resolve; });
  let current = saving;
  const completion = deferredSave.then(() => { current = completeBuildLayoutSave(current, saving); });

  assert.equal(saving.status, "saving");
  assert.equal(saving.saveRevision, dirty.revision);
  assert.strictEqual(reorderBuildLayoutPanel(saving, "panel-b", "panel-a"), saving);

  current = {
    ...saving,
    status: "dirty",
    revision: saving.revision + 1,
    value: { ...saving.value, marker: "newer change" },
  };
  const newer = current;
  releaseSave();
  await completion;
  assert.strictEqual(current, newer);
  assert.strictEqual(failBuildLayoutSave(current, saving, { code: "FAILED" }), newer);
  assert.equal(completeBuildLayoutSave(saving, saving), null);

  const failed = failBuildLayoutSave(saving, saving, { code: "LAYOUT_SAVE_FAILED" });
  assert.equal(failed.status, "error");
  assert.deepEqual(failed.error, { code: "LAYOUT_SAVE_FAILED" });
  assert.equal(failed.revision, saving.revision);
});

test("layout reorder previews never mutate the saved dashboard", () => {
  const saved = fixture();
  const before = structuredClone(saved);
  let draft = createBuildLayoutDraft(saved);

  draft = reorderBuildLayoutPanel(draft, "panel-b", "panel-a");
  draft = reorderBuildLayoutSection(draft, "page-a", "section-b", 0);

  assert.deepEqual(saved, before);
  assert.deepEqual(draft.value.pages[0].sections.map(({ id }) => id), ["section-b", "section-a"]);
  assert.deepEqual(draft.value.pages[0].sections[1].panels.map(({ id }) => id), ["panel-b", "panel-a"]);
  assert.equal(draft.status, "dirty");
});

test("valid panel rename stages in the dashboard-scoped layout owner without mutating saved content", () => {
  const saved = fixture();
  saved.pages[0].sections[0].panels[0].chart = { id: "chart-a", title: "Old title" };
  const draft = renameBuildLayoutPanel(createBuildLayoutDraft(saved), "panel-a", "New title");

  assert.equal(saved.pages[0].sections[0].panels[0].chart.title, "Old title");
  assert.equal(draft.value.pages[0].sections[0].panels[0].chart.title, "New title");
  assert.equal(draft.draftId, "layout:dashboard");
  assert.equal(draft.targetId, "panel-a");
  assert.equal(draft.status, "dirty");
});

test("layout reorders preserve every unaffected entity reference", () => {
  const draft = createBuildLayoutDraft(fixture());
  const before = draft.value;
  const pageA = before.pages[0];
  const pageB = before.pages[1];
  const sectionA = pageA.sections[0];
  const sectionB = pageA.sections[1];
  const panelA = sectionA.panels[0];
  const panelB = sectionA.panels[1];

  const panelReorder = reorderBuildLayoutPanel(draft, "panel-b", "panel-a");
  assert.notStrictEqual(panelReorder.value, before);
  assert.notStrictEqual(panelReorder.value.pages[0], pageA);
  assert.notStrictEqual(panelReorder.value.pages[0].sections[0], sectionA);
  assert.strictEqual(panelReorder.value.pages[0].sections[1], sectionB);
  assert.strictEqual(panelReorder.value.pages[1], pageB);
  assert.strictEqual(panelReorder.value.pages[0].sections[0].panels[0], panelB);
  assert.strictEqual(panelReorder.value.pages[0].sections[0].panels[1], panelA);

  const sectionReorder = reorderBuildLayoutSection(draft, "page-a", "section-b", 0);
  assert.strictEqual(sectionReorder.value.pages[0].sections[0], sectionB);
  assert.strictEqual(sectionReorder.value.pages[0].sections[1], sectionA);
  assert.strictEqual(sectionReorder.value.pages[1], pageB);

  const pageReorder = reorderBuildLayoutPage(draft, "page-b", 0);
  assert.strictEqual(pageReorder.value.pages[0], pageB);
  assert.strictEqual(pageReorder.value.pages[1], pageA);
});

test("layout rename and add commands copy only the changed ownership path", () => {
  const draft = createBuildLayoutDraft(fixture());
  const before = draft.value;
  const pageA = before.pages[0];
  const pageB = before.pages[1];
  const sectionA = pageA.sections[0];
  const sectionB = pageA.sections[1];
  const panelA = sectionA.panels[0];
  const panelB = sectionA.panels[1];

  const renamedPage = renameBuildLayoutPage(draft, "page-a", "Renamed page");
  assert.notStrictEqual(renamedPage.value.pages[0], pageA);
  assert.strictEqual(renamedPage.value.pages[0].sections, pageA.sections);
  assert.strictEqual(renamedPage.value.pages[1], pageB);

  const renamedSection = renameBuildLayoutSection(draft, "page-a", "section-a", "Renamed section");
  assert.notStrictEqual(renamedSection.value.pages[0].sections[0], sectionA);
  assert.strictEqual(renamedSection.value.pages[0].sections[0].panels, sectionA.panels);
  assert.strictEqual(renamedSection.value.pages[0].sections[1], sectionB);
  assert.strictEqual(renamedSection.value.pages[1], pageB);

  const renamedPanel = renameBuildLayoutPanel(draft, "panel-a", "Renamed panel");
  assert.notStrictEqual(renamedPanel.value.pages[0].sections[0].panels[0], panelA);
  assert.strictEqual(renamedPanel.value.pages[0].sections[0].panels[1], panelB);
  assert.strictEqual(renamedPanel.value.pages[0].sections[1], sectionB);
  assert.strictEqual(renamedPanel.value.pages[1], pageB);

  const newPage = { id: "page-c", label: "Page C", sections: [] };
  const addedPage = addBuildLayoutPage(draft, newPage);
  assert.strictEqual(addedPage.value.pages[0], pageA);
  assert.strictEqual(addedPage.value.pages[1], pageB);
  assert.notStrictEqual(addedPage.value.pages[2], newPage);
  assert.deepEqual(addedPage.value.pages[2], newPage);

  const newSection = { id: "section-c", title: "Section C", panels: [] };
  const addedSection = addBuildLayoutSection(draft, "page-a", newSection);
  assert.strictEqual(addedSection.value.pages[0].sections[0], sectionA);
  assert.strictEqual(addedSection.value.pages[0].sections[1], sectionB);
  assert.strictEqual(addedSection.value.pages[1], pageB);
  assert.notStrictEqual(addedSection.value.pages[0].sections[2], newSection);
  assert.deepEqual(addedSection.value.pages[0].sections[2], newSection);
});

test("discard restores the saved layout without touching a simultaneous chart draft", () => {
  const saved = fixture();
  const chartDraft = { draftId: "chart-panel-a", status: "dirty", title: "Edited title" };
  const reordered = reorderBuildLayoutPanel(createBuildLayoutDraft(saved), "panel-b", "panel-a");
  const discarded = discardBuildLayoutDraft(reordered);

  assert.deepEqual(discarded.value, saved);
  assert.equal(discarded.status, "clean");
  assert.deepEqual(chartDraft, { draftId: "chart-panel-a", status: "dirty", title: "Edited title" });
});

test("structure commands retain unaffected pages, sections, scenes, and Chrono Groups", () => {
  {
    const draft = createBuildLayoutDraft(structureFixture());
    const before = draft.value;
    const movedSection = before.pages[0].sections[1];
    const untouchedSourceSection = before.pages[0].sections[0];
    const untouchedPage = before.pages[2];
    const chronoGroup = before.chronoGroups[0];
    const unrelatedScene = before.scenes[1];
    const moved = moveBuildLayoutSection(draft, "page-a", "section-a2", "page-b", { first: true });

    assert.strictEqual(moved.value.pages[0].sections[0], untouchedSourceSection);
    assert.strictEqual(moved.value.pages[1].sections[0], movedSection);
    assert.strictEqual(moved.value.pages[2], untouchedPage);
    assert.strictEqual(moved.value.chronoGroups[0], chronoGroup);
    assert.strictEqual(moved.value.scenes[1], unrelatedScene);
    assert.notStrictEqual(moved.value.scenes[0], before.scenes[0]);
  }

  {
    const draft = createBuildLayoutDraft(structureFixture());
    const before = draft.value;
    const sourcePanel = before.pages[0].sections[1].panels[0];
    const untouchedPage = before.pages[1];
    const merged = mergeBuildLayoutSection(draft, "page-a", "section-a2", "section-a1");

    assert.strictEqual(merged.value.pages[0].sections[0].panels[0], sourcePanel);
    assert.strictEqual(merged.value.pages[1], untouchedPage);
    assert.strictEqual(merged.value.scenes, before.scenes);
    assert.strictEqual(merged.value.chronoGroups, before.chronoGroups);
  }

  {
    const draft = createBuildLayoutDraft(structureFixture());
    const before = draft.value;
    const unrelatedGroup = before.chronoGroups[1];
    const unrelatedScene = before.scenes[1];
    const removed = removeBuildLayoutSection(draft, "page-a", "section-a2", { disposition: "delete-charts" });

    assert.strictEqual(removed.value.pages[1], before.pages[1]);
    assert.notStrictEqual(removed.value.chronoGroups[0], before.chronoGroups[0]);
    assert.strictEqual(removed.value.chronoGroups[1], unrelatedGroup);
    assert.notStrictEqual(removed.value.scenes[0], before.scenes[0]);
    assert.strictEqual(removed.value.scenes[1], unrelatedScene);
  }

  {
    const draft = createBuildLayoutDraft(structureFixture());
    const before = draft.value;
    const movedSection = before.pages[1].sections[0];
    const untouchedChrono = before.chronoGroups[0];
    const merged = mergeBuildLayoutPage(draft, "page-b", "page-c");

    assert.strictEqual(merged.value.pages.find(({ id }) => id === "page-c").sections[1], movedSection);
    assert.strictEqual(merged.value.chronoGroups[0], untouchedChrono);
  }

  {
    const draft = createBuildLayoutDraft(structureFixture());
    const before = draft.value;
    const movedSection = before.pages[1].sections[0];
    const removed = removeBuildLayoutPage(draft, "page-b", {
      disposition: "move-sections",
      targetPageId: "page-c",
    });

    assert.strictEqual(removed.value.pages.find(({ id }) => id === "page-c").sections[1], movedSection);
    assert.strictEqual(removed.value.chronoGroups[0], before.chronoGroups[0]);
  }
});

function fixture() {
  return {
    id: "dashboard",
    pages: [{
      id: "page-a",
      sections: [
        { id: "section-a", panels: [{ id: "panel-a" }, { id: "panel-b" }] },
        { id: "section-b", panels: [{ id: "panel-c" }] },
      ],
    }, {
      id: "page-b",
      sections: [{ id: "section-d", panels: [{ id: "panel-d" }] }],
    }],
  };
}

function structureFixture() {
  return {
    id: "dashboard-structure",
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a1",
        panels: [{ id: "placement-a", chart: { id: "chart-a", title: "Chart A" } }],
      }, {
        id: "section-a2",
        panels: [{ id: "placement-b", chart: { id: "chart-b", title: "Chart B" } }],
      }],
    }, {
      id: "page-b",
      sections: [{ id: "section-b1", panels: [{ id: "placement-c", chart: { id: "chart-c", title: "Chart C" } }] }],
    }, {
      id: "page-c",
      sections: [{ id: "section-c1", panels: [] }],
    }, {
      id: "landing",
      landing: {
        domainRoutes: [{ pageId: "page-a" }, { pageId: "page-b" }, { pageId: "page-c" }],
        hero: { primaryAction: { pageId: "page-b" } },
      },
      sections: [],
    }],
    chronoGroups: [{
      id: "chrono-main",
      members: [{ chartId: "chart-a" }, { chartId: "chart-b" }],
    }, {
      id: "chrono-unrelated",
      members: [{ chartId: "chart-c" }],
    }],
    scenes: [{
      id: "scene-a",
      pageId: "page-a",
      members: [{ chartId: "chart-a" }, { chartId: "chart-b" }],
      present: { chartIds: ["chart-a", "chart-b"] },
      frameRule: { chartId: "chart-b" },
    }, {
      id: "scene-unrelated",
      pageId: "page-c",
      members: [],
    }, {
      id: "scene-b",
      pageId: "page-b",
      members: [{ chartId: "chart-c" }],
    }],
  };
}
