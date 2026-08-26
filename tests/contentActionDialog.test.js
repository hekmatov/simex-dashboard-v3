import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const dependencyModule = await vite.ssrLoadModule("/src/components/source-content/DependencyList.jsx");
const dialogModule = await vite.ssrLoadModule("/src/components/source-content/ContentActionDialog.jsx");
const workspaceModule = await vite.ssrLoadModule("/src/components/source-content/SourceContentWorkspace.jsx");
const rendererModule = await vite.ssrLoadModule("/src/components/DashboardRenderer.jsx");
await vite.close();
const DependencyList = dependencyModule.default;
const ContentActionDialog = dialogModule.default;
const { visibleManagerItems } = workspaceModule;
const { projectContentManagerDependencies } = rendererModule;

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
