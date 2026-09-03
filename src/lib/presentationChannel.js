import {
  makePresentationMessage,
  makePresentationThemeMessage,
  parsePresentationMessage,
  parsePresentationThemeMessage,
  presentationChannelName,
  presentationRejectionReason,
  presentationThemeChannelName,
  validatePresentationState,
} from "./presentationProtocol.js";

const HEARTBEAT_INTERVAL_MS = 1_500;
const DISCONNECT_AFTER_MS = 5_000;

export function createPresentationControllerChannel({
  sessionId,
  channelName = presentationChannelName(sessionId),
  themeChannelName = presentationThemeChannelName(sessionId),
  createChannel = (name) => new BroadcastChannel(name),
  scheduler = defaultScheduler(),
  presentableItemIndex,
  getPresentableItemIndex = () => presentableItemIndex,
  validateSourceSelection,
  onConnectionChange = () => {},
  onAudienceDatePositionChange = () => {},
  onAcceptedStateChange = () => {},
  onMessageRejected = () => {},
} = {}) {
  let active = false;
  let channel = null;
  let themeChannel = null;
  let connectionTimer = null;
  let heartbeatTimer = null;
  let lastValidSnapshot = null;
  let lastHeartbeatAt = null;
  let lastAudienceSequence = 0;
  let sequence = 0;
  let themeSequence = 0;
  let status = "disconnected";
  const audienceDatePositionOverrides = new Map();
  let audienceDatePositionQueue = null;

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

  function postTheme() {
    if (!lastValidSnapshot?.theme) return null;
    const message = makePresentationThemeMessage({
      sessionId,
      sequence: ++themeSequence,
      payload: lastValidSnapshot.theme,
    });
    themeChannel?.postMessage(message);
    return message;
  }

  function sendLatestState() {
    if (!lastValidSnapshot) return null;
    try {
      validatePresentationState(lastValidSnapshot, {
        presentableItemIndex: getPresentableItemIndex(),
      });
      postTheme();
      return post("state", lastValidSnapshot);
    } catch (error) {
      onMessageRejected(
        presentationRejectionReason(error),
        snapshot(lastValidSnapshot),
      );
      return null;
    }
  }

  function reportAcceptedState() {
    try {
      onAcceptedStateChange(snapshot(lastValidSnapshot));
    } catch {
      // A monitor cannot alter or invalidate accepted Audience output.
    }
  }

  function rejectAudienceDatePosition(error) {
    if (!active) return;
    onMessageRejected(
      presentationRejectionReason(error),
      snapshot(lastValidSnapshot),
    );
    sendLatestState();
  }

  function acceptAudienceDatePosition(source, position) {
    if (!active) return;
    if (!lastValidSnapshot || !samePresentationSource(source, lastValidSnapshot.source)) {
      audienceDatePositionOverrides.set(presentationSourceKey(source), position);
      return;
    }
    const candidate = snapshot({
      ...lastValidSnapshot,
      audience: { date_position: position },
    });
    try {
      validatePresentationState(candidate, {
        presentableItemIndex: getPresentableItemIndex(),
      });
    } catch (error) {
      rejectAudienceDatePosition(error);
      return;
    }
    audienceDatePositionOverrides.set(presentationSourceKey(source), position);
    lastValidSnapshot = candidate;
    const republished = sendLatestState();
    reportAcceptedState();
    if (status === "disconnected") setStatus(republished ? "connected" : "reconnecting");
  }

  function captureAudienceDatePosition(message) {
    if (!lastValidSnapshot || !samePresentationSource(message.payload.source, lastValidSnapshot.source)) {
      onMessageRejected(reason(
        "stale_audience_source",
        "Audience date movement no longer matches the active presentation source",
      ), snapshot(lastValidSnapshot));
      return null;
    }
    const position = {
      x_permille: message.payload.date_position.x_permille,
      y_permille: message.payload.date_position.y_permille,
      width_permille: lastValidSnapshot.audience.date_position.width_permille,
    };
    try {
      validatePresentationState({
        ...lastValidSnapshot,
        audience: { date_position: position },
      }, {
        presentableItemIndex: getPresentableItemIndex(),
      });
    } catch (error) {
      onMessageRejected(
        presentationRejectionReason(error),
        snapshot(lastValidSnapshot),
      );
      return null;
    }
    return snapshot({
      source: message.payload.source,
      datePosition: position,
    });
  }

  function processAudienceDatePosition(update) {
    if (!active) return null;
    let persistence;
    try {
      persistence = onAudienceDatePositionChange(snapshot(update));
    } catch (error) {
      rejectAudienceDatePosition(error);
      return null;
    }
    if (!isPromiseLike(persistence)) {
      acceptAudienceDatePosition(update.source, update.datePosition);
      return null;
    }
    return Promise.resolve(persistence).then(
      () => acceptAudienceDatePosition(update.source, update.datePosition),
      (error) => rejectAudienceDatePosition(error),
    );
  }

  function enqueueAudienceDatePosition(message) {
    const update = captureAudienceDatePosition(message);
    if (!update) return;
    const run = () => processAudienceDatePosition(update);
    const operation = audienceDatePositionQueue
      ? audienceDatePositionQueue.then(run)
      : run();
    if (!isPromiseLike(operation)) return;
    const tracked = Promise.resolve(operation).catch(() => undefined);
    audienceDatePositionQueue = tracked;
    void tracked.then(() => {
      if (audienceDatePositionQueue === tracked) audienceDatePositionQueue = null;
    });
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
    if (
      message.type !== "ready"
      && message.type !== "heartbeat"
      && message.type !== "audience-date-position"
    ) return;
    if (message.type === "ready" && message.sequence === 1) {
      lastAudienceSequence = 1;
      lastHeartbeatAt = scheduler.now();
      const reconnecting = status === "disconnected";
      if (reconnecting) setStatus("reconnecting");
      const baseline = sendLatestState();
      setStatus(baseline ? "connected" : reconnecting ? "reconnecting" : "connecting");
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
    if (message.type === "ready") {
      const reconnecting = status === "disconnected" || status === "reconnecting";
      if (status === "disconnected") setStatus("reconnecting");
      const baseline = sendLatestState();
      setStatus(baseline ? "connected" : reconnecting ? "reconnecting" : "connecting");
      return;
    }
    if (message.type === "audience-date-position") {
      enqueueAudienceDatePosition(message);
      return;
    }
    if (status === "disconnected") {
      setStatus("reconnecting");
    }
  }

  function start() {
    if (active) return;
    active = true;
    themeChannel = createChannel(themeChannelName);
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
    heartbeatTimer = scheduler.setInterval(
      () => post("heartbeat", null),
      HEARTBEAT_INTERVAL_MS,
    );
  }

  function publish(state, context = {}) {
    let candidate;
    try {
      const datePositionOverride = audienceDatePositionOverrides.get(
        presentationSourceKey(state?.source),
      );
      const effectiveState = datePositionOverride
        ? {
            ...state,
            audience: { date_position: snapshot(datePositionOverride) },
          }
        : state;
      validatePresentationState(effectiveState, {
        presentableItemIndex: getPresentableItemIndex(),
      });
      validateSourceEligibility(effectiveState, context, validateSourceSelection);
      candidate = snapshot(effectiveState);
    } catch (error) {
      return {
        accepted: false,
        reason: presentationRejectionReason(error),
        lastValidSnapshot: snapshot(lastValidSnapshot),
      };
    }

    lastValidSnapshot = candidate;
    reportAcceptedState();
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
    if (heartbeatTimer !== null) scheduler.clearInterval(heartbeatTimer);
    connectionTimer = null;
    heartbeatTimer = null;
    lastHeartbeatAt = null;
    audienceDatePositionOverrides.clear();
    audienceDatePositionQueue = null;
    if (channel) {
      channel.onmessage = null;
      channel.close();
    }
    if (themeChannel) themeChannel.close();
    channel = null;
    themeChannel = null;
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
  themeChannelName = presentationThemeChannelName(sessionId),
  createChannel = (name) => new BroadcastChannel(name),
  scheduler = defaultScheduler(),
  presentableItemIndex,
  getPresentableItemIndex = () => presentableItemIndex,
  onStateChange = () => {},
  onThemeChange = () => {},
  onMessageAccepted = () => {},
  onEnded = () => {},
  onConnectionChange = () => {},
  onMessageRejected = () => {},
} = {}) {
  let active = false;
  let channel = null;
  let themeChannel = null;
  let heartbeatTimer = null;
  let livenessTimer = null;
  let sequence = 0;
  let status = "waiting";
  let lastControllerSequence = 0;
  let lastThemeSequence = 0;
  let lastValidSnapshot = null;
  let lastValidTheme = null;
  let awaitingBaseline = true;
  let resyncFloor = 0;
  let lastControllerAt = null;
  let reconnectStartedAt = null;
  let reconnectReadyPending = false;
  let reconnectBaselineRequired = false;

  function setStatus(nextStatus) {
    if (status === nextStatus) return;
    status = nextStatus;
    onConnectionChange(status);
  }

  function post(type, payload = null) {
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

  function beginReconnect(floor = lastControllerSequence) {
    awaitingBaseline = true;
    reconnectBaselineRequired = true;
    resyncFloor = Math.max(resyncFloor, floor ?? 0);
    reconnectStartedAt = scheduler.now();
    reconnectReadyPending = true;
    setStatus("reconnecting");
  }

  function acceptState(message) {
    lastControllerSequence = message.sequence;
    lastControllerAt = scheduler.now();
    if (message.payload.theme) {
      lastValidTheme = snapshot(message.payload.theme);
      onThemeChange(snapshot(lastValidTheme));
    }
    lastValidSnapshot = snapshot(lastValidTheme && !message.payload.theme
      ? { ...message.payload, theme: lastValidTheme }
      : message.payload);
    awaitingBaseline = false;
    resyncFloor = 0;
    reconnectStartedAt = null;
    reconnectReadyPending = false;
    reconnectBaselineRequired = false;
    onMessageAccepted(snapshot({ ...message, payload: lastValidSnapshot }));
    onStateChange(snapshot(lastValidSnapshot));
    setStatus("connected");
  }

  function handleThemeMessage({ data }) {
    try {
      const message = parsePresentationThemeMessage(data, {
        sessionId,
        lastSequence: lastThemeSequence,
      });
      lastThemeSequence = message.sequence;
      const nextTheme = snapshot(message.payload);
      if (JSON.stringify(nextTheme) === JSON.stringify(lastValidTheme)) return;
      lastValidTheme = nextTheme;
      onThemeChange(snapshot(lastValidTheme));
      if (lastValidSnapshot) {
        lastValidSnapshot = snapshot({ ...lastValidSnapshot, theme: lastValidTheme });
        onStateChange(snapshot(lastValidSnapshot));
      }
    } catch (error) {
      rejectMessage(presentationRejectionReason(error));
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
      const rejection = presentationRejectionReason(error);
      const candidateSequence = envelopeSequence(data);
      if (
        reconnectBaselineRequired
        && status === "disconnected"
        && error?.code !== "session_mismatch"
        && isControllerEnvelope(data, sessionId)
        && candidateSequence > lastControllerSequence
      ) {
        rejectMessage(rejection);
        beginReconnect(candidateSequence);
        return;
      }
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

    if (message.type === "heartbeat") {
      if (awaitingBaseline) {
        if (message.sequence <= resyncFloor) {
          rejectMessage(reason(
            "duplicate_or_out_of_order",
            "Audience is waiting for a fresh controller state baseline",
          ));
          return;
        }
        lastControllerSequence = message.sequence;
        resyncFloor = message.sequence;
      } else {
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
        lastControllerSequence = message.sequence;
      }
      lastControllerAt = scheduler.now();
      if (status === "disconnected") {
        beginReconnect();
      }
      return;
    }

    if (message.type !== "state" && message.type !== "ended") return;

    if (message.type === "ended") {
      if (awaitingBaseline && resyncFloor > lastControllerSequence) {
        rejectMessage(reason(
          "duplicate_or_out_of_order",
          "Audience is waiting for a fresh controller state baseline",
        ));
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
      lastControllerSequence = message.sequence;
      awaitingBaseline = false;
      resyncFloor = 0;
      onMessageAccepted(snapshot(message));
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
      if (reconnectBaselineRequired && status === "disconnected") {
        setStatus("reconnecting");
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
    themeChannel = createChannel(themeChannelName);
    themeChannel.onmessage = handleThemeMessage;
    channel = createChannel(channelName);
    channel.onmessage = handleMessage;
    awaitingBaseline = true;
    resyncFloor = lastControllerSequence;
    post("ready");
    heartbeatTimer = scheduler.setInterval(
      () => post("heartbeat"),
      HEARTBEAT_INTERVAL_MS,
    );
    livenessTimer = scheduler.setInterval(() => {
      if (
        reconnectReadyPending
        && reconnectStartedAt !== null
        && scheduler.now() - reconnectStartedAt >= 500
      ) {
        reconnectReadyPending = false;
        post("ready");
      }
      if (
        lastControllerAt !== null
        && scheduler.now() - lastControllerAt >= DISCONNECT_AFTER_MS
        && status !== "ended"
        && status !== "disconnected"
      ) {
        awaitingBaseline = true;
        reconnectBaselineRequired = true;
        resyncFloor = Math.max(resyncFloor, lastControllerSequence);
        reconnectStartedAt = null;
        reconnectReadyPending = false;
        setStatus("disconnected");
      }
    }, 500);
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) scheduler.clearInterval(heartbeatTimer);
    if (livenessTimer !== null) scheduler.clearInterval(livenessTimer);
    heartbeatTimer = null;
    livenessTimer = null;
  }

  function dispose() {
    if (!active) return;
    active = false;
    stopHeartbeat();
    if (channel) {
      channel.onmessage = null;
      channel.close();
    }
    if (themeChannel) {
      themeChannel.onmessage = null;
      themeChannel.close();
    }
    channel = null;
    themeChannel = null;
    lastControllerAt = null;
    reconnectStartedAt = null;
    reconnectReadyPending = false;
    reconnectBaselineRequired = false;
  }

  function getLastValidSnapshot() {
    return snapshot(lastValidSnapshot);
  }

  function isResyncRequired() {
    return awaitingBaseline && lastControllerSequence > 0;
  }

  function publishDatePosition(datePosition, pointerDownSource = lastValidSnapshot?.source) {
    if (!active || !pointerDownSource) return null;
    return post("audience-date-position", {
      source: snapshot(pointerDownSource),
      date_position: {
        x_permille: datePosition?.x_permille,
        y_permille: datePosition?.y_permille,
      },
    });
  }

  return {
    start,
    dispose,
    getLastValidSnapshot,
    isResyncRequired,
    publishDatePosition,
  };
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

function presentationSourceKey(source) {
  if (!source || typeof source !== "object") return null;
  return `${source.kind}:${source.scene_id ?? ""}:${source.chrono_group_id ?? ""}`;
}

function samePresentationSource(left, right) {
  return presentationSourceKey(left) === presentationSourceKey(right);
}

function isPromiseLike(value) {
  return value !== null
    && (typeof value === "object" || typeof value === "function")
    && typeof value.then === "function";
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
