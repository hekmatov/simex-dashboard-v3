# V3 fixes and enhancements — 5 November 2026

This summarizes the original V3 issue plan, the approved S8–S13 follow-ups, and changes requested or discovered during guided testing. S1–S12 were previously integrated into public main at `382eb008`; S13 is committed as `ee1144dc`. The accompanying delivery commit records this summary and the final deferral of #22. It introduces no further application changes.

## Original issue plan: S1–S7

| Issue | Delivered outcome |
| --- | --- |
| #11 | Verified gauge ranges can be typed, cleared, saved and reopened normally; retained the working implementation. |
| #16 | Verified categorical axis-label font size and wrapping controls; retained the working implementation. |
| #17 | Chart-type changes preserve compatible settings and partial mappings. Incompatible losses are named before confirmation; cancellation preserves the draft. |
| #18 | Verified full-editor destination/move behavior while retaining chart and placement identity. |
| #19 | Verified categorical filter suggestions and refresh when the source or column changes. |
| #20 | Added legend-entry renaming and individual-entry hiding alongside whole-legend visibility. Hiding an entry leaves its plotted data visible. |
| #21 | Text preview uses the dashboard panel's actual footprint and wrapping. |
| #23 | Verified an omitted/cleared KPI target stays absent while a real zero remains a target. Also corrected an absent fallback-gauge target being shown as zero. |
| #24 | Gauges support higher/lower/neutral favorability. Lower-is-favorable reverses automatic favorable colors while retaining an ascending numeric scale. Explicit colors remain exact. |
| #25 | Image-to-Text conversion removes stale image zoom behavior while retaining identity, authored text and layout. |
| #26 | Start section here uses the canonical section-split transaction, preserving placement identity and order. |
| #28 | Added independent manual category and series ordering with stable colors. Verified palette reachability and restored keyboard focus after Escape. |
| #29 | Verified ordinary Y-axis minimum/maximum, automatic reset and independent secondary-axis bounds; no broken-axis behavior was introduced. |
| #30 | Added stable individual category/bar colors for the reproduced single-series case while preserving multi-series colors. |
| #31 | Freed the text writer from the preview footprint so the editor remains usable at small panel sizes. |
| #32 | CSV creation retains its source, profile, mappings and retry owner after failure. Creation saves pending layout through the existing owner so new sections exist before insertion. Retry produces one chart/source rather than duplicates. |
| #22 | Investigated separately as S14; no confirmed original defect or media-list repair. The user subsequently said to ignore it for now. Deferred and left open. |

Slice commits: S1 `c6495e5a`, S2 `c1b79cc1`, S3 `2afb46bb`, S4 `b0061707`, S5 `1417052b`, S6 `98bd76ae`, S7 `26a25c62`. Rows marked “verified” describe existing functionality checked against the report, rather than replacement implementations.

## Approved follow-up slices: S8–S13

| Slice | Delivered outcome | Commit |
| --- | --- | --- |
| S8 | Replaced the right Properties rail with object quick editors for pages, sections, charts and Text/Image. Retained Structure, canonical Move/remove/full-editor actions and draft ownership. Corrected section identity loss after text edits. | `f2ff38f3` |
| S9 | Added a leftmost drag control and keyboard movement for quick editors, plus position reset. Positions survive edits, scrolling, object switching, close/reopen, save/reset and quick/full transitions without becoming exported chart settings. | `b914b021` |
| S10 | Added accessible Back to top in View/Build, with fixed safe placement, reduced-motion support, draft preservation, sensible focus return and hiding under blocking dialogs/fullscreen. | `6efcce8c` |
| S11 | Added selective collaborator-package import for content, pages, sections and placements. Includes dependency/conflict review, editable collision names, explicit destinations, independent source/media identities, resource validation and a separate acknowledged whole-dashboard replacement. Retry/rollback and uncertain-success handling preserve unrelated content and draft ownership. | `f8c5312a` |
| S12 | Added Automatic plus 21 legend presets, inside/outside positioning, signed fine offsets, reset and drag placement. Placement survives resizing, supported conversions and package round-trips. Constrained legends wrap, paginate or truncate with hover access. | `6aebdcd0` |
| S13 | Fixed intermittent real Audience playback stalls. Reusing preparation for an unchanged temporal frame prevents redundant rendering from delaying connection heartbeats. Source/frame changes invalidate reuse; safety pauses, explicit resume, passive Audience behavior and media ownership remain intact. | `ee1144dc` |

## Fixes and enhancements added during guided testing

- **Preview scrolling:** scrolling over Rendered preview now hands vertical scrolling to the editor appropriately, including Actual-size boundaries, while preserving horizontal inspection.
- **Section creation:** replaced unavailable native prompts with the themed in-app split dialog. Added required name, optional description, cancellation/focus restoration and readable input colors in dark and light themes.
- **Fit versus Actual:** both chart and Text/Image previews fit to available width, expanding smaller panels and shrinking larger ones without an arbitrary automatic height cap. Actual remains 1:1. Adjacent controls now say **Fit to preview area** and **Actual size on dashboard**; logical wrapping and dashboard dimensions remain unchanged.
- **Bar gradients:** a gradient progresses evenly across displayed bar order. Assignments stay attached to category identities through reordering/filtering. Reset clears individual assignments. The legend key and first palette swatch show the resulting gradient rather than an unrelated solid fallback.
- **Color-picker usability:** corrected palettes reopening outside the visible editor after scrolling. Grouped **Default series palette → Named series overrides → Individual bar colors** in the approved priority order, with clear labels and short hover/focus explanations. Palette rows include swatch, eyedropper, code and remove action; Add/default actions explain their effects. Color-code fields fit complete hex values, and Default exposes its active state.
- **Explicit data labels:** Show labels overrides the automatic density limit for axis charts. A popup matrix selects individual points, series rows or observation columns, with All/None, missing-point restrictions, staged Apply/Cancel, focus restoration and saved/package-safe identities. Explicitly enabled dense labels can overlap; selection supplies control over that density.
- **Compact authoring controls:** moved short fields beside their labels, made axis title sizes normal numeric controls, simplified duplicate legend labels, placed visibility checks under entry numbers, and kept Show labels beside its heading. Category/series ordering supports arrows, drag and adjacent Reset. Split the long Appearance group into Titles and background, Legend, Colors, Chart style, Reference line and Ordering.
- **Wizard organization:** combined Source and Destination into one tab with equal desktop halves, Source left and Destination right. Moved chart footprint to Configure. Replaced destination dropdowns with the Build structure map; added Start/End of section and Before/After chart insertion through the existing placement owners. Removed redundant source captions, chart-card descriptions and technical render-header clutter while retaining accessible labels and validation. Chart-type search/purpose controls use a compact toolbar.
- **Rendering correctness:** normalized legal singleton/string measurement bindings before axis rendering to prevent `findIndex` failures. Preserved literal wrapped legend labels containing braces and retained grouped-pie tooltip context. Restored shared authoring-stage/object-editor theme paint.
- **Quick-editor restoration:** returning from Source Content, Scene or Chrono libraries preserves whether the prior editor was open and its focus-return target. Closing or completing an editor invalidates queued reveal/selection callbacks so they cannot reopen it later.
- **Verification maintenance:** aligned browser drivers and assertions with the accepted combined workflow, object editors, import review and preview geometry. Used fixed-input Vite test setup where required. These changes retain persistence, retry and ownership assertions; they are not additional product features.

The guided follow-up implementation history runs from `ad3a7834` through `1801eb5e`. Rendering/verification corrections are `b7dd7261`, `56279d5d`, `22327fc9`, `5b729bdd`, `7bf61733` and `ab431c7a`. The full execution record retains individual regressions, commands and results.

## Verification and remaining limits

- The corrected complete historical unit gate passed **2,627/2,627** at `5b729bdd`. Later bounded changes used their affected checks; this is not a claim that the full unit suite ran again at the delivery documentation commit.
- The final S13 task selection passed **173/173**, including rendering invalidation, legacy Date/undefined contexts, provider Play, unsafe/recovery behavior and media ownership. Scoped review has no outstanding concrete S13 finding.
- The original real-Audience journey passed with its assertions intact for both authored groups: Play/Pause, seek/end/Previous, correct dates/data, current output and End cleanup. Related real-Audience reconnect, liveness, blackout and Ended-state checks also passed.
- The complete S13 Chromium command remains a **failed aggregate: 328 passed, 4 failed, 6 unrun**. The four non-Audience failures passed unchanged in isolation; the six previously unrun static/offline/PDPC cases subsequently passed. Latest combined case dispositions are **338 passed, 0 failed, 0 unrun**, not a passing single aggregate. Intermittent authoring-gate reliability remains a limitation.
- The final static phase performed a fresh successful production build and passed **4/4** offline/static cases. Existing PDPC output checks passed **2/2** against source `5457fc14`; no new PDPC release was generated.
- **#22 remains deferred by the user's instruction.** The initial S14 descriptor/identity probe passed; exploratory browser observations do not establish a repaired media-list defect. No media-list behavior was changed and no GitHub issue was commented on or closed.
- Browser evidence is Chromium. No hosted deployment verification is claimed by this summary. The old preview on port 5190 was observed serving a pre-S13 renderer; it is not evidence of the current delivery code.

See [the V3 issue plan and execution record](superpowers/plans/2026-10-30-v3-open-issues.md) for the complete chronology, failure history, scoped checks and implementation decisions.
