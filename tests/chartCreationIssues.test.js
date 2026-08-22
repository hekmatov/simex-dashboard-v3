import assert from "node:assert/strict";
import test from "node:test";

import { deriveChartCreationIssues } from "../src/charting/forms/chartCreationIssues.js";

test("Review exposes only actionable blockers with their owning stage", () => {
  const issues = deriveChartCreationIssues({
    wizard: { draft: null, errors: [] },
    form: {
      canCreate: false,
      steps: [
        { id: "type", complete: false, prerequisites: [] },
        { id: "source", complete: false, prerequisites: ["Choose a chart type."] },
        { id: "roles", complete: false, prerequisites: ["Choose a chart type.", "Choose a data source."] },
        { id: "style", complete: false, prerequisites: ["Choose a chart type."] },
      ],
    },
    placementProof: { status: "valid", errors: [] },
    renderProof: { status: "invalid", errors: [] },
  });

  assert.deepEqual(issues, [{
    stage: "chart-type",
    stageLabel: "Chart type",
    message: "Choose a chart type.",
    focusId: "chart-stage-chart-type",
  }]);
});

test("Review keeps independent destination and configuration repairs explicit", () => {
  const issues = deriveChartCreationIssues({
    wizard: {
      draft: { typeId: "line", sourceId: "cases", title: "" },
      errors: [{
        code: "PROFILE_DRIFT",
        stage: "data-source",
        message: "The selected source profile changed.",
      }],
    },
    form: {
      canCreate: false,
      steps: [
        { id: "type", complete: true, prerequisites: [] },
        { id: "source", complete: true, prerequisites: [] },
        { id: "roles", complete: true, prerequisites: [] },
        { id: "style", complete: false, prerequisites: ["Complete the chart title and required settings."] },
      ],
    },
    placementProof: {
      status: "invalid",
      errors: [{ message: "Choose a valid destination section." }],
    },
    renderProof: {
      status: "invalid",
      errors: [{ message: "The chart title is required." }],
    },
  });

  assert.deepEqual(issues, [
    {
      stage: "destination",
      stageLabel: "Destination",
      message: "Choose a valid destination section.",
      focusId: "chart-stage-destination",
    },
    {
      stage: "data-source",
      stageLabel: "Data source",
      message: "The selected source profile changed.",
      focusId: "chart-stage-data-source",
    },
    {
      stage: "configure-chart",
      stageLabel: "Configure chart",
      message: "The chart title is required.",
      focusId: "chart-stage-configure-chart",
    },
  ]);
});
