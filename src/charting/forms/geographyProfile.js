export function profileGeographyResource({
  geographyId,
  geoData,
  keyField = null,
  dataIdentifiers = [],
  minimumCoverage = 1,
} = {}) {
  const id = requiredId(geographyId);
  if (
    geoData?.type !== "FeatureCollection"
    || !Array.isArray(geoData.features)
    || geoData.features.length === 0
  ) {
    return {
      status: "unavailable",
      geographyId: id,
      levels: [],
      keyField,
      coverage: 0,
      unmatchedIdentifiers: [...dataIdentifiers],
      reason: "The geography resource is unavailable or has no features.",
    };
  }
  const levels = [...new Set(geoData.features.flatMap((feature) => (
    Object.keys(feature?.properties ?? {})
  )))];
  if (!keyField || !levels.includes(keyField)) {
    return {
      status: "incompatible",
      geographyId: id,
      levels,
      keyField,
      coverage: 0,
      unmatchedIdentifiers: [...dataIdentifiers],
      reason: keyField
        ? `Geography key field ${keyField} is not available.`
        : "Choose an explicit geography key field.",
    };
  }
  const keys = new Set(geoData.features.map((feature) => (
    normalizedIdentifier(feature.properties?.[keyField])
  )).filter(Boolean));
  const identifiers = [...new Set(dataIdentifiers.map(normalizedIdentifier).filter(Boolean))];
  const unmatchedIdentifiers = identifiers.filter((identifier) => !keys.has(identifier));
  const coverage = identifiers.length === 0
    ? 0
    : (identifiers.length - unmatchedIdentifiers.length) / identifiers.length;
  const compatible = identifiers.length > 0 && coverage >= minimumCoverage;
  return {
    status: compatible ? "compatible" : "incompatible",
    geographyId: id,
    levels,
    keyField,
    coverage,
    unmatchedIdentifiers,
    reason: compatible
      ? null
      : `Geography coverage ${Math.round(coverage * 100)}% is below the required ${Math.round(minimumCoverage * 100)}%. Repair unmatched identifiers without fabricating matches.`,
  };
}

function normalizedIdentifier(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function requiredId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("A geography resource id is required.");
  }
  return value.trim();
}
