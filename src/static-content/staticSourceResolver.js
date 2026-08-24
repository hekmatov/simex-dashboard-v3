import {
  validateAuthoredAssetManifest,
  validateStaticImageSource,
  validateStaticTextSource,
} from "./staticSourceSchema.js";

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

export async function resolveStaticImageSource(source, {
  sourceId = null,
  assets = {},
  resolveAsset,
} = {}) {
  try {
    validateStaticImageSource(source);
  } catch (error) {
    return failureModel({
      kind: "staticImage",
      sourceId,
      revision: source?.revision ?? null,
      code: "invalid-source",
      message: error.message,
      retryable: false,
    });
  }

  let url;
  if (source.origin.kind === "asset") {
    try {
      validateAuthoredAssetManifest(assets);
    } catch (error) {
      return failureModel({
        kind: "staticImage",
        sourceId,
        revision: source.revision,
        code: "invalid-manifest",
        message: error.message,
        retryable: false,
      });
    }
    const entry = assets[source.origin.assetId];
    if (!entry || entry.storageState === "missing") {
      return failureModel({
        kind: "staticImage",
        sourceId,
        revision: source.revision,
        code: "missing-asset",
        message: "The saved image asset is unavailable.",
        retryable: true,
      });
    }
    if (typeof resolveAsset !== "function") {
      return failureModel({
        kind: "staticImage",
        sourceId,
        revision: source.revision,
        code: "asset-resolver-unavailable",
        message: "The saved image cannot be opened on this surface.",
        retryable: true,
      });
    }
    try {
      const resolved = await resolveAsset(source.origin.assetId, entry);
      url = resolved?.url;
      if (typeof url !== "string" || url === "") throw new Error("Asset URL is unavailable.");
    } catch {
      return failureModel({
        kind: "staticImage",
        sourceId,
        revision: source.revision,
        code: "asset-read-failed",
        message: "The saved image asset could not be read.",
        retryable: true,
      });
    }
  } else if (source.origin.kind === "url") {
    url = source.origin.url;
  } else if (source.origin.kind === "package") {
    url = source.origin.path;
  } else {
    return failureModel({
      kind: "staticImage",
      sourceId,
      revision: source.revision,
      code: "replacement-required",
      message: "This image must be replaced before it can be displayed.",
      retryable: false,
    });
  }

  return {
    status: "ready",
    kind: "staticImage",
    sourceId,
    revision: source.revision,
    url,
    alt: source.decorative ? "" : source.alt,
    decorative: source.decorative,
    fit: source.fit,
    crop: structuredClone(source.crop),
    rotation: source.rotation,
    networkDependent: source.origin.kind === "url",
  };
}

function failureModel({ kind, sourceId, revision, code, message, retryable }) {
  return {
    status: "error",
    kind,
    sourceId,
    revision,
    failure: { code, message, retryable },
  };
}
