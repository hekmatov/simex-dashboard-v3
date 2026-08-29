import DOMPurify from "dompurify";

import { validatePortableHref } from "./portableQmdPolicy.js";

const ALLOWED_TAGS = Object.freeze([
  "p", "br", "strong", "b", "em", "i", "u",
  "ul", "ol", "li", "a",
  "table", "thead", "tbody", "tr", "th", "td",
  "h1", "h2", "h3", "h4", "h5", "h6",
  // Import-only: converted to visible alt text, never to an image/media node.
  "img",
]);

const ALLOWED_ATTRIBUTES = Object.freeze(["href", "alt"]);

export function sanitizePortableQmdHtmlPaste(html) {
  if (typeof html !== "string") throw new TypeError("Pasted HTML must be a string.");
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTRIBUTES],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
  });
  const removed = new Set(DOMPurify.removed.map((entry) => removedName(entry)).filter(Boolean));
  const content = convertChildren(fragment, removed);
  return Object.freeze({
    document: { type: "doc", content: content.length ? content : [{ type: "paragraph" }] },
    removed: Object.freeze([...removed].sort()),
  });
}

function convertChildren(parent, removed) {
  const blocks = [];
  let inline = [];
  const flushInline = () => {
    if (inline.length) blocks.push({ type: "paragraph", content: inline });
    inline = [];
  };
  for (const child of parent.childNodes ?? []) {
    if (child.nodeType === 3) {
      if (child.nodeValue) inline.push({ type: "text", text: child.nodeValue });
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    if (["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "table"].includes(tag)) {
      flushInline();
      const block = convertBlock(child, removed);
      if (block) blocks.push(block);
      continue;
    }
    inline.push(...convertInline(child, [], removed));
  }
  flushInline();
  return blocks;
}

function convertBlock(element, removed) {
  const tag = element.tagName.toLowerCase();
  if (tag === "p") return { type: "paragraph", content: convertInlineChildren(element, [], removed) };
  if (/^h[1-6]$/.test(tag)) {
    return { type: "heading", attrs: { level: Number(tag[1]) }, content: convertInlineChildren(element, [], removed) };
  }
  if (tag === "ul" || tag === "ol") {
    const items = [...element.children].filter((child) => child.tagName.toLowerCase() === "li").map((item) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: convertInlineChildren(item, [], removed) }],
    }));
    return {
      type: tag === "ul" ? "bulletList" : "orderedList",
      ...(tag === "ol" ? { attrs: { start: 1 } } : {}),
      content: items,
    };
  }
  if (tag === "table") return convertTable(element, removed);
  return null;
}

function convertTable(table, removed) {
  const sourceRows = [...table.querySelectorAll("tr")];
  const rows = sourceRows.map((row, rowIndex) => ({
    type: "tableRow",
    content: [...row.children]
      .filter((cell) => ["th", "td"].includes(cell.tagName.toLowerCase()))
      .map((cell) => ({
        type: rowIndex === 0 || cell.tagName.toLowerCase() === "th" ? "tableHeader" : "tableCell",
        content: [{ type: "paragraph", content: convertInlineChildren(cell, [], removed) }],
      })),
  }));
  const width = rows[0]?.content.length ?? 0;
  if (!width || rows.some((row) => row.content.length !== width)) {
    removed.add("unsupported table formatting");
    return { type: "paragraph", content: visibleText(table) };
  }
  return { type: "table", content: rows };
}

function convertInlineChildren(parent, marks, removed) {
  return [...parent.childNodes].flatMap((child) => convertInline(child, marks, removed));
}

function convertInline(node, marks, removed) {
  if (node.nodeType === 3) return node.nodeValue ? [{ type: "text", text: node.nodeValue, ...(marks.length ? { marks } : {}) }] : [];
  if (node.nodeType !== 1) return [];
  const tag = node.tagName.toLowerCase();
  if (tag === "br") return [{ type: "text", text: "\n", ...(marks.length ? { marks } : {}) }];
  if (tag === "img") {
    removed.add("external or pasted image");
    const alt = node.getAttribute("alt")?.trim();
    return alt ? [{ type: "text", text: alt, ...(marks.length ? { marks } : {}) }] : [];
  }
  const nextMarks = [...marks];
  if (tag === "strong" || tag === "b") nextMarks.push({ type: "bold" });
  else if (tag === "em" || tag === "i") nextMarks.push({ type: "italic" });
  else if (tag === "u") nextMarks.push({ type: "underline" });
  else if (tag === "a") {
    const href = validatePortableHref(node.getAttribute("href") ?? "");
    if (href) nextMarks.push({ type: "link", attrs: { href } });
    else removed.add("unsafe link destination");
  }
  return convertInlineChildren(node, nextMarks, removed);
}

function visibleText(element) {
  const value = element.textContent?.replace(/\s+/g, " ").trim();
  return value ? [{ type: "text", text: value }] : [];
}

function removedName(entry) {
  if (entry?.attribute?.name) return `attribute ${entry.attribute.name}`;
  if (entry?.element?.tagName) return `element ${entry.element.tagName.toLowerCase()}`;
  return "unsupported formatting";
}

export const PORTABLE_QMD_HTML_PASTE_POLICY = Object.freeze({
  tags: ALLOWED_TAGS,
  attributes: ALLOWED_ATTRIBUTES,
  protocols: Object.freeze(["https:", "http:", "fragment"]),
});
