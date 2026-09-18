# Preview Fidelity: Chart Authoring Stage and Audience Monitor

Design and implementation handoff. Written against branch `claude/view-build-decision-surface-ff6f8a` at `835f6ca` (base `c003d11`). Intended executor: Astra (Codex, `gpt-6-astra`). Everything an implementer needs is in this file; the "Handoff notes for the executor" section at the end covers the environment.

## The two problems, stated precisely

**Problem 1: the chart editor and wizard preview is not what the dashboard shows.** The editor renders `ChartPreview` inside `.chart-editor-preview`, a box whose ECharts host is pinned to 250px tall (`src/styles.css:6160`) and whose width is whatever the dialog column happens to be. On the dashboard, the same chart renders through `ChartPanel` inside a grid cell whose size is fixed by its footprint: the `.layout-grid` has 4 columns, 16px gaps, and `grid-auto-rows: calc((418px - 112px) / 8)` = 38.25px, inside a canonical canvas of `--simex-canonical-canvas-max-width: 1392px`. ECharts lays out labels, legends, axis ticks, and wrapping in absolute pixels, so a different container size produces a different chart, not a scaled one. The Build canvas already renders the in-progress draft in the real panel (`projectChartEditSessionDashboard`, `DashboardRenderer.jsx:412`), so the truthful preview exists on screen; the editor simply shows a second, untruthful one and, in full-editor mode, covers the truthful one with a wide dialog.

**Problem 2: the Present monitor is not the audience display.** `AudienceSnapshotMonitor.jsx` already implements snapshotting, but of the wrong thing: it mounts a second `AudienceDisplay` offscreen at a hard-coded 1280×720 (`.audience-snapshot-source`), rasterises it with `html2canvas` at 0.75 scale, and shows that JPEG in a fixed 16:9 frame. The real audience window has its own viewport (often 1920×1080 or a projector's native size), 48px padding, its own device pixel ratio, and its own accepted state after channel latency. Text metrics, wrapping, and composition therefore differ from what the audience sees.

## One principle for both

Fidelity comes from rendering the same component tree in a container with the same CSS pixel dimensions as the destination, and then applying only a uniform visual scale to fit. Never reflow a preview into a different box. For the editor that means a true-size stage scaled with `transform`; for Present it means capturing the real display and showing the capture.

---

## Design A: the authoring stage

### Geometry as a single source of truth

Create `src/components/chartStageGeometry.js` with pure functions, no DOM:

```js
export const CANVAS_GEOMETRY = Object.freeze({
  desktop: Object.freeze({ canvasWidth: 1392, sectionPaddingInline: 18, columns: 4, gap: 16, rowHeight: (418 - 112) / 8 }),
  tablet:  Object.freeze({ canvasWidth: 1180, sectionPaddingInline: 18, columns: 4, gap: 16, rowHeight: (440 - 112) / 8 }),
});

export function chartFootprintPixelSize(footprint, geometry = CANVAS_GEOMETRY.desktop) {
  const inner = geometry.canvasWidth - geometry.sectionPaddingInline * 2;
  const columnWidth = (inner - geometry.gap * (geometry.columns - 1)) / geometry.columns;
  const rowSpan = Math.round(footprint.rows * 8);
  return Object.freeze({
    width: columnWidth * footprint.columns + geometry.gap * (footprint.columns - 1),
    height: geometry.rowHeight * rowSpan + geometry.gap * (rowSpan - 1),
  });
}
```

Worked values for desktop (inner 1356px, column 327px): compact 1×1 → 327 × 418; standard 2×1 → 670 × 418; wide 4×1 → 1356 × 418; full 4×2 → 1356 × 852; half-row footprints (`rows` 0.25/0.5/0.75, row spans 2/4/6) follow the same formula. Write these as literal expectations in `tests/chartStageGeometry.test.js`; the grid formula's "418px" is exactly one footprint row, which is the proof the numbers are right. Phone layout is `grid-auto-rows: auto` with one column and is out of scope for the stage (Build shows the desktop advisory below 1024px).

Keep the CSS and the JS in lockstep: `LayoutGrid.jsx` should set `--layout-grid-columns`, `--layout-grid-gap`, and `--layout-grid-row-height` from `CANVAS_GEOMETRY` on `.layout-grid`, and `.layout-grid` CSS should consume those variables instead of repeating the numbers. Then the stage and the dashboard cannot drift.

### The stage component

Create `src/components/chart-authoring/AuthoringStage.jsx`:

- Props: `chart` (the draft), `rows`, `datasetProfile`, `geoData`, `prepared`, `renderContext`, `fit` (`"fit"` or `"actual"`, default `"fit"`), `deviceLayout` (`"desktop"` default), `maxHeight` (CSS px the stage may occupy when fitting; default 46% of `window.innerHeight`).
- It computes `size = chartFootprintPixelSize(resolveChartFootprint(chart.layout), CANVAS_GEOMETRY[deviceLayout])`.
- It renders, in this order: an outer `.authoring-stage` wrapper that reserves `size.width * k` by `size.height * k`; inside it, `.authoring-stage__canvas` with inline `width: size.width; height: size.height; transform: scale(k); transform-origin: top left`, carrying the same root attributes the dashboard uses (`data-dashboard-style`, `data-dashboard-color-profile`, `data-chart-color-mode`, the theme CSS variables from `dashboardThemeRootProps`), and inside that a `.layout-grid` with the geometry variables and a single real `ChartPanel` with the draft's footprint. The panel is rendered in view mode (`editMode={false}`, `showFullscreen={false}`, no actions) so no Build chrome appears.
- `k = fit === "actual" ? 1 : Math.min(1, availableWidth / size.width, maxHeight / size.height)`, where `availableWidth` comes from a `ResizeObserver` on the wrapper. Round `k` to 3 decimals to avoid re-render churn. When `k < 1` the stage shows a small caption "Shown at 63% of dashboard size" so the author never mistakes it for actual size; at `k = 1` the caption reads "Actual dashboard size".
- Expose `data-stage-width`, `data-stage-height`, and `data-stage-scale` on the wrapper. Tests and the fidelity journey read them.
- `ChartPanel` must accept `resolvedRendering` and `prepared` passthrough props and forward them to `ChartView`, so the stage reuses the readiness pipeline `ChartPreview` already runs (`enforceRenderReadiness`, `resolvePreparedChartRendering`). Keep `ChartPreview`'s empty and invalid states; the stage renders them inside the same sized frame so the layout does not jump when data becomes ready.

Because the inner canvas is laid out at true pixels and only the composited result is scaled, ECharts computes identical label wrapping, legend placement, axis density, and card grids. The `ResizeObserver` inside `EChartsChartView.jsx:614` sees the true size, never the scaled one.

### Editor layout that shows the whole chart and keeps controls stable

The tension you named, seeing the whole chart while keeping a consistent control layout, resolves once the stage's size is a function of the footprint and the available width alone:

```
| Chart title, footprint picker, Fit / Actual toggle        |  ← sticky header row
| .authoring-stage (scaled to fit width, height ≤ 46vh)     |  ← sticky
| contextual tabs (Data, Appearance, …) in their own scroll |
| footer actions                                            |
```

- The stage sits above the tabs in both the inspector surface and the dialog surface (`ChartEditorV3.jsx:539` builds `preview`; `:585` passes it as `shellLead`; `:673` places it in the inspector layout). Replace `ChartPreview` there with `AuthoringStage`. Delete the 250px host rule and `.chart-editor-preview`'s `min-height`.
- The stage is `position: sticky; top: 0` inside the dialog scroll container, so the author scrolls the controls under a stable chart. The wizard already does this with `.chart-wizard-preview-column` (`src/styles.css:5381`); reuse the pattern.
- Footprint changes from `ChartFootprintPicker` re-run the geometry immediately, so choosing "wide" visibly widens the stage. This is the moment authors learn what the footprint means.
- The `Fit / Actual` toggle switches `k` between fitted and 1. In `Actual`, the wrapper scrolls horizontally and vertically; the stage caps at `maxHeight` and the author pans. Default `Fit`.
- Dialog width: the full editor dialog (`dashboard-dialog--wide`) should allow up to `min(1392px + 2 × padding, 96vw)` so a wide footprint reaches `k = 1` on a 1440px-wide screen; keep the current width for narrower footprints. Tabs keep a fixed max content width (720px) regardless of stage width so control alignment never changes with the chart.
- The Build canvas projection stays as it is and becomes the second truth: add a `Show on canvas` button in the editor header that calls the existing reveal request (`revealRequest` in `BuildWorkspace`) for the placement so the author can compare in context. For the dialog surface this means temporarily lowering the dialog's opacity to 0.15 while the pointer is held on the button (`onPointerDown` / `onPointerUp`), which is cheap and needs no layout change.

### Wizard

`ChartWizardV3.jsx:2024` renders `ChartPreview` inside the "Canonical render proof" article. Replace it with `AuthoringStage` bound to the destination footprint the wizard already knows (`layout.width` / `layout.height` in the draft), so the proof deck shows the chart at the size it will occupy in the chosen Section. The placement proof next to it already names the destination; add the pixel size to its copy ("670 × 418 on the dashboard").

### Device layouts

The stage follows the Build device-layout preference (`deviceLayout` prop already threaded to `BuildWorkspace`): desktop geometry by default, tablet geometry when the author previews tablet. Phone previews show a note "Phone layout stacks charts at automatic height; preview uses the desktop footprint" rather than inventing a phone geometry.

### Verification for Design A

Unit (node test runner, existing SSR pattern):

- `tests/chartStageGeometry.test.js`: the literal sizes above for every supported footprint, desktop and tablet.
- `tests/authoringStage.test.js`: SSR markup carries `data-stage-width="670"`, `data-stage-height="418"`, renders one `.chart-panel` with `--chart-footprint-columns:2`, and the caption text for scale 1 and scale 0.5 (pass `fit` and a stubbed width through a prop for SSR).
- `tests/chartAuthoringComponentsV3.test.js`: update the existing editor and wizard markup assertions that look for `.chart-editor-preview` or `chart-authoring-preview`.

Browser (one focused Playwright journey, `tests/e2e/v3-authoring-stage-fidelity.spec.js`):

1. Enter Build, open the full editor for an existing chart, set `Actual`.
2. Read `data-stage-width/height`; read the canonical panel's `getBoundingClientRect()` on the canvas for the same placement; assert equal within 1px.
3. Compare the ECharts canvases: `canvas.toDataURL()` from the stage and from the canonical panel at `k = 1` must be identical strings (same size, same paint). If a transient animation makes this flaky, disable ECharts animation in the stage's `renderContext` and in the canvas during the assertion via the existing `reducedMotion` path, and compare after `expect.poll`.
4. Change the footprint to wide; assert `data-stage-width` becomes 1356 and the caption reports a scale below 100% at a 1280px viewport.

---

## Design B: the audience monitor as a snapshot of the real display

### Root causes to remove

1. The monitor captures a local re-render, not the audience window (`AudienceSnapshotMonitor.jsx` portal source).
2. The capture is a fixed 1280×720 at 0.75 scale in a fixed 16:9 frame; the audience viewport is neither known nor honoured.
3. The refresh policy keys off local mutations and `playing`; it cannot know when the audience's own display is static.

### Capture at the source

The audience surface (`App.jsx:1608`, `dashboardEntry.surface === "audience"`) already talks to Present over `BroadcastChannel` through `createPresentationAudienceChannel` (`src/lib/presentationChannel.js:341`). Add a frame stream on that channel.

New module `src/components/presentation/useAudienceFrameCapture.js` (hook used only by the audience surface):

- Targets the `.audience-display` root. Captures with `html2canvas` (already a dependency, already used by the monitor) at the display's real CSS size (`element.getBoundingClientRect()`), `scale: min(1, 960 / width)` so the output is at most 960px wide, `useCORS: true`, the existing `sanitizeAudienceSnapshotCloneColors` in `onclone`, and `backgroundColor` from `--simex-surface-canvas`. Wait for `document.fonts.ready` once before the first capture.
- Encodes `canvas.toDataURL("image/jpeg", 0.8)` and posts `{ type: "audience_frame", revision, viewport: { width, height, dpr }, image: dataUrl, capturedAt, reason }` through the audience channel. Add `audience_frame` to the message validator in `presentationChannel.js` next to the existing message types, with a size guard (reject frames over 600 KB and log once).
- Also posts `{ type: "audience_viewport", width, height, dpr }` on connect and on `resize`, so Present knows the aspect ratio even before the first frame.

### Refresh policy

Implement the schedule as a pure reducer in `src/lib/audienceFrameSchedule.js` so it is unit-testable without timers:

- Inputs: events `visual-change` (AudienceDisplay already calls `onVisualChange`; wire it), `state-accepted` (a new presentation state was applied), `playback-tick` (time advanced), `resize`, and `idle` (no event for `STATIC_AFTER_MS = 4000`).
- Outputs: `capture-now`, `capture-at <delay>`, or `sleep`.
- Rules: any structural event → capture after `SETTLE_MS = 200` (debounced). Playback ticks → at most one capture per `PLAYING_INTERVAL_MS`, default 2000, raised adaptively: if the last capture took longer than 400ms, double the interval up to 10000ms; if it took under 150ms, halve it down to 1000ms. After `STATIC_AFTER_MS` with no events the schedule enters `sleep` and captures nothing until the next event; while asleep it sends a light `{ type: "audience_heartbeat", revision }` every 15s so Present can show "Display static since 14:02" instead of "stale".
- Never capture while `document.visibilityState !== "visible"` (a hidden audience tab is not what anyone sees) and never overlap captures (the current `captureRunningRef` pattern is right; keep it).

### The monitor

Rewrite `AudienceSnapshotMonitor.jsx` around the stream:

- When frames arrive: show the latest image; set the frame's `aspect-ratio` from the reported viewport instead of the fixed `16 / 9`; show the caption "Audience display, 1920 × 1080, updated 2s ago" and, when asleep, "Audience display static since 14:02". Keep the last frame on screen while asleep.
- When no audience is connected (connection status is not `connected`): fall back to the current offscreen local render, but size the source to the last known audience viewport, or 1920×1080 if none was ever reported, and caption it "Local preview, no audience connected". This keeps rehearsal without a second screen working.
- Remove the local `MutationObserver` path once the stream exists; the audience owns its own schedule.

### What the audience sees stays the ground truth

The audience window keeps rendering exactly as today. Capturing adds work only there, and only on change; on a static display it does nothing. On a light machine the adaptive interval settles at whatever the CPU can afford. If `html2canvas` throws (it can on some CSS features), the audience posts `{ type: "audience_frame_unavailable", reason }` and the monitor falls back to the local render with a caption saying so, rather than going blank.

### Alternatives considered

- A live, scaled `<iframe>` of the audience route in the Present pane: pixel-faithful, but it doubles the render cost on the presenting machine and shows the controller's state, not the audience's accepted state. Rejected for exactly the light-machine and truthfulness reasons you gave.
- `getDisplayMedia` screen capture: truly faithful, but needs a user permission prompt every session and captures the wrong screen when windows move. Rejected.

### Verification for Design B

- `tests/audienceFrameSchedule.test.js`: table-driven cases for the reducer, literal delays: settle after structural change, 2000ms cadence while playing, adaptive doubling and halving with the stated bounds, sleep after 4000ms idle, heartbeat cadence while asleep, wake on the next event.
- `tests/presentationChannel.test.js` (extend the existing channel tests): `audience_frame` and `audience_viewport` validate, oversize frames are rejected.
- `tests/audienceSnapshotMonitor.test.js`: SSR markup shows the fallback caption when disconnected, the viewport caption when a frame is present, and the aspect-ratio style from the reported viewport.
- Browser: `tests/e2e/v3-audience-monitor-stream.spec.js` opens two pages in one Playwright context (they share `BroadcastChannel`): Present and the audience surface. Display one chart, assert the monitor `img` `src` changes and `data-frame-revision` increments; then wait 5s with no changes and assert the revision is stable and the caption says static; then advance playback and assert a new revision arrives. Use `page.setViewportSize({ width: 1600, height: 900 })` on the audience page and assert the monitor frame's `aspect-ratio` computed style is `1600 / 900`.

---

## Implementation order for Astra

Each task is one commit with the repository's usual attribution trailer. Run only the targeted check named in each task (AGENTS.md cadence).

1. **Geometry module and grid variables.** Create `chartStageGeometry.js` and its test. Make `LayoutGrid.jsx` emit the CSS variables and switch `.layout-grid` and `.authoring-footprint-grid` (`src/styles/static-content.css:55`) to consume them. Check: `node --test tests/chartStageGeometry.test.js tests/chartPanelLayout.test.js`.
2. **ChartPanel passthrough.** Add `resolvedRendering` and `prepared` props to `ChartPanel`, forwarded to `ChartView`; no behaviour change when absent. Check: `tests/chartViewV3.test.js`.
3. **AuthoringStage.** Build the component and its SSR test. Check: `tests/authoringStage.test.js`.
4. **Editor integration.** Replace `ChartPreview` in `ChartEditorV3.jsx` (both surfaces) with `AuthoringStage`; add the Fit/Actual toggle and the sticky stage layout; widen the dialog rule; add `Show on canvas`. Update `tests/chartAuthoringComponentsV3.test.js` assertions. Check: that file plus `tests/chartEditSession.test.js`.
5. **Wizard integration.** Same replacement in the proof deck; pixel size in the placement proof copy. Check: `tests/chartWizardProofDeck.test.js`.
6. **Stage fidelity journey.** Write and run `v3-authoring-stage-fidelity.spec.js` with `pnpm.cmd test:e2e:dev tests/e2e/v3-authoring-stage-fidelity.spec.js --project=chromium` (no `--` separator).
7. **Frame schedule reducer and channel messages.** `audienceFrameSchedule.js`, channel validator additions, their tests.
8. **Audience capture hook.** `useAudienceFrameCapture.js` wired into the audience surface in `App.jsx`; `AudienceDisplay` `onVisualChange` connected. Check: `tests/audienceDisplay.test.js`.
9. **Monitor rewrite.** Stream-first, viewport aspect, fallback and captions. Check: `tests/audienceSnapshotMonitor.test.js`, `tests/presentPlaybackOwnership.test.js`.
10. **Monitor journey.** `v3-audience-monitor-stream.spec.js`.
11. **Region registry.** Register `.authoring-stage` as a panel region under the chart editor and keep `audience-snapshot-monitor` as is; add both to the journey manifest so the density audit sees them. Check: `tests/dashboardRegionRegistry.test.js tests/dashboardSurfaceManifest.test.js`.

Tasks 1 to 6 and 7 to 10 are independent lanes; 11 depends on both.

---

## Further improvements toward the stated goals

The README states the goals: situational awareness for simulation exercises, dashboard authoring, controlled audience presentation, and static offline operation. The work above closes the two fidelity gaps; these are the next gaps, in the order I would take them.

1. **Refresh the test fixtures to the shipped dashboard.** Since the public/main merge, 53 unit tests and at least 16 browser specs assume charts and sections that the shipped `dashboard.json` no longer has (`bio_confirmed_cases`, `outbreak_dynamics`, `national_outbreak`, "Biomedical mortality by age"). Until they are rewritten against the current content, every gate is dominated by drift and real regressions hide in the noise. Recommended shape: one committed test dashboard fixture under `tests/fixtures/` that the e2e harness loads through the existing `__test__/reset` control endpoint, decoupled from the shipped product content.
2. **Fix `pnpm dev` and `pnpm build` on the shipped config.** `scripts/build-portable-data.mjs` tries to read browser-uploaded GeoJSON from disk. The task chip already filed carries the details. Until then every fresh checkout needs `pnpm exec vite` or `build:cloudflare`.
3. **A declared presentation resolution.** Let the Scenario Passport declare the audience display's target size (for example 1920×1080). The audience surface letterboxes to that size, the monitor shows exactly that box, and the authoring stage can offer a "Present" geometry alongside desktop and tablet. This removes the last source of surprise between rehearsal and the room.
4. **Responsive text policy for charts.** Once previews are faithful, the remaining ugliness is charts whose labels are sized for one footprint and reused in another. Define per-footprint typography in the schema defaults (compact, standard, wide, full) and in Present layouts, so a chart's text budget follows its footprint rather than one global number.
5. **Split the shipped dashboard file.** `public/config/dashboard.json` is 40,000 lines because static content and assets are inlined. Keep the semantic config small and reference assets by id; it makes fixtures, diffs, package import review, and the portable data step tractable.
6. **Author-facing fidelity checks.** With the stage in place, the wizard's proof deck can add a "matches canvas" proof: the runtime compares the stage's ECharts canvas hash with the canonical panel's after placement and shows a check mark. It turns the fidelity guarantee into something the author can see.
7. **Present rehearsal without a second screen.** A "Rehearse" button that opens the audience surface in a popup sized to the declared resolution, on the same machine, so the monitor stream can be exercised before the room.
8. **Density audit on the phone journey.** Mobile View shipped without an executable phone journey in the density manifest (it is still `mobile-view-custom-design`, out of scope). Promote it once the fixtures are refreshed, so the crown collapse and chart cap stay measured.

---

## Handoff notes for the executor

- Read AGENTS.md first; its test cadence overrides the default TDD ceremony. Run only the targeted checks named per task. The full gates run once, at pre-merge, with a saved reporter ledger outside `test-results` (Playwright clears that folder).
- Playwright: run single specs as `pnpm.cmd test:e2e:dev <spec> --project=chromium`. Adding a `--` separator selects the whole suite.
- Fresh worktrees need `pnpm.cmd install --frozen-lockfile --prefer-offline`. Start the app with `pnpm.cmd exec vite --host --port 5174 --strictPort`; port 5173 is often held by another session.
- Codex on this machine: `codex exec --approve-for-me -C <worktree> -c 'sandbox_workspace_write.writable_roots=["<repo>/.git"]' -c sandbox_workspace_write.network_access=true -m gpt-6-astra`. Git commits and the Vite-based Node tests need the escalation the automatic reviewer grants; retry once on a permission error rather than disabling test isolation. `gpt-6-terra` and `gpt-6-soul` are not available on this account.
- Do not edit tests unrelated to the task; if a targeted test already fails at the base commit, report it instead.
