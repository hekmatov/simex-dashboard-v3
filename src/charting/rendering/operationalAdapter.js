export function buildOperationalRenderModel({ chart, prepared }) {
  if (chart.typeId === "image") {
    const mark = prepared.marks[0];
    return {
      kind: "image",
      src: mark.src,
      alt: mark.alt ?? "",
      fit: mark.fit ?? "contain",
    };
  }

  const names = unique(prepared.marks.flatMap(({ columns }) => columns ?? []));
  return {
    kind: "table",
    columns: names.map((name) => ({ key: name, label: name })),
    rows: prepared.marks.map(({ values }) => clone(values)),
  };
}

function unique(values) {
  return [...new Set(values)];
}

function clone(value) {
  return structuredClone(value);
}
