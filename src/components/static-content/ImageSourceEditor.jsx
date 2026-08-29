import React from "react";

import {
  authoredAssetManifestBytes,
  discardUnreferencedSessionImageAssets,
  decodeBrowserImageAsset,
  stageSessionImageAsset,
  validateImageOrigin,
} from "../../static-content/image/imageAssetValidation.js";
import MediaPicker from "../source-content/MediaPicker.jsx";

export function ImageSourceEditor({
  source = {},
  assets = {},
  imageEditing = {},
  mediaItems = {},
  disabled = false,
  onOriginChange,
  onReplace,
  onRestorePreviousImage,
  onMediaSelect,
  onMediaCreate,
  onAltChange,
  onDecorativeChange,
} = {}) {
  const [validation, setValidation] = React.useState({ status: "idle", errors: [], warnings: [] });
  const mountedRef = React.useRef(true);
  const intakeRevisionRef = React.useRef(0);
  const acceptedAssetIdRef = React.useRef(null);
  const disabledRef = React.useRef(disabled);
  disabledRef.current = disabled;
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const origin = source.origin ?? { kind: "replacementRequired", reason: "Choose an image." };
  const [originKind, setSelectedOriginKind] = React.useState(
    ["url", "package"].includes(origin.kind) ? origin.kind : "asset",
  );
  React.useEffect(() => {
    setSelectedOriginKind(["url", "package"].includes(origin.kind) ? origin.kind : "asset");
  }, [origin.kind]);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      intakeRevisionRef.current += 1;
    };
  }, []);
  React.useEffect(() => {
    if (!disabled) return;
    intakeRevisionRef.current += 1;
    setPickerOpen(false);
  }, [disabled]);

  const setOriginKind = (kind) => {
    if (disabledRef.current) return;
    setSelectedOriginKind(kind);
    setValidation({ status: "idle", errors: [], warnings: [] });
    if (kind === "url") onOriginChange?.({ kind: "url", url: "" });
    else if (kind === "package") onOriginChange?.({ kind: "package", path: "" });
  };
  const chooseFile = async (event) => {
    if (disabledRef.current) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const intakeRevision = ++intakeRevisionRef.current;
    setValidation({ status: "validating", errors: [], warnings: [] });
    const result = await stageSessionImageAsset({
      file,
      declaredMediaType: file.type,
      decode: decodeBrowserImageAsset,
      currentAssetBytes: authoredAssetManifestBytes(assets),
      currentAssetIds: Object.keys(assets),
    });
    if (!mountedRef.current || disabledRef.current || intakeRevision !== intakeRevisionRef.current) {
      if (result.ok) {
        discardUnreferencedSessionImageAssets(
          [result.assetId],
          [...Object.keys(assets), acceptedAssetIdRef.current].filter(Boolean),
        );
      }
      return;
    }
    if (!result.ok) {
      setValidation({ status: "error", errors: result.errors, warnings: result.warnings });
      return;
    }
    acceptedAssetIdRef.current = result.assetId;
    onReplace?.({
      origin: { kind: "asset", assetId: result.assetId },
      manifestEntry: result.manifestEntry,
      fileName: file.name,
    });
    setValidation({ status: "ready", errors: [], warnings: result.warnings, fileName: file.name });
  };

  return (
    <>
      <section className="image-guided-section" data-image-guided-section="source" aria-labelledby="image-source-heading">
        <p className="image-guided-section__step">1</p>
        <div>
          <h3 id="image-source-heading">Choose image</h3>
          <p>Upload is recommended. Linked images need a network; packaged paths must belong to this dashboard.</p>
          <button type="button" className="secondary" disabled={disabled} onClick={() => setPickerOpen(true)}>Choose from media</button>
          {pickerOpen && !disabled && (
            <MediaPicker
              mediaItems={mediaItems}
              assets={assets}
              mode="image"
              onSelect={(item) => { onMediaSelect?.(item); setPickerOpen(false); }}
              onCreateLocal={async (candidate, context) => { await onMediaCreate?.(candidate, context); setPickerOpen(false); }}
              onCancel={() => setPickerOpen(false)}
            />
          )}
          <label htmlFor="static-image-origin-kind">Image origin</label>
          <select
            id="static-image-origin-kind"
            disabled={disabled}
            value={originKind}
            onChange={(event) => setOriginKind(event.target.value)}
          >
            <option value="asset">Local upload</option>
            <option value="url">Linked HTTPS URL</option>
            <option value="package">Packaged asset</option>
          </select>
          <label htmlFor="static-image-file">{originKind === "asset" ? "PNG, JPEG, or WebP file" : "Replace with a local PNG, JPEG, or WebP"}</label>
          <input
            id="static-image-file"
            type="file"
            disabled={disabled}
            accept="image/png,image/jpeg,image/webp"
            onChange={chooseFile}
            aria-describedby="static-image-file-help"
          />
          <small id="static-image-file-help">Single frame, up to 12 MiB and 50 megapixels. Original bytes are not edited.</small>
          {originKind === "url" && (
            <>
              <label htmlFor="static-image-url">HTTPS image URL</label>
              <input
                id="static-image-url"
                type="url"
                disabled={disabled}
                inputMode="url"
                value={origin.kind === "url" ? origin.url : ""}
                onChange={(event) => onOriginChange?.({ kind: "url", url: event.target.value })}
                onBlur={(event) => reportOriginError({ kind: "url", url: event.target.value }, setValidation)}
              />
              <small>Network-dependent and not embedded during export.</small>
            </>
          )}
          {originKind === "package" && (
            <>
              <label htmlFor="static-image-package-path">Dashboard package path</label>
              <input
                id="static-image-package-path"
                disabled={disabled}
                value={origin.kind === "package" ? origin.path : ""}
                onChange={(event) => onOriginChange?.({ kind: "package", path: event.target.value })}
                onBlur={(event) => reportOriginError({ kind: "package", path: event.target.value }, setValidation)}
              />
            </>
          )}
          {validation.status === "validating" && <p role="status" aria-live="polite">Validating image…</p>}
          {validation.status === "ready" && <p role="status" aria-live="polite">{validation.fileName ? `${validation.fileName} is ready for this application session.` : "Image source is ready."}</p>}
          {validation.errors.length > 0 && (
            <div className="static-image-validation" role="alert">
              <strong>Choose another image</strong>
              {validation.errors.map((error) => (
                <p key={error.code} data-validation-code={error.code}>{error.message}</p>
              ))}
            </div>
          )}
          {validation.warnings.map((warning) => (
            <p key={warning.code} data-validation-code={warning.code} role="status">
              {warning.message}
            </p>
          ))}
          {imageEditing.replacementUndo && (
            <div role="status">
              <p>Replacement selected. Save, discard, or restore the previous image.</p>
              <button type="button" className="secondary" disabled={disabled} onClick={onRestorePreviousImage}>Restore previous image</button>
            </div>
          )}
        </div>
      </section>

      <section className="image-guided-section" data-image-guided-section="accessibility" aria-labelledby="image-accessibility-heading">
        <p className="image-guided-section__step">2</p>
        <div>
          <h3 id="image-accessibility-heading">Describe the image</h3>
          <label>
            <input
              type="checkbox"
              disabled={disabled}
              checked={source.decorative === true}
              onChange={(event) => onDecorativeChange?.(event.target.checked)}
            /> Decorative image
          </label>
          {!source.decorative && (
            <>
              <label htmlFor="static-image-alt">Alternative text</label>
              <input
                id="static-image-alt"
                disabled={disabled}
                value={source.alt ?? ""}
                onChange={(event) => onAltChange?.(event.target.value)}
                aria-describedby={imageEditing.altReviewRequired ? "static-image-alt-review" : undefined}
              />
              {imageEditing.altReviewRequired && <small id="static-image-alt-review">Review alternative text after replacement.</small>}
            </>
          )}
          {source.decorative && <small>The saved image uses empty alternative text and is excluded from the accessibility tree.</small>}
        </div>
      </section>
    </>
  );
}

function reportOriginError(origin, setValidation) {
  if (!(origin.url || origin.path)) return;
  try {
    validateImageOrigin(origin);
    setValidation({ status: "ready", errors: [], warnings: [] });
  } catch (error) {
    setValidation({ status: "error", errors: [{ code: "invalid-origin", message: error.message }], warnings: [] });
  }
}

export default ImageSourceEditor;
