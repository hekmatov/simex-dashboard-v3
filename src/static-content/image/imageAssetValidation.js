const MIB = 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SESSION_IMAGE_ASSET_KEY = Symbol.for("simex.session-image-assets");
const SESSION_IMAGE_ASSETS = globalThis[SESSION_IMAGE_ASSET_KEY] instanceof Map
  ? globalThis[SESSION_IMAGE_ASSET_KEY]
  : new Map();
globalThis[SESSION_IMAGE_ASSET_KEY] = SESSION_IMAGE_ASSETS;

export const IMAGE_ASSET_LIMITS = Object.freeze({
  maxBytes: 12 * MIB,
  maxDimension: 16_384,
  maxMegapixels: 50,
  dashboardBudgetBytes: 200 * MIB,
  dashboardWarningBytes: 160 * MIB,
});

export function authoredAssetManifestBytes(assets = {}) {
  return Object.values(assets).reduce(
    (total, entry) => total + finiteNonNegative(entry?.byteLength),
    0,
  );
}

export async function validateImageAsset(input = {}) {
  const warnings = [];
  const bytes = await readBytes(input.bytes ?? input.file);
  if (!bytes) return failed("missing-bytes", "Choose a PNG, JPEG, or WebP image.");
  if (bytes.byteLength > IMAGE_ASSET_LIMITS.maxBytes) {
    return failed("file-size-limit", "The image exceeds the 12 MiB encoded file limit.");
  }

  let inspected;
  try {
    inspected = inspectRaster(bytes);
  } catch (error) {
    return failed("corrupt-image", error.message || "The image payload is corrupt.");
  }
  if (!ALLOWED_MEDIA_TYPES.has(inspected.mediaType)) {
    return failed("unsupported-format", "Only PNG, JPEG, and WebP images are supported.");
  }
  const declared = normalizeMediaType(input.declaredMediaType ?? input.file?.type);
  if (declared && declared !== inspected.mediaType) {
    return failed("media-type-mismatch", "The declared image type does not match its file signature.");
  }
  const animation = inspectImageAnimation(bytes, inspected.mediaType);
  if (animation.animated) {
    const label = animation.kind === "apng" ? "APNG" : "Animated WebP";
    return failed("animated-image", `${label} is not supported; choose a single-frame raster image.`);
  }
  if (inspected.width > IMAGE_ASSET_LIMITS.maxDimension || inspected.height > IMAGE_ASSET_LIMITS.maxDimension) {
    return failed("dimension-limit", "The image exceeds the 16,384 px dimension limit.");
  }
  if ((inspected.width * inspected.height) > IMAGE_ASSET_LIMITS.maxMegapixels * 1_000_000) {
    return failed("megapixel-limit", "The decoded image exceeds the 50 megapixel limit.");
  }
  let decoded = input.decoded;
  if (!decoded && typeof input.decode === "function") {
    try {
      decoded = await input.decode(bytes, inspected.mediaType);
    } catch {
      return failed("decode-failed", "The image could not be decoded safely.");
    }
  }
  if (!decoded) {
    return failed("decoder-required", "The image must pass the browser decoder before it can be used.");
  }
  const decodedMediaType = normalizeMediaType(decoded.mediaType);
  if (
    decodedMediaType !== inspected.mediaType
    || decoded.width !== inspected.width
    || decoded.height !== inspected.height
  ) {
    return failed("decoded-metadata-mismatch", "Decoded image metadata does not match the encoded image.");
  }
  if (decoded.frameCount !== 1) {
    return failed("animated-image", "Animated images are not supported; choose a single-frame raster image.");
  }
  if (decoded.width > IMAGE_ASSET_LIMITS.maxDimension || decoded.height > IMAGE_ASSET_LIMITS.maxDimension) {
    return failed("dimension-limit", "The image exceeds the 16,384 px dimension limit.");
  }
  if ((decoded.width * decoded.height) > IMAGE_ASSET_LIMITS.maxMegapixels * 1_000_000) {
    return failed("megapixel-limit", "The decoded image exceeds the 50 megapixel limit.");
  }

  const currentAssetBytes = finiteNonNegative(input.currentAssetBytes);
  const projectedBytes = currentAssetBytes + bytes.byteLength;
  if (projectedBytes > IMAGE_ASSET_LIMITS.dashboardBudgetBytes) {
    return failed("product-budget", "The image would exceed the dashboard's 200 MiB authored-asset budget.");
  }
  if (
    Number.isFinite(input.browserQuotaAvailableBytes)
    && input.browserQuotaAvailableBytes < bytes.byteLength
  ) {
    return failed("browser-quota", "Browser storage quota is insufficient for this image.");
  }
  if (projectedBytes >= IMAGE_ASSET_LIMITS.dashboardWarningBytes) {
    warnings.push({
      code: "product-budget-warning",
      category: "quota-warning",
      message: "This dashboard has used at least 80% of its authored-asset budget.",
    });
  }
  return {
    ok: true,
    errors: [],
    warnings,
    asset: {
      mediaType: inspected.mediaType,
      byteLength: bytes.byteLength,
      width: decoded.width,
      height: decoded.height,
      frameCount: 1,
    },
  };
}

export async function decodeBrowserImageAsset(bytes, mediaType) {
  const blob = new Blob([bytes], { type: mediaType });
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const decoded = { mediaType, width: bitmap.width, height: bitmap.height, frameCount: 1 };
    bitmap.close?.();
    return decoded;
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { mediaType, width: image.naturalWidth, height: image.naturalHeight, frameCount: 1 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function stageSessionImageAsset(input = {}) {
  const browserQuotaAvailableBytes = await availableBrowserQuota(input.browserQuotaAvailableBytes);
  const accountedAssetIds = new Set(input.currentAssetIds ?? []);
  const aggregateAssetBytes = finiteNonNegative(input.currentAssetBytes)
    + sessionImageAssetBytes(accountedAssetIds);
  const filePreflight = preflightFile(input.file, {
    browserQuotaAvailableBytes,
    currentAssetBytes: aggregateAssetBytes,
  });
  if (filePreflight) return filePreflight;
  const bytes = await readBytes(input.bytes ?? input.file);
  const validation = await validateImageAsset({
    ...input,
    bytes,
    browserQuotaAvailableBytes,
    currentAssetBytes: aggregateAssetBytes,
  });
  if (!validation.ok) return validation;
  const immutableBytes = bytes.slice();
  const sha256 = await sha256Hex(immutableBytes);
  const assetId = `asset-${sha256}`;
  let entry = SESSION_IMAGE_ASSETS.get(assetId);
  if (!entry) {
    const blob = new Blob([immutableBytes], { type: validation.asset.mediaType });
    const url = typeof URL?.createObjectURL === "function"
      ? URL.createObjectURL(blob)
      : bytesDataUrl(immutableBytes, validation.asset.mediaType);
    entry = Object.freeze({
      url,
      bytes: immutableBytes,
      mediaType: validation.asset.mediaType,
      byteLength: immutableBytes.byteLength,
      width: validation.asset.width,
      height: validation.asset.height,
      sha256,
    });
    SESSION_IMAGE_ASSETS.set(assetId, entry);
  }
  return {
    ...validation,
    assetId,
    manifestEntry: {
      mediaType: entry.mediaType,
      byteLength: entry.byteLength,
      width: entry.width,
      height: entry.height,
      sha256: entry.sha256,
      storageState: "staged",
    },
  };
}

function preflightFile(file, { browserQuotaAvailableBytes, currentAssetBytes }) {
  if (!file || !Number.isFinite(file.size)) return null;
  if (file.size > IMAGE_ASSET_LIMITS.maxBytes) {
    return failed("file-size-limit", "The image exceeds the 12 MiB encoded file limit.");
  }
  if ((currentAssetBytes + file.size) > IMAGE_ASSET_LIMITS.dashboardBudgetBytes) {
    return failed("product-budget", "The image would exceed the dashboard's 200 MiB authored-asset budget.");
  }
  if (Number.isFinite(browserQuotaAvailableBytes) && browserQuotaAvailableBytes < file.size) {
    return failed("browser-quota", "Browser storage quota is insufficient for this image.");
  }
  return null;
}

async function availableBrowserQuota(explicit) {
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  try {
    const estimate = await globalThis.navigator?.storage?.estimate?.();
    if (Number.isFinite(estimate?.quota) && Number.isFinite(estimate?.usage)) {
      return Math.max(0, estimate.quota - estimate.usage);
    }
  } catch {
    // Validation still applies the fixed product budget when browser quota cannot be estimated.
  }
  return Number.POSITIVE_INFINITY;
}

function sessionImageAssetBytes(excludedAssetIds = new Set()) {
  let total = 0;
  for (const [assetId, entry] of SESSION_IMAGE_ASSETS.entries()) {
    if (!excludedAssetIds.has(assetId)) total += finiteNonNegative(entry?.byteLength);
  }
  return total;
}

export function resolveSessionImageAsset(assetId) {
  const entry = SESSION_IMAGE_ASSETS.get(assetId);
  if (!entry) return null;
  const { bytes: _bytes, ...resolved } = entry;
  return { ...resolved };
}

export function readSessionImageAssetBytes(assetId) {
  const entry = SESSION_IMAGE_ASSETS.get(assetId);
  if (!entry) return null;
  return {
    assetId,
    bytes: entry.bytes.slice(),
    mediaType: entry.mediaType,
    byteLength: entry.byteLength,
    width: entry.width,
    height: entry.height,
    sha256: entry.sha256,
  };
}

export function discardSessionImageAsset(assetId) {
  const entry = SESSION_IMAGE_ASSETS.get(assetId);
  if (!entry) return false;
  if (entry.url.startsWith("blob:") && typeof URL?.revokeObjectURL === "function") {
    URL.revokeObjectURL(entry.url);
  }
  SESSION_IMAGE_ASSETS.delete(assetId);
  return true;
}

export function discardUnreferencedSessionImageAssets(candidateAssetIds, retainedAssetIds = []) {
  const retainedSet = new Set(retainedAssetIds);
  const discarded = [];
  const retained = [];
  for (const assetId of new Set(candidateAssetIds)) {
    if (retainedSet.has(assetId)) {
      if (SESSION_IMAGE_ASSETS.has(assetId)) retained.push(assetId);
      continue;
    }
    if (discardSessionImageAsset(assetId)) discarded.push(assetId);
  }
  return { discarded, retained };
}

export function inspectImageAnimation(bytesInput, mediaType) {
  const bytes = asUint8Array(bytesInput);
  const normalized = normalizeMediaType(mediaType);
  if (normalized === "image/png") {
    const chunks = readPngChunks(bytes);
    const animation = chunks.find(({ type }) => type === "acTL");
    return animation
      ? {
          animated: true,
          frameCount: animation.data.byteLength >= 4
            ? new DataView(animation.data.buffer, animation.data.byteOffset, animation.data.byteLength).getUint32(0)
            : null,
          kind: "apng",
        }
      : { animated: false, frameCount: 1, kind: "single-frame" };
  }
  if (normalized === "image/webp") {
    const chunks = readWebpChunks(bytes);
    const extended = chunks.find(({ type }) => type === "VP8X");
    const animated = Boolean(extended?.data?.[0] & 0x02)
      || chunks.some(({ type }) => type === "ANIM" || type === "ANMF");
    return animated
      ? { animated: true, frameCount: null, kind: "animated-webp" }
      : { animated: false, frameCount: 1, kind: "single-frame" };
  }
  return { animated: false, frameCount: 1, kind: "single-frame" };
}

export function validateImageOrigin(origin) {
  if (!origin || typeof origin !== "object" || Array.isArray(origin)) {
    throw new TypeError("Image origin must be an object.");
  }
  if (origin.kind === "asset") {
    const assetId = requiredText(origin.assetId, "Image asset id");
    return { kind: "asset", assetId, networkDependent: false };
  }
  if (origin.kind === "url") {
    const url = requiredText(origin.url, "Image URL");
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Image URL must be a valid https URL.");
    }
    if (parsed.protocol !== "https:") throw new Error("Image URL must use https.");
    return { kind: "url", url: parsed.href, networkDependent: true };
  }
  if (origin.kind === "package") {
    const path = requiredText(origin.path, "Image package path");
    const normalized = path.replaceAll("\\", "/");
    if (
      normalized.startsWith("/")
      || /^[a-z]:/i.test(normalized)
      || normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
      || /%(?:2e|2f|5c)/i.test(normalized)
    ) {
      throw new Error("Image package path must be a safe dashboard-owned relative path.");
    }
    return { kind: "package", path: normalized, networkDependent: false };
  }
  if (origin.kind === "replacementRequired") {
    return {
      kind: "replacementRequired",
      reason: requiredText(origin.reason, "Image replacement reason"),
      networkDependent: false,
    };
  }
  throw new Error(`Unknown image origin "${String(origin.kind)}".`);
}

function inspectRaster(bytes) {
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    const chunks = readPngChunks(bytes);
    const header = chunks[0];
    const imageDataIndex = chunks.findIndex(({ type }) => type === "IDAT");
    const endIndex = chunks.findIndex(({ type }) => type === "IEND");
    if (
      header?.type !== "IHDR"
      || header.data.byteLength !== 13
      || imageDataIndex <= 0
      || endIndex <= imageDataIndex
      || endIndex !== chunks.length - 1
    ) {
      throw new Error("The PNG structure is incomplete.");
    }
    const view = new DataView(header.data.buffer, header.data.byteOffset, header.data.byteLength);
    return dimensions("image/png", view.getUint32(0), view.getUint32(4));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return inspectJpeg(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return inspectWebp(bytes);
  throw new Error("The file signature is not a supported raster image.");
}

function inspectJpeg(bytes) {
  let offset = 2;
  let size = null;
  let ended = false;
  let scanCount = 0;
  let pendingMarker = null;
  while (pendingMarker !== null || offset < bytes.byteLength) {
    let marker = pendingMarker;
    pendingMarker = null;
    if (marker === null) {
      if (bytes[offset] !== 0xff) throw new Error("The JPEG segment structure is corrupt.");
      while (bytes[offset] === 0xff) offset += 1;
      marker = bytes[offset];
      offset += 1;
    }
    if (marker === 0xd9) {
      ended = true;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.byteLength) throw new Error("The JPEG segment is truncated.");
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.byteLength) throw new Error("The JPEG segment is truncated.");
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 7) throw new Error("The JPEG dimensions are corrupt.");
      size = dimensions("image/jpeg", (bytes[offset + 5] << 8) | bytes[offset + 6], (bytes[offset + 3] << 8) | bytes[offset + 4]);
    }
    offset += length;
    if (marker === 0xda) {
      scanCount += 1;
      const next = nextJpegEntropyMarker(bytes, offset);
      pendingMarker = next.marker;
      offset = next.offset;
    }
  }
  if (!ended || !size || scanCount === 0) throw new Error("The JPEG structure is incomplete.");
  return size;
}

function nextJpegEntropyMarker(bytes, start) {
  let offset = start;
  while (offset < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    return { marker, offset };
  }
  throw new Error("The JPEG scan data is truncated.");
}

function inspectWebp(bytes) {
  const chunks = readWebpChunks(bytes);
  const chunk = chunks.find(({ type }) => ["VP8X", "VP8 ", "VP8L"].includes(type));
  if (!chunk) throw new Error("The WebP image header is missing.");
  if (!chunks.some(({ type }) => type === "VP8 " || type === "VP8L" || type === "ANMF")) {
    throw new Error("The WebP image payload is missing.");
  }
  if (chunk.type === "VP8X") {
    if (chunk.data.byteLength < 10) throw new Error("The WebP extended header is truncated.");
    return dimensions(
      "image/webp",
      1 + uint24le(chunk.data, 4),
      1 + uint24le(chunk.data, 7),
    );
  }
  if (chunk.type === "VP8L") {
    if (chunk.data.byteLength < 5 || chunk.data[0] !== 0x2f) throw new Error("The lossless WebP header is corrupt.");
    const packed = new DataView(chunk.data.buffer, chunk.data.byteOffset + 1, 4).getUint32(0, true);
    return dimensions("image/webp", (packed & 0x3fff) + 1, ((packed >> 14) & 0x3fff) + 1);
  }
  if (chunk.data.byteLength < 10 || chunk.data[3] !== 0x9d || chunk.data[4] !== 0x01 || chunk.data[5] !== 0x2a) {
    throw new Error("The lossy WebP header is corrupt.");
  }
  return dimensions(
    "image/webp",
    (chunk.data[6] | (chunk.data[7] << 8)) & 0x3fff,
    (chunk.data[8] | (chunk.data[9] << 8)) & 0x3fff,
  );
}

function readPngChunks(bytes) {
  if (!matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    throw new Error("The PNG signature is invalid.");
  }
  const chunks = [];
  let offset = 8;
  while (offset < bytes.byteLength) {
    if (offset + 12 > bytes.byteLength) throw new Error("The PNG chunk is truncated.");
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) throw new Error("The PNG chunk is truncated.");
    const type = ascii(bytes, offset + 4, 4);
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset = end;
    if (type === "IEND") {
      if (offset !== bytes.byteLength) throw new Error("The PNG has trailing payload after IEND.");
      break;
    }
  }
  return chunks;
}

function readWebpChunks(bytes) {
  if (bytes.byteLength < 12 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    throw new Error("The WebP signature is invalid.");
  }
  const declaredSize = new DataView(bytes.buffer, bytes.byteOffset + 4, 4).getUint32(0, true) + 8;
  if (declaredSize !== bytes.byteLength) throw new Error("The WebP RIFF length is corrupt.");
  const chunks = [];
  let offset = 12;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) throw new Error("The WebP chunk is truncated.");
    const type = ascii(bytes, offset, 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const dataEnd = offset + 8 + length;
    if (dataEnd > bytes.byteLength) throw new Error("The WebP chunk is truncated.");
    chunks.push({ type, data: bytes.subarray(offset + 8, dataEnd) });
    offset = dataEnd + (length % 2);
  }
  return chunks;
}

async function readBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value?.arrayBuffer === "function") return new Uint8Array(await value.arrayBuffer());
  return null;
}

function asUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError("Image bytes are required.");
}

function dimensions(mediaType, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("The image dimensions are invalid.");
  }
  return { mediaType, width, height };
}

function failed(code, message) {
  return {
    ok: false,
    errors: [{ code, category: classify(code), message }],
    warnings: [],
    asset: null,
  };
}

function classify(code) {
  if (code === "product-budget") return "product-quota";
  if (code === "browser-quota") return "browser-quota";
  if (code.endsWith("limit")) return "resource-limit";
  if (code === "animated-image" || code === "unsupported-format") return "unsupported-format";
  return "invalid-image";
}

function normalizeMediaType(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
  return value.trim();
}

function matches(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint24le(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function bytesDataUrl(bytes, mediaType) {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return `data:${mediaType};base64,${btoa(binary)}`;
}
