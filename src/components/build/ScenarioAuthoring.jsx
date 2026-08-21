import React from "react";

const EDITABLE_FIELDS = new Set(["scenarioLabel", "programLabel", "lastUpdated"]);

export function createScenarioDraft(dashboard = {}) {
  const baseline = scenarioValue(dashboard);
  return {
    baseline,
    value: clone(baseline),
    status: "clean",
    error: null,
    restoration: null,
    suspendedStatus: null,
  };
}

export function validateScenarioDraft(value) {
  if (!String(value?.scenarioLabel ?? "").trim()) {
    return issue("SCENARIO_NAME_REQUIRED", "Enter a Scenario name.");
  }
  if (!String(value?.programLabel ?? "").trim()) {
    return issue("PROGRAM_NAME_REQUIRED", "Enter a Program name.");
  }
  if (!String(value?.lastUpdated ?? "").trim()) {
    return issue("UPDATED_VALUE_REQUIRED", "Enter the Updated value.");
  }
  return null;
}

export function reduceScenarioDraft(state, action) {
  switch (action?.type) {
    case "EDIT_FIELD": {
      if (!EDITABLE_FIELDS.has(action.field)) {
        return withError(state, issue("READ_ONLY_FIELD", "Source provenance is read-only."));
      }
      return {
        ...state,
        value: { ...state.value, [action.field]: action.value },
        status: "dirty",
        error: null,
      };
    }
    case "SAVE_REQUEST": {
      const validation = validateScenarioDraft(state.value);
      return validation ? withError(state, validation) : { ...state, status: "saving", error: null };
    }
    case "SAVE_SUCCEEDED": {
      const baseline = scenarioValue(action.savedValue ?? state.value);
      return { ...state, baseline, value: clone(baseline), status: "clean", error: null };
    }
    case "SAVE_FAILED":
      return withError(state, normalizeError(action.error));
    case "DISCARD":
      return { ...state, value: clone(state.baseline), status: "clean", error: null };
    case "STAY":
      return { ...state, status: scenarioChanged(state) ? "dirty" : "clean", error: null };
    case "SUSPEND":
      return {
        ...state,
        status: "suspended",
        suspendedStatus: state.status,
        restoration: clone(action.restoration ?? state.restoration),
      };
    case "RESUME":
      return {
        ...state,
        status: state.suspendedStatus ?? (scenarioChanged(state) ? "dirty" : "clean"),
        suspendedStatus: null,
      };
    default:
      throw new Error(`Unknown Scenario draft action: ${String(action?.type)}`);
  }
}

export default function ScenarioAuthoring({ draft, disabled = false, onAction }) {
  const value = draft?.value ?? {};
  const busy = disabled || draft?.status === "saving";
  const dirty = draft?.status === "dirty" || draft?.status === "error" || draft?.status === "suspended";
  return (
    <section className="scenario-authoring" aria-labelledby="scenario-passport-title">
      <header className="build-surface-heading">
        <div>
          <p className="eyebrow">Scenario details</p>
          <h2 id="scenario-passport-title">Scenario Passport</h2>
        </div>
        <span className="build-draft-status" data-status={draft?.status ?? "clean"}>
          {draft?.status === "saving" ? "Saving Scenario" : dirty ? "Unsaved Scenario" : "Scenario saved"}
        </span>
      </header>
      {draft?.error && <p className="build-operation-error" role="alert">{draft.error.message}</p>}
      <label>
        Scenario name
        <input disabled={busy} value={value.scenarioLabel ?? ""} onChange={(event) => onAction?.({ type: "EDIT_FIELD", field: "scenarioLabel", value: event.target.value })} />
      </label>
      <label>
        Program
        <input disabled={busy} value={value.programLabel ?? ""} onChange={(event) => onAction?.({ type: "EDIT_FIELD", field: "programLabel", value: event.target.value })} />
      </label>
      <label>
        Updated
        <input disabled={busy} value={value.lastUpdated ?? ""} onChange={(event) => onAction?.({ type: "EDIT_FIELD", field: "lastUpdated", value: event.target.value })} />
      </label>
      <dl className="scenario-source-provenance">
        <div><dt>Source</dt><dd>{value.source?.label || "No source provenance"}</dd></div>
        <div><dt>Source kind</dt><dd>{value.source?.kind || "unknown"}</dd></div>
      </dl>
      <footer className="build-surface-actions">
        <button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Scenario</button>
        <button type="button" className="secondary" disabled={busy || !dirty} onClick={() => onAction?.({ type: "DISCARD" })}>Discard Scenario</button>
      </footer>
    </section>
  );
}

function scenarioValue(dashboard) {
  return {
    scenarioLabel: dashboard?.scenarioLabel ?? "",
    programLabel: dashboard?.programLabel ?? "",
    lastUpdated: dashboard?.lastUpdated ?? "",
    source: clone(dashboard?.source ?? null),
  };
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function issue(code, message, retryable = false) {
  return { code, message, retryable };
}

function normalizeError(error) {
  return {
    code: error?.code ?? "SCENARIO_SAVE_FAILED",
    message: error?.message ?? "The Scenario could not be saved.",
    retryable: error?.retryable !== false,
  };
}

function withError(state, error) {
  return { ...state, status: "error", error };
}

function scenarioChanged(state) {
  return JSON.stringify(state.baseline) !== JSON.stringify(state.value);
}
