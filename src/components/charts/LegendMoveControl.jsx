import { createPortal } from "react-dom";
import React from "react";
import { constrainLegendRect, legendDragPoint, nearestLegendPlacement } from "../../charting/rendering/legendPlacement.js";
import { legendPlacementLabel } from "../../charting/presentation/legendPlacementContract.js";
export default function LegendMoveControl({ hostRef, lifecycleRef, geometry, onChange, revision, portalTarget }) {
  const gesture = React.useRef(null);
  const [hint, setHint] = React.useState("");
  const [announcement, setAnnouncement] = React.useState("");
  const cancel = React.useCallback(() => {
    const active = gesture.current;
    if (!active) return;
    gesture.current = null;
    lifecycleRef.current?.restoreLegend();
    if (active.button.hasPointerCapture?.(active.id)) active.button.releasePointerCapture(active.id);
    setHint("");
  }, [lifecycleRef]);
  React.useEffect(() => {
    const escape = (event) => {
      if (event.key === "Escape" && gesture.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
      }
    };
    window.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("keydown", escape, true);
      cancel();
    };
  }, [cancel]);
  React.useEffect(() => {
    cancel();
  }, [revision, geometry?.chartBounds?.width, geometry?.chartBounds?.height, cancel]);
  if (!geometry || !onChange || !portalTarget) return null;
  return createPortal(React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "legend-move-control secondary",
      "aria-label": "Move legend",
      title: "Drag to move the legend. Escape cancels. Placement and offset fields also work with a keyboard.",
      style: { width:96, minHeight:24 },
      onPointerDown: (event) => {
        if (event.button !== 0 || gesture.current) return;
        event.preventDefault();
        event.stopPropagation();
        const candidates = lifecycleRef.current?.getLegendCandidates() ?? [];
        const current = lifecycleRef.current?.getLegendGeometry() ?? geometry;
        const viewport = hostRef.current.getBoundingClientRect();
        const point = legendDragPoint(event, viewport, geometry.chartBounds);
        gesture.current = {
          id: event.pointerId,
          button: event.currentTarget,
          startX: event.clientX,
          startY: event.clientY,
          geometry: { ...structuredClone(current), candidates },
          viewport,
          grab: { x: point.x - current.rect.x, y: point.y - current.rect.y },
          moved: false
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event) => {
        const g = gesture.current;
        if (!g || g.id !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        if (!g.moved && Math.hypot(event.clientX - g.startX, event.clientY - g.startY) < 4) return;
        const viewport = hostRef.current.getBoundingClientRect();
        if (Math.abs(viewport.width-g.viewport.width) > .1 || Math.abs(viewport.height-g.viewport.height) > .1) { cancel(); return; }
        g.moved = true;
        const point = legendDragPoint(event, hostRef.current.getBoundingClientRect(), g.geometry.chartBounds, g.grab);
        g.dropped = constrainLegendRect({ ...g.geometry.rect, ...point }, g.geometry.chartBounds);
        lifecycleRef.current?.previewLegendRect(g.dropped);
        const candidate = nearestLegendPlacement({ droppedRect: g.dropped, candidates: g.geometry.candidates, currentPlacement: g.geometry.placement });
        setHint(candidate ? legendPlacementLabel(candidate.placement) : "");
      },
      onPointerUp: (event) => {
        const g = gesture.current;
        if (!g || event.pointerId !== g.id) return;
        event.preventDefault();
        event.stopPropagation();
        gesture.current = null;
        if (g.button.hasPointerCapture?.(g.id)) g.button.releasePointerCapture(g.id);
        setHint("");
        if (!g.moved) return;
        const candidate = nearestLegendPlacement({ droppedRect: g.dropped, candidates: g.geometry.candidates, currentPlacement: g.geometry.placement });
        const settled = candidate && lifecycleRef.current?.settleLegendPlacement(candidate.placement);
        if (!settled) {
          lifecycleRef.current?.restoreLegend();
          return;
        }
        const value = { position: candidate.placement, offsetX: g.dropped.x - settled.zeroRect.x, offsetY: g.dropped.y - settled.zeroRect.y };
        onChange(value);
        setAnnouncement(`${legendPlacementLabel(value.position)}. Horizontal offset ${value.offsetX.toFixed(1)}, vertical offset ${value.offsetY.toFixed(1)}.`);
      },
      onPointerCancel: event => { if (gesture.current?.id === event.pointerId) cancel(); },
      onLostPointerCapture: () => {
        if (gesture.current) cancel();
      }
    },
    "Move legend"
  ), hint && /* @__PURE__ */ React.createElement("span", { className: "legend-move-hint", role: "status" }, hint), /* @__PURE__ */ React.createElement("span", { className: "visually-hidden", role: "status", "aria-live": "polite" }, announcement)), portalTarget);
}
