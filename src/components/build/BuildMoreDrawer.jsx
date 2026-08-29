import React from "react";

import ControlTooltip from "../common/ControlTooltip.jsx";
import RightSideDrawer from "../common/RightSideDrawer.jsx";

export default function BuildMoreDrawer({
  open,
  onClose,
  sceneDisabled = false,
  sceneDisabledReason = "",
  accessibilityDisabled = false,
  accessibilityDisabledReason = "",
  onOpenSceneStudio,
  accessibilityEnabled = false,
  onAccessibilityChange,
}) {
  const openSceneStudio = () => {
    onClose?.("scene-studio");
    onOpenSceneStudio?.();
  };

  return (
    <RightSideDrawer
      id="build-more-drawer"
      title="More Build commands"
      open={open}
      onClose={onClose}
      modality="dialog"
      eyebrow="Build"
      description="Additional authoring commands."
      className="build-more-drawer"
      contentClassName="build-more-drawer__content"
    >
      <div className="build-more-command-list">
        <ControlTooltip disabled={sceneDisabled} reason={sceneDisabledReason}>
          <button
            type="button"
            className="secondary"
            data-build-more-command="scene-studio"
            data-context-shelf-entry="scene"
            data-unit-orbit-preserve-open
            disabled={sceneDisabled}
            onClick={openSceneStudio}
          >
            Scene Studio
          </button>
        </ControlTooltip>
        <ControlTooltip disabled={accessibilityDisabled} reason={accessibilityDisabledReason}>
          <label className="accessibility-edit-toggle" data-build-more-command="chart-accessibility">
            <input
              type="checkbox"
              disabled={accessibilityDisabled}
              checked={accessibilityEnabled}
              onChange={(event) => onAccessibilityChange?.(event.target.checked)}
            />
            <span>
              Chart accessibility
              <small>Generate screen-reader chart descriptions</small>
            </span>
          </label>
        </ControlTooltip>
      </div>
    </RightSideDrawer>
  );
}
