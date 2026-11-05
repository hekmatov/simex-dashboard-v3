// Resolve after theme colors so bars without an individual override use their actual fallback.
export function matchBarLegendColors(option) {
  const legend = option?.legend;
  const series = option?.series;
  const axes = [option?.xAxis, option?.yAxis].flat().filter(Boolean);
  if (!legend || Array.isArray(legend) || series?.length !== 1 || series[0].type !== "bar"
    || !axes.some(axis => axis.type === "category")) return option;
  const bar = series[0];
  if (typeof bar.name !== "string" || !bar.data?.some(point => point?.itemStyle?.color)) return option;
  const fallback = bar.itemStyle?.color ?? option.color?.[0];
  const points = bar.data.filter(point => point != null && (typeof point !== "object" || point.value != null));
  const colors = points.map(point => point?.itemStyle?.color ?? fallback);
  if (!colors.length || colors.some(color => typeof color !== "string")) return option;
  const multipleColors = new Set(colors).size > 1;
  const color = !multipleColors ? colors[0] : {
    type: "linear", x: 0, y: 0, x2: 1, y2: 0,
    colorStops: colors.map((color, index) => ({ offset: index / (colors.length - 1), color })),
  };
  return {
    ...option,
    legend: {
      ...legend,
      ...(multipleColors ? { itemWidth: Math.max(32, legend.itemWidth ?? 0) } : {}),
      data: (legend.data ?? [bar.name]).map(entry => {
        const item = typeof entry === "string" ? { name: entry } : entry;
        return item.name === bar.name ? { ...item, itemStyle: { ...item.itemStyle, color } } : entry;
      }),
    },
  };
}

// Vertical legends use the available row width and paginate large item lists,
// leaving at least 60% of the canvas height available for the chart.
export function fitLegendToViewport(option, width, height, placement = 'automatic') {
  const legend = option?.legend;
  if (placement !== 'automatic' && legend && !Array.isArray(legend) && Number.isFinite(width) && Number.isFinite(height)) {
    const side = /^(left|right)-/.test(placement);
    const maxWidth = Math.max(20, width * (side ? 0.35 : 0.88) - 10);
    const maxHeight = Math.max(20, height * (/^(above|below)-/.test(placement) ? 0.3 : 0.7) - 10);
    return { ...option, legend: { ...legend, left: 4, top: 4, right: null, bottom: null, width: maxWidth, height: maxHeight, textStyle: { ...legend.textStyle, height: null, lineOverflow: null, width: Math.max(10, maxWidth - (legend.itemWidth ?? 16) - 35), overflow: 'break' } } };
  }
  if (!legend || Array.isArray(legend) || legend.orient !== "vertical"
    || !Number.isFinite(width) || !Number.isFinite(height)) return option;
  return {
    ...option,
    legend: {
      ...legend,
      align: "left",
      height: Math.max(1, Math.floor(height * 0.4)),
      textStyle: {
        ...legend.textStyle,
        ...(legend.textStyle?.overflow === "break" ? {
          width: Math.max(1, Math.floor(width * 0.88) - (legend.itemWidth ?? 16) - 25),
        } : {}),
      },
    },
  };
}

// The background is built from ECharts' visible mainRect, including pagination
// and padding. group bounds also include clipped/offscreen scroll children.
export function measuredLegendRect(instance) {
  const model = instance.getModel?.()?.getComponent?.('legend', 0);
  if (!model || model.get('show') === false || !model.getData().length) return null;
  const view = instance.getViewOfComponentModel?.(model);
  const element = view?._backgroundEl;
  const bounds = element?.getBoundingRect?.();
  if (!bounds) return null;
  element.getComputedTransform?.();
  const origin = element.transformCoordToGlobal(bounds.x, bounds.y);
  return { x: origin[0], y: origin[1], width: bounds.width, height: bounds.height };
}

export function fitMeasuredLegend(instance, sourceOption, placement, plotBounds) {
  const width=instance.getWidth(), height=instance.getHeight();
  const option=fitLegendToViewport(sourceOption,width,height,placement);
  const legend={...option.legend,textStyle:{...option.legend.textStyle}};
  // A side band may consume at most 40% of the original drawable region.
  if (/^(left|right)-/.test(placement)) legend.width=Math.max(1,Math.min(legend.width,plotBounds.width*.4-18));
  if (/^(above|below)-/.test(placement)) legend.height=Math.max(1,Math.min(legend.height,plotBounds.height*.4-18));
  legend.textStyle.width=Math.max(1,legend.width-(legend.itemWidth??16)-35);
  instance.setOption({legend},{lazyUpdate:false});
  let rect=measuredLegendRect(instance);
  if (!rect) return null;
  const maxHeight=Math.min(height-8,legend.height+10);
  if (rect.height>maxHeight || rect.width>width-8) {
    // ECharts scrolls whole items. A single multiline item also needs a bound.
    instance.setOption({legend:{textStyle:{height:null,overflow:'truncate'},
      tooltip:{show:true,renderMode:'richText',formatter:params=>typeof sourceOption.legend.formatter==='function' ? sourceOption.legend.formatter(params.name) : params.name}}},{lazyUpdate:false});
    rect=measuredLegendRect(instance);
  }
  return rect;
}

export function fitRenderedLegend(instance, option, layout) {
  if (!layout) return;
  const legendModel = instance.getModel?.()?.getComponent?.("legend", 0);
  const group = legendModel && instance.getViewOfComponentModel?.(legendModel)?.group;
  if (!group) return;
  const visible = legendModel.get("show") !== false && legendModel.getData().length > 0;
  const bounds = group.getBoundingRect();
  const origin = group.transformCoordToGlobal(bounds.x, bounds.y);
  // Scroll legends retain off-screen children in their bounding rectangle.
  // Clamp to the visible viewport, including the component's default padding.
  const height = option.legend?.orient === "vertical" && Number.isFinite(option.legend.height)
    ? Math.min(bounds.height, option.legend.height + 10)
    : bounds.height;
  const bottom = visible ? Math.ceil(origin[1] + height) : 0;
  if (!Number.isFinite(bottom)) return;
  const top = Math.max(layout.minimumGridTop, bottom + 10);
  if (option.grid) {
    const grids = Array.isArray(option.grid) ? option.grid : [option.grid];
    const changed = grids.some((grid, index) => Number.isFinite(grid.top)
      && instance.getModel().getComponent("grid", index)?.get("top") !== top);
    if (changed) instance.setOption({
      grid: grids.map(grid => Number.isFinite(grid.top) ? { ...grid, top } : grid),
    }, { lazyUpdate: false });
  } else if (option.legend?.orient === "vertical" && option.series?.some(series => series.type === "pie")) {
    instance.setOption({
      series: option.series.map(series => series.type === "pie"
        ? { ...series, top: visible ? bottom + 10 : 0 }
        : series),
    }, { lazyUpdate: false });
  }
}
