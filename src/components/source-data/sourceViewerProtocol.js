import { captureDashboardThemeProjection } from "../../theme/dashboardThemeRoot.js";

export const SOURCE_VIEWER_READY = "simex-source-viewer-ready";
export const SOURCE_VIEWER_LOAD = "simex-source-viewer-load";
export const SOURCE_VIEWER_RETURN = "simex-source-viewer-return";
export const SOURCE_VIEWER_VERSION = 2;

export function buildSourceViewerDescriptor(sourceId, source, context = {}) {
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
      invocation: viewerInvocation(context, id, source.path),
    };
  }
  if (source.type === "uploadedCsv" && typeof source.csvText === "string") {
    return {
      version: SOURCE_VIEWER_VERSION,
      sourceId: id,
      label,
      mode: "text",
      csvText: source.csvText,
      invocation: viewerInvocation(context, id, nonEmpty(source.fileName) ?? "Uploaded CSV"),
    };
  }
  return null;
}

export function openSourceViewer({
  sourceId,
  source,
  context,
  windowTarget = window,
  onReturn = () => {},
  onError = () => {},
} = {}) {
  const descriptor = buildSourceViewerDescriptor(sourceId, source, context);
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
  let returned = false;
  const restoreInvoker = () => {
    if (returned) return;
    returned = true;
    windowTarget.removeEventListener("message", handleMessage);
    onReturn();
  };
  const handleMessage = (event) => {
    if (
      event.origin !== windowTarget.location.origin
      || event.source !== viewer
      || event.data?.version !== SOURCE_VIEWER_VERSION
    ) {
      return;
    }
    if (event.data?.type === SOURCE_VIEWER_READY) {
      viewer.postMessage({
        type: SOURCE_VIEWER_LOAD,
        descriptor,
        themeProjection,
      }, windowTarget.location.origin);
    }
    if (event.data?.type === SOURCE_VIEWER_RETURN) restoreInvoker();
  };
  windowTarget.addEventListener("message", handleMessage);
  viewer.focus();
  return viewer;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function viewerInvocation(context, datasetId, csvPath) {
  return {
    chartId: nonEmpty(context?.chartId) ?? "Unknown chart",
    chartTitle: nonEmpty(context?.chartTitle) ?? "Unknown chart",
    variableId: nonEmpty(context?.variableId) ?? "Not configured",
    datasetId,
    csvPath,
  };
}

function baseUrl() {
  return import.meta.env?.BASE_URL ?? "/";
}
