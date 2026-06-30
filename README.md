# SimEx Dashboard V2

A static, config-driven React + ECharts prototype for simulation exercise dashboards.

## Goals

- Run from static web files after build.
- Let non-developers change dashboard views through JSON config and prepared CSV data.
- Keep data processing outside the dashboard.
- Support configurable charts, colors, legends, data sources, and layout presets.

## Development

Install dependencies:

```powershell
pnpm.cmd install
```

Run locally:

```powershell
pnpm.cmd dev -- --host 0.0.0.0 --port 5173
```

Build static files:

```powershell
pnpm.cmd build
```

Preview the built app:

```powershell
pnpm.cmd preview
```

## Key Files

- `public/config/dashboard.json`: dashboard layout and chart definitions.
- `public/data/**`: prepared display-ready CSV, JSON, and GeoJSON data files.
- `public/vendor/**`: local third-party browser scripts used by visual effects.
- `src/lib/buildEchartsOption.js`: converts chart config into ECharts options.
- `src/components/DashboardRenderer.jsx`: renders the configured dashboard.
- `src/components/ChartPanel.jsx`: renders individual charts, maps, tables, KPIs, fullscreen views, and panel actions.
- `src/components/ChartSettingsPanel.jsx`: edit-mode controls for pages, sections, panels, data, series, axes, legends, styles, and layout.
- `src/lib/chartOptionRegistry.js`: schema-style registry for chart edit options.
- `docs/project-handoff.md`: current maintainer handoff and feature map.
- `docs/old-dashboard-migration-map.md`: migration notes from the original PDPC dashboard.

## Current Feature Map

The dashboard currently supports a config-driven multi-page layout, point-and-click edit mode, global and per-panel visual styling, per-chart data filtering, panel drag/reorder, single-chart and multi-chart fullscreen views, individual chart image export, maps, gauges, image panels, import/export config, and a configurable animated background.

For a complete pickup guide, see:

```text
docs/project-handoff.md
```

## Bundle Size Note

`pnpm.cmd build` may print a Vite warning that one generated JavaScript chunk is larger than 500 kB after minification. This is a warning, not a failed build. The current bundle is large mainly because the browser app includes React, ECharts, map/chart rendering, and the dashboard editor in one static app. If startup speed becomes a deployment concern, the next optimization would be code splitting and lazy-loading heavier chart/editor modules.
