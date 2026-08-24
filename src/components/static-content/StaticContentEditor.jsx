import React from "react";

import { createStaticContentDraft } from "../../static-content/forms/staticContentDraft.js";
import { StaticContentWizard } from "./StaticContentWizard.jsx";

export function StaticContentEditor({
  open = true,
  dashboard,
  destination,
  panel,
  source,
  assets,
  initialDraft,
  disabled,
  onDraftChange,
  onDirtyChange,
  onSave,
  onCancel,
} = {}) {
  const draft = React.useMemo(() => initialDraft ?? createStaticContentDraft({
    mode: "edit",
    destination,
    panel,
    source,
    assets,
  }), [assets, destination, initialDraft, panel, source]);
  return (
    <StaticContentWizard
      open={open}
      editor
      dashboard={dashboard}
      initialDraft={draft}
      disabled={disabled}
      onDraftChange={onDraftChange}
      onDirtyChange={onDirtyChange}
      onCreate={onSave}
      onClose={onCancel}
    />
  );
}

export default StaticContentEditor;
