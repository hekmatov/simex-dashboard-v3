import React from "react";
import { IconControl } from "../common/SimExIcon.js";
import { CollectionHeaderTransport, EmbeddedCollectionTransport } from "./CollectionCarousel.jsx";

export function nextManualCollectionPage(
  page,
  pageCount,
  direction,
  loop = false,
) {
  if (!Number.isInteger(pageCount) || pageCount <= 1) return 0;
  const currentPage = Number.isInteger(page)
    ? Math.min(pageCount - 1, Math.max(0, page))
    : 0;
  if (direction !== -1 && direction !== 1) return currentPage;
  const candidate = currentPage + direction;
  if (candidate >= 0 && candidate < pageCount) return candidate;
  if (loop !== true) return currentPage;
  return candidate < 0 ? pageCount - 1 : 0;
}

export default function CollectionPager({
  page,
  pageCount,
  onPageChange,
  className = "",
  loop = false,
  embedded = false,
  controlsPortalId,
}) {
  if (pageCount <= 1) return null;
  const previousDisabled = loop !== true && page <= 0;
  const nextDisabled = loop !== true && page >= pageCount - 1;
  if (embedded) {
    return React.createElement(EmbeddedCollectionTransport, { portalId: controlsPortalId },
      React.createElement(CollectionHeaderTransport, {
        page,
        pageCount,
        paused: true,
        previousDisabled,
        nextDisabled,
        showPlayback: false,
        onPrevious: () => onPageChange(nextManualCollectionPage(page, pageCount, -1, loop)),
        onNext: () => onPageChange(nextManualCollectionPage(page, pageCount, 1, loop)),
      }));
  }
  return React.createElement("nav", {
    className: `collection-pager${className ? ` ${className}` : ""}`,
    "aria-label": "Collection pages",
  },
  React.createElement(IconControl, {
    interactionId: "collection.previous-page",
    "aria-label": "Previous collection page",
    disabled: previousDisabled,
    onClick: () => onPageChange(nextManualCollectionPage(
      page,
      pageCount,
      -1,
      loop,
    )),
  }),
  React.createElement("span", {
    className: "collection-page-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
  }, `Page ${page + 1} of ${pageCount}`),
  React.createElement(IconControl, {
    interactionId: "collection.next-page",
    "aria-label": "Next collection page",
    disabled: nextDisabled,
    onClick: () => onPageChange(nextManualCollectionPage(
      page,
      pageCount,
      1,
      loop,
    )),
  }));
}
