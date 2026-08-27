import React from "react";
import { createRoot } from "react-dom/client";

import AudienceDisplay from "../../src/components/presentation/AudienceDisplay.jsx";

const epoch = Date.UTC(2027, 0, 1);
const dashboard = {
  title: "Audience failure fixture",
  chronoGroups: [{ id: "fixture-group", name: "Fixture group", members: [] }],
  scenes: [],
  pages: [],
  contentLibrary: { mediaItems: {} },
  assets: {},
};
const stableProjection = {
  kind: "output",
  mode: "holding",
  blackout: false,
  dashboardRevision: "failure-fixture-r1",
  source: { kind: "Chrono Group", scene_id: null, chrono_group_id: "fixture-group" },
  composition: { active_page_id: "fixture", displayed_chart_ids: [], layout: "solo" },
  timeline: {
    frame_epochs: [epoch],
    frame_index: 0,
    period: { start: epoch, end: epoch },
    trace_mode: "reveal",
    seconds_per_frame: 1,
  },
  matching: { use_authored_settings: true },
  audience: { date_position: { x_permille: 680, y_permille: 40, width_permille: 280 } },
  payload: {
    items: [],
    audience_facts: {
      dashboard_name: true,
      page: false,
      parent_chrono_group: true,
      scene_name: false,
      scene_date: false,
    },
  },
};

function Harness() {
  const [projection, setProjection] = React.useState(stableProjection);
  React.useEffect(() => {
    window.triggerAudienceRenderFailure = () => {
      const failedProjection = { ...stableProjection };
      Object.defineProperty(failedProjection, "source", {
        enumerable: true,
        get() {
          throw new Error("instrumented Audience renderer failure");
        },
      });
      setProjection(failedProjection);
    };
    return () => delete window.triggerAudienceRenderFailure;
  }, []);
  return (
    <AudienceDisplay
      dashboard={dashboard}
      connectionStatus="connected"
      projection={projection}
    />
  );
}

createRoot(document.getElementById("root")).render(<Harness />);
