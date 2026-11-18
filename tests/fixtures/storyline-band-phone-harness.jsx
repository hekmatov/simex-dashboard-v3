import React from "react";
import { createRoot } from "react-dom/client";
import * as echarts from "echarts";
import StorylineBand from "/src/components/time/StorylineBand.jsx";
import CanonicalDashboardFrame from "/src/components/dashboard/CanonicalDashboardFrame.jsx";
import DashboardHeader from "/src/components/dashboard/DashboardHeader.jsx";
import { resolveDashboardTheme, createDashboardThemeProjection } from "/src/theme/dashboardTheme.js";
import { dashboardThemeRootProps } from "/src/theme/dashboardThemeRoot.js";
import { DashboardChartThemeProvider } from "/src/theme/DashboardChartThemeContext.jsx";
import { parseCsvText } from "/src/lib/loadCsv.js";
import { resolveChartFootprint } from "/src/components/chartPanelLayout.js";
import { measuredLegendRect } from "/src/charting/rendering/legendLayout.js";
import "/src/styles/fonts.css";
import "/src/styles/tokens.css";
import "/src/styles.css";
import "/src/styles/modes.css";
import "/src/styles/presentation.css";
import "/src/styles/dashboard-style-grammar.css";
import "/src/styles/chart-data-state.css";
import "/src/styles/static-content.css";
import "/src/styles/phone-view.css";

const json = async url => { const response = await fetch(url); if (!response.ok) throw Error(`Fixture input unavailable: ${url}`); return response.json(); };
const dashboard = await json("/config/dashboard.json");
dashboard.datasetProfiles = await json("/config/dataset-profiles.json");
const charts = dashboard.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart ?? panel)));
const definitions = [
  { id: "hospital-staff", name: "Hospital/ICU pressure and healthcare staff absenteeism", ids: ["bio_hospital_occupancy", "bio_icu_occupancy", "socio_healthcare_absenteeism"], layout: "leftFocus" },
  { id: "cases-trust", name: "Cases and trust in institutions", ids: ["bio_confirmed_cases", "socio_trust_trend"], layout: "sideBySide" },
  { id: "cases-unemployment", name: "Cases and unemployment", ids: ["bio_confirmed_cases", "socio_unemployment"], layout: "sideBySide" },
];
const scenes = definitions.map(definition => ({
  id: definition.id, name: definition.name, view: { layout: definition.layout },
  members: definition.ids.map(chartId => {
    const chart = charts.find(chart => chart.id === chartId);
    if (!chart) throw Error(`Required actual chart missing: ${chartId}`);
    const footprint = resolveChartFootprint(chart.layout);
    return { chartId, width: footprint.columns, height: footprint.rows };
  }),
}));
dashboard.loadedData = {};
for (const sourceId of new Set(definitions.flatMap(definition => definition.ids.map(id => charts.find(chart => chart.id === id).sourceId)))) {
  const source = dashboard.dataSources[sourceId];
  if (source.kind !== "csv" || !dashboard.datasetProfiles[sourceId]) throw Error(`Expected actual CSV/profile: ${sourceId}`);
  const response = await fetch(`/${source.path}`);
  if (!response.ok) throw Error(`Actual CSV unavailable: ${sourceId}`);
  dashboard.loadedData[sourceId] = parseCsvText(await response.text(), sourceId);
  if (!dashboard.loadedData[sourceId].length) throw Error(`Actual CSV is empty: ${sourceId}`);
}
const theme = createDashboardThemeProjection(resolveDashboardTheme({ globalStyles: dashboard.globalStyles, appearancePreference: "light" }));

function Fixture() {
  const [activeScene, setActiveScene] = React.useState(scenes[0]);
  const playback = { scenes, activeScene, cursor: { mode: "live" }, activeEpochMs: null, timeContextForChart: () => null,
    dispatch(action) { if (action.type === "setScene") setActiveScene(scenes.find(scene => scene.id === action.sceneId)); else if (action.type === "cursorScope") setActiveScene(null); } };
  return <DashboardChartThemeProvider projection={theme}>
    <div className="app-frame" data-dashboard-mode="view" {...dashboardThemeRootProps(theme)}>
      <select aria-label="Fixture storyline" value={activeScene?.id ?? ""} onChange={event => playback.dispatch({ type: "setScene", sceneId: event.target.value })}>
        <option value="" disabled>Choose a fixture</option>
        {scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.name}</option>)}
      </select>
      <CanonicalDashboardFrame mode="view" deviceLayout="phone" pageId="biomedical" pageType="analytical"
        dashboardHeader={<DashboardHeader activePage={dashboard.pages.find(page => page.id === "biomedical")} dashboard={dashboard} mode="view" />}
        pageContent={<StorylineBand dashboard={dashboard} playback={playback} activePageId="biomedical" />} />
    </div>
  </DashboardChartThemeProvider>;
}
createRoot(document.getElementById("root")).render(<Fixture />);
window.storylinePhoneFixture = { scenes, sourceRowCounts: Object.fromEntries(Object.entries(dashboard.loadedData).map(([id, rows]) => [id, rows.length])),
  chartGeometry(id) {
    const host = document.querySelector(`[data-scene-chart-id="${id}"] .chart-echarts-host`);
    const instance = host && echarts.getInstanceByDom(host);
    const plot = instance?.getModel().getComponent("grid")?.coordinateSystem.getRect();
    const legend = instance && measuredLegendRect(instance);
    return { plotWidth: plot?.width, legendClearance: legend && plot ? legend.y - (plot.y + plot.height) : null };
  },
  chartOption(id) { const host = document.querySelector(`[data-scene-chart-id="${id}"] .chart-echarts-host`); return host && echarts.getInstanceByDom(host)?.getOption(); } };
