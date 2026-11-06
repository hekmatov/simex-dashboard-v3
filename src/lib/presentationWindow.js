import { presentationChannelName } from "./presentationProtocol.js";
import { resolvePresentationResolution } from "./presentationResolution.js";

const AUDIENCE_WINDOW_FEATURES = "popup=yes,width=1280,height=800,resizable=yes,scrollbars=yes";

export function openAudienceWindow({
  channelId,
  windowName,
  location = globalThis.window?.location,
  crypto = globalThis.crypto,
  openWindow = globalThis.window?.open?.bind(globalThis.window),
  existingWindow,
  resolution,
} = {}) {
  const resolvedChannelId = channelId ?? crypto?.randomUUID?.();
  presentationChannelName(resolvedChannelId);

  const url = new URL(String(location?.href ?? location));
  url.searchParams.set("mode", "present");
  url.searchParams.set("surface", "audience");
  url.searchParams.set("channel", resolvedChannelId);

  const audienceUrl = url.toString();
  const requestedWindowName = windowName ?? `simex-audience-${resolvedChannelId}`;
  const target = resolution === undefined ? null : resolvePresentationResolution(resolution);
  const features = target ? `popup=yes,width=${target.width},height=${target.height},resizable=yes,scrollbars=yes` : AUDIENCE_WINDOW_FEATURES;
  const windowRef = openWindow?.(audienceUrl, requestedWindowName, features) ?? null;
  if (target && windowRef && windowRef === existingWindow) {
    // Opening an existing named popup can ignore its features. resizeTo uses outer dimensions.
    try {
      windowRef.resizeTo?.(
        target.width + (windowRef.outerWidth - windowRef.innerWidth),
        target.height + (windowRef.outerHeight - windowRef.innerHeight),
      );
    } catch {
      // Browser policy may deny access to the popup's geometry or resize method.
    }
  }
  return {
    status: windowRef ? "opened" : "blocked",
    windowRef,
    url: audienceUrl,
  };
}

export function requestAudienceWindowClose(windowRef) {
  try {
    windowRef?.close?.();
  } catch {
    // Browser policy may deny script-initiated closure.
  }
  try {
    return {
      outcome: windowRef?.closed === true
        ? "succeeded"
        : "denied-surface-remains",
    };
  } catch {
    return { outcome: "denied-surface-remains" };
  }
}

export function observeAudienceWindowClosure({ getWindow, onClosed, scheduler = window }) {
  let stopped = false;
  const stop = () => { if (!stopped) { stopped = true; scheduler.clearInterval(timer); } };
  const timer = scheduler.setInterval(() => {
    if (stopped) return;
    let closed = false;
    try { closed = getWindow()?.closed === true; } catch { return; }
    if (closed) { stop(); onClosed(); }
  }, 500);
  return stop;
}
