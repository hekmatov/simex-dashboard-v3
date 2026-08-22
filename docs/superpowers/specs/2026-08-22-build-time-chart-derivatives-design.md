# Build-Time Chart Derivatives and Runtime Preparation Design

## Status

Approved in principle on 2026-08-22. This specification records the approved Biomedical performance fix and the binding rule that expensive, invariant chart preparation belongs at dashboard-build or chart-save time rather than ordinary viewing time.

## Problem

Opening the Biomedical page is slower than opening the other pages because the browser repeatedly performs work whose result does not depend on the viewing session. The largest source, `municipal_infections_2021_harmonized.csv`, contains 146,080 rows and is about 23.1 MB. It is parsed and scanned for three charts, while Default Chrono also discovers temporal availability by scanning chart rows during page changes even when Chrono is closed.

The same architectural problem can recur for charts created in Build. A saved chart is an authored declaration, but the browser currently has to repeat invariant filtering, aggregation, role projection, duplicate handling, temporal-availability discovery, and family-specific preparation to turn that declaration into renderable data.

## Binding Principle

Expensive preparation that depends only on authoritative data and saved chart configuration must run once when a tracked dashboard is built or when a chart is successfully created or materially edited.

The browser may repeat only work that genuinely depends on runtime state, including:

- the active Chrono frame and matching policy;
- reveal versus full-trace presentation;
- page, mode, selection, and fullscreen state;
- viewport-responsive layout;
- theme and colour projection;
- accessibility visibility;
- zoom and pan state; and
- live authoring drafts that have not been saved.

Compiled data is derived, replaceable evidence. The authoritative source and saved chart configuration remain the content truth. A compiled artifact must never silently become a second editable dashboard truth.

## Biomedical Source Findings

The authoritative municipal source is a complete 352-municipality by 415-date grid:

- 146,080 rows;
- 146,080 unique `(Datum, MunicipalityCode)` keys;
- no duplicate keys;
- no missing map values; and
- no non-finite `infectionsPer10000` values.

The choropleth consumes only `Datum`, `MunicipalityCode`, and `infectionsPer10000`. Municipality labels and shapes come from the `statcode` GeoJSON join. Its supported runtime interactions are item tooltip, accessibility output, Chrono playback, and Ctrl-assisted map pan/zoom. It has no click, drill-down, or chart-owned filtering interaction that requires the other ten raw columns.

The aggregate line consumes the sum of `AantalCumulatief` for each date. The bubble chart consumes the latest-date values of `population`, `infectionsPer10000`, `AantalCumulatief`, `Gemeentenaam`, and `Provincienaam`.

## Architecture

### 1. Authoritative inputs and deterministic derivatives

`public/data/biomedical/municipal_infections_2021_harmonized.csv` remains unchanged and authoritative. It is a build input, not a View runtime dependency for the three affected charts.

A deterministic generator produces:

1. `municipal_map_timeline.csv`: all 146,080 exact map triples, approximately 5.21 MB;
2. `municipal_aggregate_timeseries.csv`: 415 date/aggregate rows, approximately 10 KB;
3. `municipal_latest_bubble.csv`: 352 latest-date rows containing only the six fields needed by the bubble chart, approximately 23 KB; and
4. a manifest containing compiler version, authoritative source path and SHA-256, derivative paths and SHA-256 values, row counts, selected fields, latest date, and generation rules.

The three derivatives total approximately 5.24 MB, or 22.7% of the authoritative source. Values used by the charts are copied or calculated without rounding. Generation fails closed on a missing field, duplicate map key, incomplete grid, non-finite map value, or unexpected latest-date cardinality.

The generator runs before dataset-profile generation in development and production builds. A check mode proves committed artifacts are current without rewriting them.

### 2. Chart compilation contract

The same compiler boundary applies to charts saved through the six-stage New Chart workflow and the chart editor.

A chart preparation identity is calculated from:

- compiler format version;
- authoritative source fingerprint or loaded source revision;
- chart type and bound roles;
- saved filters, grouping, aggregation, duplicate policy, and missing-value policy;
- temporal parsing metadata;
- geography source fingerprint and join field when applicable; and
- other family-specific data preparation settings.

Presentation-only properties such as title alignment, background, colour profile, panel size, and dashboard style do not change the preparation identity.

Successful chart creation compiles invariant data before the serialized create transaction completes. Successful edits regenerate the compiled result only when the preparation identity changes. Presentation-only edits retain the existing compiled result.

The compiler returns a versioned `ChartRuntimeArtifact` containing family-neutral prepared marks, bounded diagnostics, row-count evidence, temporal availability by bound temporal role, and the preparation identity. It excludes source rows, React state, ECharts instances, viewport geometry, theme values, active playback state, and authoring focus or scroll state.

Geography artifacts store geographic identity, value, time, grouping, and required coordinates only. They do not duplicate GeoJSON feature geometry per observation. GeoJSON registration remains a renderer dependency and the feature join is checked against its fingerprint.

### 3. Artifact resolution and persistence

Tracked dashboard charts reference generated artifacts included with the dashboard build. Charts created in Build place their compiled artifact in the in-memory artifact registry immediately and attempt durable browser persistence as part of the chart-create or chart-edit outcome.

Resolution order is:

1. a matching in-memory artifact;
2. a matching bundled artifact;
3. a matching durable browser artifact; and
4. one fallback compilation from the authoritative source, followed by cache publication.

An artifact is usable only when its compiler version and preparation identity match the authoritative inputs. A missing, stale, corrupt, or unsupported artifact is discarded and rebuilt; it never changes the saved chart or source.

Durable artifact persistence must follow the Step 6 storage contract. Storage unavailability does not make the live chart unusable and is reported as session-only persistence. Quota exhaustion remains a distinct outcome. Artifact-persistence failure does not roll back an otherwise committed chart, because the artifact is reproducible and remains available in memory for the current session.

The dashboard bundle may carry artifact references and matching portable artifacts, but must not serialize live ECharts objects, loaded source rows, transient caches, or browser-storage implementation details.

### 4. Runtime renderer behavior

Static View and Build rendering resolves a valid prepared artifact instead of rerunning invariant chart preparation. The existing canonical renderer remains responsible for presentation and responsive behavior.

Chrono applies active-frame matching and reveal rules to the artifact's prepared marks and temporal index. It must not reparse the authoritative CSV or rediscover the full temporal domain on each tick. Exact snapshot selection is proportional to the selected frame, not to the complete source row count.

If a chart has no compiled artifact because it predates this contract, the runtime compiles it once and publishes the result. This compatibility path is a recovery mechanism, not the normal path for newly saved charts.

### 5. Lazy Default Chrono and temporal availability cache

Default page playback is not built while Chrono is closed. Opening Chrono materializes the current page's default clock only if it is needed.

Temporal availability uses a revision-aware cache shared by Default Chrono, saved Time Groups, and Scenes. The key includes source identity, temporal binding, preparation identity, profile/parsing identity, period, and timezone. A source, profile, chart preparation, or temporal-policy revision creates a cache miss; page, mode, theme, colour, layout, selection, and drawer changes do not.

The cache preserves the approved temporal rules. It does not guess matching policy, merge content from other pages, or alter Scene ownership and provenance.

## Data Flow

### Tracked dashboard build

1. Read authoritative source.
2. Validate authoritative invariants.
3. Generate deterministic derivatives and manifest.
4. Generate dataset profiles from runtime derivatives.
5. Compile or validate tracked chart runtime artifacts.
6. Package dashboard configuration, derivatives, manifest, and portable equivalents.
7. View loads only runtime derivatives and artifacts required by configured charts.

### New chart creation

1. Keep the source and chart draft independent until Review and Create succeeds.
2. Validate the reviewed six-stage chart configuration and placement proof.
3. Calculate the preparation identity.
4. Compile invariant prepared data and temporal availability from the authoritative source revision.
5. Commit chart, destination placement, source changes, artifact reference, and in-memory artifact publication as one serialized creation outcome.
6. Attempt durable artifact persistence without blocking or reversing the committed live chart if storage is unavailable.
7. Reveal the created chart using the compiled artifact.

### Chart editing

1. Compare the previous and next preparation identities.
2. Reuse the artifact for presentation-only changes.
3. Compile a replacement before committing data-affecting changes.
4. Retain the previous saved chart and artifact on validation or compilation failure.

## Error and Recovery Contract

- Generator validation failures stop the build and name the source invariant that failed.
- A stale manifest or derivative fails check mode with the exact artifact path.
- Runtime artifact corruption causes one rebuild from authority and a bounded diagnostic.
- Runtime fallback compilation failure uses the existing chart unavailable/error surface and retry ownership.
- Storage unavailable means the chart and artifact remain live for the session with an honest session-only notice.
- Quota exhaustion remains explicitly distinguishable from general persistence failure.
- Retry is idempotent by preparation identity; it does not create duplicate charts, sources, or artifacts.

## Compatibility and Scope

- The V3 dashboard configuration and authoritative source remain the editable content truth.
- View contains no authoring chrome.
- The canonical renderer, saved layout model, and responsive rules are unchanged.
- Dashboard Look and colour-profile changes never invalidate data artifacts.
- Present/Audience redesign remains outside Step 7 except that it may consume the same valid artifact through the canonical renderer.
- This work does not introduce a general analytics query engine, background worker framework, or new visual direction.

## Verification

Focused deterministic checks must establish:

- every map derivative triple equals the authoritative triple;
- every aggregate derivative value equals the authoritative per-date sum;
- every bubble derivative row equals the authoritative latest-date projection;
- manifest hashes and row counts match generated files;
- generation check mode detects stale output;
- Default Chrono performs no page-clock scan while closed;
- temporal availability is reused for matching revisions and invalidated for relevant revisions;
- chart creation publishes a compiled artifact before reveal;
- presentation-only chart edits reuse the artifact;
- data-affecting edits compile a new artifact;
- stale or corrupt artifacts rebuild without mutating saved content;
- storage-unavailable and quota-exhausted outcomes retain their distinct Step 6 behavior; and
- static map, tooltip, zoom, accessibility, latest frame, Time Group playback, and Scene playback remain equivalent.

After focused tests pass, run the production build and use the in-app browser to compare Biomedical page navigation, Chrono opening, map playback, tooltip, and zoom behavior. Timing evidence is comparative rather than a brittle hard threshold; the decision criterion is removal of repeated invariant scans and a materially faster Biomedical navigation path.
