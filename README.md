# SimEx Dashboard V2

SimEx Dashboard V2 is a static React and ECharts application for simulation
exercise situational awareness and decision support. Its chart data,
configuration, and portable bundle contracts are version 3.

The default HeV-A26 dashboard demonstrates biomedical and socio-economic
monitoring. The application is a reusable authoring and display system rather
than a fixed copy of the dashboard used in an earlier exercise.

## What the dashboard supports

- A showcase Home page plus configurable operational dashboard pages.
- A schema-generated, four-step chart wizard:
  1. select a chart type by communication purpose;
  2. select a tracked CSV, upload a CSV, or use schema-authorized concise
     manual data;
  3. bind typed data roles and transformations;
  4. review the live chart before configuring relevant style and layout.
- Twenty-six chart types across comparison, trend, composition, target,
  relationship, readiness, timeline, geography, and operational families.
- Real pie and donut charts, line and bar variants, KPIs, gauges, bullets,
  delta cards and lists, heatmaps, readiness matrices, timelines, swimlanes,
  choropleths, map scatter, tables, images, and other registered types.
- Dataset profiling with detected column types, examples, and temporal
  diagnostics.
- Multiple measurements, primary and secondary axes, clusters, filters,
  missing-value handling, and duplicate resolution shown only when the
  selected roles produce collisions.
- Preview-gated, schema-applicable series palettes and line or bar widths,
  persisted through bundles and guided chart-type conversion.
- A contextual chart editor and guided, atomic chart-type conversion.
- Synchronized time playback with exact, last-known, bounded-nearest, and
  explicitly authorized interpolation policies.
- A reusable Collection Display framework for fixed grids, scrollable grids,
  carousels, and priority-ranked KPI, gauge, bullet, or delta-list items.
- Ctrl-wheel zoom guarding on charts that support wheel zoom.
- Single- and multi-chart fullscreen views, image export, responsive layouts,
  and an optional metadata-only Quorum companion.

For user guidance, see [the app manual](docs/app-manual.md). For the data and
configuration architecture, see
[Chart Data System V3](docs/chart-data-system-v3.md).

## Development

Install dependencies:

```powershell
pnpm.cmd install
```

Run locally:

```powershell
pnpm.cmd dev -- --host 0.0.0.0 --port 5173
```

Run verification:

```powershell
pnpm.cmd test
pnpm.cmd test:e2e
pnpm.cmd build
git diff --check
```

Create a flash-drive package:

```powershell
pnpm.cmd package:flashdrive
```

Preview the built app:

```powershell
pnpm.cmd preview
```

The production site is written to `dist/`. Viewers need only a modern browser;
Node.js and package tools are build-time dependencies.

## Architecture map

- `public/config/dashboard.json` — strict default dashboard configuration.
- `public/data/**` — tracked CSV and GeoJSON sources.
- `src/charting/schemas/chartSchemaRegistry.js` — validated chart-type
  registry and discovery authority.
- `src/charting/config/chartConfigV3.js` — chart-instance normalization and
  validation.
- `src/charting/config/dashboardBundleV3.js` — strict dashboard and bundle
  version 3 boundary.
- `src/charting/data/profileDataset.js` — dataset profiling.
- `src/charting/data/prepareChartData.js` — canonical preparation pipeline.
- `src/components/chart-authoring/ChartWizardV3.jsx` — four-step chart
  authoring.
- `src/components/chart-authoring/ChartEditorV3.jsx` — contextual editing and
  conversion.
- `src/components/charts/ChartView.jsx` — shared preview and dashboard
  rendering boundary.
- `src/components/collection/CollectionDisplay.jsx` — shared repeated-entity
  presentation.
- `src/charting/time/**` — synchronized clocks, matching, playback, and
  time-aware projection.
- `public/integration/quorum-chart-catalogue.json` — generated metadata-only
  Quorum catalogue contract version 2.
- `src/lib/quorumCompanionClient.js` — optional fail-closed companion client.

## Chart authoring

Chart discovery, fields, validation, editor sections, and conversions are
generated from the same registry. A chart type therefore exposes only roles
and controls that its renderer can use. The title remains reachable for repair;
other visual controls remain hidden until the selected source and data roles
produce a renderer-ready preview.

Series appearance is declared by semantic renderer mark rather than chart ID.
Bar families expose palette and bar width, line and area families expose
palette and line width, mixed charts expose both widths, and composition or
relationship charts expose palettes. Types whose renderers cannot apply these
settings do not expose or persist them.

Manual entry is not a chart-type shortcut. It is available only when the
selected schema declares a concise inline-data contract. Uploaded CSV text and
inline rows are stored in the dashboard configuration so they can round-trip
through an exported bundle.

Time matching is owned by synchronization groups. Charts store group
membership; the group and its members define matching behavior. Interpolation
requires a continuous chart family, numeric profile evidence, valid bounds,
and explicit permission. It never extrapolates.

## Portable dashboard bundles

Exported files have exactly four outer keys. The following is a shape
schematic, not an importable bundle: a real export contains a canonical
timestamp or `null`, one fingerprint entry for every data source, and the
complete validated dashboard configuration.

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

Version 2 bundles and legacy alternate shapes are rejected; the app does not
guess or silently migrate their meaning. The user-facing error is:

```text
This dashboard supports version 3 bundles only.
```

Tracked files remain file-backed. Uploaded CSV text and schema-authorized
inline rows travel inside the bundle. Export a bundle before substantial
browser editing or before importing another configuration.

## Optional Quorum companion

The local Quorum moderator companion can request an operator-authorized set of
up to four configured chart IDs through a same-origin, metadata-only protocol.
Manual and companion fullscreen actions use the same revisioned browser
display state. If discovery is absent or incompatible, the dashboard remains
fully usable in standalone mode.

The integration does not exchange transcripts, speaker data, summaries,
topics, evidence text, or other discussion content. Catalogue contract version
2 and chart schema version 3 are independent of the companion protocol, which
remains version 1.

Generate the catalogue with:

```powershell
pnpm.cmd run build:quorum-catalogue
```

See [the Quorum companion guide](docs/quorum-companion.md).

## Static deployment

An ordinary build embeds the prepared default data for portable and static
operation:

```powershell
pnpm.cmd build
```

The dedicated Cloudflare build leaves configuration and prepared data as
separate resources to avoid the host's per-file limit:

```text
pnpm run build:cloudflare:linux
```

No deployment is performed by the verification workflow. Publishing,
Cloudflare branch changes, and repository integration require separate
approval.

The build currently emits three non-failing classic-script notices for the
local Vanta/Three scripts and `portable-dashboard-data.js`. It also emits
Vite's advisory that the main minified JavaScript chunk exceeds 500 kB.
Code-splitting is the appropriate future optimization if startup size becomes
a deployment concern.

## Verification record

The final local verification evidence for this revamp is in
[docs/verification/2026-07-26-chart-system-v3.md](docs/verification/2026-07-26-chart-system-v3.md).
