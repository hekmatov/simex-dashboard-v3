import {
  createValueAxisTitleProjection,
  valueAxisTitleGutters,
} from "./axisTitleGraphics.js";

const TIME_UNITS_MS = Object.freeze({
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
});
const DAY_MS = TIME_UNITS_MS.day;
const AXIS_FONT_SIZE = 12;
const AXIS_LINE_HEIGHT = 14;
const AXIS_LABEL_MARGIN = 8;
const AXIS_TICK_HALF_HEIGHT = 6;
const AXIS_TITLE_CLEARANCE = 10;
const VALUE_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
// Mirrors ZRender's renderer-independent fallback glyph metrics. The safety
// factor also covers the small differences introduced by platform fonts when
// ECharts measures the same 12px sans-serif text in a browser canvas.
const AXIS_TEXT_WIDTH_MAP = "007LLmW'55;N0500LLLLLLLLLL00NNNLzWW\\\\WQb\\0FWLg\\bWb\\WQ\\WrWWQ000CL5LLFLL0LL**F*gLLLL5F0LF\\FFF5.5N";
const AXIS_TEXT_WIDTH_OFFSET = 20;
const AXIS_TEXT_WIDTH_SCALE = 100;
const AXIS_TEXT_WIDTH_SAFETY_FACTOR = 1.12;
const YEAR_ONLY = /^(\d{4})$/;
const LOCAL_CALENDAR_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?)?$/;

export function xAxisPresentation(settings, kind, physicalAxis = "x") {
  const result = axisTitle(settings, physicalAxis);
  if (settings?.min !== undefined) result.min = settings.min;
  if (settings?.max !== undefined) result.max = settings.max;
  const interval = tickInterval(settings?.tickFrequency, kind);
  if (kind === "category" && interval !== undefined) {
    result.axisLabel = { interval };
    result.axisTick = { interval };
  } else if (interval !== undefined) {
    result.interval = interval;
  }
  const calendarHint = calendarTickIntervalHint(settings?.tickFrequency, kind);
  if (calendarHint !== undefined) {
    result.minInterval = calendarHint;
    result.maxInterval = calendarHint;
  }
  if (kind === "temporal" && (
    interval !== undefined
    || (settings?.labelPreset && settings.labelPreset !== "adaptive")
  )) {
    result.axisLabel = {
      formatter: temporalLabelFormatter(
        settings?.labelPreset ?? "adaptive",
        settings?.tickFrequency,
      ),
    };
  }
  if (kind === "category") {
    const fontSize = settings?.labelFontSize;
    const wrapping = settings?.labelWrap === true;
    if (Number.isInteger(fontSize) || wrapping) {
      result.axisLabel = {
        ...(result.axisLabel ?? {}),
        ...(Number.isInteger(fontSize) ? { fontSize } : {}),
        ...(wrapping ? {
          width: settings?.labelMaxWidth ?? 96,
          overflow: "break",
          lineHeight: Math.ceil((fontSize ?? AXIS_FONT_SIZE) * 1.25),
        } : {}),
      };
    }
  }
  return result;
}

export function valueAxisPresentation(settings) {
  const result = {};
  const interval = tickInterval(settings?.tickFrequency, "number");
  if (interval !== undefined) result.interval = interval;
  const unit = typeof settings?.unit === "string" ? settings.unit : "";
  if (unit) {
    result.axisLabel = {
      formatter: (value) => {
        const numeric = Number(value);
        return `${Number.isFinite(numeric) ? VALUE_AXIS_NUMBER_FORMATTER.format(numeric) : String(value ?? "")}${unit}`;
      },
    };
  }
  return result;
}

export function createTemporalHoverLabelFormatter({
  preset = "auto",
  sourceFormat,
  resolveValue,
} = {}) {
  return (params = {}) => {
    const value = typeof resolveValue === "function"
      ? resolveValue(params?.value)
      : params?.value;
    return formatTemporalHoverLabel(value, preset, sourceFormat);
  };
}

export function valueAxisGutters(settings = {}, values = [], textTheme = {}, {
  horizontal = false,
  secondary = false,
} = {}) {
  const projection = createValueAxisTitleProjection({
    id: secondary ? "secondary" : "primary",
    horizontal,
    secondary,
    settings,
    tickValues: values,
  });
  const gutters = valueAxisTitleGutters(projection, textTheme);
  return {
    side: horizontal
      ? Math.max(gutters.top, gutters.bottom)
      : secondary ? gutters.right : gutters.left,
    top: gutters.top,
    bottom: gutters.bottom,
  };
}

function axisTitle(settings = {}, direction, { tickLabelWidth = 0 } = {}) {
  const title = axisTitleText(settings);
  if (!title) return {};
  const positions = direction === "y"
    ? { top: "end", center: "middle", bottom: "start" }
    : { left: "start", center: "middle", right: "end" };
  const titlePosition = settings.titlePosition ?? "center";
  const nameRotate = direction === "x" || settings.titleOrientation === "horizontal" ? 0 : 90;
  return {
    name: title,
    nameLocation: positions[settings.titlePosition] ?? "middle",
    nameRotate,
    nameGap: direction === "y"
      ? titlePosition === "center"
        ? Math.ceil(
            tickLabelWidth
            + AXIS_LABEL_MARGIN
            + AXIS_TITLE_CLEARANCE
            + titlePerpendicularRadius(title, settings.titleOrientation),
          )
        : AXIS_TICK_HALF_HEIGHT + AXIS_TITLE_CLEARANCE
      : 36,
  };
}

function axisTitleText(settings = {}) {
  return settings.title ?? settings.yTitle ?? settings.name ?? "";
}

function titlePerpendicularRadius(title, orientation) {
  return orientation === "horizontal" ? 0 : renderedTextHeight(title) / 2;
}

function renderedTextHeight(text) {
  return renderedTextBounds(text).height;
}

function renderedTextBounds(text) {
  const lines = String(text).split("\n");
  return {
    width: Math.max(0, ...lines.map(estimatedLineWidth)),
    height: Math.max(1, lines.length) * AXIS_LINE_HEIGHT,
  };
}

function estimatedLineWidth(text) {
  let width = 0;
  for (const character of text) {
    const code = character.codePointAt(0);
    const index = code >= 32 && code < 32 + AXIS_TEXT_WIDTH_MAP.length
      ? code - 32
      : -1;
    const em = index < 0
      ? 1
      : (AXIS_TEXT_WIDTH_MAP.charCodeAt(index) - AXIS_TEXT_WIDTH_OFFSET)
        / AXIS_TEXT_WIDTH_SCALE;
    width += em * AXIS_FONT_SIZE;
  }
  return Math.ceil(width * AXIS_TEXT_WIDTH_SAFETY_FACTOR);
}

function tickInterval(frequency, kind) {
  if (!frequency || !Number.isInteger(frequency.every) || frequency.every < 1) return undefined;
  if (kind === "temporal") {
    const unit = TIME_UNITS_MS[frequency.unit];
    return Number.isFinite(unit) ? unit * frequency.every : undefined;
  }
  if (kind === "category") return frequency.every - 1;
  return frequency.every;
}

function calendarTickIntervalHint(frequency, kind) {
  if (kind !== "temporal" || !Number.isInteger(frequency?.every) || frequency.every < 1) {
    return undefined;
  }
  if (frequency.unit === "month") return frequency.every * 31 * DAY_MS;
  if (frequency.unit === "year") return frequency.every * 366 * DAY_MS;
  return undefined;
}

function temporalLabelFormatter(preset, frequency) {
  return (value, index) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value ?? "");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const monthName = date.toLocaleString("en-GB", { month: "short" });
    if (preset === "adaptive") {
      return adaptiveTemporalLabel(date, index, frequency, {
        day,
        monthName,
        year,
        time,
      });
    }
    if (preset === "ddMmmYearBoundary") {
      return tickStartsYear(date, index, frequency)
        ? `${day} ${monthName} ${year}`
        : `${day} ${monthName}`;
    }
    if (preset === "ddMmYyyy") return `${day}-${month}-${year}`;
    if (preset === "ddMmYy") return `${day}-${month}-${String(year).slice(-2)}`;
    if (preset === "hhMm") return time;
    if (preset === "ddMmYyyyHhMm") return `${day}-${month}-${year} ${time}`;
    return String(value ?? "");
  };
}

function formatTemporalHoverLabel(value, preset, sourceFormat) {
  const parts = temporalHoverParts(value);
  if (!parts) return String(value ?? "");
  const display = ["year", "date", "dateTime"].includes(preset) ? preset : "auto";
  if (display === "year" || (display === "auto" && (sourceFormat === "YYYY" || parts.yearOnly))) {
    return parts.year;
  }
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return display === "dateTime" || (display === "auto" && parts.hasTime)
    ? `${date} ${parts.hour}:${parts.minute}`
    : date;
}

function temporalHoverParts(value) {
  const source = typeof value === "string" ? value.trim() : null;
  const year = source ? YEAR_ONLY.exec(source) : null;
  if (year) {
    return {
      year: year[1],
      month: "01",
      day: "01",
      hour: "00",
      minute: "00",
      yearOnly: true,
      hasTime: false,
    };
  }
  const local = source ? LOCAL_CALENDAR_TIMESTAMP.exec(source) : null;
  if (local) {
    return {
      year: local[1],
      month: local[2],
      day: local[3],
      hour: local[4] ?? "00",
      minute: local[5] ?? "00",
      yearOnly: false,
      hasTime: local[4] !== undefined,
    };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return {
    year: String(date.getFullYear()).padStart(4, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
    hour: String(date.getHours()).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
    yearOnly: false,
    hasTime: source?.includes("T") ?? false,
  };
}

function adaptiveTemporalLabel(date, index, frequency, parts) {
  const includesTime = ["minute", "hour"].includes(frequency?.unit);
  if (!Number.isInteger(index) || index === 0) {
    return `${parts.day} ${parts.monthName} ${parts.year}${includesTime ? ` ${parts.time}` : ""}`;
  }
  const previous = previousScheduledTick(date, frequency);
  if (!previous) return includesTime ? parts.time : String(date.getDate());
  if (previous.getFullYear() !== date.getFullYear()) return String(parts.year);
  if (previous.getMonth() !== date.getMonth()) return parts.monthName;
  if (includesTime && previous.getDate() === date.getDate()) return parts.time;
  return String(date.getDate());
}

function tickStartsYear(date, index, frequency) {
  if (!Number.isInteger(index) || index === 0) return true;
  const previous = previousScheduledTick(date, frequency);
  if (previous) return previous.getFullYear() !== date.getFullYear();
  return date.getMonth() === 0 && date.getDate() === 1;
}

function previousScheduledTick(date, frequency) {
  if (!Number.isInteger(frequency?.every) || frequency.every < 1) return null;
  const previous = new Date(date.valueOf());
  const every = frequency.every;
  if (frequency.unit === "minute") previous.setMinutes(previous.getMinutes() - every);
  else if (frequency.unit === "hour") previous.setHours(previous.getHours() - every);
  else if (frequency.unit === "day") previous.setDate(previous.getDate() - every);
  else if (frequency.unit === "week") previous.setDate(previous.getDate() - (every * 7));
  else if (frequency.unit === "month") previous.setMonth(previous.getMonth() - every);
  else if (frequency.unit === "year") previous.setFullYear(previous.getFullYear() - every);
  else return null;
  return previous;
}
