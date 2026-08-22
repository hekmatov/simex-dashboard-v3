import React from "react";

import { initialDisplayState, reduceDisplayState } from "../../lib/displayController.js";
import { createPresentationControllerChannel } from "../../lib/presentationChannel.js";
import { openAudienceWindow } from "../../lib/presentationWindow.js";

export const DEFAULT_AUDIENCE_FACTS = Object.freeze({
  dashboard_name: true,
  page: false,
  parent_chrono_group: true,
  scene_name: true,
  scene_date: true,
});
const AUDIENCE_FACT_KEYS = new Set(Object.keys(DEFAULT_AUDIENCE_FACTS));

export default function usePresentationRuntime(validChartIds) {
  const controllerRef = React.useRef(null);
  const sessionIdRef = React.useRef(null);
  const audienceWindowRef = React.useRef(null);
  const validChartIdsRef = React.useRef(validChartIds);
  validChartIdsRef.current = validChartIds;

  const [displayState, setDisplayState] = React.useState(initialDisplayState);
  const [connectionStatus, setConnectionStatus] = React.useState("not-open");
  const [connectionError, setConnectionError] = React.useState("");
  const [hasSession, setHasSession] = React.useState(false);
  const [audienceFacts, setAudienceFacts] = React.useState(
    () => ({ ...DEFAULT_AUDIENCE_FACTS }),
  );
  const [blackout, setBlackout] = React.useState(false);

  const onDisplayAction = React.useCallback((action) => {
    setDisplayState((current) => reduceDisplayState(
      current,
      action,
      validChartIdsRef.current,
    ));
  }, []);

  const setAudienceFactVisible = React.useCallback((key, visible) => {
    if (!AUDIENCE_FACT_KEYS.has(key)) return;
    const nextVisible = visible === true;
    setAudienceFacts((current) => (
      current[key] === nextVisible
        ? current
        : { ...current, [key]: nextVisible }
    ));
  }, []);

  const publish = React.useCallback((presentationState) => {
    controllerRef.current?.publish(presentationState);
  }, []);

  const open = React.useCallback((presentationState) => {
    let controller = controllerRef.current;
    let sessionId = sessionIdRef.current;

    if (!controller || !sessionId) {
      sessionId = globalThis.crypto?.randomUUID?.();
      if (!sessionId) {
        setConnectionError("Audience display is unavailable in this browser.");
        setConnectionStatus("error");
        return;
      }

      try {
        controller = createPresentationControllerChannel({
          sessionId,
          validChartIds: validChartIdsRef.current,
          onConnectionChange: setConnectionStatus,
        });
        controller.start();
      } catch {
        controller?.dispose();
        setConnectionError("Audience display is unavailable in this browser.");
        setConnectionStatus("error");
        return;
      }

      controllerRef.current = controller;
      sessionIdRef.current = sessionId;
      setHasSession(true);
    }

    controller.publish(presentationState);
    const result = openAudienceWindow({ channelId: sessionId });
    if (result.status !== "opened") {
      setConnectionError("The audience display window was blocked.");
      setConnectionStatus("blocked");
      return;
    }

    audienceWindowRef.current = result.windowRef;
    setConnectionError("");
    setConnectionStatus("opening");
  }, []);

  const end = React.useCallback(() => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    sessionIdRef.current = null;
    controller?.end();

    const audienceWindow = audienceWindowRef.current;
    audienceWindowRef.current = null;
    if (audienceWindow && audienceWindow.closed !== true) {
      audienceWindow.close?.();
    }

    setHasSession(false);
    setConnectionError("");
    setConnectionStatus("ended");
  }, []);

  React.useEffect(() => () => {
    controllerRef.current?.end();
    if (audienceWindowRef.current?.closed !== true) {
      audienceWindowRef.current?.close?.();
    }
  }, []);

  return {
    displayState,
    onDisplayAction,
    connectionStatus,
    connectionError,
    hasSession,
    audienceFacts,
    setAudienceFactVisible,
    blackout,
    setBlackout,
    publish,
    open,
    end,
  };
}
