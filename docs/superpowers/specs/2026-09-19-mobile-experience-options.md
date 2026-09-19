# Mobile Experience: Options Assessment

Assessment written against `claude/view-build-decision-surface-ff6f8a` at `63c2165`. Companion to the preview-fidelity design. This is an options paper, not an approved design; the recommendation at the end is the proposed starting point.

## Where mobile stands today

- View at phone width now has a one-row crown with a page disclosure, a folded header, single-column panels, a chart height cap of `clamp(240px, 52vh, 420px)`, and a horizontally snapping attention strip (this branch).
- Build and Present show a "minimum width of 1024px" advisory and are desktop products by design. The README frames Build as local authoring and Present as moderator control, which are not phone tasks.
- Everything ships in one bundle: the Vite build emits a single large chunk (the "large-bundle warning" AGENTS.md calls expected). A phone downloads Build's wizard, editors, Chrono and Scene studios, and Present just to read View.
- The density audit's only phone journey (`mobile-view-custom-design`, 390 × 844) is still declared out of scope in the journey manifest, so nothing measures phone layouts.
- Offline pieces exist: a service worker (`public/service-worker.js`, registered outside dev), an install prompt component (`InstallDashboardPrompt.jsx`), and the portable-data step. They are not tuned for phones.

The stated goal that mobile serves is situational awareness: someone in the exercise reading the dashboard on a phone between rooms. Authoring and presenting stay on desktop.

## Options

### Option 1: harden the responsive View (lowest cost, highest certainty)

Keep one codebase and one layout system; finish the phone experience inside it.

- **Ship less to phones.** Code-split by mode with dynamic `import()` in `App.jsx` for `BuildWorkspace`, `PresentWorkspace`, the chart wizard and editors, and the Chrono and Scene studios. View then loads the renderer and ECharts only. Expected effect: the initial chunk drops by well over half; this is the single biggest phone win and costs nothing in product terms.
- **Mount charts lazily.** Wrap each `ChartPanel` in the View canvas with an `IntersectionObserver` gate (render a sized placeholder until the panel is within one viewport of the screen). ECharts instances are the phone's main memory and CPU load; a 12-panel page currently initialises 12 canvases at once.
- **Touch targets and gestures.** Audit every View control for a 44px hit area (the crown buttons, page disclosure, drill links, fullscreen and description toggles). Add swipe-to-dismiss on the fullscreen display and pinch-to-zoom on maps and heatmaps in fullscreen, through the existing zoom guard.
- **Phone typography budget for charts.** Extend the per-footprint typography policy proposed in the fidelity design with a `phone` layout: larger axis label floor (12px), fewer tick labels, legend below the chart, and title wrapping. Applied through `renderContext`, so it is a rendering policy, not a config change.
- **Measure it.** Promote the phone journey in `dashboard-surface-manifest.js` to executable with a phone density profile (touch target size, no horizontal page scroll, chart cap), so regressions show up in the audit.

Cost: small, incremental, no new product surface. Limit: complex charts stay complex; a 6-series line chart at 360px wide is legible only in fullscreen.

### Option 2: a mobile rendering policy per chart type (medium cost, best reading experience)

Give each chart schema a mobile rendering disposition, chosen by the chart's semantics and overridable by the author:

- `keep`: KPI and delta cards, single-series lines and bars, gauges. Render as is with the phone typography budget.
- `simplify`: multi-series lines and grouped bars render the top N series with a "and 4 more" affordance; stacked bars collapse to totals with tap-to-expand.
- `summarise`: heatmaps, readiness matrices, choropleths and scatter plots render a summary card on the page (the chart's headline value or a sparkline) and open the full chart in fullscreen on tap, where pinch zoom works.
- `table`: tables render with a sticky first column and horizontal scroll, or as a card list when under four columns.

Authoring hooks: a `mobile` field on the chart's `layout` (`disposition` plus an optional `summary` role binding) surfaced in the editor's Style step, and a "phone" geometry in the authoring stage so the author sees the summarised form. View picks the disposition from the phone breakpoint.

Cost: one adapter per chart family and a schema field. Benefit: the page becomes readable top to bottom on a phone without anyone hand-authoring a second dashboard. This option depends on Option 1's lazy mounting to stay fast.

### Option 3: a pocket build (medium cost, cleanest phone product)

Produce a third static output next to the PDPC release variants: a View-only, phone-tuned bundle with the same package and data.

- Built by the existing release factory pattern (`scripts/build-pdpc-release.mjs` shows the shape): a separate Vite entry that imports only View, the renderer, playback, and the attention strip, with Build and Present excluded at the module graph level rather than hidden at runtime.
- PWA polish for that output only: install prompt on first visit, service worker precaching of the package and derivatives, an offline banner using the existing connection indicator.
- Deep links: `?page=biomedical` and `#chart=<id>` to open a page or a fullscreen chart from a message or QR code, which is how a phone user usually arrives.

Cost: a build entry, a small release script, and a manifest. Benefit: a phone never downloads authoring code, and the offline story is explicit. Limit: two outputs to verify per release.

### Option 4: phone as a Present remote (later, different goal)

Let the moderator drive the audience display from a phone: choose displayed charts, layout, playback, blackout. Today Present talks to Audience over `BroadcastChannel`, which only works between windows on the same machine, so this needs the companion server (the metadata-only Quorum companion) to relay presentation messages across devices, plus an authentication story. Useful, but it serves the presentation goal, not situational awareness, and it is the only option that touches networking and security. Do not start here.

## What I would not do

- A separate React Native or native app: two codebases for a training prototype with one renderer contract.
- Server-side rendering or a backend: the core promise is static, offline operation; keep it.
- Making Build usable on phones: authoring needs the stage, the rails, and the properties pane; the desktop advisory is the right answer.

## Recommendation

Do Option 1 first, in full, because every later option needs it and it is measurable immediately: code-split modes, lazy chart mounting, touch targets, phone typography, and an executable phone journey. Then Option 2 for the chart families that appear on the shipped pages (cards, lines, bars, maps, tables), with the author override in the editor. Take Option 3 only if the exercise organisation wants a link they can send to participants' phones; the PDPC release factory makes it cheap once Options 1 and 2 exist. Leave Option 4 until the companion server owns presentation messaging.

## Sequencing with the fidelity work

Option 1's lazy mounting and typography policy share code with the authoring stage (both go through `renderContext` and `ChartPanel`). Land the fidelity design first, then Option 1, so the phone typography budget is previewed in the stage's phone geometry rather than guessed.

## Verification shape

- Unit: a `mobileRenderingDisposition(chart, viewport)` pure function with literal expectations per schema; `renderContext` typography policy tests; a code-splitting test that asserts `App.jsx` imports Build and Present lazily (read the source and match `import(`).
- Browser: the phone journey at 390 × 844 measuring touch target sizes, the absence of horizontal page scroll, chart cap, and that no Build or Present chunk is requested on View (`page.on("request")` filter on chunk names).
- Bundle: a `pnpm.cmd build:cloudflare` size check that fails if the View entry chunk grows past a set budget.

## Suggested implementation (Options 1 and 2)

Each task is one commit with the repository's usual attribution trailer. Run only the targeted check named in the task (AGENTS.md cadence). Tasks 1 to 6 are Option 1; 7 to 9 are Option 2. Land the preview-fidelity design first.

1. **Code-split the non-View surfaces.** In `src/App.jsx` and `src/components/DashboardRenderer.jsx`, turn the static imports of `BuildWorkspace`, `PresentWorkspace`, `ChartWizardV3`, `ChartEditorV3`, `ChartQuickEditor`, `SourceContentWorkspace`, `ChronoStudio`, `SceneEditor`, and the static-content wizard into `React.lazy(() => import(...))` behind one `Suspense` per mode with the existing operation-status pending row as fallback. Keep the audience surface static (it must be instant). Check: `tests/dashboardAppV3.test.js`, then `pnpm.cmd build:cloudflare` once and record the View entry chunk size in the commit body.
2. **Lazy chart mounting in View.** Add `src/components/dashboard/DeferredPanelMount.jsx`: an `IntersectionObserver` gate with `rootMargin: "100% 0px"` that renders a `.chart-panel-placeholder` of the panel's footprint height until visible, then the real `ChartPanel`; once mounted it stays mounted. Use it in `DashboardSection.jsx` and `DashboardAttentionStrip.jsx` only when `surface === "view"`; Build keeps eager mounting so the stage and canvas stay comparable. Check: `tests/dashboardAttentionStrip.test.js`, `tests/anchoredStructureCommands.test.js`.
3. **Touch targets.** Add a `phone` block to `src/styles/modes.css` (Lane C block) raising every View control to `min-height: 44px; min-width: 44px` under `max-width: 767px` (crown buttons, disclosure trigger, page list, drill links, panel action icons, fullscreen controls). Check: `tests/mobileViewHeader.test.js` extended with a CSS assertion on the 44px rule.
4. **Fullscreen gestures.** In `FullscreenDisplay.jsx`, add pointer-based swipe-down to dismiss (threshold 80px, only when the chart is not zoomed) and enable pinch zoom on map and heatmap charts through the existing `ZoomGuard` at phone width. Check: `tests/viewImmersiveDisplay.test.js`.
5. **Phone typography budget.** In `src/charting/rendering/axisPresentation.js` and `legendLayout.js`, read a `renderContext.typographyProfile` (`"desktop"` default, `"phone"` at the breakpoint) and apply: axis label floor 12px, tick label limit 6 per axis, legend position bottom, title wrap at two lines. Thread the profile from `DashboardCanvas` using the `useMediaQuery` hook. Check: `tests/chartRenderingV3.test.js` with literal option expectations for both profiles.
6. **Executable phone journey.** In `tests/e2e/support/dashboard-surface-manifest.js`, replace the out-of-scope `mobile-view-custom-design` entry with an executable `view-phone` journey at 390 × 844 and add a phone density profile in `dashboard-density-audit.js`: touch targets at least 44px, no horizontal page scroll (`document.documentElement.scrollWidth <= innerWidth`), chart footprints at most 420px tall, and no request for a Build or Present chunk (`page.on("request")`). Check: `tests/dashboardSurfaceManifest.test.js`, then the journey with `pnpm.cmd test:e2e:dev tests/e2e/v3-mobile-view.spec.js --project=chromium`.
7. **Mobile disposition contract.** Add `mobile: { disposition, summaryRole }` as an optional field on chart `layout` in the Version 3 chart schema (`src/charting/schemas/schemaTypes.js` and the validator), with `disposition` in `keep | simplify | summarise | table` and a per-schema default in each `chartSchema({...})` definition (cards, gauges, single-series lines and bars `keep`; multi-series `simplify`; heatmap, matrix, geography, scatter `summarise`; table `table`). Add `mobileRenderingDisposition(chart)` to `src/charting/rendering/resolveChartRendering.js`. Check: `tests/chartSchemasV3.test.js`, `tests/chartConfigV3.test.js`.
8. **Mobile adapters.** In `ChartView.jsx`, when `renderContext.typographyProfile === "phone"`: `simplify` passes a `seriesLimit` option to the axis adapter (top N by last value, plus an "and N more" caption); `summarise` renders `CardChartView` with the bound summary role and a tap target that opens fullscreen; `table` renders `TableChartView` with `data-mobile-table` for sticky-first-column CSS. Check: `tests/chartViewV3.test.js`.
9. **Author override and stage preview.** Surface the `mobile` field in the editor's Style step (`StyleLayoutStep.jsx`) as "On phones: automatic / keep / simplify / summarise / table" and add a `phone` geometry (360px single column, auto height) to the authoring stage so the author can preview the disposition. Check: `tests/chartAuthoringComponentsV3.test.js`, `tests/authoringStage.test.js`.

Option 3 (pocket build) and Option 4 (phone remote) get their own designs if and when they are chosen.
