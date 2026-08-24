# V3 Design Master Approval Record — Step 7S

## Verdict

**Approved without design deviations** at discovery commit `e159db11593f784459e50f7707d93987fa996527`. All ten requested decisions and all 36 fidelity rows are binding accepted design requirements. They are not implemented functionality. Production work remains blocked until Step 7 is accepted and the post-Step-7 ownership inventory is committed and synchronized; that gate prohibits production code, configuration, dependencies, and tests before it passes.

## Review request — resolved

The corrected Step 7S static-content design was submitted for approval, approval with recorded deviations, or rejection. The final verdict is recorded above. It does not authorize production implementation until Step 7 is accepted and an implementation branch is created from its final accepted commit.

The first review rejected approval at `64c0143` while accepting the architectural direction. The second review at `1d6413a` accepted the major corrections but found four bounded gaps: complete Image Discard restoration, fullscreen failure/Retry, deterministic post-Step-7 ownership resolution, and the exact version trace in the matrix/decision record. Both rejection rounds and their corrections are preserved in `SKETCH-DECISION-RECORD.md`. Renewed review must exercise the corrected interactions rather than rely on earlier screenshots.

## Baseline and isolation

- Discovery branch: `codex/static-content-panels-design`
- Discovery worktree: `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\static-content-panels-design`
- Starting Step 7 commit: `e5419142e8b56b6c2dc56570a961048960a31027`
- Production boundary check: no `src`, production test, script, manifest, lockfile, generated catalogue, or shared production CSS change.
- Baseline note: the full test suite at the starting commit was already red from Windows sandbox/esbuild traversal and existing temporal/catalogue contract mismatches. Step 7S did not repair or reclassify those failures.

## Accepted approval decisions

1. Accept a separate four-stage **Add static content** workflow and keep the six-stage **Add chart** workflow unchanged.
2. Accept `portable-qmd-v1`, including support/defer/reject decisions in the explicit feature table.
3. Accept enhancement of the single existing `image` type with typed sources, durable assets, permille crop after quarter-turn rotation, and separate transient viewer state.
4. Accept no static Scene membership.
5. Accept Free text in Build/View/fullscreen only, with no Present/Audience selection or protocol support.
6. Accept Image as a direct non-temporal Present composition item and passive Audience cell.
7. Accept the exact version trace: dashboard schema v4 and bundle v4; chart config remains v3 unless implementation proves a chart-shape change and an accepted deviation records it.
8. Accept sketch Variant A for 021–024 without deviations.
9. Accept the user-selected application-session-only unsaved-draft lifetime recorded below.
10. Accept the hard post-Step-7 ownership-resolution gate: implementation cannot begin until exact source/function/CSS/test ownership is inspected from the final accepted Step 7 commit, committed in an inventory, and synchronized into the fidelity matrix and 36-row ledger.

## Artifacts

- Design specification: `docs/superpowers/specs/2026-08-24-static-content-panels-design.md`
- Interactive sketches: `.planning/sketches/021-free-text-authoring` through `.planning/sketches/024-image-audience-rendering`
- Sketch rejection record: `docs/audits/2026-08-24-v3-static-content-panels/SKETCH-DECISION-RECORD.md`
- Fidelity matrix: `docs/audits/2026-08-24-v3-static-content-panels/FIDELITY-MATRIX.md`
- Security/portability record: `docs/audits/2026-08-24-v3-static-content-panels/SECURITY-PORTABILITY-DECISIONS.md`
- File-by-file plan: `docs/superpowers/plans/2026-08-24-static-content-panels.md`
- Step 7 wait list: `docs/audits/2026-08-24-v3-static-content-panels/STEP-7-WAIT-LIST.md`

## Discovery evidence

- Existing Image uses a single inline row (`src`, `alt`, `fit`), a shared `ImageChartView`, and local transient 1–3× zoom; it has no pan, saved transform, durable uploaded asset, or image-load failure recovery.
- The chart wizard’s six stages are structurally coupled to data source, profiling, mapping, preparation, and proof. The separate static workflow avoids false CSV/time states.
- Ordinary editing currently commits chart config and Chrono groups but cannot atomically edit a content source.
- Bundle v3 is JSON-only and has no binary asset payload. The existing browser artifact store is for derived runtime artifacts and is not a durable authored-asset store.
- Fullscreen and Audience already share the canonical ChartView path. Audience uses passive interaction, making Image-only support a narrow extension.
- Current Scene validation requires Chrono parent/group membership and frame/time bounds. Static Scene membership would require a separate Scene-model redesign.
- Browser walkthroughs exercised accepted content, blocked script validation, rotation/crop keyboard state, Build/View action suppression, passive 16:9 composition, and image-failure isolation.
- The final Image Discard walkthrough changed source kind, staged replacement state, alt, fit, focus anchor, crop, and rotation; Keep preserved every change, while Discard restored every saved value, stage 3, rendered geometry, and focus to Source.
- The final fullscreen walkthrough opened Image fullscreen, forced failure, observed only “Image unavailable,” the non-authoring explanation, and Retry, confirmed Replace/Edit were absent, and successfully retried to the active fullscreen viewer.

## Draft-lifetime decision

**User-approved: application-session-only.** Unsaved Free-text/Image source, alternative-text, crop, rotation, and fit drafts last only for the current application session, matching chart creation. Reload restores only the last saved panel/source pair. Image asset staging may persist solely as a transaction-recovery/orphan-cleanup journal; it must not reconstruct unsaved authoring content. Reload-persistent authoring drafts are outside Step 7S.

## Fidelity status

The matrix contains 36 accepted design rows across semantic, composition, and real-use layers, with a matching 36-row executable plan ledger. PS-02/PS-03 state dashboard schema v4, export bundle v4, and chart config v3 explicitly. No row is labeled Implemented or Passing. The later implementation must pass live creation/editing/View/fullscreen journeys for both types, Free-text Present exclusion, Image Present/Audience, and Audience failure isolation.

## Exit from this discovery task

The verdict is synchronized into the specification, sketch records, security record, fidelity matrix, and implementation ledger. Retain this branch as design provenance. Start implementation later from the final accepted Step 7 commit, not by continuing from or merging production changes into this worktree.
