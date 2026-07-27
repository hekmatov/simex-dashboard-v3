import React from "react";

const ZOOM_HINT = "Hold Ctrl while scrolling to zoom";

export function wheelZoomDecision(event) {
  let ctrlKey = false;
  try {
    ctrlKey = event?.ctrlKey === true;
  } catch {}
  return ctrlKey
    ? { allowChartZoom: true, preventDefault: true, showHint: false }
    : { allowChartZoom: false, preventDefault: false, showHint: true };
}

export function createZoomGuardController({
  onHintChange = () => {},
} = {}) {
  let pointerActive = false;
  let focusActive = false;
  let hintShown = false;

  function setHint(next) {
    if (hintShown === next) return;
    hintShown = next;
    safeCall(onHintChange, next);
  }

  function beginSession(kind) {
    const hadActiveSession = pointerActive || focusActive;
    if (kind === "pointer") pointerActive = true;
    if (kind === "focus") focusActive = true;
    if (!hadActiveSession) setHint(false);
  }

  function endSession(kind) {
    if (kind === "pointer") pointerActive = false;
    if (kind === "focus") focusActive = false;
    if (!pointerActive && !focusActive) setHint(false);
  }

  return {
    pointerEnter() {
      beginSession("pointer");
    },
    pointerLeave() {
      endSession("pointer");
    },
    focus() {
      beginSession("focus");
    },
    blur() {
      endSession("focus");
    },
    handleWheel(event) {
      const decision = wheelZoomDecision(event);
      if (decision.allowChartZoom) {
        callEventMethod(event, "preventDefault");
      } else {
        callEventMethod(event, "stopPropagation");
        if (decision.showHint && !hintShown) setHint(true);
      }
      return decision;
    },
  };
}

export default function ZoomGuard({ children }) {
  const [showHint, setShowHint] = React.useState(false);
  const controllerRef = React.useRef(null);
  const hintId = React.useId();
  if (!controllerRef.current) {
    controllerRef.current = createZoomGuardController({
      onHintChange: setShowHint,
    });
  }
  const controller = controllerRef.current;

  return React.createElement(
    "div",
    {
      className: "chart-zoom-guard",
      tabIndex: 0,
      "aria-describedby": hintId,
      onPointerEnter: controller.pointerEnter,
      onPointerLeave: controller.pointerLeave,
      onFocus: controller.focus,
      onBlur: controller.blur,
      onWheelCapture: controller.handleWheel,
    },
    children,
    React.createElement(
      "span",
      {
        id: hintId,
        className: showHint
          ? "chart-zoom-hint chart-zoom-hint--visible"
          : "chart-zoom-hint",
        role: "status",
        "aria-live": "polite",
      },
      ZOOM_HINT,
    ),
  );
}

function safeCall(callback, ...args) {
  if (typeof callback !== "function") return;
  try {
    callback(...args);
  } catch {}
}

function callEventMethod(event, method) {
  try {
    const callback = event?.[method];
    if (typeof callback === "function") callback.call(event);
  } catch {}
}
