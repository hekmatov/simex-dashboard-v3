import React, { useState } from "react";

import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";
import ControlTooltip from "../common/ControlTooltip.jsx";
import BuildMoreDrawer from "./BuildMoreDrawer.jsx";

const DISCARD_BUILD_CHANGES_DESCRIPTION = "Restores the dashboard to the baseline captured when you entered Build. It does not contact the deployed online dashboard.";

export default function BuildCommandHeader({
  pendingWork = [],
  locked = false,
  disabledReason = "",
  auxiliaryLocked = false,
  auxiliaryDisabledReason = disabledReason,
  accessibilityEnabled = false,
  operationError = "",
  onFinish,
  onReset,
  onAddChart,
  onAddStaticContent,
  onAccessibilityChange,
  onOpenAuxiliary,
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <section
      className="build-command-header"
      aria-label="Build commands"
      {...dashboardOwnedRegionProps("build-command-header")}
    >
      <div className="build-command-main-row" role="toolbar" aria-label="Primary Build commands">
        <ControlTooltip disabled={locked} reason={disabledReason}>
          <button type="button" className="secondary" data-build-command-action="add-chart" disabled={locked} onClick={onAddChart}>
            Add chart
          </button>
        </ControlTooltip>
        <ControlTooltip disabled={locked} reason={disabledReason}>
          <button
            id="add-static-content-command"
            type="button"
            className="secondary"
            data-build-command-action="add-text-image"
            disabled={locked}
            onClick={onAddStaticContent}
          >
            Add Text/Image
          </button>
        </ControlTooltip>
        <ControlTooltip disabled={auxiliaryLocked} reason={auxiliaryDisabledReason}>
          <button
            id="source-content-command"
            type="button"
            className="secondary"
            data-build-command-action="source-content"
            data-context-shelf-entry="source-content"
            data-unit-orbit-preserve-open
            disabled={auxiliaryLocked}
            onClick={() => onOpenAuxiliary?.("source-content")}
          >
            Source content
          </button>
        </ControlTooltip>
        <ControlTooltip disabled={auxiliaryLocked} reason={auxiliaryDisabledReason}>
          <button
            id="chrono-studio-command"
            type="button"
            className="secondary"
            data-build-command-action="chrono-studio"
            data-context-shelf-entry="chrono-group"
            data-unit-orbit-preserve-open
            disabled={auxiliaryLocked}
            onClick={() => onOpenAuxiliary?.("chrono-group")}
          >
            Chrono Studio
          </button>
        </ControlTooltip>
        <ControlTooltip
          disabled={locked}
          explain={!locked}
          reason={locked ? disabledReason : DISCARD_BUILD_CHANGES_DESCRIPTION}
        >
          <button
            type="button"
            className="secondary"
            data-build-command-action="discard-build-changes"
            disabled={locked}
            onClick={onReset}
          >
            Discard Build changes
          </button>
        </ControlTooltip>
        <ControlTooltip disabled={locked} reason={disabledReason}>
          <button type="button" data-build-command-action="finish-build" disabled={locked} onClick={onFinish}>
            Finish Build
          </button>
        </ControlTooltip>
        <ControlTooltip disabled={auxiliaryLocked && locked} reason={auxiliaryDisabledReason || disabledReason}>
          <button
            type="button"
            className="secondary"
            data-build-command-action="more"
            data-unit-orbit-preserve-open
            aria-controls="build-more-drawer"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            disabled={auxiliaryLocked && locked}
            onClick={() => setMoreOpen(true)}
          >
            More
          </button>
        </ControlTooltip>
      </div>

      {operationError && <p className="build-operation-error" role="alert">{operationError}</p>}
      {pendingWork.length > 0 && <BuildPendingWorkRail pendingWork={pendingWork} />}

      <BuildMoreDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        sceneDisabled={auxiliaryLocked}
        sceneDisabledReason={auxiliaryDisabledReason}
        accessibilityDisabled={locked}
        accessibilityDisabledReason={disabledReason}
        onOpenSceneStudio={() => onOpenAuxiliary?.("scene")}
        accessibilityEnabled={accessibilityEnabled}
        onAccessibilityChange={onAccessibilityChange}
      />
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
