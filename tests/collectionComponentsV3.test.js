import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const {
  default: CollectionDisplay,
} = await import("../src/components/collection/CollectionDisplay.jsx");
const {
  clampCollectionPage,
  pageForCollectionEntity,
  resolveCollectionPage,
} = await import("../src/components/collection/CollectionGrid.jsx");
const {
  createCollectionTimer,
  isCarouselPaused,
  nextCarouselPage,
  readCollectionEnvironment,
  subscribeToCollectionEnvironment,
} = await import("../src/components/collection/CollectionCarousel.jsx");
const {
  nextManualCollectionPage,
} = await import("../src/components/collection/CollectionPager.jsx");
const {
  default: CardChartView,
} = await import("../src/components/charts/CardChartView.jsx");

const twelveItems = collectionItems(12);

test("fixed 3 by 3 collections expose exact dimensions and manual pages for overflow", () => {
  const html = renderCollection({
    layout: "fixed",
    rows: 3,
    columns: 3,
    gap: 12,
  }, twelveItems);

  assert.match(html, /data-collection-layout="fixed"/);
  assert.match(html, /data-collection-rows="3"/);
  assert.match(html, /data-collection-columns="3"/);
  assert.match(html, /grid-template-columns:repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(html, /grid-template-rows:repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(html, /gap:12px/);
  assert.match(html, /Page 1 of 2/);
  assert.match(html, /aria-label="Previous collection page"[^>]*disabled/);
  assert.match(html, /aria-label="Next collection page"/);
  assert.equal((html.match(/role="listitem"/g) ?? []).length, 9);
  assert.match(html, /Item 9/);
  assert.doesNotMatch(html, /Item 10/);
});

test("scroll collections keep one keyboard-accessible vertical region with every item", () => {
  const html = renderCollection({
    layout: "scroll",
    rows: 2,
    columns: 2,
  }, collectionItems(7));

  assert.match(html, /data-collection-layout="scroll"/);
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Scrollable collection"/);
  assert.match(html, /tabindex="0"/);
  assert.equal((html.match(/role="listitem"/g) ?? []).length, 7);
  assert.doesNotMatch(html, /collection-pager|collection-carousel-controls/);
});

test("scroll collections keep the configured block size for few and many items", () => {
  const settings = {
    layout: "scroll",
    rows: 2,
    columns: 2,
    gap: 10,
  };
  const few = renderCollection(settings, collectionItems(1));
  const many = renderCollection(settings, collectionItems(9));
  const configuredSize = /--collection-scroll-block-size:calc\(8rem \+ 8rem \+ 16px\)/;

  assert.match(few, configuredSize);
  assert.match(many, configuredSize);
  assert.equal((few.match(/role="listitem"/g) ?? []).length, 1);
  assert.equal((many.match(/role="listitem"/g) ?? []).length, 9);
});

test("carousel SSR is static, accessible, manually operable, and does not allocate a timer", () => {
  const originalSetInterval = globalThis.setInterval;
  let allocations = 0;
  globalThis.setInterval = () => {
    allocations += 1;
    return 1;
  };
  try {
    const html = renderCollection({
      layout: "carousel",
      rows: 1,
      columns: 3,
      carousel: {
        intervalMs: 5000,
        loop: true,
        pauseOnHover: true,
        transition: "slide",
      },
    }, collectionItems(6));

    assert.equal(allocations, 0);
    assert.match(html, /data-collection-layout="carousel"/);
    assert.match(html, /data-collection-transition="slide"/);
    assert.match(html, /aria-label="Pause collection rotation"/);
    assert.doesNotMatch(
      html,
      /aria-label="Previous collection page"[^>]*disabled/,
    );
    assert.match(html, /aria-label="Next collection page"/);
    assert.match(html, /Page 1 of 2/);
    assert.match(html, /aria-live="polite"/);
  } finally {
    globalThis.setInterval = originalSetInterval;
  }
});

test("non-looping carousel keeps boundary controls clamped and disabled", () => {
  const html = renderCollection({
    layout: "carousel",
    rows: 1,
    columns: 3,
    carousel: {
      intervalMs: 5000,
      loop: false,
      pauseOnHover: true,
      transition: "none",
    },
  }, collectionItems(6));

  assert.match(html, /aria-label="Previous collection page"[^>]*disabled/);
  assert.match(html, /aria-label="Next collection page"/);
});

test("manual carousel paging wraps only when looping is enabled", () => {
  assert.equal(nextManualCollectionPage(0, 3, -1, true), 2);
  assert.equal(nextManualCollectionPage(2, 3, 1, true), 0);
  assert.equal(nextManualCollectionPage(0, 3, -1, false), 0);
  assert.equal(nextManualCollectionPage(2, 3, 1, false), 2);
});

test("fixed, scroll, and carousel layouts compose with every ranking mode", () => {
  const items = [
    { entityId: "a", label: "Alpha", current: 1 },
    { entityId: "b", label: "Bravo", current: 3 },
    { entityId: "c", label: "Charlie", current: 2 },
  ];
  const rankings = [
    [{ mode: "fixed" }, ["Alpha", "Bravo", "Charlie"]],
    [{ mode: "sort", field: "current", direction: "desc" }, ["Bravo", "Charlie", "Alpha"]],
    [{ mode: "priority", method: "highestCurrent" }, ["Bravo", "Charlie", "Alpha"]],
  ];

  for (const layout of ["fixed", "scroll", "carousel"]) {
    for (const [ranking, expectedOrder] of rankings) {
      const html = renderCollection({
        layout,
        rows: 2,
        columns: 2,
        ranking,
      }, items);
      assertTextOrder(html, expectedOrder, `${layout}/${ranking.mode}`);
    }
  }
});

test("an unusable priority ranking stays in configured order and explains the fallback", () => {
  const html = renderCollection({
    layout: "fixed",
    rows: 1,
    columns: 2,
    ranking: { mode: "priority", method: "riskScore" },
  }, [
    { entityId: "z", label: "Zulu" },
    { entityId: "a", label: "Alpha" },
  ]);

  assertTextOrder(html, ["Zulu", "Alpha"], "priority fallback");
  assert.match(html, /class="collection-ranking-status"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /showing configured order/i);
});

test("target collections use shared fixed, scroll, carousel, and priority presentation semantics", async () => {
  const {
    default: TargetCollectionChartView,
  } = await import("../src/components/charts/TargetCollectionChartView.jsx");
  const items = [
    targetItem("clinic-z", "Clinic Z", 8, 10),
    targetItem("clinic-a", "Clinic A", 6, 9),
    targetItem("clinic-b", "Clinic B", 7, 8),
  ];
  const chart = {
    title: "Facility targets",
    description: "Current target status.",
    presentation: { title: { align: "center" } },
  };

  for (const [layout, overflow] of [
    ["fixed", "manualPages"],
    ["scroll", "scroll"],
    ["carousel", "autoRotate"],
  ]) {
    const html = renderToStaticMarkup(React.createElement(
      TargetCollectionChartView,
      {
        chart,
        provenance: { label: "Target register", capturedAt: "2027-05-02" },
        model: {
          kind: "targetCollection",
          items,
          presentation: {
            collection: {
              layout,
              rows: 1,
              columns: 2,
              gap: 8,
              overflow,
              ranking: { mode: "fixed" },
              carousel: {
                intervalMs: 5000,
                loop: true,
                pauseOnHover: true,
                transition: "none",
              },
              playback: { rerank: true, pauseCarousel: true },
            },
          },
        },
      },
    ));

    assert.match(html, new RegExp(`data-collection-layout="${layout}"`));
    assert.equal((html.match(/>Facility targets</g) ?? []).length, 1);
    assert.equal((html.match(/Source: Target register/g) ?? []).length, 1);
    assert.equal((html.match(/Captured: 2027-05-02/g) ?? []).length, 1);
    assert.match(html, /data-title-align="center"/);
  }

  const fallback = renderToStaticMarkup(React.createElement(
    TargetCollectionChartView,
    {
      chart,
      model: {
        kind: "targetCollection",
        items,
        presentation: {
          collection: {
            layout: "fixed",
            rows: 1,
            columns: 3,
            ranking: { mode: "priority", method: "riskScore" },
          },
        },
      },
    },
  ));
  assertTextOrder(
    fallback,
    ["Clinic Z", "Clinic A", "Clinic B"],
    "target priority fallback",
  );
  assert.match(fallback, /class="collection-ranking-status"/);
  assert.match(fallback, /role="status"/);
  assert.match(fallback, /aria-live="polite"/);
  assert.match(fallback, /showing configured order/i);
});

test("target collections preserve playback order locking and embedded provenance summaries", async () => {
  const {
    default: TargetCollectionChartView,
  } = await import("../src/components/charts/TargetCollectionChartView.jsx");
  const items = [
    targetItem("clinic-a", "Clinic A", 4, 10),
    {
      ...targetItem("clinic-b", "Clinic B", 9, 10),
      activeTime: "2027-05-02",
      temporalStatus: "carried",
      provenance: {
        status: "carried",
        label: "Last measured 2027-05-01",
        sourceTime: "2027-05-01",
      },
      accessibleSummary: "Clinic B: actual 9; target 10. Playback time 2027-05-02. Last measured 2027-05-01",
    },
  ];
  const html = renderToStaticMarkup(React.createElement(
    TargetCollectionChartView,
    {
      chart: { title: "Playback targets" },
      playback: {
        playbackView: true,
        playing: true,
        lockedEntityOrder: ["clinic-a", "clinic-b"],
      },
      model: {
        kind: "targetCollection",
        items,
        presentation: {
          collection: {
            layout: "fixed",
            rows: 1,
            columns: 2,
            ranking: { mode: "priority", method: "highestCurrent" },
            playback: { rerank: false, pauseCarousel: true },
          },
        },
      },
    },
  ));

  assertTextOrder(html, ["Clinic A", "Clinic B"], "target playback lock");
  assert.match(html, /data-temporal-status="carried"/);
  assert.match(html, /Playback time 2027-05-02/);
  assert.match(html, /Last measured 2027-05-01/);
});

test("rerank locking applies only while the dedicated Playback view is active", () => {
  const items = [
    { entityId: "a", label: "Alpha", current: 1 },
    { entityId: "b", label: "Bravo", current: 3 },
    { entityId: "c", label: "Charlie", current: 2 },
  ];
  const baseSettings = {
    layout: "fixed",
    rows: 1,
    columns: 3,
    ranking: { mode: "priority", method: "highestCurrent" },
  };
  const playback = {
    activeEpochMs: Date.UTC(2027, 4, 2),
    lockedEntityOrder: ["a", "c", "b"],
    playing: false,
  };
  const ordinaryDashboard = renderCollection({
    ...baseSettings,
    playback: { rerank: false, pauseCarousel: true },
  }, items, { ...playback, playbackView: false });
  const lockedPlaybackView = renderCollection({
    ...baseSettings,
    playback: { rerank: false, pauseCarousel: true },
  }, items, { ...playback, playbackView: true });
  const reranked = renderCollection({
    ...baseSettings,
    playback: { rerank: true, pauseCarousel: true },
  }, items, { ...playback, playbackView: true });

  assertTextOrder(
    ordinaryDashboard,
    ["Bravo", "Charlie", "Alpha"],
    "ordinary dashboard",
  );
  assertTextOrder(
    lockedPlaybackView,
    ["Alpha", "Charlie", "Bravo"],
    "locked playback",
  );
  assertTextOrder(reranked, ["Bravo", "Charlie", "Alpha"], "reranked playback");
});

test("empty and single-page collections avoid misleading navigation", () => {
  const empty = renderCollection({ layout: "fixed" }, []);
  const singleFixed = renderCollection({
    layout: "fixed",
    rows: 2,
    columns: 2,
  }, collectionItems(1));
  const singleCarousel = renderCollection({
    layout: "carousel",
    rows: 2,
    columns: 2,
  }, collectionItems(4));

  assert.match(empty, /role="status"/);
  assert.match(empty, /No collection items are available/);
  assert.doesNotMatch(empty, /role="list"/);
  assert.doesNotMatch(singleFixed, /collection-pager/);
  assert.doesNotMatch(singleCarousel, /collection-carousel-controls/);
  assert.doesNotMatch(singleCarousel, /collection-pager/);
});

test("page helpers clamp changes and retain the page containing a focused entity", () => {
  const items = collectionItems(8);

  assert.equal(clampCollectionPage(7, 3), 2);
  assert.equal(clampCollectionPage(2, 0), 0);
  assert.equal(pageForCollectionEntity(items, "entity-7", 3, 0), 2);
  assert.equal(pageForCollectionEntity(items, "missing", 3, 1), 1);
  assert.equal(nextCarouselPage(0, 3, 1, true), 1);
  assert.equal(nextCarouselPage(2, 3, 1, true), 0);
  assert.equal(nextCarouselPage(2, 3, 1, false), 2);
  assert.equal(nextCarouselPage(0, 3, -1, true), 2);
});

test("focused entity page is resolved before a reranked page is sliced", () => {
  const reranked = [
    { entityId: "bravo", label: "Bravo" },
    { entityId: "charlie", label: "Charlie" },
    { entityId: "alpha", label: "Alpha" },
    { entityId: "delta", label: "Delta" },
  ];
  const pageSize = 2;
  const page = resolveCollectionPage({
    page: 0,
    pageCount: 2,
    items: reranked,
    focusedEntityId: "alpha",
    pageSize,
  });
  const visibleItems = reranked.slice(page * pageSize, (page + 1) * pageSize);

  assert.equal(page, 1);
  assert.deepEqual(
    visibleItems.map(({ entityId }) => entityId),
    ["alpha", "delta"],
  );
});

test("stable entity identity is exposed while rendering leaves inputs untouched", () => {
  const items = [
    { entityId: "clinic-a", label: "Clinic A", current: 2 },
    { entityId: "clinic-b", label: "Clinic B", current: 4 },
  ];
  const settings = {
    layout: "fixed",
    rows: 1,
    columns: 2,
    ranking: { mode: "sort", field: "current", direction: "desc" },
  };
  const beforeItems = structuredClone(items);
  const beforeSettings = structuredClone(settings);
  const html = renderCollection(settings, items);

  assert.match(html, /data-collection-entity-id="clinic-b"/);
  assert.match(html, /data-collection-entity-id="clinic-a"/);
  assertTextOrder(html, ["Clinic B", "Clinic A"], "stable identity");
  assert.deepEqual(items, beforeItems);
  assert.deepEqual(settings, beforeSettings);
});

test("carousel pause rules cover manual, hover, focus, hidden, motion, and playback states", () => {
  const settings = {
    carousel: { pauseOnHover: true },
    playback: { pauseCarousel: true },
  };
  const active = {
    manualPaused: false,
    hovered: false,
    focused: false,
    documentHidden: false,
    reducedMotion: false,
    playbackPlaying: false,
  };

  assert.equal(isCarouselPaused(active, settings), false);
  for (const reason of [
    "manualPaused",
    "hovered",
    "focused",
    "documentHidden",
    "reducedMotion",
    "playbackPlaying",
  ]) {
    assert.equal(
      isCarouselPaused({ ...active, [reason]: true }, settings),
      true,
      reason,
    );
  }
  assert.equal(
    isCarouselPaused({ ...active, hovered: true }, {
      ...settings,
      carousel: { pauseOnHover: false },
    }),
    false,
  );
  assert.equal(
    isCarouselPaused({ ...active, playbackPlaying: true }, {
      ...settings,
      playback: { pauseCarousel: false },
    }),
    false,
  );
});

test("carousel surfaces expose stable rotation policy and effective pause state", () => {
  const settings = {
    layout: "carousel",
    rows: 1,
    columns: 1,
    overflow: "autoRotate",
    carousel: {
      intervalMs: 5000,
      loop: true,
      pauseOnHover: true,
      transition: "fade",
    },
    playback: {
      rerank: true,
      pauseCarousel: true,
    },
  };
  const paused = renderCollection(
    settings,
    collectionItems(2),
    { playing: true },
  );
  const independent = renderCollection(
    {
      ...settings,
      playback: { ...settings.playback, pauseCarousel: false },
    },
    collectionItems(2),
    { playing: true },
  );

  assert.match(paused, /data-collection-interval-ms="5000"/);
  assert.match(paused, /data-collection-loop="true"/);
  assert.match(paused, /data-collection-pause-on-hover="true"/);
  assert.match(paused, /data-collection-pause-on-playback="true"/);
  assert.match(paused, /data-collection-rotation-paused="true"/);
  assert.match(independent, /data-collection-pause-on-playback="false"/);
  assert.match(independent, /data-collection-rotation-paused="false"/);
});

test("carousel owns one timer and cleans it completely", () => {
  const calls = [];
  const intervals = new Map();
  const scheduler = {
    setInterval(callback, delay) {
      intervals.set(1, callback);
      calls.push(`set:${delay}`);
      return 1;
    },
    clearInterval(id) {
      intervals.delete(id);
      calls.push(`clear:${id}`);
    },
  };
  let ticks = 0;
  const cleanup = createCollectionTimer({
    enabled: true,
    intervalMs: 5000,
    onTick: () => { ticks += 1; },
    scheduler,
  });

  assert.equal(intervals.size, 1);
  intervals.get(1)();
  assert.equal(ticks, 1);
  cleanup();
  cleanup();
  assert.deepEqual(calls, ["set:5000", "clear:1"]);
  assert.equal(intervals.size, 0);

  createCollectionTimer({
    enabled: false,
    intervalMs: 5000,
    onTick: () => { ticks += 1; },
    scheduler,
  })();
  assert.deepEqual(calls, ["set:5000", "clear:1"]);
});

test("carousel environment subscription is singular, live, and fully cleaned", () => {
  const documentListeners = new Map();
  const motionListeners = new Set();
  const documentTarget = {
    hidden: false,
    addEventListener(type, listener) {
      assert.equal(documentListeners.has(type), false);
      documentListeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (documentListeners.get(type) === listener) documentListeners.delete(type);
    },
  };
  const motionQuery = {
    matches: false,
    addEventListener(type, listener) {
      assert.equal(type, "change");
      motionListeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "change");
      motionListeners.delete(listener);
    },
  };
  const states = [];
  const cleanup = subscribeToCollectionEnvironment({
    documentTarget,
    motionQuery,
    onChange: (state) => states.push(state),
  });

  documentTarget.hidden = true;
  documentListeners.get("visibilitychange")();
  motionQuery.matches = true;
  [...motionListeners][0]();
  cleanup();

  assert.deepEqual(states, [
    { documentHidden: false, reducedMotion: false },
    { documentHidden: true, reducedMotion: false },
    { documentHidden: true, reducedMotion: true },
  ]);
  assert.equal(documentListeners.size, 0);
  assert.equal(motionListeners.size, 0);
});

test("carousel reads hidden and reduced-motion state before allocating effects", () => {
  assert.deepEqual(
    readCollectionEnvironment(
      { hidden: true },
      { matches: true },
    ),
    { documentHidden: true, reducedMotion: true },
  );
});

test("CardChartView delegates repeated cards and preserves card semantics and provenance", () => {
  const html = renderToStaticMarkup(React.createElement(CardChartView, {
    chart: {
      title: "Facility capacity",
      description: "Current capacity by facility.",
      presentation: { title: { align: "right" } },
    },
    model: {
      items: [
        cardItem("clinic-a", "Clinic A", 4),
        cardItem("clinic-b", "Clinic B", 8),
        cardItem("clinic-c", "Clinic C", 6),
      ],
      presentation: {
        collection: {
          layout: "fixed",
          rows: 1,
          columns: 2,
          ranking: { mode: "priority", method: "highestCurrent" },
        },
      },
    },
    provenance: { label: "Capacity register", capturedAt: "2027-05-02" },
  }));

  assert.match(html, /data-title-align="right"/);
  assert.match(html, /Facility capacity/);
  assert.match(html, /Current capacity by facility/);
  assert.match(html, /data-collection-layout="fixed"/);
  assert.match(html, /Page 1 of 2/);
  assertTextOrder(html, ["Clinic B", "Clinic C"], "card priority");
  assert.doesNotMatch(html, /Clinic A/);
  assert.match(html, /role="listitem"/);
  assert.match(html, /Source: Capacity register/);
  assert.match(html, /Captured: 2027-05-02/);
});

test("CardChartView preserves the static single-item card path", () => {
  const html = renderToStaticMarkup(React.createElement(CardChartView, {
    chart: { title: "Current capacity" },
    model: {
      items: [cardItem("capacity", "Capacity", 8)],
      presentation: {
        collection: {
          layout: "carousel",
          rows: 1,
          columns: 1,
        },
      },
    },
  }));

  assert.match(html, /class="chart-card-collection"/);
  assert.match(html, /class="chart-card" role="listitem"/);
  assert.doesNotMatch(html, /collection-display|collection-carousel-controls/);
});

test("cards distinguish playback time from carried measurement provenance", () => {
  const html = renderToStaticMarkup(React.createElement(CardChartView, {
    chart: { title: "Current capacity" },
    model: {
      items: [{
        ...cardItem("capacity", "Capacity", 8),
        time: "2027-05-02",
        activeTime: "2027-05-02",
        temporalStatus: "carried",
        provenance: {
          status: "carried",
          label: "Last measured 2027-05-01",
          sourceTime: "2027-05-01",
        },
      }],
    },
  }));

  assert.match(html, /data-temporal-status="carried"/);
  assert.match(html, /<dt>Playback time<\/dt><dd>2027-05-02<\/dd>/);
  assert.match(html, /<dt>Measurement source<\/dt><dd>Last measured 2027-05-01<\/dd>/);
  assert.doesNotMatch(html, /<dt>Observed<\/dt>/);
});

test("delta cards disclose displayed and comparison temporal provenance separately", () => {
  const html = renderToStaticMarkup(React.createElement(CardChartView, {
    chart: { title: "Capacity change" },
    model: {
      items: [{
        ...cardItem("capacity", "Capacity", 20),
        comparison: 10,
        comparisonTime: "2027-05-01",
        delta: { absolute: 10, percentage: 100 },
        time: "2027-05-02",
        activeTime: "2027-05-02",
        temporalStatus: "interpolated",
        provenance: {
          status: "interpolated",
          label: "Interpolated between 2027-05-01 and 2027-05-03",
          lowerTime: "2027-05-01",
          upperTime: "2027-05-03",
        },
        comparisonProvenance: {
          status: "observed",
          label: "Observed 2027-05-01",
          sourceTime: "2027-05-01",
        },
      }],
    },
  }));

  assert.match(html, /<dt>Playback time<\/dt><dd>2027-05-02<\/dd>/);
  assert.match(html, /Interpolated between 2027-05-01 and 2027-05-03/);
  assert.match(html, /<dt>Comparison source<\/dt><dd>Observed 2027-05-01<\/dd>/);
  assert.doesNotMatch(html, /<dt>Observed<\/dt>/);
});

function renderCollection(settings, items, playback = null) {
  return renderToStaticMarkup(React.createElement(CollectionDisplay, {
    items,
    settings,
    playback,
    renderItem: (item) => React.createElement("span", null, item.label),
  }));
}

function collectionItems(count) {
  return Array.from({ length: count }, (_, index) => ({
    entityId: `entity-${index + 1}`,
    label: `Item ${index + 1}`,
    current: index + 1,
  }));
}

function targetItem(entityId, label, actual, target) {
  return {
    entityId,
    label,
    value: actual,
    actual,
    target,
    accessibleSummary: `${label}: actual ${actual}; target ${target}; observed 2027-05-01`,
    model: {
      kind: "echarts",
      option: { series: [] },
      semanticSummary: {
        items: [{ label, actual, target, time: "2027-05-01" }],
      },
    },
  };
}

function cardItem(key, label, value) {
  return {
    key,
    label,
    value,
    current: value,
    target: null,
    comparison: null,
    delta: null,
    direction: null,
    favorability: null,
    time: null,
  };
}

function assertTextOrder(html, labels, description) {
  const positions = labels.map((label) => html.indexOf(label));
  assert.ok(
    positions.every((position) => position >= 0),
    `${description}: expected all labels in ${html}`,
  );
  assert.deepEqual(
    [...positions].sort((left, right) => left - right),
    positions,
    `${description}: expected ${labels.join(", ")}`,
  );
}
