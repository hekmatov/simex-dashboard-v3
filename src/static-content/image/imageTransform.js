const FRAME_SIZE = 1000;
const FITS = new Set(["contain", "cover"]);

export function normalizeImageTransform(transform = {}) {
  const crop = normalizeCrop(transform.crop);
  return {
    crop,
    rotation: normalizeRotation(transform.rotation),
    fit: FITS.has(transform.fit) ? transform.fit : "contain",
  };
}

export function rotateImageCrop(crop, deltaDegrees = 90) {
  const normalized = normalizeCrop(crop);
  const turns = ((Math.round(deltaDegrees / 90) % 4) + 4) % 4;
  let result = normalized;
  for (let index = 0; index < turns; index += 1) {
    result = {
      x: FRAME_SIZE - result.y - result.height,
      y: result.x,
      width: result.height,
      height: result.width,
    };
  }
  return normalizeCrop(result);
}

export function nudgeImageCrop(crop, delta = {}) {
  const current = normalizeCrop(crop);
  const x = clamp(current.x + integer(delta.dx), 0, FRAME_SIZE - current.width);
  const y = clamp(current.y + integer(delta.dy), 0, FRAME_SIZE - current.height);
  const width = clamp(current.width + integer(delta.dWidth), 1, FRAME_SIZE - x);
  const height = clamp(current.height + integer(delta.dHeight), 1, FRAME_SIZE - y);
  return { x, y, width, height };
}

export function resetImageTransform() {
  return {
    crop: { x: 0, y: 0, width: FRAME_SIZE, height: FRAME_SIZE },
    rotation: 0,
    fit: "contain",
  };
}

function normalizeCrop(crop = {}) {
  const hasCoordinates = [crop.x, crop.y, crop.width, crop.height]
    .some((value) => Number.isFinite(Number(value)));
  if (!hasCoordinates) return resetImageTransform().crop;
  const x = clamp(integer(crop.x), 0, FRAME_SIZE - 1);
  const y = clamp(integer(crop.y), 0, FRAME_SIZE - 1);
  const width = clamp(integer(crop.width, FRAME_SIZE), 1, FRAME_SIZE - x);
  const height = clamp(integer(crop.height, FRAME_SIZE), 1, FRAME_SIZE - y);
  return { x, y, width, height };
}

function normalizeRotation(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric % 90 !== 0) return 0;
  return ((numeric % 360) + 360) % 360;
}

function integer(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
