import assert from "node:assert/strict"; import test from "node:test"; const interactionModule = await import("../src/components/build/buildTreeInteraction.js").catch(() => null); function fakeClock() { let currentTime = 0; let nextId = 1; const scheduled = new Map(); return { schedule(callback, delay) { const id = nextId++; scheduled.set(id, { callback, at: currentTime + delay }); return id; }, cancel(id) { scheduled.delete(id); }, advance(delay) { currentTime += delay; [...scheduled.entries()].filter(([, entry]) => entry.at <= currentTime).sort(([, a], [, b]) => a.at - b.at).forEach(([id, entry]) => { scheduled.delete(id); entry.callback(); }); } }; } test("one click activates after exactly 500ms and double-click cancels it", () => { assert.equal(typeof interactionModule?.createDelayedTreeActivation, "function"); const clock = fakeClock(); const events = []; const controller = interactionModule.createDelayedTreeActivation({ delay: 500, schedule: clock.schedule, cancel: clock.cancel }); controller.click(() => events.push("single")); clock.advance(499); assert.deepEqual(events, []); clock.advance(1); assert.deepEqual(events, ["single"]); controller.click(() => events.push("wrong-single")); controller.doubleClick(() => events.push("rename")); clock.advance(500); assert.deepEqual(events, ["single", "rename"]); }); test("visible Build tree nodes preserve Page, Section, Chart order and hide collapsed descendants", () => { assert.equal(typeof interactionModule?.visibleBuildTreeNodes, "function"); const dashboard = { pages: [{ id: "biomedical", sections: [{ id: "overview", panels: [{ id: "confirmed_cases_panel", chart: { id: "confirmed_cases" } }] }] }] }; assert.deepEqual(interactionModule.visibleBuildTreeNodes(dashboard, new Set(["page:biomedical", "page:biomedical/section:overview"])), [{ key: "page:biomedical", parentKey: null, depth: 1, kind: "page", pageId: "biomedical", hasChildren: true }, { key: "page:biomedical/section:overview", parentKey: "page:biomedical", depth: 2, kind: "section", pageId: "biomedical", sectionId: "overview", hasChildren: true }, { key: "page:biomedical/section:overview/chart:confirmed_cases", parentKey: "page:biomedical/section:overview", depth: 3, kind: "chart", pageId: "biomedical", sectionId: "overview", placementId: "confirmed_cases_panel", chartId: "confirmed_cases", hasChildren: false }]); assert.deepEqual(interactionModule.visibleBuildTreeNodes(dashboard, new Set()), [{ key: "page:biomedical", parentKey: null, depth: 1, kind: "page", pageId: "biomedical", hasChildren: true }]); });

test("collapsing a branch reconciles descendant focus to the nearest visible ancestor", () => {
  const page = "page:socio_economic";
  const section = `${page}/section:public_response`;
  const chart = `${section}/chart:socio_risk_perception`;
  const other = "page:biomedical";

  assert.equal(interactionModule.focusedTreeKeyAfterCollapse(chart, section), section);
  assert.equal(interactionModule.focusedTreeKeyAfterCollapse(chart, page), page);
  assert.equal(interactionModule.focusedTreeKeyAfterCollapse(section, section), section);
  assert.equal(interactionModule.focusedTreeKeyAfterCollapse(other, page), other);
});

test("typed layout drag payloads preserve node kind and stable source identity", () => {
  const source = {
    kind: "panel",
    pageId: "biomedical",
    sectionId: "overview",
    placementId: "confirmed_cases_panel",
  };
  const encoded = interactionModule.encodeBuildMovePayload(source);

  assert.equal(interactionModule.BUILD_LAYOUT_MOVE_MIME, "application/x-simex-build-layout-move+json");
  assert.deepEqual(interactionModule.decodeBuildMovePayload(encoded), source);
  assert.equal(interactionModule.decodeBuildMovePayload("confirmed_cases_panel"), null);
  assert.equal(interactionModule.decodeBuildMovePayload(JSON.stringify({ kind: "chart", chartId: "confirmed_cases" })), null);
});

test("pointer drag sessions expose the typed source synchronously before a render", () => {
  const source = { kind: "panel", pageId: "biomedical", sectionId: "overview", placementId: "confirmed_cases_panel" };
  const session = interactionModule.createBuildMoveDragSession();

  assert.deepEqual(session.start(source), source);
  assert.deepEqual(session.current(), source);
  assert.deepEqual(session.resolve(interactionModule.encodeBuildMovePayload(source)), source);
  assert.deepEqual(session.resolve(""), source);
  session.clear();
  assert.equal(session.current(), null);
  assert.equal(session.resolve(""), null);
});

test("keyboard sibling movement uses the same canonical move contract", () => {
  const dashboard = {
    pages: [{
      id: "one",
      sections: [{
        id: "overview",
        panels: [
          { id: "first", chart: { id: "chart-a" } },
          { id: "second", chart: { id: "chart-b" } },
        ],
      }],
    }, { id: "two", sections: [{ id: "empty", panels: [] }] }],
  };

  assert.deepEqual(interactionModule.buildSiblingMove(dashboard, {
    kind: "panel", pageId: "one", sectionId: "overview", placementId: "second",
  }, -1), {
    kind: "panel",
    source: { pageId: "one", sectionId: "overview", placementId: "second" },
    target: { pageId: "one", sectionId: "overview", index: 0 },
  });
  assert.equal(interactionModule.buildSiblingMove(dashboard, {
    kind: "panel", pageId: "one", sectionId: "overview", placementId: "first",
  }, -1), null);
});
