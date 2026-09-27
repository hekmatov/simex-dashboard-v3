# Fable M0.2: media lifecycle browser journeys

Date: 27 September 2026. This closes the bounded Journey A/B package assigned in section 5 of the authoritative roadmap. Offline Journey G and wider M0 gates remain open.

Journey A now uses the current Biomedical Build page title, reuses an already-open Source content manager after draft cancel, and opens the current panel Actions menu before editing a Text/Image placement. Its existing checks passed without relaxing them: session asset cleanup after cancel, suspension and mode departure; invalid upload rejection; deduplicated reuse versus separate logical items sharing bytes; QMD local import, default descriptions and restore; used-media deletion protection, eligible deletion and tablet rendering.

Journey B now hovers the image viewer before using its intentionally hover-gated zoom controls. Its replacement assertions passed: canceled/invalid replacement leaves state unchanged; confirmed replacement increments revision and changes hash while preserving logical media ID, image placement text/geometry/zoom and QMD; image and QMD render the new bytes in Build, View and fullscreen without page errors.

The final fullscreen check exposed a product pointer defect. In View, the sticky command crown could cover the fullscreen close button because the containing View frame stacked below the crown. `modes.css` now raises that frame above the crown only while an immersive fullscreen display is mounted. Journey B clicks the visible close control for both image and QMD fullscreen after this correction. A scoped read-only review found no actionable issue with the stacking boundary or test changes.

| Check | Result |
| --- | --- |
| `node --check tests/e2e/source-content-media.spec.js` | Passed |
| `git diff --check` | Passed |
| Final exact Chromium `--grep "Journey [AB]"` | 2 passed (1.8 minutes) |
| Affected retry/resume Chromium journey | 1 passed |

The initial A visibility failure was a retired heading. Subsequent long-run timeouts isolated an already-open manager, the old inline Edit chart locator, hover-gated zoom controls, and the crown/fullscreen stacking issue. The product correction is limited to the View fullscreen stacking state; no media transaction logic, asset schema, public content or presentation protocol changed. Full browser suites, production builds, Journey G, main integration and release verification were not run. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
