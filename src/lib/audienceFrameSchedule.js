export const FRAME_SETTLE_MS = 200;
export const FRAME_STATIC_AFTER_MS = 4000;
export const FRAME_HEARTBEAT_MS = 15000;

export function createAudienceFrameSchedule() {
  return {
    connected: false, visible: true, running: false, asleep: false,
    intervalMs: 2000, lastActivityAt: 0, lastCaptureAt: null,
    captureAt: null, heartbeatAt: null,
  };
}

export function reduceAudienceFrameSchedule(state, event, now) {
  const next = { ...state };
  const wake = () => {
    next.lastActivityAt = now;
    next.asleep = false;
    next.heartbeatAt = null;
    next.captureAt = now + FRAME_SETTLE_MS;
  };
  switch (event.type) {
    case "connect": next.connected = true; wake(); break;
    case "disconnect": next.connected = false; next.captureAt = null; break;
    case "visibility":
      next.visible = event.visible;
      if (event.visible) wake(); else next.captureAt = null;
      break;
    case "visual-change":
    case "state-accepted":
    case "resize": wake(); break;
    case "playback-tick":
      next.lastActivityAt = now;
      next.asleep = false;
      next.heartbeatAt = null;
      next.captureAt ??= Math.max(now, (next.lastCaptureAt ?? now) + next.intervalMs);
      break;
    case "capture-start": next.running = true; next.captureAt = null; break;
    case "capture-complete":
      next.running = false;
      next.lastCaptureAt = now;
      if (event.duration > 400) next.intervalMs = Math.min(10000, next.intervalMs * 2);
      if (event.duration < 150) next.intervalMs = Math.max(1000, next.intervalMs / 2);
      break;
    case "clock":
      if (!next.asleep && !next.running && next.captureAt == null
        && now - next.lastActivityAt >= FRAME_STATIC_AFTER_MS) {
        next.asleep = true;
        next.captureAt = null;
        next.heartbeatAt = now + FRAME_HEARTBEAT_MS;
      }
      break;
    case "heartbeat-sent": next.heartbeatAt = now + FRAME_HEARTBEAT_MS; break;
    default: throw new Error(`Unknown Audience frame schedule event: ${event.type}`);
  }
  return next;
}

export function audienceFrameInstruction(state, now) {
  if (!state.connected || !state.visible || state.running) return { type: "sleep" };
  if (state.asleep) return state.heartbeatAt <= now ? { type: "heartbeat" } : { type: "sleep" };
  if (state.captureAt == null) return { type: "sleep" };
  return state.captureAt <= now
    ? { type: "capture-now" }
    : { type: "capture-at", delay: state.captureAt - now };
}
