import { format as echartsFormat } from "echarts";

const DEFAULT_FONT_SIZE = 14;
const TICK_FONT_SIZE = 12;
const AXIS_LABEL_MARGIN = 8;
const TITLE_CLEARANCE = 8;

export function createValueAxisTitleProjection({
  id,
  horizontal = false,
  secondary = false,
  settings = {},
  tickValues = [],
} = {}) {
  const title = axisTitleText(settings).trim();
  if (!title) return null;
  const domainCanBeNegative = resolvedDomainCanBeNegative(settings, tickValues);
  return {
    id: id === "secondary" ? "secondary" : "primary",
    physicalAxis: horizontal ? "x" : "y",
    side: horizontal ? (secondary ? "top" : "bottom") : (secondary ? "right" : "left"),
    title,
    position: settings.titlePosition ?? "center",
    orientation: settings.titleOrientation ?? (horizontal ? "horizontal" : "vertical"),
    fontSize: settings.titleFontSize ?? DEFAULT_FONT_SIZE,
    bold: settings.titleBold === true,
    offsetX: settings.titleOffsetX ?? 0,
    offsetY: settings.titleOffsetY ?? 0,
    tickValues: numericEnvelope(settings, tickValues, domainCanBeNegative),
    domainCanBeNegative,
  };
}

export function resolveValueAxisTitleGraphics({
  projection,
  gridRect,
  textTheme = {},
  measureText = textBounds,
} = {}) {
  if (!validGridRect(gridRect)) return [];
  return (Array.isArray(projection) ? projection : [projection])
    .filter(Boolean)
    .map((entry) => resolveGraphic(entry, gridRect, textTheme, measureText));
}

export function valueAxisTitleGutters(projection, textTheme = {}, measureText = textBounds) {
  const result = { left: 0, right: 0, top: 0, bottom: 0 };
  for (const entry of (Array.isArray(projection) ? projection : [projection]).filter(Boolean)) {
    const metrics = projectionMetrics(entry, textTheme, measureText);
    if (entry.physicalAxis === "y") {
      result[entry.side] = Math.max(
        result[entry.side],
        Math.ceil(AXIS_LABEL_MARGIN + metrics.tickWidth + TITLE_CLEARANCE + metrics.titleWidth),
      );
      if (entry.position === "top") result.top = Math.max(result.top, Math.ceil(metrics.titleHeight / 2));
      if (entry.position === "bottom") result.bottom = Math.max(result.bottom, Math.ceil(metrics.titleHeight / 2));
    } else {
      result[entry.side] = Math.max(
        result[entry.side],
        Math.ceil(AXIS_LABEL_MARGIN + metrics.tickHeight + TITLE_CLEARANCE + metrics.titleHeight),
      );
      if (entry.position === "top") result.left = Math.max(result.left, Math.ceil(metrics.titleWidth / 2));
      if (entry.position === "bottom") result.right = Math.max(result.right, Math.ceil(metrics.titleWidth / 2));
    }
  }
  return result;
}

function resolveGraphic(projection, gridRect, textTheme, measureText) {
  const metrics = projectionMetrics(projection, textTheme, measureText);
  const right = gridRect.x + gridRect.width;
  const bottom = gridRect.y + gridRect.height;
  let left;
  let top;
  if (projection.physicalAxis === "y") {
    const centerY = positionCoordinate(projection.position, gridRect.y, bottom);
    top = centerY - (metrics.titleHeight / 2);
    left = projection.side === "right"
      ? right + AXIS_LABEL_MARGIN + metrics.tickWidth + TITLE_CLEARANCE
      : gridRect.x - AXIS_LABEL_MARGIN - metrics.tickWidth - TITLE_CLEARANCE - metrics.titleWidth;
  } else {
    const centerX = positionCoordinate(projection.position, gridRect.x, right);
    left = centerX - (metrics.titleWidth / 2);
    top = projection.side === "top"
      ? gridRect.y - AXIS_LABEL_MARGIN - metrics.tickHeight - TITLE_CLEARANCE - metrics.titleHeight
      : bottom + AXIS_LABEL_MARGIN + metrics.tickHeight + TITLE_CLEARANCE;
  }
  left += projection.titleOffsetX ?? projection.offsetX ?? 0;
  top -= projection.titleOffsetY ?? projection.offsetY ?? 0;
  const fontFamily = normalizedFontFamily(textTheme.bodyFont);
  const fontWeight = projection.bold === true ? 700 : 400;
  const child = {
    type: "text",
    x: metrics.titleWidth / 2,
    y: metrics.titleHeight / 2,
    rotation: projection.orientation === "vertical" ? Math.PI / 2 : 0,
    style: {
      text: projection.title,
      fill: textTheme.textMuted ?? "#5A6066",
      fontFamily,
      fontSize: projection.fontSize,
      fontWeight,
      align: "center",
      verticalAlign: "middle",
    },
  };
  return {
    id: `simex-value-axis-title-${projection.id}`,
    type: "group",
    silent: true,
    left,
    top,
    width: metrics.titleWidth,
    height: metrics.titleHeight,
    textBounds: { width: metrics.titleWidth, height: metrics.titleHeight },
    children: [child],
  };
}

function projectionMetrics(projection, textTheme, measureText) {
  const titleFontFamily = normalizedFontFamily(textTheme.bodyFont);
  const tickFontFamily = normalizedFontFamily(textTheme.dataFont ?? textTheme.bodyFont);
  const tickFontSize = Number.isFinite(textTheme.tickFontSize) && textTheme.tickFontSize > 0
    ? textTheme.tickFontSize
    : TICK_FONT_SIZE;
  const titleNatural = measureText(
    projection.title,
    projection.fontSize,
    projection.bold === true ? 700 : 400,
    titleFontFamily,
  );
  const vertical = projection.orientation === "vertical";
  const tickBounds = (projection.tickValues ?? [0]).map((value) => (
    measureText(formatAxisNumber(value), tickFontSize, 400, tickFontFamily)
  ));
  return {
    titleWidth: vertical ? titleNatural.height : titleNatural.width,
    titleHeight: vertical ? titleNatural.width : titleNatural.height,
    tickWidth: Math.max(0, ...tickBounds.map(({ width }) => width)),
    tickHeight: Math.max(tickFontSize, ...tickBounds.map(({ height }) => height)),
  };
}

function textBounds(text, fontSize, fontWeight, fontFamily) {
  const rect = echartsFormat.getTextRect(
    String(text),
    `${fontWeight} ${fontSize}px ${fontFamily}`,
    "left",
    "top",
  );
  return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
}

function numericEnvelope(settings, values, domainCanBeNegative) {
  const finite = [
    ...(Array.isArray(values) ? values : []),
    settings.min,
    settings.max,
    0,
  ].filter(Number.isFinite);
  const maximumMagnitude = Math.max(0, ...finite.map((value) => Math.abs(value)));
  const envelope = maximumMagnitude > 0
    ? 10 ** Math.ceil(Math.log10(maximumMagnitude))
    : 1;
  if (Number.isFinite(envelope) && envelope > 0) {
    finite.push(envelope, envelope * 0.2);
    if (domainCanBeNegative) finite.push(-envelope, envelope * -0.2);
  }
  return [...new Set(finite)];
}

function resolvedDomainCanBeNegative(settings, values) {
  if (Number.isFinite(settings.min)) return settings.min < 0;
  return [settings.max, ...(Array.isArray(values) ? values : [])]
    .filter(Number.isFinite)
    .some((value) => value < 0);
}

function axisTitleText(settings) {
  return typeof settings.title === "string"
    ? settings.title
    : typeof settings.yTitle === "string"
      ? settings.yTitle
      : typeof settings.name === "string"
        ? settings.name
        : "";
}

function positionCoordinate(position, start, end) {
  if (position === "top") return start;
  if (position === "bottom") return end;
  return start + ((end - start) / 2);
}

function formatAxisNumber(value) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(value);
}

function normalizedFontFamily(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "sans-serif";
}

function validGridRect(value) {
  return value && [value.x, value.y, value.width, value.height].every(Number.isFinite);
}
