import React from "react";

import {
  createScenarioDraft,
  reduceScenarioDraft,
} from "../build/ScenarioAuthoring.jsx";

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
  onDirtyChange,
  onImportPackage,
  onDownloadPackage,
  onResetToSource,
}) {
  const [draft, setDraft] = React.useState(() => createScenarioDraft(dashboard));
  const [editingField, setEditingField] = React.useState(null);
  const busy = draft.status === "saving";
  const dirty = draft.status === "dirty" || draft.status === "error";
  const identityRevision = [
    dashboard?.scenarioLabel,
    dashboard?.programLabel,
    dashboard?.lastUpdated,
    dashboard?.source?.kind,
    dashboard?.source?.label,
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
        setDraft((current) => reduceScenarioDraft(current, {
          type: "SAVE_SUCCEEDED",
          savedValue: savedDashboard ?? current.value,
        }));
        setEditingField(null);
      })
      .catch((error) => setDraft((current) => reduceScenarioDraft(current, {
        type: "SAVE_FAILED",
        error,
      })));
  };

  if (!open) return null;
  const packageDisabledReason = dirty
    ? "Save or discard the Scenario changes before changing the dashboard package."
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

      <section className="scenario-passport-provenance" aria-labelledby="scenario-source-title">
        <h3 id="scenario-source-title">Source provenance</h3>
        <dl>
          <div><dt>Source</dt><dd>{draft.value.source?.label || "No source provenance"}</dd></div>
          <div><dt>Source kind</dt><dd>{draft.value.source?.kind || "unknown"}</dd></div>
        </dl>
      </section>

      <section className="scenario-passport-package-actions" aria-labelledby="dashboard-package-title">
        <h3 id="dashboard-package-title">Dashboard package</h3>
        {packageDisabledReason && <p className="scenario-package-disabled-reason">{packageDisabledReason}</p>}
        <button type="button" className="secondary" disabled={dirty || busy} title={packageDisabledReason} onClick={onImportPackage}>Import Dashboard Package</button>
        <button type="button" className="secondary" disabled={dirty || busy} title={packageDisabledReason} onClick={onDownloadPackage}>Download Dashboard Package</button>
        <button type="button" className="secondary scenario-package-reset" disabled={dirty || busy} title={packageDisabledReason} onClick={onResetToSource}>Reset Dashboard to Source</button>
      </section>
    </aside>
  );
}
