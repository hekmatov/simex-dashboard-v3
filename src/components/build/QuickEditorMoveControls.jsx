import React from "react";
import { SimExIcon } from "../common/SimExIcon.js";

export const QuickEditorMoveContext = React.createContext(null);

export function QuickEditorResetPosition() {
  const move = React.useContext(QuickEditorMoveContext);
  if (!move?.manual) return null;
  return <button type="button" className="secondary quick-editor-reset-position" aria-label="Reset editor position"
    title="Reset editor position" onClick={move.reset}>↺</button>;
}

export default function QuickEditorMoveControls({ disabled = false }) {
  const move = React.useContext(QuickEditorMoveContext);
  if (!move) return null;
  return <>
    <button type="button" className="secondary quick-editor-move-handle" disabled={disabled}
      aria-label="Move quick editor" title="Drag to move. Arrow keys move; Escape restores the starting position."
      {...move.handleProps}><SimExIcon iconId="moveFourWay" size={16} /></button>
    <span className="visually-hidden" role="status" aria-live="polite">{move.announcement}</span>
  </>;
}
