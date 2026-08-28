# SimEx Dashboard V6 operation contract

## Status and authority

This is the normative Step 10 handoff for the live SimEx application. It
records product behaviour, ownership, and operational boundaries; strict source
validation remains authoritative. When documentation conflicts, current
accepted source wins. The historical 10 August three-mode implementation plan
is checklist-only and cannot override this document, the reconciliation, or
final acceptance.

Authority order for this handoff is live source, the 19 August reconciliation
and accepted sketches, then Step 9 final acceptance.

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
for affected charts, Chrono Groups, and Scenes. Removal requires an explicit
disposition and acknowledgement. The product must never silently cascade a
Page or Section command into unannounced chart or temporal changes. Structure
has its own Save/Discard transaction; it does not absorb layout or
selected-chart drafts.

## Temporal library and Scene projection

Sketch 012 is a saved-content library, not a second running-time store.

- **Chrono Studio** lists saved Chrono Groups and offers search, status, Page
  filters, and content entry.
- **Scene Studio** lists saved Scenes grouped by owning Page and retains the
  same return context.
- A parent Chrono Group entry projects child Scenes and member-chart locations.
  A Scene entry projects its parent group and member-chart locations.

A Scene has one owning Page and one parent Chrono Group. Eligible charts are on
that Page and belong to the parent group. Validation and source eligibility
block an invalid, incomplete, or needs-attention Scene from silently launching
to View or Present.

Scene editing has exactly this order:

1. `Scene details`
2. `Select charts and frames`
3. `Arrange and configure`

The Stage 1 parent selection constrains Stage 2 availability; Stage 3 records
the saved composition. Create, edit, duplicate, and repair return to their
origin with filter, selection, scroll, and focus context retained. A conflict
against an active temporal draft offers save, discard, or stay. A failed save
keeps the draft and last-good saved state.

View and Present run a snapshot of saved temporal content. A live Scene draft
does not replace a running projection. If saved temporal content changes during
a session, the session is marked for review rather than silently updated.

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

The dashboard/package boundary is Version 6. Raw Version 3–6 configurations
may enter only through deterministic normalization and strict validation;
invalid or unsupported input is rejected. Re-export a successful legacy import
as Version 6. Packages exclude unresolved drafts and Present/Audience session
state.

## Present, Audience, static operation, and Quorum

Present chooses eligible saved output, controls composition and time, and opens
the same-origin Audience window. Audience is passive and last-valid-output
safe: it does not author, persist, or independently reinterpret a Scene. It
can show selected dashboard, parent group, Scene, and date facts and supports
Present-controlled blackout.

The core dashboard has no required remote runtime dependency. Static builds
and flash-drive packages retain local prepared data. URL-hosted media is an
explicit network dependency and can remain unavailable offline.

Quorum is optional companion terminology, never a dashboard mode. `standalone`
and `connected` describe companion status. The same-origin, metadata-only
companion can request an operator-authorized configured-chart set; it does not
exchange discussion text, transcripts, summaries, speaker data, or evidence
text. Present/Audience does not depend on Quorum.

## Step 9 carry-forward backlog

This documentation slice intentionally does not repair:

- stale canonical-Home/page-navigation/reload drivers and the retired
  Dashboard-map Home selector;
- two ambiguous unscoped Build-state locators;
- three secondary authoring/presentation theme leaks;
- large-package import timing threshold; and
- synthetic same-renderer liveness-stall fixture robustness.

`AUD-PRESET-01` remains a future product decision. This document does not
amend the historic Step 9 visual-approval sentence.
