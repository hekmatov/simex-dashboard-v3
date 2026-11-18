# SimEx Dashboard user manual

## What SimEx is

SimEx Dashboard is a static, offline-capable workspace for exploring exercise
data, authoring a dashboard, and presenting a controlled audience output. The
default HeV-A26 content is an example exercise, not a fixed template. The
application is a training prototype and provides no warranty of availability,
accuracy, suitability, security, support, or compatibility.

The live dashboard configuration and package contract are Version 7. The chart
data contract remains Version 3. See the
[dashboard operation contract](v3-dashboard-operation-contract.md) for ownership and
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
- **View**: explore saved Pages, Sections, charts, and Storylines with the shared time cursor.
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

The **Time bar** provides Live, step, play/pause, a selected instant and scope.
Open the instant to reveal the elapsed-time scrubber. Ticks represent clock
frames; coverage bands represent observations, so a tick is not a promise of a
measurement. **Time settings** controls playback speed, a temporary matching
override, trace behavior, observation availability and an optional UTC window.
Nearest matching requires an explicit maximum distance in hours.

**Live** follows the declared exercise time. If none is declared, it uses the
latest eligible observation in the current scope. **At** inspects a historical
instant without changing exercise time. Page scope uses the active Page's
eligible charts; Dashboard scope spans the dashboard. A saved Storyline uses
its own members, period and cadence. Opening its band keeps ordinary Page
content in place; closing it returns to Page scope.

Source and observation/as-of context belong to the value shown, which may differ
from the selected cursor time. Last-known values keep their actual observation
date; missing exact observations are not zero. Static snapshots and interpolated
values are identified where relevant. The exercise-use notice and app version
provide the surrounding fictional context.

Use **Compare charts** to select across Pages, open **Compare**, choose a layout
and **Save as Storyline**. This opens a Build draft. Saving commits it; cancelling
or discarding leaves saved content unchanged. View does not silently promote a
comparison or a live authoring draft.

On a phone, the bar exposes Live, play/pause and the instant; its disclosure
contains scope/settings and the larger scrubber. Keyboard shortcuts apply within
the time controls: arrows step, Shift plus an arrow seeks finely, and Escape
closes the active disclosure before returning to Live. Text fields and native
button activation retain their ordinary keyboard behavior.

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
moves show named consequences for affected charts and Storylines.
Removal requires a stated content disposition and acknowledgement. SimEx does
not silently cascade a structural action into unannounced chart or temporal
deletion.

Structure has its own Save/Discard transaction. A Page must retain a Section,
and the final Page is protected until a replacement exists.

### Scenario Passport and packages

**Scenario Passport** is the Build-only entry for the one active Scenario. It
keeps the Scenario name, Program, Updated date, Home preference, source
provenance, and package actions together. View shows Scenario orientation but
does not mutate packages. Package actions remain in Build; Present can advance
the saved exercise clock through its Time bar.

There is no package-wide Save. Package import, download, reset, destructive
actions, and Build exit resolve only the draft scopes they can invalidate. If
the layout and selected-chart drafts are both dirty, SimEx resolves them
sequentially with their named controls. **Stay** leaves both drafts and the
dashboard unchanged. A failed save or package action retains the last-good
dashboard and unresolved drafts.

**Download Dashboard Package** includes only last successfully committed state,
never drafts or Present/Audience session state. **Upload Dashboard Package**
validates and stages the incoming package before replacement. Cancellation,
rejection, or failure leaves the current dashboard intact. **Reset Dashboard to
Source** is equally explicit and last-good safe.

### Storylines and chart time settings

Use the Storyline library to browse saved compositions. Libraries support Page,
status and search filters. Opening or returning to an item preserves the
library's filter, selection, scroll and focus context. A Storyline may combine
eligible charts across Pages without requiring a parent Group. Invalid,
incomplete or needs-attention items cannot silently launch into View or Present.

Editing has three stages:

1. **Storyline details**
2. **Select charts and frames**
3. **Arrange and configure**

Choose an optional period or whole eligible coverage. The coverage picker groups
charts by Page/Section, with source/cadence/search filters and explicit empty or
partial coverage. Filters preserve selection and member order. **All member
observations** derives a union clock; a source mode uses one chart's observations,
and a calendar mode uses the authored cadence. Arrange View and Present independently within
their supported capacities. Save/Discard applies only to this draft. View and
Present use saved content; conflicting work offers save, discard or stay, and
failures return to the named draft without partial updates.

An eligible chart's Data step offers its saved time-matching default. Exact,
last-known, bounded-nearest and permitted interpolation have different meanings;
read the explanation before changing them. Storyline member overrides and
temporary Time settings do not rewrite that chart default. If a temporal role is
removed, clear the chart-owned setting to return to snapshot behavior. The stage
can preview Live or the current At cursor while keeping its authored geometry.

Exercise time is saved Scenario metadata in **Scenario Passport**. In Present,
seek to a later exercise instant and choose **Advance exercise time** to save it
and return to Live. Finish open drafts first; a rejected or failed save leaves
the declared time unchanged. Ordinary seeking and playback do not advance it.

## Present and Audience

Present is the moderator workspace. Choose eligible saved items, select an
allowed layout, control playback, and open/reopen the Audience display. Present
also controls blackout and which available facts appear on Audience.

Audience is passive, same-computer, same-origin output. It renders the latest
valid projection and retains last-valid output if a new render fails. It uses
the same accepted cursor and observation-matching policies as the controller.
Its one direct-manipulation exception is the Storyline date: drag the date on the Audience
display to reposition it. A successful connected drag automatically saves the
new horizontal and vertical coordinates to the owning Storyline while preserving
the configured date width. Audience is not otherwise an authoring surface. A
Storyline must be saved, valid, and launch-eligible before it can be used for
Present/Audience.

After a package import or saved chart-binding/source-data edit, reload or reopen
Audience and verify its actual charts before resuming. Accepted time and matching
updates do not replace the chart/source bytes already loaded in that window.

## Packages, migration, and persistence

Browser state is local to that browser. Download a package before substantial
work and after a coherent saved change; keep an earlier export until the new
one is checked.

The live package boundary is Version 7. Imports can deterministically normalize
supported earlier dashboard configurations before strict validation. Former
Groups and parented Scenes become Storylines while preserving their authored
periods, cadence, members and policy overrides; charts remain Version 3. Unsupported
or invalid input is rejected, never partially applied. After importing legacy
content successfully, download a new Version 7 package before sharing or
promoting it. The legacy-named browser storage key does not make the live
dashboard a Version 3 dashboard.

Review changed sources, content, assets and time structure before committing an
import. Exports identify their app/package versions and integrity checksum for
citation. Keep the original package with a compatible earlier app: an older V6
app cannot be assumed to read V7. The maintainer guide describes the actual
rollback and preserved-backup workflow.

A raw configuration import has no packaged-export integrity metadata and may
depend on external files. Use **Download Dashboard Package** for portable
sharing and a citable export identity.

Migration keeps every Group member. Present still permits at most four charts;
review any proposed subset/layout before accepting it. Review reported policy or
time-role conflicts, and repair an unbounded legacy nearest policy explicitly.
Opening older saved content does not itself overwrite its stored original;
an explicit save commits the native format.

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
The V7 catalogue uses contract 3 and lists saved membership in `storyline_ids`;
connected use requires a companion that supports it. A contract-2-only Quorum
release cannot consume that catalogue. Real contract-3 integration is pending.

## Further references

- [Author quick start](author-quick-start.md)
- [Room moderator runbook](moderator-runbook.md)
- [Maintainer release and rollback guide](maintainer-release-and-rollback.md)
- [Scope and support](scope-and-support.md)
- [Dashboard operation contract](v3-dashboard-operation-contract.md)
- [Chart Data System V3](chart-data-system-v3.md)
- [Quorum companion guide](quorum-companion.md)
- [Step 9 final acceptance](audits/2026-08-28-v3-step-9-final-acceptance/FINAL-ACCEPTANCE.md)
