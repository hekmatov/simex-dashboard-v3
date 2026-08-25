# Slice 3 Image evidence and status

Date: 2026-08-25

## Layer status

| Area | Engine | UI/composition | Fidelity |
|---|---|---|---|
| Image source validation | Passing for signature/structure/decode agreement, single-frame PNG/JPEG/WebP, corruption/animation rejection, size/dimension/product/quota limits, HTTPS-only URL, traversal-safe package path, and alt/decorative validation | Local upload, URL, and package origins use the typed source editor; replacement/undo and stable actionable failures are mounted | Accepted PNG plus forced HTTPS failure passed at all three production viewports; exhaustive accepted-format browser sampling and export preflight are not claimed |
| Image transform authoring | Passing for bounded integer-permille crop, quarter turns, keyboard nudge/resize, fit, reset, and replacement snapshot/undo | Variant B guided sections put the crop preview immediately above semantic transform controls with visible unobscured focus and pointer, keyboard, and numeric alternatives | Saved crop/rotation/fit, Reset image, Keep/Discard, replacement/undo, and no document horizontal growth passed at 1440×900, 1024×768, and 768×900 |
| Canonical renderer and viewer | Passing for typed source resolution before tabular preparation, alt/decorative DOM semantics, stable loading/error state, and separate transient zoom/pan | The same `ImageChartView` routes through authoring preview, Build, View, and fullscreen; action overlay reveals on hover, focus-within, and explicit touch without layout shift; Audience is passive by capability | Build/View/fullscreen, rest/hover/focus/touch reveal, transient zoom/reset, unchanged saved crop, and sibling survival under forced failure passed at all three viewports. Audience and exhaustive fullscreen failure/zoom boundaries remain later-slice evidence |
| Lifecycle and persistence boundary | Passing for typed draft/source/capability/transaction contracts, stale-safe application-session commit, content-addressed immutable staging, and dataset/time/Chrono/Scene bypass | Create/edit/save/cancel runs through the shared four-stage static flow and canonical panel chain; the exact six-stage chart flow is unchanged; legacy inline-row Image remains a source-kind-gated migration compatibility path | Three in-session production journeys passed. The exact reload continuation is retained as a narrow `fixme` explicitly blocked by Slice 4; no IndexedDB, dashboard/bundle-v4, import/export, offline, or separate-window durability is claimed |

## Storage and security boundary

Slice 3 stages accepted local bytes only in a content-addressed application-session registry. The accepted bytes are copied, their SHA-256 identity does not change when transform metadata changes, the manifest exposes no byte buffer or object URL, and no original OS path is stored. This registry exists only to make all attainable in-session Image behavior testable before the phase-ordered durable store.

It is not authored persistence. The dashboard configuration remains v3 and intentionally rejects an `assets` envelope. `commitPreparedWith` lets the existing serialized/stale-safe dashboard commit controller atomically publish the already validated Image candidate in the current application session without invoking the durable v3 writer. Slice 4 remains the only owner of authored IndexedDB durability, reference graphs, object-URL leases, schema/bundle v4, reload, import/export, and offline packaging.

## Production browser checkpoints

The retained journey inspected real production output rather than label-only smoke checks:

- separate four-stage Image creation and passive canonical stage-4 preview, with no dataset/time/Chrono/Scene controls;
- accepted upload, byte-free session manifest, and absence of Image asset/panel state from the v3 local-storage envelope;
- complete-pair dirty Keep/Discard behavior, Reset image recovery, replacement reset/alt-review/undo, keyboard crop, numeric state, quarter-turn rotation, and saved transform rendering;
- visible unobscured keyboard focus and bounded responsive layout;
- canonical Build, View, and fullscreen rendering with authored alt;
- actions invisible at rest, reveal on hover/focus/touch without a bounding-box shift, and transient zoom/reset leaving saved crop unchanged;
- forced HTTPS failure with stable cell, exact Build Retry/Replace/Edit, exact View Retry/non-authoring explanation, no raw identifier disclosure, and a surviving sibling canonical panel.

Final production result: 3 passed and 1 skipped in 50.4 seconds. Viewport cases passed in 15.8 seconds at 1440×900, 14.8 seconds at 1024×768, and 17.5 seconds at 768×900. The sole skip is `IM-06 reload continuation restores the original asset and saved transform`, annotated `Blocked by Slice 4: authored IndexedDB durability and dashboard/bundle v4 reload are not part of Slice 3.`

## Verification disposition

- Focused and directly impacted Image/static/legacy-pipeline checks: 151/151 passed.
- Production build: passed, 883 modules transformed, 9.81 seconds; only the existing non-module-script, mixed static/dynamic import, and chunk-size warnings remain.
- Broad repository unit command: 1,074 tests, 1,007 passed, 67 failed. It is recorded non-green and is not used to promote the slice. The passing 102-test directly impacted set isolates the Image change from the broader existing raw-JSX-loader and unrelated application-baseline failures; those 67 failures are not claimed resolved by this slice.

## Status boundaries

IM-14 and all reload/durable-asset portions remain partial because the exact reload continuation cannot pass before Slice 4. IM-15/IM-16 and passive separate-window Audience asset resolution/failure remain Slice 6 plus Slice 4 dependencies. No matrix row is promoted using only engine or component evidence; the binding fidelity matrix records the engine/UI/fidelity distinction row by row.
