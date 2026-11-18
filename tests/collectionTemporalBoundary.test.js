import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import {
  buildEditorFormModel,
  buildFormPreparationKey,
} from "../src/charting/forms/formModel.js";
import { validateChronoGroups } from "../src/charting/time/chronoGroupModel.js";
import { collectionConsumerFixture } from "./fixtures/collectionConsumerV3.js";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const { isCarouselPaused } = await import(
  "../src/components/collection/CollectionCarousel.jsx"
);

const rows = [
  { observed: "2027-05-01", cases: 10 },
  { observed: "2027-05-02", cases: 20 },
];
const profile = profileDataset(rows, {
  observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
});

test("authored Collection Displays cannot join Chrono Groups", () => {
  const chart = collectionChart();
  const groups = [{
    id: "exercise",
    name: "Exercise timeline",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: chart.id, timeRole: "observation" }],
  }];

  assert.throws(
    () => validateChronoGroups(groups, {
      charts: [chart],
      loadedData: { primary: rows },
      profiles: { primary: profile },
    }),
    /Collection displays cannot join Chrono Groups/i,
  );
});

test("Collection authoring exposes neither native time matching nor retired membership assignment", () => {
  const unsynchronized = collectionChart({ id: "new-collection", timeSync: null });
  const synchronized = collectionChart({ id: "legacy-collection" });
  const groups = [{ id: "exercise", name: "Exercise timeline", period: { start: "2027-05-01", end: "2027-05-02" }, matching: { policy: "exact" }, secondsPerFrame: 1, members: [{ chartId: synchronized.id, timeRole: "observation" }] }];
  const before = structuredClone(groups);
  for (const chart of [unsynchronized, synchronized]) {
    const fields = buildEditorFormModel({ chart, profile, prepared: preparedFor(chart), chronoGroups: groups }).sections.flatMap(({ fields }) => fields);
    assert.equal(fields.some(field => ["timeSync", "chartTimeMatching"].includes(field.id)), false);
  }
  assert.deepEqual(groups, before);
  assert.deepEqual(synchronized.interaction.timeSync, { groupId: "exercise" });
  assert.throws(() => validateChronoGroups(groups, { charts: [synchronized], loadedData: { primary: rows }, profiles: { primary: profile } }), /Collection displays cannot join Chrono Groups/i);
});

test("Collection rotation never pauses for Chrono playback", () => {
  assert.equal(isCarouselPaused({
    manualPaused: false,
    focused: false,
    documentHidden: false,
    reducedMotion: false,
    hovered: false,
    playbackPlaying: true,
  }, {
    carousel: { pauseOnHover: true },
    playback: { pauseCarousel: true },
  }), false);
});

test("the tracked dashboard keeps authored Collection Displays outside Chrono Groups", () => {
  const { dashboard, timeline, rows: collectionRows, profile: collectionProfile } = collectionConsumerFixture();
  const collectionCharts = configuredCharts(dashboard).filter(
    (chart) => chart.presentation?.collection != null,
  );
  const memberIds = new Set(
    dashboard.chronoGroups.flatMap(({ members }) => (
      members.map(({ chartId }) => chartId)
    )),
  );

  assert.ok(collectionCharts.length > 0);
  assert.ok(memberIds.size > 0);
  const preparedTimeline = prepareChartData({
    chart: timeline,
    rows: collectionRows,
    datasetProfile: collectionProfile,
  });
  assert.equal(preparedTimeline.status, "ready");
  assert.ok(preparedTimeline.marks.length > 0);
  assert.doesNotThrow(() => validateChronoGroups(dashboard.chronoGroups, {
    charts: configuredCharts(dashboard),
    loadedData: { primary: collectionRows },
    profiles: { primary: collectionProfile },
  }));
  for (const chart of collectionCharts) {
    assert.equal(memberIds.has(chart.id), false, chart.id);
    assert.equal(chart.interaction?.timeSync ?? null, null, chart.id);
  }
});

function collectionChart({ id = "collection-chart", timeSync = { groupId: "exercise" } } = {}) {
  return {
    id,
    typeId: "kpi",
    title: "Cases over time",
    sourceId: "primary",
    roles: {
      value: { field: "cases" },
      time: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: {
      collection: {
        layout: "carousel",
        rows: 1,
        columns: 1,
        gap: 16,
        overflow: "autoRotate",
        ranking: { mode: "fixed" },
        carousel: {
          intervalMs: 10000,
          loop: true,
          pauseOnHover: true,
          transition: "fade",
        },
      },
      labels: null,
      accessibility: null,
    },
    interaction: { zoom: { enabled: false }, timeSync },
  };
}

function preparedFor(chart) {
  return {
    status: "ready",
    meta: {
      formPreparationKey: buildFormPreparationKey({ chart, profile }),
      renderableMarkCount: 2,
    },
    marks: [{}, {}],
    diagnostics: [],
  };
}

function configuredCharts(dashboard) {
  return dashboard.pages.flatMap(({ sections = [] }) => (
    sections.flatMap(({ panels = [] }) => (
      panels.map((placement) => placement.chart ?? placement)
    ))
  ));
}
