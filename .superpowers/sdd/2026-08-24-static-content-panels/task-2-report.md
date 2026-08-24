# Task 2 report — Free-text vertical slice

Date: 2026-08-25

Branch: `codex/static-content-panels-implementation`

Starting point: `7a1271987b9a1ab62713c7c84a10bc77d082befb`

Atomic implementation commit: this report is part of the single slice commit; the resulting hash is reported to the controller after commit.

## Status

Complete for the Slice 2 ruling and independently testable layer gate. The `portable-qmd-v1` engine, mounted authoring experience, canonical Build/View/fullscreen renderer, Present exclusion, and application-session create/edit lifecycle are implemented and verified. The retained production journey passes at 1440×900, 1024×768, and 768×900.

FT-11 is deliberately not reported as fully Passing: its reload/import-dependent continuation remains a retained `fixme` owned by Slice 4's dashboard/bundle-v4 bridge. FT-12 is likewise partial: the shared capability and live Present catalogue exclude Free text, while injected protocol/separate-Audience rejection remains owned by Slice 6.

## Dependency and security review

The smallest local dependency set is exact-pinned in `package.json` and `pnpm-lock.yaml`:

| Package | Exact version | License | Decision |
|---|---:|---|---|
| `markdown-it` | 15.0.0 | MIT | Inert Markdown token AST with HTML/linkification disabled and `typographer: false`. The exact pin is beyond both the `>=13.0.0 <14.1.1` linkify ReDoS range and the separate `<=14.1.1` smartquotes quadratic-DoS range. |
| `dompurify` | 3.4.14 | MPL-2.0 OR Apache-2.0 | Browser DOM sanitizer. Every call creates a fresh instance and applies explicit tag/attribute/URI hooks; string input and `IN_PLACE: false` avoid the in-place hook-removal class fixed in 3.4.13. |
| `katex` | 0.18.4 | MIT | Bundled local restricted math. Options are `output: "html"`, `trust: false`, `strict: "error"`, no macros, `maxExpand: 100`, and `maxSize: 20`; the sanitizer excludes authored styles, MathML, SVG, resources, and foreign content while retaining renderer-marked structural classes and numeric-em geometry. |

Review sources:

- Markdown-it changelog: <https://github.com/markdown-it/markdown-it/blob/master/CHANGELOG.md>
- Markdown-it advisory: <https://github.com/advisories/GHSA-38c4-r59v-3vqw>
- Markdown-it smartquotes advisory: <https://github.com/advisories/GHSA-6v5v-wf23-fmfq>
- DOMPurify advisories: <https://github.com/cure53/DOMPurify/security/advisories>
- DOMPurify threat model: <https://github.com/cure53/DOMPurify/wiki/Security-Goals-%26-Threat-Model>
- DOMPurify 3.4.14 build/release evidence: <https://github.com/cure53/DOMPurify/actions/workflows/build-and-test.yml>
- KaTeX security guidance: <https://github.com/KaTeX/katex/security>
- KaTeX releases: <https://github.com/KaTeX/KaTeX/releases>

`pnpm audit --prod --audit-level high` exited 0 with zero high/critical findings. The detailed production audit reports one pre-existing moderate ECharts finding, `GHSA-fgmj-fm8m-jvvx`, affecting the existing `echarts@5.6.0`; none of the Slice 2 packages is implicated. Advisory: <https://github.com/advisories/GHSA-fgmj-fm8m-jvvx>.

## Implementation

### Portable QMD engine and canonical sink

- Added the explicit accepted/denied feature, protocol, and resource table for `portable-qmd-v1`.
- Added an inert `markdown-it` parser with source-located hard-deny scanning, token allow-list validation, footnotes, five callout types, display-only fenced code, restricted math, and exact failure guidance.
- Enforced 100 KiB source, 5,000 sanitized-fragment-DOM-descendant, six-level nesting, 100-row, and 20-column limits without truncating accepted boundary content.
- Decoded case, percent, numeric-entity, whitespace, and control-character protocol bypasses before allowing only absolute HTTP(S) and same-panel fragments, including tokenized reference-style links.
- Added semantic rendering with host-aware headings, panel-scoped IDs, canonicalized fragments, safe external-link target/rel, labelled focusable table/code scrollers, callouts, passive task markers, restricted HTML-only KaTeX, and footnotes/backlinks.
- Added one DOMPurify fragment boundary with explicit generated-class/geometry, panel-ID, URI, target, rel, tabindex, and scope policies. The only mount path clones the already sanitized fragment into `replaceChildren` in `FreeTextChartView`; there is no post-sanitize rewrite or reparse.

### Authoring and responsive UI

- Added the labelled Free-text source editor with 200 ms analysis, linked line/column errors and recovery guidance, one polite live status, separately revisioned last-valid preview, and no persistent draft key.
- Invalid source leaves the previous preview visibly stale, blocks Continue and Preview & add navigation, and is revalidated from the exact source again on stage entry/final save.
- Wide layout owns a split Source/Preview editor. At 860 px and below it becomes an ARIA tabset with click plus ArrowLeft/ArrowRight/Home/End operation and restores the logical focus owner through responsive changes.
- Kept real form submission, modal focus behavior inherited from the shared shell, visible 3 px focus, focus-safe dialog scrolling, minimum touch targets, reduced motion, and bounded panel/table/code overflow.
- Moved existing `.chart-image-*` and `.chart-status-*` ownership out of `src/styles.css` into the singular `src/styles/static-content.css` entry imported by `src/main.jsx`.

### Canonical composition and lifecycle

- `resolveChartRendering` resolves typed `staticText` before tabular preparation. `ChartView` bypasses row/time projection for static schemas and dispatches Free text through one `FreeTextChartView`; interaction mode changes host chrome only.
- The authoring preview uses the same `ChartView` route as Build, View, and fullscreen rather than a second preview renderer.
- The typed source pair saves at revision 1 and advances to revision 2 only on the saved source edit. Dirty source remains application-session state and does not overwrite the stored saved QMD before commit.
- Present derives exclusion through the shared static capability model; Free text is absent from the live catalogue.

## RED evidence

### Engine owners absent

```text
node --test --test-concurrency=1 tests/portableQmdPolicy.test.js tests/portableQmdSanitization.test.js
```

Observed RED: 2 test-file subtests, 0 passed and 2 failed with the required QMD policy/sanitizer production owners missing. After the first implementation, the engine/sanitizer corpus was GREEN at 24/24 before later review cases expanded it.

### Mounted editor and canonical route absent

```text
node --test --test-concurrency=1 tests/freeTextChartView.test.js
```

Observed RED: 4/4 failed; the real mounted browser harness timed out because `FreeTextSourceEditor` and `FreeTextChartView` did not exist.

```text
node --test tests/staticContentDraft.test.js
```

Observed RED: 5 tests, 4 passed and the new exact-save assertion failed because iframe QMD could finalize.

Initial GREEN after the production owners and save gate were implemented:

```text
node --test --test-concurrency=1 tests/freeTextChartView.test.js tests/staticContentDraft.test.js
tests 13
pass 13
fail 0
```

### Present exclusion absent

```text
node --test --test-concurrency=1 tests/presentWorkspace.test.js
```

Observed RED: 5 tests, 4 passed and the new Free-text exclusion assertion failed because the saved Free-text panel appeared in the Present catalogue. GREEN after capability-based filtering: 5/5.

### Review-found canonical fragment defect

```text
node --test tests/portableQmdPolicy.test.js
```

Observed RED: 23 tests, 22 passed and the new same-panel fragment case failed because `#Readiness_Detail` rendered an href that did not match the canonical scoped heading slug. GREEN after using the shared slug transform: 23/23.

### Review-found responsive tab keyboard defect

```text
node --test --test-concurrency=1 --test-name-pattern="responsive Source and Preview tabs" tests/freeTextChartView.test.js
```

Observed RED: the single browser case failed because ArrowRight did not select/focus Preview. GREEN after adding roving selected/focus behavior: 1/1.

### Review-found invalid math acceptance

```text
node --test tests/portableQmdPolicy.test.js
```

Observed RED: 25 tests, 24 passed and malformed TeX was accepted. GREEN after parser-policy validation with the exact shared KaTeX restrictions: 25/25.

### Review-found reference-link validation gap

```text
node --test tests/portableQmdPolicy.test.js
```

Observed RED: 25 tests, 24 passed and the expanded link-policy case showed an unsafe reference-style destination was not rejected at save-time. The first scanner fix also produced a useful intermediate RED by misclassifying footnote definitions. GREEN after validating tokenized link destinations, scanning non-footnote reference definitions, and preserving inherited source locations: 25/25.

### Routed invalid-source rail defect

```text
pnpm exec playwright test tests/e2e/static-free-text.spec.js --project=chromium --grep "1440x900"
```

Observed RED: the production journey expected `Preview & add` to be disabled after an iframe edit, but the rail remained enabled. GREEN after deriving both forward gates from mounted Free-text validity is included in the final three-viewport result below.

## Final GREEN and verification evidence

### Focused semantic, mounted-browser, routing, and draft suite

```text
node --test --test-concurrency=1 tests/portableQmdPolicy.test.js tests/portableQmdSanitization.test.js tests/freeTextChartView.test.js tests/staticContentDraft.test.js tests/presentWorkspace.test.js
```

Final result:

```text
tests 45
pass 45
fail 0
duration_ms 10518.9514
```

This exercises the real parser, KaTeX renderer, DOMPurify fragment, canonical sink, mounted React editor, routed `ChartView`, real form/stage markup, draft finalization, and Present composition. It is not a source-grep, mock-renderer, or broad smoke proof.

### Directly impacted regression disposition

```text
node --test --test-concurrency=1 tests/chartViewV3.test.js tests/v3RuntimeBoundaries.test.js tests/fullscreenDisplay.test.js tests/buildCommandHeader.test.js tests/staticPanelTransaction.test.js tests/staticContentRegistry.test.js
```

Observed result: 32 tests, 30 passed and 2 failed. Both are exact accepted-baseline anomaly classes already independently established in the Task 1 report: the raw-JSX Node-loader limitation and `Compare charts` visibility expectation. There was no new impacted behavioral failure. The later renderer/editor refinements are covered by the final 45-test focused suite, production build, and retained browser journey; the deterministic accepted-baseline comparison was not duplicated.

### Production build

```text
pnpm build
```

Passed: current icon references, biomedical derivatives, 34 dataset profiles, 38 portable sources, and Quorum catalogue with 27 chart types / 2 static types / 40 configured charts; Vite transformed 880 modules and built in 9.63 seconds. Warnings are the existing non-module Three/Vanta scripts, mixed static/dynamic `ChartFootprintPicker` import, and large-chunk advisory.

### Retained production browser journey

```text
pnpm exec playwright test tests/e2e/static-free-text.spec.js --project=chromium
```

Final result:

```text
3 passed
1 skipped
duration 43.4s
```

| Viewport | Material checkpoints inspected | Result |
|---|---|---|
| 1440×900 | four stages; wide split; exact revision-1 source; semantic callout/table/math/footnote DOM; real vertical overflow; invalid iframe blocking error and disabled rails; dirty storage isolation; Keep/Discard; revision-2 save; Build/View/fullscreen; Present absence | Passed |
| 1024×768 | same routed lifecycle and canonical DOM; wide split at the material threshold; bounded panel/table/code ownership; no root horizontal growth | Passed |
| 768×900 | narrow ARIA Source/Preview tabs and source-focus continuity; same invalid, dirty, save, mode, fullscreen, and Present checkpoints; no root horizontal growth | Passed |

The fourth test is retained with the exact create → reload → edit continuation but annotated `fixme`, `blocked-by-slice-4`. It is intentionally skipped until dashboard/bundle-v4 reload/import exists; the three passing journeys establish only the approved in-session lifecycle.

### Repository hygiene

`git diff --check` passed after staging every tracked and newly added slice file. A final self-review compared the staged delta against the brief and global ownership rules before commit.

## Documentation and status updates

- Updated `FIDELITY-MATRIX.md` with separate engine, UI/composition, and fidelity status for FT-03 through FT-12 plus PS-01/PS-06/PS-07/PS-08 intersections. FT-11 and FT-12 remain explicitly partial at their later-slice boundaries.
- Updated `SECURITY-PORTABILITY-DECISIONS.md` for SP-01–SP-07, SP-18, SP-22, exact local packages, canonical-sink enforcement, audit disposition, in-session evidence, and pending later-slice boundaries.
- Added `SLICE-2-EVIDENCE-STATUS.md` with the dependency record, browser checkpoints, layer status, and phase-order deviation.
- Advanced the SDD progress ledger to Task 2 complete under the controller ruling without claiming reload/import or protocol-injection fidelity.

## Files

### New production files

- `src/static-content/qmd/portableQmdPolicy.js`
- `src/static-content/qmd/parsePortableQmd.js`
- `src/static-content/qmd/renderPortableQmd.js`
- `src/static-content/qmd/sanitizePortableHtml.js`
- `src/components/static-content/FreeTextSourceEditor.jsx`
- `src/components/charts/FreeTextChartView.jsx`
- `src/styles/static-content.css`

### Modified production/integration files

- `package.json`
- `pnpm-lock.yaml`
- `src/charting/rendering/resolveChartRendering.js`
- `src/components/charts/ChartView.jsx`
- `src/components/presentation/PresentWorkspace.jsx`
- `src/components/static-content/StaticContentWizard.jsx`
- `src/static-content/forms/staticContentDraft.js`
- `src/main.jsx`
- `src/styles.css`

### Tests and fixtures

- `tests/portableQmdPolicy.test.js`
- `tests/portableQmdSanitization.test.js`
- `tests/freeTextChartView.test.js`
- `tests/staticContentDraft.test.js`
- `tests/presentWorkspace.test.js`
- `tests/e2e/static-free-text.spec.js`
- `tests/fixtures/portable-qmd-browser.html`
- `tests/fixtures/free-text-harness.html`
- `tests/fixtures/free-text-harness.jsx`

### Records

- `docs/audits/2026-08-24-v3-static-content-panels/FIDELITY-MATRIX.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SECURITY-PORTABILITY-DECISIONS.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SLICE-2-EVIDENCE-STATUS.md`
- `.superpowers/sdd/2026-08-24-static-content-panels/progress.md`
- `.superpowers/sdd/2026-08-24-static-content-panels/task-2-report.md`

## Self-review

- Fixed mismatched internal heading fragments by applying the same slug rule to headings and same-panel links.
- Fixed narrow-tab keyboard operation and waited for actual focus ownership in the mounted browser assertion.
- Fixed invalid TeX acceptance by making policy validation and rendering share exact strict KaTeX options.
- Fixed reference-style URL validation at the parser boundary while explicitly distinguishing footnote definitions.
- Fixed the production invalid-source route so both Continue and Preview & add are disabled while the exact draft is blocked.
- Removed unused heading collection/editor refs and an empty URL-canonicalization branch during refactor.
- Confirmed no other render surface writes QMD HTML, and the canonical sink performs no post-sanitize rewrite.
- Confirmed Free text is resolved before tabular/time preparation, is absent from Present through shared capability data, and receives no Chrono/Scene/time context.
- Confirmed the application-session bridge keeps the saved QMD unchanged while an edit is dirty and increments the source revision only on Save.
- Confirmed all required material checkpoints are assertions in the automated production journey, not screenshot-only evidence.

## Deviations and remaining concerns

### Approved phase-order deviation

FT-11 reload/import completion remains with Slice 4 because the App currently has only the bounded typed-static v3 session bridge. The browser test retains, rather than deletes or weakens, the exact reload continuation. FT-12 protocol-injection/separate-Audience enforcement remains with Slice 6. No accepted UI, parser, source, renderer, security, or lifecycle behavior changed.

### Remaining concerns

- The one pre-existing moderate ECharts advisory remains outside this slice; the exact finding is recorded above.
- Two accepted-baseline impacted-test anomalies remain unchanged: raw-JSX loading under the Node test runner and `Compare charts` visibility.
- Production build size/non-module-script warnings remain pre-existing and are not caused by a failing Slice 2 check.
- No reload/import fidelity, bundle-v4 portability, or Audience protocol rejection is claimed by this commit.

---

## Fix round 1/5 — review findings

Date: 2026-08-25

Status: all six Important findings are addressed without changing the Slice 4 FT-11 reload/import boundary. No dependency was added or loosened in this round.

### Dependency and security disposition

- Corrected the dependency record: `GHSA-38c4-r59v-3vqw` is the markdown-it linkify ReDoS advisory (`>=13.0.0 <14.1.1`), while `GHSA-6v5v-wf23-fmfq` is the separate smartquotes quadratic-DoS advisory (`<=14.1.1`). The existing exact `markdown-it@15.0.0` pin is beyond both; production also keeps `linkify: false` and `typographer: false`.
- Kept the approved HTML-only sanitizer boundary. Authored HTML/styles, resources, MathML, SVG, and foreign content remain denied. Renderer-owned KaTeX is marked before sanitization; only an explicit generated-class grammar and numeric-em geometry properties survive inside that generated subtree. Attempts to spoof the marker with unsafe CSS are stripped.
- The sanitizer, not the Markdown token counter, now enforces 5,000 actual descendants on the final sanitized `DocumentFragment`. The same `compilePortableQmd` path is used by editor validation, final save, and the canonical renderer before mount.

### RED → GREEN evidence

#### Closed allow-list and exact parser boundaries

```text
node --test tests/portableQmdPolicy.test.js
```

RED: 32 tests, 28 passed, 4 failed. HTML comments, HTML declarations, thematic breaks, and fence options were unexpectedly accepted.

GREEN after the explicit policy/token/source checks: 32/32. A second test-first expansion covered incomplete inert raw-HTML forms:

```text
node --test --test-name-pattern="HTML|CDATA" tests/portableQmdPolicy.test.js
```

RED: 6 tests, 4 passed, 2 failed for an unclosed comment and CDATA declaration. GREEN after the source scanner recognized every inert raw-HTML token form: 6/6.

The final policy suite independently fixes each resource fixture at its literal boundary: 102,400/102,401 UTF-8 bytes, nesting 6/7, 100/101 total table rows including the header, and 20/21 columns. It no longer imports the policy constants to manufacture those expectations.

#### Repeated footnotes and source locations

```text
node --test --test-name-pattern="footnote" tests/portableQmdPolicy.test.js
```

RED: 4 tests, 2 passed, 2 failed. Repeated references duplicated the same reference ID/backlink, and a later-line missing definition was reported on line 1.

GREEN: 4/4. Each reference occurrence now has a unique scoped ID, each definition emits one backlink per occurrence, and inline references inherit their containing source line.

#### Actual sanitized-DOM budget and usable HTML-only math

```text
node --test --test-concurrency=1 tests/portableQmdSanitization.test.js
```

RED: 5 tests, 2 passed, 3 failed. A 5,001-node sanitized fragment was not rejected; one math token could expand beyond the limit; and sanitization flattened required KaTeX classes/geometry.

GREEN is included in the final 62-test run below: exact 5,000 descendants are preserved, 5,001 are rejected, and a single parsed math token cannot exceed the actual fragment budget. The browser fixture asserts four accessible `role="math"` labels, superscript/fraction/root/sum structures, non-zero geometry with generated vertical positioning, required fraction/root details, generated safe style retention, and zero MathML/SVG/style elements or resource URLs.

#### Canonical renderer/editor rejection before mount

```text
node --test --test-concurrency=1 --test-name-pattern="one-token math expansion" tests/freeTextChartView.test.js
```

RED: the mounted route timed out waiting for an isolated error because the previous renderer attempted progression through a token-count-valid expansion.

GREEN: 1/1. Active/passive canonical routes show the isolated Free-text error before mounting any partial content, while the editor preserves its last-valid preview and reports the actual DOM-node limit.

#### Debounced validation races

```text
node --test --test-concurrency=1 --test-name-pattern="routed forward controls|rapid revert" tests/freeTextChartView.test.js
```

RED: 2/2 failed. Continue remained enabled immediately after invalid input, and the parent remained non-pending during the debounce window.

GREEN: 2/2. The mounted real wizard receives pending/source/revision immediately, disables Continue and Preview & add before the 200 ms analysis can finish, and cannot advance invalid content. A change followed by a rapid revert restores the cached valid analysis with equal source/preview revisions and clears pending safely.

### Final focused and impacted GREEN

```text
node --test --test-concurrency=1 tests/portableQmdPolicy.test.js tests/portableQmdSanitization.test.js tests/freeTextChartView.test.js tests/staticContentDraft.test.js tests/presentWorkspace.test.js
```

```text
tests 62
pass 62
fail 0
duration_ms 13166.6844
```

The directly impacted wizard/Present subset also passed 14/14. This round did not repeat disposed baseline comparisons because no decision depended on them.

### Production build and retained browser journey

```text
pnpm.cmd build
```

Passed: icon references current; biomedical derivatives regenerated; 34 dataset profiles, 38 portable sources, and Quorum catalogue with 27 chart types / 2 static types / 40 configured charts; Vite transformed 881 modules and built in 15.87 seconds. Only the already recorded non-module vendor scripts, mixed ChartFootprintPicker import, and chunk-size warnings remain.

```text
pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium
```

```text
3 passed
1 skipped
duration 49.3s
```

At 1440×900, 1024×768, and 768×900 the production journey inspected the exact saved source/revision, canonical Build/View/fullscreen routes, callout/table/footnote semantics, accessible superscript/fraction/root/sum structure and computed geometry, generated-style scoping, zero forbidden foreign/style/resource output, bounded overflow, invalid-source forward gates, dirty isolation, Keep/Discard, revision-2 save, and Present absence. Wide split and narrow responsive tabs remain viewport-specific checkpoints. The one skip remains the exact create → reload continuation annotated `blocked-by-slice-4`; no reload/import fidelity is claimed.

### Files changed in fix round 1

- Engine/security: `src/static-content/qmd/compilePortableQmd.js`, `portableQmdPolicy.js`, `parsePortableQmd.js`, `renderPortableQmd.js`, `sanitizePortableHtml.js`.
- UI/composition: `FreeTextSourceEditor.jsx`, `StaticContentWizard.jsx`, `FreeTextChartView.jsx`, and removal of the residual duplicate Image selectors from `src/styles.css` (the existing singular owner remains `src/styles/static-content.css`).
- Tests/fixtures: `portableQmdPolicy.test.js`, `portableQmdSanitization.test.js`, `freeTextChartView.test.js`, `static-free-text.spec.js`, `free-text-harness.jsx`, and `portable-qmd-browser.html`.
- Records: fidelity matrix, security/portability decisions, Slice 2 evidence/status, SDD progress, and this report.

### Documentation/status corrections

- FT-06 now records actual sanitized-fragment descendants, exact/one-over boundaries, and enforcement before progression, final save, and mount.
- FT-07/FT-08 record immediate pending/revision gates and safe cached rapid-revert recovery.
- FT-10 records unique repeated-footnote occurrences, inherited source locations, and structurally/visually intact accessible HTML-only math.
- SP-03/SP-04/SP-07 distinguish denied authored styles/foreign content from the renderer-marked, numeric-only KaTeX geometry required by the approved math renderer.
- CSS ownership is singular: no `.chart-image-*` or `.chart-status-*` selector remains in `src/styles.css`; static/Image selectors are owned by `src/styles/static-content.css`.
- FT-11 reload/import completion remains pending Slice 4 and FT-12 protocol-injection completion remains pending Slice 6.

### Self-review and concerns

- `git diff --cached --check` passed with all 20 fix-round files staged and no unstaged task delta.
- Confirmed the canonical sink mounts only a clone of the sanitized fragment and never rewrites or reparses it.
- Confirmed the actual-node failure is isolated before mount, and final Add/Save synchronously recompiles the exact current QMD even if a UI timer were stale.
- Confirmed safe KaTeX style values are restricted to the approved property set plus numeric `em` grammar (`position` may only be `relative`); authored color, fixed positioning, URLs, and marker spoof payloads are stripped.
- Confirmed each allow-list addition has a concrete parser fixture and each race uses a real mounted editor/wizard rather than labels, mocks, or source inspection.
- Confirmed the residual `.chart-image-*` fullscreen/reduced-motion selectors were removed from `src/styles.css` without altering their existing owner in `static-content.css`.
- Remaining concerns are unchanged: the pre-existing moderate ECharts advisory and existing Vite warnings are outside this slice; reload/import and separate-Audience protocol evidence remain owned by Slices 4 and 6 respectively.
