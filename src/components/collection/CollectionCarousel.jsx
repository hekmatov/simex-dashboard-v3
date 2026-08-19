import React from "react";

import CollectionGrid, {
  clampCollectionPage,
  resolveCollectionPage,
} from "./CollectionGrid.jsx";
import CollectionPager from "./CollectionPager.jsx";
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
    enabled: pageCount > 1
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
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocusCapture: () => setFocused(true),
    onBlurCapture: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    },
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
  pageCount > 1
    ? React.createElement("div", {
        className: "collection-carousel-controls",
      },
      React.createElement(IconControl, {
        interactionId: canResume
          ? "collection.resume-carousel"
          : "collection.pause-carousel",
        "aria-label": canResume
          ? "Resume collection rotation"
          : "Pause collection rotation",
        onClick: () => {
          if (stoppedAtEnd) setPage(0);
          setManualPaused(!canResume);
        },
      }),
      React.createElement(CollectionPager, {
        page: currentPage,
        pageCount,
        onPageChange: (nextPage) => setPage(clampCollectionPage(
          nextPage,
          pageCount,
        )),
        className: "collection-carousel-pager",
        loop: settings.carousel.loop,
      }))
    : null);
}

function CollectionEmpty() {
  return React.createElement("p", {
    className: "collection-empty",
    role: "status",
  }, "No collection items are available.");
}
