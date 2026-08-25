# Slice 3 Image evidence and status

Date: 2026-08-25

## Layer status

| Area | Engine | UI/composition | Fidelity |
|---|---|---|---|
| Image source validation | Passing for signature/structure/decode agreement, single-frame PNG/JPEG/WebP, corruption/animation rejection, size/dimension/product/quota limits, HTTPS-only URL, traversal-safe package path, and alt/decorative validation | Intake rejects encoded byte/product/quota failures before reading or decoding, checks encoded dimensions before decode, and uses the browser decoder before retaining immutable bytes; local upload, URL, package, replacement/undo, and stable failures are mounted | Exact locally controlled PNG/JPEG/WebP fixtures passed Chromium `createImageBitmap`; accepted PNG plus forced HTTPS failure passed at all three production viewports. Export preflight remains Slice 4 |
| Image transform authoring | Passing for bounded integer-permille crop, quarter turns, keyboard nudge/resize, fit, reset, and replacement snapshot/undo | Variant B guided sections put the crop preview immediately above semantic transform controls with visible unobscured focus and pointer, keyboard, and numeric alternatives | Saved crop/rotation/fit, Reset image, Keep/Discard, replacement/undo, and no document horizontal growth passed at 1440×900, 1024×768, and 768×900 |
| Canonical renderer and viewer | Passing for typed source resolution before tabular preparation, synchronous and asynchronous asset resolvers, trusted intrinsic geometry, alt/decorative DOM semantics, stable pending/error state, and separate transient zoom/pan | The same `ImageChartView` routes through authoring preview, Build, View, and fullscreen. Validated inventory width/height drives intrinsic rotation; normalized crop maps into the rotated pixel plane; outer contain/cover fit follows without square pre-distortion. Unknown URL/package/legacy geometry uses an undistorted intrinsic probe. Action overlay reveals on hover, focus-within, and explicit touch without layout shift; Audience is passive by capability | Landscape/portrait 0°/90°/270° asymmetric crop and contain/cover cases passed. The retained controlled 2×3 source proved natural/source-plane dimensions, 3×2 quarter-turn bounds, pixel crop viewBox, rotation matrix, actual cover and contain scales, Build/View/fullscreen, reveal, transient zoom/reset, unchanged saved crop, and sibling survival at all three viewports. Async pending→resolved, rejected, and superseded-request behavior passed in Chromium. Audience remains later-slice evidence |
| Lifecycle and persistence boundary | Passing for typed draft/source/capability/transaction contracts, stale-safe application-session commit, content-addressed immutable staging, selective URL/blob cleanup, and dataset/time/Chrono/Scene bypass | Create/edit/save/cancel runs through the shared four-stage static flow. After a session Image exists, the normal six-stage Add chart and chart editor persist their v3-supported projection while the typed Image/assets remain in the bounded session bridge. Legacy inline-row Image remains a source-kind-gated migration path | All three journeys created and edited an ordinary chart after Image, proved v3 contained the chart but no Image/assets, and exercised replace→undo and replace→discard cleanup while retaining the saved sibling. Reload remains the sole Slice-4 `fixme`; no v4 durability is claimed |

## Storage and security boundary

Slice 3 stages accepted local bytes only in a content-addressed application-session registry. The accepted bytes are copied, their SHA-256 identity does not change when transform metadata changes, the manifest exposes no byte buffer or object URL, and no original OS path is stored. This registry exists only to make all attainable in-session Image behavior testable before the phase-ordered durable store.

It is not authored persistence. The dashboard configuration remains v3 and intentionally rejects an `assets` envelope. `commitPreparedWith` lets the existing serialized/stale-safe dashboard commit controller atomically publish the already validated Image candidate in the current application session without invoking the durable v3 writer. Slice 4 remains the only owner of authored IndexedDB durability, reference graphs, object-URL leases, schema/bundle v4, reload, import/export, and offline packaging.

## Production browser checkpoints

The retained journey inspected real production output rather than label-only smoke checks:

- separate four-stage Image creation and passive canonical stage-4 preview, with no dataset/time/Chrono/Scene controls;
- accepted upload, byte-free session manifest, and absence of Image asset/panel state from the v3 local-storage envelope;
- ordinary six-stage chart creation and chart editing after a session Image, with chart changes persisted in v3 and the typed Image/assets preserved only in session state;
- complete-pair dirty Keep/Discard behavior, Reset image recovery, replacement reset/alt-review/undo, keyboard crop, numeric state, quarter-turn rotation, and saved transform rendering;
- repeated replacement Undo/Discard cleanup that revokes the unreferenced staged asset while the adopted saved sibling survives;
- visible unobscured keyboard focus and bounded responsive layout;
- canonical Build, View, and fullscreen rendering with authored alt;
- actions invisible at rest, reveal on hover/focus/touch without a bounding-box shift, and transient zoom/reset leaving saved crop unchanged;
- forced HTTPS failure with stable cell, exact Build Retry/Replace/Edit, exact View Retry/non-authoring explanation, no raw identifier disclosure, and a surviving sibling canonical panel.

Fix-round-2 production reruns passed individually in 29.7 seconds at 1440×900, 25.2 seconds at 1024×768, and 30.7 seconds at 768×900. The sole retained skip is `IM-06 reload continuation restores the original asset and saved transform`, annotated `Blocked by Slice 4: authored IndexedDB durability and dashboard/bundle v4 reload are not part of Slice 3.` It was not selected by the three viewport-specific rerun commands and remains the only intentional `fixme`.

## Verification disposition

- Focused renderer/resolver/schema/async/legacy checks: 37/37 passed in 3.81 seconds. Directly impacted Image/static/legacy-pipeline checks: 161/161 passed in 7.40 seconds, including 3 Chromium decoder/async-resolver checks and four intrinsic landscape/portrait transform cases.
- Production build: passed, 883 modules transformed, 9.93 seconds; only the existing non-module-script, mixed static/dynamic import, and chunk-size warnings remain.
- The previously recorded broad repository unit command remains 1,074 tests, 1,007 passed, 67 failed and was not rerun because this fix round's required focused/impacted set deterministically covers every changed owner. It is not used to promote the slice, and none of those broader baseline failures is claimed resolved.

## Status boundaries

IM-14 and all reload/durable-asset portions remain partial because the exact reload continuation cannot pass before Slice 4. IM-15/IM-16 and passive separate-window Audience asset resolution/failure remain Slice 6 plus Slice 4 dependencies. No matrix row is promoted using only engine or component evidence; the binding fidelity matrix records the engine/UI/fidelity distinction row by row.
