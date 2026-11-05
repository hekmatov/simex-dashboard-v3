import React from "react";
import BuildPropertiesPane from "./BuildPropertiesPane.jsx";

/** Page and section fields retain the shared Build draft owner. */
export default function ObjectQuickEditor({ onClose, ...props }) {
  return <div className="chart-editor-v3 object-quick-editor">
    <div className="chart-editor-actions"><button type="button" className="secondary" onClick={onClose}>Close</button></div>
    <BuildPropertiesPane {...props} />
    {["page", "section"].includes(props.selection?.kind) && <small>Changes use the current Build session. Use Discard Build changes to restore its baseline.</small>}
  </div>;
}

export function PlacementQuickContext({ context, onMove, disabled }) {
  if (!context) return null;
  return <section className="placement-quick-context" aria-label="Placement context">
    <strong>{context.title || "Untitled panel"}</strong><span>{context.type} · {context.sectionTitle}</span>
    <button type="button" className="secondary" disabled={disabled} onClick={onMove}>Move…</button>
  </section>;
}
