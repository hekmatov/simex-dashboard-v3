import React from "react";
import { createAudienceFrameSchedule, reduceAudienceFrameSchedule, audienceFrameInstruction } from "../../lib/audienceFrameSchedule.js";
import { audienceSurfaceMetadata, captureAudienceElement } from "./audienceCapture.js";

export function createAudienceFrameCaptureController({
  getElement, getObservationRoot = getElement, publish, capture = captureAudienceElement,
  documentRef = document, windowRef = window,
  now = () => Date.now(),
  streamId = globalThis.crypto.randomUUID(),
  warn = () => console.warn("Audience frame capture is unavailable; local preview remains available."),
  classifyVisualChange = () => "visual-change",
}) {
  let state = createAudienceFrameSchedule();
  let timer = null;
  let disposed = false;
  let generation = 0;
  let revision = 0;
  let unavailable = false;
  let warned = false;
  let reason = "state-accepted";
  let playbackCadence = false;
  let observedRoot = null;
  let observer = null;
  const metadata = () => audienceSurfaceMetadata(getElement(), windowRef);
  const post = (type, payload = {}, identity = metadata()) => {
    if (identity && !disposed && state.connected) return publish(type, { stream_id: streamId,
      accepted_sequence: identity.accepted_sequence, dashboard_revision: identity.dashboard_revision, ...payload });
    return null;
  };
  const viewport = () => { const value = metadata(); if (value) post("audience_viewport", { viewport: value.viewport, stage: value.stage }); };
  const reduce = event => { state = reduceAudienceFrameSchedule(state, event, now()); };
  const heartbeat = status => post("audience_heartbeat", { status, since: state.lastActivityAt });

  function pump() {
    if (timer !== null) windowRef.clearTimeout(timer);
    timer = null;
    if (disposed || !state.connected || !state.visible) return;
    const wasAsleep = state.asleep;
    reduce({ type: "clock" });
    if (!wasAsleep && state.asleep && !unavailable) heartbeat("static");
    const action = audienceFrameInstruction(state, now());
    if (action.type === "heartbeat") {
      if (!unavailable) heartbeat("static");
      reduce({ type: "heartbeat-sent" });
    }
    if (action.type === "capture-now") {
      const element = getElement();
      const initialIdentity = audienceSurfaceMetadata(element, windowRef);
      if (!initialIdentity) { reduce({ type: "capture-start" }); reduce({ type: "capture-complete", duration: 0 }); }
      else {
        const started = now(), token = generation;
        const isCurrent = () => !disposed && state.connected && state.visible
          && token === generation && getElement() === element;
        let sample;
        const readSample = () => {
          if (!isCurrent()) return null;
          const identity = audienceSurfaceMetadata(element, windowRef);
          if (identity) sample = { ...identity, capturedAt: now(), reason };
          return identity;
        };
        reduce({ type: "capture-start" });
        void Promise.resolve().then(() => capture(element, readSample)).then(image => {
          if (!image || !sample || !isCurrent()) return;
          publish("audience_frame", { ...sample, stream_id: streamId, revision: ++revision, image });
          unavailable = false;
        }).catch(error => {
          if (!isCurrent()) return;
          const failed = sample ?? initialIdentity;
          const current = metadata();
          if (current?.accepted_sequence !== failed.accepted_sequence
            || current.dashboard_revision !== failed.dashboard_revision) return;
          unavailable = true;
          if (!warned) { warned = true; warn(); }
          post("audience_frame_unavailable", { reason: error?.code === "frame-too-large" ? "frame-too-large" : "capture-failed" }, failed);
        }).finally(() => {
          reduce({ type: "capture-complete", duration: now() - started });
          if (!disposed) pump();
        });
      }
    }
    if (state.running) return;
    const next = audienceFrameInstruction(state, now());
    const delay = next.type === "capture-at" ? next.delay
      : state.asleep ? Math.max(1, state.heartbeatAt - now()) : Math.max(1, state.lastActivityAt + 4000 - now());
    timer = windowRef.setTimeout(pump, delay);
  }

  function notify(type) {
    if (disposed) return;
    const root = getObservationRoot();
    if (root !== observedRoot) {
      observer?.disconnect();
      observedRoot?.removeEventListener?.("load", surfaceChanged, true);
      observedRoot = root;
      if (root && typeof windowRef.MutationObserver === "function") {
        observer = new windowRef.MutationObserver(surfaceChanged);
        observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
      }
      root?.addEventListener?.("load", surfaceChanged, true);
    }
    if (type === "playback-tick") playbackCadence = true;
    if (["connect", "resize", "state-accepted"].includes(type)) playbackCadence = false;
    if (type === "visual-change" && playbackCadence) type = "playback-tick";
    if (type !== "playback-tick") generation++;
    reason = type === "playback-tick" ? "playback-tick" : type === "resize" ? "resize" : "state-accepted";
    if (type === "disconnect" && state.connected) heartbeat("disconnected");
    if (type === "visibility") {
      reduce({ type, visible: documentRef.visibilityState === "visible" });
      if (!state.visible) heartbeat("hidden"); else viewport();
    } else {
      reduce({ type });
      if (["connect", "resize", "state-accepted"].includes(type)) viewport();
    }
    pump();
  }
  const visibility = () => notify("visibility");
  const resize = () => notify("resize");
  function surfaceChanged() { notify(classifyVisualChange()); }
  documentRef.addEventListener("visibilitychange", visibility);
  windowRef.addEventListener("resize", resize);
  reduce({ type: "visibility", visible: documentRef.visibilityState === "visible" });
  return {
    notify,
    dispose() {
      disposed = true; generation++;
      if (timer !== null) windowRef.clearTimeout(timer);
      documentRef.removeEventListener("visibilitychange", visibility);
      windowRef.removeEventListener("resize", resize);
      observer?.disconnect();
      observedRoot?.removeEventListener?.("load", surfaceChanged, true);
    },
  };
}

export default function useAudienceFrameCapture({ enabled, rootRef, channelRef, connectionStatus, projection }) {
  const controllerRef = React.useRef(null);
  const previous = React.useRef({});
  const rendering = React.useRef({});
  React.useEffect(() => {
    if (!enabled) return undefined;
    const controller = createAudienceFrameCaptureController({
      getElement: () => rootRef.current?.querySelector(".audience-display"),
      // The accepted display replaces the startup node inside this stable root.
      getObservationRoot: () => rootRef.current,
      publish: (type, payload) => channelRef.current?.publishFrameEvent(type, payload),
      classifyVisualChange: () => classifyAudienceVisualChange(previous.current, rendering.current),
    });
    controllerRef.current = controller;
    return () => { controllerRef.current = null; controller.dispose(); };
  }, [enabled, rootRef, channelRef]);
  React.useEffect(() => { controllerRef.current?.notify(connectionStatus === "connected" ? "connect" : "disconnect"); }, [connectionStatus, enabled]);
  const structureKey = projection?.kind === "output" ? JSON.stringify({ ...projection, acceptedSequence: undefined,
    timeline: projection.timeline && { ...projection.timeline, frame_index: 0 } }) : projection?.kind;
  rendering.current = { structureKey, frameIndex: projection?.timeline?.frame_index };
  React.useLayoutEffect(() => {
    const current = { structureKey, frameIndex: projection?.timeline?.frame_index };
    controllerRef.current?.notify(previous.current.structureKey === structureKey
      && previous.current.frameIndex !== current.frameIndex ? "playback-tick" : "state-accepted");
    previous.current = current;
  }, [projection, structureKey]);
  return React.useCallback(() => controllerRef.current?.notify(classifyAudienceVisualChange(previous.current, rendering.current)), []);
}

export function classifyAudienceVisualChange(previous, rendering) {
  if (previous.structureKey !== rendering.structureKey) return "state-accepted";
  if (previous.frameIndex !== rendering.frameIndex) return "playback-tick";
  return "visual-change";
}
