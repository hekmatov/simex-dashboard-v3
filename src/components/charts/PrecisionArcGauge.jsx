import React from "react";

const START_ANGLE = 180;
const END_ANGLE = 360;
const CENTER_X = 250;
const CENTER_Y = 202;
const ARC_RADIUS = 178;
const TAU = Math.PI * 2;
const REFERENCE_COLORS = ["#9a665c", "#9a794c", "#667853"];

export default function PrecisionArcGauge({ gauge, label = "Gauge", audienceScale = null }) {
  const actual = finiteValue(gauge?.actual);
  const target = finiteValue(gauge?.target);
  const maximum = positiveValue(gauge?.maximum, 100);
  const segments = normalizedSegments(gauge?.segments);
  const actualRatio = ratio(actual, maximum);
  const targetRatio = ratio(target, maximum);
  const pointer = actualRatio === null ? null : pointerPoints(actualRatio);
  const targetPoint = targetRatio === null ? null : polarPoint(ARC_RADIUS, angleFor(targetRatio));
  const targetLabel = targetPoint === null ? null : targetLabelPosition(targetPoint);
  const status = gaugeStatus(actual, target);
  const summary = `${label}: actual ${displayValue(actual)}${target === null ? "" : `; target ${displayValue(target)}`}${status ? `; ${status.toLowerCase()}` : ""}.`;
  const typography = typographyStyle(audienceScale);

  return React.createElement("div", {
    className: "precision-arc-gauge",
    role: "img",
    "aria-label": summary,
    "data-audience-scale-tier": audienceScale?.tier,
    style: typography,
  }, React.createElement("svg", {
    className: "precision-arc-gauge-svg",
    viewBox: "0 0 500 260",
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": true,
  },
  React.createElement("path", {
    className: "precision-arc-gauge-track",
    d: arcPath(START_ANGLE, END_ANGLE),
  }),
  segments.map(({ start, end, color }, index) => React.createElement("path", {
    key: `${end}-${color}-${index}`,
    className: "precision-arc-gauge-range",
    d: arcPath(angleFor(start, 1.1), angleFor(end, -1.1)),
    stroke: displaySegmentColor(color, index),
  })),
  Array.from({ length: 7 }, (_, index) => React.createElement("line", {
    key: `tick-${index}`,
    className: "precision-arc-gauge-tick",
    ...radialLine(index / 6, 172, 160),
  })),
  targetPoint
    ? React.createElement(React.Fragment, null,
      React.createElement("circle", {
        className: "precision-arc-gauge-target",
        "data-precision-target": "",
        cx: targetPoint.x,
        cy: targetPoint.y,
        r: 7,
      }),
      React.createElement("text", {
        className: "precision-arc-gauge-target-text",
        "data-precision-target-label-anchor": targetLabel.anchor,
        x: targetLabel.x,
        y: Math.max(28, targetPoint.y - 9),
        style: { textAnchor: targetLabel.anchor },
      }, `TARGET ${displayValue(target)}`))
    : null,
  pointer
    ? React.createElement("line", {
        className: "precision-arc-gauge-needle",
        x1: pointer.inner.x,
        y1: pointer.inner.y,
        x2: pointer.outer.x,
        y2: pointer.outer.y,
      })
    : null,
  pointer
    ? React.createElement("circle", {
        className: "precision-arc-gauge-needle-cap",
        cx: pointer.outer.x,
        cy: pointer.outer.y,
        r: 5,
      })
    : null,
  React.createElement("text", {
    className: "precision-arc-gauge-value",
    x: CENTER_X,
    y: 164,
  }, displayValue(actual)),
  React.createElement("text", {
    className: "precision-arc-gauge-unit",
    x: CENTER_X,
    y: 185,
  }, "OF TARGET RANGE"),
  React.createElement("text", {
    className: "precision-arc-gauge-status",
    x: CENTER_X,
    y: 237,
  }, status),
  React.createElement("text", { className: "precision-arc-gauge-bound", x: 65, y: 229 }, "0"),
  React.createElement("text", { className: "precision-arc-gauge-bound", x: 435, y: 229 }, displayValue(maximum))));
}

function normalizedSegments(segments) {
  const values = Array.isArray(segments) ? segments : [];
  let start = 0;
  const normalized = values.flatMap(([end, color]) => {
    const boundedEnd = clamp(Number(end), 0, 1);
    if (!Number.isFinite(boundedEnd) || boundedEnd <= start) return [];
    const segment = { start, end: boundedEnd, color: safeColor(color) };
    start = boundedEnd;
    return [segment];
  });
  return normalized.length > 0 ? normalized : [{ start: 0, end: 1, color: "#1a9850" }];
}

function safeColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)
    ? value
    : "#1a9850";
}

function ratio(value, maximum) {
  return value === null ? null : clamp(value / maximum, 0, 1);
}

function pointerPoints(progress) {
  const angle = angleFor(progress);
  return {
    inner: polarPoint(98, angle),
    outer: polarPoint(178, angle),
  };
}

function angleFor(progress, nudge = 0) {
  return START_ANGLE + ((END_ANGLE - START_ANGLE) * clamp(progress, 0, 1)) + nudge;
}

function arcPath(startAngle, endAngle) {
  const start = polarPoint(ARC_RADIUS, startAngle);
  const end = polarPoint(ARC_RADIUS, endAngle);
  const span = Math.abs(endAngle - startAngle);
  return `M ${start.x} ${start.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${span > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

function polarPoint(radius, angle) {
  const radians = (angle / 360) * TAU;
  return {
    x: round(CENTER_X + (radius * Math.cos(radians))),
    y: round(CENTER_Y + (radius * Math.sin(radians))),
  };
}

function radialLine(progress, innerRadius, outerRadius) {
  const inner = polarPoint(innerRadius, angleFor(progress));
  const outer = polarPoint(outerRadius, angleFor(progress));
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
}

function targetLabelPosition(point) {
  if (point.x > CENTER_X) {
    return { x: Math.min(480, point.x + 28), anchor: "end" };
  }
  return { x: Math.max(20, point.x - 28), anchor: "start" };
}

function typographyStyle(audienceScale) {
  if (!audienceScale) return undefined;
  const value = positiveValue(audienceScale.value, 44);
  const text = positiveValue(audienceScale.text, 12);
  return {
    "--precision-arc-value-size": `${value}px`,
    "--precision-arc-text-size": `${text}px`,
  };
}

function displaySegmentColor(color, index) {
  const defaultColors = ["#d73027", "#fdae61", "#1a9850", "#2c7bb6"];
  return defaultColors.includes(String(color).toLowerCase())
    ? REFERENCE_COLORS[Math.min(index, REFERENCE_COLORS.length - 1)]
    : color;
}

function gaugeStatus(actual, target) {
  if (actual === null || target === null) return "CURRENT STATUS";
  const difference = round(actual - target);
  if (difference === 0) return "ON TARGET";
  const points = displayValue(Math.abs(difference));
  return difference > 0
    ? `ON TRACK · ${points} POINT${Math.abs(difference) === 1 ? "" : "S"} ABOVE TARGET`
    : `BELOW TARGET · ${points} POINT${Math.abs(difference) === 1 ? "" : "S"} BELOW TARGET`;
}

function finiteValue(value) {
  return Number.isFinite(value) ? value : null;
}

function positiveValue(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function displayValue(value) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}
