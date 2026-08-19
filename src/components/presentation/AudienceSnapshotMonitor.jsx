import React from "react";
import { createPortal } from "react-dom";

import AudienceDisplay from "./AudienceDisplay.jsx";

const CAPTURE_SETTLE_MS = 200;
const IDLE_DEBOUNCE_MS = 160;
const PLAYING_CAPTURE_INTERVAL_MS = 2_000;
const EMPTY_THEME_PROJECTION = Object.freeze({
  dashboardStyle: undefined,
  dashboardColorProfile: undefined,
  resolvedAppearance: undefined,
  cssVariables: Object.freeze({}),
  key: "",
});

export default function AudienceSnapshotMonitor({
  dashboard,
  connectionLabel,
  presentationState,
  playing,
  themeProjection = EMPTY_THEME_PROJECTION,
}) {
  const [imageUrl, setImageUrl] = React.useState("");
  const [captureSource, setCaptureSource] = React.useState(null);
  const [captureUnavailable, setCaptureUnavailable] = React.useState(false);
  const sourceRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const timerKindRef = React.useRef(null);
  const captureRunningRef = React.useRef(false);
  const pendingCaptureRef = React.useRef(false);
  const lastCaptureAtRef = React.useRef(0);
  const imageUrlRef = React.useRef(imageUrl);
  imageUrlRef.current = imageUrl;
  const latestRef = React.useRef({ dashboard, presentationState, playing, themeProjection });
  latestRef.current = { dashboard, presentationState, playing, themeProjection };

  const startCapture = React.useCallback(() => {
    timerRef.current = null;
    timerKindRef.current = null;
    if (captureRunningRef.current) {
      pendingCaptureRef.current = true;
      return;
    }
    captureRunningRef.current = true;
    pendingCaptureRef.current = false;
    setCaptureSource({
      dashboard: latestRef.current.dashboard,
      presentationState: latestRef.current.presentationState,
      themeProjection: latestRef.current.themeProjection,
    });
  }, []);

  const requestCapture = React.useCallback((delay, { urgent = false } = {}) => {
    pendingCaptureRef.current = true;
    if (!urgent && timerKindRef.current === "urgent") return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerKindRef.current = urgent ? "urgent" : "time";
    timerRef.current = window.setTimeout(startCapture, Math.max(0, delay));
  }, [startCapture]);

  const structureKey = React.useMemo(() => JSON.stringify({
    activePageId: presentationState.active_page_id,
    chartIds: presentationState.displayed_chart_ids,
    layout: presentationState.layout,
    audienceFacts: presentationState.audience_facts,
    blackout: presentationState.blackout,
  }), [presentationState]);
  const timeKey = `${presentationState.time?.group_id ?? ""}:${presentationState.time?.active_epoch_ms ?? ""}`;

  React.useEffect(() => {
    requestCapture(IDLE_DEBOUNCE_MS, { urgent: true });
  }, [requestCapture, structureKey, themeProjection.key]);

  React.useEffect(() => {
    const elapsed = Date.now() - lastCaptureAtRef.current;
    requestCapture(playing
      ? Math.max(0, PLAYING_CAPTURE_INTERVAL_MS - elapsed)
      : IDLE_DEBOUNCE_MS);
  }, [playing, requestCapture, timeKey]);

  React.useEffect(() => {
    if (!captureSource) return undefined;
    let cancelled = false;
    const settleTimer = window.setTimeout(async () => {
      try {
        const { default: html2canvas } = await import("html2canvas");
        if (cancelled || !sourceRef.current) return;
        const canvas = await html2canvas(sourceRef.current, {
          backgroundColor: "#f7f9fc",
          height: 720,
          logging: false,
          scale: 0.25,
          useCORS: true,
          width: 1280,
          windowHeight: 720,
          windowWidth: 1280,
        });
        if (!cancelled) {
          setImageUrl(canvas.toDataURL("image/jpeg", 0.78));
          setCaptureUnavailable(false);
        }
      } catch {
        if (!cancelled && !imageUrlRef.current) setCaptureUnavailable(true);
      } finally {
        if (!cancelled) {
          lastCaptureAtRef.current = Date.now();
          captureRunningRef.current = false;
          setCaptureSource(null);
          if (pendingCaptureRef.current && timerRef.current === null) {
            const delay = latestRef.current.playing
              ? PLAYING_CAPTURE_INTERVAL_MS
              : IDLE_DEBOUNCE_MS;
            requestCapture(delay);
          }
        }
      }
    }, CAPTURE_SETTLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(settleTimer);
    };
  }, [captureSource, requestCapture]);

  React.useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <section className="audience-snapshot-monitor" aria-label="Audience scene monitor">
      <div className="audience-snapshot-heading">
        <span>Audience monitor</span>
        <strong>{connectionLabel}</strong>
      </div>
      <div className="audience-snapshot-frame">
        {imageUrl ? (
          <img src={imageUrl} alt="Current audience scene" />
        ) : (
          <p>{captureUnavailable ? "Preview unavailable" : "Preparing preview"}</p>
        )}
      </div>
      {captureSource && createPortal(
        <div
          ref={sourceRef}
          className="audience-snapshot-source"
          aria-hidden="true"
          inert
          data-dashboard-style={captureSource.themeProjection.dashboardStyle}
          data-dashboard-color-profile={captureSource.themeProjection.dashboardColorProfile}
          data-resolved-appearance={captureSource.themeProjection.resolvedAppearance}
          style={captureSource.themeProjection.cssVariables}
        >
          <AudienceDisplay
            dashboard={captureSource.dashboard}
            connectionStatus="connected"
            presentationState={captureSource.presentationState}
          />
        </div>,
        document.body,
      )}
    </section>
  );
}
