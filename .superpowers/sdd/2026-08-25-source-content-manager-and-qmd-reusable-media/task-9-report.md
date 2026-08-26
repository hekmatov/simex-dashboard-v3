# Task 9 Report — QMD Placement Inspector and Responsive Geometry

## Status

DONE for the accepted Task 9 slice. The QMD placement inspector, exact allowlisted serialization, placement-only media change/open routing, and responsive/RTL runtime geometry are implemented and verified through named Journey C. Task 10 CSV behavior remains untouched and unclaimed.

## RED and GREEN

- The first sandboxed exact command was unusable because linked-worktree Vite/esbuild ancestor reads were denied. The required exact command was rerun outside that restriction before production.
- Usable exact RED: **29 passed / 5 failed / 0 skipped / 0 todo**. Three failures were the absent `QmdMediaInspector.jsx`; the others proved QMD width still depended on inline style/no data token and missing fallback omitted the caption required by the selected geometry contract.
- Focused correction reached **8/8 passing** for inspector and QMD view behavior. Pre-commit inspection then found the shared Change picker still exposed insert-oriented upload/import intake; the focused behavior moved from **13/14 RED** to **14/14 GREEN** after Change became existing-local-only.
- Fresh exact deterministic command: `node --test tests/qmdMediaInspector.test.js tests/portableQmdMedia.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js tests/portableQmdDomSafety.test.js` — **35 passed / 0 failed / 0 skipped / 0 todo**, 10.623 s.
- Exact named command, without a literal separator: `pnpm.cmd test:e2e tests/e2e/qmd-reusable-media.spec.js --project=chromium --grep "Journey C — QMD media controls responsive RTL geometry and request authority"` — **1 passed**, 3.5 s test time and 5.3 s total.

## Implemented boundary

- `QmdMediaInspector` exposes only width 25/33/50/66/75/100 plus a whole custom percent from 10 through 100; logical start/centre/end; block/wrap-start/wrap-end; and progressive frame/caption/alt/decorative controls. It offers no pixel, position, class, style, event, or arbitrary-border authority.
- The selected annotated QMD media node is the edit identity. Every inspector change serializes through `serializePortableMediaReference` and replaces exactly that node's source text. Decorative serialization empties alt while visible caption remains separate.
- **Change image** opens the eligible local-media picker and changes only the selected placement `mediaId`. **Open media item** routes that logical ID through the supplied manager-navigation boundary. Neither action writes library bytes, revision, metadata, or other placements.
- QMD media width is a validated data token consumed by `source-content.css`; no authored/runtime inline-width style is emitted. Height remains automatic, stored width/height reserve aspect, output is content-column relative, wrap is capped at 50%, and the existing inline-size container collapses wrap below 30rem while restoring authored logical alignment.
- Build-only repair remains separate from authoring selection. Missing/corrupt View and fullscreen states stay passive, bounded, caption-capable, and image/request free.

## Journey C evidence

- Build 1440×900 exercised every preset, custom 37%, logical End, Wrap start, Card, visible caption, contextual alt, Change image, and Open media item. The canonical preview was awaited after each serialization change. At authored 75%/wrap-start, measured width was exactly 50% of the content column with logical `inline-start` float and zero overflow.
- Build 1024×768 measured the final 37% content-relative placement, Card/caption, reserved 800×400 (2:1) aspect, and zero panel/document horizontal overflow.
- View 390×844 retained authored `wrap-start` and 37% width while computed float collapsed to `none`; no repair control or horizontal overflow appeared.
- Fullscreen at 390×844 in RTL retained logical `align=end` and authored wrap token, collapsed to block, rendered the bounded unavailable explanation with zero images/repair controls, and produced zero horizontal overflow.
- Focus remained on the selected placement, progressive More control, and Open action at their inspected checkpoints. The placement changed from `response` to `alternate`, Open routed `alternate`, and the exact media-library snapshot—including revisions—remained unchanged.
- The page-error inventory and authored external/data/file request inventory were empty.

## Row disposition

- **SCM-S11:** Passing for the complete exact allowlist, safe-host/runtime, authoring, request-authority, and Journey C slice.
- **SCM-C06:** Passing for exact progressive controls, allowlisted serialization, focus/context, placement-only Change, and Open routing.
- **SCM-C07:** Passing for reserved aspect, content fit, all preset/custom widths, 50% wrap cap, narrow collapse, RTL logical alignment, passive fallback, and zero overflow.
- **SCM-R03:** Passing for the named Journey C Build/View/fullscreen fidelity contract.
- **SCM-SP10 / SCM-SP11 / SCM-D01:** Task 9 closes the retained inspector/geometry evidence. No ambient request or arbitrary styling/positioning authority was introduced.

No Task 10 behavior, parent `progress.md`, generated output, dependency, full build, full suite, merge, push, or deployment is included.
