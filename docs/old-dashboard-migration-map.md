# Old Dashboard Migration Map

This V2 dashboard now uses a page/section/panel structure instead of one flat list of charts.

## Runtime model

- The browser app is React + ECharts.
- The dashboard loads static CSV, JSON, and GeoJSON files from `public/data`.
- No Python or Docker is needed to host or view the built dashboard.
- Python is only used by maintainers when refreshing prepared data from the old `pdpcDashApp` project.

## Key files

- `public/config/dashboard.json`: main editable dashboard configuration.
- `public/data/biomedical`: prepared biomedical datasets.
- `public/data/socio-economic`: prepared socio-economic datasets.
- `public/data/geo/netherlands-provinces.geojson`: local map geometry used by ECharts maps.
- `scripts/export_old_dashboard_data.py`: maintainer-side exporter from old dashboard loaders into static V2 data files.
- `src/components/DashboardRenderer.jsx`: page, section, filter, and edit-mode shell.
- `src/components/ChartPanel.jsx`: renderer switch for charts, maps, gauges, tables, KPI cards, and delta lists.
- `src/lib/buildEchartsOption.js`: ECharts option builder.

## Imported content

### Biomedical

- Cases and Mortality
  - Geographic Spread Netherlands
  - Confirmed Cases (cumulative)
  - Estimated R-value Over Time
  - Confirmed Cases per Province
  - Change Since Previous Day
  - Confirmed Cases and Deaths per Day
  - Age Distribution of HeV-A26 Mortality
- Healthcare
  - Current ICU Occupancy
  - Current Hospital Occupancy
  - Total ICU Occupancy
  - Total Hospital Occupancy
  - ICU and Hospital Admissions per Day
  - Surgeries Performed per Month
- Testing
  - Tests Conducted and Test Positivity per Day
- Wastewater Surveillance
  - Geographic Spread
  - HeV-A26 Virus Particles per Province
- Vaccination
  - Current Vaccination Status
  - Vaccination Rate Over Time

### Socio-economic

- Behaviour
  - Risk Perception
  - Risk Perception deltas
  - Adherence to Health Measures
  - Key Considerations from Citizens in Current Phase
  - Values deltas
- Public Trust
  - Trust
  - Current Trust gauge
- Subjective Wellbeing
  - Loneliness
  - Wellbeing
  - Lifestyle
  - Resilience
- Economy
  - Business Closures
  - Unemployment
- Absenteeism
  - Absenteeism in Healthcare
  - School Absenteeism

## Refreshing prepared data

From the V2 repository root:

```powershell
uv run --project "C:\Users\hekma\Documents\SimEx Dashboard\pdpcDashApp" python scripts\export_old_dashboard_data.py
```

That command reuses the old dashboard loaders and writes static files under `public/data`. The V2 app does not run that exporter in the browser.

## Verifying V2

```powershell
pnpm.cmd build
pnpm.cmd dev -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173
```

Use the page tabs to check Home, Biomedical, and Socio-economic. Use Edit mode to test panel title, type, data source, size, legend, and series style controls.

## Map asset

The Netherlands province map is stored locally at `public/data/geo/netherlands-provinces.geojson` so the dashboard can render maps without live tile services. The current file was downloaded from Cartomap's WGS84 Netherlands province GeoJSON and normalized with a `name` property for ECharts.

The data exporter deliberately preserves this stored GeoJSON file instead of regenerating a placeholder map.

## Edit mode capabilities

Edit mode now supports:

- Dragging panels to reorder them within the dashboard.
- Adding a new chart to any section.
- Removing an existing panel from the chart controls or settings panel.
- Page-specific layout settings, so Biomedical and Socio-economic can use different panel layouts.
- Fullscreen view for any panel using the small top-right button.
- Chart-specific settings for axis choice, date-axis handling, legend visibility, color schemes, reversible Likert gradients, series fields, gauges, maps, tables, and delta lists.

## Edit session behavior

When edit mode is opened, the app stores a temporary snapshot of the dashboard config.

- `Save` exits edit mode and keeps the changes made during that edit session.
- `Reset edits` exits edit mode and restores the config to how it looked when edit mode was opened.
- `Export config` still downloads the current config, including saved edits.

Panel size options are:

- `half`: 0.5 x 1, useful for compact indicators such as gauges.
- `normal`: 1 x 1.
- `wide`: 2 x 1.
- `tall`: 1 x 2.
- `large`: 2 x 2.

Fullscreen chart rendering scales titles, axis text, line weights, gauge details, and map point sizes based on the original panel size, so small panels such as gauges get a stronger enlargement than panels already configured as large.

## Panel-level date selection

Each chart can now manage its own date selection in edit mode. Open a panel's settings and use the controls in this order: title, data source, panel type, then date range. The date range control lists every unique value from the detected date-like column in that panel's data source, with select all and deselect all buttons.

For chart rendering, page or section date filters no longer silently restrict panels that use date-like columns. This keeps each chart independent: a panel shows all available dates by default, and only narrows when its own date checklist is saved.
