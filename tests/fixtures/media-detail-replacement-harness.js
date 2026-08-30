export async function replacementHarness({ deferCommit = false } = {}) {
  const { default: React } = await import("/node_modules/.vite/deps/react.js");
  const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
  const { default: MediaDetail } = await import("/src/components/source-content/MediaDetail.jsx");
  const { createContentDraftCoordinator } = await import("/src/content-library/contentDraftTransaction.js");
  const { readSessionImageAssetBytes, discardSessionImageAsset } = await import("/src/static-content/image/imageAssetValidation.js");
  const { imageFixtureBytes } = await import("/tests/fixtures/imageFixtureBytes.js");
  const { makeDashboardV5 } = await import("/tests/helpers/contentLibraryFixtures.js");
  const bytes = imageFixtureBytes("image/png");
  const nextHash = await crypto.subtle.digest("SHA-256", bytes);
  const nextAssetId = `asset-${[...new Uint8Array(nextHash)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  let dashboard = makeDashboardV5();
  const records = new Map([["asset-map", { status: "durable", bytes: new Uint8Array([9]) }]]);
  let releaseCommit;
  const commitGate = new Promise((resolve) => { releaseCommit = resolve; });
  const originalRevoke = URL.revokeObjectURL.bind(URL);
  let revokedUrls = 0;
  URL.revokeObjectURL = (...args) => {
    revokedUrls += 1;
    return originalRevoke(...args);
  };
  const assetStore = {
    async snapshot(ids) { return new Map(ids.map((id) => [id, records.has(id) ? structuredClone(records.get(id)) : null])); },
    async restore(snapshot) { for (const [id, record] of snapshot) record === null ? records.delete(id) : records.set(id, structuredClone(record)); },
    async stage(input) {
      records.set(input.expectedAssetId, { status: "staged", bytes: new Uint8Array(input.bytes) });
      return { assetId: input.expectedAssetId };
    },
    async commitMany(ids) { for (const id of ids) records.set(id, { ...records.get(id), status: "durable" }); },
    async rollback(id) { if (records.get(id)?.status !== "durable") records.delete(id); },
  };
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    async commitDashboard(candidate, options) {
      if (deferCommit && !options?.rollback) {
        await commitGate;
      }
      dashboard = structuredClone(candidate);
      return dashboard;
    },
    assetStore,
    readSessionAsset: readSessionImageAssetBytes,
    discardSessionAsset: discardSessionImageAsset,
  });
  const target = document.querySelector("#target");
  const root = ReactDOMClient.createRoot(target);
  const stageCalls = [];
  const discardCalls = [];
  const item = { id: "media-image-source", kind: "media", record: dashboard.contentLibrary.mediaItems["media-image-source"], uses: [], activeRetainers: [], usageKnown: true };
  const mount = () => root.render(React.createElement(MediaDetail, {
    item,
    dashboard,
    contentDraftCoordinator: coordinator,
    onContentDraftStage(draft) { stageCalls.push(draft.draftId); coordinator.stageDraft(draft); },
    onContentDraftCommit(draftId, buildCandidate) { return coordinator.commitDraft(draftId, { buildCandidate }); },
    async onContentDraftDiscard(draftId, reason) {
      discardCalls.push({ draftId, reason });
      return coordinator.discardDraft(draftId, { reason });
    },
  }));
  return {
    bytes,
    cleanup: async () => {
      URL.revokeObjectURL = originalRevoke;
      discardSessionImageAsset(nextAssetId);
      await coordinator.dispose();
    },
    coordinator,
    discardCalls,
    mount,
    nextAssetId,
    prepareSettled: () => stageCalls.length > 0 || revokedUrls > 0,
    readSessionAsset: readSessionImageAssetBytes,
    records,
    releaseCommit,
    root,
    stageCalls,
    target,
  };
}

export function setFile(input, bytes) {
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], "replacement.png", { type: "image/png" }));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export async function waitFor(predicate) {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for mounted media replacement state.");
}
