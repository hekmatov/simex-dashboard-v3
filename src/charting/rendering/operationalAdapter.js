export function buildOperationalRenderModel({ chart, prepared }) {
  if (chart.typeId === "image") {
    if (prepared.meta?.adapter === "typed-static-image") {
      return {
        kind: "error",
        message: "Typed static Image must resolve before the legacy inline-row adapter.",
      };
    }
    const mark = prepared.marks[0];
    return {
      kind: "image",
      src: mark.src,
      alt: mark.alt ?? "",
      fit: mark.fit ?? "contain",
      legacyInline: true,
    };
  }

  const names = unique(prepared.marks.flatMap(({ columns }) => columns ?? []));
  const rowMetadata = uniqueRowMetadata(prepared.marks);
  return {
    kind: "table",
    columns: names.map((name) => ({ key: name, label: name })),
    rows: prepared.marks.map(({ values }) => clone(values)),
    rowMetadata,
  };
}

function unique(values) {
  return [...new Set(values)];
}

function clone(value) {
  return structuredClone(value);
}

function uniqueRowMetadata(marks) {
  const seen = new Map();
  return marks.map((mark) => {
    const baseKey = mark.rowKey ?? canonicalRowKey(mark.values, mark.columns, mark.time);
    const occurrence = seen.get(baseKey) ?? 0;
    seen.set(baseKey, occurrence + 1);
    return { key: occurrence === 0 ? baseKey : `${baseKey}#${occurrence + 1}`, time: mark.time ?? null };
  });
}

function canonicalRowKey(values, columns, time) {
  return `table:${canonicalStringify([...(columns ?? []).map((column) => [column, values?.[column]]), ["time", time ?? null]])}`;
}

function canonicalStringify(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number") return Number.isFinite(value) ? `number:${value}` : `number:${String(value)}`;
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
  return String(value);
}
