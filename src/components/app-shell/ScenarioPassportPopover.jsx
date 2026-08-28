import React from "react";

import ControlTooltip from "../common/ControlTooltip.jsx";
import {
  createScenarioDraft,
  reduceScenarioDraft,
} from "../build/ScenarioAuthoring.jsx";
import { ONLINE_DASHBOARD_RESTORE_DESCRIPTION } from "../../lib/onlineDashboardRestore.js";

const DISCARD_BUILD_CHANGES_DESCRIPTION = "Restores the dashboard to the baseline captured when you entered Build. It does not contact the deployed online dashboard.";

const FIELDS = Object.freeze([
  { id: "scenarioLabel", label: "Scenario name" },
  { id: "programLabel", label: "Program" },
  { id: "lastUpdated", label: "Updated" },
]);

export default function ScenarioPassportPopover({
  open = false,
  dashboard = {},
  onClose,
  onSave,
  onSaveSucceeded,
  onDirtyChange,
  onImportPackage,
  onDownloadPackage,
  onDiscardBuildChanges,
  onRestoreOnlineDashboard,
  onClearDashboard,
}) {
  const [draft, setDraft] = React.useState(() => createScenarioDraft(dashboard));
  const [editingField, setEditingField] = React.useState(null);
  const busy = draft.status === "saving";
  const dirty = draft.status === "dirty" || draft.status === "error";
  const identityRevision = [
    dashboard?.scenarioLabel,
    dashboard?.programLabel,
    dashboard?.lastUpdated,
    dashboard?.home?.enabled,
  ].join("\u0000");

  React.useEffect(() => {
    setDraft((current) => current.status === "clean"
      ? createScenarioDraft(dashboard)
      : current);
  }, [identityRevision]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  React.useEffect(() => {
    if (!open) setEditingField(null);
  }, [open]);

  const dispatch = (action) => setDraft((current) => reduceScenarioDraft(current, action));

  const save = () => {
    const saving = reduceScenarioDraft(draft, { type: "SAVE_REQUEST" });
    setDraft(saving);
    if (saving.status !== "saving") return;
    Promise.resolve(onSave?.(saving.value))
      .then((savedDashboard) => {
        const savedValue = savedDashboard ?? saving.value;
        setDraft((current) => reduceScenarioDraft(current, {
          type: "SAVE_SUCCEEDED",
          savedValue,
        }));
        setEditingField(null);
        onDirtyChange?.(false);
        onSaveSucceeded?.(savedValue);
      })
      .catch((error) => setDraft((current) => reduceScenarioDraft(current, {
        type: "SAVE_FAILED",
        error,
      })));
  };

  if (!open) return null;
  const scenarioMutationDisabled = dirty || busy;
  const scenarioMutationDisabledReason = busy
    ? "Wait for the Scenario to finish saving."
    : dirty
      ? "Save or discard the Scenario changes before uploading a package or discarding Build changes."
      : "";

  return (
    <aside
      id="scenario-passport-popover"
      className="scenario-passport-popover"
      aria-label="Scenario Passport"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose?.();
      }}
    >
      <header className="scenario-passport-heading">
        <div>
          <p className="eyebrow">Dashboard identity</p>
          <h2>Scenario Passport</h2>
        </div>
        <button type="button" className="secondary" onClick={onClose}>Close</button>
      </header>

      <div className="scenario-passport-fields">
        {FIELDS.map(({ id, label }) => (
          <div className="scenario-passport-field" key={id}>
            <span>{label}</span>
            {editingField === id ? (
              <input
                autoFocus
                aria-label={label}
                disabled={busy}
                value={draft.value[id] ?? ""}
                onChange={(event) => dispatch({ type: "EDIT_FIELD", field: id, value: event.target.value })}
                onBlur={() => setEditingField(null)}
              />
            ) : (
              <button
                type="button"
                className="scenario-passport-value"
                aria-label={`Edit ${label}: ${draft.value[id] ?? ""}`}
                disabled={busy}
                onClick={() => setEditingField(id)}
              >
                {draft.value[id] || `Set ${label}`}
              </button>
            )}
          </div>
        ))}
      </div>

      <fieldset className="scenario-passport-home">
        <legend>Canonical Home</legend>
        <label>
          <input
            type="checkbox"
            checked={draft.value.home.enabled}
            disabled={busy}
            onChange={(event) => dispatch({
              type: "SET_HOME_ENABLED",
              enabled: event.target.checked,
            })}
          />
          Show Home
        </label>
        <p>When off, Home is unavailable to dashboard visitors. You can turn it back on here.</p>
      </fieldset>

      {draft.error && <p className="build-operation-error" role="alert">{draft.error.message}</p>}
      <div className="scenario-passport-draft-actions">
        <span className="build-draft-status" data-status={draft.status}>
          {busy ? "Saving Scenario" : dirty ? "Unsaved Scenario" : "Scenario saved"}
        </span>
        <button type="button" disabled={busy || !dirty} onClick={save}>Save Scenario</button>
        <button
          type="button"
          className="secondary"
          disabled={busy || !dirty}
          onClick={() => {
            dispatch({ type: "DISCARD" });
            setEditingField(null);
          }}
        >
          Discard Scenario
        </button>
      </div>

      <section className="scenario-passport-package-actions" aria-labelledby="dashboard-package-title">
        <h3 id="dashboard-package-title">Dashboard package</h3>
        {scenarioMutationDisabledReason && <p className="scenario-package-disabled-reason">{scenarioMutationDisabledReason}</p>}
        <ControlTooltip disabled={scenarioMutationDisabled} reason={scenarioMutationDisabledReason}>
          <button type="button" className="secondary" disabled={scenarioMutationDisabled} onClick={onImportPackage}>Upload Dashboard Package</button>
        </ControlTooltip>
        <ControlTooltip
          disabled={busy}
          reason={busy ? "Wait for the Scenario to finish saving." : ""}
        >
          <button type="button" className="secondary" disabled={busy} onClick={onDownloadPackage}>Download Dashboard Package</button>
        </ControlTooltip>
      </section>

      <section className="scenario-passport-recovery-actions" aria-labelledby="dashboard-recovery-title">
        <h3 id="dashboard-recovery-title">Dashboard recovery</h3>
        <ControlTooltip
          disabled={scenarioMutationDisabled}
          explain={!scenarioMutationDisabled}
          reason={scenarioMutationDisabledReason || DISCARD_BUILD_CHANGES_DESCRIPTION}
        >
          <button
            type="button"
            className="secondary"
            disabled={scenarioMutationDisabled}
            onClick={onDiscardBuildChanges}
          >
            Discard Build changes
          </button>
        </ControlTooltip>
        <ControlTooltip
          disabled={busy}
          explain={!busy}
          reason={busy
            ? "Wait for the Scenario to finish saving."
            : ONLINE_DASHBOARD_RESTORE_DESCRIPTION}
        >
          <button
            type="button"
            className="secondary"
            aria-label="Restore online dashboard"
            disabled={busy}
            onClick={onRestoreOnlineDashboard}
          >
            Restore online dashboard…
          </button>
        </ControlTooltip>
        <ControlTooltip
          disabled={busy}
          reason={busy ? "Wait for the Scenario to finish saving." : ""}
        >
          <button
            type="button"
            className="danger"
            aria-label="Clear dashboard"
            disabled={busy}
            onClick={onClearDashboard}
          >
            Clear dashboard…
          </button>
        </ControlTooltip>
      </section>
    </aside>
  );
}
