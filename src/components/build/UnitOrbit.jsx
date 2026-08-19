import React from "react";
import { createPortal } from "react-dom";

const DEFAULT_GAP = 12;
const DEFAULT_MARGIN = 12;
const DEFAULT_MIN_HEIGHT = 280;
const DEFAULT_WIDTH = 420;
const PROTECTED_SELECTORS = [
  ".app-frame-bar",
  ".build-header",
  ".build-page-tabs",
  ".build-command-area",
  ".build-canvas-toolbar",
];

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

  const selected = candidates.find((entry) => (
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
  anchorPlacementId,
  chartTitle = "Selected chart",
  onRequestClose,
  children,
}) {
  const orbitRef = React.useRef(null);
  const invokerRef = React.useRef(null);
  const recenteredRef = React.useRef(false);
  const focusedRef = React.useRef(false);
  const frameRef = React.useRef(0);
  const [placement, setPlacement] = React.useState(null);

  React.useLayoutEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const anchor = findAnchor(anchorPlacementId);
    if (!anchor) return undefined;

    const activeElement = document.activeElement;
    invokerRef.current = activeElement instanceof HTMLElement
      && activeElement.dataset.buildEditFor === anchorPlacementId
      ? activeElement
      : findEditButton(anchor, anchorPlacementId);
    recenteredRef.current = false;
    focusedRef.current = false;

    const update = () => {
      frameRef.current = 0;
      const currentAnchor = findAnchor(anchorPlacementId);
      const orbit = orbitRef.current;
      if (!currentAnchor || !orbit) return;
      const orbitRect = orbit.getBoundingClientRect();
      const orbitSize = {
        width: orbitRect.width || Math.min(DEFAULT_WIDTH, window.innerWidth - (DEFAULT_MARGIN * 2)),
        height: Math.max(orbitRect.height, orbit.scrollHeight, DEFAULT_MIN_HEIGHT),
      };
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
        ? constrainedFallback(currentAnchor.getBoundingClientRect(), orbitSize, window)
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
    if (orbitRef.current) observer?.observe(orbitRef.current);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      observer?.disconnect();
      const focusTarget = invokerRef.current?.isConnected
        ? invokerRef.current
        : findAnchor(anchorPlacementId);
      window.requestAnimationFrame(() => focusTarget?.focus?.({ preventScroll: true }));
    };
  }, [anchorPlacementId]);

  React.useEffect(() => {
    if (!placement || focusedRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const orbit = orbitRef.current;
      const focusTarget = orbit?.querySelector(
        '[role="tab"][aria-selected="true"], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      );
      focusTarget?.focus?.({ preventScroll: true });
      focusedRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [placement]);

  React.useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      onRequestClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onRequestClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <aside
      ref={orbitRef}
      className="unit-orbit"
      aria-label={`Chart settings for ${chartTitle}`}
      data-unit-orbit-side={placement?.side}
      style={{
        left: placement ? `${placement.left}px` : `${DEFAULT_MARGIN}px`,
        top: placement ? `${placement.top}px` : `${DEFAULT_MARGIN}px`,
        visibility: placement ? "visible" : "hidden",
        "--unit-orbit-max-height": `${placement?.maxHeight ?? DEFAULT_MIN_HEIGHT}px`,
      }}
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

function constrainedFallback(anchorRect, orbitSize, windowObject) {
  const width = Math.min(orbitSize.width, windowObject.innerWidth - (DEFAULT_MARGIN * 2));
  const left = clamp(
    anchorRect.left,
    DEFAULT_MARGIN,
    Math.max(DEFAULT_MARGIN, windowObject.innerWidth - DEFAULT_MARGIN - width),
  );
  const belowHeight = windowObject.innerHeight - DEFAULT_MARGIN - anchorRect.bottom - DEFAULT_GAP;
  const aboveHeight = anchorRect.top - DEFAULT_GAP - DEFAULT_MARGIN;
  if (belowHeight >= aboveHeight && belowHeight > 0) {
    return { side: "below", left, top: anchorRect.bottom + DEFAULT_GAP, maxHeight: belowHeight };
  }
  if (aboveHeight > 0) {
    return {
      side: "above",
      left,
      top: DEFAULT_MARGIN,
      maxHeight: aboveHeight,
    };
  }
  return {
    side: "viewport",
    left: DEFAULT_MARGIN,
    top: DEFAULT_MARGIN,
    maxHeight: Math.max(120, windowObject.innerHeight - (DEFAULT_MARGIN * 2)),
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
