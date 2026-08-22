import test from "node:test";
import assert from "node:assert/strict";

const protocolModule = await import("../src/lib/presentationProtocol.js").catch(
  () => null,
);

const scene = {
  active_page_id: "biomedical",
  displayed_chart_ids: ["chart-a", "chart-b"],
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
  });

  assert.deepEqual(message, {
    protocol_version: 2,
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
    () => protocolModule.validatePresentationState({ ...scene, displayed_chart_ids: ["chart-a", "chart-a"] }),
    /unique chart IDs/,
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
      }),
    /finite/,
  );
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
    protocol_version: 2,
    session_id: "session-001",
    sequence: 1,
    type: "ready",
    payload: {},
  };

  assert.deepEqual(
    protocolModule.parsePresentationMessage(ready, { sessionId: "session-001" }),
    ready,
  );
  assert.throws(
    () =>
      protocolModule.parsePresentationMessage(
        { ...ready, type: "authoring-command" },
        { sessionId: "session-001" },
      ),
    /message type/,
  );
  assert.throws(
    () =>
      protocolModule.parsePresentationMessage(
        { ...ready, session_id: "other-session" },
        { sessionId: "session-001" },
      ),
    /session/,
  );
});
