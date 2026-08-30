import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  activeLocalAuthoringDrafts,
  buildLeaveBlockReason,
  hasActiveLocalAuthoringDrafts,
  hasEditingLocalAuthoringDrafts,
} from "../src/components/build/buildDirtyState.js";
import { createWizardState } from "../src/charting/forms/wizardDraft.js";
import { createChartDraftSessionStore } from "../src/charting/forms/chartDraftSession.js";
import {
  BUILD_DRAFT_EXIT_WARNING,
  installChartDraftUnloadGuard,
} from "../src/charting/forms/chartDraftUnloadGuard.js";

test("Structure, Scenario, Chrono Group, and Scene drafts independently lock Build exit", () => {
  for (const key of ["structure", "scenario", "chronoGroup", "scene"]) {
    const draft = {
      baseline: { name: "Saved" },
      value: { name: "Changed" },
      status: key === "scene" ? "suspended" : "dirty",
      ...(key === "scene" ? { suspendedStatus: "dirty" } : {}),
    };
    const drafts = { [key]: draft };

    assert.equal(hasActiveLocalAuthoringDrafts(drafts), true, key);
    assert.deepEqual(activeLocalAuthoringDrafts(drafts), [{ key, draft }]);
    assert.strictEqual(activeLocalAuthoringDrafts(drafts)[0].draft, draft);
  }
});

test("saved, discarded, and pristine local drafts do not lock Build exit", () => {
  const savedValue = { name: "Saved" };
  assert.equal(hasActiveLocalAuthoringDrafts({
    structure: { baseline: savedValue, value: structuredClone(savedValue), status: "clean" },
    scenario: { baseline: savedValue, value: structuredClone(savedValue), status: "clean" },
    chronoGroup: { baseline: savedValue, value: structuredClone(savedValue), status: "clean" },
    scene: { baseline: savedValue, value: structuredClone(savedValue), status: "suspended", suspendedStatus: "clean" },
  }), false);
});

test("an unfinished suspended draft remains exit-protected without locking Build navigation", () => {
  const draft = {
    baseline: { name: "Saved" },
    value: { name: "Unfinished" },
    status: "suspended",
    suspendedStatus: "dirty",
  };

  assert.equal(hasActiveLocalAuthoringDrafts({ chronoGroup: draft }), true);
  assert.equal(hasEditingLocalAuthoringDrafts({ chronoGroup: draft }), false);
  assert.equal(hasEditingLocalAuthoringDrafts({ chronoGroup: { ...draft, status: "dirty" } }), true);
});

test("Build leave explains the approved Save, Discard, or Stay boundary", () => {
  assert.equal(buildLeaveBlockReason({
    chronoGroup: {
      baseline: { name: "Saved" },
      value: { name: "Changed" },
      status: "dirty",
    },
  }), "Save or discard changes to Chrono Group before leaving this edit. Stay in Build to continue editing.");
  assert.equal(buildLeaveBlockReason({}), "");
});

test("the existing unload guard also protects local Build drafts without a chart draft", () => {
  const platform = fakeWindow();
  let localDirty = true;
  const remove = installChartDraftUnloadGuard({
    getDraft: () => null,
    hasOtherMeaningfulDraft: () => localDirty,
    window: platform,
  });

  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  assert.equal(platform.listener(event), BUILD_DRAFT_EXIT_WARNING);
  assert.equal(event.prevented, true);
  assert.equal(event.returnValue, BUILD_DRAFT_EXIT_WARNING);

  localDirty = false;
  assert.equal(platform.listener({ preventDefault() {} }), undefined);
  remove();
  assert.equal(platform.listener, null);
});

test("a meaningful suspended chart remains protected by the session store", () => {
  const store = createChartDraftSessionStore();
  const state = createWizardState({
    draftId: "draft-1",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  store.start("dashboard-a", state);
  store.suspend("dashboard-a", {
    stage: "chart-type",
    focusId: "chart-stage-chart-type",
    invokerId: "build-add-chart",
    scrollTop: 120,
    targetId: "draft-1",
  });

  const platform = fakeWindow();
  const remove = installChartDraftUnloadGuard({
    getDraft: () => store.get("dashboard-a"),
    window: platform,
  });
  assert.equal(typeof platform.listener, "function");
  remove();
});

test("Build runtime reports local drafts and wires the shared chart session guard", async () => {
  const [workspace, renderer, wizard] = await Promise.all([
    readFile(new URL("../src/components/build/BuildWorkspace.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/DashboardRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chart-authoring/ChartWizardV3.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /onLocalDraftsChange/);
  assert.match(workspace, /chronoGroup:\s*chronoGroupDraft[\s\S]*scene:\s*sceneDraft/);
  assert.doesNotMatch(workspace, /structure:\s*structureDraft/);
  assert.doesNotMatch(workspace, /scenario:\s*scenarioDraft/);
  assert.match(renderer, /createChartDraftSessionStore/);
  assert.match(renderer, /installChartDraftUnloadGuard/);
  assert.match(renderer, /initialDraftState=\{chartDraftSessionStore\.get\(chartDraftSessionKey\)\}/);
  assert.match(renderer, /onDraftStateChange=\{handleChartDraftStateChange\}/);
  assert.match(renderer, /chartWizardControllerRef\.current\?\.suspend\?\.\(\)/);
  assert.match(wizard, /initialDraftState/);
  assert.match(wizard, /onDraftStateChange\(wizard\)/);
  assert.match(wizard, /React\.useImperativeHandle\(suspendControllerRef/);
});

function fakeWindow() {
  return {
    onbeforeunload: null,
    listener: null,
    addEventListener(type, listener) {
      assert.equal(type, "beforeunload");
      this.listener = listener;
    },
    removeEventListener(type, listener) {
      assert.equal(type, "beforeunload");
      if (this.listener === listener) this.listener = null;
    },
  };
}
