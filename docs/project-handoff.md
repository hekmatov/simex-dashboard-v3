# SimEx Dashboard V2 Project Handoff

## Current snapshot

- Project: SimEx Dashboard V2
- Repo folder: `C:\Users\hekma\Documents\SimEx Dashboard\simex-dashboard-v2`
- Active branch at time of handoff: `codex/import-old-dashboard-content`
- Stack: React, Vite, ECharts, Papa Parse
- Local dev URL: `http://localhost:5173/`
- Original dashboard comparison URL, when the Docker container is running separately: `http://localhost:8081/`
- Goal: rebuild the original PDPC/NiceGUI dashboard as a static, easy-to-host React dashboard with point-and-click editing.

## Design principles

- End users should not need Python or Docker to run, host, or edit the dashboard.
- The app should consume prepared dashboard-ready data files, not perform heavy data processing at runtime.
- Content, layout, chart definitions, and data bindings should live in config and static data files where possible.
- Common presentation edits should be point-and-click: titles, chart type, data source, date selection, colors, legend, sizing, and layout.
- Functional parity with the original dashboard matters more than pixel-perfect cloning.

## How to run V2 locally

From the project folder:

```powershell
cd "C:\Users\hekma\Documents\SimEx Dashboard\simex-dashboard-v2"
pnpm.cmd install
pnpm.cmd dev -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173/
```

For LAN testing on the current network, the previously observed address was:

```text
http://192.168.1.127:5173/
```

That LAN address can change when the network changes.

## How to build

```powershell
pnpm.cmd build
```

The static production output is written to:

```text
dist/
```

That folder is the target for simple static hosting.

## Original dashboard reference

The old dashboard can be run separately through Docker:

```powershell
docker run --rm --pull=always -p 0.0.0.0:8081:8080 sree2712/pdpc-dashboard:latest
```

Open:

```text
http://localhost:8081/
```

Use it as a comparison target when checking whether V2 has equivalent pages, labels, chart types, and data displays.

## Important files and folders

```text
public/config/dashboard.json
```

Main V2 dashboard configuration. Defines pages, sections, panels, data sources, filters, visual types, fields, colors, sizes, and layout behavior.

```text
public/data/biomedical/
public/data/socio-economic/
public/data/geo/
```

Prepared static data used by the dashboard. CSV is used for chart and table data. GeoJSON is used for map rendering.

```text
public/assets/
```

Static visual assets, including the PDPC mark and watermark assets.

```text
src/App.jsx
```

Top-level app state, config loading, edit-mode save/reset behavior, import/export config behavior, and panel update helpers.

```text
src/components/DashboardRenderer.jsx
```

Page/section layout renderer, header edit block, page tabs, section filters, add-chart action, drag-and-drop wiring, and settings panel placement.

```text
src/components/ChartPanel.jsx
```

Individual panel renderer. Applies panel filters, panel-level date selection, fullscreen mode, chart/table/KPI/delta rendering, and panel action buttons.

```text
src/components/ChartSettingsPanel.jsx
```

Point-and-click edit drawer for each panel. Includes title, data source, panel type, panel-level date checklist, size, axis options, color schemes, series controls, gauge controls, map controls, table controls, delta controls, and remove-panel action.

```text
src/lib/buildEchartsOption.js
```

Converts panel config and data into ECharts options. Supports line, bar, area, horizontal bar, grouped bar, stacked bar, mixed bar/line, gauge, and map scatter visuals.

```text
src/lib/loadDashboard.js
```

Loads dashboard config and static data sources.

```text
src/lib/validateConfig.js
```

Lightweight validation for missing or unsupported panel config.

```text
src/styles.css
```

Dashboard layout, header, panel grid, edit drawer, drag/drop states, fullscreen modal, date checklist, and visual styling.

```text
scripts/export_old_dashboard_data.py
```

Maintainer-side helper script for preparing static data from the old dashboard sources. This is not part of dashboard runtime.

```text
docs/old-dashboard-migration-map.md
docs/project-handoff.md
```

Migration notes and this handoff file.

## Features included so far

### Dashboard structure

- Multi-page dashboard shell.
- Home page.
- Biomedical page.
- Socio-economic page.
- Section-based layout within each page.
- Scenario and updated metadata block in the header.
- Header-integrated edit mode block.
- Collapsed edit icon in view mode.
- Expanded edit controls in edit mode.

### Imported content areas

Biomedical content areas:

- Cases and Mortality.
- Healthcare and hospitalization.
- Testing.
- Wastewater surveillance.
- Vaccination.

Socio-economic content areas:

- Behaviour.
- Public trust.
- Subjective wellbeing.
- Economy.
- Absenteeism.

### Visual types

- Line charts.
- Bar charts.
- Area charts.
- Horizontal bar charts.
- Grouped bars.
- Stacked bars.
- Mixed bar and line charts.
- Gauge or speedometer indicators.
- Province map overlays using local GeoJSON.
- KPI cards.
- Tables.
- Delta or comparison panels.

### Editing features

- Point-and-click edit mode.
- Edit mode integrated into the header.
- Page-specific layout selector.
- Add chart button per section.
- New panels are inserted at the top of their section.
- Remove chart/panel action.
- Drag-and-drop panel rearrangement in edit mode.
- Smooth visual drag/drop states.
- Fullscreen chart button on each panel.
- Fullscreen chart scaling for font size, line weight, gauge size, and map point size.
- Save button exits edit mode and keeps edits.
- Reset edits button discards edits made during the current edit session.
- Import config button.
- Export config button with filename prompt. Default filename format: `SimEx-config-YYYYMMDD.json`.

### Per-panel settings

The panel edit menu is ordered as:

1. Title.
2. Data source.
3. Panel type.
4. Date range checklist.
5. Size and the rest of the general or panel-specific options.

Panel settings currently include:

- Title editing.
- Data source selection.
- Panel type selection.
- Independent panel-level date checklist.
- Select all and deselect all dates.
- Size options: half, normal, wide, tall, large.
- X axis column.
- X axis mode: category or date/time.
- Y axis scale: zero or automatic.
- Color scheme selection.
- Reversible color schemes.
- Manual series color controls.
- Legend show/hide.
- Series label and value-column controls.
- Line width controls.
- Grouped/stacked data controls.
- Gauge value, label, and max controls.
- Map province/name field, value field, and point scale controls.
- Table column controls.
- Delta list title/value/row-count controls.

### Color schemes

- Manual series colors.
- PDPC mixed.
- Likert red-to-green five-step gradient.
- Likert blue-to-yellow five-step gradient.
- Reversible gradients.
- Cool blues/teals.
- Warm alert palette.

### Data and filtering behavior

- Data is loaded from static files under `public/data`.
- Heavy data processing is not intended to happen inside the dashboard at runtime.
- Each chart can independently filter dates through its panel-level checklist.
- If no panel-level date selection has been saved, the chart shows all available dates by default.
- Page or section date filters no longer silently restrict panel data for date-like columns.
- Non-date filters still apply where configured.

### Maps and assets

- Maps use local GeoJSON, not live map tiles.
- GeoJSON location: `public/data/geo/netherlands-provinces.geojson`.
- PDPC visual assets are stored under `public/assets`.
- Header includes a compact PDPC mark.
- A subtle PDPC watermark/background treatment has been added.

## Verification already performed

Recent checks completed before this handoff:

```powershell
pnpm.cmd build
```

Result: passed.

Automated data coverage check:

- 34 data-backed panels checked.
- All checked data-backed panels had at least one row after filtering.

Browser smoke check:

- V2 loaded at `http://localhost:5173/`.
- Biomedical page showed 18 panels and 16 canvases.
- No chart-panel errors were detected during that check.

Whitespace check:

```powershell
git diff --check
```

Result: passed, with only normal Windows line-ending notices.

## Known practical notes

- The user prefers a teaching copilot style, especially for Git, Docker, and dashboard maintenance.
- For hands-on learning, do not silently do every Git step if the user is trying to practice manually.
- For implementation requests, it is acceptable to implement directly, but explain what changed clearly.
- The project moved out of OneDrive because OneDrive caused Git and Docker file-locking/deletion friction.
- The active repo is under `C:\Users\hekma\Documents\SimEx Dashboard`, not the old OneDrive path.
- PowerShell may block `npm` through execution policy. Use `npm.cmd` or `pnpm.cmd` on Windows.
- Docker is useful for comparing with the original dashboard, but V2 should not require Docker for ordinary hosting.

## Recommended next steps

1. Compare V2 page-by-page against the original Docker dashboard.
2. Check each imported chart for semantic correctness, not only whether it renders.
3. Review labels, units, legends, and date handling with domain users.
4. Improve config validation so broken data bindings are caught before runtime.
5. Add Playwright checks once browser automation is stable in the environment.
6. Decide which edit controls should persist only locally and which should be exported as official scenario config.
7. Add a maintainer data-preparation guide for converting future scenario data into `public/data` CSV/JSON/GeoJSON files.
8. Consider code splitting later if the ECharts/Vite bundle-size warning becomes a deployment issue.

## Update: fuller biomedical case data and date range picker

A later data check found that the local old-dashboard Excel files only contained a short February slice, while the original Docker dashboard image contained fuller biomedical data. The V2 static biomedical files were refreshed from the running Docker container.

Important refreshed ranges:

- Confirmed cumulative cases: `177` daily rows, `2027-02-20` to `2027-08-15`.
- Estimated R values: `177` daily rows, `2027-02-20` to `2027-08-15`.
- Province case snapshots: `36` rows, three snapshots from `2027-02-21` to `2027-08-15`.
- Latest province snapshot: `12` rows for `2027-08-15`.

The per-panel date editor now switches automatically:

- Up to five unique dates: checkbox list.
- More than five unique dates: `From` and `To` date fields with an expandable calendar where unavailable dates are greyed out.

This matters most for the Biomedical page charts:

- `bio_confirmed_cases`
- `bio_r_values`
- `bio_region_comparison`
- `bio_new_cases_deaths`

## Update: chart scaling and font controls

Chart rendering now scales text and line weights based on panel context:

- Normal panels use the base chart font sizes.
- Tall and large panels apply a larger automatic scale so the extra vertical space is used better.
- Fullscreen panels apply a stronger scale so titles, axis labels, legends, gauge text, map labels, and line weights grow with the larger view.

Each editable ECharts panel now has a `Text size` section in the panel settings drawer. The controls use minus and plus buttons and store base font sizes on the panel as `fontSizes` values. These base values are still multiplied by the automatic panel/fullscreen scale at render time.

### Update: measured vertical chart scaling

Chart scaling now measures the actual rendered chart container with `ResizeObserver` and passes width/height-derived scale into ECharts. This avoids the old failure mode where CSS made a panel taller but ECharts kept behaving like the chart was still a short 380px canvas. Fullscreen charts now call ECharts `resize()` after dimension changes and use the measured fullscreen height when scaling fonts, grid spacing, and line weights.
