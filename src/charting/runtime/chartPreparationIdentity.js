const IDENTITY_VERSION = 1;

export function chartPreparationIdentity({ chart, source, profile, geoSource } = {}) {
  if (!chart || typeof chart !== "object") {
    throw new TypeError("Chart preparation identity requires a chart.");
  }
  return `chart-preparation-v${IDENTITY_VERSION}:${stableSerialize({
    typeId: chart.typeId ?? null,
    sourceId: chart.sourceId ?? null,
    roles: chart.roles ?? null,
    transformations: chart.transformations ?? null,
    dataOptions: chart.dataOptions ?? chart.options?.data ?? null,
    temporal: chart.temporal ?? chart.interaction?.timeSync ?? null,
    source: sourceAuthority(source),
    profile: profileAuthority(profile),
    geoSource: sourceAuthority(geoSource),
  })}`;
}

export function stableSerialize(value) {
  if (value === undefined) return '"[undefined]"';
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return JSON.stringify(String(value));
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
}

function sourceAuthority(source) {
  if (!source || typeof source !== "object") return null;
  if (source.kind === "staticImage") {
    return {
      id: source.id ?? source.sourceId ?? null,
      mediaId: source.mediaId ?? null,
      revision: source.revision ?? null,
      sourceVersion: source.sourceVersion ?? null,
      alt: source.alt ?? null,
      decorative: source.decorative === true,
      fit: source.fit ?? null,
      crop: source.crop ?? null,
      rotation: source.rotation ?? null,
    };
  }
  return {
    id: source.id ?? source.sourceId ?? null,
    fingerprint: source.fingerprint
      ?? source.sha256
      ?? source.integrity
      ?? source.hash
      ?? source.revision
      ?? null,
    url: source.url ?? source.path ?? null,
    format: source.format ?? source.type ?? null,
    schema: source.schema ?? null,
  };
}

function profileAuthority(profile) {
  if (!profile || typeof profile !== "object") return null;
  return {
    fingerprint: profile.fingerprint ?? profile.revision ?? profile.version ?? null,
    rowCount: profile.rowCount ?? null,
    columns: Array.isArray(profile.columns)
      ? profile.columns.map((column) => ({
          name: column?.name ?? null,
          type: column?.type ?? null,
          interpretation: column?.interpretation ?? null,
          numeric: metadataWithoutSamples(column?.numeric),
          temporal: metadataWithoutSamples(column?.temporal),
          geography: metadataWithoutSamples(column?.geography),
        }))
      : null,
  };
}

function metadataWithoutSamples(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  return Object.fromEntries(Object.entries(metadata).filter(([key, value]) => (
    !["values", "examples", "sample", "samples"].includes(key)
    && (value === null || typeof value !== "object" || !Array.isArray(value))
  )));
}
