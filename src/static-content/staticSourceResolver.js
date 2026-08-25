import {
  validateAuthoredAssetManifest,
  validateStaticImageSource,
  validateStaticTextSource,
} from "./staticSourceSchema.js";
import { resolveBrowserAuthoredAsset } from "./assets/browserAuthoredAssetRuntime.js";
import { validateMediaItem } from "../content-library/mediaItems.js";

export function resolveStaticSource(source, options = {}) {
  if (source?.kind === "staticText") return resolveStaticTextSource(source, options);
  if (source?.kind === "staticImage") return resolveStaticImageSource(source, options);
  return failureModel({
    kind: source?.kind ?? "unknown",
    sourceId: options.sourceId,
    revision: source?.revision ?? null,
    code: "unsupported-source",
    message: "This static content source is unsupported.",
    retryable: false,
  });
}

export function resolveStaticTextSource(source, { sourceId = null } = {}) {
  try {
    validateStaticTextSource(source);
    return {
      status: "ready",
      kind: "staticText",
      sourceId,
      revision: source.revision,
      renderingPolicy: source.renderingPolicy,
      qmd: source.qmd,
    };
  } catch (error) {
    return failureModel({
      kind: "staticText",
      sourceId,
      revision: source?.revision ?? null,
      code: "invalid-source",
      message: error.message,
      retryable: false,
    });
  }
}

export function resolveStaticImageSource(source, {
  sourceId = null,
  mediaItems = {},
  assets = {},
  resolveAsset = resolveBrowserAuthoredAsset,
  expectedRevision,
} = {}) {
  try {
    validateStaticImageSource(source);
  } catch (error) {
    return failureModel({
      kind: "staticImage",
      sourceId,
      mediaId: source?.mediaId ?? null,
      revision: null,
      code: "invalid-source",
      message: error.message,
      retryable: false,
    });
  }

  const mediaItem = mediaItems?.[source.mediaId];
  if (!mediaItem) {
    return failureModel({
      kind: "staticImage", sourceId, mediaId: source.mediaId, revision: null,
      code: "missing-media", message: "The saved media identity is unavailable.", retryable: true,
    });
  }
  try {
    validateMediaItem(mediaItem, { assets });
  } catch (error) {
    return failureModel({
      kind: "staticImage", sourceId, mediaId: source.mediaId, revision: mediaItem?.revision ?? null,
      code: "invalid-media", message: error.message, retryable: false,
    });
  }
  if (expectedRevision !== undefined && mediaItem.revision !== expectedRevision) {
    return failureModel({
      kind: "staticImage", sourceId, mediaId: source.mediaId, revision: mediaItem.revision,
      code: "stale-media-revision", message: "The saved image revision has changed.", retryable: true,
    });
  }
  if (["missing", "corrupt", "needs-relink"].includes(mediaItem.health)) {
    return failureModel({
      kind: "staticImage", sourceId, mediaId: source.mediaId, revision: mediaItem.revision,
      code: mediaItem.health === "needs-relink" ? "replacement-required" : `${mediaItem.health}-asset`,
      message: "The saved image asset is unavailable.", retryable: mediaItem.health !== "needs-relink",
    });
  }

  let url;
  const current = mediaItem.current;
  if (current.kind === "asset") {
    try {
      validateAuthoredAssetManifest(assets);
    } catch (error) {
      return failureModel({
        kind: "staticImage",
        sourceId,
        mediaId: source.mediaId,
        revision: mediaItem.revision,
        code: "invalid-manifest",
        message: error.message,
        retryable: false,
      });
    }
    const entry = assets[current.assetId];
    if (!entry || entry.storageState === "missing") {
      return failureModel({
        kind: "staticImage",
        sourceId,
        mediaId: source.mediaId,
        revision: mediaItem.revision,
        code: "missing-asset",
        message: "The saved image asset is unavailable.",
        retryable: true,
      });
    }
    if (typeof resolveAsset !== "function") {
      return failureModel({
        kind: "staticImage",
        sourceId,
        mediaId: source.mediaId,
        revision: mediaItem.revision,
        code: "asset-resolver-unavailable",
        message: "The saved image cannot be opened on this surface.",
        retryable: true,
      });
    }
    try {
      const resolved = resolveAsset(current.assetId, entry);
      if (resolved && typeof resolved.then === "function") {
        return resolved.then(
          (asset) => resolvedImageAssetModel(source, mediaItem, sourceId, asset, entry),
          () => imageAssetReadFailure(source, mediaItem, sourceId),
        );
      }
      url = resolved?.url;
      if (typeof url !== "string" || url === "") throw new Error("Asset URL is unavailable.");
      return readyImageModel(source, mediaItem, sourceId, url, entry, resolved);
    } catch {
      return imageAssetReadFailure(source, mediaItem, sourceId);
    }
  } else if (current.kind === "url") url = current.url;
  else url = current.path;

  return readyImageModel(source, mediaItem, sourceId, url, null);
}

function resolvedImageAssetModel(source, mediaItem, sourceId, asset, manifestEntry) {
  return typeof asset?.url === "string" && asset.url
    ? readyImageModel(source, mediaItem, sourceId, asset.url, manifestEntry, asset)
    : imageAssetReadFailure(source, mediaItem, sourceId);
}

function readyImageModel(source, mediaItem, sourceId, url, intrinsic = null, lease = null) {
  return {
    status: "ready",
    kind: "staticImage",
    sourceId,
    mediaId: source.mediaId,
    revision: mediaItem.revision,
    url,
    src: url,
    alt: source.decorative ? "" : source.alt,
    decorative: source.decorative,
    fit: source.fit,
    crop: structuredClone(source.crop),
    rotation: source.rotation,
    width: positiveDimension(intrinsic?.width ?? mediaItem.dimensions?.width),
    height: positiveDimension(intrinsic?.height ?? mediaItem.dimensions?.height),
    networkDependent: mediaItem.current.kind === "url",
    containedPackagePath: mediaItem.current.kind === "package",
    ...(typeof lease?.release === "function" ? { release: lease.release } : {}),
  };
}

function positiveDimension(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function imageAssetReadFailure(source, mediaItem, sourceId) {
  return failureModel({
    kind: "staticImage",
    sourceId,
    mediaId: source.mediaId,
    revision: mediaItem.revision,
    code: "asset-read-failed",
    message: "The saved image asset could not be read.",
    retryable: true,
  });
}

function failureModel({ kind, sourceId, mediaId, revision, code, message, retryable }) {
  return {
    status: "error",
    kind,
    sourceId,
    ...(mediaId !== undefined ? { mediaId } : {}),
    revision,
    failure: { code, message, retryable },
  };
}
