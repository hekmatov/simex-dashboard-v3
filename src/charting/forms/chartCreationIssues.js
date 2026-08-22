const STAGES = Object.freeze({
  destination: "Destination",
  "chart-type": "Chart type",
  "data-source": "Data source",
  "map-and-prepare-data": "Map and prepare data",
  "configure-chart": "Configure chart",
});

const STEP_STAGE = Object.freeze({
  type: "chart-type",
  source: "data-source",
  roles: "map-and-prepare-data",
  style: "configure-chart",
});

export function deriveChartCreationIssues({
  wizard = {},
  form = {},
  placementProof = {},
  renderProof = {},
} = {}) {
  const issues = [];
  const add = (stage, message) => {
    const normalized = typeof message === "string" ? message.trim() : "";
    if (!STAGES[stage] || !normalized) return;
    if (issues.some((issue) => issue.stage === stage && issue.message === normalized)) return;
    issues.push({
      stage,
      stageLabel: STAGES[stage],
      message: normalized,
      focusId: `chart-stage-${stage}`,
    });
  };

  if (placementProof.status !== "valid") {
    const messages = issueMessages(placementProof.errors);
    (messages.length ? messages : ["Choose a valid destination and placement."])
      .forEach((message) => add("destination", message));
  }

  for (const error of wizard.errors ?? []) {
    add(normalizeStage(error?.stage), error?.message);
  }

  const steps = new Map((form.steps ?? []).map((step) => [step.id, step]));
  if (!wizard.draft?.typeId) {
    add("chart-type", firstMessage(steps.get("type"), "Choose a chart type."));
    return issues;
  }

  const source = steps.get("source");
  if (source?.complete !== true) {
    add("data-source", firstMessage(source, "Choose a data source."));
    return issues;
  }

  const roles = steps.get("roles");
  if (roles?.complete !== true) {
    add("map-and-prepare-data", firstMessage(roles, "Complete the required data mappings."));
    return issues;
  }

  const style = steps.get("style");
  if (style?.complete !== true || renderProof.status !== "valid") {
    const messages = issueMessages(renderProof.errors);
    add("configure-chart", messages[0] ?? firstMessage(
      style,
      "Complete the chart configuration and resolve the render preview.",
    ));
  }

  return issues;
}

function firstMessage(step, fallback) {
  return (step?.prerequisites ?? []).find((value) => (
    typeof value === "string" && value.trim() !== ""
  )) ?? fallback;
}

function issueMessages(errors) {
  return (errors ?? [])
    .map((error) => error?.message)
    .filter((message) => typeof message === "string" && message.trim() !== "");
}

function normalizeStage(stage) {
  return STAGES[stage] ? stage : STEP_STAGE[stage] ?? null;
}
