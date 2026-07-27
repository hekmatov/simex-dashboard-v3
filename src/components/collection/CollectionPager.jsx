import React from "react";

export default function CollectionPager({
  page,
  pageCount,
  onPageChange,
  className = "",
}) {
  if (pageCount <= 1) return null;
  const previousDisabled = page <= 0;
  const nextDisabled = page >= pageCount - 1;
  return React.createElement("nav", {
    className: `collection-pager${className ? ` ${className}` : ""}`,
    "aria-label": "Collection pages",
  },
  React.createElement("button", {
    type: "button",
    "aria-label": "Previous collection page",
    disabled: previousDisabled,
    onClick: () => onPageChange(page - 1),
  }, "Previous"),
  React.createElement("span", {
    className: "collection-page-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
  }, `Page ${page + 1} of ${pageCount}`),
  React.createElement("button", {
    type: "button",
    "aria-label": "Next collection page",
    disabled: nextDisabled,
    onClick: () => onPageChange(page + 1),
  }, "Next"));
}
