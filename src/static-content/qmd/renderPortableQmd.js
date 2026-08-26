import katex from "katex";

import {
  isPortableQmdMathAllowed,
  PORTABLE_QMD_MATH_OPTIONS,
  validatePortableHref,
} from "./portableQmdPolicy.js";

const SIMPLE_BLOCKS = Object.freeze({
  blockquote_open: "blockquote",
  bullet_list_open: "ul",
  ordered_list_open: "ol",
  list_item_open: "li",
  paragraph_open: "p",
  thead_open: "thead",
  tbody_open: "tbody",
  tr_open: "tr",
  th_open: "th",
  td_open: "td",
});

const SIMPLE_CLOSES = new Set([
  "blockquote_close",
  "bullet_list_close",
  "ordered_list_close",
  "list_item_close",
  "paragraph_close",
  "thead_close",
  "tbody_close",
  "tr_close",
  "th_close",
  "td_close",
]);

export function renderPortableQmd(ast, options = {}) {
  if (!ast || ast.type !== "root" || !Array.isArray(ast.tokens)) {
    throw new TypeError("A validated portable QMD AST is required.");
  }
  const document = resolveDocument(options);
  const environment = {
    document,
    panelPrefix: normalizePanelId(options.panelId),
    hostHeadingLevel: normalizeHostHeadingLevel(options.hostHeadingLevel),
    headingCounts: new Map(),
    footnoteNumbers: new Map((ast.footnotes ?? []).map((footnote, index) => [footnote.id, index + 1])),
    footnoteReferenceCounts: new Map(),
    calloutSequence: 0,
    mediaItems: options.mediaItems ?? {},
    mediaNodes: ast.mediaNodes ?? [],
  };
  const fragment = document.createDocumentFragment();
  renderTokens(ast.tokens, fragment, environment);
  renderFootnotes(ast.footnotes ?? [], fragment, environment);
  return fragment;
}

function renderTokens(tokens, root, environment) {
  const parents = [root];
  const current = () => parents[parents.length - 1];
  const open = (node) => {
    current().append(node);
    parents.push(node);
  };
  const close = () => {
    if (parents.length > 1) parents.pop();
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (SIMPLE_BLOCKS[token.type]) {
      const node = createElement(environment.document, SIMPLE_BLOCKS[token.type]);
      if (token.type === "ordered_list_open") {
        const start = Number.parseInt(token.attrGet?.("start"), 10);
        if (Number.isInteger(start) && start > 1) node.start = start;
      }
      if (token.type === "th_open") node.scope = "col";
      open(node);
      continue;
    }
    if (SIMPLE_CLOSES.has(token.type)) {
      close();
      continue;
    }
    if (token.type === "heading_open") {
      const sourceLevel = Number.parseInt(token.tag?.slice(1), 10);
      const level = Math.min(6, environment.hostHeadingLevel + (Number.isInteger(sourceLevel) ? sourceLevel : 1));
      const inline = tokens[index + 1];
      const base = slugify(inline?.content) || `heading-${index + 1}`;
      const count = (environment.headingCounts.get(base) ?? 0) + 1;
      environment.headingCounts.set(base, count);
      const slug = count === 1 ? base : `${base}-${count}`;
      const heading = createElement(environment.document, `h${level}`);
      heading.id = `${environment.panelPrefix}-${slug}`;
      open(heading);
      continue;
    }
    if (token.type === "heading_close") {
      close();
      continue;
    }
    if (token.type === "inline") {
      renderInlineTokens(token.children ?? [], current(), environment);
      continue;
    }
    if (token.type === "table_open") {
      const wrapper = createElement(environment.document, "div", "portable-qmd-table-scroll");
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", `Table: ${tableHeaderText(tokens, index) || "formatted content"}; horizontal scrolling`);
      wrapper.tabIndex = 0;
      open(wrapper);
      open(createElement(environment.document, "table"));
      continue;
    }
    if (token.type === "table_close") {
      close();
      close();
      continue;
    }
    if (token.type === "fence" || token.type === "code_block") {
      current().append(renderCodeBlock(token, environment));
      continue;
    }
    if (token.type === "callout_open") {
      const kind = token.meta?.kind ?? "note";
      environment.calloutSequence += 1;
      const labelId = `${environment.panelPrefix}-callout-${environment.calloutSequence}`;
      const aside = createElement(environment.document, "aside", `portable-qmd-callout portable-qmd-callout--${kind}`);
      aside.dataset.calloutType = kind;
      aside.setAttribute("role", "note");
      aside.setAttribute("aria-labelledby", labelId);
      const label = createElement(environment.document, "p", "portable-qmd-callout-label");
      label.id = labelId;
      const strong = createElement(environment.document, "strong");
      strong.textContent = capitalize(kind);
      label.append(strong);
      aside.append(label);
      open(aside);
      continue;
    }
    if (token.type === "callout_close") {
      close();
      continue;
    }
    if (token.type === "math_block") {
      current().append(renderMath(token.content, true, environment));
      continue;
    }
    if (token.type === "hr") {
      current().append(createElement(environment.document, "hr"));
      continue;
    }
    if (token.content || token.markup) {
      current().append(environment.document.createTextNode(token.content || token.markup));
    }
  }
}

function renderInlineTokens(tokens, root, environment) {
  const parents = [root];
  const linkFrames = [];
  const current = () => parents[parents.length - 1];
  const open = (node) => {
    current().append(node);
    parents.push(node);
  };
  const close = () => {
    if (parents.length > 1) parents.pop();
  };

  for (const token of tokens) {
    if (token.type === "text") {
      appendTextToken(token.content, current(), environment);
    } else if (token.type === "softbreak") {
      current().append(environment.document.createTextNode("\n"));
    } else if (token.type === "hardbreak") {
      current().append(createElement(environment.document, "br"));
    } else if (token.type === "code_inline") {
      const code = createElement(environment.document, "code");
      code.textContent = token.content;
      current().append(code);
    } else if (token.type === "strong_open" || token.type === "em_open" || token.type === "s_open") {
      open(createElement(environment.document, token.type.replace("_open", "").replace("strong", "strong")));
    } else if (token.type === "strong_close" || token.type === "em_close" || token.type === "s_close") {
      close();
    } else if (token.type === "link_open") {
      const rawHref = String(token.attrGet?.("href") ?? "");
      const href = validatePortableHref(rawHref);
      const link = href
        ? createElement(environment.document, "a")
        : createElement(environment.document, "span", "portable-qmd-inert-link");
      if (href?.startsWith("#")) {
        link.href = `#${environment.panelPrefix}-${slugify(href.slice(1))}`;
      } else if (href) {
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      open(link);
      linkFrames.push({ href, rawHref });
    } else if (token.type === "link_close") {
      const frame = linkFrames.pop() ?? {};
      if (frame.href && !frame.href.startsWith("#")) appendExternalIndicator(current(), environment);
      if (!frame.href && frame.rawHref) current().append(environment.document.createTextNode(` (${frame.rawHref})`));
      close();
    } else if (token.type === "image") {
      const mediaNode = environment.mediaNodes[token.meta?.portableMediaNodeIndex];
      const mediaItem = valueForId(environment.mediaItems, mediaNode?.mediaId);
      if (mediaNode && isLocalMediaItem(mediaItem)) current().append(renderMediaHost(mediaNode, mediaItem, environment));
      else current().append(renderInertImage(token, mediaNode, environment));
    } else if (token.type === "math_inline") {
      current().append(renderMath(token.content, false, environment));
    } else if (token.type === "footnote_ref") {
      current().append(renderFootnoteReference(token.meta?.id, environment));
    } else if (token.type === "html_inline") {
      current().append(environment.document.createTextNode(token.content));
    } else if (token.content || token.markup) {
      current().append(environment.document.createTextNode(token.content || token.markup));
    }
  }
}

function renderMediaHost(mediaNode, mediaItem, environment) {
  const host = createElement(environment.document, "span", "qmd-media-host");
  const ordinal = environment.mediaNodes.indexOf(mediaNode) + 1;
  host.dataset.qmdMediaHost = "";
  host.dataset.qmdMediaKey = `${mediaNode.mediaId}:${ordinal}`;
  host.dataset.qmdMediaId = mediaNode.mediaId;
  host.dataset.qmdMediaAlt = mediaNode.alt;
  host.dataset.qmdMediaWidth = mediaNode.attributes.width;
  host.dataset.qmdMediaAlign = mediaNode.attributes.align;
  host.dataset.qmdMediaFlow = mediaNode.attributes.flow;
  host.dataset.qmdMediaFrame = mediaNode.attributes.frame;
  host.dataset.qmdMediaCaption = mediaNode.attributes.caption;
  host.dataset.qmdMediaDecorative = String(mediaNode.attributes.decorative);
  host.dataset.qmdMediaHealth = mediaItem.health;
  return host;
}

function renderInertImage(token, mediaNode, environment) {
  const source = String(token.attrGet?.("src") ?? "");
  const title = token.attrGet?.("title");
  const suffix = title ? ` "${title}"` : "";
  const inert = createElement(environment.document, "span", "portable-qmd-inert-embed");
  inert.textContent = mediaNode?.sourceText ?? `![${token.content ?? ""}](${source}${suffix})`;
  return inert;
}

function isLocalMediaItem(mediaItem) {
  return mediaItem?.current?.kind === "asset" || mediaItem?.current?.kind === "package";
}

function valueForId(collection, id) {
  if (collection instanceof Map) return collection.get(id);
  if (Array.isArray(collection)) return collection.find((entry) => entry?.mediaId === id);
  return collection?.[id];
}

function renderCodeBlock(token, environment) {
  const info = String(token.info ?? "").trim();
  const language = /^[a-z][a-z0-9_+-]{0,31}$/i.test(info) ? info : "";
  const region = createElement(environment.document, "div", "portable-qmd-code-scroll");
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", `${language ? `${language} code block` : "Code block"}; horizontal scrolling`);
  region.tabIndex = 0;
  if (info && !language) {
    const label = createElement(environment.document, "p", "portable-qmd-fence-info");
    const strong = createElement(environment.document, "strong");
    strong.textContent = "Fence info: ";
    label.append(strong, environment.document.createTextNode(info));
    region.append(label);
  }
  const pre = createElement(environment.document, "pre");
  const code = createElement(environment.document, "code");
  if (language) code.dataset.language = language;
  code.textContent = String(token.content ?? "").replace(/\n$/, "");
  pre.append(code);
  region.append(pre);
  return region;
}

function renderMath(content, displayMode, environment) {
  if (!isPortableQmdMathAllowed(content)) {
    const fallback = createElement(environment.document, displayMode ? "pre" : "code", "portable-qmd-math-fallback");
    fallback.textContent = displayMode ? `$$\n${content}\n$$` : `$${content}$`;
    return fallback;
  }
  const wrapper = createElement(
    environment.document,
    displayMode ? "div" : "span",
    `portable-qmd-math${displayMode ? " portable-qmd-math--display" : ""}`,
  );
  wrapper.dataset.portableQmdGenerated = "math";
  wrapper.setAttribute("role", "math");
  wrapper.setAttribute("aria-label", content.replace(/\s+/g, " ").trim());
  katex.render(content, wrapper, { ...PORTABLE_QMD_MATH_OPTIONS, displayMode });
  return wrapper;
}

function renderFootnoteReference(id, environment) {
  const number = environment.footnoteNumbers.get(id);
  if (!number) return environment.document.createTextNode(`[^${String(id ?? "")}]`);
  const occurrence = (environment.footnoteReferenceCounts.get(id) ?? 0) + 1;
  environment.footnoteReferenceCounts.set(id, occurrence);
  const sup = createElement(environment.document, "sup", "portable-qmd-footnote-ref");
  const link = createElement(environment.document, "a");
  link.id = footnoteReferenceId(environment.panelPrefix, id, occurrence);
  link.href = `#${environment.panelPrefix}-footnote-${slugify(id)}`;
  link.setAttribute("aria-label", `Footnote ${number}, reference ${occurrence}`);
  link.textContent = String(number);
  sup.append(link);
  return sup;
}

function renderFootnotes(footnotes, root, environment) {
  if (footnotes.length === 0) return;
  const contents = footnotes.map((footnote) => {
    const fragment = environment.document.createDocumentFragment();
    renderTokens(footnote.tokens ?? [], fragment, environment);
    return fragment;
  });
  const section = createElement(environment.document, "section", "portable-qmd-footnotes");
  section.setAttribute("aria-label", "Footnotes");
  section.append(createElement(environment.document, "hr"));
  const list = createElement(environment.document, "ol");
  footnotes.forEach((footnote, index) => {
    const item = createElement(environment.document, "li");
    item.id = `${environment.panelPrefix}-footnote-${slugify(footnote.id)}`;
    item.append(contents[index]);
    const referenceCount = environment.footnoteReferenceCounts.get(footnote.id) ?? 0;
    for (let occurrence = 1; occurrence <= referenceCount; occurrence += 1) {
      const backlink = createElement(environment.document, "a", "portable-qmd-footnote-backlink");
      backlink.href = `#${footnoteReferenceId(environment.panelPrefix, footnote.id, occurrence)}`;
      backlink.setAttribute("aria-label", `Back to footnote ${index + 1}, reference ${occurrence}`);
      backlink.textContent = "↩";
      item.append(backlink);
    }
    list.append(item);
  });
  section.append(list);
  root.append(section);
}

function appendTextToken(content, parent, environment) {
  const task = /^\[([ xX])\]\s+/.exec(content);
  if (!task) {
    parent.append(environment.document.createTextNode(content));
    return;
  }
  const completed = task[1].toLowerCase() === "x";
  const marker = createElement(environment.document, "span", "portable-qmd-task-marker");
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = completed ? "☒" : "☐";
  const label = createElement(environment.document, "span", "portable-qmd-visually-hidden");
  label.textContent = completed ? "Completed task: " : "Task: ";
  parent.append(marker, label, environment.document.createTextNode(content.slice(task[0].length)));
}

function appendExternalIndicator(link, environment) {
  const indicator = createElement(environment.document, "span", "portable-qmd-external-indicator");
  indicator.setAttribute("aria-hidden", "true");
  indicator.textContent = " ↗";
  const label = createElement(environment.document, "span", "portable-qmd-visually-hidden");
  label.textContent = " (opens in a new tab)";
  link.append(indicator, label);
}

function tableHeaderText(tokens, tableIndex) {
  const values = [];
  for (let index = tableIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index].type === "table_close" || tokens[index].type === "tbody_open") break;
    if (tokens[index].type === "inline") values.push(tokens[index].content);
  }
  return values.join(", ").slice(0, 120);
}

function footnoteReferenceId(panelPrefix, id, occurrence) {
  return `${panelPrefix}-footnote-ref-${slugify(id)}-${occurrence}`;
}

function resolveDocument(options) {
  const document = options.document ?? options.window?.document ?? globalThis.document;
  if (!document?.createDocumentFragment || !document?.createElement || !document?.createTextNode) {
    throw new TypeError("A browser Document is required to render portable QMD safely.");
  }
  return document;
}

function createElement(document, tagName, className = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
}

function normalizeHostHeadingLevel(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : 2;
}

function normalizePanelId(value) {
  const normalized = String(value ?? "static-text")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "static-text";
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function capitalize(value) {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}
