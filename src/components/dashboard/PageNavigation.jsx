import React from "react";

export default function PageNavigation({ activePageId, pages = [], onPageChange }) {
  return (
    <nav className="page-tabs" aria-label="Dashboard pages">
      {pages.map((page) => {
        const active = page.id === activePageId;
        return (
          <button
            key={page.id}
            type="button"
            className={active ? "active" : "secondary"}
            aria-current={active ? "page" : undefined}
            onClick={() => onPageChange?.(page.id)}
          >
            {page.label}
          </button>
        );
      })}
    </nav>
  );
}
