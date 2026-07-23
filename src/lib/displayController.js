const MAX_DISPLAYED_CHARTS = 4;
const LAYOUTS_BY_COUNT = Object.freeze({
  0: Object.freeze(["solo"]),
  1: Object.freeze(["solo"]),
  2: Object.freeze(["sideBySide", "overUnder"]),
  3: Object.freeze(["topFocus", "bottomFocus", "leftFocus", "rightFocus"]),
  4: Object.freeze(["grid2x2"]),
});

export class DisplayStateError extends Error {
  constructor(code) {
    super(code);
    this.name = "DisplayStateError";
    this.code = code;
  }
}

export function initialDisplayState() {
  return freezeState({
    display_revision: 0,
    displayed_chart_ids: [],
    layout: defaultLayout(0),
  });
}

export function reduceDisplayState(state, action, validChartIds = null) {
  const validIds = normalizedValidIds(validChartIds);
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new DisplayStateError("invalid_action");
  }

  switch (action.type) {
    case "manual_open": {
      assertKnownChart(action.chart_id, validIds);
      if (state.displayed_chart_ids.includes(action.chart_id)) {
        return state;
      }
      return withDisplayedCharts(state, [
        ...state.displayed_chart_ids,
        action.chart_id,
      ]);
    }
    case "manual_close": {
      assertChartId(action.chart_id);
      if (!state.displayed_chart_ids.includes(action.chart_id)) {
        return state;
      }
      return withDisplayedCharts(
        state,
        state.displayed_chart_ids.filter((chartId) => chartId !== action.chart_id),
      );
    }
    case "manual_close_all":
      return state.displayed_chart_ids.length === 0
        ? state
        : withDisplayedCharts(state, []);
    case "manual_reorder": {
      const chartIds = validatedChartIds(action.chart_ids, {
        minimum: state.displayed_chart_ids.length,
        validIds,
      });
      if (!isPermutation(chartIds, state.displayed_chart_ids)) {
        throw new DisplayStateError("invalid_chart");
      }
      return withDisplayedCharts(state, chartIds);
    }
    case "companion_set": {
      if (action.expected_display_revision !== state.display_revision) {
        throw new DisplayStateError("stale_revision");
      }
      const chartIds = validatedChartIds(action.chart_ids, {
        minimum: 1,
        validIds,
      });
      return withDisplayedCharts(state, chartIds);
    }
    case "companion_reconcile": {
      const chartIds = validatedChartIds(action.chart_ids, {
        minimum: 0,
        validIds,
      });
      return withDisplayedCharts(state, chartIds);
    }
    case "layout_changed": {
      const allowedLayouts = LAYOUTS_BY_COUNT[state.displayed_chart_ids.length];
      if (!allowedLayouts.includes(action.layout)) {
        throw new DisplayStateError("invalid_layout");
      }
      if (state.layout === action.layout) {
        return state;
      }
      return freezeState({ ...state, layout: action.layout });
    }
    default:
      throw new DisplayStateError("invalid_action");
  }
}

function withDisplayedCharts(state, chartIds) {
  if (sameItems(chartIds, state.displayed_chart_ids)) {
    return state;
  }
  if (chartIds.length > MAX_DISPLAYED_CHARTS) {
    throw new DisplayStateError("capacity_exceeded");
  }
  const allowedLayouts = LAYOUTS_BY_COUNT[chartIds.length];
  const layout = allowedLayouts.includes(state.layout)
    ? state.layout
    : defaultLayout(chartIds.length);
  return freezeState({
    display_revision: state.display_revision + 1,
    displayed_chart_ids: chartIds,
    layout,
  });
}

function validatedChartIds(value, { minimum, validIds }) {
  if (!Array.isArray(value)) {
    throw new DisplayStateError("invalid_chart");
  }
  if (value.length > MAX_DISPLAYED_CHARTS) {
    throw new DisplayStateError("capacity_exceeded");
  }
  if (value.length < minimum) {
    throw new DisplayStateError("invalid_chart");
  }
  const unique = new Set();
  for (const chartId of value) {
    assertKnownChart(chartId, validIds);
    if (unique.has(chartId)) {
      throw new DisplayStateError("invalid_chart");
    }
    unique.add(chartId);
  }
  return [...value];
}

function assertKnownChart(chartId, validIds) {
  assertChartId(chartId);
  if (validIds && !validIds.has(chartId)) {
    throw new DisplayStateError("invalid_chart");
  }
}

function assertChartId(chartId) {
  if (
    typeof chartId !== "string" ||
    chartId.length === 0 ||
    chartId.length > 256 ||
    chartId.trim() !== chartId
  ) {
    throw new DisplayStateError("invalid_chart");
  }
}

function normalizedValidIds(validChartIds) {
  if (validChartIds == null) {
    return null;
  }
  if (validChartIds instanceof Set) {
    return validChartIds;
  }
  return new Set(validChartIds);
}

function isPermutation(candidate, current) {
  return (
    candidate.length === current.length &&
    candidate.every((chartId) => current.includes(chartId))
  );
}

function sameItems(left, right) {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

function defaultLayout(count) {
  return LAYOUTS_BY_COUNT[count]?.[0] ?? "solo";
}

function freezeState(state) {
  return Object.freeze({
    ...state,
    displayed_chart_ids: Object.freeze([...state.displayed_chart_ids]),
  });
}
