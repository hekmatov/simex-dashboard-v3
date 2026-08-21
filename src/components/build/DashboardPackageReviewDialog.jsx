import React from "react";

import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function DashboardPackageReviewDialog({
  candidate = null,
  busy = false,
  error = "",
  onConfirm = noop,
  onCancel = noop,
} = {}) {
  if (!candidate) return null;
  return (
    <ModalFocusScope
      as="div"
      open
      className="confirm-dialog-backdrop dashboard-package-review-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-package-review-title"
      aria-describedby="dashboard-package-review-description"
      initialFocusSelector={'[data-modal-initial-focus="true"]'}
      onEscape={busy ? noop : onCancel}
      tabIndex={-1}
    >
      <section className="confirm-dialog dashboard-package-review">
        <p className="eyebrow">Dashboard package</p>
        <h2 id="dashboard-package-review-title">Review package contents</h2>
        <p id="dashboard-package-review-description">
          Created{" "}
          <time dateTime={candidate.exportedAt ?? undefined}>
            {candidate.exportedAt
              ? formatPackageTimestamp(candidate.exportedAt)
              : "Creation date unavailable"}
          </time>
        </p>
        <ul className="dashboard-package-manifest">
          {candidate.summary.pages.map((page) => (
            <li key={page.id}>
              <span><strong>Page:</strong> {page.name}</span>
              <ul>
                {page.sections.map((section) => (
                  <li key={section.id}>
                    <span><strong>Section:</strong> {section.name}</span>
                    <ul>
                      {section.panels.map((panel) => (
                        <li key={panel.id}>
                          <span><strong>Panel:</strong> {panel.name}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {error ? <p className="confirm-dialog-error" role="alert">{error}</p> : null}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="secondary"
            data-modal-initial-focus="true"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={onConfirm}>
            {busy ? "Loading…" : "Load package"}
          </button>
        </div>
      </section>
    </ModalFocusScope>
  );
}

export function formatPackageTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? "Creation date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp);
}

function noop() {}
