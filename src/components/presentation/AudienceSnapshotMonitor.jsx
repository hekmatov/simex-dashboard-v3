import React from "react";
import { projectPresentationState } from "../../lib/audienceProjection.js";
import { fitPresentationStage, resolvePresentationResolution } from "../../lib/presentationResolution.js";
import { dashboardThemeRootProps } from "../../theme/dashboardThemeRoot.js";
import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";
import AudienceDisplay from "./AudienceDisplay.jsx";

export function audienceMonitorView({ connectionStatus, stream, frame, hasLocalPreview = false, now = Date.now() }) {
  const status = stream?.status ?? "waiting";
  if (connectionStatus === "connected" && !["unavailable", "disconnected"].includes(status) && frame) {
    if (status === "hidden") return { source: "audience", status, caption: "Last Audience frame · Audience hidden" };
    const pending = (stream?.requestedSequence ?? 0) > frame.accepted_sequence || (stream?.acceptedSequence ?? 0) > frame.accepted_sequence;
    if (pending) return { source: "audience", status: "pending", caption: "Audience display · requested update pending" };
    if (status === "static") return { source: "audience", status, caption: `Audience display static since ${new Date(stream.since).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` };
    const age = Math.max(0, now - (stream?.receivedAt ?? frame.capturedAt));
    return { source: "audience", status: age > 5000 ? "stale" : "fresh", caption: age > 5000 ? "Last Audience frame · awaiting capture" : `Audience display · updated ${Math.floor(age / 1000)}s ago` };
  }
  const reason = status === "disconnected" ? "Audience connection lost" : connectionStatus === "connected" ? "Audience capture unavailable" : "no Audience connected";
  if (hasLocalPreview) return { source: "local", status, caption: `Local preview · ${reason}` };
  if (frame) return { source: "retained", status: "disconnected", caption: `Last Audience frame · ${connectionStatus === "connected" ? "capture unavailable" : "disconnected"}` };
  return { source: "local", status, caption: `Local preview · ${reason}` };
}

export default function AudienceSnapshotMonitor({ dashboard, connectionStatus = "disconnected", connectionLabel,
  presentationState, stream, targetResolution, themeProjection, contentRenderContext, children }) {
  const [frame, setFrame] = React.useState(() => stream?.frame ?? null);
  const [decodeFailed, setDecodeFailed] = React.useState(false);
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => {
    const candidate = stream?.frame;
    if (!candidate || candidate === frame) return undefined;
    let cancelled = false;
    const image = new Image();
    image.onload = () => { if (!cancelled && image.naturalWidth > 0) { setFrame(candidate); setDecodeFailed(false); } };
    image.onerror = () => { if (!cancelled) setDecodeFailed(true); };
    image.src = candidate.image;
    return () => { cancelled = true; image.onload = null; image.onerror = null; image.src = ""; };
  }, [stream?.frame]);
  React.useEffect(() => {
    if (!frame || ["static", "hidden"].includes(stream?.status)) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [frame, stream?.status]);
  const effectiveStream = decodeFailed ? { ...stream, status: "unavailable" } : stream;
  const hasLocalPreview = Boolean(dashboard && presentationState);
  const view = audienceMonitorView({ connectionStatus, stream: effectiveStream, frame, hasLocalPreview, now });
  const stage = (view.source === "local" ? stream?.stage : frame?.stage) ?? stream?.stage ?? resolvePresentationResolution(targetResolution);
  const viewport = frame?.viewport ?? stream?.viewport;
  return <section className="audience-snapshot-monitor" aria-label="Audience scene monitor"
    {...dashboardOwnedRegionProps("audience-snapshot-monitor")}
    data-monitor-source={view.source} data-monitor-status={view.status}
    data-frame-revision={view.source !== "local" ? frame?.revision : undefined}
    data-viewport-width={viewport?.width} data-viewport-height={viewport?.height}
    data-accepted-sequence={view.source !== "local" ? frame?.accepted_sequence : undefined}
    data-requested-sequence={stream?.requestedSequence}>
    <div className="audience-snapshot-heading"><span>{view.source === "local" ? "Local preview" : "Audience monitor"}</span>
      <strong title={view.caption} aria-label={view.caption}>{view.status === "hidden" ? "Audience hidden"
        : view.status === "static" ? "Audience static" : view.status === "pending" ? "Audience update pending"
          : view.status === "unavailable" ? "Audience capture unavailable"
            : view.status === "disconnected" ? "Audience disconnected" : connectionLabel}</strong></div>
    <div className="audience-snapshot-frame" style={{ aspectRatio: `${stage.width} / ${stage.height}` }}>
      {view.source !== "local" && frame ? <img src={frame.image} alt="Captured Audience stage" />
        : hasLocalPreview ? <LocalAudiencePreview dashboard={dashboard} presentationState={presentationState} stage={stage}
            themeProjection={themeProjection} contentRenderContext={contentRenderContext} /> : <p>No scene selected</p>}
    </div>
    {children ? <div className="audience-snapshot-controls">{children}</div> : <>
    <p className="audience-snapshot-caption" role="status">{view.caption}</p>
    <p className="audience-snapshot-resolution">{stage.width} × {stage.height} stage
      {viewport && ` · ${viewport.width} × ${viewport.height} viewport · DPR ${viewport.dpr}`}</p></>}
  </section>;
}

function LocalAudiencePreview({ dashboard, presentationState, stage, themeProjection, contentRenderContext }) {
  const viewportRef = React.useRef(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useLayoutEffect(() => {
    const measure = () => setSize({ width: viewportRef.current?.clientWidth ?? 0, height: viewportRef.current?.clientHeight ?? 0 });
    measure();
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);
  // Passive local projection only while the real stream is unavailable.
  // No local capture loop, timer or playback owner competes with Audience.
  const fitted = fitPresentationStage({ width: stage.width, height: stage.height },
    { width: Math.max(1, size.width), height: Math.max(1, size.height) });
  return <div ref={viewportRef} className="audience-local-viewport" aria-hidden="true" inert>
    <div className="audience-local-preview audience-theme-root" {...dashboardThemeRootProps(themeProjection)}
      style={{ ...dashboardThemeRootProps(themeProjection).style, width: stage.width, height: stage.height,
        left: fitted.left, top: fitted.top, transform: `scale(${fitted.scale})`, transformOrigin: "top left" }}>
      <AudienceDisplay dashboard={dashboard} connectionStatus="local"
        projection={projectPresentationState(presentationState)} contentRenderContext={contentRenderContext} />
    </div>
  </div>;
}
