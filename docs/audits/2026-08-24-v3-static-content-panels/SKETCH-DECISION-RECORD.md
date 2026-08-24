# Static Content Sketch Decision and Rejection Record

**Status:** Proposed for V3 Design master approval
**Sketches:** `.planning/sketches/021-*` through `024-*`

## Comparative decision

| Sketch | Recommended winner | Accepted design invariant | Rejected alternatives |
|---|---|---|---|
| 021 Free-text authoring | Variant A — split source/live preview in a separate four-stage Add static content flow | Keep Add chart at six stages; type-specific text authoring lives at stage 3; preview uses the production pipeline; blocking validation is visible without destroying the last valid preview. | B, modal-only editing: too little room for QMD source, validation, and preview. C, reuse Add chart: forces irrelevant CSV/mapping/time exceptions and makes stage semantics inconsistent. |
| 022 Image authoring | Variant A — guided source, accessibility, crop/rotation, and canonical preview | Existing `image` identity; saved transform tools are distinct from viewer tools; keyboard alternatives accompany direct manipulation; Present eligibility is explicit. | B, quick-upload card: cannot express crop, rotation, replacement, quota, or alt recovery. C, canvas-first editor: visually powerful but hides source/alt/portability state and creates an unnecessary bespoke editing shell. |
| 023 Saved Build/View panels | Variant A — one canonical panel renderer with Build-only authoring chrome | Build adds Edit/Move actions without changing saved content composition; View removes authoring controls; Free text has no CSV/time/Scene/Present controls; Image retains view zoom. | B, editor embedded permanently in panel: collapses authoring and consumption states and reduces dashboard density. C, separate static dashboard region: breaks the existing grid and fullscreen composition model. |
| 024 Passive 16:9 Audience | Variant A — Image and temporal chart share the composition; Free text is absent | Image is a non-temporal selected Present item; Audience applies saved transforms passively; image failure remains cell-scoped; chart time context continues independently. | B, send Free text too: explicitly outside the accepted requirement and adds text-responsive complexity to Audience. C, force Image into a Scene: violates current Scene parent/group/frame invariants and makes a static asset temporal by fiction. |

## Interactive states exercised

- 021: authored headings, table, blockquote, callout, and fenced code; a script insertion changed validation to a blocking state; the preview contained semantic table/blockquote/callout output after the sketch parser correction.
- 022: 90° rotation and keyboard crop nudge updated normalized permille geometry while leaving the mock original intact.
- 023: Build mode exposed only static Edit controls; View removed them while keeping the same saved compositions.
- 024: forced asset failure replaced only the image cell; the sibling chart and passive 16:9 composition remained intact.

## UI/UX comparative input

UI/UX Pro Max guidance changed the recommended variants in four concrete ways:

1. Direct-manipulation crop has button/numeric keyboard alternatives rather than relying on drag alone.
2. Live validation uses one meaningful status region and preserves visible focus.
3. Long text tokens, code, and tables scroll inside their panel regions instead of creating root horizontal overflow.
4. Responsive authoring collapses the source/preview split into tabs rather than shrinking both panes below a usable width.

## Approval handling

The sketch README files and manifest intentionally say **Proposed**, not Approved. Master-task acceptance must record one of:

- **Accepted as proposed** — promote the winner and set the matching fidelity rows to Accepted.
- **Accepted with deviation** — describe the deviation, affected invariant, production owner, and changed deterministic/browser check.
- **Rejected** — retain the sketch and rationale as discovery evidence; do not delete it.

Production implementation may use these sketches as behavioral evidence only after master approval and Step 7 acceptance.
