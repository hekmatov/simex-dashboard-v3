import React from "react";

import { usePlayback } from "./PlaybackProvider.jsx";

export default function PlaybackControls() {
  const playback = usePlayback();
  const {
    activeEpochMs,
    activeGroupId,
    activeIndex,
    clock,
    dispatch,
    groups,
    playbackView,
    playing,
    speed,
    status,
  } = playback;
  const hasClock = activeGroupId !== null && clock.length > 0;
  const atStart = !hasClock || activeIndex <= 0;
  const atEnd = !hasClock || activeIndex >= clock.length - 1;

  return React.createElement("section", {
    className: "playback-controls",
    "aria-label": "Synchronized playback controls",
  },
  groups.length > 1
    ? React.createElement(LabeledSelect, {
        label: "Playback group",
        value: activeGroupId ?? "",
        onChange: (event) => dispatch({
          type: "setGroup",
          groupId: event.target.value || null,
        }),
        options: groups.map((group) => ({
          value: group.id,
          label: group.name,
        })),
      })
    : null,
  React.createElement("div", { className: "playback-transport" },
    React.createElement("button", {
      type: "button",
      "aria-label": "Previous time",
      disabled: atStart,
      onClick: () => dispatch({ type: "previous", clockLength: clock.length }),
    }, "Previous"),
    React.createElement("button", {
      type: "button",
      "aria-label": playing
        ? "Pause synchronized charts"
        : "Play synchronized charts",
      disabled: !hasClock || (!playing && atEnd),
      onClick: () => dispatch({
        type: playing ? "pause" : "play",
        ...(playing ? {} : { clockLength: clock.length }),
      }),
    }, playing ? "Pause" : "Play"),
    React.createElement("button", {
      type: "button",
      "aria-label": "Next time",
      disabled: atEnd,
      onClick: () => dispatch({ type: "next", clockLength: clock.length }),
    }, "Next")),
  React.createElement("div", { className: "playback-time-controls" },
    React.createElement("label", null,
      React.createElement("span", null, "Playback time"),
      React.createElement("input", {
        type: "range",
        "aria-label": "Playback time",
        min: 0,
        max: Math.max(0, clock.length - 1),
        step: 1,
        value: activeIndex,
        disabled: !hasClock,
        onChange: (event) => dispatch({
          type: "seek",
          index: Number(event.target.value),
          clockLength: clock.length,
        }),
      })),
    React.createElement(LabeledSelect, {
      label: "Choose synchronized time",
      value: hasClock ? String(activeIndex) : "",
      disabled: !hasClock,
      onChange: (event) => dispatch({
        type: "seek",
        index: Number(event.target.value),
        clockLength: clock.length,
      }),
      options: clock.map((epochMs, index) => ({
        value: String(index),
        label: canonicalTime(epochMs),
      })),
      emptyLabel: "No time available",
    })),
  React.createElement("p", { className: "playback-current-time" },
    "Current time: ",
    activeEpochMs === null
      ? "Unavailable"
      : React.createElement("time", {
          dateTime: new Date(activeEpochMs).toISOString(),
        }, canonicalTime(activeEpochMs))),
  React.createElement(LabeledSelect, {
    label: "Playback speed",
    value: String(speed),
    onChange: (event) => dispatch({
      type: "setSpeed",
      speed: Number(event.target.value),
    }),
    options: [1, 2, 3].map((value) => ({
      value: String(value),
      label: `${value}\u00d7`,
    })),
  }),
  React.createElement("button", {
    type: "button",
    className: "playback-view-toggle",
    "aria-label": playbackView ? "Close playback view" : "Open playback view",
    "aria-expanded": playbackView,
    onClick: () => dispatch({
      type: playbackView ? "closeView" : "openView",
    }),
  }, playbackView ? "Close playback view" : "Open playback view"),
  React.createElement("p", {
    className: "playback-live-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": true,
  }, status));
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  emptyLabel,
}) {
  return React.createElement("label", { className: "playback-select" },
    React.createElement("span", null, label),
    React.createElement("select", {
      "aria-label": label,
      value,
      disabled,
      onChange,
    },
    options.length === 0 && emptyLabel
      ? React.createElement("option", { value: "" }, emptyLabel)
      : options.map((option) => React.createElement("option", {
          key: option.value,
          value: option.value,
        }, option.label))));
}

function canonicalTime(epochMs) {
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}
