import { SERIES_STYLE_LIMITS } from "./seriesStyleContract.js";

export const DEFAULT_CARD_ACCENT_COLORS = Object.freeze([]);

export const KPI_CARD_STYLES = Object.freeze([
  Object.freeze({ value: "quietLedger", label: "Quiet ledger" }),
  Object.freeze({ value: "valueFirst", label: "Value first" }),
  Object.freeze({ value: "signalStamps", label: "Signal stamps" }),
]);

export const DELTA_CARD_STYLES = Object.freeze([
  Object.freeze({ value: "footerDelta", label: "Footer delta" }),
  Object.freeze({ value: "splitMetric", label: "Split metric" }),
  Object.freeze({ value: "directionRail", label: "Direction rail" }),
]);

const CARD_PRESENTATION_KEYS = new Set([
  "style",
  "accentColors",
  "showDeltaArrow",
]);

const KPI_CARD_TYPE_IDS = new Set(["kpi"]);
const DELTA_CARD_TYPE_IDS = new Set(["deltaCard", "deltaList"]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isKpiCardType(typeId) {
  return KPI_CARD_TYPE_IDS.has(typeId);
}

export function isDeltaCardType(typeId) {
  return DELTA_CARD_TYPE_IDS.has(typeId);
}

export function isCardChartType(typeId) {
  return isKpiCardType(typeId) || isDeltaCardType(typeId);
}

export function cardStyleOptions(typeId) {
  if (isKpiCardType(typeId)) return KPI_CARD_STYLES;
  if (isDeltaCardType(typeId)) return DELTA_CARD_STYLES;
  return [];
}

export function cardStyleSupported(typeId, style) {
  return cardStyleOptions(typeId).some(({ value }) => value === style);
}

export function cardStyleUsesAccentColors(typeId, style) {
  return isKpiCardType(typeId)
    && ["quietLedger", "signalStamps"].includes(style);
}

export function cardPresentationForChart(chart = {}) {
  const typeId = chart?.typeId;
  if (!isCardChartType(typeId)) return null;

  const card = isRecord(chart.presentation?.card)
    ? chart.presentation.card
    : {};
  const options = cardStyleOptions(typeId);
  const defaultStyle = options[0].value;
  const style = cardStyleSupported(typeId, card.style)
    ? card.style
    : defaultStyle;

  return {
    style,
    ...(isKpiCardType(typeId)
      ? {
          accentColors: Array.isArray(card.accentColors)
            ? card.accentColors
            : Array.isArray(chart.presentation?.series?.colors)
              ? chart.presentation.series.colors
              : DEFAULT_CARD_ACCENT_COLORS,
        }
      : {}),
    ...(isDeltaCardType(typeId)
      ? { showDeltaArrow: card.showDeltaArrow !== false }
      : {}),
  };
}

export function validateCardPresentation(card, typeId) {
  if (card === undefined) return;
  if (!isCardChartType(typeId)) {
    throw new Error(`Chart type "${typeId}" does not support card presentation.`);
  }
  const descriptors = strictRecordDescriptors(card, "Chart presentation card");
  for (const key of Object.keys(descriptors)) {
    if (!CARD_PRESENTATION_KEYS.has(key)) {
      throw new Error(`Unknown chart presentation card property "${key}".`);
    }
  }
  const style = descriptors.style?.value;
  if (
    style !== undefined
    && !cardStyleSupported(typeId, style)
  ) {
    throw new Error(`Chart presentation card style "${style}" is not supported by this chart type.`);
  }
  const accentColors = descriptors.accentColors?.value;
  if (accentColors !== undefined) {
    if (!isKpiCardType(typeId)) {
      throw new Error("Chart presentation card accent colors are only supported by KPI charts.");
    }
    validateAccentColors(accentColors);
  }
  const showDeltaArrow = descriptors.showDeltaArrow?.value;
  if (showDeltaArrow !== undefined) {
    if (!isDeltaCardType(typeId)) {
      throw new Error("Chart presentation card delta arrow is only supported by delta charts.");
    }
    if (typeof showDeltaArrow !== "boolean") {
      throw new Error("Chart presentation card delta arrow must be boolean.");
    }
  }
}

export function cardPresentationCompatible(card, typeId) {
  if (!isCardChartType(typeId)) return false;
  const descriptors = compatibleRecordDescriptors(card);
  if (!descriptors) return false;
  if (Object.keys(descriptors).some((key) => !CARD_PRESENTATION_KEYS.has(key))) {
    return false;
  }
  if (Object.hasOwn(descriptors, "accentColors") && !isKpiCardType(typeId)) {
    return false;
  }
  if (Object.hasOwn(descriptors, "showDeltaArrow") && !isDeltaCardType(typeId)) {
    return false;
  }
  const style = descriptors.style?.value ?? cardStyleOptions(typeId)[0]?.value;
  return cardStyleSupported(typeId, style);
}

function validateAccentColors(colors) {
  const values = strictArrayValues(colors, "Chart presentation card accent colors");
  const { min, max } = SERIES_STYLE_LIMITS.colors;
  if (values.length < min || values.length > max) {
    throw new Error(`Chart presentation card accent colors must contain between ${min} and ${max} colors.`);
  }
  for (const color of values) {
    if (typeof color !== "string" || !HEX_COLOR.test(color)) {
      throw new Error("Chart presentation card accent colors must use exact #RRGGBB values.");
    }
  }
}

function compatibleRecordDescriptors(value) {
  try {
    return strictRecordDescriptors(value, "Chart presentation card");
  } catch {
    return null;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strictRecordDescriptors(value, description) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new TypeError(`${description} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${description} must be a plain object.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${description} cannot contain symbol properties.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value")) {
      throw new TypeError(
        `${description} property "${key}" must be a data property.`,
      );
    }
    if (!descriptor.enumerable) {
      throw new TypeError(
        `${description} property "${key}" must be enumerable.`,
      );
    }
  }
  return descriptors;
}

function strictArrayValues(value, description) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${description} must be an ordinary array.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${description} cannot contain symbol properties.`);
  }
  const expectedNames = new Set([
    "length",
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  for (const name of Object.getOwnPropertyNames(value)) {
    if (!expectedNames.has(name)) {
      throw new TypeError(`${description} contains unknown property "${name}".`);
    }
  }
  const values = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor
      || !Object.hasOwn(descriptor, "value")
      || !descriptor.enumerable
    ) {
      throw new TypeError(
        `${description} must contain only direct data entries.`,
      );
    }
    values.push(descriptor.value);
  }
  return values;
}
