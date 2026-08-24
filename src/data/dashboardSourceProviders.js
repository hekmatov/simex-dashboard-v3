export function createDashboardSourceProviders({
  loadCsv,
  parseCsvText,
  profileDataset,
  fetchJson,
  sourceUrl,
  validateGeoJson,
}) {
  return [
    {
      kind: "csv",
      async load(request) {
        const { sourceId, descriptor, portableSource } = request;
        if (portableSource) {
          requirePortableKind(sourceId, portableSource, "csv");
          if (typeof portableSource.text !== "string") {
            throw new Error(`Portable CSV source "${sourceId}" is invalid.`);
          }
          return {
            data: parseCsvText(portableSource.text, descriptor.path),
            estimatedBytes: portableSource.text.length * 2,
          };
        }
        return { data: await loadCsv(sourceUrl(descriptor.path)) };
      },
    },
    {
      kind: "uploadedCsv",
      async load({ sourceId, descriptor }) {
        const data = parseCsvText(
          descriptor.csvText,
          descriptor.fileName ?? `${sourceId}.csv`,
        );
        return {
          data,
          profile: profileDataset(data, descriptor.parsingMetadata ?? {}),
          estimatedBytes: descriptor.csvText.length * 2,
        };
      },
    },
    {
      kind: "inline",
      async load({ descriptor }) {
        const data = structuredClone(descriptor.rows);
        return {
          data,
          profile: profileDataset(data, descriptor.parsingMetadata ?? {}),
        };
      },
    },
    {
      kind: "uploadedGeoJson",
      async load({ sourceId, descriptor }) {
        validateGeoJson(
          descriptor.geoJson,
          `Uploaded GeoJSON source "${sourceId}"`,
        );
        return { data: structuredClone(descriptor.geoJson) };
      },
    },
    {
      kind: "geojson",
      async load(request) {
        const { sourceId, descriptor, portableSource } = request;
        if (portableSource) {
          return {
            data: portableGeoJson(
              sourceId,
              portableSource,
              validateGeoJson,
            ),
          };
        }
        const data = await fetchJson(
          sourceUrl(descriptor.path),
          `data file: ${descriptor.path}`,
        );
        validateGeoJson(data, `Data source "${sourceId}" GeoJSON`);
        return { data };
      },
    },
  ];
}

function requirePortableKind(sourceId, portableSource, expectedKind) {
  if (portableSource.kind !== expectedKind) {
    throw new Error(
      `Portable data source "${sourceId}" does not match its descriptor.`,
    );
  }
}

function portableGeoJson(sourceId, portableSource, validateGeoJson) {
  requirePortableKind(sourceId, portableSource, "geojson");
  validateGeoJson(
    portableSource.data,
    `Portable data source "${sourceId}" GeoJSON`,
  );
  return structuredClone(portableSource.data);
}
