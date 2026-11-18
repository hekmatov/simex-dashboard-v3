import React from "react";
import { sceneMemberTimeRole } from "../../charting/time/sceneSchema.js";
import { assertTimeSyncInterpolationAllowed } from "../../charting/time/chronoGroupModel.js";

const EXPLANATIONS = {
  exact: "Exact: show a measurement only at the selected instant; otherwise show no data.",
  lastKnown: "Last known: show the most recent measurement at or before the cursor.",
  nearest: "Nearest: show the closest measurement only within the explicit maximum distance.",
  interpolate: "Interpolate: estimate between surrounding numeric measurements when this chart permits it.",
};

export default function ChartTimeMatchingField({ chart, profile, field, onChange }) {
  const matching = chart.interaction?.timeSync?.matching ?? field.inheritedMatching ?? { policy: "exact" };
  let role, eligibilityError = "", interpolationError = "";
  try { role = sceneMemberTimeRole(chart, {}, { [chart.sourceId]: profile }); } catch (error) { eligibilityError = error.message; }
  if (role) try { assertTimeSyncInterpolationAllowed({ chart, timeRole: role, profile }); } catch (error) { interpolationError = error.message; }
  const emit = next => onChange({ ...(chart.interaction?.timeSync ?? {}), matching: next });
  return <><fieldset className="chart-time-matching" disabled={Boolean(eligibilityError) || field.disabled === true}><legend>Time matching</legend>
    <label>Chart time matching<select value={matching.policy} onChange={event => emit(event.target.value === "nearest"
      ? { policy: "nearest", toleranceMs: matching.policy === "nearest" ? matching.toleranceMs : 0 } : { policy: event.target.value })}>
      <option value="exact">Exact time only</option><option value="lastKnown">Last known value</option>
      <option value="nearest">Nearest within tolerance</option><option value="interpolate" disabled={Boolean(interpolationError)}>Interpolate</option>
    </select></label>
    <p>{EXPLANATIONS[matching.policy]}</p>
    {!chart.interaction?.timeSync?.matching && <p>{field.inheritedMatching ? "Inherited from the saved timeline. Choosing a policy creates a chart default." : "Default: exact time only."}</p>}
    {matching.policy === "nearest" && <label>Chart nearest maximum distance (hours)<input type="number" min="0" step="any"
      value={Number.isFinite(matching.toleranceMs) ? matching.toleranceMs / 3_600_000 : ""}
      onChange={event => emit({ policy: "nearest", toleranceMs: event.target.value === "" ? NaN : Number(event.target.value) * 3_600_000 })} />
      <small>Zero matches the selected instant only.</small></label>}
    {eligibilityError && <p>Assign an eligible temporal data role to enable time matching. {eligibilityError}</p>}
    {!eligibilityError && interpolationError && <small>Interpolation unavailable: {interpolationError}</small>}
  </fieldset>
    {Object.hasOwn(chart.interaction?.timeSync ?? {}, "matching") && <button type="button" className="secondary" disabled={field.disabled === true}
      onClick={() => onChange(null)}>Clear chart time matching</button>}
  </>;
}
