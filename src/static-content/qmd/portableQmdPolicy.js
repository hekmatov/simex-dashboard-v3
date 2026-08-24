import katex from "katex";

export const PORTABLE_QMD_POLICY = Object.freeze({
  id: "portable-qmd-v1",
  features: Object.freeze({
    headings: "allow",
    emphasis: "allow",
    lists: "allow",
    links: "restricted",
    tables: "allow",
    blockquotes: "allow",
    inlineCode: "allow",
    fencedCode: "display-only",
    math: "restricted",
    footnotes: "allow",
    callouts: Object.freeze(["note", "tip", "important", "warning", "caution"]),
    citations: "deny",
    embeddedMedia: "deny",
    rawHtml: "deny",
    activeContent: "deny",
    iframes: "deny",
    executableCells: "deny",
    extensions: "deny",
    widgets: "deny",
  }),
  protocols: Object.freeze(["https:", "http:", "fragment"]),
  limits: Object.freeze({
    sourceBytes: 100 * 1024,
    renderedNodes: 5_000,
    nestingDepth: 6,
    tableRows: 100,
    tableColumns: 20,
  }),
});

export const PORTABLE_QMD_MATH_OPTIONS = Object.freeze({
  throwOnError: true,
  strict: "error",
  trust: false,
  output: "html",
  macros: Object.freeze({}),
  maxExpand: 100,
  maxSize: 20,
});

const ALLOWED_TOKEN_TYPES = new Set([
  "blockquote_open", "blockquote_close",
  "bullet_list_open", "bullet_list_close",
  "ordered_list_open", "ordered_list_close",
  "list_item_open", "list_item_close",
  "paragraph_open", "paragraph_close",
  "heading_open", "heading_close",
  "strong_open", "strong_close",
  "em_open", "em_close",
  "s_open", "s_close",
  "link_open", "link_close",
  "table_open", "table_close",
  "thead_open", "thead_close",
  "tbody_open", "tbody_close",
  "tr_open", "tr_close",
  "th_open", "th_close",
  "td_open", "td_close",
  "inline", "text", "softbreak", "hardbreak",
  "code_inline", "fence", "hr",
  "math_inline", "math_block",
  "footnote_ref", "callout_open", "callout_close",
]);

const CONTAINER_OPEN_TYPES = new Set([
  "blockquote_open",
  "bullet_list_open",
  "ordered_list_open",
  "callout_open",
]);

export function validatePortableQmdAst(ast) {
  if (!ast || ast.type !== "root" || !Array.isArray(ast.tokens) || typeof ast.source !== "string") {
    throw new TypeError("Portable QMD AST root is required.");
  }
  const errors = [...scanUnsupportedSource(ast.source)];
  const stats = accountComplexity(ast.tokens, ast.footnotes ?? []);
  const tokenLines = locateTokens(ast.tokens, ast.footnotes ?? []);

  for (const token of flattenTokens(ast.tokens, ast.footnotes ?? [])) {
    const line = tokenLines.get(token) ?? 1;
    if (!ALLOWED_TOKEN_TYPES.has(token.type)) {
      errors.push(issue(
        "unsupported-token",
        `The ${token.type} construct is not part of portable-qmd-v1.`,
        "Replace it with supported Markdown text or a supported semantic block.",
        line,
      ));
    }
    if (token.type === "heading_open") {
      const level = Number.parseInt(token.tag?.slice(1), 10);
      if (!Number.isInteger(level) || level < 1 || level > 4) {
        errors.push(issue(
          "heading-level",
          "Portable QMD supports source heading levels 1 through 4.",
          "Use a level 1–4 heading and keep deeper detail in paragraphs or lists.",
          line,
        ));
      }
    }
    if (token.type === "fence") {
      const info = String(token.info ?? "").trim();
      if (/^\{|^(?:=|exec|run)|\b(?:eval|execute)\b/i.test(info)) {
        errors.push(issue(
          "executable-cells",
          "Executable cell syntax is not available in portable QMD.",
          "Use a plain language label such as `js` on a display-only code fence.",
          line,
        ));
      }
    }
    if (token.type === "link_open" && !validatePortableHref(token.attrGet("href"))) {
      errors.push(issue(
        "link-protocol",
        `Link destination "${String(token.attrGet("href") ?? "").slice(0, 80)}" is not allowed.`,
        "Use an absolute HTTP(S) URL or a same-panel fragment such as #details.",
        line,
      ));
    }
    if (token.type === "callout_open" && !PORTABLE_QMD_POLICY.features.callouts.includes(token.meta?.kind)) {
      errors.push(issue(
        "callouts",
        `Callout type "${String(token.meta?.kind)}" is unsupported.`,
        "Use note, tip, important, warning, or caution.",
        line,
      ));
    }
    if ((token.type === "math_inline" || token.type === "math_block") && unsafeMath(token.content)) {
      errors.push(issue(
        "math-command",
        "This math expression uses a command outside the local restricted profile.",
        "Use basic TeX operators, fractions, roots, Greek letters, sums, and integrals without URLs, HTML, macros, or extensions.",
        line,
      ));
    }
  }

  if (stats.renderedNodes > PORTABLE_QMD_POLICY.limits.renderedNodes) {
    errors.push(issue(
      "rendered-nodes",
      `Portable QMD would render ${stats.renderedNodes} nodes; the limit is ${PORTABLE_QMD_POLICY.limits.renderedNodes}.`,
      "Split the content across panels or simplify repeated list and table content.",
      stats.nodeLimitLine,
    ));
  }
  if (stats.nestingDepth > PORTABLE_QMD_POLICY.limits.nestingDepth) {
    errors.push(issue(
      "nesting-depth",
      `Portable QMD nesting is ${stats.nestingDepth} levels; the limit is ${PORTABLE_QMD_POLICY.limits.nestingDepth}.`,
      "Flatten nested lists, quotes, or callouts until no more than six containers are nested.",
      stats.depthLimitLine,
    ));
  }
  for (const table of stats.tables) {
    if (table.rows > PORTABLE_QMD_POLICY.limits.tableRows) {
      errors.push(issue(
        "table-rows",
        `This table has ${table.rows} rows; the limit is ${PORTABLE_QMD_POLICY.limits.tableRows}.`,
        "Split the table into smaller tables or summarize the least important rows.",
        table.line,
      ));
    }
    if (table.columns > PORTABLE_QMD_POLICY.limits.tableColumns) {
      errors.push(issue(
        "table-columns",
        `This table has ${table.columns} columns; the limit is ${PORTABLE_QMD_POLICY.limits.tableColumns}.`,
        "Remove or split columns until the table has no more than twenty.",
        table.line,
      ));
    }
  }

  const footnoteIds = new Set((ast.footnotes ?? []).map(({ id }) => id));
  for (const token of flattenTokens(ast.tokens, ast.footnotes ?? [])) {
    if (token.type === "footnote_ref" && !footnoteIds.has(token.meta?.id)) {
      errors.push(issue(
        "footnotes",
        `Footnote "${String(token.meta?.id)}" has no definition.`,
        "Add a matching `[^name]: explanation` definition.",
        tokenLines.get(token) ?? 1,
      ));
    }
  }

  return Object.freeze({
    errors: deduplicateIssues(errors),
    warnings: Object.freeze([]),
    stats: Object.freeze(stats),
  });
}

export function validatePortableHref(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001f\u007f]/u.test(trimmed)) return null;
  const decoded = decodeHref(trimmed);
  if (decoded.startsWith("#")) {
    return /^#[a-z][a-z0-9._:-]*$/i.test(decoded) ? decoded : null;
  }
  const collapsedScheme = decoded.replace(/[\s\u0000-\u001f\u007f]+/gu, "");
  let parsed;
  try {
    parsed = new URL(collapsedScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return parsed.href.endsWith("/") && !/\/$/.test(collapsedScheme)
    ? parsed.href.slice(0, -1)
    : parsed.href;
}

function scanUnsupportedSource(source) {
  const errors = [];
  const proseSource = maskDisplayCode(source);
  const patterns = [
    ["active-content", /<\s*script\b|\son[a-z]+\s*=|(?:java|vb)script\s*:/i, "Scripts, event handlers, and scriptable URLs are not allowed.", "Remove active content and express the information as text or display-only code."],
    ["iframes", /<\s*\/?\s*iframe\b/i, "Iframes are not available in portable QMD.", "Link to an HTTPS page instead of embedding it."],
    ["embedded-media", /!\[[^\]]*\]\s*\([^)]*\)|<\s*\/?\s*(?:img|picture|audio|video|object|embed|source)\b/i, "Embedded media is not available in Free text.", "Use an Image static panel for an image or a safe text link for external media."],
    ["citations", /\[@[-\w:.]+(?:[^\]]*)\]|^(?:bibliography|csl)\s*:/im, "Citation processing is not available in portable QMD v1.", "Write a human-readable reference or add a safe HTTP(S) link."],
    ["executable-cells", /^\s*```\s*\{[^}\n]+\}|^\s*#\|\s*(?:eval|execute|echo|output)\s*:/im, "Executable cells and cell options are not available.", "Use a plain display-only fence with an optional language label."],
    ["extensions", /\{\{<[^>]+>\}\}|\{\{\{[^}]+\}\}\}|^(?:filters|extensions|format)\s*:/im, "Extensions, filters, and shortcodes are not available.", "Replace the extension with supported portable Markdown content."],
    ["widgets", /:::.*(?:\.widget|htmlwidget|dependency)|<\s*[a-z][\w-]*-[\w-]+\b/i, "Widgets and custom HTML dependencies are not available.", "Use supported static Markdown semantics without custom elements or dependency manifests."],
  ];
  for (const [rule, pattern, message, guidance] of patterns) {
    const candidate = rule === "executable-cells" ? source : proseSource;
    const match = pattern.exec(candidate);
    if (match) errors.push(issueAtIndex(rule, message, guidance, source, match.index));
  }

  const htmlPattern = /<\/?[a-z][^>]*>/i;
  const html = htmlPattern.exec(proseSource);
  if (html) {
    errors.push(issueAtIndex(
      "raw-html",
      "Raw HTML is not available in portable QMD.",
      "Use Markdown syntax; show literal markup inside inline or fenced code.",
      source,
      html.index,
    ));
  }

  const linkPattern = /!?\[[^\]]*\]\s*\(([^)]*)\)/g;
  let link;
  while ((link = linkPattern.exec(proseSource))) {
    if (link[0].startsWith("!")) continue;
    const destination = stripOptionalLinkTitle(link[1]);
    if (!validatePortableHref(destination)) {
      errors.push(issueAtIndex(
        "link-protocol",
        `Link destination "${destination.slice(0, 80)}" is not allowed.`,
        "Use an absolute HTTP(S) URL or a same-panel fragment such as #details.",
        source,
        link.index + link[0].indexOf("(") + 1,
      ));
    }
  }

  const referenceLinkPattern = /^\s*\[(?!\^)[^\]\n]+\]:\s*(.+)$/gm;
  let referenceLink;
  while ((referenceLink = referenceLinkPattern.exec(proseSource))) {
    const destination = stripOptionalLinkTitle(referenceLink[1]);
    if (!validatePortableHref(destination)) {
      errors.push(issueAtIndex(
        "link-protocol",
        `Link destination "${destination.slice(0, 80)}" is not allowed.`,
        "Use an absolute HTTP(S) URL or a same-panel fragment such as #details.",
        source,
        referenceLink.index + referenceLink[0].indexOf(referenceLink[1]),
      ));
    }
  }

  const calloutPattern = /^\s*:::\s*(?:\{\s*)?\.?([\w-]+)(?:\s*\})?\s*$/gm;
  let callout;
  while ((callout = calloutPattern.exec(proseSource))) {
    const rawKind = callout[1].replace(/^callout-/, "");
    if (!PORTABLE_QMD_POLICY.features.callouts.includes(rawKind)) {
      const rule = /widget|dependency/i.test(rawKind) ? "widgets" : "callouts";
      errors.push(issueAtIndex(
        rule,
        `Callout or container type "${callout[1]}" is unsupported.`,
        "Use note, tip, important, warning, or caution callouts only.",
        source,
        callout.index,
      ));
    }
  }
  return errors;
}

function maskDisplayCode(source) {
  const characters = [...source];
  const maskRange = (start, end) => {
    for (let index = start; index < end; index += 1) {
      if (characters[index] !== "\n" && characters[index] !== "\r") characters[index] = " ";
    }
  };
  const fencePattern = /^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm;
  let fence;
  while ((fence = fencePattern.exec(source))) maskRange(fence.index, fence.index + fence[0].length);
  const fencedMasked = characters.join("");
  const inlinePattern = /(`+)([^\n]*?)\1/g;
  let inline;
  while ((inline = inlinePattern.exec(fencedMasked))) maskRange(inline.index, inline.index + inline[0].length);
  return characters.join("");
}

function accountComplexity(tokens, footnotes) {
  let renderedNodes = 0;
  let nodeLimitLine = 1;
  let nestingDepth = 0;
  let depthLimitLine = 1;
  let depth = 0;
  const tables = [];
  let table = null;
  let inRow = false;
  let rowColumns = 0;
  for (const token of flattenTokens(tokens, footnotes)) {
    if (!token.type.endsWith("_close")) renderedNodes += 1;
    if (renderedNodes === PORTABLE_QMD_POLICY.limits.renderedNodes + 1) {
      nodeLimitLine = (token.map?.[0] ?? 0) + 1;
    }
    if (CONTAINER_OPEN_TYPES.has(token.type)) {
      depth += 1;
      if (depth > nestingDepth) {
        nestingDepth = depth;
        depthLimitLine = (token.map?.[0] ?? 0) + 1;
      }
    } else if (token.type.endsWith("_close") && CONTAINER_OPEN_TYPES.has(token.type.replace(/_close$/, "_open"))) {
      depth = Math.max(0, depth - 1);
    }
    if (token.type === "table_open") {
      table = { rows: 0, columns: 0, line: (token.map?.[0] ?? 0) + 1 };
    } else if (token.type === "tr_open" && table) {
      inRow = true;
      rowColumns = 0;
      table.rows += 1;
    } else if ((token.type === "th_open" || token.type === "td_open") && inRow) {
      rowColumns += 1;
    } else if (token.type === "tr_close" && table) {
      table.columns = Math.max(table.columns, rowColumns);
      inRow = false;
    } else if (token.type === "table_close" && table) {
      tables.push(table);
      table = null;
    }
  }
  return { renderedNodes, nodeLimitLine, nestingDepth, depthLimitLine, tables };
}

function* flattenTokens(tokens, footnotes) {
  for (const token of tokens) {
    yield token;
    if (Array.isArray(token.children)) yield* flattenTokens(token.children, []);
  }
  for (const footnote of footnotes) {
    yield* flattenTokens(footnote.tokens ?? [], []);
  }
}

function locateTokens(tokens, footnotes) {
  const locations = new WeakMap();
  const visit = (items, inheritedLine = 1) => {
    for (const token of items) {
      const line = token.map ? token.map[0] + 1 : inheritedLine;
      locations.set(token, line);
      if (Array.isArray(token.children)) visit(token.children, line);
    }
  };
  visit(tokens);
  for (const footnote of footnotes) visit(footnote.tokens ?? [], footnote.line ?? 1);
  return locations;
}

function unsafeMath(content) {
  if (typeof content !== "string" || content.trim() === "") return true;
  if (/[<>]|\\(?:href|url|html\w*|includegraphics|newcommand|renewcommand|def|gdef|require|class|style|cssId|unicode)\b/i.test(content)) {
    return true;
  }
  const commands = content.match(/\\[a-zA-Z]+/g) ?? [];
  const allowed = new Set([
    "\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon", "\\theta", "\\lambda", "\\mu", "\\pi", "\\rho", "\\sigma", "\\phi", "\\omega",
    "\\Delta", "\\Gamma", "\\Lambda", "\\Omega", "\\Phi", "\\Pi", "\\Sigma", "\\Theta",
    "\\frac", "\\sqrt", "\\sum", "\\prod", "\\int", "\\lim",
    "\\times", "\\cdot", "\\div", "\\pm", "\\mp", "\\le", "\\ge", "\\ne", "\\approx", "\\infty",
    "\\left", "\\right", "\\text", "\\mathrm", "\\mathbf", "\\mathit",
  ]);
  if (commands.some((command) => !allowed.has(command))) return true;
  try {
    katex.renderToString(content, { ...PORTABLE_QMD_MATH_OPTIONS, displayMode: false });
    return false;
  } catch {
    return true;
  }
}

function stripOptionalLinkTitle(value) {
  const trimmed = value.trim();
  const title = /^(.*?)(?:\s+["'][^"']*["'])\s*$/s.exec(trimmed);
  return (title?.[1] ?? trimmed).replace(/^<|>$/g, "").trim();
}

function decodeHref(value) {
  let decoded = value.replace(/&colon;/gi, ":").replace(/&#(x[0-9a-f]+|\d+);?/gi, (_, code) => {
    const numeric = code[0].toLowerCase() === "x"
      ? Number.parseInt(code.slice(1), 16)
      : Number.parseInt(code, 10);
    return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : "";
  });
  for (let index = 0; index < 3; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return "";
    }
  }
  return decoded;
}

function issueAtIndex(rule, message, guidance, source, index) {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  return issue(rule, message, guidance, line, index - lastNewline);
}

function issue(rule, message, guidance, line = 1, column = 1) {
  return Object.freeze({
    rule,
    message,
    guidance,
    location: Object.freeze({ line, column }),
  });
}

function deduplicateIssues(errors) {
  const seen = new Set();
  return Object.freeze(errors.filter((error) => {
    const key = `${error.rule}:${error.location.line}:${error.location.column}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
}
