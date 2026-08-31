const TIME_UNITS_MS = Object.freeze({
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
});
const DAY_MS = TIME_UNITS_MS.day;

export function xAxisPresentation(settings, kind) {
  const result = axisTitle(settings, "x");
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
  return result;
}

export function valueAxisPresentation(settings) {
  const result = axisTitle(settings, "y");
  const interval = tickInterval(settings?.tickFrequency, "number");
  if (interval !== undefined) result.interval = interval;
  return result;
}

function axisTitle(settings = {}, direction) {
  const title = settings.title ?? settings.yTitle ?? settings.name ?? "";
  if (!title) return {};
  const positions = direction === "y"
    ? { top: "end", center: "middle", bottom: "start" }
    : { left: "start", center: "middle", right: "end" };
  return {
    name: title,
    nameLocation: positions[settings.titlePosition] ?? "middle",
    nameRotate: direction === "x" || settings.titleOrientation === "horizontal" ? 0 : 90,
    nameGap: 36,
  };
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
