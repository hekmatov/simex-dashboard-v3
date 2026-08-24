# Task 2 report — Free-text vertical slice

Date: 2026-08-25

Branch: `codex/static-content-panels-implementation`

Starting point: `7a1271987b9a1ab62713c7c84a10bc77d082befb`

Atomic implementation commit: this report is part of the single slice commit; the resulting hash is reported to the controller after commit.

> **Current controlling result:** the 2026-08-25 user override section appended at the end of this report supersedes the earlier DOMPurify/deny-list implementation and Fix Round 1 history below. DOMPurify is no longer a production dependency, arbitrary source is accepted as inert text/code, and the canonical sink now uses direct safe-DOM construction. Earlier sections remain only as exact historical RED/GREEN provenance.

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

## User override — permissive inert-text design (2026-08-25)

### Controlling status and design decision

The user superseded Fix Round 2 and the original sanitizer/deny-list contract with: “Abort use of sanitizer. Allow all kinds of text by default.” The implemented safe interpretation is complete for Slice 2:

- all Free-text source categories are accepted by default;
- supported Markdown retains semantic rendering;
- raw HTML/scripts/iframes/media/citations/extensions/shortcodes/widgets/executable-cell options/unknown forms remain visible inert text or display code;
- authored content never becomes HTML through `innerHTML`, `dangerouslySetInnerHTML`, `DOMParser`, template parsing, or another unsanitized authored-string sink;
- safe HTTP(S)/panel-fragment links remain anchors, while unsafe destinations remain visible non-navigating text;
- exact-pinned bundled KaTeX alone may construct trusted renderer-marked HTML/internal-SVG geometry under `trust: false`, strict restrictions, no user macros, and no resource URLs; authored HTML/SVG/style never reaches KaTeX or becomes DOM;
- source, actual generated DOM, nesting, table-row, and table-column limits remain blocking without truncation.

The design spec, fidelity matrix, security/portability record, Slice 2 evidence status, sketch deviation history, implementation plan, ownership inventory, SDD progress, and this report are synchronized to that explicit user-approved deviation. FT-11 reload/import fidelity remains pending Slice 4 and is not promoted.

### Dependency removal and audit

Production dependencies now contain only the two exact-pinned Slice 2 packages:

| Package | Exact version | License | Current decision |
|---|---:|---|---|
| `markdown-it` | 15.0.0 | MIT | Local inert AST/tokenization with authored HTML parsing, linkification, and typographer behavior disabled. |
| `katex` | 0.18.4 | MIT | Local restricted math; trusted renderer output only, with `trust: false`, strict errors, no user macros/resources, `maxExpand: 100`, and `maxSize: 20`. |

`pnpm.cmd remove dompurify` removed two resolved packages and updated `package.json`/`pnpm-lock.yaml`. `src/static-content/qmd/sanitizePortableHtml.js` and `tests/portableQmdSanitization.test.js` were deleted; the behavioral successor is `tests/portableQmdDomSafety.test.js`, not a sanitizer facade. Live `package.json`, lockfile, `src`, and `tests` contain no `dompurify`, `DOMPurify`, `sanitizePortableHtml`, or `sanitized-fragment` reference.

```text
pnpm.cmd audit --prod --audit-level high
1 vulnerabilities found
Severity: 1 moderate
exit 0 at the high threshold
```

```text
pnpm.cmd audit --prod --json
high: 0
critical: 0
moderate: 1
GHSA-fgmj-fm8m-jvvx — pre-existing echarts@5.6.0
```

Neither exact-pinned Slice 2 package is implicated.

### RED → GREEN evidence

#### Arbitrary source acceptance

RED was captured after adding the arbitrary corpus expectation and before removing the deny-list:

```text
node --test --test-name-pattern="accepts arbitrary authored syntax" tests/portableQmdPolicy.test.js
tests 1
pass 0
fail 1
```

The parser returned active-content, iframe, embedded-media, citation, executable-cell, extension/widget/raw-HTML, unsupported-image, and unsafe-math errors. After replacing syntax-category denial with inert acceptance:

```text
node --test --test-name-pattern="accepts arbitrary authored syntax" tests/portableQmdPolicy.test.js
tests 1
pass 1
fail 0
```

The complete policy suite is GREEN at 36/36. It accepts all semantic/arbitrary fixtures, including plain `x<y`, comments/declarations/CDATA/processing instructions, arbitrary fence options, missing footnotes, unsafe math, and unsafe-link source; it independently retains exact/one-over source bytes, nesting, table rows, and table columns.

#### Safe authored DOM and actual generated-node enforcement

RED was captured before the direct-DOM renderer accepted the arbitrary corpus:

```text
node --test --test-concurrency=1 --test-name-pattern="arbitrary authored markup" tests/portableQmdDomSafety.test.js
tests 1
pass 0
fail 1
```

After direct node construction through `createElement`, `createTextNode`, and `textContent`, the complete real-browser safe-DOM suite is GREEN:

```text
node --test --test-concurrency=1 tests/portableQmdDomSafety.test.js
tests 6
pass 6
fail 0
duration_ms 2207.641
```

The six tests prove arbitrary markup is visible but inert with zero active/resource output; semantic Markdown survives without authored HTML parsing; repeated footnote occurrences have unique IDs/backlinks while missing definitions remain visible; exactly 5,000 actual descendants pass and 5,001 fail; one math token cannot expand beyond the actual DOM budget; and trusted superscript/fraction/root/sum output retains accessible labels and computed geometry. KaTeX internal SVG is accepted only under `[data-portable-qmd-generated="math"]` and has zero `href`/`src`/`xlink:href` resource attributes.

#### Explicit safe-DOM sink and user guidance

```text
node --test --test-concurrency=1 --test-name-pattern="canonical ChartView" tests/freeTextChartView.test.js
RED: expected data-portable-qmd-sink="safe-dom"; received "sanitized-fragment"
GREEN: tests 1, pass 1, fail 0
```

```text
node --test --test-concurrency=1 --test-name-pattern="routed controls" tests/freeTextChartView.test.js
RED: help text did not explain that unknown syntax is shown as text
GREEN: mounted editor states “Unknown syntax is shown as text; code never executes.”
```

The mounted routed test also proves pending source revisions disable both forward rails immediately; script/iframe source becomes valid after the 200 ms analysis and creates no active element/execution; a seven-level nesting breach remains blocking; and no page error occurs. The separate rapid-revert test proves cached validation restores matching source/preview revisions without leaving pending state.

### Final focused and impacted verification

```text
node --test --test-concurrency=1 tests/portableQmdPolicy.test.js tests/portableQmdDomSafety.test.js tests/freeTextChartView.test.js tests/staticContentDraft.test.js tests/presentWorkspace.test.js
tests 63
pass 63
fail 0
duration_ms 14962.2905
```

This is behavioral evidence from the real parser, direct-DOM renderer, KaTeX, mounted React editor/wizard, canonical route, draft finalization, and Present composition. It is not label/source-grep or mock-renderer evidence.

The one required directly impacted run produced the previously disposed baseline result, unchanged:

```text
node --test --test-concurrency=1 tests/chartViewV3.test.js tests/v3RuntimeBoundaries.test.js tests/fullscreenDisplay.test.js tests/buildCommandHeader.test.js tests/staticPanelTransaction.test.js tests/staticContentRegistry.test.js
tests 32
pass 30
fail 2
```

The two failures are the already-recorded raw-JSX Node-loader limitation and stale `Compare charts` visibility expectation. The override did not touch either behavior, and no additional baseline comparison was performed.

### Production build and retained browser checkpoints

```text
pnpm.cmd build
```

Passed: lockfile policy; icon reference; biomedical derivatives; 34 dataset profiles; 38 portable sources; Quorum catalogue with 27 chart types, 2 static types, and 40 configured charts; Vite transformed 879 modules and completed in 9.73 seconds. Existing non-module Three/Vanta, mixed `ChartFootprintPicker` import, and chunk-size warnings remain.

The first browser run reached every viewport but failed one newly widened assertion because it searched the entire host chart panel and counted four legitimate host-chrome buttons/attributes outside authored output. The authored source remained literal and no `example.test` request fired. The assertion was correctly narrowed to the explicit canonical `[data-portable-qmd-sink="safe-dom"]`, then the retained production journey passed:

```text
pnpm.cmd exec playwright test tests/e2e/static-free-text.spec.js --project=chromium
3 passed
1 skipped
duration 41.0s
```

Material checkpoints inspected at 1440×900, 1024×768, and 768×900:

- exact `staticText` save contract and source revisions 1→2;
- wide split at 1440/1024 and narrow Source/Preview tabs plus focus continuity at 768;
- literal saved script, iframe, remote-image syntax, widget/shortcode, and executable-cell options in preview, canonical Build, View, and fullscreen;
- zero authored `script`/`iframe`/`img`/media/form/button elements, event/style attributes, resource attributes, code execution, or `example.test` network requests inside the safe-DOM sink;
- semantic callout/table/footnote content and accessible superscript/fraction/root/sum geometry;
- dirty saved-state isolation, Keep editing, Discard, save, bounded overflow, and Present exclusion.

The sole skip is still the exact FT-11 reload continuation annotated `blocked-by-slice-4`; Slice 2 does not claim dashboard/bundle-v4 reload/import fidelity.

### Current files

Engine/dependencies:

- `package.json`
- `pnpm-lock.yaml`
- `src/static-content/qmd/portableQmdPolicy.js`
- `src/static-content/qmd/compilePortableQmd.js`
- `src/static-content/qmd/renderPortableQmd.js`
- deleted `src/static-content/qmd/sanitizePortableHtml.js`

UI/composition:

- `src/components/charts/FreeTextChartView.jsx`
- `src/components/static-content/FreeTextSourceEditor.jsx`
- `src/styles/static-content.css`

Behavioral tests:

- `tests/portableQmdPolicy.test.js`
- `tests/portableQmdDomSafety.test.js`
- deleted `tests/portableQmdSanitization.test.js`
- `tests/freeTextChartView.test.js`
- `tests/staticContentDraft.test.js`
- `tests/e2e/static-free-text.spec.js`

Synchronized records:

- `docs/superpowers/specs/2026-08-24-static-content-panels-design.md`
- `docs/superpowers/plans/2026-08-24-static-content-panels.md`
- `docs/audits/2026-08-24-v3-static-content-panels/FIDELITY-MATRIX.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SECURITY-PORTABILITY-DECISIONS.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SLICE-2-EVIDENCE-STATUS.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SKETCH-DECISION-RECORD.md`
- `docs/audits/2026-08-24-v3-static-content-panels/POST-STEP-7-OWNERSHIP-INVENTORY.md`
- `.superpowers/sdd/2026-08-24-static-content-panels/progress.md`
- this report.

### Self-review and remaining concerns

- Authored source reaches output only through DOM creation APIs/text nodes; the deleted sanitizer was not replaced with a no-op facade.
- The canonical component mounts only a clone of the generated fragment through `replaceChildren`; the safe-DOM sink is named and exercised across every surface.
- Unsupported/unsafe math falls back to visible source; raw authored HTML never reaches KaTeX. Trusted KaTeX output is renderer-marked and resource-free.
- Actual descendant counting occurs after semantic/text/KaTeX generation and before progression/mount; independent exact and one-over fixtures cover every resource boundary.
- Arbitrary syntax cannot create authored styles, foreign elements, event handlers, executable code, unsafe navigation, or subresource requests.
- `git diff --cached --check` passed for the complete 24-file atomic override delta; no unstaged task delta remained before commit.
- The only open feature concern remains FT-11 reload/import fidelity pending Slice 4. The pre-existing moderate ECharts advisory and Vite warnings remain outside this slice. No active-content decision or additional context is required.
