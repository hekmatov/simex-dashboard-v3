# Source Content Manager and QMD Reusable Media

**Date:** 2026-08-25
**Status:** Final written amendment approved by the V3 Design master and user at `81531b4b939e89b529d0ddee36241e517c33956d`. Unimplemented.
**Applies after:** V3 Design master-accepted and implemented Step 7S static-content baseline at implementation HEAD b366ba17fe856aede46ba8301b8a530520e4d2cd and documentation closure db63d8e772ce96b17de19b7a89f256a72926d08d; the accepted branch is retained and unmerged
**Version deviation:** dashboard schema V5 and package bundle V5, with V4 import compatibility; chart configuration remains V3
**Implementation authority:** production implementation and the final implementation plan remain unauthorized. The approved non-production GeoJSON calibration and ownership-reconciliation prerequisites may proceed.

## Relationship to Step 7S

The V3 Design master-accepted Step 7S result remains intact and retained on its unmerged implementation branch: engine implemented, UI implemented, 36/36 existing fidelity rows verified Passing, and independent implementation review clean. This amendment does not downgrade or reinterpret that evidence.

The amendment adds a proposed reusable-content layer above the existing authored-asset, dataSources, and datasetProfiles authorities. Every new requirement in this document is proposed and unimplemented. Its fidelity rows live in SOURCE-CONTENT-MANAGER-AMENDMENT-FIDELITY.md; its security and deviation decisions live in SOURCE-CONTENT-MANAGER-AMENDMENT-SECURITY-DEVIATIONS.md; exact post-approval existing/proposed/test/browser ownership lives in SOURCE-CONTENT-MANAGER-POST-APPROVAL-OWNERSHIP-INVENTORY.md.

## Product boundary

- QMD remains the native portable formatted-text panel. Google Docs integration is deferred.
- Every committed uploaded image becomes a dashboard-wide reusable media item.
- Build gains a **Source content** command that opens a Source Content Manager for reusable media and builder-controlled CSV and GeoJSON sources.
- Dashboard-generated and intermediate CSV/GeoJSON sources remain dashboard-owned and are absent from normal management and pickers.
- The manager exposes uploaded, linked/project, packaged, and conservatively classified legacy-import CSV and GeoJSON inputs with explicit origin labels where those origins are supported.
- A source is never classified as generated from a filename or path alone. Generated ownership requires explicit trusted provenance.
- The content library is dashboard-contained. This amendment does not introduce an external asset library, cloud account, or shared cross-dashboard service.
- Builder-facing managed-data scope includes CSV and GeoJSON. No additional dashboard, bundle, or chart-configuration version change is introduced beyond the already-approved dashboard V5, bundle V5, and chart configuration V3.

## Layered content library

V5 adds the top-level `contentLibrary`; it does not merge bytes, source descriptors, profiles, and UI metadata into one payload store. The canonical V5 keys are exactly `contentLibrary.mediaItems` and `contentLibrary.sourceEntries`. No alternate canonical names are defined.

~~~js
contentLibrary: {
  mediaItems: {
    [mediaId]: {
      mediaId,
      revision,
      current: {
        kind: "asset" | "package" | "url",
        assetId?,
        path?,
        url?
      },
      displayName,
      defaultDescription,
      origin: "uploaded" | "packaged" | "external" | "legacy-import",
      health: "ready" | "external" | "missing" | "corrupt" | "needs-relink" | "needs-review",
      dimensions?,
      byteLength?,
      mediaType?
    }
  },
  sourceEntries: {
    [sourceId]: {
      sourceId,
      origin: "uploaded" | "linked-project" | "packaged" | "legacy-import" | "generated",
      ownership: "builder" | "dashboard",
      displayName,
      provenance,
      health: "ready" | "missing" | "corrupt" | "needs-relink" | "needs-review",
      updateStatus?
    }
  }
}
~~~

The layers retain their existing authorities:

- mediaId is the stable logical identity used by placements and QMD.
- assets[assetId] plus authored-asset storage remain the content-addressed byte authority.
- dataSources[sourceId] remains the CSV/GeoJSON descriptor and authoritative data-kind owner. Eligible builder-controlled CSV and GeoJSON descriptors receive `contentLibrary.sourceEntries` records keyed by the same `sourceId`; a source entry derives kind from `dataSources` and does not duplicate descriptor or payload authority.
- datasetProfiles[sourceId] remains the CSV profile authority.
- `contentLibrary` records contain management, origin, provenance, display, current-revision, and health facts. They do not duplicate committed image bytes, CSV payloads, profiles, or placement metadata.

Identical image bytes deduplicate physically by asset hash. The UI recommends reuse when a match exists but permits distinct logical mediaId records. Matching CSV content produces a warning only; CSV is not automatically deduplicated.

## Media identity and placement

A Static Image placement references mediaId and retains its own accessibility and presentation settings. Alt/decorative/crop/rotation/fit belong to the placement source; zoom remains placement/surface-local viewer state under the accepted Step 7S transient non-persistence rule and never becomes a media-library default:

~~~js
// dataSources[sourceId]
{
  kind: "staticImage",
  sourceVersion: 2,
  mediaId: "media-...",
  alt: "...",
  decorative: false,
  fit: "contain",
  crop: { x: 0, y: 0, width: 1000, height: 1000 },
  rotation: 0,
  // viewer zoom remains transient and keyed to this placement/surface
}
~~~

QMD embeds the same logical mediaId. A media record may point to content-addressed stored bytes, a contained package item, or an HTTPS external item. Only stored or packaged items are eligible for QMD.

A committed media-library record is itself a durable asset reference. It remains exportable and prevents garbage collection even when no panel or QMD placement currently uses it. This is distinct from session staging: a cancelled uncommitted draft creates no library record.

## Origins, ownership, and classification

### Media

- **Uploaded:** locally committed PNG/JPEG/WebP bytes in authored-asset storage; portable.
- **Packaged:** validated dashboard-owned contained path or package payload; portable.
- **External:** validated HTTPS source; marked **Network required** and not QMD-eligible until imported locally.
- **Legacy import:** migrated identity whose provenance is known to be imported but cannot be classified more specifically without evidence.

### Data sources

- **Uploaded:** builder-uploaded CSV descriptor/profile or validated GeoJSON descriptor/payload.
- **Linked/project:** explicitly linked CSV or GeoJSON project source with a relink operation.
- **Packaged:** contained dashboard/package CSV or GeoJSON.
- **Legacy import:** conservative CSV/GeoJSON fallback when V4 evidence cannot prove a stronger origin.
- **Generated:** only when trusted schema provenance explicitly declares dashboard-owned CSV/GeoJSON generation or intermediate ownership.

Builder-owned CSV and GeoJSON `contentLibrary.sourceEntries` records appear in the manager and eligible chart-authoring selectors. Dashboard-owned generated/intermediate records do not.

## Direct dependencies and deletion

Deletion never cascades. A referenced media, CSV, or GeoJSON item cannot be deleted until saved direct uses and actual active drafts, active replacement state, and active transactions that retain it are resolved.

### Visible direct use

- Media: QMD embeddings and Static Image panels.
- CSV: each chart/panel whose primary `sourceId` is the managed CSV, including a map chart.
- GeoJSON: each map chart/panel whose `chart.presentation.map.geoSource` is the managed GeoJSON `sourceId`.

### Draft use

- Open application-session QMD, Image, or chart-authoring drafts, active replacement state, and active transactions that retain the media item, CSV, or GeoJSON are temporary deletion blockers.

### Reversible-state boundary

- Build **Reset** remains the whole-unsaved-session reset. The current application has no CSV or GeoJSON undo. This amendment does not introduce Ctrl/Cmd+Z, a global media/CSV/GeoJSON history, or global Build Undo/Redo controls; any future global undo system is a separate design initiative.
- The existing Image-authoring replacement snapshot is contextual and owned only by the active Image draft/replacement state. The action is renamed **Restore previous image** and remains visibly beside the replacement status/action area until Save, Discard, or restore resolves it.
- While that active replacement state retains the prior image, it is a deletion blocker. Once Save, Discard, or **Restore previous image** resolves the draft, no general undo dependency remains. Deletion and draft/transaction cleanup never create a dangling `mediaId` or `sourceId`.

Page and section are breadcrumbs to the dependent panel, not additional dependency records. Chrono groups, Scenes, and presentation compositions are not direct dependencies because they reference charts/panels rather than content records. They may appear only as downstream impact contexts when temporal replacement warnings matter.

Transient Present image messages and active object-URL leases are not durable dependencies. A committed media revision becomes authoritative immediately; active leases may continue safely until released or refresh to the new revision through their existing lifecycle.

Dependency detail shows **Page › Section › Panel** for saved direct panel use, offers navigation, and offers guided replace/remove actions. Delete remains visibly disabled with an inline explanation while a saved direct use, actual active draft/replacement state, or active transaction exists; this disabled action does not open a confirmation dialog. Only an eligible delete opens the destructive confirmation modal. If a future schema introduces a new direct owner, the dependency model and UI must expose it.

## Replacement semantics

### Media replacement

- **Replace library file everywhere** preserves mediaId, creates the next positive revision, and atomically updates all uses.
- Placement-specific alt/decorative/crop/rotation/fit and placement/surface-local zoom state are not overwritten by the library replacement.
- The replacement passes the existing raster signature, structure, decode, MIME, dimensions, animation, size, quota, and persistence checks before commit.
- A failed replacement changes neither the media record nor any placement and retains the previous committed bytes.
- **Change image here** changes only the current QMD/Image placement to another mediaId; it is not a global library replacement.

### CSV replacement and relink

- Stored sources expose **Replace file**. Linked/project sources expose **Relink**.
- The operation preserves sourceId only after parsing, safety, size, profile, and direct-chart validation.
- Parse/safety/size failure or direct structural invalidity—such as a missing encoding column—hard-blocks replacement.
- Temporal-field, observation-range, frame, and availability changes are warnings, not blockers.
- Warnings identify potentially affected Chrono groups, Scenes, and presentation compositions as downstream impact contexts.
- On confirmed warning-bearing replacement, affected temporal configurations receive explicit needs-review or degraded status where appropriate.
- A structurally incompatible replacement makes no change and offers **Import as new source** plus guided remapping.
- Failed refresh/replacement retains the last committed descriptor, profile, and usable runtime data.

### GeoJSON replacement and relink

- Stored GeoJSON exposes **Replace file**. Linked/project GeoJSON exposes **Relink**.
- Compatible replacement preserves `sourceId` only after the candidate passes the single GeoJSON validation authority and direct-map structural validation.
- Malformed, empty, or unsupported GeoJSON; validation/limit failure; removal of an explicitly selected join property; or a candidate that makes a directly dependent map structurally unusable hard-blocks replacement.
- Changed feature count, bounding box, geometry-type mix, or reduced-but-nonzero identifier/join coverage warns but may be confirmed. GeoJSON changes do not themselves create Chrono Group, Scene, or presentation-composition temporal warnings.
- A structurally incompatible replacement makes no change and offers **Import as new source** plus guided remapping.
- GeoJSON upload safety requires the warning and hard-cap limits established by the pre-implementation calibration gate below and owned by one validation authority. No production task or test may encode guessed numeric values.

Media, CSV, and GeoJSON replacement, rollback, staged cleanup, dashboard persistence, and reference reconciliation are one transaction. No partial content-library/source/profile/payload publication is permitted.

## GeoJSON limit-calibration gate

The user is not expected to select numeric GeoJSON limits. The approved bounded disposable calibration ran after written amendment approval and published `.planning/spikes/001-geojson-limit-calibration/README.md` plus `docs/audits/2026-08-24-v3-static-content-panels/GEOJSON-LIMITS-DECISION.md`. The spike is planning evidence, not production implementation, and did not modify production source, production tests, manifests, dependencies, or generated catalogues.

The current four legitimate project GeoJSON files—`gemeente_2020.geojson`, `gemeente_2021.geojson`, `gemeente_2026.geojson`, and `netherlands-provinces.geojson`—provide this verified baseline:

| Baseline fact | Verified value | File |
|---|---:|---|
| Largest encoded file | 193,816 bytes | `gemeente_2021.geojson` |
| Maximum features | 355 | `gemeente_2020.geojson` |
| Maximum total coordinate positions | approximately 6,630 | `gemeente_2021.geojson` |
| Maximum positions in one feature | 196 | `netherlands-provinces.geojson` |

The corpus contains shallow Polygon/MultiPolygon geometry with flat properties. It is sufficient to protect current legitimate fixtures but insufficient by itself to set warning or hard caps.

Disposable fixture ladders must vary these dimensions independently so one dimension does not conceal another:

- encoded bytes;
- feature count;
- total geometry/coordinate-position count;
- positions concentrated in one feature;
- parts and rings;
- property-key count and property-value volume;
- nesting and GeometryCollection depth;
- accepted geometry types;
- concurrent active maps.

The spike exercised actual Chromium paths for upload/read, parse/validation/summary, preview-equivalent map rendering, replacement-compatibility equivalent, persistence/reload, map registration/render, pan/zoom/resize, and package export/import. Because the manager is unimplemented, the decision record names each current-production substitution. It used Build at 1440×900 and 1024×768 plus a pinned 1024×768, 4× CPU, 512 MiB V8 old-space profile.

For each phase and fixture step, record median and p95 latency, main-thread long tasks, time to first usable preview/map, interaction responsiveness, memory and serialized footprint, and rollback behavior. Select separate warning and hard-cap thresholds from observed performance or memory knees, with margin above every legitimate project fixture. Encoded bytes alone are never sufficient.

Join compatibility and identifier coverage remain replacement outcomes, not resource-size limits. The limit checker must itself be bounded against adversarial nesting and coordinate complexity so determining whether input is safe cannot become the denial-of-service path.

The calibrated limits, proposed single authority, rationale, corpus facts, fixture generators, environment, measurements, knees, margins, and rollback evidence are published in `docs/audits/2026-08-24-v3-static-content-panels/GEOJSON-LIMITS-DECISION.md`:

- below the warning threshold: accept normally;
- from warning through the safe pre-cap range: warn and allow only where the measured path remains safe;
- above a hard resource or nesting cap: reject before commit.

The master reviews this technical guardrail. The calibration result returns to the user only if it would exclude a legitimate intended dataset or creates a material UX tradeoff; otherwise the user is not asked to choose the numbers. The approved limits decision is a prerequisite to the final implementation plan. No GeoJSON production task or test may be written with guessed values.

## Source Content Manager

### Entry and workspace

Build Content commands add **Source content** alongside the existing Add chart and Add static content commands. It opens as a wide, non-modal Build auxiliary workspace.

Opening the manager preserves the dashboard canvas, selected panel, and scroll position. Closing restores the prior selection/scroll and returns focus to the initiating **Source content** control. Browsing is non-modal. Only an eligible deletion opens a destructive confirmation modal; a blocked deletion stays disabled with inline explanation and guided dependency navigation. Replacement and relink use focused modal dialogs.

The manager never changes the existing phone policy: Build remains unsupported on phone-sized viewports.

### Responsive composition

- **Desktop, 1440×900:** Media/Data sources tabs above a side-by-side list and detail view.
- **Tablet, 1024×768:** list-to-detail navigation with a predictable **Back** action; state, search, filters, and focused item survive the transition.
- List/detail regions do not create document horizontal overflow. Visible keyboard focus is never obscured.

### Shared catalogue behavior

Both tabs provide:

- search;
- origin, health/status, and usage filters;
- add/import action;
- name, type, origin, health, and usage summary;
- selected-item preview and metadata;
- **Used by** with Page › Section › Panel breadcrumbs;
- rename label, replace/relink, delete, navigation, and guided remediation.

Data Sources additionally provides a **CSV / GeoJSON** kind filter.

Labels, filenames, captions, descriptions, provenance summaries, and imported metadata render as text.

### Media detail

Manager media creation can set the default description. Media detail includes preview, dimensions, encoded file size, portability, an editable default description, revision, health, and direct uses. Changing the default description never rewrites alt text on existing QMD or Image placements.

An External / Network required HTTPS image item shows **Import as local media** in Media detail. That action creates a new stored `mediaId` only after either a local upload or a browser-permitted direct HTTPS fetch passes the full existing raster validation pipeline. It leaves the external media record and every existing standalone Image use unchanged. It never uses a proxy, privilege escalation, silent fetch, or CORS bypass; when direct fetch is unavailable, the user must provide a local file upload. It does not apply to CSV, GeoJSON, stored/packaged media, or arbitrary URLs typed in QMD. Missing/corrupt identity and dependencies remain visible until explicit repair.

### Data-source detail

CSV detail includes searchable table preview, dataset profile/column summary, origin, provenance, health, update status, direct uses, and downstream temporal impact contexts where relevant.

GeoJSON detail does not claim `datasetProfiles` or a CSV table preview. It provides feature count, geometry-type distribution, bounding box, property keys, origin, provenance, health, update status, direct map uses, and a bounded map preview with an accessible textual fallback.

Data-source management supports CSV and GeoJSON upload, type-appropriate validation/summary/preview, search, rename label, replace/relink, select, and download where permitted. It does not provide cell/feature editing or derivative mutation.

## Existing authoring-flow integration

- The six-stage Add chart workflow remains exact. Its existing Data source stage selects a managed builder-owned CSV or uploads/profiles/registers one as part of the chart transaction. The map-geography portion of that unchanged workflow selects eligible tracked, packaged, or uploaded GeoJSON and supports **Upload GeoJSON** without adding or removing a stage.
- The four-stage Add static content workflow remains exact. Image Content adds **Choose from media** alongside upload and linked origins.
- QMD **Insert image** opens a focused media picker. The picker may select an eligible local item or upload/create one. When an External / Network required HTTPS image cannot be inserted directly, the picker offers **Import as local media** and returns/selects the newly validated local QMD-eligible item without changing the external record or its existing Image placements.
- Generated/intermediate sources are absent from the manager and all authoring pickers.

Uploads initiated inside QMD, Image, or chart authoring—including GeoJSON upload in map geography—remain application-session drafts and commit atomically only with the completed panel/chart. Cancel invokes existing safe staged cleanup and creates no unexplained library/source entry.

The current authoring selector has a planning-visible integration gap: runtime and storage recognize both tracked `kind: "geojson"` and dataset `type: "uploadedGeoJson"`, but `validatedGeoSourceOptions` currently admits only tracked `kind: "geojson"`. Planning must reconcile that selector with the accepted eligible uploaded/packaged GeoJSON representations without changing the six workflow stages.

A manager upload previews and names the candidate, then commits it explicitly with **Add to dashboard**. Once committed, an unused item persists until deliberate deletion.

## QMD reusable-media contract

### Local media syntax

Only a validated local destination creates an image:

~~~qmd
![Context alternative text](simex-media:media-id)
~~~

HTTP, HTTPS, data:, blob:, file:, malformed, unknown, missing, external-only, and unapproved attribute forms remain inert visible text and cause no request.

QMD may embed only a stored or packaged media item whose record, revision, byte identity, MIME, dimensions, and health validate. An existing HTTPS-linked media item remains usable by standalone Image panels and visible in the manager as **External / Network required**, but cannot enter QMD directly. **Import as local media** creates and selects a new stored, QMD-eligible `mediaId` through local upload or a browser-permitted direct HTTPS fetch that passes the full validation pipeline; it never mutates the external identity or existing placements. It is an explicit picker/detail action for an existing external media item, never a conversion of an arbitrary raw-QMD URL.

The media default description, set during manager creation or edited in media detail, pre-fills alt for each new QMD or Image placement. Each placement owns its alt and may override it or explicitly become decorative. Changing a media default never silently rewrites existing placements.

### Validated attribute subset

The canonical extended form is:

~~~qmd
![Context alternative text](simex-media:media-id){width=50% align=center flow=block frame=none caption="Visible caption" decorative=false}
~~~

Only these attributes serialize:

- width: presets 25/33/50/66/75/100 percent, or an integer custom percentage from 10 through 100;
- align: start, center, or end; UI labels may read Left/Centre/Right, but rendering uses logical direction for RTL;
- flow: block, wrap-start, or wrap-end;
- frame: none, outline, or card;
- caption: optional visible text distinct from alt;
- decorative: true or false; true requires an empty accessible alt at runtime.

Unknown, duplicated, malformed, out-of-range, or arbitrary style/class/event attributes remain inert text. There is no arbitrary CSS, pixel dimensions or position, border style, absolute/free positioning, or inline style serialization.

### Placement inspector

Selecting an embedded image opens a progressive inspector:

- **Primary:** width presets/custom percentage, Left/Centre/Right, Block/Wrap left/Wrap right.
- **More:** None/Subtle outline/Card frame, visible caption, alt/decorative, **Change image**, and **Open media item**.

Wrapped images have an effective maximum width of 50% of the content column. Narrow panels collapse wrapping to block while retaining the authored flow token. Width is relative to the content column and height remains automatic.

### Runtime rendering

- Preserve intrinsic aspect ratio and reserve stored dimensions to prevent layout shift.
- Constrain output to the content column; never create panel/document horizontal overflow.
- Lease runtime object URLs only; never serialize blob: URLs, base64 payloads, or duplicated panel bytes.
- Missing/corrupt media retains logical identity and direct dependencies.
- Build provides repair navigation; View/fullscreen use a bounded passive explanation.

## Versioning, migration, export, and import

This amendment is the user-approved deviation from V4 to V5:

- dashboard schema V5;
- package bundle V5;
- V4 dashboard/package import remains supported and migrates before V5 validation;
- chart configuration remains V3.

V4 migration creates stable logical media records under `contentLibrary.mediaItems` for existing Static Image origins, rewrites placements to `mediaId`, and creates `contentLibrary.sourceEntries` records for eligible builder-controlled CSV and GeoJSON descriptors. Classification uses explicit provenance; uncertain CSV/GeoJSON inputs become legacy-import, never filename/path-inferred generated.

Bundle/package V5 includes:

- the V5 dashboard and `contentLibrary`;
- every retained stored/packaged media record, including unused library items;
- each referenced content-addressed payload exactly once;
- builder-controlled CSV and GeoJSON descriptors/payloads through `dataSources`, with CSV profiles only through `datasetProfiles`;
- no object URL, ad hoc QMD base64, duplicated panel payload, or silently fetched external image.

Export/import validates media IDs, revisions, hashes, MIME, dimensions, animation state, QMD references, source records, profiles, and contained paths atomically. Missing/corrupt retained media blocks a claim of complete portability unless the item is explicitly external and disclosed as network-required. Package import is all-or-nothing.

## Health, failure, cleanup, and security

Item health is one of **Ready, External, Missing, Corrupt, Needs relink, Needs review**. Health is descriptive state, not permission to discard identity or dependencies.

- Quota, decode, parse, hash, validation, and persistence errors occur before commit.
- Failed CSV refresh/replacement retains the last committed source/profile; failed GeoJSON refresh/replacement retains the last committed descriptor/payload.
- Missing/corrupt media and source identities remain repairable.
- Startup cleanup respects committed media records, saved sources, actual open drafts, active Image replacement state, and active transactions. It assumes no global/restorable content-history owner.
- Unsaved recovery remains application-session-only.
- SVG, APNG, animated WebP, active markup, mismatched MIME, unsafe paths/protocols, and arbitrary QMD CSS remain rejected or inert under the existing strict boundaries.
- Authored labels and metadata are text. QMD attributes are allowlisted and tokenized.
- **Import as local media** never proxies or silently fetches an external image, elevates browser privileges, or bypasses CORS. A direct HTTPS fetch is attempted only through browser-permitted behavior; otherwise local upload is required, and either path must pass the complete existing validation pipeline before the new stored item commits.

## Fidelity and completion gate

The proposed amendment fidelity matrix contains 36 unimplemented rows across three distinct layers:

1. **Semantic:** schemas, identities, validation, dependencies, replacement decisions, migration, and transaction boundaries.
2. **Composition:** live manager/picker/inspector layout, focus, controls, responsive behavior, and rendered QMD geometry.
3. **Real use:** the eleven retained end-to-end journeys named in the amendment matrix.

Planned journeys cannot collapse into label checks or broad smoke tests. Browser checkpoints must inspect meaningful state, geometry, dependencies, navigation, atomic outcomes, and failure isolation at Build 1440×900 and 1024×768, plus QMD View 390×844 and fullscreen only where specified for QMD/media. GeoJSON journeys use the two material Build viewports unless a future accepted fidelity decision proves another map-output viewport material. A pure engine or isolated component is not implementation evidence.

Completion submission must separately report engine implemented, UI implemented, and fidelity verified. No proposed row may be promoted while missing, partial, or wired only to a model/test harness.

## Approval and calibration gate

The V3 Design master and user approved the final written amendment at `81531b4b939e89b529d0ddee36241e517c33956d`. This approves the design, not production implementation or any fidelity promotion.

The bounded GeoJSON calibration prerequisite is complete and found no legitimate-dataset exclusion or material user-level UX tradeoff. Its technical guardrail is submitted to the master in `GEOJSON-LIMITS-DECISION.md`; SCM-S15 remains proposed, unimplemented, and not verified. The exact post-approval ownership reconciliation is also complete in `SOURCE-CONTENT-MANAGER-POST-APPROVAL-OWNERSHIP-INVENTORY.md`. The final implementation plan may begin only after the master accepts both prerequisite results. No GeoJSON production task or test may encode guessed or alternate limits.
