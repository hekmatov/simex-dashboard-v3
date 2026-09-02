import React from "react";

const DEFAULT_GEOMETRY = Object.freeze({ width: 200, height: 56, x: 24, y: 142 });
const MINIMUM_SIZE = Object.freeze({ width: 180, height: 48 });
const KEYBOARD_STEP = 10;
const ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

export default function ChronoDateOverlay({ epochMs, suspended = false }) {
  const interactionRef = React.useRef(null);
  const [geometry, setGeometry] = React.useState(initialGeometry);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const keepInsideViewport = () => setGeometry((current) => constrainGeometry(
      current,
      window.innerWidth,
      window.innerHeight,
    ));
    keepInsideViewport();
    window.addEventListener("resize", keepInsideViewport);
    const observed = [
      document.querySelector(".dashboard-command-crown"),
      document.querySelector(".canonical-dashboard-frame .dashboard-header"),
      document.querySelector(".playback-controls--floating"),
    ].filter(Boolean);
    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(keepInsideViewport)
      : null;
    observed.forEach((element) => resizeObserver?.observe(element));
    const mutationObserver = typeof MutationObserver === "function"
      ? new MutationObserver(keepInsideViewport)
      : null;
    observed.forEach((element) => mutationObserver?.observe(element, { attributes: true, childList: true, subtree: true }));
    return () => {
      window.removeEventListener("resize", keepInsideViewport);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, []);

  const startPointerInteraction = (mode, event) => {
    interactionRef.current = {
      mode,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      geometry,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const updatePointerInteraction = (event) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - interaction.pointerX;
    const deltaY = event.clientY - interaction.pointerY;
    setGeometry(constrainGeometry(
      interaction.mode === "resize"
        ? { ...interaction.geometry, width: interaction.geometry.width + deltaX, height: interaction.geometry.height + deltaY }
        : { ...interaction.geometry, x: interaction.geometry.x + deltaX, y: interaction.geometry.y + deltaY },
      viewportWidth(),
      viewportHeight(),
    ));
  };
  const finishPointerInteraction = (event) => {
    interactionRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const updateFromKeyboard = (mode, event) => {
    if (!ARROW_KEYS.has(event.key)) return;
    event.preventDefault();
    const deltaX = event.key === "ArrowLeft" ? -KEYBOARD_STEP : event.key === "ArrowRight" ? KEYBOARD_STEP : 0;
    const deltaY = event.key === "ArrowUp" ? -KEYBOARD_STEP : event.key === "ArrowDown" ? KEYBOARD_STEP : 0;
    const resize = mode === "resize" || event.shiftKey;
    setGeometry((current) => constrainGeometry(
      resize
        ? { ...current, width: current.width + deltaX, height: current.height + deltaY }
        : { ...current, x: current.x + deltaX, y: current.y + deltaY },
      viewportWidth(),
      viewportHeight(),
    ));
  };

  return React.createElement("aside", {
    className: "chrono-date-overlay",
    hidden: suspended || !Number.isFinite(epochMs),
    role: "status",
    "aria-label": "Chrono date overlay",
    "data-chrono-date-overlay": true,
    style: { left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height },
  },
  React.createElement("time", {
    className: "chrono-date-value",
    tabIndex: 0,
    dateTime: Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : undefined,
    "aria-label": "Move Chrono date overlay",
    onKeyDown: (event) => updateFromKeyboard("move", event),
    onPointerDown: (event) => startPointerInteraction("move", event),
    onPointerMove: updatePointerInteraction,
    onPointerUp: finishPointerInteraction,
    onPointerCancel: finishPointerInteraction,
  }, canonicalDate(epochMs)),
  React.createElement("button", {
    className: "chrono-date-resize",
    type: "button",
    "aria-label": "Resize Chrono date overlay",
    onKeyDown: (event) => updateFromKeyboard("resize", event),
    onPointerDown: (event) => startPointerInteraction("resize", event),
    onPointerMove: updatePointerInteraction,
    onPointerUp: finishPointerInteraction,
    onPointerCancel: finishPointerInteraction,
  }));
}

function initialGeometry() {
  if (typeof window === "undefined" || !Number.isFinite(window.innerWidth)) return DEFAULT_GEOMETRY;
  return constrainGeometry({
    ...DEFAULT_GEOMETRY,
    x: Math.round((window.innerWidth - DEFAULT_GEOMETRY.width) / 2),
  }, window.innerWidth, window.innerHeight);
}

function constrainGeometry(geometry, viewportWidthValue, viewportHeightValue) {
  const bounded = clampGeometry(geometry, viewportWidthValue, viewportHeightValue);
  if (typeof document === "undefined") return bounded;
  const viewportHeight = Number.isFinite(viewportHeightValue) ? viewportHeightValue : 720;
  const crown = visibleRectangle(document.querySelector(".dashboard-command-crown"));
  const dashboardHeader = visibleRectangle(document.querySelector(".canonical-dashboard-frame .dashboard-header"));
  const controller = visibleRectangle(document.querySelector(".playback-controls--floating"));
  let top = Math.max(8, crown ? crown.bottom + 8 : 8);
  if (dashboardHeader) top = Math.max(top, dashboardHeader.bottom + 8);
  let bottom = viewportHeight - 8;
  if (controller) {
    if (controller.element.classList.contains("playback-controls--top")) top = Math.max(top, controller.bottom + 8);
    else bottom = Math.min(bottom, controller.top - 8);
  }
  const availableHeight = Math.max(MINIMUM_SIZE.height, bottom - top);
  const height = Math.min(bounded.height, availableHeight);
  return {
    ...bounded,
    height,
    y: clamp(bounded.y, top, Math.max(top, bottom - height)),
  };
}

function clampGeometry(geometry, viewportWidthValue, viewportHeightValue) {
  const safeViewportWidth = Number.isFinite(viewportWidthValue) ? viewportWidthValue : 1280;
  const safeViewportHeight = Number.isFinite(viewportHeightValue) ? viewportHeightValue : 720;
  const width = clamp(geometry.width, MINIMUM_SIZE.width, Math.max(MINIMUM_SIZE.width, safeViewportWidth - 16));
  const height = clamp(geometry.height, MINIMUM_SIZE.height, Math.max(MINIMUM_SIZE.height, safeViewportHeight - 16));
  return {
    width,
    height,
    x: clamp(geometry.x, 8, Math.max(8, safeViewportWidth - width - 8)),
    y: clamp(geometry.y, 8, Math.max(8, safeViewportHeight - height - 8)),
  };
}

function viewportWidth() {
  return typeof window === "undefined" ? 1280 : window.innerWidth;
}

function viewportHeight() {
  return typeof window === "undefined" ? 720 : window.innerHeight;
}

function visibleRectangle(element) {
  if (!element || element.getClientRects().length === 0) return null;
  return { ...element.getBoundingClientRect().toJSON?.(), element };
}

function canonicalDate(epochMs) {
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString().slice(0, 10) : "";
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
