import React from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "summary",
  "[contenteditable=\"true\"]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

const documentRegistries = new WeakMap();
const useBrowserLayoutEffect =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

export default function ModalFocusScope({
  as = "div",
  open = true,
  initialFocusRef,
  initialFocusSelector = "",
  onEscape = noop,
  tabIndex = -1,
  children,
  ...props
} = {}) {
  const dialogRef = useModalFocus({
    open,
    initialFocusRef,
    initialFocusSelector,
    onEscape,
  });
  return React.createElement(as, {
    ...props,
    ref: dialogRef,
    tabIndex,
  }, children);
}

/**
 * Gives an aria-modal container a single, document-scoped focus boundary.
 *
 * Modals in the same document share one listener and form a stack. This keeps
 * parent dialogs mounted while only the most recently opened child handles
 * Tab or Escape.
 */
export function useModalFocus({
  open = true,
  dialogRef: suppliedDialogRef,
  initialFocusRef,
  initialFocusSelector = "",
  onEscape = noop,
} = {}) {
  const internalDialogRef = React.useRef(null);
  const dialogRef = suppliedDialogRef ?? internalDialogRef;
  const latest = React.useRef({
    initialFocusRef,
    initialFocusSelector,
    onEscape,
  });
  latest.current = {
    initialFocusRef,
    initialFocusSelector,
    onEscape,
  };

  useBrowserLayoutEffect(() => {
    const node = dialogRef?.current;
    const ownerDocument = node?.ownerDocument;
    if (!open || !node || !ownerDocument) return undefined;

    return registerModal({
      node,
      getInitialFocusRef: () => latest.current.initialFocusRef,
      getInitialFocusSelector: () => latest.current.initialFocusSelector,
      onEscape: () => latest.current.onEscape?.(),
    });
  }, [dialogRef, open]);

  return dialogRef;
}

export function getFocusableElements(container) {
  if (!container?.querySelectorAll) return [];
  const elements = [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter(isFocusableElement);
  return elements
    .map((element, order) => ({ element, order }))
    .sort((left, right) => {
      const leftTabIndex = left.element.tabIndex;
      const rightTabIndex = right.element.tabIndex;
      const leftRank = leftTabIndex > 0 ? leftTabIndex : Number.MAX_SAFE_INTEGER;
      const rightRank = rightTabIndex > 0
        ? rightTabIndex
        : Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.order - right.order;
    })
    .map(({ element }) => element);
}

function registerModal(entry) {
  const ownerDocument = entry.node.ownerDocument;
  const registry = registryFor(ownerDocument);
  const returnFocus = connectedElement(ownerDocument.activeElement);
  const parentEntry = findParentEntry(registry.entries, entry.node, returnFocus);
  const registered = {
    ...entry,
    parentEntry,
    returnFocus,
  };
  registry.entries.push(registered);
  if (registry.entries.length === 1) {
    ownerDocument.addEventListener("keydown", registry.onKeyDown, true);
  }
  focusInitialElement(registered);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const index = registry.entries.indexOf(registered);
    if (index < 0) return;
    const wasTop = index === registry.entries.length - 1;
    registry.entries.splice(index, 1);
    if (registry.entries.length === 0) {
      ownerDocument.removeEventListener("keydown", registry.onKeyDown, true);
      documentRegistries.delete(ownerDocument);
    }
    if (wasTop) restoreFocus(registered);
  };
}

function registryFor(ownerDocument) {
  const existing = documentRegistries.get(ownerDocument);
  if (existing) return existing;
  const registry = {
    entries: [],
    onKeyDown: null,
  };
  registry.onKeyDown = (event) => handleModalKeyDown(registry, event);
  documentRegistries.set(ownerDocument, registry);
  return registry;
}

function handleModalKeyDown(registry, event) {
  const top = registry.entries.at(-1);
  if (!top) return;
  if (
    event.key === "Escape"
    && top.node.ownerDocument.documentElement.dataset.simexEyedropperActive === "true"
  ) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    top.onEscape();
    return;
  }
  if (event.key !== "Tab") return;

  const focusables = getFocusableElements(top.node);
  if (focusables.length === 0) {
    event.preventDefault();
    focusElement(top.node);
    return;
  }
  const ownerDocument = top.node.ownerDocument;
  const activeElement = ownerDocument.activeElement;
  const first = focusables[0];
  const last = focusables.at(-1);
  if (!top.node.contains(activeElement)) {
    event.preventDefault();
    focusElement(event.shiftKey ? last : first);
    return;
  }
  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    focusElement(last);
    return;
  }
  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    focusElement(first);
  }
}

function focusInitialElement(entry) {
  const explicit = connectedElement(entry.getInitialFocusRef()?.current);
  if (explicit && entry.node.contains(explicit) && isFocusableElement(explicit)) {
    focusElement(explicit);
    return;
  }
  const selector = entry.getInitialFocusSelector();
  if (typeof selector === "string" && selector.trim()) {
    const selected = [...entry.node.querySelectorAll(selector)]
      .find(isFocusableElement);
    if (selected) {
      focusElement(selected);
      return;
    }
  }
  const first = getFocusableElements(entry.node)[0];
  focusElement(first ?? entry.node);
}

function restoreFocus(entry) {
  let current = entry;
  while (current) {
    const target = connectedElement(current.returnFocus);
    if (target) {
      focusElement(target);
      return;
    }
    current = current.parentEntry;
  }
}

function findParentEntry(entries, node, returnFocus) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const candidate = entries[index];
    if (
      candidate.node.contains(node)
      || (returnFocus && candidate.node.contains(returnFocus))
    ) {
      return candidate;
    }
  }
  return null;
}

function isFocusableElement(element) {
  if (!connectedElement(element) || element.tabIndex < 0) return false;
  if (element.disabled || element.closest?.("[hidden],[aria-hidden=\"true\"]")) {
    return false;
  }
  const ownerWindow = element.ownerDocument?.defaultView;
  const style = ownerWindow?.getComputedStyle?.(element);
  if (style?.display === "none" || style?.visibility === "hidden") {
    return false;
  }
  return typeof element.getClientRects !== "function"
    || element.getClientRects().length > 0;
}

function connectedElement(value) {
  return value && value.nodeType === 1 && value.isConnected ? value : null;
}

function focusElement(element) {
  if (typeof element?.focus === "function") {
    element.focus({ preventScroll: true });
  }
}

function noop() {}
