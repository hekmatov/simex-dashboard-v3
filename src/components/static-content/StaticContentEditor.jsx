import React from "react";

import {
  createStaticContentDraft,
  isStaticContentDraftDirty,
  reduceStaticContentDraft,
} from "../../static-content/forms/staticContentDraft.js";
import EditSessionActions from "../chart-authoring/EditSessionActions.jsx";
import ChartFootprintPicker from "../chart-authoring/ChartFootprintPicker.jsx";
import {
  legacySizeForFootprint,
  resolveChartFootprint,
  STATIC_FOOTPRINT_ROW_HEIGHTS,
} from "../chartPanelLayout.js";
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

/** Compact Text/Image editing is limited to the panel footprint; content stays in the full editor. */
export function StaticContentQuickEditor({
  draft,
  disabled = false,
  onDraftChange = noop,
  onSave = noop,
  onReset = noop,
  onClose = noop,
  onOpenFullEditor = noop,
} = {}) {
  if (!draft) return null;
  const dirty = isStaticContentDraftDirty(draft);
  const busy = draft.status === "committing";
  const locked = disabled || busy;
  const updateFootprint = ({ columns, rows }) => {
    if (locked) return;
    onDraftChange(reduceStaticContentDraft(draft, {
      type: "setPanel",
      updates: {
        layout: {
          ...(draft.panel?.layout ?? {}),
          size: legacySizeForFootprint({ columns, rows }),
          width: columns,
          height: rows,
        },
      },
    }));
  };
  const submit = (event) => {
    event?.preventDefault?.();
    if (!locked && dirty) return onSave();
    return undefined;
  };

  return (
    <div className="chart-editor-inspector chart-quick-editor-inspector">
      <aside
        className="chart-editor-v3 chart-quick-editor static-content-quick-editor"
        aria-labelledby="static-content-quick-editor-title"
        aria-busy={locked ? "true" : undefined}
        aria-disabled={locked ? "true" : undefined}
        inert={disabled && !busy ? true : undefined}
      >
        <form onSubmit={submit}>
          <h2 id="static-content-quick-editor-title" className="visually-hidden">
            Quick edit: {draft.panel?.title?.trim() || "Untitled Text/Image panel"}
          </h2>
          <EditSessionActions
            className="chart-quick-editor-actions"
            leadingAction={{
              interactionId: "shell.open-editable-tab",
              ariaLabel: "Open full editor",
              tooltip: "Open full editor",
              disabled: locked,
              onClick: () => !locked && onOpenFullEditor(),
            }}
            valid={dirty}
            submitting={busy}
            disabled={disabled}
            saveLabel="Save"
            resetLabel="Reset"
            cancelLabel="Close"
            onRequestReset={() => !locked && onReset()}
            onCancel={() => !locked && onClose()}
          />
          <div className="chart-editor-layout chart-quick-editor-layout">
            <div className="chart-quick-editor-settings">
              <ChartFootprintPicker
                subject="Panel"
                idPrefix={`static-panel-${draft.draftIdentity?.panelId ?? "draft"}-footprint`}
                value={resolveChartFootprint(draft.panel?.layout)}
                disabled={locked}
                compact
                showPreview={false}
                maxRows={4}
                rowHeights={STATIC_FOOTPRINT_ROW_HEIGHTS}
                onChange={updateFootprint}
              />
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}

function noop() {}
