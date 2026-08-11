import React from "react";

import { resolveChartRendering } from "../../charting/rendering/resolveChartRendering.js";
import ChartView from "../charts/ChartView.jsx";
import { usePlayback } from "./PlaybackProvider.jsx";

export default function PlaybackView({ accessibilityEnabled = false } = {}) {
  const playback = usePlayback();
  const {
    activeGroup,
    charts,
    loadedData,
    profiles,
    timeContext,
  } = playback;

  if (!activeGroup) {
    return React.createElement(PlaybackViewStatus, {
      message: "Choose a playback group to view synchronized charts.",
    });
  }
  if (!timeContext) {
    return React.createElement(PlaybackViewStatus, {
      message: `No playback times are available for ${activeGroup.name}.`,
    });
  }

  const chartsById = indexCharts(charts);
  const members = activeGroup.members
    .map((member) => chartsById.get(member.chartId))
    .filter((chart) => (
      chart?.interaction?.timeSync?.groupId === activeGroup.id
    ));
  const resolvedMembers = members.map((chart) => resolveMember({
    chart,
    loadedData,
    profiles,
    timeContext: playback.timeContextForChart(chart.id),
    accessibilityEnabled,
  }));
  const unavailableCount = resolvedMembers.filter(({ resolution }) => (
    resolution.status === "unavailable"
  )).length;
  const availableCount = members.length - unavailableCount;

  return React.createElement("section", {
    className: "playback-view",
    "aria-label": `${activeGroup.name} playback view`,
  },
  React.createElement("header", { className: "playback-view-header" },
    React.createElement("h2", null, activeGroup.name),
    React.createElement("p", {
      className: "playback-view-status",
      role: "status",
      "aria-live": "polite",
    }, `${members.length} participating charts. ${availableCount} available; ${unavailableCount} unavailable.`)),
  React.createElement("div", { className: "playback-members" },
    resolvedMembers.map((member) => React.createElement(PlaybackMember, {
      key: member.chart.id,
      ...member,
    }))));
}

function PlaybackMember({ chart, chartProps, resolution }) {
  const unavailable = resolution.status === "unavailable";

  return React.createElement("article", {
    className: `playback-member${unavailable ? " playback-member--unavailable" : ""}`,
    "data-chart-id": chart.id,
  },
  React.createElement(ChartView, {
    ...chartProps,
    resolvedRendering: resolution,
  }));
}

function resolveMember({
  chart,
  loadedData,
  profiles,
  timeContext,
  accessibilityEnabled,
}) {
  const rows = readEntry(loadedData, chart.sourceId);
  const profileEntry = readEntry(profiles, chart.sourceId);
  const datasetProfile = profileEntry?.datasetProfile
    ?? profileEntry?.profile
    ?? profileEntry;
  const geoSourceId = chart.presentation?.map?.geoSource;
  const geoData = geoSourceId
    ? readEntry(loadedData, geoSourceId)
    : undefined;
  const renderContext = {
    mapName: geoSourceId ?? chart.id,
    accessibilityEnabled,
  };
  const chartProps = {
    chart,
    rows,
    datasetProfile,
    geoData,
    timeContext,
    renderContext,
    accessibilityEnabled,
  };
  return {
    chart,
    chartProps,
    resolution: resolveChartRendering(chartProps),
  };
}

function PlaybackViewStatus({ message }) {
  return React.createElement("section", {
    className: "playback-view playback-view--empty",
    role: "status",
    "aria-live": "polite",
  }, message);
}

function indexCharts(charts) {
  const values = Array.isArray(charts)
    ? charts
    : charts instanceof Map
      ? [...charts.values()]
      : charts && typeof charts === "object"
        ? Object.values(charts)
        : [];
  return new Map(values.map((chart) => [chart.id, chart]));
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return collection && typeof collection === "object"
    ? collection[key]
    : undefined;
}
