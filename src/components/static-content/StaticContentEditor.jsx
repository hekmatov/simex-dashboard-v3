import React from "react";

import { createStaticContentDraft } from "../../static-content/forms/staticContentDraft.js";
import { StaticContentWizard } from "./StaticContentWizard.jsx";

export function StaticContentEditor({
  open = true,
  dashboard,
  destination,
  panel,
  placement,
  mediaItem,
  assets,
  initialDraft,
  restoration,
  disabled,
  contentDraftCoordinator,
  contentRenderContext,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
  onDraftChange,
  onDirtyChange,
  onRestorationChange,
  onSave,
  onCancel,
  onSuspend,
} = {}) {
  const draft = React.useMemo(() => initialDraft ?? createStaticContentDraft({
    mode: "edit",
    destination,
    panel,
    placement: placement ?? dashboard?.dataSources?.[panel?.sourceId],
    mediaItem: mediaItem ?? dashboard?.contentLibrary?.mediaItems?.[
      (placement ?? dashboard?.dataSources?.[panel?.sourceId])?.mediaId
    ],
    assets: assets ?? dashboard?.assets ?? {},
  }), [assets, dashboard, destination, initialDraft, mediaItem, panel, placement]);
  return (
    <StaticContentWizard
      open={open}
      editor
      dashboard={dashboard}
      {...staticContentEditorWizardProps({
        contentDraftCoordinator,
        contentRenderContext,
        onContentDraftStage,
        onContentDraftCommit,
        onContentDraftDiscard,
      })}
      initialDraft={draft}
      restoration={restoration}
      disabled={disabled}
      onDraftChange={onDraftChange}
      onDirtyChange={onDirtyChange}
      onRestorationChange={onRestorationChange}
      onCreate={onSave}
      onClose={onCancel}
      onSuspend={onSuspend}
    />
  );
}

export function staticContentEditorWizardProps({
  contentDraftCoordinator,
  contentRenderContext,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
} = {}) {
  return {
    contentDraftCoordinator,
    contentRenderContext,
    onContentDraftStage,
    onContentDraftCommit,
    onContentDraftDiscard,
  };
}

export default StaticContentEditor;
