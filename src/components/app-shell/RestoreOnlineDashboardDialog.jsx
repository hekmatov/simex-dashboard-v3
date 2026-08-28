import React from "react";

import ControlTooltip from "../common/ControlTooltip.jsx";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import { ONLINE_DASHBOARD_RESTORE_DESCRIPTION } from "../../lib/onlineDashboardRestore.js";

export default function RestoreOnlineDashboardDialog({
  open = false,
  busy = false,
  error = "",
  onDownloadPackage,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  const dismiss = busy ? undefined : onCancel;
  return (
    <ModalFocusScope
      as="div"
      open
      initialFocusSelector='[data-modal-initial-focus="true"]'
      onEscape={dismiss}
      className="confirm-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-online-dashboard-title"
      aria-describedby="restore-online-dashboard-warning restore-online-dashboard-download-advice"
      tabIndex={-1}
    >
      <section className="confirm-dialog restore-online-dashboard-dialog">
        <h2 id="restore-online-dashboard-title">Restore online dashboard?</h2>
        <p id="restore-online-dashboard-warning">
          Restoring replaces your local dashboard with the online dashboard served by this SimEx deployment.
        </p>
        <p id="restore-online-dashboard-download-advice">
          Download a dashboard package first if you want to preserve your local work.
        </p>
        {error && <p className="confirm-dialog-error" role="alert">{error}</p>}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="secondary"
            data-modal-initial-focus="true"
            disabled={busy}
            onClick={dismiss}
          >
            Keep local dashboard
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onDownloadPackage}
          >
            Download package first
          </button>
          <ControlTooltip
            disabled={busy}
            explain={!busy}
            reason={busy
              ? "Wait for the online dashboard restore to finish."
              : ONLINE_DASHBOARD_RESTORE_DESCRIPTION}
          >
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Restoring online dashboard…" : "Restore online dashboard"}
            </button>
          </ControlTooltip>
        </div>
      </section>
    </ModalFocusScope>
  );
}
