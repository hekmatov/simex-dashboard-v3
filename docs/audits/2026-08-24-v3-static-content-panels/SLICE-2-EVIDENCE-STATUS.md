# Slice 2 Free-text evidence and status

Date: 2026-08-25

## Layer status

| Area | Engine | UI/composition | Fidelity |
|---|---|---|---|
| FT-03–FT-06 portable QMD policy and safety | Passing: 36 policy/parser/renderer assertions and 5 real-browser sanitizer/sink assertions | Blocking errors, linked recovery guidance, stale preview, actual sanitized-DOM budgets, and exact-save revalidation implemented | Accepted/malicious corpus inspected in real browser; imported-source and exhaustive live limit/link activation states remain explicitly unclaimed where the matrix says so |
| FT-07–FT-10 authoring and canonical renderer | Passing: mounted editor/canonical-route semantics, pending/revision race, accessible math structure/geometry, and overflow assertions | One `FreeTextChartView` is used by authoring preview, Build, View, and fullscreen; wide split, narrow tabs, focus continuity, immediate pending gates, and bounded overflow implemented | Production journey passed at 1440×900, 1024×768, and 768×900 |
| FT-11 lifecycle | Passing: exact QMD save plus revision 1→2 and dirty saved-state isolation | Create, Keep editing, Discard, edit/save, Build, View, and fullscreen implemented | In-session production lifecycle passed at all three viewports; reload/import continuation is retained as `fixme` pending Slice 4, so FT-11 is not Passing |
| FT-12 Present exclusion | Passing for capability/index and Present catalogue | Free text is omitted from Present through the shared capability model | Absence inspected at all three viewports; protocol injection/separate Audience remains Slice 6, so FT-12 is not Passing |
| PS-01 / SP-22 application-session draft lifetime | Passing for the Free-text transaction/source pair | Dirty authoring stays in component/session state; storage remains at last saved QMD until Save | Stored QMD inspected while dirty, after Discard, and after Save; reload restoration pending Slice 4 |

## Dependency and security review

The smallest local dependency set is exact-pinned:

| Package | Version | License | Role / decision |
|---|---:|---|---|
| `markdown-it` | 15.0.0 | MIT | Inert token AST with `linkify: false` and `typographer: false`; the exact pin is beyond both the `<14.1.1` linkify ReDoS advisory and the `<=14.1.1` smartquotes quadratic-DoS advisory |
| `dompurify` | 3.4.14 | MPL-2.0 OR Apache-2.0 | Browser DOM sanitizer; one fresh instance per call, explicit HTML tags/attributes/hooks, no shared config or `IN_PLACE` mutation |
| `katex` | 0.18.4 | MIT | Bundled restricted math rendering; HTML-only output admitted with renderer-marked class and numeric-em geometry attributes, while authored styles, MathML, SVG, resources, and foreign content remain excluded |

`pnpm audit --prod --audit-level high` exits 0 with zero high/critical findings. The detailed audit reports one pre-existing moderate ECharts advisory, `GHSA-fgmj-fm8m-jvvx`; it does not involve the Slice 2 dependency set.

## Browser checkpoints

The retained production test performs and inspects, rather than screenshot-only sampling:

- four-stage Free-text creation and the exact saved `staticText` source contract;
- initial source revision 1, immediate pending/revision gates before the 200 ms analysis, an iframe-edit blocking error with both forward rails disabled, rapid-revert cache recovery, unsaved edit isolation, Discard restoration, and saved edit revision 2;
- accepted semantic QMD, callout/table content, unique repeated-footnote references/backlinks, accessible superscript/fraction/root/sum math with non-flattened production geometry, canonical preview, Build, View, and focused fullscreen;
- actual internal vertical overflow at wide sizes, `overflow-y: auto` ownership at every size, and no root horizontal growth;
- wide split authoring at 1440/1024 and Source/Preview tabs with source-focus continuity at 768;
- capability-driven absence from the live Present catalogue.

The reload continuation is intentionally retained but marked `fixme` with `blocked-by-slice-4`. The current bounded App-session typed-static v3 bridge is not evidence of dashboard/bundle v4 reload or import fidelity.

## Deviations

No accepted UI, source, renderer, or security behavior changed. Renderer-owned KaTeX classes and numeric-em geometry are a scoped implementation of the already approved HTML-only math output, not permission for authored styles: raw HTML and authored style syntax still fail before rendering, and the final sanitizer denies resources and foreign content. A phase-order ruling defers only the reload/import-dependent completion of FT-11 to Slice 4 and the protocol-injection half of FT-12 to Slice 6. Neither pending boundary is reported as Passing.
