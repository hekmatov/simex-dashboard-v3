import React from "react";

import { normalizeCollectionSettings } from "../../charting/collection/collectionModel.js";
import { rankCollection } from "../../charting/collection/rankCollection.js";
import CollectionCarousel from "./CollectionCarousel.jsx";
import CollectionGrid, {
  clampCollectionPage,
  pageForCollectionEntity,
} from "./CollectionGrid.jsx";
import CollectionPager from "./CollectionPager.jsx";

export default function CollectionDisplay({
  items = [],
  settings = {},
  renderItem,
  playback = null,
}) {
  if (typeof renderItem !== "function") {
    throw new Error("Collection renderItem must be a function.");
  }
  const normalized = normalizeCollectionSettings(settings);
  const previousOrder = React.useRef([]);
  const [page, setPage] = React.useState(0);
  const [focusedEntityId, setFocusedEntityId] = React.useState(null);
  const ranked = rankCollection(items, normalized, previousOrder.current);
  const playbackActive = playback !== null && (
    playback?.playing === true
    || Number.isFinite(playback?.activeEpochMs)
    || Array.isArray(playback?.lockedEntityOrder)
  );
  const lockedOrder = Array.isArray(playback?.lockedEntityOrder)
    ? playback.lockedEntityOrder
    : previousOrder.current;
  const ordered = playbackActive
    && normalized.playback.rerank === false
    && lockedOrder.length > 0
    ? lockCollectionOrder(ranked, lockedOrder)
    : ranked;
  if (
    previousOrder.current.length === 0
    || !playbackActive
    || normalized.playback.rerank
  ) {
    previousOrder.current = ordered.map(({ entityId }) => entityId);
  }

  const pageSize = normalized.rows * normalized.columns;
  const pageCount = normalized.overflow === "limit"
    ? Math.min(1, ordered.length)
    : Math.ceil(ordered.length / pageSize);
  const currentPage = clampCollectionPage(page, pageCount);

  React.useEffect(() => {
    if (currentPage !== page) setPage(currentPage);
  }, [currentPage, page]);

  React.useEffect(() => {
    if (!focusedEntityId) return;
    const focusedPage = pageForCollectionEntity(
      ordered,
      focusedEntityId,
      pageSize,
      currentPage,
    );
    if (focusedPage !== currentPage) setPage(focusedPage);
  }, [currentPage, focusedEntityId, ordered, pageSize]);

  if (ordered.length === 0) {
    return React.createElement("p", {
      className: "collection-empty",
      role: "status",
    }, "No collection items are available.");
  }

  if (normalized.layout === "carousel") {
    return React.createElement(CollectionCarousel, {
      items: ordered,
      settings: normalized,
      renderItem,
      playback,
    });
  }

  if (normalized.layout === "scroll") {
    const visibleItems = normalized.overflow === "limit"
      ? ordered.slice(0, pageSize)
      : ordered;
    return React.createElement("section", {
      className: "collection-display collection-display--scroll",
      "data-collection-layout": "scroll",
      "aria-label": "Collection",
    }, React.createElement(CollectionGrid, {
      items: visibleItems,
      settings: normalized,
      renderItem,
      mode: "scroll",
      onItemFocus: setFocusedEntityId,
      onItemBlur: (entityId) => {
        if (focusedEntityId === entityId) setFocusedEntityId(null);
      },
    }));
  }

  const visibleItems = normalized.overflow === "limit"
    ? ordered.slice(0, pageSize)
    : ordered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return React.createElement("section", {
    className: "collection-display collection-display--fixed",
    "data-collection-layout": "fixed",
    "aria-label": "Collection",
  },
  React.createElement(CollectionGrid, {
    items: visibleItems,
    settings: normalized,
    renderItem,
    mode: "fixed",
    onItemFocus: setFocusedEntityId,
    onItemBlur: (entityId) => {
      if (focusedEntityId === entityId) setFocusedEntityId(null);
    },
  }),
  React.createElement(CollectionPager, {
    page: currentPage,
    pageCount,
    onPageChange: (nextPage) => setPage(clampCollectionPage(
      nextPage,
      pageCount,
    )),
  }));
}

function lockCollectionOrder(items, lockedOrder) {
  const positions = new Map(lockedOrder.map((entityId, index) => [
    entityId,
    index,
  ]));
  return [...items].sort((left, right) => {
    const leftPosition = positions.get(left.entityId);
    const rightPosition = positions.get(right.entityId);
    if (leftPosition !== undefined && rightPosition !== undefined) {
      return leftPosition - rightPosition;
    }
    if (leftPosition !== undefined) return -1;
    if (rightPosition !== undefined) return 1;
    return 0;
  });
}
