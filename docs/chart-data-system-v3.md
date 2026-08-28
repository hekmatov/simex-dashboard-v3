# Chart Data System V3 within Dashboard V6

## Scope

Chart Data System V3 is the schema-driven authoring, validation, preparation,
rendering, and playback architecture used by SimEx Dashboard. It is embedded
in the Version 6 dashboard configuration and package boundary; this document
does not describe a Version 3 dashboard envelope.

Its central rule is:

> A chart schema defines what a visualization means; generated forms collect
> only that meaning; preparation produces canonical marks; renderers consume
> only those marks.

This separates end-user simplicity from system extensibility. Adding a chart
family can extend the registry and renderer without adding another unrelated
settings panel.

## Version boundaries

Several independent contracts intentionally use different versions:

| Contract | Version |
| --- | --- |
| Chart instance | `configVersion: 3` |
| Chart Data System | Version 3 |
| Dashboard configuration | `configVersion: 6` |
| Portable dashboard bundle | `version: 6` |
| Quorum chart catalogue | `contract_version: "2"` |
| Quorum companion protocol | `"1"` |

The catalogue version describes the metadata contract consumed by Quorum. It
does not weaken or replace the chart, dashboard, or bundle version 3 boundary.

## Authoritative modules

| Responsibility | Authority |
| --- | --- |
| Chart discovery and registration | `src/charting/schemas/chartSchemaRegistry.js` |
| Schema validation | `src/charting/schemas/validateChartSchema.js` |
| Chart-instance validation and normalization | `src/charting/config/chartConfigV3.js` |
| Dashboard and bundle validation | `src/charting/config/dashboardBundleV3.js` |
| Cross-record references | `src/charting/config/dashboardSemanticReferences.js` |
| Dataset profiling | `src/charting/data/profileDataset.js` |
| Runtime source readiness and caching | `src/data/dataService.js` |
| Source request normalization | `src/data/sourceRequest.js` |
| Runtime provider registration | `src/data/providerRegistry.js` |
| Packaged/manual source providers | `src/data/dashboardSourceProviders.js` |
| Source-role bindings | `src/charting/data/bindings.js` |
| Transformations | `src/charting/data/transforms.js` |
| Family-neutral preparation | `src/charting/data/prepareChartData.js` |
| Rendering resolution | `src/charting/rendering/resolveChartRendering.js` |
| Renderer registry | `src/charting/rendering/renderAdapterRegistry.js` |
| Series appearance contract | `src/charting/presentation/seriesStyleContract.js` |
| Generated form model | `src/charting/forms/formModel.js` |
| Guided conversion | `src/charting/forms/chartConversion.js` |
| Dashboard temporal normalization | `src/charting/time/dashboardTemporalConfig.js` |
| Time synchronization | `src/charting/time/timeSyncModel.js` |
| Temporal availability | `src/charting/time/temporalAvailability.js` |
| Temporal matching | `src/charting/time/temporalMatch.js` |
| Playback projection | `src/charting/time/applyTimeContext.js` |
| Collection contract | `src/charting/collection/collectionModel.js` |
| Collection ranking | `src/charting/collection/rankCollection.js` |
| Delta comparison | `src/charting/data/resolveDeltaComparison.js` |

## Registry and discovery

The registry currently contains 26 chart types in nine communication-purpose
groups:

| Group | Type IDs |
| --- | --- |
| Comparison | `bar`, `groupedBar`, `stackedBar`, `horizontalBar`, `horizontalStackedBar` |
| Trends | `line`, `area`, `mixed` |
| Composition | `pie`, `donut` |
| Targets | `kpi`, `gauge`, `bullet`, `deltaCard`, `deltaList` |
| Relationships | `scatter`, `bubble` |
| Readiness | `heatmap`, `readinessMatrix` |
| Timeline | `timeline`, `swimlane` |
| Geography | `choroplethMap`, `chronoChoroplethMap`, `mapScatter` |
| Operational | `table`, `image` |

A schema declares:

- stable type identity, label, description, purpose, and mark;
- renderer and data family;
- roles, cardinality, and accepted semantic types;
- supported source modes and transformations;
- compatible conversion targets;
- time, collection, zoom, and geography capabilities;
- applicable presentation sections and series-appearance fields.

The registry validates every schema before application rendering. Unknown
renderers, duplicate type IDs, impossible role cardinality, invalid conversion
targets, and inconsistent capabilities fail during construction.

Discovery is therefore data-driven. The type picker does not contain a
parallel list of special cases.

## Source contracts and profiling

Dashboard version 3 recognizes these source records:

- tracked CSV with a safe relative `.csv` path;
- tracked GeoJSON with a safe relative `.geojson` path;
- uploaded CSV with its CSV text and metadata;
- schema-authorized inline rows.

Arbitrary dataset shapes, unsafe paths, accessors, custom prototypes, hidden
fields, executable values, and prototype-polluting keys are rejected.

`profileDataset.js` records:

- row and column counts;
- detected semantic type per column;
- bounded examples;
- missing and unique-value evidence;
- numeric and temporal evidence;
- diagnostics;
- a deterministic source fingerprint.

The wizard shows the detected type, examples, and relevant warnings. The
deeper evidence remains available to validation, role compatibility, time
clocks, reconciliation, and reproducibility.

Manual data is capability-based rather than hard-coded by chart type. A schema
must declare its inline shape and row bounds. The form layer applies a global
50-row ceiling in addition to the schema limit.

## Runtime source lifecycle

All runtime source loading passes through `DataService`. The service publishes
immutable `unloaded`, `loading`, `ready`, and `error` snapshot wrappers, reuses
equivalent in-flight and ready loads, and records active consumer leases. Large
row and GeoJSON payloads are read-only by contract rather than recursively
frozen or cloned.

Providers translate transport-specific source records into tabular rows or a
validated GeoJSON `FeatureCollection`. Providers do not filter, aggregate,
interpolate, consolidate duplicates, or produce chart marks. Those operations
remain in `prepareChartData.js` and the family preparers.

The initial compatibility stage still calls `hydrateAll()` and exposes
`dashboard.loadedData` so existing dashboard, authoring, fullscreen, and
playback consumers behave unchanged. `loadedData` is a temporary runtime
compatibility object, not a persisted contract. Consumer migrations will
replace direct reads with explicit page, wizard, editor, fullscreen, and
playback demand before the compatibility object is removed.

Tracked profiles remain available before their CSV rows are loaded. Uploaded
CSV and inline sources receive a profile when their first ready revision is
published. Measurement events are local metadata-only hooks; they never include
source rows and do not perform network telemetry.

## Four-step authoring flow

### 1. Chart type

Selecting the schema first establishes every later role, source, form, and
renderer constraint.

### 2. Data source

The source step offers only the modes allowed by that schema. CSV selection or
upload triggers profiling. Geography schemas materialize their GeoJSON
contract before preview.

### 3. Data roles

The generated form presents measurements first, then observations and other
roles. Cardinality permits one or several bindings. Axis measurements can
declare primary or secondary assignment.

X interpretation defaults to profiled evidence. An override is materialized
only when another valid interpretation has practical effects.

Transformations are also schema-driven:

- filters;
- grouping;
- aggregation;
- duplicate resolution;
- missing-value strategy;
- delta comparison where applicable.

Duplicate controls depend on the current prepared correlation. They are not
shown merely because a schema could support aggregation.

### 4. Style and layout

The style step begins with `ChartPreview`, which uses `ChartView` and the same
resolution boundary as the saved dashboard. The title remains reachable before
preview readiness; other presentation and interaction fields materialize only
after the current draft is renderer-ready.

Only schema-declared sections materialize. A type with no axis or series-style
concept does not inherit a generic Series tab.

All four tabs remain reachable. A tab whose prerequisites are incomplete
renders a bounded explanation rather than an invalid form.

### Series appearance contract

Series appearance is a strict optional `presentation.series` object. It can
contain only:

- `colors`: an ordinary dense array of 1 to 12 exact `#RRGGBB` values;
- `lineWidth`: a finite number from 1 through 12;
- `barWidth`: a finite number from 4 through 120.

The object must be non-empty, plain, inert, and free of unknown properties.
The schema's `form.appearance` list controls which leaves are applicable:

| Semantic renderer mark | Applicable fields |
| --- | --- |
| Bar variants | `seriesColors`, `barWidth` |
| Line and area | `seriesColors`, `lineWidth` |
| Mixed axis | `seriesColors`, `lineWidth`, `barWidth` |
| Pie, donut, point, and bubble | `seriesColors` |
| Other marks | none |

Axis, composition, and relationship renderers validate and consume the same
semantic mark contract. Non-empty series appearance is rejected for any
renderer without that contract, preventing a schema from accepting a setting
that its renderer would ignore.

Clearing an optional field deletes its leaf and prunes `presentation.series`
only when no sibling setting remains. The editor can therefore return exactly
to renderer defaults without persisting `undefined` or an empty object.

## Preparation and readiness

The shared pipeline is:

```text
strict chart + source + profile
        ↓
filters
        ↓
playback/time projection
        ↓
role, group, and geography compatibility
        ↓
family-specific candidate marks
(missing-value strategy + group metadata)
        ↓
duplicate detection and selected consolidation/aggregation
        ↓
renderer preflight
        ↓
ready preview or bounded diagnostic
```

Family preparers emit renderer-neutral marks:

- `prepareAxisData.js`
- `prepareCompositionData.js`
- `prepareRelationshipData.js`
- `prepareTargetData.js`
- `prepareMatrixData.js`
- `prepareTimelineData.js`
- `prepareGeographyData.js`
- `prepareOperationalData.js`

“Ready” means at least one mark is actually renderable. A retained source row,
x value, or series count is not sufficient if required coordinates, identity,
targets, geography, or comparison values cannot reach the renderer. This is
the invariant that prevents an apparently successful live binding check from
producing an empty chart.

Preparation does not mutate the chart, source rows, profile, GeoJSON, or time
context.

## Rendering

`buildRenderModel.js` selects a registered adapter for the schema family.
Adapters consume canonical marks rather than raw source rows:

- axis;
- composition;
- relationship;
- target;
- matrix;
- timeline;
- geography;
- operational.

`ChartView` is shared by:

- wizard preview;
- contextual editor preview;
- dashboard panels;
- fullscreen display;
- synchronized playback.

This makes preview fidelity an architectural property rather than a second
approximate renderer.

Pie and donut charts use actual ECharts pie series. Repeated composition groups
are laid out as non-overlapping small multiples. KPI, delta, table, and image
families can return semantic renderer-neutral models instead of forcing every
display through an axis option.

For series-capable families, renderer behavior and style applicability come
from the validated semantic mark, not from a chart-type identifier. ECharts
receives `option.color`, `lineStyle.width`, or `barWidth` only when the schema
and persisted contract allow the corresponding leaf.

## Contextual editing and conversion

`formModel.js` materializes fields from the validated schema and current
preparation state. `ContextualTabs` groups only the sections that exist for the
current type.

An edit session is isolated from the saved chart. Reset returns to the latest
saved revision after confirmation. Save performs normalization, chart
validation, and whole-group temporal validation before updating dashboard
state.

Conversion uses one authority:

1. compare source and target schemas;
2. preserve roles with the same accepted meaning;
3. identify required target roles;
4. disclose settings and memberships that must be removed;
5. collect explicit remapping;
6. validate the complete target;
7. apply atomically.

Cancelling returns the exact original draft.

Conversion preserves series colors and compatible widths. Each inapplicable
series-style leaf is separately disclosed and removed; compatible siblings
remain intact.

## Time synchronization

The dashboard owns a validated IANA `timezone`; legacy bundles that omit it
normalize to `UTC`. A canonical Chrono Group contains exactly:

- stable `id` and `name` values;
- an inclusive `period` with canonical `YYYY-MM-DD` `start` and `end` dates;
- a default `matching` policy;
- a positive finite `secondsPerFrame` cadence;
- validated `members`.

`chronoGroups[].members` is the sole membership authority. Each member
declares `chartId` and `timeRole`, with an optional validated `matching`
override. The same chart can belong to multiple groups. Chart-local
`interaction.timeSync` values are normalized away and are never read as an
authoritative backlink.

`temporalAvailability.js` builds the group clock as the sorted, unique union
of member observations after saved transformations and filters. An observation
contributes only when it falls inside the inclusive period, its temporal value
is valid, and at least one plotted value is nonmissing. Date-only observations
are compared directly; instant observations are assigned to calendar dates in
the dashboard timezone. There is no designated primary clock.

Collection displays are ineligible for Chrono Group membership and fail
validation when supplied as members.

### Matching

`temporalMatch.js` implements:

- `exact`;
- `lastKnown`;
- `nearest` with a finite non-negative tolerance;
- `interpolate`.

Nearest refuses equidistant ties. Interpolation requires:

- a schema family whose meaning is continuous;
- numeric profile evidence;
- explicit permission;
- valid lower and upper bounds.

It never extrapolates. Matching results retain provenance so a display can
distinguish observed, carried, nearest, interpolated, and missing values.

`applyTimeContext.js` consumes the validated member context supplied by the
active group; it never reads a chart backlink. It projects each family without
discarding its static meaning. Trace charts keep history, snapshot charts
expose active values, maps select a frame, and cards retain provenance.

## Collection Display

Collection Display is independent of any one visualization. A collection item
is produced by the chart family; `CollectionDisplay` decides how repeated
items are presented.

Collection displays are excluded from Chrono Groups. Their internal paging,
ranking, and carousel rotation do not receive group time contexts.

The current registry declares collection capability for `kpi`, `gauge`,
`bullet`, and `deltaList`. Other types, including the single-value
`deltaCard`, do not receive collection fields unless their schema explicitly
adopts that capability.

Supported layouts:

- fixed grid;
- scrollable grid;
- carousel.

Ranking modes:

- fixed;
- sort;
- priority.

Shared settings include rows, columns, gap, overflow, ranking, and carousel.

Priority methods include current value, absolute or percentage change,
distance from target, risk score, and validated weighted metrics.
`priorityExpression.js` validates, detaches, and evaluates a bounded
declarative weighted-sum expression; it does not execute free-form JavaScript.

Collection ranking and carousel state remain local to the collection display.

## Delta comparisons

Delta schemas own an immutable comparison descriptor. Supported modes are:

- previous distinct observation;
- fixed canonical UTC instant earlier than the displayed observation.

Fixed-time policies can use exact, last-known, bounded-nearest, or explicitly
authorized interpolation. The baseline must remain earlier than the displayed
observation.

Preparation returns the displayed value, comparison value, absolute change,
percentage change where defined, and separate provenance for both sides.

## Ctrl-wheel zoom

Zoom capability is declared by the chart schema and normalized in the chart
interaction contract. `ZoomGuard` prevents plain page scrolling from being
captured by the chart. Ctrl-wheel activates chart zoom and otherwise presents
bounded guidance.

The same behavior is applied to mounted ECharts, image zoom, dashboard panels,
and fullscreen views. Listener lifecycle and reduced-motion behavior are
covered by browser tests.

## Dashboard V6 configuration and package boundary

Every saved chart uses `configVersion: 3`; the enclosing dashboard uses
`configVersion: 6`. Dashboard validation checks:

- exact top-level and nested shapes;
- chart type and role references;
- source existence and role compatibility;
- Chrono Group membership in both directions;
- collection and comparison subcontracts;
- schema-applicable series appearance;
- page, section, landing, and chart identity;
- absence of runtime-only rows.

Portable bundles are Version 6. The package parser can deterministically
normalize a raw Version 3–6 configuration before applying the strict current
boundary; invalid or unsupported input is rejected. The following is a shape
schematic, not an importable bundle: a real export supplies canonical metadata
and the complete validated dashboard configuration.

```json
{
  "bundleType": "simex-dashboard-bundle",
  "version": 6,
  "metadata": {
    "exportedAt": "<canonical ISO-8601 timestamp or null>",
    "sourceFingerprints": {
      "<source-id>": "<deterministic fingerprint or null>"
    }
  },
  "config": {
    "configVersion": 6,
    "...": "<complete dashboard configuration>"
  }
}
```

Unrecognized or invalid legacy input is rejected rather than partially
applied. Deterministic normalization is limited to accepted Version 3–6
shapes; it cannot guess an unknown visual or analytical meaning. Re-export a
successful legacy import as Version 6.

## Quorum catalogue generation

`scripts/build-quorum-catalogue.mjs` projects the strict registry and
configured dashboard into
`public/integration/quorum-chart-catalogue.json`.

The generated catalogue contains:

- 26 complete chart-type descriptors;
- 40 configured chart descriptors;
- role, conversion, temporal, collection, geography, and display capability
  metadata;
- a dashboard semantic digest;
- an outer canonical catalogue digest.

Object keys use JavaScript UTF-16 ordering, arrays preserve declared order, and
the result is deterministic. Quorum validates the exact contract version 2
snapshot without changing its version 1 companion protocol.

Catalogue contract version 2 can represent only one Chrono Group membership per
chart. Catalogue generation fails with an actionable error when a canonical
dashboard uses multiple memberships for one chart; supporting that valid
dashboard shape in Quorum requires a coordinated catalogue contract version 3
update in both repositories.

## Extension procedure

To add a chart type:

1. define its inert schema descriptor;
2. register a renderer adapter;
3. add family preparation only if existing canonical marks are insufficient;
4. declare only the appearance fields implemented by its semantic mark;
5. declare compatible conversions;
6. add form, preparation, rendering, persistence, and accessibility tests;
7. add playback or collection tests when those capabilities are declared;
8. regenerate and validate the Quorum catalogue.

No separate hand-coded wizard branch or unconditional settings tab should be
required.

## Verification map

Primary suites include:

| Concern | Tests |
| --- | --- |
| Registry and schema validation | `tests/chartSchemasV3.test.js` |
| Wizard and editor UI | `tests/chartAuthoringComponentsV3.test.js` |
| Manual sources | `tests/manualChartDataV3.test.js` |
| Profiling | `tests/datasetProfilesV3.test.js` |
| Preparation | `tests/chartDataPipelineV3.test.js` |
| Rendering | `tests/chartRenderingV3.test.js` |
| Series appearance and persistence | `tests/chartSchemasV3.test.js`, `tests/chartFormModelV3.test.js`, `tests/dashboardBundleV3.test.js` |
| Conversion | `tests/chartConversionV3.test.js` |
| Chrono Groups and matching | `tests/timeSyncModelV3.test.js`, `tests/temporalMatchingV3.test.js` |
| Playback projection | `tests/timeAwareChartDataV3.test.js` |
| Collection Display | `tests/collectionModelV3.test.js`, `tests/collectionComponentsV3.test.js` |
| Delta comparison | `tests/deltaComparisonV3.test.js` |
| Zoom | `tests/chartZoomV3.test.js` |
| Bundle boundary | `tests/dashboardBundleV3.test.js` |
| Application routing | `tests/dashboardAppV3.test.js` |
| Browser flows | `tests/e2e/*.spec.js` |

See [the final verification record](verification/2026-07-26-chart-system-v3.md)
for exact commands, revisions, counts, warnings, and isolation evidence.
