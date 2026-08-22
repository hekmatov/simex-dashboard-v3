import test from "node:test";
import assert from "node:assert/strict";

const channelModule = await import("../src/lib/presentationChannel.js").catch(
  () => null,
);

const firstScene = {
  active_page_id: "biomedical",
  displayed_chart_ids: ["chart-a"],
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
  displayed_chart_ids: ["chart-a", "chart-b"],
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

function setup() {
  assert.ok(channelModule, "presentation channel must be implemented");
  const scheduler = new FakeScheduler();
  const states = [];
  const statuses = [];
  const controller = channelModule.createPresentationControllerChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
    onConnectionChange: (status) => statuses.push(status),
  });
  const audience = channelModule.createPresentationAudienceChannel({
    sessionId: "session-001",
    createChannel,
    scheduler,
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
    onStateChange: (state) => reloadedStates.push(state),
  });
  controller.publish(secondScene);
  reloaded.start();

  assert.deepEqual(states, [firstScene]);
  assert.deepEqual(reloadedStates, [secondScene]);

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
