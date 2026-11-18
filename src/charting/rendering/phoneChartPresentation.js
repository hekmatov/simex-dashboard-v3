const PHONE_DAY_LABEL = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format;
const PHONE_HOUR_LABEL = new Intl.DateTimeFormat("en", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC",
}).format;

export function samplePhoneTicks(ticks, limit = 6) {
  const values = [...new Set(ticks.map(tick => tick.value).filter(Number.isFinite))];
  if (values.length <= limit) return values;
  return Array.from({ length: limit }, (_, index) => values[Math.round(index * (values.length - 1) / (limit - 1))]);
}

// Sample the engine's real ticks after scale calculation. This caps visible
// labels even for explicit numeric/calendar cadence without changing the ticks,
// data, extent, authored settings or desktop/export options.
export function capPhoneAxisLabels(instance, limit = 6) {
  const model = instance?.getModel?.();
  if (!model?.eachComponent) return;
  const patch = {};
  for (const type of ["xAxis", "yAxis", "singleAxis", "parallelAxis", "angleAxis", "radiusAxis"]) {
    model.eachComponent(type, axisModel => {
      const scale = axisModel.axis?.scale;
      if (!scale?.getTicks) return;
      const ticks = scale.getTicks();
      const formatter = axisModel.get?.(["axisLabel", "formatter"]);
      const adaptiveTime = scale.type === "time"
        && (!formatter || formatter === PHONE_DAY_LABEL || formatter === PHONE_HOUR_LABEL);
      (patch[type] ??= [])[axisModel.componentIndex] = {
        axisLabel: {
          customValues: samplePhoneTicks(ticks, limit), interval: 0, hideOverlap: true,
          ...(adaptiveTime ? {
            formatter: scale.getExtent()[1] - scale.getExtent()[0] > 86_400_000 ? PHONE_DAY_LABEL : PHONE_HOUR_LABEL,
          } : {}),
        },
      };
    });
  }
  if (Object.keys(patch).length) instance.setOption(patch, { lazyUpdate: false });
}

export function compactPhoneCartesianGrid(option) {
  if (!option.grid || !option.xAxis || !option.yAxis || option.visualMap) return option.grid;
  const xAxes = [option.xAxis].flat();
  const yAxes = [option.yAxis].flat();
  const compact = grid => {
    if (!grid?.containLabel) return grid;
    return {
      ...grid,
      // ECharts measures the actual tick labels and adds their width to these insets.
      left: yAxes.some(axis => axis.name) ? grid.left : 8,
      right: xAxes.some(axis => axis.name) ? grid.right : yAxes.length > 1 ? 8 : 20,
    };
  };
  return Array.isArray(option.grid) ? option.grid.map(compact) : compact(option.grid);
}

export function phoneFullscreenHeatmapZoom(model, { chart, surface, typographyProfile, interactionMode } = {}) {
  if (chart?.typeId !== "heatmap" || surface !== "fullscreen" || typographyProfile !== "phone"
    || interactionMode !== "active" || model?.kind !== "echarts") return model;
  return {
    ...model,
    option: {
      ...model.option,
      dataZoom: ["x", "y"].map(axis => ({
        type: "inside", [`${axis}AxisIndex`]: 0, filterMode: "none",
        zoomOnMouseWheel: "ctrl", moveOnMouseWheel: false, moveOnMouseMove: true,
      })),
    },
    interaction: { ...model.interaction, zoom: { enabled: true, modifierKey: "Control" } },
  };
}
