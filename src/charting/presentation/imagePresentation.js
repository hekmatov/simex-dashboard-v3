const IMAGE_BACKGROUND_DEFAULT = "var(--simex-surface-panel-alt)";
const NORMALIZED_HEX_COLOR = /^#[0-9A-F]{6}$/;

export function imageTitleStyle(chart) {
  const title = chart?.presentation?.title ?? {};
  return {
    fontSize: `${boundedInteger(title.fontSize, 12, 32, 16)}px`,
    fontWeight: title.bold === true ? 700 : undefined,
    fontStyle: title.italic === true ? "italic" : undefined,
    textDecoration: title.underline === true ? "underline" : undefined,
  };
}

export function resolveImageViewportBackground(value) {
  const background = value?.presentation?.image?.background
    ?? value?.background
    ?? value
    ?? {};
  if (background.mode === "white") return "#FFFFFF";
  if (background.mode === "custom" && isNormalizedImageCustomColor(background.color)) {
    return background.color;
  }
  return IMAGE_BACKGROUND_DEFAULT;
}

export function isNormalizedImageCustomColor(value) {
  return typeof value === "string" && NORMALIZED_HEX_COLOR.test(value);
}

function boundedInteger(value, min, max, fallback) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
