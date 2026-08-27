import React from "react";

import { initialDisplayState, reduceDisplayState } from "../../lib/displayController.js";
import { createPresentationControllerChannel } from "../../lib/presentationChannel.js";
import {
  createInitialPresentationSession,
  isPresentationPlaybackSafe,
  reducePresentationSession,
} from "../../lib/presentationSession.js";
import { openAudienceWindow, requestAudienceWindowClose } from "../../lib/presentationWindow.js";
import { executePresentationEndEffects } from "./PresentationController.jsx";

export const DEFAULT_AUDIENCE_FACTS = Object.freeze({
  dashboard_name: true, page: false, parent_chrono_group: true, scene_name: true, scene_date: true,
});
const AUDIENCE_FACT_KEYS = new Set(Object.keys(DEFAULT_AUDIENCE_FACTS));

export default function usePresentationRuntime(presentableItemIndex, {
  enabled: playbackSafetyEnabled = false,
  playback = null,
} = {}) {
  const playbackSafetyOwner = `present-session:${React.useId()}`;
  const playbackRef = React.useRef(playback);
  playbackRef.current = playback;
  const playbackSafetyEnabledRef = React.useRef(playbackSafetyEnabled);
  playbackSafetyEnabledRef.current = playbackSafetyEnabled;
  const controllerRef = React.useRef(null);
  const audienceWindowRef = React.useRef(null);
  const presentableItemIndexRef = React.useRef(presentableItemIndex);
  presentableItemIndexRef.current = presentableItemIndex;
  const [displayState, setDisplayState] = React.useState(initialDisplayState);
  const displayStateRef = React.useRef(displayState);
  displayStateRef.current = displayState;
  const [sessionState, setSessionState] = React.useState(createInitialPresentationSession);
  const sessionStateRef = React.useRef(sessionState);
  sessionStateRef.current = sessionState;
  const [connectionError, setConnectionError] = React.useState("");
  const [audienceFacts, setAudienceFacts] = React.useState(() => ({ ...DEFAULT_AUDIENCE_FACTS }));

  const reduceSession = React.useCallback((current, action) => reducePresentationSession(
    current,
    action,
    { presentableItemIndex: presentableItemIndexRef.current },
  ), []);
  const synchronizePlayback = React.useCallback((next) => {
    if (!playbackSafetyEnabledRef.current) return;
    const owner = playbackSafetyOwner;
    const currentPlayback = playbackRef.current;
    const safe = isPresentationPlaybackSafe(next);
    currentPlayback?.setPlaybackSafety?.(owner, safe);
    if (next.playback !== "playing") currentPlayback?.dispatch?.({ type: "pause" });
  }, [playbackSafetyOwner]);
  const dispatch = React.useCallback((action) => {
    const next = reduceSession(sessionStateRef.current, action);
    sessionStateRef.current = next;
    setSessionState(next);
    synchronizePlayback(next);
    return next;
  }, [reduceSession, synchronizePlayback]);

  const onDisplayAction = React.useCallback((action) => {
    const next = reduceDisplayState(
      displayStateRef.current,
      action,
      presentableItemIndexRef.current?.keys?.(),
    );
    displayStateRef.current = next;
    setDisplayState(next);
    dispatch({
      type: "SET_COMPOSITION",
      composition: {
        displayed_chart_ids: [...next.displayed_chart_ids],
        layout: next.layout,
      },
    });
  }, [dispatch]);
  React.useEffect(() => {
    setDisplayState((current) => reduceDisplayState(current, {
      type: "companion_reconcile",
      chart_ids: current.displayed_chart_ids.filter((id) => presentableItemIndex.has(id)),
    }, presentableItemIndex.keys()));
  }, [presentableItemIndex]);
  React.useEffect(() => {
    if (playbackSafetyEnabled) synchronizePlayback(sessionStateRef.current);
    else playbackRef.current?.releasePlaybackSafety?.(playbackSafetyOwner);
    return () => playbackRef.current?.releasePlaybackSafety?.(playbackSafetyOwner);
  }, [playbackSafetyEnabled, playbackSafetyOwner, synchronizePlayback]);

  const setAudienceFactVisible = React.useCallback((key, visible) => {
    if (!AUDIENCE_FACT_KEYS.has(key)) return;
    setAudienceFacts((current) => current[key] === (visible === true)
      ? current
      : { ...current, [key]: visible === true });
  }, []);

  const publishOutcome = React.useCallback((outcome, session) => {
    const guard = { sessionId: session.sessionId, channelGeneration: session.channelGeneration };
    dispatch(outcome.accepted && outcome.message
      ? { type: "SNAPSHOT_ACCEPTED", message: outcome.message, ...guard }
      : { type: "SNAPSHOT_REJECTED", reason: outcome.reason, ...guard });
  }, [dispatch]);
  const publish = React.useCallback((presentationState, context = {}) => {
    const session = sessionStateRef.current;
    if (!controllerRef.current || session.lifecycle === "ended") return null;
    const outcome = controllerRef.current.publish(presentationState, context);
    publishOutcome(outcome, session);
    return outcome;
  }, [publishOutcome]);

  const connectionAction = React.useCallback((status, guard) => {
    const type = ({ connected: "CONNECTED", connecting: "CONNECTING", disconnected: "CONNECTION_LOST", reconnecting: "RECONNECTING" })[status];
    if (type) dispatch({ type, ...guard });
  }, [dispatch]);

  const finishFailedStartup = React.useCallback((opened, controller, audienceWindow = null) => {
    let failed = reduceSession(opened, { type: "END" });
    sessionStateRef.current = failed;
    setSessionState(failed);
    synchronizePlayback(failed);
    const actions = executePresentationEndEffects(failed, {
      publishEnded: () => controller?.publishEnded?.(),
      requestClose: () => audienceWindow
        ? requestAudienceWindowClose(audienceWindow)
        : { outcome: "succeeded" },
      terminateChannel: () => controller?.dispose?.(),
    });
    for (const action of actions) failed = reduceSession(failed, action);
    controllerRef.current = null;
    audienceWindowRef.current = null;
    sessionStateRef.current = failed;
    setSessionState(failed);
    return failed;
  }, [reduceSession, synchronizePlayback]);

  const openNewSession = React.useCallback((presentationState, context = {}) => {
    const current = sessionStateRef.current;
    if (current.lifecycle !== "ended" || current.effects.length > 0) return null;
    const sessionId = globalThis.crypto?.randomUUID?.();
    if (!sessionId) {
      setConnectionError("Audience display is unavailable in this browser.");
      return null;
    }
    const requestedWindowName = `simex-audience-${sessionId}`;
    let opened;
    try {
      opened = reduceSession(current, { type: "OPEN_NEW_SESSION", sessionId, requestedWindowName });
    } catch {
      setConnectionError("Audience display is unavailable in this browser.");
      return null;
    }
    sessionStateRef.current = opened;
    setSessionState(opened);
    const guard = { sessionId, channelGeneration: opened.channelGeneration };
    let controller;
    let outcome;
    try {
      controller = createPresentationControllerChannel({
        sessionId,
        getPresentableItemIndex: () => presentableItemIndexRef.current,
        onConnectionChange: (status) => connectionAction(status, guard),
      });
      controller.start();
      controllerRef.current = controller;
      outcome = controller.publish(presentationState, context);
      publishOutcome(outcome, opened);
    } catch {
      finishFailedStartup(opened, controller);
      setConnectionError("Audience display is unavailable in this browser.");
      return null;
    }
    let result;
    try {
      result = openAudienceWindow({ channelId: sessionId, windowName: requestedWindowName });
    } catch {
      finishFailedStartup(sessionStateRef.current, controller);
      setConnectionError("Audience display is unavailable in this browser.");
      return null;
    }
    if (result.status !== "opened") {
      setConnectionError("The audience display window was blocked.");
      return outcome;
    }
    audienceWindowRef.current = result.windowRef;
    setConnectionError("");
    dispatch({ type: "WINDOW_OPENED", ...guard });
    return outcome;
  }, [connectionAction, dispatch, finishFailedStartup, publishOutcome, reduceSession]);

  const reopenAudience = React.useCallback(() => {
    const session = sessionStateRef.current;
    if (session.lifecycle === "ended") return null;
    const result = openAudienceWindow({ channelId: session.sessionId, windowName: session.requestedWindowName });
    if (result.status !== "opened") {
      setConnectionError("The audience display window was blocked.");
      return result;
    }
    audienceWindowRef.current = result.windowRef;
    setConnectionError("");
    dispatch({ type: "WINDOW_OPENED", sessionId: session.sessionId, channelGeneration: session.channelGeneration });
    return result;
  }, [dispatch]);

  const end = React.useCallback(() => {
    const current = sessionStateRef.current;
    if (current.lifecycle === "ended") return;
    let next = reduceSession(current, { type: "END" });
    sessionStateRef.current = next;
    setSessionState(next);
    synchronizePlayback(next);
    const controller = controllerRef.current;
    const audienceWindow = audienceWindowRef.current;
    const actions = executePresentationEndEffects(next, {
      publishEnded: () => controller?.publishEnded(),
      requestClose: () => requestAudienceWindowClose(audienceWindow),
      terminateChannel: () => controller?.dispose(),
    });
    for (const action of actions) next = reduceSession(next, action);
    controllerRef.current = null;
    audienceWindowRef.current = next.closeOutcome === "succeeded" ? null : audienceWindow;
    sessionStateRef.current = next;
    setSessionState(next);
    setConnectionError("");
  }, [reduceSession, synchronizePlayback]);

  React.useEffect(() => () => {
    controllerRef.current?.publishEnded?.();
    controllerRef.current?.dispose();
    requestAudienceWindowClose(audienceWindowRef.current);
  }, []);

  return {
    displayState, onDisplayAction, sessionState,
    connectionStatus: sessionState.connection, connectionError,
    hasSession: sessionState.lifecycle !== "ended",
    audienceFacts, setAudienceFactVisible,
    blackout: sessionState.blackout,
    setBlackout: (active) => dispatch({ type: "SET_BLACKOUT", active }),
    dispatch, publish, open: openNewSession, openNewSession, reopenAudience, end,
  };
}
