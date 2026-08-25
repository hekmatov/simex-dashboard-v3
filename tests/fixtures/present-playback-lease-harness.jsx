import React from "react";
import { createRoot } from "react-dom/client";

import { PlaybackProvider, usePlayback } from "/src/components/playback/PlaybackProvider.jsx";
import PresentWorkspace from "/src/components/presentation/PresentWorkspace.jsx";

const dashboard = {
  id: "lease-dashboard",
  title: "Lease dashboard",
  pages: [{ id: "page-a", title: "Page A", sections: [{
    id: "section-a",
    title: "Section A",
    panels: [{ id: "chart-a", typeId: "kpi", title: "Chart A" }],
  }] }],
  chronoGroups: [],
};
const runtime = {
  displayState: { display_revision: 0, displayed_chart_ids: [], layout: "solo" },
  onDisplayAction() {},
  connectionStatus: "not-open",
  connectionError: "",
  hasSession: false,
  audienceFacts: {
    dashboard_name: true,
    page: false,
    parent_chrono_group: true,
    scene_name: true,
    scene_date: true,
  },
  setAudienceFactVisible() {},
  blackout: false,
  setBlackout() {},
  publish() {},
  open() {},
  end() {},
};

function PlaybackProbe() {
  const playback = usePlayback();
  window.__presentPlaybackOpen = playback.playbackView;
  return null;
}

function Harness() {
  const [mounted, setMounted] = React.useState(true);
  React.useEffect(() => {
    window.unmountPresentWorkspace = () => setMounted(false);
    window.presentPlaybackViewOpen = () => window.__presentPlaybackOpen;
    window.presentPlaybackHarnessReady = true;
  }, []);
  return (
    <PlaybackProvider
      groups={[]}
      charts={[]}
      loadedData={{}}
      profiles={{}}
      initialState={{ playbackView: true }}
    >
      <PlaybackProbe />
      {mounted && <PresentWorkspace
        dashboard={dashboard}
        activePageId="page-a"
        onActivePageChange={() => {}}
        runtime={runtime}
        accessibilityEnabled={false}
      />}
    </PlaybackProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode><Harness /></React.StrictMode>,
);
