import katex from "katex";
import MarkdownIt from "markdown-it";

import {
  PORTABLE_QMD_MATH_OPTIONS,
  validatePortableHref,
} from "./portableQmdPolicy.js";

const renderer = new MarkdownIt({ html: false, linkify: false, typographer: false });

export function renderPortableQmd(ast, options = {}) {
  if (!ast || ast.type !== "root" || !Array.isArray(ast.tokens)) {
    throw new TypeError("A validated portable QMD AST is required.");
  }
  const panelPrefix = normalizePanelId(options.panelId);
  const hostHeadingLevel = normalizeHostHeadingLevel(options.hostHeadingLevel);
  const headingCounts = new Map();
  const footnoteNumbers = new Map((ast.footnotes ?? []).map((footnote, index) => [footnote.id, index + 1]));
  const environment = {
    panelPrefix,
    hostHeadingLevel,
    headingCounts,
    footnoteNumbers,
    footnoteReferenceCounts: new Map(),
    calloutSequence: 0,
  };
  configureRules(renderer, environment);
  const body = renderer.renderer.render(ast.tokens, renderer.options, environment);
  const footnotes = renderFootnotes(ast.footnotes ?? [], environment);
  return `${body}${footnotes}`;
}

function configureRules(md, environment) {
  const rules = md.renderer.rules;
  rules.heading_open = (tokens, index) => {
    const sourceLevel = Number.parseInt(tokens[index].tag.slice(1), 10);
    const level = Math.min(6, environment.hostHeadingLevel + sourceLevel);
    const inline = tokens[index + 1];
    const base = slugify(inline?.content) || `heading-${index + 1}`;
    const count = (environment.headingCounts.get(base) ?? 0) + 1;
    environment.headingCounts.set(base, count);
    const slug = count === 1 ? base : `${base}-${count}`;
    return `<h${level} id="${attribute(`${environment.panelPrefix}-${slug}`)}">`;
  };
  rules.heading_close = (tokens, index) => {
    const sourceLevel = Number.parseInt(tokens[index].tag.slice(1), 10);
    const level = Math.min(6, environment.hostHeadingLevel + sourceLevel);
    return `</h${level}>\n`;
  };
  rules.link_open = (tokens, index) => {
    const href = validatePortableHref(tokens[index].attrGet("href"));
    if (!href) return "<span>";
    if (href.startsWith("#")) {
      return `<a href="#${attribute(environment.panelPrefix)}-${attribute(slugify(href.slice(1)))}">`;
    }
    return `<a href="${attribute(href)}" target="_blank" rel="noopener noreferrer">`;
  };
  rules.link_close = (tokens, index) => {
    const open = findOpeningLink(tokens, index);
    const href = open ? validatePortableHref(open.attrGet("href")) : null;
    return href?.startsWith("#")
      ? "</a>"
      : '<span class="portable-qmd-external-indicator" aria-hidden="true"> ↗</span><span class="portable-qmd-visually-hidden"> (opens in a new tab)</span></a>';
  };
  rules.table_open = (tokens, index) => {
    const header = tableHeaderText(tokens, index);
    return `<div class="portable-qmd-table-scroll" role="region" aria-label="${attribute(`Table: ${header || "formatted content"}; horizontal scrolling`)}" tabindex="0"><table>`;
  };
  rules.table_close = () => "</table></div>\n";
  rules.th_open = () => '<th scope="col">';
  rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = String(token.info ?? "").trim();
    const label = language ? `${language} code block` : "Code block";
    return `<div class="portable-qmd-code-scroll" role="region" aria-label="${attribute(`${label}; horizontal scrolling`)}" tabindex="0"><pre><code${language ? ` data-language="${attribute(language)}"` : ""}>${escapeHtml(token.content.replace(/\n$/, ""))}</code></pre></div>\n`;
  };
  rules.callout_open = (tokens, index) => {
    const kind = tokens[index].meta.kind;
    environment.calloutSequence += 1;
    const labelId = `${environment.panelPrefix}-callout-${environment.calloutSequence}`;
    return `<aside class="portable-qmd-callout portable-qmd-callout--${attribute(kind)}" data-callout-type="${attribute(kind)}" role="note" aria-labelledby="${attribute(labelId)}"><p class="portable-qmd-callout-label" id="${attribute(labelId)}"><strong>${escapeHtml(capitalize(kind))}</strong></p>`;
  };
  rules.callout_close = () => "</aside>\n";
  rules.math_inline = (tokens, index) => renderMath(tokens[index].content, false);
  rules.math_block = (tokens, index) => `${renderMath(tokens[index].content, true)}\n`;
  rules.footnote_ref = (tokens, index) => {
    const id = tokens[index].meta.id;
    const number = environment.footnoteNumbers.get(id) ?? "?";
    const occurrence = (environment.footnoteReferenceCounts.get(id) ?? 0) + 1;
    environment.footnoteReferenceCounts.set(id, occurrence);
    const referenceId = footnoteReferenceId(environment.panelPrefix, id, occurrence);
    const noteId = `${environment.panelPrefix}-footnote-${slugify(id)}`;
    return `<sup class="portable-qmd-footnote-ref"><a id="${attribute(referenceId)}" href="#${attribute(noteId)}" aria-label="Footnote ${number}, reference ${occurrence}">${number}</a></sup>`;
  };
  rules.text = (tokens, index) => {
    const content = tokens[index].content;
    const task = /^\[([ xX])\]\s+/.exec(content);
    if (!task) return escapeHtml(content);
    const completed = task[1].toLowerCase() === "x";
    return `<span class="portable-qmd-task-marker" aria-hidden="true">${completed ? "☒" : "☐"}</span><span class="portable-qmd-visually-hidden">${completed ? "Completed task: " : "Task: "}</span>${escapeHtml(content.slice(task[0].length))}`;
  };
}

function renderFootnotes(footnotes, environment) {
  if (footnotes.length === 0) return "";
  const contents = footnotes.map((footnote) => renderer.renderer.render(footnote.tokens, renderer.options, environment));
  const items = footnotes.map((footnote, index) => {
    const noteId = `${environment.panelPrefix}-footnote-${slugify(footnote.id)}`;
    const referenceCount = environment.footnoteReferenceCounts.get(footnote.id) ?? 0;
    const backlinks = Array.from({ length: referenceCount }, (_, occurrenceIndex) => {
      const occurrence = occurrenceIndex + 1;
      const referenceId = footnoteReferenceId(environment.panelPrefix, footnote.id, occurrence);
      return `<a class="portable-qmd-footnote-backlink" href="#${attribute(referenceId)}" aria-label="Back to footnote ${index + 1}, reference ${occurrence}">↩</a>`;
    }).join("");
    return `<li id="${attribute(noteId)}">${contents[index]}${backlinks}</li>`;
  }).join("");
  return `<section class="portable-qmd-footnotes" aria-label="Footnotes"><hr><ol>${items}</ol></section>`;
}

function footnoteReferenceId(panelPrefix, id, occurrence) {
  return `${panelPrefix}-footnote-ref-${slugify(id)}-${occurrence}`;
}

function renderMath(content, displayMode) {
  const html = katex.renderToString(content, {
    ...PORTABLE_QMD_MATH_OPTIONS,
    displayMode,
  });
  const label = content.replace(/\s+/g, " ").trim();
  return `<span class="portable-qmd-math${displayMode ? " portable-qmd-math--display" : ""}" data-portable-qmd-generated="math" role="math" aria-label="${attribute(label)}">${html}</span>`;
}

function tableHeaderText(tokens, tableIndex) {
  const values = [];
  for (let index = tableIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index].type === "table_close" || tokens[index].type === "tbody_open") break;
    if (tokens[index].type === "inline") values.push(tokens[index].content);
  }
  return values.join(", ").slice(0, 120);
}

function findOpeningLink(tokens, closeIndex) {
  let depth = 0;
  for (let index = closeIndex - 1; index >= 0; index -= 1) {
    if (tokens[index].type === "link_close") depth += 1;
    if (tokens[index].type === "link_open") {
      if (depth === 0) return tokens[index];
      depth -= 1;
    }
  }
  return null;
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

function escapeHtml(value) {
  return renderer.utils.escapeHtml(String(value ?? ""));
}

function attribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function capitalize(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
