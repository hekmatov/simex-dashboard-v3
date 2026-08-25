# Task 4 report — durability, export/import, and offline packaging

Date: 2026-08-25

Branch: `codex/static-content-panels-implementation`

Starting point: `490262c`

Atomic implementation commit: `ead7ec641b5904428cd9287fc26336fd95200bf5`. The fix-round commit includes this updated report; its resulting hash is reported to the controller after commit.

## Status

Implementation complete, review pending. Fix round 1/5 addresses all 6 requested findings (5 Important, 1 Minor); 0 are open. Task 4 replaces the bounded Slice 2/3 session bridges with one dashboard-v4/IndexedDB durability authority, upgrades the existing canonical bundle boundary to v4 while retaining contained chart v3, makes import atomic, verifies export dependencies and authored bytes, and materializes authored assets under contained offline-package paths.

The retained Free-text and Image reload checkpoints are closed. Free-text remains excluded from Present/Audience and all temporal systems. The currently wired passive separate Audience page was exercised only as a local-asset portability smoke check; Slice 6 still owns protocol/reconnect/composition/failure fidelity. Slice 5 still owns full Build/View composition review.

## Implemented ownership

### Durable authored bytes and lifecycle

- `browserAuthoredAssetStore.js` owns content-addressed IndexedDB records, immutable copied bytes, staged/durable states, transaction identity, inventory/removal, hash-checked reads, typed unavailable/quota/missing/corrupt failures, and per-window refcounted object URL leases.
- `durableStaticPanelCommit.js` stages accepted session bytes, publishes the prepared dashboard through the existing serialized commit controller, commits asset records afterward, and rolls back only newly staged records on failure.
- `assetReferenceGraph.js` protects saved manifest/source, draft, undo, and live-transaction references. `staticPanelTransaction.js` removes superseded source/manifest ownership only after the last panel reference disappears. `reconcileAuthoredAssets.js` never deletes referenced assets, promptly reclaims durable orphans, and applies the exact 24-hour grace only to unreferenced staged records.
- Only authored bytes enter IndexedDB. Static drafts remain application-session-only; no binary, object URL, QMD draft, alt draft, or transform draft enters localStorage. `configurationForStorage` also avoids duplicating unchanged tracked dataset profiles, preventing localStorage quota loss after import.

### Dashboard v4 and canonical migration

- Dashboard schema is v4 and bundle schema is v4; contained charts continue to validate as chart config v3. The historical `dashboardBundleV3.js` remains the single storage/bundle boundary.
- v3 input migrates before validation. Legacy Image URL and safe package-path rows become typed `staticImage`; `blob:`, data URL, traversal, and otherwise unsafe origins become deterministic `replacementRequired` sources. `fill` normalizes to `contain` with a warning, missing alt is recorded, IDs stay stable, and a second migration is byte-for-byte idempotent.
- Static membership is removed from legacy Chrono Groups. Only groups/Scenes made invalid by that static membership are removed, mixed groups retain ordinary chart members, and unrelated missing-parent/empty-Present Scenes remain for unchanged strict validation to reject.
- Typed static sources route before dataset dependency checks and are excluded from dataset providers/profiling. Static panels remain rejected by the central Chrono boundary and never enter Scenes.

### Export, import, and offline package

- Bundle v4 carries a complete byte-free dashboard manifest plus verified `assetPayloads`. Local payloads include base64, byte length, media type, and SHA-256; linked HTTPS Images remain explicit network dependencies.
- Export preflight reads every referenced authored asset by identity and refuses missing/hash-corrupt bytes. It does not silently fetch or embed network dependencies.
- Import validates/migrates the whole candidate and verifies payload/reference/hash/MIME/raster decode plus existing deduplicated bytes before mutation. It stages all bytes, requires an atomic multi-asset commit boundary, persists one dashboard replacement before publishing it, and rolls back on staging/replacement failure. A later byte-commit failure is reported while the persisted replacement and its referenced staged journal remain recoverable at startup.
- Promotion materializes local payloads at generated `data/authored/<sha256>.<ext>` paths, rewrites the typed source to a package origin, removes the browser-only manifest, enforces package-root containment, preserves linked dependency disclosure, and serves PNG/JPEG/WebP with exact MIME. Portable data generation preserves package paths without treating them as datasets.

## Strict RED → GREEN record

1. Authored store RED: required modules were absent. GREEN: 7/7 for stage/deduplicate/commit/read, typed failures/quota, immutable hash, and last-release URL revocation.
2. Reference cleanup RED: no reachability/grace authority existed. GREEN: 3/3 for saved/draft/undo/transaction protection, exact 24-hour boundary, and referenced-asset nondeletion.
3. Migration/temporal RED: v3 Image rows had no deterministic v4 converter and the Chrono boundary admitted generic membership. GREEN: 5/5 for URL/package/replacement classification, idempotence, chart-v3 retention, mixed-group isolation, Scene cleanup, and explicit static rejection.
4. Canonical schema/bundle RED: storage and bundle still emitted v3 and could not represent authored payloads/dependencies. GREEN: 57/57 for dashboard v4, bundle v4, contained chart v3, migration-first parsing, verified payloads, runtime-state exclusion, and existing chart/source contracts.
5. Loader RED: v4 and typed static sources were rejected or sent to tabular loading. GREEN: 2/2 for v4 hydration, provider/profile bypass, and source-scoped missing/corrupt state.
6. Export/import RED: candidate/export/import lacked authored payload envelopes, preflight, and transaction staging. GREEN: 16/16 for candidate metadata, verified export/dependency disclosure, missing/corrupt rejection, complete staging, one replacement, and rollback; strict invalid-raster import remained 5/5.
7. Durable App bridge RED: the old session projection dropped typed panels/assets from durable storage. GREEN: staged Image commits persist dashboard v4 plus a byte-free durable manifest, reload through the IndexedDB resolver, and ordinary chart commits continue unchanged.
8. Resolver lifecycle RED: async durable resolution had no final lease release. GREEN: focused pending/supersession/rejection/release behavior passed; final `ChartView` cleanup releases window-local leases.
9. Offline promotion RED: authored payloads were not materialized and WebP/root containment was incomplete. GREEN: 4/4 for hashed paths, payload bytes, linked disclosure, containment, static-path bypass, and raster MIME.
10. Production import RED: after a valid 36.16 MB import, reload lost the authored panels. Inspection showed unchanged tracked profiles were duplicated into localStorage after tracked sources became uploaded descriptors, exhausting quota and leaving the replacement session-only. Focused RED was `true !== false`; GREEN stores profiles only for CSV/uploaded CSV when they differ from the tracked fallback, and the full fresh-context reload/offline journey passed.
11. Retained IM-06 RED after durability: stored source/transform were exactly equal before/after reload, but the final lazy panel was never activated by the assertion. GREEN corrected the retained test to scroll the canonical panel before checking the raster; production behavior then passed in 12.7 seconds.
12. Impacted SSR RED after durable async resolution: the metadata-only test expected immediate Image markup but correctly received `Loading saved image…`. GREEN injects its synchronous session resolver for the metadata assertion; production async behavior remains covered separately, and the focused renderer suite passed 7/7.
13. Migration-authoring audit RED: a migrated nondecorative Image with the allowed `missing-alt` warning could be finalized by a later authoring save without correction. GREEN keeps the migrated panel viewable, blocks entry/finalization until alt is authored or decorative is explicit, and clears migration warnings from the later authored source; the focused migration/draft/transaction suite passed 26/26.

## Fix round 1/5 strict RED → GREEN

1. Orphan ownership RED: replacement unioned old manifest/source entries indefinitely and canonical Build removal exposed a live-looking button with no callback. Unit RED first failed on missing prune/remove ownership; the production RED timed out at 180 seconds waiting for a removal confirmation that never opened. GREEN prunes only superseded unshared static ownership, routes canonical removal, reconciles after static save/remove/import/startup even for zero assets, and recovers referenced staged journals. Focused cleanup/transaction coverage passed within the 53/53 run; the production inventory journey passed 1/1 in 38.7 seconds.
2. Import quota RED: a real `Storage.prototype.setItem` `QuotaExceededError` closed review and published imported panels session-only. GREEN adds a strict `replaceWith` persistence boundary: failure rolls back staged candidate assets, leaves controller/current dashboard and localStorage unchanged, preserves prior IndexedDB records, retains review, and reports quota. Exact browser journey passed 1/1 in 24.1 seconds.
3. Commit/dedup RED: dedup trusted metadata without re-hashing stored bytes, and a later asset commit could fail after dashboard persistence without a defined authority. GREEN re-hashes deduplicated records, preflights staged records, commits batches in one IndexedDB transaction, refuses multi-asset import without an atomic batch API, and preserves a referenced staged transaction journal if the postreplacement batch fails. Corrupt-dedup and injected unit failures pass; the browser journal/reload journey passed 1/1 in 18.3 seconds.
4. Async lease RED: rapid source changes and unmount timed out with unreleased resolved leases. GREEN tracks resolution-model release identity and releases stale, current, rejected/inert, and post-unmount completions exactly once. Browser-backed focused cases pass within the 53/53 run.
5. Migration scope RED: isolation silently removed unrelated missing-parent and empty-Present Scenes. GREEN tracks only groups removed due to static membership and rewrites/drops only Scenes containing that static cause; the unrelated corpus reaches and fails unchanged strict `sceneSchema` validation. Migration corpus is 5/5 and idempotent.
6. Operator text inspection RED: README implied `package:flashdrive` alone included browser-authored bytes and generated `START_HERE.md` repeated that claim. GREEN documents the exact app export → project-root `packaged-dashboard-bundle.json` → `pnpm.cmd promote:bundle` → review → `pnpm.cmd package:flashdrive` sequence. The generator ran successfully and the actual emitted instructions were inspected; the physical launcher was not launched.

## Migration corpus

| Input | Canonical v4 result |
|---|---|
| HTTPS legacy Image row | Typed URL origin; stable panel/source IDs; chart remains v3 |
| Safe relative PNG/JPEG/WebP path | Typed package origin |
| `blob:`, data URL, traversal/unsafe path | `replacementRequired` plus stable warning |
| Legacy `fit: fill` | `contain` plus `legacy-fit-fill` warning |
| Missing nondecorative alt | Preserved empty alt plus `missing-alt` migration warning for later correction |
| Static member in sole Chrono Group/Scene | Static membership removed; now-invalid group/Scene removed |
| Static member in mixed Chrono Group | Static member removed; ordinary member and placement preserved |
| Unrelated Scene with missing parent or empty Present | Left unchanged by migration and rejected by strict Scene validation |
| Already migrated dashboard v4 | Returned idempotently without mutating the v3 input or changing contained chart versions |

## Asset and reference decisions

- Asset identity is `asset-<sha256>` and transform changes never change it.
- Dashboard JSON carries media type, byte length, dimensions, hash, and storage state, never bytes or URLs.
- Staged assets are transaction facts, not draft recovery. Unsaved authoring fields cannot be reconstructed after reload.
- A referenced asset is never eligible for deletion. Unreferenced staged records remain recoverable for exactly 24 hours. Durable orphans are reclaimed after successful replacement/removal/import reconciliation.
- Object URLs are window-local leases. The store creates one URL per window/asset, increments references, and revokes only after the final release.
- Linked HTTPS Images are intentionally not fetched during export. Their URLs are declared as network dependencies and remain panel-scoped failures offline.

## Browser and offline evidence

- Production Chromium at 1440×900 authored Free-text containing literal script and remote-image syntax plus a strict local PNG through the separate four-stage workflow. Dashboard v4 persisted exact QMD/revision and a byte-free durable Image manifest; localStorage contained no data URL.
- Original-context reload rendered both panels. The retained FT-11 exact QMD/revision checkpoint passed in 10.9 seconds; IM-06 exact original asset/source/transform plus visible image passed in 12.7 seconds after lazy-panel activation.
- One 36.16 MB bundle v4 export was reused across three fresh-context paths. Missing payload and hash-corrupt payload were rejected before review/replacement and left the clean dashboard unchanged. The original valid package reviewed, staged, replaced once, reloaded, and rendered both panels.
- After service-worker activation, the fresh context was switched offline and reloaded again. Local Image rendered in ordinary View and fullscreen; Free-text preserved literal inert source with zero script/iframe/image/resource nodes.
- At 768×900 the fresh imported page had `documentWidth <= viewportWidth`. Manual fresh-origin inspection likewise confirmed exact reloaded Free-text and safe-DOM containment at 1440×900 and 768×900.
- At 1440×900, while offline, the currently wired separate Audience page resolved and displayed the local Image passively. This proves the durable per-window asset path used by the existing capability, not Slice 6 protocol/reconnect/composition completeness.
- Fix round production evidence at 1024×768: quota import preserved exact prior localStorage/IndexedDB and did not publish imported panels; replacement/removal measured manifest/record byte budgets across deduplicated sibling survival and final reclamation; injected postreplacement durable commit failure left one staged transaction journal and reload promoted it to durable.
- The retained fresh-context/offline journey was rerun with a compact static-only bundle to avoid redundant 36.16 MB tracked payload cycles. It passed 1/1 in 30.3 seconds at 1440×900 and 768×900 through missing/corrupt rejection, import/reload, network-disabled reload, main/fullscreen, inert Free-text DOM inspection, and the currently wired passive Audience Image.
- Production build passed with 890 modules transformed. The offline browser journey used the production build/server and network-disabled reload. The physical flash-drive copy/launcher itself was not launched; generated-path/MIME/root containment is deterministic engine evidence.

## Checks and results

- Original Task 4 directly impacted engine command: 218/218 passed in 8.59 seconds. Fix round 1/5 focused command: 53/53 passed in 11.54 seconds. Fix round impacted canonical/bundle/export/render/schema command: 124/124 passed in 12.00 seconds.
- Authored store: 7/7 passed. Migration/temporal: 6/6 passed. Final migration/draft/transaction regression set: 26/26 passed. Bundle/canonical: 57/57 passed. Static loader bypass: 2/2 passed. Export/candidate/import: 16/16 passed. Invalid-raster import: 5/5 passed. Offline promotion: 4/4 passed. Quorum catalogue: 39/39 passed. Focused App/localStorage quota regression: 1/1 passed.
- Fix-round Playwright: compact fresh-context/offline 1/1 (30.3s); quota rollback 1/1 (24.1s); replacement/removal/reload inventory 1/1 (38.7s); postreplacement staged-journal recovery 1/1 (18.3s). Retained reload specs remain FT-11 1/1 and IM-06 1/1.
- Production build: passed, 890 modules transformed. Existing advisories only: Three/Vanta classic scripts, mixed static/dynamic `ChartFootprintPicker`, and large chunk size.

## Skips, deferrals, and baseline anomalies

- Slice 5 owns complete Build/View composition/restoration and is not promoted here.
- Slice 6 owns Present protocol v3, reconnect, ordering, multi-cell Audience composition, and Audience failure isolation. Free-text stays excluded. Only the existing passive Image surface was smoke-tested for offline asset resolution.
- The flash-drive package generator ran and its actual `START_HERE.md` was inspected. The copied-folder Windows launcher was not launched. Its generated asset/path/MIME contract passed deterministic checks; the production build itself was served and reloaded offline.
- The broad repository `chronoGroupModelV3` command retains six inherited playback-state drift failures. Task 4 neither changes nor claims them.
- Vite-backed Node tests fail inside the restricted Windows filesystem sandbox with `Cannot read directory "../../../../../.."` / unresolved `vite.config.js`; the identical escalated commands reached and passed product assertions.
- A stale service-worker cache on an earlier development origin served obsolete code. The journey moved to a fresh origin/context; no product change was made for that test-environment artifact.

## Deviations

- No dashboard/chart version deviation: dashboard v4 and bundle v4 are implemented exactly as approved; contained chart configuration remains v3.
- No Free-text security deviation beyond the already approved permissive inert-text override. Task 4 introduced no sanitizer, deny-list, DOMPurify, executable HTML, or external resource loading from text.
- No Image security relaxation. PNG/JPEG/WebP structure/decode, animation, size, dimension, quota, origin, and accessibility checks remain strict.
- No fix-round design conflict. For the explicitly permitted postreplacement failure branch, the implementation keeps the already-persisted replacement authoritative and preserves its referenced staged bytes as a recoverable journal; it does not attempt a destructive rollback to mixed old/new authority.
- Compacting the retained browser bundle to its static panels is a verification-boundary optimization only. It does not change production export/import code or replace the original 36.16 MB portability evidence.
- The only verification-boundary skip is launching a copied physical flash-drive folder. Offline production build/serve, service-worker reload, contained asset materialization, MIME, and path containment were still exercised at the appropriate engine/browser layers.
