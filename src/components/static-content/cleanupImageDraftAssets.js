import { discardUnreferencedSessionImageAssets } from "../../static-content/image/imageAssetValidation.js";

export function cleanupImageDraftAssets(draft, dashboard, committed = null) {
  if (draft?.contentTypeId !== "image") return;
  const retained = new Set();
  const replacementMediaId = committed?.mediaItem?.mediaId;
  for (const [mediaId, item] of Object.entries(dashboard?.contentLibrary?.mediaItems ?? {})) {
    const effectiveItem = mediaId === replacementMediaId ? committed.mediaItem : item;
    if (effectiveItem?.current?.kind === "asset") {
      retained.add(effectiveItem.current.assetId);
    }
  }
  if (committed?.mediaItem?.current?.kind === "asset") {
    retained.add(committed.mediaItem.current.assetId);
  }
  discardUnreferencedSessionImageAssets(Object.keys(draft.assets ?? {}), retained);
}
