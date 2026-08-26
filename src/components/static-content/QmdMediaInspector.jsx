import React from "react";

import { validatePortableMediaAttributes } from "../../static-content/qmd/portableQmdMedia.js";

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
  const selectedWidth = WIDTH_PRESETS.includes(placement.width) ? placement.width : "custom";

  React.useEffect(() => {
    setCustomWidth(customPercentage(placement.width));
    setWidthError("");
  }, [placement.width]);

  const change = (updates) => {
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
    onChange?.({ ...candidate, ...validated.attributes });
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

      <div className="qmd-media-inspector__primary">
        <fieldset disabled={disabled}>
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
        <ChoiceFieldset legend="Alignment" name="qmd-media-align" choices={ALIGNMENTS} value={placement.align ?? "center"} disabled={disabled} onChange={(align) => change({ align })} />
        <ChoiceFieldset legend="Flow" name="qmd-media-flow" choices={FLOWS} value={placement.flow ?? "block"} disabled={disabled} onChange={(flow) => change({ flow })} />
      </div>

      {moreOpen && (
        <div className="qmd-media-inspector__more" data-qmd-media-more="">
          <ChoiceFieldset legend="Frame" name="qmd-media-frame" choices={FRAMES} value={placement.frame ?? "none"} disabled={disabled} onChange={(frame) => change({ frame })} />
          <label>
            <span>Visible caption</span>
            <input
              name="qmd-media-caption"
              value={placement.caption ?? ""}
              disabled={disabled}
              onChange={(event) => change({ caption: event.target.value })}
            />
          </label>
          <label>
            <span>Alternative text</span>
            <input
              name="qmd-media-alt"
              value={placement.decorative ? "" : placement.alt ?? ""}
              disabled={disabled || placement.decorative === true}
              onChange={(event) => change({ alt: event.target.value })}
            />
          </label>
          <label className="qmd-media-inspector__decorative">
            <input
              type="checkbox"
              name="qmd-media-decorative"
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
      <p className="qmd-media-inspector__status" role="status" aria-live="polite">{widthError}</p>
    </section>
  );
}

function ChoiceFieldset({ legend, name, choices, value, disabled, onChange }) {
  return (
    <fieldset disabled={disabled}>
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
