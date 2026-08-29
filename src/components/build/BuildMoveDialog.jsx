import React from "react";

import { buildMoveDestinations, canonicalMove } from "./buildTreeInteraction.js";

const DIALOG_FOCUSABLE = 'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function trapDialogTabKey(event, container) {
  if (event.key !== "Tab" || !container) return false;
  const controls = [...container.querySelectorAll(DIALOG_FOCUSABLE)].filter((control) => !control.hidden);
  if (controls.length === 0) return false;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if ((!event.shiftKey && event.target === last) || (event.shiftKey && event.target === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return true;
  }
  return false;
}

export default function BuildMoveDialog({ open = false, dashboard = {}, source, sourceLabel = "item", invoker = null, onMove, onCancel }) {
  const destinations = React.useMemo(() => buildMoveDestinations(dashboard, source), [dashboard, source]);
  const [destinationIndex, setDestinationIndex] = React.useState("0");
  const firstControlRef = React.useRef(null);
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    setDestinationIndex("0");
    requestAnimationFrame(() => firstControlRef.current?.focus());
    return () => requestAnimationFrame(() => invoker?.focus?.());
  }, [invoker, open]);

  if (!open) return null;
  const submit = (event) => {
    event.preventDefault();
    const destination = destinations[Number(destinationIndex)];
    const move = destination ? canonicalMove(source, destination.target) : null;
    if (move) onMove?.(move);
  };
  return (
    <div className="build-move-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel?.();
    }}>
      <section ref={dialogRef} className="build-move-dialog" role="dialog" aria-modal="true" aria-labelledby="build-move-dialog-title" onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.();
          return;
        }
        trapDialogTabKey(event, dialogRef.current);
      }}>
        <form onSubmit={submit}>
          <h2 id="build-move-dialog-title">Move {sourceLabel}</h2>
          <label>
            Destination
            <select ref={firstControlRef} aria-label="Destination" value={destinationIndex} onChange={(event) => setDestinationIndex(event.target.value)}>
              {destinations.map((destination, index) => <option value={String(index)} key={`${destination.label}:${index}`}>{destination.label}</option>)}
            </select>
          </label>
          <div className="dialog-actions">
            <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" disabled={destinations.length === 0}>Move</button>
          </div>
        </form>
      </section>
    </div>
  );
}
