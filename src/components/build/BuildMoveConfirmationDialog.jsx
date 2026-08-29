import React from "react";

import { trapDialogTabKey } from "./BuildMoveDialog.jsx";

export default function BuildMoveConfirmationDialog({ analysis, invoker = null, onConfirm, onCancel }) {
  const confirmRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  React.useEffect(() => {
    if (!analysis) return undefined;
    requestAnimationFrame(() => confirmRef.current?.focus());
    return () => requestAnimationFrame(() => invoker?.focus?.());
  }, [analysis, invoker]);
  if (!analysis) return null;
  const consequences = analysis.consequences ?? [];
  return (
    <div className="build-move-dialog-backdrop" role="presentation">
      <section ref={dialogRef} className="build-move-dialog" role="alertdialog" aria-modal="true" aria-labelledby="build-move-confirm-title" aria-describedby="build-move-confirm-description" onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.();
          return;
        }
        trapDialogTabKey(event, dialogRef.current);
      }}>
        <h2 id="build-move-confirm-title">Move panels across Pages?</h2>
        <p id="build-move-confirm-description">This move changes the following named Scenes. No layout or Scene mutation occurs until you confirm.</p>
        <ul>
          {consequences.map((item, index) => (
            <li key={`${item.type}:${item.sceneId}:${index}`}>
              <strong>{item.sceneName}</strong>: {consequenceText(item)}
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button ref={confirmRef} type="button" onClick={onConfirm}>Confirm move</button>
        </div>
      </section>
    </div>
  );
}

function consequenceText(item) {
  const charts = (item.chartNames ?? item.chartIds ?? []).join(", ");
  if (item.type === "scene-partial-split") return `${charts} will be removed from this Scene.`;
  if (item.type === "scene-frame-source-unresolved") return `${charts} is the frame source; Frame source becomes unresolved and needs attention.`;
  if (item.type === "scene-present-fallback") return `Present fallback: ${charts} leaves Present; layout ${item.presentLayout} will show ${(item.presentChartIds ?? []).join(", ")}.`;
  if (item.type === "scene-page-migration") return `${charts} and the whole Scene move to the destination Page.`;
  return `${charts} changes.`;
}
