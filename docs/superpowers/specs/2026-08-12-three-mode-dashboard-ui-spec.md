---
title: V3 Three-Mode Dashboard UI Contract
date: 2026-08-12
status: approved
reviewed_at: 2026-08-12
scope: Step 3 behavioral UI contract
---

# V3 Three-Mode Dashboard UI Contract

This document is the binding, candidate-neutral contract for Step 4 design exploration and later implementation planning. It defines observable behavior, state, geometry, and responsibility boundaries. It does not choose a control-surface pattern or visual direction.

Normative terms:

- Must and must not are hard pass/fail requirements.
- May identifies implementation freedom that remains after the hard requirements are met.
- Candidate means one Step 4 design approach evaluated against this contract.
- Canonical View render means the live shared V3 dashboard renderer in View at the same reference frame and dashboard state.
- Authoring chrome means every Build-only selector, command, editor, indicator, substitute, or draft control outside the dashboard's own View rendering.

## 1. Authority and supersession statement

| Clause | Binding requirement | Observable pass condition | Test |
|---|---|---|---|
| AUTH-01 | This contract supersedes docs/superpowers/specs/2026-08-10-three-mode-dashboard-ui-spec.md. | A Step 4 or implementation decision that conflicts with the old UI contract follows this document. | T-AUTH-01 |
| AUTH-02 | This contract overrides docs/superpowers/specs/2026-08-10-three-mode-dashboard-design.md for visual, responsive, and interaction details. | Visual, responsive, and interaction acceptance is evaluated only against this document. | T-AUTH-02 |
| AUTH-03 | The earlier design spec remains authoritative for architecture, scope, non-goals, universal mode access, shared V3 state, transactional editing, and the same-computer presentation channel. | No candidate introduces a conflicting architecture, role model, configuration authority, transaction model, or cross-computer transport. | T-AUTH-03 |
| AUTH-04 | The accepted Step 2 audit is evidence and a regression baseline, not a design pattern to preserve. | A candidate addresses each traced finding without being required to copy the audited runtime or prototype. | T-AUTH-04 |
| AUTH-05 | Where this contract is silent on an implementation detail, at least two materially different design approaches must remain feasible. | Two candidates can satisfy every hard gate while differing in control-surface and layout approach. | T-AUTH-05 |

## 2. Product and architecture constraints

| Clause | Binding requirement | Observable pass condition | Test |
|---|---|---|---|
| ARCH-01 | View, Build, and Present are modes available to every user. Audience is a passive Present surface, not a fourth mode or user role. | All three modes are reachable without identity, permission, or feature-gate checks; Audience exposes no mode switch. | T-ARCH-01 |
| ARCH-02 | All modes consume the same version-3 configuration, datasets, chart registry, filters, and compatible synchronized-time state. | Matching state produces matching content identifiers and values across modes; no mode-specific dashboard copy exists. | T-ARCH-02 |
| ARCH-03 | Version 3 is the only live dashboard contract. No version-2 migration, compatibility, import, export, authoring, or rendering path is introduced. | Candidate artifacts and implementation plans contain no V2 behavior. | T-ARCH-03 |
| ARCH-04 | React, Vite, CSS, ECharts, and the generated SimEx glyph registry remain the product foundations. No new UI framework or generic dashboard template is required by this contract. | A candidate can be implemented within the existing foundations and icon authority. | T-ARCH-04 |
| ARCH-05 | Presentation uses the approved same-computer, same-origin controller/Audience channel. Cross-device control remains out of scope. | Presentation flows require no network service, account, discovery, or remote-control transport. | T-ARCH-05 |
| ARCH-06 | Presentation messages contain lightweight display state only. They must not contain datasets, authoring commands, secrets, or dashboard mutations. | Message fixtures contain only validated scene, connection, and playback state; malformed or unknown messages are ignored. | T-ARCH-06 |
| ARCH-07 | Dashboard content changes use existing serialized transactional persistence. Presentation composition, deliberate blank output, playback state, and moderator cadence overrides are ephemeral and never written to the dashboard bundle. | Exported V3 bundles exclude all presentation-session fields. | T-ARCH-07 |
| ARCH-08A | Static hosting remains the baseline defined by the earlier authoritative design spec. The dependency and asset inventory contains no runtime-only remote dependency on the core dashboard path. | Later implementation verification: inventory the implemented runtime dependencies/assets and show zero entries requiring an unavailable remote origin after supported static installation. This is not a Step 4 candidate runtime test. | T-ARCH-08A |
| ARCH-08B | The core Dashboard, View, Build, Present/controller, and Audience path launches from the supported static origin. | Later implementation verification: run the production-like static build and complete each named surface's canonical smoke task without a development server or backend. This is not a Step 4 candidate runtime test. | T-ARCH-08B |
| ARCH-08C | Required offline/PWA behavior remains exactly the baseline defined by the earlier design spec; this contract does not expand that scope. | Later implementation verification: after authoritative install/cache preconditions, disable network access, relaunch, and complete the baseline cached-path checks. This is not a Step 4 candidate runtime test. | T-ARCH-08C |
| ARCH-08D | The Quorum protocol and schema boundary do not change. | Later implementation verification: the implemented protocol/schema diff contains no changed Quorum message, field, fallback, or availability contract. This is not a Step 4 candidate runtime test. | T-ARCH-08D |
| ARCH-08E | Chart semantics remain identical through the canonical runtime renderer. | Later implementation verification: for one fixed state ledger, the implemented surfaces resolve identical panel IDs, series meanings, values, filters, time position, annotations, and status semantics except permitted presentation density. This is not a Step 4 candidate runtime test. | T-ARCH-08E |
| ARCH-09 | Step 4 demonstrates architecture compatibility through declarations and state/interaction annotations only. It does not build or execute production components. | Each candidate declares no proposed runtime-only remote dependency, no Quorum protocol/schema change, continued use of the canonical renderer/shared V3 state, and a feasible static/offline path consistent with the earlier design authority. Any knowingly conflicting proposal fails; no functional build is required. | T-ARCH-DESIGN-DECL |

ARCH-08A through ARCH-08E remain binding implementation acceptance requirements. Their runtime evidence is deliberately staged after Step 4 under DEFER-11. Step 4 rejection uses ARCH-09, not absence of a production build, PWA run, protocol diff, or canonical-runtime comparison.

## 3. Mode and shell responsibilities

| Clause | Surface | Required responsibility | Prohibited responsibility | Test |
|---|---|---|---|---|
| MODE-01 | View | Default personal exploration; scenario and page orientation; filters; synchronized time; chart interactions; data/source details; existing focused or multi-chart comparison; clear routes to Build and Present. | Persistent authoring inspectors, author-only diagnostics that do not affect interpretation, and presentation-controller controls. | T-MODE-01 |
| MODE-02 | Build | Exercise authoring across scenario, page, section, panel, constrained layout, and Chrono Group scopes; selected-object drafts; truthful validation and persistence; the canonical dashboard in its real geometry. | A compressed preview standing in for the dashboard, free-form panel geometry, silent save/discard, or nonfunctional enabled actions. | T-MODE-02 |
| MODE-03 | Present/controller | Sole authority for Audience opening/reopening/ending, scene composition, order, layout, title, deliberate blank, Chrono Group, manual cues, Play/Pause, cadence override, Blackout/Restore, and connection recovery. | Dashboard-authoring mutation or reliance on Audience controls. | T-MODE-03 |
| MODE-04 | Audience | Passive, chrome-free rendering of controller state at presentation density, plus required holding, blackout, ended, and icon-only connection states. | Moderator controls, navigation, setup instructions, technical connection prose, hover-only instructions, or authoring actions. | T-MODE-04 |
| MODE-05 | Shared mode navigation | Preserve the active page, compatible filters, synchronized-time position, and page/scroll context when mode changes. A requested switch out of Build remains pending until its active object draft is resolved by Save or Cancel. | Silent state reset, silent draft discard, or an invisible mode lock. | T-MODE-05 |

## 4. View/Build geometry-equivalence contract

### 4.1 Canonical parity reference frame

PAR-01 defines the exact comparator:

1. Set the requested browser viewport to one of 1200×900, 1440×900, 768×1024, 1024×768, or 390×844.
2. Use the browser CSS layout viewport after browser chrome is excluded. Record document.documentElement.clientWidth and clientHeight, browser zoom, device-pixel ratio, safe-area insets, scrollbar reservation, loaded fonts, and reduced-motion setting.
3. Hold constant the V3 configuration and dataset snapshot; scenario; active page; section expansion; panel order and presets; filters; Chrono Group and position; chart state; page scroll anchor and scrollY; and any content that affects intrinsic size.
4. Measure View and Build relative to the same CSS layout viewport and the same scroll anchor. A mode that creates or removes a scrollbar, changes client width, or changes the scroll anchor fails parity.
5. Record DOMRect values in CSS pixels to 0.01-pixel measurement resolution. Required deltas are 0.00 at that resolution; a tolerance band is not a design allowance.

| Clause | Zero-delta requirement at every locked viewport | Observable pass condition | Test |
|---|---|---|---|
| PAR-01 | The parity reference frame above is used for every comparison. | The fixture ledger shows identical non-mode inputs and identical layout-viewport values. | T-PAR-REF |
| PAR-02 | Dashboard canvas x, y, width, height, scroll width, and content height are identical in View and Build. | Build minus View equals 0.00 for every recorded field. | T-PAR-CANVAS-1200, T-PAR-CANVAS-1440, T-PAR-CANVAS-768, T-PAR-CANVAS-1024, T-PAR-CANVAS-390 |
| PAR-03 | The responsive breakpoint, column count, row behavior, computed grid tracks, gaps, and grid bounds are identical. | Computed track lists, gaps, breakpoint identifiers, and DOMRects match exactly. | T-PAR-GRID-1200, T-PAR-GRID-1440, T-PAR-GRID-768, T-PAR-GRID-1024, T-PAR-GRID-390 |
| PAR-04 | Panel order, section membership, grid start/end lines, width/height presets, spans, and every panel DOMRect are identical. | Ordered panel ledger and all geometry values match exactly. | T-PAR-PANELS-ALL |
| PAR-05 | Every chart plot host and ECharts rendering rectangle is identical, including panels with a selected object, an open editor, and a suspended draft. | Plot x, y, width, and height deltas are 0.00 in clean, selected, editing, and suspended states. | T-PAR-PLOTS-ALL |
| PAR-06 | Authoring chrome consumes zero dashboard geometry. It may not add canvas padding, margins, rows, columns, panel content, or breakpoint-changing containment. | Opening, closing, saving, cancelling, suspending, or switching Build controls produces no PAR-02 through PAR-05 delta. | T-PAR-CHROME-ZERO |
| PAR-07 | There is no page-level horizontal overflow in View or Build. | documentElement.scrollWidth is less than or equal to clientWidth at all five viewports and all required authoring states. | T-PAR-NO-HSCROLL |
| PAR-08 | Build never substitutes a lower-density dashboard for the canonical canvas. | Chart count, panel content, data, labels, and plot geometry match the View fixture before any allowed authoring substitute is considered. | T-PAR-CONTENT |
| PAR-09 | A responsive change to authoring chrome cannot change the dashboard's own responsive state. | Crossing an authoring-surface threshold alone leaves the dashboard breakpoint and geometry unchanged. | T-PAR-RESP-ISOLATION |

## 5. Object and control-scope taxonomy

Selection is non-mutating at every scope. A visible enabled action must execute the named operation. An unavailable operation must be absent, read-only with an explicit label, or disabled with a visible reason.

| Clause | Scope | Required operations and ownership | Availability contract | Test |
|---|---|---|---|---|
| SCOPE-01 | Scenario/dashboard | Select and inspect the one active scenario; edit Program, Scenario name, and Updated date; reach page, section, panel, layout, Chrono Group, and the explicitly enumerated package operations in PKG-01 through PKG-10. Scenario selection does not start a draft; Rename Scenario uses the single-object draft. | Identity, selection, and structure routes are essential; Rename Scenario and other metadata edits are contextual. Multi-scenario delete/duplicate/selection is not implied. | T-SCOPE-SCENARIO |
| SCOPE-02 | Page | Select, create, rename label/title/description, reorder, and remove a removable page. Removal must disclose consequences and may not silently remove its sections or panels. | Selection and current-page context are essential; create/reorder/edit are contextual; destructive removal requires deliberate confirmation. | T-SCOPE-PAGE |
| SCOPE-03 | Section | Select, create/manage a section boundary, edit title/description, reorder, and remove or merge through an explicit panel disposition. | Common boundary and ordering actions are contextual. A non-empty section cannot disappear through an unstated cascade. | T-SCOPE-SECTION |
| SCOPE-04 | Panel/chart | Select; create from supported V3 chart definitions; edit data, title/content, appearance, axes, interactions, and advanced supported properties; move, reorder, and remove. | Common data/content actions are contextual; fine appearance, axes, interactions, and rare settings require deliberate reveal. | T-SCOPE-PANEL |
| SCOPE-05 | Layout | Reorder panels; move them between sections; manage section boundaries; choose supported V3 width/span and height presets. | Layout is a contextual structural workflow. Arbitrary x/y placement and arbitrary dimensions are unavailable, not simulated by inert controls. | T-SCOPE-LAYOUT |
| SCOPE-06 | Chrono Group | Select; create, rename, and remove; manage member charts, primary clock, datum, matching, and the authored default cadence; inspect current position. | Summary and membership are contextual; datum/matching detail is advanced. Read-only presentation is truthful only when the user lacks an active edit workflow, not as a substitute for required Build authoring. | T-SCOPE-TIME |
| SCOPE-07 | Destructive actions | Page, section, panel, and Chrono Group removal identify the object and consequence, require explicit confirmation, and preserve the draft and saved configuration if validation or commit fails. | Destructive controls are visually and programmatically distinct from ordinary Save/Close, but exact styling is deferred. | T-SCOPE-DESTRUCTIVE |
| SCOPE-08 | Unsupported actions | No candidate may show Start section here, Remove chart, Advanced, sizing, or similar controls as enabled unless their complete behavior exists for the fixture. | Exercising every visible enabled action causes the named observable state change; all exceptions are absent, reason-disabled, or labelled read-only. | T-SCOPE-TRUTHFUL |

Supported layout-preset values are owned by the V3 schema and later implementation planning. Step 4 candidates represent preset selection behavior but do not invent free-form geometry or silently coerce unsupported values.

### 5.1 Scenario and package-operation ledger

This ledger is exhaustive for Step 4. A candidate may not add a generic Package, File, Save, or More action whose behavior is not named here.

| Clause | Operation and exact visible action | Status/tier | Scope and draft impact | Truthful availability | Test |
|---|---|---|---|---|---|
| PKG-01 | Select Scenario | Included; essential, non-mutating | Selects the single active dashboard scenario and exposes its metadata; creates no draft. | Always available after a valid V3 dashboard loads. | T-PKG-SELECT |
| PKG-02 | Rename Scenario | Included; contextual | Opens/resumes the Scenario object draft and changes the Scenario field only after Save Changes succeeds. | Available for the selected Scenario; validation and transactional failure use EDIT-10/EDIT-11. | T-PKG-RENAME |
| PKG-03 | Import Dashboard Package | Included for current V3 packages; advanced | File choice/load/validation is one package-replacement workflow. An active object draft must first resolve through Save Changes, Discard Changes, or Stay in Build. A valid import replaces the working V3 dashboard only after explicit confirmation and successful validation. | Available only for supported current-V3 package input. A malformed V3 package retains the last-good dashboard and shows exactly Dashboard package couldn’t be imported. The current dashboard is unchanged. Action: Choose Another Package. | T-PKG-IMPORT |
| PKG-04 | Automatic source/browser load | Included system behavior; read-only, not a visible action | Loads the authoritative source configuration or valid namespaced current-V3 browser state at startup. It creates no draft. | Status may say where the dashboard came from; no enabled Load action is shown for this automatic behavior. | T-PKG-LOAD |
| PKG-05 | Save Changes | Included only as the selected-object transactional action; contextual/essential while a draft exists | Commits exactly one selected-object draft under EDIT-04. There is no separate package-wide Save action. | Visible only when an object draft exists; reason-disabled while unchanged or saving. | T-PKG-SAVE |
| PKG-06 | Download Dashboard Package | Included; advanced | Serializes and downloads the last successfully committed current-V3 dashboard package. Import/export presentation-session state is prohibited. An unresolved object draft must be saved or discarded first so download scope is unambiguous. | One real action covers both export and browser download; no separate inert Export action is allowed. | T-PKG-DOWNLOAD |
| PKG-07 | Reset Dashboard to Source | Included; destructive | After naming the consequence and explicit confirmation, discards current namespaced browser-persisted V3 dashboard changes and restores the authoritative source V3 configuration transactionally. An active object draft must resolve first. | Available only when a source baseline exists and differs; otherwise reason-disabled. Failure preserves the last-good working dashboard. | T-PKG-RESET |
| PKG-08 | Delete Scenario | Explicitly excluded | The authoritative product contains one active dashboard scenario, not a multi-scenario collection. Page/section/panel/Chrono Group removal remains in its owned scope. | Action is absent; no disabled placeholder implies multi-scenario deletion. | T-PKG-NO-DELETE |
| PKG-09 | Duplicate Scenario | Explicitly excluded | Duplicate-scenario management is not in the accepted architecture or observed control map. | Action is absent. Candidate convenience commands may not introduce it. | T-PKG-NO-DUPLICATE |
| PKG-10 | Import/load a version-2 package | Explicitly excluded | V3 is the only live contract; no migration, reconciliation, compatibility, partial load, or adapter is permitted. | Reject before mutation with exact copy: This package is not a supported version 3 dashboard. Choose a current version 3 package. Action: Choose Another Package. | T-PKG-NO-V2 |

## 6. Progressive-disclosure requirements

| Clause | Tier | Binding content | Observable pass condition | Test |
|---|---|---|---|---|
| DISC-01 | Essential | Current mode, page, selected scope/object, routes to structure and selected-object controls, and the exact Reopen <object> Changes, Save Changes, and Discard Changes actions whenever an object draft exists. | These remain reachable in every Build state while consuming zero dashboard geometry. | T-DISC-ESSENTIAL |
| DISC-02 | Contextual | Common operations for the selected scope: primary metadata; add/move/reorder; panel data/content; supported layout presets; Chrono Group membership and default cadence. | After selection, the relevant common actions are reachable without traversing unrelated advanced controls. | T-DISC-CONTEXT |
| DISC-03 | Advanced | Fine appearance; series styling; detailed axes, labels, reference lines, interactions; datum/matching detail; and genuinely rare supported settings. | Advanced content requires deliberate reveal, is fully labelled, and never contains an unlabeled or inert field. | T-DISC-ADVANCED |
| DISC-04 | Destructive | Removal and irreversible structural consequences use deliberate reveal or confirmation independent of the advanced technical tier. | A user cannot invoke a destructive commit through the same unconfirmed gesture as selection or ordinary Save. | T-DISC-DESTRUCTIVE |
| DISC-05 | Zero geometry cost | Essential reachability does not mean persistent layout columns. Any pattern is permitted only if PAR-02 through PAR-06 still pass. | At least two control-surface patterns can expose the tiers with zero dashboard delta. | T-DISC-CANDIDATE |
| DISC-06 | Long content | Long structure trees, chart catalogues, field labels, object names, and validation copy may wrap or scroll within authoring surfaces but cannot force page-level horizontal scrolling or hide the active scope. | Long-text and many-item fixtures retain all required actions and context. | T-DISC-OVERFLOW |

## 7. Selected-object visibility and substitute-fidelity contract

| Clause | Binding requirement | Observable pass condition | Test |
|---|---|---|---|
| VIS-01 | For object-local metadata, data, appearance, axes, and interaction edits, the original selected panel may be obscured only when a canonical-render substitute is present. | At every moment the original is obscured, a passing substitute is visible and current. | T-VIS-LOCAL |
| VIS-02 | For layout, order, sizing, movement, and section-boundary edits, the original panel and all affected neighbours remain in the actual dashboard renderer and are not covered by authoring chrome. | Selected and affected panel rectangles have zero intersection with authoring chrome; their real grid relationship remains inspectable throughout the operation. | T-VIS-STRUCTURAL |
| VIS-03 | If the full affected set cannot physically fit in one viewport, the workflow must preserve the actual dashboard context and provide bounded movement among the selected object and each affected neighbour without closing the task or changing geometry. | Every affected object can be brought into view in one direct navigation action, with selection and operation state preserved. | T-VIS-AFFECTED-SET |
| VIS-04 | A canonical-render substitute uses the same renderer, data, filters, synchronized-time state, and live draft at the actual canonical View panel and plot bounds. | Renderer identity and all state inputs match the canonical fixture. | T-SUB-STATE |
| VIS-05 | If constrained, the completed canonical rendering may be uniformly scaled as one unit. Internal layout may not reflow. | Aspect ratio, line breaks, truncation, title/legend/axis/annotation placement, and plot geometry match the canonical rendering after applying one uniform scale factor. | T-SUB-GEOMETRY |
| VIS-06 | The substitute includes every title, legend, axis, annotation, label, interaction state, loading/error state, and validation-driven change present in the canonical render. | Pixel-independent content and state ledgers match; no chart content is omitted for convenience. | T-SUB-CONTENT |
| VIS-07 | Draft changes become visible in the substitute after the renderer's next completed update and before Save can commit that draft. | A changed fixture value appears in the substitute before Save becomes actionable for that change. | T-SUB-LIVE |
| VIS-08 | A composition-only thumbnail or controller-style monitor does not satisfy Build substitute fidelity. | Replacing the canonical substitute with a low-fidelity snapshot fails T-SUB-STATE through T-SUB-CONTENT. | T-SUB-NO-THUMB |

## 8. Edit-session, focus, scroll, Save, Cancel, Close, and Escape behavior

One selected object may own one draft at a time. No second dirty object draft may exist.

| Clause | Event/state | Required outcome | Focus and scroll outcome | Test |
|---|---|---|---|---|
| EDIT-01 | Select object | Selection identifies scope and enables contextual actions; it does not create or mutate a draft. | Focus remains on the activated selector or moves to the selected canvas object, never BODY. Existing page scroll is preserved. | T-EDIT-SELECT |
| EDIT-02 | Open <object name> Changes | This object-specific action starts a clean draft for the selected object or resumes its suspended draft. | Focus enters a labelled editor heading or first logical control. The selected target remains at its established viewport anchor unless an allowed visibility operation deliberately moves it. | T-EDIT-OPEN |
| EDIT-03 | Dirty draft | Reopen <object> Changes, Save Changes, and Discard Changes remain persistently reachable even when controls are hidden. The selected object and dirty state are named using COPY-01. | Dirty state is programmatically announced once and remains discoverable without focus loss. | T-EDIT-DIRTY |
| EDIT-04 | Save Changes | Validate, await pending debounced updates, await the serialized V3 commit, and end the draft only after success. Saved values become the new canonical render. | On success, retain object selection, announce COPY-05, and restore focus to its invoking control or selected object without resetting page scroll. | T-EDIT-SAVE |
| EDIT-05 | Discard Changes | Discard only the selected object's uncommitted draft, restore its last saved canonical state, and end the draft. Discard Changes never removes the selection. | Return focus to the invoking control or selected object and retain the user's working scroll context; never jump to page top. | T-EDIT-CANCEL |
| EDIT-06 | Close <object name> Changes | This object-specific action hides the editor controls. A dirty or otherwise active draft becomes visibly suspended; selection, draft, Reopen <object name> Changes, Save Changes, and Discard Changes remain. Close does not save, discard, or unlock a pending mode/target switch. | Return focus to the control that opened the editor or the selected object; preserve scroll. | T-EDIT-CLOSE |
| EDIT-07 | Escape inside transient layer | Escape dismisses only the innermost open transient layer and returns focus to its invoker. It does not affect the root object draft. | Focus returns within the still-open editor; scroll is unchanged. | T-EDIT-ESC-INNER |
| EDIT-08 | Escape at editor root | Escape performs the same visible suspension as Close. It never silently discards or leaves an invisible lock. | Return focus to the editor invoker or selected object; preserve scroll. | T-EDIT-ESC-ROOT |
| EDIT-09 | Select another object or mode with active draft | Keep the requested target/mode pending and require Save Changes or Discard Changes for the current object. Stay in Build returns to the draft. No switch occurs before successful resolution. | Focus moves to the COPY-02 resolution message and then to the resolved destination or current draft as appropriate; original scroll context is preserved per destination. | T-EDIT-SWITCH |
| EDIT-10 | Validation failure | Do not commit or end the draft. Show a problem description and correction, associate field errors, and keep all draft values. If suspended, reopen the controls to the error context. | Focus the error summary or first invalid field without moving the dashboard target unnecessarily. | T-EDIT-VALIDATION |
| EDIT-11 | Save failure | Do not close, clear, or partially apply the draft. Use COPY-08, preserve the last-good configuration, and expose Retry Save and Discard Changes. | Keep or restore focus in the error/retry context; preserve target and scroll. | T-EDIT-SAVE-FAIL |
| EDIT-12 | Automatic movement | Any automatic centering, panning, or scroll used by a candidate is reversible and cannot reset the page or detach controls from target context. | Save, Cancel, Close, and root Escape leave the selected target at the same viewport anchor to within 1 CSS pixel unless the user intentionally changed the viewport during editing. | T-EDIT-SCROLL |
| EDIT-13 | Concurrent actions | While commit is pending, conflicting controls are reason-disabled; harmless inspection remains available. | Repeated Save, destructive, mode-switch, or target-switch input cannot create duplicate commits or competing drafts. | T-EDIT-SERIAL |

## 9. Responsive behavior and required target-position scenarios

| Clause | Binding requirement | Observable pass condition | Test |
|---|---|---|---|
| RESP-01 | Every Build contract is exercised at 1200×900, 1440×900, 768×1024, 1024×768, and 390×844. | The candidate evidence matrix contains a result for every required viewport and state. | T-RESP-MATRIX |
| RESP-02 | Top, bottom, centre/tall, left-edge, and right-edge targets are separate acceptance scenarios, not one representative screenshot. | All five named targets complete the selection, edit, suspend, save, cancel, and structural-context fixtures. | T-RESP-POSITIONS |
| RESP-03 | Required controls remain reachable without dashboard reflow, permanent content cover, page-level horizontal scrolling, or traversal of the whole document. | Each task reaches its first required action in one direct invocation from essential or contextual controls and completes without horizontal scroll. | T-RESP-REACH |
| RESP-04 | An obscured object-local target always has the canonical substitute; a structural target and affected neighbours remain in actual dashboard context. | VIS-01 through VIS-07 pass at every viewport and target position. | T-RESP-VISIBILITY |
| RESP-05 | Primary mode, navigation, authoring, and presentation controls that are not dense text-entry affordances provide at least a 44×44 CSS-pixel activation target and work by keyboard and touch. | Bounding-box and input tests pass at all required controller/Build viewports. | T-RESP-TARGET |
| RESP-06 | No essential action relies on hover, right-click, drag alone, colour alone, or precise pointer input. | Keyboard/touch alternatives complete each required task and state is communicated textually or programmatically. | T-RESP-INPUT |
| RESP-07 | Long names and translated-length test strings wrap or truncate only where the full value remains available without hover. | Long-text fixtures preserve object identity, action meaning, and zero horizontal overflow. | T-RESP-LONG |

This section does not prescribe drawers, sheets, popovers, rails, docks, modals, panning, or centring. Those are Step 4 candidate choices subject to the outcomes above.

## 10. Present/controller and Audience responsibility split

| Clause | Binding requirement | Observable pass condition | Test |
|---|---|---|---|
| PRES-01 | Controller exclusively owns scene selection, one-to-four chart composition, deterministic order/layout, title state, deliberate blank, Chrono Group, playback, cadence, Blackout/Restore, opening/reopening, and End Presentation. | Audience has zero interactive moderator actions and cannot mutate controller state. | T-PRES-AUTHORITY |
| PRES-02 | The supported layout catalogue remains count-dependent and deterministic: one chart solo; two charts side-by-side or over-under; three charts in one-on-top, one-on-bottom, one-on-left, or one-on-right focus arrangements; four charts in a 2×2 grid. Controller order determines Audience reading order. | The same snapshot produces identical geometry and order on repeated renders. | T-PRES-LAYOUTS |
| PRES-03 | The compact controller preview verifies chart identities, order, selected layout, title state, active time, key values, designated annotations, blackout, and connection state. | A moderator can answer the preview fixture checklist without looking at Audience. | T-PRES-PREVIEW |
| PRES-04 | The compact preview is not required to prove final 1920×1080 typography or across-room legibility. That proof uses LEG-01 through LEG-08. | Preview acceptance never substitutes for the physical Audience protocol. | T-PRES-PREVIEW-LIMIT |
| PRES-05 | Frequent and safety actions remain reachable without horizontal scrolling or traversing the full chart catalogue: Open Audience Display/Reopen Audience Display, connection status, Previous Step, Next Step, Play/Pause, direct position, cadence, Blackout Audience/Restore Audience, and End Presentation. | From any catalogue position, each action is already in the viewport or reachable through one persistent direct invocation; no catalogue scroll is required. | T-PRES-REACH |
| PRES-06 | Scene selection is bounded to four. At the cap, additional inclusion actions are reason-disabled until a selected chart is removed. | Fifth-chart fixture cannot silently replace or exceed the selected set and explains the cap. | T-PRES-CAP |
| PRES-07 | Manual cueing includes Previous, Next, and direct position. Optional autoplay includes Play and Pause. All enabled actions update controller, preview, and Audience truthfully. | Manual and automatic fixtures produce the same deterministic time positions. | T-PRES-PLAYBACK |
| PRES-08 | Each Chrono Group stores an authored default cadence from a small fixed V3 set. Present activates that default for the group. The moderator may choose another fixed rate for the current session; the override is ephemeral and does not mutate the authored default or bundle. | Switch-away/back and export fixtures distinguish authored default from session override. | T-PRES-CADENCE |
| PRES-09 | The fixed cadence set is Slow (one step every 2 seconds), Normal (one step every 1 second), and Fast (one step every 0.5 seconds). | Measured automatic step intervals match the selected cadence, excluding a documented single-frame rendering allowance. | T-PRES-RATES |
| PRES-10 | Blackout, disconnect/reconnecting, or leaving Present immediately pauses autoplay at the current frame. Restore, reconnection, or return remains paused and requires explicit Play. | No time position advances during any interruption fixture. | T-PRES-SAFETY-PAUSE |
| PRES-11 | Previous, Next, direct seek, or Chrono Group change during autoplay applies the requested cue and then leaves playback paused. | The resulting position/group is stable until explicit Play. | T-PRES-MANUAL-PAUSE |
| PRES-12 | Autoplay stops and remains paused at the final position; it does not loop or reset. Play is reason-disabled until the moderator seeks earlier or changes group. Previous remains available when valid. | Endpoint fixture remains on the final frame for two cadence intervals. | T-PRES-ENDPOINT |

## 11. Complete presentation lifecycle and state matrix

Connection state and output state are separate dimensions. Blackout can coexist with a connection state; controller status must expose both.

| State ID | State and entry | Controller contract | Audience contract | Allowed exits | Test |
|---|---|---|---|---|---|
| LIFE-01 | Not opened: no Audience session/window has been initiated. | Use COPY-09 and the real Open Audience Display action. Preserve the current controller composition. | No Audience surface exists. | Open Audience Display → Waiting. | T-LIFE-NOT-OPEN |
| LIFE-02 | Waiting: Audience window is loading, has sent ready without receiving a valid snapshot, or is completing initial handshake. | Show opening/waiting separately from connected and expose blocked-popup or load errors when applicable. | Show a calm, nontechnical waiting state; no setup details. | Valid snapshot → Connected empty or active; close/failure → Disconnected; End → Ended. | T-LIFE-WAIT |
| LIFE-03 | Connected with no selected charts: valid channel, zero-chart composition. | Use COPY-11 or COPY-12 and own the title-aware holding/blank choice. | Default: configured title/context plus COPY-11 holding text when enabled; COPY-11 neutral holding when disabled. Explicit deliberate blank contains no visible Audience copy. | Select Charts → Active; disconnect; blackout; End Presentation. | T-LIFE-CONNECTED-EMPTY |
| LIFE-04 | Connected and active: one-to-four charts with a valid snapshot. | Show complete scene, playback, preview, and connection state. | Render the deterministic scene without controller chrome. | Compose/cue; disconnect; blackout; End. | T-LIFE-ACTIVE |
| LIFE-05 | Disconnected: controller detects closed Audience or loss of a live channel. | Use COPY-14, include staleness and last confirmed scene/time, and expose Reopen Audience Display. Autoplay is paused. | If the window is closed, no surface exists. If still open, retain the last-valid output fully readable and add the icon with COPY-17's accessible name. | Reopen Audience Display → Reconnecting; End Presentation → Ended. | T-LIFE-DISCONNECTED |
| LIFE-06 | Reconnecting: a retained/reopened window is recovering and no fresh valid snapshot has completed restoration. | Use COPY-15, expose Reopen Audience Display if recovery fails, and remain paused. | Retain the last-valid output fully readable with the icon using COPY-17's reconnecting accessible name. No visible text and no dimming. | Fresh snapshot → Restored; failure → Disconnected; End Presentation → Ended. | T-LIFE-RECONNECTING |
| LIFE-07 | Reopened/restored: a fresh complete snapshot has restored the retained composition. | Use COPY-16, show exact restored scene/time/cadence and paused playback, and expose Resume Playback when playable. Remove stale status only after the valid snapshot. | Render the restored composition and remove the disconnect/reconnecting indicator. | Normal connected transitions. | T-LIFE-RESTORED |
| LIFE-08 | Blackout: moderator explicitly invokes Blackout from a live session. | Show Blackout active and Restore available. Preserve composition and time; pause autoplay. | Render intentional black output. If connection is simultaneously disconnected/reconnecting, the required icon-only connection indicator is the sole permitted status treatment. | Restore → prior retained scene, still paused; disconnect/reconnect; End. | T-LIFE-BLACKOUT |
| LIFE-09 | Ended: moderator invokes End Presentation. | Stop playback, terminate the channel, mark Ended, and expose starting a new Audience session. Retain the controller composition as ephemeral workspace state until reset/reload, but do not keep the old session alive. | Close when browser rules permit; otherwise show a neutral nontechnical ended state and do not reconnect automatically. | New Open creates a new session; no transition revives the ended channel. | T-LIFE-ENDED |

Additional lifecycle rules:

| Clause | Binding requirement | Observable pass condition | Test |
|---|---|---|---|
| LIFE-10 | Leaving Present for View or Build does not end or disconnect Audience. It pauses autoplay and preserves the current output/session. | Audience remains on the current output; return shows the same composition and paused frame. | T-LIFE-MODE-EXIT |
| LIFE-11 | Closing the Audience window or losing the channel is recoverable disconnection, not End Presentation. | Controller offers Reopen and preserves composition; state is not Ended. | T-LIFE-CLOSE-VS-END |
| LIFE-12 | Reopen/reload sends one fresh complete snapshot and preserves chart set, order, layout, title, deliberate blank, Chrono Group/position, and blackout state. | Restored state ledger equals the pre-disconnect ledger; playback remains paused. | T-LIFE-REOPEN-PERSIST |
| LIFE-13 | Blackout/Restore is reversible and never changes composition, deliberate-blank choice, filters, Chrono Group, or saved dashboard state. | Before/after ledgers match except blackout and paused-playback state. | T-LIFE-BLACKOUT-REV |
| LIFE-14 | Deliberate blank is controller-owned ephemeral scene state. It persists across disconnect/reconnect/reopen and mode changes, is distinct from Blackout, and is absent from exported dashboard bundles. | Blank and blackout have different controller states and outputs; export contains neither. | T-LIFE-BLANK |
| LIFE-15 | The disconnect/reconnecting indicator is icon-only, nontechnical, noninteractive, programmatically named, and placed in a small corner-class area that does not cover interpretation-critical content. Exact corner and dimensions are deferred. | No text or dimming appears; mandatory chart content remains unobscured; assistive output exposes Disconnected or Reconnecting. | T-LIFE-ICON |

## 12. Empty, waiting, loading, error, disconnect, reconnect, blackout, and ended states

All visible state and recovery copy in this section uses the exact labels in Section 12.1. Generic event terms elsewhere in the contract name semantics, not alternative visible labels.

| Clause | Surface/state | Required behavior | Prohibited behavior | Test |
|---|---|---|---|---|
| STATE-00 | Source load failure/no valid scenario | Use COPY-21 and preserve the last-good cached dashboard when one exists; otherwise expose Reload Dashboard and supported V3 Import Dashboard Package. | Blank shell, implied valid scenario, or partial application of invalid source state. | T-STATE-NO-SCENARIO |
| STATE-01 | Valid scenario with no pages | Use COPY-22 and preserve canonical zero-page geometry in View/Build. | Blank unexplained dashboard or a generic Add action. | T-STATE-NO-PAGES |
| STATE-01A | Page with no sections | Use COPY-23 and preserve page identity/context. | Empty unexplained page or a generic Add action. | T-STATE-NO-SECTIONS |
| STATE-01B | Section with no panels | Use COPY-24 and preserve section identity/context. | Empty unexplained section or a generic Add action. | T-STATE-NO-PANELS |
| STATE-01C | Zero Chrono Groups | Use COPY-25 in Build; View/Present label synchronized playback unavailable because no Chrono Group exists. | Read-only structure entry that implies an editable group exists. | T-STATE-NO-TIME-GROUPS |
| STATE-01D | Zero controller catalogue | Use COPY-26 on the controller. Audience retains its current valid holding/output state and exposes no recovery action. | Empty unexplained selector or an enabled scene-add action. | T-STATE-NO-CATALOGUE |
| STATE-02 | Panel loading | Reserve the canonical plot bounds, use COPY-06, identify loading programmatically, and replace in place without layout shift. | Reflow, indefinite unexplained blank, or geometry-changing spinner rows. | T-STATE-PANEL-LOAD |
| STATE-02A | Panel loaded with zero rows | Use COPY-29 inside the reserved canonical plot bounds. | Treating successful zero-row data as loading, failure, or fabricated zero values. | T-STATE-PANEL-EMPTY |
| STATE-03 | Panel error | Use COPY-07, preserve panel/plot bounds and unaffected data, and expose Retry Loading <chart name> only when implemented. | Stack trace, silent disappearance, or destructive retry. | T-STATE-PANEL-ERROR |
| STATE-04 | Partial data | Render valid portions truthfully, use COPY-28 for the missing series, and keep Continue with Available Data non-mutating. Retry Loading <chart name> may replace the partial state only after a successful load. | Fabricated zeroes, silent series omission, or changed chart semantics by mode. | T-STATE-PARTIAL |
| STATE-05 | Form validation | Preserve entered values, use COPY-03, identify each invalid field and correction, and prevent commit. | Silent coercion, editor closure, or partial saved configuration. | T-STATE-VALIDATION |
| STATE-06 | Save in flight/failure | Use COPY-04 while saving; serialize actions; on failure use COPY-08 and retain the draft with Retry Save and Discard Changes. | Duplicate commit, disabled-without-reason controls, or lost context. | T-STATE-SAVE |
| STATE-07 | Controller not opened/waiting | Use LIFE-01 and LIFE-02 with distinct status and actions. | Calling either Connected or showing a live preview as confirmed. | T-STATE-WAIT |
| STATE-08 | Connected empty | Use the title-aware holding default or explicit deliberate blank from LIFE-03. Controller always says Connected, no charts selected and names blank/holding choice. | Accidental unlabelled blank or conflation with Waiting, Blackout, or error. | T-STATE-CONNECTED-EMPTY |
| STATE-09 | Popup blocked/load failure | Keep composition and use COPY-13 with Retry Opening Audience on the controller. | Claim Connected or instruct Audience viewers to troubleshoot. | T-STATE-POPUP |
| STATE-10 | Missing/invalid presented panel | Reject the invalid scene change, use COPY-27 on the controller, and retain the last-valid Audience output unchanged. Audience receives no error prose or recovery action. | Blank Audience, partial silent scene, or malformed snapshot. | T-STATE-MISSING-PANEL |
| STATE-11 | Disconnected/reconnecting | Use LIFE-05 and LIFE-06 with COPY-14 through COPY-17; controller owns full detail, Audience owns only the icon indicator over a fully readable retained output. | Audience technical prose, dimming, controller stale-state silence, or autoplay continuation. | T-STATE-RECONNECT |
| STATE-12 | Blackout | Use LIFE-08 and preserve reversibility. | Clearing composition, masquerading deliberate blank as blackout, or hidden Restore. | T-STATE-BLACKOUT |
| STATE-13 | Ended | Use LIFE-09 and prevent automatic resurrection of the ended channel. | Treating End as recoverable disconnect or leaving the old Audience silently live. | T-STATE-ENDED |
| STATE-14 | Enabled/disabled/read-only | Enabled means operative. Disabled includes an adjacent or programmatically associated reason. Read-only is labelled read-only. Unsupported is absent. | Inert enabled controls, invisible locks, or disabled state conveyed only by colour. | T-STATE-TRUTHFUL |

### 12.1 Binding copy contract

COPY-01A through COPY-29 define exact primary English copy and action labels for the contract fixtures. An implementation may add the named object, chart, time, or field value where the placeholder requires it, but may not replace the actionable verb with a noun-only label such as Save, Cancel, Retry, Open, Reopen, or Reset. Copy may wrap; mandatory meaning and object identity may not truncate.

| Clause | Condition and surface | Exact primary user-facing copy | Exact recovery/action copy | Test |
|---|---|---|---|---|
| COPY-01A | Selected object with no draft; Build | <object name> selected. | Open <object name> Changes | T-COPY-SELECTED |
| COPY-01 | Active or suspended dirty object draft; Build | <object name> has unsaved changes. | Close <object name> Changes while open; Reopen <object name> Changes while suspended; Save Changes; Discard Changes | T-COPY-DRAFT |
| COPY-02 | Target/mode switch blocked by draft; Build | Save or discard changes to <object name> before leaving this edit. | Save Changes; Discard Changes; Stay in Build | T-COPY-SWITCH |
| COPY-03 | Validation failure; Build | Some changes need attention. Correct the highlighted fields, then save again. | Review Errors | T-COPY-VALIDATION |
| COPY-04 | Save in progress; Build | Saving changes… | No recovery action while the serialized save is active. | T-COPY-SAVING |
| COPY-05 | Save restored/succeeded; Build | Changes saved. | Reopen <object name> Changes when another edit is needed. | T-COPY-SAVED |
| COPY-06 | Panel/chart loading; View, Build substitute, preview | Loading <chart name>… | No action while progress is active. | T-COPY-LOADING |
| COPY-07 | Panel/chart load failure | Couldn’t load <chart name>. The previous valid dashboard state is unchanged. | Retry Loading <chart name> | T-COPY-LOAD-FAIL |
| COPY-08 | Save failure; Build | Changes couldn’t be saved. Your draft is still available. | Retry Save; Discard Changes | T-COPY-SAVE-FAIL |
| COPY-09 | Audience not opened; controller | Audience display is not open. | Open Audience Display | T-COPY-NOT-OPEN |
| COPY-10 | Initial Audience handshake; controller and Audience | Controller: Opening audience display… Audience: Waiting for the moderator. | Controller failure path uses COPY-13; Audience has no action. | T-COPY-WAITING |
| COPY-11 | Connected empty, holding; controller and Audience | Controller: Connected — no charts selected. Audience: Waiting for the next scene. When title/context is enabled, its configured copy appears before the holding sentence. | Select Charts; Show Blank Canvas | T-COPY-HOLDING |
| COPY-12 | Connected empty, deliberate blank; controller | Connected — blank canvas is live. Audience intentionally has no visible copy. | Select Charts; Show Holding Scene | T-COPY-BLANK |
| COPY-13 | Audience window blocked or failed to open; controller | Audience display couldn’t open. Allow pop-ups for this site, then try again. | Retry Opening Audience | T-COPY-POPUP |
| COPY-14 | Disconnected; controller only | Audience display disconnected. The last scene may be stale. | Reopen Audience Display; End Presentation | T-COPY-DISCONNECTED |
| COPY-15 | Reconnecting; controller only | Reconnecting audience display. The last scene remains visible but may be stale. | Reopen Audience Display after failed recovery; End Presentation | T-COPY-RECONNECTING |
| COPY-16 | Fresh snapshot restored; controller | Audience display restored. Playback is paused. | Resume Playback | T-COPY-RESTORED |
| COPY-17 | Audience disconnect/reconnect icons | No visible text. Accessible names are exactly Audience display disconnected and Audience display reconnecting. | No Audience action; controller uses COPY-14 through COPY-16. | T-COPY-ICON |
| COPY-21 | Source load failure/no valid scenario; application frame | Dashboard couldn’t load. No valid scenario is available. | Reload Dashboard; Import Dashboard Package | T-COPY-NO-SCENARIO |
| COPY-22 | Valid scenario with no pages; View/Build | This dashboard has no pages. | Create Page | T-COPY-NO-PAGES |
| COPY-23 | Page with no sections; View/Build | This page has no sections. | Create Section | T-COPY-NO-SECTIONS |
| COPY-24 | Section with no panels; View/Build | This section has no panels. | Add Panel to Section | T-COPY-NO-PANELS |
| COPY-25 | Zero Chrono Groups; Build | No Chrono Groups have been created. | Create Chrono Group | T-COPY-NO-TIME-GROUPS |
| COPY-26 | Zero controller catalogue items; Present/controller | No charts are available to present from this dashboard. | Open Build to Add Charts | T-COPY-NO-CATALOGUE |
| COPY-27 | Missing or invalid presented panel; controller only | Couldn’t add <panel name> to the scene. The Audience is still showing the last valid scene. | Remove Missing Panel from Scene; Choose Another Chart | T-COPY-MISSING-PANEL |
| COPY-28 | User-visible partial chart data | <chart name> is showing partial data. <series name> is unavailable. | Retry Loading <chart name>; Continue with Available Data. Audience shows <series name> unavailable within the affected chart and has no action. | T-COPY-PARTIAL |
| COPY-29 | Successfully loaded chart with zero rows | No data is available for <chart name>. | Retry Loading <chart name>; Build additionally offers Review <chart name> Data Settings. Audience shows the same sentence within the chart and has no action. | T-COPY-NO-CHART-DATA |

| Clause | Copy truthfulness requirement | Observable pass condition | Test |
|---|---|---|---|
| COPY-18 | Primary and recovery copy must describe the current state and the next action that can actually resolve it. | Every action in COPY-01A through COPY-29 is enabled only when its named operation is implemented; otherwise the state names why it is unavailable. | T-COPY-TRUTHFUL |
| COPY-19 | Audience never shows technical connection prose, troubleshooting, or recovery actions. The icon-only names in COPY-17 are programmatic, not visible text. | Audience screenshots contain zero controller/recovery prose in disconnected/reconnecting states, while accessibility inspection exposes the exact name. | T-COPY-AUDIENCE |
| COPY-20 | Error copy retains the object/chart name and user draft or last-valid-state consequence. | Validation, load, save, popup, and recovery fixtures can each identify what failed and what remains safe. | T-COPY-ERROR-CONTEXT |

## 13. Audience legibility requirements

### 13.1 Mandatory four-chart content

At the densest supported four-chart scene, every chart must remain independently interpretable. The following are mandatory and may not be removed as a density shortcut:

- chart title;
- legend category names and their mapping to marks;
- axis titles and units;
- major endpoint and major tick values needed to interpret scale;
- active synchronized-time value when relevant;
- every annotation designated as key by the V3 chart definition.

Minor ticks and dense secondary labels may be simplified only when doing so does not change meaning, hide a designated key annotation, or make the scale ambiguous.

| Clause | Binding requirement | Observable pass condition | Test |
|---|---|---|---|
| LEG-01 | Evaluate a four-chart 2×2 scene at exactly 1920×1080 on a 75–85-inch 1080p display or equivalently sized projection in a medium exercise room, with the farthest viewer 4–6 metres away. | The test record names physical image size, resolution, farthest distance, ambient condition, and fixture hash. | T-LEG-SETUP |
| LEG-02 | Use at least three viewers with normal or corrected-to-normal vision who did not author the candidate. No zoom, hover, controller preview, moderator explanation, or closer inspection is allowed. | All observers remain at the marked distance and use only the Audience output. | T-LEG-PROTOCOL |
| LEG-03 | Each viewer must correctly transcribe or identify every mandatory item for all four charts from a fixture answer sheet. | All mandatory prompts are correct for all three viewers; any missed or ambiguous mandatory item fails. | T-LEG-READ |
| LEG-04 | Mandatory text cannot be clipped, overlapped, or truncated unless its full value is simultaneously visible in another noninteractive Audience element that preserves chart association. | Automated bounds inspection and physical review find zero clipped/overlapped mandatory items. | T-LEG-BOUNDS |
| LEG-05 | Wrapping may not change a label's association, reading order, unit, sign, or value. Ellipsis is prohibited for mandatory items. | Long-title, long-legend, negative-value, and unit fixtures are read correctly. | T-LEG-WRAP |
| LEG-06 | Critical text has at least 4.5:1 contrast against its immediate background; large critical text and essential graphical marks have at least 3:1. Meaning is not conveyed by colour alone. | Measured contrast and non-colour association checks pass for every mandatory item/series. | T-LEG-CONTRAST |
| LEG-07 | Title-off returns space deterministically but never removes chart titles or other mandatory per-chart context. | Title-on/off geometry snapshots preserve the mandatory chart ledger. | T-LEG-TITLE |
| LEG-08 | Controller preview passing does not satisfy LEG-01 through LEG-07. | A candidate includes separate physical Audience evidence. | T-LEG-INDEPENDENT |

## 14. Step 4 common fixtures, viewports, tasks, and evaluation scenarios

Every candidate must be evaluated with the same fixtures. Candidate-specific substitutions are not comparable evidence.

### 14.1 Fixture ledger

FIX-00 is binding: every Step 4 candidate consumes the same Step 4 logical fixture signatures, values, cardinalities, and scripted state transitions below. A candidate may materialize them in disposable prototype data without creating repository data files, but may not replace, omit, randomize, or candidate-tune them. Evidence records the immutable signature and script step. The signatures are contract identifiers rather than hashes of current mutable source files. FIX-OFFLINE is explicitly a later implementation fixture and is not executed by Step 4 candidates.

| Fixture ID and immutable signature | Deterministic definition and variants covered |
|---|---|
| FIX-DASH-01 — simex-ui-v3/base-biomedical/r1 | Current source V3 Biomedical page at the accepted Step 2 content baseline: one active scenario, three configured pages, existing section/panel order including 40 catalogue panels, default filters, loaded fonts, and fixed synchronized-time positions. View and Build use the same configuration/data ledger and scroll anchor. |
| FIX-SCENARIO-SHAPES — simex-ui-v3/scenario-0-1-many/r1 | S0: no valid scenario after deterministic source-load failure and exact COPY-21 recovery. S1: exactly one valid scenario named SimEx Training Exercise. S-many: an import envelope containing two scenarios, deterministically rejected because multi-scenario management is outside the one-scenario V3 contract. This instantiates zero/one/many input shapes without adding multi-scenario product behavior. |
| FIX-CARDINALITY-ZERO — simex-ui-v3/cardinality-zero/r1 | Deterministic zero-shape script: start with one valid scenario and zero pages (COPY-22); Create Page produces one empty page with zero sections (COPY-23); Create Section produces one empty section with zero panels (COPY-24). Throughout the script there are zero Chrono Groups/members (COPY-25) and zero presentation catalogue items (COPY-26). |
| FIX-CARDINALITY-ONE — simex-ui-v3/cardinality-one/r1 | One scenario, one page, one section, one panel, one Chrono Group containing that one panel, one catalogue item, and exactly one supported layout preset for the panel. All names and values are fixed by this signature. |
| FIX-CARDINALITY-MANY — simex-ui-v3/cardinality-many-long/r1 | One scenario, three pages, eight sections, 40 panels/catalogue items, three Chrono Groups, six members in the largest group, and three supported layout presets for the selected panel. The final object in each collection uses FIX-LONG text. |
| FIX-TOP — simex-ui-v3/target-top-bio-confirmed/r1 | bio_confirmed_cases in its canonical top position within FIX-DASH-01. |
| FIX-LEFT — simex-ui-v3/target-left-bio-r-values/r1 | bio_r_values in its canonical left-edge position within FIX-DASH-01. |
| FIX-RIGHT — simex-ui-v3/target-right-bio-region-comparison/r1 | bio_region_comparison in its canonical right-edge position within FIX-DASH-01. |
| FIX-CENTRE — simex-ui-v3/target-centre-bio-choropleth/r1 | bio_municipality_choropleth_animation in its canonical central/tall position within FIX-DASH-01. |
| FIX-BOTTOM — simex-ui-v3/target-bottom-bio-vaccination/r1 | bio_vaccination_rate in its canonical bottom position within FIX-DASH-01. |
| FIX-PANEL-STATES — simex-ui-v3/panel-states/r1 | Five fixed panels in one section: P-loaded has complete data; P-loading remains pending until scripted release and uses COPY-06; P-empty resolves successfully with zero rows and uses COPY-29; P-partial has one valid and one deterministically missing series and uses COPY-28; P-error returns the fixed COPY-07 load error. Each preserves the same declared bounds across state changes. |
| FIX-TIME-STATES — simex-ui-v3/Chrono Group-states/r1 | TG-zero has zero members; TG-one has one valid member/primary clock; TG-many has six members and a valid primary clock/datum/matching rule; TG-bad-clock references a missing primary member; TG-bad-match has one deterministic incompatible matching rule. Authored defaults cover Slow, Normal, and Fast; the moderator override script changes Normal to Fast without mutating the default. |
| FIX-LAYOUT-STATES — simex-ui-v3/layout-preset-states/r1 | L-zero is a panel type with zero applicable resize presets and a reason-disabled selector; L-one has exactly one supported preset; L-many has three supported V3 span/height presets; L-invalid is a dirty attempted unsupported combination that must fail validation without geometry mutation. |
| FIX-DRAFT-STATES — simex-ui-v3/object-draft-script/r1 | One Panel object follows the fixed sequence selected-no-draft → open-clean → dirty-valid → suspended → resumed → validation-error → corrected → saving → deterministic save-failure → retry-success. A second run ends with Discard Changes. A mode/target-switch attempt occurs while suspended. |
| FIX-PACKAGE-STATES — simex-ui-v3/package-script/r1 | One valid current-V3 import; one malformed current-V3 import; one V2 package; one valid download; one source reset with differing browser state; one reset failure. Every mutating operation is repeated with an active object draft to exercise resolution. |
| FIX-PRESENT-LIFECYCLE — simex-ui-v3/presentation-lifecycle-script/r1 | Fixed script covers Not opened → Waiting → Connected empty title-on → Connected empty title-off holding → deliberate blank → Connected active with 1/2/3/4 charts → playing at each rate → manual-intervention pause → Blackout → Restore → Disconnected → Reconnecting → Restored → leave Present/return → Ended → new session. It includes COPY-13 blocked popup, COPY-26 zero catalogue, COPY-27 invalid panel with retained last-valid Audience, and failed reconnect branches. |
| FIX-AUD-04 — simex-ui-v3/audience-four-chart-legibility/r1 | Four fixed charts with long titles, multiple legend categories, axis titles/units, positive and negative major endpoint/tick values, active time, designated key annotations, and dense non-key secondary labels. Correct-answer ledger is immutable under this signature. |
| FIX-LONG — simex-ui-v3/long-content/r1 | Fixed strings: 96-character scenario name, 72-character page label, 120-character section title, 128-character panel title, 80-character Chrono Group name, 64-character legend category, and 240-character validation/error explanation. |
| FIX-ARCH-DECL — simex-ui-v3/step4-architecture-declaration/r1 | Step 4 only: the same declaration form for every candidate records proposed dependencies/assets, canonical renderer/shared-state use, static/offline feasibility, and Quorum boundary impact. Passing answers propose no new runtime-only remote dependency, no Quorum change, and no forked renderer/state. This is design evidence, not a functional runtime check. |
| FIX-OFFLINE — simex-ui-v3/static-offline-implementation/r1 | Later implementation verification only: FIX-DASH-01 after authoritative static install/cache preconditions, followed by network-disabled relaunch and core View/Build/Present/Audience cached-path script. Step 4 candidates do not execute or mock this check. |
| FIX-ACCESS — simex-ui-v3/access-input-motion/r1 | FIX-CARDINALITY-MANY with keyboard-only, touch, greyscale/non-colour, screen-reader state inspection, 200% text-size robustness where supported by the existing baseline, and reduced-motion enabled. |

### 14.2 Required viewport matrix

| Surface | Required viewports |
|---|---|
| View/Build parity and authoring | 1200×900, 1440×900, 768×1024, 1024×768, 390×844 |
| Present/controller | 1440×900 and 1024×768 |
| Audience | 1920×1080, plus the physical LEG-01 setup |

### 14.3 Required Build tasks

| Task ID | Scenario |
|---|---|
| TASK-B01 | Select each FIX target without creating a draft; open controls; make a valid object-local edit; verify canonical substitute where the original is obscured. |
| TASK-B02 | Suspend a dirty draft by Close and by root Escape; verify visible Reopen/Save/Cancel; resume and Save. |
| TASK-B03 | Repeat TASK-B02 and Cancel; verify saved render, selection, focus, and scroll restoration. |
| TASK-B04 | Trigger validation and save failures from open and suspended states; correct/retry without draft loss. |
| TASK-B05 | Attempt target and mode switches with a dirty draft; exercise Save, Cancel, and Stay outcomes. |
| TASK-B06 | Reorder a panel, move it between sections, create/manage a boundary, and select supported span/height presets while original and affected neighbours remain in actual context. |
| TASK-B07 | Edit scenario, page, section, panel, layout, and Chrono Group scopes, including membership, primary clock, datum/matching, and authored default cadence. |
| TASK-B08 | Exercise every visible enabled action and every disabled/read-only reason; verify no inert or misleading control. |
| TASK-B09 | Repeat clean, selected, open, dirty, suspended, saving, failed, saved, and cancelled states at every parity viewport with PAR measurements. |

### 14.4 Required Present/Audience tasks

| Task ID | Scenario |
|---|---|
| TASK-P01 | Not opened → Waiting → Connected empty with title/context → title-off neutral holding → explicit deliberate blank. |
| TASK-P02 | Compose one, two, three, and four charts; exercise every count-valid layout and deterministic order. |
| TASK-P03 | Verify controller preview composition and content checklist without looking at Audience. |
| TASK-P04 | Previous, Next, direct seek, group change, Play, Pause, all fixed rates, authored default, and ephemeral override. |
| TASK-P05 | While playing, exercise manual cue, Blackout, disconnect, reconnect, leave Present, and return; verify every safety pause. |
| TASK-P06 | Close Audience, Reopen, reload Audience, restore the full state ledger, and distinguish Disconnected/Reconnecting/Restored. |
| TASK-P07 | Blackout/Restore from active, holding, and deliberate-blank compositions; then End Presentation and verify the old channel cannot revive. |
| TASK-P08 | Exercise popup blocked, invalid panel, missing data, and connection failure without losing the last-valid scene. |
| TASK-P09 | Run the four-chart physical legibility protocol and title/wrapping/contrast fixtures. |

### 14.5 Coverage-test and hard-gate fixture map

Every listed test consumes the identical fixture IDs for every candidate. A test may reuse one fixture across several orthogonal states, but it may not synthesize an unregistered candidate-specific variant.

| Coverage test | Required identical fixtures |
|---|---|
| T-COVER-NAV | FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-DRAFT-STATES, FIX-LONG, FIX-ACCESS |
| T-COVER-STRUCTURE | FIX-SCENARIO-SHAPES, FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-LONG |
| T-COVER-EDITOR | FIX-DRAFT-STATES, FIX-LONG, FIX-ACCESS |
| T-COVER-TIME | FIX-TIME-STATES, FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY |
| T-COVER-CANVAS | FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-PANEL-STATES, FIX-TOP, FIX-LEFT, FIX-RIGHT, FIX-CENTRE, FIX-BOTTOM |
| T-COVER-LAYOUT | FIX-LAYOUT-STATES, FIX-DRAFT-STATES, FIX-TOP, FIX-LEFT, FIX-RIGHT, FIX-CENTRE, FIX-BOTTOM |
| T-COVER-CATALOGUE | FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-PRESENT-LIFECYCLE |
| T-COVER-PREVIEW | FIX-PRESENT-LIFECYCLE, FIX-PANEL-STATES, FIX-AUD-04 |
| T-COVER-PLAYBACK | FIX-TIME-STATES, FIX-PRESENT-LIFECYCLE |
| T-COVER-CONNECTION | FIX-PRESENT-LIFECYCLE |
| T-COVER-AUDIENCE | FIX-PRESENT-LIFECYCLE, FIX-AUD-04, FIX-LONG |
| T-COVER-DESTRUCTIVE | FIX-DRAFT-STATES, FIX-PACKAGE-STATES, FIX-CARDINALITY-MANY, FIX-LONG |
| T-COVER-KEYBOARD | FIX-DRAFT-STATES, FIX-CARDINALITY-MANY, FIX-PRESENT-LIFECYCLE, FIX-ACCESS |
| T-COVER-TOUCH | FIX-TOP, FIX-LEFT, FIX-RIGHT, FIX-CENTRE, FIX-BOTTOM, FIX-PRESENT-LIFECYCLE, FIX-ACCESS |
| T-COVER-MOTION | FIX-DRAFT-STATES, FIX-PRESENT-LIFECYCLE, FIX-ACCESS |
| T-COVER-RECOVERY | FIX-ARCH-DECL, FIX-PANEL-STATES, FIX-PACKAGE-STATES, FIX-PRESENT-LIFECYCLE |
| T-COVER-AT | FIX-DRAFT-STATES, FIX-PANEL-STATES, FIX-PRESENT-LIFECYCLE, FIX-ACCESS |
| T-COVER-ROBUST | FIX-SCENARIO-SHAPES, FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-PANEL-STATES, FIX-TIME-STATES, FIX-LAYOUT-STATES, FIX-LONG |

| Hard gate | Required identical fixtures |
|---|---|
| GATE-H01 | FIX-DASH-01, FIX-DRAFT-STATES, FIX-LAYOUT-STATES, FIX-TOP, FIX-LEFT, FIX-RIGHT, FIX-CENTRE, FIX-BOTTOM |
| GATE-H02 | FIX-SCENARIO-SHAPES, FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-TIME-STATES, FIX-LAYOUT-STATES, FIX-PACKAGE-STATES |
| GATE-H03 | FIX-DASH-01, FIX-DRAFT-STATES, FIX-LAYOUT-STATES, FIX-TOP, FIX-LEFT, FIX-RIGHT, FIX-CENTRE, FIX-BOTTOM |
| GATE-H04 | FIX-DRAFT-STATES, FIX-LONG, FIX-ACCESS |
| GATE-H05 | FIX-CARDINALITY-MANY, FIX-TOP, FIX-LEFT, FIX-RIGHT, FIX-CENTRE, FIX-BOTTOM, FIX-ACCESS |
| GATE-H06 | FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-TIME-STATES, FIX-PRESENT-LIFECYCLE, FIX-AUD-04 |
| GATE-H07 | FIX-PRESENT-LIFECYCLE, FIX-PANEL-STATES, FIX-LONG |
| GATE-H08 | FIX-AUD-04, FIX-ACCESS |
| GATE-H09 | Every Step 4 fixture mapped to T-COVER-NAV through T-COVER-ROBUST above; implementation-only FIX-OFFLINE is excluded from Step 4 execution |
| GATE-H10 | FIX-ARCH-DECL, FIX-DASH-01, FIX-PACKAGE-STATES |
| GATE-H11 | FIX-SCENARIO-SHAPES, FIX-CARDINALITY-ZERO, FIX-CARDINALITY-ONE, FIX-CARDINALITY-MANY, FIX-DRAFT-STATES, FIX-PANEL-STATES, FIX-TIME-STATES, FIX-PACKAGE-STATES, FIX-PRESENT-LIFECYCLE, FIX-AUD-04, FIX-ACCESS |

After implementation, T-ARCH-08A through T-ARCH-08E consume the implemented dependency inventory, production static build, FIX-OFFLINE, Quorum diff, and canonical-runtime state ledger respectively. Those later artifacts are not Step 4 hard-gate inputs.

## 15. Hard pass/fail gates versus comparative design criteria

### 15.1 Hard gates

Failure of one hard gate rejects a candidate regardless of comparative strengths.

| Gate ID | Hard gate | Required tests |
|---|---|---|
| GATE-H01 | Exact View/Build geometry parity and no horizontal overflow. | All T-PAR and T-RESP-MATRIX tests |
| GATE-H02 | Reachable, truthful scope/package operations and constrained-grid layout. | All T-SCOPE, T-PKG, T-DISC, and T-STATE-TRUTHFUL tests |
| GATE-H03 | Selected-object/context visibility and canonical substitute fidelity. | All T-VIS and T-SUB tests |
| GATE-H04 | Single-object transactional draft, visible suspension, no silent discard, and focus/scroll preservation. | All T-EDIT tests |
| GATE-H05 | Keyboard/touch responsive operation at every viewport and target position. | All T-RESP tests |
| GATE-H06 | Controller authority, passive Audience, frequent/safety action reachability, bounded deterministic composition, and locked playback behavior. | All T-PRES tests |
| GATE-H07 | Complete truthful presentation lifecycle, recovery, blank, blackout, and End distinctions. | All T-LIFE and presentation T-STATE tests |
| GATE-H08 | Four-chart across-room interpretation-critical legibility. | All T-LEG tests |
| GATE-H09 | Complete state coverage for empty/loading/error/partial/overflow/long-text and lifecycle conditions. | All T-COVER tests |
| GATE-H10 | Step 4 candidate neutrality and declared architecture/scope compatibility. | T-AUTH-03, T-AUTH-05, T-ARCH-01 through T-ARCH-07, and T-ARCH-DESIGN-DECL; T-ARCH-08A through T-ARCH-08E are not Step 4 rejection tests |
| GATE-H11 | Binding copy and controlled semantic color roles. | All T-COPY and T-COLOR tests |

### 15.1.1 Later implementation acceptance, not Step 4 candidate rejection

| Implementation gate | Binding evidence after production implementation exists |
|---|---|
| IMPL-A01 | T-ARCH-08A implemented dependency/asset inventory |
| IMPL-A02 | T-ARCH-08B production-like static-origin launch and smoke path |
| IMPL-A03 | T-ARCH-08C authoritative offline/PWA run using FIX-OFFLINE |
| IMPL-A04 | T-ARCH-08D implemented Quorum protocol/schema diff |
| IMPL-A05 | T-ARCH-08E canonical-runtime renderer/state-ledger comparison |

### 15.2 Comparative Step 4 criteria

Only candidates that pass every hard gate are compared. These criteria select among valid approaches rather than repairing a failed one:

| Criterion ID | Comparative criterion | Common evidence |
|---|---|---|
| CRIT-C01 | Speed and number of actions for common object-local edits. | TASK-B01, TASK-B02 |
| CRIT-C02 | Clarity of selected scope, active draft, and structural consequences. | TASK-B05, TASK-B06 |
| CRIT-C03 | Cognitive load of essential/contextual/advanced disclosure. | TASK-B07, FIX-LONG |
| CRIT-C04 | Ease of moving between target and controls at five positions and viewports. | TASK-B09 |
| CRIT-C05 | Moderator workload while composing and cueing a dense scene. | TASK-P02 through TASK-P05 |
| CRIT-C06 | Speed of recognizing connection, output, and recovery state. | TASK-P01, TASK-P06 through TASK-P08 |
| CRIT-C07 | Perceived hierarchy, calmness, and visual coherence across View, Build, controller, and Audience. | Matched candidate captures after hard gates pass |
| CRIT-C08 | Learnability without relying on hover, prior training, or hidden gestures. | First-use walkthrough of common tasks |

### 15.3 Semantic color-role boundary

This subsection limits semantic use without selecting a hue, value, palette, allocation ratio, theme, or visual direction.

| Clause | Binding semantic restriction | Observable pass condition | Test |
|---|---|---|---|
| COLOR-01 | A Step 4 candidate may define zero or exactly one non-status emphasis/accent role. It must declare one eligible use policy: current mode, current selection, or the primary non-destructive action. | The candidate role inventory contains no second accent role and names one eligible policy. | T-COLOR-ACCENT-COUNT |
| COLOR-02 | Within one surface/state, the optional accent role may mark only the declared eligible use. It may not simultaneously mark current mode, current selection, and primary action. Reuse on another surface is allowed only when the same declared semantic applies and a distinct text, icon, shape, or programmatic cue identifies state. | State captures and semantic-token inspection show one accent meaning per surface and no colour-only ambiguity. | T-COLOR-ACCENT-SCOPE |
| COLOR-03 | Success, warning, error, disconnect/reconnecting, and blackout are separate semantic status roles. None may borrow the optional accent role or each other's role. | Token/role ledger and lifecycle fixtures expose distinct status names and non-colour cues. | T-COLOR-STATUS |
| COLOR-04 | Destructive actions use a separate destructive-action semantic role and never the optional accent or ordinary error-status role. | Removal, Reset Dashboard to Source, and End Presentation are distinguishable from primary and recoverable-error actions by text plus at least one icon/shape/programmatic cue. | T-COLOR-DESTRUCTIVE |
| COLOR-05 | Every accent, status, and destructive role has a text, icon, shape, position-independent state name, or programmatic cue in addition to colour. | Greyscale and accessibility-state checks preserve meaning for every role. | T-COLOR-NONCOLOUR |
| COLOR-06 | Hue, value, exact contrast implementation, theme, and palette remain Step 4 choices, subject to LEG-06 and existing focus/control contrast tests. | Different candidates may use materially different palettes while all role and contrast tests pass. | T-COLOR-CANDIDATE |

## 16. Traceability from Step 2 findings

### 16.1 Primary UI-REVIEW Blocker and High findings

| Finding | Severity | Contract clauses | Step 4 evidence/gate |
|---|---|---|---|
| VB-01 — Build does not preserve View canvas, grid, panel, or plot geometry at any required viewport. | Blocker | PAR-01 through PAR-09 | TASK-B09; GATE-H01 |
| ED-01 — Editing controls cover or become spatially disconnected from the selected panel. | Blocker | VIS-01 through VIS-08; RESP-02 through RESP-04 | TASK-B01, TASK-B06, TASK-B09; GATE-H03 |
| VB-02 — Build inserts a 38 px inline action row and reduces chart plot height. | High | PAR-05, PAR-06 | T-PAR-PLOTS-ALL, T-PAR-CHROME-ZERO; GATE-H01 |
| ED-02 — Keyboard/cancellation behavior is inconsistent; Escape hides controls but leaves editing active and Cancel changes scroll. | High | EDIT-01 through EDIT-13 | TASK-B02 through TASK-B05; GATE-H04 |
| ED-03 — Visible panel actions lack callbacks and selected-state styling is not truthful. | High | SCOPE-08; STATE-14 | TASK-B08; GATE-H02 |
| PR-01 — Controller chart choice creates a long scroll burden and separates critical actions. | High | PRES-05; DISC-06 | TASK-P02 through TASK-P05; GATE-H06; CRIT-C05 |
| AU-01 — Four-chart Audience typography is not across-room legible. | High | LEG-01 through LEG-08 | TASK-P09; GATE-H08 |

Primary trace count: 2 Blocker findings and 5 High findings mapped; none omitted or downgraded.

### 16.2 Subsidiary audit severity findings

| Source finding/title | Source priority | Contract clauses | Evidence |
|---|---|---|---|
| Editing matrix — Chart editing behaves as a session while responsive dismissal can hide its controls. | High | EDIT-03, EDIT-06 through EDIT-09 | TASK-B02, TASK-B05 |
| Editing matrix — Escape hides the 1024 sheet but leaves selection/edit lock active without focus return. | High | EDIT-07, EDIT-08, EDIT-12 | TASK-B02, T-EDIT-SCROLL |
| Control map — A visible responsive inspector can be dismissed while the chart edit session and disabled global navigation remain active. | High | EDIT-03, EDIT-06, EDIT-09 | TASK-B02, TASK-B05 |
| Control map — Chrono Group selection presents an inspectable object but no editing operation. | High | SCOPE-06, DISC-02, DISC-03 | TASK-B07 |
| Control map — Panel layout/sizing is part of Build but has no exposed control surface. | High | SCOPE-05, VIS-02, VIS-03 | TASK-B06 |
| Present/Audience — Audience chart internals do not scale with scene density. | P0 | LEG-01 through LEG-08 | TASK-P09, GATE-H08 |
| Present/Audience — Controller monitor supports scene recognition but not Audience fidelity. | P0 | PRES-03, PRES-04 | TASK-P03, TASK-P09 |
| Present/Audience — Controller operation requires a long document scroll. | P1 | PRES-05, DISC-06 | TASK-P02 through TASK-P05 |
| Present/Audience — Reloaded or reopened Audience temporarily appears waiting before restoration. | P1 | LIFE-02, LIFE-06, LIFE-07, LIFE-12 | TASK-P06 |
| Present/Audience — Connected empty with title hidden is a completely blank light display. | P1 | LIFE-03, LIFE-14, STATE-08 | TASK-P01 |
| Present/Audience — Playback is manual stepping with no Play/Pause. | P1 | PRES-07 through PRES-12 | TASK-P04, TASK-P05 |

Subsidiary severity trace count: 2 editing High, 3 control-map High, 2 Present/Audience P0, and 4 Present/Audience P1 findings mapped.

## 17. Explicit Step 4 and implementation deferrals

DEFER-01 through DEFER-12 are intentional freedoms, not missing requirements:

| Clause | Deferred choice | Boundary that remains binding |
|---|---|---|
| DEFER-01 | Control, command-palette, popup, popover, drawer, sheet, or other surface pattern. | Zero geometry cost, reachability, focus, visibility, and draft outcomes remain fixed. |
| DEFER-02 | Whether and how a candidate centres or pans the canvas. | Target/context visibility and reversible focus/scroll behavior remain fixed. |
| DEFER-03 | Embedded preview versus detached editor pattern. | Task-dependent original visibility and canonical substitute fidelity remain fixed. |
| DEFER-04 | Exact control placement, edge collision solution, and responsive arrangement. | All target positions/viewports and no-cover/no-reflow gates remain fixed. |
| DEFER-05 | Rails, modals, docks, sheets, palettes, or combinations. | None may consume dashboard geometry or create an invisible session. |
| DEFER-06 | Exact widths, heights, insets, gaps, radii, and target-surface dimensions beyond the locked parity, 44-pixel activation minimum, and Audience test setup. | Candidates must still pass geometry, reachability, and legibility tests. |
| DEFER-07 | Colour hues/values, fonts, type scales, spacing tokens, shadows, borders, and illustration treatment. | COLOR-01 through COLOR-06, contrast, non-colour meaning, wrapping, legibility, and state truthfulness remain fixed. |
| DEFER-08 | Animation and transition language, including reduced-motion alternatives. | State changes cannot depend on motion and safety/lifecycle timing remains fixed. |
| DEFER-09 | Light, dark, or adaptive theme direction. | Chart/status semantics, contrast, blackout, and deliberate blank distinctions remain fixed. |
| DEFER-10 | The visual direction and exact icon geometry for new controls/statuses. | Generated SimEx glyph authority, accessible naming, and the icon-only disconnect contract remain fixed. |
| DEFER-11 | Actual production components, CSS selectors, state modules, schema migrations, functional builds, runtime tests, and file plan. | Step 4 produces disposable candidates and FIX-ARCH-DECL evidence only. T-ARCH-08A through T-ARCH-08E, FIX-OFFLINE, static-build launch, offline/PWA runtime, Quorum diff, and canonical-runtime ledger checks occur during later implementation verification. |
| DEFER-12 | Exact supported panel preset catalogue beyond use of V3-constrained width/span and height presets. | Free-form geometry remains out of scope and candidates must demonstrate preset behavior. |

No Step 4 candidate may reopen architecture, universal mode access, V3-only scope, transactional editing, same-computer presentation, or any locked behavior in this contract.

## 18. UI considerations and state-coverage inventory

This section applies the UI-consideration probe to concrete contract surfaces. Dismissal is explicit where a state does not apply. It covers shape-rooted states; accessibility, reduced motion, real-time recovery, and offline concerns are added below.

### Formal closed-taxonomy probe disposition

The post-checker `gsd-ui-phase` probe was run against the explicit element kinds in the `Surface/kind` column below. It raised 66 applicable surface/category pairs. Every pair is resolved explicitly by an existing truth/test or dismissed here with an architectural reason; there are zero unresolved and zero backstop-only pairs. `Covered` means the named contract clauses and `T-COVER-*` fixture provide explicit verification.

| Surface | Covered categories and binding truth | Dismissed categories and required reason |
|---|---|---|
| COVER-01 | Overflow and long text: navigation labels wrap or expose their full value without losing active/pending state or causing page-level horizontal overflow (`DISC-06`, `RESP-07`, `T-COVER-NAV`). | Loading and error: configured mode/page navigation is local and has no independent load or submit operation; source/configuration failure is owned by `STATE-00` and COVER-02. |
| COVER-02 | Empty, error, populated, overflow, zero/one/many, and long text: exact structural zero/error copy, atomic valid structures, bounded collection scrolling, and full object identity are exercised by `STATE-00` through `STATE-01D`, `DISC-06`, and `T-COVER-STRUCTURE`. | Loading: the collection appears only after the local V3 configuration has loaded. Partial: configuration validation is atomic; an invalid or incomplete structure is rejected rather than partially applied. |
| COVER-03 | Empty/unfilled, loading/in-flight, error, partial, and long text: an unfilled required field is a retained dirty-invalid draft; saving and save failure preserve it; partial forms and long values remain editable (`EDIT-03` through `EDIT-13`, `STATE-05`, `STATE-06`, `T-COVER-EDITOR`). | None. |
| COVER-04 | Empty, error, populated, partial, overflow, zero/one/many, and long text: membership, clocks, matching, and cadence have fixed empty/cardinality/invalid fixtures; collections scroll internally and retain full chart identity (`SCOPE-06`, `DISC-06`, `STATE-01C`, `T-COVER-TIME`). | Loading: membership is edited from the already-loaded local V3 configuration and has no independent fetch state. |
| COVER-05 | Empty, loading, error, populated, partial, overflow, and zero/one/many: reserved canonical bounds, exact state copy, fixed cardinalities, vertical overflow, and prohibited horizontal overflow are exercised by `PAR`, `STATE-00` through `STATE-04`, and `T-COVER-CANVAS`. | None. |
| COVER-06 | Empty, error, partial, and long text: zero applicable presets is reason-disabled; dirty/invalid combinations and save failure retain the last-good layout; full preset meaning survives long labels (`SCOPE-05`, `STATE-14`, `RESP-07`, `T-COVER-LAYOUT`). | Loading: supported presets are enumerated from the loaded V3 schema and do not load independently. |
| COVER-07 | Empty, error, populated, partial, overflow, zero/one/many, and long text: zero-to-many catalogue/cardinality fixtures, invalid-panel rejection, retained last-valid composition, bounded internal scrolling, and full chart identity are exercised by `PRES-02`, `PRES-05`, `PRES-06`, `STATE-01D`, `STATE-10`, and `T-COVER-CATALOGUE`. | Loading: the catalogue is derived from the loaded local V3 configuration and has no independent fetch state. |
| COVER-08 | Empty, loading, error, populated, overflow, and long text: no-session/waiting/active/error states and required composition/content fields remain visible without page-level horizontal overflow (`PRES-03`, `PRES-04`, `DISC-06`, `LIFE-01` through `LIFE-09`, `T-COVER-PREVIEW`). | None. |
| COVER-09 | Long text: playback action, cadence, endpoint, pause, and unavailable-reason labels preserve their full meaning without horizontal page overflow (`PRES-05`, `PRES-07` through `PRES-12`, `RESP-07`, `T-COVER-PLAYBACK`). | None. |
| COVER-10 | Overflow and long text: lifecycle/error copy wraps or scrolls within controller status while frequent and safety actions stay directly reachable (`PRES-05`, `DISC-06`, `COPY-09` through `COPY-17`, `T-COVER-CONNECTION`). | None. |
| COVER-11 | Empty, loading, error, populated, overflow, and long text: holding/waiting, retained-last-valid failure, one-to-four-chart output, and mandatory long content are exercised by `LIFE`, `STATE`, `LEG`, and `T-COVER-AUDIENCE`. | None. |
| COVER-12 | Loading/in-flight, error, overflow, and long text: pending destructive commits, validation/save failure, and long target/consequence copy preserve the named object and recovery actions (`SCOPE-07`, `EDIT-10`, `EDIT-11`, `DISC-06`, `T-COVER-DESTRUCTIVE`). | Empty: confirmation cannot open without a selected, named target and consequence. Partial: destructive confirmation is atomic; incomplete target/consequence state prevents invocation rather than producing a partial form. |

| Surface ID | Surface/kind | Required states and authored behavior | Dismissed with reason | Contract/test |
|---|---|---|---|---|
| COVER-01 | Mode and page navigation; nav | Populated; active/current; pending mode switch; disabled-with-reason during draft resolution; long labels wrap without losing current state; keyboard focus visible. | Empty and loading dismissed: configured navigation is locally available before mode interaction. | MODE-05, RESP-06, RESP-07; T-COVER-NAV |
| COVER-02 | Structure/object collection; list-collection/nav | Zero pages uses COPY-22; zero sections COPY-23; zero panels COPY-24; zero Chrono Groups COPY-25; one; many; selected; collapsed/expanded if used; overflow scroll; long object names; removal updates selection truthfully. Source load/no valid scenario uses COPY-21. | Network loading dismissed: structure comes from loaded local V3 configuration; source/configuration failure is instantiated by FIX-SCENARIO-SHAPES and STATE-00. | SCOPE-01 through SCOPE-06, DISC-06; T-COVER-STRUCTURE |
| COVER-03 | Object editor; form | Clean, dirty-valid, dirty-invalid, partial form, saving, save failure, suspended, resumed, saved, cancelled, long values, destructive confirmation. | Collection zero/one/many dismissed: membership subforms are separately covered by COVER-04. | EDIT-01 through EDIT-13; T-COVER-EDITOR |
| COVER-04 | Chrono Group membership; form/list-collection | Zero groups uses COPY-25; zero members, one member, many members, missing/invalid primary clock, partial matching, valid membership, long chart names, authored cadence, session override distinction. | Media state dismissed: charts render on canvas/preview rather than inside the membership collection. | SCOPE-06, PRES-08, STATE-01C; T-COVER-TIME |
| COVER-05 | Dashboard canvas/panels; media/list-collection | Zero pages uses COPY-22; zero sections COPY-23; zero panels COPY-24; one/many panels; panel loading COPY-06; zero-row panel COPY-29; populated; partial data COPY-28; panel error COPY-07; long title/legend; selected; object-local substitute; structural affected set; vertical overflow; no horizontal overflow. | Form validation dismissed at render surface: validation belongs to COVER-03, while its visual consequence remains in the live substitute. | PAR, VIS, STATE-00 through STATE-04; T-COVER-CANVAS |
| COVER-06 | Layout preset workflow; interactive-control/form | No applicable preset, one preset, multiple presets, current preset, dirty change, invalid combination, save failure, affected-neighbour preview, reason-disabled unsupported choice. | Free-form overflow dismissed: arbitrary dimensions and placement are explicitly out of scope. | SCOPE-05, VIS-02, VIS-03; T-COVER-LAYOUT |
| COVER-07 | Controller chart catalogue; list-collection/form | Zero available uses COPY-26; one, many/long catalogue; 0–4 selected; fifth reason-disabled; missing/invalid panel uses COPY-27; long names; selected order; count-valid layouts. | Horizontal overflow dismissed as prohibited, not irrelevant. | PRES-02, PRES-05, PRES-06, STATE-01D, STATE-10; T-COVER-CATALOGUE |
| COVER-08 | Controller preview; media/static-content | No session, waiting, connected empty, active, deliberate blank, blackout, disconnected, reconnecting, restored, missing panel/error COPY-27, partial data COPY-28, stale content, current time, long title. | Final typography inspection dismissed: explicitly owned by physical Audience validation. | PRES-03, PRES-04, LIFE, STATE-10; T-COVER-PREVIEW |
| COVER-09 | Playback controls; interactive-control | No compatible Chrono Group; first, middle, final position; manual cue; playing; paused; authored cadence; overridden cadence; safety pause; manual-intervention pause; loading/recovery; reason-disabled endpoints. | Empty collection dismissed: group absence is represented as unavailable playback with reason. | PRES-07 through PRES-12; T-COVER-PLAYBACK |
| COVER-10 | Connection/session status; static-content/interactive-control | Not opened, waiting, connected empty, connected active, disconnected, reconnecting, restored, blackout compound state, ended, popup blocked, reopen failure, long error copy. | Zero/one/many dismissed: this is one current session state, not a collection. | LIFE-01 through LIFE-15; T-COVER-CONNECTION |
| COVER-11 | Audience output; media/static-content | Waiting, title-aware holding, neutral holding, deliberate blank, 1/2/3/4 charts, disconnected icon, reconnecting icon, restored, blackout, ended, missing content retained last-valid, long mandatory labels. | Interactive-control states dismissed: Audience is intentionally passive. | LIFE, STATE, LEG; T-COVER-AUDIENCE |
| COVER-12 | Destructive confirmation/error; form/static-content | Named target, consequence, confirm, cancel, pending commit, validation failure, save failure, retry, restored context, long object names. | Populated collection dismissed: affected-object lists may be shown but are not themselves edited here. | SCOPE-07, EDIT-10, EDIT-11; T-COVER-DESTRUCTIVE |

### Open-domain coverage

| Clause | Domain concern | Binding coverage | Test |
|---|---|---|---|
| COVER-13 | Keyboard and focus | Every interactive controller/Build task has a logical focus order, visible focus, transient-layer containment, and specified restoration. Audience has no focus targets. | T-COVER-KEYBOARD |
| COVER-14 | Touch | Required actions meet the 44×44 activation minimum and do not require hover or precision dragging. | T-COVER-TOUCH |
| COVER-15 | Reduced motion | Shell transitions, chart-adjacent animation, holding states, and autoplay status respect reduced motion; disabling decorative motion does not alter data/time semantics. | T-COVER-MOTION |
| COVER-16 | Offline/realtime recovery | Step 4 uses FIX-ARCH-DECL to show no proposed offline/static violation and prototypes controller/Audience LIFE-05 through LIFE-07 recovery without data loss or controller stale-state ambiguity. Functional offline/PWA acceptance is deferred to T-ARCH-08C with FIX-OFFLINE after implementation. | T-COVER-RECOVERY |
| COVER-17 | Assistive state announcements | Active mode, selection, dirty/suspended draft, validation/save status, controller lifecycle, playback, blackout, and icon-only Audience disconnect/reconnect states have programmatic names and state. | T-COVER-AT |
| COVER-18 | Content robustness | Long text, missing optional fields, partial datasets, zero/one/many objects, and catalogue overflow do not change required geometry, hide essential actions, or create page-level horizontal overflow. | T-COVER-ROBUST |

The formal post-checker UI-consideration probe is resolved above. Later planning may lift these explicit truths and dismissal reasons, but it may not weaken or silently discard them.
