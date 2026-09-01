import React from "react";

import { createMediaItem, validateMediaItem } from "../../content-library/mediaItems.js";
import {
  authoredAssetManifestBytes,
  decodeBrowserImageAsset,
  resolveSessionImageAsset,
  stageSessionImageAsset,
} from "../../static-content/image/imageAssetValidation.js";

let fallbackMediaSequence = 0;

export default function MediaPicker({
  mediaItems = {},
  assets = {},
  mode = "qmd",
  action = "insert",
  disabled = false,
  onSelect,
  onCreateLocal,
  onCancel,
} = {}) {
  const groups = partitionMediaPickerItems(mediaItems, { mode });
  const [importingId, setImportingId] = React.useState(null);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const acceptFile = async (file, externalItem = null) => {
    if (!file || disabled) return;
    setBusy(true);
    setError("");
    setStatus("Validating local media…");
    try {
      const candidate = await stageLocalMediaFile({
        file,
        assets,
        displayName: file.name || externalItem?.displayName || "Imported media",
        defaultDescription: externalItem?.defaultDescription || file.name || "Imported media",
      });
      await onCreateLocal?.(candidate, { externalItem });
      setStatus(`${candidate.mediaItem.displayName} is ready in this panel draft.`);
      setImportingId(null);
    } catch (caught) {
      setError(caught?.message ?? "The image could not be imported.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const importDirect = async (item) => {
    if (disabled) return;
    setBusy(true);
    setError("");
    setStatus("Requesting the external image from this browser…");
    try {
      const file = await importExternalMediaFile(item);
      await acceptFile(file, item);
    } catch (caught) {
      setError(caught?.message ?? "Direct import failed. Choose a local file upload instead.");
      setStatus("");
      setBusy(false);
    }
  };

  return (
    <section className="source-content-detail-card" aria-label="Media picker">
      <header>
        <h3>{mode === "qmd" ? (action === "change" ? "Change image" : "Insert image") : "Choose image"}</h3>
        <p>{mode === "qmd" ? "Choose portable local media or import an External item first." : "Choose any dashboard media item, including an External HTTPS image."}</p>
      </header>
      <section data-media-source-path="existing">
        <h4>Use existing dashboard media</h4>
        <fieldset>
          <legend>{mode === "qmd" ? "Available local media" : "Available media"}</legend>
          {groups.selectable.length === 0 ? <p>No eligible media is available.</p> : groups.selectable.map((item) => (
            <label key={item.mediaId}>
              <input
                type="radio"
                name="media-picker-selection"
                value={item.mediaId}
                disabled={disabled}
                onChange={() => void onSelect?.(item)}
              />
              <strong>{item.displayName}</strong> {item.origin} · {item.health}
            </label>
          ))}
        </fieldset>
      </section>
      <section data-media-source-path="upload">
        <h4>Upload new image</h4>
        <fieldset>
          <legend>Validated local image</legend>
          <label>
            <span>PNG, JPEG, or WebP file</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={disabled || busy}
              onChange={(event) => void acceptFile(event.target.files?.[0])}
            />
          </label>
        </fieldset>
      </section>
      {groups.external.length > 0 && (
        <section aria-labelledby="external-media-heading">
          <h4 id="external-media-heading">External / Network required</h4>
          <p>External items are not portable QMD media. Import creates a separate local item and never changes the original.</p>
          <ul>
            {groups.external.map((item) => (
              <li key={item.mediaId}>
                <strong>{item.displayName}</strong>
                <button type="button" className="secondary" disabled={disabled || busy} onClick={() => setImportingId(item.mediaId)}>
                  Import as local media
                </button>
                {importingId === item.mediaId && (
                  <div>
                    <button type="button" className="secondary" disabled={disabled || busy} onClick={() => void importDirect(item)}>
                      Try direct HTTPS import
                    </button>
                    <label>
                      <span>Or choose a local copy</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={disabled || busy}
                        onChange={(event) => void acceptFile(event.target.files?.[0], item)}
                      />
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.unavailable.length > 0 && (
        <section aria-labelledby="unavailable-media-heading">
          <h4 id="unavailable-media-heading">Unavailable media</h4>
          <p>These identities remain visible for repair, but cannot be selected in this picker.</p>
          <ul>
            {groups.unavailable.map(({ item, reason }) => (
              <li key={item.mediaId}><strong>{item.displayName}</strong> — {reason}</li>
            ))}
          </ul>
        </section>
      )}
      {status && <p role="status" aria-live="polite">{status}</p>}
      {error && <p role="alert">{error}</p>}
      {onCancel && <button type="button" className="secondary" disabled={disabled} onClick={onCancel}>Close media picker</button>}
    </section>
  );
}

export function partitionMediaPickerItems(mediaItems = {}, { mode = "qmd" } = {}) {
  const all = Object.values(mediaItems)
    .filter((item) => item && typeof item === "object")
    .sort((left, right) => left.mediaId.localeCompare(right.mediaId));
  const local = all.filter(isQmdEligibleMedia);
  const external = all.filter(isValidExternalHttpsMedia);
  const selectable = mode === "image"
    ? all.filter((item) => isQmdEligibleMedia(item) || isValidExternalHttpsMedia(item))
    : local;
  const selectableIds = new Set([...selectable, ...external].map(({ mediaId }) => mediaId));
  const unavailable = all
    .filter((item) => !selectableIds.has(item.mediaId))
    .map((item) => Object.freeze({ item, reason: unavailableReason(item) }));
  return Object.freeze({
    local,
    external,
    selectable,
    unavailable,
  });
}

export function isQmdEligibleMedia(item) {
  return ["asset", "package"].includes(item?.current?.kind)
    && item.health === "ready";
}

export function isValidExternalHttpsMedia(item) {
  if (item?.current?.kind !== "url" || item.origin !== "external" || item.health !== "external") return false;
  try {
    validateMediaItem(item);
    return true;
  } catch {
    return false;
  }
}

function unavailableReason(item) {
  if (item?.current?.kind === "url") return "Only a valid External HTTPS image can be selected.";
  const labels = {
    missing: "Missing media cannot be selected until it is repaired.",
    corrupt: "Corrupt media cannot be selected until it is repaired.",
    "needs-relink": "Media that needs relinking cannot be selected.",
    "needs-review": "Media that needs review cannot be selected.",
  };
  return labels[item?.health] ?? "This media is not ready for selection.";
}

export async function stageLocalMediaFile({
  file,
  assets = {},
  mediaId = createMediaId(),
  displayName = file?.name ?? "Local media",
  defaultDescription = "",
} = {}) {
  const staged = await stageSessionImageAsset({
    file,
    declaredMediaType: file?.type,
    decode: decodeBrowserImageAsset,
    currentAssetBytes: authoredAssetManifestBytes(assets),
    currentAssetIds: Object.keys(assets),
  });
  if (!staged.ok) {
    const error = new Error(staged.errors?.[0]?.message ?? "The image did not pass raster validation.");
    error.validation = staged;
    throw error;
  }
  return createLocalMediaCandidate({
    mediaId,
    displayName,
    defaultDescription,
    assetId: staged.assetId,
    manifestEntry: staged.manifestEntry,
  });
}

export function createLocalMediaCandidate({
  mediaId,
  displayName,
  defaultDescription = "",
  assetId,
  manifestEntry,
} = {}) {
  const mediaItem = createMediaItem({
    mediaId,
    revision: 1,
    current: { kind: "asset", assetId },
    displayName,
    defaultDescription,
    origin: "uploaded",
    health: "ready",
    dimensions: { width: manifestEntry.width, height: manifestEntry.height },
    byteLength: manifestEntry.byteLength,
    mediaType: manifestEntry.mediaType,
    assets: { [assetId]: manifestEntry },
  });
  return Object.freeze({
    mediaItem,
    assets: Object.freeze({ [assetId]: structuredClone(manifestEntry) }),
    assetId,
    previewUrl: resolveSessionImageAsset(assetId)?.url ?? null,
  });
}

export async function importExternalMediaFile(item, { fetchImpl = globalThis.fetch } = {}) {
  if (item?.current?.kind !== "url" || item.origin !== "external") {
    throw new Error("Import as local media requires an existing External HTTPS media item.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("Direct import is unavailable. Choose a local file upload instead.");
  }
  try {
    const response = await fetchImpl(item.current.url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "follow",
      referrerPolicy: "no-referrer",
    });
    if (!response?.ok) throw new Error(`HTTP ${response?.status ?? "error"}`);
    const blob = await response.blob();
    const type = blob.type || "application/octet-stream";
    const name = fileNameForExternal(item, type);
    return typeof File === "function"
      ? new File([blob], name, { type })
      : Object.assign(blob, { name });
  } catch (error) {
    throw new Error("Direct HTTPS import was not permitted by the browser. Choose a local file upload instead.", { cause: error });
  }
}

function createMediaId() {
  const token = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${(++fallbackMediaSequence).toString(36)}`;
  return `media-${token}`;
}

function fileNameForExternal(item, type) {
  const extension = type === "image/png" ? ".png" : type === "image/jpeg" ? ".jpg" : type === "image/webp" ? ".webp" : "";
  const base = item.displayName?.trim().replaceAll(/[^a-z0-9_-]+/gi, "-").replaceAll(/^-|-$/g, "") || "imported-media";
  return `${base}${extension}`;
}
