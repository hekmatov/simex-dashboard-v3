import React from "react";
import { createPortal } from "react-dom";
import { dashboardThemeRootProps } from "../../theme/dashboardThemeRoot.js";

const DEFAULT_GAP = 12;
const DEFAULT_MARGIN = 12;
const DEFAULT_MIN_HEIGHT = 280;
const DEFAULT_WIDTH = 420;
const PROTECTED_SELECTORS = [
  ".app-frame-bar",
  ".dashboard-command-crown",
  ".build-header",
  ".build-page-tabs",
  ".build-command-header",
  ".build-canvas-toolbar",
  ".scene-transaction-footer",
];

export function isUnitOrbitOutsidePointer(orbit, target) {
  if (!orbit || !target || orbit.contains(target)) return false;
  if (typeof target.closest === "function" && target.closest("[data-unit-orbit-preserve-open]")) {
    return false;
  }
  return true;
}

export function revealUnitOrbitAnchor(
  placementId,
  {
    documentRef = typeof document === "undefined" ? null : document,
    schedule = typeof window === "undefined" ? null : window.requestAnimationFrame.bind(window),
  } = {},
) {
  if (!placementId || !documentRef || !schedule) return false;
  schedule(() => {
    const anchor = [...documentRef.querySelectorAll("[data-build-placement-id]")]
      .find((element) => element.dataset.buildPlacementId === placementId);
    anchor?.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "auto" });
  });
  return true;
}

export function captureUnitOrbitReturnState({
  windowRef = typeof window === "undefined" ? null : window,
  focusTarget = null,
} = {}) {
  if (!windowRef) return null;
  return {
    scrollLeft: windowRef.scrollX,
    scrollTop: windowRef.scrollY,
    focusTarget,
  };
}

export function restoreUnitOrbitReturnState(
  state,
  {
    windowRef = typeof window === "undefined" ? null : window,
    schedule = windowRef?.requestAnimationFrame?.bind(windowRef),
  } = {},
) {
  if (!state || !windowRef || !schedule) return false;
  schedule(() => {
    windowRef.scrollTo({
      left: state.scrollLeft,
      top: state.scrollTop,
      behavior: "auto",
    });
    state.focusTarget?.focus?.({ preventScroll: true });
  });
  return true;
}

export function resolveUnitOrbitSize(orbit, viewportWidth) {
  const rect = orbit.getBoundingClientRect();
  const innerScroller = orbit.querySelector(".unit-orbit-scroll");
  return {
    width: rect.width || Math.min(DEFAULT_WIDTH, viewportWidth - (DEFAULT_MARGIN * 2)),
    height: Math.max(
      rect.height,
      innerScroller?.scrollHeight ?? orbit.scrollHeight,
      DEFAULT_MIN_HEIGHT,
    ),
  };
}

export function positionUnitOrbit({
  anchorRect,
  orbitSize,
  viewport,
  protectedRects = [],
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
  minHeight = DEFAULT_MIN_HEIGHT,
}) {
  if (!anchorRect || !orbitSize || !viewport) return { needsRecenter: true };

  const width = Math.min(orbitSize.width, Math.max(0, viewport.width - (margin * 2)));
  const height = Math.min(orbitSize.height, Math.max(0, viewport.height - (margin * 2)));
  const candidates = [];

  const verticalTop = clamp(
    anchorRect.top,
    margin,
    Math.max(margin, viewport.height - margin - height),
  );
  const horizontalHeight = Math.min(height, viewport.height - (margin * 2));

  if (viewport.width - margin - (anchorRect.right + gap) >= width) {
    candidates.push(candidate("right", anchorRect.right + gap, verticalTop, width, horizontalHeight));
  }
  if (anchorRect.left - gap - margin >= width) {
    candidates.push(candidate("left", anchorRect.left - gap - width, verticalTop, width, horizontalHeight));
  }

  const horizontalLeft = clamp(
    anchorRect.left,
    margin,
    Math.max(margin, viewport.width - margin - width),
  );
  const belowHeight = Math.min(height, viewport.height - margin - (anchorRect.bottom + gap));
  if (belowHeight >= minHeight) {
    candidates.push(candidate("below", horizontalLeft, anchorRect.bottom + gap, width, belowHeight));
  }
  const aboveHeight = Math.min(height, anchorRect.top - gap - margin);
  if (aboveHeight >= minHeight) {
    candidates.push(candidate("above", horizontalLeft, anchorRect.top - gap - aboveHeight, width, aboveHeight));
  }

  const selected = candidates
    .map((entry) => clipCandidateBeforeProtectedRects(entry, protectedRects, gap))
    .find((entry) => (
      entry.maxHeight >= minHeight
      && !intersects(entry.rect, anchorRect)
      && !protectedRects.some((protectedRect) => intersects(entry.rect, protectedRect))
    ));

  if (!selected) return { needsRecenter: true };
  return {
    side: selected.side,
    left: selected.left,
    top: selected.top,
    maxHeight: selected.maxHeight,
  };
}

export default function UnitOrbit({
  themeProjection,
  anchorPlacementId,
  chartTitle = "Selected chart",
  capabilities = [],
  onRequestClose,
  open = true,
  children,
}) {
  const orbitRef = React.useRef(null);
  const invokerRef = React.useRef(null);
  const returnStateRef = React.useRef(null);
  const recenteredRef = React.useRef(false);
  const focusedRef = React.useRef(false);
  const frameRef = React.useRef(0);
  const [placement, setPlacement] = React.useState(null);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const anchor = findAnchor(anchorPlacementId);
    if (!anchor) return undefined;

    const activeElement = document.activeElement;
    invokerRef.current = activeElement instanceof HTMLElement
      && activeElement.dataset.buildEditFor === anchorPlacementId
      ? activeElement
      : findEditButton(anchor, anchorPlacementId);
    returnStateRef.current = captureUnitOrbitReturnState({
      windowRef: window,
      focusTarget: invokerRef.current,
    });
    recenteredRef.current = false;
    focusedRef.current = false;

    const update = () => {
      frameRef.current = 0;
      const currentAnchor = findAnchor(anchorPlacementId);
      const orbit = orbitRef.current;
      if (!currentAnchor || !orbit) return;
      const orbitSize = resolveUnitOrbitSize(orbit, window.innerWidth);
      const result = positionUnitOrbit({
        anchorRect: currentAnchor.getBoundingClientRect(),
        orbitSize,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        protectedRects: protectedElementRects(),
      });

      if (result.needsRecenter && !recenteredRef.current) {
        recenteredRef.current = true;
        currentAnchor.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        frameRef.current = window.requestAnimationFrame(update);
        return;
      }

      setPlacement(result.needsRecenter
        ? constrainedUnitOrbitPlacement({
            orbitSize,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            protectedRects: protectedElementRects(),
          })
        : result);
    };
    const schedule = () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(schedule);
    observer?.observe(anchor);
    if (orbitRef.current) {
      observer?.observe(orbitRef.current);
      const innerScroller = orbitRef.current.querySelector(".unit-orbit-scroll");
      if (innerScroller) {
        observer?.observe(innerScroller);
        [...innerScroller.children].forEach((child) => observer?.observe(child));
      }
    }

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      observer?.disconnect();
      const focusTarget = invokerRef.current?.isConnected
        ? invokerRef.current
        : findAnchor(anchorPlacementId);
      restoreUnitOrbitReturnState({
        ...returnStateRef.current,
        focusTarget,
      }, { windowRef: window });
      returnStateRef.current = null;
    };
  }, [anchorPlacementId, open]);

  React.useEffect(() => {
    if (!open || !placement || focusedRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const orbit = orbitRef.current;
      const focusTarget = orbit?.querySelector(
        '[role="tab"][aria-selected="true"], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      );
      focusTarget?.focus?.({ preventScroll: true });
      focusedRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, placement]);

  React.useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      onRequestClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onRequestClose, open]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const handlePointerDown = (event) => {
      if (!isUnitOrbitOutsidePointer(orbitRef.current, event.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      onRequestClose?.();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [onRequestClose, open]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <aside
      ref={orbitRef}
      className="unit-orbit"
      aria-label={`Chart settings for ${chartTitle}`}
      aria-hidden={open ? undefined : "true"}
      hidden={!open}
      inert={!open ? "" : undefined}
      data-unit-orbit-side={placement?.side}
      data-unit-orbit-capabilities={capabilities.map(({ id }) => id).join(" ")}
      {...dashboardThemeRootProps(themeProjection, {
        left: placement ? `${placement.left}px` : `${DEFAULT_MARGIN}px`,
        top: placement ? `${placement.top}px` : `${DEFAULT_MARGIN}px`,
        visibility: open && placement ? "visible" : "hidden",
        "--unit-orbit-max-height": `${placement?.maxHeight ?? DEFAULT_MIN_HEIGHT}px`,
      })}
    >
      <div className="unit-orbit-scroll">{children}</div>
    </aside>,
    document.body,
  );
}

function candidate(side, left, top, width, maxHeight) {
  return {
    side,
    left,
    top,
    maxHeight,
    rect: {
      left,
      top,
      right: left + width,
      bottom: top + maxHeight,
    },
  };
}

function clipCandidateBeforeProtectedRects(entry, protectedRects, gap) {
  const width = entry.rect.right - entry.rect.left;
  const maxHeight = protectedRects.reduce((availableHeight, protectedRect) => {
    const horizontallyOverlaps = entry.left < protectedRect.right
      && entry.left + width > protectedRect.left;
    const startsBelowCandidate = protectedRect.top > entry.top;
    if (!horizontallyOverlaps || !startsBelowCandidate) return availableHeight;
    return Math.min(availableHeight, protectedRect.top - gap - entry.top);
  }, entry.maxHeight);
  return candidate(entry.side, entry.left, entry.top, width, maxHeight);
}

export function constrainedUnitOrbitPlacement({
  orbitSize,
  viewport,
  protectedRects = [],
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
}) {
  const width = Math.min(orbitSize.width, viewport.width - (margin * 2));
  const protectedBottom = protectedRects.reduce(
    (bottom, rect) => (
      rect.bottom > 0 && rect.top < viewport.height
        ? Math.max(bottom, rect.bottom + gap)
        : bottom
    ),
    margin,
  );
  const top = clamp(protectedBottom, margin, Math.max(margin, viewport.height - margin - 120));
  return {
    side: "viewport",
    left: Math.max(margin, viewport.width - margin - width),
    top,
    maxHeight: Math.max(120, viewport.height - margin - top),
  };
}

function findAnchor(placementId) {
  return [...document.querySelectorAll("[data-build-placement-id]")]
    .find((element) => element.dataset.buildPlacementId === placementId) ?? null;
}

function findEditButton(anchor, placementId) {
  return [...anchor.querySelectorAll("[data-build-edit-for]")]
    .find((element) => element.dataset.buildEditFor === placementId) ?? null;
}

function protectedElementRects() {
  return PROTECTED_SELECTORS.flatMap((selector) => (
    [...document.querySelectorAll(selector)].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0
        ? []
        : [rect];
    })
  ));
}

function intersects(left, right) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
