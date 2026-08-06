const PURPOSES = new Set([
  "dashboard",
  "wizard",
  "editor",
  "fullscreen",
  "playback",
  "compatibility",
]);

export function providerKindForDescriptor(descriptor) {
  if (descriptor?.kind === "inline") return "inline";
  if (
    descriptor?.kind === "dataset"
    && descriptor?.type === "uploadedCsv"
  ) {
    return "uploadedCsv";
  }
  if (descriptor?.kind === "csv" || descriptor?.kind === "geojson") {
    return descriptor.kind;
  }
  throw new Error("Unsupported source descriptor for the data service.");
}

export function normalizeSourceRequest(
  request,
  {
    descriptor,
    profile = null,
    portableSource = null,
    scopeId,
  } = {},
) {
  const sourceId = typeof request === "string" ? request : request?.sourceId;
  const purpose = typeof request === "string"
    ? "dashboard"
    : request?.purpose ?? "dashboard";
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    throw new TypeError("Data source request sourceId is required.");
  }
  if (!PURPOSES.has(purpose)) {
    throw new Error(`Data source request purpose "${purpose}" is invalid.`);
  }
  if (!descriptor || typeof descriptor !== "object") {
    throw new Error(`Data source "${sourceId}" is not registered.`);
  }
  if (typeof scopeId !== "string" || scopeId === "") {
    throw new TypeError("Data service scopeId is required.");
  }

  const providerKind = providerKindForDescriptor(descriptor);
  const fingerprint = descriptor.sourceFingerprint
    ?? descriptor.fingerprint
    ?? profile?.fingerprint
    ?? null;
  const parsingIdentity = stableStringify(descriptor.parsingMetadata ?? {});
  const portable = portableSource !== null && portableSource !== undefined;
  const transport = portable ? `portable:${scopeId}` : "network";
  const runtimeScope = fingerprint === null && !descriptor.path
    ? scopeId
    : null;
  return Object.freeze({
    sourceId,
    purpose,
    providerKind,
    cacheKey: stableStringify({
      sourceId,
      providerKind,
      path: descriptor.path ?? null,
      fingerprint,
      parsingIdentity,
      runtimeScope,
      transport,
    }),
    descriptor,
    portableSource,
  });
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableStringify(value[key])}`
  )).join(",")}}`;
}
