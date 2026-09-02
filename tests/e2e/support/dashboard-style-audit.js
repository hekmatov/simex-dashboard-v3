export const RETIRED_DASHBOARD_COLOR_CHANNELS = Object.freeze([
  Object.freeze({ hex: "#08224a", rgb: Object.freeze([8, 34, 74]) }),
  Object.freeze({ hex: "#043bcb", rgb: Object.freeze([4, 59, 203]) }),
  Object.freeze({ hex: "#007c89", rgb: Object.freeze([0, 124, 137]) }),
  Object.freeze({ hex: "#f5f8fb", rgb: Object.freeze([245, 248, 251]) }),
  Object.freeze({ hex: "#f8fbff", rgb: Object.freeze([248, 251, 255]) }),
  Object.freeze({ hex: "#d8e2ec", rgb: Object.freeze([216, 226, 236]) }),
  Object.freeze({ hex: "#eaf1f6", rgb: Object.freeze([234, 241, 246]) }),
  Object.freeze({ hex: "#eef4f8", rgb: Object.freeze([238, 244, 248]) }),
  Object.freeze({ hex: "#e1e9f0", rgb: Object.freeze([225, 233, 240]) }),
  Object.freeze({ hex: "#506a82", rgb: Object.freeze([80, 106, 130]) }),
  Object.freeze({ hex: "#6a7f92", rgb: Object.freeze([106, 127, 146]) }),
  Object.freeze({ hex: "#36516a", rgb: Object.freeze([54, 81, 106]) }),
  Object.freeze({ hex: "#49627a", rgb: Object.freeze([73, 98, 122]) }),
  Object.freeze({ hex: "#18334e", rgb: Object.freeze([24, 51, 78]) }),
  Object.freeze({ hex: "#edf5fb", rgb: Object.freeze([237, 245, 251]) }),
  Object.freeze({ hex: "#f7f9fc", rgb: Object.freeze([247, 249, 252]) }),
  Object.freeze({ hex: "#075ea8", rgb: Object.freeze([7, 94, 168]) }),
  Object.freeze({ hex: "#3157d5", rgb: Object.freeze([49, 87, 213]) }),
  Object.freeze({ hex: "#008080", rgb: Object.freeze([0, 128, 128]), keyword: "teal" }),
  Object.freeze({ hex: "#000080", rgb: Object.freeze([0, 0, 128]), keyword: "navy" }),
]);

const SOURCE_ALLOWLIST = Object.freeze([
  Object.freeze({
    file: /(?:^|\/)src\/components\/ColorField\.jsx$/,
    line: /(?:\bcolors\s*:|\bfallback\s*=|contrastRatio\()/,
    classification: "authored-color-swatch",
  }),
  Object.freeze({
    file: /(?:^|\/)src\/components\/chart-authoring\/SeriesColorsField\.jsx$/,
    line: /#[0-9a-f]{6}/i,
    classification: "authored-color-swatch",
  }),
  Object.freeze({
    file: /(?:^|\/)src\/components\/DashboardRenderer\.jsx$/,
    line: /(?:<ColorField\b|panelBackgroundColor|panelBorderColor|chartAreaColor|chartAreaBorderColor|editHighlightColor)/,
    classification: "authored-panel-color",
  }),
  Object.freeze({
    file: /(?:^|\/)src\/components\/charts\/EChartsChartView\.jsx$/,
    line: /(?:textStrong|textMuted|dataColors|chartMark|gridline)\s*:/,
    classification: "chart-theme-payload",
  }),
]);

function retiredSourcePattern() {
  const separator = "(?:\\s*,\\s*|\\s+)";
  const rgbChannels = RETIRED_DASHBOARD_COLOR_CHANNELS
    .map(({ rgb }) => rgb.map((value) => String(value)).join(separator))
    .join("|");
  const hexValues = RETIRED_DASHBOARD_COLOR_CHANNELS
    .map(({ hex }) => hex.slice(1))
    .join("|");
  const keywords = RETIRED_DASHBOARD_COLOR_CHANNELS
    .map(({ keyword }) => keyword)
    .filter(Boolean)
    .join("|");
  return new RegExp(`#(?:${hexValues})\\b|rgba?\\(\\s*(?:${rgbChannels})(?:\\s*[,/]?\\s*(?:0|1|0?\\.\\d+|\\d+(?:\\.\\d+)?%))?\\s*\\)|\\b(?:${keywords})\\b`, "gi");
}

function isThemeTokenPayload(filePath, lines, lineIndex) {
  const normalizedPath = String(filePath ?? "").replaceAll("\\", "/");
  if (!/(?:^|\/)src\/theme\/dashboardTheme\.js$/.test(normalizedPath)) return false;
  const payloadStart = lines.findIndex((line) => /^\s*const RAW_PROFILES\s*=\s*Object\.freeze\(\[\s*$/.test(line));
  if (payloadStart < 0) return false;
  const payloadEnd = lines.findIndex((line, index) => index > payloadStart && /^\s*\]\);\s*$/.test(line));
  return payloadEnd > payloadStart && lineIndex > payloadStart && lineIndex < payloadEnd;
}

function sourceClassification(filePath, line, lines, lineIndex) {
  if (isThemeTokenPayload(filePath, lines, lineIndex)) return "theme-token-payload";
  const normalizedPath = String(filePath ?? "").replaceAll("\\", "/");
  return SOURCE_ALLOWLIST.find(({ file, line: linePattern }) => (
    file.test(normalizedPath) && linePattern.test(line)
  ))?.classification;
}

/**
 * Durable source-declaration audit. This intentionally scans authored source,
 * rather than only computed style, so a stale declaration cannot hide behind a
 * later semantic override. The allowlist is limited to user-authored colour
 * swatches/panel data and the theme-token catalogue.
 */
export function auditDashboardStyleSources(sources = []) {
  const active = [];
  const allowed = [];
  for (const { filePath, source } of sources) {
    const normalizedPath = String(filePath ?? "").replaceAll("\\", "/");
    const rawSource = String(source ?? "");
    const auditableSource = /\.css$/i.test(normalizedPath)
      ? rawSource.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, " "))
      : rawSource;
    const lines = auditableSource.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const match of line.matchAll(retiredSourcePattern())) {
        const finding = {
          filePath: normalizedPath,
          line: index + 1,
          color: match[0],
          declaration: line.trim(),
        };
        const classification = sourceClassification(filePath, line, lines, index);
        if (classification) allowed.push({ ...finding, classification });
        else active.push(finding);
      }
    });
  }
  return { active, allowed };
}

/**
 * Audits every visible dashboard node, including body-level portals, generated
 * content, and SVG presentation paint. Canvas charts are covered by the live
 * ECharts presentation integration test because computed CSS cannot inspect
 * pixels painted into a canvas.
 */
export async function expectNoRetiredDashboardStyle(page) {
  const hits = await page.evaluate((retiredChannels) => {
    const rootSelectors = [
      ".app-frame",
      ".audience-theme-root",
      ".application-recovery",
      ".source-viewer-theme-root",
      "[data-dashboard-style][style]",
    ];
    const themeRoots = [...new Set(rootSelectors.flatMap((selector) => (
      [...document.querySelectorAll(selector)]
    )))];
    if (themeRoots.length === 0) {
      return [{ kind: "contract", detail: `Missing dashboard theme root (${rootSelectors.join(", ")})` }];
    }

    const app = themeRoots[0];
    const approvedFonts = new Set([
      "--simex-style-body-font",
      "--simex-style-heading-font",
      "--simex-style-data-font",
    ].map((variable) => {
      const probe = document.createElement("span");
      probe.style.fontFamily = `var(${variable})`;
      app.append(probe);
      const resolved = getComputedStyle(probe).fontFamily.toLowerCase();
      probe.remove();
      return resolved;
    }).filter(Boolean));
    const semanticColors = Object.fromEntries([
      "--simex-selected",
      "--simex-selected-soft",
      "--simex-info",
      "--simex-info-soft",
      "--simex-warning",
      "--simex-warning-soft",
      "--simex-error",
      "--simex-error-soft",
    ].map((name) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      app.append(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return [name, resolved];
    }));
    const colorProperties = ["color", "backgroundColor", "fill", "stroke", "accentColor"];
    const compositeProperties = ["boxShadow", "textShadow", "backgroundImage"];
    const normalizeColor = (value) => String(value || "").trim().toLowerCase();
    const retiredHex = new Set(retiredChannels.map(({ hex }) => hex));
    const retiredKeywords = new Set(retiredChannels.map(({ keyword }) => keyword).filter(Boolean));
    const hasRetiredChannel = (value) => {
      const source = String(value || "");
      const normalized = normalizeColor(source);
      if (retiredHex.has(normalized) || retiredKeywords.has(normalized)) return true;
      for (const match of source.matchAll(/rgba?\(([^)]+)\)/gi)) {
        const numbers = match[1].match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
        if (numbers?.length === 3 && retiredChannels.some(({ rgb }) => (
          rgb.every((channel, index) => channel === numbers[index])
        ))) return true;
      }
      return false;
    };
    const authoredPaint = (element) => element.matches([
      ".settings-color-swatch",
      ".settings-color-preset-grid > button",
      ".settings-gradient-grid > button > span",
      "input[type=\"color\"]",
      "[data-authored-color-swatch]",
    ].join(","));
    const authoredCodeFont = (element) => Boolean(element.closest("code, pre, kbd")) || element.matches([
      ".free-text-source-editor__source > textarea",
      ".free-text-source-editor__advanced > textarea",
      ".portable-qmd-composer__surface",
    ].join(","));
    const visible = (element, style) => {
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const describe = (element) => ({
      tag: element.tagName,
      id: element.id || undefined,
      className: typeof element.className === "string" ? element.className.slice(0, 120) : undefined,
      text: String(element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
    });
    const styleHits = (element, style, kind) => {
      const identity = describe(element);
      const paint = {};
      for (const property of colorProperties) {
        const unusedSvgPaint = (property === "fill" || property === "stroke") && style[property] === "none";
        if (!unusedSvgPaint && !authoredPaint(element) && hasRetiredChannel(style[property])) {
          paint[property] = style[property];
        }
      }
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        if (style[`border${side}Style`] !== "none"
          && Number.parseFloat(style[`border${side}Width`]) > 0
          && hasRetiredChannel(style[`border${side}Color`])) {
          paint[`border${side}Color`] = style[`border${side}Color`];
        }
      }
      if (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0
        && hasRetiredChannel(style.outlineColor)) paint.outlineColor = style.outlineColor;
      if (style.textDecorationLine !== "none" && hasRetiredChannel(style.textDecorationColor)) {
        paint.textDecorationColor = style.textDecorationColor;
      }
      for (const property of compositeProperties) {
        if (hasRetiredChannel(style[property])) paint[property] = style[property];
      }
      const fontFamily = String(style.fontFamily || "").trim().toLowerCase();
      const userAgentColorControl = element instanceof HTMLInputElement && element.type === "color";
      if (!userAgentColorControl && !authoredCodeFont(element)
        && fontFamily && approvedFonts.size > 0 && !approvedFonts.has(fontFamily)) {
        paint.fontFamily = style.fontFamily;
      }
      return Object.keys(paint).length ? [{ kind, ...identity, paint }] : [];
    };

    const portalRoots = [...document.body.querySelectorAll([
      '[role="tooltip"]',
      '[role="dialog"]',
      '[role="menu"]',
      '[role="complementary"]',
      '[data-dashboard-portal]',
      ".build-authoring-auxiliary",
      ".unit-orbit",
      ".scene-observation-dialog",
    ].join(","))];
    const nodes = [...new Set([...themeRoots, ...portalRoots].flatMap((root) => (
      [root, ...root.querySelectorAll("*")]
    )))];
    const findings = [];
    for (const element of nodes) {
      const style = getComputedStyle(element);
      if (!visible(element, style) || element.classList.contains("visually-hidden")) continue;
      findings.push(...styleHits(element, style, "element"));

      if (element.matches("[data-pending-work-state]")) {
        const state = element.getAttribute("data-pending-work-state");
        const expected = state === "saving"
          ? [semanticColors["--simex-info"], semanticColors["--simex-info-soft"]]
          : state === "error"
            ? [semanticColors["--simex-error"], semanticColors["--simex-error-soft"]]
            : [semanticColors["--simex-warning"], semanticColors["--simex-warning-soft"]];
        const painted = [
          style.color,
          style.backgroundColor,
          style.borderTopColor,
          style.borderRightColor,
          style.borderBottomColor,
          style.borderLeftColor,
        ];
        if (!expected.filter(Boolean).some((value) => painted.includes(value))) {
          findings.push({ kind: "pending-semantic-state", ...describe(element), state, expected, painted });
        }
      }

      for (const pseudo of ["::before", "::after"]) {
        const pseudoStyle = getComputedStyle(element, pseudo);
        if (pseudoStyle.content !== "none" && pseudoStyle.content !== "normal") {
          findings.push(...styleHits(element, pseudoStyle, pseudo));
        }
      }
      if (element instanceof SVGElement) {
        for (const attribute of ["fill", "stroke", "color"]) {
          const value = element.getAttribute(attribute);
          if (value && !authoredPaint(element) && hasRetiredChannel(value)) {
            findings.push({ kind: "svg-attribute", ...describe(element), paint: { [attribute]: value } });
          }
        }
      }
    }
    return findings;
  }, RETIRED_DASHBOARD_COLOR_CHANNELS);

  if (hits.length) {
    throw new Error(`Retired dashboard style reached live UI:\n${JSON.stringify(hits, null, 2)}`);
  }
}

/**
 * Capture a pending owner's short-lived visual projection without changing the
 * product lifecycle. The observer starts before Save so the saving projection
 * cannot disappear between Playwright polls. Node identity is kept in a
 * page-local WeakMap, proving that state/copy changes do not create a second
 * row or replace the stable owner element.
 */
export function observePendingOwnerStyle(page, ownerId, expectedState) {
  return page.evaluate(({ id, state }) => new Promise((resolve) => {
    let timeoutId;
    const ownerKeys = globalThis.__simexDashboardStyleAuditOwnerKeys
      ??= { next: 1, values: new WeakMap() };
    const resolveColor = (owner, variable) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${variable})`;
      owner.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const inspect = () => {
      const owners = [...document.querySelectorAll("[data-pending-work-id]")]
        .filter((entry) => entry.dataset.pendingWorkId === id);
      const owner = owners[0];
      if (owners.length !== 1 || owner?.dataset.pendingWorkState !== state) return false;
      if (!ownerKeys.values.has(owner)) {
        ownerKeys.values.set(owner, ownerKeys.next);
        ownerKeys.next += 1;
      }
      const style = getComputedStyle(owner);
      const semanticVariables = state === "saving"
        ? ["--simex-info", "--simex-info-soft"]
        : state === "error"
          ? ["--simex-error", "--simex-error-soft"]
          : ["--simex-warning", "--simex-warning-soft"];
      const semanticColors = semanticVariables.map((variable) => resolveColor(owner, variable));
      const paintedColors = [
        style.color,
        style.backgroundColor,
        style.borderTopColor,
        style.borderRightColor,
        style.borderBottomColor,
        style.borderLeftColor,
      ];
      const rect = owner.getBoundingClientRect();
      const actionCopy = [...owner.querySelectorAll("button")]
        .filter((button) => getComputedStyle(button).display !== "none")
        .map((button) => button.textContent.trim())
        .filter(Boolean);
      window.clearTimeout(timeoutId);
      observer.disconnect();
      resolve({
        count: owners.length,
        nodeIdentity: ownerKeys.values.get(owner),
        id: owner.dataset.pendingWorkId,
        state: owner.dataset.pendingWorkState,
        activity: owner.dataset.pendingWorkActivity,
        origin: owner.dataset.pendingWorkOrigin,
        surface: owner.dataset.pendingWorkSurface,
        actionCopy,
        geometry: {
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        },
        paint: {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderLeftColor: style.borderLeftColor,
        },
        semanticStatePaint: semanticColors.some((color) => paintedColors.includes(color)),
      });
      return true;
    };
    const observer = new MutationObserver(inspect);
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve({ timedOut: true, id, state });
    }, 5_000);
    inspect();
  }), { id: ownerId, state: expectedState });
}
