import React from "react";

import { MATCHING_POLICY_LABELS } from "../../charting/time/temporalMatch.js";
import AvailabilityLedger from "./AvailabilityLedger.jsx";
import { describeTemporalInterpolationSupport } from "./temporalAuthoringData.js";
import {
  buildChronoGroupReview,
  CHRONO_GROUP_STAGES,
  deriveChronoGroupStageStates,
  validateChronoGroupDraft,
  validateChronoGroupStage,
} from "./chronoGroupDraft.js";

const STAGE_LABELS = Object.freeze({
  period: "Name and period",
  charts: "Choose charts",
  defaults: "Set defaults",
  review: "Review",
});

const STAGE_STATUS_LABELS = Object.freeze({
  complete: "Complete",
  "needs-attention": "Needs attention",
  waiting: "Waiting on prerequisite",
  "in-progress": "In progress",
});

const POLICY_DESCRIPTIONS = Object.freeze({
  [MATCHING_POLICY_LABELS.CONCURRENT_ONLY]: "Use observations that occur on the frame date.",
  [MATCHING_POLICY_LABELS.INTERPOLATE]: "Resolve numeric values between surrounding observations. Never extrapolate.",
  [MATCHING_POLICY_LABELS.SNAP_TO_LATEST]: "Use the latest observation at or before the frame.",
  [MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST]: "Use the nearest observation; equal-distance ties choose the earlier date.",
});

export default function ChronoGroupEditor({ draft, disabled = false, onAction }) {
  const value = draft?.value ?? {};
  const stage = draft?.stage ?? "period";
  const busy = disabled || draft?.status === "saving";
  const dirty = new Set(["dirty", "error", "suspended"]).has(draft?.status);
  const stageStates = deriveChronoGroupStageStates(draft);
  const stageIndex = CHRONO_GROUP_STAGES.indexOf(stage);
  const proactiveIssue = stage === "review"
    ? validateChronoGroupDraft(draft)
    : validateChronoGroupStage(draft, stage);
  const draftIssue = validateChronoGroupDraft(draft);

  return (
    <section className="chrono-group-studio" aria-labelledby="chrono-group-studio-title">
      <header>
        <div>
          <p className="eyebrow">Temporal authoring</p>
          <h2 id="chrono-group-studio-title">Chrono Studio</h2>
          <p>Dashboard-wide authored object · local draft · fixed Staged Proof Studio</p>
        </div>
        <span data-status={draft?.status ?? "clean"}>
          {draft?.status === "saving" ? "Saving Chrono Group" : dirty ? "Unsaved Chrono Group" : "Chrono Group saved"}
        </span>
      </header>

      <nav aria-label="Chrono Group stages">
        <ol>
          {CHRONO_GROUP_STAGES.map((stageId, index) => {
            const proofState = stageStates[stageId];
            return (
              <li key={stageId}>
                <button
                  aria-current={stage === stageId ? "step" : undefined}
                  type="button"
                  disabled={busy}
                  data-proof-state={proofState}
                  onClick={() => onAction?.({ type: "GO_TO_STAGE", stage: stageId })}
                >
                  <span className="chrono-stage-number">{index + 1}</span>
                  <span className="chrono-stage-label">{STAGE_LABELS[stageId]}</span>
                  <span className="chrono-stage-status">{stageStatusMark(proofState)} {STAGE_STATUS_LABELS[proofState]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="chrono-group-studio__body" aria-live="polite">
        {draft?.error && <StageCallout issue={draft.error} />}
        {!draft?.error && proactiveIssue && <StageCallout issue={proactiveIssue} />}

        {stage === "period" && <PeriodStage value={value} timeZone={draft?.timeZone} busy={busy} onAction={onAction} />}

        {stage === "charts" && (
          <section className="chrono-chart-selection" aria-labelledby="chrono-chart-selection-title">
            <header>
              <div><h3 id="chrono-chart-selection-title">Choose charts</h3><p>Complete chart records move intact between vertically separated regions.</p></div>
            </header>
            <div className="chrono-period-proof">
              <div><strong>{formatDate(value.period?.startEpochMs)} through {formatDate(value.period?.endEpochMs)} · inclusive</strong><span>{draft?.timeZone ?? "UTC"} · counts use unique valid observation dates</span></div>
              <button type="button" className="secondary" disabled={busy} onClick={() => onAction?.({ type: "GO_TO_STAGE", stage: "period" })}>Edit period</button>
            </div>
            <AvailabilityLedger
              rows={draft?.availabilityRows ?? []}
              disabled={busy}
              onToggle={(chartId, selected) => onAction?.({ type: "TOGGLE_CHART", chartId, selected })}
            />
          </section>
        )}

        {stage === "defaults" && <DefaultsStage draft={draft} value={value} busy={busy} onAction={onAction} />}
        {stage === "review" && <ChronoGroupReview draft={draft} issue={draftIssue} busy={busy} onAction={onAction} />}
      </div>

      <footer>
        <button type="button" disabled={busy || stage === "period"} onClick={() => onAction?.({ type: "PREVIOUS_STAGE" })}>Back</button>
        <span className="chrono-stage-progress">Stage {stageIndex + 1} of {CHRONO_GROUP_STAGES.length} · {STAGE_STATUS_LABELS[stageStates[stage]]}</span>
        {stage !== "review" && <button type="button" disabled={busy} onClick={() => onAction?.({ type: "NEXT_STAGE" })}>Continue</button>}
        {stage === "review" && <button type="button" disabled={busy || !dirty || Boolean(draftIssue)} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Chrono Group</button>}
        <button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "DISCARD" })}>Discard</button>
      </footer>
    </section>
  );
}

function PeriodStage({ value, timeZone, busy, onAction }) {
  return (
    <fieldset className="chrono-period-stage">
      <legend>Name and period</legend>
      <p>Set a unique name and an inclusive authoring period. Availability is not analysed while the range is invalid.</p>
      <label>Chrono Group name<input id="chrono-group-name" disabled={busy} value={value.name ?? ""} onChange={(event) => onAction?.({ type: "SET_NAME", name: event.target.value })} /></label>
      <div className="chrono-period-inputs">
        <label>Start date<input id="period-start" type="date" disabled={busy} value={dateInputValue(value.period?.startEpochMs)} onChange={(event) => onAction?.({ type: "SET_PERIOD", period: { ...value.period, startEpochMs: Date.parse(`${event.target.value}T00:00:00.000Z`) } })} /></label>
        <label>End date<input id="period-end" type="date" disabled={busy} value={dateInputValue(value.period?.endEpochMs)} onChange={(event) => onAction?.({ type: "SET_PERIOD", period: { ...value.period, endEpochMs: Date.parse(`${event.target.value}T00:00:00.000Z`) } })} /></label>
      </div>
      <aside className="chrono-timezone-proof"><strong>Dashboard timezone</strong><span>{timeZone ?? "UTC"}</span><p>Fixed dashboard-owned context. Counts, inclusive boundaries, offsets, and the derived ledger use this timezone.</p></aside>
      <section><h4>Period semantics</h4><p>The Default Chrono ledger is derived from saved members and their effective matching policies; the ledger itself is never persisted.</p></section>
    </fieldset>
  );
}

function DefaultsStage({ draft, value, busy, onAction }) {
  const unsupported = (value.chartIds ?? []).map((chartId) => {
    const chart = draft?.charts?.find(({ id }) => id === chartId);
    if (chart?.interpolationAllowed === true) return null;
    const inferred = describeTemporalInterpolationSupport(chart?.variables ?? []);
    const variables = chart?.interpolationUnsupportedVariables?.length > 0
      ? chart.interpolationUnsupportedVariables
      : inferred.unsupportedVariables.length > 0
        ? inferred.unsupportedVariables
        : (chart?.variables ?? []).map(({ label, id }) => label ?? id);
    return {
      chartId,
      label: chart?.label ?? chartId,
      variables,
      reason: chart?.interpolationReason ?? inferred.reason ?? "Interpolation is unavailable for this member.",
    };
  }).filter(Boolean);

  return (
    <fieldset className="chrono-defaults-stage">
      <legend>Set defaults</legend>
      <p>Choose one group matching default and a positive number of seconds per frame. Unsupported members require an explicit fallback.</p>
      <div className="chrono-policy-field" role="group" aria-label="Group matching default">
        <span>Group matching default</span>
        <div className="chrono-policy-options">
          {matchingLabels().map((label) => <button key={label} type="button" aria-pressed={value.defaultMatching === label} disabled={busy} onClick={() => onAction?.({ type: "SET_DEFAULT_MATCHING", policy: label })}><strong>{label}</strong><span>{POLICY_DESCRIPTIONS[label]}</span></button>)}
        </div>
      </div>
      <label>Default seconds per frame<input id="chrono-group-seconds-per-frame" type="number" min="0.001" step="any" disabled={busy} value={value.secondsPerFrame ?? ""} onChange={(event) => onAction?.({ type: "SET_SECONDS_PER_FRAME", secondsPerFrame: Number(event.target.value) })} /><small>Positive numeric authoring value; not a playback-speed tier.</small></label>

      {value.defaultMatching === MATCHING_POLICY_LABELS.INTERPOLATE && unsupported.map((entry) => (
        <section className="chrono-fallback-proof" key={entry.chartId}>
          <div role="alert"><strong>Interpolate is unsupported for {entry.label}</strong><p>{entry.variables.join(", ")}: {entry.reason}</p></div>
          <label>Explicit member fallback · {entry.label}<select id={`chrono-group-fallback-${entry.chartId}`} disabled={busy} value={value.memberFallbacks?.[entry.chartId] ?? ""} onChange={(event) => onAction?.({ type: "SET_MEMBER_FALLBACK", chartId: entry.chartId, policy: event.target.value })}><option value="">Choose an eligible fallback</option><option>{MATCHING_POLICY_LABELS.CONCURRENT_ONLY}</option><option>{MATCHING_POLICY_LABELS.SNAP_TO_LATEST}</option><option>{MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST}</option></select></label>
        </section>
      ))}
      <section className="chrono-effective-hierarchy"><h4>Effective hierarchy</h4><p>Chrono Group default → explicit member fallback → later Scene override → temporary View override.</p></section>
    </fieldset>
  );
}

function ChronoGroupReview({ draft, issue, busy, onAction }) {
  const value = draft?.value ?? {};
  const review = buildChronoGroupReview(draft);
  const fallbackSummary = Object.entries(value.memberFallbacks ?? {}).map(([chartId, policy]) => `${draft.charts?.find(({ id }) => id === chartId)?.label ?? chartId}: ${policy}`).join("; ");
  return (
    <section className="chrono-group-review" aria-labelledby="chrono-group-review-title">
      <header><h3 id="chrono-group-review-title">Review</h3><p>Review the derived ledger, membership, matching, cadence, and gaps before one atomic save.</p></header>
      <div className="chrono-review-metrics">
        <div><strong>{review.frameCount}</strong><span>derived Default Chrono frames</span></div>
        <div><strong>{review.members.length}</strong><span>member charts</span></div>
        <div><strong>{review.affectedPages.length}</strong><span>affected pages</span></div>
        <div><strong>{value.secondsPerFrame}</strong><span>seconds per frame</span></div>
      </div>
      <ol className="chrono-review-proof-list">
        <ReviewProof number="1" title="Period and timezone" text={`${formatDate(value.period?.startEpochMs)} through ${formatDate(value.period?.endEpochMs)}, inclusive · ${draft?.timeZone ?? "UTC"}`} action="Edit period" stage="period" busy={busy} onAction={onAction} />
        <ReviewProof number="2" title="Members and coverage" text={`${review.members.map(({ label }) => label).join(", ") || "No members"} · ${review.gaps.length} unresolved`} action="Edit chart selection" stage="charts" busy={busy} onAction={onAction} />
        <ReviewProof number="3" title="Matching and cadence" text={`${value.defaultMatching}${fallbackSummary ? ` · ${fallbackSummary}` : ""} · ${value.secondsPerFrame} ${Number(value.secondsPerFrame) === 1 ? "second" : "seconds"}/frame`} action="Edit matching defaults" stage="defaults" busy={busy} onAction={onAction} />
        <ReviewProof number="4" title="Derived ledger and gaps" text={`${review.frameCount} union frames · ${review.gaps.length === 0 ? "No unresolved gaps" : `${review.gaps.length} gaps`} · ledger is recomputed, not persisted`} />
      </ol>
      <section aria-labelledby="chrono-review-members"><h4 id="chrono-review-members">Member evidence</h4>{review.members.length === 0 ? <p>No charts selected.</p> : <ul>{review.members.map((member) => <li key={member.chartId}><span><strong>{member.label}</strong> · {member.observationCount} observations</span><button type="button" disabled={busy} onClick={() => onAction?.({ type: "GO_TO_STAGE", stage: member.repairStage })}>Repair chart selection</button></li>)}</ul>}</section>
      <section aria-labelledby="chrono-review-gaps"><h4 id="chrono-review-gaps">Availability gaps</h4>{review.gaps.length === 0 ? <p>No availability gaps detected.</p> : <ul>{review.gaps.map((gap) => <li key={gap.chartId}>{gap.label}</li>)}</ul>}</section>
      {issue ? <div className="chrono-proof-callout" data-tone="error" role="alert"><strong>Save is blocked</strong><span>{issue.message}</span><button type="button" disabled={busy} onClick={() => onAction?.({ type: "GO_TO_STAGE", stage: issue.stage ?? "review" })}>Repair in {STAGE_LABELS[issue.stage] ?? "Review"}</button></div> : <div className="chrono-proof-callout" data-tone="success"><strong>Review is ready</strong><span>{review.members.length} members use {value.defaultMatching}{fallbackSummary ? ` with ${fallbackSummary}` : ""}, {value.secondsPerFrame} {Number(value.secondsPerFrame) === 1 ? "second" : "seconds"}/frame, and a current {review.frameCount}-frame derived ledger.</span></div>}
      {(draft?.sceneConsequences?.length ?? 0) > 0 && <fieldset><legend>Resolve affected Scenes</legend>{draft.sceneConsequences.map(({ sceneId, resolution }) => <div key={sceneId} id={`chrono-group-scene-${sceneId}`}><strong>{sceneId}</strong><label><input type="radio" name={`scene-${sceneId}`} checked={resolution === "edit"} disabled={busy} onChange={() => onAction?.({ type: "RESOLVE_SCENE_CONSEQUENCE", sceneId, resolution: "edit" })} />Edit Scene</label><label><input type="radio" name={`scene-${sceneId}`} checked={resolution === "clamp"} disabled={busy} onChange={() => onAction?.({ type: "RESOLVE_SCENE_CONSEQUENCE", sceneId, resolution: "clamp" })} />Clamp Scene</label></div>)}</fieldset>}
    </section>
  );
}

function ReviewProof({ number, title, text, action, stage, busy, onAction }) {
  return <li><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div>{action && <button type="button" className="secondary" disabled={busy} onClick={() => onAction?.({ type: "GO_TO_STAGE", stage })}>{action}</button>}</li>;
}

function StageCallout({ issue }) {
  return <div className="chrono-proof-callout" data-tone="error" role="alert"><strong>Needs attention</strong><span>{issue.message}</span></div>;
}

function matchingLabels() {
  return [MATCHING_POLICY_LABELS.CONCURRENT_ONLY, MATCHING_POLICY_LABELS.INTERPOLATE, MATCHING_POLICY_LABELS.SNAP_TO_LATEST, MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST];
}

function stageStatusMark(status) {
  return ({ complete: "✓", "needs-attention": "!", waiting: "⌛", "in-progress": "◐" })[status] ?? "";
}

function dateInputValue(epochMs) {
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString().slice(0, 10) : "";
}

function formatDate(epochMs) {
  return dateInputValue(epochMs) || "Not set";
}
