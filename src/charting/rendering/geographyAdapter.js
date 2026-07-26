export function buildGeographyRenderModel({ chart, prepared, renderContext = {} }) {
  if (chart.typeId === "mapScatter") return mapScatterModel(chart, prepared.marks, renderContext);
  if (chart.typeId === "chronoChoroplethMap") return chronologicalMapModel(chart, prepared.marks, renderContext);
  return choroplethModel(chart, latestFrame(prepared.marks), renderContext);
}

function choroplethModel(chart, marks, renderContext) {
  const values = marks.map(({ value }) => value).filter(Number.isFinite);
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "item" },
      visualMap: {
        min: values.length ? Math.min(...values) : 0,
        max: values.length ? Math.max(...values) : 0,
      },
      geo: geoOption(chart, renderContext),
      series: [mapSeries(chart, marks, renderContext)],
    },
  };
}

function chronologicalMapModel(chart, marks, renderContext) {
  const times = unique(marks.map(({ time }) => time).filter((time) => time !== null && time !== undefined))
    .sort((left, right) => String(left).localeCompare(String(right)));
  const values = marks.map(({ value }) => value).filter(Number.isFinite);
  const baseOption = {
    title: titleOption(chart),
    aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
    tooltip: { trigger: "item" },
    timeline: { axisType: "category", autoPlay: false, data: times },
    visualMap: {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    },
    geo: geoOption(chart, renderContext),
    series: [mapSeries(chart, marks.filter(({ time }) => Object.is(time, times.at(-1))), renderContext)],
  };
  return {
    kind: "echarts",
    option: {
      ...baseOption,
      baseOption,
      options: times.map((time) => ({
        series: [mapSeries(chart, marks.filter((mark) => Object.is(mark.time, time)), renderContext)],
      })),
    },
    replaceMerge: ["series"],
  };
}

function mapScatterModel(chart, marks, renderContext) {
  const values = marks.map(({ value }) => value).filter(Number.isFinite);
  const maximum = values.length ? Math.max(...values.map(Math.abs), 1) : 1;
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "item" },
      geo: geoOption(chart, renderContext),
      visualMap: { min: 0, max: maximum, dimension: 2 },
      series: [{
        name: chart.title ?? "",
        type: "scatter",
        coordinateSystem: "geo",
        symbolSize: (value) => 8 + (Math.abs(Number(value?.[2])) / maximum) * 24,
        data: marks.map((mark) => ({
          name: featureName(mark),
          value: [...featureCoordinates(mark.feature), mark.value],
          geography: mark.geography,
          time: mark.time,
          feature: clone(mark.feature),
          group: mark.group,
        })),
      }],
    },
  };
}

function mapSeries(chart, marks, renderContext) {
  return {
    name: chart.title ?? "",
    type: "map",
    map: mapName(chart, renderContext),
    geoIndex: 0,
    data: marks.map((mark) => ({
      name: String(mark.geography),
      value: mark.value,
      time: mark.time,
      label: featureName(mark),
      feature: clone(mark.feature),
      group: mark.group,
    })),
  };
}

function geoOption(chart, renderContext) {
  return {
    map: mapName(chart, renderContext),
    roam: chart.interaction?.zoom?.enabled === true,
  };
}

function mapName(chart, renderContext) {
  return renderContext.mapName
    ?? chart.presentation?.map?.geoSource
    ?? chart.id
    ?? "chart-map";
}

function latestFrame(marks) {
  const times = marks.map(({ time }) => time).filter((time) => time !== null && time !== undefined);
  if (!times.length) return marks;
  const latest = [...times].sort((left, right) => String(left).localeCompare(String(right))).at(-1);
  return marks.filter(({ time }) => Object.is(time, latest));
}

function featureName(mark) {
  return mark.feature?.name
    ?? mark.feature?.properties?.name
    ?? String(mark.geography);
}

function featureCoordinates(feature) {
  if (feature?.geometry?.type === "Point" && coordinatePair(feature.geometry.coordinates)) {
    return feature.geometry.coordinates.slice(0, 2);
  }
  for (const candidate of [
    feature?.coordinates,
    feature?.center,
    feature?.centroid,
    feature?.properties?.coordinates,
    [feature?.properties?.longitude, feature?.properties?.latitude],
    [feature?.properties?.lon, feature?.properties?.lat],
  ]) {
    if (coordinatePair(candidate)) return candidate.slice(0, 2).map(Number);
  }
  return [null, null];
}

function coordinatePair(value) {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]));
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}

function unique(values) {
  return [...new Set(values)];
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
