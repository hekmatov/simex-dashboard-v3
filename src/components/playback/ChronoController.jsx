import React from "react";

import { IconControl } from "../common/SimExIcon.js";
import { usePlayback } from "./PlaybackProvider.jsx";

const FRAME_TICKS_ID = "chrono-frame-ticks";

export default function ChronoController() {
  const playback = usePlayback();
  const {
    activeGroup,
    activeScene,
    activeEpochMs,
    activeIndex,
    availabilityVisible,
    clock,
    dispatch,
    frameAvailability,
    groups,
    matchingOverride,
    placement,
    playing,
    scenes,
    scope,
    speed,
    status,
    traceMode,
  } = playback;
  const hasClock = clock.length > 0;
  const atStart = !hasClock || activeIndex <= 0;
  const atEnd = !hasClock || activeIndex >= clock.length - 1;

  return React.createElement(
    "section",
    {
      className: `playback-controls playback-controls--floating playback-controls--${placement === "mast" ? "top" : "bottom"}`,
      "aria-label": "Chrono playback controls",
    },
    React.createElement(
      "div",
      { className: "chrono-session-controls" },
      React.createElement(
        "label",
        { className: "playback-select" },
        React.createElement("span", null, "Source"),
        React.createElement(
          "select",
          {
            "aria-label": "Chrono source",
            value: activeScene
              ? `scene:${activeScene.id}`
              : playback.source?.kind === "default"
                ? "default"
                : `group:${activeGroup?.id ?? ""}`,
            onChange: (event) => selectSource(event.target.value, { dispatch, groups, scenes }),
          },
          React.createElement("option", { value: "default" }, "Default page timeline"),
          groups.map((group) => React.createElement(
            "option",
            { key: `group:${group.id}`, value: `group:${group.id}` },
            group.name,
          )),
          scenes.map((scene) => React.createElement(
            "option",
            { key: `scene:${scene.id}`, value: `scene:${scene.id}` },
            scene.name,
          )),
        ),
      ),
      selectControl("Chrono chart scope", "Scope", scope, [
        ["all-page", "All page charts"],
        ["group-only", "Group only"],
      ], (value) => dispatch({ type: "setScope", scope: value })),
      selectControl("Chrono matching policy", "Matching", matchingOverride, [
        ["authored", "Use authored settings"],
        ["concurrent", "Concurrent only"],
        ["interpolate", "Interpolate"],
        ["latest", "Snap to Latest"],
        ["closest", "Snap to Closest"],
      ], (value) => dispatch({ type: "setMatchingOverride", policy: value })),
      selectControl("Chrono trace behavior", "Trace", traceMode, [
        ["reveal", "Reveal to frame"],
        ["full", "Full timeline"],
      ], (value) => dispatch({ type: "setTraceMode", mode: value })),
    ),
    React.createElement(
      "div",
      { className: "playback-transport" },
      React.createElement(IconControl, {
        interactionId: "playback.previous-time-point",
        ariaLabel: "Previous frame",
        tooltip: "Previous frame",
        disabled: atStart,
        onClick: () => dispatch({ type: "previous", clockLength: clock.length }),
      }),
      React.createElement(IconControl, {
        interactionId: playing ? "playback.pause" : "playback.play",
        ariaLabel: playing ? "Pause Chrono" : "Play Chrono",
        tooltip: playing ? "Pause" : "Play",
        disabled: !hasClock || (!playing && atEnd),
        onClick: () => dispatch({
          type: playing ? "pause" : "play",
          ...(playing ? {} : { clockLength: clock.length }),
        }),
      }),
      React.createElement(IconControl, {
        interactionId: "playback.next-time-point",
        ariaLabel: "Next frame",
        tooltip: "Next frame",
        disabled: atEnd,
        onClick: () => dispatch({ type: "next", clockLength: clock.length }),
      }),
    ),
    React.createElement(
      "div",
      { className: "chrono-seek" },
      React.createElement(
        "label",
        null,
        React.createElement("span", { className: "visually-hidden" }, "Playback frame"),
        React.createElement("input", {
          type: "range",
          "aria-label": "Playback frame",
          min: hasClock ? clock[0] : 0,
          max: hasClock ? clock[clock.length - 1] : 0,
          step: "any",
          list: FRAME_TICKS_ID,
          value: activeEpochMs ?? 0,
          disabled: !hasClock,
          onChange: (event) => dispatch({
            type: "seek",
            index: nearestClockIndex(clock, Number(event.target.value)),
            clockLength: clock.length,
          }),
        }),
        React.createElement(
          "datalist",
          { id: FRAME_TICKS_ID },
          clock.map((epochMs) => React.createElement("option", {
            key: epochMs,
            value: epochMs,
          })),
        ),
        React.createElement("span", { className: "chrono-frame-ticks", "aria-hidden": "true" },
          clock.map((epochMs) => React.createElement("i", {
            key: epochMs,
            style: { "--chrono-frame-position": `${framePosition(epochMs, clock)}%` },
          }))),
      ),
      React.createElement(
        "div",
        { className: "chrono-range-boundaries", "aria-hidden": "true" },
        React.createElement("span", null, hasClock ? canonicalTime(clock[0]) : "—"),
        React.createElement(
          "span",
          null,
          hasClock ? canonicalTime(clock[clock.length - 1]) : "—",
        ),
      ),
    ),
    React.createElement(
      "p",
      { className: "playback-current-time" },
      React.createElement("strong", null, "Frame ", activeIndex + 1, " of ", clock.length),
      React.createElement("span", null,
        activeEpochMs === null
          ? "Unavailable"
          : React.createElement(
              "time",
              { dateTime: new Date(activeEpochMs).toISOString() },
              canonicalTime(activeEpochMs),
            )),
    ),
    React.createElement(
      "label",
      { className: "playback-select chrono-cadence" },
      React.createElement("span", null, "Seconds per frame"),
      React.createElement("input", {
        type: "number",
        "aria-label": "Seconds per frame",
        min: "0.001",
        step: "any",
        inputMode: "decimal",
        value: speed,
        onChange: (event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value) && value > 0) dispatch({ type: "setSpeed", speed: value });
        },
      }),
    ),
    React.createElement(
      "button",
      {
        type: "button",
        className: "secondary chrono-availability-button",
        "aria-label": "Show availability information",
        "aria-expanded": availabilityVisible,
        onClick: () => dispatch({ type: "toggleAvailability" }),
      },
      "Availability",
    ),
    React.createElement(
      "button",
      {
        type: "button",
        className: "secondary chrono-position-button",
        "aria-label": placement === "deck"
          ? "Move Chrono controls to mast"
          : "Move Chrono controls to deck",
        title: placement === "deck" ? "Move to mast" : "Move to deck",
        onClick: () => dispatch({
          type: "moveController",
          placement: placement === "deck" ? "mast" : "deck",
        }),
      },
      placement === "deck" ? "↑" : "↓",
    ),
    availabilityVisible
      ? React.createElement(
          "aside",
          { className: "chrono-availability", "aria-label": "Frame availability and provenance" },
          React.createElement("strong", null, "Availability at this frame"),
          React.createElement(
            "ul",
            null,
            frameAvailability.length === 0
              ? React.createElement("li", { "data-availability": "missing" }, "No participating chart evidence is available at this frame.")
              : frameAvailability.map((entry) => React.createElement(
                  "li",
                  { key: entry.chartId, "data-availability": entry.status, "data-chart-id": entry.chartId },
                  React.createElement("span", { className: "chrono-availability-identity" },
                    React.createElement("b", null, entry.seriesId),
                    React.createElement("strong", null, entry.chartLabel)),
                  React.createElement("span", null, `${entry.statusLabel} — ${entry.detail}`),
                  React.createElement("small", null, `${entry.observedFrameCount} observed dates in the selected period`),
                )),
          ),
        )
      : null,
    React.createElement(
      "p",
      {
        className: "visually-hidden",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": true,
      },
      status,
    ),
  );
}

export function nearestClockIndex(clock, epochMs) {
  if (!Array.isArray(clock) || clock.length === 0 || !Number.isFinite(epochMs)) return 0;
  let nearest = 0;
  let distance = Math.abs(clock[0] - epochMs);
  for (let index = 1; index < clock.length; index += 1) {
    const nextDistance = Math.abs(clock[index] - epochMs);
    if (nextDistance < distance) {
      nearest = index;
      distance = nextDistance;
    }
  }
  return nearest;
}

function framePosition(epochMs, clock) {
  const start = clock[0];
  const end = clock[clock.length - 1];
  return end > start ? ((epochMs - start) / (end - start)) * 100 : 0;
}

function selectControl(ariaLabel, label, value, options, onChange) {
  return React.createElement(
    "label",
    { className: "playback-select" },
    React.createElement("span", null, label),
    React.createElement(
      "select",
      {
        "aria-label": ariaLabel,
        value,
        onChange: (event) => onChange(event.target.value),
      },
      options.map(([optionValue, optionLabel]) => React.createElement(
        "option",
        { key: optionValue, value: optionValue },
        optionLabel,
      )),
    ),
  );
}

function selectSource(value, { dispatch, groups, scenes }) {
  if (value === "default") {
    dispatch({ type: "setGroup", groupId: null });
    return;
  }
  const [kind, id] = value.split(":");
  if (kind === "scene") {
    const scene = scenes.find((candidate) => candidate.id === id);
    dispatch({ type: "setScene", sceneId: id, period: scene?.period });
    return;
  }
  const group = groups.find((candidate) => candidate.id === id);
  dispatch({ type: "setGroup", groupId: id, period: group?.period });
}

function canonicalTime(epochMs) {
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}
