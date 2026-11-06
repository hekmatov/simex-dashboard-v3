import { sanitizeAudienceSnapshotCloneColors } from "../../lib/audienceProjection.js";
import { MAX_AUDIENCE_FRAME_BYTES } from "../../lib/audienceFrameProtocol.js";

export function audienceSurfaceMetadata(element, windowRef = window) {
  if (!element) return null;
  const accepted_sequence = Number(element.dataset.audienceAcceptedSequence);
  if (!Number.isSafeInteger(accepted_sequence) || accepted_sequence < 1) return null;
  const bounds = element.getBoundingClientRect();
  const width = element.offsetWidth || bounds.width;
  const height = element.offsetHeight || bounds.height;
  if (!(width > 0 && height > 0)) return null;
  let dashboard_revision;
  try { dashboard_revision = JSON.parse(element.dataset.audienceDashboardRevision); } catch { return null; }
  return {
    accepted_sequence,
    dashboard_revision,
    viewport: { width: windowRef.innerWidth, height: windowRef.innerHeight, dpr: windowRef.devicePixelRatio || 1 },
    stage: { width, height, scale: bounds.width / width },
  };
}

export async function captureAudienceElement(element, readMetadata, { html2canvas, documentRef = document } = {}) {
  await documentRef.fonts?.ready;
  const capture = html2canvas ?? (await import("html2canvas")).default;
  // html2canvas clones synchronously when called, before asynchronous rasterization.
  const metadata = readMetadata();
  if (!metadata) return null;
  const canvas = await capture(element, {
    backgroundColor: documentRef.defaultView.getComputedStyle(element).getPropertyValue("--simex-surface-canvas").trim() || "#f4f5f5",
    width: metadata.stage.width, height: metadata.stage.height,
    windowWidth: metadata.viewport.width, windowHeight: metadata.viewport.height,
    scale: Math.min(1, 960 / metadata.stage.width), useCORS: true, logging: false,
    onclone(clonedDocument, clonedElement) {
      // The composition is laid out at its declared CSS size. Remove only the
      // outer letterbox transform when rasterizing that same composition.
      const presentation = clonedElement.closest?.(".audience-stage__presentation");
      if (presentation) Object.assign(presentation.style, { transform: "none", position: "fixed", left: "0", top: "0" });
      sanitizeAudienceSnapshotCloneColors(clonedDocument, clonedElement);
    },
  });
  const image = canvas.toDataURL("image/jpeg", 0.8);
  if (image.length > MAX_AUDIENCE_FRAME_BYTES) {
    const error = new Error("Audience frame exceeds the encoded size limit.");
    error.code = "frame-too-large";
    throw error;
  }
  return image;
}
