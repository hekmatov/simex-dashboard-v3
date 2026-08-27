const ENDED_PROJECTION = Object.freeze({
  kind: "ended",
  heading: "Presentation ended",
  body: "This display is no longer active.",
});

const UNACCEPTED_REASON = Object.freeze({
  code: "unaccepted_audience_message",
  message: "Audience projection requires a validated V3 state or ended message.",
});

export function projectAudienceSnapshot(message, lastValid = null) {
  const retained = clone(lastValid);
  if (message?.accepted === false) {
    return immutableResult({
      accepted: false,
      projection: retained,
      lastValid: retained,
      reason: clone(message.reason ?? UNACCEPTED_REASON),
    });
  }
  if (!isAcceptedEnvelope(message)) {
    return immutableResult({
      accepted: false,
      projection: retained,
      lastValid: retained,
      reason: clone(UNACCEPTED_REASON),
    });
  }
  if (message.type === "ended") {
    return immutableResult({
      accepted: true,
      projection: clone(ENDED_PROJECTION),
      lastValid: retained,
      reason: null,
    });
  }

  const projection = projectPresentationState(message.payload);
  return immutableResult({
    accepted: true,
    projection,
    lastValid: projection,
    reason: null,
  });
}

export function projectPresentationState(state) {
  const snapshot = clone(state);
  return deepFreeze({
    kind: "output",
    mode: snapshot.output_mode,
    blackout: snapshot.blackout,
    dashboardRevision: snapshot.dashboard_revision,
    source: snapshot.source,
    composition: snapshot.composition,
    timeline: snapshot.timeline,
    matching: snapshot.matching,
    audience: snapshot.audience,
    payload: snapshot.payload,
  });
}

function isAcceptedEnvelope(message) {
  return message?.protocol_version === 3
    && typeof message.session_id === "string"
    && Number.isSafeInteger(message.sequence)
    && message.sequence > 0
    && (
      (message.type === "state" && message.payload && typeof message.payload === "object")
      || (message.type === "ended" && message.payload === null)
    );
}

function immutableResult(result) {
  return deepFreeze(clone(result));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
