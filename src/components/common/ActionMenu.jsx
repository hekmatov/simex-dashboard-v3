import React from "react";

import ControlTooltip from "./ControlTooltip.jsx";

export function actionMenuKeyTarget(key, index, count) {
  if (count === 0) return null;
  if (key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowUp") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

export function actionMenuPlacement({
  rect, viewportWidth, viewportHeight, commandInset = 0, stickyNavigationBottom = 0,
}) {
  const width = 260;
  const gap = 4;
  const edge = 8;
  const top = Math.min(
    Math.max(rect.bottom + gap, commandInset, stickyNavigationBottom + gap),
    viewportHeight - edge,
  );
  return {
    left: Math.max(edge, Math.min(rect.left, viewportWidth - width - edge)),
    top,
    maxHeight: Math.max(0, viewportHeight - top - edge),
  };
}

export default function ActionMenu({
  id,
  label,
  items = [],
  disabled = false,
  triggerClassName = "secondary",
  triggerProps = {},
  children,
}) {
  const [open, setOpen] = React.useState(false);
  const [placement, setPlacement] = React.useState(null);
  const triggerRef = React.useRef(null);
  const itemRefs = React.useRef([]);

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (event.target.closest?.(`[data-action-menu="${id}"]`)) return;
      close(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, id, open]);

  React.useEffect(() => {
    if (open) itemRefs.current.find((element) => element && !element.disabled)?.focus();
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (open) { close(); return; }
    const trigger = triggerRef.current;
    const buildFrame = trigger.closest('.app-frame[data-dashboard-mode="build"]');
    const commandInset = buildFrame
      ? Number.parseFloat(getComputedStyle(buildFrame).getPropertyValue("--right-side-drawer-top")) || 0
      : 0;
    const navigationRow = buildFrame?.querySelector(
      '.dashboard-command-crown[data-sticky-location="true"] .dashboard-identity-row',
    );
    // At tablet widths the pinned actions wrap below the sticky row's box.
    const stickyNavigationBottom = navigationRow
      ? Math.max(...[navigationRow, ...navigationRow.children].map(node => node.getBoundingClientRect().bottom))
      : 0;
    setPlacement(actionMenuPlacement({
      rect: trigger.getBoundingClientRect(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      commandInset,
      stickyNavigationBottom,
    }));
    setOpen(true);
  };

  const onMenuKeyDown = (event) => {
    const enabledItems = itemRefs.current.filter((element) => element && !element.disabled);
    const index = enabledItems.findIndex((element) => element === document.activeElement);
    const next = actionMenuKeyTarget(event.key, Math.max(0, index), enabledItems.length);
    if (next === null) return;
    event.preventDefault();
    enabledItems[next]?.focus();
  };

  return (
    <div className="action-menu" data-action-menu={id}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        disabled={disabled}
        onClick={toggle}
        {...triggerProps}
      >
        {children}
      </button>
      {open && placement && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className="action-menu-popover"
          style={{ left: placement.left, top: placement.top, maxHeight: placement.maxHeight }}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, index) => {
            const { id: itemId, label: itemLabel, onSelect, disabled: itemDisabled = false, disabledReason = "", danger = false, ...buttonProps } = item;
            return (
              <ControlTooltip key={itemId} disabled={itemDisabled} reason={disabledReason}>
                <button
                  ref={(element) => { itemRefs.current[index] = element; }}
                  type="button"
                  role="menuitem"
                  className={danger ? "danger" : undefined}
                  data-action-menu-item={itemId}
                  disabled={itemDisabled}
                  tabIndex={-1}
                  onClick={() => { close(); onSelect?.(triggerRef.current); }}
                  {...buttonProps}
                >
                  {itemLabel}
                </button>
              </ControlTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
