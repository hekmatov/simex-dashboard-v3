import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const dependencyModule = await vite.ssrLoadModule("/src/components/source-content/DependencyList.jsx");
const dialogModule = await vite.ssrLoadModule("/src/components/source-content/ContentActionDialog.jsx");
const workspaceModule = await vite.ssrLoadModule("/src/components/source-content/SourceContentWorkspace.jsx");
const detailModule = await vite.ssrLoadModule("/src/components/source-content/ContentDetail.jsx");
const mediaCatalogueModule = await vite.ssrLoadModule("/src/components/source-content/MediaCatalogue.jsx");
const rendererModule = await vite.ssrLoadModule("/src/components/DashboardRenderer.jsx");
await vite.close();
const DependencyList = dependencyModule.default;
const ContentActionDialog = dialogModule.default;
const {
  createSourceContentOwnerRegistry,
  reduceSourceContentOwnerRegistry,
  selectRetainedSourceContentOwners,
  selectSourceContentOwners,
  visibleManagerItems,
} = workspaceModule;
const { projectContentManagerDependencies } = rendererModule;

test("Source Content rename retries reuse one deterministic edit transaction identity", () => {
  const input = {
    dashboard: {},
    item: { id: "cases", kind: "csv" },
    displayName: "Cases updated",
  };
  const first = detailModule.buildContentRenameDraft(input);
  const retry = detailModule.buildContentRenameDraft(input);
  assert.equal(first.draftId, "manager-rename-csv-cases");
  assert.equal(retry.draftId, first.draftId);
  assert.equal(workspaceModule.projectSourceContentOwner(first).draftId, "source-content-edit:cases");
});

test("Source Content registry keeps one stable owner through saving, error, retry, and suspension", () => {
  let registry = createSourceContentOwnerRegistry();
  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "STAGE",
    input: {
      draftId: "manager-media-local",
      kind: "manager-media-add",
      payload: { mediaId: "media-local" },
      mediaIds: ["media-local"],
      sourceIds: [],
    },
  });
  const [created] = selectSourceContentOwners(registry);
  assert.equal(created.draftId, "source-content-create:manager-media-local");
  assert.equal(created.status, "dirty");

  for (const status of ["saving", "error", "saving"]) {
    registry = reduceSourceContentOwnerRegistry(registry, {
      type: "STATUS",
      transactionDraftId: "manager-media-local",
      status,
      error: status === "error" ? "Persistence failed" : null,
    });
    const [same] = selectSourceContentOwners(registry);
    assert.equal(same.draftId, created.draftId);
    assert.equal(same.status, status);
  }
  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "ACTIVITY",
    activity: "suspended",
    restoration: { surface: "source-content-dialog", focusIndex: 3, scrollTop: 240 },
  });
  assert.deepEqual(selectSourceContentOwners(registry)[0].restoration, {
    surface: "source-content-dialog",
    focusIndex: 3,
    scrollTop: 240,
  });
  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "SUCCEEDED",
    transactionDraftId: "manager-media-local",
  });
  assert.deepEqual(selectSourceContentOwners(registry), []);

  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "STAGE",
    input: {
      draftId: "manager-rename-csv-cases-123",
      kind: "manager-rename",
      payload: { itemId: "cases", itemKind: "csv", displayName: "Cases updated" },
      mediaIds: [],
      sourceIds: ["cases"],
    },
  });
  assert.equal(selectSourceContentOwners(registry)[0].draftId, "source-content-edit:cases");
  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "DISCARD",
    transactionDraftId: "manager-rename-csv-cases-123",
  });
  assert.deepEqual(selectSourceContentOwners(registry), []);

  assert.deepEqual(selectSourceContentOwners(reduceSourceContentOwnerRegistry(registry, {
    type: "STAGE",
    input: { draftId: "", kind: "manager-media-add", payload: {}, mediaIds: [], sourceIds: [] },
  })), []);
});

test("Source Content owner eligibility follows valid dirty forms without losing retry identity", () => {
  const input = {
    draftId: "manager-media-eligibility",
    kind: "manager-media-add",
    payload: { mediaId: "media-eligibility" },
    mediaIds: ["media-eligibility"],
    sourceIds: [],
  };
  let registry = reduceSourceContentOwnerRegistry(createSourceContentOwnerRegistry(), {
    type: "STAGE", input,
  });
  const ownerId = selectSourceContentOwners(registry)[0].draftId;
  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "ELIGIBILITY", transactionDraftId: input.draftId, eligible: false,
  });
  assert.deepEqual(selectSourceContentOwners(registry), []);
  assert.deepEqual(selectRetainedSourceContentOwners(registry).map(({ draftId, eligible }) => ({
    draftId,
    eligible,
  })), [{
    draftId: ownerId,
    eligible: false,
  }]);
  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "STATUS", transactionDraftId: input.draftId, status: "error", error: "retry retained",
  });
  registry = reduceSourceContentOwnerRegistry(registry, {
    type: "ELIGIBILITY", transactionDraftId: input.draftId, eligible: true,
  });
  assert.equal(selectSourceContentOwners(registry)[0].draftId, ownerId);
  assert.equal(selectSourceContentOwners(registry)[0].status, "error");
  assert.equal(selectRetainedSourceContentOwners(registry)[0].draftId, ownerId);
});

test("duplicate media eligibility uses the newly selected choice in the same change", () => {
  assert.equal(mediaCatalogueModule.isManagerMediaDraftEligible({ displayName: "Duplicate", choice: null }), false);
  assert.equal(mediaCatalogueModule.isManagerMediaDraftEligible({ displayName: "Duplicate", choice: "reuse" }), true);
  assert.equal(mediaCatalogueModule.isManagerMediaDraftEligible({ displayName: "", choice: "separate" }), false);
});

test("valid dirty rename eligibility is adopted before submit while clean and incomplete forms stay absent", () => {
  const item = {
    id: "cases",
    kind: "csv",
    record: { displayName: "Cases", defaultDescription: "" },
  };
  assert.equal(workspaceModule.buildEligibleContentRenameDraft({
    dashboard: {}, item, displayName: "Cases",
  }), null);
  assert.equal(workspaceModule.buildEligibleContentRenameDraft({
    dashboard: {}, item, displayName: "   ",
  }), null);
  const draft = workspaceModule.buildEligibleContentRenameDraft({
    dashboard: {}, item, displayName: "Cases reviewed",
  });
  assert.equal(draft.draftId, "manager-rename-csv-cases");
  assert.equal(workspaceModule.projectSourceContentOwner(draft).draftId, "source-content-edit:cases");
});

test("Source Content actions prefer current restoration and preserve suspended drafts across remount", () => {
  const stale = { focusIndex: 1, scrollTop: 10 };
  const current = { focusIndex: 4, scrollTop: 260 };
  assert.deepEqual(workspaceModule.currentSourceContentRestoration(current, { restoration: stale }), current);
  assert.deepEqual(workspaceModule.currentSourceContentRestoration(null, { restoration: stale }), stale);
  assert.equal(workspaceModule.shouldDiscardSourceContentDraftsOnUnmount(true, 1), true);
  assert.equal(workspaceModule.shouldDiscardSourceContentDraftsOnUnmount(false, 1), false);
  assert.equal(workspaceModule.shouldDiscardSourceContentDraftsOnUnmount(false, 0), true);
});

test("blocked delete is visibly disabled with inline guided navigation and no dialog", () => {
  const html = renderToStaticMarkup(React.createElement(DependencyList, {
    uses: [{ id: "use-a", pageLabel: "Operations", sectionLabel: "Signals", panelLabel: "Map" }],
    activeRetainers: [],
    deletion: { status: "blocked", itemLabel: "Boundaries" },
    onNavigate() {},
  }));
  assert.match(html, /<button[^>]*disabled[^>]*>Delete<\/button>/);
  assert.match(html, /Remove or replace the direct use before deleting/);
  assert.match(html, /Operations[\s\S]*Signals[\s\S]*Map/);
  assert.doesNotMatch(html, /role="dialog"/);
});

test("eligible delete renders only the scoped destructive confirmation modal", () => {
  const html = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "delete",
    itemLabel: "Unused source",
  }));
  assert.match(html, /role="dialog"/);
  assert.match(html, /Delete Unused source\?/);
  assert.match(html, /This removes the managed item/);
  assert.match(html, />Cancel<\/button>/);
  assert.match(html, />Delete<\/button>/);
  assert.doesNotMatch(html, /Replace|Relink|Import as new/);
});

test("media replacement renders only the focused non-destructive replacement action", () => {
  const html = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "replace",
    itemLabel: "Shared map",
    replacementReady: true,
    replacementLabel: "replacement.jpg",
  }));
  assert.match(html, /role="dialog"/);
  assert.match(html, /Replace Shared map everywhere\?/);
  assert.match(html, /Replacement image/);
  assert.match(html, /Ready: replacement.jpg/);
  assert.match(html, />Cancel<\/button>/);
  assert.match(html, />Replace everywhere<\/button>/);
  assert.doesNotMatch(html, /Delete|Relink|Undo|Redo/);
});

test("replacement action dialog branches keep a scrollable body before their footer", () => {
  for (const action of ["replace-csv", "replace"]) {
    const html = renderToStaticMarkup(React.createElement(ContentActionDialog, {
      open: true,
      action,
      itemLabel: "Shared cases",
      replacementReady: true,
    }));
    assert.match(html, /class="confirm-dialog-body dashboard-dialog__body"/u);
    assert.match(
      html,
      /class="confirm-dialog-body dashboard-dialog__body"[\s\S]*<\/div><div class="confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions"/u,
    );
  }
});

test("a saving Source Content dialog is busy and disables every exit, input, and navigation action", () => {
  const html = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "replace-csv",
    itemLabel: "Cases",
    busy: true,
    replacementReady: true,
    remapTargets: [{ id: "map", pageLabel: "Overview", sectionLabel: "Response", panelLabel: "Cases map" }],
    onNavigate() {},
  }));
  assert.match(html, /role="dialog"[^>]*aria-busy="true"/);
  assert.match(html, /<input[^>]*type="file"[^>]*disabled/);
  assert.match(html, /<button[^>]*disabled[^>]*>Cancel<\/button>/);
  assert.match(html, /<button[^>]*class="source-content-breadcrumb"[^>]*disabled/);
  assert.match(html, /<button[^>]*disabled[^>]*>Replacing…<\/button>/);
});

test("blocked CSV replacement exposes a typed reason, import-as-new, and guided remap targets", () => {
  const html = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "replace-csv",
    itemLabel: "Cases",
    replacementLabel: "candidate.csv",
    replacementStatus: "blocked",
    replacementReason: { code: "missing-encoding-column", message: 'Configured column "municipality" is missing from the replacement CSV.' },
    canImportAsNew: true,
    remapTargets: [{ id: "map", pageLabel: "Overview", sectionLabel: "Response", panelLabel: "Cases map" }],
  }));
  assert.match(html, /Replace Cases file\?/);
  assert.match(html, /Configured column &quot;municipality&quot; is missing/);
  assert.match(html, /data-replacement-reason="missing-encoding-column"/);
  assert.match(html, />Import as new source</);
  assert.match(html, /Overview[\s\S]*Response[\s\S]*Cases map/);
  assert.doesNotMatch(html, />Delete</);
});

test("CSV action dialog distinguishes stored replacement from linked-project relink wording", () => {
  const stored = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "replace-csv",
    itemLabel: "Stored cases",
    replacementReady: true,
  }));
  assert.match(stored, /Replace Stored cases file\?/u);
  assert.match(stored, />Replacement CSV</u);
  assert.match(stored, />Replace file<\/button>/u);
  assert.doesNotMatch(stored, /Relink/u);

  const linked = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "relink-csv",
    itemLabel: "Linked cases",
    replacementReady: true,
  }));
  assert.match(linked, /Relink Linked cases\?/u);
  assert.match(linked, />Relink CSV</u);
  assert.match(linked, />Relink<\/button>/u);
  assert.doesNotMatch(linked, /Replace Linked cases|Replacement CSV|>Replace file</u);
});

test("temporal CSV replacement exposes an explicit warning confirmation without import-as-new", () => {
  const html = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "replace-csv",
    itemLabel: "Cases",
    replacementReady: true,
    replacementStatus: "requires-temporal-review",
    replacementReason: {
      code: "requires-temporal-review",
      message: "This replacement changes a directly used temporal observation series and requires review.",
    },
    impactContexts: [
      { kind: "chrono-group", id: "cases-playback" },
      { kind: "scene", id: "cases-scene" },
      { kind: "scene-presentation", id: "cases-scene" },
    ],
  }));
  assert.match(html, /data-replacement-reason="requires-temporal-review"/u);
  assert.match(html, /requires review/u);
  assert.doesNotMatch(html, /Import as new source/u);
  assert.match(html, />Confirm replacement and mark affected temporal content<\/button>/u);
  assert.match(html, /Chrono Group: cases-playback/u);
  assert.match(html, /Scene: cases-scene/u);
  assert.match(html, /Scene presentation: cases-scene/u);
  assert.doesNotMatch(html, /<button type="button" disabled="">Confirm replacement/u);
});

test("GeoJSON replacement renders structural blocks and geometry warnings without temporal contexts", () => {
  const blocked = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "replace-geojson",
    itemLabel: "Boundaries",
    replacementLabel: "candidate.geojson",
    replacementStatus: "blocked",
    replacementReason: { code: "selected-join-field-absent", message: 'Selected join property "code" is absent.' },
    canImportAsNew: true,
    remapTargets: [{ id: "map", pageLabel: "Overview", sectionLabel: "Response", panelLabel: "Cases map" }],
  }));
  assert.match(blocked, /Replace Boundaries file\?/u);
  assert.match(blocked, /data-replacement-reason="selected-join-field-absent"/u);
  assert.match(blocked, />Import as new source</u);
  assert.match(blocked, /Overview[\s\S]*Response[\s\S]*Cases map/u);

  const warning = renderToStaticMarkup(React.createElement(ContentActionDialog, {
    open: true,
    action: "replace-geojson",
    itemLabel: "Boundaries",
    replacementReady: true,
    replacementStatus: "requires-confirmation",
    replacementWarnings: [{ code: "join-coverage-reduced", message: "Usable join coverage falls from 2 of 2 to 1 of 2." }],
  }));
  assert.match(warning, /Usable join coverage falls/u);
  assert.match(warning, />Confirm GeoJSON replacement<\/button>/u);
  assert.doesNotMatch(warning, /Chrono Group|Scene presentation|temporal content/u);
});

test("manager dependency collections carry retainer and deletion state through the passive detail boundary", () => {
  const uses = [];
  uses.activeRetainers = [{ ownerId: "draft-a", kind: "image-draft" }];
  uses.deletion = { status: "blocked", itemLabel: "Unused image" };
  const html = renderToStaticMarkup(React.createElement(DependencyList, { uses, usageKnown: true }));
  assert.match(html, /Active work retains this item: image-draft/);
  assert.match(html, /<button[^>]*disabled[^>]*>Delete<\/button>/);
});

test("source dependency state attaches after durable SourceEntry validation", () => {
  const dashboard = {
    contentLibrary: {
      mediaItems: {},
      sourceEntries: {
        cases: {
          sourceId: "cases",
          origin: "linked-project",
          ownership: "builder",
          displayName: "Cases",
          provenance: { path: "cases.csv" },
          health: "ready",
        },
      },
    },
    dataSources: { cases: { kind: "dataset", type: "uploadedCsv", origin: "linked-project", csvText: "value\n1\n" } },
    datasetProfiles: {},
    pages: [],
  };
  const projected = projectContentManagerDependencies({ dashboard, onDelete() {} });
  const [item] = visibleManagerItems(projected, "sources", {});
  assert.equal(item.id, "cases");
  assert.equal(item.uses.deletion.status, "ready");
  assert.equal(typeof item.uses.onDelete, "function");
  assert.equal(Object.hasOwn(projected.contentLibrary.sourceEntries.cases, "uses"), false);
  assert.equal(Object.keys(projected).includes("contentDependencyState"), false);
});

test("projected zero-use media is known unused and remains eligible in the manager", () => {
  const dashboard = {
    contentLibrary: {
      mediaItems: {
        unused: {
          mediaId: "unused",
          revision: 1,
          current: { kind: "url", url: "https://example.test/unused.png" },
          displayName: "Unused media",
          defaultDescription: "",
          origin: "external",
          health: "external",
        },
      },
      sourceEntries: {},
    },
    dataSources: {},
    datasetProfiles: {},
    pages: [],
  };
  const projected = projectContentManagerDependencies({ dashboard, onDelete() {} });
  const [item] = visibleManagerItems(projected, "media", { usage: "unused" });
  assert.equal(item.id, "unused");
  assert.equal(item.usageKnown, true);
  assert.equal(item.usageCount, 0);
  assert.equal(item.uses.deletion.status, "ready");
});
