# V3 Open Issues Implementation Plan

> **Status: implementation in progress, authorized on 30 October 2026.** Executed directly on local private `main` under the proportional workflow policy. Issue #22 remains explicitly deferred; the other 16 issues are active.

## Execution record

- Start: branch `main`, HEAD `cbafc3e436a902133eaf9558edeea92b9b66374e`; only this untracked plan was present. No root browser bundle. No remote reconciliation or publication. Existing Git history is the versioning scheme explicitly selected by the approved plan.
- Workflow ruling: use this plan as the sole execution ledger; no separate status artifacts or status-only commits. User authorization overrides default worktree/origin policies. Reviews/checks stay scoped to changed product boundaries.
- S1 / #25: reproduced image zoom surviving Image → Text, including resumed drafts. Type changes now use the selected type's default interaction capabilities and retain identity/title/layout. Same-type selections retain settings; image zoom and reset remain supported; external validation is unchanged.
  - `node --test tests/staticContentDraft.test.js tests/staticPanelTransaction.test.js`: **37 passed, 0 failed**. New #25 regression observed RED (`true !== false`), then GREEN.
  - `pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --grep 'V3 #25'`: **1 passed (20.4s)**; Image → Text, add, canonical saved config, full-editor reopen.
  - Initial browser attempts stalled in source startup; isolated HTML/module/browser preflight succeeded with fixture watching/discovery disabled. An Image label locator was then corrected to the actual radio value. The final journey's product assertions were retained. See ENV-005.001.
- S2 / #18, #26, #32: finalized failed CSV drafts remain coordinator-owned and the wizard now retains its matching active authority until success. Confirmed retry after persistence failure and after missing-destination repair, including bytes/profile/mappings and exactly one placement/source. All creation source paths now await the existing layout-save boundary before persistence, so unsaved sections accepted by destination proof exist in the committed structure. This intentionally saves pending layout changes before creation; it is the plan's permitted existing-boundary option, rather than a new cross-owner transaction.
  - Canonical Start section had no live handler. It now splits at placement identity through the Build layout draft, retains successors and references, rejects missing anchors, and supports normal save/discard. Canceling either prompt makes no change. Existing full-editor destination/move controls were retained.
  - `node --test --test-name-pattern='V3 #(26|32)|edit placement moves retain|uploaded CSV keeps|confirmed uploaded CSV|chart CSV completion' tests/chartAuthoringComponentsV3.test.js tests/anchoredStructureCommands.test.js`: **7 passed, 0 failed**. CSV persistence regression observed RED (missing active authority), then GREEN; split regression observed RED (missing operation), then GREEN.
  - `node --test tests/chartCreateTransaction.test.js tests/chartEditSession.test.js tests/buildLayoutMove.test.js tests/anchoredStructureCommands.test.js`: **51 passed, 0 failed**, including ambiguity reconciliation, identity, references, rollback and cancellation boundaries.
  - `pnpm.cmd exec playwright test tests/e2e/v3-chart-creation.spec.js tests/e2e/v3-anchored-structure-commands.spec.js --project=chromium --grep 'V3 #(18|26|32)'`: #32 **passed (6.1s)**; #18/#26 initially failed on fixture lookup/reload navigation. After correcting only those boundaries, `pnpm.cmd exec playwright test tests/e2e/v3-anchored-structure-commands.spec.js --project=chromium --grep 'V3 #(18|26)'`: **2 passed (30.1s)**. #32 was not rerun after unrelated fixture corrections.
  - Scoped ownership review: finalized CSV failures are retained by the real coordinator (not a dead reference); success/discard retire only owned slots. Creation waits for structure persistence and propagates failure. Existing duplicate/ambiguous protection remains unchanged. Browser journeys verify unsaved-section upload, actual CSV commit failure/retry, split/save/reload and a cross-page full-editor move.
- S3 / #21, #31: writer now uses the available editor width/height independently of panel sizing. Inline Rendered preview and Preview & add use `chartFootprintPixelSize` and the shared measured destination geometry, with whole-panel Fit/Actual scaling and saved-panel chrome/padding. Device layout is forwarded to static creation/editing. Media selection/catalogue code is unchanged.
  - `node --test tests/authoringStage.test.js tests/staticContentEditor.test.js`: **27 passed, 0 failed**. New #21 destination geometry case observed RED before the frame change, then GREEN. Updated existing footprint tests to assert the confirmed independent-writer contract.
  - `pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --grep 'V3 #21 #31' --max-failures=1`: **2 passed (1.1m)**. Each viewport (1401×833 and 1117×766) exercises widths 1–4, usable writer/toolbar/footer, Fit versus Actual logical wrapping, inline versus final versus saved content width within 1 CSS pixel, save and reopen with exact text.
  - `pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --grep 'embedded image persists through reload and a second Text/Image creation' --max-failures=1`: **1 passed (29.2s)**, covering media reachability and durable content after the shared frame change. #22 remains deferred.
- S4 / #17: added draft-only conversion through the existing conversion projections, retaining partial assignments without weakening final-save validation. Same-type selection preserves authored state. Compatible cross-type changes retain source identity, mappings, transformations, palette, legend, layout, destination, explicit or detected temporal playback, and membership. Incompatible losses are named before applying, with exact draft retention on cancellation. Added missing conversion ownership for pivot, description/citation, table/image settings and reference-line warnings; existing saved-editor consumers explicitly confirm the new warning.
  - `node --test tests/wizardDraftV3.test.js tests/chartConversionV3.test.js`: **45 passed, 0 failed**. New partial/same-type, detected-time and metadata/pivot/reference-line regressions each observed RED, then GREEN. Earlier intermediate failures identified and corrected null-draft initialization and stale tests that applied incompatible changes without confirmation.
  - `node --test --test-name-pattern='wizard exposes|Full wizard continues|wizard membership keeps|wizard submit callback|edit-mode wizard commit|guided synchronized conversion|multi-temporal conversion' tests/chartAuthoringComponentsV3.test.js`: **8 passed, 0 failed**.
  - `pnpm.cmd exec playwright test tests/e2e/v3-chart-creation.spec.js tests/e2e/chart-authoring-v3.spec.js --project=chromium --grep 'V3 #17|editor chart conversion supports' --max-failures=1`: **2 passed (31.8s)**. After replacing internal paths with readable warning names, only the affected new-chart journey was rerun: **1 passed (13.0s)**. Full-editor compatible conversion, incompatible remapping, discard and saved identity remain covered by the passing existing journey.
- S5–S7: pending.
- #22: **deferred by user**, no catalogue/listing/eligibility changes authorized.

**Goal:** Address the complete 17-issue V3 inventory: repair or verify the 16 active issues, and retain #22 as an explicit user-directed deferral. Preserve already-working behavior and authored content.

**Architecture:** Repair the existing chart/static-content draft models, canonical placement transactions, and shared rendering/authoring controls. Preserve existing configuration contracts where they express the desired behavior. Add presentation settings for the confirmed per-entry legend controls and manual ordering, using shared stable identities.

**Tech stack:** React 19, JavaScript ES modules, ECharts 5, Tiptap, Node's test runner, Playwright, pnpm.

**Requirements:** The linked V3 issues and the confirmed decisions below. Implementation details specified by this plan are engineering recommendations, not additional user requests.

## Baseline and boundaries

- Repository: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard` (local, outside cloud synchronization).
- Starting revision: local private `main`, `cbafc3e436a902133eaf9558edeea92b9b66374e`.
- Implementation target: **private main**, explicitly requested by the user. Work in the local private-main checkout for this task rather than introducing a feature branch/worktree. This task-specific instruction overrides the repository's default isolated-feature-worktree policy. Do not substitute public V3 main or an unrelated Fable branch.
- Private remote: `https://github.com/hekmatov/simex-dashboard-private.git`; public issue tracker: `https://github.com/hekmatov/simex-dashboard-v3`.
- At inspection, the worktree was clean and local main was ahead 4 / behind 1 relative to the cached `origin/main`. No fetch, pull, reset, merge, branch switch, or remote mutation was performed. This is not a claim about the live remote head.
- The user's explicit local-main baseline takes precedence over the repository's default origin-main baseline. Preserve its commits; remote reconciliation is a later integration decision.
- This is active development, not a pre-merge or release gate. Prefer one coherent commit per repair slice, including its corresponding regression tests.
- No new project/version scheme is needed: continue the existing private Git history. Preserve supported chart configuration versions; do not add obsolete chart compatibility paths.
- No automatic public publication, issue closure, comments, labels, or pushes. Preparing a fix is distinct from establishing that the reporter's published version contains it.
- Do not promote browser content during this planning task. Before later implementation changes authored defaults, follow the repository's selected-content baseline policy and preserve any user export. No root `packaged-dashboard-bundle.json` was present during inspection.
- Do not resume paused scenario work or incorporate other worktrees as part of these repairs.

## Confirmed decisions and scope

1. **#20 legend:** all three controls: hide the whole legend, rename individual legend entries, and hide individual entries **without hiding their plotted data**. Preserve the existing whole-legend toggle. Implement entry naming/visibility for chart families that already expose legends; do not invent legends for non-legend charts.
2. **#21 preview:** the specifically named **Rendered preview** must match the panel's specified width. Correct the inline rendered preview and final preview consistently; the writing surface remains independently usable.
3. **#22 media:** **deferred at the user's request**, because the defect is unclear. Do not change the media catalogue, picker eligibility, or listing behavior under this plan. Reopen only after a concrete reproduction or renewed user direction.
4. **#28 ordering:** manual ordering of **both** categories along the axis and series within each cluster. Preserve existing source order by default.
5. **#17 conversion:** the report concerns switching between different chart types. Preserve all compatible settings and warn before discarding incompatible ones. Same-type idempotence remains a closely related regression safeguard based on the local reproduction, not a substitute for cross-type coverage.
6. **#24 gauge:** lower values can be favorable; reverse automatic status colors and target assessment while keeping the numeric scale ascending.
7. **#29 axis:** support an ordinary lower Y-axis limit of 40, not a broken/discontinuous axis.

No product clarification remains pending. #26, #30, and the initial failure in #32 still require the bounded technical reproductions described in their slices; the plan does not claim their causes have been proven.

## Inventory and evidence

All 17 issues were read individually; all comments were fetched. Only #32 had a comment, containing a second error screenshot. All eight screenshot attachments were inspected. Source inspection is distinguished below from reproduced behavior.

| Issue | Local-main assessment | Disposition and owning slice |
| --- | --- | --- |
| [#11 Gauge ranges](https://github.com/hekmatov/simex-dashboard-v3/issues/11) | `TargetRangesControl` retains raw input; the trailing-comma parser test passes. This does not prove keystroke behavior in the browser. | S6: verify the existing fix end to end; change only a demonstrated remaining defect. |
| [#16 Categorical X-label wrapping](https://github.com/hekmatov/simex-dashboard-v3/issues/16) | `axisPresentation.js` supports label font size, wrapping, and width. Existing horizontal-category wrapping test passes; reported crowded X-axis still needs coverage. | S6: confirm controls and crowded X-axis geometry. |
| [#17 Retain configuration on type change](https://github.com/hekmatov/simex-dashboard-v3/issues/17) | Complete line-to-bar mapping test passes. An in-memory probe reproduced incomplete measurement mappings being cleared on same-type reselection. `selectType` also removes time-group membership before conversion. | S4: preserve valid draft state and define incompatible-change behavior. |
| [#18 Existing chart destination/placement](https://github.com/hekmatov/simex-dashboard-v3/issues/18) | Full edit wizard exposes destination/insertion controls; move helper test passes. Saved-chart integration applies a placement move. | S2: verify whole edit/save journey, identity, and rollback; avoid duplicating controls. |
| [#19 Categorical filter choices](https://github.com/hekmatov/simex-dashboard-v3/issues/19) | Scalar operands have a datalist; detected-value test passes. Suggestions are capped at 100, require category typing, and do not cover multi-value operands. | S6: verify reported scalar use, source changes, and discoverability. Do not silently expand to a new filter language. |
| [#20 Legend column name](https://github.com/hekmatov/simex-dashboard-v3/issues/20) | Whole-legend visibility and measure labels exist. `seriesName` combines measurement, cluster, group, and label. User confirmed all three legend controls. | S7: retain whole-legend visibility; add per-entry rename and omission without suppressing data. |
| [#21 Text column-size preview](https://github.com/hekmatov/simex-dashboard-v3/issues/21) | Text preview uses `AuthoringFootprintFrame`, based on its local container; chart authoring has a separate destination-measured geometry path. User confirmed Rendered preview does not match specified panel width. | S3: match logical panel width and text wrapping at destination geometry. |
| [#22 Text available-media list](https://github.com/hekmatov/simex-dashboard-v3/issues/22) | Picker partitions selectable local, external/importable, and unavailable media. No concrete defect established. | **Deferred by user; excluded from implementation and completion gates.** |
| [#23 KPI without target](https://github.com/hekmatov/simex-dashboard-v3/issues/23) | Screenshot shows unwanted “Target 0.” Target is optional in schema and null without a binding in data preparation. Latest manual-role repair omits empty optional fields; its tests pass. | S5: verify blank versus explicit zero through manual entry, rendering, and export. |
| [#24 Inverted gauge](https://github.com/hekmatov/simex-dashboard-v3/issues/24) | Direction is allowed by the target contract but not exposed for gauges. Gauge segments and status assume higher is favorable; `PrecisionArcGauge` also remaps standard colors by position. | S5: carry direction consistently through controls, both gauge render paths, and status text. |
| [#25 Text zoom error](https://github.com/hekmatov/simex-dashboard-v3/issues/25) | Fresh text has zoom disabled. In-memory Image-to-Text conversion retains `zoom.enabled: true` through panel spreading; screenshot shows the corresponding unsupported-zoom error. | S1: normalize capabilities on type change; retain the validator. |
| [#26 Start section here](https://github.com/hekmatov/simex-dashboard-v3/issues/26) | Action uses native prompts and legacy `onSectionInsert`; other Build structure operations use a layout draft. Legacy insertion silently creates an empty section when an anchor is missing. Exact report path not reproduced. | S2: verify canonical placement and draft ownership; replace the inconsistent action path if confirmed. |
| [#28 Category ordering + color overflow](https://github.com/hekmatov/simex-dashboard-v3/issues/28) | Categories and series use first-seen order; palette is rendered inside the field. Two independent acceptance criteria are present. | S7 for ordering; S6 for reachable color controls. |
| [#29 Hide Y-axis 0–40](https://github.com/hekmatov/simex-dashboard-v3/issues/29) | Primary/secondary min/max are already authorable and rendered; axis range test passes. User confirmed ordinary limits. | S6: verify min=40 and persistence, with max=100 in a percentage fixture. Broken axes are out of scope. |
| [#30 Bar-chart colors](https://github.com/hekmatov/simex-dashboard-v3/issues/30) | Axis renderer forwards the series palette. A single series with many categories is different from many series. The reporter's exact “priorities of lifting measures” chart was not identified in the inspected defaults. | S7: obtain the actual chart configuration before selecting a repair; distinguish per-series from per-category coloring. |
| [#31 Text editing area](https://github.com/hekmatov/simex-dashboard-v3/issues/31) | Both screenshots show a narrow writer and extensive unused width; one clips the editable area. The writer and preview both receive footprint frames with fixed row geometry and overflow-hidden cards. | S3: separate usable editing geometry from preview footprint. |
| [#32 Destination and CSV mismatch](https://github.com/hekmatov/simex-dashboard-v3/issues/32) | Destination validation/rendering and persisted chart integration may see different structure revisions. CSV lifecycle unconditionally clears its active slot after a failed commit, which can invalidate a retry. These are source-grounded hypotheses, not a reproduced browser sequence. | S2: investigate the first failure and retry together; preserve staged data and atomicity. |

## Sequence and dependencies

Recommended sequence: **S1 text blocker → S2 creation/placement transactions → S3 text editor and faithful preview → S4 conversion retention → S5 KPI/gauge semantics → S6 existing-feature verification and bounded repairs → S7 series/category presentation**.

- S1 precedes the S3 text creation journey.
- S2 precedes journeys requiring a newly created section, moves, or recovered uploaded CSV.
- S4 precedes final conversion checks for S5/S7 presentation additions.
- S6 color-popup containment can be delivered independently of S7 ordering.
- Legend, ordering, and color identity belong together in S7 so reordering does not silently reassign styling or relabel data.
- Verification-only issues do not require empty implementation commits. Record their outcome in the directly related slice or this plan.

## S1 — Restore text creation after type changes (#25)

**Primary files:** `src/static-content/forms/staticContentDraft.js`; inspect `src/static-content/staticPanelCapabilities.js` and `src/charting/config/chartConfigV3.js` for existing normalization ownership.

**Tests:** `tests/staticContentDraft.test.js`, `tests/staticPanelTransaction.test.js`, `tests/e2e/static-free-text.spec.js`.

- [x] Add a regression that creates an Image draft, selects Text, authors content, and finalizes a valid text panel with zoom disabled. Include a resumed draft carrying incompatible image interactions.
- [x] At static type changes, preserve shared identity/title/layout while reconstructing type-specific interaction settings from the selected type's capabilities. Do not broadly disable image zoom or bypass validation.
- [x] Verify reverse switching retains supported image behavior, and cancel/reset does not mutate the saved panel.
- [x] Run the exact added deterministic cases. After they pass, run one Text creation journey that includes a type switch and save/reopen.

**Exit:** A supported wizard sequence cannot generate the screenshot's unsupported-zoom error; malformed externally supplied configurations still receive valid diagnostics.

## S2 — Make creation, retries, moves, and section splits consistent (#18, #26, #32)

**Primary files:** `src/components/chart-authoring/ChartWizardV3.jsx`, `src/components/DashboardRenderer.jsx`, `src/App.jsx`, `src/charting/config/dashboardBundleV3.js`, `src/charting/forms/chartDestination.js`, `src/charting/forms/chartPlacement.js`, `src/charting/forms/chartCreateTransaction.js`. Inspect the existing content-draft coordinator and Build layout model before changing their lifecycle.

**Tests:** `tests/chartAuthoringComponentsV3.test.js`, `tests/chartCreateTransaction.test.js`, `tests/dashboardBundleV3.test.js`, `tests/anchoredStructureCommands.test.js`; representative journeys in `tests/e2e/v3-chart-creation.spec.js` and `tests/e2e/v3-anchored-structure-commands.spec.js`.

**Existing interfaces to preserve:** `createChartCsvDraftLifecycle(...)`, `buildChartEditPlacementMove(...)`, `integrateCreatedChart(dashboard, payload, target)`, and the existing canonical layout-move transaction.

- [x] Reproduce creation into an existing section and an unsaved newly created section, including uploaded CSV, source replacement/cancellation, and a first commit failure. Capture which dashboard revision destination proof and persistence each use.
- [x] Make reviewed destination and final insertion use the same canonical structure authority. Apply pending structure atomically with chart creation where supported, or explicitly complete/revalidate its existing save boundary before committing. Never choose a different destination silently.
- [x] Define recoverable versus terminal CSV commit failures using the coordinator's actual ownership contract. Keep or safely restage the uploaded bytes, profile, source identity, mappings, and destination for a recoverable failure. Do not merely keep a JavaScript reference to a coordinator draft that has already been retired.
- [x] Preserve ambiguous-commit reconciliation and duplicate prevention. A retry must create exactly one source and one placement; cancel must clean up only resources owned by the discarded draft.
- [x] Exercise the existing edit destination/insertion controls for within-section and cross-page moves. Save must retain chart and placement identity; cancel leaves the dashboard unchanged. Preserve time/scenario references and existing move confirmations.
- [x] Route “Start section here” through the existing canonical Build structure owner. Split at the selected placement, including it and its successors in the new section. Reject a missing anchor with an actionable message; never silently create an unrelated empty section. Check chart, gauge, and static-text placements.
- [x] After focused unit checks pass, run one representative destination/upload/retry journey and one section-split/move journey using valid canonical fixtures.

**Exit:** Creation and retry preserve authored data, truthful destination status, and exactly-once persistence. Section splits and chart moves target the selected canonical placement and survive save/reload.

## S3 — Make the text writer usable and its preview faithful (#21, #31)

**Primary files:** `src/components/static-content/StaticContentWizard.jsx`, `src/components/static-content/FreeTextSourceEditor.jsx`, `src/components/static-content/PortableQmdRichTextEditor.jsx`, `src/components/common/AuthoringFootprintFrame.jsx`, `src/styles/static-content.css`.

**Reuse:** destination/canvas sizing from `src/components/chart-authoring/AuthoringStage.jsx` and shared `src/components/chartStageGeometry.js` where applicable. Do not introduce a competing sizing model.

**Tests:** `tests/staticContentEditor.test.js`, `tests/staticContentDraft.test.js`, `tests/authoringStage.test.js`; `tests/e2e/static-free-text.spec.js`. Existing media behavior is a regression boundary only if the editor changes touch it; #22 is not part of this slice.

- [x] Establish a valid text fixture at 1-, 2-, 3-, and 4-column panel widths. Use the two #31 screenshot viewport sizes (1401×833 and 1117×766) as representative regressions, not exact-pixel snapshots.
- [x] Give the writing surface usable width and height independent of the saved panel footprint. Keep toolbar, editable text, validation, and navigation reachable with keyboard and scroll. Do not let the source-fidelity message displace or clip the editor.
- [x] Calculate preview dimensions with `chartFootprintPixelSize(footprint, resolveCanvasGeometry(...))` using the selected destination's effective width. Feed this geometry to both the inline **Rendered preview** and **Preview & add**. Do not calculate panel width as a fraction of the writer/dialog column.
- [x] Render preview content at the intended logical panel width. If it must fit a smaller viewport, scale the complete preview after layout and expose Fit/Actual sizing consistently with chart authoring; do not reflow text at the smaller display width. Changing panel size must not shrink the writing controls.
- [x] Match the preview's content-box width, font/theme, and wrapping to the saved panel, accounting for the same panel chrome/padding. In Actual mode, compare like-for-like geometry within one CSS pixel; in Fit mode, assert the measured scale and unchanged logical wrapping. Destination/viewport changes must update the preview.
- [x] Verify text, title, width, and content survive navigation, save, and reopen. Keep existing media controls reachable without altering their catalogue or eligibility behavior.
- [x] Run changed model checks, then one parameterized text-writing/preview journey across representative widths and both viewport sizes.

**Exit:** Text can be authored at ordinary laptop sizes regardless of panel footprint. Rendered preview and the saved panel have the same logical content width and wrapping. #22 remains deferred.

## S4 — Preserve chart authoring through type selection (#17)

**Primary files:** `src/charting/forms/wizardDraft.js`, `src/charting/forms/chartConversion.js`, `src/charting/forms/conversionContract.js`, `src/components/chart-authoring/ChartWizardV3.jsx`; reuse the existing conversion confirmation UI where possible.

**Tests:** `tests/wizardDraftV3.test.js`, `tests/chartConversionV3.test.js`, `tests/chartAuthoringComponentsV3.test.js`; smallest corresponding journey in `tests/e2e/chart-authoring-v3.spec.js`.

- [x] Cover cross-type switches explicitly: complete and incomplete Line↔Bar mappings retain compatible source, roles, filters, transformations, styling, placement, and time settings.
- [x] Make same-type selection idempotent for roles, source, transformations, presentation, layout, destination, and time-group membership.
- [x] Preserve compatible partial role assignments without requiring a complete renderable target chart. Keep draft validation separate from final save validation.
- [x] Preserve compatible presentation and time semantics across different types; explain concrete losses before an incompatible change. Cancellation must restore the exact original draft.
- [x] Cover partial and complete line/bar mappings, incompatible targets, and supported time-group membership. Keep source identity stable and preserve uploaded source ownership.

**Exit:** Selecting a chart type cannot silently erase still-compatible authored choices. Existing complete conversion behavior remains passing.

## S5 — Correct optional targets and gauge direction (#23, #24; #11 verification feeds S6)

**Primary files:** `src/components/chart-authoring/ChartWizardV3.jsx`, `src/charting/forms/formModel.js`, `src/components/chart-authoring/StandardField.jsx`, `src/charting/data/prepareTargetData.js`, `src/charting/rendering/targetAdapter.js`, `src/components/charts/PrecisionArcGauge.jsx`; inspect the KPI card renderer for any null-to-zero coercion.

**Tests:** `tests/chartAuthoringComponentsV3.test.js`, `tests/chartFormModelV3.test.js`, `tests/chartRenderingV3.test.js`, `tests/targetCollectionV3.test.js`, `tests/manualChartDataV3.test.js`; relevant manual authoring journey in `tests/e2e/manual-data-export.spec.js`.

- [ ] Verify the recent manual-data repair against #23: no target binding and an empty optional target render no target label. Explicit numeric zero remains a real target. Clearing an existing optional target removes its binding. Check both manual and dataset-backed KPIs.
- [ ] If those paths already pass end to end, retain the existing implementation and classify #23 as locally addressed pending published-version confirmation.
- [ ] Expose the already-supported `presentation.targets.direction` for gauges with `increase-is-good`, `decrease-is-good`, and `neutral`. An absent setting retains the prior higher-is-favorable gauge behavior; selecting lower-is-favorable does not reverse the numeric scale.
- [ ] Carry direction to automatic status-band colors and target assessment in both the precision SVG gauge and ECharts fallback, including collection items and semantic descriptions. Fix the index-based standard-color remapping if it would undo inversion.
- [ ] Preserve explicit authored range colors. Define neutral output without calling higher/lower values good or bad. Test below, equal, and above target, absent target, explicit zero, and non-100 range maxima.
- [ ] Confirm export/import retains the optional target and direction; no fabricated target and no unsupported schema keys.

**Exit:** KPI target absence remains absence throughout the pipeline. Gauge colors and status communicate the selected favorable direction consistently.

## S6 — Verify existing controls and repair bounded usability gaps (#11, #16, #19, #28 overflow, #29)

**Primary files if a defect is demonstrated:** `src/components/chart-authoring/StandardField.jsx`, `src/charting/forms/formModel.js`, `src/charting/rendering/axisPresentation.js`, `src/components/ColorField.jsx`, `src/components/chart-authoring/SeriesColorsField.jsx`, `src/styles.css`, and only affected dialog styles.

**Tests:** `tests/chartAuthoringComponentsV3.test.js`, `tests/chartRenderingV3.test.js`, `tests/chartFormModelV3.test.js`; focused journeys within `tests/e2e/v3-wizard-usability.spec.js` or `tests/e2e/chart-authoring-v3.spec.js`.

- [ ] Type `50, 80, 100` incrementally in the actual gauge control; ensure comma, spaces, deletion, and completion survive rerenders. Validate final values and save/reopen. The passing parser test alone is insufficient for a controlled-input defect.
- [ ] Confirm categorical X-axis font size and wrapping are discoverable and persisted. Exercise long labels and many categories at a narrow panel width; keep labels distinguishable without clipping. Preserve numerical and temporal axis behavior.
- [ ] Verify scalar categorical filters offer deduplicated values from the current source, refresh on source/column changes, and retain valid manually entered values. Clarify or repair discoverability if native datalist behavior hides the existing feature. Keep numeric/range operators unchanged.
- [ ] Constrain color options to the available viewport/dialog scroll area; keep the last palette choice and dismiss controls reachable. Preserve focus and prevent overlay/footer clipping at laptop sizes.
- [ ] Verify primary Y min=40/max=100 on the percentage fixture in preview and saved chart, secondary axes independently, and reset to automatic bounds. Leave a user's existing maximum untouched when only the minimum is edited. Ensure clipped points do not leak beyond the plot. Do not alter dataset values or globally rewrite chart defaults.
- [ ] Run one focused deterministic selection for changed behavior and only the representative browser checks needed to establish the actual controls work.

**Exit:** Each existing-capability issue has a demonstrated user journey or a concrete residual fix; no redundant feature framework is added.

## S7 — Make series labels, ordering, and colors coherent (#20, #28 ordering, #30)

**Primary files:** `src/charting/data/prepareAxisData.js`, `src/charting/rendering/axisAdapter.js`, `src/charting/forms/formModel.js`, `src/components/chart-authoring/RoleField.jsx`, `src/components/chart-authoring/SeriesColorsField.jsx`, `src/charting/config/chartConfigV3.js`; adjust conversion preservation only for settings actually added.

**Shared consumers:** `src/components/chart-authoring/SchemaField.jsx` for form-control dispatch, `src/charting/presentation/seriesStyleContract.js`, `src/charting/rendering/compositionAdapter.js`, `src/charting/rendering/relationshipAdapter.js`, and `src/components/charts/EChartsChartView.jsx` where label/tooltip projection requires it. Per-entry legend controls apply to these existing legend-bearing families; category/series ordering is scoped to Cartesian category charts for #28.

**New focused modules:** `src/charting/presentation/categorySeriesPresentation.js` for stable keys, ordering, and legend projections; `src/components/chart-authoring/CategorySeriesPresentationFields.jsx` for the ordered lists and per-entry controls; `tests/categorySeriesPresentation.test.js` for their shared pure contract.

**Tests:** `tests/chartRenderingV3.test.js`, `tests/chartFormModelV3.test.js`, `tests/chartConfigV3.test.js`, `tests/chartConversionV3.test.js`, `tests/dashboardBundleV3.test.js`; one affected chart authoring journey.

- [ ] Obtain/identify the reporter's “priorities of lifting measures” chart and the comparison “current support measures” chart. Record actual type, mappings, pivot/grouping, saved palette, and rendered series count. This evidence decides whether the bug is a lost palette, an overriding style, or a request for per-category colors on one series.
- [ ] Retain whole-legend visibility and add per-entry display-name editing and a **Show in legend** toggle. Omit hidden entries from the legend without using ECharts' selected/deselected-series state, deleting series/data, or changing totals. Resetting a name restores the generated label. Whole-legend hiding must retain all per-entry settings for later restoration. Do not rename source CSV columns.
- [ ] Provide two independent keyboard-accessible ordered lists: **Category order** and **Series order**. Support Move up/Move down and Reset to source order; drag-and-drop is optional polish. Category order applies to the categorical dimension, including the physical Y axis of horizontal bars; do not manually reorder true time/numeric axes.
- [ ] Define stable category/series keys separately from display labels; retain source order by default; retain explicit order when filtering or playback temporarily removes members; append previously unseen members deterministically without deleting their data. Display unavailable configured entries clearly without dropping their stored settings.
- [ ] Use the same resolved order for bars/lines, legend, tooltip, and colors. Keep measurement-to-axis binding stable, especially for mixed charts. A reorder must not silently change mark type or move data to the secondary axis.
- [ ] Repair #30 at the proven boundary. If per-category styling is required, author and persist it by stable category identity; do not pretend that editing a second series color can affect a chart with only one series. Retain the existing series palette for its current purpose.
- [ ] Implement the presentation contract below across validation, normalization, form generation, rendering, conversion, and package round-trip in one coherent change. Extend `seriesStyleContract.js` rather than bypassing its capability/known-key checks.
- [ ] Verify the actual reported fixtures, order changes, filter/playback changes, saved/reopened configuration, and chart-type conversion preserve intended labels and styling.

**Exit:** Users can express the confirmed label/order/color choices without changing data, and the choices remain consistent across preview, save/reload, playback, and export.

### S7 presentation contract

These are engineering decisions for the implementation, based on the confirmed behavior. Extend the current optional presentation shape without rewriting existing charts or adding a legacy version path.

| Persisted setting | Contract |
| --- | --- |
| `presentation.axes.x.categoryOrder` | Optional array of unique category keys, only for a categorical observation dimension. The logical `x` dimension remains the owner for horizontal charts. Absent means source order. |
| `presentation.series.order` | Optional array of unique series keys, supported by Cartesian category charts. Absent means source order. The form capability and series-style validator must agree. |
| `presentation.series.overrides` | Optional record keyed by series identity, with `{ color?: '#RRGGBB' }` entries. Used to preserve explicit styling when series are reordered. Retain `series.colors` as the legacy/default palette input; an explicit keyed override wins. Do not reassign existing authored colors by the new visual index. |
| `presentation.legend.entries` | Optional record keyed by legend-entry identity, each `{ label?: string, visible?: boolean }`. Absent label uses the generated display label; absent visibility is true. Trim an empty edited label back to the default. |

Reject malformed types, duplicate order keys, unknown entry properties, and invalid colors through the existing strict validators. A well-formed key temporarily absent from the current data remains a dormant setting, not a validation error. Clearing the final optional value should prune empty records consistently with existing authoring behavior.

The pure module should export these interfaces:

- `categoryPresentationKey(value) -> string`: type-preserving scalar encoding; numeric `1` and text `"1"` remain distinct. Missing values follow the existing preparation contract.
- `seriesPresentationKey(mark) -> string`: reuse the existing axis grouping tuple of measurement identity, cluster identity, group identity, data-label identity, and axis assignment. Do not include display aliases or the current visual index. Expose the same key on generated series descriptors.
- `resolveOrderedKeys(availableKeys, configuredOrder) -> string[]`: output every currently available key exactly once; configured available keys first, remaining keys in source order. Do not mutate the stored order when some entries are absent.
- `resolveLegendEntries(descriptors, settings) -> { all, visible }`, where each descriptor/result carries `{ key, defaultLabel, label, visible }`: resolve aliases/visibility without changing the data or series collection. Composition legends use category identity; relationship legends use their existing grouping identity. Namespace entry keys by identity kind to avoid accidental reuse across incompatible types.

For first-time ordering of a chart with an authored positional palette, capture the current key-to-color assignments before changing the order. Preserve keyed overrides through filtering and playback. Resolve colors before visual reordering; unstyled series retain existing default/theme behavior. If #30 proves a need for per-category colors, extend this contract with a category-keyed equivalent in the same repair; do not add it speculatively.

The ECharts projection must keep internal entry tokens distinct from editable display labels. Use display formatting at legend/tooltip/accessibility boundaries as appropriate so identical user labels cannot merge entries or toggle the wrong series. Existing legend clicks that intentionally toggle plotted series may retain their current behavior; the new authoring **Show in legend** setting only changes membership in the legend. Preserve existing provenance-aware tooltip content when applying labels.

For mixed charts, calculate the existing mark type and axis assignment from the original semantic series before ordering. The current renderer's index-dependent fallback must not change a bar into a line merely because it moved in the list.

## Concrete regression selections

Add the following named cases in the listed files, combining assertions where they form one behavior. They are future tests, not tests claimed to exist or pass. Exact commands below select only this issue-repair work; extend the selected files when a concrete affected boundary warrants it.

| Slice | Test file and planned test title | Required assertions |
| --- | --- | --- |
| S1 | `tests/staticContentDraft.test.js`: `V3 #25 image-to-text drafts normalize supported interactions` | New/resumed type switches disable text zoom; finalization succeeds; supported image interaction and cancel/reset remain correct. |
| S2 | `tests/chartAuthoringComponentsV3.test.js`: `V3 #32 failed CSV creation retains a retryable source authority` | Fail the first persistence attempt, repair/revalidate destination, retry with the same bytes/source/mappings; one final chart/source, no orphaned owned draft. |
| S2 | `tests/chartCreateTransaction.test.js`: `V3 #32 destination proof and commit share the accepted structure revision` | Existing/new pending section paths agree; real deletion produces a recoverable destination choice; ambiguous completion reconciles without duplicate insertion. |
| S2 | `tests/anchoredStructureCommands.test.js`: `V3 #26 start-section splits at canonical placements` | Chart/gauge/text anchors move with successors, preceding placements remain, missing anchor does not create an empty section, cancel changes nothing. |
| S2 | `tests/chartAuthoringComponentsV3.test.js`: `V3 #18 destination edits preserve placement identity on save` | Cross-page and within-section moves use the selected insertion; chart/placement identities and references persist; cancel leaves the saved location intact. |
| S3 | `tests/authoringStage.test.js`: `V3 #21 text preview uses destination footprint dimensions` | Widths for 1–4 columns match the shared geometry; logical width does not derive from the editor column. |
| S3 | `tests/e2e/static-free-text.spec.js`: `V3 #21 #31 text editing stays usable while preview matches panel width` | Both screenshot viewport sizes; editable surface/toolbar/footer reachable; inline/final preview versus saved content width/wrapping; type-switch/save/reopen includes S1. |
| S4 | `tests/wizardDraftV3.test.js`: `V3 #17 cross-type changes preserve compatible partial and complete authoring` | Line↔Bar retains partial/complete mappings and settings; time-group membership survives compatible changes; same-type is idempotent; incompatible loss requires confirmation and cancel restores the draft. |
| S5 | `tests/chartAuthoringComponentsV3.test.js`: `V3 #23 absent KPI target stays absent while explicit zero remains` | Manual/dataset and clear-existing-target paths distinguish blank/absent from zero through prepared/rendered result. Reuse passing recent cases where they already establish part of this behavior. |
| S5 | `tests/chartRenderingV3.test.js`: `V3 #24 lower-is-favorable gauge status agrees with automatic colors` | Ascending scale; below/equal/above target; absent/zero targets; automatic reversal versus explicit colors; precision, fallback, collection, and semantic text agree. |
| S6 | `tests/e2e/v3-wizard-usability.spec.js`: `V3 #11 #16 #19 #28 #29 existing controls remain editable and persistent` | Incremental gauge range typing, crowded wrapped X labels, current-source categorical suggestions, reachable palette at bottom, Y minimum 40 and save/reopen. Use independently runnable cases under this shared prefix if a combined journey would become long or brittle. |
| S7 | `tests/categorySeriesPresentation.test.js`: `V3 #20 #28 labels order and colors follow stable identities` | Both independent orders, typed distinct keys, duplicate visible labels, missing/reappearing/new members, reset, color retention, and hidden legend entries with unchanged plotted data. |
| S7 | `tests/chartRenderingV3.test.js`: `V3 #20 #28 legend presentation and ordering preserve chart semantics` | Whole hide/restore retains entry settings; aliases and visibility project to supported legends; tooltip/provenance and mixed-axis mark assignments remain correct. |
| S7 | `tests/dashboardBundleV3.test.js`: `V3 #20 #28 presentation overrides survive package round-trip` | New optional settings persist; absent settings preserve old defaults; malformed fields rejected; compatible conversion retains valid settings. |
| S7 | `tests/chartRenderingV3.test.js`: `V3 #30 reported lifting-measures colors reach the rendered chart` | Use the identified report fixture and a contrasting support-measures fixture; pin the actual failed palette/category boundary before repairing it. |

Focused commands, run at the relevant slice rather than all at once:

```powershell
# S1
node --test --test-name-pattern='V3 #25' tests/staticContentDraft.test.js
# S2
node --test --test-name-pattern='V3 #(18|26|32)' tests/chartAuthoringComponentsV3.test.js tests/chartCreateTransaction.test.js tests/anchoredStructureCommands.test.js
# S3 deterministic geometry, then representative browser journey after dependencies pass
node --test --test-name-pattern='V3 #21' tests/authoringStage.test.js
pnpm.cmd test:e2e:dev -- tests/e2e/static-free-text.spec.js --project=chromium --grep 'V3 #21 #31'
# S4
node --test --test-name-pattern='V3 #17' tests/wizardDraftV3.test.js
# S5
node --test --test-name-pattern='V3 #(23|24)' tests/chartAuthoringComponentsV3.test.js tests/chartRenderingV3.test.js
# S6 existing-control journeys
pnpm.cmd test:e2e:dev -- tests/e2e/v3-wizard-usability.spec.js --project=chromium --grep 'V3 #11 #16 #19 #28 #29'
# S7
node --test --test-name-pattern='V3 #(20|30)' tests/categorySeriesPresentation.test.js tests/chartRenderingV3.test.js tests/dashboardBundleV3.test.js
```

These commands are a concrete starting selection, not a replacement for a changed boundary's existing regressions. Use the smallest existing conversion, form, persistence, or transaction cases alongside the new cases when that code changes. S2's destination/retry and split/move browser journeys and S7's actual-chart authoring journey remain required as specified in their slices; select their exact titles after the reproduction fixtures establish the journey. No broad browser sweep is implied.

## Verification and review budget

During implementation, run only the nearest deterministic cases while diagnosing. Add a durable regression for each confirmed defect or changed product behavior. At the final candidate, run each slice's complete task-specific selection once; rerun only affected checks after relevant corrections.

Example command form (substitute the exact new test titles from the slice):

```powershell
node --test --test-name-pattern='<exact affected titles>' tests/staticContentDraft.test.js
pnpm.cmd test:e2e:dev -- tests/e2e/static-free-text.spec.js --project=chromium --grep '<representative journey>'
```

Before a browser journey, validate the fixture's chart type, source identity, destination, and controls using the cheapest deterministic check. Fix setup/locator boundaries after two setup failures rather than repeating a long journey. Assert behavior and geometry; do not weaken product assertions to fit a fixture.

Use a scoped judgment review for transaction ownership (S2), gauge semantics (S5), and stable style/order identity (S7). Mechanical facts already pinned by deterministic checks do not need independent review. Following a bounded correction, review the affected finding/boundary only. These recommendations do not authorize this planning chat to spawn implementation agents.

Full `pnpm.cmd test`, `pnpm.cmd build`, and the repository's complete E2E gates remain deferred until the user explicitly declares a pre-merge/release boundary. Browser inspection of this planning baseline was not performed, and the focused results below are not a full gate.

## Review focus

1. A failed or ambiguous save must not lose staged source bytes or duplicate a placement (S2 transaction tests).
2. A move or split must use placement identity and the correct dashboard revision, including unsaved structure (S2 canonical fixtures).
3. Missing targets must remain distinguishable from real zero; lower-is-favorable status must agree with colors (S5 semantic cases).
4. Reordering, filtering, and playback must preserve data identity, axis binding, and associated styles (S7 render/persistence cases).
5. Narrow panel footprints must not make editing controls or validation inaccessible (S3/S6 browser geometry cases).

## Planning evidence

No production code was changed. The following focused existing tests ran once and all passed (8 tests total):

```powershell
node --test --test-name-pattern='target range parsing preserves|categorical filters expose|edit placement moves retain|manual role assignment omits|manual role assignment retains|compatible new-chart type changes retain|wrapped horizontal category labels|axis presentation renders X' tests/chartAuthoringComponentsV3.test.js tests/wizardDraftV3.test.js tests/chartRenderingV3.test.js
```

Read-only in-memory probes additionally showed:

- Fresh Text draft: `zoom.enabled=false`.
- Image draft changed to Text: `zoom.enabled=true` remained, incompatible with Text capabilities.
- Line draft with measurement mapping but incomplete remaining roles: reselecting Line changed its roles from the assigned measurement to `{}`.

The latter probes are diagnosis evidence, not newly added durable regression tests. The future implementation slices must add those tests. #26, #30, and the initial missing-destination failure in #32 remain hypotheses requiring the focused reproductions specified above.

## Completion criteria for the future implementation

- Every issue has an explicit disposition: repaired with evidence, already addressed locally with user-journey evidence, or still blocked on a named external reproduction/product decision. No issue silently drops from scope.
- All confirmed defects have corresponding regression coverage; every selected final task-specific check passes or has a clearly separated environment blocker.
- Confirmed product decisions above are honored; #22 remains explicitly deferred and does not block delivery of the 16 active issues.
- Changes are delivered to private main as requested, with authored data preserved and no public publishing side effects.
- User-facing closure identifies which fixes are present locally versus in a published artifact. Public issue closure/publication requires its own authorization and evidence.
