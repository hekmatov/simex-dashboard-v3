import assert from "node:assert/strict";
import test from "node:test";

import {
  createBuildLayoutDraft,
  discardBuildLayoutDraft,
  reorderBuildLayoutPanel,
  reorderBuildLayoutSection,
} from "../src/components/build/buildLayoutDraft.js";

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
