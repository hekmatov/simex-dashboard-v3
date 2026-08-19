# SimEx Dashboard V2 App Manual

## Purpose and scope

SimEx Dashboard V2 is a static, configurable web application for displaying
and communicating simulation-exercise information. Its Chart Data System,
dashboard configuration, and portable bundle contracts are version 3.

The default HeV-A26 content demonstrates current biomedical and socio-economic
needs. It is an example built from real exercise datasets, not a permanent
template for every future exercise.

Prototype for education and training only. Non-commercial. No guarantees of availability, accuracy, suitability, security, support, or compatibility.

## View, Build, and Present

The mode switcher is always available in the workspace:

- **View** is the shared operational dashboard. Use **Compare charts** to
  select two to four charts for fullscreen and press Escape to close it.
- **Build** is the local authoring workspace for scenario metadata, pages,
  sections, charts, appearance, and bundles. Finish Build after reviewing
  changes; a failed save keeps the current Build draft available for repair.
- **Present** is the local controller for a same-computer, same-origin
  audience window. Open or reopen the audience display, choose up to four
  charts, set its layout and synchronized time, then use Blackout or Restore
  as needed.

Browser edits use `simex-dashboard-config-v3-three-mode-v1`. Earlier browser
saves and pre-redesign packages are not migrated. Start from the supplied
dashboard or re-author the configuration before saving it again.

## Dashboard at a glance

The default dashboard has three pages:

- **Home** introduces SimEx and routes visitors into the two live domains.
- **Biomedical** covers transmission, mortality, healthcare pressure,
  testing, wastewater, vaccination, and geography.
- **Socio-economic** covers behaviour, trust, wellbeing, business disruption,
  unemployment, and absenteeism.

Each operational page contains sections and chart panels. Use the page tabs to
move between pages and scroll through each section.

### View mode

Available panel actions can include:

- open one chart fullscreen;
- select two to four charts for a shared fullscreen view;
- export an image;
- inspect source information;
- inspect source rows where configured.

Hover a plotted mark or map feature for its tooltip. Charts scale typography
and visual weight for tall, large, and fullscreen panels.

Charts that support wheel zoom require **Ctrl+wheel**. Plain scrolling keeps
the page moving and displays a short Ctrl guidance tooltip. The same rule
applies in the dashboard and fullscreen views.

### Quorum connection status

The hosted or portable dashboard works normally with **Standalone** status. A
local Quorum companion is optional. “Quorum integration-ready” means that the
metadata catalogue and same-origin protocol are present; it does not mean a
public dashboard is actively connected.

Standalone and Connected describe the optional companion connection; they are
not UI modes. The workspace modes are View, Build, and Present.

Quorum can request configured chart IDs for operator-authorized display. It
does not send discussion text to the dashboard, and the dashboard does not
send transcripts, summaries, speaker data, or evidence text to Quorum.

## Build mode

Build changes dashboard content without requiring manual JSON editing. It
supports:

- dashboard and scenario text;
- pages and sections;
- chart creation, editing, conversion, ordering, sizing, and removal;
- tracked, uploaded, and concise inline data sources;
- global and chart-specific surfaces;
- synchronized time groups;
- portable bundle import and export.

Browser edits are local to that browser until exported. Export a version 3
bundle to preserve or share them.

### Adding a chart

The **Add chart** wizard has four directly clickable tabs. You may inspect any
tab at any time; an early destination explains the unmet prerequisites rather
than exposing invalid controls.

#### 1. Chart type

Choose the communication purpose first, then the chart type. Search matches
the registered name, description, and purpose metadata.

This choice defines the remaining form. A line chart and a bar chart can share
axis roles; a pie, KPI, choropleth, timeline, or gauge exposes a different
schema.

#### 2. Data source

Choose one of the source modes permitted by the selected chart schema:

- an existing tracked CSV;
- a local CSV upload stored with the dashboard configuration;
- concise manual entry when the schema explicitly permits inline rows.

Manual entry is intentionally unavailable for schemas that require a richer
dataset. Current inline limits are bounded by the schema and a global
50-row ceiling. Most concise composition and target inputs allow no more than
20 rows; image input is exactly one row.

After selecting a CSV, the wizard shows the row and column shape, detected
column types, examples, and relevant warnings. Temporal diagnostics are used
to prevent date-looking text from being silently interpreted as a valid clock.

Geography charts also require a valid GeoJSON source and an explicit or safely
inferred feature join.

#### 3. Data roles

Bind the semantic roles declared by the selected chart type:

- measurements appear first and can permit multiple numeric columns;
- axis measurements can use the primary or secondary y-axis;
- the x observation follows, with the detected interpretation shown;
- an alternative x interpretation is offered only when it changes practical
  chart behavior;
- optional cluster, filter, label, entity, target, time, geography, and other
  roles appear only when the schema declares them.

Filters are chart-local. Missing-value handling is explicit.

Duplicate-observation controls appear only when the current source and role
combination actually produces correlated duplicate marks. An unresolved
collision blocks preview instead of silently selecting or aggregating a row.
When detected, choose **Flag as an error**, **Use first observation**,
**Use last observation**, or **Aggregate observations**; aggregation also
requires an explicit aggregation method.

#### 4. Style and layout

The final step begins with the real chart preview, using the same preparation
and renderer as the dashboard. The chart title remains reachable for repair;
other relevant visual controls unlock only after the source and roles produce
at least one renderer-ready mark.

Controls are chart-specific:

- bar variants expose series colors and bar width;
- line and area charts expose series colors and line width;
- mixed charts expose series colors plus both widths;
- pie, donut, scatter, and bubble charts expose series colors;
- chart types whose renderers cannot apply those settings do not expose them.

Series colors follow plotted order. Add up to 12 exact `#RRGGBB` colors, remove
individual colors, or choose **Use default colors** to return to the renderer
palette. Line width accepts 1 through 12; bar width accepts 4 through 120.
Out-of-range values show an associated error instead of silently blocking
creation or saving.

Other applicable controls include labels, title alignment, target ranges, map
fields, collection presentation, and zoom. A generic “Series” tab is not
shown when it has no meaning for the selected chart type.

Title alignment is applied by the chart renderer. Background surfaces and
chart-specific color fields use the same color-picker format, so the value and
picker behavior stay consistent across appearance controls. Background fields
also offer their curated preset and gradient choices.

Selecting **Close** opens a **Discard chart?** confirmation. Confirming
discards the draft; cancelling returns to the wizard. Removing a selected
source always asks for confirmation and clears its role assignments. Changing
to a source with incompatible mappings asks separately before clearing them.

## Editing an existing chart

The editor uses the same schema, preparation pipeline, preview, and validation
as the wizard. Tabs are materialized from applicable fields and can include:

- Data
- Appearance
- Axes
- Map
- Timeline
- Collection
- Interactions
- Advanced

There is no unconditional Series tab.

**Save** and **Reset changes** are adjacent. Reset asks for confirmation and
returns to the most recently saved chart revision. A failed or incomplete
preview keeps the title and responsible repair field reachable.

### Changing chart type

Changing type opens a guided conversion dialog:

- a compatible conversion preserves roles accepted by the target schema;
- an incompatible conversion requires explicit role remapping;
- fields and settings that cannot survive are disclosed before application;
- missing target roles block application;
- cancelling leaves the exact draft unchanged;
- applying a conversion is atomic.

Time-group membership is retained only when the target has a valid mapped
temporal role. Collection settings are retained only when supported by the
target.

## Supported chart families

The registry currently exposes 26 chart types in nine purpose groups.

| Purpose | Chart types |
| --- | --- |
| Comparison | Bar, grouped bar, stacked bar, horizontal bar, horizontal stacked bar |
| Trends | Line, area, mixed axis |
| Composition | Pie, donut |
| Targets | KPI card, gauge, bullet/target, delta card, delta list |
| Relationships | Scatter, bubble |
| Readiness | Heatmap, readiness matrix |
| Timeline | Timeline, swimlane |
| Geography | Choropleth, chronological choropleth, map scatter |
| Operational | Table, image |

### Maps

Choropleths join prepared values to local GeoJSON. The join can use feature
IDs or a selected feature property when the match is unique. Ambiguous or
missing matches identify the geography field that needs repair.

Chronological choropleths retain their full history but render a bounded frame
for the active playback time. Map scatter uses point coordinates or derived
polygon centroids.

Local boundary geometry and thematic data remain part of the static package.

### KPI, gauge, and bullet collections

A single observation uses the ordinary KPI, gauge, or bullet view. Repeated
entities use the shared Collection Display framework and require stable,
unique semantic identities.

### Delta charts

A delta chart displays:

- the displayed value;
- its comparison value;
- the absolute difference;
- the percentage difference when analytically defined.

**Previous observation** selects the latest distinct valid measurement before
the displayed value. **Specific point in time** uses an explicitly selected
earlier timestamp with exact, last-known, or bounded-nearest matching as
configured.
Interpolation is available only under the same numeric permission rules as
synchronized playback.

Delta cards show one entity; filter the source first when it contains several.
Delta lists apply the comparison independently per entity and can use
Collection Display.

## Synchronized time playback

Time synchronization is owned by the dashboard. The dashboard stores an IANA
timezone; bundles without one are normalized to UTC before validation. Each
Time Group contains:

- a stable ID and name;
- an inclusive canonical `YYYY-MM-DD` start/end period;
- a positive `secondsPerFrame` cadence;
- a default matching policy;
- members with a chart ID and declared temporal role, plus an optional
  validated matching override.

`timeSyncGroups[].members` is the sole membership authority. A chart can
belong to multiple Time Groups, with independent matching in each. Charts do
not store an authoritative group backlink, and groups do not designate a
primary clock.

Available frames are the sorted, unique union of valid member observations
inside the period after each chart's saved transformations and filters. A row
contributes a frame only when its temporal role resolves and at least one
plotted value is present. Instant observations are assigned to period dates
using the dashboard timezone; date-only observations remain date-only.

Collection displays cannot join a Time Group. Their paging is independent of
synchronized playback.

Open the playback view to move all eligible charts across the same exercise
time. Family-specific behavior includes:

- line and area charts retain history and trace an active point;
- bar charts show the active snapshot per series;
- choropleths show the active geographic frame;
- heatmaps highlight the active cell;
- timelines and swimlanes identify active events;
- individual KPIs, gauges, and bullets show active values;
- delta charts keep displayed and baseline provenance distinct.

### Matching policies

| Policy | Behavior |
| --- | --- |
| Exact | Use only a measurement at the active time. |
| Last known | Carry the latest earlier measurement. |
| Nearest | Use the unique nearest measurement within the configured tolerance. |
| Interpolate | Calculate between valid numeric bounds when explicitly authorized. |

Nearest matching fails closed on an equidistant tie. Interpolation never
extrapolates, never treats categorical data as continuous, and requires:

- an interpolation-capable chart schema;
- numeric profile evidence;
- valid observations on both sides of the active time;
- explicit author permission.

The playback view distinguishes observed, carried, nearest, interpolated,
missing, and unavailable values so facilitators can see how each value was
obtained.

## Collection Display

Collection Display separates a repeated visualization from the way its items
are arranged. KPI grids, delta lists, bullet collections, and gauge
collections share one contract.

Collection displays cannot be added to Time Groups. Their paging, ranking,
and carousel controls remain local to the collection.

### Fixed grid

Displays a stable number of rows and columns. This is the default for
facilitator familiarity and predictable wall layouts.

### Scrollable grid

Keeps the panel fixed while its contents scroll vertically.

### Auto carousel

Moves through collection pages at a configured interval. Settings include
looping, pause on hover, manual navigation, and transition.

### Priority mode

Ranks operationally important entities into the visible grid. Available
methods include:

- highest or lowest current value;
- largest absolute or percentage change;
- furthest from target;
- calculated risk score;
- approved weighted metrics.

The dashboard does not evaluate arbitrary executable expressions. Collection
ranking does not rerank in response to synchronized playback frames.

Shared controls include rows, columns, card gap, overflow, sorting, ranking,
and carousel behavior.

## Portable dashboard bundles

Use **Export dashboard** to save configuration plus uploaded CSV text and
inline rows. Use **Import dashboard** to restore that state in another copy of
the application.

An accepted bundle has exactly four outer keys. This schematic is not itself
importable: an actual export includes a canonical timestamp or `null`, a
fingerprint entry for every data source, and the complete validated dashboard
configuration.

```json
{
  "bundleType": "simex-dashboard-bundle",
  "version": 3,
  "metadata": {
    "exportedAt": "<canonical ISO-8601 timestamp or null>",
    "sourceFingerprints": {
      "<source-id>": "<deterministic fingerprint or null>"
    }
  },
  "config": {
    "configVersion": 3,
    "...": "<complete dashboard configuration>"
  }
}
```

Version 2 bundles are deliberately rejected with:

```text
This dashboard supports version 3 bundles only.
```

The application does not migrate earlier dashboard formats. Legacy content
must be separately re-authored as a validated version 3 configuration.

Runtime-loaded rows are excluded from serialization. Tracked sources retain
their safe relative paths; uploaded CSV text and inline rows remain portable.

## Persistence and safe editing

The application stores a strict version 3 working configuration in browser
storage. It does not treat browser persistence as a durable publication
system.

Recommended workflow:

1. export the current bundle before substantial edits;
2. make and preview one logical change at a time;
3. save the chart or dashboard;
4. export a new bundle;
5. keep the previous bundle until the new one is reviewed.

## Static and portable use

Build the site:

```powershell
pnpm.cmd build
```

The `dist/` directory can be served by a static host or internal web server.
For portable media:

```powershell
pnpm.cmd package:flashdrive
```

The package embeds the default configuration and prepared sources in
`portable-dashboard-data.js`. If a browser blocks direct `file://` scripts,
use the included `START_DASHBOARD.bat` local-server fallback.

No deployment, Cloudflare update, or repository integration is implied by a
local build.

## Troubleshooting

- **Empty chart:** inspect the preview diagnostic, selected source, role
  bindings, filters, missing-value policy, and duplicate-resolution state.
  “Ready to plot” now requires at least one renderer-ready mark.
- **Style controls are missing:** complete the source and role prerequisites
  until the live preview is ready.
- **Duplicate controls are missing:** they appear only when the current
  binding produces duplicate observations.
- **Map does not render:** verify the GeoJSON source, the selected join field,
  and unmatched or ambiguous identifiers.
- **Playback value is missing:** inspect the chart's group membership,
  temporal role, matching policy, nearest tolerance, and interpolation
  permission.
- **Wheel does not zoom:** hold Ctrl while scrolling over a zoom-capable
  chart.
- **Import is rejected:** confirm both bundle `version` and config
  `configVersion` are `3`.

## Further technical references

- [Chart Data System V3](chart-data-system-v3.md)
- [Quorum companion](quorum-companion.md)
- [Municipality choropleth](municipality-choropleth.md)
- [Final chart-system verification](verification/2026-07-26-chart-system-v3.md)
