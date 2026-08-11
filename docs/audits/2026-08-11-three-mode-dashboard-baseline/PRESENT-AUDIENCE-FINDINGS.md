# Present/controller and Audience baseline findings

- **Date:** 2026-08-11
- **Scope:** current runtime plus the existing static prototype as a non-authoritative comparison
- **Status:** evidence captured; design choices remain open

## Evidence convention

- **Observed** means inspected in the running application with the in-app browser, including DOM measurements and interaction outcomes.
- **Source-derived** means confirmed from the implementation, but not independently exercised in every possible state.
- **Inference** means a design consequence drawn from the observed or source-derived evidence. It is labelled so that it is not mistaken for runtime fact.
- The existing prototype is an audit subject only. It is not evidence that its geometry or behavior should be retained.

The complete image inventory and capture provenance are in [SCREENSHOT-MANIFEST.md](SCREENSHOT-MANIFEST.md).

## Prioritized findings

| Priority | Finding | Evidence | Consequence for the next design contract |
| --- | --- | --- | --- |
| P0 | Audience chart internals do not scale with scene density. The outer scene title remains large, while chart titles stay at 16 px, legends at 11 px, and axes/annotations use unscaled chart defaults. | **Observed:** the relative size loss is visible from one chart through the four-chart scene. **Source-derived:** fixed chart title and legend sizes; no Audience-specific axis or annotation scale. | Across-room legibility must be an explicit invariant and evaluated at the densest realistic scene, not inferred from the one-chart scene. |
| P0 | The controller monitor is useful for scene recognition but not for judging Audience fidelity. It is displayed at 308 × 172.4 px from a 320 × 180 JPEG while the inspected Audience is 1920 × 1080. | **Observed:** rendered and intrinsic monitor dimensions. **Source-derived:** the snapshot source renders at 1280 × 720 before capture. | The controller must provide enough feedback to detect wrong charts, order, layout, title state, blackout, and connection state; whether it must also support typography-level inspection remains open. |
| P1 | Controller operation requires a long document scroll in realistic scenes. At both inspected sizes the chart-choice region is 2451 px high and the document is about 2.8–2.9 screens tall. | **Observed:** 2822 px document height at 1440 × 900 and 2899 px at 1024 × 768. | Frequent controls and scene state need a hierarchy that remains usable while the chart catalog is long. The audit does not select a geometry for that hierarchy. |
| P1 | A reloaded or reopened Audience temporarily looks like a waiting display before restoring its scene. The observed recovery took roughly 6–7 seconds. | **Observed:** waiting at about 0.8 seconds after reload; the prior four-chart scene returned by roughly 6–7 seconds. | Waiting, disconnected, reopening, restored, and ended must remain distinguishable to both moderator and audience. Recovery timing and feedback are unresolved. |
| P1 | A connected empty scene with title hidden is a completely blank light display. | **Observed:** title-on empty shows the scene heading and empty grid; title-off empty shows no content. | The contract must decide whether this is an intentional holding state and how the moderator can distinguish it from a failed or missing scene. |
| P1 | Playback is manual stepping plus a position slider; there is no Play or Pause control in the inspected controller. | **Observed:** Previous, Next, group selector, and slider were operable. **Source-derived:** no Play/Pause action is rendered. | The required playback mental model—manual cueing, continuous playback, or both—remains an explicit product decision. |
| P2 | The Open/Reopen Audience control measured 39 px high, while the main dock actions measured 44 px high. | **Observed:** Open Audience 193.8 × 39 px; Previous, Next, Blackout, Restore, and End Presentation were 44 px high. **Source-derived:** selects, range controls, and reorder/dock controls have 44 px minimums; chart checkboxes are 20 × 20 px. | Target-size consistency and action priority should be revisited without treating the current dimensions as design authority. |
| P2 | Leaving Present mode does not end the live Audience session. Returning to Present restores the connected four-chart scene. | **Observed:** mode exit and return. | Session persistence across mode changes must be intentional and communicated; the audit does not decide whether persistence is desirable. |

## Controller geometry and scroll behavior

Requested browser viewport sizes are reported separately from the page's `documentElement.clientWidth`, which excludes the vertical scrollbar.

| Measure | 1440 × 900 inspection | 1024 × 768 inspection | Evidence type |
| --- | ---: | ---: | --- |
| Page client size | 1425 × 900 | 1009 × 768 | Observed |
| Document height | 2822 px | 2899 px | Observed |
| Horizontal overflow | None | None | Observed |
| Status strip | x 24, y 65, w 1377, h 64 | x 24, y 65, w 961, h 64 | Observed at 1440; source-derived from the same fixed-inset layout at 1024 and visually corroborated by the capture |
| Context/monitor panel | x 24, y 153, w 360, h 597.4 | x 24, y 153, w 360, h 597.4 | Observed |
| Chart-choice region | x 404, y 153, w 997, h 2451 | x 404, y 153, w 581, h 2451 | Observed |
| Action dock | x 24, y 802, w 1377, h 98 | x 24, y 593, w 961, h 175 | Observed sizes and bottom-sticky placement; 1024 y derived from the 768 px client height |
| Snapshot image | 308 × 172.4 rendered; 320 × 180 intrinsic JPEG | Same monitor implementation | Observed at 1440; source-derived equivalence at 1024 |

At 1440 × 900, the controller is a two-column surface: a 360 px context/monitor panel, a 20 px body gap, and the chart-selection region. The action dock remains at the bottom of the viewport while the document scrolls. At 1024 × 768, that two-column relationship remains; the chart region narrows to 581 px and the dock wraps to 175 px high. These values describe the current implementation, not recommended dimensions.

The context panel is sticky and its overflow is hidden. The chart-choice region drives nearly all page height. This keeps the monitor and basic context near the moderator, but chart discovery, selection, ordering, time-group controls, and dock actions are split across a long vertical route. The 1440 empty baseline is shown in [runtime-controller-1440x900-empty-not-open.png](screenshots/runtime-controller-1440x900-empty-not-open.png); the 1024 baseline is shown in [runtime-controller-1024x768-empty-not-open.png](screenshots/runtime-controller-1024x768-empty-not-open.png).

### Control hierarchy and targets

| Control group | Current location and behavior | Target/spacing evidence | Audit finding |
| --- | --- | --- | --- |
| Audience/session state | Top status strip | 64 px strip height | State is visually separated from scene composition, but reconnection phases need clearer semantic distinction. |
| Context and monitor | Sticky left panel | 360 × 597.4 px panel; 24 px internal padding and 20 px source-defined gaps | Always nearby at inspected desktop sizes; monitor is too downsampled for typography-level judgment. |
| Scene title and layout | Context/scene controls | Selects and inputs have a source-defined 44 px minimum | Grouping is understandable, but its relationship to chart count and scene state must remain explicit. |
| Chart inclusion | Long chart-choice region | Choice checkbox 20 × 20 px | Selection is comprehensive but scroll-heavy. At four charts, unchecked choices become unavailable until a selected chart is removed. |
| Ordering | Selected-chart controls | Source-defined 44 px controls | Ordering is available, but its reachability depends on the selected-chart position in the long surface. |
| Playback | Time-group controls plus slider | 44 px source minimum for inputs; Previous/Next observed at 44 px | Endpoint enabled states are clear; continuous playback behavior is absent and unresolved. |
| Live actions | Sticky action dock | Main actions observed at 44 px high; Open/Reopen observed at 39 px high | Blackout/Restore and End remain accessible; Open/Reopen is visually and physically smaller than the primary dock actions. |

**Source-derived responsive note:** below 900 px the controller body changes to one column; below 768 px several action groups become single-column stacks. Those controller breakpoints were not part of the required live viewport set and were not treated as observed evidence.

## Scene and layout coverage

All required chart-count states were exercised on the live runtime. The current layout options are count-dependent.

| Chart count | Current state/layout choices | Observed Audience result | Evidence |
| ---: | --- | --- | --- |
| 0 | Holding scene | Title-on shows the scene heading above an empty grid. Title-off is a blank light display. | [empty, title on](screenshots/runtime-audience-1920x1080-empty-title-on.png), [empty, title off](screenshots/runtime-audience-1920x1080-empty-title-off.png) |
| 1 | Single chart (`solo`) | One chart fills the available scene grid. | [one-chart solo](screenshots/runtime-audience-1920x1080-1-chart-solo.png) |
| 2 | Side by side; Over-under | Either two equal columns or two equal rows. | [side by side](screenshots/runtime-audience-1920x1080-2-chart-side-by-side.png), [over-under](screenshots/runtime-audience-1920x1080-2-chart-over-under.png) |
| 3 | One on top; One on bottom; One on left; One on right | The selected focus pattern changes which chart receives the larger/full-span region. The top-focus case was captured live. | [three-chart top focus](screenshots/runtime-audience-1920x1080-3-chart-top-focus.png) |
| 4 | 2 by 2 | Four equal cells; additional unchecked chart choices are disabled until one is removed. | [controller](screenshots/runtime-controller-1440x900-four-chart-connected.png), [Audience](screenshots/runtime-audience-1920x1080-4-chart-grid-2x2.png) |

The layout catalog above is **observed** in the controller and **source-confirmed** in `PresentWorkspace.jsx`. The audit records it as the current behavior; it does not approve the catalog or select a future pattern.

## Playback behavior

The playback sequence was exercised with four charts connected:

| Step | Observed position and enabled state |
| --- | --- |
| Municipal outbreak playback selected | Slider 414 of 414; Previous enabled; Next disabled. |
| Switched to national time group | Slider 0 of 176; Previous disabled; Next enabled. |
| Pressed Next once | Slider 1 of 176; Previous and Next enabled. |

The controller provides Previous, Next, time-group selection, and direct slider positioning. No Play or Pause action appeared. [runtime-controller-1440x900-playback-four-chart.png](screenshots/runtime-controller-1440x900-playback-four-chart.png) records the realistic four-chart playback state.

This evidence establishes the present interaction, but not its adequacy for live facilitation. The expected cue frequency, whether frames advance automatically, and how a moderator should recover from overshooting remain open.

## Blackout, restore, and session lifecycle

| Transition | Observed controller result | Observed Audience result |
| --- | --- | --- |
| Open Audience from no session | Status changes to connected. | Audience window opens and receives the current scene. |
| Blackout | Blackout disables; Restore enables. | Entire 1920 × 1080 surface becomes black. |
| Restore | Restore disables; Blackout enables. | Prior four-chart scene returns. |
| Close Audience window | After about 7 seconds, status becomes “Audience display disconnected.” | Audience window is gone. |
| Reopen Audience | Same channel identifier is reused; controller returns to connected. | Four-chart scene and state are restored. |
| Reload Audience | Controller remains the source of scene state. | At about 0.8 seconds the waiting message is visible; the four-chart scene returns by roughly 6–7 seconds. |
| Leave Present for View | Audience remains connected. | Existing four-chart scene remains visible. |
| Return to Present | Connected controller scene is restored. | No scene loss observed. |
| End Presentation | Status changes to “Audience display ended”; Open Audience returns; the four chart selections remain in the controller. | The user-visible Audience tab closes. |

Evidence: [blackout](screenshots/runtime-audience-1920x1080-blackout.png), [disconnected controller](screenshots/runtime-controller-1440x900-audience-disconnected.png), [reload waiting](screenshots/runtime-audience-1920x1080-reload-waiting.png), [reopened scene](screenshots/runtime-audience-1920x1080-reopened-four-chart.png), and [ended controller](screenshots/runtime-controller-1024x768-four-chart-ended.png).

The reconnect timings are approximate interaction observations, not performance guarantees. The important invariant is semantic: blackout, empty, waiting, disconnected, restored, and ended are different states and must not collapse into an ambiguous “nothing is showing” condition.

## Audience geometry at 1920 × 1080

Every measured Audience state fit the viewport with no horizontal or vertical overflow.

| State | Measured geometry | Evidence type |
| --- | --- | --- |
| Display frame | 1920 × 1080 with 48 px outer inset; inner width 1824 px | Observed |
| Title on | Title x 48, y 48, w 1824, h 96; 24 px gap; grid x 48, y 168, w 1824, h 864 | Observed |
| Title off | Grid x 48, y 48, w 1824, h 984 | Observed |
| 1 chart | 1824 × 864 | Observed |
| 2, side by side | Two 900 × 864 cells with 24 px gap | Observed |
| 2, over-under | Two 1824 × 420 cells with 24 px gap | Observed |
| 3, top focus | Top 1824 × 420; lower cells 900 × 420 each; 24 px gaps | Observed |
| 4, 2 by 2 | Four 900 × 420 cells; 24 px gaps | Observed |

The current scene preserves a fixed 48 px perimeter and 24 px inter-cell gaps at this viewport. These are baseline measurements only, not prescribed tokens.

## Across-room legibility

### Source-derived typography

- Waiting mark and scene title: 48 px; scene title line-height 56 px.
- Scene subtitle: 24 px; line-height 32 px.
- Chart title: 16 px.
- Chart legend: 11 px.
- Axis and annotation text: no Audience-specific scale is applied; chart defaults continue to govern them.

### Observed consequence

The outer title remains visually prominent in the four-chart capture, while legends, axes, and annotations become a much smaller fraction of the 1920 × 1080 display. The one-chart scene provides materially more plot area but does not change those fixed internal text sizes.

**Inference:** four-up legibility is the limiting case. A physical across-room distance test was not conducted, so this audit records a high-confidence visual risk rather than claiming a measured viewing-distance failure. Steps 3 and 4 should receive a representative real display size, audience distance, and minimum critical annotation set before making typography decisions.

## Preview usefulness and fidelity

The controller monitor has a 16:9 frame and accurately reflected scene-level changes during inspection: selected chart count, order/layout silhouette, title presence, and restored content were recognizable. However, the displayed image is approximately one-sixth of the Audience's linear pixel dimensions (320 × 180 intrinsic versus 1920 × 1080). It cannot provide equivalent evidence for chart-label, legend, axis, or annotation readability.

The snapshot is pointer-inert, so it is feedback rather than an editing surface. Whether the controller needs only state recognition or a higher-fidelity inspection path is an open design decision.

## Present/Audience invariants

These constraints follow from the observed facilitation task and should be treated as inputs to Steps 3 and 4:

1. The moderator must always be able to distinguish no session, connected empty, waiting, disconnected, blackout, restored, and ended states.
2. Blackout and Restore must be reversible without changing the composed scene.
3. Audience scene geometry must be deterministic for a given viewport, chart count, title state, and layout.
4. The densest supported scene must preserve across-room legibility for the information the audience is expected to read.
5. The controller must expose the live chart set, order, layout, title state, time position, and connection state without relying on the Audience display as the only confirmation.
6. Losing or reopening the Audience window must not silently discard the composed scene.
7. Frequent live actions must remain reachable without horizontal scrolling, even when the chart catalog requires vertical scrolling.
8. Ending the presentation must remain semantically distinct from a recoverable disconnect or temporary mode change.

## Open design decisions

- What information must be legible across the room in one-, two-, three-, and four-chart scenes, and at what real display size and viewing distance?
- Is the current maximum of four charts a durable constraint, a facilitation recommendation, or only an implementation limit?
- Which three-chart focus patterns are genuinely required in practice, and how should the chosen focus be communicated?
- Should an empty title-off scene be a valid holding state, an error state, or require an explicit moderator acknowledgement?
- Is playback intentionally manual, or must continuous play/pause behavior be supported?
- What recovery latency and progress feedback are acceptable after reload, disconnect, and reopen?
- What level of preview fidelity is required: scene recognition, content verification, or typography-level inspection?
- Which controls must remain continuously available while navigating a long chart catalog, and which can use progressive disclosure?
- Should a live Audience persist when the moderator leaves Present mode?
- How should title state, blackout state, and connection health remain perceivable to keyboard and assistive-technology users?

## Prototype comparison

The static prototype was inspected at controller 1440 × 900 and Audience 1920 × 1080. It opens with a connected two-chart reference scene; its controller document measured 1462 px high and its sticky dock 72 px high. The prototype Audience used two 900 × 860 cards inside the same 1824 px inner width.

Those screenshots are [prototype-controller-1440x900-default-two-chart.png](screenshots/prototype-controller-1440x900-default-two-chart.png) and [prototype-audience-1920x1080-two-chart.png](screenshots/prototype-audience-1920x1080-two-chart.png). Most prototype controls are inert and the Audience is a same-document visual swap rather than the production session lifecycle. Prototype geometry and apparent behavior therefore must not override runtime evidence.

## Primary source references

- [`src/styles/presentation.css`](../../../src/styles/presentation.css) defines the Audience frame, title treatment, scene grids, controller columns, monitor source, target minimums, sticky dock, and responsive branches.
- [`src/components/presentation/PresentWorkspace.jsx`](../../../src/components/presentation/PresentWorkspace.jsx) defines the chart-count-dependent layout choices and controller actions.
- [`src/components/charts/EChartsChartView.jsx`](../../../src/components/charts/EChartsChartView.jsx) normalizes the 16 px chart title and 11 px legend used across display surfaces.
