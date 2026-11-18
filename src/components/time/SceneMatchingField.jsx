import React from "react";
import { sceneMatchingEdit, sceneMatchingPolicy } from "../../charting/time/sceneMatching.js";

const POLICIES = [
  ["exact", "Concurrent only"], ["lastKnown", "Snap to Latest"],
  ["nearest", "Snap to Closest"], ["interpolate", "Interpolate"],
];

export default function SceneMatchingField({ label = "Matching", value, disabled, onChange }) {
  const policy = sceneMatchingPolicy(value);
  const legacyUnbounded = typeof value === "string" && policy === "nearest";
  const toleranceMs = legacyUnbounded ? undefined : value?.toleranceMs ?? 0;
  return <>
    <label>{label}<select value={policy} disabled={disabled}
      onChange={event => onChange?.(sceneMatchingEdit(event.target.value, value))}>
      <option value="authored">Use authored default</option>
      {POLICIES.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
    </select></label>
    {policy === "nearest" && <label>{label} maximum distance (hours)
      <input type="number" min="0" step="any" value={Number.isFinite(toleranceMs) ? toleranceMs / 3600000 : ""}
        disabled={disabled} onChange={event => onChange?.({ policy: "nearest", toleranceMs: event.target.value === "" ? NaN : Number(event.target.value) * 3600000 })} />
      <small>{legacyUnbounded ? "Set a maximum distance to repair this legacy nearest setting." : "Zero allows observations at the selected instant only."}</small>
    </label>}
  </>;
}
