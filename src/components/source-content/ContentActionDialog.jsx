import React from "react";
import ConfirmDialog from "../common/ConfirmDialog.jsx";

export default function ContentActionDialog({ open = false, action = "delete", itemLabel = "this item", busy = false, error = "", onConfirm, onCancel } = {}) {
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
