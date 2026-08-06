# Demand-Driven Data Service Design

Date: 2026-08-01

Status: Approved direction; staged implementation required

## Decision

SimEx Dashboard will introduce a provider-backed, demand-driven `DataService`
as the single runtime path through which charts, authoring tools, fullscreen
views, and synchronized playback obtain source data.

The service owns source discovery, loading, explicit readiness, in-flight
deduplication, cache residency, leases, revisions, failure isolation, and
measurement events. It does **not** own chart semantics. Filtering, grouping,
aggregation, duplicate handling, missing-value behavior, geography joins,
temporal matching, and renderer-ready mark construction remain authoritative in
`src/charting/data/prepareChartData.js` and its existing family preparers.

This is a staged architectural migration rather than a big-bang rewrite. The
first implementation wraps the existing loaders and retains eager hydration as
a compatibility path. Later stages move each consumer to explicit demand and
then remove the compatibility object.

## Why This Direction

The current loader treats the hydrated dashboard as one large object. It loads
every configured source sequentially, places all parsed payloads under
`loadedData`, and then hands that graph to every consumer. This produces three
structural costs:

- initial startup parses sources that the active page may never display;
- large parsed object graphs remain reachable for the lifetime of the dashboard;
- the wizard, editor, playback, and fullscreen paths have no shared vocabulary
  for requesting, reusing, releasing, or reporting source readiness.

Adding isolated lazy-loading branches to each consumer would reduce some startup
work but would create several caches and several interpretations of loading
state. A shared service makes demand, reuse, readiness, and failure behavior one
runtime contract while keeping the proven Chart System V3 analytical pipeline
intact.

## Goals

- Load and parse a source only when a current consumer requires it.
- Reuse one in-flight or ready source snapshot across equivalent consumers.
- Make `unloaded`, `loading`, `ready`, and `error` states explicit.
- Allow page, wizard, editor, fullscreen, and playback consumers to hold and
  release source leases.
- Keep tracked dataset profiles usable before the corresponding CSV is loaded.
- Profile uploaded and manual tabular sources once, when their payload is first
  materialized.
- Isolate a failed source so unrelated charts and pages continue operating.
- Provide deterministic measurement hooks without online telemetry.
- Permit later providers for runtime feeds without changing chart renderers.
- Reduce startup work and long-lived heap use without weakening dashboard
  configuration or analytical correctness.

## Non-Goals

- The service is not a database, OLAP cube, dataframe library, or general query
  language.
- The initial migration will not rewrite `prepareChartData` or its family
  preparers.
- The service will not silently filter, aggregate, reorder, interpolate, or
  resolve duplicate observations.
- The initial foundation will not automatically evict sources using guessed
  memory limits. Bounded eviction follows measurements.
- The first provider set will not implement live Quorum feeds. It defines the
  provider boundary that a later, versioned Quorum adapter can implement.
- Demand-driven loading does not change the version-3 persisted dashboard schema
  or the version-2 Quorum catalogue contract.

## Architectural Boundary

```text
persisted dashboard descriptors + tracked profile catalogue
                         |
                         v
              request normalization
                         |
                         v
                 provider registry
        +----------+-----+--------+----------+
        |          |              |          |
       CSV     uploaded CSV     inline    GeoJSON
        |          |              |          |
        +----------+------+-------+----------+
                          |
                          v
            DataService source snapshots
       unloaded -> loading -> ready | error
                          |
          +---------------+----------------+
          |               |                |
       page/chart      authoring       presentation
                       wizard/editor   fullscreen/playback
          |               |                |
          +---------------+----------------+
                          |
                          v
              prepareChartData remains
              semantic transformation authority
                          |
                          v
                     render adapters
```

CSV is therefore one provider, not the dashboard's internal data model. The
service returns a normalized source payload: tabular rows for tabular providers
or a validated GeoJSON `FeatureCollection` for geography providers. Charts bind
semantic roles to those payloads exactly as they do today.

## Core Runtime Contracts

### Source descriptor

The persisted `dataSources[sourceId]` entry remains the declarative description
of where data originates. The service does not add runtime state to that record.
The current descriptor forms remain:

- tracked `{ kind: "csv", path, ... }`;
- tracked `{ kind: "geojson", path, ... }`;
- uploaded `{ kind: "dataset", type: "uploadedCsv", csvText, ... }`;
- manual `{ kind: "inline", rows, ... }`.

Descriptor validation remains at the existing dashboard boundary. A normalized
request derives a provider kind and stable cache identity from an already
validated descriptor.

### Normalized request

A demand request identifies the configured source and why it is needed:

```js
{
  sourceId: "bio_cases",
  purpose: "dashboard" // dashboard | wizard | editor | fullscreen | playback | compatibility
}
```

The service combines this request with its registered descriptor and optional
portable payload. The descriptor identity—not `purpose`—determines cache
equivalence. Purpose is retained only for measurement and diagnostics, so a
wizard and a chart requesting the same source share one load.

### Provider

A provider has one stable `kind` and one asynchronous `load` method:

```js
{
  kind: "csv",
  async load({ sourceId, descriptor, portableSource, purpose }) {
    return { data, profile: undefined };
  },
}
```

`data` is required. `profile` is optional because tracked CSV profiles already
exist in the catalogue, while uploaded and inline providers derive a profile at
load time. Providers parse and validate their own transport representation but
do not apply chart transformations.

### Immutable source snapshot

Every observation of a source is represented by a newly frozen wrapper:

```js
{
  sourceId: "bio_cases",
  status: "ready",          // unloaded | loading | ready | error
  revision: 1,
  data: rows,
  profile,
  error: null,
  leaseCount: 2,
  loadedAt: 184.7,
  loadDurationMs: 31.4,
}
```

Snapshot wrappers are immutable and replaced on every state transition. Large
row objects are not recursively cloned or frozen: doing so would directly
conflict with the performance objective. Provider payloads are instead
read-only by contract, and existing preparation code must continue to avoid
mutation. A revision increments only when a new ready payload replaces the
previous payload. Consumers use `(sourceId, revision)` to invalidate derived
work.

### Data service

The service exposes these conceptual operations:

```js
service.getSnapshot("bio_cases");
await service.load({ sourceId: "bio_cases", purpose: "dashboard" });
const lease = service.acquire({ sourceId: "bio_cases", purpose: "editor" });
const readySnapshot = await lease.ready;
lease.release();
await service.hydrateAll({ purpose: "compatibility" });
service.evict("bio_cases");
service.retry({ sourceId: "bio_cases", purpose: "dashboard" });
service.inspect();
```

`load` deduplicates equivalent in-flight requests. `hydrateAll` loads sources in
deterministic sequence and returns the legacy `{ loadedData, profiles }` shape;
it exists only to make extraction and migration behavior-preserving.

## Explicit Readiness and Consumer Behavior

Consumers must not infer readiness from an empty array, missing object property,
or a retained profile. They branch on the snapshot status:

- `unloaded`: render a lightweight pending state and acquire demand;
- `loading`: retain the pending state and reuse the current promise;
- `ready`: pass `snapshot.data` and `snapshot.profile` into preparation;
- `error`: show a source-local diagnostic with an explicit retry action.

A tracked profile can be ready while source rows remain unloaded. This permits
the wizard to list source names, detected columns, types, and stored examples
without loading every CSV. Operations requiring current rows—duplicate
detection, live preview, source-table viewing, and exact value inspection—must
acquire the selected source.

## Demand and Lease Policy

A lease records that a consumer currently needs a source and prevents automatic
or explicit eviction while that need remains active. Release is idempotent.
Leases are runtime-only and are never serialized.

### Active dashboard page

Entering a dashboard page acquires the primary source and any GeoJSON source for
every chart on that page. Loading at page scope avoids a visible chart causing a
second request a moment after navigation. Leaving the page releases those
leases. Intersection-based canvas suspension remains a rendering concern and
does not by itself release page data.

### Wizard

Opening the wizard acquires nothing. The source catalogue and tracked profiles
are sufficient for selection. Selecting an existing source acquires only that
source; changing selection releases the previous lease. Selecting a geography
chart also acquires its chosen GeoJSON source. Upload and manual entry register
their descriptor with the draft session and acquire it once. Closing or
discarding the wizard releases draft leases.

### Editor

Opening an editor acquires the chart's primary and geography sources. Draft
changes that select another source acquire the replacement before releasing the
previous source, avoiding a blank transition. Save and cancel release editor
leases after the dashboard has reconciled its page demand.

### Fullscreen and multi-fullscreen

Entering presentation mode acquires the union of sources used by all selected
charts. Duplicate source IDs share one cache entry with multiple leases. Source
leases are released after presentation closes. Background chart canvases may be
suspended independently.

### Synchronized playback

Playback computes the union of the group's primary clock source, member chart
sources, and member geography sources. It acquires all of them and waits for a
successful readiness preflight before enabling Play. The leases remain for the
entire playback session, so eviction cannot interrupt temporal matching.
Matching policies—exact, last known value, nearest within tolerance, or
analytically permitted interpolation—remain in the time system, not in the data
service. A source failure identifies affected members while unrelated dashboard
content remains usable.

## Cache and Eviction Model

The cache stores provider results and in-flight promises by normalized source
identity. The following invariants apply:

- at most one provider load is active for an equivalent source identity;
- a cache hit returns the same stable payload reference and ready revision;
- loading and leased entries cannot be evicted;
- an error belongs only to its source identity;
- retry starts a new attempt without invalidating unrelated entries;
- replacing a descriptor or source fingerprint creates a new identity;
- the service never serializes cached payloads into dashboard configuration.

The foundation exposes explicit eviction and inspection but does not guess an
automatic limit. After demand migration, measurement determines two budgets:

1. maximum ready entry count; and
2. approximate retained bytes, using provider-reported raw bytes plus measured
   expansion factors for parsed rows.

The later bounded policy is least-recently-used among unleased ready entries.
Active-page, authoring, fullscreen, and playback leases always win over the
budget. If all entries are leased, the cache may temporarily exceed its target
rather than interrupt active work.

Prepared chart views are a separate later cache. Their key must include source
revision, chart-semantic fingerprint, time context, and geography revision. Raw
source caching must not be confused with sharing transformed marks.

## Provider Scope

### Included in the first migration

- **Tracked CSV:** load from the public path or parse its portable text; reuse
  the tracked profile.
- **Uploaded CSV:** parse stored `csvText` and derive a profile once.
- **Inline/manual:** clone the concise stored rows and derive a profile once.
- **GeoJSON:** load or clone a portable `FeatureCollection`, then run the current
  GeoJSON validator before publication.

### Later Quorum adapter

A future Quorum provider can implement the same interface and publish versioned
ready snapshots. It must be an optional adapter outside chart renderers. Its
transport connection, authentication assumptions, update cadence, and Phase 5
semantic contract remain Quorum responsibilities.

The dashboard configuration should not persist a provisional `quorum` source
kind until the revised Phase 5 contract is complete. The participant-facing
static build remains the same dashboard artifact with no Quorum provider
registered and no Quorum endpoint configured.

## Failure Isolation and Recovery

Provider errors are converted to `error` snapshots containing the original
`Error` instance and timing metadata. They are not copied into other snapshots
or swallowed as empty data.

- A failed source does not reject already-ready sources.
- Page rendering shows diagnostics only in panels depending on that source.
- Wizard/editor source changes remain possible after a failure.
- Playback preflight names failed or unavailable sources and does not start a
  partially ready synchronized clock.
- Retry replaces `error` with `loading` and emits a new attempt.
- If a future feed refresh fails after a prior ready revision, the service may
  retain that revision as explicitly stale data, but that behavior requires a
  later feed-specific contract and is not part of the static-source foundation.

## Offline Packaging Implications

The current flash-drive build places every source in one
`window.SIMEX_PORTABLE_DASHBOARD` payload. Demand-driven parsing will reduce the
parsed object graph, but all raw CSV strings and GeoJSON objects will still be
allocated when that script executes. Therefore the service migration and the
portable packaging migration are separate stages.

The first foundation preserves the existing portable payload exactly. A later
packager will emit:

- one small configuration/profile manifest;
- one payload file per source with its kind, identity, and raw content; and
- a deterministic mapping from source ID to relative payload file.

HTTP/static deployments can fetch those files. `file://` deployments cannot
assume `fetch` works, so their portable provider will load a relative JavaScript
payload through a temporary script element and register the result, then remove
the element. This retains completely offline flash-drive operation while
preventing inactive source text from entering memory. Cloudflare/static builds
use the same descriptor and provider contract; only transport selection differs.

## Measurement Contract

The service accepts an injected monotonic `now()` function and an `onEvent`
callback. Events contain no source rows and require no network connection. At a
minimum they report:

- `source-load-start`;
- `source-load-ready` with duration and provider kind;
- `source-load-error` with duration and provider kind;
- `source-cache-hit`;
- `source-inflight-reuse`;
- `source-lease-acquired` and `source-lease-released`;
- `source-evicted`.

`inspect()` returns counts and metadata only: status, revision, lease count,
last-used time, load duration, and provider-reported raw byte estimate. It never
duplicates payloads.

Before and after each migration stage, collect three runs for:

- application start to first active-page chart readiness;
- Home-to-Biomedical and Biomedical-to-Socio-economic page switching;
- editor open and reset completion;
- wizard source selection to usable profile/preview;
- one-chart and four-chart fullscreen entry;
- playback preflight and first synchronized update;
- retained ready-source count after navigating across every page and returning
  Home;
- Chromium heap after startup and after that navigation cycle, where
  `performance.memory` is available.

Use medians for comparisons and preserve the raw measurements in a dated local
verification document. The foundation is successful when instrumentation adds
negligible work, equivalent concurrent requests load once, and eager
compatibility produces the current output. Later stages are successful when
startup and page navigation no longer load unrelated sources and unleased data
can leave the cache.

## Migration Stages

### Stage 0: Compatibility-preserving foundation

- Add request normalization and provider registry.
- Add immutable snapshots, shared cache, leases, failure isolation, events, and
  explicit eviction.
- Extract CSV/upload/inline/GeoJSON transport logic from `loadDashboard.js` into
  providers.
- Route the existing loader through `hydrateAll` and continue returning
  `loadedData` and hydrated profiles.
- Prove behavior with focused unit tests and current loader tests.

This stage changes architecture but intentionally does not improve startup
demand yet.

### Stage 1: Active-page demand

- Make application bootstrap load configuration and profiles without hydrating
  all rows.
- Add a React service context and source-snapshot subscription hook.
- Acquire and release sources by active page.
- Replace direct `dashboard.loadedData[sourceId]` reads in dashboard rendering.

### Stage 2: Wizard and editor demand

- Build source lists from descriptors and tracked profiles.
- Load/profile only the selected source.
- Move source-table viewing and geography selection to explicit leases.
- Remove catalogue-wide wizard profiling.

### Stage 3: Fullscreen and playback demand

- Add union leases for selected fullscreen charts.
- Add all-source playback readiness preflight and session leases.
- Preserve existing temporal interpretation and matching semantics.

### Stage 4: Bounded caches and prepared-view reuse

- Establish limits from measured retained size and load cost.
- Enable LRU eviction of unleased entries.
- Add revision-keyed prepared-view caching only where profiling shows repeated
  preparation dominates.

### Stage 5: Portable source splitting

- Generate the source manifest and per-source payloads.
- Add network and `file://` portable transports.
- Verify the flash-drive package with no network connection.

### Stage 6: Versioned Quorum provider

- Reconcile the final Phase 5 semantic contract.
- Register the optional runtime provider without changing chart APIs.
- Verify that removing the adapter yields the exact standalone participant
  artifact.

The eager `loadedData` compatibility path is removed only after Stages 1–3 have
no remaining runtime consumers.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Refactor changes analytical results | Providers publish raw normalized payloads; `prepareChartData` remains untouched and existing pipeline fixtures stay authoritative. |
| Lazy readiness creates blank charts | Every consumer renders explicit snapshot states and source-local diagnostics. |
| Playback begins with partial data | Acquire the full source union and complete one readiness preflight before Play is enabled. |
| Cache evicts active data | Leases block eviction; active work may exceed the budget temporarily. |
| Huge recursive freezing erases performance gains | Freeze snapshot wrappers only; provider payloads are read-only by contract. |
| Stored profiles drift from loaded rows | Tracked profiles retain fingerprint validation; runtime sources derive profiles from their loaded revision. |
| Portable build still retains all raw text | Split portable source payloads in a dedicated packaging stage after runtime demand works. |
| Quorum changes destabilize dashboard sources | Keep Quorum behind a later adapter and do not persist provisional provider fields. |
| Instrumentation becomes telemetry overhead | Use synchronous local callbacks with metadata only; default handler is a no-op. |
| Shared cache masks descriptor changes | Cache identity includes source kind, path or fingerprint, parsing metadata, and portable/network transport identity. |

## Acceptance Criteria

- The first foundation preserves current hydrated dashboard results and tests.
- Every source has an observable immutable readiness snapshot.
- Equivalent concurrent requests invoke their provider once.
- Uploaded/manual profiling occurs once per ready revision.
- A failed source does not invalidate unrelated ready sources.
- Active leases prevent eviction and release is idempotent.
- Measurements report timing and cache behavior without copying data.
- Chart semantic preparation remains exclusively in the existing Chart System V3
  preparation modules.
- Later consumer migrations can remove eager `loadedData` incrementally, without
  changing persisted chart or dashboard configuration.
- The final architecture supports the same offline dashboard artifact with or
  without a separately registered Quorum adapter.
