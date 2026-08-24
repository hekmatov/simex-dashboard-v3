# Static Content Sketch Decision and Rejection Record

**Status:** Approved without deviations by V3 Design master at `e159db11593f784459e50f7707d93987fa996527` (design only; not implemented)
**Sketches:** `.planning/sketches/021-*` through `024-*`

## Comparative decision

| Sketch | Recommended winner | Accepted design invariant | Rejected alternatives |
|---|---|---|---|
| 021 Free-text authoring | Variant A — split source/live preview when wide, Source/Preview tabs when narrow | Keep Add chart at six stages; text authoring lives at stage 3; invalid source retains a visibly stale last-valid preview and cannot progress; dirty Keep/Discard preserves or restores the exact pair/focus. | B, preview-first: too little room for QMD source and diagnostics. C, focus tabs at all widths: hides the continuous wide comparison; tabs are accepted only at the narrow breakpoint. |
| 022 Image authoring | Variant A — stage-3 canvas + inspector followed by passive stage-4 review | Existing `image` identity; stage 3 owns source/accessibility/transforms; stage 4 contains only canonical passive result, validation/portability summary, and atomic Add; dirty Keep/Discard is explicit. | B, guided stacked sections: separates crop consequence from controls. C, focused crop dialog: creates nested focus/recovery and suggests independent saves. |
| 023 Saved Build/View panels | Variant A — canonical saved panels with Build-only authoring and active View/fullscreen Image tools | Build chrome may transiently compress/reposition but never mutate saved layout; close restores Build UI state. Image tools are keyboard-discoverable in View/fullscreen; failure actions are surface-specific. | B, strong nested framing: reduces useful area. C, dense bulletin: changes reading hierarchy and makes static content secondary. |
| 024 Passive 16:9 Audience | Variant A — Image and temporal chart share the composition; Free text is absent | Image is a non-temporal selected Present item; Audience applies saved transforms passively; image failure remains cell-scoped; chart time context continues independently. | B, send Free text too: explicitly outside the accepted requirement and adds text-responsive complexity to Audience. C, force Image into a Scene: violates current Scene parent/group/frame invariants and makes a static asset temporal by fiction. |

## Interactive states exercised

- 021: authored headings, table, blockquote, callout, and fenced code; a blocked script retains the last-valid preview with a stale marker and disables progress; narrow Variant A exposes Source/Preview tabs; dirty Cancel has Keep editing/Discard.
- 022: stage 3 contains source/accessibility/crop/rotation/fit and dirty Cancel; Keep preserves the whole draft, while Discard restores every source/asset/accessibility/transform/fit/focus field, stage, render, and authoring focus from the saved pair; stage 4 remains passive.
- 023: Build mode exposes authoring actions and reversible transient canvas compression; View/fullscreen expose keyboard-focusable zoom/pan/reset; Build, ordinary View, and fullscreen failures show their exact surface-specific action inventories, including fullscreen Retry.
- 024: advancing the chart clock changes the temporal frame while Image revision 7 remains unchanged; forced asset failure replaces only the image cell and preserves the sibling chart/passive 16:9 composition.

## UI/UX comparative input

UI/UX Pro Max guidance changed the recommended variants in four concrete ways:

1. Direct-manipulation crop has button/numeric keyboard alternatives rather than relying on drag alone.
2. Live validation uses one meaningful status region and preserves visible focus.
3. Long text tokens, code, and tables scroll inside their panel regions instead of creating root horizontal overflow.
4. Responsive authoring collapses the source/preview split into tabs rather than shrinking both panes below a usable width.

## Approval handling

The V3 Design master selected **Accepted as proposed** at `e159db11593f784459e50f7707d93987fa996527`; no design deviations were recorded. The possible verdicts were:

- **Accepted as proposed** — promote the winner and set the matching fidelity rows to Accepted.
- **Accepted with deviation** — describe the deviation, affected invariant, production owner, and changed deterministic/browser check.
- **Rejected** — retain the sketch and rationale as discovery evidence; do not delete it.

Production implementation may use these sketches as behavioral evidence only after master approval and Step 7 acceptance.

## Master review rejection history

The first master review at commit `64c0143` rejected approval while accepting the architectural direction. Binding findings were: invalid Free-text source replaced last-valid preview and could still advance; narrow Variant A stacked rather than tabbed; dirty Cancel was missing; Image authoring controls were mislabeled as stage 4; saved-panel sketches lacked keyboard/fullscreen/failure capability proof; the plan lacked a 36-row execution ledger and sufficient Chrono/Scene/animation/version traceability; and reload-persistent draft recovery had not been presented as a product decision.

The corrected sketches and records retain that rejection as provenance. They remained Proposed until the final master approval at `e159db11593f784459e50f7707d93987fa996527`. The user subsequently selected application-session-only unsaved drafts; reload-persistent authoring recovery is rejected from Step 7S.

The second master review at commit `1d6413a` accepted the earlier major corrections but withheld approval for incomplete Image Discard restoration, missing fullscreen failure/Retry, unresolved post-Step-7 production ownership, and incomplete exact version trace in this record and the fidelity matrix. This bounded pass addresses those four findings without reopening the accepted architecture or draft lifetime.

## Exact version decision

- Dashboard schema: **v4**.
- Export bundle: **v4**.
- Chart config: **v3**, unless a separately approved implementation deviation demonstrates an unavoidable chart-shape change.

This decision is binding with the design spec Versions section, security SP-15/SP-21, fidelity PS-02/PS-03, implementation-plan preconditions, and post-Step-7 ownership inventory.
