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
  renameBuildLayoutPage,
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
