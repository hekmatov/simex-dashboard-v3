import React from "react";

import { validateImageOrigin } from "../../static-content/image/imageAssetValidation.js";
import MediaPicker from "../source-content/MediaPicker.jsx";

export function ImageSourceEditor({
  source = {},
  assets = {},
  imageEditing = {},
  mediaItems = {},
  disabled = false,
  onOriginChange,
  onRestorePreviousImage,
  onMediaSelect,
  onMediaCreate,
  onAltChange,
  onDecorativeChange,
} = {}) {
  const [validation, setValidation] = React.useState({ status: "idle", errors: [], warnings: [] });
  const origin = source.origin ?? { kind: "replacementRequired", reason: "Choose an image." };
  const [originKind, setSelectedOriginKind] = React.useState(
    ["url", "package"].includes(origin.kind) ? origin.kind : "asset",
  );
  React.useEffect(() => {
    setSelectedOriginKind(["url", "package"].includes(origin.kind) ? origin.kind : "asset");
  }, [origin.kind]);
  const setOriginKind = (kind) => {
    if (disabled) return;
    setSelectedOriginKind(kind);
    setValidation({ status: "idle", errors: [], warnings: [] });
    if (kind === "url") onOriginChange?.({ kind: "url", url: "" });
    else if (kind === "package") onOriginChange?.({ kind: "package", path: "" });
  };
  return (
    <>
      <section className="image-guided-section" data-image-guided-section="source" aria-labelledby="image-source-heading">
        <p className="image-guided-section__step">1</p>
        <div>
          <h3 id="image-source-heading">Choose image</h3>
          <p>Use dashboard media or upload a new image. Linked and packaged alternatives are available below.</p>
          <MediaPicker
            mediaItems={mediaItems}
            assets={assets}
            mode="image"
            selectedMediaId={source.mediaId ?? null}
            disabled={disabled}
            onSelect={onMediaSelect}
            onCreateLocal={onMediaCreate}
          />
          <label htmlFor="static-image-origin-kind">Alternative source</label>
          <select
            id="static-image-origin-kind"
            disabled={disabled}
            value={originKind}
            onChange={(event) => setOriginKind(event.target.value)}
          >
            <option value="asset">Dashboard media or upload above</option>
            <option value="url">Linked HTTPS URL</option>
            <option value="package">Packaged asset</option>
          </select>
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
