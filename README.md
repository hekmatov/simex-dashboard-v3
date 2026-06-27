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
npm install
```

Run locally:

```powershell
npm run dev
```

Build static files:

```powershell
npm run build
```

Preview the built app:

```powershell
npm run preview
```

## Key Files

- `public/config/dashboard.json`: dashboard layout and chart definitions.
- `public/data/*.csv`: prepared display-ready data files.
- `src/lib/buildEchartsOption.js`: converts chart config into ECharts options.
- `src/components/DashboardRenderer.jsx`: renders the configured dashboard.
