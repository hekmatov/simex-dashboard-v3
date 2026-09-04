export const SERIES_APPEARANCE_FIELD_IDS = Object.freeze([
  "seriesColors",
  "lineWidth",
  "barWidth",
  "barSeparation",
  "verticalFill",
  "referenceLine",
]);

export const SERIES_STYLE_PROPERTIES = Object.freeze([
  "colors",
  "lineWidth",
  "barWidth",
  "barSeparation",
  "verticalFill",
]);

export const SERIES_STYLE_LIMITS = Object.freeze({
  colors: Object.freeze({ min: 1, max: 12 }),
  lineWidth: Object.freeze({ min: 1, max: 12 }),
  barWidth: Object.freeze({ min: 4, max: 120 }),
  barSeparation: Object.freeze({ min: 0, max: 80 }),
});

const FIELD_BY_PROPERTY = Object.freeze({
  colors: "seriesColors",
  lineWidth: "lineWidth",
  barWidth: "barWidth",
  barSeparation: "barSeparation",
  verticalFill: "verticalFill",
});

const APPEARANCE_BY_MARK = Object.freeze({
  bar: Object.freeze(["seriesColors", "barWidth", "barSeparation"]),
  "grouped-bar": Object.freeze(["seriesColors", "barWidth", "barSeparation"]),
  "stacked-bar": Object.freeze(["seriesColors", "barWidth", "barSeparation"]),
  "horizontal-bar": Object.freeze(["seriesColors", "verticalFill", "barWidth", "barSeparation"]),
  "horizontal-stacked-bar": Object.freeze(["seriesColors", "verticalFill", "barWidth", "barSeparation"]),
  line: Object.freeze(["seriesColors", "lineWidth", "referenceLine"]),
  area: Object.freeze(["seriesColors", "lineWidth"]),
  "mixed-axis": Object.freeze([
    "seriesColors",
    "lineWidth",
    "barWidth",
  ]),
  pie: Object.freeze(["seriesColors"]),
  donut: Object.freeze(["seriesColors"]),
  point: Object.freeze(["seriesColors"]),
  bubble: Object.freeze(["seriesColors"]),
});

const MARKS_BY_RENDERER = Object.freeze({
  axis: Object.freeze([
    "bar",
    "grouped-bar",
    "stacked-bar",
    "horizontal-bar",
    "horizontal-stacked-bar",
    "line",
    "area",
    "mixed-axis",
  ]),
  composition: Object.freeze(["pie", "donut"]),
  relationship: Object.freeze(["point", "bubble"]),
});

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function seriesAppearanceForMark(mark) {
  return [...(APPEARANCE_BY_MARK[mark] ?? [])];
}

export function hasSeriesRendererMarkContract(renderer) {
  return Object.hasOwn(MARKS_BY_RENDERER, renderer);
}

export function validateSeriesRendererMark(renderer, mark) {
  const supported = MARKS_BY_RENDERER[renderer];
  if (!supported?.includes(mark)) {
    const label = typeof renderer === "string" && renderer.length > 0
      ? `${renderer[0].toUpperCase()}${renderer.slice(1)}`
      : "Series";
    throw new Error(`${label} renderer does not support mark "${mark}".`);
  }
  return mark;
}

export function seriesAppearanceFieldForProperty(property) {
  return FIELD_BY_PROPERTY[property] ?? null;
}

export function seriesStylePropertySupported(appearance, property) {
  const fieldId = seriesAppearanceFieldForProperty(property);
  return fieldId !== null
    && Array.isArray(appearance)
    && appearance.includes(fieldId);
}

/**
 * Validate and detach the optional persisted series-style subshape.
 * Callers decide whether the property is absent; a supplied value must be a
 * non-empty, inert object containing only schema-applicable settings.
 */
export function normalizeSeriesStyle(series, appearance) {
  const descriptors = strictRecordDescriptors(
    series,
    "Chart presentation series",
  );
  const keys = Object.keys(descriptors);
  if (keys.length === 0) {
    throw new Error("Chart presentation series must contain a style setting.");
  }

  for (const key of keys) {
    if (!SERIES_STYLE_PROPERTIES.includes(key)) {
      throw new Error(`Unknown chart presentation series property "${key}".`);
    }
    if (!seriesStylePropertySupported(appearance, key)) {
      throw new Error(
        `Chart presentation series property "${key}" is not supported by this chart type.`,
      );
    }
  }

  const normalized = {};
  if (Object.hasOwn(descriptors, "colors")) {
    normalized.colors = normalizeColors(descriptors.colors.value);
  }
  if (Object.hasOwn(descriptors, "lineWidth")) {
    normalized.lineWidth = boundedWidth(
      descriptors.lineWidth.value,
      "lineWidth",
    );
  }
  if (Object.hasOwn(descriptors, "barWidth")) {
    normalized.barWidth = boundedWidth(
      descriptors.barWidth.value,
      "barWidth",
    );
  }
  if (Object.hasOwn(descriptors, "barSeparation")) {
    normalized.barSeparation = boundedWidth(
      descriptors.barSeparation.value,
      "barSeparation",
    );
  }
  if (Object.hasOwn(descriptors, "verticalFill")) {
    if (typeof descriptors.verticalFill.value !== "boolean") {
      throw new Error("Chart presentation series verticalFill must be boolean.");
    }
    normalized.verticalFill = descriptors.verticalFill.value;
  }
  return normalized;
}

function normalizeColors(colors) {
  const values = strictArrayValues(
    colors,
    "Chart presentation series colors",
  );
  const { min, max } = SERIES_STYLE_LIMITS.colors;
  if (values.length < min || values.length > max) {
    throw new Error(
      `Chart presentation series colors must contain between ${min} and ${max} colors.`,
    );
  }
  for (const color of values) {
    if (typeof color !== "string" || !HEX_COLOR.test(color)) {
      throw new Error(
        "Chart presentation series colors must use exact #RRGGBB values.",
      );
    }
  }
  return values;
}

function boundedWidth(value, property) {
  const { min, max } = SERIES_STYLE_LIMITS[property];
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(
      `Chart presentation series ${property} must be a finite number from ${min} through ${max}.`,
    );
  }
  return value;
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
      throw new TypeError(
        `${description} contains unknown property "${name}".`,
      );
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
