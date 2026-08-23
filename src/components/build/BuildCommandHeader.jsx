import React from "react";

export default function BuildCommandHeader({
  draftCoordinator,
  locked = false,
  auxiliaryLocked = false,
  chartDraftAvailable = false,
  operationError = "",
  chronoGroupDraftSuspended = false,
  sceneDraftSuspended = false,
  parkedAuxiliaries = [],
  onFinish,
  onReset,
  onSaveLayout,
  onDiscardLayout,
  onAddChart,
  onOpenAuxiliary,
  onResumeAuxiliary,
  getAuxiliaryLabel = (surface) => surface,
}) {
  const layoutSlot = draftCoordinator.slots.layout;
  const chartSlot = draftCoordinator.slots.chart;
  const layoutActionsDisabled = !layoutSlot
    || layoutSlot.status === "clean"
    || layoutSlot.status === "saving";

  return (
    <section className="build-command-header" aria-label="Build commands">
      <div className="build-command-groups">
        <section className="build-command-group" data-build-command-group="content" aria-label="Content commands">
          <strong className="build-command-group__label">Content</strong>
          <div className="build-command-group__controls">
            <button type="button" className="secondary" disabled={locked} onClick={onAddChart}>
              {chartDraftAvailable ? "Resume chart draft" : "Add chart"}
            </button>
            <button
              type="button"
              className="secondary"
              data-context-shelf-entry="structure"
              data-unit-orbit-preserve-open
              disabled={auxiliaryLocked}
              onClick={() => onOpenAuxiliary?.("structure")}
            >
              Pages &amp; sections
            </button>
          </div>
        </section>

        <section className="build-command-group" data-build-command-group="time" aria-label="Time commands">
          <strong className="build-command-group__label">Time</strong>
          <div className="build-command-group__controls">
            <button
              type="button"
              className="secondary"
              data-context-shelf-entry="chrono-group"
              data-unit-orbit-preserve-open
              disabled={auxiliaryLocked}
              onClick={() => onOpenAuxiliary?.("chrono-group")}
            >
              Chrono Studio
            </button>
            <button
              type="button"
              className="secondary"
              data-context-shelf-entry="scene"
              data-unit-orbit-preserve-open
              disabled={auxiliaryLocked}
              onClick={() => onOpenAuxiliary?.("scene")}
            >
              Scene Studio
            </button>
          </div>
        </section>

        <section className="build-command-group build-command-group--layout" data-build-command-group="layout" aria-label="Layout draft commands">
          <strong className="build-command-group__label">Layout draft</strong>
          <div className="build-draft-slots" aria-label="Build draft status">
            <span data-draft-slot="layout" data-draft-status={layoutSlot?.status ?? "clean"}>
              <strong>Layout changes</strong>
              <small>{layoutSlot?.status ?? "clean"}</small>
            </span>
            <span data-draft-slot="chart" data-draft-status={chartSlot?.status ?? "clean"}>
              <strong>Chart changes</strong>
              <small>{chartSlot?.status ?? "clean"}</small>
            </span>
          </div>
          <div className="build-command-group__controls">
            <button
              type="button"
              className="secondary"
              data-unit-orbit-preserve-open
              disabled={layoutActionsDisabled}
              onClick={onSaveLayout}
            >
              Save Layout Changes
            </button>
            <button
              type="button"
              className="secondary"
              data-unit-orbit-preserve-open
              disabled={layoutActionsDisabled}
              onClick={onDiscardLayout}
            >
              Discard Layout Changes
            </button>
          </div>
        </section>

        <section className="build-command-group build-command-group--session" data-build-command-group="session" aria-label="Build session commands">
          <strong className="build-command-group__label">Session</strong>
          <div className="build-command-group__controls">
            <button type="button" className="secondary" disabled={locked} onClick={onReset}>Reset</button>
            <button type="button" disabled={locked} onClick={onFinish}>Finish Build</button>
          </div>
        </section>
      </div>

      {operationError && <p className="build-operation-error" role="alert">{operationError}</p>}
      {(chronoGroupDraftSuspended || sceneDraftSuspended || parkedAuxiliaries.length > 0) && (
        <nav className="build-command-status-rail" aria-label="Paused Build work">
          {chronoGroupDraftSuspended && (
            <button type="button" className="secondary" onClick={() => onOpenAuxiliary?.("chrono-group")}>
              Resume Chrono Group draft
            </button>
          )}
          {sceneDraftSuspended && (
            <button type="button" className="secondary" onClick={() => onOpenAuxiliary?.("scene")}>
              Resume Scene draft
            </button>
          )}
          {parkedAuxiliaries.map(({ surface }) => (
            <button key={surface} type="button" className="secondary" onClick={() => onResumeAuxiliary?.(surface)}>
              Resume {getAuxiliaryLabel(surface)}
            </button>
          ))}
        </nav>
      )}
    </section>
  );
}
