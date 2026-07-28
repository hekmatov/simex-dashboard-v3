import React from "react";

import ChartView from "../charts/ChartView.jsx";
import { usePlayback } from "./PlaybackProvider.jsx";

export default function PlaybackView() {
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
  const unavailableCount = members.filter((chart) => (
    readEntry(loadedData, chart.sourceId) === undefined
    || readEntry(loadedData, chart.sourceId) === null
    || readEntry(profiles, chart.sourceId) === undefined
    || readEntry(profiles, chart.sourceId) === null
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
    members.map((chart) => React.createElement(PlaybackMember, {
      key: chart.id,
      chart,
      loadedData,
      profiles,
    }))));
}

function PlaybackMember({ chart, loadedData, profiles }) {
  const rows = readEntry(loadedData, chart.sourceId);
  const datasetProfile = readEntry(profiles, chart.sourceId);
  const geoSourceId = chart.presentation?.map?.geoSource;
  const geoData = geoSourceId
    ? readEntry(loadedData, geoSourceId)
    : undefined;
  const unavailable = rows === undefined
    || rows === null
    || datasetProfile === undefined
    || datasetProfile === null;

  return React.createElement("article", {
    className: `playback-member${unavailable ? " playback-member--unavailable" : ""}`,
    "data-chart-id": chart.id,
  },
  unavailable
    ? React.createElement(React.Fragment, null,
        React.createElement("h3", null, chart.title || "Untitled chart"),
        React.createElement("p", {
          className: "playback-member-status",
          role: "status",
        }, `Data source ${chart.sourceId} is unavailable.`))
    : React.createElement(ChartView, {
        chart,
        rows,
        datasetProfile: datasetProfile?.datasetProfile
          ?? datasetProfile?.profile
          ?? datasetProfile,
        geoData,
        renderContext: {
          mapName: geoSourceId ?? chart.id,
        },
      }));
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
