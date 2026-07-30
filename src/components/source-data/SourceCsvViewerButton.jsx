import React from "react";

import {
  buildSourceViewerDescriptor,
  openSourceViewer,
} from "./sourceViewerProtocol.js";

export default function SourceCsvViewerButton({
  sourceId,
  source,
  className = "secondary",
}) {
  const [error, setError] = React.useState("");
  const available = Boolean(buildSourceViewerDescriptor(sourceId, source));
  return React.createElement(
    "div",
    { className: "source-csv-viewer-action" },
    React.createElement(
      "button",
      {
        type: "button",
        className,
        disabled: !available,
        onClick: () => {
          setError("");
          openSourceViewer({
            sourceId,
            source,
            onError: setError,
          });
        },
      },
      "View source CSV",
    ),
    !available
      ? React.createElement(
          "small",
          null,
          "This source has no CSV file to display.",
        )
      : null,
    error
      ? React.createElement("small", { className: "wizard-error", role: "alert" }, error)
      : null,
  );
}
