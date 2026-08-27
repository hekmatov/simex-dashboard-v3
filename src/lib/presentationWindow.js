import { presentationChannelName } from "./presentationProtocol.js";

export function openAudienceWindow({
  channelId,
  windowName,
  location = globalThis.window?.location,
  crypto = globalThis.crypto,
  openWindow = globalThis.window?.open?.bind(globalThis.window),
} = {}) {
  const resolvedChannelId = channelId ?? crypto?.randomUUID?.();
  presentationChannelName(resolvedChannelId);

  const url = new URL(String(location?.href ?? location));
  url.searchParams.set("mode", "present");
  url.searchParams.set("surface", "audience");
  url.searchParams.set("channel", resolvedChannelId);

  const audienceUrl = url.toString();
  const requestedWindowName = windowName ?? `simex-audience-${resolvedChannelId}`;
  const windowRef = openWindow?.(audienceUrl, requestedWindowName) ?? null;
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
  return {
    outcome: windowRef?.closed === true
      ? "succeeded"
      : "denied-surface-remains",
  };
}
