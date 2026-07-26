export function buildGeographyRenderModel({ chart, prepared, renderContext = {} }) {
  if (chart.typeId === "mapScatter") return mapScatterModel(chart, prepared.marks, renderContext);
  if (chart.typeId === "chronoChoroplethMap") return chronologicalMapModel(chart, prepared.marks, renderContext);
  return choroplethModel(chart, latestFrame(prepared.marks), renderContext);
}

function choroplethModel(chart, marks, renderContext) {
  const values = marks.map(({ value }) => value).filter(Number.isFinite);
  return {
    kind: "echarts",
    interaction: geographyInteraction(chart),
    mapRegistration: mapRegistration(chart, marks, renderContext),
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
    interaction: geographyInteraction(chart),
    mapRegistration: mapRegistration(chart, marks, renderContext),
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
  const located = marks.map((mark) => ({ mark, coordinates: featureCoordinates(mark.feature) }));
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
    mapRegistration: mapRegistration(chart, marks, renderContext),
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

function mapRegistration(chart, marks, renderContext) {
  const joinField = chart.presentation?.map?.joinField ?? null;
  const features = new Map();
  for (const mark of marks) {
    if (mark.feature?.type !== "Feature") continue;
    const key = featureJoinName(mark, joinField);
    if (!features.has(key)) features.set(key, clone(mark.feature));
  }
  return {
    name: mapName(chart, renderContext),
    source: chart.presentation?.map?.geoSource ?? null,
    joinField,
    geoJson: { type: "FeatureCollection", features: [...features.values()] },
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
  return geometryCentroid(feature?.geometry);
}

function geometryCentroid(geometry) {
  if (geometry?.type === "Polygon") return polygonCentroid(geometry.coordinates);
  if (geometry?.type === "MultiPolygon") {
    const centroids = (geometry.coordinates ?? []).map(polygonCentroidDetails).filter(Boolean);
    if (centroids.length > 0) {
      const totalArea = centroids.reduce((sum, { area }) => sum + area, 0);
      if (totalArea > 0) {
        return [
          centroids.reduce((sum, { center, area }) => sum + center[0] * area, 0) / totalArea,
          centroids.reduce((sum, { center, area }) => sum + center[1] * area, 0) / totalArea,
        ];
      }
    }
    return boundingCenter(geometry.coordinates);
  }
  return null;
}

function polygonCentroid(coordinates) {
  return polygonCentroidDetails(coordinates)?.center ?? boundingCenter(coordinates);
}

function polygonCentroidDetails(coordinates) {
  const ring = coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  let crossSum = 0;
  let xSum = 0;
  let ySum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const left = ring[index];
    const right = ring[index + 1];
    if (!coordinatePair(left) || !coordinatePair(right)) return null;
    const cross = Number(left[0]) * Number(right[1]) - Number(right[0]) * Number(left[1]);
    crossSum += cross;
    xSum += (Number(left[0]) + Number(right[0])) * cross;
    ySum += (Number(left[1]) + Number(right[1])) * cross;
  }
  if (crossSum === 0) return null;
  return {
    center: [xSum / (3 * crossSum), ySum / (3 * crossSum)],
    area: Math.abs(crossSum / 2),
  };
}

function boundingCenter(coordinates) {
  const points = [];
  collectCoordinates(coordinates, points);
  if (points.length === 0) return null;
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ];
}

function collectCoordinates(value, points) {
  if (coordinatePair(value)) {
    points.push(value.slice(0, 2).map(Number));
    return;
  }
  if (!Array.isArray(value)) return;
  for (const nested of value) collectCoordinates(nested, points);
}

function missingCoordinateDiagnostic(mark) {
  return {
    code: "map-scatter-coordinate-missing",
    severity: "warning",
    message: `Map point “${mark.geography}” has no usable coordinate and was skipped.`,
    geography: mark.geography,
  };
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
