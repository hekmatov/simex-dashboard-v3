# Three-Mode Dashboard Visual Baseline Audit

- **Audit date:** 2026-08-11
- **Scope:** Reopened V3 redesign, Step 2 only
- **Branch baseline:** `codex/three-mode-dashboard-design` at `adb6b84`
- **Surfaces:** View, Build, Present/controller, Audience, and the existing static prototype
- **Status:** Evidence complete; ready for user review

This is an evidence-first audit, not a redesign. No production component, CSS, application state, presentation behavior, or test was changed. The current implementation and the existing UI specification are audit subjects rather than design authority.

Detailed evidence is split into:

- [Screenshot manifest](./SCREENSHOT-MANIFEST.md)
- [View versus Build geometry](./VIEW-BUILD-GEOMETRY.md)
- [Editing-surface occlusion and reflow matrix](./EDITING-SURFACE-MATRIX.md)
- [Dashboard-control availability map](./DASHBOARD-CONTROL-MAP.md)
- [Present/controller and Audience findings](./PRESENT-AUDIENCE-FINDINGS.md)

## Evidence convention

- **Observed:** measured or exercised in the current React runtime with the in-app browser.
- **Prototype observed:** measured in the static HTML prototype. This is reference evidence, not current-runtime evidence.
- **Source fact:** read directly from current source or styles.
- **Source-derived inference:** a consequence inferred from source and not independently observed.

The runtime was served from this worktree on a fresh origin after an older local origin was found to be controlled by a stale service worker. Evidence from the stale build was deleted and is not represented in this audit.

## Executive verdict

The current implementation cannot serve as the visual baseline for the reopened redesign.

The central invariant fails: at every required viewport, Build changes the dashboard geometry relative to View. At 1440x900, the representative panel narrows from 1377 px to 711 px and its plot area narrows from 1339 px to 673 px. At 1200x900, the corresponding panel and plot losses are 531 px. Below the desktop-rail breakpoint, the grid continues to lose width through nested Build padding, and the Build action row reduces plot height by 38 px at all sampled sizes.

The editing surface also fails to keep target and controls mutually usable. At 1024x768, the inspector sheet covers the selected panel completely. At 390x844, the selected top panel and its inspector are separated by roughly 10,975 vertical pixels. On desktop, controls for central and bottom selections can be entirely outside the viewport even though the selected panel is scrolled into view.

Present supports the required scene counts and deterministic layout choices, and its blackout/reopen transport generally works. Its dominant problems are controller scale and lifecycle clarity, a low-fidelity preview, a long scroll burden, an ambiguous connected-empty Audience state, and chart typography that remains dashboard-sized on a 1920x1080 audience display.

## Six-pillar scorecard

| Pillar | Score | Classification | Baseline finding |
|---|---:|---|---|
| Copywriting | 3/4 | Warning | Most labels are specific, but connected-empty Audience communicates no state, repeated chart actions lack object context, and some controls imply capabilities that are absent or inert. |
| Visuals | 1/4 | Blocker | Build's persistent authoring chrome becomes the dominant composition and materially shrinks the dashboard; selected-state styling is also inconsistent with the emitted class. |
| Color | 2/4 | Warning | Functional states are distinguishable, but mode/presentation styles bypass parts of the semantic token system and destructive/session actions are not consistently differentiated. |
| Typography | 2/4 | Warning | Workspace copy is generally readable; Audience scene headings scale up, but chart titles, legends, axes, and annotations do not scale for across-room use. |
| Spacing | 1/4 | Blocker | View and Build use different outer frames, padding, rails, and internal rows, so equal-viewport canvas, panel, and plot geometry is impossible. |
| Experience design | 1/4 | Blocker | Editing controls are detached from or cover their target, global modes become disabled during editing, visible actions are sometimes inert, and Present exit does not clearly govern the connected Audience. |

**Overall: 10/24.** Shared component ancestry is not evidence of equal rendered geometry, and transport recovery is not evidence of a clear presentation lifecycle.

## Prioritized findings

| ID | Severity | Evidence | Finding | Why it matters |
|---|---|---|---|---|
| VB-01 | Blocker | Observed | Build does not preserve View canvas, grid, panel, or plot geometry at any required viewport. Desktop panel width losses are 531 px at 1200 and 666 px at 1440; smaller widths still lose 18-42 px of panel width. | The reopened Step 2 constraint is directly violated. Authors cannot judge the audience-facing dashboard at its real density or breakpoint behavior. |
| ED-01 | Blocker | Observed | Editing controls either cover the selected panel or become spatially disconnected from it. The 1024 inspector covers 100% of the selected top panel; at 390 the inspector is about 10,975 px below it; central and bottom desktop selections show no inspector controls in the viewport. | Core authoring work lacks a stable target/control relationship. |
| VB-02 | High | Observed + source fact | Build inserts a 38 px inline action row into each panel, reducing the representative chart plot from 380 to 342 px on desktop and from 322 to 284 px on smaller samples. | Even if width parity were restored, plot geometry would still differ. |
| ED-02 | High | Observed | Keyboard and cancellation behavior is inconsistent. Canvas selection leaves focus on `BODY`; Escape closes the 1024 inspector but does not end editing, while mode controls remain disabled; Cancel ends selection and also changes scroll position. | Users cannot reliably predict whether close, cancel, and escape dismiss UI, discard changes, or leave a hidden edit session. |
| ED-03 | High | Observed + source fact | Panel actions expose `Start section here` and `Remove chart`, but current canvas wiring does not provide their callbacks. The emitted selected class also differs from the class targeted by the intended selected style. | Visible controls and selection feedback are not truthful. |
| PR-01 | High | Observed | Present's chart-choice region is roughly 2451 px tall at both controller sizes. The 1440 controller document is 2822 px tall; the 1024 document is 2899 px tall, with a 175 px dock. | Scene building and verification require substantial scrolling while critical status and output controls occupy separate regions. |
| AU-01 | High | Observed + source fact | At 1920x1080, outer title typography is room-scaled, but chart titles remain 16 px, legends 11 px, and ordinary axes/annotations use unscaled ECharts defaults. | Four-chart scenes are structurally valid but not a demonstrated across-room communication surface. |
| PR-02 | Medium | Observed | Closing the Audience produces a disconnected controller state after roughly seven seconds, and Reopen restores the prior four-chart scene on the same channel. Reload first shows waiting and then recovers. | Recovery exists, but latency and state transitions need a clear product contract and user feedback. |
| PR-03 | Medium | Observed | Switching the controller from Present to View leaves the connected Audience showing the active scene. Returning to Present reconnects to that session. `End presentation` closes it and preserves controller selections. | Leaving the Present workspace and ending the presentation are distinct, currently under-explained lifecycle operations. |
| AU-02 | Medium | Observed | A connected zero-chart scene with title on shows only the title and empty grid; with title off it is completely blank. This differs from the pre-connection waiting state. | The audience cannot distinguish intentional blank output from a fault or incomplete setup. |
| PR-04 | Medium | Observed | The controller monitor is a 320x180 JPEG rendered at about 308x172 at 1440. It communicates composition but cannot establish chart legibility or faithful detail. | The moderator can verify layout, not what distant viewers can actually read. |
| CT-01 | Medium | Observed | Scenario, page, section, and chart controls exist, but time-group selection is read-only and no panel span/width/height control was found in the chart inspector. | Dashboard-level and panel-level authoring capability is uneven and does not yet cover the required interaction matrix. |
| PR-05 | Medium | Observed + source fact | Most controller actions meet a 44 px minimum, but title/chart checkboxes are 20x20 and `Open/Reopen audience display` was observed at 39 px high. | Frequent and high-consequence controls do not consistently meet the controller's own target-size pattern. |
| PT-01 | Medium | Prototype observed | The static prototype does not model the runtime faithfully: Build horizontally overflows at 1200, its arrangements differ, Audience is a same-document swap, and most controller controls are inert. | It is useful as historical intent only and must not be used as visual authority. |
| CL-01 | Low | Source fact | Current source uses View/Build/Present. Legacy editor markup and older test names remain in unreachable or historical paths. | Stale local builds can be mistaken for the branch under audit unless the origin/service worker is controlled. |

## Six-pillar details

### 1. Copywriting - 3/4

Observed strengths include direct global labels (`View`, `Build`, `Present`), concrete inspector tab names, an explicit controller connection strip, and clear blackout/restore/end verbs. The structure tree names its objects and the controller reports chart-capacity limits.

Warnings:

- A connected Audience with no charts can be entirely blank, so state depends on the controller rather than being self-explanatory.
- Repeated `Edit chart`, `Start section here`, `Remove chart`, and chart-choice controls rely heavily on surrounding context.
- `Open audience display`, `Reopen audience display`, leaving Present, and `End presentation` represent distinct lifecycle actions but do not explain their persistence consequences.
- The time-group inspector looks like a selection destination but provides a summary rather than an editing surface.

### 2. Visuals - 1/4

Build's two rails and nested live canvas visually demote the dashboard from the primary artifact to a narrow preview. The 1440 sample assigns 711 px to a panel that occupies 1377 px in View. This is a structural hierarchy problem rather than a cosmetic density preference.

Selected-state feedback is unreliable: the runtime emits `.selected`, while the current highlight rule targets `.chart-panel-selected`. The static prototype communicates a stronger selected object than the current runtime but does not solve target/control positioning.

Present has a clear status strip and a distinct persistent action dock. The Audience appropriately removes application chrome. The monitor preview, however, is a compressed snapshot that cannot support fine visual verification.

### 3. Color - 2/4

The surfaces are visually coherent and blackout is unambiguous. Source inspection nevertheless shows mode and presentation styles using direct colors alongside tokens, an unused declared focus token, and limited differentiation between destructive/session-ending actions and ordinary controls. This audit does not propose replacement colors or tokens; Step 3 should first decide the semantic state requirements.

### 4. Typography - 2/4

Workspace headings, labels, and controller copy are generally readable at desk distance. Audience scene title and subtitle are explicitly enlarged to 48/56 and 24/32 at the audited desktop size. Chart content is not audience-scaled: ECharts chart titles are 16 px, legends 11 px, and typical axes and annotations use library defaults. The one-, two-, three-, and four-chart captures show progressively less usable internal text as chart cells shrink.

### 5. Spacing - 1/4

Measured geometry is documented in [VIEW-BUILD-GEOMETRY.md](./VIEW-BUILD-GEOMETRY.md). The failure is systematic:

- 1440x900: View panel 1377x418; Build panel 711x418. View plot 1339x380; Build plot 673x342.
- 1200x900: View panel 1137x418; Build panel 606x418. View plot 1099x380; Build plot 568x342.
- 1024x768: panel width differs by 18 px and plot height by 38 px.
- 768x1024: panel width differs by 42 px and plot height by 38 px.
- 390x844: panel width differs by 34 px and plot height by 38 px.

The current runtime keeps the same nominal grid track count/order/span at each paired viewport, but its effective canvas, column widths, panels, and plot areas are not equivalent.

### 6. Experience design - 1/4

The Build selection model supports scenario, page, section, time group, and chart destinations. It does not preserve a usable relationship between selection and controls across positions or breakpoints. Desktop rails scroll with the long document; the 1024 sheet can hide the whole target; the 390 layout places controls after the entire dashboard. Focus is not moved to a useful first editor control after canvas selection.

Present supports zero through four selected charts, valid layout choices for each count, title toggling, time-group switching and stepping, blackout/restore, disconnect detection, reopen, reload recovery, and explicit end. No Play/Pause control was observed. Switching global mode does not end the connected Audience. These behaviors require explicit lifecycle and control-hierarchy decisions before design direction work.

## Required invariants for Steps 3 and 4

1. At the same viewport and dashboard state, View and Build preserve the same dashboard canvas bounds, grid breakpoint, column/gap behavior, panel arrangement, panel dimensions, and chart plot area.
2. Authoring chrome may become denser; the dashboard canvas and its content must not become denser.
3. Dashboard-level controls for scenario, pages, sections, layout, and time groups remain available without unintentionally reflowing or covering dashboard content.
4. A selected object and the controls needed for the current task remain mutually understandable. If a deliberate editor obscures the underlying dashboard, it supplies a faithful live rendering of the selected object.
5. Opening, closing, cancelling, saving, and escaping an editor have distinct, consistent focus and state semantics at every responsive state.
6. Visible actions have functioning behavior and visible selection states use the classes/state the runtime actually emits.
7. Present and Audience share a clear lifecycle for not-open, waiting, connected, disconnected, reopened, blackout, restored, and ended states.
8. Audience chart titles, legends, axes, and annotations are evaluated at realistic scene density and across-room distance, not only at controller distance.
9. Audience remains passive and chrome-free; the controller remains the sole authority for scene composition and playback operations.
10. Scene ordering and layout remain deterministic for one through four charts, including title-on and title-off geometry.

## Open design decisions

These are hypotheses to evaluate, not approved solutions:

- Whether selected-panel controls should be contextual to the panel, progressively disclosed, or moved into a separate editor.
- Whether centering/panning should keep a selected panel unobscured when nearby controls open.
- Whether a larger editor may intentionally obscure the dashboard while carrying a faithful live selected-panel rendering.
- How dashboard-level scenario/page/section/layout/time controls remain continuously available without changing or covering canvas geometry.
- How collision handling works for central, edge, top, and bottom panels.
- Whether Build begins from direct canvas selection, structure selection, or both, and how focus moves between those representations.
- Which controls are primary, frequent, advanced, or rare, and therefore which progressive-disclosure level each belongs to.
- What leaving Present means while an Audience is connected, and how it differs from ending the presentation.
- What a connected Audience should show before charts are selected and during reconnect delay.
- Whether the controller preview is a composition monitor, a fidelity check, or both.
- Which playback actions belong in Present beyond group selection and stepping.
- What chart count/density remains legible at the intended room distance, and whether scene selection should communicate that limit.

## Prior UI-spec assumptions to withdraw or reconsider

1. **Withdraw:** sharing `DashboardCanvas` is sufficient to guarantee View/Build visual parity. Rendered wrappers and panel chrome determine the actual geometry.
2. **Withdraw:** persistent desktop rails can coexist with an unchanged dashboard canvas at the sampled widths. The current implementation loses 531-666 px of panel width where rails are present.
3. **Withdraw:** using the same viewport media query means View and Build share responsive behavior. Their effective canvas widths and panel layouts diverge even when track counts match.
4. **Withdraw:** inline chart authoring actions are geometry-neutral. They consistently remove 38 px from the plot area.
5. **Reconsider:** 1200 px is a clean transition to persistent Build rails. It is the point of the runtime's largest geometry discontinuity, and the prototype horizontally overflows there.
6. **Withdraw:** responsive sheets inherently protect the selected object. The 1024 inspector covers the selected panel completely, while the 390 flow layout separates it from controls by almost the entire document.
7. **Withdraw:** a persistent inspector makes selected controls continuously available. Desktop central/bottom selection can leave the inspector entirely off-screen.
8. **Reconsider:** one inspector hierarchy is sufficient for scenario, page, section, chart, panel geometry, and time groups. Current capability and disclosure depth differ substantially by object.
9. **Withdraw:** the controller preview demonstrates Audience fidelity. Its small JPEG proves composition only.
10. **Withdraw:** dashboard chart typography transfers unchanged to an across-room Audience display. Only the outer scene heading is explicitly scaled.
11. **Reconsider:** leaving Present should preserve a live Audience by default. The runtime does so, but the lifecycle semantics are not stated.
12. **Reconsider:** a connected empty scene may be blank. It is visually indistinguishable from missing output when the title is off.
13. **Reconsider:** all prototype controller layouts and controls are approved product requirements. The prototype is partly inert and does not model the real connection architecture.
14. **Withdraw:** the existing prototype is visual design authority. It contains different geometry, breakpoints, state machinery, and content from the current runtime.

## Deferred from Step 2

- Selecting or drawing a winning Build interaction pattern.
- Prescribing rail widths, modal or sheet heights, controller geometry, colors, tokens, or exact typography values.
- Revising the UI contract (Step 3).
- Running the full direction-selection/sketch workflow (Step 4).
- Changing production components, CSS, application state, presentation transport, or behavior.
- Implementing or testing fixes for the findings.

## Recommended inputs for the next steps

Step 3 should consume the measured equivalence table, the occlusion/reflow matrix, the control-availability map, the lifecycle findings, and the invariant ledger as contract inputs. It should explicitly resolve what is invariant versus responsive and define observable acceptance criteria for selected-object visibility, focus, cancellation, connected-empty Audience behavior, and Present exit.

After that contract is revised, Step 4 can compare the five editing hypotheses against the same central/edge/top/bottom panels and all five audited viewports. Candidate directions should be rejected if they change the dashboard rectangles measured in View, conceal the only faithful selected-object rendering, or make dashboard-level controls unreachable.

## Exit status

- [x] Required View/Build viewport pairs captured and measured.
- [x] Central, edge, top, and bottom panel selections exercised.
- [x] Controller required sizes, scene counts, layouts, title states, playback, blackout, and lifecycle states exercised.
- [x] Audience required 1920x1080 states captured.
- [x] Observed findings separated from source facts and source-derived inference.
- [x] Immutable constraints and unresolved choices made explicit.
- [x] No production redesign implemented.
- [ ] User review and acceptance.

Step 2 remains open until the user accepts this audit.
