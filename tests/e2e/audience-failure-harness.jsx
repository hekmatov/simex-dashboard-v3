import { presentationTimeFixture } from "../helpers/presentationTimeFixture.js";
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
  source: { kind: "scene", scene_id: "fixture-group" },
  composition: { active_page_id: "fixture", displayed_chart_ids: [], layout: "solo" },
  time: presentationTimeFixture({ frame_epochs: [epoch] }),
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
