import React from "react";
import { createRoot } from "react-dom/client";

import { profileDataset } from "/src/charting/data/profileDataset.js";
import { PlaybackProvider, usePlayback } from "/src/components/playback/PlaybackProvider.jsx";
import PresentationController from "/src/components/presentation/PresentationController.jsx";
import usePresentationRuntime from "/src/components/presentation/usePresentationRuntime.js";

const NativeBroadcastChannel = window.BroadcastChannel;
window.__presentChannelStartThrows = false;
window.__presentPublishEndedThrows = false;
window.__presentTeardownCalls = [];
window.BroadcastChannel = class ObservedBroadcastChannel extends NativeBroadcastChannel {
  constructor(name) {
    super(name);
    if (window.__presentChannelStartThrows) {
      this.close();
      throw new Error("channel startup failed");
    }
  }

  postMessage(message) {
    if (message?.type === "ended") {
      window.__presentTeardownCalls.push("publish");
      const publishCurrent = window.__presentPlaybackRuntime?.publishCurrent;
      window.__presentReentrantPublishResult = typeof publishCurrent === "function"
        ? publishCurrent()
        : "runtime-unavailable";
      if (window.__presentPublishEndedThrows) throw new Error("ended publish failed");
    }
    return super.postMessage(message);
  }

  close() {
    if (window.__presentTrackTeardown && this.name.startsWith("simex-presentation-")) {
      window.__presentTeardownCalls.push("dispose");
    }
    return super.close();
  }
};

const rows = [
  { observed: "2027-05-01", cases: 10 },
  { observed: "2027-05-02", cases: 20 },
  { observed: "2027-05-03", cases: 30 },
];
const chart = {
  id: "primary-chart",
  typeId: "line",
  title: "Cases over time",
  sourceId: "primary",
  roles: {
    measurements: { field: "cases" },
    observation: {
      field: "observed",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  },
  presentation: { collection: null, labels: null, accessibility: null },
  interaction: { zoom: { enabled: false }, timeSync: null },
};
const group = {
  id: "exercise",
  name: "Exercise timeline",
  period: { start: "2027-05-01", end: "2027-05-03" },
  secondsPerFrame: 0.25,
  matching: { policy: "exact" },
  members: [{ chartId: chart.id, timeRole: "observation" }],
};
const profile = profileDataset(rows, {
  observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
});
const presentableItemIndex = new Map([
  [chart.id, { descriptor: { kind: "chart", chart_id: chart.id } }],
]);

window.__presentAudienceWindow = {
  closed: false,
  close() {
    if (window.__presentTrackTeardown) window.__presentTeardownCalls.push("close");
    this.closed = true;
  },
};
window.__presentOpenMode = "opened";
window.open = (url, name) => {
  window.__presentLastOpen = { url, name };
  if (window.__presentOpenMode === "throw") throw new Error("window startup failed");
  if (window.__presentOpenMode === "blocked") return null;
  window.__presentAudienceWindow.closed = false;
  return window.__presentAudienceWindow;
};

function Harness() {
  return (
    <PlaybackProvider
      groups={[group]}
      charts={[chart]}
      loadedData={{ primary: rows }}
      profiles={{ primary: profile }}
      initialState={{
        activeGroupId: group.id,
        activeIndex: 0,
        playing: false,
        speed: 0.25,
        playbackView: true,
      }}
    >
      <RuntimeProbe />
    </PlaybackProvider>
  );
}

function RuntimeProbe() {
  const playback = usePlayback();
  const runtime = usePresentationRuntime(presentableItemIndex, {
    enabled: true,
    playback,
  });
  const presentationState = React.useMemo(() => ({
    dashboard_revision: "playback-safety-fixture",
    source: {
      kind: "Chrono Group",
      scene_id: null,
      chrono_group_id: group.id,
    },
    composition: {
      active_page_id: "page-a",
      displayed_chart_ids: [chart.id],
      layout: "solo",
    },
    timeline: {
      frame_epochs: [...playback.clock],
      frame_index: playback.activeIndex,
      period: {
        start: playback.clock[0],
        end: playback.clock.at(-1),
      },
      trace_mode: playback.traceMode,
      seconds_per_frame: playback.speed,
    },
    matching: { use_authored_settings: true },
    output_mode: runtime.sessionState.output === "ended"
      ? "active"
      : runtime.sessionState.output,
    blackout: runtime.sessionState.blackout,
    audience: {
      date_position: { x_permille: 680, y_permille: 40, width_permille: 280 },
    },
    payload: {
      items: [{ kind: "chart", chart_id: chart.id }],
      audience_facts: {
        dashboard_name: true,
        page: false,
        parent_chrono_group: true,
        scene_name: false,
        scene_date: true,
      },
    },
  }), [playback.activeIndex, playback.clock, playback.speed, playback.traceMode,
    runtime.sessionState.blackout, runtime.sessionState.output]);

  window.__presentPlaybackSafety = {
    activeIndex: playback.activeIndex,
    channelGeneration: runtime.sessionState.channelGeneration,
    connection: runtime.sessionState.connection,
    hasSession: runtime.hasSession,
    lifecycle: runtime.sessionState.lifecycle,
    playing: playback.playing,
    sessionId: runtime.sessionState.sessionId,
  };
  window.__presentPlaybackRuntime = {
    compositionChange() {
      runtime.onDisplayAction({ type: "manual_open", chart_id: chart.id });
    },
    dispatchGuarded(type) {
      return runtime.dispatch({
        type,
        sessionId: runtime.sessionState.sessionId,
        channelGeneration: runtime.sessionState.channelGeneration,
      });
    },
    publishCurrent() {
      return runtime.publish(presentationState, {
        sourceSelection: { status: "valid", reason: null },
      });
    },
    publish: runtime.publish,
  };
  window.__presentPlaybackHarnessReady = true;

  return (
    <PresentationController
      runtime={runtime}
      playback={playback}
      presentationState={presentationState}
      sourceEligibility={{ status: "valid", reason: null }}
    />
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<Harness />);
window.__unmountPresentPlaybackHarness = () => root.unmount();
