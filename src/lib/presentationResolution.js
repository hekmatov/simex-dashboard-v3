export const DEFAULT_PRESENTATION_RESOLUTION = Object.freeze({ width: 1920, height: 1080 });

export function resolvePresentationResolution(value = DEFAULT_PRESENTATION_RESOLUTION) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== 2 || !Object.hasOwn(value, "width") || !Object.hasOwn(value, "height")
    || !Number.isInteger(value.width) || !Number.isInteger(value.height)
    || value.width < 320 || value.height < 180 || value.width > 7680 || value.height > 7680
    || value.width * value.height > 7680 * 4320) {
    throw new Error("Presentation resolution requires integer width320–7680 and height180–7680, at most33 megapixels.");
  }
  return { width: value.width, height: value.height };
}

export function fitPresentationStage(resolution, viewport) {
  const { width, height } = resolvePresentationResolution(resolution);
  const availableWidth = Math.max(1, viewport?.width || width);
  const availableHeight = Math.max(1, viewport?.height || height);
  const scale = Math.min(availableWidth / width, availableHeight / height);
  return { width, height, scale, left: (availableWidth - width * scale) / 2, top: (availableHeight - height * scale) / 2 };
}
