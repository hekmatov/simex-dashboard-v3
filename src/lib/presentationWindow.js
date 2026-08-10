import { presentationChannelName } from "./presentationProtocol.js";

export function openAudienceWindow({
  channelId,
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
  const windowRef = openWindow?.(audienceUrl, "simex-audience") ?? null;
  return {
    status: windowRef ? "opened" : "blocked",
    windowRef,
    url: audienceUrl,
  };
}
