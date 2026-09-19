# One Dashboard Time Cursor

Design and implementation handoff. Written against `claude/view-build-decision-surface-ff6f8a` at `f3bc728` (base `c003d11`). Companion to the Chrono Groups and Scenes assessment, which this document assumes; it details the "one cursor" idea from that paper. Intended executor: Astra. The "Handoff notes for the executor" section at the end covers the environment.

## What the cursor is for

The dashboard should answer two questions on any page without authoring anything first: *what is the situation now?* and *how did it get here?* Today those answers are scattered: View has "Chrono view" with a group or scene as its clock, this branch added a page-time readout, Present has its own playback with a group id in the presentation state, and 29 of 38 charts in the reference bundle have no time role at all and simply ignore all of it. The cursor makes time a single, visible, dashboard-level fact that every surface reads.

## The model

### State

One object, owned by the playback provider and shared by View and Present:

```js
cursor = {
  mode: "live" | "at",          // live: the present; at: a chosen instant
  epochMs: number | null,       // the instant when mode is "at"
  scope: { kind: "page" | "storyline" | "dashboard", id: string | null },
  window: { start: string, end: string } | null,   // limits the clock; null means full coverage
  playing: boolean,
  speed: number,                // seconds per frame, from the existing reducer
  matchingOverride: "authored" | "concurrent" | "interpolate" | "latest" | "closest",
  traceMode: "reveal" | "full",
  availabilityVisible: boolean,
}
```

The **clock** is derived, never stored: the sorted union of observation times of the temporal charts inside the scope, restricted to the window. Page scope uses the active page's temporal charts (what `buildDefaultPagePlayback` already computes); storyline scope uses the storyline's members; dashboard scope uses every temporal chart. Snapshot charts (no time role) are never in the clock.

### What "live" means

Live is not "the last frame of the clock". In an exercise the data often contains the whole scripted timeline in advance, so "now" is the exercise's clock, not the newest row. Live resolves to:

1. The Scenario's declared exercise time, if set (new optional dashboard field `scenario.exerciseTime`, an ISO timestamp the moderator advances as the exercise proceeds).
2. Otherwise the latest observation across the scope.

In live mode every temporal chart resolves to that instant through its own sync policy (chart-owned, as in the assessment), and charts whose data ends earlier show their last known value with an "as of" chip. Snapshot charts render as they are. This is the answer to "what is the situation now?" and it needs no authored object.

### What "at" means

At an instant, every temporal chart in scope resolves to `epochMs` through its policy, exactly as playback does today, and the page keeps its authored layout: no chart is hidden, moved, or pulled into a separate section. Trace mode decides whether series reveal up to the cursor or show full history with a marker. Snapshot charts stay as they are with a quiet "static" chip so nobody reads them as historical.

Playback is simply `mode: "at"` with `playing: true`, stepping `epochMs` along the clock. Pausing keeps `at`. "Return to live" sets `mode: "live"`.

### Scope

Scope only decides which charts feed the clock and which charts respond; it never rearranges the page. Page is the default and covers most use. Storyline scope is set when a Storyline band is open (see the assessment) and narrows both the clock and the responding charts to the members. Dashboard scope exists for Present, where the moderator may step time while switching pages, and for the audience display, which has no page of its own.

The current `all-page` / `group-only` distinction, and the projection that hides non-members and pulls focused charts into a "Chrono section" at the top of the page (`chronoCanvasProjection.js`, the `chrono-dashboard-section` in `DashboardCanvas.jsx`), are retired. Pulling charts together is what Storylines are for; hiding charts was a workaround for not having them.

### Chart-level resolution

`applyTimeContext.js` already resolves a chart against `{ activeEpochMs, matching }`. The change is where `matching` comes from: the chart's own `interaction.timeSync.matching` (default per source cadence), overridden by a storyline member override, overridden by the session's `matchingOverride` when it is not `authored`. The provider's `timeContextForChart(chartId)` returns `null` for snapshot charts and for charts outside the scope, and a context otherwise, in both modes. `ChartView` keeps its explicit-context path for fullscreen and audience rendering.

## The UI

### Time bar in the crown

The mode context strip becomes the **Time bar**, one 36px row under the location row on every View page and in Present, growing out of the `PageTimeContext` component this branch added. Left to right:

```
| ● Live                              | ◀ ▶ ▮▮ ⏵  12 Mar 2027 14:00  ▾ | Scope: Page ▾ | Time settings |
```

- **Live pill** (button, `aria-pressed`): filled when live, hollow when at. Pressing it while at returns to live. Its label carries the resolved instant in live mode ("Live, 14 Mar 2027 09:00") so the moderator sees what "now" is.
- **Transport**: step back, play or pause, step forward, then the current instant as a button that opens the **timeline scrubber**. Stepping from live enters `at` at the live instant, so the first press back is always meaningful. Keyboard: Space toggles play, ArrowLeft and ArrowRight step, Home and End jump, Escape returns to live; these bind only while focus is inside the time bar or the scrubber.
- **Scope** select: Page, the open Storyline (when one is open), Dashboard. Present shows Storyline names here as well.
- **Time settings** opens a small disclosure (not a drawer) with the existing controls that rarely change: speed presets (1, 2, 5 seconds per frame), matching override, trace mode, availability information toggle, and the window (start and end date inputs, "Whole coverage" reset).

The floating `ChronoController` and the `Chrono view` toggle in the page actions are retired; every control they had lives in the time bar or its settings disclosure. The crown test contract keeps three layers: mode, location, context; the context layer is the time bar.

### Timeline scrubber

Pressing the instant opens a full-width strip directly under the crown (`position: sticky`, 44px tall on desktop, 56px on phone for the touch target):

- A track spanning the window, with light tick marks at every clock frame so density and gaps are visible at a glance, and a darker band for each contiguous coverage run computed by `temporalAvailability.js`.
- A thumb at the cursor; drag or click to seek; the instant label follows the thumb. Coarse steps with the arrow keys, fine steps with Shift.
- A dotted marker at the exercise time when declared, labelled "now".
- Key-moment markers when the Storyline model adds them; the track leaves a lane for them from the start.

The scrubber closes with Escape or by pressing the instant again. It never covers content; the page scrolls under it.

### The as-of stamp

`ChronoDateOverlay` stays as the large stamp in the corner of the canvas whenever the mode is `at` or the exercise time is declared, on View and on the audience display, so a photo of the screen carries its time. It reads the cursor, nothing else.

### Per-chart chips

Each temporal chart's heading gains a small chip, right-aligned next to the existing description and fullscreen controls: the resolved observation time and the policy word when it differs from exact ("14 Mar 09:00, last known"). Snapshot charts show "static" only in `at` mode. The chip is `aria-live="off"`; the time bar announces cursor changes once, politely, for screen readers.

### Phone

The time bar collapses to the live pill, play or pause, and the instant button; scope and settings move into the instant's disclosure alongside the scrubber. It sits below the one-row crown from this branch.

### Present and the audience display

Present's controller shows the same time bar and scrubber, with Dashboard scope available. The cursor becomes part of the accepted presentation state (`time: { mode, epoch_ms, scope }` replacing `time: { group_id, active_epoch_ms }`), so the audience display resolves every displayed chart through the same rules, shows the as-of stamp, and stays in step through the existing channel. "Advance exercise time" appears in Present next to the live pill for moderators who run the exercise clock from the room; it writes `scenario.exerciseTime` through the existing Scenario Passport path and is disabled when the dashboard is read-only.

### Build

Build does not play time; it authors it. Two additions: the Scenario Passport gets the exercise time field (date and time inputs, optional), and the chart editor's Data step shows the chart's sync policy with the four choices and a sentence explaining each ("Last known: show the most recent value at or before the cursor"). The authoring stage from the fidelity design renders the draft at the current cursor so authors see what the chart does at an instant, with a Live/At toggle in the stage header.

## What changes across the dashboard

| Area | Today | With the cursor |
| --- | --- | --- |
| `playbackReducer.js` | `source` (default/group/scene), `scope` (all-page/group-only), `playbackView` with owners, `sourcePreference` | `mode`, `epochMs`, `scope` (page/storyline/dashboard), `window`; `openView`/`closeView` become `enterAt`/`returnToLive`; owners removed |
| `PlaybackProvider.jsx` | clock from selected group or scene, else default page | clock from scope through one `buildCursorClock(charts, window)`; `timeContextForChart` valid in both modes; exposes `cursor`, `clock`, `liveEpochMs` |
| `chronoCanvasProjection.js`, chrono section in `DashboardCanvas.jsx` | hides non-members, pulls members to the top | removed; Storyline band covers composition |
| `ChronoController.jsx`, `PlaybackPageActions.jsx`, `PageTimeContext.jsx` | floating transport, Chrono view toggle, page-time readout | one `TimeBar.jsx` plus `TimeSettings.jsx` and `TimelineScrubber.jsx` |
| `ChronoDateOverlay.jsx` | shows the frame date in playback | reads the cursor; also shows declared exercise time in live mode |
| `ChartHeading.jsx` | title, description, controls | adds the as-of chip |
| Chart schema | `interaction.timeSync` slot unused | `timeSync.matching` default per chart; validated |
| Dashboard config | no exercise time | optional `scenario.exerciseTime`; no version bump |
| `audienceProjection.js`, `usePresentationRuntime.js`, `AudienceDisplay.jsx` | `time.group_id` + `active_epoch_ms` | `time.mode`, `time.epoch_ms`, `time.scope`; audience resolves charts through the shared resolver |
| `PresentWorkspace.jsx` | own playback controls | `TimeBar` with Dashboard scope and "Advance exercise time" |
| Scenario Passport | identity and package controls | exercise time field |
| Chrono Studio, Scene Studio | group-scoped | untouched here; the assessment's tasks handle Storylines |
| Region registry and journey manifest | `view-playback-controls` (floating) | `view-time-bar` (command-bar, persistent in View and Present), `view-timeline-scrubber` (conditional) |

Nothing changes in the data pipeline, the render adapters, or the config version.

## Implementation order for Astra

One commit per task with the repository's usual attribution trailer. Run only the targeted check named in each task (AGENTS.md cadence). Land the Chrono Groups assessment's tasks 1 and 2 first if possible (cross-page scenes and chart-owned sync); the cursor still works without them, using session overrides.

1. **Cursor reducer.** Rewrite `playbackReducer.js` around the state above with actions `enterAt`, `returnToLive`, `seek`, `step`, `play`, `pause`, `setScope`, `setWindow`, `setSpeed`, `setMatchingOverride`, `setTraceMode`, `setAvailabilityVisible`. Keep `openView`, `closeView`, `setGroup`, `setScene` as thin aliases for one release so existing dispatchers keep working. Rewrite `tests/chronoGroupModelV3.test.js`'s reducer cases as a table with literal expected states. Check: that file and `tests/playbackViewOwnership.test.js`.
2. **Clock derivation and resolution.** Add `buildCursorClock({ charts, window })` to `src/charting/time/playbackPageScope.js` (generalising `buildDefaultPagePlayback`), and `liveEpochMs({ exerciseTime, clock })`. In `PlaybackProvider.jsx` derive `clock`, `liveEpochMs`, and `timeContextForChart` for both modes from the scope; drop group and scene resolution paths. Check: `tests/viewChronoConvergence.test.js`, `tests/chartTemporalV3.test.js`.
3. **Retire the projection.** Delete `chronoCanvasProjection.js` and the chrono section branch in `DashboardCanvas.jsx`, `ViewShell.jsx`, and `DashboardModeWorkspace.jsx`; charts respond in place. Update `tests/viewChronoRuntimeFidelity.test.js`. Check: that file and `tests/dashboardAttentionStrip.test.js`.
4. **Time bar and settings.** Create `src/components/playback/TimeBar.jsx` and `TimeSettings.jsx`; replace `PageTimeContext` in `App.jsx`'s View `contextNode` and remove `PlaybackPageActions` from the page actions and `ChronoController` from `PlaybackSurface.jsx`. Keyboard bindings live in `TimeBar`. SSR test `tests/timeBar.test.js` for both modes, the scope options, and the settings disclosure. Check: that file, `tests/dashboardCommandCrown.test.js`, `tests/viewCrown.test.js`.
5. **Scrubber.** Create `TimelineScrubber.jsx` with a pure `scrubberModel({ clock, window, coverageRuns, cursor })` in `src/charting/time/scrubberModel.js` that returns tick positions, coverage bands, and the thumb position as fractions; the component renders them. Unit test the model with literal fractions. Check: `tests/scrubberModel.test.js`.
6. **Stamp and chips.** Point `ChronoDateOverlay` at the cursor and add the as-of chip to `ChartHeading.jsx` from the chart's resolved provenance (`item.provenance`, `temporalStatus` already exist for cards; extend `resolveChartRendering` to expose `resolvedTime` and `policy` for axis charts). Check: `tests/chartViewV3.test.js`, `tests/scenePreviewTime.test.js`.
7. **Chart-owned sync policy.** Validate `interaction.timeSync.matching` in the chart schema with a per-schema default; surface it in the editor's Data step. Check: `tests/chartSchemasV3.test.js`, `tests/chartAuthoringComponentsV3.test.js`.
8. **Exercise time.** Add optional `scenario.exerciseTime` to `dashboardConfigStructure.js` (ISO timestamp, validated against `validateDashboardTimezone`), the Scenario Passport field, and the live resolution in task 2. Check: `tests/sectionRoles.test.js` neighbours in `tests/dashboardTheme.test.js` for the structure contract, `tests/scenarioPassportContainment.test.js`.
9. **Present and audience.** Change the presentation state's `time` shape in `audienceProjection.js` and `usePresentationRuntime.js`; mount `TimeBar` in `PresentWorkspace.jsx` with Dashboard scope and "Advance exercise time"; make `AudienceDisplay` resolve through the shared resolver and show the stamp. Check: `tests/audienceProjection.test.js`, `tests/presentPlaybackOwnership.test.js`, `tests/audienceDisplay.test.js`.
10. **Phone layout.** Collapse the time bar at `max-width: 767px` inside the Lane C CSS block; scrubber height 56px. Check: `tests/mobileViewHeader.test.js`.
11. **Regions, manifest, journeys.** Register `view-time-bar` and `view-timeline-scrubber`; replace `view-chrono-controls` in the journey manifest; rewrite `tests/e2e/v3-view-chrono.spec.js` as `v3-time-cursor.spec.js`: enter at from live, step, scrub, change scope, return to live, and assert the as-of stamp and a chip; extend `v3-present-audience.spec.js` so the audience stamp follows the controller's cursor. Check: `tests/dashboardRegionRegistry.test.js`, `tests/dashboardSurfaceManifest.test.js`, then `pnpm.cmd test:e2e:dev tests/e2e/v3-time-cursor.spec.js --project=chromium`.

Tasks 1 to 3 are the foundation and must go in order; 4 to 8 can run in parallel after 2; 9 needs 4 and 8; 11 is last.

## Verification summary

- Reducer and clock: table tests with literal states and literal epoch lists, including live resolution with and without a declared exercise time, window clipping, and scope switches that keep the cursor inside the new clock (snap to nearest frame).
- Components: SSR markup for the time bar in live and at modes, the scrubber model fractions, the as-of chip text for exact, last known, and interpolated resolutions, and the static chip only in at mode.
- Journeys: the cursor journey above; the Present journey asserting the audience stamp; the existing mobile journey extended with the collapsed time bar.
- Pre-existing failures: many current specs reference charts absent from the shipped dashboard; classify against the base commit before treating a failure as a regression.

## Handoff notes for the executor

- Read AGENTS.md first; run only the targeted checks per task; full gates run once at pre-merge with a ledger saved outside `test-results`.
- Playwright single specs: `pnpm.cmd test:e2e:dev <spec> --project=chromium`, no `--` separator.
- Fresh worktrees: `pnpm.cmd install --frozen-lockfile --prefer-offline`; start the app with `pnpm.cmd exec vite --host --port 5174 --strictPort`.
- Codex on this machine: `codex exec --approve-for-me -C <worktree> -c 'sandbox_workspace_write.writable_roots=["<repo>/.git"]' -c sandbox_workspace_write.network_access=true -m gpt-6-astra`; retry once with escalation on git or esbuild permission errors.
- Do not edit unrelated tests; report failures that reproduce at the base commit instead.
