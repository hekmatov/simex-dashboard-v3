import React from "react";

import { IconControl } from "../common/SimExIcon.js";
import { usePlayback } from "./PlaybackProvider.jsx";

const ENTRY_BLOCKED_REASON_ID = "playback-entry-blocked-reason";

export default function PlaybackControls({
  entryBlocked = false,
  entryBlockedReason,
} = {}) {
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
  const playbackEntryBlocked = playbackView !== true && entryBlocked === true;
  const blockedReason = playbackEntryBlocked
    ? boundedReason(entryBlockedReason)
    : null;

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
    React.createElement(IconControl, {
      interactionId: "playback.previous-time-point",
      ariaLabel: "Previous time",
      tooltip: "Previous",
      disabled: atStart,
      onClick: () => dispatch({ type: "previous", clockLength: clock.length }),
    }),
    React.createElement(IconControl, {
      interactionId: playing ? "playback.pause" : "playback.play",
      ariaLabel: playing
        ? "Pause synchronized charts"
        : "Play synchronized charts",
      tooltip: playing ? "Pause" : "Play",
      disabled: !playbackView || !hasClock || (!playing && atEnd),
      onClick: () => dispatch({
        type: playing ? "pause" : "play",
        ...(playing ? {} : { clockLength: clock.length }),
      }),
    }),
    React.createElement(IconControl, {
      interactionId: "playback.next-time-point",
      ariaLabel: "Next time",
      tooltip: "Next",
      disabled: atEnd,
      onClick: () => dispatch({ type: "next", clockLength: clock.length }),
    })),
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
    labelClassName: "visually-hidden",
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
  React.createElement(IconControl, {
    interactionId: "playback.open-synchronized-playback",
    className: "playback-view-toggle",
    ariaLabel: playbackView ? "Close playback view" : "Open playback view",
    tooltip: playbackView ? "Close playback view" : "Open playback view",
    "aria-expanded": playbackView,
    ...(blockedReason
      ? { "aria-describedby": ENTRY_BLOCKED_REASON_ID }
      : {}),
    disabled: playbackEntryBlocked,
    onClick: () => dispatch({
      type: playbackView ? "closeView" : "openView",
    }),
  }),
  blockedReason
    ? React.createElement("p", {
        id: ENTRY_BLOCKED_REASON_ID,
        className: "playback-entry-blocked-reason",
      }, blockedReason)
    : null,
  React.createElement("p", {
    className: "playback-live-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": true,
  }, status));
}

function LabeledSelect({
  label,
  labelClassName,
  value,
  onChange,
  options,
  disabled = false,
  emptyLabel,
}) {
  return React.createElement("label", { className: "playback-select" },
    React.createElement("span", { className: labelClassName || undefined }, label),
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

function boundedReason(reason) {
  const text = typeof reason === "string" && reason.trim()
    ? reason.trim()
    : "Finish, save, or discard chart authoring before opening Playback view.";
  return text.length <= 240 ? text : `${text.slice(0, 239)}\u2026`;
}
