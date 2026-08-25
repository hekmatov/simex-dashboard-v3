export function normalizeManagedGeoJsonSource(sourceId, descriptor, validation) {
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    throw new TypeError("Managed GeoJSON sourceId is required.");
  }
  if (!isManagedGeoJsonDescriptor(descriptor)) {
    throw new Error("A managed GeoJSON descriptor is required.");
  }
  const summary = summarizeGeoJsonSource(validation);
  const origin = descriptor.kind === "geojson"
    ? "linked-project"
    : descriptor.browserAssetId
    ? "uploaded"
    : "packaged";
  const displayName = descriptor.provenance?.label
    ?? descriptor.fileName
    ?? descriptor.path?.split(/[\\/]/).at(-1)
    ?? sourceId;
  return {
    sourceEntry: {
      sourceId,
      origin,
      ownership: descriptor.provenance?.ownership === "dashboard" ? "dashboard" : "builder",
      displayName,
      provenance: structuredClone(descriptor.provenance ?? {}),
      health: "ready",
    },
    dataSource: structuredClone(descriptor),
    summary,
  };
}

export function summarizeGeoJsonSource(validation) {
  if (
    validation?.schema?.ok !== true
    || !validation.admission
    || validation.admission.status === "rejected"
    || !validation.summary
  ) {
    throw new Error("A successful GeoJSON validation is required to build a source summary.");
  }
  return structuredClone(validation.summary);
}

function isManagedGeoJsonDescriptor(descriptor) {
  return descriptor?.kind === "geojson" || (
    descriptor?.kind === "dataset"
    && descriptor?.type === "uploadedGeoJson"
  );
}
