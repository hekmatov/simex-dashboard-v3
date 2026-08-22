# Chart System V3 Contract Integration Amendment

**Goal:** Finalize the analytical and presentation contracts that the
schema-generated wizard will author: configurable Delta baselines, one
authoritative time-sync policy source, the normalized Collection Display
shape, and Collection Display adoption by repeated Gauge and Bullet charts.

**Architecture:** Keep analytical comparison rules in transformations,
Chrono Group policy in dashboard synchronization groups, and collection
presentation in the shared Collection Display model. Extend chart schemas with
a validated comparison descriptor so the future form model and Quorum
catalogue can discover Delta behavior without chart-type condition lists.
Repeated ECharts target items become independent mini-visualizations hosted by
the same Collection Display component already used by KPI and Delta cards.

**Tech Stack:** JavaScript ES modules, React 19, ECharts 5.6, Vite 6 SSR, Node
test runner, Playwright 1.61

## Why this amendment precedes the wizard

The completed core and time/collection plans revealed four contract seams that
must not be encoded into generated forms:

1. Delta charts currently always compare the latest two observations and
   cannot represent a selected baseline time.
2. Chart instances still contain placeholder matching policy fields in both
   `interaction.timeSync` and `transformations.temporalMatch`, even though the
   validated synchronization group/member contract is authoritative.
3. Persisted chart configuration uses legacy Collection Display names while
   the renderer uses the new normalized nested model.
4. KPI and Delta collections use Collection Display, but repeated Gauge and
   Bullet charts still arrange themselves internally in ECharts.

Version 3 is a deliberate clean break, so this plan replaces these shapes
directly and adds no compatibility adapter.

## Global constraints

- Work only in
  `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp`.
- Do not read or write OneDrive.
- Do not modify the existing showcase-home worktree.
- Do not merge, push, deploy, update Cloudflare, create the Quorum worktree, or
  change Quorum in this plan.
- Use test-driven development and atomic task commits.
- Preserve the exact-default, explicit-missing temporal behavior.
- The target role is contextual information and is never a Delta baseline.
- Do not add a version-2 or legacy-collection compatibility path.
- Do not begin the wizard/editor plan until this amendment passes independent
  review and the full local verification gate.

## Canonical contracts

### Delta comparison descriptor in chart schema

Only schemas that support analytical comparisons declare:

```js
comparison: {
  defaultMode: "previousObservation",
  modes: ["previousObservation", "fixedTime"],
  matchingPolicies: ["exact", "lastKnown", "nearest", "interpolate"],
}
```

The schema validator requires a numeric measurement role and a temporal role,
rejects unknown modes/policies, and deep-freezes the descriptor. This
descriptor is discoverable by generated forms and, later, Quorum catalogue
generation.

### Delta chart transformation

Delta drafts contain exactly one of:

```js
comparison: { mode: "previousObservation" }
```

or:

```js
comparison: {
  mode: "fixedTime",
  at: "2027-05-01T00:00:00.000Z",
  matching: { policy: "exact" },
}
```

`nearest` requires a finite non-negative `toleranceMs`. `interpolate` requires
the same explicit numeric-measure permission enforced by synchronized
playback. Other policies reject a tolerance. A fixed baseline must resolve to
a point strictly before the displayed observation. Missing or ambiguous
matches produce bounded diagnostics; they never silently fall back to another
mode.

### Time-sync chart membership

Chart configuration stores membership only:

```js
interaction: {
  zoom: { enabled: false },
  timeSync: { groupId: "exercise-clock" },
}
```

The synchronization group default/member override is the only matching-policy
source. Projection receives a validated effective matching contract through
the active per-chart time context and fails closed if it is absent.
`transformations.temporalMatch` is removed from the schema transform catalogue,
chart transformation keys, draft defaults, persisted instances, and fixtures.
Neither former chart-local location remains as a fallback.

### Collection Display configuration

Persisted configuration uses the same shape as
`normalizeCollectionSettings`:

```js
collection: {
  layout: "fixed",
  rows: 2,
  columns: 3,
  gap: 16,
  overflow: "manualPages",
  ranking: {
    mode: "priority",
    method: "largestAbsoluteChange",
    stabilize: true,
  },
  carousel: {
    intervalMs: 10000,
    loop: true,
    pauseOnHover: true,
    transition: "fade",
  },
  playback: {
    rerank: true,
    pauseCarousel: true,
  },
}
```

Chart validation delegates to the pure normalizer and preserves strict unknown
key, prototype, numeric-bound, overflow/layout, ranking, expression, carousel,
and playback validation. A new normalize-on-write seam replaces authored
collection values with the detached, fully defaulted normalized result during
draft finalization and bundle parse/serialization. Therefore persisted charts,
not only renderer input, contain the canonical nested shape. The normalized
model is the public version-3 contract; no `fixedGrid`, `itemSpacing`,
`rankingMode`, `rotationInterval`, or similar legacy aliases remain.

## File structure

### Create

- `src/charting/data/resolveDeltaComparison.js` — pure static/playback Delta
  baseline selection and provenance.
- `src/components/charts/TargetCollectionChartView.jsx` — outer collection
  host for repeated Gauge and Bullet mini-visualizations.
- `src/components/charts/EmbeddedEChartsItem.jsx` — one lifecycle-managed,
  semantically labelled ECharts item without duplicating the outer chart
  heading/provenance.
- `tests/deltaComparisonV3.test.js` — schema, validation, static, playback,
  matching, and provenance coverage.
- `tests/targetCollectionV3.test.js` — Gauge/Bullet collection model and SSR
  coverage.
- `tests/embeddedEChartsItemV3.test.js` — focused mount, update, failure, resize,
  and disposal lifecycle coverage for repeated mini-visualizations.

### Modify

- `src/charting/schemas/schemaTypes.js`
- `src/charting/schemas/validateChartSchema.js`
- `src/charting/schemas/targetSchemas.js`
- `src/charting/config/chartConfigV3.js`
- `src/charting/data/prepareTargetData.js`
- `src/charting/time/applyTimeContext.js`
- `src/charting/rendering/targetAdapter.js`
- `src/charting/rendering/buildRenderModel.js`
- `src/components/charts/ChartView.jsx`
- `src/styles.css`
- directly affected version-3 schema, bundle, preparation, rendering, view,
  playback, and collection tests

---

## Task 1: Finalize schema, comparison, and time-membership contracts

**Files:**

- Modify: `src/charting/schemas/schemaTypes.js`
- Modify: `src/charting/schemas/validateChartSchema.js`
- Modify: `src/charting/schemas/targetSchemas.js`
- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/charting/data/transforms.js`
- Modify: `src/charting/time/applyTimeContext.js`
- Modify: `tests/chartSchemasV3.test.js`
- Modify: `tests/dashboardBundleV3.test.js`
- Modify: `tests/timeSyncModelV3.test.js`
- Modify: `tests/chartDataPipelineV3.test.js`
- Modify: `tests/timeAwareChartDataV3.test.js`

**Interfaces:**

- Produces a validated optional `schema.comparison` descriptor.
- Produces validated `transformations.comparison`.
- Narrows chart-local `interaction.timeSync` to `{ groupId }`.
- Removes `transformations.temporalMatch`; active group/member matching is the
  only policy authority.

- [ ] **Step 1: Add failing contract tests**

Cover:

- only Delta schemas expose the approved comparison descriptor;
- malformed descriptors fail schema validation;
- Delta drafts default to `previousObservation`;
- fixed-time comparisons require canonical UTC instants and valid matching
  shapes;
- comparison transformations are rejected for non-comparison schemas;
- chart-local matching policies/tolerances are rejected as unknown membership
  properties;
- persisted `transformations.temporalMatch` is rejected and new drafts omit it;
- direct preparation input cannot retain either former chart-local policy
  source;
- active playback without `timeContext.matching` returns an actionable invalid
  projection rather than silently selecting exact;
- synchronization groups/member overrides remain valid policy sources; and
- schema and draft output is detached and deeply immutable where promised.

- [ ] **Step 2: Run focused schema/bundle tests and confirm RED**

```powershell
pnpm.cmd test -- tests/chartSchemasV3.test.js tests/dashboardBundleV3.test.js tests/timeSyncModelV3.test.js
```

- [ ] **Step 3: Implement the strict contracts**

Add comparison descriptor validation, chart-draft defaults, and
schema-aware comparison transformation validation. Remove both chart-local
matching-policy branches, including `temporalMatch` from
`CHART_TRANSFORMS`, chart-config normalization, and the internal
transformation normalization path in `data/transforms.js`. Require active
projection to receive
`timeContext.matching`; return a bounded invalid projection if it is absent.
Reuse canonical temporal parsing; do not accept loose date strings.

- [ ] **Step 4: Run focused and related tests**

```powershell
pnpm.cmd test -- tests/chartSchemasV3.test.js tests/dashboardBundleV3.test.js tests/timeSyncModelV3.test.js tests/chartDataPipelineV3.test.js tests/timeAwareChartDataV3.test.js
```

- [ ] **Step 5: Commit**

```powershell
git add src/charting/schemas src/charting/config/chartConfigV3.js src/charting/data/transforms.js src/charting/time/applyTimeContext.js tests/chartSchemasV3.test.js tests/dashboardBundleV3.test.js tests/timeSyncModelV3.test.js tests/chartDataPipelineV3.test.js tests/timeAwareChartDataV3.test.js
git commit -m "feat: finalize temporal chart contracts"
```

---

## Task 2: Resolve configurable Delta baselines in static and playback data

**Files:**

- Create: `src/charting/data/resolveDeltaComparison.js`
- Create: `tests/deltaComparisonV3.test.js`
- Modify: `src/charting/data/prepareTargetData.js`
- Modify: `src/charting/time/applyTimeContext.js`
- Modify: `src/charting/rendering/targetAdapter.js`
- Modify: `tests/chartDataPipelineV3.test.js`
- Modify: `tests/timeAwareChartDataV3.test.js`
- Modify: `tests/chartRenderingV3.test.js`
- Modify: `tests/chartViewV3.test.js`

**Interfaces:**

```js
resolveDeltaComparison({
  observations,
  displayed,
  comparison,
  chart,
  timeRole,
  profile,
}): {
  status: "matched" | "missing" | "invalid",
  observation?: object,
  provenance?: object,
  diagnostic?: object,
}
```

- [ ] **Step 1: Add failing baseline tests**

Cover:

- previous-observation behavior remains exact and per entity;
- exact fixed-time baseline;
- last-known fixed-time baseline;
- nearest within/outside tolerance and equidistant tie;
- permitted numeric interpolation with both bounds;
- numeric interpolation without explicit permission is rejected;
- schema/role/binding/profile-authorized numeric interpolation succeeds;
- categorical/discrete, extrapolated, and non-finite interpolation fails;
- fixed baselines at or after the displayed observation fail actionably;
- target never becomes the comparison value;
- static and playback paths produce the same baseline and provenance for the
  same displayed point; and
- source rows/config/profile remain unchanged.

- [ ] **Step 2: Run focused Delta tests and confirm RED**

```powershell
pnpm.cmd test -- tests/deltaComparisonV3.test.js tests/chartDataPipelineV3.test.js tests/timeAwareChartDataV3.test.js
```

- [ ] **Step 3: Implement one pure resolver used by both paths**

Build canonical per-entity observation sequences after existing filters,
missing-value handling, and duplicate consolidation. Reuse
`matchTemporalObservation`; do not reparse canonical epochs inside the matcher.
Both static and playback callers must derive interpolation permission through
the existing `assertTimeSyncInterpolationAllowed` authority using the Delta
measurement/time roles and profile; a numeric value by itself is never
sufficient.
Attach displayed and comparison provenance independently. A missing fixed
baseline yields explicit diagnostics and no renderer-ready Delta mark.

- [ ] **Step 4: Run Delta, rendering, view, and full unit tests**

```powershell
pnpm.cmd test -- tests/deltaComparisonV3.test.js tests/chartDataPipelineV3.test.js tests/timeAwareChartDataV3.test.js tests/chartRenderingV3.test.js tests/chartViewV3.test.js
pnpm.cmd test
```

- [ ] **Step 5: Commit**

```powershell
git add src/charting/data/resolveDeltaComparison.js src/charting/data/prepareTargetData.js src/charting/time/applyTimeContext.js src/charting/rendering/targetAdapter.js tests
git commit -m "feat: support configurable delta baselines"
```

---

## Task 3: Make normalized Collection Display the persisted v3 contract

**Files:**

- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/charting/config/dashboardBundleV3.js`
- Modify: `tests/dashboardBundleV3.test.js`
- Modify: `tests/chartRenderingV3.test.js`
- Modify: `tests/chartSystemV3IntegrationFixes.test.js`
- Modify: any helper fixtures that construct collection-capable charts

**Interfaces:**

- `validateChartInstance` accepts exactly the public shape documented above.
- `normalizeChartInstance` returns a detached chart whose collection is fully
  normalized while preserving opaque values outside its contract.
- `normalizeCollectionSettings` remains the single normalization and
  validation authority.
- Draft finalization, bundle parse, serialization, validation, and runtime
  rendering consume the same shape.

- [ ] **Step 1: Replace legacy-fixture expectations with failing normalized-contract tests**

Prove all three layouts, compatible overflow choices, all ranking modes,
weighted expressions, carousel settings, and playback settings survive a
bundle round trip with every nested default materialized. Assert parsed and
serialized chart collection values deeply equal
`normalizeCollectionSettings(authoredCollection)`. Prove every legacy field is
rejected and malformed nested values fail before rendering.

- [ ] **Step 2: Run bundle/collection tests and confirm RED**

```powershell
pnpm.cmd test -- tests/dashboardBundleV3.test.js tests/collectionModelV3.test.js tests/chartRenderingV3.test.js
```

- [ ] **Step 3: Delegate chart validation to the collection model**

Import and call `normalizeCollectionSettings` for non-null collection
presentation after checking the chart capability. Add
`normalizeChartInstance` and use it at every committed-write boundary,
including bundle parse and serialization, replacing
`presentation.collection` with the detached normalized result. Validation must
not duplicate or weaken the normalizer. Update test/build fixtures directly;
add no adapter.

- [ ] **Step 4: Run bundle, collection, rendering, integration, and full unit tests**

```powershell
pnpm.cmd test -- tests/dashboardBundleV3.test.js tests/collectionModelV3.test.js tests/collectionComponentsV3.test.js tests/chartRenderingV3.test.js tests/chartSystemV3IntegrationFixes.test.js
pnpm.cmd test
```

- [ ] **Step 5: Commit**

```powershell
git add src/charting/config/chartConfigV3.js src/charting/config/dashboardBundleV3.js tests
git commit -m "refactor: unify collection configuration"
```

---

## Task 4: Build renderer-neutral repeated Gauge and Bullet item models

**Files:**

- Create: `tests/targetCollectionV3.test.js`
- Modify: `src/charting/rendering/targetAdapter.js`
- Modify: `src/charting/rendering/buildRenderModel.js`
- Modify: `tests/chartRenderingV3.test.js`

**Interfaces:**

For repeated Gauge/Bullet marks:

```js
{
  kind: "targetCollection",
  items: [{
    entityId,
    label,
    value,
    target,
    delta,
    riskScore,
    model: { kind: "echarts", option, semanticSummary },
  }],
  presentation: { collection },
}
```

Single-item Gauge/Bullet charts retain the ordinary ECharts path. Repeated
items become one detached mini-visualization model each. This task owns only
adapter/model generation, entity identity, ranking metrics, accessibility
summaries, and temporal provenance; it does not add React dispatch or ECharts
lifecycle behavior.

- [ ] **Step 1: Add failing adapter and SSR tests**

Cover:

- multi-Gauge and multi-Bullet models expose stable entity IDs and complete
  ranking metrics;
- each mini-model contains exactly one prepared target observation;
- each item exposes an accessible actual/target/time summary;
- playback provenance and priority reranking use the same prepared values;
- single-item behavior remains correct.

- [ ] **Step 2: Run target/collection/view tests and confirm RED**

```powershell
pnpm.cmd test -- tests/targetCollectionV3.test.js tests/chartRenderingV3.test.js
```

- [ ] **Step 3: Implement renderer-neutral target collection models**

Refactor Gauge and Bullet adapter construction into reusable single-mark
model builders. Build a target-collection model only for repeated marks.
Preserve ranking metrics and provenance outside the embedded ECharts option.
Do not add layout, paging, timers, or internal grid coordinates to the adapter.

- [ ] **Step 4: Run target, rendering, playback, and full unit tests**

```powershell
pnpm.cmd test -- tests/targetCollectionV3.test.js tests/chartRenderingV3.test.js tests/playbackComponentsV3.test.js
pnpm.cmd test
```

- [ ] **Step 5: Commit**

```powershell
git add src/charting/rendering tests/targetCollectionV3.test.js tests/chartRenderingV3.test.js tests/playbackComponentsV3.test.js
git commit -m "feat: model repeated target collections"
```

---

## Task 5: Render repeated targets through Collection Display

**Files:**

- Create: `src/components/charts/TargetCollectionChartView.jsx`
- Create: `src/components/charts/EmbeddedEChartsItem.jsx`
- Create: `tests/embeddedEChartsItemV3.test.js`
- Modify: `src/components/charts/ChartView.jsx`
- Modify: `src/styles.css`
- Modify: `tests/chartViewV3.test.js`
- Modify: `tests/collectionComponentsV3.test.js`
- Modify: `tests/targetCollectionV3.test.js`

**Interfaces:**

- `TargetCollectionChartView` owns one outer title, description, and provenance
  block and delegates all repeated-item presentation to `CollectionDisplay`.
- `EmbeddedEChartsItem` consumes one single-mark ECharts model and reuses the
  established lifecycle without rendering a nested chart title or source
  block.

- [ ] **Step 1: Add failing component, accessibility, and lifecycle tests**

Cover:

- fixed, scroll, carousel, and priority modes route through
  `CollectionDisplay`;
- ranking fallback status is visible and polite;
- the outer heading/source block appears once;
- every mini-chart has a stable entity wrapper, programmatic label, and
  accessible actual/target/time summary;
- playback collection rules and provenance are preserved;
- embedded ECharts initializes once, updates in place, reports bounded errors,
  resizes, and disposes every resource; and
- single-item Gauge/Bullet dispatch remains on the ordinary ECharts view.

- [ ] **Step 2: Run component/lifecycle tests and confirm RED**

```powershell
pnpm.cmd test -- tests/embeddedEChartsItemV3.test.js tests/targetCollectionV3.test.js tests/chartViewV3.test.js tests/collectionComponentsV3.test.js
```

- [ ] **Step 3: Implement the shared collection host and embedded lifecycle**

Keep layout, paging, motion, ranking, focus identity, and playback decisions in
`CollectionDisplay`. Reuse the existing ECharts lifecycle contract through a
small embedded wrapper; do not duplicate initialization/error logic.

- [ ] **Step 4: Run target, collection, rendering, playback, full unit, build, and browser gates**

```powershell
pnpm.cmd test -- tests/embeddedEChartsItemV3.test.js tests/targetCollectionV3.test.js tests/chartRenderingV3.test.js tests/chartViewV3.test.js tests/collectionComponentsV3.test.js tests/playbackComponentsV3.test.js
pnpm.cmd test
pnpm.cmd build
pnpm.cmd test:e2e
git diff --check
git status --short
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/charts src/styles.css tests
git commit -m "feat: share collection display across targets"
```

---

## Independent review gate

After all five tasks:

1. Run an independent whole-amendment review from its base to head.
2. Require explicit confirmation that:
   - the schema remains the single capability source;
   - time matching has one policy authority;
   - fixed Delta baselines are honest and reproducible;
   - the normalized collection shape is used from bundle through rendering;
   - KPI, Delta, Gauge, and Bullet collections share the same presentation
     framework; and
   - no compatibility, Quorum, deployment, or unrelated live-cutover work was
     introduced.
3. Resolve findings test-first, with at most two bounded final fix waves.
4. Rerun the full unit, build, and Chromium regression gates.
5. Only then begin
   `2026-07-26-schema-generated-wizard-editor.md`.

## Deferred to later plans

- Generated wizard/editor components and form-model rendering.
- Live shell cutover and default-dashboard rebuild.
- Mounted browser focus-through-priority-rerank E2E.
- Quorum catalogue contract version 2 and separate Quorum worktree.
- Merge, push, deployment, and Cloudflare changes.
