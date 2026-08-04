import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { listChartSchemas } from "../src/charting/schemas/chartSchemaRegistry.js";
import {
  ATLAS_SURFACES,
  CHART_TYPE_GLYPHS,
  ICON_LANGUAGE_VERSION,
  ICON_STATES,
  ICON_TOKENS,
  INTERACTIONS,
  validateIconCatalog,
} from "../src/iconography/iconCatalog.js";
import { ICON_GLYPHS, getIconGlyph } from "../src/iconography/iconGlyphs.js";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const outputFiles = Object.freeze({
  atlas: path.join(projectRoot, "docs", "icon-language-atlas.html"),
  specification: path.join(
    projectRoot,
    "docs",
    "icon-and-interaction-specification.md",
  ),
});

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const stripTrailingWhitespace = (value) => value.replace(/[ \t]+$/gm, "");

const markdownCell = (value) => String(value ?? "—")
  .replaceAll("\\", "\\\\")
  .replaceAll("|", "\\|")
  .replace(/\r?\n/g, "<br>")
  .trim() || "—";

const resolvedGlyphId = (glyphId) => (
  Object.hasOwn(ICON_GLYPHS, glyphId) ? glyphId : "unknown"
);

const iconSvg = (glyphId, className = "") => {
  const resolvedId = resolvedGlyphId(glyphId);
  return `<svg class="simex-glyph ${escapeHtml(className)}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon-id="${escapeHtml(resolvedId)}">${getIconGlyph(resolvedId)}</svg>`;
};

const badge = (value, kind = "") => (
  `<span class="badge ${escapeHtml(kind)}">${escapeHtml(value)}</span>`
);

const interactionPreview = (interaction) => {
  const classes = [
    "icon-button",
    interaction.tone === "danger" ? "tone-danger" : "",
    interaction.status === "planned" ? "is-planned" : "",
  ].filter(Boolean).join(" ");
  const button = `<button class="${classes}" type="button" aria-label="${escapeHtml(interaction.label)}" data-tooltip="${escapeHtml(interaction.tooltip)}">${iconSvg(interaction.glyphId)}</button>`;

  if (interaction.renderMode === "text") {
    return `<div class="reference-value" data-tooltip="${escapeHtml(interaction.tooltip)}" tabindex="0">${iconSvg(interaction.glyphId, "reference-glyph")}<span>${escapeHtml(interaction.label)}</span></div>`;
  }
  return button;
};

const interactionCard = (interaction) => {
  const searchText = [
    interaction.id,
    interaction.glyphId,
    interaction.label,
    interaction.tooltip,
    interaction.renderMode,
    interaction.tone,
    interaction.status,
    interaction.confirmation,
    interaction.note,
  ].join(" ").toLowerCase();

  return `
          <article class="reference-card filter-card" data-search="${escapeHtml(searchText)}">
            <div class="card-preview ${interaction.tone === "danger" ? "danger-preview" : ""}">
              ${interactionPreview(interaction)}
            </div>
            <div class="card-copy">
              <h3>${escapeHtml(interaction.label)}</h3>
              <code>${escapeHtml(interaction.id)}</code>
              <div class="badges">
                ${badge(interaction.status, `status-${interaction.status}`)}
                ${badge(interaction.renderMode)}
                ${badge(interaction.tone, interaction.tone === "danger" ? "danger-badge" : "")}
                ${badge(
                  interaction.confirmation === "required"
                    ? "confirmation required"
                    : "no confirmation",
                  interaction.confirmation === "required" ? "confirmation-badge" : "",
                )}
              </div>
              <dl>
                <div><dt>Glyph</dt><dd><code>${escapeHtml(interaction.glyphId)}</code></dd></div>
                <div><dt>Tooltip</dt><dd>${escapeHtml(interaction.tooltip)}</dd></div>
                ${interaction.note ? `<div><dt>Note</dt><dd>${escapeHtml(interaction.note)}</dd></div>` : ""}
              </dl>
            </div>
          </article>`;
};

const chartSchemasById = new Map(
  listChartSchemas().map((schema) => [schema.typeId, schema]),
);

const chartCard = (typeId) => {
  const schema = chartSchemasById.get(typeId);
  const glyphId = CHART_TYPE_GLYPHS[typeId];
  const label = schema?.label ?? typeId;
  const group = schema?.group ?? "unclassified";
  const description = schema?.description ?? "";
  const searchText = [typeId, glyphId, label, group, description]
    .join(" ")
    .toLowerCase();

  return `
          <article class="reference-card chart-card filter-card" data-search="${escapeHtml(searchText)}">
            <div class="card-preview">
              <button class="icon-button chart-pictogram" type="button" aria-label="${escapeHtml(label)}" data-tooltip="${escapeHtml(label)}">
                ${iconSvg(glyphId)}
              </button>
            </div>
            <div class="card-copy">
              <h3>${escapeHtml(label)}</h3>
              <code>${escapeHtml(typeId)}</code>
              <div class="badges">${badge(group)}${badge(glyphId)}</div>
              ${description ? `<p>${escapeHtml(description)}</p>` : ""}
            </div>
          </article>`;
};

const surfaceSection = (surface) => {
  const isCharts = Array.isArray(surface.chartTypeIds);
  const cards = isCharts
    ? surface.chartTypeIds.map(chartCard)
    : (surface.interactionIds ?? [])
      .map((interactionId) => INTERACTIONS[interactionId])
      .filter(Boolean)
      .map(interactionCard);

  const itemLabel = isCharts
    ? `${cards.length} chart pictograms`
    : `${cards.length} control references`;

  return `
      <section class="atlas-section" id="atlas-${escapeHtml(surface.id)}" data-surface-section>
        <div class="section-heading">
          <div>
            <p class="eyebrow">Surface</p>
            <h2>${escapeHtml(surface.title)}</h2>
          </div>
          <span class="section-count">${itemLabel}</span>
        </div>
        <div class="card-grid">
${cards.join("\n")}
        </div>
        <p class="empty-section" hidden>No matching entries on this surface.</p>
      </section>`;
};

const stateCard = (state) => {
  const classMap = {
    default: "",
    hover: "is-state-hover",
    active: "is-state-active",
    selected: "is-state-selected",
    disabled: "is-state-disabled",
    busy: "is-state-busy",
    danger: "tone-danger",
  };
  const disabled = state === "disabled" ? " disabled" : "";
  return `
          <article class="state-card">
            <div class="state-preview">
              <button class="icon-button ${classMap[state] ?? ""}" type="button" aria-label="${escapeHtml(`${state} state`)}" data-tooltip="${escapeHtml(`${state} state`)}"${disabled}>
                ${iconSvg("playback")}
              </button>
            </div>
            <strong>${escapeHtml(state)}</strong>
          </article>`;
};

const glyphCard = ([glyphId]) => `
          <article class="glyph-card filter-card" data-search="${escapeHtml(glyphId.toLowerCase())}">
            <button class="icon-button glyph-library-preview" type="button" aria-label="${escapeHtml(glyphId)}" data-tooltip="${escapeHtml(glyphId)}">
              ${iconSvg(glyphId)}
            </button>
            <code>${escapeHtml(glyphId)}</code>
          </article>`;

const tokenSwatches = () => [
  ["base", ICON_TOKENS.base, "Base icon on light surfaces"],
  ["accentBase", ICON_TOKENS.accentBase, "Primary accent"],
  ["accentOnLight", ICON_TOKENS.accentOnLight, "Accent on light"],
  ["accentOnDark", ICON_TOKENS.accentOnDark, "Accent on dark"],
  ["danger", ICON_TOKENS.danger, "Destructive base"],
  ["success", ICON_TOKENS.success, "Selected state"],
].map(([token, value, label]) => `
          <article class="token-card">
            <span class="token-swatch" style="--swatch:${escapeHtml(value)}"></span>
            <div>
              <strong>${escapeHtml(label)}</strong>
              <code>${escapeHtml(token)}</code>
              <span data-token-value="${escapeHtml(token)}">${escapeHtml(value)}</span>
            </div>
          </article>`).join("\n");

const navigationLinks = () => ATLAS_SURFACES
  .map((surface) => `<a href="#atlas-${escapeHtml(surface.id)}">${escapeHtml(surface.title)}</a>`)
  .join("\n          ");

const surfaceReferenceCount = () => ATLAS_SURFACES.reduce(
  (total, surface) => total + (surface.interactionIds?.length ?? 0),
  0,
);

export function renderIconAtlas() {
  const catalogueErrors = validateIconCatalog();
  if (catalogueErrors.length > 0) {
    throw new Error(`Cannot generate icon references:\n${catalogueErrors.join("\n")}`);
  }

  const surfaces = ATLAS_SURFACES.map(surfaceSection).join("\n");
  const states = ICON_STATES.map(stateCard).join("\n");
  const glyphs = Object.entries(ICON_GLYPHS).map(glyphCard).join("\n");

  return stripTrailingWhitespace(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SimEx Icon Language Atlas ${escapeHtml(ICON_LANGUAGE_VERSION)}</title>
  <style>
    :root {
      color-scheme: light;
      --accent-base: ${ICON_TOKENS.accentBase};
      --accent-on-light: ${ICON_TOKENS.accentOnLight};
      --accent-on-dark: ${ICON_TOKENS.accentOnDark};
      --danger: ${ICON_TOKENS.danger};
      --selected: ${ICON_TOKENS.success};
      --ink: #0b1f3a;
      --muted: #5c6f89;
      --line: #d8e1ec;
      --panel: #ffffff;
      --canvas: #eef3f8;
      --dark: #08224a;
      --shadow: 0 18px 45px rgba(11, 31, 58, 0.09);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 6%, color-mix(in srgb, var(--accent-base) 12%, transparent), transparent 26rem),
        var(--canvas);
    }
    button, input { font: inherit; }
    a { color: inherit; }
    code {
      font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
      font-size: 0.78rem;
      overflow-wrap: anywhere;
    }
    .page-header {
      padding: 3rem clamp(1.25rem, 4vw, 4rem) 2.5rem;
      color: #f8fbff;
      background: linear-gradient(135deg, #071b3a, #0c2d5e 65%, #10406b);
      border-bottom: 4px solid var(--accent-base);
    }
    .header-inner { max-width: 1480px; margin: 0 auto; }
    .eyebrow {
      margin: 0 0 0.45rem;
      color: var(--accent-on-dark);
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 850px;
      margin: 0;
      font-size: clamp(2rem, 4vw, 4.3rem);
      line-height: 1;
      letter-spacing: -0.04em;
    }
    .lede {
      max-width: 820px;
      margin: 1.15rem 0 0;
      color: #c9d7ea;
      font-size: 1rem;
      line-height: 1.65;
    }
    .authority-note {
      max-width: 820px;
      margin-top: 1rem;
      padding: 0.8rem 1rem;
      border: 1px solid rgba(50, 222, 209, 0.34);
      border-radius: 0.85rem;
      background: rgba(8, 34, 74, 0.72);
      color: #edf9fa;
      font-size: 0.9rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.8rem;
      max-width: 760px;
      margin-top: 1.6rem;
    }
    .stat {
      padding: 0.85rem 1rem;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 0.85rem;
      background: rgba(255,255,255,0.06);
    }
    .stat strong { display: block; font-size: 1.45rem; }
    .stat span { color: #b9c9de; font-size: 0.78rem; }
    .toolbar {
      position: sticky;
      z-index: 20;
      top: 0;
      display: grid;
      grid-template-columns: minmax(16rem, 1fr) auto;
      gap: 1rem;
      padding: 0.85rem clamp(1.25rem, 4vw, 4rem);
      background: rgba(238, 243, 248, 0.94);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
    }
    .toolbar-inner {
      display: contents;
    }
    .search-wrap { position: relative; max-width: 780px; }
    .search-wrap input,
    .accent-text {
      width: 100%;
      min-height: 2.7rem;
      border: 1px solid #b9c8d9;
      border-radius: 0.8rem;
      padding: 0.65rem 0.85rem;
      color: var(--ink);
      background: #fff;
    }
    .accent-controls {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    .accent-controls label { font-size: 0.82rem; font-weight: 750; }
    .accent-picker {
      width: 2.7rem;
      height: 2.7rem;
      padding: 0.2rem;
      border: 1px solid #b9c8d9;
      border-radius: 0.75rem;
      background: #fff;
      cursor: pointer;
    }
    .accent-text { width: 7.2rem; font-family: monospace; text-transform: uppercase; }
    .tool-button {
      min-height: 2.7rem;
      border: 1px solid #b9c8d9;
      border-radius: 0.75rem;
      padding: 0.55rem 0.8rem;
      color: var(--ink);
      background: #fff;
      font-weight: 750;
      cursor: pointer;
    }
    .tool-button:hover { border-color: var(--accent-on-light); }
    .layout {
      display: grid;
      grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr);
      gap: 1.5rem;
      width: min(1600px, 100%);
      margin: 0 auto;
      padding: 1.5rem clamp(1.25rem, 4vw, 4rem) 5rem;
    }
    .surface-nav {
      position: sticky;
      top: 5rem;
      align-self: start;
      max-height: calc(100vh - 6rem);
      overflow: auto;
      padding: 1rem;
      border: 1px solid var(--line);
      border-radius: 1rem;
      background: rgba(255,255,255,0.86);
      box-shadow: var(--shadow);
    }
    .surface-nav strong {
      display: block;
      margin-bottom: 0.6rem;
      font-size: 0.77rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .surface-nav a {
      display: block;
      padding: 0.45rem 0.55rem;
      border-radius: 0.55rem;
      color: #334b68;
      font-size: 0.84rem;
      text-decoration: none;
    }
    .surface-nav a:hover, .surface-nav a:focus-visible {
      color: var(--ink);
      background: color-mix(in srgb, var(--accent-base) 18%, white);
      outline: none;
    }
    main { min-width: 0; }
    .atlas-section {
      scroll-margin-top: 6rem;
      margin-bottom: 1.5rem;
      padding: clamp(1rem, 2vw, 1.6rem);
      border: 1px solid var(--line);
      border-radius: 1.15rem;
      background: rgba(255,255,255,0.88);
      box-shadow: var(--shadow);
    }
    .section-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .section-heading .eyebrow { color: var(--accent-on-light); }
    h2 { margin: 0; font-size: clamp(1.35rem, 2vw, 2rem); letter-spacing: -0.025em; }
    .section-count { color: var(--muted); font-size: 0.78rem; }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16.5rem, 1fr));
      gap: 0.85rem;
    }
    .reference-card {
      min-width: 0;
      overflow: visible;
      border: 1px solid var(--line);
      border-radius: 0.95rem;
      background: var(--panel);
    }
    .card-preview {
      display: grid;
      min-height: 8.5rem;
      place-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--line);
      border-radius: 0.9rem 0.9rem 0 0;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.95), rgba(238,243,248,0.72)),
        repeating-linear-gradient(45deg, transparent, transparent 9px, rgba(11,31,58,0.02) 9px, rgba(11,31,58,0.02) 10px);
    }
    .danger-preview { background: color-mix(in srgb, var(--danger) 5%, white); }
    .card-copy { padding: 0.9rem 1rem 1rem; }
    .card-copy h3 { margin: 0 0 0.3rem; font-size: 1rem; }
    .card-copy > code { display: block; color: var(--muted); }
    .card-copy p { margin: 0.7rem 0 0; color: var(--muted); font-size: 0.84rem; line-height: 1.5; }
    .badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.75rem; }
    .badge {
      padding: 0.22rem 0.48rem;
      border: 1px solid #c8d4e2;
      border-radius: 999px;
      color: #455c78;
      background: #f4f7fb;
      font-size: 0.67rem;
      font-weight: 750;
      letter-spacing: 0.02em;
    }
    .status-live { color: #11624c; background: #e5f7f1; border-color: #b4dfd2; }
    .status-planned { color: #75520a; background: #fff5d8; border-color: #ead18b; }
    .status-reference { color: #42516a; background: #eef1f6; border-color: #ccd4df; }
    .danger-badge, .confirmation-badge { color: #8c2929; background: #fff0f0; border-color: #efbcbc; }
    dl { display: grid; gap: 0.38rem; margin: 0.8rem 0 0; }
    dl div { display: grid; grid-template-columns: 4.2rem minmax(0, 1fr); gap: 0.5rem; font-size: 0.77rem; }
    dt { color: var(--muted); }
    dd { margin: 0; overflow-wrap: anywhere; }
    .simex-glyph {
      width: 2.15rem;
      height: 2.15rem;
      overflow: visible;
      color: var(--icon-base, var(--ink));
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      vector-effect: non-scaling-stroke;
    }
    .simex-glyph text {
      fill: currentColor;
      stroke: none;
      font-family: inherit;
      font-weight: 800;
    }
    .simex-glyph .accent-fill { fill: var(--icon-accent, var(--accent-on-light)); stroke: none; }
    .simex-glyph .accent-stroke { stroke: var(--icon-accent, var(--accent-on-light)); }
    .icon-button,
    .reference-value {
      --icon-base: var(--ink);
      --icon-accent: var(--accent-on-light);
      position: relative;
      display: inline-grid;
      place-items: center;
      min-width: 3.25rem;
      min-height: 3.25rem;
      border: 1px solid #c6d2e0;
      border-radius: 0.95rem;
      color: var(--ink);
      background: #fff;
    }
    .icon-button {
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .icon-button:hover,
    .icon-button.is-state-hover {
      border-color: var(--accent-on-light);
      background: color-mix(in srgb, var(--accent-base) 9%, white);
      transform: translateY(-1px);
      box-shadow: 0 7px 18px rgba(11,31,58,0.12);
    }
    .icon-button:active,
    .icon-button.is-state-active {
      transform: translateY(1px) scale(0.97);
      background: color-mix(in srgb, var(--accent-base) 16%, white);
    }
    .icon-button:focus-visible,
    .reference-value:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--accent-base) 42%, white);
      outline-offset: 3px;
    }
    .icon-button.is-state-selected {
      --icon-base: var(--selected);
      border-color: var(--selected);
      background: color-mix(in srgb, var(--selected) 10%, white);
    }
    .icon-button:disabled,
    .icon-button.is-state-disabled {
      opacity: 0.38;
      cursor: not-allowed;
      filter: grayscale(0.7);
      transform: none;
      box-shadow: none;
    }
    .icon-button.is-state-busy .simex-glyph { animation: icon-busy 900ms linear infinite; }
    .icon-button.tone-danger {
      --icon-base: var(--danger);
      --icon-accent: var(--accent-on-light);
      border-color: color-mix(in srgb, var(--danger) 45%, white);
      background: color-mix(in srgb, var(--danger) 6%, white);
    }
    .icon-button.is-planned { border-style: dashed; }
    .icon-button::after,
    .reference-value::after {
      content: attr(data-tooltip);
      position: absolute;
      z-index: 40;
      left: 50%;
      bottom: calc(100% + 0.55rem);
      width: max-content;
      max-width: 15rem;
      padding: 0.42rem 0.58rem;
      border-radius: 0.5rem;
      color: white;
      background: #071b3a;
      box-shadow: 0 8px 24px rgba(7,27,58,0.24);
      font-size: 0.73rem;
      font-weight: 700;
      line-height: 1.25;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 0.3rem);
      transition: opacity 110ms ease, transform 110ms ease;
    }
    .icon-button:hover::after,
    .icon-button:focus-visible::after,
    .reference-value:hover::after,
    .reference-value:focus-visible::after {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .reference-value {
      grid-auto-flow: column;
      gap: 0.55rem;
      max-width: calc(100% - 1rem);
      padding: 0.68rem 0.8rem;
      cursor: help;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .reference-glyph { width: 1.6rem; height: 1.6rem; }
    .chart-pictogram { width: 5rem; height: 5rem; }
    .chart-pictogram .simex-glyph { width: 3.4rem; height: 3.4rem; }
    .token-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: 0.8rem;
    }
    .token-card {
      display: grid;
      grid-template-columns: 3.5rem minmax(0, 1fr);
      gap: 0.8rem;
      align-items: center;
      padding: 0.9rem;
      border: 1px solid var(--line);
      border-radius: 0.85rem;
      background: white;
    }
    .token-swatch {
      width: 3.5rem;
      height: 3.5rem;
      border: 1px solid rgba(11,31,58,0.16);
      border-radius: 0.75rem;
      background: var(--swatch);
    }
    .token-card strong, .token-card code, .token-card [data-token-value] { display: block; }
    .token-card code { margin: 0.18rem 0; color: var(--muted); }
    .contrast-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0,1fr));
      gap: 0.8rem;
      margin-top: 1rem;
    }
    .contrast-surface {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 8rem;
      border: 1px solid var(--line);
      border-radius: 0.9rem;
    }
    .contrast-surface.dark { color: #f7fbff; background: var(--dark); border-color: #28476e; }
    .contrast-surface.dark .icon-button {
      --icon-base: #f7fbff;
      --icon-accent: var(--accent-on-dark);
      color: #f7fbff;
      border-color: #476487;
      background: rgba(255,255,255,0.06);
    }
    .state-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      gap: 0.75rem;
    }
    .state-card {
      padding: 0.8rem;
      border: 1px solid var(--line);
      border-radius: 0.85rem;
      text-align: center;
      background: white;
    }
    .state-preview {
      display: grid;
      min-height: 5rem;
      place-items: center;
    }
    .state-card strong { text-transform: capitalize; font-size: 0.82rem; }
    .glyph-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: 0.65rem;
    }
    .glyph-card {
      display: grid;
      gap: 0.55rem;
      justify-items: center;
      min-width: 0;
      padding: 0.75rem 0.5rem;
      border: 1px solid var(--line);
      border-radius: 0.8rem;
      background: white;
      text-align: center;
    }
    .glyph-card code { width: 100%; color: var(--muted); }
    .glyph-library-preview { min-width: 3rem; min-height: 3rem; }
    .glyph-library-preview .simex-glyph { width: 1.8rem; height: 1.8rem; }
    .empty-section {
      margin: 0;
      padding: 1rem;
      color: var(--muted);
      text-align: center;
    }
    .no-results {
      position: fixed;
      z-index: 50;
      right: 1rem;
      bottom: 1rem;
      padding: 0.7rem 1rem;
      border-radius: 0.7rem;
      color: white;
      background: #071b3a;
      box-shadow: var(--shadow);
    }
    footer {
      padding: 2rem clamp(1.25rem, 4vw, 4rem);
      color: #c9d7ea;
      background: #071b3a;
      text-align: center;
      font-size: 0.82rem;
    }
    [hidden] { display: none !important; }
    @keyframes icon-busy { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
    }
    @media (max-width: 980px) {
      .stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .toolbar { grid-template-columns: 1fr; }
      .accent-controls { flex-wrap: wrap; }
      .layout { grid-template-columns: 1fr; }
      .surface-nav { position: static; max-height: none; columns: 2; }
    }
    @media (max-width: 620px) {
      .stats, .contrast-grid { grid-template-columns: 1fr; }
      .surface-nav { columns: 1; }
      .section-heading { align-items: start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <header class="page-header">
    <div class="header-inner">
      <p class="eyebrow">Generated canonical human reference · Version ${escapeHtml(ICON_LANGUAGE_VERSION)}</p>
      <h1>SimEx Icon Language Atlas</h1>
      <p class="lede">The visual inspection surface for the dashboard’s icon-only interaction language. Hover or keyboard-focus any icon to inspect its tooltip, use search to isolate a control, and change the global accent to inspect derived light and dark contrast.</p>
      <p class="authority-note"><strong>Generated file:</strong> do not edit this HTML directly. Designers use this atlas as the canonical visual reference; <code>src/iconography/iconCatalog.js</code> and <code>src/iconography/iconGlyphs.js</code> are the technical authority shared with the application.</p>
      <div class="stats" aria-label="Catalogue summary">
        <div class="stat"><strong>${Object.keys(ICON_GLYPHS).length}</strong><span>approved glyphs</span></div>
        <div class="stat"><strong>${Object.keys(INTERACTIONS).length}</strong><span>unique interactions</span></div>
        <div class="stat"><strong>${surfaceReferenceCount()}</strong><span>surface references</span></div>
        <div class="stat"><strong>${Object.keys(CHART_TYPE_GLYPHS).length}</strong><span>chart pictograms</span></div>
      </div>
    </div>
  </header>

  <div class="toolbar">
    <div class="toolbar-inner">
      <div class="search-wrap">
        <label class="eyebrow" for="atlas-search">Find an icon or interaction</label>
        <input id="atlas-search" type="search" placeholder="Search labels, IDs, glyphs, surfaces, states, status…" autocomplete="off">
      </div>
      <div class="accent-controls">
        <label for="accent-picker">Accent</label>
        <input class="accent-picker" id="accent-picker" type="color" value="${ICON_TOKENS.accentBase}">
        <input class="accent-text" id="accent-text" aria-label="Accent hexadecimal value" value="${ICON_TOKENS.accentBase}" maxlength="7" spellcheck="false">
        <button class="tool-button" id="reset-accent" type="button">Reset</button>
      </div>
    </div>
  </div>

  <div class="layout">
    <nav class="surface-nav" aria-label="Atlas sections">
      <strong>Reference</strong>
      <a href="#atlas-tokens">Tokens & contrast</a>
      <a href="#atlas-states">Seven states</a>
      ${navigationLinks()}
      <a href="#atlas-glyph-library">Glyph library</a>
    </nav>

    <main>
      <section class="atlas-section" id="atlas-tokens">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Shared visual contract</p>
            <h2>Tokens & contrast</h2>
          </div>
          <span class="section-count">One dashboard accent; derived light and dark variants</span>
        </div>
        <div class="token-grid">
${tokenSwatches()}
        </div>
        <div class="contrast-grid">
          <div class="contrast-surface">
            <button class="icon-button" type="button" aria-label="Icon on light surface" data-tooltip="On light surface">${iconSvg("playback")}</button>
          </div>
          <div class="contrast-surface dark">
            <button class="icon-button" type="button" aria-label="Icon on dark surface" data-tooltip="On dark surface">${iconSvg("playback")}</button>
          </div>
        </div>
      </section>

      <section class="atlas-section" id="atlas-states">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Interaction grammar</p>
            <h2>Seven visual states</h2>
          </div>
          <span class="section-count">${ICON_STATES.length} required states</span>
        </div>
        <div class="state-grid">
${states}
        </div>
      </section>

${surfaces}

      <section class="atlas-section" id="atlas-glyph-library" data-surface-section>
        <div class="section-heading">
          <div>
            <p class="eyebrow">Geometry authority</p>
            <h2>Complete glyph library</h2>
          </div>
          <span class="section-count">${Object.keys(ICON_GLYPHS).length} approved SVG fragments</span>
        </div>
        <div class="glyph-grid">
${glyphs}
        </div>
        <p class="empty-section" hidden>No matching glyphs.</p>
      </section>
    </main>
  </div>

  <p class="no-results" id="no-results" hidden>No atlas entries match this search.</p>
  <footer>SimEx Icon Language ${escapeHtml(ICON_LANGUAGE_VERSION)} · Generated from the same metadata used by the application.</footer>

  <script>
    (() => {
      const defaults = ${JSON.stringify({
        base: ICON_TOKENS.accentBase,
        onLight: ICON_TOKENS.accentOnLight,
        onDark: ICON_TOKENS.accentOnDark,
      })};
      const root = document.documentElement;
      const picker = document.querySelector("#accent-picker");
      const text = document.querySelector("#accent-text");
      const reset = document.querySelector("#reset-accent");
      const search = document.querySelector("#atlas-search");
      const noResults = document.querySelector("#no-results");

      const parse = (value) => {
        const match = String(value || "").trim().match(/^#([0-9a-f]{6})$/i);
        return match ? {
          r: Number.parseInt(match[1].slice(0, 2), 16),
          g: Number.parseInt(match[1].slice(2, 4), 16),
          b: Number.parseInt(match[1].slice(4, 6), 16),
        } : null;
      };
      const toHex = (color) => "#" + [color.r, color.g, color.b]
        .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      const luminance = (color) => {
        const channel = (value) => {
          const normalized = value / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(color.r)
          + 0.7152 * channel(color.g)
          + 0.0722 * channel(color.b);
      };
      const contrast = (a, b) => (
        (Math.max(luminance(a), luminance(b)) + 0.05)
        / (Math.min(luminance(a), luminance(b)) + 0.05)
      );
      const readable = (base, background, target) => {
        for (let step = 2; step <= 20; step += 1) {
          const mix = {
            r: base.r + (target.r - base.r) * step / 20,
            g: base.g + (target.g - base.g) * step / 20,
            b: base.b + (target.b - base.b) * step / 20,
          };
          if (contrast(mix, background) >= 4.5) return mix;
        }
        return target;
      };
      const derive = (value) => {
        const base = parse(value);
        if (!base) return defaults;
        const normalized = toHex(base);
        if (normalized === defaults.base) return defaults;
        return {
          base: normalized,
          onLight: toHex(readable(
            base,
            { r: 255, g: 255, b: 255 },
            { r: 0, g: 0, b: 0 },
          )),
          onDark: toHex(readable(
            base,
            { r: 8, g: 34, b: 74 },
            { r: 255, g: 255, b: 255 },
          )),
        };
      };
      const updateToken = (name, value) => {
        const node = document.querySelector('[data-token-value="' + name + '"]');
        if (node) node.textContent = value;
      };
      const applyAccent = (value) => {
        const variants = derive(value);
        root.style.setProperty("--accent-base", variants.base);
        root.style.setProperty("--accent-on-light", variants.onLight);
        root.style.setProperty("--accent-on-dark", variants.onDark);
        picker.value = variants.base;
        text.value = variants.base;
        text.setAttribute("aria-invalid", "false");
        updateToken("accentBase", variants.base);
        updateToken("accentOnLight", variants.onLight);
        updateToken("accentOnDark", variants.onDark);
      };

      picker.addEventListener("input", () => applyAccent(picker.value));
      text.addEventListener("change", () => {
        if (!parse(text.value)) {
          text.setAttribute("aria-invalid", "true");
          return;
        }
        applyAccent(text.value);
      });
      reset.addEventListener("click", () => applyAccent(defaults.base));

      const filterAtlas = () => {
        const query = search.value.trim().toLowerCase();
        let visibleCount = 0;
        document.querySelectorAll(".filter-card").forEach((card) => {
          const visible = !query || card.dataset.search.includes(query);
          card.hidden = !visible;
          if (visible) visibleCount += 1;
        });
        document.querySelectorAll("[data-surface-section]").forEach((section) => {
          const cards = Array.from(section.querySelectorAll(".filter-card"));
          const anyVisible = cards.some((card) => !card.hidden);
          const empty = section.querySelector(".empty-section");
          if (empty) empty.hidden = anyVisible;
        });
        noResults.hidden = visibleCount > 0 || !query;
      };
      search.addEventListener("input", filterAtlas);

      document.querySelectorAll(".icon-button").forEach((button) => {
        button.addEventListener("click", (event) => event.preventDefault());
      });
    })();
  </script>
</body>
</html>
`);
}

const interactionTableRows = (surface) => (surface.interactionIds ?? [])
  .map((interactionId) => INTERACTIONS[interactionId])
  .filter(Boolean)
  .map((interaction) => [
    interaction.id,
    interaction.glyphId,
    interaction.label,
    interaction.tooltip,
    interaction.renderMode,
    interaction.tone,
    interaction.status,
    interaction.confirmation,
    interaction.note,
  ].map(markdownCell).join(" | "))
  .map((row) => `| ${row} |`)
  .join("\n");

const chartTypeTableRows = () => ATLAS_SURFACES
  .find((surface) => Array.isArray(surface.chartTypeIds))
  ?.chartTypeIds
  .map((typeId) => {
    const schema = chartSchemasById.get(typeId);
    return `| ${[
      typeId,
      schema?.label,
      CHART_TYPE_GLYPHS[typeId],
      schema?.group,
      schema?.description,
    ].map(markdownCell).join(" | ")} |`;
  })
  .join("\n") ?? "";

const renderSurfaceSpecification = (surface) => {
  if (Array.isArray(surface.chartTypeIds)) return "";
  return `## ${surface.title}

Surface ID: \`${surface.id}\` · ${surface.interactionIds?.length ?? 0} references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${interactionTableRows(surface)}
`;
};

export function renderIconSpecification() {
  const catalogueErrors = validateIconCatalog();
  if (catalogueErrors.length > 0) {
    throw new Error(`Cannot generate icon references:\n${catalogueErrors.join("\n")}`);
  }

  const tokenRows = [
    ["base", ICON_TOKENS.base, "Base icon color on light surfaces"],
    ["accentBase", ICON_TOKENS.accentBase, "Dashboard-level author-selected accent"],
    ["accentOnLight", ICON_TOKENS.accentOnLight, "Derived accent used on light surfaces"],
    ["accentOnDark", ICON_TOKENS.accentOnDark, "Derived accent used on dark surfaces"],
    ["danger", ICON_TOKENS.danger, "Destructive icon base; the secondary accent remains shared"],
    ["success", ICON_TOKENS.success, "Selected and confirmed state"],
  ].map((row) => `| ${row.map(markdownCell).join(" | ")} |`).join("\n");

  const stateRows = ICON_STATES.map((state) => {
    const meaning = {
      default: "Available, idle action",
      hover: "Pointer is over the action; tooltip is visible",
      active: "Action is being pressed",
      selected: "Action or panel is selected; semantic green is used",
      disabled: "Action is unavailable and non-interactive",
      busy: "Action is processing; motion respects reduced-motion preferences",
      danger: "Destructive action; red base with the shared secondary accent",
    }[state];
    return `| ${markdownCell(state)} | ${markdownCell(meaning)} |`;
  }).join("\n");

  const surfaceSections = ATLAS_SURFACES
    .map(renderSurfaceSpecification)
    .filter(Boolean)
    .join("\n");

  return `# Icon & Interaction Specification

Version: **${ICON_LANGUAGE_VERSION}**

> This document is generated. Do not edit it directly.
>
> Designers use \`docs/icon-language-atlas.html\` as the canonical visual reference. The application and both generated references consume \`src/iconography/iconCatalog.js\` and \`src/iconography/iconGlyphs.js\`; those metadata modules are the technical authority.

## Purpose

The SimEx dashboard uses a compact, icon-first interaction language. Controls that can be understood as actions use an icon without a persistent text label and reveal their accessible name in a tooltip on hover and keyboard focus. Analytical values and other text marked \`reference\` remain text when meaning would otherwise be lost.

The shared metadata prevents three kinds of drift:

1. the application rendering a different glyph from the design reference;
2. tooltips and accessible labels diverging from the interaction specification;
3. implementation status, destructive tone, or confirmation requirements being documented differently from the application contract.

## Authority and generation

- Glyph geometry: \`src/iconography/iconGlyphs.js\`
- Interaction, state, token, surface, and chart mappings: \`src/iconography/iconCatalog.js\`
- Deterministic generator: \`scripts/build-icon-reference.mjs\`
- Generated visual atlas: \`docs/icon-language-atlas.html\`
- Generated written specification: \`docs/icon-and-interaction-specification.md\`

The generated files contain no timestamps, machine paths, random identifiers, or environment-specific content. Run \`pnpm.cmd icons:build\` after editing the metadata and \`pnpm.cmd icons:check\` to detect drift.

## Core interaction rules

1. **Icon-only by default.** Action controls render as icons. Their metadata label is the accessible name and their tooltip appears on hover and keyboard focus.
2. **Text remains purposeful.** \`renderMode: text\` and \`status: reference\` identify analytical values or controls whose meaning still requires visible words.
3. **One dashboard accent.** The base accent is selected at dashboard level; readable light and dark variants are derived to meet the approved contrast target.
4. **Destructive actions are unmistakable.** A destructive control uses the danger red as its base while retaining the same secondary accent as the rest of the dashboard.
5. **Selection is semantic.** Selected controls use the shared success green. Multi-fullscreen selection also carries the announced ordinal.
6. **Confirmation is metadata.** \`confirmation: required\` is part of the interaction contract and must be honored by the application flow.
7. **Geometry is immutable at render time.** Application components select registered glyph IDs; they do not patch SVG paths or load alternate icon assets.

## Catalogue summary

| Measure | Count |
| --- | ---: |
| Approved glyphs | ${Object.keys(ICON_GLYPHS).length} |
| Unique interaction records | ${Object.keys(INTERACTIONS).length} |
| Surface interaction references | ${surfaceReferenceCount()} |
| Surfaces | ${ATLAS_SURFACES.length} |
| Chart pictograms | ${Object.keys(CHART_TYPE_GLYPHS).length} |
| Visual states | ${ICON_STATES.length} |

Repeated interaction concepts may appear on more than one surface. The surface-reference count intentionally preserves those appearances, while the unique-record count describes the current metadata keys.

## Color tokens

| Token | Default | Meaning |
| --- | --- | --- |
${tokenRows}

The base icon color is contextual: dark ink on light surfaces and light ink on dark surfaces. Accent derivation falls back to the approved defaults when input is invalid.

## Required visual states

| State | Meaning |
| --- | --- |
${stateRows}

## Metadata fields

| Field | Contract |
| --- | --- |
| \`id\` | Stable dot-separated interaction identifier |
| \`glyphId\` | Key in the glyph authority |
| \`label\` | Accessible name announced by assistive technology |
| \`tooltip\` | Concise text shown on hover and keyboard focus |
| \`renderMode\` | \`icon\` for icon-only controls; \`text\` for retained visible text/data |
| \`tone\` | \`standard\` or \`danger\` |
| \`status\` | \`live\`, \`planned\`, or \`reference\` |
| \`confirmation\` | \`none\` or \`required\` |
| \`note\` | Surface-specific implementation or design guidance |

## Status meanings

- **live** — the application currently renders this interaction from the shared catalogue.
- **planned** — approved visual and semantic contract whose product behavior is deferred.
- **reference** — retained text or analytical data, shown in the atlas for context rather than forced into icon-only rendering.

## Surface contracts

${surfaceSections}
## Chart-type pictograms

Chart labels and descriptions remain owned by the chart schema registry. The icon catalogue maps each registered chart type to exactly one glyph.

| Chart type ID | Label | Glyph | Group | Purpose |
| --- | --- | --- | --- | --- |
${chartTypeTableRows()}

## Validation and change workflow

1. Change glyph geometry or interaction metadata only in the source modules.
2. Run \`pnpm.cmd icons:build\` to regenerate the HTML atlas and this specification.
3. Inspect the generated atlas at normal and enlarged browser zoom. Verify hover and keyboard-focus tooltips, light/dark accent contrast, destructive red, selected green, and all seven visual states.
4. Run \`pnpm.cmd icons:check\`. A stale generated file fails with instructions to regenerate.
5. Review the source and both generated files together. Never edit a generated reference to conceal a metadata mismatch.

Broad application tests are governed by the project’s normal verification cadence; icon reference generation itself is dependency-free and deterministic.
`;
}

async function readOrNull(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function checkGeneratedReferences() {
  const expected = {
    atlas: renderIconAtlas(),
    specification: renderIconSpecification(),
  };
  const stale = [];
  for (const [name, filePath] of Object.entries(outputFiles)) {
    if (await readOrNull(filePath) !== expected[name]) stale.push(filePath);
  }
  return stale;
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  if (checkOnly) {
    const stale = await checkGeneratedReferences();
    if (stale.length > 0) {
      console.error("Icon reference files are stale.");
      console.error("Run pnpm.cmd icons:build");
      process.exitCode = 1;
      return;
    }
    console.log("Icon reference files are current.");
    return;
  }

  await Promise.all([
    writeFile(outputFiles.atlas, renderIconAtlas(), "utf8"),
    writeFile(
      outputFiles.specification,
      renderIconSpecification(),
      "utf8",
    ),
  ]);
  console.log("Generated docs/icon-language-atlas.html");
  console.log("Generated docs/icon-and-interaction-specification.md");
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === scriptPath;

if (isDirectExecution) {
  await main();
}
