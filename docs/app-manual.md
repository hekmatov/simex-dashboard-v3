# SimEx Dashboard user manual

## What SimEx is

SimEx Dashboard is a static, offline-capable workspace for exploring exercise
data, authoring a dashboard, and presenting a controlled audience output. The
default HeV-A26 content is an example exercise, not a fixed template. The
application is a training prototype and provides no warranty of availability,
accuracy, suitability, security, support, or compatibility.

The live dashboard configuration and package contract are Version 6. The chart
data contract remains Version 3. See the
[V6 operation contract](v3-dashboard-operation-contract.md) for ownership and
persistence rules.

## Start at Home

**Home** is application-owned, not an authored dashboard Page. It is normally
the first workspace when the Home preference is enabled and routes visitors to
the operational dashboard. It does not contain Page navigation, View playback,
or Present runtime.

In **Build → Scenario Passport → Canonical Home**, the active Scenario can hide
Home. If Home is unavailable, SimEx safely uses **View**. Turning Home back on
makes it available without forcing navigation away from the current workspace.
A successful Clear leaves canonical Home available even if no authored Pages
remain.

## Workspaces

The switcher exposes four modes:

- **Home**: application-owned orientation, available only when the Scenario
  preference permits it.
- **View**: explore saved Pages, Sections, charts, and View Chrono playback.
- **Build**: author scenario metadata, structure, charts, temporal content,
  source content, appearance, and packages.
- **Present**: control saved audience output and open the passive Audience
  window on the same computer and origin.

Below 1024 CSS pixels, Build and Present remain available but show a small
notice recommending a minimum width of 1024 pixels. The notice does not hide
the workspace, redirect the user, or discard drafts.

## View

Use Page navigation to move through authored Pages and Sections. Available
panel actions can include fullscreen, multi-chart comparison, image export,
source information, and source-row inspection. Where a chart supports wheel
zoom, hold Ctrl while using the mouse wheel; ordinary scrolling stays with the
page.

View Chrono projects saved Chrono Group and Scene data. It does not author or
silently promote a live draft into a saved Scene.

## Build

### Layout drafts and Unit Orbit

Build has two separate scopes that can coexist:

1. The **layout draft** owns panel order/placement, Section boundaries, and
   global layout presets. Use **Save Layout Changes** or **Discard Layout
   Changes**.
2. One selected-chart property draft owns that chart's data, appearance,
   interaction, and footprint. **Unit Orbit** owns **Save Chart Changes** and
   **Discard Chart Changes**.

View and Build share the canonical renderer, saved layout model, responsive
rules, and content identities. Build chrome can temporarily reposition the
canvas but does not silently save a layout. Reflow is derived from the two
draft scopes, not a separate authored change.

Unit Orbit's Size picker owns the chart footprint. It offers eight discrete
choices: one to four columns by one or two rows. Hover/focus previews a choice;
click, Enter, or Space changes the chart draft. An invalid stale footprint stays
a repairable chart-property error and preserves the last good geometry.

Phone-width Build is a draft-preservation surface, not supported Unit Orbit
authoring. Build controls reposition or scroll to keep the selected chart and
product chrome usable; unrelated panels do not determine Orbit placement.

### Pages and Sections

Open **Pages and sections** or use Page/Section commands in Build to add,
rename, reorder, move, merge, or remove structure. Page merges and Section
moves show named consequences for affected charts, Chrono Groups, and Scenes.
Removal requires a stated content disposition and acknowledgement. SimEx does
not silently cascade a structural action into unannounced chart or temporal
deletion.

Structure has its own Save/Discard transaction. A Page must retain a Section,
and the final Page is protected until a replacement exists.

### Scenario Passport and packages

**Scenario Passport** is the Build-only entry for the one active Scenario. It
keeps the Scenario name, Program, Updated date, Home preference, source
provenance, and package actions together. View shows Scenario orientation but
does not mutate packages; Present has no Scenario/package actions.

There is no package-wide Save. Package import, download, reset, destructive
actions, and Build exit resolve only the draft scopes they can invalidate. If
the layout and selected-chart drafts are both dirty, SimEx resolves them
sequentially with their named controls. **Stay** leaves both drafts and the
dashboard unchanged. A failed save or package action retains the last-good
dashboard and unresolved drafts.

**Download Dashboard Package** includes only last successfully committed state,
never drafts or Present/Audience session state. **Import Dashboard Package**
validates and stages the incoming package before replacement. Cancellation,
rejection, or failure leaves the current dashboard intact. **Reset Dashboard to
Source** is equally explicit and last-good safe.

### Chrono Groups and Scenes

Use **Chrono Studio** to browse saved Chrono Groups and **Scene Studio** to
browse saved Scenes. Libraries support Page, status, and search filters.
Opening or returning to an item preserves the library's filter, selection,
scroll, and focus context.

A Chrono Group is the parent clock. A Scene is its saved child projection: it
has one owning Page, one parent Chrono Group, eligible charts from that Page
and parent group, and a saved composition. Parent entries project their child
Scenes; Scene entries identify their parent group and member-chart locations.
Invalid, incomplete, or needs-attention Scenes cannot silently launch into View
or Present.

Scene editing is exactly:

1. **Scene details**
2. **Select charts and frames**
3. **Arrange and configure**

The first step chooses the Page and parent group; the second offers eligible
charts/frames; the third saves the composition. Save/Discard applies only to
the Scene draft. View and Present use saved temporal snapshots, so a live draft
does not overwrite a running projection. Conflicting temporal work offers
save, discard, or stay; failures return to the named draft without partial
updates.

## Present and Audience

Present is the moderator workspace. Choose eligible saved items, select an
allowed layout, control playback, and open/reopen the Audience display. Present
also controls blackout and which available facts appear on Audience.

Audience is passive, same-computer, same-origin output. It renders the latest
valid projection and retains last-valid output if a new render fails. Its one
direct-manipulation exception is the Scene date: drag the date on the Audience
display to reposition it. A successful connected drag automatically saves the
new horizontal and vertical coordinates to the owning Scene while preserving
the configured date width. Audience is not otherwise an authoring surface. A
Scene must be saved, valid, and launch-eligible before it can be used for
Present/Audience.

## Packages, migration, and persistence

Browser state is local to that browser. Download a package before substantial
work and after a coherent saved change; keep an earlier export until the new
one is checked.

The live package boundary is Version 6. Imports can deterministically normalize
raw Version 3, 4, 5, or 6 configuration before strict validation. Unsupported
or invalid input is rejected, never partially applied. After importing legacy
content successfully, download a new Version 6 package before sharing or
promoting it. The legacy-named browser storage key does not make the live
dashboard a Version 3 dashboard.

Packages contain committed configuration, portable uploaded/source material,
and verified local authored media where applicable. They exclude runtime data,
unfinished drafts, and Present/Audience session state. URL-hosted media remains
a declared network dependency and may be unavailable offline.

To promote browser-authored content into the repository baseline:

1. Download the package from Build.
2. Place it as `packaged-dashboard-bundle.json` at the repository root.
3. Run `pnpm.cmd promote:bundle`.
4. Review the promoted configuration and generated data before packaging.

## Static/offline use

SimEx is designed for static/offline core operation. A normal build embeds
prepared default data; the Cloudflare build serves configuration and prepared
data as local static resources. Neither needs a remote runtime dependency for
the core dashboard.

```powershell
pnpm.cmd build
pnpm.cmd package:flashdrive
```

The flash-drive package includes a local-server fallback for browsers that
block direct `file://` module loading.

## Quorum

Quorum is an optional local moderator companion, not a workspace or Audience
dependency. **Standalone** and **Connected** describe companion connection
status, not product modes. The same-origin metadata-only protocol can request
an operator-authorized set of configured chart IDs; it does not carry
discussion transcripts, summaries, speaker data, or evidence text. SimEx
continues to work in Standalone mode when Quorum is absent or incompatible.

## Further references

- [V6 dashboard operation contract](v3-dashboard-operation-contract.md)
- [Chart Data System V3](chart-data-system-v3.md)
- [Quorum companion guide](quorum-companion.md)
- [Step 9 final acceptance](audits/2026-08-28-v3-step-9-final-acceptance/FINAL-ACCEPTANCE.md)
