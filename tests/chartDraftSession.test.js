import assert from "node:assert/strict";
import test from "node:test";

import { createWizardState } from "../src/charting/forms/wizardDraft.js";
import * as sessionModule from "../src/charting/forms/chartDraftSession.js";
import {
  CHART_DRAFT_EXIT_WARNING,
  installChartDraftUnloadGuard,
} from "../src/charting/forms/chartDraftUnloadGuard.js";

const {
  createChartDraftSessionStore,
  isMeaningfulChartDraft,
} = sessionModule;

test("one draft per dashboard survives in-app close, Escape, and navigation", () => {
  const store = createChartDraftSessionStore();
  const state = createWizardState({
    draftId: "draft-1",
    dashboardRevision: "r1",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });

  assert.strictEqual(store.start("dashboard-a", state), state);
  assert.strictEqual(
    store.start("dashboard-a", createWizardState({ draftId: "parallel" })),
    state,
  );
  assert.strictEqual(store.get("dashboard-a"), state);

  const restoration = {
    stage: "chart-type",
    focusId: "chart-type-line",
    invokerId: "resume-chart-draft",
    scrollTop: 412,
    targetId: "catalogue-line",
  };
  assert.strictEqual(store.suspend("dashboard-a", restoration), state);
  assert.deepEqual(state.suspension.restoration, restoration);
  assert.equal(state.suspension.reason, "in-app");
  assert.strictEqual(store.resume("dashboard-a"), state);
  assert.equal(state.stage, "chart-type");
  assert.equal(state.suspension.resumeFocusId, "chart-type-line");
  assert.strictEqual(store.get("dashboard-a"), state);
});

test("resume focus falls back to the first issue then the first meaningful stage control", () => {
  const store = createChartDraftSessionStore();
  const issueState = createWizardState({
    draftId: "draft-issue",
    dashboardRevision: "r1",
    errors: [{ stage: "data-source", focusId: "repair-source" }],
  });
  store.start("dashboard-issue", issueState);
  store.suspend("dashboard-issue", {
    stage: "data-source",
    focusId: null,
    invokerId: "resume-chart-draft",
    scrollTop: 0,
    targetId: null,
  });
  assert.equal(store.resume("dashboard-issue").suspension.resumeFocusId, "repair-source");

  const pristine = createWizardState({ draftId: "draft-pristine", dashboardRevision: "r1" });
  store.start("dashboard-pristine", pristine);
  store.suspend("dashboard-pristine", {
    stage: "destination",
    focusId: null,
    invokerId: "add-chart",
    scrollTop: 0,
    targetId: null,
  });
  assert.equal(
    store.resume("dashboard-pristine").suspension.resumeFocusId,
    "chart-draft-destination",
  );
});

test("a fresh application-session store never hydrates a prior draft", () => {
  let storageReads = 0;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem() { storageReads += 1; } },
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: { getItem() { storageReads += 1; } },
  });
  try {
    const firstSession = createChartDraftSessionStore();
    firstSession.start("dashboard-a", createWizardState({
      draftId: "draft-1",
      destination: { pageId: "page-a", sectionId: "section-a" },
    }));
    const reloadedSession = createChartDraftSessionStore();
    assert.equal(reloadedSession.get("dashboard-a"), null);
    assert.equal(storageReads, 0);
  } finally {
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
    if (originalSessionStorage === undefined) delete globalThis.sessionStorage;
    else Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
  }

  for (const forbiddenExport of [
    "serialize",
    "hydrate",
    "migrateStaleDraft",
    "save",
    "load",
  ]) {
    assert.equal(Object.hasOwn(sessionModule, forbiddenExport), false, forbiddenExport);
  }
});

test("store replacement and clearing are dashboard-scoped", () => {
  const store = createChartDraftSessionStore();
  const first = createWizardState({ draftId: "first" });
  const second = createWizardState({ draftId: "second" });
  store.start("dashboard-a", first);
  store.start("dashboard-b", second);

  const replacement = createWizardState({ draftId: "replacement" });
  assert.strictEqual(store.replace("dashboard-a", replacement), replacement);
  assert.strictEqual(store.get("dashboard-a"), replacement);
  assert.strictEqual(store.get("dashboard-b"), second);
  assert.equal(store.clear("dashboard-a"), true);
  assert.equal(store.get("dashboard-a"), null);
  assert.strictEqual(store.get("dashboard-b"), second);
});

test("unload guard warns only for a meaningful resumable draft on a supporting platform", () => {
  const platform = fakeWindow(true);
  let draft = createWizardState({ draftId: "draft-1", dashboardRevision: "r1" });
  let remove = installChartDraftUnloadGuard({ getDraft: () => draft, window: platform });
  assert.equal(platform.listener, null);
  remove();

  draft = createWizardState({
    draftId: "draft-1",
    dashboardRevision: "r1",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  assert.equal(isMeaningfulChartDraft(draft), true);
  remove = installChartDraftUnloadGuard({ getDraft: () => draft, window: platform });
  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  const message = platform.listener(event);
  assert.equal(event.prevented, true);
  assert.equal(event.returnValue, CHART_DRAFT_EXIT_WARNING);
  assert.equal(message, CHART_DRAFT_EXIT_WARNING);
  assert.match(message, /cannot be resumed after exit/i);
  remove();
  assert.equal(platform.listener, null);
});

test("unload guard stays absent for committed, discarded, or unsupported drafts", () => {
  const meaningful = createWizardState({
    draftId: "draft-1",
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  for (const draft of [
    { ...meaningful, status: "committed" },
    { ...meaningful, discarded: true },
  ]) {
    const platform = fakeWindow(true);
    installChartDraftUnloadGuard({ getDraft: () => draft, window: platform });
    assert.equal(platform.listener, null);
  }

  const unsupported = fakeWindow(false);
  const remove = installChartDraftUnloadGuard({
    getDraft: () => meaningful,
    window: unsupported,
  });
  assert.equal(unsupported.listener, null);
  assert.doesNotThrow(remove);
});

function fakeWindow(supportsBeforeUnload) {
  const platform = {
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
  if (supportsBeforeUnload) platform.onbeforeunload = null;
  return platform;
}
