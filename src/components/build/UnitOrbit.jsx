import React from "react";
import { createPortal } from "react-dom";
import { dashboardThemeRootProps } from "../../theme/dashboardThemeRoot.js";

const DEFAULT_GAP = 12;
const DEFAULT_MARGIN = 12;
const DEFAULT_MIN_HEIGHT = 280;
const DEFAULT_WIDTH = 420;

export function isUnitOrbitOutsidePointer(orbit, target) {
  if (!orbit || !target || orbit.contains(target)) return false;
  if (typeof target.closest === "function" && target.closest("[data-unit-orbit-preserve-open]")) {
    return false;
  }
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
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
}) {
  if (!anchorRect || !orbitSize || !viewport) return { needsRecenter: true };

  const width = Math.min(orbitSize.width, Math.max(0, viewport.width - (margin * 2)));
  const height = orbitSize.height;
  const right = anchorRect.right + gap;
  if (viewport.width - margin - right >= width) {
    return sidePlacement("right", right, anchorRect.top, height, viewport, margin);
  }

  const left = anchorRect.left - gap - width;
  if (left >= margin) {
    return sidePlacement("left", left, anchorRect.top, height, viewport, margin);
  }

  return constrainedUnitOrbitPlacement({ orbitSize: { width, height }, viewport, margin });
}

export default function UnitOrbit({
  themeProjection,
  anchorPlacementId,
  anchorSelector = "",
  chartTitle = "Selected chart",
  capabilities = [],
  onRequestClose,
  open = true,
  children,
}) {
  const orbitRef = React.useRef(null);
  const revealedRef = React.useRef(false);
  const frameRef = React.useRef(0);
  const revealFrameRef = React.useRef(0);
  const [placement, setPlacement] = React.useState(null);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const anchor = findUnitOrbitAnchor(anchorPlacementId, anchorSelector);
    if (!anchor) return undefined;

    revealedRef.current = false;

    const update = () => {
      frameRef.current = 0;
      const currentAnchor = findUnitOrbitAnchor(anchorPlacementId, anchorSelector);
      const orbit = orbitRef.current;
      if (!currentAnchor || !orbit) return;
      const orbitSize = resolveUnitOrbitSize(orbit, window.innerWidth);
      const result = positionUnitOrbit({
        anchorRect: currentAnchor.getBoundingClientRect(),
        orbitSize,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
      setPlacement(result);
      if (!revealedRef.current) {
        revealedRef.current = true;
        revealFrameRef.current = window.requestAnimationFrame(() => {
          revealFrameRef.current = 0;
          const currentOrbit = orbitRef.current;
          if (currentOrbit) revealUnitOrbit(currentAnchor, currentOrbit, { windowRef: window });
        });
      }
    };
    const schedule = () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (revealFrameRef.current) window.cancelAnimationFrame(revealFrameRef.current);
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();
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
    };
  }, [anchorPlacementId, anchorSelector, open]);

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
      inert={!open || undefined}
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

function placement(side, left, top, maxHeight) {
  return {
    side,
    left,
    top,
    maxHeight,
  };
}

export function constrainedUnitOrbitPlacement({
  orbitSize,
  viewport,
  margin = DEFAULT_MARGIN,
}) {
  const width = Math.min(orbitSize.width, viewport.width - (margin * 2));
  return {
    side: "viewport-top-right",
    left: Math.max(margin, viewport.width - margin - width),
    top: margin,
    maxHeight: Math.min(orbitSize.height, Math.max(0, viewport.height - (margin * 2))),
  };
}

function sidePlacement(side, left, anchorTop, height, viewport, margin) {
  const availableHeight = Math.max(0, viewport.height - (margin * 2));
  const minimumHeight = Math.min(DEFAULT_MIN_HEIGHT, availableHeight);
  const maximumTop = Math.max(margin, viewport.height - margin - minimumHeight);
  const top = Math.min(Math.max(anchorTop, margin), maximumTop);
  return placement(
    side,
    left,
    top,
    Math.min(height, Math.max(0, viewport.height - margin - top)),
  );
}

export function revealUnitOrbit(
  anchor,
  orbit,
  {
    windowRef = typeof window === "undefined" ? null : window,
    margin = DEFAULT_MARGIN,
  } = {},
) {
  if (!anchor || !orbit || !windowRef) return false;
  const anchorRect = anchor.getBoundingClientRect();
  const orbitRect = orbit.getBoundingClientRect();
  const combined = {
    top: Math.min(anchorRect.top, orbitRect.top),
    bottom: Math.max(anchorRect.bottom, orbitRect.bottom),
  };
  const availableHeight = windowRef.innerHeight - (margin * 2);
  const target = combined.bottom - combined.top <= availableHeight ? combined : orbitRect;
  let delta = 0;
  if (target.top < margin) delta = target.top - margin;
  else if (target.bottom > windowRef.innerHeight - margin) {
    delta = target.bottom - (windowRef.innerHeight - margin);
  }
  if (!delta) return false;
  windowRef.scrollBy({ top: delta, left: 0, behavior: "auto" });
  return true;
}

export function findUnitOrbitAnchor(
  placementId,
  anchorSelector = "",
  { documentRef = typeof document === "undefined" ? null : document } = {},
) {
  if (!documentRef) return null;
  const anchors = anchorSelector
    ? [...documentRef.querySelectorAll(anchorSelector)]
    : [...documentRef.querySelectorAll("[data-build-placement-id]")]
      .filter((element) => element.dataset.buildPlacementId === placementId);
  return anchors.find((element) => {
    const rect = element.getBoundingClientRect?.();
    return rect && rect.width > 0 && rect.height > 0;
  }) ?? anchors[0] ?? null;
}
