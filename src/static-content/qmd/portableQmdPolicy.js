import katex from "katex";

export const PORTABLE_QMD_POLICY = Object.freeze({
  id: "portable-qmd-v1",
  features: Object.freeze({
    arbitraryText: "allow-inert",
    headings: "semantic",
    emphasis: "semantic",
    underline: "semantic",
    lists: "semantic",
    links: "safe-or-inert",
    tables: "semantic",
    blockquotes: "semantic",
    inlineCode: "display-only",
    fencedCode: "display-only",
    math: "restricted-or-inert",
    footnotes: "semantic",
    callouts: Object.freeze(["note", "tip", "important", "warning", "caution"]),
    citations: "inert-text",
    embeddedMedia: "inert-text",
    rawHtml: "inert-text",
    activeContent: "inert-text",
    thematicBreaks: "semantic",
    iframes: "inert-text",
    executableCells: "display-only",
    extensions: "inert-text",
    widgets: "inert-text",
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
  const errors = [];
  const stats = accountComplexity(ast.tokens, ast.footnotes ?? []);

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

  return Object.freeze({
    errors: Object.freeze(errors),
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

export function isPortableQmdMathAllowed(content) {
  if (typeof content !== "string" || content.trim() === "") return false;
  if (/[<>]|\\(?:href|url|html\w*|includegraphics|newcommand|renewcommand|def|gdef|require|class|style|cssId|unicode)\b/i.test(content)) {
    return false;
  }
  const commands = content.match(/\\[a-zA-Z]+/g) ?? [];
  const allowed = new Set([
    "\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon", "\\theta", "\\lambda", "\\mu", "\\pi", "\\rho", "\\sigma", "\\phi", "\\omega",
    "\\Delta", "\\Gamma", "\\Lambda", "\\Omega", "\\Phi", "\\Pi", "\\Sigma", "\\Theta",
    "\\frac", "\\sqrt", "\\sum", "\\prod", "\\int", "\\lim",
    "\\times", "\\cdot", "\\div", "\\pm", "\\mp", "\\le", "\\ge", "\\ne", "\\approx", "\\infty",
    "\\left", "\\right", "\\text", "\\mathrm", "\\mathbf", "\\mathit",
  ]);
  if (commands.some((command) => !allowed.has(command))) return false;
  try {
    katex.renderToString(content, { ...PORTABLE_QMD_MATH_OPTIONS, displayMode: false });
    return true;
  } catch {
    return false;
  }
}

function accountComplexity(tokens, footnotes) {
  let parsedTokens = 0;
  let nestingDepth = 0;
  let depthLimitLine = 1;
  let depth = 0;
  const tables = [];
  let table = null;
  let inRow = false;
  let rowColumns = 0;
  for (const token of flattenTokens(tokens, footnotes)) {
    parsedTokens += 1;
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
  return { parsedTokens, nestingDepth, depthLimitLine, tables };
}

function* flattenTokens(tokens, footnotes) {
  for (const token of tokens) {
    yield token;
    if (Array.isArray(token.children)) yield* flattenTokens(token.children, []);
  }
  for (const footnote of footnotes) yield* flattenTokens(footnote.tokens ?? [], []);
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

function issue(rule, message, guidance, line = 1, column = 1) {
  return Object.freeze({
    rule,
    message,
    guidance,
    location: Object.freeze({ line, column }),
  });
}
