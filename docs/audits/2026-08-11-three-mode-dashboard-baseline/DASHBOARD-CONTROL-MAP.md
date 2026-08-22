# Dashboard-control availability map

- **Audit date:** 2026-08-11
- **Subject:** current runtime Build controls and their relationship to the dashboard canvas
- **Status:** inventory and contract inputs; no interaction pattern selected

## Evidence notation

- **Observed (`O`)** — exercised or measured in the live application.
- **Source-derived (`S`)** — established by reading current implementation source.
- **Inference (`I`)** — implication for the next UI-contract decision; not an observed behavior.

“Available” in this map distinguishes three properties:

1. **Existence:** a visible control or field is present.
2. **Reachability:** it can be reached while the relevant dashboard context remains useful.
3. **Truthfulness:** its label and enabled state correspond to an implemented, comprehensible action.

The map evaluates the current UI against the invariant that dashboard-level controls for pages, sections, layout, and Chrono Groups remain available without reflowing or covering dashboard content. It does not prescribe where those controls should live.

## Control inventory

| Scope | Entry / selection | Controls currently offered | Availability and reachability | Target/context visibility | Truthfulness and unresolved behavior | Evidence |
|---|---|---|---|---|---|---|
| Dashboard / scenario | Select **Scenario** in Structure. | Program, Scenario, Updated date. | **O:** exists in the desktop Structure-to-inspector path and the trigger retained focus. **O:** the desktop path reserves layout columns; deep dashboard scrolling moves the inspector out of view. **O:** at 390 Structure is before the canvas in normal flow rather than jointly available with it. | **O:** useful top-of-page canvas context is visible on desktop, but at a compressed width. **I:** deep-page edits lack persistent dashboard context plus controls. | **O:** fields exist; mutations were not performed during this audit, so persistence/validation is unverified. | Live runtime, 1440 desktop and 390 mobile. |
| Page | Select **Biomedical** in Structure. | Page label, Page title, Description. | **O:** exists on desktop through Structure and inspector. **I:** reachability degrades with document scroll because the control surfaces do not remain aligned to a selected deep target. | **O:** page canvas remains visible on desktop but is compressed from 1377 px in View to a 711 px Build grid at 1440. | **O:** field labels match page metadata. Save, validation, and cancellation effects were not exercised. | Live runtime; [1440 baseline](screenshots/runtime-build-1440x900-biomedical-top.png). |
| Section | Select **Outbreak dynamics** in Structure. | Section title, Description. | **O:** exists on desktop; selection auto-scrolled the section into view. | **O:** selected section and inspector were visible together at 1440, inside the compressed live canvas. **I:** this demonstrates location assistance but not geometry equivalence. | **O:** metadata labels are intelligible. Mutation behavior was not exercised. Structural section actions are not gathered in this inspector. | Live runtime selection. |
| Panel / chart definition | Click panel or **Edit chart** in its inline action row. | Data, Appearance, Axes, Interactions, Advanced. Appearance exposes title, description/visibility, alignment, background/transparency, colours, line width, reference line, and labels. | **O:** exists. At top-of-page desktop, inspector and panel are jointly reachable. At central/bottom desktop positions the inspector is entirely outside the viewport. At 1024 the inspector sheet is reachable but covers the full target. At 390 the inspector is about 10,975 px below the target. | **O:** panel visibility depends on viewport/position. **O:** every Build panel loses 38 px of plot height to the inline action row. | **O:** tab labels mostly correspond to coherent groups. **O:** Advanced presented an unlabeled empty input, so purpose/state are not truthful enough to evaluate. **O:** responsive Close/Escape can hide the surface without ending the selected/edit session. | Live runtime; [desktop bottom](screenshots/runtime-build-1440x900-selected-bottom.png), [1024 sheet](screenshots/runtime-build-1024x768-selected-top-inspector-sheet.png), [390 separation](screenshots/runtime-build-390x844-selected-top-inspector.png). |
| Panel placement, layout, and sizing | No dedicated trigger found. Inline row offers Edit chart, Start section here, Remove chart. | No width, height, span, or direct placement/sizing controls were exposed in the inspected tabs. | **O:** sizing/layout controls are unavailable in the inspected current UI. **S:** Start section here and Remove chart render, but callbacks are absent from the mapped source path. | **I:** there is no current interaction in which the selected panel and affected neighbours can be evaluated during layout changes. | **S:** visible action affordances without mapped callbacks have uncertain operational truthfulness. Exact layout/sizing scope remains a Step 3 question. | Live runtime plus current-source mapping. |
| Chrono Groups | Select **Municipal outbreak playback** in Structure. | Primary clock, Datum, Matching, member-chart summary. | **O:** summary exists and is reachable through the desktop rail/inspector path. No input, select, or button was present, so edit availability is absent or intentionally out of scope. | **O:** dashboard remains visible but compressed on desktop. Member charts are named in the summary; no direct contextual highlighting was observed. | **O:** the summary is truthful as read-only information. **I:** the selection's purpose is ambiguous if users expect Build to manage Chrono Groups. | Live runtime selection. |
| Panel-to-section actions | Inline panel action row. | Start section here; Remove chart. | **O:** present on each inspected Build panel and therefore locally reachable. **O:** their row consumes chart plot area. | **O:** the affected panel remains visible; downstream section/page consequences are not previewed in a tested action. | **S:** mapped callbacks are absent, so presence does not establish functionality. No mutation was attempted. | Live runtime plus source mapping. |
| Global mode navigation during chart editing | App header mode controls. | View, Build, Present navigation. | **O:** visible, but disabled while a chart edit session remains active. Escape at 1024 hides the sheet without restoring these controls; Cancel restores the session state. | **O:** dashboard remains behind the header/sheet, though the selected panel may be fully covered. | **O:** disabling reflects an edit lock, but sheet dismissal does not communicate that the lock remains. | Live runtime at 1024. |

## Availability by viewport behavior

| Control family | 1440×900 / 1200×900 | 1024×768 | 768×1024 | 390×844 | Non-reflow / non-cover assessment |
|---|---|---|---|---|---|
| Scenario, page, section, Chrono Group selection | **O:** Structure is a left layout rail; inspector is a right layout rail. Both are initially visible. | **O:** desktop rails have zero layout footprint in the unselected baseline. A chart selection opens a fixed inspector sheet; Structure selection was not re-measured in this exact viewport. | **O:** desktop rails have zero layout footprint in the unselected baseline. A current-runtime selected Structure state was not separately measured. | **O:** Structure becomes a 351×544 normal-flow block before the live canvas. | **O:** desktop availability reflows/compresses the dashboard. At narrow widths, continuous joint availability with dashboard content is not established. |
| Panel editing | **O:** right inspector plus inline 38 px panel action row. At deep positions the right inspector scrolls fully out of view. | **O:** fixed inspector sheet covers 100% of selected panel. | **O:** inline action row is present in baseline; current-runtime selected-sheet coverage was not separately measured at this size. | **O:** inspector follows the long dashboard; selected target and controls are separated by about 10,975 px. | **O:** no measured viewport preserves original View plot geometry while also keeping selected target and chart controls jointly usable and unobscured. |
| Panel layout/sizing | **O:** no dedicated controls found. | **O:** none found in inspected editor. | **O:** none found in inspected editor. | **O:** none found in inspected editor. | Unavailable; behavior cannot yet be assessed. |
| Global mode controls | **O:** header controls remain visible at the top; document scrolling may move them out of the viewport. | **O:** visible near the top but disabled during the lingering edit session after Escape. | **S:** same edit-session control path. | **S:** same edit-session control path. | Their existence does not solve dashboard-level editing reachability. |

### Geometry attached to availability

The desktop rails are “persistent” as reserved layout columns, not persistent as viewport-sticky controls. Their cost is measurable:

| Viewport | View grid | Build grid | Build change | Control consequence |
|---|---:|---:|---:|---|
| 1440×900 | 1377 px | 711 px | −666 px | Structure and inspector are both initially available, but panel and plot width are almost halved. |
| 1200×900 | 1137 px | 606 px | −531 px | Same availability pattern and severe compression. |
| 1024×768 | 961 px | 943 px | −18 px | Baseline widths are closer, but selecting a panel introduces a sheet that covers the entire selected target. |
| 768×1024 | 729 px | 687 px | −42 px | Rails are absent from baseline layout; inline editing chrome still reduces plot height by 38 px. |
| 390×844 | 351 px | 317 px | −34 px | Normal-flow control placement avoids overlay but makes target/control distance impractical. |

Thus, the current implementation trades among availability, target visibility, and geometry equivalence; it does not meet all three simultaneously in the measured states.

## Operational truthfulness findings

| Priority | Finding | Basis |
|---|---|---|
| High | A visible responsive inspector can be dismissed while the chart edit session and disabled global navigation remain active. | **O:** Escape at 1024 hid the sheet; Cancel was still required to end editing. |
| High | Chrono Group selection presents an inspectable object but no editing operation. | **O:** only read-only clock, datum, matching, and membership summary appeared. Whether this is intentional is unresolved. |
| High | Panel layout/sizing is part of the Build problem but has no exposed control surface. | **O:** no span/width/height/placement controls were found. |
| Medium | Start section here and Remove chart look actionable, but the mapped implementation path has no callbacks. | **S:** source mapping; mutations deliberately not attempted. |
| Medium | Advanced is a named disclosure level without a legible control contract. | **O:** it contained an unlabeled empty input. |
| Medium | Selected-state styling may not match emitted class names. | **S:** runtime uses `.chart-panel.selected`; mapped CSS expects `.chart-panel-selected`. |

## What is and is not continuously available now

| Need | Current status | Audit conclusion |
|---|---|---|
| Change scenario/page/section metadata while retaining dashboard context | Partly available at desktop top; rails compress the canvas and scroll away from deep targets. | **I:** availability exists, but not under the geometry and reachability invariant. |
| Edit a selected chart while seeing its rendered result | Possible for a top desktop panel; impossible in measured central/bottom desktop positions without leaving the target, fully covered at 1024, and remotely separated at 390. | **I:** position and viewport determine whether the editing loop exists. |
| Change panel layout/sizing | Not exposed. | **I:** Step 3 must define the control domain before Step 4 evaluates interaction patterns. |
| Inspect a Chrono Group | Available through Structure/inspector on desktop. | **I:** inspection is present; editing scope is unresolved. |
| Edit a Chrono Group | No edit controls observed. | **I:** unavailable or intentionally excluded; needs an explicit contract. |
| Navigate modes while a chart editor is active | Controls visible but disabled. | **I:** closing/dismissing and cancelling require distinct, explicit semantics. |

## Invariants handed forward

- Build must use the same dashboard canvas width, grid breakpoints, panel arrangement, panel dimensions, and chart plot area as View at the same viewport.
- Editing chrome may not consume dashboard grid width or plot height.
- Dashboard-level controls may not cover dashboard content merely to remain available.
- A selected object and the controls needed for the current task must be jointly reachable. If the original object is intentionally obscured, the editing surface must carry a live rendering whose required fidelity is defined in Step 3.
- Selection, Close, Escape, Save, and Cancel need distinct session and focus outcomes; dismissal must not leave an invisible edit lock.
- Responsive behavior must be evaluated for top, bottom, centre, left-edge, and right-edge panels, not only a first panel near the top.
- Control labels and enabled states must correspond to implemented operations or clearly identified read-only information.

## Open control-contract decisions

- Which scenario/page/section operations must be available continuously, and which may be invoked on demand?
- Is panel ordering direct, command-based, or managed at a larger page/section level? What constitutes panel “size” under a fixed dashboard grid?
- Does a selected panel have a single editor session across responsive surface changes, and what exactly ends that session?
- Are Chrono Groups edited in Build? If so, are membership, primary clock, datum, and matching one workflow or progressive sub-tasks?
- Must section creation/removal be local to a panel, or managed from a dashboard-level structure surface?
- Which panel changes require the original dashboard context, and which can safely use a larger editor with a live rendering?
- What focus target and scroll position are restored after Close, Escape, Save, and Cancel?

These decisions are inputs to Step 3's revised contract and Step 4's hypothesis comparison. No control placement or interaction pattern is selected here.
