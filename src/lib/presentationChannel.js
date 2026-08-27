import {
  makePresentationMessage,
  parsePresentationMessage,
  presentationChannelName,
  presentationRejectionReason,
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
  validateSourceSelection,
  onConnectionChange = () => {},
  onMessageRejected = () => {},
} = {}) {
  let active = false;
  let channel = null;
  let connectionTimer = null;
  let lastValidSnapshot = null;
  let lastHeartbeatAt = null;
  let lastAudienceSequence = 0;
  let sequence = 0;
  let status = "disconnected";

  function setStatus(nextStatus) {
    if (status === nextStatus) return;
    status = nextStatus;
    onConnectionChange(status);
  }

  function post(type, payload) {
    const message = makePresentationMessage({
      sessionId,
      sequence: ++sequence,
      type,
      payload,
      presentableItemIndex: getPresentableItemIndex(),
    });
    channel?.postMessage(message);
    return message;
  }

  function sendLatestState() {
    if (!lastValidSnapshot) return null;
    try {
      validatePresentationState(lastValidSnapshot, {
        presentableItemIndex: getPresentableItemIndex(),
      });
      return post("state", lastValidSnapshot);
    } catch (error) {
      onMessageRejected(
        presentationRejectionReason(error),
        snapshot(lastValidSnapshot),
      );
      return null;
    }
  }

  function handleMessage({ data }) {
    let message;
    try {
      message = parsePresentationMessage(data, {
        sessionId,
        presentableItemIndex: getPresentableItemIndex(),
      });
    } catch (error) {
      onMessageRejected(presentationRejectionReason(error), snapshot(lastValidSnapshot));
      return;
    }
    if (message.type !== "ready" && message.type !== "heartbeat") return;
    if (message.type === "ready" && message.sequence === 1) {
      lastAudienceSequence = 1;
      lastHeartbeatAt = scheduler.now();
      setStatus("connected");
      sendLatestState();
      return;
    }
    if (message.sequence <= lastAudienceSequence) {
      onMessageRejected(reason(
        "duplicate_or_out_of_order",
        "Audience message sequence is duplicate or out of order",
      ), snapshot(lastValidSnapshot));
      return;
    }
    lastAudienceSequence = message.sequence;
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
        lastHeartbeatAt !== null
        && scheduler.now() - lastHeartbeatAt >= DISCONNECT_AFTER_MS
      ) {
        setStatus("disconnected");
        lastHeartbeatAt = null;
      }
    }, 500);
  }

  function publish(state, context = {}) {
    let candidate;
    try {
      validatePresentationState(state, {
        presentableItemIndex: getPresentableItemIndex(),
      });
      validateSourceEligibility(state, context, validateSourceSelection);
      candidate = snapshot(state);
    } catch (error) {
      return {
        accepted: false,
        reason: presentationRejectionReason(error),
        lastValidSnapshot: snapshot(lastValidSnapshot),
      };
    }

    lastValidSnapshot = candidate;
    const message = active ? sendLatestState() : null;
    return {
      accepted: true,
      lastValidSnapshot: snapshot(lastValidSnapshot),
      message: snapshot(message),
    };
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

  function publishEnded() {
    if (!active) return null;
    return post("ended", null);
  }

  function end() {
    publishEnded();
    setStatus("ended");
    dispose();
  }

  function getLastValidSnapshot() {
    return snapshot(lastValidSnapshot);
  }

  return { start, publish, publishEnded, end, dispose, getLastValidSnapshot };
}

export function createPresentationAudienceChannel({
  sessionId,
  channelName = presentationChannelName(sessionId),
  createChannel = (name) => new BroadcastChannel(name),
  scheduler = defaultScheduler(),
  presentableItemIndex,
  getPresentableItemIndex = () => presentableItemIndex,
  onStateChange = () => {},
  onEnded = () => {},
  onConnectionChange = () => {},
  onMessageRejected = () => {},
} = {}) {
  let active = false;
  let channel = null;
  let heartbeatTimer = null;
  let sequence = 0;
  let status = "waiting";
  let lastControllerSequence = 0;
  let lastValidSnapshot = null;
  let awaitingBaseline = true;
  let resyncFloor = 0;

  function setStatus(nextStatus) {
    if (status === nextStatus) return;
    status = nextStatus;
    onConnectionChange(status);
  }

  function post(type) {
    const message = makePresentationMessage({
      sessionId,
      sequence: ++sequence,
      type,
      payload: null,
      presentableItemIndex: getPresentableItemIndex(),
    });
    channel?.postMessage(message);
    return message;
  }

  function rejectMessage(rejection) {
    onMessageRejected(snapshot(rejection), snapshot(lastValidSnapshot));
  }

  function requestResync(rejection, floor) {
    rejectMessage(rejection);
    if (!awaitingBaseline) {
      awaitingBaseline = true;
      resyncFloor = Math.max(lastControllerSequence, floor ?? 0);
      setStatus("resync-required");
      post("ready");
    } else {
      resyncFloor = Math.max(resyncFloor, floor ?? 0);
    }
  }

  function acceptState(message) {
    lastControllerSequence = message.sequence;
    lastValidSnapshot = snapshot(message.payload);
    awaitingBaseline = false;
    resyncFloor = 0;
    onStateChange(snapshot(lastValidSnapshot));
    setStatus("connected");
  }

  function handleMessage({ data }) {
    let message;
    try {
      message = parsePresentationMessage(data, {
        sessionId,
        presentableItemIndex: getPresentableItemIndex(),
      });
    } catch (error) {
      const rejection = presentationRejectionReason(error);
      const candidateSequence = envelopeSequence(data);
      if (
        error?.code !== "session_mismatch"
        && isControllerEnvelope(data, sessionId)
        && candidateSequence > lastControllerSequence
      ) {
        requestResync(rejection, candidateSequence);
      } else {
        rejectMessage(rejection);
      }
      return;
    }

    if (message.type !== "state" && message.type !== "ended") return;

    if (message.type === "ended") {
      if (message.sequence <= lastControllerSequence) {
        rejectMessage(reason(
          "duplicate_or_out_of_order",
          "controller message sequence is duplicate or out of order",
        ));
        return;
      }
      lastControllerSequence = message.sequence;
      onEnded(snapshot(message));
      setStatus("ended");
      dispose();
      return;
    }

    if (awaitingBaseline) {
      if (message.sequence <= resyncFloor) {
        rejectMessage(reason(
          "duplicate_or_out_of_order",
          "Audience is waiting for a fresh controller state baseline",
        ));
        return;
      }
      acceptState(message);
      return;
    }

    if (message.sequence <= lastControllerSequence) {
      rejectMessage(reason(
        "duplicate_or_out_of_order",
        "controller message sequence is duplicate or out of order",
      ));
      return;
    }
    if (message.sequence !== lastControllerSequence + 1) {
      requestResync(reason(
        "sequence_gap",
        "controller message sequence is incomplete",
      ), message.sequence);
      return;
    }
    acceptState(message);
  }

  function start() {
    if (active) return;
    active = true;
    channel = createChannel(channelName);
    channel.onmessage = handleMessage;
    awaitingBaseline = true;
    resyncFloor = lastControllerSequence;
    post("ready");
    heartbeatTimer = scheduler.setInterval(
      () => post("heartbeat"),
      HEARTBEAT_INTERVAL_MS,
    );
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) scheduler.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
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

  function getLastValidSnapshot() {
    return snapshot(lastValidSnapshot);
  }

  function isResyncRequired() {
    return awaitingBaseline && lastControllerSequence > 0;
  }

  return { start, dispose, getLastValidSnapshot, isResyncRequired };
}

function validateSourceEligibility(state, context, validateSourceSelection) {
  if (state.source.kind === "manual") return;
  if (state.timeline === null) {
    throw sourceRejection(reason(
      "source_timeline_required",
      "Scene and Chrono Group sources require a valid timeline",
    ));
  }

  const rawStatus = context?.sourceStatus ?? context?.sourceSelection?.status;
  const status = rawStatus == null
    ? null
    : String(rawStatus).trim().toLowerCase().replaceAll("_", "-");
  if (["invalid", "needs-attention", "needs attention"].includes(status)) {
    throw sourceRejection(context?.sourceSelection?.reason);
  }
  if (status === "valid") return;

  if (typeof validateSourceSelection === "function") {
    const eligibility = validateSourceSelection(state.source, state, context);
    if (eligibility === true || eligibility?.accepted === true) return;
    if (eligibility === false || eligibility?.accepted === false) {
      throw sourceRejection(eligibility?.reason);
    }
  }
  throw sourceRejection(reason(
    "source_eligibility_required",
    "Scene and Chrono Group publication requires explicit live eligibility evidence",
  ));
}

function sourceRejection(customReason) {
  const fallback = reason(
    "source_not_presentable",
    "invalid or Needs-attention sources cannot be sent to Audience",
  );
  const selected = customReason?.code && customReason?.message ? customReason : fallback;
  const error = new Error(selected.message);
  error.code = selected.code;
  error.reason = selected;
  return error;
}

function envelopeSequence(value) {
  return Number.isSafeInteger(value?.sequence) && value.sequence > 0 ? value.sequence : 0;
}

function isControllerEnvelope(value, sessionId) {
  return value?.protocol_version === 3
    && value?.session_id === sessionId
    && (value?.type === "state" || value?.type === "ended");
}

function reason(code, message) {
  return Object.freeze({ code, message });
}

function snapshot(value) {
  return value == null ? value : structuredClone(value);
}

function defaultScheduler() {
  return {
    now: () => Date.now(),
    setInterval: (callback, delay) => globalThis.setInterval(callback, delay),
    clearInterval: (id) => globalThis.clearInterval(id),
  };
}
