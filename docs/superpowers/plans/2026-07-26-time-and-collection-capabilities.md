# SimEx Time and Collection Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dashboard-level synchronized temporal playback and a reusable Collection Display Framework to the version-3 chart core.

**Architecture:** Model time synchronization as named groups with a designated primary clock and pure matching functions. Model collection presentation as orthogonal layout, ranking, and overflow policies so KPI, delta, bullet, gauge, and future small-multiple views share one implementation.

**Tech Stack:** JavaScript ES modules, React 19 context and reducers, ECharts 5.6, Vite 6 SSR, Node test runner, Playwright 1.61

## Global Constraints

- Complete `2026-07-26-chart-system-v3-core.md` first.
- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp`.
- Do not read or write OneDrive.
- Do not merge, push, deploy, or update a Cloudflare branch.
- Exact temporal matching with an explicit no-value state is the default.
- Permit last-known, nearest-within-tolerance, and interpolation only when configured.
- Never interpolate categorical states, discrete events, or schema-forbidden measures.
- Every synchronization group uses a designated primary clock.
- Visually distinguish observed, carried, nearest-matched, and interpolated values.
- Implement Collection Display independently of any chart type.
- Treat Priority as a ranking layer that can combine with fixed, scrolling, or carousel layout.
- Custom priority expressions must not execute arbitrary JavaScript.
- Respect reduced-motion and keyboard-accessibility requirements.
- Commit each task independently.

---

## File Structure

### Create

- `src/charting/time/temporalMatch.js` — exact, last-known, nearest, and interpolation policies.
- `src/charting/time/timeSyncModel.js` — synchronization-group validation and primary-clock construction.
- `src/charting/time/playbackReducer.js` — deterministic playback state transitions.
- `src/charting/time/applyTimeContext.js` — chart-level temporal projection.
- `src/components/playback/PlaybackProvider.jsx` — dashboard time context.
- `src/components/playback/PlaybackControls.jsx` — accessible transport and scrub controls.
- `src/components/playback/PlaybackView.jsx` — eligible-chart presentation.
- `src/charting/collection/collectionModel.js` — normalized layout, ranking, and overflow settings.
- `src/charting/collection/priorityExpression.js` — safe expression AST validation and evaluation.
- `src/charting/collection/rankCollection.js` — sorting, priority, tie-breaking, and stabilization.
- `src/components/collection/CollectionDisplay.jsx` — fixed, scrolling, and carousel presentation.
- `src/components/collection/CollectionGrid.jsx` — fixed, manually paged, and scrollable grid primitives.
- `src/components/collection/CollectionPager.jsx` — manual paging controls.
- `src/components/collection/CollectionCarousel.jsx` — auto rotation with pause and motion safeguards.
- `tests/temporalMatchingV3.test.js` — matching-policy coverage.
- `tests/timeSyncModelV3.test.js` — group and reducer coverage.
- `tests/playbackComponentsV3.test.js` — SSR playback controls and states.
- `tests/collectionModelV3.test.js` — collection policy and ranking tests.
- `tests/collectionComponentsV3.test.js` — SSR layout and accessibility tests.

### Modify

- `src/charting/data/prepareChartData.js` — applies time context before family preparation.
- `src/charting/data/prepareTargetData.js` — playback-aware KPI, bullet, gauge, and delta values.
- `src/charting/rendering/axisAdapter.js` — moving time cursor and observation marker.
- `src/charting/rendering/matrixAdapter.js` — active time-cell state.
- `src/charting/rendering/timelineAdapter.js` — active event state.
- `src/charting/rendering/geographyAdapter.js` — active geographic frame.
- `src/charting/rendering/targetAdapter.js` — observed/estimated provenance output.
- `src/components/charts/ChartView.jsx` — consumes playback context.
- `src/components/charts/CardChartView.jsx` — delegates repeated items to Collection Display.
- `src/styles.css` — playback and collection presentation.
- `playwright.config.js` — no behavioral change; include the new spec through the existing directory.

## Interfaces

`src/charting/time/temporalMatch.js` produces:

```js
export function matchTemporalObservation({
  observations,
  activeEpochMs,
  policy,
  toleranceMs,
  interpolationAllowed,
}): {
  status: "observed" | "carried" | "nearest" | "interpolated" | "missing",
  observation: object | null,
  sourceEpochMs?: number,
  lowerEpochMs?: number,
  upperEpochMs?: number,
};
```

`src/charting/time/playbackReducer.js` state:

```js
{
  activeGroupId: string | null,
  activeIndex: number,
  playing: boolean,
  speed: 1 | 2 | 3,
  playbackView: boolean,
}
```

`src/charting/collection/collectionModel.js` normalizes:

```js
{
  layout: "fixed" | "scroll" | "carousel",
  rows: number,
  columns: number,
  gap: number,
  overflow: "manualPages" | "scroll" | "autoRotate" | "limit",
  ranking: {
    mode: "fixed" | "sort" | "priority",
    field?: string,
    direction?: "asc" | "desc",
    method?: string,
    expression?: PriorityExpression,
    stabilize?: boolean,
  },
  carousel: {
    intervalMs: number,
    loop: boolean,
    pauseOnHover: boolean,
    transition: "none" | "fade" | "slide",
  },
  playback: {
    rerank: boolean,
    pauseCarousel: boolean,
  },
}
```

---

### Task 1: Implement safe temporal matching policies

**Files:**

- Create: `src/charting/time/temporalMatch.js`
- Create: `tests/temporalMatchingV3.test.js`

**Interfaces:**

- Consumes: canonical observations sorted by `epochMs`
- Produces: `matchTemporalObservation`

- [ ] **Step 1: Write failing tests for all matching modes**

```js
test("exact matching returns missing instead of inventing a value", () => {
  const match = matchTemporalObservation({
    observations: samples,
    activeEpochMs: may2Noon,
    policy: "exact",
  });
  assert.deepEqual(match, { status: "missing", observation: null });
});

test("last known, nearest tolerance, and interpolation report provenance", () => {
  assert.equal(matchTemporalObservation(lastKnownInput).status, "carried");
  assert.equal(matchTemporalObservation(nearestInput).status, "nearest");
  assert.deepEqual(matchTemporalObservation(interpolationInput), {
    status: "interpolated",
    observation: { value: 15, epochMs: may2Noon },
    lowerEpochMs: may2,
    upperEpochMs: may3,
  });
});

test("interpolation fails closed when the schema forbids it", () => {
  assert.throws(
    () => matchTemporalObservation({ ...interpolationInput, interpolationAllowed: false }),
    /does not permit interpolation/,
  );
});
```

- [ ] **Step 2: Run the temporal matching test**

Run:

```powershell
pnpm.cmd test -- tests/temporalMatchingV3.test.js
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement sorted matching without date reparsing**

```js
export function matchTemporalObservation(input) {
  const exact = input.observations.find(({ epochMs }) => epochMs === input.activeEpochMs);
  if (exact) return { status: "observed", observation: exact, sourceEpochMs: exact.epochMs };
  if (input.policy === "exact") return { status: "missing", observation: null };
  if (input.policy === "lastKnown") return lastKnown(input);
  if (input.policy === "nearest") return nearestWithinTolerance(input);
  if (input.policy === "interpolate") return interpolateNumeric(input);
  throw new Error(`Unknown temporal matching policy "${input.policy}".`);
}
```

Reject negative tolerances, duplicate canonical timestamps without aggregation, non-numeric interpolation, and extrapolation beyond the observed range.

- [ ] **Step 4: Run the matching and temporal parser tests**

Run:

```powershell
pnpm.cmd test -- tests/temporalMatchingV3.test.js tests/chartTemporalV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/time/temporalMatch.js tests/temporalMatchingV3.test.js
git commit -m "feat: add temporal matching policies"
```

### Task 2: Model primary-clock synchronization groups and playback state

**Files:**

- Create: `src/charting/time/timeSyncModel.js`
- Create: `src/charting/time/playbackReducer.js`
- Create: `tests/timeSyncModelV3.test.js`

**Interfaces:**

- Consumes: `dashboard.timeSyncGroups`, loaded data profiles, and playback actions
- Produces: `validateTimeSyncGroups`, `getTimeSyncGroup`, `buildPrimaryClock`, `initialPlaybackState`, and `reducePlaybackState`

- [ ] **Step 1: Write failing group and reducer tests**

```js
test("a group derives its ordered clock only from the designated source", () => {
  assert.deepEqual(
    buildPrimaryClock(group, loadedData, profiles),
    [Date.UTC(2027, 4, 1), Date.UTC(2027, 4, 2), Date.UTC(2027, 4, 3)],
  );
});

test("playback stops at the end and previous/next are deterministic", () => {
  const atEnd = { ...initialPlaybackState, activeGroupId: "exercise", activeIndex: 2, playing: true };
  assert.deepEqual(
    reducePlaybackState(atEnd, { type: "tick", clockLength: 3 }),
    { ...atEnd, playing: false },
  );
});
```

- [ ] **Step 2: Run the group test**

Run:

```powershell
pnpm.cmd test -- tests/timeSyncModelV3.test.js
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement validation, primary clock, and pure reducer**

```js
export function reducePlaybackState(state, action) {
  if (action.type === "play") return { ...state, playing: true };
  if (action.type === "pause") return { ...state, playing: false };
  if (action.type === "seek") return { ...state, playing: false, activeIndex: action.index };
  if (action.type === "tick") return advanceOrStop(state, action.clockLength);
  if (action.type === "setSpeed") return { ...state, speed: action.speed };
  if (action.type === "openView") return { ...state, playbackView: true };
  if (action.type === "closeView") return { ...state, playbackView: false, playing: false };
  return state;
}
```

Validate group IDs, primary source and time role, member chart eligibility, matching policy, tolerance requirements, and interpolation permission.

- [ ] **Step 4: Run time-model tests**

Run:

```powershell
pnpm.cmd test -- tests/timeSyncModelV3.test.js tests/temporalMatchingV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/time/timeSyncModel.js src/charting/time/playbackReducer.js tests/timeSyncModelV3.test.js
git commit -m "feat: model synchronized playback groups"
```

### Task 3: Apply the active time consistently to chart preparation

**Files:**

- Create: `src/charting/time/applyTimeContext.js`
- Modify: `src/charting/data/prepareChartData.js`
- Modify: `src/charting/data/prepareTargetData.js`
- Create: `tests/timeAwareChartDataV3.test.js`

**Interfaces:**

- Consumes: `{ groupId, activeEpochMs }` plus a chart’s `interaction.timeSync`
- Produces: time-projected rows and `temporalProvenance`

- [ ] **Step 1: Write failing chart-projection tests**

```js
test("a playback delta uses the active observation and configured baseline", () => {
  const prepared = prepareChartData({
    chart: playbackDelta,
    rows: deltaRows,
    datasetProfile: deltaProfile,
    timeContext: { groupId: "exercise", activeEpochMs: may3 },
  });
  assert.equal(prepared.marks[0].displayed.value, 14);
  assert.equal(prepared.marks[0].comparison.value, 10);
  assert.equal(prepared.marks[0].displayed.matchStatus, "observed");
});

test("an absent exact observation yields an explicit missing mark", () => {
  const prepared = prepareChartData({ ...timeInput, timeContext: atMissingTime });
  assert.equal(prepared.status, "empty");
  assert.match(prepared.diagnostics[0].message, /No measurement at this time/);
});
```

- [ ] **Step 2: Run the time-aware data test**

Run:

```powershell
pnpm.cmd test -- tests/timeAwareChartDataV3.test.js
```

Expected: FAIL because time context is ignored.

- [ ] **Step 3: Implement one projection stage before family preparation**

```js
const temporalProjection = applyTimeContext({
  chart: input.chart,
  rows: transformed.rows,
  profile: input.datasetProfile,
  timeContext: input.timeContext,
});
const result = preparer({ ...input, rows: temporalProjection.rows });
return finalizePreparedResult(result, transformed, temporalProjection.provenance);
```

Ensure provenance reaches every prepared mark and that charts outside the active group remain unfiltered.

- [ ] **Step 4: Run all data and time tests**

Run:

```powershell
pnpm.cmd test -- tests/timeAwareChartDataV3.test.js tests/chartDataPipelineV3.test.js tests/temporalMatchingV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/time/applyTimeContext.js src/charting/data tests/timeAwareChartDataV3.test.js
git commit -m "feat: project chart data at playback time"
```

### Task 4: Build accessible playback context and controls

**Files:**

- Create: `src/components/playback/PlaybackProvider.jsx`
- Create: `src/components/playback/PlaybackControls.jsx`
- Create: `src/components/playback/PlaybackView.jsx`
- Create: `tests/playbackComponentsV3.test.js`
- Modify: `src/components/charts/ChartView.jsx`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: `dashboard.timeSyncGroups`, loaded data, profiles, and eligible charts
- Produces: `usePlayback`, `PlaybackControls`, and `PlaybackView`

- [ ] **Step 1: Write failing SSR tests for controls and missing states**

```js
test("playback controls expose transport, active time, speed, and a non-drag alternative", () => {
  const html = renderPlayback({ activeIndex: 1, clock: [may1, may2, may3] });
  assert.match(html, /aria-label="Previous time"/);
  assert.match(html, /aria-label="Play synchronized charts"/);
  assert.match(html, /aria-label="Next time"/);
  assert.match(html, /2027-05-02/);
  assert.match(html, /1×/);
});

test("playback view lists eligible and unavailable charts explicitly", () => {
  const html = renderPlaybackView();
  assert.match(html, /No measurement at this time/);
  assert.doesNotMatch(html, /ineligible-static-chart.*playback-member/);
});
```

- [ ] **Step 2: Run the playback component test**

Run:

```powershell
pnpm.cmd test -- tests/playbackComponentsV3.test.js
```

Expected: FAIL because the components are absent.

- [ ] **Step 3: Implement context, interval ownership, and accessible controls**

```jsx
export function PlaybackProvider({ groups, loadedData, profiles, children }) {
  const [state, dispatch] = React.useReducer(reducePlaybackState, initialPlaybackState);
  const clock = React.useMemo(
    () => buildPrimaryClock(getTimeSyncGroup(groups, state.activeGroupId), loadedData, profiles),
    [groups, state.activeGroupId, loadedData, profiles],
  );
  usePlaybackTimer(state, clock.length, dispatch);
  return <PlaybackContext.Provider value={contextValue(state, clock, dispatch)}>{children}</PlaybackContext.Provider>;
}
```

The timer pauses when the page is hidden, the view closes, or reduced motion is active unless the author explicitly starts playback.

- [ ] **Step 4: Run playback SSR and full unit tests**

Run:

```powershell
pnpm.cmd test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/playback src/components/charts/ChartView.jsx src/styles.css tests/playbackComponentsV3.test.js
git commit -m "feat: add synchronized playback controls"
```

### Task 5: Add renderer-specific synchronized-time cues

**Files:**

- Modify: `src/charting/rendering/axisAdapter.js`
- Modify: `src/charting/rendering/matrixAdapter.js`
- Modify: `src/charting/rendering/timelineAdapter.js`
- Modify: `src/charting/rendering/geographyAdapter.js`
- Modify: `src/charting/rendering/targetAdapter.js`
- Modify: `tests/chartRenderingV3.test.js`

**Interfaces:**

- Consumes: `prepared.meta.activeTime` and mark-level `temporalProvenance`
- Produces: moving markers, frames, highlights, and provenance labels

- [ ] **Step 1: Add failing render-model assertions**

```js
test("line playback adds a moving marker at the canonical active time", () => {
  const model = buildRenderModel(playbackLineInput);
  assert.deepEqual(model.option.series[0].markPoint.data[0].coord, [may2Canonical, 15]);
});

test("carried card values include explicit provenance copy", () => {
  const model = buildRenderModel(carriedKpiInput);
  assert.equal(model.items[0].provenance.label, "Last measured 2027-05-01");
});
```

- [ ] **Step 2: Run the rendering test and confirm new assertions fail**

Run:

```powershell
pnpm.cmd test -- tests/chartRenderingV3.test.js
```

Expected: FAIL because playback cues are absent.

- [ ] **Step 3: Implement cues without re-reading raw data**

```js
function playbackMarker(mark, activeTime) {
  if (!activeTime || !mark.active) return undefined;
  return {
    symbol: mark.temporalProvenance.status === "observed" ? "circle" : "emptyCircle",
    data: [{ coord: [activeTime.canonical, mark.value] }],
  };
}
```

Use a dashed or hollow visual for estimated values, plus tooltip text. Choropleths receive only the active prepared frame.

- [ ] **Step 4: Run rendering and playback tests**

Run:

```powershell
pnpm.cmd test -- tests/chartRenderingV3.test.js tests/playbackComponentsV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/rendering tests/chartRenderingV3.test.js
git commit -m "feat: visualize synchronized chart time"
```

### Task 6: Implement collection settings, safe priority expressions, and ranking

**Files:**

- Create: `src/charting/collection/collectionModel.js`
- Create: `src/charting/collection/priorityExpression.js`
- Create: `src/charting/collection/rankCollection.js`
- Create: `tests/collectionModelV3.test.js`

**Interfaces:**

- Consumes: schema-enabled collection settings and stable entity items
- Produces: `normalizeCollectionSettings`, `evaluatePriorityExpression`, and `rankCollection`

- [ ] **Step 1: Write failing composition and safety tests**

```js
test("priority ranking composes with carousel layout", () => {
  const settings = normalizeCollectionSettings({
    layout: "carousel",
    rows: 2,
    columns: 2,
    ranking: { mode: "priority", method: "furthestFromTarget" },
  });
  assert.equal(settings.layout, "carousel");
  assert.equal(settings.ranking.mode, "priority");
});

test("safe expressions evaluate declared metrics only", () => {
  const expression = {
    operator: "weightedSum",
    terms: [
      { metric: "riskScore", weight: 2 },
      { metric: "absoluteDelta", weight: 1 },
    ],
  };
  assert.equal(evaluatePriorityExpression(expression, { riskScore: 4, absoluteDelta: 3 }), 11);
  assert.throws(() => evaluatePriorityExpression({ operator: "javascript", source: "alert(1)" }, {}));
});

test("all approved operational ranking methods are deterministic", () => {
  for (const method of [
    "highestCurrent", "lowestCurrent", "largestAbsoluteChange",
    "largestPercentageChange", "furthestFromTarget", "riskScore",
  ]) {
    const first = rankCollection(items, prioritySettings(method));
    const second = rankCollection(items, prioritySettings(method));
    assert.deepEqual(first.map(({ entityId }) => entityId), second.map(({ entityId }) => entityId));
  }
});
```

- [ ] **Step 2: Run the collection model test**

Run:

```powershell
pnpm.cmd test -- tests/collectionModelV3.test.js
```

Expected: FAIL because collection modules are absent.

- [ ] **Step 3: Implement normalized policy and deterministic ranking**

```js
export function rankCollection(items, settings, previousOrder = []) {
  const scored = items.map((item) => ({
    item,
    score: rankingScore(item, settings.ranking),
    previousIndex: previousOrder.indexOf(item.entityId),
  }));
  return stableOperationalSort(scored, settings.ranking).map(({ item }) => item);
}
```

Require unique stable `entityId`, deterministic text tie-breaking, finite scores, bounded rows/columns, intervals of at least five seconds, and optional prior-order stabilization.

- [ ] **Step 4: Run collection and schema tests**

Run:

```powershell
pnpm.cmd test -- tests/collectionModelV3.test.js tests/chartSchemasV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/collection tests/collectionModelV3.test.js
git commit -m "feat: model reusable collection display"
```

### Task 7: Render fixed, scrolling, carousel, and priority collections

**Files:**

- Create: `src/components/collection/CollectionDisplay.jsx`
- Create: `src/components/collection/CollectionGrid.jsx`
- Create: `src/components/collection/CollectionPager.jsx`
- Create: `src/components/collection/CollectionCarousel.jsx`
- Create: `tests/collectionComponentsV3.test.js`
- Modify: `src/components/charts/CardChartView.jsx`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: stable collection items, normalized settings, item render callback, and playback state
- Produces: reusable `CollectionDisplay`

- [ ] **Step 1: Write failing SSR tests for each layout**

```js
test("fixed 3 by 3 collections expose manual pages for overflow", () => {
  const html = renderCollection({ layout: "fixed", rows: 3, columns: 3 }, twelveItems);
  assert.match(html, /grid-template-columns:repeat\(3/);
  assert.match(html, /Page 1 of 2/);
});

test("carousel can pause and has manual controls", () => {
  const html = renderCollection({ layout: "carousel", rows: 1, columns: 3 }, sixItems);
  assert.match(html, /aria-label="Pause collection rotation"/);
  assert.match(html, /aria-label="Next collection page"/);
});
```

- [ ] **Step 2: Run the collection component test**

Run:

```powershell
pnpm.cmd test -- tests/collectionComponentsV3.test.js
```

Expected: FAIL because the components are absent.

- [ ] **Step 3: Implement layout dispatch and motion safeguards**

```jsx
export default function CollectionDisplay({ items, settings, renderItem, playback }) {
  const normalized = normalizeCollectionSettings(settings);
  const ranked = rankCollection(items, normalized, playback?.lockedEntityOrder);
  const sharedProps = { items: ranked, settings: normalized, renderItem };
  if (normalized.layout === "scroll") return <CollectionGrid {...sharedProps} mode="scroll" />;
  if (normalized.layout === "carousel") return <CollectionCarousel {...sharedProps} />;
  return <CollectionGrid {...sharedProps} mode="paged" />;
}
```

Pause carousels on hover, focus, document invisibility, reduced motion, and configured playback pause. Preserve focus by stable entity ID when ranking changes.

- [ ] **Step 4: Run component and full unit tests**

Run:

```powershell
pnpm.cmd test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/collection src/components/charts/CardChartView.jsx src/styles.css tests/collectionComponentsV3.test.js
git commit -m "feat: render reusable chart collections"
```
