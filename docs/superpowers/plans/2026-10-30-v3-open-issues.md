# V3 Open Issues Implementation Plan

> **Status: completed locally on 30 October 2026.** Implemented and verified directly on private `main` under the proportional workflow policy. All 16 active issues have dispositions below; #22 remains explicitly deferred. No publication or remote reconciliation was performed.

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
- S5 / #23, #24: verified the existing optional KPI target repair (blank/clear remains absent; real zero remains a target), without replacing that implementation. Gauge authoring exposes higher/lower/neutral; one shared assessment now drives SVG, ECharts fallback and collection semantic status. Automatic colors reverse for lower-is-favorable while the numeric scale remains ascending. Neutral is non-evaluative. Resolved range colors are rendered exactly in both paths, including explicit colors equal to standard palette values; removed the SVG's positional recoloring. Fixed absent fallback gauge targets being formatted as zero.
  - `node --test --test-name-pattern='V3 #(23|24)|gauge|Gauge|precision|manual role assignment|every chart exposes only configuration' tests/chartRenderingV3.test.js tests/chartViewV3.test.js tests/chartFormModelV3.test.js tests/chartAuthoringComponentsV3.test.js tests/targetCollectionV3.test.js tests/dashboardBundleV3.test.js`: **29 passed, 0 failed**. Direction/precision regressions observed RED, then GREEN; existing semantic fixtures were updated to assert the added status/favorability fields and exact resolved colors. Includes below/equal/above, null/zero targets, neutral, 200 maximum, explicit colors, collections, and package round-trip.
  - `pnpm.cmd exec playwright test tests/e2e/manual-data-export.spec.js tests/e2e/v3-chart-creation.spec.js --project=chromium --grep 'V3 #(23|24)' --max-failures=1`: **3 passed (1.5m)**. Cleared KPI target and explicit zero both save/reload; lower-favorable gauge saves/reloads with green-low/red-high bands, 0→100 ascending bounds and matching status.
  - Scoped semantic review: equality is neutral/on-target; absent target has no assessment or marker; neutral values receive no favorable judgment. Custom range colors are preserved rather than inferred from visual position. No new persisted schema keys were introduced.
- S6 / #11, #16, #19, #28 overflow, #29: retained existing implementations after real-control verification. Incremental `50, 80, 100` typing/deletion, saved/reopened ranges, categorical X font/wrapping, scalar suggestions refreshed by column and source, primary Y 40–100, automatic reset and independent secondary bounds all work locally. Palette choices fit the dialog's existing scroll path and the final PDPC gradient choice applies correctly at 1117×766. Reproduced one remaining defect: Escape removed the palette without returning focus; it now restores the swatch.
  - `node --test --test-name-pattern='V3 #16 #29|target range parsing preserves|categorical filters expose|wrapped horizontal category labels|axis presentation renders X|color fields render' tests/chartAuthoringComponentsV3.test.js tests/chartRenderingV3.test.js`: **5 passed, 0 failed**. Data below bounds remains unchanged; primary/secondary bounds and automatic defaults remain independent.
  - Browser selection: `pnpm.cmd exec playwright test tests/e2e/v3-wizard-usability.spec.js --project=chromium --grep 'V3 #11 #16 #19 #28 #29'`: gauge typing passed **18.6s**; initial axis/filter fixtures needed resource timing capacity and native-select lookup corrections; palette focus regression observed RED.
  - After the focus fix and fixture corrections, axis, suggestions and palette passed **3/3 (37.9s)**. Expanded source/column refresh passed **12.9s**. Final palette selection/focus case (correctly pinning the last PDPC gradient midpoint) passed **1/1 (18.6s)**. Passing gauge and axis journeys were not repeated after unrelated fixture changes. All four independently runnable cases now have passing results.
  - #11/#16/#19/#29 are verified already addressed locally; #28 palette reachability verified with a bounded keyboard-focus repair. No broken axes, changed dataset values, replacement filter language or speculative overflow framework.
- S7 / #20, #28 ordering, #30: implemented the shared stable-identity presentation contract across strict validation/normalization, authoring, rendering, conversion and package boundaries. Whole-legend hiding retains settings; entry aliases and omission use distinct internal tokens, with no selected/deselected state or data removal. Independent keyboard category/series ordering retains dormant settings and original mark/axis bindings; source order remains the default. First ordering captures authored palette assignments atomically; keyed series colors remain editable. Category colors apply to the proven single-series bar case. Unstyled series retain theme colors by original source index when reordered.
  - #30 reproduction unblocked by the user's `C:/Users/hekma/Downloads/SimEx-dashboard-bundle-20261030.json` (SHA-256 `3bd6603cd76f61b4307a22a8cd4cf59d3501a9914c1508f2efa7b63a698d0430`). Extracted only the three reported charts, source CSVs, profiles and source-entry metadata into `tests/fixtures/v3-issue-30-charts.json`; did not promote the bundle or rewrite authored defaults. “Priorities of lifting measures” is horizontalBar, one `percentage` measurement against `easing_priority`, no grouping/pivot, five categories and five saved palette colors: `#043BCB,#36BDEB,#2BAA7B,#F1A1AD,#F59E0B`. Actual rendered series count is one, so changing Color 2 cannot recolor category 2. “Current support measures” is a line chart with four measurements against `wave` and four rows; its final-week comparison is horizontalBar with the same four measurements and one row. Both render four series and have no authored series palette. This evidence justified category-keyed overrides rather than a speculative palette rewrite.
  - `node --test tests/categorySeriesPresentation.test.js tests/chartConfigV3.test.js tests/chartFormModelV3.test.js tests/chartConversionV3.test.js tests/chartAuthoringComponentsV3.test.js tests/dashboardBundleV3.test.js`: final candidate **274 passed, 0 failed**. Covers strict inert records/arrays, malformed settings and unsupported families, dormant members, duplicate aliases, atomic palette capture, capability-aligned forms, independent axis edits, incompatible conversion warnings, and package round-trip.
  - `node --test --test-name-pattern='V3 #(20|28|30)|pivot|axis|bars|line|mixed|legend|pie|donut|scatter|bubble|relationship|composition|palette|series' tests/chartRenderingV3.test.js tests/chartDataPipelineV3.test.js`: final candidate **67 passed, 0 failed**. Includes actual #30 fixture/SVG colors, category/series independence, horizontal ordering, mixed mark/axis binding, missing/reappearing playback members, typed identities, provenance-aware tooltips and theme colors. New pivot identity probe reproduced distinct measurements colliding when their display aliases matched; consolidation now uses measurement-owned category identity. Source rows remain unchanged.
  - `pnpm.cmd exec playwright test tests/e2e/v3-series-presentation.spec.js --project=chromium --list`: **2 valid tests** after dashboard/source/destination preflight. `pnpm.cmd exec playwright test tests/e2e/v3-series-presentation.spec.js --project=chromium`: **2 passed (31.9s)**. Actual reported chart controls cover keyboard reorder, individual bar colors, series colors/order, duplicate legend aliases, individual omission, whole-legend hide/restore, reset-to-generated alias, save/reopen and reload; all plotted data remains. These passing journeys were not repeated after engine-only pivot/composition corrections covered deterministically.
  - Fresh whole-branch review, including committed S1–S6 and S7 working tree: two P2 composition regressions found, reproduced RED and corrected. Alias formatting now preserves wrapped category labels as literal text (including braces); grouped pie tooltips retain group context. Final affected review selection **11/11 passed**, bounded rereview complete, **no unresolved material findings**. No review-driven scope expansion.
- Guided QA follow-up, 3 November 2026 / S3 preview scrolling: reproduced the user's full-editor wheel trap over Rendered preview. The shared authoring viewport contained both scroll axes even in Fit mode, preventing vertical scroll chaining into the editor. Changed only its overscroll policy to retain horizontal containment and allow native vertical handoff. Oversized Actual previews still scroll internally before handing off at their boundary. No content, footprint geometry, data, zoom semantics or media-list behavior changed.
  - `pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --grep 'full text editor scrolls through rendered preview boundaries'`: **1 passed (14.4s; case 10.0s)**. Regression observed RED with the fitted preview leaving editor scroll position unchanged. Final journey checks Fit and Actual boundary handoff, then internal scrolling and boundary handoff for a three-row Actual preview. Intermediate fixture corrections wait for save completion, allow native wheel animation to settle, and select height by explicit option value (the label `3` denotes three eighth-row steps rather than three rows). A minimal native Chromium probe isolated scroll chaining/clipping before further journey attempts; product scroll assertions were retained. No passing unrelated journey or full gate was repeated.
  - Scoped review: vertical-only CSS policy correction; native overflow and horizontal containment remain intact. Local preview on port 5190 restarted and verified HTTP 200 with the corrected stylesheet; browser content was not replaced or reset.
- Guided QA follow-up, 4 November 2026 / S2 #26: clicked “Start section here” in the user's embedded browser and reproduced the menu closing without a prompt. Replaced native prompts with the existing Build creation dialog, extended only for split context and optional subtext. The existing canonical split command, placement identities, layout save/discard owner and stale-anchor protection remain authoritative. Cancel/Escape restores focus to the panel control; confirmation selects the new section. A stable section ID is retained for the dialog operation.
  - `pnpm.cmd exec playwright test tests/e2e/v3-anchored-structure-commands.spec.js --project=chromium --grep 'V3 #26 start-section works without native prompts'`: **1 passed (23.2s; case 18.4s)** after RED with native prompts unavailable. Checks initial focus, cancellation without layout changes, reset on reopen, required name, optional subtext, canonical split identities/order, zero native-prompt calls, save and reload.
  - `node --test --test-name-pattern='layout creation dialog|Move dialogs trap' tests/buildStructureRail.test.js`: **2 passed, 0 failed**. Existing ordinary creation and focus-trap contracts retained.
  - User confirmed **S2A passed**, then reported light text on white name/subtext fields in dark mode. Reproduced **1.099:1** input contrast; scoped Build-dialog control paint now uses existing surface/text/border tokens. `pnpm.cmd exec playwright test tests/e2e/v3-anchored-structure-commands.spec.js --project=chromium --grep 'V3 #26 section dialog fields remain readable'`: **1 passed (17.1s; case 12.6s)**, checking both fields at **at least 4.5:1** in dark and light modes. No unrelated passing journey or full gate rerun.
  - Guided acceptance: user confirmed **S1, S2A, S2B and S2C passed**. Observed S2C in a separate visible browser tab: created `QA S2C CSV destination` without saving layout separately, uploaded `qa-s2c.csv` with three dated values (10, 20, 15), mapped and created `QA S2C CSV proof`, then reloaded. The chart and section persisted exactly once and the rendered values matched. No storage failure was forced in this visible run; failure/retry coverage remains the earlier automated #32 regression. #22 remains deferred. Existing planning-chat additions are preserved separately; these acceptance-only updates have no separate status commit.
  - S3 visible observation: created `QA S3 Text preview` in the saved QA section. Compared one-column (198.25 px) and four-column (841 px) logical footprints; the writer remained 1061 px wide in both. With a two-row footprint, Fit scaled the panel to 0.672 and Actual used 1.0 while preserving logical text width and wrapping. Inline preview, final preview, saved panel and reopened preview all had 775 px logical text width and the same four-line paragraph at four columns. Reloaded and reopened the full editor; exact text and sizing were retained. Full editor left open for inspection. S3 user confirmation and S4–S7 guided checks remain pending.
- S3 Fit correction, 4 November 2026: user rejected the arbitrary height constraint and authorized removing it. Text/Image inline and final previews now fit to measured available width, with the editor owning vertical scrolling. Removed the 46%-of-window height constraint, initial 600 px height fallback and viewport max-height from their shared `AuthoringFootprintFrame`. Actual remains at 1:1; Fit never enlarges and still scales an over-wide panel as a whole, preserving logical text width and wrapping. Width measurement uses primitive state so height changes do not cause measurement/rerender loops.
  - New tall-panel regression observed RED at scale **0.349**, then GREEN at **1**. `node --test tests/authoringStage.test.js tests/staticContentEditor.test.js`: **28 passed, 0 failed**.
  - `pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --grep 'full text editor fits width without a height cap'`: **1 passed (17.4s; case 11.2s)**. Updated the earlier scroll journey for the accepted editor-owned vertical scrolling contract. Covers tall fitting panels at 100%, no max-height, native editor scrolling/footer access, a genuinely over-wide panel scaling to available width, Actual horizontal inspection, and identical inline/final logical text width and wrapping.
  - Restarted port 5190 and inspected the saved QA text panel in a fresh visible tab. Its current 229×852 px footprint stays at **100%** in Fit, with an 852 px preview and computed max-height `none`; fixed footer remains visible. User's saved panel settings/content were retained. Human S3 acceptance remains pending; no full repository/release gate was run.
- S3 Fit expansion and labels, 4 November 2026: user explicitly changed the static-preview Fit contract to enlarge smaller panels as well as shrink wider ones until the panel fills the available preview width. This supersedes the earlier no-enlargement rule for Text/Image previews. The shared scale helper now permits explicit upscaling; `AuthoringFootprintFrame` opts in without imposing a height cap. Whole-panel scaling retains dashboard dimensions and text wrapping. Grouped and renamed the adjacent controls to **Fit to preview area** and **Actual size on dashboard** in both inline and final static previews. Updated their affected browser locators.
  - New scale regression observed RED (**1 instead of 5**), then GREEN. `node --test tests/authoringStage.test.js tests/staticContentEditor.test.js`: **29 passed, 0 failed**, including enlargement, reduction, literal Actual scale and exact labels.
  - `pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --grep 'full text editor fits preview area up or down'`: **1 passed (24.4s; case 18.1s)**. Covers adjacent controls, filling the width at a scale above 1, tall preview/editor scrolling and footer access, reducing genuinely over-wide panels, Actual scale 1, horizontal inspection and identical logical wrapping in inline/final previews.
  - Restarted port 5190 and inspected the current QA panel in a visible editor. Its 229 px width scales by **4.563** to **1044.927 px** in a **1045 px** preview. Both controls occupy the same row with a **4 px** gap. Saved content and footprint remain intact; no full repository/release gate was run.
- Guided acceptance, 4 November 2026: user confirmed **S3 passed**. Demonstrated S4 on the existing QA CSV chart in a new visible tab: Line -> Bar retained date/value roles and the uploaded source; Bar -> Line retained those roles, the edited title `QA S4 conversion proof`, title size 22 and vertical legend. Scatter displayed the explicit loss warning for Measurements and Observation; Keep current type retained Line and both mappings. Saved and reloaded the proof, then reopened Configure and verified the title, size 22 and vertical legend. Human S4 acceptance remains pending. No production code changed or deterministic checks rerun for this guided observation.
- Guided acceptance continued, 4 November 2026: user confirmed **S4 passed**. Demonstrated S5 in a new visible tab. Created `QA S5 KPI — no target` with value 20, entered target 50 then cleared it, and saved without a target comparison. Created `QA S5 Gauge — lower is favorable` with actual 20 and target 50: green/amber/red bands retained ascending 0-to-100 bounds and on-track/below-target assessment. Temporarily changed actual to 80 and observed above-target assessment, then restored 20. Saved and reloaded both panels; target-free KPI still displayed 20 without comparison and gauge retained actual 20, target 50, ascending bounds and on-track assessment. Human S5 acceptance remains pending. Explicit-zero KPI behavior remains covered by the previously passing durable browser check, rather than this live demonstration. No production code changed or passing deterministic checks rerun.
- Guided acceptance continued / S6, 4 November 2026: user confirmed **S5 passed**. In a fresh visible tab, reopened the QA gauge, cleared and typed `50, 80, 100` character by character, checking each intermediate string, then deleted/retyped the last zero; all text remained editable. Final settings matched the saved gauge, so closed without changing it. Created `QA S6 Controls proof` from an isolated six-row CSV with long categories and a separate region column. Category suggestions matched all six names, numeric column had zero suggestions, region suggestions were North/South/East. Removed the demonstration filter before saving. Set X tick font 10, wrapping enabled, width 8 em, and ordinary primary Y minimum 40 / maximum 100. Reached the final PDPC gradient choice, applied #36BDEB, and verified Escape returned focus to Open Color 1 color options. Saved/reloaded/reopened: all six settings retained; clearing minimum retained maximum 100, and clearing both allowed automatic bounds before restoring 40/100. Left the editor showing bounds and rendered chart. Human S6 acceptance remains pending. Source-change refresh and independent secondary bounds remain covered by prior durable checks rather than this live demonstration. No production code or passing deterministic checks were changed/rerun.
- S6/S7 gradient follow-up, 4 November 2026: user clarified that selecting a gradient must color separate bars, then explicitly selected **across displayed bar order**, evenly from first color to last. Reproduced the old midpoint-only selection in ColorField and the live S6 QA chart. Single-series categorical bar controls now apply all gradient stops through evenly interpolated, category-keyed colors in one existing owner update; no new persisted schema or renderer was added. Applies from the series palette and per-bar color pickers. Assignments follow current configured category order at application time, remain attached through reordering/filtering, and retain dormant entries; reapplying uses the new order. Reset bar colors clears the explicit assignments. Solid-color contexts now label the old midpoint behavior Gradient samples.
  - Regression RED: missing gradient operation and missing palette category metadata; corrected a frozen-test-fixture setup error before observing the product failure. Final deterministic selection: `node --test tests/categorySeriesPresentation.test.js` **3 passed**; `node --test --test-name-pattern='bar gradient|series palette fields|presentation controls match|presentation overrides survive' tests/chartAuthoringComponentsV3.test.js tests/chartFormModelV3.test.js tests/chartRenderingV3.test.js tests/dashboardBundleV3.test.js` **5 passed**. Covers endpoints/intermediate RGB stops, one/zero bars, current order rather than value ranking, atomic form updates/reset, detached authored inputs, bar/horizontal rendering and filtering/reordering, supported form capabilities, and the existing package round-trip.
  - `pnpm.cmd exec playwright test tests/e2e/v3-wizard-usability.spec.js --project=chromium --grep 'palette reachability and gradients across bars' --max-failures=1`: **1 passed (28.2s; case 23.1s)**. Confirms last palette entry, focus restoration, six distinct actual rendered bar colors, saved keyed assignments and reload/reopen. First run passed the rendering assertions but reloaded onto the fixture Scenario page; corrected the journey to navigate back to Biomedical before reopening, without changing assertions or production code.
  - Restarted port 5190 and applied PDPC to the existing QA S6 chart in a visible tab. Six saved colors: #08224A, #0536B1, #2289DE, #32B5BE, #53A885, #F1A1AD. Cleared that QA chart's test minimum of 40 so its value-20 first bar is visible; saved/reopened with all six colors. Scoped review retained the existing category identity, precedence and package contracts. No full repository/release gate or publication; #22 remains deferred. Human S6 acceptance remains pending after this correction.
- S6/S7 annotated color-picker follow-up, 4 November 2026: reproduced the reported repeat-selection failure on the QA chart. The toggle still changed state, but the unanchored absolute palette used the outer dialog coordinates after field scrolling; live reproduction placed it below the viewport. A durable browser geometry check observed RED at **1,189 px** between the swatch bottom and reopened palette (after correcting the test locator from Open to Close when expanded). Full-wizard palettes now remain in their field's scroll layout, bounded by its width. Added conditional help explaining that individual bar colors override series colors and that Reset bar colors restores series coloring; retained both controls and the existing precedence.
  - `pnpm.cmd exec playwright test tests/e2e/v3-wizard-usability.spec.js --project=chromium --grep 'repeated series and bar color selection|palette reachability and gradients across bars' --max-failures=1`: **2 passed (26.5s; cases 15.3s and 6.4s)**. Repeated open/close and multiple selections work in both series and per-bar pickers, geometry remains next to its swatch, Escape restores focus, and the saved gradient journey remains passing. No broad repository gate was run.
  - Restarted port 5190. In a fresh diagnostic tab, selected two successive series colors, closed/reopened the corrected picker, restored the default series setting, and verified Save changes was disabled. The saved six bar colors and source remain unchanged. Left the corrected picker open with the new precedence explanation. S6 human acceptance remains pending; #22 remains deferred; no publishing or remote changes.
- Color-control labeling follow-up, 4 November 2026: user confirmed the gradient worked from the palette, then requested clearer labels and short hover explanations for palette defaults versus named overrides and individual bars. Relabeled the groups Default series palette, Named series overrides, and Individual bar colors; inputs now distinguish Palette color N from Series override: name. Added concise precedence tooltips to all three headings using the existing ControlTooltip, with help indicators, keyboard focus support and left alignment inside the editor. No color-selection, precedence, storage or rendering semantics changed. Updated proven affected browser/SSR label consumers.
  - `node --test --test-name-pattern='bar gradient selection|series palette fields' tests/chartAuthoringComponentsV3.test.js`: **2 passed**. `pnpm.cmd exec playwright test tests/e2e/v3-wizard-usability.spec.js --project=chromium --grep 'repeated series and bar color selection|palette reachability and gradients across bars' --max-failures=1`: **2 passed (39.1s; cases 25.4s and 7.2s)**, including hover/show/hide on all three heading explanations and keyboard focus on palette help. No separate tests for label prose or broad gate were added/run.
  - Restarted port 5190 and inspected the updated QA full editor in a fresh tab, leaving the Named series overrides explanation visible. Existing user dashboard content and chart color settings were retained. S6 human acceptance remains pending; #22 remains deferred; no publication or remote changes.
- Gradient legend follow-up, 4 November 2026: user requested the legend display the bars' gradient instead of the solid series fallback. Reproduced with the renderer: custom legend entries remained plain names and the fallback was inherited despite explicit bar colors. The final presentation now derives the single-series categorical bar/horizontal-bar swatch from resolved displayed bar colors after theme resolution. Multiple colors produce a horizontal gradient, with a minimum 32 px key for readability; uniform/one remaining bar uses its actual solid color. Partial overrides include the resolved series/theme fallback, while resetting all bar colors restores ordinary legend inheritance. No new persisted fields; chart/source/package content remains unchanged. Existing legend names/tokens, aliases, hidden membership, whole-legend visibility, series paint and data remain intact.
  - New render regressions observed RED before implementation. Final `node --test --test-name-pattern='bar legend|legend presentation and ordering|bar gradient colors' tests/chartRenderingV3.test.js`: **4 passed**. Covers actual ECharts SVG gradient output, conflicting named fallback, bar/horizontal orientations, reordering, filtering, aliases, hidden entries/legend, partial/theme colors, uniform/reset states and unchanged data/source options.
  - `pnpm.cmd exec playwright test tests/e2e/v3-wizard-usability.spec.js --project=chromium --grep 'palette reachability and gradients across bars' --max-failures=1`: final candidate **1 passed (37.7s; case 31.3s)**. The chart uses six graduated bar colors with a deliberately conflicting white named-series override; the live engine legend receives the same six gradient colors before and after reload. The affected journey was rerun after widening the gradient key; no unrelated passing journey or broad gate was rerun.
  - Restarted port 5190, reopened the existing QA S6 full editor and inspected the matching gradient legend at Actual size without changing authored chart settings. S6 human acceptance remains pending; #22 remains deferred; no publication or remote changes.
- Local slice history before S7: S1 `c6495e5a`; S2 `c1b79cc1`; S3 `2afb46bb`; S4 `b0061707`; S5 `1417052b`; S6 `98bd76ae`; S7 `26a25c62`. The guided-QA corrections include their directly corresponding regressions and execution records.
- Delivery boundary: targeted development checks and representative journeys passed as recorded above. No full repository suite, complete build, release/package-browser gate or public deployment acceptance was run or claimed. No remaining implementation blocker. The planning steward was not contacted: the user's condition requires a public merge/push first, while this task explicitly prohibits publication.
- #22: **deferred by user**, no catalogue/listing/eligibility changes authorized.

### Final issue dispositions

| Issue | Local disposition | Slice |
| --- | --- | --- |
| #11 | Existing gauge range typing verified through save/reopen. | S6 |
| #16 | Existing categorical-label font/wrapping controls verified. | S6 |
| #17 | Repaired draft conversion retention and warnings before incompatible losses. | S4 |
| #18 | Existing full-editor destination/move verified with canonical identity retained. | S2 |
| #19 | Existing scalar categorical suggestions and source refresh verified. | S6 |
| #20 | Added entry aliases and individual omission alongside whole-legend visibility; plotted data retained. | S7 |
| #21 | Repaired destination-width text preview and wrapping. | S3 |
| #22 | **Explicitly deferred; no media-list changes.** | Deferred |
| #23 | Existing absent-versus-zero target repair verified through save/reload/export contract. | S5 |
| #24 | Added favorable-direction authoring/assessment and consistent automatic colors on ascending scales. | S5 |
| #25 | Repaired stale image zoom capabilities surviving conversion to Text. | S1 |
| #26 | Repaired Start section here through canonical Build layout transactions. | S2 |
| #28 | Added independent category/series order; verified reachable palette and repaired Escape focus return. | S6, S7 |
| #29 | Existing ordinary Y minimum/maximum, reset and independent secondary controls verified. | S6 |
| #30 | Reproduced actual one-series/four-series distinction; added stable per-category bar colors. | S7 |
| #31 | Repaired usable writer geometry independent of preview footprint. | S3 |
| #32 | Repaired pending-layout persistence boundary and CSV retry ownership; real failure/retry preserves one chart/source. | S2 |

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

- [x] Verify the recent manual-data repair against #23: no target binding and an empty optional target render no target label. Explicit numeric zero remains a real target. Clearing an existing optional target removes its binding. Check both manual and dataset-backed KPIs.
- [x] If those paths already pass end to end, retain the existing implementation and classify #23 as locally addressed pending published-version confirmation.
- [x] Expose the already-supported `presentation.targets.direction` for gauges with `increase-is-good`, `decrease-is-good`, and `neutral`. An absent setting retains the prior higher-is-favorable gauge behavior; selecting lower-is-favorable does not reverse the numeric scale.
- [x] Carry direction to automatic status-band colors and target assessment in both the precision SVG gauge and ECharts fallback, including collection items and semantic descriptions. Fix the index-based standard-color remapping if it would undo inversion.
- [x] Preserve explicit authored range colors. Define neutral output without calling higher/lower values good or bad. Test below, equal, and above target, absent target, explicit zero, and non-100 range maxima.
- [x] Confirm export/import retains the optional target and direction; no fabricated target and no unsupported schema keys.

**Exit:** KPI target absence remains absence throughout the pipeline. Gauge colors and status communicate the selected favorable direction consistently.

## S6 — Verify existing controls and repair bounded usability gaps (#11, #16, #19, #28 overflow, #29)

**Primary files if a defect is demonstrated:** `src/components/chart-authoring/StandardField.jsx`, `src/charting/forms/formModel.js`, `src/charting/rendering/axisPresentation.js`, `src/components/ColorField.jsx`, `src/components/chart-authoring/SeriesColorsField.jsx`, `src/styles.css`, and only affected dialog styles.

**Tests:** `tests/chartAuthoringComponentsV3.test.js`, `tests/chartRenderingV3.test.js`, `tests/chartFormModelV3.test.js`; focused journeys within `tests/e2e/v3-wizard-usability.spec.js` or `tests/e2e/chart-authoring-v3.spec.js`.

- [x] Type `50, 80, 100` incrementally in the actual gauge control; ensure comma, spaces, deletion, and completion survive rerenders. Validate final values and save/reopen. The passing parser test alone is insufficient for a controlled-input defect.
- [x] Confirm categorical X-axis font size and wrapping are discoverable and persisted. Exercise long labels and many categories at a narrow panel width; keep labels distinguishable without clipping. Preserve numerical and temporal axis behavior.
- [x] Verify scalar categorical filters offer deduplicated values from the current source, refresh on source/column changes, and retain valid manually entered values. Clarify or repair discoverability if native datalist behavior hides the existing feature. Keep numeric/range operators unchanged.
- [x] Constrain color options to the available viewport/dialog scroll area; keep the last palette choice and dismiss controls reachable. Preserve focus and prevent overlay/footer clipping at laptop sizes.
- [x] Verify primary Y min=40/max=100 on the percentage fixture in preview and saved chart, secondary axes independently, and reset to automatic bounds. Leave a user's existing maximum untouched when only the minimum is edited. Ensure clipped points do not leak beyond the plot. Do not alter dataset values or globally rewrite chart defaults.
- [x] Run one focused deterministic selection for changed behavior and only the representative browser checks needed to establish the actual controls work.

**Exit:** Each existing-capability issue has a demonstrated user journey or a concrete residual fix; no redundant feature framework is added.

## S7 — Make series labels, ordering, and colors coherent (#20, #28 ordering, #30)

**Primary files:** `src/charting/data/prepareAxisData.js`, `src/charting/rendering/axisAdapter.js`, `src/charting/forms/formModel.js`, `src/components/chart-authoring/RoleField.jsx`, `src/components/chart-authoring/SeriesColorsField.jsx`, `src/charting/config/chartConfigV3.js`; adjust conversion preservation only for settings actually added.

**Shared consumers:** `src/components/chart-authoring/SchemaField.jsx` for form-control dispatch, `src/charting/presentation/seriesStyleContract.js`, `src/charting/rendering/compositionAdapter.js`, `src/charting/rendering/relationshipAdapter.js`, and `src/components/charts/EChartsChartView.jsx` where label/tooltip projection requires it. Per-entry legend controls apply to these existing legend-bearing families; category/series ordering is scoped to Cartesian category charts for #28.

**New focused modules:** `src/charting/presentation/categorySeriesPresentation.js` for stable keys, ordering, and legend projections; `src/components/chart-authoring/CategorySeriesPresentationFields.jsx` for the ordered lists and per-entry controls; `tests/categorySeriesPresentation.test.js` for their shared pure contract.

**Tests:** `tests/chartRenderingV3.test.js`, `tests/chartFormModelV3.test.js`, `tests/chartConfigV3.test.js`, `tests/chartConversionV3.test.js`, `tests/dashboardBundleV3.test.js`; one affected chart authoring journey.

- [x] Obtain/identify the reporter's “priorities of lifting measures” chart and the comparison “current support measures” chart. Record actual type, mappings, pivot/grouping, saved palette, and rendered series count. This evidence decides whether the bug is a lost palette, an overriding style, or a request for per-category colors on one series.
- [x] Retain whole-legend visibility and add per-entry display-name editing and a **Show in legend** toggle. Omit hidden entries from the legend without using ECharts' selected/deselected-series state, deleting series/data, or changing totals. Resetting a name restores the generated label. Whole-legend hiding must retain all per-entry settings for later restoration. Do not rename source CSV columns.
- [x] Provide two independent keyboard-accessible ordered lists: **Category order** and **Series order**. Support Move up/Move down and Reset to source order; drag-and-drop is optional polish. Category order applies to the categorical dimension, including the physical Y axis of horizontal bars; do not manually reorder true time/numeric axes.
- [x] Define stable category/series keys separately from display labels; retain source order by default; retain explicit order when filtering or playback temporarily removes members; append previously unseen members deterministically without deleting their data. Display unavailable configured entries clearly without dropping their stored settings.
- [x] Use the same resolved order for bars/lines, legend, tooltip, and colors. Keep measurement-to-axis binding stable, especially for mixed charts. A reorder must not silently change mark type or move data to the secondary axis.
- [x] Repair #30 at the proven boundary. If per-category styling is required, author and persist it by stable category identity; do not pretend that editing a second series color can affect a chart with only one series. Retain the existing series palette for its current purpose.
- [x] Implement the presentation contract below across validation, normalization, form generation, rendering, conversion, and package round-trip in one coherent change. Extend `seriesStyleContract.js` rather than bypassing its capability/known-key checks.
- [x] Verify the actual reported fixtures, order changes, filter/playback changes, saved/reopened configuration, and chart-type conversion preserve intended labels and styling.

**Exit:** Users can express the confirmed label/order/color choices without changing data, and the choices remain consistent across preview, save/reload, playback, and export.

### S7 presentation contract

These are engineering decisions for the implementation, based on the confirmed behavior. Extend the current optional presentation shape without rewriting existing charts or adding a legacy version path.

| Persisted setting | Contract |
| --- | --- |
| `presentation.axes.x.categoryOrder` | Optional array of unique category keys, only for a categorical observation dimension. The logical `x` dimension remains the owner for horizontal charts. Absent means source order. |
| `presentation.series.order` | Optional array of unique series keys, supported by Cartesian category charts. Absent means source order. The form capability and series-style validator must agree. |
| `presentation.series.overrides` | Optional record keyed by series identity, with `{ color?: '#RRGGBB' }` entries. Used to preserve explicit styling when series are reordered. Retain `series.colors` as the legacy/default palette input; an explicit keyed override wins. Do not reassign existing authored colors by the new visual index. |
| `presentation.series.categoryOverrides` | Optional category-keyed record with `{ color?: '#RRGGBB' }` entries, justified by the actual #30 reproduction. Applies to individual bars on single-series categorical bar charts. Retain dormant entries and preserve provenance paint; category overrides take precedence over the series/default palette. |
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

## Completion criteria

- Every issue has an explicit disposition: repaired with evidence, already addressed locally with user-journey evidence, or still blocked on a named external reproduction/product decision. No issue silently drops from scope.
- All confirmed defects have corresponding regression coverage; every selected final task-specific check passes or has a clearly separated environment blocker.
- Confirmed product decisions above are honored; #22 remains explicitly deferred and does not block delivery of the 16 active issues.
- Changes are delivered to private main as requested, with authored data preserved and no public publishing side effects.
- User-facing closure identifies which fixes are present locally versus in a published artifact. Public issue closure/publication requires its own authorization and evidence.
