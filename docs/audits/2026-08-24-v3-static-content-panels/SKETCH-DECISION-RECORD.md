# Static Content Sketch Decision and Rejection Record

**Status:** Approved by V3 Design master at `e159db11593f784459e50f7707d93987fa996527`, with user-directed sketch deviations recorded 2026-08-24 and the implemented permissive inert-text deviation recorded 2026-08-25
**Sketches:** `.planning/sketches/021-*` through `024-*`

## Comparative decision

| Sketch | Recommended winner | Accepted design invariant | Rejected alternatives |
|---|---|---|---|
| 021 Free-text authoring | Variant A — split source/live preview when wide, Source/Preview tabs when narrow | Keep Add chart at six stages; text authoring lives at stage 3; invalid source retains a visibly stale last-valid preview and cannot progress; dirty Keep/Discard preserves or restores the exact pair/focus. | B, preview-first: too little room for QMD source and diagnostics. C, focus tabs at all widths: hides the continuous wide comparison; tabs are accepted only at the narrow breakpoint. |
| 022 Image authoring | Variant B — guided stage-3 tool sections followed by passive stage-4 review | Existing `image` identity; stage 3 owns source/accessibility/transforms in guided sections with the crop preview immediately above; stage 4 contains only canonical passive result, validation/portability summary, and atomic Add; dirty Keep/Discard is explicit. | A, canvas + inspector: originally approved, then superseded by the user’s preference for clearer guided progression. C, focused crop dialog: creates nested focus/recovery and suggests independent saves. |
| 023 Saved Build/View panels | Variant A — canonical saved panels with intent-revealed Image actions | Build chrome may transiently compress/reposition but never mutate saved layout; close restores Build UI state. Image actions are hidden at rest and reveal without layout shift on hover, focus within, or touch/tap; failure actions are surface-specific and Audience remains passive. | B, strong nested framing: reduces useful area. C, dense bulletin: changes reading hierarchy and makes static content secondary; its changes are density parameters rather than a materially separate composition. |
| 024 Passive 16:9 Audience | Variant A — Image and temporal chart share the composition; Free text is absent | Image is a non-temporal selected Present item; Audience applies saved transforms passively; image failure remains cell-scoped; chart time context continues independently. | B, send Free text too: explicitly outside the accepted requirement and adds text-responsive complexity to Audience. C, force Image into a Scene: violates current Scene parent/group/frame invariants and makes a static asset temporal by fiction. |

## Interactive states exercised

- 021: authored headings, table, blockquote, callout, and fenced code; the original blocked-script state is superseded—arbitrary script/iframe/media/cell/widget source now previews and saves as inert visible text, while only a resource/complexity error retains the last-valid stale preview and disables progress; narrow Variant A exposes Source/Preview tabs; dirty Cancel has Keep editing/Discard.
- 022: selected Variant B presents source/accessibility/crop/rotation/fit as guided stage-3 sections and retains dirty Cancel; Keep preserves the whole draft, while Discard restores every source/asset/accessibility/transform/fit/focus field, stage, render, and authoring focus from the saved pair; stage 4 remains passive.
- 023: Build mode exposes authoring actions and reversible transient canvas compression; Image actions are absent at rest and reveal on pointer hover, keyboard focus within, or touch/tap; Build, ordinary View, and fullscreen failures show their exact surface-specific action inventories, including fullscreen Retry.
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

## Post-approval user sketch review

The user completed the interactive 021–024 review on 2026-08-24 and selected **021=A, 022=B, 023=A, 024=A**. Sketch 023 A carries the explicit requirement that Image actions are hidden at rest and revealed on pointer hover. Keyboard focus-within and touch/tap reveal are binding equivalent paths so the visual simplification does not remove actions for non-hover input. These are accepted design deviations from the original no-deviation master verdict; affected fidelity rows and retained browser tasks are updated in lockstep.

## Post-approval Free-text security override

On 2026-08-25 the user explicitly directed: “Abort use of sanitizer. Allow all kinds of text by default.” The binding safe implementation accepts arbitrary Free-text source but gives no authored text active-content authority. Raw HTML, scripts, iframes, embedded-media syntax, executable-cell options, citations, extensions, shortcodes, widgets, unknown constructs, and unsafe links are visible inert text/display code; they never become authored DOM elements, event/style attributes, navigation, execution, or resource requests. The production renderer constructs nodes through DOM APIs/`textContent`, removes DOMPurify, and retains every source/actual-node/nesting/table boundary. Exact-pinned bundled KaTeX is trusted only behind `trust: false`, strict restrictions, no user macros/resources, and a renderer-owned marker; its resource-free internal SVG geometry is not permission for authored SVG. This supersedes only the original 021 blocked-script/sanitizer interaction and is synchronized with the design spec, security record, fidelity matrix, Slice 2 evidence, and retained production journey.

## Master review rejection history

The first master review at commit `64c0143` rejected approval while accepting the architectural direction. Binding findings were: invalid Free-text source replaced last-valid preview and could still advance; narrow Variant A stacked rather than tabbed; dirty Cancel was missing; Image authoring controls were mislabeled as stage 4; saved-panel sketches lacked keyboard/fullscreen/failure capability proof; the plan lacked a 36-row execution ledger and sufficient Chrono/Scene/animation/version traceability; and reload-persistent draft recovery had not been presented as a product decision.

The corrected sketches and records retain that rejection as provenance. They remained Proposed until the final master approval at `e159db11593f784459e50f7707d93987fa996527`. The user subsequently selected application-session-only unsaved drafts; reload-persistent authoring recovery is rejected from Step 7S.

The second master review at commit `1d6413a` accepted the earlier major corrections but withheld approval for incomplete Image Discard restoration, missing fullscreen failure/Retry, unresolved post-Step-7 production ownership, and incomplete exact version trace in this record and the fidelity matrix. This bounded pass addresses those four findings without reopening the accepted architecture or draft lifetime.

## Exact version decision

- Dashboard schema: **v4**.
- Export bundle: **v4**.
- Chart config: **v3**, unless a separately approved implementation deviation demonstrates an unavoidable chart-shape change.

This decision is binding with the design spec Versions section, security SP-15/SP-21, fidelity PS-02/PS-03, implementation-plan preconditions, and post-Step-7 ownership inventory.
