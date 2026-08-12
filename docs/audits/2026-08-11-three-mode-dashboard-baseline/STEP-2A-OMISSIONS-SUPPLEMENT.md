# Step 2A omissions supplement — Chart creation and current temporal behavior

- **Audit date:** 2026-08-12
- **Scope:** bounded supplement to the accepted Three-Mode Dashboard Step 2 visual baseline
- **Runtime evidence origin:** this worktree served by Vite at `http://127.0.0.1:4187/`
- **Status:** evidence sufficient for user review; **not accepted**
- **Authority boundary:** the accepted baseline remains valid. This supplement neither re-scores it nor starts Step 3A, Step 4, or production implementation.

## 1. Scope and method

This supplement closes two evidence omissions identified by the approved temporal addendum:

1. the current **Add chart** wizard, exercised from entry through a successful creation and through cancellation; and
2. the current time-group, synchronized-playback, temporal-provenance, and Present integration behavior compared with the future requirements in `2026-08-12-temporal-authoring-chrono-design.md`.

It deliberately does **not** repeat the accepted View/Build geometry measurements, selected-panel occlusion matrix, 16:9 Present/Audience layouts, or presentation lifecycle findings. Those remain authoritative in the six accepted baseline documents. Six new Step 2A runtime screenshots were captured only for previously undocumented wizard and View playback states.

The approved temporal addendum is treated only as a future requirement source. A feature described there is never presented as current behavior unless the runtime observation or current implementation independently establishes it.

### Evidence labels

| Label | Meaning in this supplement |
|---|---|
| **Observed** | Exercised in the current product runtime or directly visible in one of the supplied Step 2A screenshots. |
| **Source-confirmed** | Established from the current implementation, but not necessarily live-exercised in this supplement. |
| **Inferred** | A bounded consequence of observed and/or source-confirmed evidence. |
| **Absent** | No current UI, model field, or implementation path was found in the inspected scope. This label is not used for a merely unexercised state. |
| **Partial** | Used only in the temporal delta matrix where a current behavior is an incomplete analogue of the approved future requirement. |

### Evidence reviewed

- **Observed:** all six accepted baseline documents and the six newly captured Step 2A runtime screenshots were inspected.
- **Source-confirmed:** wizard behavior was traced through `ChartWizardV3`, `ChartTypePicker`, `DataSourceStep`, `DataRolesStep`, `StyleLayoutStep`, `ChartPreview`, `ModalFocusScope`, `wizardDraft`, `formModel`, `chartConfigV3`, `BuildWorkspace`, `DashboardRenderer`, `App`, and the dashboard bundle integration path.
- **Source-confirmed:** temporal behavior was traced through the Build time-group rail/inspector, chart-level time-sync settings, `timeSyncModel`, `temporalMatch`, `applyTimeContext`, playback controls/provider/reducer/view, provenance rendering, Present, Audience, and display-state code.
- **Observed:** both disposable charts created during the walkthrough were removed through the product UI after observation. No retained dashboard mutation is evidence for this document.

## 2. Create-chart wizard walkthrough and state matrix

### End-to-end walkthrough

1. **Entry and target capture.** **Observed:** `Add chart` is visible in the Build command area. Opening it dims the dashboard and disables mode, page, and Build controls behind an aria-modal surface. **Source-confirmed:** the destination is captured as the selected section when a section is selected, otherwise the first section of the active page; if either page or section is missing, the command does not open (`src/components/build/BuildWorkspace.jsx:132-141`, `src/components/DashboardRenderer.jsx:622-629`).
2. **Chart type.** **Observed:** the searchable catalogue was recorded as 26 visible types grouped under Comparison, Trends, Composition, Targets/status, Relationships, Readiness, Timeline, Geography, and Operational content. **Source-confirmed:** the picker is generated from the 26-definition schema registry; its accessible card name includes the chart description even though the visible card shows the icon and label (`src/components/chart-authoring/ChartTypePicker.jsx:11-49`, `src/charting/schemas/chartSchemaRegistry.js:20-26`). Selecting a type advances immediately to Data source.
3. **Data source.** **Observed:** directly navigating here without a selected type leaves source controls disabled and shows `Before this step` / `Choose a chart type.` The representative success selected existing source `bio_cases`, which showed 177 rows, five detected columns, detected types, and examples. **Source-confirmed:** supported source paths are an existing loaded dataset, a CSV upload, schema-authorized manual data, and—for geography schemas—a validated GeoJSON selection. CSV input is limited to 2 MiB and 50,000 parsed rows (`src/components/chart-authoring/DataSourceStep.jsx:27-83`, `src/components/chart-authoring/ChartWizardV3.jsx:850-890`).
4. **Data roles.** **Observed:** the Line success used measurement `national_total_cases` and Observation/X-axis `date`. The exercised surface exposed multi-measure assignment to primary or secondary axes, Observation/X-axis, Cluster, Label, Filters, Grouping, and Sum/Mean/Min/Max/Count/First/Last. Gap/Zero/Drop was not seen in the exercised scroll path. **Source-confirmed:** role controls are schema- and detected-type-driven, and schemas that declare the missing-value transform receive Gap/Zero/Drop options (`src/charting/forms/formModel.js:198-307`, `src/charting/forms/formModel.js:569-612`). This is an observed-coverage limitation, not a global absence.
5. **Style and layout.** **Observed:** the ready Line path showed a live preview, required title, description visibility, alignment, background/transparency/contrast, series colours, line width, reference line, labels, primary/secondary axes, Zoom, range selector, and Playback group controls. **Source-confirmed:** the exact fields remain schema-dependent. Despite the step name, panel `layout.size` has no wizard control and remains the hidden `standard` default (`src/charting/config/chartConfigV3.js:559-597`).
6. **Validation and create.** **Observed:** `Create chart` stayed disabled until the required title and chart data were valid. **Source-confirmed:** creation requires a valid normalized V3 chart and a correlated renderer-ready preview with at least one mark; proposed time groups and manual data are also validated. Submission marks the modal busy/inert and changes the accessible action name to `Creating chart` (`src/charting/forms/formModel.js:31-91`, `src/components/chart-authoring/ChartWizardV3.jsx:453-465`, `src/components/chart-authoring/ChartWizardV3.jsx:630-667`).
7. **Persistence and placement.** **Observed:** the successful Biomedical chart was appended to the end of the active `Outbreak dynamics` section. From initial `scrollY = 0` its panel began around document `y = 4776`; after scrolling to `y = 4300`, it was visible at approximately `x = 329`, `y = 476`, `w = 347.5`, `h = 418`. It appeared in Structure and opened the separate chart editor when selected; focus after the Structure selection was `BODY`. **Source-confirmed:** creation flushes pending text edits, atomically adds any new source/time-group proposal and appends the chart to the captured section, validates the dashboard, and persists through the serialized commit/local-storage path (`src/components/DashboardRenderer.jsx:856-875`, `src/charting/config/dashboardBundleV3.js:399-425`, `src/App.jsx:256-304`, `src/App.jsx:388-397`).
8. **Cancellation.** **Observed:** after choosing Bar and `bio_cases`, Close opened the nested `Discard chart?` confirmation with `Your unfinished chart and its settings will be lost.` `Continue editing` held initial focus; `Discard` closed the wizard without creation. **Source-confirmed:** Close and root Escape always request this confirmation, including an otherwise untouched wizard; the backdrop itself has no close action, and a discarded draft cannot be resumed (`src/components/chart-authoring/ChartWizardV3.jsx:124-159`, `src/components/chart-authoring/ChartWizardV3.jsx:671-682`).

### State and transition matrix

| State / trigger | Current visible and interaction behavior | Gate, retention, or outcome | Evidence |
|---|---|---|---|
| Build, wizard closed | `Add chart` is a visible Build command. | Captures selected section or active page's first section; missing destination prevents opening. | **Observed + Source-confirmed** |
| Wizard opens | Four directly activatable steps: Chart type, Data source, Data roles, Style and layout. Background dashboard is dimmed and inoperative. | New open resets to a fresh Chart type draft and focuses the active step. | **Observed + Source-confirmed** |
| Chart-type search empty result | Search matches label, description, or purpose group. | `No chart types match this search.` is an explicit status. | **Source-confirmed** |
| Navigate ahead without prerequisites | Step buttons and Next permit navigation; the destination explains missing prerequisites. On Data source, controls are disabled before type selection. | Previous/Next are disabled only at sequence boundaries; `Create chart` remains gated separately. | **Observed + Source-confirmed** |
| Select or change chart type | Selection advances to Data source. | Changing type creates a new type draft, preserves the draft ID, clears source/roles/settings, and removes prior playback membership. | **Observed** for selection; **Source-confirmed** for reset semantics |
| Existing source selected | Profile shows row/column counts, detected types, examples, temporal warnings, and source actions. | Compatible source changes retain mappings. | **Observed + Source-confirmed** |
| Incompatible source change | Current mappings are not silently retained. | Confirmation names how many roles and filters will be cleared; confirmation clears roles, filters, and grouping. | **Source-confirmed**; not live-exercised |
| CSV upload | Native `.csv,text/csv` picker; inline upload error path. | File text is retained in the dashboard source; oversize/parse errors remain in the step. No explicit upload-in-progress state exists. | **Source-confirmed**; upload not performed |
| Manual data | Offered only to schemas that authorize it; validation errors remain in-step. | Row/field requirements and limits are schema-driven. | **Source-confirmed**; not live-exercised |
| No detected variables | Profile area reports `No columns were detected.` | Roles cannot become valid until a usable profile exists. | **Source-confirmed** |
| Required roles incomplete | Role choices are filtered by detected data type; multi-value roles support Add/Remove. | Style step lists missing prerequisites; create remains disabled. | **Observed + Source-confirmed** |
| Preview invalid or empty | Preview reports `Preview needs attention` with up to four bounded diagnostics, or `No chart data to preview`. | Only a renderer-ready correlated preview can enable creation. | **Source-confirmed** |
| Preview ready | Full schema-applicable controls and live chart render appear. | Backtracking preserves compatible choices and the preview updates from the draft before save. | **Observed + Source-confirmed** |
| Create in progress | Dialog is `aria-busy`, inert, and conflicting navigation/close/create actions are disabled. | Duplicate submission is gated. | **Source-confirmed** |
| Create/persistence failure | Submission error remains in the modal. | Wizard stays open and the last valid dashboard is retained; a vanished destination is an explicit error. | **Source-confirmed** |
| Create succeeds | Modal closes after the serialized dashboard mutation succeeds. | Chart is appended, not inserted near the current viewport; subsequent editing uses `ChartEditorV3`, not the wizard. | **Observed + Source-confirmed** |
| Close or root Escape | Nested `Discard chart?` dialog opens. | Continue returns to the retained draft; Discard closes without creation. | **Observed + Source-confirmed** |
| Nested modal keyboard path | Tab/Shift+Tab are trapped in the topmost modal; Escape addresses only that modal; focus is restored through the modal stack. | `Continue editing` is initially focused for the destructive confirmation. | **Observed** for confirmation focus; **Source-confirmed** for trap/restoration |
| Requested 768×1024 / client 753×1024 | Style preview and settings remain side by side and an internal horizontal scrollbar is exposed. | The collapse rule is `max-width: 760px`; the requested 768-pixel boundary remains in the wide arrangement despite the 753-pixel client width. | **Observed + Source-confirmed** (`src/styles.css:4407-4418`, `src/styles.css:4872-4897`) |

### Creation-path findings that must carry forward

- **Observed:** the preview is confined to the modal while the actual page and target section are dimmed and disabled. It proves the chart itself can render but not where it will land among neighbouring panels.
- **Observed:** successful creation on Biomedical rendered at the end of the target section, far below the initial viewport. The wizard provided no visible placement confirmation in page context before commit.
- **Observed:** a first success on Home appeared in Structure but Home's custom live surface did not show a corresponding panel. This is a placement/rendering inconsistency limited to the observed Home path; it is not generalized to all destinations.
- **Source-confirmed:** the source table and manual table use horizontal overflow with a 560-pixel minimum. The modal body itself scrolls; the Style preview is sticky only in the wide layout (`src/styles.css:4267-4269`, `src/styles.css:4355-4365`, `src/styles.css:4407-4418`).
- **Source-confirmed:** step buttons are 46×46 CSS pixels, while general icon, footer, and close controls are 36×36 (`src/styles.css:4541-4560`, `src/styles.css:4690-4700`). The file input has no explicit visible label or `aria-label` (`src/components/chart-authoring/DataSourceStep.jsx:67-80`).
- **Source-confirmed:** the modal uses native button/input/select behavior and has no wizard-specific touch gestures. Step activation is available by Tab and activation; no arrow/Home/End step-navigation contract exists.

## 3. Temporal capability delta matrix

The future column below summarizes the approved temporal addendum. The current column describes only this implementation.

| Capability | Approved future requirement | Current implementation | Current status and provenance |
|---|---|---|---|
| Dashboard temporal authority | One dashboard-level IANA timezone governs period interpretation, calendar frames, display, and signed offsets. | Temporal bindings may carry parsing metadata, but the dashboard structure has no dashboard-level IANA timezone field. | **Absent — Source-confirmed** |
| Time-group model and inspection | Saved groups own ID/name, inclusive period, members, matching, seconds per frame, and scenes. | Current strict group keys are only `id`, `name`, `primaryClock`, `matching`, and `members`. Build lists two configured groups and shows a read-only name, primary clock, matching policy, and members. | **Partial — Observed + Source-confirmed** (`src/charting/time/timeSyncModel.js:10-25`, `src/components/build/BuildInspector.jsx:124-149`) |
| Group create, rename, duplicate, and explicit delete | Full guided CRUD with atomic draft/save behavior and disclosed scene dependencies. | No group create, rename, duplicate, or explicit delete control/path was found. Empty groups may be pruned incidentally when their last member is removed, which is not explicit group deletion. | **Absent — Observed + Source-confirmed** |
| Chart membership in multiple groups | One chart may belong to multiple groups with independent policies. | Validation rejects a chart that belongs to more than one group. | **Absent — Source-confirmed** (`src/charting/time/timeSyncModel.js:67-81`) |
| Member-level editing | Group membership, fallback matching, primary clock, and default policies are authored in the group workflow. | A chart editor can join/leave one existing group and edit that member's Exact/Last known/Nearest/Interpolate policy and nearest tolerance. Group identity, primary clock, and default policy remain read-only in Build. | **Partial — Observed + Source-confirmed** (`src/components/chart-authoring/TimeSyncSettingsField.jsx:42-70`) |
| Group and scene period selection | Groups own inclusive periods; scenes own contained periods with explicit shrink/clamp handling. | No start/end period exists in the group schema, inspector, playback state, or controls. | **Absent — Observed + Source-confirmed** |
| Saved scene model and CRUD | Named, reusable, page-scoped scenes support create/edit/save/duplicate/select/delete and persist composition/frame rules. | Present's “scene” is transient controller state—chart IDs, layout, page, title visibility, blackout, and optional group/time. No saved scene collection, ID/name, authoring workflow, selector, duplication, or deletion exists. | **Absent — Source-confirmed** (`src/lib/displayController.js:18-23`, `src/charting/config/dashboardConfigStructure.js:25-46`) |
| Per-chart/per-variable availability | Authoring shows full-range dates, in-period counts, ticks, frame availability, and coverage gaps for effective plotted variables. | Dataset profiles and temporal matching compute column- and measure-level evidence internally. View exposes only aggregate participating/available/unavailable chart counts. | **Partial — Observed + Source-confirmed** (`src/components/playback/PlaybackView.jsx:28-56`, `src/charting/time/applyTimeContext.js:121-140`) |
| Default Chrono frames | Sorted unique union of all available observation timestamps across all plotted variables and group members within the period. | Frames come only from one designated primary source/time field's profiled temporal evidence; member clocks are intentionally not unioned. | **Partial — Source-confirmed** (`src/charting/time/timeSyncModel.js:180-250`) |
| Scene Frame source | Union of a selected scene chart's plotted-variable timestamps, with All available or explicit Selected frames. | No scene or frame-source authoring exists. The current primary clock is a group-level source field, not the future Frame-source rule. | **Absent — Source-confirmed** |
| Calendar frames | Positive N days/months/years, mandatory boundaries, timezone/calendar and month-end rules. | No calendar-frame generator, interval, or boundary period exists. | **Absent — Source-confirmed** |
| Matching vocabulary and base semantics | Concurrent only, Interpolate, Snap to Latest, and Snap to Closest; equal-distance closest selects the earlier observation. | Semantic analogues exist as Exact time only (`exact`), Interpolate, Last known value (`lastKnown`), and Nearest within tolerance (`nearest`). Current nearest requires a tolerance and throws on an equal-distance tie rather than choosing earlier. | **Partial — Observed + Source-confirmed** (`src/components/chart-authoring/TimeSyncSettingsField.jsx:7-12`, `src/charting/time/temporalMatch.js:29-40`, `src/charting/time/temporalMatch.js:94-142`) |
| Matching hierarchy and temporary override | Group default → member fallback → scene override → optional View-session override; Present uses authored behavior. | Current resolution supports group default plus member override. There is no scene layer or View-session override. | **Partial — Source-confirmed** |
| Seconds-per-frame authoring | Positive finite numeric seconds per frame at group/scene level, with ephemeral View/Present overrides. | View exposes `1×`, `2×`, and `3×`; the timer interval is `1000 / speed` ms. No authored seconds-per-frame field or inheritance exists. | **Partial — Observed + Source-confirmed** (`src/components/playback/PlaybackControls.jsx:117-129`, `src/components/playback/PlaybackProvider.jsx:155-186`) |
| Chrono entry and selection | Chrono is a View-owned subview with group and saved-scene selection; ordinary View hides Chrono controls. | Top-level modes remain View/Build/Present. View always exposes `Synchronized playback` controls and an Open/Close playback view action. There is no `View Chrono` label or scene selector. | **Partial — Observed + Source-confirmed** |
| All page charts / Group only | Default and Scene Chrono both offer a current-page scope choice. | Opening playback view replaces ordinary page content with group-member charts only. No all-page/group-only toggle exists, and the playback view source does not filter members to the active page. | **Partial — Observed + Source-confirmed** (`src/components/playback/PlaybackView.jsx:28-61`) |
| Progress and frame encoding | Period-relative track, authored/derived frame marks, current date, frame index/total, active bounds, and optional daily availability overlay. | Current controls expose an index range slider, timestamp select, current timestamp, and aggregate chart availability. They do not show period bounds, explicit frame index/total copy, frame distribution, or an availability overlay. | **Partial — Observed + Source-confirmed** (`src/components/playback/PlaybackControls.jsx:78-129`) |
| Current playback transport | Previous, Play/Pause, Next, direct seek; starts paused and safety/manual actions pause. | View has Previous, Play/Pause, Next, slider, timestamp select, group selection, and speed. Play is disabled until playback view is open. National group opened at frame 0/176 on 2027-02-20; Next advanced 0→1; 1× Play advanced 1→2 after about 1.15 s; Pause held frame 2 on 2027-02-22. The reducer stops at the final frame and does not loop. | **Partial — Observed + Source-confirmed** (`src/charting/time/playbackReducer.js:23-125`) |
| Trace-chart treatment | Reveal to frame by default with a temporary Full timeline option. | Line, area, mixed, timeline, and swimlane are always trace mode: full histories remain and the active result is marked. Other types use snapshot projection. No Reveal/Full toggle exists. | **Partial — Observed + Source-confirmed** (`src/charting/time/applyTimeContext.js:13-14`, `src/charting/time/applyTimeContext.js:106-178`) |
| Provenance and signed offsets | Concurrent/interpolated/snapped/missing provenance plus compact signed day offsets and per-variable details in dashboard timezone. | Current marks retain status, active time, source time, or interpolation bounds and render absolute labels such as `Observed`, `Last measured`, `Nearest measurement`, and `Interpolated between`. No signed offset, same/mixed-date badge, or dashboard-timezone day calculation is exposed. | **Partial — Observed + Source-confirmed** (`src/charting/time/applyTimeContext.js:444-452`, `src/charting/rendering/axisAdapter.js:248-290`) |
| Needs attention and repair | Persisted groups/scenes remain inspectable but block playback/presentation with linked repair findings. | Strict validation rejects invalid group contracts; there is no persisted temporal `Needs attention` object lifecycle or repair routing. `Preview needs attention` is chart-preview copy, not this temporal state. | **Absent — Source-confirmed** |
| Present group integration | Present may load a group without a scene and combine temporal/static charts under explicit semantics. | Present selects a current group, sends `group_id` plus `active_epoch_ms`, and Audience rebuilds per-member contexts. Accepted evidence already covers manual Previous/Next/slider and the absence of Present Play/Pause. | **Partial — Observed + Source-confirmed** (`src/components/presentation/PresentWorkspace.jsx:40-72`, `src/components/presentation/AudienceDisplay.jsx:15-47`) |
| Present authored-scene integration | Loading a saved scene selects page, subset/order/layout, period, frames, matching, and effective seconds per frame; runtime adjustments remain ephemeral. | No authored scene exists. Current chart set/order/layout/title/blackout/time is ephemeral display state only. | **Absent — Source-confirmed** |
| Passive Audience temporal disclosure | Audience remains passive and may show active frame date and compact provenance/offset disclosure. | Audience is passive and receives group/time projection, but it has no saved-scene identity and no signed-offset contract. | **Partial — Source-confirmed** |

## 4. Prioritized visual and interaction findings

This section uses the six-pillar lenses only to organize judgment. It does **not** alter the accepted `10/24` scorecard.

| Priority | Pillar lens | Finding | Step 3A consequence |
|---:|---|---|---|
| 1 | Experience design + visuals | **Observed:** chart preview and final placement are separated. The modal disables page context, and the successful chart can land thousands of pixels below the current viewport. Home additionally produced one Structure-visible but canvas-invisible placement. | Define observable creation destination, pre-commit context, post-commit reveal/selection/focus, and failure behavior without choosing a particular panel, overlay, or dimension. |
| 2 | Spacing + experience design | **Observed:** at requested 768×1024 the Style step remains two-column and exposes horizontal scrolling instead of reflowing. **Source-confirmed:** the collapse starts only at 760px and common controls remain 36×36. | Add responsive, no-horizontal-overflow, touch-target, internal-scroll, and long-content acceptance at the existing contract viewports. |
| 3 | Experience design | **Absent:** current Build cannot create/manage time groups or any saved scene, so the approved temporal workflows have no current authoring analogue to refine. | Step 3A must add complete `TEMP-*` ownership, CRUD, draft, validation, dependency, and state clauses before visual candidates are compared. |
| 4 | Visuals + experience design | **Observed + Source-confirmed (Partial against the future contract):** playback view communicates current time and aggregate availability but replaces the page with a group-only surface and gives no period/frame distribution or per-variable availability. | Define the information and state outcomes for Default Chrono, Scene Chrono, All page charts/Group only, availability on/off, and page-scoped navigation. |
| 5 | Copywriting + experience design | **Observed + Source-confirmed (Partial against the future contract):** current terms and semantics differ from the future contract—`Exact time only`, `Last known value`, `Nearest within tolerance`, and `1×/2×/3×`; nearest ties fail rather than select earlier. | Reconcile labels and deterministic semantics in clauses, fixtures, migration expectations, and error copy; do not treat a relabel as sufficient where behavior differs. |
| 6 | Copywriting + visuals | **Source-confirmed:** `Style and layout` exposes styling but no chart size/layout choice; `layout.size` stays hidden at `standard`. | Decide the truthful scope/name of chart creation and distinguish chart definition from later constrained panel placement without prescribing a UI surface. |
| 7 | Experience design + accessibility | **Observed:** modal confirmation focus is safe and the focus trap is strong, but post-create Structure selection leaves focus on `BODY`. **Source-confirmed:** the CSV file input lacks an explicit accessible label, and step navigation has no arrow/Home/End model. | Specify initial, step-change, validation, cancel, create-success, and destination focus outcomes plus keyboard/touch equivalence. |
| 8 | Visuals + copywriting | **Observed + Source-confirmed (Partial against the future contract):** temporal provenance uses absolute dates and mark styling but provides no signed or mixed-date compact state. | Define mandatory compact and detailed provenance meaning for View, preview, Present, and Audience before visual treatment is explored. |

Positive evidence to retain as behavioral input:

- **Observed + Source-confirmed:** the wizard explains unmet prerequisites rather than silently enabling invalid controls.
- **Observed + Source-confirmed:** create remains gated on normalized configuration plus renderer readiness, not merely completion of four screens.
- **Observed + Source-confirmed:** backtracking retains compatible work; destructive source/type changes have explicit reset semantics.
- **Observed + Source-confirmed:** nested discard confirmation uses specific consequence copy, a non-destructive initial focus, and no creation on discard.
- **Observed + Source-confirmed:** playback Previous/Next/Play/Pause/current time and endpoint behavior are deterministic in the exercised View flow.

## 5. Explicit absences and inaccessible states

### Confirmed current absences

The following are **Absent**, not merely unobserved:

- dashboard-level IANA timezone;
- group period, authored seconds per frame, group CRUD, explicit group deletion, and multi-group chart membership;
- saved scene schema, scene CRUD/selection, scene period/composition/frame rules, and scene integration in View or Present;
- calendar frames, union-of-member Default Chrono frames, and selected/all Frame-source modes;
- per-variable authoring availability bars and a playback availability overlay;
- View-session matching override, Reveal to frame/Full timeline choice, and All page charts/Group only choice;
- signed day offsets, mixed-date compact disclosure, and persisted temporal Needs attention repair states;
- an explicit CSV-upload progress/loading state;
- a chart-size/layout control in the creation wizard.

### States not live-exercised or not accessible in this supplement

These are not claimed as Observed:

- **Source-confirmed only:** CSV upload, its 2 MiB/50,000-row failures, manual data entry, geography source selection, incompatible-source confirmation, upload errors, create/persistence failure, and the modal's complete Tab/Shift+Tab/touch paths.
- **Not exercised:** no CSV was uploaded, no synthetic loading fixture was held open, and no network/storage error was induced.
- **Not exhaustive:** one representative Line success and one Bar cancellation do not establish every chart-type, role, transformation, renderer, manual-data, or geography permutation.
- **Responsive limitation:** the wizard was captured at 1440×900 and 768×1024 only; no separate 1200, 1024 landscape, 390 phone, 200-percent text, reduced-motion, or screen-reader walkthrough was performed.
- **Focus/touch limitation:** focus trap, restoration, native touch behavior, and source-change reset paths are source-confirmed where they were not live-exercised. Only the recorded confirmation focus and post-creation `BODY` result are Observed.
- **Temporal authoring limitation:** group/scene authoring states could not be opened because their controls and model do not exist. Their absence is source-confirmed; no future workflow was simulated.
- **Present reuse:** the accepted Present/Audience evidence was reused for manual group selection/stepping, lack of Present Play/Pause, 16:9 layouts, and lifecycle. Those states were not re-audited.

## 6. Candidate-neutral inputs required by Step 3A

Step 3A should convert the following evidence into binding `CREATE-*` and `TEMP-*` clauses, state/copy coverage, deterministic tasks, fixture mappings, and hard gates. These are required outcomes, not proposed panels, overlays, dimensions, tokens, or final interaction patterns.

### Chart creation inputs

| Input | Candidate-neutral contract truth to add |
|---|---|
| `CREATE-INPUT-01` — entry and destination | Define when Add chart is available, how destination page/section is established, what happens when none exists, and how the named destination stays understandable through commit. |
| `CREATE-INPUT-02` — catalogue | Treat the chart schema registry as authority; require purpose/name search, accessible description, zero-result behavior, and deterministic handling when the registry changes rather than fixing acceptance to today's 26-entry count. |
| `CREATE-INPUT-03` — sequence and gating | State whether direct non-linear step navigation is intentional; define prerequisite messaging, disabled reasons, completion, and the exact create-ready condition independently of visual step presentation. |
| `CREATE-INPUT-04` — sources | Cover existing datasets, uploaded CSV, schema-authorized manual data, geography dependencies, supported limits, source profiling, no-source/no-column states, upload progress/error, and retained input after recoverable failure. |
| `CREATE-INPUT-05` — roles and transformations | Derive fields from schema and detected types; cover required/multiple roles, axes, interpretation ambiguity, filters, grouping, aggregation, missing values, duplicate resolution, time membership, and invalid/empty combinations. |
| `CREATE-INPUT-06` — defaults and preview | Enumerate meaningful defaults; require correlated canonical-render readiness, live draft updates, empty/invalid diagnostics, and fidelity sufficient to validate the created chart without implying page placement. |
| `CREATE-INPUT-07` — backtracking and destructive changes | Define preserved values, type-change reset, compatible/incompatible source changes, confirmation copy/consequence, and non-silent clearing rules. |
| `CREATE-INPUT-08` — atomic create | Require a single serialized validation/persistence transaction for chart, optional source, and time-group proposal; retain the draft and last-good dashboard on failure. |
| `CREATE-INPUT-09` — placement and handoff | Define append/insert ownership, immediate visual acknowledgement, Structure selection, transition to the ordinary chart editor, Home/custom-surface consistency, focus, and retained scroll context. |
| `CREATE-INPUT-10` — cancellation and access | Define Close, Escape, discard, reopen/non-recoverability, nested focus, keyboard/touch navigation, minimum activation targets, internal scrolling, responsive reflow, long text, and no document/modal horizontal overflow. |

### Temporal inputs

| Input | Candidate-neutral contract truth to add or reconcile |
|---|---|
| `TEMP-INPUT-01` — authority and persistence | Add dashboard timezone, dashboard-wide groups, page-scoped saved scenes, multi-group membership, derived-versus-persisted boundaries, stable IDs, and atomic drafts. |
| `TEMP-INPUT-02` — group lifecycle | Define period, chart availability, membership, default matching, member fallback, seconds per frame, naming/review, CRUD/duplication/deletion, and dependent-scene consequences. |
| `TEMP-INPUT-03` — scene lifecycle | Define page/period, ordered composition and widths, Present subset/layout, frame rule, overrides/inheritance, naming/review, CRUD/duplication, and parent/structural dependencies. |
| `TEMP-INPUT-04` — frames and availability | Define Default Chrono union frames, Frame-source all/selected modes, calendar generation, effective-variable availability, duplicate/null/filter semantics, recomputation, and explicit selected-frame drift. |
| `TEMP-INPUT-05` — matching | Lock Concurrent only, Interpolate, Snap to Latest, and Snap to Closest semantics, earlier equidistant tie, interpolation safety, and group/member/scene/session precedence. |
| `TEMP-INPUT-06` — timing | Replace old named cadence and current multiplier vocabulary with positive finite seconds per frame, inheritance, ephemeral overrides, timing tolerance, start/pause/manual/safety/end behavior, and no-loop semantics. |
| `TEMP-INPUT-07` — View Chrono | Define View-owned entry/exit, group/scene selection, page navigation, All page charts/Group only, focused scene order, retained state, page geometry, and responsive floating-control outcomes. |
| `TEMP-INPUT-08` — playback communication | Define active period, frame index/total, frame distribution, direct seek, current date, availability overlay on/off, non-colour chart association, and aggregate versus per-variable disclosure. |
| `TEMP-INPUT-09` — trace and provenance | Define Reveal to frame/Full timeline, future-observation interpolation handling, snapshot/trace behavior, concurrent/interpolated/snapped/missing/unavailable provenance, signed offsets, and mixed-date detail. |
| `TEMP-INPUT-10` — integrity and repair | Define Needs attention states, blocking versus inspectable behavior, direct repair context, non-silent period/frame/reference cleanup, and last-valid output preservation. |
| `TEMP-INPUT-11` — Present and Audience | Reconcile saved authored scenes with ephemeral presentation composition; define scene/group loading, static charts, session-only adjustments, passive Audience disclosure, safety pauses, reconnect, and invalid-scene rejection. |
| `TEMP-INPUT-12` — coverage | Carry `TEMP-FIX-01` through `TEMP-FIX-14` into common state, accessibility, keyboard, touch, reduced-motion, long-name, zero/one/many, responsive, task, coverage, and hard-gate mappings. |

Step 3A must also amend companion clauses whose temporal vocabulary is superseded, especially the current primary-clock assumption, one-group membership, `SCOPE-06`, `PRES-08`/`PRES-09`, playback state/copy, fixtures, and any use of scene as presentation-only ephemeral state.

## 7. Screenshot references

| File | Requested state | Evidence used here |
|---|---|---|
| [`step2a-wizard-1440x900-prerequisite-validation.png`](screenshots/step2a-wizard-1440x900-prerequisite-validation.png) | 1440×900, Data source selected before chart type | Direct step navigation, disabled source controls, `Before this step`, repeated footer prerequisite, dimmed/disabled dashboard. |
| [`step2a-wizard-1440x900-preview-ready.png`](screenshots/step2a-wizard-1440x900-preview-ready.png) | 1440×900, ready Style and layout step | Live Line preview, appearance controls, modal-only context, internal scrolling. |
| [`step2a-wizard-1440x900-created-placement.png`](screenshots/step2a-wizard-1440x900-created-placement.png) | 1440×900, Biomedical after scroll | Created chart appended at the end of `Outbreak dynamics`, its actual panel geometry, and separation from the creation viewport. |
| [`step2a-wizard-1440x900-discard-confirmation.png`](screenshots/step2a-wizard-1440x900-discard-confirmation.png) | 1440×900, nested discard confirmation | Specific consequence copy, retained underlying draft, destructive differentiation, and Continue editing focus. |
| [`step2a-wizard-768x1024-preview-ready.png`](screenshots/step2a-wizard-768x1024-preview-ready.png) | Requested 768×1024; raster 753×1004 | Side-by-side preview/settings at the boundary, internal horizontal scrollbar, wide-layout retention. |
| [`step2a-view-1440x900-playback-group-open.png`](screenshots/step2a-view-1440x900-playback-group-open.png) | 1440×900, national playback group view open | Group-only replacement view, group selector/transport/seek/time/speed controls, eight-member aggregate availability, and trace/snapshot coexistence. |

## 8. Exit-gate assessment

### Evidence sufficiency

- [x] The accepted Step 2 baseline and its scorecard remain unchanged.
- [x] One representative chart was created from entry through valid preview, atomic commit, placement, Structure appearance, and ordinary editor handoff.
- [x] Prerequisite blocking, backtracking, cancellation, nested confirmation, and responsive boundary behavior are characterized.
- [x] Wizard schema-driven types, source modes, role generation, defaults, gating, empty/error paths, persistence, focus, touch, scroll, and responsive behavior are covered by Observed and Source-confirmed evidence with their boundary stated.
- [x] Every temporal item required for the current-versus-future delta is classified as Partial or Absent with Observed/Source-confirmed provenance.
- [x] Existing Present/Audience evidence is reused without repeating accepted geometry or lifecycle findings.
- [x] No Step 3A contract clause, Step 4 visual candidate, or production implementation was created.

### Limitations that remain visible to the reviewer

- No CSV upload was performed.
- No synthetic loading, network-error, storage-error, or vanished-destination fixture was exercised.
- Chart types, manual-data schemas, geography paths, transformations, and renderers were not exhaustively permuted.
- Focus trapping/restoration, touch behavior, and several destructive source-change paths are source-confirmed where not live-exercised.
- Only one tablet boundary and no phone wizard state were captured.
- The Home placement inconsistency is a single observed path and needs a deterministic fixture before it can be generalized.

**Exit assessment:** the evidence is sufficient to present Step 2A to the user for review and to inform a later Step 3A amendment. It does **not** mark Step 2A accepted. Acceptance remains a user decision after reviewing this supplement and its stated limitations.
