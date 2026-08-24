# Slice 2 Free-text evidence and status

Date: 2026-08-25

## Layer status

| Area | Engine | UI/composition | Fidelity |
|---|---|---|---|
| FT-03–FT-06 portable QMD policy and safety | Passing: 36 policy/parser assertions and 6 real-browser safe-DOM assertions | Arbitrary source saves as inert text/code; only resource/complexity or genuine renderer errors block; stale preview, actual generated-DOM budgets, and exact-save revalidation remain implemented | Arbitrary script/iframe/media/cell/widget corpus inspected as inert with zero authored active DOM/resources; imported-source and exhaustive live limit/link activation states remain explicitly unclaimed where the matrix says so |
| FT-07–FT-10 authoring and canonical renderer | Passing: mounted editor/canonical-route semantics, pending/revision race, accessible math structure/geometry, and overflow assertions | One `FreeTextChartView` is used by authoring preview, Build, View, and fullscreen; wide split, narrow tabs, focus continuity, immediate pending gates, and bounded overflow implemented | Production journey passed at 1440×900, 1024×768, and 768×900 |
| FT-11 lifecycle | Passing: exact QMD save plus revision 1→2 and dirty saved-state isolation | Create, Keep editing, Discard, edit/save, Build, View, and fullscreen implemented | In-session production lifecycle passed at all three viewports; reload/import continuation is retained as `fixme` pending Slice 4, so FT-11 is not Passing |
| FT-12 Present exclusion | Passing for capability/index and Present catalogue | Free text is omitted from Present through the shared capability model | Absence inspected at all three viewports; protocol injection/separate Audience remains Slice 6, so FT-12 is not Passing |
| PS-01 / SP-22 application-session draft lifetime | Passing for the Free-text transaction/source pair | Dirty authoring stays in component/session state; storage remains at last saved QMD until Save | Stored QMD inspected while dirty, after Discard, and after Save; reload restoration pending Slice 4 |

## Dependency and security review

The smallest local dependency set is exact-pinned:

| Package | Version | License | Role / decision |
|---|---:|---|---|
| `markdown-it` | 15.0.0 | MIT | Inert token AST with `linkify: false` and `typographer: false`; the exact pin is beyond both the `<14.1.1` linkify ReDoS advisory and the `<=14.1.1` smartquotes quadratic-DoS advisory |
| `katex` | 0.18.4 | MIT | Bundled restricted math rendering with `trust: false`, strict restrictions, no user macros/resource URLs, and a renderer-owned marker; trusted HTML/internal SVG preserves geometry while authored HTML/SVG/style remains text |

`pnpm audit --prod --audit-level high` exits 0 with zero high/critical findings. The detailed audit reports one pre-existing moderate ECharts advisory, `GHSA-fgmj-fm8m-jvvx`; it does not involve the Slice 2 dependency set.

## Browser checkpoints

The retained production test performs and inspects, rather than screenshot-only sampling:

- four-stage Free-text creation and the exact saved `staticText` source contract;
- initial source revision 1, immediate pending/revision gates before the 200 ms analysis, arbitrary script/iframe/media/cell/widget edits becoming valid inert previews, complexity-only blocking, rapid-revert cache recovery, unsaved edit isolation, Discard restoration, and saved edit revision 2;
- accepted semantic QMD, callout/table content, unique repeated-footnote references/backlinks, accessible superscript/fraction/root/sum math with non-flattened production geometry, canonical preview, Build, View, and focused fullscreen;
- actual internal vertical overflow at wide sizes, `overflow-y: auto` ownership at every size, and no root horizontal growth;
- wide split authoring at 1440/1024 and Source/Preview tabs with source-focus continuity at 768;
- capability-driven absence from the live Present catalogue.

The reload continuation is intentionally retained but marked `fixme` with `blocked-by-slice-4`. The current bounded App-session typed-static v3 bridge is not evidence of dashboard/bundle v4 reload or import fidelity.

## Deviations

The 2026-08-25 user override explicitly changes the accepted Free-text source and security design: DOMPurify and the deny-list are removed; arbitrary text may save; unsupported forms remain visible and inert; and output is constructed through DOM APIs/text nodes without authored HTML parsing. Trusted exact-pinned KaTeX alone may produce renderer-marked, resource-free HTML/internal-SVG geometry. This does not permit authored styles, SVG/MathML, event handlers, elements, execution, navigation outside approved links, or resource loads. Resource limits, responsive authoring, canonical surfaces, Present exclusion, and in-session lifecycle remain unchanged. Reload/import-dependent FT-11 stays pending Slice 4 and protocol-injection FT-12 stays pending Slice 6; neither is reported as Passing.
