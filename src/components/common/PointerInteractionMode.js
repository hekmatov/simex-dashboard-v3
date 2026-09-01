import React from "react";

export const POINTER_INTERACTION_MODE = "pointer-only";
export const pointerControlProps = Object.freeze({ tabIndex: -1 });

const CONTROL_SELECTOR = [
  "a[href]",
  "button",
  "summary",
  "[role=button]",
  "[role=menuitem]",
  "[role=tab]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const useBrowserLayoutEffect = typeof document === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export const PointerInteractionContext = React.createContext(POINTER_INTERACTION_MODE);

export function PointerInteractionBoundary({ children }) {
  useBrowserLayoutEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.body;
    normalizePointerTabStops(root);
    const observer = typeof MutationObserver === "function"
      ? new MutationObserver(() => normalizePointerTabStops(root))
      : null;
    observer?.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["tabindex", "contenteditable", "role", "href", "disabled"],
    });
    const handlePointerDown = (event) => {
      const control = pointerControlFrom(event.target);
      if (!control || control.draggable) return;
      suppressPointerControlFocus(event, control);
    };
    const handleClick = (event) => {
      const control = pointerControlFrom(event.target);
      if (!control || control.draggable || isTextEditingElement(control)) return;
      control.blur?.();
    };
    const handleFocusIn = (event) => suppressNonEditableFocus(event);
    const handleKeyDown = (event) => suppressNonEditableKeyboardInput(event);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      observer?.disconnect();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return React.createElement(
    PointerInteractionContext.Provider,
    { value: POINTER_INTERACTION_MODE },
    children,
  );
}

export function isTextEditingElement(element) {
  const target = element?.nodeType === 1 ? element : element ?? {};
  const tagName = String(target.tagName ?? "").toUpperCase();
  return target.isContentEditable === true
    || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName)
    || target.closest?.("[contenteditable='true']") != null;
}

export function normalizePointerTabStops(root) {
  if (!root?.querySelectorAll) return 0;
  let changed = 0;
  for (const element of root.querySelectorAll(CONTROL_SELECTOR)) {
    if (isTextEditingElement(element) || element.dataset?.pointerKeepFocus !== undefined) continue;
    if (element.tabIndex !== -1) {
      element.tabIndex = -1;
      changed += 1;
    }
  }
  return changed;
}

export function suppressPointerControlFocus(event, explicitControl = null) {
  const control = explicitControl ?? pointerControlFrom(event?.target) ?? event?.currentTarget;
  if (!control || isTextEditingElement(control)) return false;
  event?.preventDefault?.();
  control.blur?.();
  return true;
}

export function suppressNonEditableKeyboardInput(event) {
  if (isTextEditingElement(event?.target)) return false;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  return true;
}

export function suppressNonEditableFocus(event) {
  const target = event?.target;
  if (!target || isTextEditingElement(target)) return false;
  target.blur?.();
  return true;
}

function pointerControlFrom(target) {
  if (!target) return null;
  if (typeof target.closest === "function") return target.closest(CONTROL_SELECTOR);
  return target;
}
