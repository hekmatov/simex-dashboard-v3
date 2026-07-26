import { featureCoordinates, normalizeGeoData } from "../data/geoData.js";

export function buildGeographyRenderModel({ chart, prepared, geoData, renderContext = {} }) {
  if (chart.typeId === "mapScatter") return mapScatterModel(chart, prepared.marks, renderContext, geoData);
  if (chart.typeId === "chronoChoroplethMap") return chronologicalMapModel(chart, prepared.marks, renderContext, geoData);
  return choroplethModel(chart, latestFrame(prepared.marks), renderContext, geoData);
}

function choroplethModel(chart, marks, renderContext, geoData) {
  const values = marks.map(({ value }) => value).filter(Number.isFinite);
  return {
    kind: "echarts",
    interaction: geographyInteraction(chart),
    mapRegistration: mapRegistration(chart, marks, renderContext, geoData),
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

function chronologicalMapModel(chart, marks, renderContext, geoData) {
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
    interaction: geographyInteraction(chart),
    mapRegistration: mapRegistration(chart, marks, renderContext, geoData),
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

function mapScatterModel(chart, marks, renderContext, geoData) {
  const located = marks.map((mark) => ({
    mark,
    coordinates: mark.coordinates ?? featureCoordinates(mark.feature),
  }));
  const valid = located.filter(({ coordinates }) => coordinates !== null);
  const diagnostics = located
    .filter(({ coordinates }) => coordinates === null)
    .map(({ mark }) => missingCoordinateDiagnostic(mark));
  if (valid.length === 0) {
    return {
      kind: "error",
      message: "No map scatter marks have valid geographic coordinates.",
      diagnostics,
    };
  }
  const values = valid.map(({ mark }) => mark.value).filter(Number.isFinite);
  const maximum = values.length ? Math.max(...values.map(Math.abs), 1) : 1;
  return {
    kind: "echarts",
    diagnostics,
    interaction: geographyInteraction(chart),
    mapRegistration: mapRegistration(chart, marks, renderContext, geoData),
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
        data: valid.map(({ mark, coordinates }) => ({
          name: featureName(mark),
          value: [...coordinates, mark.value],
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
  const joinField = chart.presentation?.map?.joinField ?? null;
  return {
    name: chart.title ?? "",
    type: "map",
    map: mapName(chart, renderContext),
    geoIndex: 0,
    nameProperty: joinField ?? undefined,
    data: marks.map((mark) => ({
      name: featureJoinName(mark, joinField),
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
    nameProperty: chart.presentation?.map?.joinField,
    roam: chart.interaction?.zoom?.enabled === true ? "move" : false,
  };
}

function mapRegistration(chart, marks, renderContext, geoData) {
  const joinField = chart.presentation?.map?.joinField ?? null;
  let geoJson = normalizeGeoData(geoData);
  if (geoJson.features.length === 0) {
    const features = new Map();
    for (const mark of marks) {
      if (mark.feature?.type !== "Feature") continue;
      const key = featureJoinName(mark, joinField);
      if (!features.has(key)) features.set(key, clone(mark.feature));
    }
    geoJson = { type: "FeatureCollection", features: [...features.values()] };
  }
  return {
    name: mapName(chart, renderContext),
    source: chart.presentation?.map?.geoSource ?? null,
    joinField,
    geoJson,
  };
}

function geographyInteraction(chart) {
  return {
    zoom: {
      enabled: chart.interaction?.zoom?.enabled === true,
      modifierKey: "Control",
      target: "geo",
    },
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

function featureJoinName(mark, joinField) {
  if (!joinField) return String(mark.geography);
  const joined = mark.feature?.properties?.[joinField] ?? mark.feature?.[joinField];
  return joined === null || joined === undefined || joined === ""
    ? String(mark.geography)
    : String(joined);
}

function missingCoordinateDiagnostic(mark) {
  return {
    code: "map-scatter-coordinate-missing",
    severity: "warning",
    message: `Map point “${mark.geography}” has no usable coordinate and was skipped.`,
    geography: mark.geography,
  };
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
