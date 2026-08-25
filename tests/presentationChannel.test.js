import test from "node:test";
import assert from "node:assert/strict";

const channelModule = await import("../src/lib/presentationChannel.js").catch(
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
      source_id: "image-source-a",
      revision: 7,
    },
  }],
]);

const firstScene = {
  active_page_id: "biomedical",
  items: [{ kind: "chart", chart_id: "chart-a" }],
  layout: "solo",
  time: null,
  audience_facts: {
    dashboard_name: true,
    page: true,
    parent_chrono_group: true,
    scene_name: true,
    scene_date: true,
  },
  blackout: false,
};
const secondScene = {
  ...firstScene,
  items: [
    { kind: "chart", chart_id: "chart-a" },
    { kind: "image", panel_id: "image-a", source_id: "image-source-a", revision: 7 },
  ],
  layout: "sideBySide",
  blackout: true,
};

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

  get activeTimerCount() {
    return this.#timers.size;
  }
}

class FakeBroadcastChannel {
  static #channels = new Map();

  constructor(name) {
    this.name = name;
    this.closed = false;
    this.onmessage = null;
    const peers = FakeBroadcastChannel.#channels.get(name) ?? new Set();
    peers.add(this);
    FakeBroadcastChannel.#channels.set(name, peers);
  }

  postMessage(data) {
    for (const peer of FakeBroadcastChannel.#channels.get(this.name) ?? []) {
      if (peer !== this && !peer.closed) peer.onmessage?.({ data });
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.onmessage = null;
    FakeBroadcastChannel.#channels.get(this.name)?.delete(this);
  }
}

function createChannel(name) {
  return new FakeBroadcastChannel(name);
}

function setup({ getPresentableItemIndex = () => presentableItemIndex } = {}) {
  assert.ok(channelModule, "presentation channel must be implemented");
  const scheduler = new FakeScheduler();
  const states = [];
  const statuses = [];
  const controller = channelModule.createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex,
    onConnectionChange: (status) => statuses.push(status),
  });
  const audience = channelModule.createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex,
    onStateChange: (state) => states.push(state),
  });
  return { audience, controller, scheduler, states, statuses };
}

test("ready receives the latest complete state and visible publishes use increasing sequences", () => {
  const { audience, controller, states } = setup();
  const observed = [];
  const observer = createChannel("simex-presentation-session-001");
  observer.onmessage = ({ data }) => observed.push(data);

  controller.publish(firstScene);
  controller.start();
  audience.start();
  controller.publish(secondScene);

  assert.deepEqual(states, [firstScene, secondScene]);
  const stateMessages = observed.filter(({ type }) => type === "state");
  assert.equal(stateMessages.length, 2);
  assert.equal(stateMessages[0].sequence, 1);
  assert.equal(stateMessages[1].sequence, 2);
  assert.deepEqual(stateMessages[1].payload, secondScene);

  observer.close();
  audience.dispose();
  controller.dispose();
});

test("a reloaded audience receives the controller's latest state", () => {
  const { audience, controller, scheduler, states } = setup();
  controller.start();
  controller.publish(firstScene);
  audience.start();
  audience.dispose();

  const reloadedStates = [];
  const reloaded = channelModule.createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => presentableItemIndex,
    onStateChange: (state) => reloadedStates.push(state),
  });
  controller.publish(secondScene);
  reloaded.start();

  assert.deepEqual(states, [firstScene]);
  assert.deepEqual(reloadedStates, [secondScene]);

  reloaded.dispose();
  controller.dispose();
});

test("reconnect replays the exact trusted Image identity and revision snapshot", () => {
  const { audience, controller, scheduler } = setup();
  controller.start();
  audience.start();
  controller.publish(secondScene);
  audience.dispose();

  const replayed = [];
  const reloaded = channelModule.createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => presentableItemIndex,
    onStateChange: (state) => replayed.push(state),
  });
  reloaded.start();

  assert.deepEqual(replayed, [secondScene]);
  assert.deepEqual(replayed[0].items[1], {
    kind: "image",
    panel_id: "image-a",
    source_id: "image-source-a",
    revision: 7,
  });

  reloaded.dispose();
  controller.dispose();
});

test("reconnect refuses a snapshot after its Image revision becomes stale", () => {
  let currentIndex = presentableItemIndex;
  const { audience, controller, scheduler } = setup({
    getPresentableItemIndex: () => currentIndex,
  });
  controller.start();
  audience.start();
  controller.publish(secondScene);
  audience.dispose();
  currentIndex = new Map(presentableItemIndex);
  currentIndex.set("image-a", {
    ...presentableItemIndex.get("image-a"),
    descriptor: {
      kind: "image",
      panel_id: "image-a",
      source_id: "image-source-a",
      revision: 8,
    },
  });

  const replayed = [];
  const reloaded = channelModule.createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    getPresentableItemIndex: () => currentIndex,
    onStateChange: (state) => replayed.push(state),
  });
  reloaded.start();

  assert.deepEqual(replayed, []);

  reloaded.dispose();
  controller.dispose();
});

test("malformed channel messages are ignored without replacing the audience scene", () => {
  const { audience, controller, states } = setup();
  controller.start();
  audience.start();
  controller.publish(firstScene);

  const malformedSender = createChannel("simex-presentation-session-001");
  malformedSender.postMessage({ type: "state", payload: { rows: ["forbidden"] } });

  assert.deepEqual(states, [firstScene]);

  malformedSender.close();
  audience.dispose();
  controller.dispose();
});

test("audience sends a heartbeat every 1500 milliseconds", () => {
  const { audience, controller, scheduler } = setup();
  const observed = [];
  const observer = createChannel("simex-presentation-session-001");
  observer.onmessage = ({ data }) => observed.push(data);
  controller.start();
  audience.start();
  scheduler.advance(3_000);

  assert.equal(observed.filter(({ type }) => type === "heartbeat").length, 2);

  observer.close();
  audience.dispose();
  controller.dispose();
});

test("controller reports a disconnected audience after 5000 milliseconds without heartbeats", () => {
  const { audience, controller, scheduler, statuses } = setup();
  controller.start();
  audience.start();
  audience.dispose();
  scheduler.advance(5_000);

  assert.deepEqual(statuses, ["connected", "disconnected"]);

  controller.dispose();
});

test("end resets the audience to waiting and cleanup clears local timers and listeners", () => {
  const { audience, controller, scheduler, states } = setup();
  controller.start();
  audience.start();
  controller.publish(firstScene);
  controller.end();
  audience.dispose();
  audience.dispose();
  controller.dispose();

  assert.deepEqual(states, [firstScene, null]);
  assert.equal(scheduler.activeTimerCount, 0);
});
