import React from "react";

import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { applyTimeContext, applyTransforms, readRoleValue } from "../../charting/data/transforms.js";
import { buildRenderModel } from "../../charting/rendering/buildRenderModel.js";
import CardChartView from "./CardChartView.jsx";
import EChartsChartView from "./EChartsChartView.jsx";
import ImageChartView from "./ImageChartView.jsx";
import TableChartView from "./TableChartView.jsx";

const MAX_STATUS_LENGTH = 240;

export default function ChartView(props) {
  try {
    const prepared = prepareChartData(props);
    const model = buildRenderModel({ ...props, prepared });
    if (model.kind === "echarts") return React.createElement(EChartsChartView, { model, chart: props.chart });
    if (model.kind === "cards") return React.createElement(CardChartView, { model: addComparisonTimes(model, props), chart: props.chart });
    if (model.kind === "table") return React.createElement(TableChartView, { model, chart: props.chart });
    if (model.kind === "image") return React.createElement(ImageChartView, { model, chart: props.chart });
    return React.createElement(ChartStatus, { message: model.message, empty: prepared.status === "empty" });
  } catch {
    return React.createElement(ChartStatus, { message: "This chart cannot be displayed." });
  }
}

function addComparisonTimes(model, { chart = {}, rows = [], datasetProfile, timeContext } = {}) {
  if (!Array.isArray(model.items)) return model;
  const timeBinding = chart.roles?.time;
  if (!timeBinding) return model;
  const entityBinding = chart.roles?.entity;
  const scopedRows = scopeRows(rows, chart, timeContext, timeBinding, datasetProfile);
  return { ...model, items: model.items.map((item) => ({ ...item, comparisonTime: comparisonTimeFor(item, scopedRows, timeBinding, entityBinding, datasetProfile) })) };
}

function scopeRows(rows, chart, timeContext, timeBinding, datasetProfile) {
  const transformed = applyTransforms(rows, chart.transformations, datasetProfile);
  return applyTimeContext(transformed.rows, timeContext, datasetProfile).rows.filter((row) => {
    const time = readRoleValue(row, timeBinding, datasetProfile);
    return Boolean(time);
  });
}

function comparisonTimeFor(item, rows, timeBinding, entityBinding, datasetProfile) {
  if (item.comparison === null || item.comparison === undefined) return null;
  return rows
    .filter((row) => !entityBinding || Object.is(readRoleValue(row, entityBinding, datasetProfile), item.label))
    .map((row) => readRoleValue(row, timeBinding, datasetProfile))
    .filter((time) => time && time < item.time)
    .sort((left, right) => String(left).localeCompare(String(right)))
    .at(-1) ?? null;
}

function ChartStatus({ message, empty = false }) {
  return React.createElement("div", {
    className: empty ? "chart-status-empty" : "chart-status-error",
    role: "status",
    "aria-live": "polite",
  }, boundedMessage(message));
}

function boundedMessage(message) {
  const text = typeof message === "string" && message.trim() ? message.trim() : "No chart data is available.";
  return text.length <= MAX_STATUS_LENGTH ? text : `${text.slice(0, MAX_STATUS_LENGTH - 1)}…`;
}
