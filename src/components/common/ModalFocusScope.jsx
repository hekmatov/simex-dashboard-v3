import React from "react";

export default function ModalFocusScope({
  as = "div",
  open = true,
  initialFocusRef: _initialFocusRef,
  initialFocusSelector: _initialFocusSelector,
  restoreFocus: _restoreFocus,
  onEscape = noop,
  tabIndex = -1,
  children,
  ...props
} = {}) {
  const dialogRef = useModalFocus({ open, onEscape });
  return React.createElement(as, { ...props, ref: dialogRef, tabIndex }, children);
}

/** Pointer-only dialogs do not move, trap, restore, or handle keyboard focus. */
export function useModalFocus({
  open = true,
  dialogRef: suppliedDialogRef,
  onEscape: _onEscape = noop,
} = {}) {
  const internalDialogRef = React.useRef(null);
  return suppliedDialogRef ?? internalDialogRef;
}

export function getFocusableElements() {
  return [];
}

function noop() {}
