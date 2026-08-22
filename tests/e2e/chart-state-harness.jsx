import React from "react";
import { createRoot } from "react-dom/client";

import ChartStateSurface from "/src/components/ChartStateSurface.jsx";
import "/src/styles/tokens.css";
import "/src/styles/chart-data-state.css";

createRoot(document.getElementById("root")).render(
  <main
    data-canonical-panel-id="recovery-proof"
    style={{ height: 320, width: 640 }}
  >
    <ChartStateSurface
      state="error"
      chartName="Recovery proof"
      dimensions={{ width: 640, height: 320 }}
      lastValid={<svg aria-label="Last valid Recovery proof plot" viewBox="0 0 640 320" />}
    />
  </main>,
);
