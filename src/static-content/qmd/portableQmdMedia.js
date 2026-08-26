import { parsePortableQmd } from "./parsePortableQmd.js";

const MEDIA_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const ALIGN = new Set(["start", "center", "end"]);
const FLOW = new Set(["block", "wrap-start", "wrap-end"]);
const FRAME = new Set(["none", "outline", "card"]);
const DEFAULT_ATTRIBUTES = Object.freeze({
  width: "100%",
  align: "center",
  flow: "block",
  frame: "none",
  caption: "",
  decorative: false,
});

export function parsePortableMediaReference(destination) {
  if (typeof destination !== "string" || !destination.startsWith("simex-media:")) return null;
  const mediaId = destination.slice("simex-media:".length);
  return MEDIA_ID.test(mediaId) ? { mediaId } : null;
}

export function validatePortableMediaAttributes(attributes) {
  const entries = typeof attributes === "string"
    ? parseAttributeSuffix(attributes)
    : attributes && typeof attributes === "object" && !Array.isArray(attributes)
    ? Object.entries(attributes)
    : null;
  if (!entries) return { ok: false, attributes: null };
  const value = {};
  for (const [key, raw] of entries) {
    if (Object.hasOwn(value, key) || !["width", "align", "flow", "frame", "caption", "decorative"].includes(key)) {
      return { ok: false, attributes: null };
    }
    if (key === "width") {
      const match = /^(\d{1,3})%$/.exec(String(raw));
      const percentage = Number(match?.[1]);
      if (!match || percentage < 10 || percentage > 100) return { ok: false, attributes: null };
      value.width = `${percentage}%`;
    } else if (key === "align") {
      if (!ALIGN.has(raw)) return { ok: false, attributes: null };
      value.align = raw;
    } else if (key === "flow") {
      if (!FLOW.has(raw)) return { ok: false, attributes: null };
      value.flow = raw;
    } else if (key === "frame") {
      if (!FRAME.has(raw)) return { ok: false, attributes: null };
      value.frame = raw;
    } else if (key === "caption") {
      if (typeof raw !== "string" || /[\u0000-\u001f\u007f]/.test(raw)) return { ok: false, attributes: null };
      value.caption = raw;
    } else if (key === "decorative") {
      if (raw !== true && raw !== false && raw !== "true" && raw !== "false") return { ok: false, attributes: null };
      value.decorative = raw === true || raw === "true";
    }
  }
  return { ok: true, attributes: value };
}

export function serializePortableMediaReference({
  mediaId,
  alt,
  width = DEFAULT_ATTRIBUTES.width,
  align = DEFAULT_ATTRIBUTES.align,
  flow = DEFAULT_ATTRIBUTES.flow,
  frame = DEFAULT_ATTRIBUTES.frame,
  caption = DEFAULT_ATTRIBUTES.caption,
  decorative = DEFAULT_ATTRIBUTES.decorative,
} = {}) {
  if (typeof mediaId !== "string" || !MEDIA_ID.test(mediaId)) throw new TypeError("A valid media id is required.");
  if (typeof alt !== "string" || (!decorative && !alt.trim())) throw new TypeError("Contextual alt text is required unless the image is decorative.");
  const validated = validatePortableMediaAttributes({ width, align, flow, frame, caption, decorative });
  if (!validated.ok) throw new TypeError("Portable media attributes are invalid.");
  const accessibleAlt = decorative ? "" : alt;
  const values = validated.attributes;
  return `![${escapeMarkdownLabel(accessibleAlt)}](simex-media:${mediaId}){width=${values.width} align=${values.align} flow=${values.flow} frame=${values.frame} caption="${escapeQuoted(values.caption)}" decorative=${values.decorative}}`;
}

export function annotatePortableMediaTokens(ast) {
  if (!ast || ast.type !== "root" || !Array.isArray(ast.tokens) || !Array.isArray(ast.footnotes)) {
    throw new TypeError("A portable QMD AST is required.");
  }
  if (Array.isArray(ast.mediaNodes) && Array.isArray(ast.annotations)) return ast;

  const mediaNodes = [];
  const annotations = [];
  let tokenIndex = 0;
  const annotateChildren = (children) => {
    const cloned = children.map(cloneToken);
    for (let index = 0; index < cloned.length; index += 1) {
      const token = cloned[index];
      const currentTokenIndex = tokenIndex;
      tokenIndex += 1;
      if (token.type !== "image" || token.attrGet?.("title")) continue;
      const reference = parsePortableMediaReference(String(token.attrGet?.("src") ?? ""));
      if (!reference) continue;

      let attributes = DEFAULT_ATTRIBUTES;
      let suffixTokenIndex = null;
      let sourceSuffix = "";
      const following = cloned[index + 1];
      if (following?.type === "text" && following.content.startsWith("{")) {
        const suffix = leadingAttributeSuffix(following.content);
        const validated = suffix ? validatePortableMediaAttributes(suffix) : { ok: false };
        if (validated.ok) {
          attributes = Object.freeze({ ...DEFAULT_ATTRIBUTES, ...validated.attributes });
          sourceSuffix = suffix;
          suffixTokenIndex = tokenIndex;
          following.content = following.content.slice(suffix.length);
        }
      }
      const alt = String(token.content ?? "");
      const mediaNode = Object.freeze({
        tokenIndex: currentTokenIndex,
        mediaId: reference.mediaId,
        alt,
        attributes,
        sourceText: `![${escapeMarkdownLabel(alt)}](simex-media:${reference.mediaId})${sourceSuffix}`,
      });
      const mediaNodeIndex = mediaNodes.length;
      mediaNodes.push(mediaNode);
      annotations.push(Object.freeze({ tokenIndex: currentTokenIndex, suffixTokenIndex }));
      token.meta = { ...(token.meta ?? {}), portableMediaNodeIndex: mediaNodeIndex };
    }
    return cloned;
  };

  const tokens = ast.tokens.map((token) => {
    const cloned = cloneToken(token);
    if (Array.isArray(token.children)) cloned.children = annotateChildren(token.children);
    return cloned;
  });
  const footnotes = ast.footnotes.map((footnote) => ({
    ...footnote,
    tokens: Array.isArray(footnote.tokens)
      ? footnote.tokens.map((token) => {
          const cloned = cloneToken(token);
          if (Array.isArray(token.children)) cloned.children = annotateChildren(token.children);
          return cloned;
        })
      : footnote.tokens,
  }));
  return Object.freeze({
    type: ast.type,
    policy: ast.policy,
    source: ast.source,
    tokens,
    footnotes,
    mediaNodes: Object.freeze(mediaNodes),
    annotations: Object.freeze(annotations),
  });
}

export function parsePortableQmdWithMedia(source) {
  const parsed = parsePortableQmd(source);
  if (parsed.ast === null) return parsed;
  return Object.freeze({
    ok: parsed.ok,
    ast: annotatePortableMediaTokens(parsed.ast),
    errors: parsed.errors,
    warnings: parsed.warnings,
    stats: parsed.stats,
  });
}

export function extractPortableMediaNodes(ast, { mediaItems = {} } = {}) {
  if (!ast || !Array.isArray(ast.mediaNodes) || !Array.isArray(ast.annotations)) {
    throw new TypeError("An annotated portable QMD AST is required.");
  }
  return Object.freeze(ast.mediaNodes.flatMap((node) => {
    const mediaItem = valueForId(mediaItems, node.mediaId);
    const local = mediaItem?.current?.kind === "asset" || mediaItem?.current?.kind === "package";
    if (!local) return [];
    return [Object.freeze({
      ...node,
      mediaItem,
      renderable: mediaItem.health === "ready",
    })];
  }));
}

function cloneToken(token) {
  const cloned = Object.assign(Object.create(Object.getPrototypeOf(token)), token);
  if (Array.isArray(token.attrs)) cloned.attrs = token.attrs.map((entry) => [...entry]);
  if (Array.isArray(token.children)) cloned.children = token.children.map(cloneToken);
  if (token.meta && typeof token.meta === "object") cloned.meta = { ...token.meta };
  return cloned;
}

function leadingAttributeSuffix(text) {
  let quoted = false;
  let escaped = false;
  for (let index = 1; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) escaped = false;
    else if (character === "\\" && quoted) escaped = true;
    else if (character === '"') quoted = !quoted;
    else if (character === "}" && !quoted) return text.slice(0, index + 1);
  }
  return null;
}

function parseAttributeSuffix(value) {
  if (!value.startsWith("{") || !value.endsWith("}")) return null;
  const content = value.slice(1, -1).trim();
  if (!content) return [];
  const entries = [];
  let index = 0;
  while (index < content.length) {
    const match = /^([a-z]+)=/.exec(content.slice(index));
    if (!match) return null;
    const key = match[1];
    index += match[0].length;
    let raw;
    if (content[index] === '"') {
      index += 1;
      let valueText = "";
      let closed = false;
      while (index < content.length) {
        if (content[index] === '"') {
          closed = true;
          index += 1;
          break;
        }
        if (content[index] === "\\" && index + 1 < content.length) index += 1;
        valueText += content[index];
        index += 1;
      }
      if (!closed) return null;
      raw = valueText;
    } else {
      const end = content.indexOf(" ", index);
      raw = content.slice(index, end < 0 ? content.length : end);
      index = end < 0 ? content.length : end;
      if (!raw) return null;
    }
    entries.push([key, raw]);
    if (index < content.length) {
      if (content[index] !== " ") return null;
      while (content[index] === " ") index += 1;
      if (index === content.length) return null;
    }
  }
  return entries;
}

function escapeMarkdownLabel(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function escapeQuoted(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function valueForId(collection, id) {
  if (collection instanceof Map) return collection.get(id);
  if (Array.isArray(collection)) return collection.find((entry) => entry?.mediaId === id);
  return collection?.[id];
}
