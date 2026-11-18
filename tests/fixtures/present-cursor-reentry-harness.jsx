import React from "react";
import { createRoot } from "react-dom/client";
import { PlaybackProvider, usePlayback } from "/src/components/playback/PlaybackProvider.jsx";
import PresentWorkspace from "/src/components/presentation/PresentWorkspace.jsx";
import { buildPresentationState } from "/src/components/presentation/PresentationController.jsx";
import { createChartDraft } from "/src/charting/config/chartConfigV3.js";
import { profileDataset } from "/src/charting/data/profileDataset.js";
import { deriveCursorPlayback } from "/src/charting/time/cursorProviderModel.js";
import { initialPlaybackState } from "/src/charting/time/playbackReducer.js";
import { makePresentationMessage } from "/src/lib/presentationProtocol.js";
import { resolveDashboardTheme } from "/src/theme/dashboardTheme.js";

const testCase = new URLSearchParams(location.search).get("case");
const exerciseCase = testCase === "exercise";
const rows = { a: [{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }],
  b: [{ date: "2027-01-02", value: 2 }, { date: "2027-01-04", value: 4 }] };
const profiles = Object.fromEntries(Object.entries(rows).map(([id, values]) => [id, profileDataset(values)]));
const charts = ["a", "b"].map(id => createChartDraft("line", { id, title: id, sourceId: id, roles: {
  observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
} }));
const dashboard = { id: "reentry", pages: charts.map(chart => ({ id: `page-${chart.id}`, sections: [{ id: chart.id, panels: [chart] }] })),
  loadedData: rows, datasetProfiles: profiles, dataSources: {}, chronoGroups: [], scenes: [] };
const facts = { dashboard_name: false, page: false, parent_chrono_group: false, scene_name: false, scene_date: false };
const currentPageId = testCase === "page" ? "page-b" : "page-a";
const cursor = id => ({ mode: "live", epochMs: null, scope: { kind: "page", id }, window: null });
const previousTime = exerciseCase ? "2027-01-01T00:00:00.000Z" : undefined;
const currentTime = exerciseCase ? "2027-01-03T00:00:00.000Z" : undefined;
const previous = deriveCursorPlayback({ state: { ...initialPlaybackState, cursor: cursor("page-a") }, charts, pageCharts: [charts[0]],
  profiles, loadedData: rows, activePageId: "page-a", exerciseTime: previousTime });
const index = new Map(charts.map(chart => [chart.id, { descriptor: { kind: "chart", chart_id: chart.id } }]));
const accepted = buildPresentationState({ dashboard, activePageId: "page-a", displayedChartIds: ["a"], layout: "solo",
  playback: { ...previous, speed: 1, traceMode: "reveal", matchingOverride: "authored", nearestToleranceMs: null, exerciseTime: previousTime },
  presentableItemIndex: index, audienceFacts: facts });
window.__reentryPublications = [];
const wireSnapshot = makePresentationMessage({ sessionId: "reentry", sequence: 1, type: "state", payload: accepted }).payload;
window.__reentryAcceptedHasTheme = Object.hasOwn(wireSnapshot, "theme");
const runtime = { hasSession: true, sessionState: { lifecycle: "live", connection: "connected", output: "active", playback: "paused",
  blackout: false, lastValidSnapshot: wireSnapshot }, acceptedPresentationState: accepted,
  displayState: { displayed_chart_ids: ["a"], layout: "solo" },
  audienceFacts: facts, dispatch() {}, onDisplayAction() {}, selectPresentationSource() {}, setAudienceFactVisible() {},
  publish: state => window.__reentryPublications.push(state), connectionStatus: "connected" };
function Probe() {
  const playback = usePlayback();
  window.__reentryCurrent = { epoch: playback.activeEpochMs, scope: playback.cursor.scope };
  return <PresentWorkspace dashboard={dashboard} activePageId={currentPageId} runtime={runtime}
    themeProjection={testCase === "theme" ? resolveDashboardTheme({ globalStyles: { dashboardStyle: "humanist-standard" } }) : undefined} />;
}
createRoot(document.getElementById("root")).render(<PlaybackProvider charts={charts} pageCharts={charts.filter(chart => `page-${chart.id}` === currentPageId)}
  groups={[]} scenes={[]} loadedData={rows} profiles={profiles} activePageId={currentPageId} exerciseTime={currentTime}
  initialState={{ ...initialPlaybackState, cursor: cursor(currentPageId) }}><Probe /></PlaybackProvider>);
