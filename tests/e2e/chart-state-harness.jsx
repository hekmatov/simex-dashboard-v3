import React from "react";
import { createRoot } from "react-dom/client";

import ChartStateSurface from "/src/components/ChartStateSurface.jsx";
import ChartDataStateBoundary from "/src/components/charts/ChartDataStateBoundary.jsx";
import {
  createDashboardThemeProjection,
  resolveDashboardTheme,
} from "/src/theme/dashboardTheme.js";
import { dashboardThemeRootProps } from "/src/theme/dashboardThemeRoot.js";
import "/src/styles/tokens.css";
import "/src/styles/chart-data-state.css";
import "/src/styles/dashboard-style-grammar.css";

export function chartStateHarnessRootProps(search = "") {
  const dashboardStyle = new URLSearchParams(search).get("dashboardStyle");
  const projection = createDashboardThemeProjection(resolveDashboardTheme({
    globalStyles: { dashboardStyle },
    appearancePreference: "light",
  }));
  return {
    className: "chart-state-recovery-harness",
    "data-dashboard-surface-role": "status",
    ...dashboardThemeRootProps(projection, { display: "grid", gap: 24, padding: 24 }),
  };
}

export function ChartStateHarness({ search = "" }) {
  return (
    <div {...chartStateHarnessRootProps(search)}>
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
    </main>
    <main
      data-canonical-panel-id="partial-proof"
      style={{ height: 320, width: 640 }}
    >
      <ChartDataStateBoundary
        state={{
          kind: "partial",
          message: "Vaccination rate is showing partial data. Booster coverage is unavailable.",
          hasValidContent: true,
        }}
        chartName="Vaccination rate"
      >
        <svg aria-label="Available vaccination series" viewBox="0 0 640 320" />
      </ChartDataStateBoundary>
    </main>
    </div>
  );
}

const rootElement = typeof document === "undefined" ? null : document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<ChartStateHarness search={window.location.search} />);
}
