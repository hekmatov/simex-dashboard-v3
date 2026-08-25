# Source Content Manager and QMD Reusable Media

**Date:** 2026-08-25
**Status:** User-approved architectural decisions; written amendment proposed for V3 Design master review and final user approval. Unimplemented.
**Applies after:** accepted and implemented Step 7S static-content baseline at implementation HEAD b366ba17fe856aede46ba8301b8a530520e4d2cd and documentation closure db63d8e772ce96b17de19b7a89f256a72926d08d
**Version deviation:** dashboard schema V5 and package bundle V5, with V4 import compatibility; chart configuration remains V3
**Implementation authority:** none. This specification must be master-reviewed and user-approved before implementation planning begins.

## Relationship to Step 7S

The implemented Step 7S result remains intact: engine implemented, UI implemented, 36/36 existing fidelity rows verified Passing, and independent implementation review clean. This amendment does not downgrade or reinterpret that evidence.

The amendment adds a proposed reusable-content layer above the existing authored-asset, dataSources, and datasetProfiles authorities. Every new requirement in this document is proposed and unimplemented. Its fidelity rows live in SOURCE-CONTENT-MANAGER-AMENDMENT-FIDELITY.md; its security and deviation decisions live in SOURCE-CONTENT-MANAGER-AMENDMENT-SECURITY-DEVIATIONS.md.

## Product boundary

- QMD remains the native portable formatted-text panel. Google Docs integration is deferred.
- Every committed uploaded image becomes a dashboard-wide reusable media item.
- Build gains a **Source content** command that opens a Source Content Manager for reusable media and builder-controlled CSV sources.
- Dashboard-generated and intermediate sources remain dashboard-owned and are absent from normal management and pickers.
- The manager exposes uploaded, linked/project, packaged, and conservatively classified legacy-import CSV inputs with explicit origin labels.
- A source is never classified as generated from a filename or path alone. Generated ownership requires explicit trusted provenance.
- The registry is dashboard-contained. This amendment does not introduce an external asset library, cloud account, or shared cross-dashboard service.

## Layered content registry

V5 adds a layered contentRegistry; it does not merge bytes, source descriptors, profiles, and UI metadata into one payload store.

~~~js
contentRegistry: {
  media: {
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
  sources: {
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
- dataSources[sourceId] remains the CSV/GeoJSON descriptor authority.
- datasetProfiles[sourceId] remains the CSV profile authority.
- Content-registry records contain management, origin, provenance, display, current-revision, and health facts. They do not duplicate committed image bytes, CSV payloads, profiles, or placement metadata.

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

- **Uploaded:** builder-uploaded CSV descriptor and profile.
- **Linked/project:** explicitly linked project source with a relink operation.
- **Packaged:** contained dashboard/package CSV.
- **Legacy import:** conservative fallback when V4 evidence cannot prove a stronger origin.
- **Generated:** only when trusted schema provenance explicitly declares dashboard-owned generation/intermediate ownership.

Builder-owned records appear in the manager and chart picker. Dashboard-owned generated/intermediate records do not.

## Direct dependencies and deletion

Deletion never cascades. A referenced media or CSV item cannot be deleted until direct dependencies are removed or replaced.

### Media direct dependencies

- QMD embeddings.
- Static Image panels.
- Open application-session drafts that currently reference the media item.

### CSV direct dependencies

- Each affected chart/panel using the source as its primary sourceId.
- Each affected chart/panel using the source as a secondary map/geo source.

Page and section are breadcrumbs to the dependent panel, not additional dependency records. Chrono groups, Scenes, and presentation compositions are not direct dependencies because they reference charts/panels rather than content records. They may appear only as downstream impact contexts when temporal replacement warnings matter.

Transient Present image messages and active object-URL leases are not durable dependencies. A committed media revision becomes authoritative immediately; active leases may continue safely until released or refresh to the new revision through their existing lifecycle.

Dependency detail shows **Page › Section › Panel**, offers navigation, and offers guided replace/remove actions. Delete remains visibly disabled with an explanation while dependencies exist. If a future schema introduces a new direct owner, the dependency model and UI must expose it.

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

Media and CSV replacement, rollback, staged cleanup, dashboard persistence, and reference reconciliation are one transaction. No partial registry/source/profile/byte publication is permitted.

## Source Content Manager

### Entry and workspace

Build Content commands add **Source content** alongside the existing Add chart and Add static content commands. It opens as a wide, non-modal Build auxiliary workspace.

Opening the manager preserves the dashboard canvas, selected panel, and scroll position. Closing restores the prior selection/scroll and returns focus to the initiating **Source content** control. Browsing is non-modal; destructive confirmation and guided replacement use focused modal dialogs.

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

Labels, filenames, captions, descriptions, provenance summaries, and imported metadata render as text.

### Media detail

Media detail includes preview, dimensions, encoded file size, portability, default description, revision, health, and direct uses. External items show **External** and **Network required**. Missing/corrupt identity and dependencies remain visible until explicit repair.

### Data-source detail

CSV detail includes searchable preview, profile/column summary, origin, provenance, health, update status, direct uses, and downstream temporal impact contexts where relevant. Management supports upload, profile, preview, search, rename label, replace/relink, select, and download where permitted. It does not provide cell editing or derivative mutation.

## Existing authoring-flow integration

- The six-stage Add chart workflow remains exact. Its existing Data source stage selects a managed builder-owned CSV or uploads/profiles/registers one as part of the chart transaction.
- The four-stage Add static content workflow remains exact. Image Content adds **Choose from media** alongside upload and linked origins.
- QMD **Insert image** opens a focused media picker. The picker may select an eligible local item or upload/create one.
- Generated/intermediate sources are absent from the manager and all authoring pickers.

Uploads initiated inside QMD, Image, or chart authoring remain application-session drafts and commit atomically only with the completed panel/chart. Cancel invokes existing safe staged cleanup and creates no unexplained library/source entry.

A manager upload previews and names the candidate, then commits it explicitly with **Add to dashboard**. Once committed, an unused item persists until deliberate deletion.

## QMD reusable-media contract

### Local media syntax

Only a validated local destination creates an image:

~~~qmd
![Context alternative text](simex-media:media-id)
~~~

HTTP, HTTPS, data:, blob:, file:, malformed, unknown, missing, external-only, and unapproved attribute forms remain inert visible text and cause no request.

QMD may embed only a stored or packaged media item whose record, revision, byte identity, MIME, dimensions, and health validate. An existing HTTPS-linked media item remains usable by standalone Image panels and visible in the manager as **External / Network required**, but cannot enter QMD until imported locally.

The media default description pre-fills placement alt in the authoring UI. Each QMD placement owns its alt and may override it or explicitly become decorative. Changing a media default never silently rewrites existing placements.

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

V4 migration creates stable logical media records for existing Static Image origins, rewrites placements to mediaId, and creates source-management records for eligible CSV descriptors. Classification uses explicit provenance; uncertain CSV inputs become legacy-import, never filename-inferred generated.

Bundle/package V5 includes:

- the V5 dashboard and layered registry;
- every retained stored/packaged media record, including unused library items;
- each referenced content-addressed payload exactly once;
- builder-controlled CSV descriptors and profiles through their existing authorities;
- no object URL, ad hoc QMD base64, duplicated panel payload, or silently fetched external image.

Export/import validates media IDs, revisions, hashes, MIME, dimensions, animation state, QMD references, source records, profiles, and contained paths atomically. Missing/corrupt retained media blocks a claim of complete portability unless the item is explicitly external and disclosed as network-required. Package import is all-or-nothing.

## Health, failure, cleanup, and security

Item health is one of **Ready, External, Missing, Corrupt, Needs relink, Needs review**. Health is descriptive state, not permission to discard identity or dependencies.

- Quota, decode, parse, hash, validation, and persistence errors occur before commit.
- Failed CSV refresh/replacement retains the last committed source/profile.
- Missing/corrupt media and source identities remain repairable.
- Startup cleanup respects committed media records, saved sources, open drafts, undo scopes, and active transactions.
- Unsaved recovery remains application-session-only.
- SVG, APNG, animated WebP, active markup, mismatched MIME, unsafe paths/protocols, and arbitrary QMD CSS remain rejected or inert under the existing strict boundaries.
- Authored labels and metadata are text. QMD attributes are allowlisted and tokenized.

## Fidelity and completion gate

The proposed amendment fidelity matrix uses three distinct layers:

1. **Semantic:** schemas, identities, validation, dependencies, replacement decisions, migration, and transaction boundaries.
2. **Composition:** live manager/picker/inspector layout, focus, controls, responsive behavior, and rendered QMD geometry.
3. **Real use:** the eight retained end-to-end journeys named in the amendment matrix.

Planned journeys cannot collapse into label checks or broad smoke tests. Browser checkpoints must inspect meaningful state, geometry, dependencies, navigation, atomic outcomes, and failure isolation at Build 1440×900 and 1024×768, plus QMD View 390×844 and fullscreen where specified. A pure engine or isolated component is not implementation evidence.

Completion submission must separately report engine implemented, UI implemented, and fidelity verified. No proposed row may be promoted while missing, partial, or wired only to a model/test harness.

## Approval gate

This document records the user-approved architectural direction, not approval of the written amendment and not implementation authorization.

Before any implementation plan:

1. V3 Design master reviews this specification and the proposed fidelity/security/deviation records.
2. Exact conflicts and deviations are accepted, revised, or rejected.
3. The user approves the resulting written amendment.
4. Only then may ownership reconciliation and implementation planning begin.
