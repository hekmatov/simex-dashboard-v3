import React from "react";

export function clampCollectionPage(page, pageCount) {
  if (!Number.isInteger(pageCount) || pageCount <= 0) return 0;
  if (!Number.isInteger(page) || page <= 0) return 0;
  return Math.min(page, pageCount - 1);
}

export function pageForCollectionEntity(
  items,
  entityId,
  pageSize,
  fallbackPage = 0,
) {
  if (!Array.isArray(items) || !Number.isInteger(pageSize) || pageSize <= 0) {
    return fallbackPage;
  }
  const index = items.findIndex((item) => item?.entityId === entityId);
  return index < 0 ? fallbackPage : Math.floor(index / pageSize);
}

export default function CollectionGrid({
  items,
  settings,
  renderItem,
  mode = "paged",
  onItemFocus,
  onItemBlur,
}) {
  const layout = mode === "scroll" ? "scroll" : settings.layout;
  const grid = React.createElement("div", {
    className: `collection-grid collection-grid--${layout}`,
    role: "list",
    "data-collection-layout": layout,
    "data-collection-rows": settings.rows,
    "data-collection-columns": settings.columns,
    style: {
      gap: `${settings.gap}px`,
      gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${settings.rows}, minmax(0, 1fr))`,
    },
  }, items.map((item) => React.createElement("div", {
    className: "collection-item",
    role: "listitem",
    tabIndex: 0,
    key: item.entityId,
    "data-collection-entity-id": item.entityId,
    onFocus: () => onItemFocus?.(item.entityId),
    onBlur: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        onItemBlur?.(item.entityId);
      }
    },
  }, renderItem(item))));

  if (mode !== "scroll") return grid;
  return React.createElement("div", {
    className: "collection-scroll",
    role: "region",
    "aria-label": "Scrollable collection",
    tabIndex: 0,
    style: {
      "--collection-gap": `${settings.gap}px`,
      "--collection-visible-rows": settings.rows,
    },
  }, grid);
}
