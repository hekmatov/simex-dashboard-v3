# Task 7 Report — Media Creation, Reuse, Import, and Restore

## Status

DONE for the accepted Task 7 slice. Manager media Add/reuse/separate, Image and QMD picker selection/import-local lifecycle, contextual Restore previous image, and Journey A dependency/delete integration are implemented. Task 8 global replacement/relink and Task 9 inspector behavior remain gated and are not claimed.

## RED and GREEN

- Initial Task 7 implementation commit `6f0d09a` reached the accepted six-file selection at **40/40** and the named Journey A at **1/1**, but the scoped review found T7-R01–R05.
- Correction R04/R05 RED: `tests/contentPicker.test.js` was **5/7**, failing because unhealthy Image identities remained selectable and manager duplicate radio changes did not update the live coordinator retainer. Focused GREEN: **7/7**.
- Correction R03 mounted RED: the two authoring-preview lifecycle cases were **0/2** because FreeText Source preview and Preview & Add did not receive a real render context. Focused GREEN: **2/2**, with one exact acquire and release per unmount.
- The strengthened real Journey A then exposed three material integration facts before passing: blank local-upload description rejected QMD insertion; duplicate manager teardown attempted to discard an already-resolved draft; committed content-draft manifests remained `staged`, causing later reuse to demand cleared session bytes. The production fixes supply a filename fallback only for new local QMD uploads, make the mounted discard adapter idempotent while leaving the coordinator strict, and promote only committed asset manifests before serialized persistence.
- Fresh exact command: `node --test tests/contentPicker.test.js tests/contentDraftTransaction.test.js tests/mediaItems.test.js tests/staticContentDraft.test.js tests/staticPanelComposition.test.js tests/contentDetail.test.js` — **43 passed / 0 failed / 0 skipped / 0 todo**.
- Corrected named command, without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey A — media create reuse default external import restore dependencies delete"` — **1 passed**, 1.8 min.

## Implementation boundary

- Manager intake stages through the existing coordinator owner `manager`. Reuse immediately retains the chosen committed mediaId; Separate immediately retains the candidate mediaId. Both retain the staged asset cleanup authority, and successful publication promotes its committed manifest to durable state.
- Image pickers select only Ready stored/packaged media or a valid External HTTPS identity. Missing, Corrupt, Needs relink, Needs review, and invalid External identities remain visible with explanations but are not controls. QMD remains Ready local-only.
- External Import as local media uses the browser's explicit CORS fetch or a user-selected local file and reuses the existing raster pipeline. No proxy, elevated fetch, raw-QMD URL conversion, or second asset resolver was added.
- The existing `resolveBrowserAuthoredAsset` authority now reaches FreeText Source preview and Preview & Add through `ContentRenderContext`; draft media/assets are merged into that context and leases release on close/unmount.
- Restore previous image remains contextual to the active Image edit. Save, Discard, and restore resolve it; Build Reset continues to reset only transforms and does not become replacement undo.

## Evidence layers

- **Engine/semantic:** picker eligibility negatives, hash/logical identity choices, immediate retainer movement and delete blocking, committed-manifest promotion, exact cancellation inventories, injected validation/persistence compensation, default-alt ownership, Reset-versus-Restore, and QMD atomic panel publication.
- **Mounted component:** staged `simex-media:` resolves in both authoring preview surfaces before commit; acquire/release is exact on unmount.
- **Real browser fidelity:** one named Journey A at Build 1440×900 and 1024×768 plus QMD View 390×844 covers manager Cancel/Escape/Close/mode departure/invalid raster, QMD local cancel, failed direct fetch then local upload, durable manager Add/reload, reuse/separate identity and hash correspondence, later-default behavior, Restore Save/Discard, focus return, dependency breadcrumb/disabled no-dialog, and eligible delete. Page-error inventory is empty.

## Row disposition

- **SCM-S03:** Passing for the complete stable-logical-ID, physical-dedupe, editable-default, and existing/new placement-alt invariant.
- **SCM-S13:** Task 7 manager/QMD/Image lifecycle slice Passing. The overall cross-origin row remains Partial until later chart/GeoJSON browser owners run.
- **SCM-C04:** Media detail/import/dependency/delete branch Passing; the overall multi-kind detail row remains Partial for later CSV/GeoJSON action-rich flows.
- **SCM-C05:** Media picker and contextual Image Restore branch Passing; the overall shared-selector row remains Partial for later data-source pickers.
- **SCM-R01:** Passing for the accepted Journey A scope at its named viewports. This does not promote Task 8 global replacement/relink or Task 9 QMD inspector controls.

## Security and deviations

- QMD retains no ambient network authority: External identities are nonselectable until explicit import creates a validated local identity; the failed direct-fetch branch requires local upload.
- Authored strings remain React text/QMD alt data. No markup execution, sanitizer, dependency, or network service was introduced.
- No deviation from the accepted Task 7 behavior was taken. The only fallback is the uploaded filename as initial contextual alt for a new local QMD upload when no External default exists; users retain the QMD source as the contextual placement owner.

No parent `progress.md`, generated output, dependency, full build, full suite, or Task 8+ owner is included in this correction commit.
