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
  onDraftChange,
  onDirtyChange,
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
      initialDraft={draft}
      restoration={restoration}
      disabled={disabled}
      onDraftChange={onDraftChange}
      onDirtyChange={onDirtyChange}
      onCreate={onSave}
      onClose={onCancel}
      onSuspend={onSuspend}
    />
  );
}

export default StaticContentEditor;
