import React from "react";
import { renameMediaItem } from "../../content-library/mediaItems.js";
import { renameSourceEntry } from "../../content-library/sourceEntrySchema.js";
import MediaDetail from "./MediaDetail.jsx";
import DataSourceDetail from "./DataSourceDetail.jsx";

export default function ContentDetail({ item, contentDraftCoordinator, datasetProfile, onRename, ...managerProps }) {
  if (!item) return <p className="source-content-empty">Select an item to inspect its details.</p>;
  if (item.kind === "media") return <MediaDetail item={item} contentDraftCoordinator={contentDraftCoordinator} onRename={onRename} {...managerProps} />;
  return <DataSourceDetail item={item} contentDraftCoordinator={contentDraftCoordinator} datasetProfile={datasetProfile} onRename={onRename} {...managerProps} />;
}

export function buildContentRenameDraft({ dashboard, item, displayName, defaultDescription = "" }) {
  const draftId = `manager-rename-${item.kind}-${item.id}-${Date.now()}`;
  const payload = { itemId: item.id, itemKind: item.kind, displayName: displayName.trim(), defaultDescription };
  const buildCandidate = ({ dashboard: currentDashboard, draft }) => {
    const next = structuredClone(currentDashboard);
    if (draft.payload.itemKind === "media") {
      const current = next.contentLibrary.mediaItems[draft.payload.itemId];
      next.contentLibrary.mediaItems[draft.payload.itemId] = renameMediaItem(current, draft.payload);
    } else {
      const current = next.contentLibrary.sourceEntries[draft.payload.itemId];
      next.contentLibrary.sourceEntries[draft.payload.itemId] = renameSourceEntry(current, draft.payload.displayName);
    }
    return {
      dashboard: next,
      commitAssetIds: [],
      discardAssetIds: [],
      itemIds: [draft.payload.itemId],
    };
  };
  return {
    draftId,
    owner: "manager",
    kind: "manager-rename",
    payload,
    assetIds: [],
    mediaIds: item.kind === "media" ? [item.id] : [],
    sourceIds: item.kind === "media" ? [] : [item.id],
    buildCandidate,
  };
}
