import {
  isDashboardMode,
} from "./dashboardMode.js";

const CHANNEL_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function parseDashboardEntry(search = "") {
  const parameters = new URLSearchParams(search);
  const surface = parameters.get("surface");

  if (surface === "audience") {
    const channel = parameters.get("channel");
    const channelId = CHANNEL_ID_PATTERN.test(channel ?? "") ? channel : null;
    return {
      surface: "audience",
      requestedMode: "present",
      channelId,
      issue: channelId ? null : "invalid_channel",
    };
  }

  const requestedMode = parameters.get("mode");
  return {
    surface: "workspace",
    requestedMode: isDashboardMode(requestedMode)
      ? requestedMode
      : null,
    channelId: null,
    issue: requestedMode && !isDashboardMode(requestedMode)
      ? "invalid_mode"
      : null,
  };
}

export function reconcileActivePageId(pages, requestedId) {
  const validPages = Array.isArray(pages) ? pages : [];
  if (validPages.some(({ id }) => id === requestedId)) return requestedId;
  return validPages[0]?.id ?? null;
}
