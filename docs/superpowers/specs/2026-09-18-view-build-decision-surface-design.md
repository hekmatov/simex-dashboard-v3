# View and Build Decision Surface Design

Base revision: `c003d11` (`origin/main`). Governing decisions were approved in the preceding session; this document records them as an executable contract and adds no new product choices beyond the ones it names as implementation-level defaults.

## Product direction

View is where a moderator or audience reads a scenario at a glance and decides what to look at next. Build is where an author shapes that page. Today both modes bury the decision path:

- View has no place for the three or four numbers that frame every other chart on the page, and no single page-level time that all charts agree on.
- Build spreads structure, inspection, and commands across a drawer, a command row with an overflow drawer, and five buttons per section and four per panel. Authors lose their place every time the map opens.
- At phone width, the View crown takes three rows before any content, and authored chart footprints produce panels taller than the viewport.

This work adds a decision surface to View (an attention strip plus page time), settles Build into a persistent three-column workspace with one command row and one menu per section and per panel, and gives phone-width View a one-row crown.

Four decisions are already approved and are not reopened here:

1. The attention strip is authored as a Section role and rendered above the page body in View, with drill links to a source Section or chart.
2. Global filtering is page-level time context only, reusing the existing View Chrono pipeline. Categorical filters are deferred.
3. Build moves to a persistent left structure rail and a persistent right properties pane. The command row regroups into Insert, Libraries, and Session. Per-section and per-panel actions collapse into single menus.
4. Mobile View collapses the command crown to one row, folds identity and metadata into a disclosure, and caps chart height at phone width.

## Explicit exclusions

- No categorical, entity, or free-text filtering. Page time is the only global context.
- No new chart engine. Attention strip items are ordinary `kpi` and `deltaCard` charts rendered by the existing target renderer.
- No changes to Present, Audience, Home, the release outputs, or the Scenario Passport.
- No version bump of the dashboard configuration. The Section role and drill fields are optional additions to version 6 and absent fields keep today's meaning.
- No mobile Build or mobile Present. Below 1024px those modes keep the existing desktop-width notice.
- No new dashboard styles or colour profiles. Every new surface uses the existing tokens and the style grammar in `src/styles/dashboard-style-grammar.css`.

## Section role contract

### Configuration

`src/charting/config/dashboardConfigStructure.js` gains:

- `SECTION_ROLES = ["standard", "attention"]`, exported alongside `PAGE_TYPES`.
- `section: shape(["id", "panels"], ["description", "layout", "role", "title"])`. A missing `role` means `standard`.
- `panelWrapper: shape(["chart", "id"], ["drill"])`.

Validation rules added to `validateDashboardStructure`:

- `role`, when present, must be one of `SECTION_ROLES`.
- A page may hold at most one section with `role: "attention"`.
- Every panel in an attention section must be a chart whose `typeId` is in `ATTENTION_STRIP_CHART_TYPES = ["kpi", "deltaCard"]`.
- `drill` is allowed only on wrapped panels inside an attention section. Its shape is `{ kind: "section", sectionId }` or `{ kind: "chart", chartId }`. The target must exist on the same page and must not be the attention section itself or a chart inside it.

Every error names the page, section, and offending panel or target, following the existing message style.

A new module `src/charting/config/sectionRoles.js` owns the pure helpers so View, Build, and tests share one reading:

```js
export const ATTENTION_STRIP_CHART_TYPES = Object.freeze(["kpi", "deltaCard"]);
export function sectionRole(section) {}            // "standard" | "attention"
export function partitionPageSections(page) {}     // { attention: section | null, body: section[] }
export function attentionRoleIssues(page, section) {} // [] or named reasons a section cannot take the attention role
export function drillTargetsForPage(page, attentionSectionId) {} // selectable targets for the properties pane
export function resolveDrillTarget(page, drill) {} // { kind, id, title } or null
```

`normalizeDashboardBoundary` in `dashboardBundleV3.js` passes `role` and `drill` through unchanged. Package import and export carry them because they are ordinary section and wrapper fields.

### View rendering

`DashboardCanvas.jsx` calls `partitionPageSections(activePage)`. When the attention section exists and has at least one visible placement, the canvas renders `DashboardAttentionStrip` as the first child of `.page-stack`, above the Chrono section and every body section. Body sections render exactly as today.

`src/components/dashboard/DashboardAttentionStrip.jsx`:

- Root: `<section class="dashboard-section dashboard-attention-strip" data-section-role="attention" data-canonical-section-id={section.id} aria-label={section.title || "Page attention"}>`.
- Header: the section title as an `h2` and the description as a `p`, using the existing `.section-header` and `.section-title-block` structure so the title scale matches body sections. When the section has no title, the header is omitted.
- Items: an `.attention-strip-items` grid, `repeat(auto-fit, minmax(200px, 1fr))`, one `ChartPanel` per visible placement. Panels receive the same runtime props body sections pass (rows, source state, dataset profile, assets, display actions, multi-select props) and carry `data-attention-item`. Chart footprints are ignored inside the strip: every item is one grid cell of equal height.
- Drill: when a placement declares `drill`, the item renders a `.attention-drill` button under the card reading `Open {target title}`. Activation scrolls the target into view below the sticky crown, moves focus to it, and sets `data-drill-highlight="true"` on the target for 1.6 seconds. Targets are located by the canonical section id and canonical panel id attributes that `DashboardSection` and `ChartPanel` already render. Body sections gain `tabIndex={-1}` so they can receive focus.
- Chrono exclusion: items whose chart id is in `excludedIds` are hidden, matching body sections. When every item is hidden, the strip is not rendered.
- The strip renders in View, in the static build, and in Build. It never renders on landing pages.

### Build rendering and authoring

In Build the attention section renders in the same top position with the same strip layout, so the author sees what View shows. The Build section header applies unchanged (inline rename, section menu) and adds a `.section-role-tag` reading `Attention strip` after the title. The structure rail renders the same tag on the section node, using `data-build-node-role="attention"`.

Role changes are structure commands, so they travel through the layout draft with named consequences:

- `{ type: "set-section-role", pageId, sectionId, role }` in `buildLayoutDraft.js`. Setting `attention` is refused when `attentionRoleIssues` is non-empty; the refusal names the disallowed charts or the existing attention section. Setting `standard` clears every `drill` on the section's panels.
- `{ type: "set-panel-drill", pageId, sectionId, placementId, drill }` where `drill` is a target or `null`.

Moving a disallowed chart into an attention section is refused at every entry point that already checks legality: the tree's drop test in `BuildStructureRail.jsx`, `analyzeBuildLayoutMove`, and therefore the canvas drop delegates and the Move dialog. Chart creation and edit commits already run the structure contract through `validateDashboardSessionCandidate`, so a disallowed chart fails there and the message surfaces through the existing operation status; the chart-type catalogue is not filtered.

The properties pane (below) owns the role control and the drill control.

## Page time context

### Behaviour

Every page whose charts carry temporal data can be read as of one time. The existing playback pipeline already does this when playback view is open with the default source: `buildDefaultPagePlayback` builds a clock across all page charts and `timeContextForChart` feeds each chart. The gap is that a whole-page source cannot be chosen deliberately, and nothing in the crown says what time the page is showing.

Additions:

1. **Whole page as an explicit source.** `playbackReducer.js` records `sourcePreference: "auto" | "page"`. `setGroup` with `groupId: null` sets `sourcePreference: "page"` and leaves `activeGroupId` null; choosing a group or scene resets it to `auto`. `PlaybackProvider` skips its first-group auto-selection while the preference is `page`. `modeExit` resets the preference.
2. **Source selectors list the page.** `ChronoController` and `PlaybackPageActions` add a first option `Whole page` that dispatches `setGroup` with `groupId: null`. `PlaybackPageActions` keeps its current behaviour of rendering nothing when the dashboard has no Chrono Groups; on such dashboards the page time control below is the only entry point.
3. **Page time readout in the View context strip.** A new `src/components/playback/PageTimeContext.jsx` renders inside the crown's mode context strip in View only. It shows `Page time` followed by the resolved value: `Latest available` when playback view is closed, otherwise the canonical time label of `activeEpochMs` plus the source name (`Whole page`, a group name, or a scene name). One button follows: `Set page time` opens playback view with owner `page-time`, source `Whole page`, scope `all-page`; while open it reads `Exit page time` and closes the view for that owner. Scrubbing stays in `ChronoController`; this control does not duplicate the transport.
4. **Eligibility.** `App.jsx` computes `viewPageTimeEligible`, true when at least one active-page chart is a temporal authoring chart per `temporalAuthoringCharts` (moved to `src/components/time/temporalAuthoringCharts.js`). It passes `contextNode` for View only when eligible, so pages without temporal charts keep today's empty context strip and the existing crown tests hold.

The attention strip needs nothing extra: its cards already render `item.time` and provenance from the same time context.

### Non-goals restated

No date picker, no categorical filters, no per-chart override. The transport, matching policy, trace mode, and scope controls stay where they are.

## Build workspace

### Frame layout

`CanonicalDashboardFrame` becomes the layout owner in Build. At `min-width: 1024px` in Build the frame is a grid:

```
| header      header      header     |
| commands    commands    commands   |
| structure   canvas      properties |
| footer      footer      footer     |
```

- Columns: `minmax(220px, 260px) minmax(0, 1fr) minmax(280px, 320px)` at 1200px and above; `220px minmax(0, 1fr) 280px` between 1024px and 1199px.
- The rails are `position: sticky; top: var(--right-side-drawer-top)` and scroll independently with `max-height: calc(100dvh - top)`.
- The canvas column keeps `--simex-canonical-canvas-max-width` as its maximum and centres inside its column.
- Below 1024px the grid stacks: structure disclosure, commands, canvas, properties disclosure. Each rail becomes a `<details>` block with a summary reading `Structure` or `Properties`. The properties disclosure opens automatically when a selection changes. Nothing overlays the canvas.

To make the command header, rails, and canvas siblings in one grid, `.canonical-dashboard-workspace-controls` and `.build-workspace-authoring-root` use `display: contents` in Build, the pattern the crown already uses for its sticky location row. `BuildWorkspace` renders the command header, the structure rail, and the properties pane as direct children of its root; the frame renders the canvas as `.canonical-dashboard-content`. Because the authoring root loses its box, the `build-workspace-shell` region moves its selector to `.canonical-dashboard-frame.build-workspace`; the root keeps its data attributes for tests and drivers.

### Structure rail

`BuildStructureRail` is rendered persistently in the structure column with a heading `Structure`. The tree, keyboard model, drag and drop, inline rename, and `key={treeResetGeneration}` behaviour are unchanged. Removed: the `inspector` prop and the inline inspector row; the Dashboard map drawer; `buildPanelOpen`, `onCloseDashboardMap`, the crown `Dashboard map` toggle in `App.jsx`, the `data-dashboard-map-open` canvas-compression rules, and the `dashboard-map-*` CSS. The rail reveals the selected node on selection change using the existing reveal request path.

### Properties pane

`src/components/build/BuildPropertiesPane.jsx` replaces `BuildInspector.jsx` and is rendered persistently in the properties column with a heading `Properties`. Content by selection:

- **Nothing selected:** the dashboard title, the page count, and one sentence pointing to Structure and the canvas for selection and to the Scenario Passport for identity and package controls. Dashboard text stays editable in the Build header as today.
- **Page:** page title, description, and `Delete page…` with the final-page protection, as today.
- **Section:** title, description, and a `Role` choice with two options: `Standard section` and `Attention strip`. Choosing `Attention strip` when `attentionRoleIssues` is non-empty keeps the control on `Standard section` and shows the named reasons inline. When the role is `Attention strip`, a `Drill links` list follows with one row per panel: the chart title and a select whose options are `No link`, every body section on the page, and every chart in those sections. Changes dispatch the two structure commands above.
- **Chart:** chart title, type label, and owning section, with `Edit chart` (opens or resumes the Unit Orbit through the existing resume path), `Move…`, and `Remove…`.
- **Chrono Group:** the existing summary.

Field edits keep their current draft paths (`onDashboardChange`, `onPageChange`, `onSectionChange`); only the role and drill controls go through structure commands.

### Command row

`BuildCommandHeader` renders three labelled groups in one row, each `role="group"` with `aria-label` and a visible small label in sentence case:

| Group | Commands (`data-build-command-action`) |
| --- | --- |
| Insert | `add-chart`, `add-text-image` |
| Libraries | `source-content`, `chrono-studio`, `scene-studio` |
| Session | `discard-build-changes`, `finish-build` |

`data-build-command-group="insert" | "libraries" | "session"` on each group. Whole groups wrap as units at narrower widths; buttons inside a group never wrap independently. `Finish Build` stays the only primary button. The `More` command and `BuildMoreDrawer.jsx` are removed, along with the `build-more-drawer` region and `build-more-menu` witness. The unused accessibility props on the drawer are dropped. The pending-work rail is unchanged.

### Section and panel menus

`src/components/common/ActionMenu.jsx` is a shared anchored menu: a trigger button with `aria-haspopup="menu"` and `aria-expanded`, a `role="menu"` popover positioned like `.build-page-action-menu`, `role="menuitem"` buttons, ArrowUp and ArrowDown movement, Home and End, Escape and outside pointer to close, and focus return to the trigger. Destructive items carry `class="danger"` and are last. Items may be disabled with a reason shown through the existing `ControlTooltip`.

`BuildSectionHeader` replaces its five buttons with one `ActionMenu` trigger labelled `Section actions` for `{title}`, wrapped in `.build-section-actions` so existing layout hooks hold. Items in order: `Rename`, `Move earlier`, `Move later`, `Move to Page…`, `Merge…`, `Remove…`. The three dialog items open `SectionStructureCommandDialog` exactly as today. Disabled conditions are unchanged.

`ChartPanel` replaces the four icon controls in `.panel-actions` with one trigger. The trigger keeps `panel-move-handle`, stays `draggable`, and keeps the drag handlers, so a press opens the menu and a drag moves the panel. Items in order: `Edit chart` (keeps `data-build-edit-for={placementId}`), `Move…`, `Start section here`, `Remove chart`. The icon catalogue gains `panel.actions` for the trigger, and the generated icon reference is rebuilt with `pnpm.cmd icons:build`.

Region registry additions: `build-structure-rail` and `build-properties-pane` (panel, persistent, parent `build-workspace-shell`), `section-action-menu` and `panel-action-menu` (menu, conditional, parent `build-workspace-shell`), and `dashboard-attention-strip` (panel, conditional, parent `app-frame-shell`). Removed: `dashboard-map-drawer`, `build-more-drawer`, `build-side-sheet`. Journey witnesses `dashboard-map-structure`, `dashboard-map-inspector`, and `build-more-menu` are replaced by `build-structure-rail`, `build-properties-pane`, `build-section-menu`, `build-panel-menu`, and `view-attention-strip`, each an executable desktop journey at the standard viewport.

## Mobile View

Applies to View only, at `max-width: 767px`, matching the existing phone breakpoint for the View header. Home, Build, and Present are unchanged.

### One-row crown

`DashboardCommandCrown` reads a `compact` flag from a `useMediaQuery("(max-width: 767px)")` hook (`matchMedia`, `false` during server rendering so existing markup tests hold). When compact and `mode === "view"`, the crown renders one 36px row:

```
| SimEx | View  Build  Present | ▾ Biomedical |
```

- The mode switcher keeps its buttons and pressed state.
- The right control is the disclosure trigger, labelled with the active page label, `aria-expanded`, and `aria-controls="crown-disclosure"`.
- The disclosure panel renders below the row inside the crown: dashboard title and scenario label, the page list as full-width buttons with `aria-current`, the pinned page actions (Theme, page time or Chrono view, Compare charts), and the metadata pairs the header shows on desktop (Scenario, Updated). Choosing a page closes the disclosure. Escape closes it and returns focus to the trigger.
- The mode context strip, when present, renders below the row unchanged. The exercise disclaimer keeps its sticky slot.

`DashboardHeader` on the compact crown renders only the page `h1` and the description; the brand mark and metadata list move into the disclosure. The `data-command-crown-layer` attributes stay so the crown contract tests keep three layers on desktop and can assert one location layer on phone.

### Chart height cap

At the same breakpoint in View, every `.chart-panel-footprint` uses `height: clamp(240px, 52vh, 420px)` regardless of authored footprint, panels stack in one column, and the attention strip becomes a horizontal scroll-snap row with cards at `minmax(72vw, 1fr)`. Card charts (`kpi`, `deltaCard`) keep `height: auto`. ECharts hosts follow the container height through the existing resize observer.

## Visual direction

The existing style grammar stays. The one memorable element is the attention strip; everything else stays quiet and structural.

- **Attention strip.** Cards sit on `--simex-surface-panel-alt` with a 1px `--simex-border-subtle` rule and no shadow, so they read as a register above the page rather than more chart panels. Values use the heading face with tabular numerals, exactly as `.kpi-card strong` already does. The drill button is a plain text control with an underline on hover and focus, never a pill.
- **Rails.** Structure and properties columns share the panel surface and subtle border of the existing side sheet, separated from the canvas by a single rule, with 12px inset padding and 8px row rhythm from the tokens. Headings use the section heading scale at 16px.
- **Command groups.** Group labels are 12px muted text in sentence case, sitting left of the group's buttons, with 16px between groups and 8px inside them, honouring the accepted rhythm from the 23 August contract.
- **Menus.** Menu items are full-width, left-aligned, 28px compact controls with the utility gap, matching `.build-page-action-menu`.
- **Mobile crown.** The disclosure panel uses the panel surface with a bottom rule; it opens with no animation beyond a reduced-motion-safe 120ms opacity.

No new colours, radii, or shadows are introduced.

## Testing and verification

Per AGENTS.md, implementation runs only targeted checks; the full gates run once at pre-merge.

Unit contracts (node test runner, SSR markup where a component is involved):

- `sectionRoles` helpers and the new structure validation rules, including every named error.
- `set-section-role` and `set-panel-drill` in the layout draft, including refusal reasons.
- `DashboardAttentionStrip` ordering, hidden-when-empty, and drill target resolution.
- Reducer `sourcePreference` and provider `pageTimeEligible`.
- `BuildCommandHeader` group order and the retired `more` action.
- `ActionMenu` roles and item order for section and panel menus.
- Crown compact markup with `matchMedia` stubbed, and unchanged desktop layers.
- Region registry and journey manifest consistency after the additions and removals.

Browser checks (`pnpm.cmd test:e2e:dev`, smallest representative journey):

- Attention strip renders above body sections and a drill link scrolls to and highlights its target.
- Page time: `Set page time` opens playback with the whole page as source and the readout updates on scrub.
- Build: rails persist, a section role change appears in both canvases, and section and panel menus perform one command each.
- Mobile View at 390×844: one crown row, disclosure navigation, and no panel taller than 420px.

Browser driver: `tests/e2e/support/buildWorkflow.js` retires `openDashboardMap` and `closeDashboardMap` and adds `structureRail(page)`, `propertiesPane(page)`, `sectionMenu(page, title)`, and `panelMenu(page, placementId)`. Every proven consumer of the retired helpers, of `data-build-command-action="more"`, of `.build-section-actions` buttons, and of the four panel icon controls is updated in the same slice.

## Boundaries and sequencing

Three lanes can proceed in parallel with limited file overlap:

- **Lane A, Build chrome:** command regrouping, `ActionMenu`, section and panel menus, icon catalogue.
- **Lane B, structure and rails:** Section role contract, attention strip, frame grid, structure rail, properties pane, page time context.
- **Lane C, mobile View:** compact crown, header fold, chart height cap, phone journey.

Shared files (`modes.css`, `DashboardSection.jsx`, region registry, journey manifest) are touched in named, non-overlapping blocks. The properties pane's role and drill controls land after both the contract and the pane exist.
