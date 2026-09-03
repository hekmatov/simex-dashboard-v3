# Owned Visual-Region Inventory

**Coverage authority:** `src/theme/dashboardRegionRegistry.js`
**Current accounting:** 45 distinct region variants × 3 styles = 135 region/style cells
**Rendered disposition:** pending; browser/E2E capture remains deferred

This inventory is independent of the 71-entry journey/state manifest. Journey entries establish reachability; these records establish visual ownership, role, material, lifecycle, and witness closure. The audit collector also discovers region candidates independently, so an omitted region can fail as `UNOWNED` even when it is absent from this table.

| Region | Owner | Role | Material | Lifecycle | Journey witnesses |
| --- | --- | --- | --- | --- | --- |
| `app-frame-shell` | `AppFrame` | `shell` | `flat` | persistent | landing, Home, View, Build, Present |
| `home-workspace-shell` | `CanonicalHomeWorkspace` | `shell` | `flat` | persistent | Home |
| `view-workspace-shell` | `DashboardModeWorkspace` | `shell` | `flat` | persistent | View compact, standard, dark, wide |
| `build-workspace-shell` | `BuildWorkspace` | `shell` | `flat` | persistent | Build compact and standard |
| `present-workspace-shell` | `PresentWorkspace` | `shell` | `flat` | persistent | Present pressure and standard |
| `audience-display-shell` | `AudienceDisplay` | `shell` | `flat` | portal | Audience 1280 and 1920 |
| `source-viewer-shell` | `SourceCsvViewer` | `shell` | `flat` | portal | Source Viewer |
| `application-recovery-shell` | `ApplicationRecovery` | `shell` | `flat` | conditional | application recovery |
| `desktop-mode-gate` | `AppShellModeGate` | `shell` | `flat` | conditional | Build/Present below-desktop gates |
| `global-command-crown` | `DashboardCommandCrown` | `command-bar` | `flat` | persistent | Home, View, Build, Present |
| `build-command-header` | `BuildCommandHeader` | `command-bar` | `flat` | persistent | Build compact/standard and page-action states |
| `build-page-navigation` | `BuildPageNavigation` | `command-bar` | `flat` | persistent | Build and page-action states |
| `view-playback-controls` | `ChronoController` | `command-bar` | `flat` | conditional | View Chrono controls |
| `present-action-dock` | `PresentWorkspace` | `command-bar` | `flat` | persistent | Present pressure and standard |
| `dashboard-header-panel` | `DashboardHeader` | `panel` | `flat` | persistent | View and Build |
| `chart-panel` | `ChartPanel` | `panel` | `flat` | persistent | View and Build |
| `build-side-sheet` | `BuildSideSheet` | `panel` | `flat` | conditional | selected Build unit |
| `unit-orbit-panel` | `UnitOrbit` | `panel` | `flat` | conditional | Build and scene unit orbits |
| `present-context-panel` | `PresentWorkspace` | `panel` | `flat` | persistent | Present pressure and standard |
| `present-scene-panel` | `PresentWorkspace` | `panel` | `flat` | persistent | Present pressure and standard |
| `scenario-passport-panel` | `ScenarioPassport` | `panel` | `flat` | conditional | Scenario Passport |
| `build-authoring-editor` | `BuildAuthoringAuxiliary` | `editor` | `flat` | conditional | Chrono and scene authoring |
| `chart-authoring-editor` | `ChartAuthoring` | `editor` | `flat` | conditional | chart wizard, full editor, quick editor |
| `source-content-editor` | `SourceContentWorkspace` | `editor` | `flat` | conditional | Source Content compact/standard |
| `static-content-editor` | `StaticContentComposer` | `editor` | `flat` | conditional | text/image and static-image editing |
| `dashboard-dialog` | `DashboardDialog` | `dialog` | `flat` | portal | shared first-party dialog journeys |
| `scene-observation-dialog` | `SceneObservationDialog` | `dialog` | `flat` | portal | scene observation |
| `dashboard-map-drawer` | `DashboardMap` | `drawer` | `flat` | portal | Dashboard Map structure/inspector |
| `look-drawer` | `DashboardLookDrawer` | `drawer` | `flat` | portal | Theme |
| `build-more-drawer` | `BuildMoreDrawer` | `drawer` | `flat` | portal | Build More |
| `build-page-action-menu` | `BuildPageNavigation` | `menu` | `flat` | conditional | Build page actions/command form |
| `listbox-menu` | `AccessibleListbox` | `menu` | `flat` | portal | chart-source listbox |
| `chart-export-menu` | `ChartExportMenu` | `menu` | `flat` | portal | View |
| `playback-menu` | `PlaybackMenu` | `menu` | `flat` | portal | Chrono controls |
| `colour-palette-menu` | `ColorFieldPopover` | `menu` | `flat` | portal | chart colour palette |
| `operation-status-notice` | `OperationStatusViewport` | `status` | `flat` | portal | operation notice |
| `chart-status` | `ChartDataState` | `status` | `flat` | conditional | chart recovery harness |
| `static-content-status` | `StaticContentState` | `status` | `flat` | conditional | text/image composer |
| `present-status-strip` | `PresentWorkspace` | `status` | `flat` | persistent | Present pressure and standard |
| `chart-state-recovery-status` | `ChartStateRecoveryHarness` | `status` | `flat` | persistent | chart recovery harness |
| `chart-table-register` | `TableChartView` | `table` | `ledger-register` | conditional | View and Build table chart |
| `source-viewer-table-register` | `SourceCsvViewer` | `table` | `ledger-register` | persistent | Source Viewer |
| `displayed-chart-cell` | `DisplayedChartGrid` | `chart-cell` | `flat` | conditional | fullscreen and Audience |
| `chart-view-frame` | `ChartView` | `chart-cell` | `flat` | persistent | View and Build |
| `fullscreen-chart-cell` | `FullscreenDisplay` | `chart-cell` | `flat` | portal | comparison and focused chart |

## Bounded non-surface cases

The following remain descendants of an owned region instead of receiving independent region records:

- visually hidden live-region nodes without a painted box;
- native tooltips and pseudo-element ornamentation;
- dialog backdrops;
- chart canvas/SVG marks and chart-owned gridlines;
- table rows and cells inside a registered table boundary;
- icons and transparent toolbar groups inside a registered command bar; and
- the unpainted operation-status portal host, whose painted notices are separately owned.

Any newly mounted named, paint-bearing, sticky/fixed, multi-action, overlay, status, table, or chart-cell boundary is subject to independent candidate discovery and must either join this registry or declare a bounded owner-specific exemption.
