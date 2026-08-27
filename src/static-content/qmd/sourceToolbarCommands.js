export function applyQmdToolbarCommand(source, selectionStart, selectionEnd, command) {
  const value = typeof source === "string" ? source : "";
  const [start, end] = normalizedRange(value, selectionStart, selectionEnd);

  if (command?.type === "font") return applyFont(value, start, end, command.value);
  if (command?.type === "wrap") return wrap(value, start, end, command);
  if (command?.type === "line-prefix") return toggleLinePrefix(value, start, end, command.prefix);
  if (command?.type === "table") return insertTable(value, start, end);
  return replacement(value, start, end, value.slice(start, end));
}

function applyFont(source, start, end, value) {
  const range = lineRange(source, start, end);
  const level = /^heading-([1-6])$/.exec(value)?.[1] ?? null;
  const prefix = level ? `${"#".repeat(Number(level))} ` : "";
  const next = source.slice(range.start, range.end)
    .split("\n")
    .map((line) => `${prefix}${line.replace(/^\s{0,3}#{1,6}(?:\s+|$)/, "")}`)
    .join("\n");
  return replacement(source, range.start, range.end, next);
}

function wrap(source, start, end, { before = "", after = "", placeholder = "text" } = {}) {
  const selected = source.slice(start, end) || placeholder;
  return replacement(source, start, end, `${before}${selected}${after}`, before.length, before.length + selected.length);
}

function toggleLinePrefix(source, start, end, prefix) {
  if (typeof prefix !== "string" || prefix.length === 0) return replacement(source, start, end, source.slice(start, end));
  const range = lineRange(source, start, end);
  const lines = source.slice(range.start, range.end).split("\n");
  const remove = lines.every((line) => line.startsWith(prefix));
  return replacement(source, range.start, range.end, lines.map((line) => remove ? line.slice(prefix.length) : `${prefix}${line}`).join("\n"));
}

function insertTable(source, start, end) {
  const table = "| Column 1 | Column 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |";
  const firstCell = table.indexOf("Cell 1");
  return replacement(source, start, end, table, firstCell, firstCell + "Cell 1".length);
}

function lineRange(source, start, end) {
  const lineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEnd = source.indexOf("\n", end);
  return { start: lineStart, end: lineEnd === -1 ? source.length : lineEnd };
}

function replacement(source, start, end, next, selectionStart = 0, selectionEnd = next.length) {
  return {
    source: `${source.slice(0, start)}${next}${source.slice(end)}`,
    selectionStart: start + selectionStart,
    selectionEnd: start + selectionEnd,
  };
}

function normalizedRange(source, selectionStart, selectionEnd) {
  const clamp = (value) => Math.min(source.length, Math.max(0, Number.isInteger(value) ? value : 0));
  const start = clamp(selectionStart);
  const end = clamp(selectionEnd);
  return start <= end ? [start, end] : [end, start];
}
