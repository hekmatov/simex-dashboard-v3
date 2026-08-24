import createDOMPurify from "dompurify";

import { validatePortableHref } from "./portableQmdPolicy.js";

const ALLOWED_TAGS = [
  "a", "aside", "blockquote", "code", "div", "em",
  "h2", "h3", "h4", "h5", "h6", "hr", "li", "ol", "p", "pre",
  "section", "s", "span", "strong", "sup", "table", "tbody", "td",
  "th", "thead", "tr", "ul",
];
const ALLOWED_ATTRIBUTES = [
  "aria-describedby", "aria-hidden", "aria-label", "aria-labelledby",
  "class", "data-callout-type", "data-language", "href", "id", "rel",
  "role", "scope", "tabindex", "target",
];
const EXACT_GENERATED_CLASSES = new Set([
  "portable-qmd-callout", "portable-qmd-callout-label", "portable-qmd-code-scroll",
  "portable-qmd-external-indicator", "portable-qmd-footnote-backlink", "portable-qmd-footnote-ref",
  "portable-qmd-footnotes", "portable-qmd-math", "portable-qmd-math--display",
  "portable-qmd-table-scroll", "portable-qmd-task-marker", "portable-qmd-visually-hidden",
]);
const KATEX_CLASS = /^(?:katex(?:-html)?|base|strut|m(?:ord|rel|op|bin|open|close|punct|inner|space|frac|supsub|tight)|math(?:normal|it|rm|bf)|amsrm|nulldelimiter|sizing|reset-size\d+|size\d+|vlist-[a-z0-9-]+|pstrut|frac-line|sqrt|root|accent-body|overlay|delimsizing|delimcenter|op-symbol|large-op|small-op|arraycolsep|col-align-[lcr])$/;

export function sanitizePortableHtml(html, { panelId = "static-text", window: suppliedWindow } = {}) {
  if (typeof html !== "string") throw new TypeError("Rendered portable HTML must be a string.");
  const browserWindow = suppliedWindow ?? globalThis.window;
  if (!browserWindow?.document) throw new Error("Portable HTML sanitization requires a browser DOM.");
  const prefix = normalizePanelId(panelId);
  const purifier = createDOMPurify(browserWindow);
  purifier.addHook("uponSanitizeAttribute", (node, data) => {
    const name = data.attrName.toLowerCase();
    const value = data.attrValue;
    if (name === "class") {
      const safe = value.split(/\s+/).filter(Boolean).filter((className) => (
        EXACT_GENERATED_CLASSES.has(className)
        || className.startsWith("portable-qmd-callout--")
        || KATEX_CLASS.test(className)
      ));
      if (safe.length === 0) data.keepAttr = false;
      else data.attrValue = safe.join(" ");
      return;
    }
    if (name === "id" && !value.startsWith(`${prefix}-`)) {
      data.keepAttr = false;
      return;
    }
    if (name === "href") {
      const safeHref = validatePortableHref(value);
      if (!safeHref || (safeHref.startsWith("#") && !safeHref.startsWith(`#${prefix}-`))) {
        data.keepAttr = false;
      } else {
        data.attrValue = safeHref;
      }
      return;
    }
    if (name === "target" && value !== "_blank") data.keepAttr = false;
    if (name === "rel" && value !== "noopener noreferrer") data.keepAttr = false;
    if (name === "tabindex" && value !== "0") data.keepAttr = false;
    if (name === "scope" && value !== "col" && value !== "row") data.keepAttr = false;
    if (name.startsWith("on") || name === "style" || name === "src" || name === "srcset") data.keepAttr = false;
  });
  return purifier.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    RETURN_DOM_FRAGMENT: true,
    RETURN_DOM: false,
    RETURN_TRUSTED_TYPE: false,
    IN_PLACE: false,
  });
}

function normalizePanelId(value) {
  const normalized = String(value ?? "static-text")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "static-text";
}
