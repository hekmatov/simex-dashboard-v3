import {
  makePresentationMessage,
  parsePresentationMessage,
  presentationChannelName,
  validatePresentationState,
} from "./presentationProtocol.js";

const HEARTBEAT_INTERVAL_MS = 1_500;
const DISCONNECT_AFTER_MS = 5_000;

export function createPresentationControllerChannel({
  sessionId,
  channelName = presentationChannelName(sessionId),
  createChannel = (name) => new BroadcastChannel(name),
  scheduler = defaultScheduler(),
  presentableItemIndex,
  getPresentableItemIndex = () => presentableItemIndex,
  onConnectionChange = () => {},
} = {}) {
  let active = false;
  let channel = null;
  let connectionTimer = null;
  let latestState = null;
  let lastHeartbeatAt = null;
  let sequence = 0;
  let status = "disconnected";

  function setStatus(nextStatus) {
    if (status === nextStatus) return;
    status = nextStatus;
    onConnectionChange(status);
  }

  function post(type, payload) {
    channel?.postMessage(
      makePresentationMessage({
        sessionId,
        sequence: ++sequence,
        type,
        payload,
        presentableItemIndex: getPresentableItemIndex(),
      }),
    );
  }

  function sendLatestState() {
    if (!latestState) return;
    try {
      validatePresentationState(latestState, {
        presentableItemIndex: getPresentableItemIndex(),
      });
    } catch {
      return;
    }
    post("state", latestState);
  }

  function handleMessage({ data }) {
    let message;
    try {
      message = parsePresentationMessage(data, {
        sessionId,
        presentableItemIndex: getPresentableItemIndex(),
      });
    } catch {
      return;
    }
    if (message.type !== "ready" && message.type !== "heartbeat") return;

    lastHeartbeatAt = scheduler.now();
    setStatus("connected");
    if (message.type === "ready") sendLatestState();
  }

  function start() {
    if (active) return;
    active = true;
    channel = createChannel(channelName);
    channel.onmessage = handleMessage;
    connectionTimer = scheduler.setInterval(() => {
      if (
        lastHeartbeatAt !== null &&
        scheduler.now() - lastHeartbeatAt >= DISCONNECT_AFTER_MS
      ) {
        setStatus("disconnected");
        lastHeartbeatAt = null;
      }
    }, 500);
  }

  function publish(state) {
    latestState = structuredClone(validatePresentationState(state, {
      presentableItemIndex: getPresentableItemIndex(),
    }));
    if (active) sendLatestState();
  }

  function dispose() {
    if (!active) return;
    active = false;
    if (connectionTimer !== null) scheduler.clearInterval(connectionTimer);
    connectionTimer = null;
    lastHeartbeatAt = null;
    if (channel) {
      channel.onmessage = null;
      channel.close();
    }
    channel = null;
  }

  function end() {
    if (active) post("ended", {});
    setStatus("ended");
    dispose();
  }

  return { start, publish, end, dispose };
}

export function createPresentationAudienceChannel({
  sessionId,
  channelName = presentationChannelName(sessionId),
  createChannel = (name) => new BroadcastChannel(name),
  scheduler = defaultScheduler(),
  presentableItemIndex,
  getPresentableItemIndex = () => presentableItemIndex,
  onStateChange = () => {},
  onConnectionChange = () => {},
} = {}) {
  let active = false;
  let channel = null;
  let heartbeatTimer = null;
  let sequence = 0;
  let status = "waiting";

  function setStatus(nextStatus) {
    if (status === nextStatus) return;
    status = nextStatus;
    onConnectionChange(status);
  }

  function post(type) {
    channel?.postMessage(
      makePresentationMessage({
        sessionId,
        sequence: ++sequence,
        type,
        payload: {},
        presentableItemIndex: getPresentableItemIndex(),
      }),
    );
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) scheduler.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function handleMessage({ data }) {
    let message;
    try {
      message = parsePresentationMessage(data, {
        sessionId,
        presentableItemIndex: getPresentableItemIndex(),
      });
    } catch {
      return;
    }
    if (message.type === "state") {
      onStateChange(message.payload);
      setStatus("connected");
    }
    if (message.type === "ended") {
      onStateChange(null);
      setStatus("waiting");
      dispose();
    }
  }

  function start() {
    if (active) return;
    active = true;
    channel = createChannel(channelName);
    channel.onmessage = handleMessage;
    post("ready");
    heartbeatTimer = scheduler.setInterval(() => post("heartbeat"), HEARTBEAT_INTERVAL_MS);
  }

  function dispose() {
    if (!active) return;
    active = false;
    stopHeartbeat();
    if (channel) {
      channel.onmessage = null;
      channel.close();
    }
    channel = null;
  }

  return { start, dispose };
}

function defaultScheduler() {
  return {
    now: () => Date.now(),
    setInterval: (callback, delay) => globalThis.setInterval(callback, delay),
    clearInterval: (id) => globalThis.clearInterval(id),
  };
}
