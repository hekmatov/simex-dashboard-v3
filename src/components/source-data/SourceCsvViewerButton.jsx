import React from "react";
import { IconControl } from "../common/SimExIcon.js";

import {
  buildSourceViewerDescriptor,
  openSourceViewer,
} from "./sourceViewerProtocol.js";

export default function SourceCsvViewerButton({
  sourceId,
  source,
  className = "secondary",
  interactionId = "panel.view-source-csv",
}) {
  const [error, setError] = React.useState("");
  const available = Boolean(buildSourceViewerDescriptor(sourceId, source));
  return React.createElement(
    "div",
    { className: "source-csv-viewer-action" },
    React.createElement(IconControl, {
      interactionId,
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
    }),
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
