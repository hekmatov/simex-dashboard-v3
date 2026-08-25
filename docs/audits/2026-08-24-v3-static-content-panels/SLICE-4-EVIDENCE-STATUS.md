# Slice 4 durability and portability evidence

Date: 2026-08-25

Status: implementation complete, review pending

## Layer status

| Area | Engine | UI/composition | Fidelity |
|---|---|---|---|
| Authored asset durability | Passing for content-addressed IndexedDB stage/commit/read, hash verification, typed storage failures, exact 24-hour orphan grace, reference protection, and per-window refcounted object URL leases | App owns one durable static commit path; localStorage retains byte-free dashboard JSON only, static drafts remain in memory, and `ChartView` releases resolved leases | Local Image survived ordinary reload and fresh-context bundle import/reload; missing and corrupt payload variants rolled back without importing content |
| Schema, migration, and loading | Passing for dashboard v4, bundle v4, contained chart v3, migration-before-validation, deterministic/idempotent legacy Image conversion, and static temporal isolation | The historical `dashboardBundleV3.js` remains the canonical boundary; typed static sources bypass providers, row preparation, profiling, playback, Chrono Groups, and Scenes | The retained FT-11 and IM-06 production reload checkpoints pass; ordinary charts still create/edit/persist after Image |
| Export and import | Passing for verified asset payload envelopes, network-dependency disclosure, missing/corrupt export rejection, complete staging before one replacement, and rollback | Existing package review/download/upload flows carry v4 without a parallel serializer or store | One 36.16 MB v4 export was reused for missing, corrupt, and valid imports in a genuinely fresh browser context; only the valid package replaced the dashboard |
| Offline package | Passing for hashed contained `data/authored/<sha256>.<ext>` materialization, exact MIME, traversal containment, and static-path exclusion from dataset generation | Production build and local production server remain functional; linked HTTPS Images stay declared rather than silently embedded | The fresh imported dashboard reloaded with the browser network disabled and rendered local Image in main View/fullscreen plus the currently wired passive separate Audience page. A separately copied physical flash-drive folder was not launched |
| Free-text security | Passing under the user override: every text kind is data, unsupported constructs remain inert visible text/code, and safe DOM construction creates no authored executable/resource nodes | No sanitizer, deny-list, DOMPurify, authored HTML parser, executable HTML, or text-driven external loading was introduced | Exact QMD/revision survived reload and fresh import/offline reload at 1440×900; 768×900 had no root horizontal overflow and the inert script/image corpus created zero active/resource nodes |

## Production browser checkpoints

- `tests/e2e/static-content-portability.spec.js`: passed in Chromium against the production build/server. It authored Free-text and a strict local PNG at 1440×900, proved dashboard v4 with a byte-free localStorage manifest, reloaded, exported bundle v4, rejected missing/hash-corrupt variants in a new context, imported the unchanged bundle, reloaded, activated the service worker, disabled networking, and reloaded again.
- The same fresh context inspected canonical local Image rendering in ordinary View and fullscreen, responsive containment at 768×900, and the currently wired passive Image in a separate Audience page. This last checkpoint is portability evidence only, not Slice 6 protocol/reconnect/composition completion.
- `FT-11 reload continuation preserves the exact saved QMD and revision`: passed in 10.9 seconds.
- `IM-06 reload continuation restores the original asset and saved transform`: initial RED retained identical stored source but failed because the lazy panel was not activated; after the test scrolled the canonical panel, it passed in 12.7 seconds.
- Manual production inspection on a new origin at 1440×900 and 768×900 confirmed the reloaded Free-text corpus used one safe-DOM sink, created no executable/resource elements, and remained horizontally contained. A stale service-worker cache on an older development origin was diagnosed and avoided with a new origin; no product change was made for stale test infrastructure.

## Deterministic verification

- Final directly impacted run: 218/218 passed in 8.59 seconds, including the durable store/reference graph, App bridge, schema/bundle/migration, export/import, offline promotion, static workflow, Image async renderer, provider bypass, Quorum, and temporal isolation owners.
- Earlier strict TDD groups passed: authored store 7/7; migration/temporal 6/6; final migration/draft/transaction regression set 26/26; canonical bundle 57/57; static loader bypass 2/2; export/candidate/import 16/16 plus invalid-raster import 5/5; offline promotion 4/4; Quorum catalogue 39/39; focused App/localStorage tracked-profile case 1/1.
- Production build passed with 890 modules transformed. Known advisories were unchanged: Three/Vanta classic-script notices, the existing mixed static/dynamic `ChartFootprintPicker` advisory, and the existing large-chunk advisory.
- Vite-backed Node checks require execution outside the restricted Windows filesystem sandbox; the restricted attempt failed to resolve `vite.config.js`, while the identical escalated run reached product assertions. This is an environment constraint, not a product failure.

## Boundaries and skips

- No Slice 5 cross-mode Build/View layout/restoration promotion is claimed.
- No Slice 6 presentation protocol, reconnect, multi-cell Audience composition, or Audience failure-isolation promotion is claimed. Free-text remains excluded from Present/Audience.
- The physical flash-drive copy/launcher was not launched. Its asset path/MIME/root-containment engine is covered, and the production build was served and exercised offline through the service worker.
- The inherited `chronoGroupModelV3` broad-suite drift remains six playback-state failures and is not attributed to this slice.
