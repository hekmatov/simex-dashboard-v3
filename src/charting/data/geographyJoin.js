export function analyzeGeographyJoin({ chart, rows = [], geoData } = {}) {
  const features = Array.isArray(geoData?.features)
    ? geoData.features
    : [];
  const propertyFields = geographyPropertyFields(geoData);
  const geographyField = chart?.roles?.geography?.field;
  if (
    typeof geographyField !== "string"
    || geographyField.trim() === ""
    || !Array.isArray(rows)
  ) {
    return { status: "pending", joinField: null, propertyFields };
  }

  const values = new Set(rows.flatMap((row) => {
    const value = canonical(row?.[geographyField]);
    return value === null ? [] : [value];
  }));
  if (values.size === 0) {
    return { status: "pending", joinField: null, propertyFields };
  }

  const selected = chart?.presentation?.map?.joinField;
  if (typeof selected === "string" && selected.trim() !== "") {
    if (!propertyFields.includes(selected)) {
      return {
        status: "missing-property",
        joinField: selected,
        propertyFields,
      };
    }
    return {
      status: matchScore(
        values,
        features.map((feature) => feature?.properties?.[selected]),
      ) > 0
        ? "ready"
        : "unmatched",
      joinField: selected,
      propertyFields,
    };
  }

  const featureIdScore = matchScore(
    values,
    features.map((feature) => feature?.id),
  );
  const propertyScores = propertyFields.map((field) => ({
    field,
    score: matchScore(
      values,
      features.map((feature) => feature?.properties?.[field]),
    ),
  }));
  const bestPropertyScore = Math.max(
    0,
    ...propertyScores.map(({ score }) => score),
  );
  if (featureIdScore > 0 && featureIdScore >= bestPropertyScore) {
    return { status: "ready", joinField: null, propertyFields };
  }
  if (bestPropertyScore === 0) {
    return { status: "unmatched", joinField: null, propertyFields };
  }
  const bestProperties = propertyScores
    .filter(({ score }) => score === bestPropertyScore)
    .map(({ field }) => field);
  if (bestProperties.length > 1) {
    return {
      status: "ambiguous",
      joinField: null,
      candidates: bestProperties,
      propertyFields,
    };
  }
  return {
    status: "ready",
    joinField: bestProperties[0],
    inferred: true,
    propertyFields,
  };
}

export function geographyPropertyFields(geoData) {
  const features = Array.isArray(geoData?.features)
    ? geoData.features
    : [];
  return [...new Set(features.flatMap((feature) => (
    isRecord(feature?.properties)
      ? Object.keys(feature.properties)
      : []
  )))].sort();
}

function matchScore(expected, candidates) {
  const available = new Set(candidates.flatMap((value) => {
    const normalized = canonical(value);
    return normalized === null ? [] : [normalized];
  }));
  let score = 0;
  for (const value of expected) {
    if (available.has(value)) score += 1;
  }
  return score;
}

function canonical(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return String(value);
  return null;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
