# Pre-merge Chromium browser gate ledger

Branch: `claude/view-build-decision-surface-ff6f8a` at `835f6caee4387902b9a0ae13ba965e1ef57f3076`.
Base: `c003d11174f247acac10879274e73d9434c67096`.

Machine-readable ledger: [LEDGER.json](LEDGER.json). No correction commits were created.

- Source totals combine 15 completed tests recovered from the interrupted sequential line log (3 pass, 12 fail) and 251 tests from the native continuation JSON (109 pass, 142 fail). No completed source test was rerun.
- The first source attempt failed before tests because the sandbox denied esbuild access to a parent directory. The elevated attempt was interrupted during the density audit because that test writes under docs/audits. Generated audit output was preserved in this ledger directory, removed from its generated repository directory, and subsequent audit output was redirected here through a ledger-local Node preload. Test assertions and repository source/test files were not edited.
- e2e-source.json is an aggregate with repository-relative file paths for the supplied classifier. Native continuation output is preserved in e2e-source-continuation.json; both source log segments are preserved separately and combined in e2e-source.log.
- The supplied classifier marked 107 failed tests as fixture-drift and 47 failed tests across 20 specs as NEEDS-REVIEW. Fixture-drift is a spec-level heuristic based on absent shipped identifiers; it does not independently establish the cause of every failure in that spec.
- The v3-structure-rail.spec.js / v3-dashboard-map.spec.js rename was recognized. The branch spec was classified fixture-drift, so it did not enter the NEEDS-REVIEW base queue.
- All 20 NEEDS-REVIEW specs completed sequentially at base c003d11: 89 base tests in total. Of the 47 corresponding branch failures, 40 also fail at base and 7 pass at base and are candidate regressions.
- pre-existing-at-base records that the corresponding test also fails at base; it does not independently prove a common root cause. Branch and base error lines and locators are retained separately.
- HEAD advanced externally from 835f6ca to 0aab4b9 during this task through five documentation-only commits. Every intervening commit changes only Markdown files under docs/superpowers/specs; application code, tests, and configuration remain identical to 835f6ca. This task made no commits or source/test edits. See revision-scope.json and revision-changes.log.

## Totals

| Suite | Pass | Fail | Skipped | Not-run |
| --- | ---: | ---: | ---: | ---: |
| source | 112 | 154 | 0 | 0 |
| static | 0 | 0 | 0 | 3 |
| pdpc | 0 | 0 | 0 | 2 |

## source

266 tests completed across the preserved interrupted segment and its continuation. The continuation exited 1.

| Spec / location | Exact test title | Disposition | Failure category | First error line |
| --- | --- | --- | --- | --- |
| tests/e2e/build-workflow-contract.spec.js:18 | the shared Build workflow exposes persistent structure and properties rails | pass | — | — |
| tests/e2e/build-workflow-contract.spec.js:31 | the shared Build workflow enters Build before opening source management | pass | — | — |
| tests/e2e/chart-authoring-v3.spec.js:62 | source-first existing CSV pie authoring progressively reveals schema fields and persists the created chart | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/chart-authoring-v3.spec.js:154 | wizard eyedropper reveals the dashboard and Escape preserves the draft | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/chart-authoring-v3.spec.js:240 | scatter uses its own live roles and contextual style sections | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/chart-authoring-v3.spec.js:240 | heatmap uses its own live roles and contextual style sections | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/chart-authoring-v3.spec.js:240 | deltaCard uses its own live roles and contextual style sections | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/chart-authoring-v3.spec.js:293 | timeline upload profiles real CSV columns and creates a timeline chart | pass | — | — |
| tests/e2e/chart-authoring-v3.spec.js:326 | full editor keeps every tab's controls and render panels aligned | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/chart-authoring-v3.spec.js:375 | full editor continues Quick state, restores suspended Full work, and saves without duplication | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/chart-authoring-v3.spec.js:441 | quick edit previews immediately while unchanged and suspended click-away sessions restore correctly | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/chart-authoring-v3.spec.js:518 | suspended valid chart creation keeps one stable owner while incomplete creation stays absent | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/chart-authoring-v3.spec.js:563 | quick edit saving failure keeps one retry owner and confirmed Remove clears it | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/chart-authoring-v3.spec.js:654 | quick edit Save rebases pending Page content onto a live layout draft | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/chart-authoring-v3.spec.js:710 | editor chart conversion supports compatible changes and recoverable remapping | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/dashboard-density-audit.spec.js:22 | complete dashboard surface manifest records density evidence | fail | pre-existing-at-base | Error: Every executable audit surface must complete setup |
| tests/e2e/dashboard-edit-race.spec.js:27 | a pending header edit and immediate chart save commit in order | fail | pre-existing-at-base | Test timeout of 60000ms exceeded. |
| tests/e2e/dashboard-edit-race.spec.js:57 | reset cancels a pending header callback so it cannot reappear | pass | — | — |
| tests/e2e/dashboard-geography-authoring.spec.js:20 | a fresh chronological choropleth reaches preview through the early GeoJSON selector | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |
| tests/e2e/dashboard-performance.spec.js:16 | the canonical chart canvas stays mounted while switching between View and Build | pass | — | — |
| tests/e2e/dashboard-performance.spec.js:30 | Quick Edit opens before reveal animation frames are allowed to run | fail | fixture-drift | Error: expect(locator).toBeEnabled() failed |
| tests/e2e/dashboard-performance.spec.js:55 | Full Edit paints a pending shell without creating unchanged work | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/dashboard-performance.spec.js:90 | chart Save commits its working toast before dashboard busy state | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/dashboard-performance.spec.js:167 | failed operation feedback stays visually above an overlapping Quick Edit surface | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/dashboard-render-boundaries.spec.js:8 | selection changes do not render an unaffected chart | pass | — | — |
| tests/e2e/dashboard-render-boundaries.spec.js:23 | section reorder leaves untouched sections and their charts unrendered | pass | — | — |
| tests/e2e/dashboard-render-boundaries.spec.js:37 | moving a sibling preserves the unaffected chart render and focus state | pass | — | — |
| tests/e2e/dashboard-review-regressions.spec.js:23 | wrapped panels render, edit, save, and remove without losing placement identity | fail | fixture-drift | TypeError: Cannot read properties of undefined (reading 'panels') |
| tests/e2e/dashboard-review-regressions.spec.js:87 | replacement bundle profiles survive import, edit, save, and reload | fail | fixture-drift | TypeError: Cannot read properties of undefined (reading 'panels') |
| tests/e2e/dashboard-review-regressions.spec.js:209 | additive imported tracked profiles survive an edit and browser reload | fail | fixture-drift | Test timeout of 90000ms exceeded. |
| tests/e2e/dashboard-review-regressions.spec.js:268 | removing a page also removes its synchronized chart memberships | fail | fixture-drift | Error: expect(received).toEqual(expected) // deep equality |
| tests/e2e/dense-choice-alignment.spec.js:42 | dense desktop choice alignment &gt; Text/Image content types align radios to the first line and place helper copy below | pass | — | — |
| tests/e2e/dense-choice-alignment.spec.js:42 | dense desktop choice alignment &gt; dashboard deletion aligns its acknowledgement checkbox to the first line | pass | — | — |
| tests/e2e/dense-choice-alignment.spec.js:42 | dense desktop choice alignment &gt; Audience options align each checkbox to its fact label instead of the helper block | pass | — | — |
| tests/e2e/dense-choice-alignment.spec.js:42 | dense desktop choice alignment &gt; image title choices keep one compact row while neighboring fields are taller | pass | — | — |
| tests/e2e/dense-desktop-outliers.spec.js:7 | chart authoring keeps single-line fields at 32px and grouping multirow | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |
| tests/e2e/dense-desktop-outliers.spec.js:54 | color presets use exact 32px cells while the opener remains utility-sized | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |
| tests/e2e/dense-desktop-outliers.spec.js:85 | Scene unit move actions form two stable single-line rows | fail | pre-existing-at-base | TimeoutError: locator.click: Timeout 20000ms exceeded. |
| tests/e2e/dense-desktop-outliers.spec.js:108 | Scene details keeps the simple frame source control at standard height | pass | — | — |
| tests/e2e/dense-desktop-outliers.spec.js:125 | restore footer has a deliberate two-up row and full-width destructive row | pass | — | — |
| tests/e2e/dense-desktop-review-followups.spec.js:6 | chart wizard stage labels and statuses use two unclipped lines at desktop width | pass | — | — |
| tests/e2e/dense-desktop-review-followups.spec.js:34 | the default Chrono date is compact and clears the dashboard identity header | fail | pre-existing-at-base | Test timeout of 30000ms exceeded. |
| tests/e2e/dense-desktop-review-followups.spec.js:58 | the single-command Build More drawer sizes to its content | fail | candidate-regression | Test timeout of 30000ms exceeded. |
| tests/e2e/dense-desktop-review-followups.spec.js:82 | the fixed Audience options drawer sizes to its four facts | pass | — | — |
| tests/e2e/embedded-echarts-item.spec.js:5 | embedded ECharts releases and recreates mounted resources across invalid and failed models | pass | — | — |
| tests/e2e/embedded-echarts-item.spec.js:143 | native Ctrl-wheel guarding, image zoom, reduced motion, and listener cleanup work when mounted | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:84 | rendered version-3 layouts drive desktop spans and a taller phone full panel | fail | fixture-drift | Error: expect(locator).toHaveClass(expected) failed |
| tests/e2e/moderator-transactions.spec.js:136 | edit-mode panel drag reorders through the memoized chart boundary | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:269 | queued dashboard mutation survives final edit-session save | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:307 | chart save preserves session work when browser storage is full | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:328 | chart modal ignores Escape while save is pending | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:328 | chart modal ignores backdrop while save is pending | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:348 | chart removal preserves session work when browser storage is full | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/moderator-transactions.spec.js:372 | non-quota chart removal preserves session work with a bounded fallback | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/moderator-transactions.spec.js:398 | timer-owned pending edit uses the bounded session fallback | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:416 | clean Full discard publishes neither persistence nor fallback | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:436 | removal followed by another clean Full discard does not resurrect the chart | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/moderator-transactions.spec.js:472 | reset completes with session fallback when browser storage is full | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/moderator-transactions.spec.js:500 | successful reset clears renderer drafts and preserves the chart baseline | pass | — | — |
| tests/e2e/moderator-transactions.spec.js:566 | wizard create transaction coalesces, locks dismissal, and preserves session work when storage is full | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/moderator-transactions.spec.js:610 | edit-session save and reset use session fallback when storage is full | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/moderator-transactions.spec.js:641 | final Build remains locked until dirty chart edit context resolves | pass | — | — |
| tests/e2e/operation-status-context.spec.js:3 | status publication does not rerender actions-only consumers | pass | — | — |
| tests/e2e/qmd-reusable-media.spec.js:5 | Flow Frame Decorative local image inspector keeps responsive geometry and request authority | pass | — | — |
| tests/e2e/qmd-rich-editor.spec.js:11 | Composer keyboard formatting, semantic styles, footprint, and always-visible preview | fail | candidate-regression | Error: expect(locator).toBeVisible() failed |
| tests/e2e/qmd-rich-editor.spec.js:64 | sanitized paste keeps visible text and removes hostile formatting | pass | — | — |
| tests/e2e/qmd-rich-editor.spec.js:93 | Raw text preserves unsupported source untouched | pass | — | — |
| tests/e2e/qmd-rich-editor.spec.js:115 | resume Text/Image restores the current editing surface and scroll | pass | — | — |
| tests/e2e/quorum-companion.spec.js:19 | Quorum chart display remains available when the dashboard starts on showcase Home | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/quorum-companion.spec.js:46 | operator-authorized display and immersive Exit share actual browser state | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/quorum-companion.spec.js:72 | manual single, multi-open, and reorder use the same display state | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/quorum-companion.spec.js:132 | comparison selection caps at four charts and Escape cancels selection | pass | — | — |
| tests/e2e/quorum-companion.spec.js:179 | stale revisions and invalid chart IDs are rejected promptly | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/quorum-companion.spec.js:206 | reconnect snapshot wins without silently reopening a closed chart | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/quorum-companion.spec.js:235 | stale catalogue disables companion commands | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/quorum-companion.spec.js:251 | runtime chart-definition drift disables companion commands | fail | fixture-drift | TypeError: Cannot set properties of undefined (setting 'title') |
| tests/e2e/quorum-companion.spec.js:295 | missing bootstrap preserves standalone dashboard behavior | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/showcase-home.spec.js:22 | Old Homepage Content is absent when Home enters the first ordinary Page through View | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |
| tests/e2e/showcase-home.spec.js:46 | Home page navigation enters View for every page including the selected return target and removes the header gap | pass | — | — |
| tests/e2e/showcase-home.spec.js:81 | three Home styles expose materially distinct computed signatures without phone overflow | pass | — | — |
| tests/e2e/showcase-home.spec.js:208 | Home exposes the exact public beta orientation contract | pass | — | — |
| tests/e2e/showcase-home.spec.js:218 | hero action focus remains visible against the default hero surface | pass | — | — |
| tests/e2e/showcase-home.spec.js:259 | Home inherits Theme semantic tokens and exposes repository Issues feedback | pass | — | — |
| tests/e2e/showcase-home.spec.js:323 | saved V6 configuration preserves canonical Home availability and authored dashboard changes | pass | — | — |
| tests/e2e/showcase-home.spec.js:351 | preview failure preserves the complete landing journey | pass | — | — |
| tests/e2e/showcase-home.spec.js:359 | phone layout remains readable without horizontal overflow | pass | — | — |
| tests/e2e/showcase-home.spec.js:373 | retired Vanta background stays absent across reduced-motion preference changes | pass | — | — |
| tests/e2e/showcase-home.spec.js:387 | Vanta startup failure leaves the dashboard usable | pass | — | — |
| tests/e2e/showcase-home.spec.js:406 | builder FAQ uses the active semantic text paint | pass | — | — |
| tests/e2e/source-content-csv.spec.js:42 | Journey F — valid temporal CSV replacement warns then confirms | fail | fixture-drift | Error: page.evaluate: Error: Journey F seed is invalid: Uploaded GeoJSON source "geo_netherlands_municipalities_2026" GeoJSON FeatureCollection must be an ordinary data object. |
| tests/e2e/source-content-csv.spec.js:162 | Journey D — CSV upload through six stages then catalogue management | pass | — | — |
| tests/e2e/source-content-csv.spec.js:282 | Journey E — incompatible CSV replacement blocks and imports as new | fail | fixture-drift | Error: page.evaluate: Error: Journey E requires an existing map chart with a profiled primary CSV. |
| tests/e2e/source-content-geojson.spec.js:33 | Journey I — GeoJSON upload select preview dependency and blocked delete | fail | fixture-drift | Error: expect(received).toHaveLength(expected) |
| tests/e2e/source-content-geojson.spec.js:184 | Journey J — invalid GeoJSON replacement blocks and imports as new | fail | fixture-drift | Error: page.evaluate: Error: Journey J requires a live map chart. |
| tests/e2e/source-content-geojson.spec.js:262 | Journey K — valid GeoJSON geometry change warns then confirms | fail | fixture-drift | Error: page.evaluate: Error: Journey K requires a live map chart. |
| tests/e2e/source-content-manager.spec.js:15 | compact Build content commands preserve six/four stage contracts | fail | candidate-regression | Error: expect(locator).toHaveText(expected) failed |
| tests/e2e/source-content-manager.spec.js:40 | non-modal manager restores canvas selection and scroll | pass | — | — |
| tests/e2e/source-content-manager.spec.js:72 | desktop composition keeps canvas and catalogue state without overflow | fail | pre-existing-at-base | Error: expect(locator).toContainText(expected) failed |
| tests/e2e/source-content-manager.spec.js:155 | tablet composition navigates list to detail with Back and preserves filters | pass | — | — |
| tests/e2e/source-content-media.spec.js:19 | retry and resume Source Content under one stable owner | pass | — | — |
| tests/e2e/source-content-media.spec.js:103 | Journey A — media create reuse default external import restore dependencies delete | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |
| tests/e2e/source-content-media.spec.js:351 | Journey B — global media replacement preserves placement state | fail | pre-existing-at-base | Test timeout of 180000ms exceeded. |
| tests/e2e/source-content-portability.spec.js:36 | Journey G — V6 offline round trip and V4 migration retain library | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/source-content-recovery.spec.js:3 | Journey H — missing corrupt and relink repair stay isolated | pass | — | — |
| tests/e2e/static-content-portability.spec.js:36 | production StrictMode root keeps the reloaded durable Image URL active | pass | — | — |
| tests/e2e/static-content-portability.spec.js:190 | package import quota failure preserves the prior dashboard and authored store | pass | — | — |
| tests/e2e/static-content-portability.spec.js:247 | Image replacement and panel removal retain reusable durable media bytes | fail | candidate-regression | Test timeout of 180000ms exceeded. |
| tests/e2e/static-content-portability.spec.js:332 | asset commit failure restores the prior dashboard and authored store atomically | pass | — | — |
| tests/e2e/static-free-text.spec.js:98 | Free-text composer authors portable semantic styles, keyboard emphasis, lists, tables, and preview | pass | — | — |
| tests/e2e/static-free-text.spec.js:128 | embedded image persists through reload and a second Text/Image creation | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |
| tests/e2e/static-free-text.spec.js:194 | Free Text edit embedded image retries durably through reload | fail | pre-existing-at-base | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/static-free-text.spec.js:269 | Free text completes its in-session production journey at 1440x900 | fail | pre-existing-at-base | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/static-free-text.spec.js:269 | Free text completes its in-session production journey at 1024x768 | fail | pre-existing-at-base | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/static-free-text.spec.js:269 | Free text completes its in-session production journey at 768x900 | fail | pre-existing-at-base | Test timeout of 180000ms exceeded. |
| tests/e2e/static-free-text.spec.js:416 | FT-11 reload continuation preserves the exact saved QMD and revision | fail | candidate-regression | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/static-free-text.spec.js:439 | FT-05 View and fullscreen activate only safe links by pointer and keyboard | fail | pre-existing-at-base | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/static-free-text.spec.js:519 | FT-06 live authoring blocks every resource boundary and preserves recoverable session source | fail | candidate-regression | Test timeout of 240000ms exceeded. |
| tests/e2e/static-image-audience.spec.js:21 | saved Image and temporal chart keep exact identity through passive Audience layouts, failure, and replay | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'members') |
| tests/e2e/static-image.spec.js:33 | standalone Image page remains live without pageerror | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/static-image.spec.js:68 | Image completes its in-session production journey at 1440x900 | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/static-image.spec.js:68 | Image completes its in-session production journey at 1024x768 | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/static-image.spec.js:68 | Image completes its in-session production journey at 768x900 | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/static-image.spec.js:396 | IM-06 reload continuation restores the original asset and saved transform | pass | — | — |
| tests/e2e/static-image.spec.js:410 | IM-02 live intake classifies every rejection and accepts real PNG JPEG WebP replacements | pass | — | — |
| tests/e2e/static-image.spec.js:510 | IM-02 dashboard-budget and browser-quota failures recover through an exact replacement | fail | fixture-drift | Test timeout of 180000ms exceeded. |
| tests/e2e/static-image.spec.js:573 | dirty static selection keeps the complete draft until explicit Discard | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/static-image.spec.js:652 | packaged Image source appears in the real guided crop preview | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/static-image.spec.js:693 | IM-08 guided crop remains operable with keyboard and pointer at actual 200 percent page zoom at 1440x900 | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/static-image.spec.js:693 | IM-08 guided crop remains operable with keyboard and pointer at actual 200 percent page zoom at 1024x768 | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/three-mode-prototype.spec.js:25 | View, Build, and Present remain visible while preserving the active page | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:53 | Build authoring controls never leak back into View after a mode remount | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:67 | the Build crown stays inside two 36px rows at the minimum desktop width | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:89 | Present reserves a reachable desktop dock without covering its work controls | fail | pre-existing-at-base | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/three-mode-prototype.spec.js:166 | Build metadata persists on save and stays editable after storage fallback | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:205 | Scenario Passport saves Home off and on explicitly across reload | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:264 | Home-off package import changes mode and preference only after commit | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:315 | View compares charts and closes fullscreen with Escape | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:334 | Present opens an audience window and sends a two-chart layout | pass | — | — |
| tests/e2e/three-mode-prototype.spec.js:348 | Present retains synchronized time through blackout, reload, disconnect, and reopen | fail | pre-existing-at-base | Error: expect(received).toBeGreaterThan(expected) |
| tests/e2e/three-mode-prototype.spec.js:398 | iPad and 1200px Build plus a 1920 by 1080 audience have no horizontal overflow | pass | — | — |
| tests/e2e/time-collection.spec.js:18 | playback entry preserves editor and wizard authoring until each workflow is resolved | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/time-collection.spec.js:96 | default synchronized playback keeps line history, bar and map snapshots, and reopens at the same time | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/time-collection.spec.js:156 | zoom requires Ctrl in both dashboard and fullscreen contexts | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/time-collection.spec.js:198 | legacy accessibility preferences cannot restore removed chart summaries or controls | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/time-collection.spec.js:217 | matching policies produce policy-specific live values | fail | fixture-drift | TypeError: Cannot convert undefined or null to object |
| tests/e2e/time-collection.spec.js:241 | priority collections remain independent while Chrono advances | fail | fixture-drift | TypeError: Cannot read properties of undefined (reading 'interaction') |
| tests/e2e/time-collection.spec.js:269 | fixed, scrollable, carousel, and priority collection modes share one live display contract | fail | fixture-drift | TypeError: Cannot read properties of undefined (reading 'interaction') |
| tests/e2e/time-collection.spec.js:380 | collection carousels remain independent while Chrono plays | fail | fixture-drift | TypeError: Cannot read properties of undefined (reading 'interaction') |
| tests/e2e/v3-anchored-structure-commands.spec.js:21 | section and panel menus preserve command order, keyboard navigation, and their authoring owners | pass | — | — |
| tests/e2e/v3-anchored-structure-commands.spec.js:69 | selected Page tab toggles its five-action menu while inactive Pages only navigate | fail | fixture-drift | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/v3-anchored-structure-commands.spec.js:150 | successful Page Rename and Merge confirmations close their in-menu forms | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/v3-anchored-structure-commands.spec.js:170 | Page actions retain the final-page protections | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/v3-anchored-structure-commands.spec.js:187 | anchored Section commands preview and discard through the live layout draft | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-authoring-theme-propagation.spec.js:11 | catalogue exposes the exact renamed styles and profiles without retired choices | pass | — | — |
| tests/e2e/v3-authoring-theme-propagation.spec.js:34 | selected dashboard style reaches every Build authoring surface | fail | candidate-regression | Test timeout of 90000ms exceeded. |
| tests/e2e/v3-authoring-theme-propagation.spec.js:130 | Unit Orbit retains the selected theme outside AppFrame | fail | pre-existing-at-base | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-authoring-theme-propagation.spec.js:141 | View Chrono and Present controls contain no retired dashboard paint | fail | pre-existing-at-base | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-authoring-theme-propagation.spec.js:158 | standalone source viewer receives the selected dashboard style | fail | pre-existing-at-base | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:33 | Clear dashboard in Scenario Passport preserves canonical Home identity and Look after durable deletion | pass | — | — |
| tests/e2e/v3-build-structure-packages.spec.js:93 | storage-rejected Clear dashboard is atomic and Cancel restores the Passport trigger controls | pass | — | — |
| tests/e2e/v3-build-structure-packages.spec.js:151 | Restore online dashboard in Scenario Passport replaces dirty local work with the deployed copy | fail | fixture-drift | Error: expect(received).toBe(expected) // Object.is equality |
| tests/e2e/v3-build-structure-packages.spec.js:288 | cross-page tree selection reveals the canonical target before opening Unit Orbit | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:314 | double-click rename navigates and highlights without opening Unit Orbit | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:329 | double-click rename persists complete Page Section and Chart owner updates | fail | fixture-drift | Test timeout of 60000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:364 | chart activation keeps the canonical target usable while mounting Unit Orbit | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:375 | an untouched chart editor closes transactionally when tree navigation changes target | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:396 | a storage-rejected delayed Page rename falls back to session state | pass | — | — |
| tests/e2e/v3-build-structure-packages.spec.js:431 | package import skips cosmetic warnings and reviews the manifest before atomic load | pass | — | — |
| tests/e2e/v3-build-structure-packages.spec.js:490 | package export resolves drafts and round-trips a self-contained source | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/v3-build-structure-packages.spec.js:579 | package export activates the scoped layout owner when unfinished layout work is reviewed | fail | fixture-drift | Test timeout of 60000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:614 | cancelling the authored-content import warning preserves inline rename state | pass | — | — |
| tests/e2e/v3-build-structure-packages.spec.js:637 | successful same-ID import resets dirty rename state and disposes delayed tree activation | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-structure-packages.spec.js:687 | treeitem wrapper owns keyboard focus, nested groups, rename input, and a compact caret | fail | fixture-drift | Error: expect(locator).toBeFocused() failed |
| tests/e2e/v3-build-structure-packages.spec.js:732 | pointer collapse moves descendant roving focus to the collapsing Section and Page | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-workspace.spec.js:17 | Build chrome and source viewing preserve the saved layout and restoration context | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-workspace.spec.js:46 | layout and selected-chart drafts stay independent through layout discard | fail | fixture-drift | Test timeout of 60000ms exceeded. |
| tests/e2e/v3-build-workspace.spec.js:85 | native drag and Move panel controls use the handle while the canvas article stays fixed | fail | fixture-drift | Error: expect(locator).toHaveAttribute(expected) failed |
| tests/e2e/v3-build-workspace.spec.js:119 | More opens Scene Studio without losing dirty pending work | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-build-workspace.spec.js:160 | compact command row and More expose exact Stage 3 ownership | fail | fixture-drift | Error: expect(locator).toHaveText(expected) failed |
| tests/e2e/v3-build-workspace.spec.js:183 | chart creation gives every stage the Configure-sized render proof while keeping proofs reachable | pass | — | — |
| tests/e2e/v3-build-workspace.spec.js:212 | chart recovery states retain canonical plot geometry | pass | — | — |
| tests/e2e/v3-build-workspace.spec.js:234 | Home availability draft blocks package upload and Build discard until Scenario Discard | pass | — | — |
| tests/e2e/v3-build-workspace.spec.js:280 | Scenario Passport owns direct identity edits and package operations in Build | pass | — | — |
| tests/e2e/v3-canonical-runtime.spec.js:17 | canonical runtime ledger preserves tracked semantics across View, Build, Present, and Audience | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-chart-creation.spec.js:15 | six-stage chart creation suspends and commits exactly once | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |
| tests/e2e/v3-chrono-scene-fidelity.spec.js:15 | 005-chrono-group-authoring: staged ledger and review remain usable at desktop and tablet | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-chrono-scene-fidelity.spec.js:85 | 012-chrono-studio: direct reopening starts on All pages and does not hide saved groups | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/v3-chrono-scene-fidelity.spec.js:94 | 005-chrono-group-suspension: closing an unfinished create draft exposes Resume without locking Build pages | pass | — | — |
| tests/e2e/v3-chrono-scene-fidelity.spec.js:117 | 006-scene-authoring amendment: three full-width stages and Unit Orbit are live | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-chrono-scene-fidelity.spec.js:312 | 012-temporal-content: libraries filter, open read-first pages, and restore context | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-collection-header-controls.spec.js:15 | multi-page Collection transport stays in the header and leaves Build Edit rightmost | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-decision-surface.spec.js:11 | attention strip renders above the page body and drills to its target | pass | — | — |
| tests/e2e/v3-decision-surface.spec.js:40 | Set page time opens whole-page playback and the readout follows the scrub | pass | — | — |
| tests/e2e/v3-expanded-style-fidelity.spec.js:31 | selected style owns hover, focus, disabled, generated, SVG, and portal paint | pass | — | — |
| tests/e2e/v3-expanded-style-fidelity.spec.js:79 | Build studios, wizard validation, and Chrono interaction states use selected style | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-expanded-style-fidelity.spec.js:134 | one pending chart row keeps stable semantic paint through active, suspended, saving, and error | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/v3-expanded-style-fidelity.spec.js:243 | Text/Image Composer, sanitized notice, rendered preview, raw source, and Panel size use semantic contracts | pass | — | — |
| tests/e2e/v3-expanded-style-fidelity.spec.js:295 | Present, Audience options, and standalone Audience use selected style | fail | fixture-drift | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-expanded-style-fidelity.spec.js:314 | standalone source viewer and application recovery retain dashboard style | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-expanded-style-fidelity.spec.js:345 | phone View remains selected-style clean | pass | — | — |
| tests/e2e/v3-interface-contract.spec.js:15 | Build Page management uses the selected Page tab as its one grouped-actions trigger | fail | fixture-drift | Error: expect(locator).toBeVisible() failed |
| tests/e2e/v3-interface-contract.spec.js:32 | source-first Step 7 Build controls and fields use the shared dense desktop contract | fail | fixture-drift | Error: expect(locator).toHaveCSS(expected) failed |
| tests/e2e/v3-interface-contract.spec.js:67 | Build remains usable below the recommended 1024px desktop width | pass | — | — |
| tests/e2e/v3-interface-contract.spec.js:82 | operation status shows blocking Finish Build work, completion, and footer-safe geometry | fail | fixture-drift | Test timeout of 60000ms exceeded. |
| tests/e2e/v3-interface-contract.spec.js:188 | same-page section reorder paints status first and preserves the React-owned chart surface | fail | fixture-drift | Error: expect(locator).toBeAttached() failed |
| tests/e2e/v3-interface-contract.spec.js:266 | disabled Finish Build exposes its blocking reason on pointer hover | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-mobile-view.spec.js:10 | phone-width View shows one crown row, navigates through the disclosure, and caps chart height | pass | — | — |
| tests/e2e/v3-present-audience.spec.js:25 | END closes Audience and terminates the old channel | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-present-audience.spec.js:43 | an already-open Audience display follows live semantic Theme changes | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-present-audience.spec.js:71 | Audience remains passive and last-valid through invalid output and reconnect | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-present-audience.spec.js:99 | Audience surface remaining after denied close shows neutral Ended projection and rejects old events | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-present-audience.spec.js:132 | Present composes output and Audience dragging saves the Scene date position | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-shell-fidelity.spec.js:57 | wide View and Build use the shared canonical canvas maximum | fail | fixture-drift | Error: expect(received).toBeLessThanOrEqual(expected) |
| tests/e2e/v3-shell-fidelity.spec.js:78 | Dashboard map preserves saved layout, reveals the chart, and restores the closed canvas | fail | fixture-drift | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'getBoundingClientRect') |
| tests/e2e/v3-shell-fidelity.spec.js:129 | Build Structure double click navigates, highlights, and opens section rename | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/v3-shell-fidelity.spec.js:146 | dirty Build chart blocks crown Page navigation until the draft resolves | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/v3-shell-fidelity.spec.js:185 | shared Page row pins only the accepted View and Build actions | fail | fixture-drift | Error: expect(locator).toHaveCount(expected) failed |
| tests/e2e/v3-shell-fidelity.spec.js:225 | repeated public Add Page requests use current dashboard state and unique IDs | pass | — | — |
| tests/e2e/v3-shell-fidelity.spec.js:258 | active comparison selection disables repeated crown activation without clearing selection | pass | — | — |
| tests/e2e/v3-shell-fidelity.spec.js:281 | live Build Structure tree exposes a compact utility caret without redundant Page actions | pass | — | — |
| tests/e2e/v3-shell-fidelity.spec.js:303 | canonical View and Build frames project analytical Page metadata | pass | — | — |
| tests/e2e/v3-shell-fidelity.spec.js:340 | look drawer allows transient compression and restores dashboard geometry and state | pass | — | — |
| tests/e2e/v3-shell-fidelity.spec.js:391 | denied Theme and appearance writes remain live with session-only feedback | pass | — | — |
| tests/e2e/v3-shell-fidelity.spec.js:429 | denied dashboard writes remain usable with session-only feedback | pass | — | — |
| tests/e2e/v3-shell-fidelity.spec.js:463 | desktop width recommendation leaves Build and Present visible and usable | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/v3-source-evidence-direct.spec.js:15 | Build chart evidence action opens the dedicated viewer and returns to its invoker | fail | fixture-drift | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-step7-fidelity.spec.js:20 | Step 7 canonical content remains available across the recommended 1024px boundary | pass | — | — |
| tests/e2e/v3-step8-fidelity.spec.js:17 | Present remains usable below the recommended 1024px width and preserves its live session | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-step8-fidelity.spec.js:47 | 1920 Audience progresses passively through output, liveness, blackout, and denied-close Ended | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-step8-fidelity.spec.js:109 | Audience closes successfully after END | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-step8-fidelity.spec.js:120 | Audience renderer failure retains the last-valid passive projection without technical copy | pass | — | — |
| tests/e2e/v3-step8-fidelity.spec.js:139 | Audience preserves canonical passive geometry across the Step 8 viewport fan-out | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-step8-fidelity.spec.js:159 | date-position endpoints remain fully visible after direct Audience dragging | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-step9-final-acceptance.spec.js:57 | Build shows a recommendation at 1023px and removes it at 1024px without remounting | pass | — | — |
| tests/e2e/v3-step9-final-acceptance.spec.js:84 | desktop viewport fan-out preserves canonical Home and cross-mode analytical identities | pass | — | — |
| tests/e2e/v3-step9-final-acceptance.spec.js:118 | 1920 Audience preserves room-distance composition through the public workflow | fail | pre-existing-at-base | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scenes') |
| tests/e2e/v3-structure-rail.spec.js:17 | Build commands stay available beside persistent structure and properties rails | pass | — | — |
| tests/e2e/v3-structure-rail.spec.js:73 | Structure keeps visible disclosure arrows and caret-aligned branch guides | pass | — | — |
| tests/e2e/v3-structure-rail.spec.js:134 | create page and inline rename acquire only the dashboard layout draft | pass | — | — |
| tests/e2e/v3-structure-rail.spec.js:190 | native drag, keyboard move and Move panel dialog share the layout owner and restore focus | pass | — | — |
| tests/e2e/v3-structure-rail.spec.js:228 | whole-Scene migration and partial split confirmation preserve explicit Needs attention and playback exclusion | fail | fixture-drift | Error: Scene parent Chrono Group "national_outbreak" does not exist. |
| tests/e2e/v3-style-fidelity.spec.js:116 | target collections inherit dark shared surfaces and text | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/v3-style-fidelity.spec.js:149 | expanded Orbit starts below the live command crown | fail | fixture-drift | Test timeout of 150000ms exceeded. |
| tests/e2e/v3-style-fidelity.spec.js:184 | native style signatures resolve real shell, section, panel, and control paint | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:243 | section headers adapt only to title and description content | fail | fixture-drift | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'textContent') |
| tests/e2e/v3-style-fidelity.spec.js:282 | dashboard title hierarchy keeps section headings above panel titles | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:320 | Humanist contours retain accepted translucency and steady shell elevation | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:374 | native Dark charts yield legacy white defaults to profile surfaces | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:383 | Present gives the audience monitor half the workspace without duplicate Page controls | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:398 | Dashboard map clears actionable Build controls without command overflow and closing restores its frame | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:454 | Build and Present headings and nested controls shed V2 blue-green paint | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:488 | Present orders monitor, displayed charts, then options and captures a sharp preview | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:511 | Present keeps a live themed audience mirror for monitor captures | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:534 | selected dashboard style reaches crown, Build authoring, and Present chrome | fail | fixture-drift | Error: expect(locator).toHaveCSS(expected) failed |
| tests/e2e/v3-style-fidelity.spec.js:677 | all 13 profiles project every approved Light and Dark palette token | fail | fixture-drift | Error: expect(received).toEqual(expected) // deep equality |
| tests/e2e/v3-style-fidelity.spec.js:698 | native outer paint remains continuous while transient Look chrome may compress the page | pass | — | — |
| tests/e2e/v3-style-fidelity.spec.js:884 | section headers preserve wrapped title geometry in View and Build | pass | — | — |
| tests/e2e/v3-temporal-authoring.spec.js:14 | Chrono Studio and Scene Studio navigate through content before editing and persist end to end | fail | pre-existing-at-base | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-temporal-authoring.spec.js:87 | Studios open unfiltered from Home and a newly saved Scene remains visible | fail | pre-existing-at-base | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-view-chrono.spec.js:13 | View Chrono seeks scopes traces moves and safety-pauses without losing session | fail | fixture-drift | Test timeout of 120000ms exceeded. |
| tests/e2e/v3-wizard-usability.spec.js:5 | chart-panel tooltips escape clipping and use selected-style paint | fail | pre-existing-at-base | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-wizard-usability.spec.js:49 | fullscreen tooltips are hover-only and always clear on hover-away | fail | pre-existing-at-base | Test timeout of 30000ms exceeded. |
| tests/e2e/v3-wizard-usability.spec.js:78 | New Chart keeps stable geometry and exposes editable destination placement | pass | — | — |
| tests/e2e/v3-wizard-usability.spec.js:118 | Data source composes source tasks vertically and contains their controls | pass | — | — |
| tests/e2e/v3-wizard-usability.spec.js:181 | durable operation notices wait behind the chart wizard instead of covering its footer | pass | — | — |
| tests/e2e/v3-wizard-usability.spec.js:195 | Data source existing CSV actions, blank measurement, and Review repairs are concise and explicit | fail | pre-existing-at-base | Error: expect(locator).toBeVisible() failed |

## static

Full suite not executed: playwright.static.config.js starts pnpm build before preview, conflicting with the explicit no-build instruction. Clarification was requested but no answer was received. The saved JSON/log are from --list only; all 3 collected tests are not-run.

| Spec / location | Exact test title | Disposition | Failure category | First error line |
| --- | --- | --- | --- | --- |
| tests/e2e/static-content-portability.spec.js:62 | bundle v6 restores local Image and Free-text in a fresh offline browser context | not-run | — | — |
| tests/e2e/v3-static-offline.spec.js:10 | production View launches from the built static output | not-run | — | — |
| tests/e2e/v3-static-offline.spec.js:20 | installed production package opens its first Present and Audience from the cold offline runtime graph | not-run | — | — |

## pdpc

The exact requested command exited 1 before any test: ENOENT opening release/pdpc/biomedical/index.html. The 2 test titles were collected separately with --list and are not-run.

| Spec / location | Exact test title | Disposition | Failure category | First error line |
| --- | --- | --- | --- | --- |
| tests/e2e/pdpc-release-output.spec.js:20 | both generated outputs enforce their exact view-only page pair | not-run | — | — |
| tests/e2e/pdpc-release-output.spec.js:100 | the integrated PDPC dashboard header uses theme tokens and reflows without overflow | not-run | — | — |

## Base comparisons

| Branch spec | Base spec | Command exit | Matching outcomes |
| --- | --- | ---: | --- |
| tests/e2e/dashboard-density-audit.spec.js | tests/e2e/dashboard-density-audit.spec.js | 1 | complete dashboard surface manifest records density evidence: fail |
| tests/e2e/dashboard-edit-race.spec.js | tests/e2e/dashboard-edit-race.spec.js | 1 | a pending header edit and immediate chart save commit in order: fail |
| tests/e2e/dashboard-geography-authoring.spec.js | tests/e2e/dashboard-geography-authoring.spec.js | 1 | a fresh chronological choropleth reaches preview through the early GeoJSON selector: fail |
| tests/e2e/dense-desktop-outliers.spec.js | tests/e2e/dense-desktop-outliers.spec.js | 1 | chart authoring keeps single-line fields at 32px and grouping multirow: fail; color presets use exact 32px cells while the opener remains utility-sized: fail; Scene unit move actions form two stable single-line rows: fail |
| tests/e2e/dense-desktop-review-followups.spec.js | tests/e2e/dense-desktop-review-followups.spec.js | 1 | the default Chrono date is compact and clears the dashboard identity header: fail; the single-command Build More drawer sizes to its content: pass |
| tests/e2e/qmd-rich-editor.spec.js | tests/e2e/qmd-rich-editor.spec.js | 0 | Composer keyboard formatting, semantic styles, footprint, and always-visible preview: pass |
| tests/e2e/showcase-home.spec.js | tests/e2e/showcase-home.spec.js | 1 | Old Homepage Content is absent when Home enters the first ordinary Page through View: fail |
| tests/e2e/source-content-manager.spec.js | tests/e2e/source-content-manager.spec.js | 1 | compact Build content commands preserve six/four stage contracts: pass; desktop composition keeps canvas and catalogue state without overflow: fail |
| tests/e2e/source-content-media.spec.js | tests/e2e/source-content-media.spec.js | 1 | Journey A — media create reuse default external import restore dependencies delete: fail; Journey B — global media replacement preserves placement state: fail |
| tests/e2e/static-content-portability.spec.js | tests/e2e/static-content-portability.spec.js | 0 | Image replacement and panel removal retain reusable durable media bytes: pass |
| tests/e2e/static-free-text.spec.js | tests/e2e/static-free-text.spec.js | 1 | embedded image persists through reload and a second Text/Image creation: fail; Free Text edit embedded image retries durably through reload: fail; Free text completes its in-session production journey at 1440x900: fail; Free text completes its in-session production journey at 1024x768: fail; Free text completes its in-session production journey at 768x900: fail; FT-11 reload continuation preserves the exact saved QMD and revision: pass; FT-05 View and fullscreen activate only safe links by pointer and keyboard: fail; FT-06 live authoring blocks every resource boundary and preserves recoverable session source: pass |
| tests/e2e/static-image-audience.spec.js | tests/e2e/static-image-audience.spec.js | 1 | saved Image and temporal chart keep exact identity through passive Audience layouts, failure, and replay: fail |
| tests/e2e/three-mode-prototype.spec.js | tests/e2e/three-mode-prototype.spec.js | 1 | Present reserves a reachable desktop dock without covering its work controls: fail; Present retains synchronized time through blackout, reload, disconnect, and reopen: fail |
| tests/e2e/v3-authoring-theme-propagation.spec.js | tests/e2e/v3-authoring-theme-propagation.spec.js | 1 | selected dashboard style reaches every Build authoring surface: pass; Unit Orbit retains the selected theme outside AppFrame: fail; View Chrono and Present controls contain no retired dashboard paint: fail; standalone source viewer receives the selected dashboard style: fail |
| tests/e2e/v3-chart-creation.spec.js | tests/e2e/v3-chart-creation.spec.js | 1 | six-stage chart creation suspends and commits exactly once: fail |
| tests/e2e/v3-present-audience.spec.js | tests/e2e/v3-present-audience.spec.js | 1 | END closes Audience and terminates the old channel: fail; an already-open Audience display follows live semantic Theme changes: fail; Audience remains passive and last-valid through invalid output and reconnect: fail; Audience surface remaining after denied close shows neutral Ended projection and rejects old events: fail; Present composes output and Audience dragging saves the Scene date position: fail |
| tests/e2e/v3-step8-fidelity.spec.js | tests/e2e/v3-step8-fidelity.spec.js | 1 | Present remains usable below the recommended 1024px width and preserves its live session: fail; 1920 Audience progresses passively through output, liveness, blackout, and denied-close Ended: fail; Audience closes successfully after END: fail; Audience preserves canonical passive geometry across the Step 8 viewport fan-out: fail; date-position endpoints remain fully visible after direct Audience dragging: fail |
| tests/e2e/v3-step9-final-acceptance.spec.js | tests/e2e/v3-step9-final-acceptance.spec.js | 1 | 1920 Audience preserves room-distance composition through the public workflow: fail |
| tests/e2e/v3-temporal-authoring.spec.js | tests/e2e/v3-temporal-authoring.spec.js | 1 | Chrono Studio and Scene Studio navigate through content before editing and persist end to end: fail; Studios open unfiltered from Home and a newly saved Scene remains visible: fail |
| tests/e2e/v3-wizard-usability.spec.js | tests/e2e/v3-wizard-usability.spec.js | 1 | chart-panel tooltips escape clipping and use selected-style paint: fail; fullscreen tooltips are hover-only and always clear on hover-away: fail; Data source existing CSV actions, blank measurement, and Review repairs are concise and explicit: fail |

## Candidate regressions

- **tests/e2e/dense-desktop-review-followups.spec.js — the single-command Build More drawer sizes to its content**. Locator: `getByRole('button', { name: 'More', exact: true })`. First error: `Test timeout of 30000ms exceeded.`. Base: pass.
- **tests/e2e/qmd-rich-editor.spec.js — Composer keyboard formatting, semantic styles, footprint, and always-visible preview**. Locator: `getByRole('button', { name: 'Move panel Operational response note', exact: true })`. First error: `Error: expect(locator).toBeVisible() failed`. Base: pass.
- **tests/e2e/source-content-manager.spec.js — compact Build content commands preserve six/four stage contracts**. Locator: `getByRole('toolbar', { name: 'Primary Build commands' }).getByRole('button')`. First error: `Error: expect(locator).toHaveText(expected) failed`. Base: pass.
- **tests/e2e/static-content-portability.spec.js — Image replacement and panel removal retain reusable durable media bytes**. Locator: `locator('[data-panel-id="static-10c687c3-493c-4d18-8a8c-0d24c9fba4e7"][data-canonical-panel-id]').getByLabel('Shared asset first panel actions').getByRole('button', { name: 'Edit chart' })`. First error: `Test timeout of 180000ms exceeded.`. Base: pass.
- **tests/e2e/static-free-text.spec.js — FT-11 reload continuation preserves the exact saved QMD and revision**. Locator: `document.documentElement.scrollWidth (sampled via .free-text-source-editor)`. First error: `Error: expect(received).toBeLessThanOrEqual(expected)`. Base: pass.
- **tests/e2e/static-free-text.spec.js — FT-06 live authoring blocks every resource boundary and preserves recoverable session source**. Locator: `locator('[data-panel-id="static-9c30e3ba-9988-44f8-8cb2-4f00449f7a79"][data-canonical-panel-id]').getByLabel('Boundary traversal actions').getByRole('button', { name: 'Edit chart' })`. First error: `Test timeout of 240000ms exceeded.`. Base: pass.
- **tests/e2e/v3-authoring-theme-propagation.spec.js — selected dashboard style reaches every Build authoring surface**. Locator: `getByRole('button', { name: 'More', exact: true })`. First error: `Test timeout of 90000ms exceeded.`. Base: pass.

## Commands and exit codes

Each command below ran from its recorded working directory. JSON output targets and the audit-output redirect are recorded explicitly. Listing commands collect test titles without starting servers or executing tests.

### e2e-source-interrupted-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **1**.

~~~powershell
pnpm.cmd exec playwright test --project=chromium --reporter=line,json
~~~

Interrupted: Density audit writes docs/audits outside permitted output locations; interrupted, output preserved in ledger and newly generated untracked directory removed; unfinished tests resumed with output-only redirection.

### e2e-source-sandbox-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **1**.

~~~powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/e2e-source.json'
pnpm.cmd exec playwright test --project=chromium --reporter=line,json
~~~

### e2e-source-inventory-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **0**.

~~~powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\e2e-source-inventory.json'
pnpm.cmd exec playwright test --project=chromium --reporter=line,json --list
~~~

### e2e-source-continuation-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **1**.

~~~powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\e2e-source-continuation.json'
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/source-audit-output'
pnpm.cmd exec playwright test --project=chromium --test-list-invert C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/source-completed-tests.txt --reporter=line,json
~~~

### e2e-static-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **0**.

~~~powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\e2e-static.json'
pnpm.cmd exec playwright test --config=playwright.static.config.js --project=chromium --reporter=line,json --list
~~~

### e2e-pdpc-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **1**.

~~~powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\e2e-pdpc.json'
pnpm.cmd exec playwright test --config=playwright.pdpc.config.js --project=chromium --reporter=line,json
~~~

### e2e-pdpc-inventory-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **0**.

~~~powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\e2e-pdpc-inventory.json'
pnpm.cmd exec playwright test --config=playwright.pdpc.config.js --project=chromium --reporter=line,json --list
~~~

### e2e-source-classification-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **0**.

~~~powershell
node 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/classify-e2e.mjs' 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/e2e-source.json' 'C:/Users/hekma/Documents/Projects/SimEx/simex-dashboard/.claude/worktrees/view-build-decision-surface-ff6f8a'
~~~

### e2e-static-classification-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **0**.

~~~powershell
node 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/classify-e2e.mjs' 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/e2e-static.json' 'C:/Users/hekma/Documents/Projects/SimEx/simex-dashboard/.claude/worktrees/view-build-decision-surface-ff6f8a'
~~~

### e2e-pdpc-classification-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.claude\worktrees\view-build-decision-surface-ff6f8a`. Exit code: **0**.

~~~powershell
node 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/classify-e2e.mjs' 'C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/e2e-pdpc.json' 'C:/Users/hekma/Documents/Projects/SimEx/simex-dashboard/.claude/worktrees/view-build-decision-surface-ff6f8a'
~~~

### base-01-dashboard-density-audit-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-01-dashboard-density-audit'
pnpm.cmd exec playwright test tests/e2e/dashboard-density-audit.spec.js --project=chromium --reporter=line
~~~

### base-02-dashboard-edit-race-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-02-dashboard-edit-race'
pnpm.cmd exec playwright test tests/e2e/dashboard-edit-race.spec.js --project=chromium --reporter=line
~~~

### base-03-dashboard-geography-authoring-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-03-dashboard-geography-authoring'
pnpm.cmd exec playwright test tests/e2e/dashboard-geography-authoring.spec.js --project=chromium --reporter=line
~~~

### base-04-dense-desktop-outliers-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-04-dense-desktop-outliers'
pnpm.cmd exec playwright test tests/e2e/dense-desktop-outliers.spec.js --project=chromium --reporter=line
~~~

### base-05-dense-desktop-review-followups-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-05-dense-desktop-review-followups'
pnpm.cmd exec playwright test tests/e2e/dense-desktop-review-followups.spec.js --project=chromium --reporter=line
~~~

### base-06-qmd-rich-editor-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **0**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-06-qmd-rich-editor'
pnpm.cmd exec playwright test tests/e2e/qmd-rich-editor.spec.js --project=chromium --reporter=line
~~~

### base-07-showcase-home-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-07-showcase-home'
pnpm.cmd exec playwright test tests/e2e/showcase-home.spec.js --project=chromium --reporter=line
~~~

### base-08-source-content-manager-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-08-source-content-manager'
pnpm.cmd exec playwright test tests/e2e/source-content-manager.spec.js --project=chromium --reporter=line
~~~

### base-09-source-content-media-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-09-source-content-media'
pnpm.cmd exec playwright test tests/e2e/source-content-media.spec.js --project=chromium --reporter=line
~~~

### base-10-static-content-portability-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **0**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-10-static-content-portability'
pnpm.cmd exec playwright test tests/e2e/static-content-portability.spec.js --project=chromium --reporter=line
~~~

### base-11-static-free-text-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-11-static-free-text'
pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --reporter=line
~~~

### base-12-static-image-audience-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-12-static-image-audience'
pnpm.cmd exec playwright test tests/e2e/static-image-audience.spec.js --project=chromium --reporter=line
~~~

### base-13-three-mode-prototype-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-13-three-mode-prototype'
pnpm.cmd exec playwright test tests/e2e/three-mode-prototype.spec.js --project=chromium --reporter=line
~~~

### base-14-v3-authoring-theme-propagation-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-14-v3-authoring-theme-propagation'
pnpm.cmd exec playwright test tests/e2e/v3-authoring-theme-propagation.spec.js --project=chromium --reporter=line
~~~

### base-15-v3-chart-creation-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-15-v3-chart-creation'
pnpm.cmd exec playwright test tests/e2e/v3-chart-creation.spec.js --project=chromium --reporter=line
~~~

### base-16-v3-present-audience-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-16-v3-present-audience'
pnpm.cmd exec playwright test tests/e2e/v3-present-audience.spec.js --project=chromium --reporter=line
~~~

### base-17-v3-step8-fidelity-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-17-v3-step8-fidelity'
pnpm.cmd exec playwright test tests/e2e/v3-step8-fidelity.spec.js --project=chromium --reporter=line
~~~

### base-18-v3-step9-final-acceptance-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-18-v3-step9-final-acceptance'
pnpm.cmd exec playwright test tests/e2e/v3-step9-final-acceptance.spec.js --project=chromium --reporter=line
~~~

### base-19-v3-temporal-authoring-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-19-v3-temporal-authoring'
pnpm.cmd exec playwright test tests/e2e/v3-temporal-authoring.spec.js --project=chromium --reporter=line
~~~

### base-20-v3-wizard-usability-run.json

Working directory: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\temp-cloudflare-version`. Exit code: **1**.

~~~powershell
$env:NODE_OPTIONS = '--import=file:///C:/Users/hekma/AppData/Local/Temp/claude/C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a/0966462a-13df-4d49-8779-c480d2f1d5f8/scratchpad/codex-gates/redirect-audit-output.mjs'
$env:SIMEX_GATE_AUDIT_ROOT = 'C:\Users\hekma\AppData\Local\Temp\claude\C--Users-hekma-Documents-Projects-SimEx-simex-dashboard--claude-worktrees-view-build-decision-surface-ff6f8a\0966462a-13df-4d49-8779-c480d2f1d5f8\scratchpad\codex-gates\base-audit-output\base-20-v3-wizard-usability'
pnpm.cmd exec playwright test tests/e2e/v3-wizard-usability.spec.js --project=chromium --reporter=line
~~~

### Requested commands not executed

~~~powershell
pnpm.cmd exec playwright test --config=playwright.static.config.js --project=chromium --reporter=line,json
~~~

Exit code: not-run. Configured web server invokes the explicitly prohibited pnpm build; no authorization resolving the conflict was received.

## Incomplete work

- Static browser execution is blocked by its configured build step and the explicit no-build instruction.
- PDPC browser execution is blocked by missing release/pdpc/biomedical/index.html.

## Carried-forward evidence

The full unit suite and builds were not repeated. User-supplied results: 2,450 unit tests, 53 failures also present at base, zero unit regressions; standard build fails at base and branch on browser-uploaded GeoJSON sources; Cloudflare build succeeds on the branch.
