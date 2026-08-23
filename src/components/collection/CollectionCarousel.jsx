import React from "react";
import { createPortal } from "react-dom";

import CollectionGrid, {
  clampCollectionPage,
  resolveCollectionPage,
} from "./CollectionGrid.jsx";
import { IconControl } from "../common/SimExIcon.js";

const STATIC_ENVIRONMENT = Object.freeze({
  documentHidden: false,
  reducedMotion: false,
});

export function readCollectionEnvironment(
  documentTarget = typeof document === "undefined" ? null : document,
  motionQuery = typeof window === "undefined"
    ? null
    : window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null,
) {
  return {
    documentHidden: documentTarget?.hidden === true,
    reducedMotion: motionQuery?.matches === true,
  };
}

export function nextCarouselPage(page, pageCount, direction, loop) {
  const current = clampCollectionPage(page, pageCount);
  if (pageCount <= 1 || (direction !== 1 && direction !== -1)) return current;
  const candidate = current + direction;
  if (candidate >= 0 && candidate < pageCount) return candidate;
  if (!loop) return current;
  return candidate < 0 ? pageCount - 1 : 0;
}

export function isCarouselPaused(state, settings) {
  return state.manualPaused === true
    || state.focused === true
    || state.documentHidden === true
    || state.reducedMotion === true
    || (state.hovered === true && settings.carousel?.pauseOnHover === true)
  ;
}

export function createCollectionTimer({
  enabled,
  intervalMs,
  onTick,
  scheduler = typeof window === "undefined" ? globalThis : window,
}) {
  if (
    enabled !== true
    || !Number.isInteger(intervalMs)
    || intervalMs < 5000
    || typeof onTick !== "function"
    || typeof scheduler?.setInterval !== "function"
  ) {
    return () => {};
  }
  let timerId = scheduler.setInterval(onTick, intervalMs);
  return () => {
    if (timerId === null) return;
    scheduler.clearInterval?.(timerId);
    timerId = null;
  };
}

export function subscribeToCollectionEnvironment({
  documentTarget = typeof document === "undefined" ? null : document,
  motionQuery = typeof window === "undefined"
    ? null
    : window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null,
  onChange,
}) {
  if (typeof onChange !== "function") return () => {};
  const emit = () => onChange(readCollectionEnvironment(
    documentTarget,
    motionQuery,
  ));
  documentTarget?.addEventListener?.("visibilitychange", emit);
  if (typeof motionQuery?.addEventListener === "function") {
    motionQuery.addEventListener("change", emit);
  } else {
    motionQuery?.addListener?.(emit);
  }
  emit();
  return () => {
    documentTarget?.removeEventListener?.("visibilitychange", emit);
    if (typeof motionQuery?.removeEventListener === "function") {
      motionQuery.removeEventListener("change", emit);
    } else {
      motionQuery?.removeListener?.(emit);
    }
  };
}

export default function CollectionCarousel({
  items,
  settings,
  renderItem,
  controlsPortalId,
  interactive = true,
}) {
  const pageSize = settings.rows * settings.columns;
  const pageCount = settings.overflow === "limit"
    ? Math.min(1, items.length)
    : Math.ceil(items.length / pageSize);
  const [page, setPage] = React.useState(0);
  const [manualPaused, setManualPaused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [focusedEntityId, setFocusedEntityId] = React.useState(null);
  const [environment, setEnvironment] = React.useState(() => (
    typeof window === "undefined"
      ? STATIC_ENVIRONMENT
      : readCollectionEnvironment()
  ));
  const currentPage = resolveCollectionPage({
    page,
    pageCount,
    items,
    focusedEntityId,
    pageSize,
  });
  const stoppedAtEnd = settings.carousel.loop !== true
    && currentPage >= pageCount - 1;
  const paused = isCarouselPaused({
    manualPaused,
    hovered,
    focused,
    ...environment,
  }, settings);

  React.useEffect(() => subscribeToCollectionEnvironment({
    onChange: setEnvironment,
  }), []);

  React.useEffect(() => {
    if (currentPage !== page) setPage(currentPage);
  }, [currentPage, page]);

  React.useEffect(() => createCollectionTimer({
    enabled: interactive
      && pageCount > 1
      && settings.overflow === "autoRotate"
      && !paused
      && !stoppedAtEnd,
    intervalMs: settings.carousel.intervalMs,
    onTick: () => setPage((activePage) => nextCarouselPage(
      activePage,
      pageCount,
      1,
      settings.carousel.loop,
    )),
  }), [
    interactive,
    pageCount,
    paused,
    settings.carousel.intervalMs,
    settings.carousel.loop,
    settings.overflow,
    stoppedAtEnd,
  ]);

  if (items.length === 0) {
    return React.createElement(CollectionEmpty);
  }

  const visibleItems = settings.overflow === "limit"
    ? items.slice(0, pageSize)
    : items.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const canResume = manualPaused || stoppedAtEnd;
  const previousDisabled = settings.carousel.loop !== true && currentPage <= 0;
  const nextDisabled = settings.carousel.loop !== true && currentPage >= pageCount - 1;
  const transport = interactive && pageCount > 1 ? React.createElement(CollectionHeaderTransport, {
    page: currentPage,
    pageCount,
    paused: canResume,
    previousDisabled,
    nextDisabled,
    onPrevious: () => setPage((activePage) => nextCarouselPage(activePage, pageCount, -1, settings.carousel.loop)),
    onTogglePaused: () => {
      if (stoppedAtEnd) setPage(0);
      setManualPaused(!canResume);
    },
    onNext: () => setPage((activePage) => nextCarouselPage(activePage, pageCount, 1, settings.carousel.loop)),
  }) : null;
  return React.createElement("section", {
    className: [
      "collection-display",
      "collection-display--carousel",
      `collection-carousel--${settings.carousel.transition}`,
    ].join(" "),
    "aria-label": "Collection carousel",
    "aria-roledescription": "carousel",
    "data-collection-layout": "carousel",
    "data-collection-transition": settings.carousel.transition,
    "data-collection-interval-ms": settings.carousel.intervalMs,
    "data-collection-loop": settings.carousel.loop,
    "data-collection-pause-on-hover": settings.carousel.pauseOnHover,
    "data-collection-rotation-paused": paused,
    onMouseEnter: interactive ? () => setHovered(true) : undefined,
    onMouseLeave: interactive ? () => setHovered(false) : undefined,
    onFocusCapture: interactive ? () => setFocused(true) : undefined,
    onBlurCapture: interactive ? (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    } : undefined,
  },
  React.createElement(CollectionGrid, {
    items: visibleItems,
    settings,
    renderItem,
    mode: "carousel",
    onItemFocus: setFocusedEntityId,
    onItemBlur: (entityId) => {
      if (focusedEntityId === entityId) setFocusedEntityId(null);
    },
  }),
  transport ? React.createElement(EmbeddedCollectionTransport, { portalId: controlsPortalId }, transport) : null);
}

export function CollectionHeaderTransport({ page, pageCount, paused, previousDisabled, nextDisabled, onPrevious, onTogglePaused, onNext, showPlayback = true }) {
  if (pageCount <= 1) return null;
  return React.createElement("div", { className: "collection-header-transport", "data-collection-header-transport": true },
    React.createElement("span", { className: "collection-header-page-dots", role: "status", "aria-live": "polite", "aria-atomic": true, "aria-label": `Collection page ${page + 1} of ${pageCount}` },
      Array.from({ length: pageCount }, (_, index) => React.createElement("span", { key: index, className: "collection-header-page-dot", "data-collection-page-dot": true, "aria-current": index === page ? "step" : undefined, "aria-hidden": true }))),
    React.createElement("span", { className: "collection-header-icon-group" },
      React.createElement(IconControl, { interactionId: "collection.previous-page", "aria-label": "Previous collection page", disabled: previousDisabled, onClick: onPrevious }),
      showPlayback ? React.createElement(IconControl, { interactionId: paused ? "collection.resume-carousel" : "collection.pause-carousel", "aria-label": paused ? "Resume collection rotation" : "Pause collection rotation", onClick: onTogglePaused }) : null,
      React.createElement(IconControl, { interactionId: "collection.next-page", "aria-label": "Next collection page", disabled: nextDisabled, onClick: onNext })));
}

export function EmbeddedCollectionTransport({ portalId, children }) {
  const [target, setTarget] = React.useState(null);
  React.useEffect(() => setTarget(portalId && typeof document !== "undefined" ? document.getElementById(portalId) : null), [portalId]);
  return target ? createPortal(children, target) : children;
}

function CollectionEmpty() {
  return React.createElement("p", {
    className: "collection-empty",
    role: "status",
  }, "No collection items are available.");
}
