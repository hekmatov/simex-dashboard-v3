import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: BuildWorkspace } = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
await vite.close();

test("live Build projects layout plus one adopted active chart owner with Focus, Save, and Discard", () => {
  const page = { id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [] }] };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: { id: "dashboard", title: "Dashboard", pages: [page], chronoGroups: [], dataSources: {} },
    activePage: page,
    pageType: "analytical",
    buildPanelOpen: true,
    selection: { kind: "chart", placementId: "panel-a" },
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    layoutDraft: { draftId: "layout-dashboard", status: "dirty", targetId: "section-a" },
    chartSlotDraft: {
      draftId: "chart-edit:panel-a",
      kind: "chart-edit",
      scopeId: "panel-a",
      status: "dirty",
      activity: "active",
      surface: "quick",
      targetId: "panel-a",
      restoration: { surface: "quick", focusId: "quick-title", scrollTop: 120 },
    },
    authoredDirtyState: { chartEditor: true },
    pendingWorkOwnerActions: {
      "chart-edit:panel-a": {
        focus() {},
        resume() {},
        save() {},
        discard() {},
      },
    },
    onSaveLayout() {},
    onDiscardLayout() {},
  }));

  assert.match(html, /data-build-draft-coordinator="live"/);
  assert.match(html, /aria-label="Pending Build work"/);
  assert.match(html, /data-pending-work-id="layout"[^>]*data-pending-work-state="dirty"/);
  assert.match(html, /data-pending-work-id="chart-edit:panel-a"[^>]*data-pending-work-state="dirty"[^>]*data-pending-work-activity="active"/);
  assert.match(html, />Save Layout Changes</);
  assert.match(html, />Discard Layout Changes</);
  assert.match(html, /Layout changes/);
  assert.match(html, /Chart changes/);
  assert.match(html, />Focus Chart changes</);
  assert.match(html, />Save changes</);
  assert.match(html, />Discard changes</);
  assert.match(html, /<button[^>]*data-unit-orbit-preserve-open="true"[^>]*>Focus Chart changes<\/button>/);
  assert.match(html, /<button[^>]*data-unit-orbit-preserve-open="true"[^>]*>Save changes<\/button>/);
  assert.match(html, /<button[^>]*data-unit-orbit-preserve-open="true"[^>]*>Discard changes<\/button>/);
  assert.equal((html.match(/data-pending-work-kind="chart-edit"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-pending-work-id="chart-editor"/);
  assert.doesNotMatch(html, /build-draft-slots/);
});

test("a suspended Full chart owner renders Resume and keeps its exact origin metadata", () => {
  const page = { id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [] }] };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: { id: "dashboard", title: "Dashboard", pages: [page], chronoGroups: [], dataSources: {} },
    activePage: page,
    pageType: "analytical",
    buildPanelOpen: true,
    selection: { kind: "page", pageId: "page-a" },
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    chartSlotDraft: {
      draftId: "chart-edit:panel-a",
      kind: "chart-edit",
      scopeId: "panel-a",
      status: "error",
      activity: "suspended",
      surface: "full",
      targetId: "panel-a",
      restoration: { surface: "full", focusId: "full-title", scrollTop: 510 },
    },
    pendingWorkOwnerActions: {
      "chart-edit:panel-a": { resume() {}, save() {}, discard() {} },
    },
  }));

  assert.match(html, /data-pending-work-id="chart-edit:panel-a"/);
  assert.match(html, /data-pending-work-state="error"/);
  assert.match(html, /data-pending-work-activity="suspended"/);
  assert.match(html, /data-pending-work-origin="full"/);
  assert.match(html, />Resume Chart changes</);
  assert.match(html, />Retry Save</);
});

test("a failed chart removal exposes Retry Remove rather than the edit Save action", () => {
  const page = { id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [] }] };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: { id: "dashboard", title: "Dashboard", pages: [page], chronoGroups: [], dataSources: {} },
    activePage: page,
    pageType: "analytical",
    buildPanelOpen: true,
    selection: { kind: "chart", placementId: "panel-a" },
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    chartSlotDraft: {
      draftId: "chart-edit:panel-a",
      kind: "chart-edit",
      scopeId: "panel-a",
      status: "error",
      activity: "active",
      surface: "quick",
      targetId: "panel-a",
      operation: "remove",
    },
    pendingWorkOwnerActions: {
      "chart-edit:panel-a": { focus() {}, save() {}, discard() {} },
    },
  }));

  assert.match(html, />Retry Remove</);
  assert.doesNotMatch(html, />Retry Save</);
});

test("live Build keeps distinct suspended creation and dirty edit owners visible together", () => {
  const page = { id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [] }] };
  const edit = {
    draftId: "chart-edit:panel-a",
    kind: "chart-edit",
    scopeId: "panel-a",
    targetId: "panel-a",
    status: "dirty",
    activity: "active",
    surface: "quick",
  };
  const create = {
    draftId: "chart-create:draft-a",
    kind: "chart-create",
    scopeId: "draft-a",
    targetId: "draft-a",
    status: "dirty",
    activity: "suspended",
    surface: "create",
  };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: { id: "dashboard", title: "Dashboard", pages: [page], chronoGroups: [], dataSources: {} },
    activePage: page,
    pageType: "analytical",
    buildPanelOpen: true,
    selection: { kind: "chart", placementId: "panel-a" },
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    chartSlotDraft: edit,
    chartOwners: [edit, create],
    authoredDirtyState: { chartEditor: true, chartWizard: true },
    pendingWorkOwnerActions: {
      [edit.draftId]: { focus() {}, save() {}, discard() {} },
      [create.draftId]: { resume() {} },
    },
  }));

  assert.equal((html.match(/data-pending-work-kind="chart-edit"/g) ?? []).length, 1);
  assert.equal((html.match(/data-pending-work-kind="chart-create"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-pending-work-id="chart-editor"|data-pending-work-id="chart-wizard"/);
});

test("empty Build state omits the pending-work row from DOM and accessibility trees", () => {
  const page = { id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [] }] };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: { id: "dashboard", title: "Dashboard", pages: [page], chronoGroups: [], dataSources: {} },
    activePage: page,
    pageType: "analytical",
    buildPanelOpen: true,
    selection: { kind: "chart", placementId: "panel-a" },
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
  }));

  assert.doesNotMatch(html, /aria-label="Pending Build work"/);
  assert.doesNotMatch(html, /data-pending-work-id=/);
  assert.doesNotMatch(html, /build-pending-work/);
});
