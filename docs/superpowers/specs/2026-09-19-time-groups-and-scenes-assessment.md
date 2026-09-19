# Chrono Groups and Scenes: Assessment and a Simpler Model

Written against `claude/view-build-decision-surface-ff6f8a` at `2fcf5eb`, using the exported bundle `SimEx-dashboard-bundle-20260903.json` as the worked example. Options paper with a recommendation; the implementation outline at the end is for Astra.

## The goals, as you stated them

1. Present the situation as it is at the current time.
2. Show how it has evolved.
3. Show how variables move together: pull charts that sit far apart on the dashboard into one view with one time cursor.
4. Make composing such a view easy, which is what Chrono Groups were meant to do by narrowing the chart pool.

## What the model is today

Two authored objects and one runtime behaviour:

- **Chrono Group** (`src/charting/time/chronoGroupModel.js`): a name, a period, a matching policy (`exact`, `lastKnown`, `nearest`, `interpolate`), seconds per frame, and members, each a chart id plus which of its roles is the time role and an optional per-member matching override. The group is the playback clock: its frames are the union of member observation times inside its period.
- **Scene** (`src/charting/time/sceneSchema.js`): must name a parent `chronoGroupId` and one `pageId`; its members must be a subset of the parent group *and* all live on that one page (`validateScene` line 105); it has its own period inside the group's period, frames (a calendar interval or explicit list), seconds per frame, and a Present layout.
- **Default page playback** (`PlaybackProvider`, `buildDefaultPagePlayback`): with no group selected, View builds a clock from every temporal chart on the page. This branch made it an explicit "Whole page" source with a page-time readout.

Chart definitions already carry a time role in `roles.time` and an `interaction.timeSync` slot; the readiness ledger (`temporalAvailability.js`) already knows each chart's coverage.

## What the bundle shows

| Fact | Value |
| --- | --- |
| Pages / sections / charts | 2 / 7 / 38 |
| Charts with a time role | 9 of 38 |
| Chrono Groups | 2 (`municipal_outbreak`: 2 charts, 2020-02 to 2021-04; `national_outbreak`: 5 charts, 2027-02 to 2027-08) |
| Scenes | 0 |

Three things stand out. First, nobody has authored a Scene: the two-level ceremony (make a group, then make a scene inside it) has a cost that this dashboard never paid back. Second, the two groups exist because their data come from different eras and cadences, which is a property of the *sources*, not of a presentation intent. Third, 29 of 38 charts are snapshots with no time role, so "current situation" for them can only mean "latest", which no group or scene expresses.

Your observation about real scenarios is the decisive one: when almost every chart overlaps in time, a group that says "these charts, this period" selects nearly everything and states nearly nothing. The pool it narrows is the pool the runtime can already derive.

## Where the current model works against the goals

- **Goal 3 is structurally blocked.** A Scene's members must be on one page. The charts you most want side by side, say cases on the biomedical page and public trust on the socio-economic page, cannot share a Scene today.
- **Groups conflate three concerns.** Which charts (composition), how their times align (matching policy, really a per-source property), and the clock (period and cadence). Composition changes per story; matching hardly ever changes for a given source; the clock is a property of the story window. Bundling them means every story starts by editing a shared clock.
- **Periods are stated three times.** Group period, Scene period inside it, and the data's actual coverage. The first two are redundant with the third for the "show everything" case and merely restrictive otherwise.
- **The intermediate collection is authored, not derived.** Filtering the chart pool is a picker concern. Making it a saved object gives it a lifecycle, migration rules, and Needs-attention states that authors must maintain.
- **Goal 1 has no first-class object.** "As it is now" is a cursor position, not a composition. Page time (this branch) gives View that cursor; Present still reasons in groups and scenes.

## A simpler model: one cursor, chart-owned sync, storylines

Three ideas replace the two objects.

### 1. Charts own their time behaviour

Move the matching policy where it belongs: on the chart, as the default for its time role (`interaction.timeSync` already exists as a slot). A daily-cadence source says `exact`; a weekly survey says `lastKnown`; a sparse series that should look continuous says `interpolate`. Groups stop being the place this lives; a composition can still override per member for one story.

### 2. One dashboard time cursor

There is one cursor for the dashboard, with two states: **live** (every chart shows its latest observation; snapshot charts show as they are) and **at** a time (every temporal chart resolves that time through its own policy; snapshot charts stay). Playback moves the cursor along a clock. The clock is derived: the union of observation times of whichever charts are in view, within an optional window. This is what "Whole page" already does; the change is to make it the only mechanism, and to let Present drive the same cursor as View.

This gives goal 1 (live cursor) and goal 2 (play the cursor, with the existing trace mode drawing the path) without any authored object.

### 3. Storylines replace Groups and Scenes

A **Storyline** is a saved composition for goal 3: a name, an ordered set of member charts from anywhere in the dashboard, an optional time window (default: whole coverage), a frame cadence (calendar interval, as Scenes have now), per-member sync overrides, and layouts for View and Present. Nothing else. No parent object, no page restriction, no period ceremony.

- In **View**, opening a Storyline shows its members side by side in a band at the top of the current page (the `SceneViewCompositionGrid` already renders exactly this) under the dashboard cursor, with the rest of the page below and dimmed. Closing it returns to the page. This is how a moderator answers "how did cases and trust move together?" without leaving the page.
- In **Present**, a Storyline is what Scenes are today: a composition with a Present layout, played on the audience display.
- The **picker** does the job Groups were meant to do, as a derived view: it lists only temporal charts, grouped by page and section, with each candidate's coverage bar drawn under the chosen window (the availability ledger already computes this), with filters by source and by cadence, and with a "select all with coverage in window" action. Narrowing becomes a query, not an object.
- **Key moments** (optional, later): a Storyline may carry dated annotations ("lockdown begins", "vaccination starts") that render as markers on every member's time axis and as chapter stops in playback. This turns co-movement into a narrative, which is the exercise's actual product.

### What happens to the bundle

`municipal_outbreak` and `national_outbreak` become two Storylines with the same members and windows, and every member's matching policy moves onto the chart. Nothing is lost. A third Storyline, "Cases and public trust", could then be authored across both pages, which is impossible today.

### Migration

Additive first, so no Version 7 is forced immediately:

1. Scenes gain `members` from any page and an optional `chronoGroupId` (absent means the scene derives its clock); `pageId` becomes the page the scene is *shown on*, not a membership constraint.
2. Charts gain the default matching policy; group member overrides are copied onto charts on load.
3. Groups without scenes are exported as scenes with `chronoGroupId` absent.
4. When every consumer reads scenes without groups, retire `chronoGroups` in Version 7 with the existing deterministic-migration pattern the README describes. Rename Scene to Storyline at that point, or keep the name if the vocabulary is already embedded in training material.

## Options compared

| Option | Goal 3 (cross-page co-movement) | Authoring cost | Contract change | Risk |
| --- | --- | --- | --- | --- |
| A. Keep Groups and Scenes, allow cross-page scene members | Yes | Unchanged, still two objects | Small (validator) | Low, but the ceremony stays |
| B. Storylines with chart-owned sync and one cursor (recommended) | Yes | One object, derived pool | Medium, additive first | Medium: playback reducer and Present rework |
| C. Drop authored compositions; ad-hoc "compare" only (extend the existing multi-select compare) | Partly, not saved | None | None | Loses reuse and Present scenes |

Option C is worth noting because the compare selection already exists in View (up to four charts fullscreen). A cheap first step toward B is to let a compare selection be *saved* as a Storyline; that alone delivers goal 3 for moderators within a day of work, and the rest of B grows from it.

## Recommendation

Adopt B, staged: (1) save-as-Storyline from the existing compare selection, cross-page; (2) chart-owned sync defaults; (3) the coverage picker in Scene Studio; (4) one cursor shared by View and Present; (5) retire Groups in Version 7 once nothing reads them. Leave key moments for after the second data package shows what real coverage looks like.

## Implementation outline for Astra

One commit per task, repository attribution trailer, targeted checks only (AGENTS.md cadence). Do this after the preview-fidelity work, because the Storyline band in View reuses the authoring stage's geometry.

1. **Save compare as a Storyline.** In `FullscreenDisplay.jsx`'s multi-chart mode add "Save as Storyline"; it writes a scene with members from any page, `chronoGroupId` absent, `pageId` = current page, window = union coverage, layout = the current compare layout. Loosen `validateScene` accordingly (`sceneSchema.js` lines 56 to 105) and add tests for cross-page members and absent parent. Check: `tests/chronoSchemaNormalization.test.js`, `tests/sceneViewComposition.test.js`.
2. **Chart-owned sync default.** Add `interaction.timeSync.matching` to the chart schema validator with the four policies; `buildMemberTimeContexts` reads the chart default when no member override exists. Copy existing group member overrides onto charts in `normalizeTemporalConfig.js` on load. Check: `tests/chartTemporalV3.test.js`, `tests/chronoGroupModelV3.test.js`.
3. **Derived clock for parentless scenes.** In `PlaybackProvider`, when a scene has no `chronoGroupId`, build its clock from members' observation times within the scene period (reuse `buildDefaultPagePlayback` with the member list). Check: `tests/playbackViewOwnership.test.js`, `tests/viewChronoConvergence.test.js`.
4. **Storyline band in View.** A "Storylines" entry in the View page actions opens a list; choosing one renders `SceneViewCompositionGrid` above the page body (same slot as the attention strip, below it when both exist) under the page time cursor, with the page dimmed. Check: `tests/viewChronoRuntimeFidelity.test.js` plus one journey.
5. **Coverage picker.** In Scene Studio's member stage, replace the group-scoped list with the derived pool: temporal charts grouped by page and section, coverage bars from `temporalAvailability.js` under the window, source and cadence filters, "select all with coverage". Check: `tests/chronoStudio.test.js`, `tests/chronoSceneComposition.test.js`.
6. **One cursor for Present.** Present's playback source list offers Storylines and "Whole page" with the same reducer as View; the audience display resolves every chart through the cursor. Check: `tests/presentPlaybackOwnership.test.js`, `tests/audienceProjection.test.js`.
7. **Retire Groups (Version 7).** Migration in `dashboardBundleV3.js`: groups without scenes become scenes; scene `chronoGroupId` dropped; `chronoGroups` removed from the dashboard shape; Chrono Studio removed from Libraries. Only after tasks 1 to 6 have shipped and the training material is updated. Check: `tests/chartConfigV3.test.js`, `tests/dashboardAppV3.test.js`.

## Open questions for the second data package

- How many charts share one source and cadence? If most do, chart-owned sync is nearly free.
- Are there charts whose coverage ends early (a source that stops mid-exercise)? Those decide whether `lastKnown` should be the dashboard-wide default.
- Which pairs of charts do moderators actually want side by side? Those are the first Storylines and the test of the picker.
