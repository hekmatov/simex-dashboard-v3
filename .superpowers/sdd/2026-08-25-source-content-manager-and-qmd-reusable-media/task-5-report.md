# Task 5 Report — QMD Grammar, Safe Hosts, and Portal Runtime

## Status

DONE — the single portable-media annotation grammar, known-local safe hosts, mounted QMD portals, and exact lease/fallback lifecycle are implemented. Task 6 dependency graph/delete, Task 7 picker/import, Task 8 replacement, and Task 9 placement inspector/full responsive geometry remain unimplemented.

## RED / GREEN

- Exact Task 5 command: `node --test tests/portableQmdMedia.test.js tests/portableQmdDomSafety.test.js tests/portableQmdPolicy.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js tests/chartViewV3.test.js tests/staticPanelComposition.test.js tests/dashboardGeometryContract.test.js tests/sourceEvidenceDirectJourney.test.js`.
- The first sandboxed RED was contaminated by linked-worktree Vite/esbuild access denial: **38 passed / 7 file-level failures**. Six failures were inherited setup errors; the missing portable-media module was the intended product RED.
- Usable exact RED outside that filesystem restriction: **80 passed / 5 failed / 0 skipped / 0 todo**. Failures were missing annotation/one-time suffix ownership, missing known-local hosts, missing `QmdMediaView` healthy/fallback runtime, and missing FreeText portal cleanup.
- Focused grammar GREEN: **6 passed / 0 failed**.
- Focused lease/fallback GREEN: **2 passed / 0 failed**.
- Focused portal/surface checkpoint GREEN after the DOM phrasing-content correction: **11 passed / 0 failed**.
- Exact Task 5 GREEN before the final mounted checkpoint addition: **90 passed / 0 failed / 0 skipped / 0 todo**, 8.98 s.
- Fresh final exact Task 5 result including the mounted checkpoint: **91 passed / 0 failed / 0 skipped / 0 todo**, 9.57 s.

## Implemented contract

- `parsePortableQmd` remains the primitive parser and never imports the media grammar. `parsePortableQmdWithMedia` owns the one annotation pass and preserves invalid parser diagnostics/warnings/stats.
- `AnnotatedPortableQmdAst` retains the exact root fields and adds `mediaNodes` plus token/suffix annotations. Only one immediately-following fully allowlisted suffix is consumed; invalid/unknown/duplicate/out-of-range authority remains visible text.
- The serializer requires a valid local `mediaId` and contextual alt; decorative output serializes and renders with empty accessible alt.
- Compile consumes `ParsedPortableQmdResult`, renders only non-null valid annotated AST, and preserves the existing compiled-result shape.
- Renderer emits production-owned descriptors only for known asset/package identities. Unknown, external-only, HTTP/HTTPS, data, blob, file, and malformed destinations remain inert visible text without resource attributes or requests.
- Known missing/corrupt local records retain logical hosts and passive fallbacks; Build alone receives repair navigation. Healthy authored assets resolve through one object-URL lease owned by one `QmdMediaView` instance.
- `ChartView` passes the existing `renderContext` to `FreeTextChartView`. The already-implemented DashboardRenderer → DashboardModeWorkspace → DashboardCanvas → ChartPanel context path supplies mediaItems/assets/resolveAsset/requestRepair without a second authority.
- FreeText clones/appends the compiled fragment, collects committed hosts, and creates React portals tied to that exact compilation. Recompile and unmount remove portals without stale re-acquisition or orphan DOM.
- Text remains permissive. No sanitizer, authored CSS authority, arbitrary event authority, network fetch, or Task 6+ behavior was introduced.

## Mounted checkpoint

The planned real `ChartView` Free-text checkpoint mounted one shared QMD document at Build, View, and fullscreen:

- **9 logical hosts**: healthy, missing, and corrupt local records on each of three surfaces.
- **3 images**: exactly one healthy leased image per surface.
- **Missing/corrupt:** three bounded fallbacks for each health state; Build exposed two repair controls while View/fullscreen exposed none.
- **Unsafe/external:** External and raw HTTPS source remained visible on every surface; monitored external requests were exactly zero.
- **Lifecycle:** three acquisitions and exactly three releases after unmount; no image or host remained.
- **DOM:** portal roots remain phrasing content inside the renderer's paragraph host; caption/fallback structures use production-owned classes and validated token data.

## Row disposition

- **SCM-S11:** Engine and mounted Build/View/fullscreen renderer/request-authority slice Passing. Full Journey C authoring controls and retained browser geometry remain Task 9, so the complete amendment row is not promoted to final fidelity completion.
- **SCM-C07:** Fallback/aspect-reservation token foundation implemented and mounted for healthy/missing/corrupt states. Exhaustive width/wrap/RTL/narrow-collapse measured geometry remains Task 9; row stays Partial.
- **SCM-R03 / SCM-C06:** Unchanged and unpromoted. Inspector controls, picker routing, serialization UI, and measured responsive behavior remain Task 9.
- **SCM-SP10 / SCM-SP11:** Runtime request authority and exact attribute allowlist are implemented and targeted/mounted passing for this slice; later picker/import and full Journey C evidence remain pending.

## Changed owners

- Grammar/compiler/renderer: `src/static-content/qmd/portableQmdMedia.js`, `compilePortableQmd.js`, `renderPortableQmd.js`, and the Free-text draft validation consumer.
- Mounted runtime: `src/components/charts/QmdMediaView.jsx`, `FreeTextChartView.jsx`, `ChartView.jsx`, and `src/styles/source-content.css`.
- Tests: `tests/portableQmdMedia.test.js`, `tests/qmdMediaView.test.js`, `tests/portableQmdDomSafety.test.js`, and `tests/freeTextChartView.test.js`.
- Existing DashboardRenderer/DashboardModeWorkspace/DashboardCanvas/ChartPanel transport required no production change because Task 1 already carries the full `ContentRenderContext`; the Task 5 consumer was the missing link.

No parent `progress.md`, Task 6+ owner, dependency, generated output, full build, or full suite was changed or run.
