import React from "react";

const documentEscapeStacks = new WeakMap();
const useBrowserLayoutEffect = typeof document === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

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

/** Dialogs retain normal Escape dismissal without moving, trapping, or restoring focus. */
export function useModalFocus({
  open = true,
  dialogRef: suppliedDialogRef,
  onEscape = noop,
} = {}) {
  const internalDialogRef = React.useRef(null);
  const dialogRef = suppliedDialogRef ?? internalDialogRef;
  const latestEscape = React.useRef(onEscape);
  latestEscape.current = onEscape;

  useBrowserLayoutEffect(() => {
    const node = dialogRef.current;
    const ownerDocument = node?.ownerDocument;
    if (!open || !node || !ownerDocument) return undefined;
    return registerModalEscape(ownerDocument, {
      node,
      onEscape: () => latestEscape.current?.(),
    });
  }, [dialogRef, open]);

  return dialogRef;
}

export function getFocusableElements() {
  return [];
}

function registerModalEscape(ownerDocument, entry) {
  let stack = documentEscapeStacks.get(ownerDocument);
  if (!stack) {
    stack = { entries: [], onKeyDown: null };
    stack.onKeyDown = (event) => handleModalEscape(stack, event);
    documentEscapeStacks.set(ownerDocument, stack);
  }
  stack.entries.push(entry);
  if (stack.entries.length === 1) {
    ownerDocument.addEventListener("keydown", stack.onKeyDown);
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const index = stack.entries.indexOf(entry);
    if (index >= 0) stack.entries.splice(index, 1);
    if (stack.entries.length === 0) {
      ownerDocument.removeEventListener("keydown", stack.onKeyDown);
      documentEscapeStacks.delete(ownerDocument);
    }
  };
}

function handleModalEscape(stack, event) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const top = stack.entries.at(-1);
  if (!top) return;
  setTimeout(() => {
    if (event.defaultPrevented) return;
    if (stack.entries.at(-1) !== top) return;
    if (top.node.ownerDocument.documentElement.dataset.simexEyedropperActive === "true") return;
    top.onEscape();
  });
}

function noop() {}
