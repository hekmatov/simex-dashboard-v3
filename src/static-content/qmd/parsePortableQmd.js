import MarkdownIt from "markdown-it";

import {
  PORTABLE_QMD_POLICY,
  validatePortableQmdAst,
} from "./portableQmdPolicy.js";

const parser = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
  breaks: false,
});
parser.use(portableCalloutPlugin);
parser.use(portableMathPlugin);
parser.use(portableFootnotePlugin);

export function parsePortableQmd(source) {
  if (typeof source !== "string") throw new TypeError("Portable QMD source must be a string.");
  const sourceBytes = new TextEncoder().encode(source).byteLength;
  if (sourceBytes > PORTABLE_QMD_POLICY.limits.sourceBytes) {
    return Object.freeze({
      ok: false,
      ast: null,
      errors: Object.freeze([Object.freeze({
        rule: "source-size",
        message: `Portable QMD source is ${sourceBytes} bytes; the limit is ${PORTABLE_QMD_POLICY.limits.sourceBytes}.`,
        guidance: "Split the content across panels or remove content until the source is at most 100 KiB.",
        location: Object.freeze({ line: 1, column: 1 }),
      })]),
      warnings: Object.freeze([]),
      stats: Object.freeze({ sourceBytes }),
    });
  }

  const extracted = extractFootnotes(source);
  const env = { footnoteDefinitions: extracted.footnotes };
  const tokens = parser.parse(extracted.source, env);
  const footnotes = extracted.footnotes.map((footnote) => ({
    ...footnote,
    tokens: parser.parseInline(footnote.content, env),
  }));
  const ast = Object.freeze({
    type: "root",
    policy: PORTABLE_QMD_POLICY.id,
    source,
    tokens,
    footnotes,
  });
  const validation = validatePortableQmdAst(ast);
  return Object.freeze({
    ok: validation.errors.length === 0,
    ast,
    errors: validation.errors,
    warnings: validation.warnings,
    stats: Object.freeze({ sourceBytes, ...validation.stats }),
  });
}
function extractFootnotes(source) {
  const lines = source.split("\n");
  const footnotes = [];
  const seen = new Set();
  const sanitized = lines.map((line, index) => {
    const match = /^\s*\[\^([a-z][a-z0-9._:-]*)\]:\s+(.+)$/i.exec(line);
    if (!match) return line;
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      footnotes.push({ id: match[1], content: match[2], line: index + 1 });
    }
    return "";
  });
  return { source: sanitized.join("\n"), footnotes };
}

function portableFootnotePlugin(md) {
  md.inline.ruler.before("emphasis", "portable_footnote_ref", (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x5b || state.src.charCodeAt(state.pos + 1) !== 0x5e) return false;
    const end = state.src.indexOf("]", state.pos + 2);
    if (end < 0) return false;
    const id = state.src.slice(state.pos + 2, end);
    if (!/^[a-z][a-z0-9._:-]*$/i.test(id)) return false;
    if (!silent) {
      const token = state.push("footnote_ref", "", 0);
      token.meta = { id };
    }
    state.pos = end + 1;
    return true;
  });
}

function portableCalloutPlugin(md) {
  md.block.ruler.before("fence", "portable_callout", (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const maximum = state.eMarks[startLine];
    const opening = state.src.slice(start, maximum).trim();
    const match = /^:::\s*(?:\{\s*)?\.?(?:callout-)?(note|tip|important|warning|caution)(?:\s*\})?\s*$/i.exec(opening);
    if (!match) return false;
    let closeLine = startLine + 1;
    for (; closeLine < endLine; closeLine += 1) {
      const lineStart = state.bMarks[closeLine] + state.tShift[closeLine];
      if (/^:::\s*$/.test(state.src.slice(lineStart, state.eMarks[closeLine]).trim())) break;
    }
    if (closeLine >= endLine) return false;
    if (silent) return true;
    const open = state.push("callout_open", "aside", 1);
    open.block = true;
    open.map = [startLine, closeLine + 1];
    open.meta = { kind: match[1].toLowerCase() };
    state.md.block.tokenize(state, startLine + 1, closeLine);
    const close = state.push("callout_close", "aside", -1);
    close.block = true;
    close.map = [closeLine, closeLine + 1];
    state.line = closeLine + 1;
    return true;
  });
}

function portableMathPlugin(md) {
  md.block.ruler.before("fence", "portable_math_block", (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const opening = state.src.slice(start, state.eMarks[startLine]).trim();
    if (!opening.startsWith("$$")) return false;
    let content = opening.slice(2);
    let closeLine = startLine;
    if (content.endsWith("$$") && content.length > 2) {
      content = content.slice(0, -2);
    } else {
      const parts = [];
      if (content) parts.push(content);
      for (closeLine = startLine + 1; closeLine < endLine; closeLine += 1) {
        const lineStart = state.bMarks[closeLine] + state.tShift[closeLine];
        const line = state.src.slice(lineStart, state.eMarks[closeLine]);
        const marker = line.indexOf("$$");
        if (marker >= 0) {
          parts.push(line.slice(0, marker));
          break;
        }
        parts.push(line);
      }
      if (closeLine >= endLine) return false;
      content = parts.join("\n");
    }
    if (silent) return true;
    const token = state.push("math_block", "", 0);
    token.block = true;
    token.content = content.trim();
    token.map = [startLine, closeLine + 1];
    state.line = closeLine + 1;
    return true;
  });

  md.inline.ruler.before("escape", "portable_math_inline", (state, silent) => {
    if (state.src[state.pos] !== "$" || state.src[state.pos + 1] === "$") return false;
    let end = state.pos + 1;
    while ((end = state.src.indexOf("$", end)) >= 0) {
      if (state.src[end - 1] !== "\\") break;
      end += 1;
    }
    if (end < 0 || end === state.pos + 1) return false;
    if (!silent) {
      const token = state.push("math_inline", "", 0);
      token.content = state.src.slice(state.pos + 1, end);
    }
    state.pos = end + 1;
    return true;
  });
}
