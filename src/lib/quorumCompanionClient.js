import {
  DASHBOARD_CAPABILITIES,
  QUORUM_PROTOCOL_VERSION,
  makeDashboardMessage,
  parseBootstrap,
  parseCompanionMessage,
} from "./quorumCompanionProtocol.js";

const INSTANCE_STORAGE_KEY = "simex-dashboard-quorum-instance-id";
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 10_000;
const REJECTION_CODES = new Set([
  "catalogue_mismatch",
  "capacity_exceeded",
  "credential_mismatch",
  "invalid_chart",
  "invalid_sequence",
  "malformed_message",
  "protocol_mismatch",
  "session_mismatch",
  "stale_revision",
]);

export function createQuorumCompanionClient({
  catalogue,
  getDisplayState,
  dispatchDisplayAction,
  fetchImpl = globalThis.fetch,
  WebSocketImpl = globalThis.WebSocket,
  instanceStorage = globalThis.sessionStorage,
  location = globalThis.location,
  randomId = defaultRandomId,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  onStatus = () => {},
}) {
  assertDependencies({
    catalogue,
    getDisplayState,
    dispatchDisplayAction,
    fetchImpl,
    WebSocketImpl,
    location,
  });

  const dashboardInstanceId = loadInstanceId(instanceStorage, randomId);
  let bootstrap = null;
  let socket = null;
  let stopped = true;
  let ready = false;
  let connectionCount = 0;
  let reconnectAttempt = 0;
  let reconnectTimer = null;
  let outgoingSequence = 0;
  let incomingSequence = 0;
  let connectionMessageIds = new Set();
  const processedCommandIds = new Set();

  return Object.freeze({
    async start() {
      if (!stopped) {
        return;
      }
      stopped = false;
      setStatus("discovering");

      let response;
      try {
        response = await fetchImpl("/companion/bootstrap", {
          cache: "no-store",
        });
      } catch {
        setStatus("standalone");
        return;
      }
      if (response.status === 404) {
        setStatus("standalone");
        return;
      }
      if (!response.ok) {
        setStatus("disconnected");
        return;
      }

      try {
        bootstrap = parseBootstrap(await response.json());
      } catch {
        setStatus("incompatible");
        return;
      }
      if (
        bootstrap.protocol_version !== QUORUM_PROTOCOL_VERSION ||
        bootstrap.catalogue_id !== catalogue.catalogue_id ||
        bootstrap.catalogue_digest !== catalogue.digest
      ) {
        setStatus("incompatible");
        return;
      }
      connect();
    },

    stop() {
      stopped = true;
      ready = false;
      if (reconnectTimer !== null) {
        clearTimeoutImpl(reconnectTimer);
        reconnectTimer = null;
      }
      const activeSocket = socket;
      socket = null;
      activeSocket?.close();
      setStatus("standalone");
    },

    displayStateChanged(changeReason) {
      if (!ready) {
        return false;
      }
      sendDisplayState(changeReason);
      return true;
    },
  });

  function connect() {
    if (stopped || !bootstrap) {
      return;
    }
    ready = false;
    incomingSequence = 0;
    connectionMessageIds = new Set();
    connectionCount += 1;
    setStatus("connecting");

    const scheme = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocketImpl(
      `${scheme}//${location.host}${bootstrap.gateway_path}`,
    );
    const activeSocket = socket;

    activeSocket.onopen = () => {
      if (stopped || socket !== activeSocket) {
        return;
      }
      reconnectAttempt = 0;
      setStatus("authenticating");
      const displayState = getDisplayState();
      send("dashboard_hello", {
        credential: bootstrap.credential,
        dashboard_instance_id: dashboardInstanceId,
        catalogue_id: catalogue.catalogue_id,
        catalogue_digest: catalogue.digest,
        capabilities: DASHBOARD_CAPABILITIES,
        display_revision: displayState.display_revision,
        displayed_chart_ids: [...displayState.displayed_chart_ids],
      });
    };

    activeSocket.onmessage = (event) => {
      if (!stopped && socket === activeSocket) {
        receive(event.data);
      }
    };

    activeSocket.onclose = () => {
      if (stopped || socket !== activeSocket) {
        return;
      }
      ready = false;
      socket = null;
      setStatus("disconnected");
      scheduleReconnect();
    };

    activeSocket.onerror = () => {
      if (!stopped && socket === activeSocket) {
        activeSocket.close();
      }
    };
  }

  function receive(text) {
    let message;
    try {
      message = parseCompanionMessage(text);
    } catch {
      return;
    }

    if (message.session_id !== bootstrap.session_id) {
      reject(message.message_id, "session_mismatch");
      return;
    }
    if (
      connectionMessageIds.has(message.message_id) ||
      processedCommandIds.has(message.message_id)
    ) {
      return;
    }
    if (message.sequence !== incomingSequence + 1) {
      reject(message.message_id, "invalid_sequence");
      return;
    }
    incomingSequence = message.sequence;
    connectionMessageIds.add(message.message_id);

    if (message.type === "companion_ready") {
      acceptReady(message);
      return;
    }
    if (message.type !== "display_set_requested" || !ready) {
      reject(message.message_id, "invalid_sequence");
      return;
    }

    processedCommandIds.add(message.message_id);
    applyDisplayRequest(message);
  }

  function acceptReady(message) {
    const payload = message.payload;
    const displayState = getDisplayState();
    if (payload.accepted_dashboard_instance_id !== dashboardInstanceId) {
      reject(message.message_id, "credential_mismatch");
      return;
    }
    if (
      payload.catalogue_id !== catalogue.catalogue_id ||
      payload.catalogue_digest !== catalogue.digest
    ) {
      setStatus("incompatible");
      stopped = true;
      socket?.close();
      return;
    }
    if (payload.accepted_display_revision !== displayState.display_revision) {
      reject(message.message_id, "stale_revision");
      return;
    }

    ready = true;
    setStatus("ready");
    if (connectionCount > 1) {
      send("dashboard_snapshot", {
        dashboard_instance_id: dashboardInstanceId,
        display_revision: displayState.display_revision,
        displayed_chart_ids: [...displayState.displayed_chart_ids],
      });
    }
  }

  function applyDisplayRequest(message) {
    try {
      const nextState =
        dispatchDisplayAction({
          type: "companion_set",
          chart_ids: [...message.payload.chart_ids],
          expected_display_revision:
            message.payload.expected_display_revision,
        }) ?? getDisplayState();
      send("display_state_changed", {
        display_revision: nextState.display_revision,
        displayed_chart_ids: [...nextState.displayed_chart_ids],
        change_reason: message.payload.reason_code,
      });
    } catch (error) {
      reject(message.message_id, rejectionCode(error));
    }
  }

  function sendDisplayState(changeReason) {
    const displayState = getDisplayState();
    send("display_state_changed", {
      display_revision: displayState.display_revision,
      displayed_chart_ids: [...displayState.displayed_chart_ids],
      change_reason: changeReason,
    });
  }

  function reject(rejectedMessageId, reasonCode) {
    if (!socket || socket.readyState !== WebSocketImpl.OPEN) {
      return;
    }
    const displayState = getDisplayState();
    send(
      "display_rejected",
      {
        rejected_message_id: rejectedMessageId,
        display_revision: displayState.display_revision,
        reason_code: reasonCode,
      },
      "rejected",
    );
  }

  function send(type, payload, acknowledgementStatus = "required") {
    if (!socket || socket.readyState !== WebSocketImpl.OPEN) {
      return;
    }
    outgoingSequence += 1;
    const messageId = randomId();
    const message = makeDashboardMessage({
      messageId,
      sessionId: bootstrap.session_id,
      sequence: outgoingSequence,
      idempotencyKey: `${type}:${dashboardInstanceId}:${outgoingSequence}`,
      type,
      acknowledgementStatus,
      payload,
    });
    socket.send(JSON.stringify(message));
  }

  function scheduleReconnect() {
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
      RECONNECT_MAX_DELAY_MS,
    );
    reconnectAttempt += 1;
    reconnectTimer = setTimeoutImpl(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function setStatus(status) {
    onStatus(status);
  }
}

function loadInstanceId(storage, randomId) {
  const existing = storage?.getItem?.(INSTANCE_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const instanceId = randomId();
  storage?.setItem?.(INSTANCE_STORAGE_KEY, instanceId);
  return instanceId;
}

function rejectionCode(error) {
  return REJECTION_CODES.has(error?.code) ? error.code : "invalid_chart";
}

function defaultRandomId() {
  return globalThis.crypto?.randomUUID?.() ??
    `dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function assertDependencies({
  catalogue,
  getDisplayState,
  dispatchDisplayAction,
  fetchImpl,
  WebSocketImpl,
  location,
}) {
  if (
    !catalogue ||
    typeof catalogue.catalogue_id !== "string" ||
    typeof catalogue.digest !== "string" ||
    !Array.isArray(catalogue.charts)
  ) {
    throw new TypeError("a generated Quorum catalogue is required");
  }
  if (
    typeof getDisplayState !== "function" ||
    typeof dispatchDisplayAction !== "function" ||
    typeof fetchImpl !== "function" ||
    typeof WebSocketImpl !== "function" ||
    !location?.host
  ) {
    throw new TypeError("companion client dependencies are invalid");
  }
}
