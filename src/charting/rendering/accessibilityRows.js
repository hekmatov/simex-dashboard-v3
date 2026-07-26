const MAX_ACCESSIBILITY_ROWS = 50;

export function buildAccessibilityCompanion(schema, marks = [], chart = {}) {
  const family = schema.dataFamily;
  const rows = marks
    .slice(0, MAX_ACCESSIBILITY_ROWS)
    .map((mark) => accessibilityRow(family, mark, chart));
  return {
    family,
    rows,
    truncated: marks.length > rows.length,
  };
}

export function describeAccessibilityCompanion(companion) {
  const rows = companion?.rows;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const description = rows.map((row) => describeRow(companion.family, row)).join(". ");
  return companion.truncated ? `${description}. Additional values are not listed` : description;
}

function accessibilityRow(family, mark, chart) {
  if (family === "axis") {
    return {
      series: mark.measureLabel ?? mark.measure ?? "Value",
      category: mark.x,
      value: mark.value,
    };
  }
  if (family === "composition") {
    return { category: mark.category, value: mark.value, share: mark.share ?? null };
  }
  if (family === "relationship") {
    return {
      label: mark.label ?? null,
      x: mark.x,
      y: mark.y,
      size: mark.size ?? null,
      cluster: mark.cluster ?? null,
    };
  }
  if (family === "matrix") {
    return {
      row: mark.row,
      column: mark.column,
      value: mark.value,
      time: mark.time ?? null,
    };
  }
  if (family === "timeline") {
    return {
      event: mark.event,
      start: mark.start,
      end: mark.end ?? null,
      lane: mark.lane ?? null,
      state: mark.status ?? null,
    };
  }
  if (family === "geography") {
    return {
      geography: mark.geography,
      value: mark.value,
      time: mark.time ?? null,
      state: mark.feature || mark.coordinates ? "joined" : "unmatched",
    };
  }
  if (family === "target") {
    return {
      label: mark.entity ?? mark.label ?? chart.title ?? "Item",
      actual: mark.value ?? mark.actual ?? mark.displayed ?? null,
      target: mark.target ?? null,
      time: mark.displayedTime ?? mark.time ?? null,
    };
  }
  return { value: mark.value ?? null };
}

function describeRow(family, row) {
  if (family === "axis") return `${row.series} at ${display(row.category)}: ${display(row.value)}`;
  if (family === "composition") return `${display(row.category)}: ${display(row.value)}${row.share === null ? "" : ` (${formatShare(row.share)})`}`;
  if (family === "relationship") return `${row.label ?? "Point"}: x ${display(row.x)}, y ${display(row.y)}${row.size === null ? "" : `, size ${display(row.size)}`}`;
  if (family === "matrix") return `${display(row.row)}, ${display(row.column)}: ${display(row.value)}`;
  if (family === "timeline") return `${display(row.event)} starts ${display(row.start)}${row.state ? `, state ${row.state}` : ""}`;
  if (family === "geography") return `${display(row.geography)}: ${display(row.value)}${row.time ? ` at ${row.time}` : ""}, ${row.state}`;
  if (family === "target") return `${row.label}: actual ${display(row.actual)}; target ${display(row.target)}${row.time ? `; observed ${row.time}` : ""}`;
  return display(row.value);
}

function formatShare(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 1000) / 10}%` : "share unavailable";
}

function display(value) {
  return value === null
    || value === undefined
    || (typeof value === "number" && !Number.isFinite(value))
    ? "Unavailable"
    : String(value);
}
