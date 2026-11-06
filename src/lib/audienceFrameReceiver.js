// A bounded receipt store: one latest valid image and at most 32 requested states.
// It never participates in controller liveness or playback safety.
export function createAudienceFrameReceiver({ now, onChange = () => {} }) {
  const requests = new Map();
  let floor = 0;
  let highestAccepted = 0;
  let value = { frame: null, viewport: null, stage: null, status: "waiting", streamId: null, requestedSequence: 0, acceptedSequence: 0 };
  const emit = () => {
    try { onChange(structuredClone(value)); } catch { /* Passive monitor failure cannot invalidate Audience output. */ }
  };
  return {
    recordRequest(sequence, state) {
      requests.set(sequence, state);
      while (requests.size > 32) requests.delete(requests.keys().next().value);
      value = { ...value, requestedSequence: sequence };
      emit();
    },
    restart(nextStateSequence) {
      floor = nextStateSequence;
      highestAccepted = 0;
      value = { ...value, status: "waiting", streamId: null, acceptedSequence: 0 };
      emit();
    },
    accept(type, payload) {
      const requested = requests.get(payload.accepted_sequence);
      if (payload.accepted_sequence < floor
        || requested?.dashboard_revision !== payload.dashboard_revision) reject("unaccepted_audience_frame");
      const isImage = type === "audience_frame";
      const behindMetadata = payload.accepted_sequence < highestAccepted;
      if ((value.streamId !== null && value.streamId !== payload.stream_id)
        || (behindMetadata && (!isImage || ["hidden", "disconnected", "unavailable"].includes(value.status)
          || !samePlaybackStructure(requested, requests.get(highestAccepted))))) reject("stale_audience_frame");
      if (isImage && (
        (value.frame?.stream_id === payload.stream_id && (payload.revision <= value.frame.revision
          || payload.accepted_sequence < value.frame.accepted_sequence))
        || payload.capturedAt < now() - 30000 || payload.capturedAt > now() + 5000
      )) reject("stale_audience_frame");
      highestAccepted = Math.max(highestAccepted, payload.accepted_sequence);
      value = { ...value, streamId: payload.stream_id, acceptedSequence: highestAccepted, lastStreamAt: now() };
      if (isImage) {
        value = { ...value, frame: structuredClone(payload), receivedAt: now() };
        if (!behindMetadata) value = { ...value, viewport: payload.viewport, stage: payload.stage, status: "fresh" };
      }
      if (type === "audience_viewport") value = { ...value, viewport: payload.viewport, stage: payload.stage,
        status: value.frame?.accepted_sequence === payload.accepted_sequence ? value.status : "waiting" };
      if (type === "audience_heartbeat") value = { ...value, status: payload.status, since: payload.since };
      if (type === "audience_frame_unavailable") value = { ...value, status: "unavailable", reason: payload.reason };
      emit();
    },
    clear() { requests.clear(); value = { ...value, frame: null }; },
  };
}
function samePlaybackStructure(left, right) {
  if (!left.timeline || !right?.timeline) return false;
  const structure = state => JSON.stringify({ ...state, timeline: { ...state.timeline, frame_index: 0 } });
  return structure(left) === structure(right);
}
function reject(code) {
  const error = new Error("Audience frame does not match a current accepted state or stream order.");
  error.reason = { code, message: error.message };
  throw error;
}
