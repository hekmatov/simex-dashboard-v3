import React from "react";

import { normalizeCollectionSettings } from "../../charting/collection/collectionModel.js";
import { rankCollectionWithDiagnostics } from "../../charting/collection/rankCollection.js";
import CollectionCarousel from "./CollectionCarousel.jsx";
import CollectionGrid, {
  clampCollectionPage,
  resolveCollectionPage,
} from "./CollectionGrid.jsx";
import CollectionPager from "./CollectionPager.jsx";

export default function CollectionDisplay({
  items = [],
  settings = {},
  renderItem,
}) {
  if (typeof renderItem !== "function") {
    throw new Error("Collection renderItem must be a function.");
  }
  const normalized = normalizeCollectionSettings(settings);
  const previousOrder = React.useRef([]);
  const [page, setPage] = React.useState(0);
  const [focusedEntityId, setFocusedEntityId] = React.useState(null);
  const ranking = rankCollectionWithDiagnostics(
    items,
    normalized,
    previousOrder.current,
  );
  const ranked = ranking.items;
  const rankingStatus = ranking.diagnostics.length > 0
    ? React.createElement("p", {
        className: "collection-ranking-status",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": true,
      }, ranking.diagnostics[0].message)
    : null;
  const ordered = ranked;
  previousOrder.current = ordered.map(({ entityId }) => entityId);

  const pageSize = normalized.rows * normalized.columns;
  const pageCount = normalized.overflow === "limit"
    ? Math.min(1, ordered.length)
    : Math.ceil(ordered.length / pageSize);
  const currentPage = resolveCollectionPage({
    page,
    pageCount,
    items: ordered,
    focusedEntityId,
    pageSize,
  });

  React.useEffect(() => {
    if (currentPage !== page) setPage(currentPage);
  }, [currentPage, page]);

  if (ordered.length === 0) {
    return React.createElement("p", {
      className: "collection-empty",
      role: "status",
    }, "No collection items are available.");
  }

  if (normalized.layout === "carousel") {
    return React.createElement(React.Fragment, null,
      rankingStatus,
      React.createElement(CollectionCarousel, {
        items: ordered,
        settings: normalized,
        renderItem,
      }));
  }

  if (normalized.layout === "scroll") {
    const visibleItems = normalized.overflow === "limit"
      ? ordered.slice(0, pageSize)
      : ordered;
    return React.createElement("section", {
      className: "collection-display collection-display--scroll",
      "data-collection-layout": "scroll",
      "aria-label": "Collection",
    },
    rankingStatus,
    React.createElement(CollectionGrid, {
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
  rankingStatus,
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
