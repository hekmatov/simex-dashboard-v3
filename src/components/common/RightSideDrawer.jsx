import React from "react";

import ModalFocusScope from "./ModalFocusScope.jsx";
import { pointerControlProps } from "./PointerInteractionMode.js";

export const RIGHT_SIDE_DRAWER_CHANGE_EVENT = "simex:right-side-drawer-change";
export const RIGHT_SIDE_DRAWER_SELECTOR = '[data-right-side-drawer][data-open="true"]';

const useBrowserLayoutEffect = typeof document === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function RightSideDrawer({
  id,
  title,
  open,
  onClose,
  modality,
  eyebrow = "",
  description = "",
  className = "",
  layerClassName = "",
  clickCatcherClassName = "",
  headerClassName = "",
  contentClassName = "",
  closeClassName = "secondary",
  headerActions = null,
  footer = null,
  panelProps = {},
  children,
}) {
  if (modality !== "dialog" && modality !== "complementary") {
    throw new TypeError('RightSideDrawer modality must be "dialog" or "complementary".');
  }

  const latestClose = React.useRef(onClose);
  latestClose.current = onClose;

  useBrowserLayoutEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const closeForPeerDrawer = (event) => {
      if (event.detail?.open !== true || event.detail?.id === id) return;
      requestRightSideDrawerClose(latestClose.current, "peer-open");
    };
    window.addEventListener(RIGHT_SIDE_DRAWER_CHANGE_EVENT, closeForPeerDrawer);
    notifyRightSideDrawerChange(id, true);
    return () => {
      window.removeEventListener(RIGHT_SIDE_DRAWER_CHANGE_EVENT, closeForPeerDrawer);
      window.requestAnimationFrame?.(() => notifyRightSideDrawerChange(id, false));
    };
  }, [id, modality, open]);

  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;
  const drawerClassName = joinClasses(
    "right-side-drawer",
    modality === "dialog" && "dashboard-dialog dashboard-dialog--workspace dashboard-dialog--wide",
    className,
  );
  const layerClasses = joinClasses("right-side-drawer-layer", layerClassName);
  const headerClasses = joinClasses(
    "right-side-drawer__header",
    modality === "dialog" && "dashboard-dialog__header",
    headerClassName,
  );
  const contentClasses = joinClasses(
    "right-side-drawer__content",
    modality === "dialog" && "dashboard-dialog__body",
    contentClassName,
  );
  const controlledPanelProps = {
    ...panelProps,
    id,
    className: drawerClassName,
    "data-right-side-drawer": id,
    "data-open": open ? "true" : "false",
    "data-drawer-modality": modality,
    role: modality,
    "aria-modal": open && modality === "dialog" ? "true" : undefined,
    "aria-hidden": open ? undefined : "true",
    "aria-labelledby": titleId,
    "aria-describedby": descriptionId,
    tabIndex: -1,
    hidden: !open,
    inert: open ? undefined : true,
  };
  const panelChildren = (
    <>
      <header className={headerClasses}>
        <div className="right-side-drawer__heading">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        {headerActions}
        <button
          type="button"
          {...pointerControlProps}
          className={closeClassName}
          aria-label={`Close ${title}`}
          onClick={() => requestRightSideDrawerClose(latestClose.current, "close-button")}
        >
          Close
        </button>
      </header>
      <div className={contentClasses}>{children}</div>
      {footer}
    </>
  );

  return (
    <div
      className={layerClasses}
      data-right-side-drawer-layer={id}
      data-drawer-modality={modality}
      hidden={!open}
    >
      {open && modality === "dialog" && (
        <div
          className={joinClasses("right-side-drawer-click-catcher", clickCatcherClassName)}
          aria-hidden="true"
          onMouseDown={() => requestRightSideDrawerClose(latestClose.current, "click-away")}
        />
      )}
      {modality === "dialog" ? (
        <ModalFocusScope
          as="aside"
          open={open}
          {...controlledPanelProps}
          onEscape={() => requestRightSideDrawerClose(latestClose.current, "escape")}
        >
          {panelChildren}
        </ModalFocusScope>
      ) : (
        <aside {...controlledPanelProps}>{panelChildren}</aside>
      )}
    </div>
  );
}

export function rightSideDrawerTopFromCrown({
  crownBottom,
  viewportTop = 0,
  gap = 12,
} = {}) {
  const safeViewportTop = Number.isFinite(viewportTop) ? viewportTop : 0;
  const safeGap = Number.isFinite(gap) && gap >= 0 ? gap : 12;
  const safeCrownBottom = Number.isFinite(crownBottom) ? crownBottom : safeViewportTop;
  return Math.ceil(Math.max(safeViewportTop, safeCrownBottom) + safeGap);
}

export function requestRightSideDrawerClose(onClose, reason) {
  onClose?.(reason);
}

export function restoreRightSideDrawerTriggerFocus(trigger) {
  return false;
}

function notifyRightSideDrawerChange(id, open) {
  if (
    typeof window === "undefined"
    || typeof window.dispatchEvent !== "function"
    || typeof window.CustomEvent !== "function"
  ) return;
  window.dispatchEvent(new window.CustomEvent(RIGHT_SIDE_DRAWER_CHANGE_EVENT, {
    detail: { id, open },
  }));
}

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}
