# Build-Time Chart Derivatives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove repeated invariant Biomedical data work from page navigation and establish a reusable compile-on-create/edit runtime-artifact path for V3 charts.

**Architecture:** A deterministic build script derives three runtime CSVs and a hash manifest from the authoritative municipal CSV. Runtime temporal discovery becomes lazy and revision-cached, while chart creation/editing publishes a versioned prepared artifact keyed only by data-affecting inputs; static rendering reuses it and Chrono performs only active-frame projection. The saved chart and authoritative source remain the sole editable truth.

**Tech Stack:** Node.js ESM, Papa Parse, React 19, Vite 6, ECharts 5, Node test runner, IndexedDB-compatible browser storage.

**Spec:** `docs/superpowers/specs/2026-08-22-build-time-chart-derivatives-design.md`

## Global Constraints

- Keep `public/data/biomedical/municipal_infections_2021_harmonized.csv` unchanged and authoritative.
- Preserve every pre-existing dirty and untracked file; stage only files owned by the current task.
- Use strict RED → GREEN TDD for each behavioral slice.
- Values copied into derivatives must not be rounded.
- View must not gain authoring chrome or a second editable content truth.
- Appearance, colour, layout, mode, page, selection, and drawer changes must not invalidate a data-preparation artifact.
- Storage unavailable keeps the live chart and artifact usable for the session; quota exhaustion remains distinct.
- Keep the accepted temporal matching, Scene, Time Group, provenance, and page-bounding rules unchanged.
- Use focused tests first; run the production build and proportionate in-app browser checks only after focused checks pass.

---

### Task 1: Deterministic Biomedical Runtime Derivatives

**Files:**
- Create: `scripts/biomedicalMunicipalDerivatives.mjs`
- Create: `scripts/build-biomedical-derivatives.mjs`
- Create: `tests/biomedicalMunicipalDerivatives.test.js`
- Create: `public/data/biomedical/municipal_map_timeline.csv`
- Create: `public/data/biomedical/municipal_aggregate_timeseries.csv`
- Create: `public/data/biomedical/municipal_latest_bubble.csv`
- Create: `public/data/biomedical/municipal_derivatives.manifest.json`
- Modify: `package.json`
- Modify: `public/config/dashboard.json`
- Modify: `tests/defaultDashboardV3.test.js`

**Interfaces:**
- Produces: `buildMunicipalDerivatives(csvText, { sourcePath }) -> { files, manifest }`.
- Produces: CLI `node scripts/build-biomedical-derivatives.mjs [--check]`.
- Produces: runtime sources `bio_municipal_map_timeline`, `bio_municipal_aggregate_timeseries`, and `bio_municipal_latest_bubble`.
- Consumes: Papa Parse and Node `crypto.createHash("sha256")`.

- [ ] **Step 1: Write the failing generator tests**

Use a literal 2-date × 2-municipality fixture. Assert exact map rows, literal aggregate sums, latest bubble rows, source and output hashes, and failures for duplicate map keys and an incomplete grid.

```js
test("municipal derivatives retain exact map cells and precompute chart-specific rows", () => {
  const result = buildMunicipalDerivatives(FIXTURE, { sourcePath: "authority.csv" });
  assert.equal(result.files.map, [
    "Datum,MunicipalityCode,infectionsPer10000",
    "2020-01-01,GM0001,1.25",
    "2020-01-01,GM0002,2.5",
    "2020-01-02,GM0001,3.75",
    "2020-01-02,GM0002,4",
  ].join("\n"));
  assert.equal(result.files.aggregate, [
    "Datum,AantalCumulatief",
    "2020-01-01,30",
    "2020-01-02,70",
  ].join("\n"));
  assert.equal(result.manifest.authoritative.rowCount, 4);
  assert.equal(result.manifest.derivatives.map.rowCount, 4);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/biomedicalMunicipalDerivatives.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/biomedicalMunicipalDerivatives.mjs`.

- [ ] **Step 3: Implement the pure generator and CLI**

The pure function must validate the 13 authoritative columns, unique `(Datum, MunicipalityCode)` keys, a rectangular date/code grid, finite map values, and a latest-date row for every municipality. Preserve raw map numeric strings, calculate per-date `AantalCumulatief` with finite numeric addition, CSV-escape text fields, sort by source date/code order, and hash UTF-8 bytes.

```js
export function buildMunicipalDerivatives(csvText, { sourcePath }) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = validateAuthority(parsed);
  const map = emitMap(rows);
  const aggregate = emitAggregate(rows);
  const bubble = emitLatestBubble(rows);
  return Object.freeze({
    files: Object.freeze({ map, aggregate, bubble }),
    manifest: buildManifest({ csvText, sourcePath, rows, map, aggregate, bubble }),
  });
}
```

The CLI writes all four outputs normally. Under `--check`, it compares exact bytes and exits non-zero naming the first stale path.

- [ ] **Step 4: Run GREEN and generate tracked outputs**

Run: `node --test tests/biomedicalMunicipalDerivatives.test.js`

Expected: PASS.

Run: `node scripts/build-biomedical-derivatives.mjs`

Expected: four runtime artifacts written; manifest reports 146,080 map rows, 415 aggregate rows, and 352 bubble rows.

- [ ] **Step 5: Repoint dashboard charts and build ordering**

Add the three derivative descriptors with derivative provenance and parsing metadata. Point each municipal chart to its dedicated source. Remove the authoritative 23.1 MB source descriptor only after no runtime chart references it. Prepend `node scripts/build-biomedical-derivatives.mjs` before dataset-profile generation in `predev`, `prebuild`, and both Cloudflare build scripts; add `build:biomedical-derivatives` and `check:biomedical-derivatives` commands.

- [ ] **Step 6: Test live configuration behavior**

Extend `tests/defaultDashboardV3.test.js` to load the real config and assert the three chart/source mappings, derivative row cardinalities, and absence of a runtime descriptor for the authoritative source.

Run: `node --test tests/biomedicalMunicipalDerivatives.test.js tests/defaultDashboardV3.test.js`

Expected: PASS.

- [ ] **Step 7: Commit the slice**

```powershell
git add -- scripts/biomedicalMunicipalDerivatives.mjs scripts/build-biomedical-derivatives.mjs tests/biomedicalMunicipalDerivatives.test.js public/data/biomedical/municipal_map_timeline.csv public/data/biomedical/municipal_aggregate_timeseries.csv public/data/biomedical/municipal_latest_bubble.csv public/data/biomedical/municipal_derivatives.manifest.json package.json public/config/dashboard.json tests/defaultDashboardV3.test.js
git commit -m "perf: generate biomedical chart derivatives"
```

---

### Task 2: Revision-Aware Temporal Availability Cache

**Files:**
- Modify: `src/charting/time/temporalAvailability.js`
- Modify: `src/charting/time/timeSyncModel.js`
- Create: `tests/temporalAvailabilityCache.test.js`
- Modify: `tests/timeSyncModel.test.js`

**Interfaces:**
- Produces: `createTemporalAvailabilityCache() -> { read(input, build), clear() }`.
- Produces: `temporalAvailabilityIdentity({ chart, member, profile, period, timezone }) -> string`.
- `collectTemporalAvailability(input)` retains its public signature and uses the shared cache.

- [ ] **Step 1: Write failing cache behavior tests**

Assert that identical row-array identity plus an identical data-affecting signature returns the same frozen availability array; a new period, temporal binding, filter, profile fingerprint, timezone, or row-array identity returns a different result; presentation/layout-only chart changes reuse the result.

```js
const first = collectTemporalAvailability(fixture());
const same = collectTemporalAvailability(fixture({ chart: presentationClone }));
const changed = collectTemporalAvailability(fixture({ chart: filteredClone }));
assert.strictEqual(same, first);
assert.notStrictEqual(changed, first);
assert.deepEqual(first, [Date.UTC(2027, 4, 1), Date.UTC(2027, 4, 2)]);
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/temporalAvailabilityCache.test.js tests/timeSyncModel.test.js`

Expected: FAIL because repeated availability arrays are recomputed and have different identities.

- [ ] **Step 3: Implement the cache**

Use a `WeakMap` keyed by the loaded rows array. Within it, key a `Map` by a stable JSON identity containing only the member time binding, plotted bindings, transformations, profile fingerprint/revision plus relevant column metadata, period, and timezone. Exclude chart title, description, presentation, interaction, and layout. Return frozen sorted arrays.

```js
const availabilityByRows = new WeakMap();

export function createTemporalAvailabilityCache() {
  return Object.freeze({
    read(rows, identity, build) {
      let entries = availabilityByRows.get(rows);
      if (!entries) availabilityByRows.set(rows, entries = new Map());
      if (entries.has(identity)) return entries.get(identity);
      const value = Object.freeze([...build()]);
      entries.set(identity, value);
      return value;
    },
  });
}
```

- [ ] **Step 4: Run GREEN and focused temporal regression**

Run: `node --test tests/temporalAvailabilityCache.test.js tests/timeSyncModel.test.js tests/playbackComponentsV3.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the slice**

```powershell
git add -- src/charting/time/temporalAvailability.js src/charting/time/timeSyncModel.js tests/temporalAvailabilityCache.test.js tests/timeSyncModel.test.js
git commit -m "perf: cache temporal availability by revision"
```

---

### Task 3: Lazy Default Chrono Construction

**Files:**
- Modify: `src/components/playback/PlaybackProvider.jsx`
- Modify: `tests/playbackComponentsV3.test.js`
- Modify: `tests/e2e/dashboard-performance.spec.js`

**Interfaces:**
- Produces: `resolveDefaultPagePlayback({ enabled, charts, temporalContext })`.
- Closed Chrono returns a frozen empty default ledger without calling `buildDefaultPagePlayback`.
- Opening Chrono builds the current-page ledger and reuses Task 2 availability entries.

- [ ] **Step 1: Write failing closed/open behavior tests**

Use a temporal source row with a counted `observed` getter. Render the provider with Default selected and `playbackView: false`; assert zero reads. Render with `playbackView: true`; assert reads occur and the expected clock is exposed.

```js
assert.equal(readCountAfterClosedRender, 0);
assert.equal(openProbe, `<output>[${MAY_1},${MAY_2}]</output>`);
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/playbackComponentsV3.test.js`

Expected: FAIL because the closed provider reads temporal rows.

- [ ] **Step 3: Implement lazy default resolution**

Remove Default page playback construction from `initializePlaybackState`. In the provider, call the default builder only when `state.playbackView === true`, the selected source is Default, and no Scene owns the clock. Closed state exposes an empty clock and the stable `default-page` group label so existing closed controls remain truthful.

```js
const defaultPagePlayback = React.useMemo(() => resolveDefaultPagePlayback({
  enabled: state.playbackView === true && state.source?.kind === "default" && !activeScene,
  charts: activePageCharts,
  temporalContext,
}), [activePageCharts, activeScene, state.playbackView, state.source?.kind, temporalContext]);
```

- [ ] **Step 4: Run GREEN and add navigation timing evidence**

Run: `node --test tests/playbackComponentsV3.test.js tests/temporalAvailabilityCache.test.js`

Expected: PASS.

Extend the existing performance E2E to record Home → Biomedical → Socio navigation durations and assert that closed Chrono has no visible playback surface; do not impose a brittle millisecond threshold.

- [ ] **Step 5: Commit the slice**

```powershell
git add -- src/components/playback/PlaybackProvider.jsx tests/playbackComponentsV3.test.js tests/e2e/dashboard-performance.spec.js
git commit -m "perf: build default chrono only when opened"
```

---

### Task 4: Versioned Chart Runtime Artifacts

**Files:**
- Create: `src/charting/runtime/chartPreparationIdentity.js`
- Create: `src/charting/runtime/chartRuntimeArtifact.js`
- Create: `src/charting/runtime/chartRuntimeArtifactRegistry.js`
- Create: `src/charting/runtime/projectRuntimeArtifact.js`
- Create: `src/charting/runtime/browserChartArtifactStore.js`
- Create: `tests/chartRuntimeArtifact.test.js`
- Create: `tests/browserChartArtifactStore.test.js`

**Interfaces:**
- Produces: `chartPreparationIdentity({ chart, source, profile, geoSource }) -> string`.
- Produces: `compileChartRuntimeArtifact({ identity, chart, prepared, temporalAvailability }) -> ChartRuntimeArtifact`.
- Produces: `createChartRuntimeArtifactRegistry({ store, onPersistenceFailure })` with `get`, `publish`, `preload`, and `remove`; `publish(artifact)` returns `{ artifact, persistence }` where `persistence` is a promise.
- Produces: `projectRuntimeArtifact({ artifact, chart, timeContext }) -> prepared` for active-frame matching, reveal, interpolation, and provenance over compiled marks.
- Produces: `createBrowserChartArtifactStore({ indexedDB })` with `get`, `put`, and `remove`.

- [ ] **Step 1: Write failing identity, artifact, registry, and storage tests**

Assert literal identity stability across title/background/layout changes; identity changes for source fingerprint, roles, transformations, temporal metadata, or GeoJSON fingerprint; artifacts reject mismatched versions/identities; memory publication is immediate; durable failure retains memory; quota and unavailable errors have distinct codes.

```js
assert.equal(identityFor(base), identityFor({ ...base, chart: restyledChart }));
assert.notEqual(identityFor(base), identityFor({ ...base, chart: remappedChart }));
registry.publish(artifact);
assert.strictEqual(registry.get(artifact.identity), artifact);
const publication = registry.publish(artifact);
await assert.rejects(publication.persistence, { code: "ARTIFACT_QUOTA_EXHAUSTED" });
assert.strictEqual(registry.get(artifact.identity), artifact);
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/chartRuntimeArtifact.test.js tests/browserChartArtifactStore.test.js`

Expected: FAIL with missing runtime-artifact modules.

- [ ] **Step 3: Implement stable identity and artifact sanitization**

Use sorted-key serialization and a deterministic SHA-256-compatible Web Crypto path with a synchronous stable-key fallback for memory lookup. Artifact payload contains only format version, identity, chart ID, source fingerprint, preparation metadata, prepared marks/diagnostics/meta, and frozen temporal availability. Strip `formPreparationKey`, source rows, feature geometry repeated on geography marks, render instances, DOM values, and functions.

- [ ] **Step 4: Implement registry and IndexedDB adapter**

Memory is authoritative for the current session. `publish` validates before insertion, then starts durable `put` without removing memory on failure. `preload(identities)` reads durable records and publishes only valid matches. Normalize IndexedDB unavailable to `ARTIFACT_STORAGE_UNAVAILABLE` and quota exceptions to `ARTIFACT_QUOTA_EXHAUSTED`.

- [ ] **Step 5: Implement prepared-artifact temporal projection**

Index artifact marks by the normalized temporal mark field and the existing chart-family identity rules. Exact, last-known, and nearest choose existing compiled marks; interpolation is permitted only where the existing temporal model permits it and linearly derives the normalized numeric mark value; trace reveal returns compiled marks through the active epoch. Apply the existing provenance vocabulary (`observed`, `carried`, `nearest`, `interpolated`, `missing`) and leave the artifact immutable.

```js
export function projectRuntimeArtifact({ artifact, chart, timeContext }) {
  const index = artifact.temporalIndex?.[temporalRoleId(chart)];
  if (!index || !Number.isFinite(timeContext?.activeEpochMs)) return null;
  return Object.freeze({
    ...artifact.prepared,
    marks: projectIndexedMarks(index, chart, timeContext),
    meta: { ...artifact.prepared.meta, activeTime: activeTimeMeta(timeContext) },
  });
}
```

- [ ] **Step 6: Run GREEN**

Run: `node --test tests/chartRuntimeArtifact.test.js tests/browserChartArtifactStore.test.js`

Expected: PASS.

- [ ] **Step 7: Commit the slice**

```powershell
git add -- src/charting/runtime/chartPreparationIdentity.js src/charting/runtime/chartRuntimeArtifact.js src/charting/runtime/chartRuntimeArtifactRegistry.js src/charting/runtime/projectRuntimeArtifact.js src/charting/runtime/browserChartArtifactStore.js tests/chartRuntimeArtifact.test.js tests/browserChartArtifactStore.test.js
git commit -m "feat: add versioned chart runtime artifacts"
```

---

### Task 5: Compile on Create/Edit and Reuse in Rendering

**Files:**
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx`
- Modify: `src/charting/rendering/resolveChartRendering.js`
- Modify: `src/components/charts/ChartView.jsx`
- Modify: `src/App.jsx`
- Create: `tests/chartRuntimeArtifactIntegration.test.js`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `tests/chartViewV3.test.js`
- Modify: `tests/dashboardAppV3.test.js`

**Interfaces:**
- Wizard and editor save payloads gain transient `runtimeArtifact`; dashboard serialization ignores it.
- App publishes the artifact only after the serialized chart transaction commits and before reveal resolves.
- `resolveChartRendering(input)` checks the shared registry by preparation identity before calling `prepareChartData` for static rendering.
- Active Chrono projects runtime state from artifact marks/index when supported and falls back once to source compilation for a legacy artifact.

- [ ] **Step 1: Write failing integration tests**

Assert the Wizard creation callback receives a valid artifact; the editor reuses identity for presentation-only changes and creates a new identity for role/filter changes; the App publishes after commit; two static renders with cloned restyled chart objects call the preparer once; a stale artifact is ignored.

```js
const created = await captureWizardCreate();
assert.equal(created.runtimeArtifact.chartId, created.chart.id);
assert.equal(created.runtimeArtifact.prepared.status, "ready");
assert.equal(identityAfterRestyle, identityBefore);
assert.notEqual(identityAfterRemap, identityBefore);
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/chartRuntimeArtifactIntegration.test.js tests/chartAuthoringComponentsV3.test.js tests/chartViewV3.test.js tests/dashboardAppV3.test.js`

Expected: FAIL because save payloads and rendering do not use runtime artifacts.

- [ ] **Step 3: Attach prepared artifacts to authoring transactions**

In the Wizard, compile from `runtime.prepared`, current chart, source descriptor, runtime profile, selected GeoJSON descriptor, and temporal availability immediately before `executeChartCreate`. In the editor, compile from its existing `prepared` value before `onSave`. Do not add the artifact to `normalizeChartInstance` or serialized dashboard configuration.

- [ ] **Step 4: Publish after successful chart commit and persist in background**

Make `createChart` and `saveChart` async. Await the serialized dashboard mutation, publish the matching artifact, then return so the existing reveal/handoff runs. Durable persistence failure sets a bounded bottom-right notice; unavailable says session-only and quota says storage is full. Neither reverses the committed chart.

- [ ] **Step 5: Reuse artifacts in static rendering**

Before `prepareChartData`, calculate identity from the chart, source metadata in `renderContext.sources`, profile, and GeoJSON source metadata. If a matching artifact exists, call `resolvePreparedChartRendering(input, artifact.prepared)`. Otherwise prepare once, compile a compatibility artifact, and publish it in memory.

- [ ] **Step 6: Preserve runtime-only Chrono work**

Use the artifact temporal availability for clock construction. For active playback, reuse prepared invariant marks and apply only matching/reveal/provenance projection. Keep the existing source path as a one-time compatibility fallback for unsupported legacy artifacts; publish the upgraded artifact after the fallback succeeds.

- [ ] **Step 7: Run GREEN and focused regressions**

Run: `node --test tests/chartRuntimeArtifactIntegration.test.js tests/chartAuthoringComponentsV3.test.js tests/chartViewV3.test.js tests/dashboardAppV3.test.js tests/playbackComponentsV3.test.js tests/chartCreateTransaction.test.js`

Expected: PASS.

- [ ] **Step 8: Commit the slice**

```powershell
git add -- src/components/chart-authoring/ChartWizardV3.jsx src/components/chart-authoring/ChartEditorV3.jsx src/charting/rendering/resolveChartRendering.js src/components/charts/ChartView.jsx src/App.jsx tests/chartRuntimeArtifactIntegration.test.js tests/chartAuthoringComponentsV3.test.js tests/chartViewV3.test.js tests/dashboardAppV3.test.js
git commit -m "perf: compile chart data when authoring commits"
```

---

### Task 6: Build, Browser Checkpoint, and Evidence

**Files:**
- Modify only if concrete failures require it: files already owned by Tasks 1–5.
- Update: `docs/superpowers/plans/2026-08-19-v3-step-7-build-view.md` with completion evidence for this amendment.

**Interfaces:**
- Consumes all prior task outputs.
- Produces deterministic build evidence and comparative browser timing evidence.

- [ ] **Step 1: Run the derivative freshness and focused suite**

Run: `node scripts/build-biomedical-derivatives.mjs --check`

Run: `node --test tests/biomedicalMunicipalDerivatives.test.js tests/defaultDashboardV3.test.js tests/temporalAvailabilityCache.test.js tests/timeSyncModel.test.js tests/playbackComponentsV3.test.js tests/chartRuntimeArtifact.test.js tests/browserChartArtifactStore.test.js tests/chartRuntimeArtifactIntegration.test.js tests/chartAuthoringComponentsV3.test.js tests/chartViewV3.test.js tests/dashboardAppV3.test.js tests/chartCreateTransaction.test.js`

Expected: all pass with no warnings attributable to this work.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`

Expected: derivative generation, dataset profiles, portable data, catalogue generation, and Vite production build all succeed.

- [ ] **Step 3: Exercise the in-app browser checkpoint**

At the existing local dashboard URL:

1. switch Home → Biomedical → Socio-economic → Biomedical with Chrono closed;
2. record comparative navigation durations from the performance test or browser performance entries;
3. open the municipal map and verify latest frame, tooltip value/name, Ctrl zoom/pan, and no authoring chrome in View;
4. open Chrono, select Municipal outbreak playback, advance at least two frames, and verify map and aggregate line remain synchronized;
5. create a small chart in Build, return to View, switch colour/style and pages, and verify the chart reuses its prepared artifact without changing saved layout; and
6. close/reopen the dashboard once to exercise durable artifact preload or truthful session-only fallback.

- [ ] **Step 4: Record evidence and limitations**

Amend the Step 7 plan evidence with commits, derivative byte/row counts, focused-test command, production-build result, browser checkpoint URL, comparative timings, and any concrete remaining limitation. Do not declare V3 master acceptance.

- [ ] **Step 5: Commit evidence**

```powershell
git add -- docs/superpowers/plans/2026-08-19-v3-step-7-build-view.md
git commit -m "docs: record chart derivative performance evidence"
```
