# SimEx Dashboard V7 operation contract

## Status and authority

This records the current engineering contract for the SimEx release candidate.
It does not grant human acceptance or production deployment. Strict source
validation and the accepted requirements remain authoritative.

The accepted September time-cursor and Storyline specifications and consolidated
roadmap govern the temporal changes below. Historical Chrono Group authoring
sketches describe the legacy import format, not the current authoring interface.

## Modes and canonical Home

The application modes are exactly `home`, `view`, `build`, and `present`.
`home` is the default while `dashboard.home.enabled` is not `false`; otherwise
the safe default is `view`. A persisted or requested unavailable mode is
reconciled to an available one, and the selected mode is browser-local.

Canonical Home is application content, not an authored dashboard Page. It has
no Page ID, does not mount playback, the dashboard renderer, page navigation,
or Page authoring controls, and reserves the Page ID `home`. Scenario Passport
owns the `home.enabled` preference. Package import and Clear reconcile the
active mode only after their configuration transaction succeeds; a failure
leaves mode, focus, preference, and last-good dashboard unchanged.

Home is enabled for a newly cleared dashboard, may be turned off in Build, and
may be re-enabled without forcing navigation. It is therefore the safe
recovery surface even when no ordinary Pages remain.

## View and Build: shared canvas, separate drafts

View and Build share the canonical renderer, saved layout model, responsive
rules, content identities, and maximum canvas width. Build chrome can
temporarily compress or reposition the canvas, but opening, closing, or moving
chrome must not write the saved layout.

Sketch 002 allows only these simultaneous draft scopes:

| Scope | Owns | Does not own |
| --- | --- | --- |
| Layout draft | panel order/position, Section boundaries, global layout preset | chart footprint or other chart properties |
| Selected-chart draft | one selected chart's data, content, appearance, axes, interaction, advanced settings, and footprint | global panel layout/order |

The deterministic packer derives reflow from combined draft state; it is not a
third authored mutation. Clean inspectors may open, close, or switch while a
layout draft remains dirty. A target switch resolves only a dirty selected-chart
draft. Build exit, package replacement, and destructive operations resolve all
relevant named scopes independently.

### Unit Orbit and footprint ownership

Unit Orbit is selected-chart-local. It owns chart Save/Discard, chart-property
status (including suspension), local preview, and the footprint picker. The
picker exposes exactly eight choices: one to four columns by one or two rows.
Hover/focus is preview-only; click, Enter, or Space changes the chart draft.
An invalid stale footprint is a named chart-property error that preserves the
last-good geometry.

Unit Orbit may move, recenter, or use internal scrolling to remain related to
its target and clear protected product chrome. It must not cover unrelated
panels or claim global layout ownership. Build below 768px is best-effort and
draft-preserving; phone support belongs to View, not Unit Orbit acceptance.

Fixture ownership stays split: selected-chart coverage owns valid/invalid
footprints, while layout coverage owns global presets and order states. A
preset can replace or retain layout work only through an explicit choice; it
preserves every footprint and repacks order only.

## Pages and Sections

Sketch 011 keeps structure commands in Build and scoped to their target. Pages
can be renamed, reordered, merged, or removed. Sections can be renamed,
reordered, moved to another Page, merged, or removed. A Page must retain a
Section and a final authored Page is protected unless a deliberate clear leaves
the Home-only recovery state.

Before a merge, move, or removal, the interface projects named consequences
for affected charts and Storylines. Removal requires an explicit
disposition and acknowledgement. The product must never silently cascade a
Page or Section command into unannounced chart or temporal changes. Structure
has its own Save/Discard transaction; it does not absorb layout or
selected-chart drafts.

## Shared time and Storyline library

View and Present use one provider and cursor. **Live** resolves the declared
`scenario.exerciseTime`, or the latest eligible scope observation when no
exercise time is declared. **At** retains the selected literal instant; it may
fall between observations. Exact matching can truthfully produce no data in
either mode. Return to Live pauses playback. Advance exercise time is an
explicit durable Present action and is unavailable in read-only outputs.

The persistent Time bar offers Page, Dashboard and saved Storylines. Page and
Dashboard clocks are eligible plotted observation unions. Storylines preserve
their authored observation-source, calendar or union cadence, including deliberate
no-data calendar frames. A session window clips this clock without rewriting the
authored Storyline period. Cursor position is not a publication cutoff or access
control; participant packages require physical filtering.

Charts own their matching defaults. Storyline member overrides and an authored
Storyline default can refine a composition; an explicit session override applies
without rewriting those authored values. Nearest matching requires a finite,
nonnegative tolerance. Unbounded legacy nearest content stays recoverably invalid
until repaired; migration never invents a bound or substitutes another policy.
Interpolation remains subject to the chart's numeric binding permission.

**Storyline Studio** lists saved compositions by optional display anchor and
across pages. Members may come from any page. Its stages are `Storyline details`,
`Select charts and frames`, and `Arrange and configure`. The coverage picker uses
plotted observations and saved filters. Save/Discard, duplicate, repair and return
context remain scoped to the existing draft transaction. Saving a comparison
cannot replace an already pending Build draft.

View shows a selected Storyline in a band above the canonical page. Present uses
its saved ordered subset and layout, with a maximum of four displayed charts.
Member geometry, policies and source/calendar cadence are preserved independently
of that Present subset. Unsaved Build previews do not overwrite saved content.

Native configuration retains the `scenes` array name, with no `chronoGroups` or
parent references. Legacy Groups without child Scenes become Storylines; child
Scenes retain their period, cadence, geometry and effective policies. Group-only
calendar date periods remain date periods on `frames.mode: "union"`: date-only
observations retain UTC midnight for their authored date, while timestamp
membership uses the dashboard timezone's calendar date. Cursor instants and
session windows remain canonical UTC instants. Repeated normalization and export
preserve this compatibility seam, including non-UTC mixed sources.

Migration review lists identity/name collisions, preserved invalid nearest
settings, calendar-period semantics and any proposed Present subset for more than
four members. All members remain intact. Original collection names survive as
scalar `audience.collectionLabel` context, independently of Storyline names;
they do not reference a live parent object. Chrono Studio is retired from Libraries.

## Scenario Passport and packages

Sketch 013 defines one active Scenario, not a Scenario library. Scenario
Passport is Build-only and owns Scenario name, Program, Updated, source
provenance, the Home preference, and package actions. View may show Scenario
orientation; Present exposes no Scenario/package mutation controls.

There is no Save All or package-wide Save. Object, chart, layout, structure,
and temporal drafts retain their own transactions. Package replacement,
download, reset, and Build departure resolve scopes they would invalidate. The
Sketch 002 exception permits one layout and one selected-chart draft; package
work resolves them sequentially with their respective named actions, never a
merged action. A failed step stops the operation and retains both drafts and
the last-good dashboard.

Download serializes committed state only. Import validates the candidate,
stages verified authored assets, commits them atomically with replacement, and
compensates on failure. Reset is explicit and also preserves last-good state.
Application recovery sits outside product-mode content.

The dashboard/package boundary is Version 7; chart configuration remains Version 3.
Raw Version 3–7 configurations
may enter only through deterministic normalization and strict validation;
invalid or unsupported input is rejected. Re-export a successful legacy import
as Version 7. Legacy bundle envelopes 4–6 remain accepted with their original
strict metadata shape. Native exports include the app version and SHA256 over
the stable serialization of the complete export excluding its own integrity
record. Import verifies this record before migration. It detects accidental
changes; it is not an authenticity signature. Review retains original input text,
and compensatable transactions retain exact previous state on failure. Packages
exclude unresolved drafts and Present/Audience session state.

## Present, Audience, static operation, and Quorum

Present chooses eligible saved output, controls composition and time, and opens
the same-origin Audience window. Audience is passive and last-valid-output
safe: it does not author or independently advance time. Protocol 4 carries one
accepted time projection, literal epoch and effective per-member policies. Its
source is a parentless Storyline or manual composition; retired Group identities
and protocol 3 messages are rejected. Theme retains its version-1 sidecar.
Unchanged Present reentry preserves the accepted sequence; changed effective
page/Live time or Theme is explicitly reconciled before publication. Audience
can show independent dashboard, Original collection, Storyline and date facts,
the exercise disclaimer and app version, and supports Present-controlled blackout.
Changing chart bindings or source bytes in Build requires reloading a retained
Audience window; accepted matching policies alone do not synchronize those bytes.

The core dashboard has no required remote runtime dependency. Static builds
and flash-drive packages retain local prepared data. URL-hosted media is an
explicit network dependency and can remain unavailable offline.

Quorum is optional companion terminology, never a dashboard mode. `standalone`
and `connected` describe companion status. The same-origin, metadata-only
companion can request an operator-authorized configured-chart set; it does not
exchange discussion text, transcripts, summaries, speaker data, or evidence
text. Present/Audience does not depend on Quorum.

The active chart catalogue is contract 3, with `storyline_ids` and temporal
playback capability independent of Group membership. It requires a contract-3
compatible companion. The adjacent local Quorum validator currently accepts
contract 2, so mock-companion tests do not establish real contract-3 compatibility.

## Acceptance and future scenario integration

The rolling engineering checkpoint records exact checks and outstanding human
acceptance. Native browser and mock-companion evidence does not establish physical
phone, minimum-device, projector, screen-reader or real-companion acceptance.

Paused scenario branches will need a separately authorized integration using
native parentless Storylines, chart-owned defaults, the shared cursor, protocol 4
and catalogue contract 3. Preserve scenario data meaning and run the same
deterministic legacy migration before adapting their packages. This work does not
implement scenario adapters, reactivate those branches or authorize deployment.
