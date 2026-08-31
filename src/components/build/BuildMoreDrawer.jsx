import React from "react";

import RightSideDrawer from "../common/RightSideDrawer.jsx";

export default function BuildMoreDrawer({
  open,
  onClose,
  sceneDisabled = false,
  onOpenSceneStudio,
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
      </div>
    </RightSideDrawer>
  );
}
