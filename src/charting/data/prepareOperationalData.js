import {
  bindingField,
  error,
  firstRoleBinding,
  readRoleValue,
  roleBindings,
} from "./transforms.js";

export function prepareOperationalData({ schema, chart, rows, datasetProfile, renderContext }) {
  if (schema.typeId === "image") {
    if (imageSourceKind(renderContext?.sources, chart?.sourceId) === "staticImage") {
      return {
        marks: [],
        diagnostics: [error(
          "typed-static-image-legacy-adapter",
          "Typed static Image must resolve before the legacy inline-row adapter.",
          { sourceId: chart?.sourceId ?? null },
        )],
        duplicateGroupCount: 0,
        meta: { adapter: "typed-static-image" },
      };
    }
    if (rows.length !== 1) {
      return {
        marks: [],
        diagnostics: [error(
          "image-row-count",
          "Image manual data must contain exactly one row.",
          { rowCount: rows.length },
        )],
        duplicateGroupCount: 0,
        meta: { adapter: "legacy-inline-image" },
      };
    }
    return {
      marks: rows
        .filter((row) => row?.src)
        .map((row) => ({ src: row.src, alt: row.alt ?? "", fit: row.fit ?? "contain" })),
      diagnostics: [],
      duplicateGroupCount: 0,
      meta: { adapter: "legacy-inline-image" },
    };
  }
  const columns = roleBindings(chart, "columns");
  const names = columns.map(bindingField);
  const time = firstRoleBinding(chart, "time");
  return {
    marks: rows.map((row) => ({
      values: Object.fromEntries(names.map((name) => [name, row?.[name]])),
      columns: names,
      time: readRoleValue(row, time, datasetProfile),
    })),
    diagnostics: [],
    duplicateGroupCount: 0,
  };
}

function imageSourceKind(sources, sourceId) {
  if (!sources || !sourceId) return null;
  if (sources instanceof Map) return sources.get(sourceId)?.kind ?? null;
  if (Array.isArray(sources)) {
    return sources.find((source) => source?.id === sourceId)?.kind ?? null;
  }
  return sources[sourceId]?.kind ?? null;
}
