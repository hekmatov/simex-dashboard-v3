import assert from "node:assert/strict";
import test from "node:test";

const model = await import("../src/components/build/buildStructureModel.js")
  .catch(() => null);

test("page reorder moves only the requested Page and preserves nested dashboard truth", () => {
  assert.equal(typeof model?.reorderPage, "function");
  const dashboard = fixture();
  const panels = dashboard.pages[1].sections[0].panels;
  const groups = dashboard.chronoGroups;

  assert.equal(model.reorderPage(dashboard, "operations", 0), true);
  assert.deepEqual(dashboard.pages.map(({ id }) => id), ["operations", "home", "biomedical"]);
  assert.equal(dashboard.pages[0].sections[0].panels, panels);
  assert.equal(dashboard.chronoGroups, groups);
  assert.equal(model.reorderPage(dashboard, "operations", -1), false);
  assert.equal(model.reorderPage(dashboard, "missing", 1), false);
});

test("section reorder is page-local, boundary-safe, and preserves chart placement objects", () => {
  assert.equal(typeof model?.reorderSection, "function");
  const dashboard = fixture();
  const outbreak = dashboard.pages[2].sections[0];
  const pressure = dashboard.pages[2].sections[1];
  const firstPlacement = outbreak.panels[0];

  assert.equal(model.reorderSection(dashboard, "biomedical", "pressure", 0), true);
  assert.deepEqual(
    dashboard.pages[2].sections.map(({ id }) => id),
    ["pressure", "outbreak"],
  );
  assert.equal(dashboard.pages[2].sections[1], outbreak);
  assert.equal(dashboard.pages[2].sections[1].panels[0], firstPlacement);
  assert.equal(model.reorderSection(dashboard, "biomedical", "pressure", 0), false);
  assert.equal(model.reorderSection(dashboard, "home", "summary", 1), false);
});

function fixture() {
  return {
    pages: [
      { id: "home", sections: [{ id: "summary", panels: [] }] },
      {
        id: "operations",
        sections: [{ id: "briefing", panels: [{ id: "p1", chart: { id: "c1" } }] }],
      },
      {
        id: "biomedical",
        sections: [
          { id: "outbreak", panels: [{ id: "p2", chart: { id: "c2" } }] },
          { id: "pressure", panels: [{ id: "p3", chart: { id: "c3" } }] },
        ],
      },
    ],
    chronoGroups: [{ id: "national", members: [{ chartId: "c2" }] }],
  };
}
