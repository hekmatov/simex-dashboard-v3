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
} = {}) {
  FakeBroadcastChannel.reset();
  const scheduler = new FakeScheduler();
  const states = [];
  const rejections = [];
  const statuses = [];
  const controller = createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex,
    validateSourceSelection,
    onConnectionChange: (status) => statuses.push(status),
  });
  const audience = createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex,
    onStateChange: (next) => states.push(next),
    onConnectionChange: (status) => statuses.push(`audience:${status}`),
    onMessageRejected: (reason, lastValidSnapshot) => rejections.push({ reason, lastValidSnapshot }),
  });
  return { audience, controller, scheduler, states, rejections, statuses };
}

function audienceTransport() {
  return [...FakeBroadcastChannel.channels.get("simex-presentation-session-001")].at(-1);
}

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

test("a validated ended message is terminal even when its sequence follows a gap", () => {
  const { audience, controller, scheduler, states, rejections, statuses } = setup();
  controller.start();
  audience.start();
  const first = presentationState();
  controller.publish(first);
  audienceTransport().dropNext = 1;
  controller.publish({ ...first, output_mode: "blank" });
  controller.end();

  assert.deepEqual(states, [first]);
  assert.equal(rejections.some(({ reason }) => reason.code === "sequence_gap"), false);
  assert.ok(statuses.includes("audience:waiting"));
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
  assert.equal(observed.filter(({ type }) => type === "heartbeat").length, 2);

  audience.dispose();
  scheduler.advance(5_000);
  assert.ok(statuses.includes("disconnected"));
  controller.end();
  assert.equal(scheduler.activeTimerCount, 0);
  assert.deepEqual(states, [presentationState()]);
  observer.close();
});
