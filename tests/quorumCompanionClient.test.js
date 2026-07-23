import test from "node:test";
import assert from "node:assert/strict";

const clientModule = await import("../src/lib/quorumCompanionClient.js").catch(
  () => null,
);

const DIGEST = "a".repeat(64);
const catalogue = {
  catalogue_id: "simex-dashboard",
  digest: DIGEST,
  charts: [{ chart_id: "chart-a" }, { chart_id: "chart-b" }],
};

test("missing bootstrap keeps the dashboard standalone", async () => {
  assert.ok(clientModule, "companion client must be implemented");
  const harness = createHarness({
    fetchResponse: response(404),
  });

  await harness.client.start();

  assert.deepEqual(harness.statuses, ["discovering", "standalone"]);
  assert.equal(harness.sockets.length, 0);
});

test("protocol and catalogue mismatches fail closed before opening a socket", async () => {
  assert.ok(clientModule, "companion client must be implemented");
  for (const bootstrap of [
    validBootstrap({ protocol_version: "2" }),
    validBootstrap({ catalogue_digest: "b".repeat(64) }),
  ]) {
    const harness = createHarness({
      fetchResponse: response(200, bootstrap),
    });

    await harness.client.start();

    assert.equal(harness.statuses.at(-1), "incompatible");
    assert.equal(harness.sockets.length, 0);
  }
});

test("credential is sent only in dashboard hello and never in discovery or socket URLs", async () => {
  assert.ok(clientModule, "companion client must be implemented");
  const harness = createHarness();

  await harness.client.start();
  const socket = harness.sockets[0];
  socket.open();

  assert.deepEqual(harness.fetchCalls, [
    ["/companion/bootstrap", { cache: "no-store" }],
  ]);
  assert.equal(socket.url, "ws://dashboard.test/companion/ws");
  assert.ok(!socket.url.includes("secret-credential"));
  const hello = socket.sentMessages()[0];
  assert.equal(hello.type, "dashboard_hello");
  assert.equal(hello.payload.credential, "secret-credential");
  assert.equal(JSON.stringify(socket.sentMessages().slice(1)).includes("secret-credential"), false);
});

test("incoming sequences are monotonic and duplicate message IDs are idempotent", async () => {
  assert.ok(clientModule, "companion client must be implemented");
  const harness = createHarness();
  await ready(harness);
  const socket = harness.sockets[0];
  const request = serverMessage(2, "display_set_requested", {
    chart_ids: ["chart-a"],
    expected_display_revision: 0,
    reason_code: "operator_selected_recommendation",
  });

  socket.receive(request);
  socket.receive(request);
  socket.receive(
    serverMessage(4, "display_set_requested", {
      chart_ids: ["chart-b"],
      expected_display_revision: 1,
      reason_code: "operator_selected_recommendation",
    }),
  );

  assert.equal(harness.actions.length, 1);
  assert.deepEqual(harness.actions[0], {
    type: "companion_set",
    chart_ids: ["chart-a"],
    expected_display_revision: 0,
  });
  assert.equal(
    socket.sentMessages().at(-1).payload.reason_code,
    "invalid_sequence",
  );
});

test("valid display requests dispatch companion state while stale and invalid requests reject", async () => {
  assert.ok(clientModule, "companion client must be implemented");
  const harness = createHarness();
  await ready(harness);
  const socket = harness.sockets[0];

  socket.receive(
    serverMessage(2, "display_set_requested", {
      chart_ids: ["chart-a", "chart-b"],
      expected_display_revision: 0,
      reason_code: "operator_selected_recommendation",
    }),
  );
  socket.receive(
    serverMessage(3, "display_set_requested", {
      chart_ids: ["chart-a"],
      expected_display_revision: 0,
      reason_code: "operator_selected_recommendation",
    }),
  );
  socket.receive(
    serverMessage(4, "display_set_requested", {
      chart_ids: ["unknown-chart"],
      expected_display_revision: 1,
      reason_code: "operator_selected_recommendation",
    }),
  );

  assert.deepEqual(
    socket.sentMessages().slice(-3).map((message) => [
      message.type,
      message.payload.change_reason ?? message.payload.reason_code,
    ]),
    [
      ["display_state_changed", "operator_selected_recommendation"],
      ["display_rejected", "stale_revision"],
      ["display_rejected", "invalid_chart"],
    ],
  );
});

test("reconnect authenticates again then snapshots current browser state", async () => {
  assert.ok(clientModule, "companion client must be implemented");
  const scheduled = [];
  const harness = createHarness({
    setTimeoutImpl(callback) {
      scheduled.push(callback);
      return scheduled.length;
    },
  });
  await ready(harness);
  harness.displayState = {
    display_revision: 3,
    displayed_chart_ids: ["chart-b"],
    layout: "solo",
  };

  harness.sockets[0].closeFromServer();
  assert.equal(harness.statuses.at(-1), "disconnected");
  scheduled.shift()();
  const reconnect = harness.sockets[1];
  reconnect.open();
  reconnect.receive(readyMessage(1, 3));

  assert.deepEqual(
    reconnect.sentMessages().map((message) => message.type),
    ["dashboard_hello", "dashboard_snapshot"],
  );
  assert.deepEqual(reconnect.sentMessages()[1].payload.displayed_chart_ids, [
    "chart-b",
  ]);
});

test("outgoing messages contain protocol metadata only", async () => {
  assert.ok(clientModule, "companion client must be implemented");
  const harness = createHarness();
  await ready(harness);
  harness.client.displayStateChanged("manual_close");

  const json = JSON.stringify(harness.sockets[0].sentMessages());
  for (const forbidden of [
    "transcript",
    "speaker",
    "utterance",
    "summary",
    "topic",
    "evidence_text",
    "discussion",
  ]) {
    assert.equal(json.includes(forbidden), false, forbidden);
  }
});

function createHarness({
  fetchResponse = response(200, validBootstrap()),
  setTimeoutImpl = () => 1,
} = {}) {
  const statuses = [];
  const sockets = [];
  const fetchCalls = [];
  const actions = [];
  const storage = new Map();
  const harness = {
    statuses,
    sockets,
    fetchCalls,
    actions,
    displayState: {
      display_revision: 0,
      displayed_chart_ids: [],
      layout: "solo",
    },
  };

  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.sent = [];
      sockets.push(this);
    }

    send(value) {
      this.sent.push(value);
    }

    close() {
      this.readyState = 3;
    }

    open() {
      this.readyState = 1;
      this.onopen?.();
    }

    receive(message) {
      this.onmessage?.({ data: JSON.stringify(message) });
    }

    closeFromServer() {
      this.readyState = 3;
      this.onclose?.();
    }

    sentMessages() {
      return this.sent.map((value) => JSON.parse(value));
    }
  }
  FakeWebSocket.OPEN = 1;

  harness.client = clientModule?.createQuorumCompanionClient({
    catalogue,
    getDisplayState: () => harness.displayState,
    dispatchDisplayAction(action) {
      actions.push(action);
      if (
        action.chart_ids.some(
          (chartId) => !catalogue.charts.some((chart) => chart.chart_id === chartId),
        )
      ) {
        throw Object.assign(new Error("invalid_chart"), { code: "invalid_chart" });
      }
      if (
        action.expected_display_revision !==
        harness.displayState.display_revision
      ) {
        throw Object.assign(new Error("stale_revision"), {
          code: "stale_revision",
        });
      }
      harness.displayState = {
        display_revision: harness.displayState.display_revision + 1,
        displayed_chart_ids: [...action.chart_ids],
        layout: action.chart_ids.length === 2 ? "sideBySide" : "solo",
      };
      return harness.displayState;
    },
    fetchImpl: async (...args) => {
      fetchCalls.push(args);
      return fetchResponse;
    },
    WebSocketImpl: FakeWebSocket,
    instanceStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    location: {
      protocol: "http:",
      host: "dashboard.test",
    },
    randomId: (() => {
      let value = 0;
      return () => `generated-${++value}`;
    })(),
    setTimeoutImpl,
    clearTimeoutImpl: () => {},
    onStatus: (status) => statuses.push(status),
  });
  return harness;
}

async function ready(harness) {
  await harness.client.start();
  const socket = harness.sockets[0];
  socket.open();
  socket.receive(readyMessage(1, harness.displayState.display_revision));
  assert.equal(harness.statuses.at(-1), "ready");
}

function validBootstrap(overrides = {}) {
  return {
    protocol_version: "1",
    session_id: "session-001",
    catalogue_id: "simex-dashboard",
    catalogue_digest: DIGEST,
    credential: "secret-credential",
    gateway_path: "/companion/ws",
    ...overrides,
  };
}

function readyMessage(sequence, revision) {
  return serverMessage(sequence, "companion_ready", {
    accepted_dashboard_instance_id: "generated-1",
    accepted_display_revision: revision,
    catalogue_id: "simex-dashboard",
    catalogue_digest: DIGEST,
  });
}

function serverMessage(sequence, type, payload) {
  return {
    protocol_version: "1",
    message_id: `server-${sequence}`,
    session_id: "session-001",
    sequence,
    idempotency_key: `${type}-${sequence}`,
    type,
    acknowledgement_status:
      type === "companion_ready" ? "accepted" : "required",
    payload,
  };
}

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      return body;
    },
  };
}
