import React from "react";

import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function ApplicationRecovery({
  kind = "dashboard",
  loadStage = "source",
  busy = false,
  error = "",
  profileVersionMismatch = false,
  candidate = null,
  themeProjection = {},
  onReload,
  onChoosePackage,
  onConfirmPackage,
  onCancelPackage,
  onRetry,
  onReloadPage,
}) {
  const fileInputRef = React.useRef(null);
  const importButtonRef = React.useRef(null);
  const choosePackage = () => fileInputRef.current?.click();
  const closeReview = () => {
    onCancelPackage?.();
    window.requestAnimationFrame(() => importButtonRef.current?.focus());
  };

  return (
    <main
      className="application-recovery"
      aria-labelledby="application-recovery-title"
      aria-busy={busy || undefined}
      data-dashboard-style={themeProjection.dashboardStyle}
      data-dashboard-color-profile={themeProjection.dashboardColorProfile}
      data-resolved-appearance={themeProjection.resolvedAppearance}
      style={themeProjection.cssVariables}
    >
      <section className="application-recovery-panel">
        <p className="eyebrow">SimEx Dashboard</p>
        <h1 id="application-recovery-title">{kind === "chunk"
          ? "Part of the dashboard couldn’t be loaded."
          : kind === "render"
            ? "The dashboard hit a display error."
            : "Dashboard couldn’t load. No valid scenario is available."}</h1>
        <p>{kind === "chunk"
          ? "Reload the page to request the missing application file. Your saved dashboard is retained."
          : kind === "render"
            ? "Try the display again. If the error returns, reload the page. Your saved dashboard is retained; changes held only in this session may be lost."
            : loadStage === "saved"
              ? "The saved dashboard could not be opened. Load the latest dashboard source for this session or review a version 3 package. The saved configuration stays untouched until you save changes or confirm a package."
              : "The dashboard source could not be opened. Try loading it again or review a version 3 package. The saved configuration stays untouched until you save changes or confirm a package."}</p>
        {profileVersionMismatch && (
          <p className="application-recovery-advice">
            The dashboard configuration and dataset profiles appear to come from different versions. Reload the dashboard first. If the problem continues, try a hard refresh with <kbd>Ctrl+Shift+R</kbd> on Windows or Linux, or <kbd>Cmd+Shift+R</kbd> on macOS.
          </p>
        )}
        {error && <p className="application-recovery-error" role="alert">{error}</p>}
        <div className="application-recovery-actions">
          {kind !== "dashboard" && onRetry && <button type="button" onClick={onRetry}>Try Again</button>}
          {kind !== "dashboard" && <button type="button" className={onRetry ? "secondary" : undefined} onClick={onReloadPage}>Reload Page</button>}
          {kind === "dashboard" && <button type="button" disabled={busy} onClick={onReload}>
            Load Dashboard Source
          </button>}
          {kind === "dashboard" && <button
            ref={importButtonRef}
            type="button"
            className="secondary"
            disabled={busy}
            onClick={choosePackage}
          >
            Import Dashboard Package
          </button>}
        </div>
        {kind === "dashboard" && <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Choose Dashboard Package"
          disabled={busy}
          onChange={(event) => {
            onChoosePackage?.(event.target.files?.[0]);
            event.target.value = "";
          }}
        />}
      </section>
      {candidate && (
        <ModalFocusScope
          as="div"
          open
          className="confirm-dialog-backdrop dashboard-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-package-review-title"
          initialFocusSelector={'[data-modal-initial-focus="true"]'}
          onEscape={busy ? undefined : closeReview}
        >
          <section className="confirm-dialog application-recovery-review dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact">
            <header className="dashboard-dialog__header">
              <div>
                <p className="eyebrow">Dashboard package</p>
                <h2 id="recovery-package-review-title">Replace the unavailable dashboard?</h2>
              </div>
            </header>
            <div className="confirm-dialog-body dashboard-dialog__body">
              <p>Review the complete dashboard identity before importing it.</p>
              <dl>
                <div><dt>Program</dt><dd>{candidate.summary.program}</dd></div>
                <div><dt>Scenario</dt><dd>{candidate.summary.scenario}</dd></div>
                <div><dt>Pages</dt><dd>{candidate.summary.pages}</dd></div>
                <div><dt>Charts</dt><dd>{candidate.summary.charts}</dd></div>
              </dl>
            </div>
            <div className="confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions">
              <button
                type="button"
                className="secondary"
                data-modal-initial-focus="true"
                disabled={busy}
                onClick={choosePackage}
              >
                Choose Another Package
              </button>
              <button type="button" disabled={busy} onClick={onConfirmPackage}>
                Import Dashboard Package
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={closeReview}>
                Cancel
              </button>
            </div>
          </section>
        </ModalFocusScope>
      )}
    </main>
  );
}
