# SimEx Dashboard

SimEx Dashboard is a static React and ECharts workspace for simulation-exercise
situational awareness, dashboard authoring, and controlled audience
presentation. It is a training prototype, provided without warranty of
availability, accuracy, suitability, security, support, or compatibility.

The application has four workspaces: application-owned **Home**, shared
operational **View**, local-authoring **Build**, and moderator-controlled
**Present** with a passive same-computer **Audience** output. Home is governed
by the active Scenario preference, not by an authored Page. View and Build
share the canonical renderer and saved layout; Present and Audience consume
saved content rather than author it.

## Current contracts

- Dashboard configuration and portable packages are **Version 7**.
- Chart definitions, schema-generated authoring, and the chart data pipeline
  are **Version 3**.
- Quorum's generated chart catalogue is contract version 3; its companion
  transport protocol remains version 1. Connected use requires a compatible
  companion; real contract-3 integration is not yet verified.
- The core dashboard supports static/offline operation. URL-hosted media remains
  an explicit network dependency rather than being silently embedded.

The operational ownership, draft, package, temporal, and mode rules are in the
[V7 dashboard operation contract](docs/v3-dashboard-operation-contract.md).
The user-facing workflow is in the [app manual](docs/app-manual.md), and the
chart model is in [Chart Data System V3](docs/chart-data-system-v3.md).

## What it supports

- Schema-generated chart creation and contextual chart editing.
- Shared View/Build chart layouts, bounded 2×4 chart footprints, and separate
  layout and selected-chart drafts.
- Inline Page and Section changes with named consequences.
- Cross-page Storylines and one Live/At cursor shared by View, Present and
  passive Audience output.
- Scenario Passport, explicit package import/download/reset boundaries, and
  deterministic legacy-package migration followed by Version 7 re-export with
  application-version and whole-package integrity metadata.
- Local source/media content management with portable verified assets.
- Optional metadata-only Quorum companion control.

## Development

Install and run locally:

```powershell
pnpm.cmd install
pnpm.cmd dev -- --host 0.0.0.0 --port 5173
```

Create a normal static build or a flash-drive package:

```powershell
pnpm.cmd build
pnpm.cmd package:flashdrive
```

Test the current source during ordinary E2E iteration, or explicitly test a
fresh production bundle:

```powershell
pnpm.cmd test:e2e
pnpm.cmd test:e2e:package
```

`test:e2e` always runs through Vite source and never reads `dist`.
`test:e2e:package` rebuilds `dist` before running the dedicated static-package
smoke check.

To promote browser-authored content into the repository baseline, download its
package, place it at the repository root as
`packaged-dashboard-bundle.json`, run `pnpm.cmd promote:bundle`, and review
the resulting configuration and generated data before packaging.

Publishing, deployment, pushes, and merges are separate approvals.

## Architecture map

- `src/App.jsx` — mode selection, persistence, and application recovery.
- `src/lib/dashboardMode.js` — Home/View/Build/Present availability and
  preference reconciliation.
- `src/charting/config/dashboardConfigStructure.js` — strict V7 dashboard
  configuration boundary.
- `src/charting/config/dashboardBundleV3.js` — package parsing,
  normalization, and serialization.
- `src/components/build/BuildWorkspace.jsx` — Build draft coordination and
  authoring surfaces.
- `src/components/time/` — Storyline library, editing, and
  saved/live temporal boundaries.
- `src/components/presentation/` — Present controller and passive Audience
  projection.
- `src/lib/dashboardPackage*.js` — package candidate, import, and export
  transactions.
