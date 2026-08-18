import React from "react";

import { IconControl } from "../common/SimExIcon.js";
import { usePlayback } from "./PlaybackProvider.jsx";

const FRAME_TICKS_ID = "chrono-frame-ticks";

export default function ChronoController() {
  const playback = usePlayback();
  const [position, setPosition] = React.useState("bottom");
  const {
    activeEpochMs,
    activeIndex,
    clock,
    dispatch,
    playing,
    speed,
    status,
  } = playback;
  const hasClock = clock.length > 0;
  const atStart = !hasClock || activeIndex <= 0;
  const atEnd = !hasClock || activeIndex >= clock.length - 1;

  return React.createElement(
    "section",
    {
      className: `playback-controls playback-controls--floating playback-controls--${position}`,
      "aria-label": "Chrono playback controls",
    },
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
          min: 0,
          max: Math.max(0, clock.length - 1),
          step: 1,
          list: FRAME_TICKS_ID,
          value: activeIndex,
          disabled: !hasClock,
          onChange: (event) => dispatch({
            type: "seek",
            index: Number(event.target.value),
            clockLength: clock.length,
          }),
        }),
        React.createElement(
          "datalist",
          { id: FRAME_TICKS_ID },
          clock.map((_, index) => React.createElement("option", {
            key: index,
            value: index,
          })),
        ),
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
      React.createElement(
        "select",
        {
          "aria-label": "Seconds per frame",
          value: String(speed),
          onChange: (event) => dispatch({
            type: "setSpeed",
            speed: Number(event.target.value),
          }),
        },
        [1, 2.5, 5].map((value) => React.createElement(
          "option",
          { key: value, value: String(value) },
          `${value} seconds`,
        )),
      ),
    ),
    React.createElement(
      "button",
      {
        type: "button",
        className: "secondary chrono-position-button",
        "aria-label": position === "bottom"
          ? "Move Chrono controls to top"
          : "Move Chrono controls to bottom",
        title: position === "bottom" ? "Move to top" : "Move to bottom",
        onClick: () => setPosition((current) => (
          current === "bottom" ? "top" : "bottom"
        )),
      },
      position === "bottom" ? "↑" : "↓",
    ),
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

function canonicalTime(epochMs) {
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}
