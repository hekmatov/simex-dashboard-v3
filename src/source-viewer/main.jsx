import React from "react";
import { createRoot } from "react-dom/client";

import SourceCsvViewer from "./SourceCsvViewer.jsx";
import "./sourceViewer.css";

createRoot(document.getElementById("source-viewer-root")).render(
  React.createElement(React.StrictMode, null, React.createElement(SourceCsvViewer)),
);
