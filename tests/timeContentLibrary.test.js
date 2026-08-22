import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  createRunningTemporalSnapshot,
  createTimeContentState,
  getTimeContentEmptyState,
  ownerHandoff,
  reduceTimeContent,
  selectTimeContentSections,
} from "../src/components/time/timeContentState.js";

const items = [
  {
    id: "group-ready",
    type: "group",
    name: "Winter response",
    pageId: null,
    needsAttention: [],
  },
  {
    id: "group-attention",
    type: "group",
    name: "Sparse observations",
    needsAttention: [{ code: "NO_OBSERVATIONS", message: "No observations in period" }],
  },
  {
    id: "scene-ready",
    type: "scene",
    name: "Executive surveillance",
    pageId: "biomedical",
    needsAttention: [],
  },
  {
    id: "scene-attention",
    type: "scene",
    name: "Broken presentation",
    pageId: "operations",
    needsAttention: [{ code: "INVALID_PRESENT_LAYOUT", message: "Presentation layout is invalid" }],
  },
];

test("browse, search, and type filtering preserve Ready and Needs attention grouping", () => {
  let state = createTimeContentState({ items });
  let sections = selectTimeContentSections(state);
  assert.deepEqual(sections.ready.map(({ id }) => id), ["group-ready", "scene-ready"]);
  assert.deepEqual(sections.needsAttention.map(({ id }) => id), ["group-attention", "scene-attention"]);
  assert.equal(getTimeContentEmptyState(state, sections), null);

  state = reduceTimeContent(state, { type: "SET_QUERY", query: "response" });
  sections = selectTimeContentSections(state);
  assert.deepEqual(sections.ready.map(({ id }) => id), ["group-ready"]);
  assert.deepEqual(sections.needsAttention, []);

  state = reduceTimeContent(state, { type: "SET_QUERY", query: "" });
  state = reduceTimeContent(state, { type: "SET_FILTER", filter: "scenes" });
  sections = selectTimeContentSections(state);
  assert.deepEqual(sections.ready.map(({ id }) => id), ["scene-ready"]);
  assert.deepEqual(sections.needsAttention.map(({ id }) => id), ["scene-attention"]);
});

test("live item refresh preserves the active library context", () => {
  const state = createTimeContentState({
    items: [items[0]],
    query: "exercise",
    filter: "groups",
    grouping: "needs-attention",
    pageId: "page-a",
    scrollTop: 180,
    focusId: "group-ready",
  });
  const refreshed = reduceTimeContent(state, {
    type: "REFRESH_ITEMS",
    items: [items[1], items[2]],
  });

  assert.deepEqual(refreshed.items, [items[1], items[2]]);
  assert.equal(refreshed.query, "exercise");
  assert.equal(refreshed.filter, "groups");
  assert.equal(refreshed.grouping, "needs-attention");
  assert.equal(refreshed.pageId, "page-a");
  assert.equal(refreshed.scrollTop, 180);
  assert.equal(refreshed.focusId, "group-ready");
  assert.deepEqual(refreshed.returnContext, state.returnContext);
});

test("empty library is distinct from a search with no results", () => {
  const empty = createTimeContentState({ items: [] });
  assert.deepEqual(getTimeContentEmptyState(empty, selectTimeContentSections(empty)), {
    kind: "empty-library",
    message: "No Time Groups or Scenes have been created yet.",
  });

  const noResults = reduceTimeContent(createTimeContentState({ items }), {
    type: "SET_QUERY",
    query: "does not exist",
  });
  assert.deepEqual(getTimeContentEmptyState(noResults, selectTimeContentSections(noResults)), {
    kind: "no-results",
    message: "No Time Groups or Scenes match the current search and filter.",
  });
});

test("create, edit, duplicate, remove, and repair intents retain the complete return context", () => {
  const returnContext = {
    pageId: "biomedical",
    scrollTop: 684,
    focusId: "time-content-scene-ready-edit",
    query: "surveillance",
    filter: "scenes",
  };
  let state = createTimeContentState({ items, ...returnContext });

  for (const intent of ["create", "edit", "duplicate", "remove", "repair"]) {
    state = reduceTimeContent(state, {
      type: "REQUEST_INTENT",
      item: intent === "create" ? { type: "scene" } : items[2],
      intent,
      reason: intent === "repair" ? "frame" : null,
    });
    assert.equal(state.operation.intent, intent);
    assert.deepEqual(state.operation.returnContext, returnContext);
    state = reduceTimeContent(state, { type: "RETURN_TO_LIBRARY" });
    assert.equal(state.query, "surveillance");
    assert.equal(state.filter, "scenes");
    assert.equal(state.pageId, "biomedical");
    assert.equal(state.scrollTop, 684);
    assert.equal(state.focusId, "time-content-scene-ready-edit");
  }
});

test("owner handoff maps every approved reason to its exact owning authoring stage", () => {
  const group = { id: "group-1", type: "group" };
  const scene = { id: "scene-1", type: "scene" };
  for (const reason of ["period", "data-period", "invalid-period"]) {
    assert.equal(ownerHandoff(group, "repair", reason).owner, "time-group:period");
  }
  for (const reason of ["membership", "no-observation", "no-observations"]) {
    assert.equal(ownerHandoff(group, "repair", reason).owner, "time-group:charts");
  }
  for (const reason of ["charts", "member-no-observations", "missing-chart"]) {
    assert.equal(ownerHandoff(group, "repair", reason).owner, "time-group:charts");
  }
  for (const reason of ["matching", "cadence"]) {
    assert.equal(ownerHandoff(group, "repair", reason).owner, "time-group:defaults");
  }
  for (const reason of ["defaults", "unsupported-interpolation"]) {
    assert.equal(ownerHandoff(group, "repair", reason).owner, "time-group:defaults");
  }
  for (const reason of ["review", "name"]) {
    assert.equal(ownerHandoff(group, "repair", reason).owner, "time-group:review");
  }
  for (const reason of ["scope", "frame", "selected-frame", "missing-frame"]) {
    assert.equal(ownerHandoff(scene, "repair", reason).owner, "scene:select");
  }
  for (const reason of ["frames", "selected-frame-missing", "invalid-frame-rule", "zero-frame-ledger"]) {
    assert.equal(ownerHandoff(scene, "repair", reason).owner, "scene:select");
  }
  for (const reason of ["composition", "width", "presentation", "present-layout"]) {
    assert.equal(ownerHandoff(scene, "repair", reason).owner, "scene:arrange");
  }
  for (const reason of ["invalid-present-subset", "cross-page-chart", "missing-chart"]) {
    assert.equal(ownerHandoff(scene, "repair", reason).owner, "scene:arrange");
  }
});

test("a dirty temporal draft resolves Save, Discard, or Stay before another mutator opens", () => {
  const target = items[2];
  const activeDraft = { id: "group-draft", owner: "time-group", dirty: true };
  const baseline = createTimeContentState({ items, activeDraft });

  let state = reduceTimeContent(baseline, {
    type: "REQUEST_INTENT",
    item: target,
    intent: "edit",
  });
  assert.equal(state.operation, null);
  assert.deepEqual(state.conflict.options, ["save", "discard", "stay"]);

  const stayed = reduceTimeContent(state, { type: "RESOLVE_CONFLICT", choice: "stay" });
  assert.equal(stayed.operation, null);
  assert.equal(stayed.conflict, null);

  const discarded = reduceTimeContent(state, { type: "RESOLVE_CONFLICT", choice: "discard" });
  assert.equal(discarded.operation.intent, "edit");
  assert.equal(discarded.activeDraft, null);

  state = reduceTimeContent(state, { type: "RESOLVE_CONFLICT", choice: "save" });
  assert.equal(state.operation, null);
  assert.equal(state.conflict.status, "saving");
  state = reduceTimeContent(state, { type: "DRAFT_SAVE_FAILED", error: { message: "Storage busy" } });
  assert.equal(state.conflict.status, "failed");
  assert.equal(state.error.message, "Storage busy");
  state = reduceTimeContent(state, { type: "RESOLVE_CONFLICT", choice: "save" });
  state = reduceTimeContent(state, { type: "DRAFT_SAVE_SUCCEEDED" });
  assert.equal(state.operation.intent, "edit");
  assert.equal(state.activeDraft, null);
});

test("failed library operations recover without losing intent or library context", () => {
  let state = createTimeContentState({
    items,
    pageId: "operations",
    scrollTop: 412,
    focusId: "time-content-group-attention-remove",
    query: "Sparse",
    filter: "groups",
  });
  state = reduceTimeContent(state, {
    type: "REQUEST_INTENT",
    item: items[1],
    intent: "remove",
  });
  state = reduceTimeContent(state, {
    type: "OPERATION_FAILED",
    error: { code: "STORAGE_UNAVAILABLE", message: "Retry remove", retryable: true },
  });
  assert.equal(state.operation.status, "failed");
  assert.equal(state.operation.intent, "remove");
  assert.equal(state.error.code, "STORAGE_UNAVAILABLE");

  const retry = reduceTimeContent(state, { type: "RETRY_OPERATION" });
  assert.equal(retry.operation.status, "pending");
  assert.equal(retry.operation.intent, "remove");
  const returned = reduceTimeContent(retry, { type: "RETURN_TO_LIBRARY" });
  assert.equal(returned.query, "Sparse");
  assert.equal(returned.filter, "groups");
  assert.equal(returned.scrollTop, 412);
  assert.equal(returned.focusId, "time-content-group-attention-remove");
});

test("running View or Present snapshots stay immutable while saves only signal authored content changed", () => {
  const snapshot = createRunningTemporalSnapshot({
    mode: "view",
    content: { id: "scene-ready", name: "Executive surveillance", frameIndex: 3 },
  });
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.content), true);
  const originalSnapshot = structuredClone(snapshot);

  let state = createTimeContentState({ items, runningSession: snapshot });
  state = reduceTimeContent(state, {
    type: "REQUEST_INTENT",
    item: items[2],
    intent: "edit",
  });
  state = reduceTimeContent(state, {
    type: "OPERATION_SUCCEEDED",
    items: items.map((item) => item.id === "scene-ready" ? { ...item, name: "Updated scene" } : item),
  });
  assert.strictEqual(state.runningSession, snapshot);
  assert.deepEqual(state.runningSession, originalSnapshot);
  assert.equal(state.authoredContentChanged, true);
  assert.equal(state.runningSession.content.frameIndex, 3);
});

test("Time Content Library exposes accessible browse, status, intent, conflict, and recovery controls", async () => {
  const vite = await createServer({
    root: process.cwd(),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const componentModule = await vite
    .ssrLoadModule("/src/components/time/TimeContentLibrary.jsx")
    .catch(() => null);
  await vite.close();

  assert.equal(typeof componentModule?.default, "function");
  const base = createTimeContentState({ items });
  const html = renderToStaticMarkup(React.createElement(componentModule.default, {
    state: base,
    onAction() {},
  }));
  assert.match(html, /Time Content/);
  assert.match(html, /Search Time Content/);
  assert.match(html, />Ready</);
  assert.match(html, />Needs attention</);
  assert.match(html, />Create Time Group</);
  assert.match(html, />Create Scene</);
  assert.match(html, /No observations in period/);
  assert.match(html, />Repair</);

  const conflict = reduceTimeContent(createTimeContentState({
    items,
    activeDraft: { id: "scene-draft", owner: "scene", dirty: true },
  }), { type: "REQUEST_INTENT", item: items[0], intent: "edit" });
  const conflictHtml = renderToStaticMarkup(React.createElement(componentModule.default, {
    state: conflict,
    onAction() {},
  }));
  assert.match(conflictHtml, /Save this draft before continuing/);
  assert.match(conflictHtml, />Save draft</);
  assert.match(conflictHtml, />Discard draft</);
  assert.match(conflictHtml, />Stay</);
});
