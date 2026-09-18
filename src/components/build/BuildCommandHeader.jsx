import React from "react";

import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";
import ControlTooltip from "../common/ControlTooltip.jsx";

const DISCARD_BUILD_CHANGES_DESCRIPTION = "Restores the dashboard to the baseline captured when you entered Build. It does not contact the deployed online dashboard.";

export default function BuildCommandHeader({
  pendingWork = [],
  locked = false,
  disabledReason = "",
  auxiliaryLocked = false,
  auxiliaryDisabledReason = disabledReason,
  onFinish,
  onReset,
  onAddChart,
  onAddStaticContent,
  onOpenAuxiliary,
}) {
  const command = (id, label, { primary = false, disabled, reason, explain = false, ...rest } = {}) => (
    <ControlTooltip disabled={disabled} explain={explain} reason={reason}>
      <button
        type="button"
        className={primary ? undefined : "secondary"}
        data-build-command-action={id}
        disabled={disabled}
        {...rest}
      >
        {label}
      </button>
    </ControlTooltip>
  );
  const library = (id, label, entry) => command(id, label, {
    id: `${id}-command`,
    disabled: auxiliaryLocked,
    reason: auxiliaryDisabledReason,
    "data-context-shelf-entry": entry,
    "data-unit-orbit-preserve-open": true,
    onClick: () => onOpenAuxiliary?.(entry),
  });

  return (
    <section
      className="build-command-header"
      aria-label="Build commands"
      {...dashboardOwnedRegionProps("build-command-header")}
    >
      <div className="build-command-main-row" role="toolbar" aria-label="Primary Build commands">
        <div className="build-command-group" role="group" aria-label="Insert" data-build-command-group="insert">
          <span className="build-command-group-label" aria-hidden="true">Insert</span>
          {command("add-chart", "Add chart", { disabled: locked, reason: disabledReason, onClick: onAddChart })}
          {command("add-text-image", "Add Text/Image", { id: "add-static-content-command", disabled: locked, reason: disabledReason, onClick: onAddStaticContent })}
        </div>
        <div className="build-command-group" role="group" aria-label="Libraries" data-build-command-group="libraries">
          <span className="build-command-group-label" aria-hidden="true">Libraries</span>
          {library("source-content", "Source content", "source-content")}
          {library("chrono-studio", "Chrono Studio", "chrono-group")}
          {library("scene-studio", "Scene Studio", "scene")}
        </div>
        <div className="build-command-group" role="group" aria-label="Session" data-build-command-group="session">
          <span className="build-command-group-label" aria-hidden="true">Session</span>
          {command("discard-build-changes", "Discard Build changes", {
            disabled: locked,
            explain: !locked,
            reason: locked ? disabledReason : DISCARD_BUILD_CHANGES_DESCRIPTION,
            onClick: onReset,
          })}
          {command("finish-build", "Finish Build", { primary: true, disabled: locked, reason: disabledReason, onClick: onFinish })}
        </div>
      </div>

      {pendingWork.length > 0 && <BuildPendingWorkRail pendingWork={pendingWork} />}
    </section>
  );
}

function BuildPendingWorkRail({ pendingWork }) {
  return (
    <nav className="build-pending-work" aria-label="Pending Build work">
      <ul className="build-pending-work__list">
        {pendingWork.map((work) => {
          const actionsDisabled = work.state === "saving";
          const actionOwner = new Set([
            "chart-edit",
            "chart-create",
            "text-image-create",
            "text-image-edit",
            "source-content-create",
            "source-content-edit",
          ]).has(work.kind);
          const pendingReason = actionsDisabled
            ? "Wait for the current authoring operation to finish."
            : "";
          return (
            <li
              key={work.id}
              className="build-pending-work__item"
              data-pending-work-id={work.id}
              data-pending-work-kind={work.kind}
              data-pending-work-state={work.state}
              data-pending-work-origin={work.origin}
              data-pending-work-activity={work.activity}
              data-pending-work-surface={work.surface}
            >
              <span className="build-pending-work__summary">
                <strong>{work.label}</strong>
                <small>{pendingStateLabel(work.state)}</small>
              </span>
              <span className="build-pending-work__actions">
                {work.kind === "layout" ? (
                  <>
                    <button type="button" className="secondary" disabled={actionsDisabled} onClick={work.save}>
                      Save Layout Changes
                    </button>
                    <button type="button" className="secondary" disabled={actionsDisabled} onClick={work.discard}>
                      Discard Layout Changes
                    </button>
                  </>
                ) : actionOwner ? (
                  <>
                    <ControlTooltip disabled={actionsDisabled} reason={pendingReason}>
                      <button
                        type="button"
                        className="secondary"
                        data-unit-orbit-preserve-open
                        disabled={actionsDisabled}
                        onClick={work.resume}
                      >
                        {work.activation === "focus" ? "Focus" : "Resume"} {work.label}
                      </button>
                    </ControlTooltip>
                    {typeof work.save === "function" && (
                      <ControlTooltip disabled={actionsDisabled} reason={pendingReason}>
                        <button
                          type="button"
                          className="secondary"
                          data-unit-orbit-preserve-open
                          disabled={actionsDisabled}
                          onClick={work.save}
                        >
                          {work.operation === "remove"
                            ? work.state === "error" ? "Retry Remove" : "Remove chart"
                            : work.state === "error" ? "Retry Save" : "Save changes"}
                        </button>
                      </ControlTooltip>
                    )}
                    {typeof work.discard === "function" && (
                      <ControlTooltip disabled={actionsDisabled} reason={pendingReason}>
                        <button
                          type="button"
                          className="secondary"
                          data-unit-orbit-preserve-open
                          disabled={actionsDisabled}
                          onClick={work.discard}
                        >
                          Discard changes
                        </button>
                      </ControlTooltip>
                    )}
                  </>
                ) : (
                  <button type="button" className="secondary" onClick={work.resume}>
                    Resume {work.label}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function pendingStateLabel(state) {
  return ({
    dirty: "Unsaved",
    error: "Needs attention",
    saving: "Saving",
    suspended: "Paused",
    paused: "Paused",
  })[state] ?? state;
}
