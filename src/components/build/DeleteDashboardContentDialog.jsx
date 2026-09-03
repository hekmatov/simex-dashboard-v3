import React from "react";

import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function DeleteDashboardContentDialog({
  open = false,
  summary = {},
  busy = false,
  error = "",
  onConfirm,
  onCancel,
}) {
  const [acknowledged, setAcknowledged] = React.useState(false);

  React.useEffect(() => {
    if (!open) setAcknowledged(false);
  }, [open]);

  if (!open) return null;
  const dismiss = busy ? undefined : onCancel;
  const consequences = [
    countLabel(summary.pages, "Page"),
    countLabel(summary.charts, "chart"),
    countLabel(summary.sources, "data source"),
    countLabel(summary.chronoGroups, "Chrono Group"),
    countLabel(summary.scenes, "Scene"),
  ];

  return (
    <ModalFocusScope
      as="div"
      open
      initialFocusSelector='[data-modal-initial-focus="true"]'
      onEscape={dismiss}
      className="confirm-dialog-backdrop dashboard-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dashboard-content-title"
      aria-describedby="delete-dashboard-content-description delete-dashboard-content-acknowledgement"
      tabIndex={-1}
    >
      <section className="confirm-dialog delete-dashboard-content-dialog dashboard-dialog dashboard-dialog--danger dashboard-dialog--compact">
        <header className="dashboard-dialog__header">
          <h2 id="delete-dashboard-content-title">Delete all dashboard content?</h2>
        </header>
        <div className="confirm-dialog-body dashboard-dialog__body">
          <p id="delete-dashboard-content-description">
            Delete all authored dashboard pages, charts, sources, media, Chrono Groups, and Scenes. Canonical Home remains available. Theme and identity settings are preserved.
          </p>
          <ul className="delete-dashboard-content-summary" aria-label="Content to delete">
            {consequences.map((label) => <li key={label}>{label}</li>)}
          </ul>
          <label className="delete-dashboard-content-acknowledgement dashboard-choice-row" id="delete-dashboard-content-acknowledgement">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={busy}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span className="dashboard-choice-copy">
              <span>I understand that the authored dashboard content listed above will be permanently deleted.</span>
            </span>
          </label>
          {error && <p className="confirm-dialog-error" role="alert">{error}</p>}
        </div>
        <div className="confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions">
          <button
            type="button"
            className="secondary"
            data-modal-initial-focus="true"
            disabled={busy}
            onClick={dismiss}
          >
            Keep dashboard
          </button>
          <button
            type="button"
            className="danger"
            disabled={busy || !acknowledged}
            onClick={onConfirm}
          >
            {busy ? "Deleting dashboard content…" : "Delete all dashboard content"}
          </button>
        </div>
      </section>
    </ModalFocusScope>
  );
}

function countLabel(value, singular) {
  const count = Number.isFinite(value) ? value : 0;
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
