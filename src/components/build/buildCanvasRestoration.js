export function captureBuildCanvasState({
  layout,
  selection = null,
  focusId = null,
  scrollTop = 0,
  scrollLeft = 0,
  effectiveCanvasWidth,
}) {
  return Object.freeze({
    savedLayoutFingerprint: fingerprintSavedLayout(layout),
    selection: clone(selection),
    focusId,
    scrollTop: finiteOrZero(scrollTop),
    scrollLeft: finiteOrZero(scrollLeft),
    effectiveCanvasWidth: finiteWidth(effectiveCanvasWidth),
  });
}

export function restoreBuildCanvasState(state, currentLayout) {
  if (!state || state.savedLayoutFingerprint !== fingerprintSavedLayout(currentLayout)) {
    throw new Error("The saved dashboard layout changed while authoring chrome was open.");
  }
  return {
    selection: clone(state.selection),
    focusId: state.focusId,
    scrollTop: state.scrollTop,
    scrollLeft: state.scrollLeft,
    effectiveCanvasWidth: state.effectiveCanvasWidth,
  };
}

export function fingerprintSavedLayout(dashboard = {}) {
  return JSON.stringify((dashboard.pages ?? []).map((page) => ({
    id: page.id,
    sections: (page.sections ?? []).map((section) => ({
      id: section.id,
      panels: (section.panels ?? []).map((placement) => ({
        id: placement.id,
        chartId: placement.chart?.id ?? placement.chartId ?? placement.id,
        footprint: {
          columns: placement.footprint?.columns ?? placement.chart?.footprint?.columns ?? null,
          rows: placement.footprint?.rows ?? placement.chart?.footprint?.rows ?? null,
        },
      })),
    })),
  })));
}

export function selectedTargetUsability({
  targetRect,
  viewport,
  minimumVisibleWidth = 240,
  minimumVisibleHeight = 160,
}) {
  if (!targetRect) return { usable: false, recovery: "restore-target", visibleWidth: 0, visibleHeight: 0 };
  const width = Math.max(0, Number(viewport?.width) || 0);
  const height = Math.max(0, Number(viewport?.height) || 0);
  const visibleWidth = Math.max(0, Math.min(targetRect.right, width) - Math.max(targetRect.left, 0));
  const visibleHeight = Math.max(0, Math.min(targetRect.bottom, height) - Math.max(targetRect.top, 0));
  const usable = visibleWidth >= minimumVisibleWidth && visibleHeight >= minimumVisibleHeight;
  return {
    usable,
    recovery: usable ? null : "reposition-canvas",
    visibleWidth,
    visibleHeight,
  };
}

export function selectedTargetRevealDecision({
  targetRect,
  viewport,
  attempts = 0,
  minimumVisibleWidth,
  minimumVisibleHeight,
}) {
  const usability = selectedTargetUsability({
    targetRect,
    viewport,
    minimumVisibleWidth,
    minimumVisibleHeight,
  });
  return {
    ...usability,
    shouldScroll: attempts === 0 && !usability.usable,
    complete: usability.usable,
  };
}

export function resolveCanonicalCanvasWidths({ viewMax, buildMax }) {
  const resolvedViewMax = finiteWidth(viewMax);
  return {
    viewMax: resolvedViewMax,
    buildMax: Math.min(resolvedViewMax, finiteWidth(buildMax)),
  };
}

export function resolveBuildPanelCanvasLayout({
  viewportWidth,
  panelWidth,
  gutter,
  canonicalMax,
}) {
  const viewport = finiteWidth(viewportWidth);
  const panel = finiteWidth(panelWidth);
  const spacing = finiteWidth(gutter);
  const maximum = finiteWidth(canonicalMax);
  const reservedPanelWidth = panel + spacing;
  const width = Math.min(maximum, Math.max(0, viewport - reservedPanelWidth - (spacing * 2)));
  const left = Math.max(spacing, (viewport - reservedPanelWidth - width) / 2);
  return {
    left,
    width,
    right: left + width,
    reservedPanelWidth,
  };
}

export function responsiveProjectionForWidth(effectiveCanvasWidth) {
  const width = finiteWidth(effectiveCanvasWidth);
  if (width < 768) return "phone";
  if (width < 1200) return "tablet";
  return "desktop";
}

function finiteWidth(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError("Canvas width must be a finite non-negative number.");
  return number;
}

function finiteOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
