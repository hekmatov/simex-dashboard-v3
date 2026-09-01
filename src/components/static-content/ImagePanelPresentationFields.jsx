import React from "react";

import ColorField from "../ColorField.jsx";

const DEFAULT_TITLE_SIZE = 16;
const MIN_TITLE_SIZE = 12;
const MAX_TITLE_SIZE = 32;
const DEFAULT_CUSTOM_COLOR = "#FFFFFF";

export function ImagePanelPresentationFields({ draft, disabled = false, dispatch }) {
  const presentation = draft?.panel?.presentation ?? {};
  const title = presentation.title ?? {};
  const image = presentation.image ?? {};
  const background = image.background ?? {};
  const fontSize = boundedTitleSize(title.fontSize);
  const mode = ["default", "white", "custom"].includes(background.mode)
    ? background.mode
    : "default";
  const customColor = normalizedColor(background.color) ?? DEFAULT_CUSTOM_COLOR;
  const titleDisabled = disabled || draft?.noTitle === true;
  const setPresentation = (next) => dispatch({
    type: "setPanel",
    updates: { presentation: next },
  });
  const setTitle = (updates) => setPresentation({
    ...presentation,
    title: { ...title, ...updates },
  });
  const setBackground = (nextBackground) => setPresentation({
    ...presentation,
    image: { ...image, background: nextBackground },
  });

  return (
    <section className="image-panel-presentation dashboard-authoring-field--wide">
      <fieldset
        className="image-panel-presentation__group dashboard-authoring-grid"
        data-image-title-presentation="true"
        disabled={titleDisabled}
      >
        <legend>Image title</legend>
        <label htmlFor="static-image-title-align">
          Title alignment
          <select
            id="static-image-title-align"
            value={["left", "center", "right"].includes(title.align) ? title.align : "left"}
            onChange={(event) => setTitle({ align: event.target.value })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <div className="image-panel-presentation__size dashboard-authoring-field">
          <span>Title size</span>
          <div>
            <button
              type="button"
              className="secondary"
              aria-label="Decrease image title font size"
              disabled={fontSize <= MIN_TITLE_SIZE}
              onClick={() => setTitle({ fontSize: fontSize - 1 })}
            >−</button>
            <output aria-live="polite">{fontSize}px</output>
            <button
              type="button"
              className="secondary"
              aria-label="Increase image title font size"
              disabled={fontSize >= MAX_TITLE_SIZE}
              onClick={() => setTitle({ fontSize: fontSize + 1 })}
            >+</button>
          </div>
        </div>
        {[
          ["bold", "Bold"],
          ["italic", "Italic"],
          ["underline", "Underline"],
        ].map(([key, label]) => (
          <label key={key} className="dashboard-authoring-boolean-row" htmlFor={`static-image-title-${key}`}>
            <input
              id={`static-image-title-${key}`}
              type="checkbox"
              checked={title[key] === true}
              onChange={(event) => setTitle({ [key]: event.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset
        className="image-panel-presentation__group dashboard-authoring-grid"
        data-image-background-presentation="true"
        disabled={disabled}
      >
        <legend>Image viewport</legend>
        <label htmlFor="static-image-background-mode">
          Image background
          <select
            id="static-image-background-mode"
            value={mode}
            onChange={(event) => setBackground({
              mode: event.target.value,
              ...(background.color ? { color: customColor } : event.target.value === "custom" ? { color: customColor } : {}),
            })}
          >
            <option value="default">Default</option>
            <option value="white">White</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {mode === "custom" ? <ColorField
          id="static-image-background-color"
          label="Custom image background"
          value={customColor}
          fallback={DEFAULT_CUSTOM_COLOR}
          dataColorField="static-image-background"
          onChange={(color) => setBackground({ mode: "custom", color: normalizedColor(color) ?? customColor })}
        /> : null}
      </fieldset>
    </section>
  );
}

function boundedTitleSize(value) {
  return Number.isInteger(value) && value >= MIN_TITLE_SIZE && value <= MAX_TITLE_SIZE
    ? value
    : DEFAULT_TITLE_SIZE;
}

function normalizedColor(value) {
  const color = String(value ?? "").toUpperCase();
  return /^#[0-9A-F]{6}$/.test(color) ? color : null;
}

export default ImagePanelPresentationFields;
