import assert from "node:assert/strict";
import test from "node:test";

import {
  requestBuildChartSelection,
  reconcileBuildSelection,
} from "../src/components/build/buildSelectionModel.js";

const dashboard = {
  pages: [
    {
      id: "overview",
      sections: [{
        id: "overview-section",
        panels: [{
          id: "placement-overview-alerts",
          chart: { id: "chart-alerts" },
        }],
      }],
    },
    {
      id: "biomedical",
      sections: [{
        id: "biomedical-section",
        panels: [{
          id: "placement-biomedical-capacity",
          chart: { id: "chart-capacity" },
        }],
      }],
    },
  ],
  timeSyncGroups: [{ id: "exercise-clock", name: "Exercise clock" }],
};

test("reconciles a removed page selection to the active page", () => {
  const withoutSelectedPage = {
    ...dashboard,
    pages: [dashboard.pages[1]],
  };

  assert.deepEqual(
    reconcileBuildSelection(
      { kind: "page", pageId: "overview" },
      withoutSelectedPage,
      "biomedical",
    ),
    { kind: "page", pageId: "biomedical" },
  );
});

test("reconciles a prior page selection when the active page changes", () => {
  assert.deepEqual(
    reconcileBuildSelection(
      { kind: "page", pageId: "overview" },
      dashboard,
      "biomedical",
    ),
    { kind: "page", pageId: "biomedical" },
  );
});

test("reconciles a removed placement selection to its surviving page", () => {
  const withoutSelectedPlacement = {
    ...dashboard,
    pages: [{
      ...dashboard.pages[1],
      sections: [{
        ...dashboard.pages[1].sections[0],
        panels: [],
      }],
    }],
  };

  assert.deepEqual(
    reconcileBuildSelection(
      {
        kind: "chart",
        pageId: "biomedical",
        sectionId: "biomedical-section",
        placementId: "placement-biomedical-capacity",
        chartId: "chart-capacity",
      },
      withoutSelectedPlacement,
      "biomedical",
    ),
    { kind: "page", pageId: "biomedical" },
  );
});

test("keeps a chart selection anchored to the wrapped placement id", () => {
  assert.deepEqual(
    reconcileBuildSelection(
      {
        kind: "chart",
        pageId: "overview",
        sectionId: "overview-section",
        placementId: "placement-overview-alerts",
        chartId: "chart-alerts",
      },
      dashboard,
      "overview",
    ),
    {
      kind: "chart",
      pageId: "overview",
      sectionId: "overview-section",
      placementId: "placement-overview-alerts",
      chartId: "chart-alerts",
    },
  );
});

test("routes a Build chart request with placement and chart ids", () => {
  let selected = null;
  const accepted = requestBuildChartSelection({
    disabled: false,
    onSelect(next) { selected = next; },
  }, {
    pageId: "overview",
    sectionId: "overview-section",
    placementId: "placement-overview-alerts",
    chartId: "chart-alerts",
  });

  assert.equal(accepted, true);
  assert.deepEqual(selected, {
    kind: "chart",
    pageId: "overview",
    sectionId: "overview-section",
    placementId: "placement-overview-alerts",
    chartId: "chart-alerts",
  });
});

test("blocks a Build chart request while disabled", () => {
  let selections = 0;
  const accepted = requestBuildChartSelection({
    disabled: true,
    onSelect() { selections += 1; },
  }, {
    pageId: "overview",
    sectionId: "overview-section",
    placementId: "placement-overview-alerts",
    chartId: "chart-alerts",
  });

  assert.equal(accepted, false);
  assert.equal(selections, 0);
});
