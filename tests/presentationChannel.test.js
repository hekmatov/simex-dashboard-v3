import test from "node:test";
import assert from "node:assert/strict";

import {
  createPresentationAudienceChannel,
  createPresentationControllerChannel,
} from "../src/lib/presentationChannel.js";

const presentableItemIndex = new Map([
  ["chart-a", { id: "chart-a", descriptor: { kind: "chart", chart_id: "chart-a" } }],
  ["chart-b", { id: "chart-b", descriptor: { kind: "chart", chart_id: "chart-b" } }],
  ["image-a", {
    id: "image-a",
    descriptor: { kind: "image", panel_id: "image-a", media_id: "media-image-a", revision: 7 },
  }],
]);

function presentationState(item = { kind: "chart", chart_id: "chart-a" }) {
  const itemId = item.kind === "chart" ? item.chart_id : item.panel_id;
  return {
    dashboard_revision: "dashboard-r17",
    theme: {
      dashboard_style: "evidence-ledger",
      dashboard_color_profile: "signal-instrument/calibrated-steel",
      chart_color_mode: "profile",
      appearance_preference: "light",
      resolved_appearance: "light",
    },
    source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    composition: { active_page_id: "biomedical", displayed_chart_ids: [itemId], layout: "solo" },
    payload: {
      items: [item],
      audience_facts: {
        dashboard_name: true,
        page: true,
        parent_chrono_group: true,
        scene_name: true,
        scene_date: true,
      },
    },
    timeline: {
      frame_epochs: [100, 200],
      frame_index: 0,
      period: { start: 100, end: 200 },
      trace_mode: "reveal",
      seconds_per_frame: 2.5,
    },
    matching: { use_authored_settings: true },
    output_mode: "active",
    blackout: false,
    audience: { date_position: { x_permille: 680, y_permille: 40, width_permille: 280 } },
  };
}

class FakeScheduler {
  #now = 0;
  #nextId = 1;
  #timers = new Map();
  now = () => this.#now;
  setInterval = (callback, delay) => {
    const id = this.#nextId++;
    this.#timers.set(id, { callback, delay, next: this.#now + delay });
    return id;
  };
  clearInterval = (id) => this.#timers.delete(id);
  advance(milliseconds) {
    const target = this.#now + milliseconds;
    while (true) {
      const due = [...this.#timers.entries()]
        .filter(([, timer]) => timer.next <= target)
        .sort(([, left], [, right]) => left.next - right.next)[0];
      if (!due) break;
      const [id, timer] = due;
      this.#now = timer.next;
      timer.next += timer.delay;
      timer.callback();
      if (!this.#timers.has(id)) continue;
    }
    this.#now = target;
  }
  get activeTimerCount() { return this.#timers.size; }
}

class FakeBroadcastChannel {
  static channels = new Map();
  static reset() { this.channels = new Map(); }
  constructor(name) {
    this.name = name;
    this.closed = false;
    this.onmessage = null;
    this.dropNext = 0;
    this.transformNext = null;
    const peers = FakeBroadcastChannel.channels.get(name) ?? new Set();
    peers.add(this);
    FakeBroadcastChannel.channels.set(name, peers);
  }
  postMessage(data) {
    for (const peer of FakeBroadcastChannel.channels.get(this.name) ?? []) {
      if (peer === this || peer.closed) continue;
      if (peer.dropNext > 0) {
        peer.dropNext -= 1;
        continue;
      }
      const delivered = peer.transformNext ? peer.transformNext(data) : data;
      peer.transformNext = null;
      peer.onmessage?.({ data: delivered });
    }
  }
  close() {
    this.closed = true;
    this.onmessage = null;
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

function createChannel(name) { return new FakeBroadcastChannel(name); }

function setup({
  getPresentableItemIndex = () => presentableItemIndex,
  validateSourceSelection = () => ({ accepted: true }),
  onAudienceDatePositionChange = () => {},
  onAcceptedStateChange = () => {},
} = {}) {
  FakeBroadcastChannel.reset();
  const scheduler = new FakeScheduler();
  const states = [];
  const ended = [];
  const acceptedMessages = [];
  const themes = [];
  const rejections = [];
  const controllerRejections = [];
  const statuses = [];
  const controller = createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex,
    validateSourceSelection,
    onConnectionChange: (status) => statuses.push(status),
    onAudienceDatePositionChange,
    onAcceptedStateChange,
    onMessageRejected: (reason, lastValidSnapshot) => {
      controllerRejections.push({ reason, lastValidSnapshot });
    },
  });
  const audience = createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex,
    onStateChange: (next) => states.push(next),
    onThemeChange: (next) => themes.push(next),
    onMessageAccepted: (message) => acceptedMessages.push(message),
    onEnded: (terminalMessage) => ended.push(terminalMessage),
    onConnectionChange: (status) => statuses.push(`audience:${status}`),
    onMessageRejected: (reason, lastValidSnapshot) => rejections.push({ reason, lastValidSnapshot }),
  });
  return {
    audience,
    controller,
    scheduler,
    states,
    themes,
    ended,
    acceptedMessages,
    rejections,
    controllerRejections,
    statuses,
  };
}

function audienceTransport() {
  return [...FakeBroadcastChannel.channels.get("simex-presentation-session-001")].at(-1);
}

test("new Audience accepts a legacy v3 state with no Theme field", () => {
  const { audience, states, rejections } = setup();
  audience.start();
  const sender = createChannel("simex-presentation-session-001");
  const legacyState = presentationState();
  delete legacyState.theme;

  sender.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 1,
    type: "state",
    payload: legacyState,
  });

  assert.deepEqual(states, [legacyState]);
  assert.deepEqual(rejections, []);
  sender.close();
  audience.dispose();
});

test("Audience date movement immediately updates controller output with clone-safe source context", () => {
  const updates = [];
  const desired = { x_permille: 515, y_permille: 260 };
  const { audience, controller, states, controllerRejections } = setup({
    onAudienceDatePositionChange: (update) => {
      updates.push(structuredClone(update));
      update.source.scene_id = "scene-mutated";
      update.datePosition.x_permille = 0;
    },
  });
  controller.start();
  audience.start();
  controller.publish(presentationState());
  const pointerDownSource = audience.getLastValidSnapshot().source;

  const outbound = audience.publishDatePosition(desired, pointerDownSource);

  assert.deepEqual(outbound, {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 2,
    type: "audience-date-position",
    payload: {
      source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
      date_position: { x_permille: 515, y_permille: 260 },
    },
  });
  assert.deepEqual(updates, [{
    source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    datePosition: { x_permille: 515, y_permille: 260, width_permille: 280 },
  }]);
  assert.equal(states.length, 2);
  assert.deepEqual(states.at(-1).audience.date_position, {
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  });
  assert.deepEqual(controller.getLastValidSnapshot().source, {
    kind: "scene",
    scene_id: "scene-a",
    chrono_group_id: "group-a",
  });
  assert.equal(controller.getLastValidSnapshot().audience.date_position.x_permille, 515);
  assert.deepEqual(controllerRejections, []);

  desired.x_permille = 0;
  assert.equal(outbound.payload.date_position.x_permille, 515);
  assert.equal(controller.getLastValidSnapshot().audience.date_position.x_permille, 515);
  audience.dispose();
  controller.dispose();
});

test("Scene date movement is accepted only after persistence succeeds and reverts after rejection", async () => {
  let rejectPersistence;
  const persistence = new Promise((_resolve, reject) => {
    rejectPersistence = reject;
  });
  void persistence.catch(() => undefined);
  const acceptedStates = [];
  const { audience, controller, states, controllerRejections } = setup({
    onAudienceDatePositionChange: () => persistence,
    onAcceptedStateChange: (next) => acceptedStates.push(next),
  });
  controller.start();
  audience.start();
  const initial = presentationState();
  controller.publish(initial);

  audience.publishDatePosition(
    { x_permille: 515, y_permille: 260 },
    audience.getLastValidSnapshot().source,
  );

  assert.equal(states.length, 1, "pending persistence must not produce an accepted echo");
  assert.deepEqual(controller.getLastValidSnapshot(), initial);
  assert.deepEqual(acceptedStates, [initial]);

  rejectPersistence(new Error("Browser dashboard storage is unavailable."));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(states.length, 2, "a rejected save must republish the durable position");
  assert.deepEqual(states.at(-1), initial);
  assert.deepEqual(controller.getLastValidSnapshot(), initial);
  assert.deepEqual(acceptedStates, [initial]);
  assert.deepEqual(
    controllerRejections.map(({ reason }) => reason),
    [{
      code: "presentation_rejected",
      message: "Browser dashboard storage is unavailable.",
    }],
  );
  audience.dispose();
  controller.dispose();
});

test("rapid Scene date releases serialize persistence before accepting the latest position", async () => {
  let resolveFirstPersistence;
  const firstPersistence = new Promise((resolve) => {
    resolveFirstPersistence = resolve;
  });
  const saves = [];
  const { audience, controller, states } = setup({
    onAudienceDatePositionChange: ({ datePosition }) => {
      saves.push(structuredClone(datePosition));
      return saves.length === 1 ? firstPersistence : Promise.resolve();
    },
  });
  controller.start();
  audience.start();
  controller.publish(presentationState());
  const source = audience.getLastValidSnapshot().source;

  audience.publishDatePosition({ x_permille: 515, y_permille: 260 }, source);
  audience.publishDatePosition({ x_permille: 530, y_permille: 275 }, source);

  assert.deepEqual(saves, [{
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  }]);
  assert.equal(states.length, 1);

  resolveFirstPersistence();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(saves, [
    { x_permille: 515, y_permille: 260, width_permille: 280 },
    { x_permille: 530, y_permille: 275, width_permille: 280 },
  ]);
  assert.equal(states.length, 3);
  assert.deepEqual(states.at(-1).audience.date_position, {
    x_permille: 530,
    y_permille: 275,
    width_permille: 280,
  });
  audience.dispose();
  controller.dispose();
});

test("a queued Scene release keeps its receipt-time source after the controller switches Scenes", async () => {
  let resolveFirstPersistence;
  const firstPersistence = new Promise((resolve) => {
    resolveFirstPersistence = resolve;
  });
  const saves = [];
  const { audience, controller, states, controllerRejections } = setup({
    onAudienceDatePositionChange: (update) => {
      saves.push(structuredClone(update));
      return saves.length === 1 ? firstPersistence : Promise.resolve();
    },
  });
  controller.start();
  audience.start();
  const sceneA = presentationState();
  controller.publish(sceneA);
  const sceneASource = audience.getLastValidSnapshot().source;
  audience.publishDatePosition({ x_permille: 515, y_permille: 260 }, sceneASource);
  audience.publishDatePosition({ x_permille: 530, y_permille: 275 }, sceneASource);
  const sceneB = {
    ...presentationState(),
    source: { kind: "scene", scene_id: "scene-b", chrono_group_id: "group-a" },
  };

  controller.publish(sceneB);
  resolveFirstPersistence();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(saves, [
    {
      source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
      datePosition: { x_permille: 515, y_permille: 260, width_permille: 280 },
    },
    {
      source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
      datePosition: { x_permille: 530, y_permille: 275, width_permille: 280 },
    },
  ]);
  assert.deepEqual(controllerRejections, []);
  assert.equal(states.length, 2, "settled Scene A saves must not echo over active Scene B");
  assert.deepEqual(states.at(-1), sceneB);

  const returnedToSceneA = controller.publish(sceneA);
  assert.deepEqual(returnedToSceneA.lastValidSnapshot.audience.date_position, {
    x_permille: 530,
    y_permille: 275,
    width_permille: 280,
  });
  assert.deepEqual(states.at(-1).audience.date_position, {
    x_permille: 530,
    y_permille: 275,
    width_permille: 280,
  });
  audience.dispose();
  controller.dispose();
});

test("disposing the controller prevents a captured queued release from starting persistence", async () => {
  let resolveFirstPersistence;
  const firstPersistence = new Promise((resolve) => {
    resolveFirstPersistence = resolve;
  });
  const saves = [];
  const { audience, controller } = setup({
    onAudienceDatePositionChange: (update) => {
      saves.push(structuredClone(update));
      return saves.length === 1 ? firstPersistence : Promise.resolve();
    },
  });
  controller.start();
  audience.start();
  controller.publish(presentationState());
  const source = audience.getLastValidSnapshot().source;
  audience.publishDatePosition({ x_permille: 515, y_permille: 260 }, source);
  audience.publishDatePosition({ x_permille: 530, y_permille: 275 }, source);

  controller.dispose();
  resolveFirstPersistence();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(saves, [{
    source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    datePosition: { x_permille: 515, y_permille: 260, width_permille: 280 },
  }]);
  audience.dispose();
});

test("Audience date release carries its pointer-down source across a mid-drag source change", () => {
  const updates = [];
  const { audience, controller, states, controllerRejections } = setup({
    onAudienceDatePositionChange: (update) => updates.push(update),
  });
  controller.start();
  audience.start();
  controller.publish(presentationState());
  const pointerDownSource = audience.getLastValidSnapshot().source;
  const sceneB = {
    ...presentationState(),
    source: { kind: "scene", scene_id: "scene-b", chrono_group_id: "group-a" },
  };
  controller.publish(sceneB);

  const outbound = audience.publishDatePosition(
    { x_permille: 515, y_permille: 260 },
    pointerDownSource,
  );

  assert.deepEqual(outbound.payload.source, {
    kind: "scene",
    scene_id: "scene-a",
    chrono_group_id: "group-a",
  });
  assert.deepEqual(updates, []);
  assert.deepEqual(
    controllerRejections.map(({ reason }) => reason.code),
    ["stale_audience_source"],
  );
  assert.equal(states.length, 2);
  assert.deepEqual(controller.getLastValidSnapshot(), sceneB);
  pointerDownSource.scene_id = "scene-mutated";
  assert.equal(outbound.payload.source.scene_id, "scene-a");
  audience.dispose();
  controller.dispose();
});

test("reverse date movement cannot replace the controller's authoritative date width", () => {
  const updates = [];
  const { audience, controller, states, controllerRejections } = setup({
    onAudienceDatePositionChange: (update) => updates.push(update),
  });
  controller.start();
  audience.start();
  controller.publish(presentationState());
  const pointerDownSource = audience.getLastValidSnapshot().source;

  const outbound = audience.publishDatePosition({
    x_permille: 515,
    y_permille: 260,
    width_permille: 400,
  }, pointerDownSource);

  assert.deepEqual(outbound.payload.date_position, {
    x_permille: 515,
    y_permille: 260,
  });
  assert.deepEqual(updates, [{
    source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    datePosition: { x_permille: 515, y_permille: 260, width_permille: 280 },
  }]);
  assert.deepEqual(states.at(-1).audience.date_position, {
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  });
  assert.deepEqual(controllerRejections, []);
  audience.dispose();
  controller.dispose();
});

test("controller reports clone-isolated accepted snapshots immediately after raw-group date movement", () => {
  const monitoredSnapshots = [];
  const movementUpdates = [];
  const { audience, controller, states } = setup({
    onAcceptedStateChange: (next) => {
      monitoredSnapshots.push(structuredClone(next));
      next.source.chrono_group_id = "group-mutated";
      next.audience.date_position.x_permille = 0;
    },
    onAudienceDatePositionChange: (update) => movementUpdates.push(update),
  });
  controller.start();
  audience.start();
  const rawGroup = {
    ...presentationState(),
    source: { kind: "Chrono Group", scene_id: null, chrono_group_id: "group-a" },
  };

  controller.publish(rawGroup);
  assert.deepEqual(monitoredSnapshots, [rawGroup]);
  const pointerDownSource = audience.getLastValidSnapshot().source;
  audience.publishDatePosition(
    { x_permille: 515, y_permille: 260 },
    pointerDownSource,
  );

  assert.equal(monitoredSnapshots.length, 2);
  assert.deepEqual(monitoredSnapshots.at(-1).source, {
    kind: "Chrono Group",
    scene_id: null,
    chrono_group_id: "group-a",
  });
  assert.deepEqual(monitoredSnapshots.at(-1).audience.date_position, {
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  });
  assert.deepEqual(movementUpdates, [{
    source: { kind: "Chrono Group", scene_id: null, chrono_group_id: "group-a" },
    datePosition: { x_permille: 515, y_permille: 260, width_permille: 280 },
  }]);
  assert.deepEqual(states.at(-1).audience.date_position, {
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  });
  assert.deepEqual(controller.getLastValidSnapshot().source, {
    kind: "Chrono Group",
    scene_id: null,
    chrono_group_id: "group-a",
  });
  assert.equal(controller.getLastValidSnapshot().audience.date_position.x_permille, 515);
  audience.dispose();
  controller.dispose();
});

test("controller retains each Audience date override only for its matching presentation source", () => {
  const { audience, controller, states } = setup();
  controller.start();
  audience.start();
  const sceneA = presentationState();
  controller.publish(sceneA);
  audience.publishDatePosition(
    { x_permille: 515, y_permille: 260 },
    audience.getLastValidSnapshot().source,
  );

  const sameSourceNextFrame = {
    ...sceneA,
    timeline: { ...sceneA.timeline, frame_index: 1 },
  };
  const sameSourceOutcome = controller.publish(sameSourceNextFrame);
  assert.equal(sameSourceOutcome.accepted, true);
  assert.deepEqual(sameSourceOutcome.lastValidSnapshot.audience.date_position, {
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  });
  assert.deepEqual(states.at(-1).audience.date_position, {
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  });

  const sceneB = {
    ...presentationState(),
    source: { kind: "scene", scene_id: "scene-b", chrono_group_id: "group-a" },
  };
  const otherSourceOutcome = controller.publish(sceneB);
  assert.equal(otherSourceOutcome.accepted, true);
  assert.deepEqual(otherSourceOutcome.lastValidSnapshot.audience.date_position, {
    x_permille: 680,
    y_permille: 40,
    width_permille: 280,
  });

  const returnToSceneA = controller.publish(sceneA);
  assert.equal(returnToSceneA.accepted, true);
  assert.deepEqual(returnToSceneA.lastValidSnapshot.audience.date_position, {
    x_permille: 515,
    y_permille: 260,
    width_permille: 280,
  });
  audience.dispose();
  controller.dispose();
});

test("controller consumes and rejects stale-source Audience date movement without replaying it", () => {
  const updates = [];
  const { audience, controller, states, controllerRejections } = setup({
    onAudienceDatePositionChange: (update) => updates.push(update),
  });
  controller.start();
  audience.start();
  controller.publish(presentationState());
  const sceneB = {
    ...presentationState(),
    source: { kind: "scene", scene_id: "scene-b", chrono_group_id: "group-a" },
  };
  controller.publish(sceneB);
  const sender = createChannel("simex-presentation-session-001");
  const stale = {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 2,
    type: "audience-date-position",
    payload: {
      source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
      date_position: { x_permille: 515, y_permille: 260 },
    },
  };

  sender.postMessage(stale);
  sender.postMessage(stale);

  assert.deepEqual(updates, []);
  assert.deepEqual(
    controllerRejections.map(({ reason }) => reason.code),
    ["stale_audience_source", "duplicate_or_out_of_order"],
  );
  assert.equal(states.length, 2);
  assert.deepEqual(controller.getLastValidSnapshot(), sceneB);
  sender.close();
  audience.dispose();
  controller.dispose();
});

test("themed publication keeps the v3 state legacy-safe and enriches only new Audience peers", () => {
  const { audience, controller, states, themes } = setup();
  const mainMessages = [];
  const themeMessages = [];
  const mainObserver = createChannel("simex-presentation-session-001");
  const themeObserver = createChannel("simex-presentation-theme-v1-session-001");
  mainObserver.onmessage = ({ data }) => mainMessages.push(data);
  themeObserver.onmessage = ({ data }) => themeMessages.push(data);
  controller.start();
  audience.start();

  const themedState = presentationState();
  controller.publish(themedState);

  const wireState = mainMessages.find(({ type }) => type === "state");
  assert.ok(wireState);
  assert.equal(Object.hasOwn(wireState.payload, "theme"), false);
  assert.deepEqual(themeMessages.at(-1), {
    protocol_version: 1,
    session_id: "session-001",
    sequence: 1,
    type: "theme",
    payload: themedState.theme,
  });
  assert.deepEqual(themes, [themedState.theme]);
  assert.deepEqual(states, [themedState]);

  mainObserver.close();
  themeObserver.close();
  audience.dispose();
  controller.dispose();
});

test("Audience applies an isolated Theme whether state or Theme arrives first", () => {
  for (const order of ["state-first", "theme-first"]) {
    const { audience, states, themes } = setup();
    audience.start();
    const mainSender = createChannel("simex-presentation-session-001");
    const themeSender = createChannel("simex-presentation-theme-v1-session-001");
    const themedState = presentationState();
    const legacyState = structuredClone(themedState);
    delete legacyState.theme;
    const stateMessage = {
      protocol_version: 3,
      session_id: "session-001",
      sequence: 1,
      type: "state",
      payload: legacyState,
    };
    const themeMessage = {
      protocol_version: 1,
      session_id: "session-001",
      sequence: 1,
      type: "theme",
      payload: themedState.theme,
    };

    if (order === "state-first") {
      mainSender.postMessage(stateMessage);
      themeSender.postMessage(themeMessage);
      assert.deepEqual(states, [legacyState, themedState]);
    } else {
      themeSender.postMessage(themeMessage);
      mainSender.postMessage(stateMessage);
      assert.deepEqual(states, [themedState]);
    }
    assert.deepEqual(themes, [themedState.theme]);

    mainSender.close();
    themeSender.close();
    audience.dispose();
  }
});

test("controller validates before publication and never reconciles an invalid selection", () => {
  const { audience, controller, states } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  const accepted = controller.publish(first);
  const rejected = controller.publish(presentationState({ kind: "chart", chart_id: "unknown-chart" }));

  assert.equal(accepted.accepted, true);
  assert.deepEqual(accepted.lastValidSnapshot, first);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason.code, "untrusted_presentation_item");
  assert.deepEqual(rejected.lastValidSnapshot, first);
  assert.deepEqual(states, [first]);
  audience.dispose();
  controller.dispose();
});

test("Audience exposes only clone-safe channel-accepted state and ended envelopes to projection owners", () => {
  const { audience, controller, acceptedMessages, rejections } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);

  assert.equal(acceptedMessages.length, 1);
  assert.deepEqual(acceptedMessages[0], {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 1,
    type: "state",
    payload: first,
  });
  acceptedMessages[0].payload.payload.items[0].chart_id = "chart-b";

  audienceTransport().transformNext = (message) => ({ ...message, payload: null });
  controller.publish({ ...first, blackout: true });
  assert.equal(rejections.at(-1).reason.code, "invalid_object");
  assert.equal(acceptedMessages.length, 2, "fresh resync state is the only accepted recovery callback");
  assert.equal(acceptedMessages.at(-1).payload.blackout, true);

  controller.end();
  assert.equal(acceptedMessages.at(-1).type, "ended");
  assert.equal(acceptedMessages.at(-1).payload, null);
  audience.dispose();
});

test("invalid and Needs-attention source selections retain last-valid output", () => {
  const { audience, controller, states } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);

  for (const sourceStatus of ["invalid", "needs-attention"]) {
    const outcome = controller.publish({
      ...first,
      source: { kind: "scene", scene_id: "scene-b", chrono_group_id: "group-a" },
    }, { sourceStatus });
    assert.equal(outcome.accepted, false);
    assert.equal(outcome.reason.code, "source_not_presentable");
    assert.deepEqual(outcome.lastValidSnapshot, first);
  }
  const namedReason = controller.publish({
    ...first,
    source: { kind: "scene", scene_id: "scene-b", chrono_group_id: "group-a" },
  }, {
    sourceSelection: {
      status: "needs-attention",
      reason: {
        code: "scene_needs_attention",
        message: "Scene needs attention before it can replace the Audience output.",
        sourceId: "scene-b",
      },
    },
  });
  assert.deepEqual(namedReason.reason, {
    code: "scene_needs_attention",
    message: "Scene needs attention before it can replace the Audience output.",
    sourceId: "scene-b",
  });
  assert.deepEqual(namedReason.lastValidSnapshot, first);
  assert.deepEqual(states, [first]);
  audience.dispose();
  controller.dispose();
});

test("last-valid snapshots are clone-isolated across caller and callback mutation", () => {
  const { audience, controller, states } = setup();
  controller.start();
  audience.start();
  const input = presentationState();
  const outcome = controller.publish(input);
  input.payload.items[0].chart_id = "chart-b";
  outcome.lastValidSnapshot.payload.items[0].chart_id = "chart-b";
  states[0].payload.items[0].chart_id = "chart-b";

  const rejected = controller.publish(presentationState({ kind: "chart", chart_id: "missing" }));
  assert.equal(rejected.lastValidSnapshot.payload.items[0].chart_id, "chart-a");
  assert.equal(audience.getLastValidSnapshot().payload.items[0].chart_id, "chart-a");
  audience.dispose();
  controller.dispose();
});

test("authored sources require explicit valid eligibility and a non-null timeline by default", () => {
  FakeBroadcastChannel.reset();
  const controller = createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler: new FakeScheduler(),
    getPresentableItemIndex: () => presentableItemIndex,
  });
  const candidate = presentationState();
  assert.equal(controller.publish(candidate).reason.code, "source_eligibility_required");
  assert.equal(
    controller.publish({ ...candidate, timeline: null }, { sourceStatus: "valid" }).reason.code,
    "source_timeline_required",
  );
  assert.equal(controller.publish(candidate, { sourceStatus: "valid" }).accepted, true);

  const manual = {
    ...candidate,
    source: { kind: "manual", scene_id: null, chrono_group_id: null },
    timeline: null,
  };
  assert.equal(controller.publish(manual).accepted, true);
});

test("a same-session Audience reload restarts ready at sequence 1 and receives latest state", () => {
  const { audience, controller, scheduler } = setup();
  controller.start();
  audience.start();
  const latest = presentationState();
  controller.publish(latest);
  audience.dispose();

  const replayed = [];
  const reloaded = createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => presentableItemIndex,
    onStateChange: (next) => replayed.push(next),
  });
  reloaded.start();

  assert.deepEqual(replayed, [latest]);
  reloaded.dispose();
  controller.dispose();
});

test("ordinary duplicate and out-of-order heartbeats remain rejected after a fresh ready baseline", () => {
  const controllerRejections = [];
  FakeBroadcastChannel.reset();
  const scheduler = new FakeScheduler();
  const controller = createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => presentableItemIndex,
    validateSourceSelection: () => ({ accepted: true }),
    onMessageRejected: (reason) => controllerRejections.push(reason),
  });
  controller.start();
  const sender = createChannel("simex-presentation-session-001");
  sender.postMessage({ protocol_version: 3, session_id: "session-001", sequence: 1, type: "ready", payload: null });
  sender.postMessage({ protocol_version: 3, session_id: "session-001", sequence: 1, type: "heartbeat", payload: null });
  sender.postMessage({ protocol_version: 3, session_id: "session-001", sequence: 0, type: "heartbeat", payload: null });
  assert.ok(controllerRejections.some(({ code }) => code === "duplicate_or_out_of_order"));
  assert.ok(controllerRejections.some(({ code }) => code === "invalid_sequence"));
  sender.close();
  controller.dispose();
});

test("a gapped ended message is rejected and cannot replace last-valid before a fresh snapshot", () => {
  const { audience, controller, scheduler, states, ended, rejections, statuses } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);
  audienceTransport().dropNext = 1;
  const fresh = { ...first, output_mode: "blank" };
  controller.publish(fresh);
  controller.end();

  assert.equal(rejections.at(-1).reason.code, "sequence_gap");
  assert.deepEqual(rejections.at(-1).lastValidSnapshot, first);
  assert.deepEqual(states, [first, fresh]);
  assert.equal(ended.length, 0);
  assert.ok(statuses.includes("audience:resync-required"));
  assert.ok(statuses.includes("audience:connected"));
  assert.equal(statuses.includes("audience:ended"), false);
  assert.deepEqual(audience.getLastValidSnapshot(), fresh);
  audience.dispose();
  assert.equal(scheduler.activeTimerCount, 0);
});

test("a delayed contiguous ended cannot bypass a higher resync floor", () => {
  const { audience, states, ended, rejections, statuses } = setup();
  audience.start();
  const sender = createChannel("simex-presentation-session-001");
  const first = presentationState();
  const unseenHigher = { ...first, output_mode: "blank" };
  sender.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 1,
    type: "state",
    payload: first,
  });
  sender.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 3,
    type: "state",
    payload: unseenHigher,
  });
  sender.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 2,
    type: "ended",
    payload: null,
  });

  assert.deepEqual(states, [first]);
  assert.equal(ended.length, 0);
  assert.equal(rejections[0].reason.code, "sequence_gap");
  assert.equal(rejections.at(-1).reason.code, "duplicate_or_out_of_order");
  assert.deepEqual(rejections.at(-1).lastValidSnapshot, first);
  assert.ok(statuses.includes("audience:resync-required"));
  assert.equal(statuses.includes("audience:ended"), false);
  assert.equal(audience.isResyncRequired(), true);
  assert.deepEqual(audience.getLastValidSnapshot(), first);
  sender.close();
  audience.dispose();
});

test("a newly opened Audience accepts contiguous ended before any state baseline", () => {
  const { audience, scheduler, states, ended, rejections, statuses } = setup();
  audience.start();
  const sender = createChannel("simex-presentation-session-001");
  sender.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 1,
    type: "ended",
    payload: null,
  });

  assert.deepEqual(states, []);
  assert.deepEqual(rejections, []);
  assert.equal(ended.length, 1);
  assert.equal(ended[0].type, "ended");
  assert.ok(statuses.includes("audience:ended"));
  assert.equal(audience.isResyncRequired(), false);
  assert.equal(audience.getLastValidSnapshot(), null);
  assert.equal(scheduler.activeTimerCount, 0);
  sender.close();
});

test("ordered ended emits a clone-safe terminal signal without clearing last-valid state", () => {
  const { audience, controller, scheduler, states, ended, statuses } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);
  controller.end();

  assert.equal(ended.length, 1);
  assert.deepEqual(ended[0], {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 2,
    type: "ended",
    payload: null,
  });
  assert.ok(statuses.includes("audience:ended"));
  assert.deepEqual(states, [first]);
  assert.deepEqual(audience.getLastValidSnapshot(), first);
  ended[0].type = "state";
  assert.deepEqual(audience.getLastValidSnapshot(), first);
  assert.equal(scheduler.activeTimerCount, 0);
});

test("reload replays exact trusted Image identity and rejects a stale revision", () => {
  let currentIndex = presentableItemIndex;
  const { audience, controller, scheduler } = setup({
    getPresentableItemIndex: () => currentIndex,
  });
  controller.start();
  audience.start();
  const imageState = presentationState({
    kind: "image",
    panel_id: "image-a",
    media_id: "media-image-a",
    revision: 7,
  });
  controller.publish(imageState);
  audience.dispose();

  const exact = [];
  const firstReload = createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => currentIndex,
    onStateChange: (next) => exact.push(next),
  });
  firstReload.start();
  assert.deepEqual(exact[0].payload.items[0], imageState.payload.items[0]);
  firstReload.dispose();

  currentIndex = new Map(currentIndex);
  currentIndex.set("image-a", {
    ...currentIndex.get("image-a"),
    descriptor: { ...currentIndex.get("image-a").descriptor, revision: 8 },
  });
  const stale = [];
  const secondReload = createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => currentIndex,
    onStateChange: (next) => stale.push(next),
  });
  secondReload.start();
  assert.deepEqual(stale, []);
  secondReload.dispose();
  controller.dispose();
});

test("Audience rejects a gap, emits ready again, and accepts the response as a fresh baseline", () => {
  const { audience, controller, states, rejections, statuses } = setup();
  const observed = [];
  const observer = createChannel("simex-presentation-session-001");
  observer.onmessage = ({ data }) => observed.push(data);
  controller.start();
  audience.start();
  controller.publish(presentationState());

  audienceTransport().dropNext = 1;
  controller.publish({ ...presentationState(), output_mode: "blank" });
  controller.publish({ ...presentationState(), output_mode: "holding" });

  assert.equal(rejections.at(-1).reason.code, "sequence_gap");
  assert.ok(statuses.includes("audience:resync-required"));
  assert.equal(observed.filter(({ type }) => type === "ready").length, 2);
  assert.equal(states.at(-1).output_mode, "holding");
  assert.equal(audience.isResyncRequired(), false);
  observer.close();
  audience.dispose();
  controller.dispose();
});

test("Audience rejects an incomplete expected message and recovers through ready/state", () => {
  const { audience, controller, states, rejections } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);

  audienceTransport().transformNext = (message) => ({ ...message, payload: null });
  controller.publish({ ...first, blackout: true });

  assert.equal(rejections[0].reason.code, "invalid_object");
  assert.deepEqual(rejections[0].lastValidSnapshot, first);
  assert.equal(states.length, 2);
  assert.deepEqual(states.at(-1), { ...first, blackout: true });
  audience.dispose();
  controller.dispose();
});

test("duplicates, out-of-order messages, and other sessions never replace Audience state", () => {
  const { audience, controller, states, rejections } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);

  const sender = createChannel("simex-presentation-session-001");
  const payload = presentationState({ kind: "chart", chart_id: "chart-b" });
  for (const sequence of [1, 1]) sender.postMessage({
    protocol_version: 3, session_id: "session-001", sequence, type: "state", payload,
  });
  sender.postMessage({
    protocol_version: 3, session_id: "other-session", sequence: 2, type: "state", payload,
  });

  assert.deepEqual(states, [first]);
  assert.ok(rejections.some(({ reason }) => reason.code === "duplicate_or_out_of_order"));
  assert.ok(rejections.some(({ reason }) => reason.code === "session_mismatch"));
  sender.close();
  audience.dispose();
  controller.dispose();
});

test("heartbeat, disconnect, ended, and cleanup retain the v3 lifecycle", () => {
  const { audience, controller, scheduler, states, statuses } = setup();
  const observed = [];
  const observer = createChannel("simex-presentation-session-001");
  observer.onmessage = ({ data }) => observed.push(data);
  controller.start();
  audience.start();
  controller.publish(presentationState());
  scheduler.advance(3_000);
  assert.equal(
    observed.filter(({ type }) => type === "heartbeat").length,
    4,
    "controller and Audience both provide liveness heartbeats",
  );

  audience.dispose();
  scheduler.advance(5_000);
  assert.ok(statuses.includes("disconnected"));
  controller.end();
  assert.equal(scheduler.activeTimerCount, 0);
  assert.deepEqual(states, [presentationState()]);
  observer.close();
});

test("a post-timeout controller heartbeat cannot reconnect without a ready-triggered baseline", () => {
  FakeBroadcastChannel.reset();
  const scheduler = new FakeScheduler();
  const statuses = [];
  const sent = [];
  const controller = createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => presentableItemIndex,
    validateSourceSelection: () => ({ accepted: true }),
    onConnectionChange: (status) => statuses.push(status),
  });
  const observer = createChannel("simex-presentation-session-001");
  observer.onmessage = ({ data }) => sent.push(data);
  const audience = createChannel("simex-presentation-session-001");
  controller.start();
  controller.publish(presentationState());

  audience.postMessage({
    protocol_version: 3, session_id: "session-001", sequence: 1, type: "ready", payload: null,
  });
  assert.equal(statuses.at(-1), "connected");

  scheduler.advance(5_000);
  audience.postMessage({
    protocol_version: 3, session_id: "session-001", sequence: 2, type: "heartbeat", payload: null,
  });
  assert.deepEqual(statuses.slice(-2), ["disconnected", "reconnecting"]);
  assert.equal(sent.filter(({ type }) => type === "state").length, 2);

  audience.postMessage({
    protocol_version: 3, session_id: "session-001", sequence: 3, type: "ready", payload: null,
  });
  assert.equal(statuses.at(-1), "connected");
  assert.equal(sent.filter(({ type }) => type === "state").length, 3);
  const legacyWireState = presentationState();
  delete legacyWireState.theme;
  assert.deepEqual(sent.at(-1).payload, legacyWireState);

  audience.close();
  observer.close();
  controller.dispose();
});

test("a ready arriving first after controller timeout traverses reconnecting before its fresh baseline", () => {
  FakeBroadcastChannel.reset();
  const scheduler = new FakeScheduler();
  const statuses = [];
  const controller = createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => presentableItemIndex,
    validateSourceSelection: () => ({ accepted: true }),
    onConnectionChange: (status) => statuses.push(status),
  });
  const audience = createChannel("simex-presentation-session-001");
  controller.start();
  controller.publish(presentationState());
  audience.postMessage({
    protocol_version: 3, session_id: "session-001", sequence: 1, type: "ready", payload: null,
  });

  scheduler.advance(5_000);
  audience.postMessage({
    protocol_version: 3, session_id: "session-001", sequence: 2, type: "ready", payload: null,
  });

  assert.deepEqual(statuses.slice(-3), ["disconnected", "reconnecting", "connected"]);
  audience.close();
  controller.dispose();
});

test("Audience detects controller silence and exposes reconnecting until a fresh valid snapshot arrives", () => {
  const { audience, controller, scheduler, states, statuses } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);

  controller.dispose();
  scheduler.advance(5_000);
  assert.equal(statuses.at(-1), "audience:disconnected");
  assert.deepEqual(audience.getLastValidSnapshot(), first);

  const restoredController = createChannel("simex-presentation-session-001");
  restoredController.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 2,
    type: "heartbeat",
    payload: null,
  });
  assert.equal(statuses.at(-1), "audience:reconnecting");
  assert.deepEqual(audience.getLastValidSnapshot(), first);

  const restored = { ...first, output_mode: "holding" };
  restoredController.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 3,
    type: "state",
    payload: restored,
  });
  assert.equal(statuses.at(-1), "audience:connected");
  assert.deepEqual(states, [first, restored]);
  restoredController.close();
  audience.dispose();
  assert.equal(scheduler.activeTimerCount, 0);
});

test("controller sends liveness heartbeats to Audience without changing the accepted output", () => {
  const { audience, controller, scheduler, states, statuses } = setup();
  const observed = [];
  const observer = createChannel("simex-presentation-session-001");
  observer.onmessage = ({ data }) => observed.push(data);
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);

  scheduler.advance(3_000);

  assert.equal(
    observed.filter(({ type }) => type === "heartbeat").length,
    4,
    "controller and Audience each emit two liveness heartbeats",
  );
  assert.deepEqual(states, [first]);
  assert.equal(statuses.at(-1), "audience:connected");
  observer.close();
  audience.dispose();
  controller.dispose();
});

test("a valid state arriving first after controller silence still traverses reconnecting", () => {
  const { audience, controller, scheduler, states, statuses } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);
  controller.dispose();
  scheduler.advance(5_000);

  const restoredController = createChannel("simex-presentation-session-001");
  const restored = { ...first, output_mode: "blank" };
  restoredController.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 2,
    type: "state",
    payload: restored,
  });

  assert.deepEqual(statuses.slice(-3), [
    "audience:disconnected",
    "audience:reconnecting",
    "audience:connected",
  ]);
  assert.deepEqual(states, [first, restored]);
  restoredController.close();
  audience.dispose();
});

test("a malformed state arriving first after controller silence remains reconnecting with last-valid", () => {
  const { audience, controller, scheduler, rejections, statuses } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);
  controller.dispose();
  scheduler.advance(5_000);

  const restoredController = createChannel("simex-presentation-session-001");
  restoredController.postMessage({
    protocol_version: 3,
    session_id: "session-001",
    sequence: 2,
    type: "state",
    payload: null,
  });

  assert.equal(statuses.at(-1), "audience:reconnecting");
  assert.equal(rejections.at(-1).reason.code, "invalid_object");
  assert.deepEqual(rejections.at(-1).lastValidSnapshot, first);
  assert.deepEqual(audience.getLastValidSnapshot(), first);
  restoredController.close();
  audience.dispose();
});
