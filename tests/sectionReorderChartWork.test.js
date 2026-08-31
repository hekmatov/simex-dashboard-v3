import assert from "node:assert/strict";
import test from "node:test";

import { sectionPanelRegionPropsEqual } from "../src/components/build/sectionReorderChartWork.js";

test("same-page section reorder tells the memoized panel region to skip ChartView work", () => {
  const chart = { id: "chart-a", sourceId: "source-a" };
  const panel = { id: "panel-a", chart };
  const section = { id: "section-a", title: "First", panels: [panel] };
  const sectionDraft = { id: "section-a", title: "First" };
  const runtime = { loadedData: { "source-a": [{ value: 12 }] } };
  const delegates = {};
  const previous = {
    section,
    sectionDraft,
    pageId: "page-a",
    runtime,
    delegates,
    editMode: true,
    disabled: false,
    selectedPlacementId: null,
    draggingPanelId: null,
    dragOverPanelId: null,
    multiSelectMode: false,
    multiPanelIds: [],
    excludedChartIds: [],
    chronoChartIds: [],
  };
  const reordered = {
    ...previous,
    section: { ...section, panels: [...section.panels] },
    sectionDraft: { ...sectionDraft },
  };

  assert.equal(sectionPanelRegionPropsEqual(previous, reordered), true);
});

test("a chart or selection change tells the memoized panel region to perform its normal work", () => {
  const chart = { id: "chart-a" };
  const panel = { id: "panel-a", chart };
  const previous = {
    section: { id: "section-a", title: "First", panels: [panel] },
    pageId: "page-a",
    runtime: {},
    delegates: {},
    editMode: true,
    disabled: false,
    selectedPlacementId: null,
    draggingPanelId: null,
    dragOverPanelId: null,
    multiSelectMode: false,
    multiPanelIds: [],
    excludedChartIds: [],
    chronoChartIds: [],
  };

  assert.equal(sectionPanelRegionPropsEqual(previous, {
    ...previous,
    section: { ...previous.section, panels: [{ ...panel, chart: { ...chart, title: "Changed" } }] },
  }), false);
  assert.equal(sectionPanelRegionPropsEqual(previous, { ...previous, selectedPlacementId: "panel-a" }), false);
});
