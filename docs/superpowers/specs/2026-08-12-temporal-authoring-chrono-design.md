# Temporal Authoring and Chrono Design Contract

**Date:** 2026-08-12

**Status:** Approved

**Applies to:** V3 dashboard Build, View, Present, and Audience surfaces

**Companion contract:** `2026-08-12-three-mode-dashboard-ui-spec.md`

## 1. Purpose and precedence

This document is the normative temporal-design addendum to the accepted three-mode dashboard UI contract. It closes the previously unresolved workflows for creating and managing synchronized time groups, authoring reusable scenes, exploring temporal availability, and using those objects in View Chrono and Present.

When this document conflicts with the companion UI contract on temporal behavior, this document takes precedence. In particular, it supersedes:

- a single primary clock as the only group frame source;
- one-group-only chart membership;
- named `Slow`/`Normal`/`Fast` cadence values;
- any reading of `scene` as only an ephemeral Present composition; and
- any reading of `Chrono` as a fourth application mode.

The approved three-mode architecture remains unchanged: **View**, **Build**, and **Present** are the only top-level modes. Chrono is a View-owned subview. Authored scenes are persisted dashboard content; the active playback cursor, visibility choice, moderator adjustments, and current presentation composition remain ephemeral session state.

This contract is candidate-neutral. It defines ownership, behavior, state, disclosure, and validation. Step 4 will compare the exact geometry, surface type, spacing, and visual hierarchy.

## 2. Product vocabulary

| Term | Contractual meaning |
|---|---|
| Dashboard timezone | The single IANA timezone used for period interpretation, calendar frame generation, displayed timestamps, day aggregation, and signed date offsets. Existing dashboards without the field migrate explicitly to UTC. Groups and scenes cannot override it. |
| Available observation | A valid timestamp paired with a valid, non-null value for one plotted variable, calculated from the chart's effective data after saved filters, transformations, grouping, and aggregation. Duplicate timestamps for the same variable count once. |
| Time group | A dashboard-wide authored object that identifies temporally related charts, owns an inclusive master period, supplies default temporal matching and playback delay, and owns zero or more page-scoped scenes. |
| Scene | A saved, reusable, page-scoped child of one time group. It owns a contained period, chart composition/order/widths, frame-generation rule, optional matching and playback-delay overrides, and a Present subset/layout. |
| Frame | One ordered playback timestamp. A frame does not imply that every variable has an observation at that timestamp. Each variable resolves independently under the effective matching policy. |
| Default Chrono | Playback of a time group without selecting one of its authored scenes. Its frame ledger is derived from member observations. |
| Frame source | The participating scene chart whose plotted-variable timestamps generate candidate scene frames. This is the user-facing term; `pacemaker` is not product copy. |
| Concurrent only | Resolve a variable only when it has an observation exactly concurrent with the frame timestamp. This is the user-facing label for exact matching. |
| Interpolate | Resolve an eligible numeric variable by linear, date-proximity-weighted interpolation between valid observations on both sides of the frame. Interpolation never extrapolates. |
| Snap to Latest | Resolve to the latest observation at or before the frame. If none exists, the variable is missing. |
| Snap to Closest | Resolve to the observation closest to the frame. An equal-distance tie deterministically selects the earlier observation. |
| Reveal to frame | Default trace-chart playback treatment: show history only through the active frame over the active group or scene period. |
| Full timeline | Temporary playback treatment for a trace chart: show the chart's original x-axis range and mark the active frame position. |
| Seconds per frame | The positive finite duration between automatic frame jumps. This replaces named speed/cadence tiers and `1x`/`2x`/`3x` as the authoritative authoring vocabulary. |
| Needs attention | A persisted object is still inspectable but is not safely playable or presentable until an identified dependency or data problem is repaired. |

## 3. Ownership and persistence

### 3.1 Dashboard temporal settings

The dashboard stores exactly one timezone. Date-only values remain calendar dates in that timezone. Timestamp values are normalized for comparison and ordering but displayed in the dashboard timezone.

### 3.2 Saved time group

A committed time group contains:

- a stable unique ID;
- a dashboard-unique non-empty name;
- an inclusive start and end timestamp, with start not later than end;
- one or more member-chart references;
- a default matching policy;
- any explicitly authored member fallback required because a member cannot use the group default;
- a positive finite default seconds-per-frame value; and
- zero or more saved scenes.

A chart may belong to multiple time groups. Its temporal role and effective matching configuration are independent in each membership. Only the currently active group affects playback.

The group does not persist a copy of its derived Default Chrono frame ledger or availability analysis.

### 3.3 Saved scene

A committed scene contains:

- a stable unique ID;
- a non-empty name unique within its parent group;
- one owning page;
- an inclusive start and end contained within the parent group's period;
- an ordered, non-empty subset of group charts on that page;
- one supported width preset per participating chart;
- a Present subset and supported Present layout;
- exactly one frame-generation rule;
- optional per-chart matching overrides; and
- an optional saved seconds-per-frame override.

When a scene has no seconds-per-frame override, it inherits the group's current saved value. A later group change therefore propagates to inheriting scenes. Changing the value in scene authoring stores an override. View Chrono and Present start with the scene's effective value; runtime adjustments are session-only.

If a scene contains four or fewer charts, all of them form its Present subset in the same authored order. If it contains more than four, the builder must explicitly choose and order a Present subset of one to four charts and select a supported Present layout.

Scene width presets affect only the scene's focused View arrangement. They never mutate the page's canonical layout. Present uses its separate count-valid layout contract.

### 3.4 Derived state

The following are always derived from saved rules plus current effective chart data:

- full-data earliest/latest observations;
- in-period counts and timepoint ticks;
- Default Chrono and scene frame ledgers;
- per-frame observation availability;
- interpolated or snapped values;
- provenance and signed offsets;
- coverage summaries; and
- Needs attention findings caused by data or structural drift.

Derived state is never duplicated into the dashboard bundle as a second source of truth.

### 3.5 Drafts and atomic commit

Incomplete time groups and scenes may exist as local authoring drafts. Draft changes do not affect View, Present, Audience, exported configuration, or other saved objects. Save validates and commits the complete object atomically. Failure leaves the draft open and the last saved dashboard unchanged.

## 4. Frame and matching semantics

### 4.1 Default Chrono frames

For a time group without a selected scene, the deterministic frame ledger is the sorted unique union of all available observation timestamps across every plotted variable of every member chart within the group period.

Default Chrono does not fabricate period-boundary frames when no member has an available observation at those boundaries. If the union is empty, playback is unavailable with a visible reason.

### 4.2 Frame-source scene frames

The builder selects one participating temporal chart as the Frame source. Candidate frames are the sorted unique union of available observation timestamps across all plotted variables of that chart within the scene period.

The builder chooses one persistence mode:

- **All available frames:** persist the rule. New valid candidate timestamps are included automatically when effective data changes.
- **Selected frames:** persist the chosen timestamps explicitly. New timestamps are not added automatically. If a saved timestamp disappears, the scene becomes Needs attention; it is never silently replaced.

The frame picker discloses which Frame-source variables have observations at each candidate timestamp.

### 4.3 Calendar scene frames

Without a Frame source, the builder chooses every positive integer N days, months, or years.

- Scene start is always the first frame.
- Scene end is always the final frame.
- Regular interval frames are generated strictly between those boundaries.
- If scene end does not land on the regular sequence, the final interval is shorter.
- Day intervals use fixed 24-hour increments.
- Month and year intervals use calendar increments in the dashboard timezone.
- An invalid month-end target clamps to that target month's final calendar day.
- Generated timestamps are ordered and unique.

### 4.4 Period containment and change

New scenes inherit their parent group's full period and may narrow it. A scene may never extend beyond the group.

When a builder shortens a group period, the UI identifies every affected scene. Saving is blocked until the builder either edits each affected scene or explicitly chooses to clamp it. No scene period or frame selection is silently discarded.

### 4.5 Matching hierarchy

The effective policy resolves in this order:

1. time-group default;
2. explicit member fallback where the default is unsupported;
3. scene per-chart override when a scene is active; and
4. a temporary View Chrono session-wide override when selected.

View's override includes **Use authored settings** and never mutates the group or scene. A session-wide Interpolate choice is unavailable when any affected chart cannot support it; the UI explains which charts prevent the choice. Present inherits authored matching and does not silently replace unsupported behavior.

### 4.6 Interpolation safety

Interpolation is linear in time. For observations `(t0, v0)` and `(t1, v1)` surrounding frame `t`, the value is weighted by the frame's proportional temporal distance between the two observations.

Interpolation requires:

- a numeric plotted variable;
- valid observations on both sides of the frame;
- an interpolation-capable chart/schema/binding; and
- explicit author permission through the effective matching policy.

It never extrapolates, coerces categorical values, interpolates discrete event/timeline semantics, or changes source data. Unsupported choices are absent or reason-disabled with an explanation.

### 4.7 Provenance and offset disclosure

Every resolved value retains its provenance: concurrent, interpolated, snapped latest, snapped closest, missing, or unavailable.

For snapping, an observation earlier than the frame has a negative day offset, a later observation has a positive offset, and a concurrent observation has zero offset. Day offsets use the dashboard timezone.

- When all displayed variables resolve to the same offset under a snapping policy, the chart shows one chart-local compact badge such as `-7d`, `0d`, or `+2d`.
- When offsets differ, show a compact range such as `-7…+2d` with the accessible label **Mixed dates**.
- Hover, focus, or activation exposes each variable's observation date, signed offset, and provenance.
- When interpolation is present, the compact state is labelled **Interpolated** rather than implying one observation date; detailed disclosure still identifies each variable's result.
- Concurrent-only values are identified as concurrent and never imply borrowed observations.

## 5. Time Group guided workflow

Time Group creation and editing is one guided workflow with four behavioral stages. The exact dialog, overlay, sheet, or workspace geometry is deferred.

### 5.1 Choose period

Select a valid inclusive start/end period in the dashboard timezone. Availability analysis does not begin until both bounds form a valid range.

### 5.2 Choose charts

List every eligible dashboard chart with at least one available observation inside the proposed period. Each chart entry identifies its page and section and shows, for every plotted variable:

- earliest and latest observation dates across the full effective dataset;
- the number of available observation dates inside the proposed period; and
- a horizontal bar spanning the period with ticks for its available observations.

Selecting a chart moves it into a selected region at the top of the list. A thin separator distinguishes selected charts from remaining candidates. Existing memberships in other groups are visible but do not block selection.

Changing the period recomputes availability. A selected chart that loses all in-period observations remains visible in a Needs attention region and must be removed or restored by adjusting the period; it is never silently deselected.

### 5.3 Set defaults

Choose the group matching default and default seconds per frame. If the default is unsupported by a selected member, saving is blocked until the builder selects an eligible member fallback or changes the default. The reason and affected variables are explicit.

### 5.4 Name and review

Require a unique name and summarize:

- period and timezone;
- member count and affected pages;
- derived Default Chrono frame count;
- coverage gaps and unsupported behavior;
- group and member matching policies; and
- default seconds per frame.

Save commits the group atomically. Editing reopens the relevant stage rather than forcing linear traversal. Dirty Close, Escape, mode switch, or navigation requires an explicit save/discard decision.

## 6. Scene guided workflow

Scene creation and editing is a separate but connected guided workflow with five behavioral stages.

### 6.1 Choose scope

Select one owning page and an inclusive scene period within the parent group. New scenes initially inherit the full group period and the group's seconds-per-frame value. Only group-member charts on the selected page are eligible.

### 6.2 Compose the scene

Select at least one chart, arrange reading order, and assign supported View width presets. Configure the one-to-four-chart Present subset and its supported Present layout when required.

The scene composition never changes canonical page order or size.

### 6.3 Generate frames

Choose and configure either a Frame-source or calendar rule. A timeline preview shows the resulting frame ledger and per-chart/per-variable availability.

### 6.4 Configure temporal behavior

Each chart begins with its effective group/member policy and may receive a scene override. The builder may also save a scene-specific seconds-per-frame override. Preview states expose concurrent, interpolated, snapped, mixed-date, missing, and unavailable outcomes before save.

### 6.5 Name and review

Require a unique name within the group and summarize:

- owning page, period, and timezone;
- frame rule, frame count, and any explicit frame selection;
- chart order and View widths;
- Present subset, order, and layout;
- matching overrides and coverage gaps; and
- inherited or overridden seconds per frame.

Save commits the complete scene atomically. Editing reopens the affected stage. Dirty draft protection matches Time Group authoring.

## 7. Copying, moving, and deletion

### 7.1 Duplicate Time Group

**Duplicate Time Group** creates an editable deep-copy draft with new group and child-scene IDs. It retains the period, chart references, matching configuration, seconds-per-frame value, and copies every child scene. Charts and data sources remain shared references and are never duplicated.

The proposed name is `Copy of <name>` and must be made unique before save. Nothing is committed until review and explicit save.

### 7.2 Duplicate Scene

**Duplicate Scene** creates an editable copy inside the same group and page with a new ID. It retains period, charts, order, widths, frame rules or selected timestamps, matching overrides, seconds-per-frame inheritance/override, and Present subset/layout. The proposed copy name must be unique before save.

### 7.3 Structural dependency rules

- Before a chart is deleted or moved, disclose every affected group and scene.
- Deleting a chart requires explicit confirmation that its group memberships and scene references will be removed.
- Moving a chart within the same page preserves group and scene references.
- Moving a chart to another page preserves dashboard-wide group membership but cannot preserve old-page scene membership. The builder must explicitly accept those removals or cancel.
- A scene cannot retain a missing or cross-page chart reference.
- Deleting a group explicitly identifies all child scenes that will also be removed.
- No dependency cleanup occurs silently.

## 8. View Chrono contract

### 8.1 Entry and retained state

Chrono is a subview of View. Its controls are hidden during ordinary View. Entering or leaving Chrono preserves the active page, filters, dashboard scroll context, selected group/scene, period, and current valid frame for the current session. It never changes canonical dashboard content or geometry.

### 8.2 Default Chrono

The viewer selects a time group, then chooses:

- **All page charts:** retain every chart on the current page. Group membership remains identifiable through explicit text or status treatment; the chart-colored outline is reserved for the enabled availability overlay.
- **Group only:** show only current-page members of the selected group.

Because groups are dashboard-wide, Default Chrono operates on the current page and does not collect charts from other pages into one canvas.

### 8.3 Scene Chrono

Selecting a scene on another page explicitly navigates to that scene's page. Scene charts move into an authored-order focused block at the top of the page and use their scene width presets. A separator distinguishes the focused block from remaining page content. This arrangement is ephemeral and does not alter canonical page layout.

The All page charts/Group only visibility choice remains available. With All page charts, non-scene content remains below the focused block. With Group only, current-page group members not in the scene may remain below the focused block; the focused scene remains explicit.

### 8.4 Floating playback controls

Playback controls hover above the dashboard and retain their viewport position during page scrolling. They reflow at narrow widths and reserve enough scroll clearance that focused content is not hidden behind them.

The controls include:

- time group or scene selection;
- Previous, Play/Pause, and Next;
- direct seek across the active period;
- current date and frame index/total;
- active start and end dates;
- effective seconds per frame with a session-only adjustment;
- Use authored settings or a temporary matching override;
- Reveal to frame or Full timeline; and
- an optional availability overlay.

Playback always begins paused at the first valid frame. Manual seek, Previous/Next, group/scene change, matching change, trace-display change, or composition-affecting navigation leaves it paused.

### 8.5 Progress and availability encoding

The progress track spans the active group or scene period. Default Chrono marks its derived union frames. A scene marks its authored/generated frames at their relative positions.

When the availability overlay is enabled:

- subtle vertical marks encode how many active playback charts have observations on each dashboard-timezone day, counting each chart at most once per day;
- stable chart colors identify which charts contribute observations without relying on color alone; and
- the corresponding thin chart outline appears only while that overlay is enabled.

The active playback charts are all group members in Default Chrono and the participating scene charts when a scene is selected.

When disabled, both the chart-color availability marks and corresponding chart outlines disappear. The core frame track remains usable.

### 8.6 Trace-chart playback

**Reveal to frame** is the default:

- the x-axis shows the active group or scene period;
- trace history is visible only from the period start through the active frame;
- future chart data is hidden; and
- the active resolved value and provenance are marked.

Interpolation may use the next observation to calculate an active value, but the future observation itself remains hidden.

**Full timeline** is a temporary playback choice:

- the chart's original x-axis range is restored;
- the full trace is visible; and
- a marker identifies the active playback frame.

Ordinary non-Chrono View continues to show the chart normally.

## 9. Present and Audience integration

### 9.1 Loading authored content

Loading a scene selects its page, Present subset, order, layout, period, frame ledger, authored matching, and effective seconds per frame. The scene remains reusable in both View Chrono and Present.

The moderator may change composition, Present layout, seconds per frame, and Reveal to frame/Full timeline for the current presentation session only. These changes never mutate the saved group or scene.

Loading a time group without a scene retains the manual one-to-four-chart composition workflow. A manually composed chart outside the active group remains static and is clearly identified as static to the moderator.

### 9.2 Playback lifecycle

- First activation starts paused at the first frame.
- Returning to a group or scene in the same presentation session restores its last valid frame, still paused.
- Scene/group changes, direct seek, Previous/Next, Blackout, connection loss, reconnection, and manual composition changes pause autoplay.
- The scene's effective seconds per frame is the initial Present value. A moderator override is ephemeral.
- Invalid or Needs attention groups/scenes cannot be sent to Audience. The controller explains the blocking problem and retains the last valid Audience output.

### 9.3 Passive Audience

Audience contains no playback controls or availability bars. It may show the active frame date and compact per-chart provenance or signed-offset disclosure required to interpret the displayed values. The Audience cannot mutate the group, scene, frame, matching, composition, or speed.

## 10. Error, repair, and integrity behavior

Needs attention includes, at minimum:

- missing or cross-page scene charts;
- an invalid or out-of-parent period;
- a saved selected timestamp that no longer exists;
- a member with no remaining in-period available observations;
- an unsupported effective interpolation policy;
- a zero-frame derived ledger;
- an invalid Present subset or layout; or
- a missing/invalid dashboard timezone.

Affected objects remain inspectable, editable, duplicateable, and removable. They cannot start Chrono playback or become Audience output until repaired. Every finding identifies the affected group, scene, chart, variable, frame, or setting and links directly to the relevant authoring stage.

Rule-driven frame ledgers recompute when effective data changes. Explicit timestamp selections, chart references, and saved overrides never mutate silently.

## 11. Accessibility and responsive behavior

- Guided stages, current step, completion, validation, and dirty state have programmatic names and announcements.
- Availability bars provide equivalent chart/variable names, dates, and counts. Color is always paired with text, position, pattern, or shape.
- Chart selection, reordering, and Present-subset ordering support keyboard operation and explicit Move earlier/Move later commands.
- Focus enters a workflow at a meaningful labelled control, remains trapped only when the chosen surface is modal, moves to the first relevant error after failed save, and returns to the invoking control on close.
- Playback announces group or scene, current date, frame index/total, play/pause state, and blocking conditions without moving focus on every tick.
- Provenance disclosure is available by keyboard and touch, not hover alone.
- Reduced-motion mode makes chart transitions instantaneous. Playback remains manually controllable and starts paused.
- Floating controls, wide availability content, and generated forms reflow without document-level horizontal overflow at phone and tablet widths.
- Touch targets, focus indicators, and 200-percent text behavior follow the companion UI contract.

## 12. Deterministic acceptance fixtures

Step 3A must add fixtures and tasks that prove the following without relying on a particular visual candidate:

| ID | Deterministic coverage |
|---|---|
| TEMP-FIX-01 | Dashboard-wide group with members on three pages; one chart belongs to two groups with independent policies. |
| TEMP-FIX-02 | Multi-variable chart with full-range boundaries, duplicate timestamps, null values, filtered-out rows, and mixed in-period availability. |
| TEMP-FIX-03 | Concurrent only, Interpolate, Snap to Latest, and Snap to Closest; closest includes an equal-distance earlier tie. |
| TEMP-FIX-04 | Frame-source union with All available frames and explicit Selected frames; data refresh adds a timestamp and removes a selected timestamp. |
| TEMP-FIX-05 | Calendar days/months/years; mandatory start/end frames, shortened final interval, leap year, month-end clamp, and dashboard-timezone boundary. |
| TEMP-FIX-06 | Page-scoped scene with more than four View charts, ordered widths, explicit four-chart Present subset, and count-valid Present layout. |
| TEMP-FIX-07 | Group default seconds per frame, inheriting scene, overridden scene, and ephemeral View/Present session overrides. |
| TEMP-FIX-08 | Reveal to frame and Full timeline with original and active-period x-axis domains, hidden future observation used for interpolation, and reduced motion. |
| TEMP-FIX-09 | Same-offset, mixed-offset, concurrent, interpolated, missing, and unavailable chart provenance. |
| TEMP-FIX-10 | Duplicate group with copied child scenes and Duplicate Scene with new IDs but shared chart/data references. |
| TEMP-FIX-11 | Group-period shrink, chart same-page move, cross-page move, chart deletion, and group deletion with explicit dependency resolution. |
| TEMP-FIX-12 | Default Chrono All page charts/Group only, cross-page scene navigation, focused scene order, availability overlay on/off, and sticky responsive controls. |
| TEMP-FIX-13 | Present scene load, manual mixed static composition, every safety pause, reconnect, Needs attention rejection, and last-valid Audience preservation. |
| TEMP-FIX-14 | Keyboard, screen reader, touch, reduced motion, long names, zero/one/many members and frames, 200-percent text, and phone/tablet/desktop reflow. |

## 13. Roadmap effect

### Step 2A — omissions supplement

The accepted Step 2 baseline remains valid. Add one bounded supplement with two tracks:

1. exercise the existing create-new-chart wizard end to end; and
2. record current time-group inspection, existing playback/Chrono behavior, temporal provenance, and the explicit absence of group/scene creation and matching controls.

Reuse accepted scene-layout and basic playback-control evidence. Do not repeat already sufficient 16:9 geometry or control inventories, and do not prototype future behavior in the audit.

### Step 3A — contract amendments

Add candidate-neutral `CREATE-*` clauses for chart creation and `TEMP-*` clauses derived from this document. Update architecture, scope, state, copy, task, fixture, coverage, and hard-gate mappings. Explicitly reconcile saved authored scenes with ephemeral presentation state and numeric seconds per frame with the superseded cadence vocabulary.

### Step 4 — bounded visual prototypes

Step 4 must separately cover:

- chart creation;
- Time Group creation and availability exploration;
- Scene creation;
- View Chrono;
- panel editing and dashboard-level Build controls;
- Present controller and Audience; and
- shared shell behavior.

The approved Chrono visual companion is behavioral reference material, not an approved final visual direction. Step 4 still compares materially different geometries and interaction presentations.

### Steps 5–8 — deferred implementation

Exact schema field names and migrations, component boundaries, temporal-engine changes, presentation-protocol revisions, automated checks, and production styling remain deferred to planning and implementation after Step 4 approval.

## 14. Explicitly deferred visual decisions

This contract does not select:

- modal versus non-modal authoring surfaces;
- overlay, dock, sheet, or full-workspace geometry;
- exact widths, heights, spacing, tokens, or responsive breakpoints;
- stacked versus clustered availability-mark rendering;
- exact width-preset catalogue or Present-layout artwork; or
- final iconography and animation styling.

Those are Step 4 decisions. Every candidate must nevertheless satisfy the ownership, non-silent mutation, dashboard-geometry, progressive-disclosure, accessibility, and cross-mode behavior defined here and in the companion UI contract.
