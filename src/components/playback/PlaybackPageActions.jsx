import React from "react";

import { usePlayback } from "./PlaybackProvider.jsx";

export default function PlaybackPageActions() {
  const playback = usePlayback();
  const {
    activeGroupId,
    dispatch,
    groups,
    playbackView,
  } = playback;

  if (groups.length === 0) return null;

  return React.createElement(
    React.Fragment,
    null,
    playbackView
      ? React.createElement(
          "label",
          { className: "chrono-group-select" },
          React.createElement("span", { className: "visually-hidden" }, "Chrono Group"),
          React.createElement(
            "select",
            {
              "aria-label": "Chrono Group",
              value: activeGroupId ?? "",
              onChange: (event) => dispatch({
                type: "setGroup",
                groupId: event.target.value || null,
              }),
            },
            groups.map((group) => React.createElement(
              "option",
              { key: group.id, value: group.id },
              group.name,
            )),
          ),
        )
      : null,
    React.createElement(
      "button",
      {
        type: "button",
        className: "secondary chrono-view-button",
        "aria-pressed": playbackView,
        onClick: () => dispatch({
          type: playbackView ? "closeView" : "openView",
        }),
      },
      "Chrono view",
    ),
  );
}
