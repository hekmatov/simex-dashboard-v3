import React from "react";
import { createRoot } from "react-dom/client";
import AuthoringStage from "/src/components/chart-authoring/AuthoringStage.jsx";
import ChartPanel from "/src/components/ChartPanel.jsx";
import LayoutGrid from "/src/components/LayoutGrid.jsx";
import { BuildMapBudgetProvider } from "/src/components/build/BuildMapBudgetContext.jsx";
import { analyticalPlaybackFixture } from "./analyticalPlaybackV3.js";
import "/src/styles/tokens.css";
import "/src/styles.css";
import "/src/styles/modes.css";
import "/src/styles/dashboard-style-grammar.css";

const fixture = analyticalPlaybackFixture();
const chart = fixture.charts.find(c => c.id === "latest-areas");
const props = { chart, panel: chart, rows: fixture.loadedData.latestAreas, datasetProfile: fixture.profiles.latestAreas, geoData: fixture.geoData };
const root = createRoot(document.getElementById("root"));
function Harness({ empty = false }) {
  const [stageOpen, setStageOpen] = React.useState(true);
  window.setStageOpen = setStageOpen;
  return <div className="app-frame"><BuildMapBudgetProvider>
    <main className="canonical-dashboard-frame" data-canonical-page-id="page" style={{ width: 812, maxWidth: "none" }}>
      <div className="canonical-dashboard-content"><section className="dashboard-section" data-canonical-section-id="section">
        {empty ? <p>Empty destination</p> : <LayoutGrid><ChartPanel {...props} showFullscreen={false} /></LayoutGrid>}
      </section></div>
    </main>
    {stageOpen && <div className="dashboard-dialog" style={{ width: 600, maxHeight: "none", overflow: "visible" }}>
      <AuthoringStage {...props} destination={{ pageId: "page", sectionId: "section" }}
        onShowOnCanvas={() => { window.revealActive = true; return () => { window.revealActive = false; }; }} />
    </div>}
  </BuildMapBudgetProvider></div>;
}
window.mountStageHarness = empty => root.render(<Harness key={String(empty)} empty={empty} />);
window.mountStageHarness(false);
window.stageHarnessReady = true;
