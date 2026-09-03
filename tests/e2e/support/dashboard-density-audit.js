import { DASHBOARD_OWNED_REGION_REGISTRY } from "../../../src/theme/dashboardRegionRegistry.js";
import { DASHBOARD_JOURNEY_MANIFEST } from "./dashboard-surface-manifest.js";
import { classifyDashboardRegionClosure } from "./dashboard-region-closure.js";

const ROLE_HEIGHTS = Object.freeze({
  glyph: 16,
  utility: 24,
  compact: 28,
  standard: 32,
  prominent: 36,
  crown: 36,
});

const SPACING_SCALE = Object.freeze([2, 4, 8, 12, 16, 24, 32]);
const SIZE_TOLERANCE = 2;
const DASHBOARD_DENSITY_PAINT_OCCLUDING_OVERFLOWS = Object.freeze(["hidden", "clip"]);
const DASHBOARD_DENSITY_APPLICATION_OWNER_SELECTOR = "[data-dashboard-application], #root";
const DASHBOARD_DENSITY_EXPLICIT_PORTAL_SELECTOR = [
  "[data-dashboard-portal]",
  "[data-dashboard-overlay]",
  "[data-right-side-drawer]",
  ".dashboard-dialog",
  ".right-side-drawer",
].join(",");
const DASHBOARD_DENSITY_EXTERNAL_PORTAL_QUERY = [
  "dialog",
  "[role='dialog']",
  "[role='menu']",
  "[role='listbox']",
  "[aria-modal='true']",
  "[popover]",
  "aside",
  "section",
  "div",
].join(",");

export function dashboardDensityAncestorClipsPaintedNode({
  elementRect,
  ancestorRect,
  overflowX,
  overflowY,
} = {}) {
  if (!elementRect || !ancestorRect) return false;
  const outsideInline = elementRect.right <= ancestorRect.left + 0.5
    || elementRect.left >= ancestorRect.right - 0.5;
  const outsideBlock = elementRect.bottom <= ancestorRect.top + 0.5
    || elementRect.top >= ancestorRect.bottom - 0.5;
  return (
    DASHBOARD_DENSITY_PAINT_OCCLUDING_OVERFLOWS.includes(overflowX) && outsideInline
  ) || (
    DASHBOARD_DENSITY_PAINT_OCCLUDING_OVERFLOWS.includes(overflowY) && outsideBlock
  );
}

export function dashboardDensityPaintIsCollapsed({ clip = "auto", clipPath = "none" } = {}) {
  const normalizedClip = String(clip).replace(/\s+/g, "").toLowerCase();
  const clipNumbers = normalizedClip.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const collapsedRect = normalizedClip.startsWith("rect(")
    && clipNumbers.length >= 4
    && Math.abs(clipNumbers[1] - clipNumbers[3]) <= 0.5
    && Math.abs(clipNumbers[2] - clipNumbers[0]) <= 0.5;
  const normalizedClipPath = String(clipPath).replace(/\s+/g, "").toLowerCase();
  const collapsedPath = /^(?:inset\((?:50|100)%\)|circle\(0(?:px|%)?\))$/.test(normalizedClipPath);
  return collapsedRect || collapsedPath;
}

export const DASHBOARD_DENSITY_ROLE_OVERRIDES = Object.freeze([
  Object.freeze({
    role: "content",
    selector: [
      "select[multiple]",
      "select[size]:not([size='0']):not([size='1'])",
      ".source-content-row",
      ".source-content-breadcrumb",
      ".chart-creation-repair-link",
      ".settings-color-preset-grid > button",
      ".settings-gradient-grid > button",
      ".chart-type-card",
      ".wizard-choice-card",
      ".choice-card",
      ".look-profile-option",
    ].join(","),
  }),
  Object.freeze({
    role: "utility",
    selector: [
      ".build-tree-caret",
      ".build-tree-move-handle",
      ".settings-color-swatch",
      ".build-more-drawer .right-side-drawer__header > button.secondary",
      ".image-panel-presentation__size button",
    ].join(","),
  }),
  Object.freeze({
    role: "compact",
    selector: [
      ".dashboard-map-region-switch button",
      ".dashboard-map-header > button.secondary",
    ].join(","),
  }),
  Object.freeze({
    role: "prominent",
    selector: ".source-content-workspace button:is(.danger,.destructive,.simex-prominent-control,[data-simex-control-role='prominent'])",
  }),
  Object.freeze({
    role: "standard",
    selector: [
      ".build-more-command-list button",
      ".source-content-workspace button:not(.simex-icon-control):not(.danger):not(.destructive):not(.simex-prominent-control):not(.source-content-row):not(.source-content-breadcrumb):not([role='tab']):not([role='menuitem'])",
    ].join(","),
  }),
]);

export const DASHBOARD_DENSITY_SETTLE_STYLE = `
[data-dashboard-density-settled],
[data-dashboard-density-settled] * {
  animation: none !important;
  scroll-behavior: auto !important;
  transition: none !important;
}
`;

export const DASHBOARD_DENSITY_CATEGORIES = Object.freeze([
  "role-size",
  "edge-clearance",
  "centreline",
  "rhythm",
  "wrap",
  "whitespace",
  "overlap",
  "clipping",
  "overflow",
  "repeated-title",
  "same-role-variance",
  "occupancy",
  "operational-contrast",
  "visible-semantics",
  "desktop-support-contract",
]);

export function dashboardDensityEdgeDecorationDepth({
  borderDepth = 0,
  customDepth = 0,
  hasLocalDecorationPaint = false,
} = {}) {
  const measuredBorder = Number.isFinite(borderDepth) && borderDepth > 0 ? borderDepth : 0;
  const measuredCustom = hasLocalDecorationPaint && Number.isFinite(customDepth) && customDepth > 0
    ? customDepth
    : 0;
  return Math.max(measuredBorder, measuredCustom);
}

export function dashboardDensityEdgeDepthOverride({ localDepth = null, styleDepth = 0 } = {}) {
  return Number.isFinite(localDepth) && localDepth >= 0 ? localDepth : styleDepth;
}

export function dashboardDensityVisibleBorderDepth({ width = 0, style = "none", color = "transparent" } = {}) {
  const normalizedColor = String(color).replace(/\s+/g, "").toLowerCase();
  const transparent = normalizedColor === "transparent"
    || /^rgba\([^)]*,0\)$/.test(normalizedColor)
    || /\/0(?:\)|$)/.test(normalizedColor);
  return Number.isFinite(width) && width > 0 && !["none", "hidden"].includes(style) && !transparent
    ? width
    : 0;
}

export function dashboardDensityHasBackgroundImagePaint(backgroundImage = "none") {
  return !/^none(?:\s*,\s*none)*$/i.test(String(backgroundImage).trim());
}

export function dashboardDensityCustomEdgePaintIsVisible({
  backgroundImage = "none",
  boxShadow = "none",
  allowBoxShadow = false,
} = {}) {
  return dashboardDensityHasBackgroundImagePaint(backgroundImage)
    || (allowBoxShadow && String(boxShadow).trim().toLowerCase() !== "none");
}

export function dashboardDensityClearanceBoundaryStart(element, { contentKind = "text" } = {}) {
  return contentKind === "control" ? element?.parentElement ?? null : element;
}

export function classifyDashboardEdgeClearance({
  edges = [],
  minimumClearance = 4,
  tolerance = 0.5,
} = {}) {
  return edges.flatMap((edge) => {
    if (edge.exempt || !Number.isFinite(edge.decorationDepth)) return [];
    const requiredClearance = edge.decorationDepth + minimumClearance;
    return (edge.clearances ?? []).flatMap(({ contentId, clearance }) => (
      Number.isFinite(clearance) && clearance + tolerance < requiredClearance
        ? [{
          boundaryId: edge.boundaryId,
          edge: edge.edge,
          contentId,
          clearance: round(clearance),
          decorationDepth: round(edge.decorationDepth),
          requiredClearance: round(requiredClearance),
        }]
        : []
    ));
  });
}

export function dashboardRegionCandidateRequiresOwnBoundary(signals = []) {
  const present = new Set(signals);
  return ["sticky-fixed", "dialog", "drawer", "menu", "status", "table", "chart-cell"]
    .some((signal) => present.has(signal))
    || (present.has("toolbar-navigation")
      && (present.has("distinct-paint") || present.has("multi-action")))
    || (present.has("named-structure") && present.has("distinct-paint"));
}

export function dashboardRegionDirectStyleSignature({
  role = "",
  material = "flat",
  roleRuleMatches = [],
  materialRuleMatches = [],
} = {}) {
  if (!role || roleRuleMatches.length === 0) return "";
  if (material !== "flat" && materialRuleMatches.length === 0) return "";
  return [...roleRuleMatches, ...materialRuleMatches].join(" | ");
}

export function dashboardDensityExternalPortalCandidateRequiresScope({
  outsideJourneyRoot = false,
  withinApplicationOwner = false,
  explicitDashboardOwnership = false,
  role = "",
  tag = "",
  position = "static",
  topLayer = false,
} = {}) {
  if (!outsideJourneyRoot || (!withinApplicationOwner && !explicitDashboardOwnership)) return false;
  return explicitDashboardOwnership
    || topLayer
    || tag === "dialog"
    || ["dialog", "menu", "listbox"].includes(role)
    || position === "fixed";
}

export async function collectDashboardDensityEvidence(page, entry) {
  const snapshot = await page.evaluate(({
    metadata,
    rootSelector,
    roleHeights,
    roleOverrides,
    paintOccludingOverflows,
    applicationOwnerSelector,
    explicitPortalSelector,
    externalPortalQuery,
    ownedRegions,
  }) => {
    const round = (value) => Math.round(value * 100) / 100;
    const colorIsTransparent = (color = "transparent") => {
      const normalized = String(color).replace(/\s+/g, "").toLowerCase();
      return normalized === "transparent"
        || /^rgba\([^)]*,0(?:\.0+)?\)$/.test(normalized)
        || /\/0(?:\.0+)?(?:\)|$)/.test(normalized);
    };
    const hasBackgroundImagePaint = (backgroundImage = "none") => (
      !/^none(?:\s*,\s*none)*$/i.test(String(backgroundImage).trim())
    );
    const customEdgePaintIsVisible = ({
      backgroundImage = "none",
      boxShadow = "none",
      allowBoxShadow = false,
    } = {}) => hasBackgroundImagePaint(backgroundImage)
      || (allowBoxShadow && String(boxShadow).trim().toLowerCase() !== "none");
    const visibleBorderDepth = ({
      width = 0,
      style = "none",
      color = "transparent",
    } = {}) => (
      Number.isFinite(width)
        && width > 0
        && !["none", "hidden"].includes(String(style).toLowerCase())
        && !colorIsTransparent(color)
        ? width
        : 0
    );
    const edgeDepthOverride = ({ localDepth = null, styleDepth = 0 } = {}) => (
      Number.isFinite(localDepth) && localDepth >= 0 ? localDepth : styleDepth
    );
    const edgeDecorationDepth = ({
      borderDepth = 0,
      customDepth = 0,
      hasLocalDecorationPaint = false,
    } = {}) => Math.max(
      Number.isFinite(borderDepth) && borderDepth > 0 ? borderDepth : 0,
      hasLocalDecorationPaint && Number.isFinite(customDepth) && customDepth > 0
        ? customDepth
        : 0,
    );
    const clearanceBoundaryStart = (element, { contentKind = "text" } = {}) => (
      contentKind === "control" ? element?.parentElement ?? null : element
    );
    const paintIsCollapsed = (style) => {
      const normalizedClip = String(style.clip).replace(/\s+/g, "").toLowerCase();
      const clipNumbers = normalizedClip.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      const collapsedRect = normalizedClip.startsWith("rect(")
        && clipNumbers.length >= 4
        && Math.abs(clipNumbers[1] - clipNumbers[3]) <= 0.5
        && Math.abs(clipNumbers[2] - clipNumbers[0]) <= 0.5;
      const normalizedClipPath = String(style.clipPath).replace(/\s+/g, "").toLowerCase();
      const collapsedPath = /^(?:inset\((?:50|100)%\)|circle\(0(?:px|%)?\))$/.test(normalizedClipPath);
      return collapsedRect || collapsedPath;
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const classes = String(element.className ?? "");
      if (/\b(?:visually-hidden|sr-only|screen-reader-only)\b/.test(classes)) return false;
      if (!(style.display !== "none"
        && style.visibility !== "hidden"
        && style.contentVisibility !== "hidden"
        && !paintIsCollapsed(style)
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0)) return false;
      let ancestor = element.parentElement;
      while (ancestor) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (
          ancestor.hidden
          || ancestor.inert
          || ancestor.getAttribute("aria-hidden") === "true"
          ||
          ancestorStyle.display === "none"
          || ancestorStyle.visibility === "hidden"
          || paintIsCollapsed(ancestorStyle)
          || Number(ancestorStyle.opacity || 1) <= 0
        ) return false;
        const bounds = ancestor.getBoundingClientRect();
        const outsideInline = rect.right <= bounds.left + 0.5 || rect.left >= bounds.right - 0.5;
        const outsideBlock = rect.bottom <= bounds.top + 0.5 || rect.top >= bounds.bottom - 0.5;
        if (paintOccludingOverflows.includes(ancestorStyle.overflowX) && outsideInline) return false;
        if (paintOccludingOverflows.includes(ancestorStyle.overflowY) && outsideBlock) return false;
        ancestor = ancestor.parentElement;
      }
      if (
        ["absolute", "fixed"].includes(style.position)
        && (rect.right <= 0 || rect.bottom <= 0)
      ) return false;
      return true;
    };
    const paintedRect = (element) => {
      const source = element.getBoundingClientRect();
      const rect = {
        left: source.left,
        right: source.right,
        top: source.top,
        bottom: source.bottom,
      };
      let ancestor = element.parentElement;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (["hidden", "clip", "auto", "scroll"].includes(style.overflowX)) {
          rect.left = Math.max(rect.left, bounds.left);
          rect.right = Math.min(rect.right, bounds.right);
        }
        if (["hidden", "clip", "auto", "scroll"].includes(style.overflowY)) {
          rect.top = Math.max(rect.top, bounds.top);
          rect.bottom = Math.min(rect.bottom, bounds.bottom);
        }
        ancestor = ancestor.parentElement;
      }
      rect.width = Math.max(0, rect.right - rect.left);
      rect.height = Math.max(0, rect.bottom - rect.top);
      return rect;
    };
    const visuallyClipped = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const classes = String(element.className ?? "");
      if (/\b(?:visually-hidden|sr-only|screen-reader-only)\b/.test(classes)) return true;
      const clippedByPaint = style.clip !== "auto"
        || (style.clipPath !== "none" && style.clipPath !== "");
      const collapsedBox = rect.width <= 2 && rect.height <= 2;
      return collapsedBox
        && ["absolute", "fixed"].includes(style.position)
        && (clippedByPaint || ["hidden", "clip"].includes(style.overflow));
    };
    const root = [...document.querySelectorAll(rootSelector)].find(visible);
    if (!root) throw new Error(`Audit root is not visible: ${rootSelector}`);

    const rectOf = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        right: round(rect.right),
        bottom: round(rect.bottom),
      };
    };
    const textOf = (element) => String(element.innerText ?? element.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    const nodeId = (element, index = 0) => {
      if (element.id) return `#${element.id}`;
      const dataKey = [
        "dashboardMode",
        "panelId",
        "fieldId",
        "presentationControlId",
        "action",
        "authoringSurface",
      ].find((key) => element.dataset?.[key]);
      if (dataKey) return `[data-${dataKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${element.dataset[dataKey]}"]`;
      const classes = [...element.classList].slice(0, 2).join(".");
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}:nth(${index})`;
    };
    const pixels = (value) => {
      const number = Number.parseFloat(value);
      return Number.isFinite(number) ? round(number) : null;
    };
    const renderedTextLineCount = (element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.textContent.trim() && visible(node.parentElement)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      });
      const lineTops = [];
      let node = walker.nextNode();
      while (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (!lineTops.some((top) => Math.abs(top - rect.top) <= 1)) lineTops.push(rect.top);
        }
        node = walker.nextNode();
      }
      return lineTops.length;
    };
    const controlRole = (element) => {
      const tag = element.tagName.toLowerCase();
      const type = String(element.getAttribute("type") ?? "").toLowerCase();
      const role = String(element.getAttribute("role") ?? "").toLowerCase();
      const classes = String(element.className ?? "");
      const text = textOf(element);
      const rect = element.getBoundingClientRect();
      const explicitRole = String(
        element.dataset.densityRole
        ?? element.dataset.simexControlRole
        ?? "",
      ).toLowerCase();
      if (Object.hasOwn(roleHeights, explicitRole) || explicitRole === "content") return explicitRole;
      if (["checkbox", "radio"].includes(type) || ["checkbox", "radio"].includes(role)) return "glyph";
      const override = roleOverrides.find(({ selector }) => element.matches(selector));
      if (override) return override.role;
      if (
        tag === "textarea"
        || type === "range"
        || type === "file"
        || (tag === "select" && (element.multiple || Number(element.size) > 1))
      ) return "content";
      if (
        tag === "a"
        && !["button", "menuitem", "tab"].includes(role)
        && !/button|control|action/.test(classes)
      ) return "content";
      const childRects = [...element.children]
        .filter(visible)
        .map((child) => child.getBoundingClientRect());
      const childBands = [];
      for (const childRect of childRects) {
        const band = childBands.find((candidate) => (
          Math.min(candidate.bottom, childRect.bottom) - Math.max(candidate.top, childRect.top) > 1
        ));
        if (band) {
          band.top = Math.min(band.top, childRect.top);
          band.bottom = Math.max(band.bottom, childRect.bottom);
        } else {
          childBands.push({ top: childRect.top, bottom: childRect.bottom });
        }
      }
      const nestedControls = element.querySelector([
        "button",
        "input:not([type='hidden'])",
        "select",
        "textarea",
        "[role='button']",
      ].join(","));
      if (
        tag === "button"
        && (
          element.dataset.action === "open-content"
          || /content-card|card-button|choice-card|dashboard-card|tile-button|chart-type-card/.test(classes)
          || Boolean(nestedControls)
          || (rect.height > 48 && childBands.length > 1)
          || (
            renderedTextLineCount(element) > 1
            && Boolean(element.closest(".dashboard-dialog__actions"))
          )
        )
      ) return "content";
      if (tag === "button" && /(?:^|[-_])(?:breadcrumb|repair-link|link-button)(?:$|[-_])/.test(classes)) {
        return "content";
      }
      if (
        ["menuitem", "option", "tab"].includes(role)
        || /menu-row|choice-row|compact-action/.test(classes)
      ) return "compact";
      if (
        /prominent|destructive|danger|primary-action/.test(classes)
        || (tag === "button" && /^(delete|discard|clear|save changes|create chart|load package)$/i.test(text))
      ) return "prominent";
      if (
        tag === "button"
        && element.closest(".settings-color-popover")
        && rect.height > roleHeights.prominent + 2
      ) return "content";
      if (
        tag === "button"
        && element.closest(".portable-qmd-composer__toolbar")
      ) return "utility";
      if (
        /simex-icon-control|icon-button|close-button|__close/.test(classes)
        || (tag === "button" && text.length === 0)
      ) return "utility";
      return "standard";
    };
    const styleRecord = (element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        position: style.position,
        fontSize: pixels(style.fontSize),
        lineHeight: pixels(style.lineHeight),
        minHeight: pixels(style.minHeight),
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(pixels),
        gap: pixels(style.gap),
        rowGap: pixels(style.rowGap),
        columnGap: pixels(style.columnGap),
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        flexWrap: style.flexWrap,
      };
    };
    const traversalQueries = [];
    const descendants = (selector, limit = Infinity) => {
      const matched = [...root.querySelectorAll(selector)].filter(visible);
      const captured = matched.slice(0, limit);
      traversalQueries.push({
        selector,
        matched: matched.length,
        captured: captured.length,
        truncated: captured.length < matched.length,
      });
      return captured;
    };

    const controlNodes = descendants([
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "a[href]",
      "[role='button']",
      "[role='menuitem']",
      "[role='option']",
      "[role='tab']",
      "[role='switch']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='combobox']",
    ].join(","), 500);
    const controls = controlNodes.map((element, index) => {
      const role = controlRole(element);
      return {
        id: nodeId(element, index),
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute("type") ?? null,
        text: textOf(element),
        role,
        expectedHeight: roleHeights[role] ?? null,
        rect: rectOf(element),
        style: styleRecord(element),
      };
    });
    const crownRows = descendants([
      ".command-crown-mode-row",
      ".dashboard-identity-row",
      ".build-page-navigation",
    ].join(","), 20);
    controls.push(...crownRows.map((element, index) => ({
      id: `${nodeId(element, index)}:row`,
      tag: element.tagName.toLowerCase(),
      type: null,
      text: textOf(element),
      role: "crown",
      expectedHeight: roleHeights.crown,
      rect: rectOf(element),
      style: styleRecord(element),
    })));

    const textLineGeometry = (label) => {
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.textContent.trim() && visible(node.parentElement)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      });
      const rects = [];
      let node = walker.nextNode();
      while (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        rects.push(...range.getClientRects());
        node = walker.nextNode();
      }
      if (!rects.length) return { first: label.getBoundingClientRect(), lineCount: 0 };
      rects.sort((left, right) => left.top - right.top || left.left - right.left);
      const lines = [];
      for (const rect of rects) {
        if (!lines.some((top) => Math.abs(top - rect.top) <= 1)) lines.push(rect.top);
      }
      return { first: rects[0], lineCount: lines.length };
    };
    const textBounds = (element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.textContent.trim() && visible(node.parentElement)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      });
      const rects = [];
      let node = walker.nextNode();
      while (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        rects.push(...range.getClientRects());
        node = walker.nextNode();
      }
      if (!rects.length) return element.getBoundingClientRect();
      return {
        left: Math.min(...rects.map(({ left }) => left)),
        right: Math.max(...rects.map(({ right }) => right)),
        top: Math.min(...rects.map(({ top }) => top)),
        bottom: Math.max(...rects.map(({ bottom }) => bottom)),
      };
    };
    const choiceNodes = controlNodes.filter((element) => {
      const type = String(element.getAttribute("type") ?? "").toLowerCase();
      const role = String(element.getAttribute("role") ?? "").toLowerCase();
      return ["checkbox", "radio"].includes(type) || ["checkbox", "radio"].includes(role);
    });
    const choices = choiceNodes.map((glyph, index) => {
      const label = glyph.labels?.[0]
        ?? (glyph.id ? root.querySelector(`label[for="${CSS.escape(glyph.id)}"]`) : null)
        ?? glyph.closest("label")
        ?? glyph.parentElement?.querySelector("label")
        ?? glyph.nextElementSibling;
      const row = glyph.closest([
        ".dashboard-authoring-boolean-row",
        ".present-chart-choice",
        ".choice-row",
        ".checkbox-row",
        ".radio-row",
        "label",
      ].join(",")) ?? glyph.parentElement;
      const glyphRect = glyph.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const lineGeometry = label ? textLineGeometry(label) : null;
      const lineRect = lineGeometry?.first ?? null;
      return {
        id: nodeId(glyph, index),
        text: label ? textOf(label) : "",
        glyphRect: rectOf(glyph),
        labelRect: label && visible(label) ? rectOf(label) : null,
        rowRect: row && visible(row) ? rectOf(row) : rectOf(glyph),
        glyphWidth: round(glyphRect.width),
        glyphHeight: round(glyphRect.height),
        rowHeight: row ? round(row.getBoundingClientRect().height) : round(glyphRect.height),
        singleLine: lineGeometry?.lineCount === 1,
        hasSupplementalCopy: Boolean(row && [...row.querySelectorAll(
          ".dashboard-authoring-boolean-copy > small, .dashboard-authoring-boolean-copy > [role='alert'], small, [role='alert']",
        )].some(visible)),
        centrelineDelta: lineRect
          ? round(Math.abs((glyphRect.top + glyphRect.height / 2) - (lineRect.top + lineRect.height / 2)))
          : null,
      };
    });

    const groupSelector = [
      "fieldset",
      "form",
      "[role='group']",
      "[role='toolbar']",
      "[class*='form-group']",
      "[class*='field-group']",
      "[class*='toolbar']",
      "[class*='actions']",
      "[class*='controls']",
    ].join(",");
    const groupNodes = descendants(groupSelector, 300);
    const gapValues = (node) => {
      const children = [...node.children].filter(visible);
      const rects = children.map((child) => child.getBoundingClientRect());
      const gaps = [];
      for (const a of rects) {
        const right = rects
          .filter((b) => b !== a
            && b.left >= a.right - 0.5
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
          .sort((left, rightCandidate) => left.left - rightCandidate.left)[0];
        if (right) {
          const gap = right.left - a.right;
          if (gap > 0.5) gaps.push(round(gap));
        }
        const below = rects
          .filter((b) => b !== a
            && b.top >= a.bottom - 0.5
            && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1)
          .sort((top, bottomCandidate) => top.top - bottomCandidate.top)[0];
        if (below) {
          const gap = below.top - a.bottom;
          if (gap > 0.5) gaps.push(round(gap));
        }
      }
      return [...new Set(gaps)].slice(0, 20);
    };
    const rhythms = groupNodes.map((node, index) => {
      const style = getComputedStyle(node);
      return {
        id: nodeId(node, index),
        gaps: gapValues(node),
        declaredGap: pixels(style.gap),
        panelPadding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(pixels),
      };
    });

    const layoutNodes = descendants("div,section,header,footer,nav,form,fieldset,[role='group'],[role='toolbar']", 500)
      .filter((node) => ["flex", "grid", "inline-flex", "inline-grid"].includes(getComputedStyle(node).display));
    const layoutRows = (node) => {
      const rects = [...node.children].filter(visible).map((child) => child.getBoundingClientRect());
      const rows = [];
      for (const rect of rects) {
        let row = rows.find((candidate) => (
          Math.min(candidate.bottom, rect.bottom) - Math.max(candidate.top, rect.top) > 1
        ));
        if (!row) {
          row = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
          rows.push(row);
        } else {
          row.top = Math.min(row.top, rect.top);
          row.bottom = Math.max(row.bottom, rect.bottom);
          row.left = Math.min(row.left, rect.left);
          row.right = Math.max(row.right, rect.right);
        }
      }
      return rows;
    };
    const wraps = [];
    const whitespace = [];
    const occupancies = [];
    layoutNodes.forEach((node, index) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const children = [...node.children].filter(visible);
      const rows = layoutRows(node);
      const isRowFlex = ["flex", "inline-flex"].includes(style.display)
        && style.flexDirection.startsWith("row");
      const controlCount = children.filter((child) => child.matches?.("button,input,select,textarea,[role='button'],[role='tab']") || child.querySelector?.("button,input,select,textarea,[role='button'],[role='tab']")).length;
      const maxRowWidth = rows.length ? Math.max(...rows.map((row) => row.right - row.left)) : 0;
      const occupiedWidth = rows.length ? Math.max(...rows.map((row) => row.right)) - Math.min(...rows.map((row) => row.left)) : 0;
      const occupiedRatio = rect.width > 0 ? round(Math.min(1, occupiedWidth / rect.width)) : 1;
      const overlappingChildren = children.some((child, childIndex) => {
        const a = child.getBoundingClientRect();
        return children.slice(childIndex + 1).some((other) => {
          const b = other.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        });
      });
      const crowded = node.scrollWidth > node.clientWidth + 2
        || (isRowFlex && rows.length > 1 && controlCount >= 2)
        || overlappingChildren;
      if (isRowFlex && (rows.length > 1 || style.flexWrap !== "nowrap")) {
        wraps.push({
          id: nodeId(node, index),
          rowCount: rows.length,
          unexpected: rows.length > 1
            && controlCount >= 2
            && node.dataset.densityWrapIntent !== "allowed",
          flexWrap: style.flexWrap,
        });
      }
      if (controlCount >= 2 && isRowFlex) {
        whitespace.push({
          id: nodeId(node, index),
          strandedInlineSpace: round(Math.max(0, rect.width - maxRowWidth)),
          occupiedRatio,
          crowded,
        });
      }
      if (controlCount >= 3) {
        occupancies.push({ id: nodeId(node, index), occupiedRatio, crowded });
      }
    });

    const overlapCandidates = controlNodes.slice(0, 250);
    const overlaps = [];
    overlapCandidates.forEach((first, firstIndex) => {
      const a = paintedRect(first);
      if (a.width <= 1 || a.height <= 1) return;
      overlapCandidates.slice(firstIndex + 1).forEach((second, offset) => {
        if (first.contains(second) || second.contains(first)) return;
        if (controlRole(first) === "glyph" || controlRole(second) === "glyph") return;
        const b = paintedRect(second);
        if (b.width <= 1 || b.height <= 1) return;
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > 1 && height > 1) {
          overlaps.push({
            first: nodeId(first, firstIndex),
            second: nodeId(second, firstIndex + offset + 1),
            area: round(width * height),
          });
        }
      });
    });

    const clippingTextSelector = [
      "h1", "h2", "h3", "h4", "h5", "h6", "legend", "label", "p", "small",
      "[role='alert']", "[role='status']", "[class*='helper']", "[class*='error']",
    ].join(",");
    const intentionallyTruncated = (element) => {
      let node = element;
      while (node && node !== root.parentElement) {
        const style = getComputedStyle(node);
        const classes = String(node.className ?? "");
        if (
          style.textOverflow === "ellipsis"
          || /\b(?:truncate|truncated|ellipsis)\b/.test(classes)
          || (node.hasAttribute("data-full-value") && Boolean(node.getAttribute("title")))
        ) return true;
        node = node.parentElement;
      }
      return false;
    };
    const clippingCandidates = [...new Set([...controlNodes, ...descendants(clippingTextSelector, 800)])]
      .filter((element) => !visuallyClipped(element))
      .filter((element) => !element.matches(".image-crop-handle"))
      .filter((element) => !element.matches(clippingTextSelector) || !intentionallyTruncated(element));
    const clippedElements = clippingCandidates.flatMap((element, index) => {
      const rect = element.matches(clippingTextSelector)
        ? textBounds(element)
        : element.getBoundingClientRect();
      const elementId = nodeId(element, index);
      const position = getComputedStyle(element).position;
      let blockScrollReachable = false;
      let inlineScrollReachable = false;
      const records = [];
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== root.parentElement) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (["auto", "scroll"].includes(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 2) {
          blockScrollReachable = true;
        }
        if (["auto", "scroll"].includes(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 2) {
          inlineScrollReachable = true;
        }
        const ownerAxes = [];
        if (
          !inlineScrollReachable
          && ["hidden", "clip"].includes(style.overflowX)
          && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
        ) ownerAxes.push("inline");
        if (
          !blockScrollReachable
          &&
          ["hidden", "clip"].includes(style.overflowY)
          && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)
        ) ownerAxes.push("block");
        if (ownerAxes.length) {
          records.push({
            id: `${elementId}@${nodeId(ancestor, index)}`,
            clippingOwner: nodeId(ancestor, index),
            axes: ownerAxes,
            scrollReachable: false,
          });
        }
        ancestor = ancestor.parentElement;
      }
      const viewportAxes = [];
      if (rect.left < -1 || rect.right > innerWidth + 1) viewportAxes.push("viewport-inline");
      if (rect.top < -1 || rect.bottom > innerHeight + 1) viewportAxes.push("viewport-block");
      if (viewportAxes.length) {
        records.push({
          id: elementId,
          clippingOwner: "viewport",
          axes: viewportAxes,
          scrollReachable: blockScrollReachable || (
          !["fixed", "sticky"].includes(position)
          && rect.bottom <= Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) + 1
        ),
        });
      }
      return records;
    });

    const scrollContainers = descendants("*", 1500).filter((node) => !visuallyClipped(node)).flatMap((node, index) => {
      if (node.matches(".image-crop-preview")) return [];
      const style = getComputedStyle(node);
      const nodeBounds = node.getBoundingClientRect();
      const descendantRectWithin = (descendant) => {
        const source = descendant.getBoundingClientRect();
        const rect = {
          left: source.left,
          right: source.right,
          top: source.top,
          bottom: source.bottom,
        };
        let ancestor = descendant.parentElement;
        while (ancestor && ancestor !== node) {
          const ancestorStyle = getComputedStyle(ancestor);
          const bounds = ancestor.getBoundingClientRect();
          if (["hidden", "clip", "auto", "scroll"].includes(ancestorStyle.overflowX)) {
            rect.left = Math.max(rect.left, bounds.left);
            rect.right = Math.min(rect.right, bounds.right);
          }
          if (["hidden", "clip", "auto", "scroll"].includes(ancestorStyle.overflowY)) {
            rect.top = Math.max(rect.top, bounds.top);
            rect.bottom = Math.min(rect.bottom, bounds.bottom);
          }
          ancestor = ancestor.parentElement;
        }
        if (ancestor !== node) return null;
        rect.width = Math.max(0, rect.right - rect.left);
        rect.height = Math.max(0, rect.bottom - rect.top);
        return rect;
      };
      const visibleDescendantBounds = [...node.querySelectorAll("*")]
        .filter(visible)
        .map(descendantRectWithin)
        .filter((rect) => rect?.width > 0 && rect?.height > 0);
      const explicitTextScroller = ["pre", "code", "table"].includes(node.tagName.toLowerCase())
        || Boolean(node.querySelector(":scope > pre, :scope > code, :scope > table"));
      const paintedOverflowX = visibleDescendantBounds.length
        ? Math.max(0, ...visibleDescendantBounds.map((bounds) => bounds.right - nodeBounds.right))
        : 0;
      const paintedOverflowY = visibleDescendantBounds.length
        ? Math.max(0, ...visibleDescendantBounds.map((bounds) => bounds.bottom - nodeBounds.bottom))
        : 0;
      const overflowX = explicitTextScroller
        ? Math.max(0, node.scrollWidth - node.clientWidth)
        : paintedOverflowX;
      const overflowY = explicitTextScroller
        ? Math.max(0, node.scrollHeight - node.clientHeight)
        : paintedOverflowY;
      if (overflowX <= 2 && overflowY <= 2) return [];
      if (!["auto", "scroll", "hidden", "clip"].includes(style.overflowX) && !["auto", "scroll", "hidden", "clip"].includes(style.overflowY)) return [];
      let topReachable = null;
      let bottomReachable = null;
      if (overflowY > 2 && ["auto", "scroll"].includes(style.overflowY)) {
        const originalScrollTop = node.scrollTop;
        const maximumScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
        node.scrollTop = 0;
        topReachable = node.scrollTop <= 1;
        node.scrollTop = node.scrollHeight;
        bottomReachable = Math.abs(node.scrollTop - maximumScrollTop) <= 1;
        node.scrollTop = originalScrollTop;
      }
      return [{
        id: nodeId(node, index),
        overflowX: round(overflowX),
        overflowY: round(overflowY),
        modeX: style.overflowX,
        modeY: style.overflowY,
        topReachable,
        bottomReachable,
        allowsHorizontal: node.dataset.allowHorizontalScroll === "true"
          || style.textOverflow === "ellipsis"
          || explicitTextScroller,
      }];
    });

    const titleNodes = descendants("h1,h2,h3,h4,h5,h6,legend,[class*='subtitle'],[class*='section-title'],[class*='dialog-title']", 300)
      .filter((node) => textOf(node).length > 0 && textOf(node).length <= 120);
    const titleRecords = titleNodes.map((node, index) => ({
      node,
      scope: node.closest("fieldset, section, [role='dialog'], [role='group'], aside, article") ?? root,
      heading: {
        id: nodeId(node, index),
        text: textOf(node),
        normalizedText: textOf(node).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(),
        tag: node.tagName.toLowerCase(),
        rect: rectOf(node),
      },
    }));
    const headings = titleRecords.map(({ heading }) => heading);
    const repeatedTitles = [];
    const titleGroups = [];
    titleRecords.forEach((record) => {
      let group = titleGroups.find((candidate) => (
        candidate.normalizedText === record.heading.normalizedText
        && candidate.scope === record.scope
      ));
      if (!group) {
        group = { normalizedText: record.heading.normalizedText, scope: record.scope, records: [] };
        titleGroups.push(group);
      }
      group.records.push(record);
    });
    titleGroups.forEach(({ records, normalizedText }) => {
      const distinct = [];
      for (const record of records) {
        if (distinct.some((existing) => (
          existing.node.contains(record.node) || record.node.contains(existing.node)
        ))) continue;
        distinct.push(record);
      }
      if (distinct.length > 1) {
        repeatedTitles.push({
          owner: metadata.id,
          text: distinct[0].heading.text,
          normalizedText,
          ids: distinct.map(({ heading }) => heading.id),
        });
      }
    });

    const parseColor = (value) => {
      const source = String(value ?? "").trim().toLowerCase();
      const components = source.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      if (source.startsWith("color(srgb") && components.length >= 3) {
        return {
          r: Math.max(0, Math.min(255, components[0] * 255)),
          g: Math.max(0, Math.min(255, components[1] * 255)),
          b: Math.max(0, Math.min(255, components[2] * 255)),
          a: Math.max(0, Math.min(1, components[3] ?? 1)),
        };
      }
      if (!source.startsWith("rgb") || components.length < 3) return null;
      return {
        r: Math.max(0, Math.min(255, components[0])),
        g: Math.max(0, Math.min(255, components[1])),
        b: Math.max(0, Math.min(255, components[2])),
        a: Math.max(0, Math.min(1, components[3] ?? 1)),
      };
    };
    const compositeColor = (foreground, background) => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha <= 0) return { r: 255, g: 255, b: 255, a: 1 };
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      };
    };
    const effectiveBackground = (element) => {
      const layers = [];
      let hasImage = false;
      let node = element;
      while (node) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== "none") hasImage = true;
        const layer = parseColor(style.backgroundColor);
        if (layer && layer.a > 0) layers.push(layer);
        if (layer?.a >= 0.995) break;
        node = node.parentElement;
      }
      let color = { r: 255, g: 255, b: 255, a: 1 };
      layers.reverse().forEach((layer) => {
        color = compositeColor(layer, color);
      });
      return { color, hasImage };
    };
    const linearChannel = (value) => {
      const normalized = value / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color) => (
      0.2126 * linearChannel(color.r)
      + 0.7152 * linearChannel(color.g)
      + 0.0722 * linearChannel(color.b)
    );
    const contrastRatio = (first, second) => {
      const light = Math.max(luminance(first), luminance(second));
      const dark = Math.min(luminance(first), luminance(second));
      return (light + 0.05) / (dark + 0.05);
    };
    const colorText = ({ r, g, b, a }) => `rgba(${round(r)}, ${round(g)}, ${round(b)}, ${round(a)})`;
    const contrastSelector = [
      "h1", "h2", "h3", "h4", "h5", "h6", "legend", "label", "p", "small", "button",
      "[class*='notice']", "[class*='warning']", "[class*='status']", "[class*='error']",
    ].join(",");
    const operationalContrastSamples = descendants(contrastSelector, 700)
      .filter((element) => textOf(element).length > 0)
      .flatMap((element, index) => {
        const style = getComputedStyle(element);
        const foreground = parseColor(style.color);
        const background = effectiveBackground(element);
        if (!foreground || background.hasImage) return [];
        const paintedForeground = compositeColor(foreground, background.color);
        const ratio = round(contrastRatio(paintedForeground, background.color));
        return [{
          id: nodeId(element, index),
          text: textOf(element).slice(0, 90),
          ratio,
          foreground: colorText(paintedForeground),
          background: colorText(background.color),
          state: element.matches(":disabled, [disabled]") ? "disabled" : "available",
        }];
      });
    const operationalContrastCandidates = operationalContrastSamples
      .filter(({ ratio }) => ratio < 2.25)
      .sort((left, right) => left.ratio - right.ratio)
      .slice(0, 24);

    const visibleSemanticNodes = descendants([
      "h1", "h2", "h3", "h4", "h5", "h6", "legend", "label", "button",
      "[class*='notice']", "[class*='warning']", "[class*='status']", "[class*='error']",
    ].join(","), 700).filter((element) => textOf(element).length > 0);
    const semanticFaults = [
      { signal: "object-stringification", pattern: /\[object Object\]/i },
      { signal: "unresolved-value", pattern: /(?:^|\s)(?:undefined|NaN)(?:$|[\s.,;:!?])/i },
      { signal: "null-value", pattern: /^null$/i },
      { signal: "placeholder-copy", pattern: /\blorem ipsum\b/i },
      { signal: "unfinished-copy", pattern: /\bTODO\b/ },
      { signal: "unresolved-template", pattern: /(?:\{\{[^{}]+\}\}|\$\{[^{}]+\})/ },
    ];
    const visibleSemanticsCandidates = visibleSemanticNodes.flatMap((element, index) => {
      const text = textOf(element);
      const fault = semanticFaults.find(({ pattern }) => pattern.test(text));
      return fault ? [{ id: nodeId(element, index), text, signal: fault.signal }] : [];
    }).slice(0, 24);
    const visibleStateTextCount = visibleSemanticNodes.filter((element) => (
      /notice|warning|status|error/.test(String(element.className ?? ""))
    )).length;

    const regionSelectors = (region) => [region.selector, ...(region.liveSelectors ?? [])]
      .filter(Boolean);
    const visiblePortalRoots = ownedRegions
      .filter(({ lifecycle }) => lifecycle === "portal")
      .flatMap(regionSelectors)
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .filter(visible);
    const applicationOwner = root.closest(applicationOwnerSelector)
      ?? document.querySelector(applicationOwnerSelector);
    const explicitPortalElements = [...document.querySelectorAll(explicitPortalSelector)];
    const applicationPortalElements = applicationOwner
      ? [...applicationOwner.querySelectorAll(externalPortalQuery)]
      : [];
    const externalPortalElements = [...new Set([
      ...explicitPortalElements,
      ...applicationPortalElements,
    ])].filter((element) => {
      if (!visible(element) || root === element || root.contains(element)) return false;
      const style = getComputedStyle(element);
      const tag = element.tagName.toLowerCase();
      const role = String(element.getAttribute("role") ?? "").toLowerCase();
      const withinApplicationOwner = Boolean(applicationOwner?.contains(element));
      const explicitDashboardOwnership = element.matches(explicitPortalSelector);
      let topLayer = false;
      try {
        topLayer = element.matches(":modal, :popover-open");
      } catch {
        topLayer = false;
      }
      return (withinApplicationOwner || explicitDashboardOwnership) && (
        explicitDashboardOwnership
        || topLayer
        || tag === "dialog"
        || ["dialog", "menu", "listbox"].includes(role)
        || style.position === "fixed"
      );
    });
    const scopeRoots = [...new Set([root, ...visiblePortalRoots, ...externalPortalElements])];
    const isInScope = (element) => scopeRoots.some((scope) => (
      scope === element || scope.contains(element) || element.contains(scope)
    ));
    const distanceTo = (element, boundary) => {
      let distance = 0;
      let current = element;
      while (current && current !== boundary) {
        current = current.parentElement;
        distance += 1;
      }
      return current === boundary ? distance : null;
    };
    const directStyleRuleMatches = (element, variableName) => {
      const matches = [];
      const visit = (ruleList) => {
        for (const rule of [...(ruleList ?? [])]) {
          if (typeof rule.selectorText === "string" && rule.style) {
            const backgroundImage = rule.style.getPropertyValue("background-image").trim();
            if (backgroundImage.includes(`var(${variableName})`)) {
              try {
                if (element.matches(rule.selectorText)) {
                  matches.push(`${rule.selectorText} -> ${backgroundImage}`);
                }
              } catch {
                // Ignore selectors unsupported by the current browser engine.
              }
            }
          }
          try {
            if (rule.cssRules) visit(rule.cssRules);
          } catch {
            // Ignore inaccessible cross-origin or conditional rule lists.
          }
        }
      };
      for (const styleSheet of [...document.styleSheets]) {
        try {
          visit(styleSheet.cssRules);
        } catch {
          // Only same-origin dashboard stylesheets can prove owned-region paint.
        }
      }
      return [...new Set(matches)].slice(0, 8);
    };
    const mountedRegionElements = ownedRegions.flatMap((region) => {
      const elements = [...new Set(regionSelectors(region)
        .flatMap((selector) => [...document.querySelectorAll(selector)]))]
        .filter((element) => visible(element) && isInScope(element));
      return elements.map((element) => ({
          regionId: region.id,
          element,
          role: element.dataset.dashboardSurfaceRole ?? region.role,
          material: element.dataset.dashboardMaterial ?? region.material,
          roleRuleMatches: directStyleRuleMatches(
            element,
            `--simex-role-${region.role}-background`,
          ),
          materialRuleMatches: region.material === "flat"
            ? []
            : directStyleRuleMatches(
                element,
                `--simex-material-${region.material}-background`,
              ),
        }));
    });
    const candidateElements = [...scopeRoots.flatMap((scope) => [
      scope,
      ...scope.querySelectorAll([
        "section", "header", "nav", "aside", "[role='toolbar']", "[role='navigation']",
        "[role='dialog']", "[role='menu']", "[role='status']", "table", "[data-dashboard-region]",
        "[data-dashboard-surface-role='chart-cell']", "[data-dashboard-material]",
      ].join(",")),
    ]), ...externalPortalElements].filter((element) => visible(element));
    const discoveredRegionCandidateElements = new Set();
    const regionCandidates = [...new Set(candidateElements)].flatMap((element, index) => {
      const style = getComputedStyle(element);
      const signals = [];
      const tag = element.tagName.toLowerCase();
      const role = String(element.getAttribute("role") ?? "").toLowerCase();
      if (["section", "header", "nav", "aside"].includes(tag) || element.hasAttribute("aria-label") || element.hasAttribute("data-dashboard-region")) signals.push("named-structure");
      if (["toolbar", "navigation"].includes(role) || tag === "nav") signals.push("toolbar-navigation");
      if (["sticky", "fixed"].includes(style.position)) signals.push("sticky-fixed");
      const hasVisibleBorder = ["top", "right", "bottom", "left"].some((side) => (
        visibleBorderDepth({
          width: Number.parseFloat(style.getPropertyValue(`border-${side}-width`)),
          style: style.getPropertyValue(`border-${side}-style`),
          color: style.getPropertyValue(`border-${side}-color`),
        }) > 0
      ));
      if (
        !colorIsTransparent(style.backgroundColor)
        || hasBackgroundImagePaint(style.backgroundImage)
        || hasVisibleBorder
        || style.boxShadow !== "none"
      ) signals.push("distinct-paint");
      const directActions = [...element.children].filter((child) => child.matches("button, a[href], [role='button'], [role='menuitem']") && visible(child));
      if (directActions.length >= 2) signals.push("multi-action");
      if (role === "dialog" || tag === "dialog" || element.getAttribute("aria-modal") === "true") signals.push("dialog");
      if (/drawer/.test(String(element.className ?? ""))) signals.push("drawer");
      if (role === "menu" || role === "listbox") signals.push("menu");
      if (role === "status" || /status|notice|warning|error/.test(String(element.className ?? ""))) signals.push("status");
      if (tag === "table" || /table/.test(String(element.className ?? ""))) signals.push("table");
      if (element.dataset.dashboardSurfaceRole === "chart-cell") signals.push("chart-cell");
      if (!signals.length) return [];
      discoveredRegionCandidateElements.add(element);
      const containingRegions = mountedRegionElements.flatMap(({ regionId, element: boundary }) => {
        const distance = distanceTo(element, boundary);
        return distance === null ? [] : [{ regionId, distance }];
      });
      return [{
        id: nodeId(element, index),
        signals: [...new Set(signals)],
        containingRegions,
        exemption: null,
      }];
    });

    const numericStyleValue = (value) => {
      const number = Number.parseFloat(value);
      return Number.isFinite(number) && number > 0 ? round(number) : 0;
    };
    const optionalNumericStyleValue = (value) => {
      const source = String(value ?? "").trim();
      if (!source) return null;
      const number = Number.parseFloat(source);
      return Number.isFinite(number) && number >= 0 ? round(number) : null;
    };
    const edgeClearanceExemptions = (element) => new Set(
      String(
        element.getAttribute("data-density-edge-clearance-exempt")
        ?? element.getAttribute("data-edge-clearance-exempt")
        ?? "",
      ).split(/\s*,\s*/).filter(Boolean),
    );
    const paintedEdges = (element) => {
      const style = getComputedStyle(element);
      const direction = style.direction === "rtl" ? "rtl" : "ltr";
      const physicalInlineStart = direction === "rtl" ? "right" : "left";
      const physicalInlineEnd = direction === "rtl" ? "left" : "right";
      const localDepth = (edge) => optionalNumericStyleValue(
        style.getPropertyValue(`--simex-decorated-edge-${edge}`),
      );
      const customDepth = (edge) => {
        const local = localDepth(edge);
        const styleDepth = optionalNumericStyleValue(
          style.getPropertyValue(`--simex-style-edge-${edge}`),
        ) ?? 0;
        return {
          depth: edgeDepthOverride({ localDepth: local, styleDepth }),
          hasDecorationPaint: customEdgePaintIsVisible({
            backgroundImage: style.backgroundImage,
            boxShadow: style.boxShadow,
            allowBoxShadow: local !== null,
          }),
        };
      };
      const borderDepth = (side) => visibleBorderDepth({
        width: numericStyleValue(style.getPropertyValue(`border-${side}-width`)),
        style: style.getPropertyValue(`border-${side}-style`),
        color: style.getPropertyValue(`border-${side}-color`),
      });
      const records = [
        {
          edge: "inline-start",
          side: physicalInlineStart,
          decorationDepth: (() => {
            const custom = customDepth("inline-start");
            return edgeDecorationDepth({
              borderDepth: borderDepth(physicalInlineStart),
              customDepth: custom.depth,
              hasLocalDecorationPaint: custom.hasDecorationPaint,
            });
          })(),
        },
        {
          edge: "inline-end",
          side: physicalInlineEnd,
          decorationDepth: (() => {
            const custom = customDepth("inline-end");
            return edgeDecorationDepth({
              borderDepth: borderDepth(physicalInlineEnd),
              customDepth: custom.depth,
              hasLocalDecorationPaint: custom.hasDecorationPaint,
            });
          })(),
        },
        {
          edge: "block-start",
          side: "top",
          decorationDepth: (() => {
            const custom = customDepth("block-start");
            return edgeDecorationDepth({
              borderDepth: borderDepth("top"),
              customDepth: custom.depth,
              hasLocalDecorationPaint: custom.hasDecorationPaint,
            });
          })(),
        },
        {
          edge: "block-end",
          side: "bottom",
          decorationDepth: (() => {
            const custom = customDepth("block-end");
            return edgeDecorationDepth({
              borderDepth: borderDepth("bottom"),
              customDepth: custom.depth,
              hasLocalDecorationPaint: custom.hasDecorationPaint,
            });
          })(),
        },
      ];
      const exemptions = edgeClearanceExemptions(element);
      return records
        .filter(({ decorationDepth }) => decorationDepth > 0)
        .map((record) => ({ ...record, exempt: exemptions.has(record.edge) }));
    };
    const explicitPaintedBoundaries = scopeRoots.flatMap((scope) => [
      ...scope.querySelectorAll("[data-dashboard-painted-boundary]"),
    ]);
    const boundaryElements = [...new Set([
      ...scopeRoots,
      ...mountedRegionElements.map(({ element }) => element),
      ...discoveredRegionCandidateElements,
      ...explicitPaintedBoundaries,
    ])].filter(visible);
    const decoratedBoundaries = new Map(boundaryElements.flatMap((element, index) => {
      const edges = paintedEdges(element);
      return edges.length ? [[element, { id: nodeId(element, index), element, edges }]] : [];
    }));
    const nearestDecoratedBoundary = (element) => {
      let current = element;
      while (current) {
        const boundary = decoratedBoundaries.get(current);
        if (boundary) return boundary;
        current = current.parentElement;
      }
      return null;
    };
    const clearanceAt = (rect, boundaryRect, side) => ({
      left: rect.left - boundaryRect.left,
      right: boundaryRect.right - rect.right,
      top: rect.top - boundaryRect.top,
      bottom: boundaryRect.bottom - rect.bottom,
    })[side];
    const edgeClearanceByBoundary = new Map();
    const recordClearance = (element, contentId, rect, contentKind = "text") => {
      const boundary = nearestDecoratedBoundary(
        clearanceBoundaryStart(element, { contentKind }),
      );
      if (!boundary || !rect || rect.width <= 0 || rect.height <= 0) return;
      const boundaryRect = boundary.element.getBoundingClientRect();
      for (const edge of boundary.edges) {
        const clearance = clearanceAt(rect, boundaryRect, edge.side);
        if (!Number.isFinite(clearance)) continue;
        const key = `${boundary.id}:${edge.edge}`;
        const record = edgeClearanceByBoundary.get(key) ?? {
          boundaryId: boundary.id,
          edge: edge.edge,
          decorationDepth: edge.decorationDepth,
          exempt: edge.exempt,
          clearances: [],
        };
        record.clearances.push({ contentId, clearance: round(clearance) });
        edgeClearanceByBoundary.set(key, record);
      }
    };
    const scopedControlNodes = [...new Set(scopeRoots.flatMap((scope) => (
      [...scope.querySelectorAll([
        "button", "input:not([type='hidden'])", "select", "textarea", "a[href]",
        "[role='button']", "[role='menuitem']", "[role='option']", "[role='tab']",
        "[role='switch']", "[role='checkbox']", "[role='radio']", "[role='combobox']",
      ].join(","))]
    )))].filter(visible);
    scopedControlNodes.forEach((element, index) => {
      recordClearance(element, nodeId(element, index), element.getBoundingClientRect(), "control");
    });
    const textClearanceNodes = [];
    const seenTextClearanceNodes = new Set();
    for (const scope of scopeRoots) {
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.textContent.trim() && visible(node.parentElement)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      });
      let node = walker.nextNode();
      while (node && textClearanceNodes.length < 1200) {
        if (!seenTextClearanceNodes.has(node)) {
          seenTextClearanceNodes.add(node);
          textClearanceNodes.push(node);
        }
        node = walker.nextNode();
      }
    }
    textClearanceNodes.forEach((node, index) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        recordClearance(node.parentElement, `${nodeId(node.parentElement, index)}:text`, rect);
      }
    });
    const edgeClearances = [...edgeClearanceByBoundary.values()];

    const rootRect = rectOf(root);
    return {
      surface: metadata,
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      root: {
        selector: rootSelector,
        tag: root.tagName.toLowerCase(),
        classes: [...root.classList],
        rect: rootRect,
        style: styleRecord(root),
      },
      scanCompleteness: {
        truncated: traversalQueries.some(({ truncated }) => truncated),
        truncations: traversalQueries.filter(({ truncated }) => truncated),
      },
      controls,
      choices,
      headings,
      rhythms,
      wraps,
      whitespace,
      overlaps,
      clippedElements,
      scrollContainers,
      repeatedTitles,
      occupancies,
      operationalContrastSamples: {
        measured: operationalContrastSamples.length,
        lowest: operationalContrastSamples
          .sort((left, right) => left.ratio - right.ratio)
          .slice(0, 5),
      },
      operationalContrastCandidates,
      visibleSemanticsCandidates,
      edgeClearances,
      regionCandidates,
      mountedRegions: mountedRegionElements.map(({ element, ...mounted }) => mounted),
      humanReview: {
        operationalContrast: {
          status: "required",
          prompt: "Judge whether selected, inactive, warning, destructive, and primary states remain immediately distinguishable in the existing colour profile; do not use this review to enlarge controls.",
        },
        visibleSemantics: {
          status: "required",
          prompt: "Judge visible label and action meaning, title/group hierarchy, icon meaning, chart units, state distinction, and destructive-action clarity.",
          visibleHeadingCount: headings.length,
          visibleStateTextCount,
        },
      },
    };
  }, {
    metadata: {
      id: entry.id,
      family: entry.family,
      owner: entry.owner,
      mode: entry.mode,
      state: entry.state,
      appearance: entry.appearance,
    },
    rootSelector: entry.root,
    roleHeights: ROLE_HEIGHTS,
    roleOverrides: DASHBOARD_DENSITY_ROLE_OVERRIDES,
    paintOccludingOverflows: DASHBOARD_DENSITY_PAINT_OCCLUDING_OVERFLOWS,
    ownedRegions: DASHBOARD_OWNED_REGION_REGISTRY,
    applicationOwnerSelector: DASHBOARD_DENSITY_APPLICATION_OWNER_SELECTOR,
    explicitPortalSelector: DASHBOARD_DENSITY_EXPLICIT_PORTAL_SELECTOR,
    externalPortalQuery: DASHBOARD_DENSITY_EXTERNAL_PORTAL_QUERY,
  });

  const regionCandidates = (snapshot.regionCandidates ?? []).map((candidate) => ({
    ...candidate,
    requiresOwnBoundary: dashboardRegionCandidateRequiresOwnBoundary(candidate.signals),
  }));
  const mountedRegions = (snapshot.mountedRegions ?? []).map((region) => ({
    ...region,
    styleSignature: dashboardRegionDirectStyleSignature(region),
  }));
  const density = classifyDashboardDensitySnapshot({ ...snapshot, regionCandidates, mountedRegions });
  return {
    ...density,
    regionCoverage: classifyDashboardRegionClosure({
      journeyId: entry.id,
      registry: DASHBOARD_OWNED_REGION_REGISTRY,
      candidates: regionCandidates,
      mountedRegions,
      knownJourneyIds: DASHBOARD_JOURNEY_MANIFEST.map(({ id }) => id),
    }),
  };
}

export function classifyDashboardDensitySnapshot(snapshot) {
  const findings = [];
  const add = (category, priority, evidence, recommendation) => {
    findings.push({
      id: `${snapshot.surface.id}:${category}:${findings.length + 1}`,
      surfaceId: snapshot.surface.id,
      owner: snapshot.surface.owner,
      category,
      priority,
      evidence,
      recommendation,
    });
  };

  for (const control of snapshot.controls ?? []) {
    if (!Number.isFinite(control.expectedHeight) || !Number.isFinite(control.rect?.height)) continue;
    const delta = Math.abs(control.rect.height - control.expectedHeight);
    if (delta > SIZE_TOLERANCE) {
      add(
        "role-size",
        delta >= 10 ? "P1" : "P2",
        `${control.id} is ${control.rect.height}px high; ${control.role} expects ${control.expectedHeight}px (±${SIZE_TOLERANCE}px).`,
        `Move ${control.id} to the shared ${control.role} height instead of preserving a local minimum.`,
      );
    }
  }

  for (const failure of classifyDashboardEdgeClearance({
    edges: snapshot.edgeClearances ?? [],
  })) {
    add(
      "edge-clearance",
      "P1",
      `${failure.boundaryId} ${failure.edge} decoration is ${failure.decorationDepth}px deep, but ${failure.contentId} has only ${failure.clearance}px clearance (${failure.requiredClearance}px required).`,
      `Inset ${failure.contentId} to at least ${failure.requiredClearance}px from the ${failure.edge} painted edge, or declare an explicit ${failure.edge} full-bleed exemption.`,
    );
  }

  const byRole = new Map();
  for (const control of snapshot.controls ?? []) {
    if (!Number.isFinite(control.rect?.height) || control.role === "content") continue;
    const values = byRole.get(control.role) ?? [];
    values.push(control);
    byRole.set(control.role, values);
  }
  for (const [role, controls] of byRole) {
    if (controls.length < 2) continue;
    const heights = controls.map(({ rect }) => rect.height);
    const variance = Math.max(...heights) - Math.min(...heights);
    if (variance > SIZE_TOLERANCE * 2) {
      add(
        "same-role-variance",
        "P1",
        `${controls.length} ${role} controls vary by ${round(variance)}px (${round(Math.min(...heights))}–${round(Math.max(...heights))}px).`,
        `Use one shared ${role} geometry and document any content-specific exception.`,
      );
    }
  }

  for (const choice of snapshot.choices ?? []) {
    const badGlyph = [choice.glyphWidth, choice.glyphHeight]
      .some((value) => Number.isFinite(value) && Math.abs(value - ROLE_HEIGHTS.glyph) > SIZE_TOLERANCE);
    const badRow = Number.isFinite(choice.rowHeight) && (
      choice.rowHeight < ROLE_HEIGHTS.compact - SIZE_TOLERANCE
      || (
        choice.singleLine
        && !choice.hasSupplementalCopy
        && Math.abs(choice.rowHeight - ROLE_HEIGHTS.compact) > SIZE_TOLERANCE
      )
    );
    const badCentre = Number.isFinite(choice.centrelineDelta) && choice.centrelineDelta > 1;
    if (badGlyph || badRow || badCentre) {
      add(
        "centreline",
        "P1",
        `${choice.id}: glyph ${choice.glyphWidth ?? "unmeasured"}×${choice.glyphHeight}px, row ${choice.rowHeight}px, centre-line delta ${choice.centrelineDelta ?? "unmeasured"}px.`,
        "Apply the shared 16px glyph / 28px row / 8px text-gap choice geometry.",
      );
    }
  }

  for (const rhythm of snapshot.rhythms ?? []) {
    const measuredAdjacentGaps = (rhythm.gaps ?? [])
      .filter((value) => value <= Math.max(...SPACING_SCALE) + SIZE_TOLERANCE);
    const values = [rhythm.declaredGap, ...measuredAdjacentGaps, ...(rhythm.panelPadding ?? [])]
      .filter((value) => Number.isFinite(value) && value > 0);
    const offScale = [...new Set(values.filter((value) => (
      !SPACING_SCALE.some((scaleValue) => Math.abs(value - scaleValue) <= 0.5)
    )).map(round))];
    if (offScale.length) {
      add(
        "rhythm",
        "P2",
        `${rhythm.id} uses off-scale spacing: ${offScale.join(", ")}px.`,
        "Map visible group gaps and padding to the shared 2/4/8/12/16/24/32px scale.",
      );
    }
  }

  for (const wrap of snapshot.wraps ?? []) {
    if (!wrap.unexpected) continue;
    add(
      "wrap",
      "P1",
      `${wrap.id} breaks into ${wrap.rowCount} rows without an intentional wrap contract.`,
      "Stack the task group deliberately or give it a balanced grid; do not let individual controls wrap accidentally.",
    );
  }

  for (const region of snapshot.whitespace ?? []) {
    if (!region.crowded || region.strandedInlineSpace < 64) continue;
    add(
      "whitespace",
      "P1",
      `${region.id} is crowded while leaving ${region.strandedInlineSpace}px of inline space unused.`,
      "Redistribute the whole control group into a compact stack or balanced grid.",
    );
  }

  for (const overlap of snapshot.overlaps ?? []) {
    add(
      "overlap",
      overlap.area >= 64 ? "P0" : "P1",
      `${overlap.first} overlaps ${overlap.second} by ${overlap.area}px².`,
      "Restore non-overlapping control geometry at the owning layout container.",
    );
  }

  for (const clipped of snapshot.clippedElements ?? []) {
    const effectiveAxes = clipped.axes.filter((axis) => (
      axis !== "viewport-block" || !clipped.scrollReachable
    ));
    if (!effectiveAxes.length) continue;
    add(
      "clipping",
      effectiveAxes.some((axis) => axis.startsWith("viewport")) ? "P0" : "P1",
      `${clipped.id} is clipped on ${effectiveAxes.join(", ")}.`,
      "Keep the visible label/control rectangle inside its viewport and clipping owner.",
    );
  }

  for (const container of snapshot.scrollContainers ?? []) {
    const horizontalFailure = container.overflowX > 2 && !container.allowsHorizontal;
    const hiddenVerticalFailure = container.overflowY > 2 && ["hidden", "clip"].includes(container.modeY);
    const unreachableVertical = container.overflowY > 2
      && ["auto", "scroll"].includes(container.modeY)
      && (container.topReachable === false || container.bottomReachable === false);
    if (!horizontalFailure && !hiddenVerticalFailure && !unreachableVertical) continue;
    add(
      "overflow",
      horizontalFailure || unreachableVertical ? "P1" : "P2",
      `${container.id} overflows by ${container.overflowX}px inline and ${container.overflowY}px block; scroll endpoints reachable=${container.topReachable ?? "n/a"}/${container.bottomReachable ?? "n/a"}.`,
      "Remove unintended horizontal overflow and keep content-specific scrolling reachable at both endpoints on an explicit owner.",
    );
  }

  for (const repeated of snapshot.repeatedTitles ?? []) {
    add(
      "repeated-title",
      "P1",
      `“${repeated.text}” appears ${repeated.ids.length} times in one visible region (${repeated.ids.join(", ")}).`,
      "Keep one region title; suppress a duplicate field legend or replace a subtitle with added scope.",
    );
  }

  for (const occupancy of snapshot.occupancies ?? []) {
    if (!occupancy.crowded || (occupancy.occupiedRatio >= 0.5 && occupancy.occupiedRatio <= 0.94)) continue;
    add(
      "occupancy",
      "P2",
      `${occupancy.id} has ${round(occupancy.occupiedRatio * 100)}% inline occupancy while its children are crowded.`,
      "Use the available panel width intentionally without stretching the controls themselves.",
    );
  }

  for (const candidate of snapshot.operationalContrastCandidates ?? []) {
    add(
      "operational-contrast",
      candidate.ratio < 1.5 ? "P1" : "P2",
      `${candidate.id} renders “${candidate.text}” at ${candidate.ratio}:1 (${candidate.foreground} on ${candidate.background}; ${candidate.state}).`,
      "Restore immediate operational legibility and state hierarchy within the existing colour profile without increasing the approved control geometry.",
    );
  }

  for (const candidate of snapshot.visibleSemanticsCandidates ?? []) {
    add(
      "visible-semantics",
      "P1",
      `${candidate.id} exposes ${candidate.signal} in visible copy: “${candidate.text}”.`,
      "Replace implementation or placeholder language with concise, task-specific visible copy.",
    );
  }

  const categoryCounts = {};
  const priorityCounts = { P0: 0, P1: 0, P2: 0 };
  for (const finding of findings) {
    categoryCounts[finding.category] = (categoryCounts[finding.category] ?? 0) + 1;
    priorityCounts[finding.priority] += 1;
  }
  return { ...snapshot, findings, categoryCounts, priorityCounts };
}

export function collapseDashboardDensityFindings(findings = []) {
  const groups = new Map();
  for (const finding of findings) {
    const key = [
      finding.owner,
      finding.category,
      finding.priority,
      normalizedFindingPattern(finding.evidence),
      normalizedFindingPattern(finding.recommendation),
    ].join("\u0000");
    const group = groups.get(key) ?? [];
    group.push(finding);
    groups.set(key, group);
  }
  return [...groups.values()].map((group, index) => {
    const first = group[0];
    const surfaceIds = [...new Set(group.map(({ surfaceId }) => surfaceId).filter(Boolean))];
    if (group.length === 1) {
      return {
        ...first,
        occurrenceCount: 1,
        surfaceIds,
        instanceIds: [first.id],
      };
    }
    return {
      ...first,
      id: `systemic:${first.owner}:${first.category}:${index + 1}`,
      surfaceId: surfaceIds.length === 1 ? surfaceIds[0] : null,
      systemic: true,
      occurrenceCount: group.length,
      surfaceIds,
      instanceIds: group.map(({ id }) => id),
      evidence: `${group.length} matching instances across ${surfaceIds.length} surface${surfaceIds.length === 1 ? "" : "s"}; example: ${first.evidence}`,
    };
  });
}

export function dashboardDensityBoxesStable(previous = [], current = [], tolerance = 0.25) {
  if (previous.length !== current.length) return false;
  return previous.every((box, index) => {
    const candidate = current[index];
    return candidate
      && ["x", "y", "width", "height"].every((key) => (
        Number.isFinite(box?.[key])
        && Number.isFinite(candidate?.[key])
        && Math.abs(box[key] - candidate[key]) <= tolerance
      ));
  });
}

function normalizedFindingPattern(value) {
  return String(value ?? "")
    .replace(/#[\w:.-]+/g, "#<instance>")
    .replace(/\[data-[^\]]+\]/g, "[data-instance]")
    .replace(/:nth\(\d+\)/g, ":nth(*)")
    .replace(/\s+/g, " ")
    .trim();
}

function round(value) {
  return Math.round(value * 100) / 100;
}
