import { parsePortableQmdWithMedia, serializePortableMediaReference } from "./portableQmdMedia.js";
import { validatePortableHref } from "./portableQmdPolicy.js";

const UNSUPPORTED_SOURCE = Object.freeze([
  [/^\s*```/m, "fenced code"],
  [/(^|[^\\])\$\$?[\s\S]*?\$/, "math"],
  [/\[\^[a-z][a-z0-9._:-]*\]/i, "footnotes"],
  [/(^|[^\\])<\/?[a-z!][^>]*>/i, "raw or inert markup"],
  [/^\s*>/m, "block quotes"],
  [/(^|[^\\])`/, "inline code"],
]);

const ALLOWED_BLOCK_TOKENS = new Set([
  "paragraph_open", "paragraph_close", "heading_open", "heading_close", "inline",
  "lead_open", "lead_close", "caption_open", "caption_close",
  "bullet_list_open", "bullet_list_close", "ordered_list_open", "ordered_list_close",
  "list_item_open", "list_item_close", "table_open", "table_close", "thead_open", "thead_close",
  "tbody_open", "tbody_close", "tr_open", "tr_close", "th_open", "th_close", "td_open", "td_close",
]);

const ALLOWED_INLINE_TOKENS = new Set([
  "text", "softbreak", "strong_open", "strong_close", "em_open", "em_close",
  "underline_open", "underline_close", "link_open", "link_close", "image",
]);

export function parsePortableQmdEditorDocument(source) {
  if (typeof source !== "string") throw new TypeError("Portable QMD source must be a string.");
  if (source.trim() === "") return visual({ type: "doc", content: [{ type: "paragraph" }] });
  for (const [pattern, construct] of UNSUPPORTED_SOURCE) {
    if (pattern.test(source)) return advanced(source, construct);
  }
  if (source.split("\n").some((line) => {
    const value = line.trim();
    return value.startsWith(":::")
      && value !== ":::"
      && value !== "::: {.simex-text-lead}"
      && value !== "::: {.simex-text-caption}";
  })) return advanced(source, "callouts or unsupported directives");
  if (!hasSupportedTableShape(source)) return advanced(source, "an unsupported table shape");
  const parsed = parsePortableQmdWithMedia(source);
  if (!parsed.ok) return advanced(source, "source that is not valid Portable QMD");
  const unsupportedBlock = parsed.ast.tokens.find((token) => !ALLOWED_BLOCK_TOKENS.has(token.type));
  if (unsupportedBlock) return advanced(source, `the unsupported ${unsupportedBlock.type} construct`);
  const unsupportedHeading = parsed.ast.tokens.find((token) => (
    token.type === "heading_open" && !["h2", "h3"].includes(token.tag)
  ));
  if (unsupportedHeading) return advanced(source, "a heading level outside Heading or Subheading");
  for (const token of parsed.ast.tokens) {
    if (token.type !== "inline") continue;
    const unsupportedInline = (token.children ?? []).find((child) => !ALLOWED_INLINE_TOKENS.has(child.type));
    if (unsupportedInline) return advanced(source, `the unsupported ${unsupportedInline.type} construct`);
  }
  try {
    const content = parseBlocks(parsed.ast.tokens, parsed.ast.mediaNodes ?? []);
    const document = { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
    const serialized = serializePortableQmdEditorDocument(document);
    if (!serialized.ok) return advanced(source, serialized.errors[0] ?? "a construct outside the visual schema");
    return visual(document);
  } catch (error) {
    return advanced(source, error?.message ?? "a construct outside the visual schema");
  }
}

export function serializePortableQmdEditorDocument(document) {
  const errors = [];
  if (!document || document.type !== "doc" || (document.content !== undefined && !Array.isArray(document.content))) {
    return failure("A visual Portable QMD document is required.");
  }
  const blocks = [];
  for (const node of document.content ?? []) {
    const serialized = serializeBlock(node, errors, 0);
    if (serialized !== null && serialized !== "") blocks.push(serialized);
  }
  if (errors.length) return { ok: false, errors: Object.freeze(errors) };
  return { ok: true, source: blocks.join("\n\n").trim() };
}

function parseBlocks(tokens, mediaNodes, start = 0, stopType = null) {
  const content = [];
  let index = start;
  while (index < tokens.length && tokens[index].type !== stopType) {
    const token = tokens[index];
    if (token.type === "paragraph_open") {
      const inline = tokens[index + 1];
      requireToken(inline, "inline");
      content.push({ type: "paragraph", content: parseInline(inline.children ?? [], mediaNodes) });
      index += 3;
      continue;
    }
    if (token.type === "heading_open") {
      const inline = tokens[index + 1];
      requireToken(inline, "inline");
      content.push({
        type: "heading",
        attrs: { level: Number.parseInt(token.tag?.slice(1), 10) || 2 },
        content: parseInline(inline.children ?? [], mediaNodes),
      });
      index += 3;
      continue;
    }
    if (token.type === "lead_open" || token.type === "caption_open") {
      const closeType = token.type.replace("_open", "_close");
      const closing = findMatching(tokens, index, token.type, closeType);
      const inner = tokens.slice(index + 1, closing);
      if (inner.length !== 3 || inner[0].type !== "paragraph_open" || inner[1].type !== "inline") {
        throw new Error(`${token.type.startsWith("lead") ? "Lead" : "Caption"} must contain exactly one paragraph.`);
      }
      content.push({
        type: token.type.startsWith("lead") ? "lead" : "caption",
        content: parseInline(inner[1].children ?? [], mediaNodes),
      });
      index = closing + 1;
      continue;
    }
    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const closeType = token.type.replace("_open", "_close");
      const closing = findMatching(tokens, index, token.type, closeType);
      const list = {
        type: token.type === "bullet_list_open" ? "bulletList" : "orderedList",
        ...(token.type === "ordered_list_open" ? { attrs: { start: Number(token.attrGet?.("start")) || 1 } } : {}),
        content: [],
      };
      let cursor = index + 1;
      while (cursor < closing) {
        requireToken(tokens[cursor], "list_item_open");
        const itemClose = findMatching(tokens, cursor, "list_item_open", "list_item_close");
        const itemBlocks = parseBlocks(tokens.slice(cursor + 1, itemClose), mediaNodes);
        list.content.push({ type: "listItem", content: itemBlocks.length ? itemBlocks : [{ type: "paragraph" }] });
        cursor = itemClose + 1;
      }
      content.push(list);
      index = closing + 1;
      continue;
    }
    if (token.type === "table_open") {
      const closing = findMatching(tokens, index, "table_open", "table_close");
      content.push(parseTable(tokens.slice(index + 1, closing), mediaNodes));
      index = closing + 1;
      continue;
    }
    throw new Error(`Advanced QMD is required for ${token.type}.`);
  }
  return content;
}

function parseTable(tokens, mediaNodes) {
  const rows = [];
  let section = null;
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token.type === "thead_open") { section = "head"; index += 1; continue; }
    if (token.type === "tbody_open") { section = "body"; index += 1; continue; }
    if (["thead_close", "tbody_close"].includes(token.type)) { index += 1; continue; }
    if (token.type !== "tr_open") throw new Error("Advanced QMD is required for this table shape.");
    const rowClose = findMatching(tokens, index, "tr_open", "tr_close");
    const cells = [];
    let cursor = index + 1;
    while (cursor < rowClose) {
      const open = tokens[cursor];
      if (open.type !== "th_open" && open.type !== "td_open") throw new Error("Advanced QMD is required for this table shape.");
      const closeType = open.type.replace("_open", "_close");
      const cellClose = findMatching(tokens, cursor, open.type, closeType);
      const inline = tokens.slice(cursor + 1, cellClose).find((entry) => entry.type === "inline");
      if (!inline) throw new Error("Advanced QMD is required for this table shape.");
      cells.push({
        type: section === "head" ? "tableHeader" : "tableCell",
        content: [{ type: "paragraph", content: parseInline(inline.children ?? [], mediaNodes) }],
      });
      cursor = cellClose + 1;
    }
    rows.push({ type: "tableRow", content: cells });
    index = rowClose + 1;
  }
  const width = rows[0]?.content?.length ?? 0;
  if (!width || rows.some((row) => row.content.length !== width)) throw new Error("Advanced QMD is required for an unsupported table shape.");
  return { type: "table", content: rows };
}

function parseInline(tokens, mediaNodes) {
  const content = [];
  const marks = [];
  for (const token of tokens) {
    if (token.type === "text") pushText(content, token.content, marks);
    else if (token.type === "softbreak") pushText(content, "\n", marks);
    else if (token.type === "strong_open") marks.push({ type: "bold" });
    else if (token.type === "em_open") marks.push({ type: "italic" });
    else if (token.type === "underline_open") marks.push({ type: "underline" });
    else if (token.type === "link_open") {
      const href = validatePortableHref(String(token.attrGet?.("href") ?? ""));
      if (!href) throw new Error("Advanced QMD is required for an unsafe link destination.");
      marks.push({ type: "link", attrs: { href } });
    } else if (["strong_close", "em_close", "underline_close", "link_close"].includes(token.type)) {
      const type = token.type.replace("_close", "").replace("strong", "bold").replace("em", "italic");
      const markIndex = marks.map((mark) => mark.type).lastIndexOf(type);
      if (markIndex >= 0) marks.splice(markIndex, 1);
    } else if (token.type === "image") {
      const media = mediaNodes[token.meta?.portableMediaNodeIndex];
      if (!media) throw new Error("Advanced QMD is required for non-local image syntax.");
      content.push({
        type: "portableMedia",
        attrs: { mediaId: media.mediaId, alt: media.alt, ...media.attributes },
      });
    } else throw new Error(`Advanced QMD is required for ${token.type}.`);
  }
  return content;
}

function serializeBlock(node, errors, depth) {
  if (!node || typeof node !== "object") { errors.push("Every visual document block must be an object."); return null; }
  if (node.type === "paragraph") return serializeInline(node.content, errors);
  if (node.type === "lead" || node.type === "caption") {
    const style = node.type === "lead" ? "lead" : "caption";
    return `::: {.simex-text-${style}}\n${serializeInline(node.content, errors)}\n:::`;
  }
  if (node.type === "heading") {
    const level = Number(node.attrs?.level);
    if (![2, 3].includes(level)) {
      errors.push("Visual headings must use Heading (level 2) or Subheading (level 3).");
      return null;
    }
    return `${"#".repeat(level)} ${serializeInline(node.content, errors)}`;
  }
  if (node.type === "bulletList" || node.type === "orderedList") {
    const ordered = node.type === "orderedList";
    const start = ordered ? Math.max(1, Number(node.attrs?.start) || 1) : 1;
    return (node.content ?? []).map((item, itemIndex) => {
      if (item?.type !== "listItem") { errors.push("Lists may contain only list items."); return ""; }
      const parts = (item.content ?? []).map((block) => serializeBlock(block, errors, depth + 1) ?? "");
      const prefix = ordered ? `${start + itemIndex}. ` : "- ";
      return `${prefix}${parts.join("\n").replace(/\n/g, "\n  ")}`;
    }).join("\n");
  }
  if (node.type === "table") return serializeTable(node, errors);
  errors.push(`Unsupported visual document node: ${String(node.type)}.`);
  return null;
}

function serializeTable(node, errors) {
  const rows = node.content ?? [];
  const width = rows[0]?.content?.length ?? 0;
  if (!width || rows.some((row) => row?.type !== "tableRow" || row.content?.length !== width)) {
    errors.push("Tables must be rectangular and contain at least one cell.");
    return null;
  }
  const lines = rows.map((row) => `| ${row.content.map((cell) => {
    if (!["tableHeader", "tableCell"].includes(cell?.type)) { errors.push("Table rows contain an unsupported cell."); return ""; }
    const blocks = cell.content ?? [];
    if (blocks.length !== 1 || blocks[0]?.type !== "paragraph") { errors.push("Table cells support one paragraph."); return ""; }
    return serializeInline(blocks[0].content, errors).replaceAll("|", "\\|").replaceAll("\n", " ");
  }).join(" | ")} |`);
  lines.splice(1, 0, `| ${Array.from({ length: width }, () => "---").join(" | ")} |`);
  return lines.join("\n");
}

function serializeInline(nodes = [], errors) {
  if (!Array.isArray(nodes)) { errors.push("Inline content must be an array."); return ""; }
  return nodes.map((node) => {
    if (node?.type === "portableMedia") {
      try { return serializePortableMediaReference(node.attrs); }
      catch (error) { errors.push(error?.message ?? "Portable media is invalid."); return ""; }
    }
    if (node?.type !== "text" || typeof node.text !== "string") { errors.push(`Unsupported inline node: ${String(node?.type)}.`); return ""; }
    let value = escapeInlineText(node.text);
    const marks = normalizeMarks(node.marks, errors);
    if (marks.some((mark) => mark.type === "bold")) value = `**${value}**`;
    if (marks.some((mark) => mark.type === "italic")) value = `*${value}*`;
    if (marks.some((mark) => mark.type === "underline")) value = `++${value}++`;
    const link = marks.find((mark) => mark.type === "link");
    if (link) {
      const href = validatePortableHref(link.attrs?.href);
      if (!href) errors.push("A visual link has an unsafe or invalid destination.");
      else value = `[${value}](${href})`;
    }
    return value;
  }).join("");
}

function normalizeMarks(marks, errors) {
  if (marks === undefined) return [];
  if (!Array.isArray(marks)) { errors.push("Text marks must be an array."); return []; }
  const allowed = new Set(["bold", "italic", "underline", "link"]);
  for (const mark of marks) if (!allowed.has(mark?.type)) errors.push(`Unsupported text mark: ${String(mark?.type)}.`);
  return marks.filter((mark) => allowed.has(mark?.type));
}

function pushText(content, text, marks) {
  if (!text) return;
  content.push({ type: "text", text, ...(marks.length ? { marks: structuredClone(marks) } : {}) });
}

function findMatching(tokens, start, openType, closeType) {
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].type === openType) depth += 1;
    else if (tokens[index].type === closeType) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Advanced QMD is required for an unclosed ${openType} construct.`);
}

function requireToken(token, type) {
  if (token?.type !== type) throw new Error(`Advanced QMD is required; expected ${type}.`);
}

function escapeInlineText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replace(/([$*_[\]+`~<])/g, "\\$1")
    .replace(
      /(^|\n)( {0,3})(#{1,6}(?=\s|$)|>(?=\s|$)|-(?=\s|$)|\d+\.(?=\s|$)|---(?=\s|$))/g,
      (_match, lineStart, indent, marker) => `${lineStart}${indent}${escapeBlockMarker(marker)}`,
    );
}

function escapeBlockMarker(marker) {
  if (/^\d+\.$/.test(marker)) return `${marker.slice(0, -1)}\\.`;
  return `\\${marker}`;
}

function hasSupportedTableShape(source) {
  const lines = source.split("\n");
  for (let index = 1; index < lines.length; index += 1) {
    if (!/^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(lines[index])) continue;
    if (/:\s*-|-\s*:/.test(lines[index])) return false;
    const expected = tableColumnCount(lines[index - 1]);
    if (expected < 1 || tableColumnCount(lines[index]) !== expected) return false;
    for (let row = index + 1; row < lines.length && /\|/.test(lines[row]); row += 1) {
      if (tableColumnCount(lines[row]) !== expected) return false;
    }
  }
  return true;
}

function tableColumnCount(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  if (!trimmed) return 0;
  return trimmed.split(/(?<!\\)\|/).length;
}

function visual(document) {
  return Object.freeze({ mode: "visual", document: structuredClone(document) });
}

function advanced(source, construct) {
  return Object.freeze({
    mode: "advanced",
    reason: `Advanced QMD is required to preserve ${construct} exactly.`,
    source,
  });
}

function failure(message) {
  return { ok: false, errors: Object.freeze([message]) };
}
