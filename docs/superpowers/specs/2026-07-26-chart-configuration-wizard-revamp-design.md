# SimEx Dashboard Chart Configuration and Wizard Revamp

**Date:** 2026-07-26  
**Status:** Approved design  
**Target branch:** `codex/chart-wizard-revamp`  
**Base:** `codex/showcase-home` at `8abca5e`

## Purpose

Replace the current chart-configuration architecture with an extensible, schema-generated system that makes chart creation and editing understandable to non-technical dashboard authors. The system must support the analytical and communication needs revealed by the previous simulation exercises without treating the current dashboard configuration as a compatibility standard.

The revamp also introduces synchronized temporal playback, reusable collection presentation, actual pie/donut support, four additional operational chart families, and a fully defined delta-chart family.

## Product Principles

1. Authors first decide what they want to communicate, then select data, assign analytical meaning, and only then customize appearance.
2. The interface exposes only controls that are meaningful for the selected chart type.
3. A chart schema is the single source of truth for creation, editing, validation, rendering, conversion, and Quorum semantics.
4. Generated forms use curated, plain-language controls. Authors never interact with raw schemas or generic property grids.
5. Defaults are safe and useful, while specialist options remain available through progressive disclosure.
6. The live binding check, preview, and final renderer consume the same prepared data.
7. Time is a first-class analytical dimension shared across eligible charts.
8. Collection layout is independent of the visualization displayed inside each repeated item.
9. The previous dashboard is evidence about exercise needs and available datasets, not a panel-by-panel migration target.
10. Accessibility, provenance, and honest treatment of missing or estimated data are part of the configuration contract.

## Existing-System Findings

The current implementation distributes chart rules across the creation wizard, data-binding editor, chart settings panel, panel renderer, and ECharts option builder. This causes duplicated conditions, irrelevant editor tabs, premature style controls, and inconsistent interpretation of the same configuration.

Important findings from the review:

- The creation wizard currently has three steps and presents styling controls before a useful preview exists.
- Data roles and series styling are mixed in the same editor.
- The existing option registry contains partial type-based visibility rules but is not the shared source for the wizard, validation, and renderer.
- The title-alignment setting is saved but the renderer hard-codes left alignment.
- Zoom behavior is implemented independently for ECharts geography and the custom tile map.
- Dashboard bundles are migrated toward a version-2 binding model, while uploaded sources and configuration state are reconciled separately.
- Quorum uses a fail-closed semantic digest and a pinned chart catalogue. Existing cross-repository catalogue drift predates this branch.
- The test suite covers core data preparation and Quorum flows but lacks direct coverage for wizard behavior, schema-driven settings, rendering adapters, title alignment, zoom modifiers, and complete bundle round trips.

### Attached empty-chart diagnosis

The attached bundle contains a bar chart titled `dysnfunctional chart`. Its binding check reports one renderable row, one X value, and one series, but the chart remains empty.

The source uses the date value `02/05/2027`. The current profiler relies on browser date parsing and classifies the field as temporal. The ECharts time axis does not reliably parse this ambiguous day/month/year string, so the series produces no visible bar. Forcing the binding to category mode does not resolve the issue because a later field-name heuristic changes a field named `date` back to a time axis.

Version 3 therefore requires:

- explicit, deterministic date parsing;
- a canonical temporal representation;
- user overrides that take precedence over heuristics;
- identical prepared data for validation and rendering; and
- a readiness result based on actual renderable marks.

## Architectural Direction

The system will use three layers:

1. **Chart schemas** define chart capabilities and authoring behavior.
2. **Shared form engines** generate the creation wizard and editing interface.
3. **Rendering adapters** translate validated chart instances into ECharts, map, table, card, image, or other specialized output.

The architecture is schema-generated but not limited to generic controls. A schema can reference curated field components or provide a specialized extension for cases such as geographic configuration, timeline event authoring, or a threshold-range editor.

### Chart type schema

Each chart type schema defines:

- stable type identifier and schema version;
- user-facing name, purpose, category, examples, and guidance;
- permitted source kinds;
- required and optional analytical roles;
- accepted column types and role cardinality;
- role dependencies and conditional visibility;
- defaults, suggestions, and validation messages;
- supported filters, grouping, aggregation, and missing-value behavior;
- duplicate-observation detection and resolution;
- form sections and curated control types;
- applicable presentation, label, layout, and interaction options;
- collection-display capability, when applicable;
- temporal-playback capability, when applicable;
- compatible chart conversions and role mappings;
- rendering-adapter identifier;
- accessibility requirements; and
- normalized semantic metadata for Quorum.

Schema validation will fail during development if a chart type references an unknown role, control, adapter, semantic capability, or conversion target.

### Chart instance

A version-3 chart instance separates:

- **Identity:** instance ID, chart type, title, and descriptive metadata.
- **Source:** dataset reference or supported inline table.
- **Roles:** assignments giving analytical meaning to source columns.
- **Transformations:** filters, grouping, aggregation, duplicate handling, missing-value rules, and temporal matching.
- **Presentation:** chart-specific appearance, labels, background, layout, and accessibility.
- **Interaction:** zoom, collection behavior, and synchronized-time membership.
- **Dashboard layout:** panel placement and dimensions.

Presentation settings cannot change the analytical meaning of a role. Transformations cannot contain renderer-specific appearance values.

### Dataset profile

A dataset profile stores:

- source identity and provenance;
- raw column names;
- detected and confirmed column interpretations;
- representative examples;
- missing and unique-value counts;
- parsing rules;
- temporal format, timezone, and granularity where relevant;
- geographic identifier hints;
- warnings and author-confirmed overrides; and
- a deterministic fingerprint.

The profile is reused by creation, editing, preview, final rendering, synchronized playback, and Quorum catalogue generation.

## Supported Chart Catalogue

The chart selector groups charts by communication purpose rather than presenting one technical list.

### Comparison

- Bar
- Grouped bar
- Stacked bar
- Horizontal bar
- Horizontal stacked bar

### Trends

- Line
- Area
- Mixed axis

### Composition

- Pie
- Donut

Pie and donut share a role contract. Presentation determines the inner radius and related label behavior.

### Targets and status

- KPI card
- Gauge
- Bullet/target
- Delta card
- Delta list

### Relationships

- Scatter
- Bubble

### Readiness

- Heatmap
- Readiness matrix

### Timeline

- Timeline
- Swimlane

### Geography

- Choropleth
- Chronological choropleth
- Map scatter

### Operational content

- Table
- Image
- Other existing non-chart panels that remain analytically useful

The current datasets will be re-profiled to determine which chart families are appropriate for the rebuilt default dashboard. A type need not appear in the default dashboard merely to demonstrate that it exists.

## Chart Creation Wizard

The wizard contains four always-visible, clickable steps. Authors may navigate directly to any step. When prerequisites are incomplete, the destination remains available and shows a concise checklist. Final creation remains unavailable until the complete instance is valid.

### Step 1: Chart type

- Searchable chart cards grouped by purpose.
- Plain-language descriptions of the question each chart answers.
- Small examples and a summary of required data.
- Guidance that distinguishes superficially similar types, such as bullet versus delta.

Selecting the chart type determines all subsequent roles, controls, and rendering behavior.

### Step 2: Data source

Depending on the selected schema:

- choose an existing dashboard dataset;
- upload a CSV; or
- enter a small table manually.

Manual entry is offered only for concise charts:

- pie/donut;
- KPI;
- gauge; and
- bullet/target; and
- single Delta card.

Multi-entity Delta lists require a dataset source.

CSV sources show detected types, examples, missing values, unique counts, and relevant quality warnings. Changing a source warns before incompatible role assignments are cleared.

### Step 3: Data roles

Roles are generated from the selected chart schema.

For axis charts:

1. select one or more measurements;
2. assign primary or secondary Y-axis per measurement;
3. select the observation/X field;
4. review the detected X interpretation and override it only where that has a practical effect;
5. optionally select cluster, grouping, labels, and filters; and
6. resolve duplicate observations only if duplicates exist for the active combination.

Other chart families receive chart-specific roles:

| Chart family | Core roles |
|---|---|
| Pie/donut | Category, value |
| Scatter/bubble | X measure, Y measure, optional size, label, cluster |
| Heatmap/readiness | Row category, column category, intensity/value |
| Timeline/swimlane | Event, start, optional end, lane, status |
| Bullet/target | Actual, target, optional label and performance ranges |
| Delta | Measurement, optional entity, time, comparison rule, optional target |
| Choropleth | Geographic identifier, value, optional time |
| KPI/gauge | Value, optional target, comparison, and time |

The live binding check uses final prepared render data. “Ready to plot” requires at least one valid chart mark, geographic region, matrix cell, event, row, or displayed value.

### Step 4: Style and layout

This step becomes useful only after the analytical roles are valid. It shows the actual chart preview and applicable controls.

Examples:

- series colors and widths for series charts;
- pie labels and donut size for composition charts;
- ranges and thresholds for gauges and bullets;
- cell scales and labels for heatmaps;
- lanes and event markers for timelines;
- map scale and geographic behavior for choropleths;
- collection layout for repeated cards; and
- titles, legends, sizing, background, and accessibility options where applicable.

Essential settings appear first. Specialist controls are collapsed under Advanced.

### Wizard dismissal

Pressing Close always opens a `Discard chart?` confirmation with:

- **Discard**
- **Continue editing**

## Editing and Customization

Creation and editing use the same schemas, controls, validation, and prepared-data pipeline.

The editor assembles only applicable sections:

- Data
- Appearance
- Labels
- Axes
- Targets
- Map
- Timeline
- Collection
- Interactions
- Advanced

The preview updates during the editing session, but the saved dashboard instance changes only when Save is pressed.

Save and Reset changes share a persistent action area. Reset changes requires a `Discard these edits?` confirmation and restores the most recently saved chart state.

### Chart conversion

Chart-type conversion remains available.

- Compatible conversions preserve valid roles and presentation values.
- Incompatible conversions open guided role remapping.
- Unsupported settings are listed before removal.
- Canceling conversion leaves the chart unchanged.

### Cross-cutting interaction fixes

- Title alignment has one normalized setting honored by ECharts titles and custom panel titles.
- Background colors use the same color control, palette, and transparency behavior as chart customization.
- Wheel zoom operates only while Ctrl is held.
- Ordinary wheel input continues scrolling the page.
- A rate-limited hint says `Hold Ctrl while scrolling to zoom` over zoomable charts.
- Reset-zoom controls appear where supported.
- Motion respects the user’s reduced-motion preference.

## Data Preparation

All chart families use a shared sequence:

1. load CSV or inline source;
2. profile and parse typed values;
3. bind analytical roles;
4. apply filters and grouping;
5. aggregate and resolve duplicates;
6. normalize and align time;
7. validate renderer-ready output; and
8. pass normalized output to the rendering adapter.

User-confirmed parsing and role interpretations always override automated suggestions. Field names may inform a suggestion but cannot override an explicit selection.

The pipeline returns structured diagnostics tied to the responsible field or transformation. A renderer adapter cannot reinterpret raw source values independently.

## Synchronized Time Playback

Time is a dashboard-level analytical capability.

A chart is eligible when:

- its schema declares temporal playback support; and
- its binding contains a valid temporal role.

### Canonical time

Temporal preparation produces an unambiguous canonical value and retains:

- original source value;
- parsing format;
- date-only versus date-time semantics;
- timezone;
- measurement granularity; and
- parsing diagnostics.

Browser-dependent date guessing is prohibited.

### Synchronization groups

Each group defines:

- stable ID and name;
- designated primary clock;
- controlling source and time field;
- available playback timestamps;
- playback range, speed, and step behavior;
- default temporal matching policy; and
- member charts with optional matching overrides.

Using a primary clock prevents unrelated timestamps from silently changing the playback sequence.

### Matching policies

- **Exact:** safe default; absent observation shows `No measurement at this time`.
- **Last known value:** for state or capacity values that remain valid until updated.
- **Nearest within tolerance:** for irregular measurements, with an explicit maximum gap.
- **Interpolation:** only for continuous numeric measures where estimation is analytically valid.

Schemas prevent interpolation for categorical state, discrete events, and unsuitable counts. Carried, nearest-matched, or interpolated values are visibly identified and explained in tooltips.

### Playback view

The dedicated Playback view provides:

- play and pause;
- previous and next timestamp;
- scrubber based on the primary clock;
- current date/time;
- playback speed;
- participating-chart list;
- data-availability status; and
- return to normal dashboard view.

Renderer behavior is schema-defined:

- choropleths select geographic frames;
- line and area charts move a marker or crosshair;
- bars transition to or highlight the active snapshot;
- KPI, gauge, bullet, and delta displays update;
- timelines highlight active events and milestones;
- heatmaps highlight or filter the relevant time cell;
- tables select or filter matching rows; and
- ineligible charts remain static.

## Delta Chart Family

Delta charts emphasize change between observations. Bullet charts emphasize performance against a target. A delta chart can show an optional target as additional context, but its comparison baseline is distinct from that target.

### Roles

- measurement;
- time for temporal comparison;
- optional category/entity;
- optional target; and
- optional filters.

### Comparison rules

- immediately preceding available observation;
- selected fixed time;
- previous period;
- exact temporal match;
- last known match; or
- nearest within tolerance.

The result may display absolute change, percentage change, or both. Authors define whether higher values are favorable, lower values are favorable, or direction is neutral. Meaning is communicated through text and symbols in addition to color.

### Layouts

- single Delta KPI card;
- multi-entity Delta list.

Multi-entity presentation uses the Collection Display Framework.

## Collection Display Framework

Collection Display is a reusable dashboard capability for repeated entities. The visualization defines the contents of an item; the framework defines how the collection is arranged, navigated, and prioritized.

Initial consumers:

- Delta lists
- KPI grids
- Bullet collections
- Gauge collections
- Future small multiples
- Future operational widgets

### Composable model

The model separates:

1. **Layout:** fixed grid, scrollable grid, or carousel.
2. **Ranking:** fixed order, ordinary sorting, or operational priority.
3. **Overflow:** manual pages, scrolling, automatic rotation, or intentional visible limit.

The interface may expose Priority Mode as a recommended preset while retaining the composable internal model.

### Fixed grid

- Default layout.
- Configurable rows and columns, including `1 × 3`, `2 × 4`, `3 × 3`, and `4 × 4`.
- Stable panel dimensions.
- Live configuration preview.
- Manual paging as the safe default when entities exceed capacity.

Responsive behavior preserves a minimum readable item size and adapts the effective column count where required for accessibility.

### Scrollable grid

- Fixed panel dimensions.
- Vertical access to all entities.
- Suitable for actively operated dashboards.

### Auto carousel

- Configurable rotation interval.
- Optional looping.
- Pause on hover and keyboard focus.
- Manual next and previous controls.
- Optional fade or slide transition.
- Reduced-motion support.

### Priority ranking

Supported ranking inputs include:

- highest or lowest current value;
- largest absolute or percentage change;
- furthest from target;
- calculated risk score;
- safe custom expression; and
- future Quorum-generated recommendations.

Custom expressions use a constrained expression model, not arbitrary executable code.

The engine uses stable entity identifiers, deterministic tie-breaking, and optional stabilization to avoid distracting reorder jitter.

### Shared settings

- rows;
- columns;
- item spacing;
- sort field;
- sort direction;
- display layout;
- ranking mode;
- overflow behavior;
- paging or carousel behavior;
- animation settings; and
- accessible item labels.

### Playback integration

- Displayed values use the chart’s temporal matching policy.
- Priority ranking can recalculate at each playback timestamp.
- Authors may lock positions during playback.
- Carousel rotation can continue or pause during playback.
- Fixed grid dimensions remain stable while values and permitted rankings change.

## Default Dashboard Rebuild

The current dashboard will not be migrated panel by panel.

The rebuild will:

1. inventory and re-profile current datasets;
2. identify the indicators and exercise questions each dataset supports;
3. preserve useful analytical and operational coverage;
4. select the clearest chart family for each question;
5. create synchronized playback groups where shared time is meaningful;
6. apply Collection Display to repeated operational entities;
7. retain provenance and explain derived values; and
8. validate the result with representative facilitator workflows.

The old panel count, order, wording, and individual settings are not requirements.

## Saved Dashboard and Bundle Policy

Version 3 is a deliberate clean break.

- Version-2 configurations are not imported or migrated.
- Unsupported bundles receive a clear version message.
- Version-3 save, reload, export, and import are round-trip safe.
- Uploaded and manual data included in a bundle preserve source provenance and parsing metadata.
- The attached version-2 bundle is retained only as diagnostic evidence and a focused regression fixture.

## Quorum Semantic Contract

Quorum will be updated in a separate isolated local worktree and branch.

The versioned semantic catalogue is generated from normalized chart schemas and includes:

- chart type and schema version;
- role contracts;
- transformation capabilities;
- rendering capability identifiers;
- temporal roles and playback behavior;
- synchronization-group semantics;
- matching and interpolation policies;
- collection-display capabilities;
- priority-ranking semantics; and
- accessibility-relevant semantic labels.

The catalogue and dashboard configuration produce deterministic semantic digests. Quorum continues to fail closed when contract versions or semantics disagree.

No Quorum merge, push, deployment, or Cloudflare branch update is part of implementation without separate user approval.

## Error Handling

- Schema-definition errors fail development and CI validation.
- Authoring errors appear beside the responsible field in plain language.
- Invalid source changes do not silently discard prior mappings.
- Missing temporal matches are explicit.
- Failed rendering adapters show a bounded chart-level error rather than destabilizing the dashboard.
- Playback isolates a misbehaving member chart and reports its status.
- Collection ranking errors fall back to deterministic configured order with an explanation.

## Accessibility

- Controls have programmatic labels and keyboard operation.
- Chart guidance does not rely only on hover.
- Delta direction and threshold state do not rely only on color.
- Carousel motion can be paused and respects reduced-motion preferences.
- Synchronized playback is fully operable without dragging a scrubber.
- Focus remains stable when collection rankings change.
- Generated color controls support transparent values and accessible contrast guidance.

## Verification Strategy

### Schema tests

- every schema is structurally valid;
- all referenced controls and adapters exist;
- conditional dependencies resolve;
- conversions target valid types;
- temporal and collection capabilities are internally consistent; and
- normalized semantic output is deterministic.

### Data-pipeline tests

- profiling and explicit parsing;
- ambiguous date handling;
- user override precedence;
- multiple measures and secondary axes;
- duplicate detection and aggregation;
- filtering and missing values;
- renderer-ready validation;
- temporal matching and interpolation restrictions; and
- delta comparison calculations.

### Rendering-adapter tests

- at least one valid rendered result per chart type;
- empty and invalid states;
- title alignment;
- backgrounds and shared color values;
- time-cursor updates;
- collection item rendering; and
- conversion output.

### Interaction and component tests

- four-step clickable wizard navigation;
- chart-specific generated roles;
- concise-chart manual entry;
- conditional duplicate controls;
- contextual editor tabs;
- discard and reset confirmations;
- Ctrl-wheel zoom and hint;
- playback controls;
- collection layouts and navigation;
- priority re-ranking and position locking; and
- reduced-motion behavior.

### End-to-end tests

- create, preview, save, edit, reset, convert, and delete representative charts;
- upload and profile a CSV;
- build a time-synchronized dashboard view;
- configure fixed, scrolling, carousel, and priority collections;
- export and re-import a version-3 bundle;
- reject a version-2 bundle clearly;
- load the curated default dashboard; and
- validate Quorum catalogue agreement.

## Delivery Boundaries

Included:

- schema-generated chart system;
- shared wizard and editor;
- version-3 configuration and bundle format;
- supported existing chart families;
- pie/donut;
- timeline/swimlane;
- heatmap/readiness matrix;
- scatter/bubble;
- bullet/target;
- delta card and list;
- synchronized time playback;
- Collection Display Framework;
- curated default-dashboard rebuild;
- Quorum semantic-contract update in an isolated branch; and
- relevant automated tests and documentation.

Not included without additional approval:

- legacy configuration migration;
- merging branches;
- pushing branches;
- deploying the dashboard or Quorum;
- updating the Cloudflare-published branch; or
- production AI-generated priority recommendations.

The schema will include an extension point for future Quorum priority recommendations, but current implementation will not invent or execute such recommendations.

## Success Criteria

1. Authors can build each supported chart through the four-stage workflow without seeing irrelevant controls.
2. Editing uses the same definitions and validation as creation.
3. A readiness result guarantees renderer-ready data.
4. Ambiguous temporal values cannot silently produce an empty chart.
5. Eligible charts can participate in deterministic synchronized playback.
6. Delta charts accurately explain the displayed and comparison observations.
7. Collection-capable charts share consistent layout, navigation, and ranking behavior.
8. The curated default dashboard reflects the current exercise datasets and information needs without copying the previous dashboard.
9. Version-3 bundles round-trip safely.
10. Quorum validates the generated version-3 semantic catalogue and continues to fail closed on drift.
11. Baseline, schema, interaction, rendering, accessibility, and end-to-end tests pass.
