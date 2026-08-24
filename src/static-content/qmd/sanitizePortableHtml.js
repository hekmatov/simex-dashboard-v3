import createDOMPurify from "dompurify";

import { PORTABLE_QMD_POLICY, validatePortableHref } from "./portableQmdPolicy.js";

const ALLOWED_TAGS = [
  "a", "aside", "blockquote", "code", "div", "em",
  "h2", "h3", "h4", "h5", "h6", "hr", "li", "ol", "p", "pre",
  "section", "s", "span", "strong", "sup", "table", "tbody", "td",
  "th", "thead", "tr", "ul",
];
const ALLOWED_ATTRIBUTES = [
  "aria-describedby", "aria-hidden", "aria-label", "aria-labelledby",
  "class", "data-callout-type", "data-language", "data-portable-qmd-generated",
  "href", "id", "rel", "role", "scope", "style", "tabindex", "target",
];
const EXACT_GENERATED_CLASSES = new Set([
  "portable-qmd-callout", "portable-qmd-callout-label", "portable-qmd-code-scroll",
  "portable-qmd-external-indicator", "portable-qmd-footnote-backlink", "portable-qmd-footnote-ref",
  "portable-qmd-footnotes", "portable-qmd-math", "portable-qmd-math--display",
  "portable-qmd-table-scroll", "portable-qmd-task-marker", "portable-qmd-visually-hidden",
]);
const KATEX_GENERATED_CLASS = /^(?:katex(?:-(?:html|base|fix|inner|sizing|strut|thinbox|vbox))?|m(?:ord|rel|op|bin|open|close|punct|inner|space|frac|supsub|tight)|math(?:normal|it|rm|bf)|amsrm|mathrm|mathbf|mathit|text|nobreak|nulldelimiter|sizing|reset-size\d+|size\d+|vlist(?:-[a-z0-9-]+)?|pstrut|frac-line|sqrt|root|hide-tail|svg-align|rlap|accent-body|overlay|delimsizing|delimcenter|op-symbol|large-op|small-op|arraycolsep|col-align-[lcr])$/;
const SAFE_MATH_STYLE_PROPERTIES = new Set([
  "border-bottom-width", "height", "margin-left", "margin-right",
  "min-width", "padding-left", "top", "vertical-align",
]);

export class PortableQmdRenderedNodeLimitError extends Error {
  constructor(actual) {
    const limit = PORTABLE_QMD_POLICY.limits.renderedNodes;
    super(`Portable QMD renders ${actual} DOM nodes; the limit is ${limit}.`);
    this.name = "PortableQmdRenderedNodeLimitError";
    this.rule = "rendered-nodes";
    this.actual = actual;
    this.limit = limit;
    this.guidance = "Split the content across panels or simplify generated math, lists, and tables.";
    this.location = Object.freeze({ line: 1, column: 1 });
  }
}

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
        || (isGeneratedMathNode(node) && KATEX_GENERATED_CLASS.test(className))
      ));
      if (safe.length === 0) data.keepAttr = false;
      else data.attrValue = safe.join(" ");
      return;
    }
    if (name === "data-portable-qmd-generated") {
      if (value !== "math" || !node.classList?.contains("portable-qmd-math")) data.keepAttr = false;
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
    if (name === "style") {
      if (!isGeneratedMathNode(node) || !isSafeGeneratedMathStyle(value)) data.keepAttr = false;
      return;
    }
    if (name.startsWith("on") || name === "src" || name === "srcset") data.keepAttr = false;
  });
  const fragment = purifier.sanitize(html, {
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
  const renderedNodes = countFragmentNodes(fragment, browserWindow);
  if (renderedNodes > PORTABLE_QMD_POLICY.limits.renderedNodes) {
    throw new PortableQmdRenderedNodeLimitError(renderedNodes);
  }
  return fragment;
}

export function countPortableQmdFragmentNodes(fragment, { window: suppliedWindow } = {}) {
  const browserWindow = suppliedWindow ?? fragment?.ownerDocument?.defaultView ?? globalThis.window;
  if (!fragment || !browserWindow?.NodeFilter) throw new TypeError("A browser DOM fragment is required.");
  return countFragmentNodes(fragment, browserWindow);
}

function countFragmentNodes(fragment, browserWindow) {
  const walker = browserWindow.document.createTreeWalker(fragment, browserWindow.NodeFilter.SHOW_ALL);
  let count = 0;
  while (walker.nextNode()) count += 1;
  return count;
}

function isGeneratedMathNode(node) {
  return node?.closest?.('[data-portable-qmd-generated="math"]') !== null;
}

function isSafeGeneratedMathStyle(value) {
  const declarations = value.split(";").map((entry) => entry.trim()).filter(Boolean);
  if (declarations.length === 0) return false;
  return declarations.every((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 1) return false;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const propertyValue = declaration.slice(separator + 1).trim().toLowerCase();
    if (property === "position") return propertyValue === "relative";
    return SAFE_MATH_STYLE_PROPERTIES.has(property) && /^-?(?:\d+(?:\.\d+)?|\.\d+)em$/.test(propertyValue);
  });
}

function normalizePanelId(value) {
  const normalized = String(value ?? "static-text")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "static-text";
}
