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
parser.use(portableImageSourceOffsetsPlugin);
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
  annotateInlineImageSourceOffsets(tokens, source);
  const footnotes = extracted.footnotes.map((footnote) => {
    const footnoteTokens = parser.parseInline(footnote.content, env);
    annotateInlineImageSourceOffsets(footnoteTokens, source, footnote.sourceStart);
    return { ...footnote, tokens: footnoteTokens };
  });
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

function portableImageSourceOffsetsPlugin(md) {
  const ruleIndex = md.inline.ruler.__find__("image");
  const canonicalImageRule = md.inline.ruler.__rules__[ruleIndex]?.fn;
  if (typeof canonicalImageRule !== "function") throw new Error("Markdown image parser rule is unavailable.");
  md.inline.ruler.at("image", (state, silent) => {
    const sourceStart = state.pos;
    const accepted = canonicalImageRule(state, silent);
    if (!accepted || silent) return accepted;
    const token = state.tokens[state.tokens.length - 1];
    if (token?.type === "image") {
      token.meta = {
        ...(token.meta ?? {}),
        portableImageInlineStart: sourceStart,
        portableImageInlineEnd: state.pos,
      };
    }
    return accepted;
  });
}

function annotateInlineImageSourceOffsets(tokens, source, fixedSourceStart = null) {
  const lineOffsets = sourceLineOffsets(source);
  const rangeCursors = new Map();
  for (const token of tokens) {
    if (token.type !== "inline" || !Array.isArray(token.children)) continue;
    const segments = Number.isInteger(fixedSourceStart)
      ? [{ inlineStart: 0, sourceStart: fixedSourceStart }]
      : inlineSourceSegments(token, source, lineOffsets, rangeCursors);
    token.meta = { ...(token.meta ?? {}), portableInlineSourceSegments: segments };
    for (const child of token.children) {
      if (child.type !== "image") continue;
      const relativeStart = child.meta?.portableImageInlineStart;
      const relativeEnd = child.meta?.portableImageInlineEnd;
      const sourceStart = projectInlineOffset(relativeStart, segments);
      const sourceEnd = projectInlineOffset(relativeEnd, segments);
      child.meta = {
        ...(child.meta ?? {}),
        portableImageSourceStart: sourceStart,
        portableImageSourceEnd: sourceEnd,
      };
    }
  }
}

function inlineSourceSegments(token, source, lineOffsets, rangeCursors) {
  if (!Array.isArray(token.map)) return [];
  const rangeStart = lineOffsets[token.map[0]] ?? source.length;
  const rangeEnd = lineOffsets[token.map[1]] ?? source.length;
  const rangeKey = `${rangeStart}:${rangeEnd}`;
  const cursor = Math.max(rangeStart, rangeCursors.get(rangeKey) ?? rangeStart);
  const contiguousStart = source.indexOf(token.content, cursor);
  if (contiguousStart >= cursor && contiguousStart + token.content.length <= rangeEnd) {
    rangeCursors.set(rangeKey, contiguousStart + token.content.length);
    return [{ inlineStart: 0, sourceStart: contiguousStart }];
  }

  const segments = [];
  let inlineStart = 0;
  let sourceCursor = cursor;
  for (const contentLine of token.content.split("\n")) {
    const sourceStart = source.indexOf(contentLine, sourceCursor);
    if (sourceStart < sourceCursor || sourceStart + contentLine.length > rangeEnd) return [];
    segments.push({ inlineStart, sourceStart });
    inlineStart += contentLine.length + 1;
    sourceCursor = sourceStart + contentLine.length;
  }
  rangeCursors.set(rangeKey, sourceCursor);
  return segments;
}

function projectInlineOffset(offset, segments) {
  if (!Number.isInteger(offset) || segments.length === 0) return null;
  let segment = segments[0];
  for (const candidate of segments) {
    if (candidate.inlineStart > offset) break;
    segment = candidate;
  }
  return segment.sourceStart + offset - segment.inlineStart;
}

function sourceLineOffsets(source) {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") offsets.push(index + 1);
  }
  return offsets;
}

function extractFootnotes(source) {
  const lines = source.split("\n");
  const footnotes = [];
  const seen = new Set();
  let lineStart = 0;
  const sanitized = lines.map((line, index) => {
    const match = /^\s*\[\^([a-z][a-z0-9._:-]*)\]:\s+(.+)$/id.exec(line);
    const nextLineStart = lineStart + line.length + 1;
    if (!match) {
      lineStart = nextLineStart;
      return line;
    }
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      footnotes.push({
        id: match[1],
        content: match[2],
        line: index + 1,
        sourceStart: lineStart + match.indices[2][0],
      });
    }
    lineStart = nextLineStart;
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
