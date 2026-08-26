# Task 4 Report — Non-Modal Manager Shell and Catalogue Composition

## Status

DONE — manager shell, catalogue composition, passive detail metadata, durable rename/default-description, responsive state continuity, and canvas restoration are implemented. Upload/picker, import-local, replacement/relink, deletion, recovery, GeoJSON preview, full CSV preview/profile, and computed active-blocker actions remain later tasks.

## RED / GREEN

- Exact Task 4 RED command: `node --test tests/buildCommandHeader.test.js tests/buildWorkspaceV3.test.js tests/sourceContentWorkspace.test.js tests/contentDetail.test.js tests/wizardDraftV3.test.js tests/staticContentDraft.test.js`.
- Initial RED: **32 passed / 3 failed / 0 skipped / 0 todo**. Intended failures were the missing third Build content command and missing manager/detail modules.
- Exact Task 4 GREEN: **38 passed / 0 failed / 0 skipped / 0 todo**, 2.93 s.
- Mounted RED: `pnpm.cmd test:e2e tests/e2e/source-content-manager.spec.js --project=chromium` produced **3 passed / 1 failed**. The desktop durable-rename case exposed `Content draft coordinator is disposed` before persistence under React StrictMode effect replay.
- Narrow lifecycle RED: `node --test tests/contentDraftTransaction.test.js` produced **9 passed / 1 failed** because the replay-safe lifecycle helper did not exist.
- Narrow lifecycle GREEN: the same command produced **10 passed / 0 failed / 0 skipped / 0 todo**, 164 ms.
- Final mounted GREEN: the corrected four-case Chromium command produced **4 passed / 0 failed** in 53.4 s.

## Implemented contract

- Build Content exposes Add chart, Add static content, and Source content while Pages & sections remains the existing auxiliary structure command. The accepted six-stage chart and four-stage static flows are unchanged.
- Source content is one wide non-modal auxiliary. The canonical canvas stays mounted; close restores scroll and focus to the Source content command.
- Media and Data sources catalogues provide accessible search and origin/status/usage filters; Data sources adds kind. Trusted generated/intermediate sources remain excluded.
- Desktop uses side-by-side catalogue/detail. Tablet uses list-to-detail with Back and preserves the selected row and filters.
- Detail routing exposes current type-appropriate passive metadata and React-text rendering. Media metadata and source display names stage through the manager owner and commit through the App coordinator; no local catalogue overlay or persistence bypass exists.
- App coordinator disposal is generation-guarded and deferred so React StrictMode effect replay cannot dispose the reused coordinator. Final unmount still disposes it.

## Mounted checkpoints

- 1440×900: one persistent canonical canvas; non-modal manager visible; desktop catalogue/detail panes visible; durable source rename immediately reappears in the open catalogue; tab search/origin filters survive round trips; canvas target remains above 240×160; document horizontal overflow is zero.
- 1440×900 close: canonical canvas instance is unchanged; exact window scroll is restored; focus returns to Source content.
- 1024×768: one unchanged canonical canvas remains mounted; tablet list opens detail and Back restores the selected row plus filters; canvas target remains above 240×160; document horizontal overflow is zero.

## Scope and row disposition

- SCM-C01, SCM-C02, and SCM-C03: Engine/UI/Fidelity Passing for the bounded Task 4 shell/composition journeys.
- SCM-C04: Partial. Current metadata shells, React-text safety, and durable rename/default-description are implemented; previews, computed blockers/dependency actions, import-local, replacement/relink, delete, and recovery remain unimplemented and unverified.
- SCM-SP02 manager DOM exclusion and SCM-SP17 current list/detail text rendering are targeted passing for this slice; future picker/dialog/imported-metadata surfaces remain pending.
- SCM-SP15 manager rename commit and StrictMode-safe coordinator lifetime are mounted passing; concrete upload and every later authoring-owner browser journey remain pending.
- SCM-D06 manager shell/kind filter/stage preservation is implemented; picker and GeoJSON management actions remain pending.

## Changed owners

- Manager shell/components/styles: `src/components/source-content/*`, `src/styles/source-content.css`, `src/components/build/BuildCommandHeader.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/main.jsx`.
- Lifecycle correction authorized by the master ruling: `src/App.jsx`, `src/content-library/contentDraftTransaction.js`.
- Focused tests: `tests/buildCommandHeader.test.js`, `tests/sourceContentWorkspace.test.js`, `tests/contentDetail.test.js`, `tests/contentDraftTransaction.test.js`, `tests/helpers/contentManagerHarness.jsx`, `tests/e2e/source-content-manager.spec.js`.
- Evidence: this report, amendment fidelity C01–C04, security/deviation focus rows, and implementation evidence.

No Task 5+ picker/detail actions, dependency computation, new dependency, design-system change, full build, full suite, or parent `progress.md` edit was made.

## Validated T4-R01–R06 correction round

- BASE `37462084ab42b5b0611ab45b2e1388c81f505e02`.
- Focused RED: exact Task 4 deterministic selection **36 passed / 4 failed / 0 skipped / 0 todo**. Failures were the fourth Content control, enabled dependency breadcrumb, computed zero-use state, and missing controlled browse-state owner.
- Exact deterministic GREEN: **40 passed / 0 failed / 0 skipped / 0 todo**, 2.81 s.
- Corrected Chromium file: **4 passed / 0 failed**, 1.0 min. Intermediate 1/4 and 3/4 runs identified only invalid test ownership/locators before the final accepted facts were reached.
- Source content now has an explicit full-width auxiliary host modifier with a fluid child. At 1440×900 and 1024×768, the mounted host satisfies `scrollWidth <= clientWidth`; workspace and visible panes stay within the host; desktop panes remain ordered side-by-side.
- Close/Escape applies the saved page/section/panel selection through the existing selection command path before restoring scroll and focus. The mounted journey changes from Home to another page while open and verifies exact Home restoration on close.
- Content contains exactly Add chart, Add static content, and Source content. Pages & sections remains functional in a separate Structure command group; six/four stages remain unchanged.
- BuildWorkspace owns one serializable browse-state snapshot. Tab, per-tab queries, origin/status/usage/kind filters, selections, and tablet list/detail state survive unmount/reopen; rename forms and unresolved coordinator drafts remain local and discard normally.
- Task 6 dependency computation was removed. Current detail renders only supplied committed usage metadata, uses passive breadcrumb text without a navigation handler, and exposes no dependency graph or delete behavior.
- SCM-C01–C03 remain Passing only after the corrected deterministic and mounted facts. SCM-C04 remains Partial with passive breadcrumbs and Task 6 explicitly deferred.
