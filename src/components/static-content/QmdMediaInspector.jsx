import React from "react";

import {
  serializePortableMediaReference,
  validatePortableMediaAttributes,
} from "../../static-content/qmd/portableQmdMedia.js";

const WIDTH_PRESETS = Object.freeze(["25%", "33%", "50%", "66%", "75%", "100%"]);
const ALIGNMENTS = Object.freeze([
  ["start", "Start"],
  ["center", "Centre"],
  ["end", "End"],
]);
const FLOWS = Object.freeze([
  ["block", "Block"],
  ["wrap-start", "Wrap start"],
  ["wrap-end", "Wrap end"],
]);
const FRAMES = Object.freeze([
  ["none", "None"],
  ["outline", "Subtle outline"],
  ["card", "Card"],
]);
const GUIDANCE_IDS = Object.freeze({
  width: "qmd-media-guidance-width",
  alignment: "qmd-media-guidance-alignment",
  flow: "qmd-media-guidance-flow",
  frame: "qmd-media-guidance-frame",
  caption: "qmd-media-guidance-caption",
  alt: "qmd-media-guidance-alt",
  decorative: "qmd-media-guidance-decorative",
});

export default function QmdMediaInspector({
  placement = {},
  mediaItem,
  disabled = false,
  onChange,
  onChangeImage,
  onOpenMediaItem,
} = {}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [customWidth, setCustomWidth] = React.useState(customPercentage(placement.width));
  const [widthError, setWidthError] = React.useState("");
  const [altError, setAltError] = React.useState("");
  const [altValue, setAltValue] = React.useState(placement.decorative ? "" : placement.alt ?? "");
  const selectedWidth = WIDTH_PRESETS.includes(placement.width) ? placement.width : "custom";

  React.useEffect(() => {
    setCustomWidth(customPercentage(placement.width));
    setWidthError("");
  }, [placement.width]);
  React.useEffect(() => {
    setAltValue(placement.decorative ? "" : placement.alt ?? "");
    setAltError("");
  }, [placement.alt, placement.decorative, placement.mediaId]);

  const change = (updates) => {
    if (Object.hasOwn(updates, "alt")) setAltValue(updates.alt);
    const candidate = {
      mediaId: placement.mediaId,
      width: placement.width ?? "100%",
      align: placement.align ?? "center",
      flow: placement.flow ?? "block",
      frame: placement.frame ?? "none",
      caption: placement.caption ?? "",
      alt: placement.alt ?? "",
      decorative: placement.decorative === true,
      ...updates,
    };
    if (candidate.decorative) candidate.alt = "";
    const validated = validatePortableMediaAttributes(candidateAttributes(candidate));
    if (!validated.ok) return;
    const serializable = { ...candidate, ...validated.attributes };
    try {
      serializePortableMediaReference(serializable);
      setAltError("");
    } catch (error) {
      setAltError(error?.message ?? "Contextual alt text is required unless the image is decorative.");
      return;
    }
    onChange?.(serializable);
  };
  const commitCustomWidth = () => {
    const percentage = Number(customWidth);
    if (!/^\d+$/.test(customWidth) || !Number.isInteger(percentage) || percentage < 10 || percentage > 100) {
      setWidthError("Enter a whole percentage from 10 through 100.");
      return;
    }
    setWidthError("");
    change({ width: `${percentage}%` });
  };

  return (
    <section className="qmd-media-inspector" data-qmd-media-inspector="" role="region" aria-label="Image placement">
      <header className="qmd-media-inspector__header">
        <div>
          <h4>Image placement</h4>
          <p>{mediaItem?.displayName || placement.mediaId || "Embedded image"}</p>
        </div>
        <button
          type="button"
          className="secondary"
          aria-label="More image options"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          More
        </button>
      </header>

      <aside className="qmd-media-inspector__guidance" data-qmd-media-guidance="" aria-label="Image option guidance">
        <p id={GUIDANCE_IDS.width}><strong>Width:</strong> Choose 25%, 33%, 50%, 66%, 75%, or 100%. Custom widths use a whole percentage from 10 through 100.</p>
        <p id={GUIDANCE_IDS.alignment}><strong>Alignment:</strong> Place the image at Start, Centre, or End.</p>
        <p id={GUIDANCE_IDS.flow}><strong>Flow:</strong> Choose Block, Wrap start, or Wrap end.</p>
        <p id={GUIDANCE_IDS.frame}><strong>Frame:</strong> Choose None, Subtle outline, or Card.</p>
        <p id={GUIDANCE_IDS.caption}><strong>Caption:</strong> Add visible context shown with the image.</p>
        <p id={GUIDANCE_IDS.alt}><strong>Alternative text:</strong> Describe the image for assistive technology.</p>
        <p id={GUIDANCE_IDS.decorative}><strong>Decorative:</strong> Excludes the image from assistive technology and clears alternative text.</p>
      </aside>

      <div className="qmd-media-inspector__primary">
        <fieldset disabled={disabled} aria-describedby={GUIDANCE_IDS.width}>
          <legend>Width</legend>
          <div className="qmd-media-inspector__choices">
            {WIDTH_PRESETS.map((width) => (
              <label key={width}>
                <input
                  type="radio"
                  name="qmd-media-width"
                  value={width}
                  checked={selectedWidth === width}
                  onChange={() => change({ width })}
                />
                {width}
              </label>
            ))}
            <label>
              <input
                type="radio"
                name="qmd-media-width"
                value="custom"
                checked={selectedWidth === "custom"}
                onChange={() => undefined}
              />
              Custom
            </label>
          </div>
          <label className="qmd-media-inspector__custom-width">
            <span>Custom width percentage</span>
            <input
              type="number"
              inputMode="numeric"
              min="10"
              max="100"
              step="1"
              value={customWidth}
              aria-invalid={widthError ? "true" : undefined}
              onChange={(event) => setCustomWidth(event.target.value)}
              onBlur={commitCustomWidth}
            />
          </label>
        </fieldset>
        <ChoiceFieldset legend="Alignment" name="qmd-media-align" choices={ALIGNMENTS} value={placement.align ?? "center"} disabled={disabled} describedBy={GUIDANCE_IDS.alignment} onChange={(align) => change({ align })} />
        <ChoiceFieldset legend="Flow" name="qmd-media-flow" choices={FLOWS} value={placement.flow ?? "block"} disabled={disabled} describedBy={GUIDANCE_IDS.flow} onChange={(flow) => change({ flow })} />
      </div>

      {moreOpen && (
        <div className="qmd-media-inspector__more" data-qmd-media-more="">
          <ChoiceFieldset legend="Frame" name="qmd-media-frame" choices={FRAMES} value={placement.frame ?? "none"} disabled={disabled} describedBy={GUIDANCE_IDS.frame} onChange={(frame) => change({ frame })} />
          <label>
            <span>Visible caption</span>
            <input
              name="qmd-media-caption"
              aria-describedby={GUIDANCE_IDS.caption}
              value={placement.caption ?? ""}
              disabled={disabled}
              onChange={(event) => change({ caption: event.target.value })}
            />
          </label>
          <label>
            <span>Alternative text</span>
            <input
              name="qmd-media-alt"
              aria-describedby={`${GUIDANCE_IDS.alt}${altError ? " qmd-media-alt-error" : ""}`}
              aria-invalid={altError ? "true" : undefined}
              value={placement.decorative ? "" : altValue}
              disabled={disabled || placement.decorative === true}
              onChange={(event) => change({ alt: event.target.value })}
            />
          </label>
          <label className="qmd-media-inspector__decorative">
            <input
              type="checkbox"
              name="qmd-media-decorative"
              aria-describedby={GUIDANCE_IDS.decorative}
              checked={placement.decorative === true}
              disabled={disabled}
              onChange={(event) => {
                const decorative = event.target.checked;
                change({
                  decorative,
                  alt: decorative
                    ? ""
                    : String(placement.alt || mediaItem?.defaultDescription || mediaItem?.displayName || "Embedded image"),
                });
              }}
            />
            Decorative image
          </label>
          <div className="qmd-media-inspector__actions">
            <button type="button" className="secondary" data-qmd-media-action="change" disabled={disabled} onClick={(event) => onChangeImage?.(placement.mediaId, { trigger: event.currentTarget })}>
              Change image
            </button>
            <button type="button" className="secondary" data-qmd-media-action="open" disabled={!placement.mediaId} onClick={() => onOpenMediaItem?.(placement.mediaId)}>
              Open media item
            </button>
          </div>
        </div>
      )}
      <p id={altError ? "qmd-media-alt-error" : undefined} className="qmd-media-inspector__status" role="status" aria-live="polite">{widthError || altError}</p>
    </section>
  );
}

function ChoiceFieldset({ legend, name, choices, value, disabled, describedBy, onChange }) {
  return (
    <fieldset disabled={disabled} aria-describedby={describedBy}>
      <legend>{legend}</legend>
      <div className="qmd-media-inspector__choices">
        {choices.map(([token, label]) => (
          <label key={token}>
            <input type="radio" name={name} value={token} checked={value === token} onChange={() => onChange(token)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function candidateAttributes(candidate) {
  return {
    width: candidate.width,
    align: candidate.align,
    flow: candidate.flow,
    frame: candidate.frame,
    caption: candidate.caption,
    decorative: candidate.decorative,
  };
}

function customPercentage(width) {
  const match = /^(\d{1,3})%$/.exec(String(width ?? ""));
  return match ? match[1] : "50";
}
