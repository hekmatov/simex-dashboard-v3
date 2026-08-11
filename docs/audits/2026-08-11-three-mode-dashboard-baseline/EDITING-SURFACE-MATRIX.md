# Editing-surface occlusion and reflow matrix

- **Audit date:** 2026-08-11
- **Subject:** current runtime Build mode, with the static prototype used only as a labelled comparison
- **Status:** baseline evidence; not an interaction-pattern decision

## Evidence notation and evaluation frame

- **Observed (`O`)** means inspected in the live application with the in-app browser.
- **Source-derived (`S`)** means established from current components or styles, but not necessarily exercised end to end.
- **Inference (`I`)** means an audit conclusion drawn from observed or source-derived facts. Frequency and progressive-disclosure classifications are design-work estimates, not product telemetry.

The governing test is whether Build preserves View's dashboard canvas geometry at the same viewport. Editing chrome may be denser, but it must not change canvas width, grid breakpoints, panel arrangement or dimensions, or chart plot area. This document describes how the current surfaces behave; it does not select contextual controls, progressive controls, panning, a larger editor, or any other interaction pattern.

## Interaction matrix

| Object | Selection trigger | Required control set | Current control location | What must remain visible | Current reflow or coverage | Focus, close, cancellation, responsive behavior | Frequency / progressive-disclosure level |
|---|---|---|---|---|---|---|---|
| Dashboard / scenario | **O:** select **Scenario** in the Structure surface. The trigger retained focus in the observed desktop interaction. | **O:** Program, Scenario, Updated date are exposed. **I:** scenario identity and dashboard-level navigation must remain available without changing the dashboard rendering. | **O:** desktop left Structure rail selects the object; fields render in the right inspector. | **I:** dashboard identity, current page, and enough canvas context to understand the scope of the edit. | **O:** at desktop widths the persistent rail/inspector layout reduces the live grid before any object is edited. At 1440 px the Build grid is 711 px versus 1377 px in View; at 1200 px it is 606 px versus 1137 px. The controls do not overlay the target at the top of the page, but the dashboard is materially reflowed. | **O:** selection focus remained on its trigger. **O:** deep scrolling moves the desktop inspector out of the viewport. **O:** below the desktop layout, the rails cease to be simultaneously visible with the canvas; at 390 px Structure precedes the canvas in normal flow. Close/cancel semantics were not separately exercised for scenario metadata. | **I:** low-to-medium frequency; core identity is primary, dates/metadata are secondary. Progressive-disclosure estimate only. |
| Page | **O:** select **Biomedical** in Structure. | **O:** Page label, Page title, Description. **I:** page selection and page-level commands must stay reachable while the page composition remains legible. | **O:** Structure rail to inspector. | **I:** current page identity, section order, and representative page canvas. | **O:** same baseline desktop compression as scenario selection. **O:** no target-covering overlay was seen in the desktop state. **I:** lack of persistent structure/inspector beside the canvas at narrower widths prevents continuous joint visibility. | **O:** page selection and fields were inspected; mutation, close, and cancel effects were not exercised. **S:** the responsive implementation changes the rails to alternate surfaces/flow rather than preserving the desktop arrangement. | **I:** medium frequency; label/title are primary, description is secondary. |
| Section | **O:** select **Outbreak dynamics** in Structure. | **O:** Section title and Description. **I:** section identity, location within the page, and section-level structural actions must be understandable together. | **O:** Structure rail to inspector. | **I:** selected section and its neighbouring panels/sections. | **O:** the application auto-scrolled the selected section into view alongside the inspector at 1440 px; the canvas was still the already-compressed Build canvas. No overlay covered that section in this desktop observation. | **O:** auto-scroll changed the user's scroll position. Close/cancel focus restoration was not observed for section metadata. **I:** any responsive treatment must define whether it keeps the target in view or intentionally replaces it. | **I:** medium frequency; selection/title are primary, description and structural actions are secondary. |
| Panel / chart | **O:** click a chart panel or its inline **Edit chart** action. | **O:** Data, Appearance, Axes, Interactions, Advanced tabs. Appearance includes title, description visibility, title alignment, background/transparency, series colours, line width, reference line, and labels. **I:** high-frequency chart identity/data controls should be distinguishable from less frequent presentation and advanced controls. | **O:** an action row is inserted inside every Build panel; selected-chart fields render in the desktop inspector or a responsive inspector surface. | **I:** either the selected rendered panel must remain unobscured, or an editor that intentionally replaces/obscures it must provide a sufficiently faithful live rendering. No choice between those contracts is made here. | **O:** the inline action row consumes 38 px inside the panel at every measured viewport, reducing plot height by 38 px. Desktop rails reduce plot width by 666 px at 1440 and 531 px at 1200. **O:** at 1024 the inspector sheet covered 100% of the selected panel. **O:** at 390 the inspector did not cover the panel but began about 10,975 px below it. | **O:** desktop panel selection left focus on `BODY`. **O:** at 1024 initial focus moved to **Close**; Escape hid the sheet but left the chart selected/edit session active and global mode controls disabled. Only **Cancel** ended the session. **O:** Cancel cleared selection, left focus on `BODY`, and returned the document near the top. **O:** at 390 focus remained on `BODY`. | **I:** high frequency. Data/Appearance/Axes/Interactions are meaningful progressive groups; **O:** Advanced exposed an unlabeled empty input, so its purpose and hierarchy are not legible. |
| Panel layout and sizing | **O:** no dedicated panel width, height, span, or sizing control was found in the selected panel's tabs. The inline action row offered Edit chart, Start section here, and Remove chart. | **I:** the unresolved control domain includes panel ordering, placement, span/size, and the relationship between panel layout and section/page structure. Exact operations are a Step 3 contract question. | **O:** no current location for sizing/span. Reordering controls were not present in the inspected chart editor. **S:** Start section here and Remove chart are rendered in the panel action row, but their callbacks are absent in the mapped source path. | **I:** affected neighbouring panels, grid placement, and the selected panel's live rendering. | **O:** the current action row itself changes the plot area even without a layout edit. Because no sizing/span surface was exposed, its future reflow/coverage behavior cannot be observed. | **O:** no selection, focus, close, cancel, or responsive contract exists for sizing/span in the inspected UI. **S:** action affordances without mapped callbacks make operational truthfulness uncertain. | **I:** medium-to-high frequency during composition; direct placement/order would be primary, fine sizing rules secondary. |
| Time groups | **O:** select **Municipal outbreak playback** in Structure. | **O:** read-only Primary clock, Datum, Matching, and member-chart summary. No input, select, or button was exposed. **I:** if time groups are editable here, membership, primary clock, datum/matching, and validation require an explicit control contract; if they are not editable, the selection affordance needs a clear read-only purpose. | **O:** Structure selection to right inspector summary. | **I:** member charts and enough dashboard context to understand synchronisation scope. | **O:** same baseline desktop canvas compression; no overlay at the inspected desktop position. **I:** read-only availability does not establish an editing-surface geometry. | **O:** the summary was inspected; no close/cancel/focus cycle exists for a mutation because no mutation controls appeared. Responsive edit behavior therefore remains unobserved. | **I:** low-to-medium frequency; summary is primary for inspection, membership/matching details would be progressively disclosed if editing is in scope. |

## Selected-panel position evidence

All desktop rows below use the same 1440×900 viewport and Biomedical page. `Overlap` is the intersection of the selected panel and inspector rectangles, not a subjective assessment.

| Position exercised | Selected object | Scroll Y | Selected panel viewport bounds | Inspector viewport bounds | Overlap | Observed consequence |
|---|---|---:|---|---|---:|---|
| Top | `bio_confirmed_cases` | 24 | `y 412.4`, `h 418` | `y 339`, `h 1432` | 0 | Panel and the upper inspector are concurrently visible, but the live panel is only 711 px wide because the rails compress the canvas. [Screenshot](screenshots/runtime-build-1440x900-selected-top.png) |
| Left edge | `bio_r_values` | 1326 | `y 412.4`, `h 418` | `y -963`, `h 1432` | 0 | The panel is visible; only the tail of the inspector remains in the viewport. [Screenshot](screenshots/runtime-build-1440x900-selected-left-edge.png) |
| Right edge | `bio_region_comparison` | 1326 | `y 412.4`, `h 418` | `y -963`, `h 1432` | 0 | Mirrors the left-edge result: target visible, operative inspector content largely above the viewport. [Screenshot](screenshots/runtime-build-1440x900-selected-right-edge.png) |
| Central | `bio_municipality_choropleth_animation` | 2628 | `y 412.4`, `h 852` | `y -2265`, `h 1886` | 0 | The large selected target is visible; the inspector is entirely outside the viewport. [Screenshot](screenshots/runtime-build-1440x900-selected-central.png) |
| Bottom | `bio_vaccination_rate` | 8894 | `y 448.6`, `h 418` | `y -8531`, `h 1502.8` | 0 | The bottom target is visible; the inspector is entirely outside the viewport. [Screenshot](screenshots/runtime-build-1440x900-selected-bottom.png) |

This is a reachability failure rather than an overlay failure at 1440 px: the selected object and its controls are not jointly available once the user works below the top of the document.

### Responsive selection evidence

| Viewport | Selected panel | Inspector surface | Measured relationship | Focus and dismissal behavior |
|---|---|---|---|---|
| 1024×768 | `x 33`, `y 346.4`, `w 943`, `h 418` | fixed sheet at `x 0`, `y 230.4`, `w 1009`, `h 537.6` | **100% of the selected panel was covered.** | Initial focus: **Close**. Escape hid the sheet, but selection/edit mode continued and global mode controls stayed disabled until Cancel. [Screenshot](screenshots/runtime-build-1024x768-selected-top-inspector-sheet.png) |
| 390×844 | `x 29`, `y 384.4`, `w 317`, `h 360` after `scrollY 1107` | normal-flow inspector beginning at `x 12`, `y 11342.7`, `w 351`; inner inspector `y 11359.7`, `h 1859` | No overlay, but the controls began approximately **10,975 px below** the selected panel. | Focus remained on `BODY`; target and controls cannot be perceived or operated together. [Screenshot](screenshots/runtime-build-390x844-selected-top-inspector.png) |

At 768×1024 the unselected live canvas was measured, but current-runtime selected-panel sheet occlusion was not separately exercised; no runtime result is inferred for that exact state. The static prototype's 768×1024 inspector sheet covered about 56% of its selected card, focused Close, and returned focus to the Inspector trigger on Escape. That is **prototype-only evidence**, not authority for current behavior. [Prototype screenshot](screenshots/prototype-build-768x1024-inspector-sheet.png)

## Reflow and occlusion summary

| Mechanism in the current UI | Desktop result | Narrow result | Geometry/equivalence result |
|---|---|---|---|
| Structure and inspector alongside the canvas | **O:** consumes fixed layout columns; selected controls can scroll out of view independently of the target. | **O:** the desktop rails are removed; alternate sheet/flow behavior varies by width. | **O:** View/Build canvas, grid, panel, and plot geometry are not equivalent. |
| Inline panel action row | **O:** does not cover the chart, but takes 38 px from its plot. | **O:** same 38 px plot-height loss at 1024, 768, and 390. | **O:** panel outer height may match, while chart plot area does not. |
| Responsive inspector sheet | Not used at 1440 in the measured state. | **O:** fully covers the selected panel at 1024. | **O:** target visibility fails even though baseline canvas width is closer to View. |
| Mobile normal-flow inspector | Not used at desktop. | **O:** avoids coverage at 390 by placing the controls after the long dashboard. | **O:** no cover, but controls and target are separated by roughly 10,975 px and cannot support a local editing loop. |
| Selection auto-scroll | **O:** section selection brought a section into view; panel selection placed panels in a consistent viewport band. | **O:** the 1024 sheet then covered the target; at 390 the inspector remained remote. | **I:** current scrolling does not guarantee simultaneous, unobscured target/control visibility. |

## Focus and session findings

1. **O — High:** Chart editing behaves as a session, because global mode controls become disabled until Cancel, but responsive dismissal can hide the inspector without ending that session.
2. **O — High:** Escape at 1024 closes the visible sheet and leaves the selected panel/edit lock active. The user receives no measured focus return to the selected chart or its trigger.
3. **O — Medium:** Desktop and mobile panel selection leave focus on `BODY`, so selection is visual/stateful rather than keyboard-locatable.
4. **O — Medium:** Cancel clears the selection but also returns the document near the top, losing the selected panel's working position.
5. **S — Medium:** runtime panels emit `.chart-panel.selected`, while the mapped style expects `.chart-panel-selected`; selected-state styling may therefore not express the intended focus/selection contract.
6. **O — Positive:** scenario selection retained trigger focus, demonstrating that focus need not be lost for every Structure interaction.

## Interaction-hypothesis evaluation criteria

These are constraints for later exploration, not selected solutions.

| Hypothesis to test later | Evidence this baseline says the test must include | Unresolved criterion |
|---|---|---|
| Contextual controls around a selected panel | Central, top, bottom, left-edge, and right-edge panels; collision with viewport edges; tall panels; preservation of plot area. | How controls remain operable without covering the selected panel or changing its grid geometry. |
| Progressive controls | High-frequency chart tasks versus secondary appearance/axes/interactions and genuinely advanced controls; current unlabeled Advanced field. | Which operations must be immediately available and which may require an additional reveal. |
| Automatic centering or panning | Current inspector loss at central/bottom positions, Cancel's scroll jump, and the 1024 full-cover state. | How scroll context and keyboard focus are preserved while both target and controls remain usable. |
| Larger editor with a live selected-panel rendering | Current responsive sheet obscures the original panel but contains no measured equivalent live rendering. | What fidelity is sufficient when the underlying dashboard is deliberately obscured, and how the user returns to the same location. |
| Dashboard-level controls available without reflow or cover | Current desktop rails compress the canvas; current responsive treatments either cover the panel or separate controls from content. | Which dashboard/page/section/layout/time-group controls require continuous availability, and which can be invoked on demand. |

## Open interaction-contract questions for Steps 3 and 4

- Does closing a responsive editor end the edit session, or only dismiss its surface? How is that different from Cancel?
- Which element receives focus after selection, Escape, Close, Save, and Cancel, and must the user's scroll position be restored?
- For which tasks must the original panel remain visible, and when may a separate faithful live rendering stand in for it?
- What exact operations belong to panel layout and sizing, and which are page-, section-, or panel-scoped?
- Are time groups editable in Build, or intentionally inspect-only? If editable, what is the minimum safe membership and clock/matching workflow?
- Are Start section here and Remove chart intentionally staged affordances, or incomplete actions? Their callbacks were not present in the mapped source path.
- Must dashboard-level controls be continuously visible, or is reliable on-demand reachability sufficient at each responsive class?
