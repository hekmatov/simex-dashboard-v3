import { captureDashboardThemeProjection } from "../../theme/dashboardThemeRoot.js";

export const SOURCE_VIEWER_READY = "simex-source-viewer-ready";
export const SOURCE_VIEWER_LOAD = "simex-source-viewer-load";
export const SOURCE_VIEWER_VERSION = 1;

export function buildSourceViewerDescriptor(sourceId, source) {
  if (!source || typeof source !== "object") return null;
  const id = nonEmpty(sourceId);
  if (!id) return null;
  const label = nonEmpty(source.provenance?.label)
    ?? nonEmpty(source.fileName)
    ?? id;
  if (source.kind === "csv" && nonEmpty(source.path)) {
    return {
      version: SOURCE_VIEWER_VERSION,
      sourceId: id,
      label,
      mode: "path",
      path: `${baseUrl()}${source.path}`,
    };
  }
  if (source.type === "uploadedCsv" && typeof source.csvText === "string") {
    return {
      version: SOURCE_VIEWER_VERSION,
      sourceId: id,
      label,
      mode: "text",
      csvText: source.csvText,
    };
  }
  return null;
}

export function openSourceViewer({
  sourceId,
  source,
  windowTarget = window,
  onError = () => {},
} = {}) {
  const descriptor = buildSourceViewerDescriptor(sourceId, source);
  const themeProjection = captureDashboardThemeProjection(
    windowTarget.document?.querySelector?.(".app-frame"),
  );
  if (!descriptor) {
    onError("This source has no CSV file to display.");
    return null;
  }
  const viewer = windowTarget.open(
    `${baseUrl()}source-viewer.html`,
    `simex-source-${descriptor.sourceId}`,
    "popup,width=1180,height=760,resizable=yes,scrollbars=yes",
  );
  if (!viewer) {
    onError("The source-data window was blocked. Allow popups and try again.");
    return null;
  }
  const handleMessage = (event) => {
    if (
      event.origin !== windowTarget.location.origin
      || event.source !== viewer
      || event.data?.type !== SOURCE_VIEWER_READY
      || event.data?.version !== SOURCE_VIEWER_VERSION
    ) {
      return;
    }
    viewer.postMessage({
      type: SOURCE_VIEWER_LOAD,
      descriptor,
      themeProjection,
    }, windowTarget.location.origin);
    windowTarget.removeEventListener("message", handleMessage);
  };
  windowTarget.addEventListener("message", handleMessage);
  viewer.focus();
  return viewer;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function baseUrl() {
  return import.meta.env?.BASE_URL ?? "/";
}
