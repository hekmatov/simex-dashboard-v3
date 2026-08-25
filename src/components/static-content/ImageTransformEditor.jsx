import React from "react";

import {
  normalizeImageTransform,
  nudgeImageCrop,
  rotateImageCrop,
} from "../../static-content/image/imageTransform.js";

const CROP_FIELDS = Object.freeze([
  ["x", "Crop x"],
  ["y", "Crop y"],
  ["width", "Crop width"],
  ["height", "Crop height"],
]);

export function ImageTransformEditor({
  source = {},
  sourceUrl = "",
  sourceControls,
  onTransformChange,
  onReset,
} = {}) {
  const pointer = React.useRef(null);
  const transform = normalizeImageTransform(source);
  const update = (updates) => onTransformChange?.({ ...transform, ...updates });
  const nudge = (delta) => update({ crop: nudgeImageCrop(transform.crop, delta) });
  const rotate = (delta) => update({
    crop: rotateImageCrop(transform.crop, delta),
    rotation: (transform.rotation + delta + 360) % 360,
  });
  const beginPointer = (event, mode) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointer.current = {
      mode,
      x: event.clientX,
      y: event.clientY,
      crop: transform.crop,
      bounds: event.currentTarget.closest("[data-image-crop-preview]")?.getBoundingClientRect(),
    };
  };
  const movePointer = (event) => {
    const start = pointer.current;
    if (!start?.bounds?.width || !start.bounds.height) return;
    const dx = Math.round(((event.clientX - start.x) / start.bounds.width) * 1000);
    const dy = Math.round(((event.clientY - start.y) / start.bounds.height) * 1000);
    update({
      crop: nudgeImageCrop(start.crop, start.mode === "resize"
        ? { dWidth: dx, dHeight: dy }
        : { dx, dy }),
    });
  };
  const endPointer = () => { pointer.current = null; };

  return (
    <div className="image-transform-editor">
      <div
        className="image-crop-preview"
        data-image-crop-preview
        style={previewVariables(transform)}
        aria-label="Image crop preview"
      >
        {safePreviewSource(sourceUrl) ? (
          <img src={sourceUrl} alt="" aria-hidden="true" draggable="false" />
        ) : (
          <p>Choose an image to preview the crop.</p>
        )}
        <div
          className="image-crop-selection"
          role="group"
          tabIndex="0"
          aria-label="Crop selection. Use arrow keys to move it."
          onKeyDown={(event) => {
            const step = event.shiftKey ? 1 : 10;
            const delta = event.key === "ArrowLeft" ? { dx: -step }
              : event.key === "ArrowRight" ? { dx: step }
              : event.key === "ArrowUp" ? { dy: -step }
              : event.key === "ArrowDown" ? { dy: step }
              : null;
            if (!delta) return;
            event.preventDefault();
            nudge(delta);
          }}
          onPointerDown={(event) => beginPointer(event, "move")}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <button
            type="button"
            className="image-crop-handle image-crop-handle--south-east"
            aria-label="Resize crop from bottom right"
            onPointerDown={(event) => {
              event.stopPropagation();
              beginPointer(event, "resize");
            }}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          />
        </div>
      </div>

      <div className="image-guided-sections" data-image-guided-sections>
        {sourceControls}
        <section className="image-guided-section" data-image-guided-section="crop" aria-labelledby="image-crop-heading">
          <p className="image-guided-section__step">3</p>
          <div>
            <h3 id="image-crop-heading">Crop and position</h3>
            <div className="image-crop-nudges" aria-label="Move crop selection">
              <button type="button" className="secondary" aria-label="Move crop left" onClick={() => nudge({ dx: -10 })}>←</button>
              <button type="button" className="secondary" aria-label="Move crop up" onClick={() => nudge({ dy: -10 })}>↑</button>
              <button type="button" className="secondary" aria-label="Move crop down" onClick={() => nudge({ dy: 10 })}>↓</button>
              <button type="button" className="secondary" aria-label="Move crop right" onClick={() => nudge({ dx: 10 })}>→</button>
            </div>
            <div className="image-crop-numeric">
              {CROP_FIELDS.map(([key, label]) => (
                <label key={key} htmlFor={`static-image-crop-${key}`}>
                  {label}
                  <input
                    id={`static-image-crop-${key}`}
                    type="number"
                    min={key === "width" || key === "height" ? 1 : 0}
                    max="1000"
                    step="1"
                    value={transform.crop[key]}
                    onChange={(event) => update({
                      crop: normalizeImageTransform({
                        ...transform,
                        crop: { ...transform.crop, [key]: Number(event.target.value) },
                      }).crop,
                    })}
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="image-guided-section" data-image-guided-section="rotation-fit" aria-labelledby="image-presentation-heading">
          <p className="image-guided-section__step">4</p>
          <div>
            <h3 id="image-presentation-heading">Rotation and fit</h3>
            <div className="image-rotation-controls">
              <button type="button" className="secondary" onClick={() => rotate(-90)}>Rotate left</button>
              <output aria-live="polite">{transform.rotation}°</output>
              <button type="button" className="secondary" onClick={() => rotate(90)}>Rotate right</button>
            </div>
            <label htmlFor="static-image-fit">Fit</label>
            <select id="static-image-fit" value={transform.fit} onChange={(event) => update({ fit: event.target.value })}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
            </select>
            <button type="button" className="secondary" onClick={onReset}>Reset image</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function previewVariables({ crop, rotation }) {
  return {
    "--image-crop-x": `${crop.x / 10}%`,
    "--image-crop-y": `${crop.y / 10}%`,
    "--image-crop-width": `${crop.width / 10}%`,
    "--image-crop-height": `${crop.height / 10}%`,
    "--image-saved-rotation": `${rotation}deg`,
  };
}

function safePreviewSource(value) {
  return typeof value === "string"
    && /^(?:https:|blob:|data:image\/(?:png|jpeg|webp);base64,|\/|\.\/)/i.test(value.trim());
}

export default ImageTransformEditor;
