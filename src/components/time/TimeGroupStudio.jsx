import React from "react";

import { MATCHING_POLICY_LABELS } from "../../charting/time/temporalMatch.js";
import AvailabilityLedger from "./AvailabilityLedger.jsx";
import { TIME_GROUP_STAGES } from "./timeGroupDraft.js";

const STAGE_LABELS = Object.freeze({
  period: "Choose period",
  charts: "Choose charts",
  defaults: "Set defaults",
  review: "Name and review",
});

export default function TimeGroupStudio({ draft, disabled = false, onAction }) {
  const value = draft?.value ?? {};
  const stage = draft?.stage ?? "period";
  const busy = disabled || draft?.status === "saving";
  const dirty = new Set(["dirty", "error", "suspended"]).has(draft?.status);

  return (
    <section className="time-group-studio" aria-labelledby="time-group-studio-title">
      <header>
        <div>
          <p className="eyebrow">Temporal authoring</p>
          <h2 id="time-group-studio-title">Time Group Studio</h2>
        </div>
        <span data-status={draft?.status ?? "clean"}>
          {draft?.status === "saving" ? "Saving Time Group" : dirty ? "Unsaved Time Group" : "Time Group saved"}
        </span>
      </header>

      <nav aria-label="Time Group stages">
        <ol>
          {TIME_GROUP_STAGES.map((stageId) => (
            <li key={stageId}>
              <button
                aria-current={stage === stageId ? "step" : undefined}
                type="button"
                disabled={busy}
                onClick={() => onAction?.({ type: "GO_TO_STAGE", stage: stageId })}
              >
                {STAGE_LABELS[stageId]}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {draft?.error && <p role="alert">{draft.error.message}</p>}
      <div aria-live="polite">
        {stage === "period" && (
          <fieldset>
            <legend>Choose period</legend>
            <label>
              Start date
              <input
                id="period-start"
                type="date"
                disabled={busy}
                value={dateInputValue(value.period?.startEpochMs)}
                onChange={(event) => onAction?.({
                  type: "SET_PERIOD",
                  period: {
                    ...value.period,
                    startEpochMs: Date.parse(`${event.target.value}T00:00:00.000Z`),
                  },
                })}
              />
            </label>
            <label>
              End date
              <input
                id="period-end"
                type="date"
                disabled={busy}
                value={dateInputValue(value.period?.endEpochMs)}
                onChange={(event) => onAction?.({
                  type: "SET_PERIOD",
                  period: {
                    ...value.period,
                    endEpochMs: Date.parse(`${event.target.value}T00:00:00.000Z`),
                  },
                })}
              />
            </label>
            <p>Dashboard timezone: {draft?.timeZone ?? "UTC"}</p>
          </fieldset>
        )}

        {stage === "charts" && (
          <AvailabilityLedger
            rows={draft?.availabilityRows ?? []}
            disabled={busy}
            onToggle={(chartId, selected) => onAction?.({
              type: "TOGGLE_CHART",
              chartId,
              selected,
            })}
          />
        )}

        {stage === "defaults" && (
          <fieldset>
            <legend>Set defaults</legend>
            <label>
              Matching policy
              <select
                id="time-group-default-matching"
                disabled={busy}
                value={value.defaultMatching}
                onChange={(event) => onAction?.({
                  type: "SET_DEFAULT_MATCHING",
                  policy: event.target.value,
                })}
              >
                {matchingLabels().map((label) => <option key={label}>{label}</option>)}
              </select>
            </label>
            <label>
              Seconds per frame
              <input
                id="time-group-seconds-per-frame"
                type="number"
                min="0"
                step="any"
                disabled={busy}
                value={value.secondsPerFrame ?? ""}
                onChange={(event) => onAction?.({
                  type: "SET_SECONDS_PER_FRAME",
                  secondsPerFrame: Number(event.target.value),
                })}
              />
            </label>
            {(value.chartIds ?? []).map((chartId) => (
              value.defaultMatching === MATCHING_POLICY_LABELS.INTERPOLATE
              && draft?.charts?.find(({ id }) => id === chartId)?.interpolationAllowed !== true
                ? (
                  <label key={chartId}>
                    {draft.charts.find(({ id }) => id === chartId)?.label ?? chartId} fallback
                    <select
                      id={`time-group-fallback-${chartId}`}
                      disabled={busy}
                      value={value.memberFallbacks?.[chartId] ?? ""}
                      onChange={(event) => onAction?.({
                        type: "SET_MEMBER_FALLBACK",
                        chartId,
                        policy: event.target.value,
                      })}
                    >
                      <option value="">Choose fallback</option>
                      <option>{MATCHING_POLICY_LABELS.CONCURRENT_ONLY}</option>
                      <option>{MATCHING_POLICY_LABELS.SNAP_TO_LATEST}</option>
                      <option>{MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST}</option>
                    </select>
                  </label>
                )
                : null
            ))}
          </fieldset>
        )}

        {stage === "review" && (
          <section aria-labelledby="time-group-review-title">
            <h3 id="time-group-review-title">Name and review</h3>
            <label>
              Time Group name
              <input
                id="time-group-name"
                disabled={busy}
                value={value.name ?? ""}
                onChange={(event) => onAction?.({ type: "SET_NAME", name: event.target.value })}
              />
            </label>
            <dl>
              <div><dt>Members</dt><dd>{value.chartIds?.length ?? 0}</dd></div>
              <div><dt>Matching</dt><dd>{value.defaultMatching}</dd></div>
              <div><dt>Seconds per frame</dt><dd>{value.secondsPerFrame}</dd></div>
            </dl>
            {(draft?.sceneConsequences?.length ?? 0) > 0 && (
              <fieldset>
                <legend>Resolve affected Scenes</legend>
                {draft.sceneConsequences.map(({ sceneId, resolution }) => (
                  <div key={sceneId} id={`time-group-scene-${sceneId}`}>
                    <strong>{sceneId}</strong>
                    <label>
                      <input
                        type="radio"
                        name={`scene-${sceneId}`}
                        checked={resolution === "edit"}
                        disabled={busy}
                        onChange={() => onAction?.({
                          type: "RESOLVE_SCENE_CONSEQUENCE",
                          sceneId,
                          resolution: "edit",
                        })}
                      />
                      Edit Scene
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`scene-${sceneId}`}
                        checked={resolution === "clamp"}
                        disabled={busy}
                        onChange={() => onAction?.({
                          type: "RESOLVE_SCENE_CONSEQUENCE",
                          sceneId,
                          resolution: "clamp",
                        })}
                      />
                      Clamp Scene
                    </label>
                  </div>
                ))}
              </fieldset>
            )}
          </section>
        )}
      </div>

      <footer>
        <button type="button" disabled={busy || stage === "period"} onClick={() => onAction?.({ type: "PREVIOUS_STAGE" })}>Back</button>
        <button type="button" disabled={busy || stage === "review"} onClick={() => onAction?.({ type: "NEXT_STAGE" })}>Continue</button>
        <button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Time Group</button>
        <button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "DISCARD" })}>Discard</button>
        <button type="button" disabled={busy} onClick={() => onAction?.({ type: "STAY" })}>Stay</button>
      </footer>
    </section>
  );
}

function matchingLabels() {
  return [
    MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
    MATCHING_POLICY_LABELS.INTERPOLATE,
    MATCHING_POLICY_LABELS.SNAP_TO_LATEST,
    MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST,
  ];
}

function dateInputValue(epochMs) {
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString().slice(0, 10) : "";
}
