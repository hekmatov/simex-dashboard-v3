import React from "react";

const DEFAULT_GEOMETRY = Object.freeze({ width: 300, height: 112, x: 24, y: 142 });
const MINIMUM_SIZE = Object.freeze({ width: 190, height: 76 });
const KEYBOARD_STEP = 10;
const ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

export default function ChronoDateOverlay({ epochMs, suspended = false }) {
  const interactionRef = React.useRef(null);
  const [geometry, setGeometry] = React.useState(initialGeometry);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const keepInsideViewport = () => setGeometry((current) => clampGeometry(
      current,
      window.innerWidth,
      window.innerHeight,
    ));
    keepInsideViewport();
    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
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
    setGeometry(clampGeometry(
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
    setGeometry((current) => clampGeometry(
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
  return clampGeometry({
    ...DEFAULT_GEOMETRY,
    x: Math.round((window.innerWidth - DEFAULT_GEOMETRY.width) / 2),
  }, window.innerWidth, window.innerHeight);
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

function canonicalDate(epochMs) {
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString().slice(0, 10) : "";
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
