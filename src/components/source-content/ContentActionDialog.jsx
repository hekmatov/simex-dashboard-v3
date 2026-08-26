import React from "react";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function ContentActionDialog({
  open = false,
  action = "delete",
  itemLabel = "this item",
  busy = false,
  error = "",
  replacementReady = false,
  replacementLabel = "",
  onReplacementFile,
  onConfirm,
  onCancel,
} = {}) {
  if (action === "replace") {
    if (!open) return null;
    const id = `replace-${safeId(itemLabel)}`;
    return (
      <ModalFocusScope
        as="div"
        open
        initialFocusSelector={'[data-modal-initial-focus="true"]'}
        onEscape={busy ? undefined : onCancel}
        className="confirm-dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        tabIndex={-1}
      >
        <section className="confirm-dialog">
          <h2 id={`${id}-title`}>Replace {itemLabel} everywhere?</h2>
          <p id={`${id}-message`}>Choose a validated PNG, JPEG, or WebP file. Every QMD and Image use updates to the next revision while its placement settings stay unchanged.</p>
          <label>
            <span>Replacement image</span>
            <input
              data-modal-initial-focus="true"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(event) => onReplacementFile?.(event.target.files?.[0] ?? null)}
            />
          </label>
          {replacementLabel && <p role="status">Ready: {replacementLabel}</p>}
          {error && <p className="confirm-dialog-error" role="alert">{error}</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button>
            <button type="button" disabled={busy || !replacementReady} onClick={onConfirm}>{busy ? "Replacing…" : "Replace everywhere"}</button>
          </div>
        </section>
      </ModalFocusScope>
    );
  }
  if (action !== "delete") return null;
  return (
    <ConfirmDialog
      open={open}
      title={`Delete ${itemLabel}?`}
      message="This removes the managed item from this dashboard. This action does not remove or change any panels."
      error={error}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      disabled={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function safeId(value) {
  return String(value ?? "item").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}
