import React from "react";

export const DASHBOARD_CANVAS_ACTION_NAMES = Object.freeze([
  "select",
  "removePanel",
  "requestPanelMove",
  "panelDragStart",
  "panelDragOver",
  "panelDrop",
  "panelDragEnd",
  "reorderSection",
  "structureCommand",
  "addPage",
  "addSection",
  "addChart",
  "addStaticContent",
]);

export function createDashboardCanvasActions(getCurrentHandlers) {
  return Object.freeze(Object.fromEntries(DASHBOARD_CANVAS_ACTION_NAMES.map((name) => [
    name,
    (...args) => getCurrentHandlers()[name]?.(...args),
  ])));
}

export function useDashboardCanvasActions(handlers) {
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;
  return React.useMemo(
    () => createDashboardCanvasActions(() => handlersRef.current),
    [],
  );
}
