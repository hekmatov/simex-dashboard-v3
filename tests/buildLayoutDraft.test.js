import assert from "node:assert/strict";
import test from "node:test";

import {
  beginBuildLayoutSave,
  completeBuildLayoutSave,
  createBuildLayoutDraft,
  discardBuildLayoutDraft,
  failBuildLayoutSave,
  reorderBuildLayoutPanel,
  reorderBuildLayoutSection,
  renameBuildLayoutPanel,
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

test("same-page section reorder preserves the rendered section, panel, chart, and data references", () => {
  const saved = fixture();
  const data = [{ month: "Jan", value: 12 }];
  const chart = { id: "chart-a", sourceId: "source-a", title: "Trend" };
  saved.loadedData = { "source-a": data };
  saved.pages[0].sections[0].panels[0].chart = chart;

  const draft = createBuildLayoutDraft(saved);
  const section = draft.value.pages[0].sections[0];
  const panel = section.panels[0];
  const next = reorderBuildLayoutSection(draft, "page-a", "section-b", 0);

  assert.deepEqual(next.value.pages[0].sections.map(({ id }) => id), ["section-b", "section-a"]);
  assert.strictEqual(next.value.pages[0].sections[1], section);
  assert.strictEqual(next.value.pages[0].sections[1].panels[0], panel);
  assert.strictEqual(next.value.pages[0].sections[1].panels[0].chart, chart);
  assert.strictEqual(next.value.loadedData["source-a"], data);
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
    }],
  };
}
