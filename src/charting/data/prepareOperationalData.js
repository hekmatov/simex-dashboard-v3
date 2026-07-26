import {
  bindingField,
  firstRoleBinding,
  readRoleValue,
  roleBindings,
} from "./transforms.js";

export function prepareOperationalData({ schema, chart, rows, datasetProfile }) {
  if (schema.typeId === "image") {
    return {
      marks: rows
        .filter((row) => row?.src)
        .map((row) => ({ src: row.src, alt: row.alt ?? "", fit: row.fit ?? "contain" })),
      diagnostics: [],
      duplicateGroupCount: 0,
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
