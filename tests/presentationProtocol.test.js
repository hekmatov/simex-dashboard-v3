import test from "node:test";
import assert from "node:assert/strict";

const protocolModule = await import("../src/lib/presentationProtocol.js").catch(
  () => null,
);

const presentableItemIndex = new Map([
  ["chart-a", {
    id: "chart-a",
    descriptor: { kind: "chart", chart_id: "chart-a" },
  }],
  ["chart-b", {
    id: "chart-b",
    descriptor: { kind: "chart", chart_id: "chart-b" },
  }],
  ["image-a", {
    id: "image-a",
    descriptor: {
      kind: "image",
      panel_id: "image-a",
      media_id: "media-image-source-a",
      revision: 7,
    },
  }],
]);

const scene = {
  active_page_id: "biomedical",
  items: [
    { kind: "chart", chart_id: "chart-a" },
    { kind: "image", panel_id: "image-a", media_id: "media-image-source-a", revision: 7 },
  ],
  layout: "sideBySide",
  time: { group_id: "epidemic-time", active_epoch_ms: 1_801_440_000_000 },
  audience_facts: {
    dashboard_name: true,
    page: true,
    parent_chrono_group: true,
    scene_name: true,
    scene_date: true,
  },
  blackout: false,
};

test("presentation protocol creates a complete versioned state message", () => {
  assert.ok(protocolModule, "presentation protocol must be implemented");
  const message = protocolModule.makePresentationMessage({
    sessionId: "session-001",
    sequence: 1,
    type: "state",
    payload: scene,
    presentableItemIndex,
  });

  assert.deepEqual(message, {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 1,
    type: "state",
    payload: scene,
  });
});

test("presentation state rejects data and authoring fields", () => {
  assert.ok(protocolModule, "presentation protocol must be implemented");

  for (const forbiddenField of ["rows", "dataSources", "csvText", "credentials"]) {
    assert.throws(
      () =>
        protocolModule.validatePresentationState({
          ...scene,
          [forbiddenField]: "not presentation state",
        }),
      /unknown presentation state field/,
    );
  }
});

test("presentation protocol validates identifiers, count-valid layouts, and finite time", () => {
  assert.ok(protocolModule, "presentation protocol must be implemented");

  assert.throws(
    () => protocolModule.validatePresentationState({ ...scene, active_page_id: "bad page" }),
    /identifier/,
  );
  assert.throws(
    () => protocolModule.validatePresentationState({
      ...scene,
      items: [
        { kind: "chart", chart_id: "chart-a" },
        { kind: "chart", chart_id: "chart-a" },
      ],
    }, { presentableItemIndex }),
    /unique presentation items/,
  );
  assert.throws(
    () => protocolModule.validatePresentationState({ ...scene, layout: "grid2x2" }),
    /layout/,
  );
  assert.throws(
    () =>
      protocolModule.validatePresentationState({
        ...scene,
        time: { group_id: "epidemic-time", active_epoch_ms: Number.NaN },
      }, { presentableItemIndex }),
    /finite/,
  );
});

test("presentation protocol accepts only trusted ordered chart and exact Image identity descriptors", () => {
  assert.ok(protocolModule, "presentation protocol must be implemented");

  assert.deepEqual(
    protocolModule.validatePresentationState(scene, { presentableItemIndex }).items,
    [
      { kind: "chart", chart_id: "chart-a" },
      { kind: "image", panel_id: "image-a", media_id: "media-image-source-a", revision: 7 },
    ],
  );

  for (const descriptor of [
    { kind: "freeText", panel_id: "field-guide" },
    { kind: "chart", chart_id: "unknown-chart" },
    { kind: "image", panel_id: "image-a", media_id: "stale-media", revision: 7 },
    { kind: "image", panel_id: "image-a", media_id: "media-image-source-a", revision: 6 },
  ]) {
    assert.throws(
      () => protocolModule.validatePresentationState({
        ...scene,
        items: [descriptor],
        layout: "solo",
      }, { presentableItemIndex }),
      /not allowed|descriptor kind|identity|revision/i,
    );
  }
});

test("Image descriptors reject URLs, blobs, transforms, asset bytes, and temporal fields", () => {
  assert.ok(protocolModule, "presentation protocol must be implemented");
  const image = presentableItemIndex.get("image-a").descriptor;
  for (const [field, value] of [
    ["url", "https://example.test/image.png"],
    ["blob_url", "blob:https://example.test/secret"],
    ["crop", { x: 0, y: 0, width: 1000, height: 1000 }],
    ["fit", "cover"],
    ["rotation", 90],
    ["asset_bytes", "AAAA"],
    ["chrono_group_id", "group-a"],
    ["scene_id", "scene-a"],
    ["frame_id", "frame-a"],
    ["time", { active_epoch_ms: 1 }],
  ]) {
    assert.throws(
      () => protocolModule.validatePresentationState({
        ...scene,
        items: [{ ...image, [field]: value }],
        layout: "solo",
      }, { presentableItemIndex }),
      /unknown presentation item field/,
      field,
    );
  }
});

test("presentation protocol requires the five independent Audience fact flags", () => {
  assert.ok(protocolModule, "presentation protocol must be implemented");

  for (const key of Object.keys(scene.audience_facts)) {
    const missing = { ...scene.audience_facts };
    delete missing[key];
    assert.throws(
      () => protocolModule.validatePresentationState({
        ...scene,
        audience_facts: missing,
      }),
      /missing presentation audience facts field/,
    );
    assert.throws(
      () => protocolModule.validatePresentationState({
        ...scene,
        audience_facts: { ...scene.audience_facts, [key]: "yes" },
      }),
      /Audience fact flags must be booleans/,
    );
  }

  assert.throws(
    () => protocolModule.validatePresentationState({
      ...scene,
      audience_facts: { ...scene.audience_facts, owner: true },
    }),
    /unknown presentation audience facts field/,
  );
});

test("presentation protocol accepts only the four small message types for the expected session", () => {
  assert.ok(protocolModule, "presentation protocol must be implemented");
  const ready = {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 1,
    type: "ready",
    payload: {},
  };

  assert.deepEqual(
    protocolModule.parsePresentationMessage(ready, {
      sessionId: "session-001",
      presentableItemIndex,
    }),
    ready,
  );
  assert.throws(
    () =>
      protocolModule.parsePresentationMessage(
        { ...ready, type: "authoring-command" },
        { sessionId: "session-001", presentableItemIndex },
      ),
    /message type/,
  );
  assert.throws(
    () =>
      protocolModule.parsePresentationMessage(
        { ...ready, session_id: "other-session" },
        { sessionId: "session-001", presentableItemIndex },
      ),
    /session/,
  );
});
