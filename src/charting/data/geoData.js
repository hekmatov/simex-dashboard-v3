export function normalizeGeoData(geoData) {
  const features = featureArray(geoData).filter((feature) => feature?.type === "Feature");
  return {
    type: "FeatureCollection",
    features: structuredClone(features),
  };
}

export function indexGeoFeatures(geoData, joinField = null) {
  const featureCollection = normalizeGeoData(geoData);
  const byId = new Map();
  for (const feature of featureCollection.features) {
    for (const identifier of featureIdentifiers(feature, joinField)) {
      const key = canonicalGeography(identifier);
      if (key !== null && !byId.has(key)) byId.set(key, feature);
    }
  }
  return { featureCollection, byId };
}

export function featureCoordinates(feature) {
  if (feature?.geometry?.type === "Point" && coordinatePair(feature.geometry.coordinates)) {
    return feature.geometry.coordinates.slice(0, 2).map(Number);
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

export function canonicalGeography(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function featureArray(geoData) {
  if (Array.isArray(geoData)) return geoData;
  if (geoData?.type === "FeatureCollection" && Array.isArray(geoData.features)) return geoData.features;
  if (Array.isArray(geoData?.features)) return geoData.features;
  if (geoData?.type === "Feature") return [geoData];
  return [];
}

function featureIdentifiers(feature, joinField) {
  return [
    joinField ? feature?.properties?.[joinField] : null,
    joinField ? feature?.[joinField] : null,
    feature?.id,
  ];
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

function coordinatePair(value) {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]));
}
