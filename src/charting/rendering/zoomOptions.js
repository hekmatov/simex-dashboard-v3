export function rangeSelectorVisible(chart) {
  return chart?.interaction?.zoom?.enabled === true
    && chart?.interaction?.zoom?.rangeSelector === true;
}

export function buildEChartsDataZoom(chart, axis = "x") {
  if (chart?.interaction?.zoom?.enabled !== true) return undefined;

  const axisIndex = axis === "y"
    ? { yAxisIndex: 0 }
    : { xAxisIndex: 0 };
  const controls = [{
    type: "inside",
    ...axisIndex,
    zoomOnMouseWheel: "ctrl",
    moveOnMouseWheel: false,
    moveOnMouseMove: false,
  }];

  if (rangeSelectorVisible(chart)) {
    controls.push({ type: "slider", ...axisIndex });
  }

  return controls;
}
