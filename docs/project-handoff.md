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
docs/municipality-choropleth.md
```

Migration notes, this handoff file, and municipality choropleth data-join notes.

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
- Municipality choropleth maps using local GeoJSON.
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
- Import bundle button.
- Export bundle button with filename prompt. Default filename format: `SimEx-dashboard-bundle-YYYYMMDD.json`.

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
- Choropleth GeoJSON source, join field, value field, label field, visual scale, and boundary style controls.
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
- Case intensity palette for choropleth maps.

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
- Municipality GeoJSON locations: `public/data/geo/gemeente_2020.geojson`, `public/data/geo/gemeente_2021.geojson`, and `public/data/geo/gemeente_2026.geojson`.
- Harmonized municipality infection rates for the 2021 map live at `public/data/biomedical/municipal_infections_2021_harmonized.csv`.
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

## Update: 2026-06-30 V2 editing sprint checkpoint

This checkpoint completes the current feature-building sprint before the next cosmetic/design sprint. The project is still a static React + Vite app that can be hosted from `dist/` after `pnpm.cmd build`; Docker and Python are not required for end users.

### Current command map

From the V2 repo:

```powershell
cd "C:\Users\hekma\Documents\SimEx Dashboard\simex-dashboard-v2"
pnpm.cmd install
pnpm.cmd dev -- --host 0.0.0.0 --port 5173
pnpm.cmd build
```

Open the development app at:

```text
http://localhost:5173/
```

### Current source map

- `public/config/dashboard.json`: official default dashboard config loaded at startup.
- `public/data/biomedical/`: prepared biomedical CSV files.
- `public/data/socio-economic/`: prepared socio-economic CSV files.
- `public/data/geo/`: map geometry and overlay data.
- `public/vendor/`: local Vanta/Three browser scripts for the animated background.
- `src/App.jsx`: app-level config state, edit-session save/reset, page/tab edits, import/export config, background edits, and fullscreen state.
- `src/components/DashboardRenderer.jsx`: header, page tabs, section rendering, edit toolbar, background editor, section add/remove behavior, and panel grid.
- `src/components/LayoutGrid.jsx`: edit-mode panel ordering and drag behavior.
- `src/components/ChartPanel.jsx`: panel renderer for ECharts, maps, gauges, image panels, tables, KPIs, delta cards, fullscreen, multi-fullscreen selection, CSV viewer, and panel action buttons.
- `src/components/ChartSettingsPanel.jsx`: current point-and-click panel editor.
- `src/components/ChartSettingsPanelV2.jsx`: newer tabbed editor implementation used by the settings panel.
- `src/lib/chartOptionRegistry.js`: registry-style definition of editor tabs, sections, and chart-specific options.
- `src/lib/buildEchartsOption.js`: ECharts option builder for chart rendering.
- `docs/municipality-choropleth.md`: notes for the RIVM municipal CSV, Cartomap WGS84 GeoJSON, and CSV-to-GeoJSON join.
- `src/lib/validateConfig.js`: lightweight validation for missing data sources, unsupported panel types, and field/series issues.
- `src/styles.css`: page styling, header styling, edit UI, panel grid, fullscreen overlays, map controls, and background editor styling.

### Dashboard shell and global editing

- Header text is editable, including the organization label, page title, page subtitle, scenario label/value, and updated label/value.
- The edit button now sits in the title banner area instead of resizing the header when edit mode opens.
- Edit mode opens a separate command banner below the title banner.
- Main page tabs can be renamed, added, and removed from edit mode.
- Sections can have editable title and subtext.
- Section title/subtext blocks can be removed without deleting the charts in that section.
- New section title/subtext blocks can be inserted through edit mode.
- The old page-level layout selector was removed; pages now use the two-column dashboard layout by default.
- The last edited chart highlight is cleared when leaving edit mode.

### Bundle import/export, uploaded CSVs, and persistence

- `Upload CSV` embeds a selected CSV file as a dashboard data source.
- Uploaded CSV sources appear in chart data-source dropdowns and are labeled with the uploaded filename.
- `Import bundle` loads either the newer dashboard bundle JSON format or an older plain dashboard config JSON file.
- `Export bundle` prompts for a filename and defaults to `SimEx-dashboard-bundle-YYYYMMDD.json`.
- `Export package default` saves the current browser-edited dashboard as `packaged-dashboard-bundle.json` for flash-drive packaging.
- Dashboard bundles contain the config plus uploaded CSV text under the `uploadedCsvSources` bundle field.
- File-backed CSV/GeoJSON sources under `public/data/**` remain referenced by path; uploaded CSVs are embedded for portability.
- Individual chart panels have an export menu in the top-right action cluster.
- Panel export supports PNG and JPEG choices at 96, 150, and 300 DPI-equivalent export scales.
- ECharts-backed panels use ECharts' native image export. Map and image panels use custom browser-side canvas export helpers.
- Edits are kept in browser state while using the app.
- Exported bundles are the portable way to preserve and share point-and-click edits plus uploaded CSVs.
- To promote browser edits into the GitHub-tracked dashboard, export a bundle as `packaged-dashboard-bundle.json` in the project root and run `pnpm.cmd promote:bundle`. This writes the edited config to `public/config/dashboard.json` and writes uploaded CSVs to `public/data/uploaded/`.
- Baseline rule for future updates: promote and commit browser edits before applying new app features or design changes. The promoted `public/config/dashboard.json` becomes the default dashboard that GitHub and Cloudflare build from.
- `pnpm.cmd package:flashdrive` automatically embeds `packaged-dashboard-bundle.json` when that file exists in the project root; otherwise it uses `public/config/dashboard.json`.
- `packaged-dashboard-bundle.json` is intentionally ignored by Git because it is a local packaging input.
- Uploaded image panels are embedded into config as browser data URLs, so bundles can become larger.
- App updates reconcile the latest default dashboard with browser-saved edits. Matching page, section, and panel IDs keep the user's edit-mode configuration; new default content is added; default file-backed data sources are refreshed from the updated app; uploaded CSV and custom data sources are preserved.
- Cloudflare Pages should use `pnpm run build:cloudflare:linux`, not `pnpm build`. The Cloudflare build writes a small portable-data stub so static CSV/GeoJSON files are served separately and no single generated asset exceeds Cloudflare Pages' file-size limit.

### Background editor

- The app uses local `public/vendor/three.min.js` and `public/vendor/vanta.net.min.js` for the Vanta.NET background.
- Background editing opens a focused background toolbar instead of leaving the full dashboard visible.
- Background options include static color, line color, dot color, point count, max distance, spacing, mouse tracking, and motion speed.
- Numeric inputs are clamped to safe ranges so invalid values such as too many points cannot crash the animation.
- Background changes are isolated so the Vanta effect does not reload every time a chart option is edited.
- The background editor has Apply, Save, and Reset controls.

### Panel and section layout

- Panels can be dragged to reorder in edit mode.
- Map panels reserve map-body dragging for panning the map; in edit mode, drag the card border/header area when the goal is to reorder the panel.
- New charts are inserted at the top of the target section.
- Edit mode includes a global panel color selector for default panel background, panel border, chart background, and chart border colors.
- Global panel colors also control the active edit highlight and multi-fullscreen selection highlight.
- Each panel inherits the global panel colors by default.
- A panel can opt out and keep custom panel/chart colors in its own settings.
- Panel size options are:
  - `half`: 0.5 x 1.
  - `normal`: 1 x 1.
  - `wide`: 2 x 1.
  - `tall`: 1 x 2.
  - `large`: 2 x 2.
- Chart area, panel background, borders, and related visual surfaces can be styled from edit mode.

### Supported panel types

- Line chart.
- Bar chart.
- Grouped bar chart.
- Stacked bar chart.
- Horizontal bar chart.
- Horizontal stacked bar chart.
- Area chart.
- Mixed bar/line chart.
- Gauge chart.
- Map chart.
- Choropleth map.
- Animated choropleth map with play/pause timeline.
- Table.
- KPI/stat card.
- Delta/comparison list.
- Image panel.

### Data controls

- Each panel chooses its own data source.
- Source CSV can be viewed in a scrollable in-app table window.
- Each chart can define source hover text for the information icon.
- Date-like datasets get independent per-chart date controls.
- Datasets with five or fewer unique dates use a date checklist.
- Datasets with more than five unique dates use from/to date fields and calendar-style selection.
- Categorical axes can be filtered with a checklist of categories.
- Categorical axes can be ordered by CSV order, alphabetically, or by values from a selected data column.
- Non-date categorical axis labels are forced to show all labels where practical; date axes keep the more compact date behavior.

### Chart editor organization

The chart editor is moving toward a schema-driven model. Common chart types use horizontal tabs and collapsible groups:

- `Data`: source file, CSV viewer, source hover text, x/category/date fields, date/category filters, ordering.
- `Series`: add/remove/duplicate series, label, value column, series type, colors, axis assignment, line/bar appearance.
- `Axes & Scale`: axis titles, label rotation/font size, min/max, zero/auto scaling, secondary y-axis settings, reference lines.
- `Style & Layout`: title, legend, palettes, panel size, chart area colors, fullscreen behavior, and source icon spacing.

### Series and chart styling

- Series can be added, duplicated, and removed where the panel type supports multiple series.
- Mixed bar/line charts keep line series rendered above bar series.
- Mixed chart editor identifies whether each series is a bar or a line.
- Line options include width, style, marker style, and shadow/area-under-line behavior.
- Bar options include bar width/height, gap, and grouping/stacking behavior.
- Legend options include show/hide, position, inside-corner positions, symbol size, and font size.
- Color palettes include PDPC-style palettes, manual series colors, reversible red-green Likert, reversible blue-yellow Likert, and a custom Likert palette based on the supplied green/yellow/orange/red example.
- Chart title and information icon spacing were increased so they do not sit on the inner chart border.

### Axes, reference lines, and scaling

- ECharts panels support title font size, axis label sizes, and legend font size adjustments.
- Fullscreen and large/tall panels scale fonts and line weights based on actual panel dimensions.
- Secondary y-axis options appear when at least one series is assigned to a secondary axis.
- Reference lines support value, label, axis choice, color, line style, and label placement.
- Dotted reference lines use a more visible dash pattern so dots do not collapse into a nearly solid line.

### Gauge behavior

- Gauge panels use the ECharts segmented speed gauge style with configurable range colors.
- Gauge unit text is optional and is concatenated directly to the value; add a leading space in the unit field if spacing is desired.
- Gauge label text can be left empty when the chart title already explains the metric.
- Gauge-specific settings include max value, stage colors, arc width, unit, red/critical zone configuration, and title/detail font sizing.

### Map behavior

- Map charts use an OpenStreetMap-style tile base with local overlay data.
- Maps support pan, wheel zoom, plus/minus zoom buttons, and a reset/recenter button.
- Choropleth maps use ECharts map rendering with local WGS84 GeoJSON.
- The current municipality choropleths use `public/data/biomedical/municipal_infections_2021_harmonized.csv` joined to `statcode` in `public/data/geo/gemeente_2021.geojson`.
- The harmonized CSV includes `infectionsPer1000` and `infectionsPer10000`; the default choropleth value is infections per 10,000 population.
- The harmonized CSV records `dataMethod` and `populationSource` so imputed values are auditable.
- Map title and panel controls remain visible above the map instead of being covered by the map body.
- The working homepage and wastewater maps are the reference behavior for new map panels.
- Boundary offset controls were removed from the map edit menu.

### Fullscreen behavior

- Each chart has a fullscreen button positioned left of the information/source button.
- Holding the fullscreen button activates multi-chart fullscreen selection.
- Multi-fullscreen supports selecting two to four charts.
- Two-chart layouts support side-by-side and over-under.
- Three-chart layouts support one large chart plus two smaller charts, with position controls.
- Four-chart layouts use a 2x2 grid.
- Multi-fullscreen includes controls to switch the relative positions of selected charts.
- Charts in multi-fullscreen scale to their shared cell size instead of using solo fullscreen scale for every chart.

### Image panels

- Image panels can be added as a chart type.
- Supported image uploads include common browser image formats such as PNG, JPEG, WebP, and GIF.
- Image display controls include fit/crop/stretch behavior, zoom, and x/y positioning.
- Alt text can be edited for the image.

### Known technical note: Vite large-bundle warning

`pnpm.cmd build` may show a warning similar to:

```text
Some chunks are larger than 500 kB after minification.
```

This is not a build failure. Vite is warning that one generated JavaScript file is larger than its default comfort threshold after compression/minification. This dashboard currently bundles React, ECharts, chart renderers, map behavior, edit controls, config handling, and fullscreen tools into one static browser app, so the warning is expected.

Why it matters:

- A larger bundle can take longer to download on slow networks.
- It can take longer for older devices to parse and start the app.
- For local simulation rooms or internal static hosting, this is usually acceptable unless startup feels slow.

Future optimization options:

- Lazy-load the edit panel only when edit mode opens.
- Lazy-load heavy map/chart modules only when needed.
- Use Vite/Rollup `manualChunks` to split vendor code from app code.
- Import only the ECharts modules that are actually used.
- Raise Vite's `chunkSizeWarningLimit` only after deciding the larger bundle is acceptable.

The current sprint treats the warning as acceptable because the build succeeds and feature completeness is the priority.

## Portable deployment guidance

The dashboard is a static Vite app. After a maintainer builds it, viewers do not need Docker, Python, Node, or `pnpm`.

Maintainer build command:

```powershell
pnpm.cmd build
```

Flash-drive package command:

```powershell
pnpm.cmd package:flashdrive
```

Deployable output:

```text
dist/
```

Flash-drive output:

```text
release/SimEx Dashboard V2 Flashdrive/
```

If the existing flash-drive output folder is locked, usually because the launcher window is still running from that folder, the package command writes a timestamped sibling folder under `release/` and prints the exact folder path to use.

Good deployment options:

- GitHub Pages.
- Netlify.
- Cloudflare Pages.
- SharePoint or institutional static file hosting.
- Any simple internal web server that can serve the `dist` folder.

The project now uses a relative Vite base path and generates `public/portable-dashboard-data.js` during `prebuild`. The built `dist` folder includes that script as `portable-dashboard-data.js`. When the app is opened from `file://`, the loader uses this embedded config/data instead of trying to fetch nearby JSON/CSV files.

Flash-drive behavior:

- Double-clicking `index.html` in the packaged folder should open the dashboard.
- If `index.html` opens blank, use `START_DASHBOARD.bat`; it starts a tiny PowerShell-based local server at `http://127.0.0.1:8765/`.
- The default config and prepared CSV/GeoJSON data are embedded in `portable-dashboard-data.js`.
- Uploaded CSVs and scenario edits should still be moved with `Export bundle` and `Import bundle`.
- To make browser edit-mode changes the default in a flash-drive package, click `Export package default`, save or move the resulting `packaged-dashboard-bundle.json` to the project root, then run `pnpm.cmd package:flashdrive`.
- Online map tiles still require internet access.
- If a locked-down browser blocks scripts from USB drives, try `START_DASHBOARD.bat`, copy the folder to the computer first, or use a static host.

Practical sharing model:

1. Host the built `dist` folder or copy the flash-drive package folder.
2. Use edit mode to upload CSVs and adjust charts.
3. Export a dashboard bundle JSON.
4. Email or copy the bundle JSON by flash drive.
5. Another user opens the dashboard app and imports the bundle.
