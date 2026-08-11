# View–Build Geometry and Equivalence Baseline

- **Audit date:** 2026-08-11
- **Audit subject:** current application runtime on `codex/three-mode-dashboard-design`
- **Representative content:** Biomedical page; first representative panel `bio_confirmed_cases`
- **Outcome:** View and Build are not geometrically equivalent at any required viewport.

This document establishes measured geometry. It does not select an editing pattern or prescribe editor, rail, modal, token, or control dimensions.

## Evidence labels

- **Observed — runtime:** read from the rendered application with the in-app browser and supported by the paired runtime screenshots.
- **Observed — prototype:** read from the static sketch implementation and its screenshots. The prototype is an audit subject, not design authority.
- **Calculated:** arithmetic performed on observed values, principally `Build − View` deltas.
- **Source-derived inference:** an explanation supported by the current CSS/component structure, not direct visual observation.

## Method

The runtime was loaded from the current branch at the same requested viewport in View (`?mode=view`) and Build (`?mode=build`). The same scenario, Biomedical page, sections, panel order, data, and content were retained for each pair.

DOM measurements used `getBoundingClientRect()` and computed styles at page load. The reference selectors were:

| Subject | View selector | Build selector |
|---|---|---|
| Dashboard canvas | `main.view-shell .dashboard-workspace` | `main.build-workspace .build-live-canvas .dashboard-workspace` |
| Grid | first `.layout-grid` | first `.layout-grid` inside the live canvas |
| Representative panel | `[data-panel-id="bio_confirmed_cases"]` | `[data-panel-id="bio_confirmed_cases"]` |
| Plot | rendered chart host/frame/placeholder inside that panel | same rendered chart host/frame/placeholder |
| Authoring action row | not present | panel-local Build action row |

Coordinates are CSS pixels relative to the layout viewport at the initial scroll position. Values are reported to the precision returned by the browser. `clientW` is shown separately from the requested screenshot width because a 15 px vertical scrollbar reduced the layout viewport in every runtime sample. `documentH` is the full document scroll height. Horizontal overflow was assessed by comparing document scroll width with `clientW`.

The paired evidence is:

| Viewport | View | Build |
|---|---|---|
| 1200×900 | [runtime View](screenshots/runtime-view-1200x900-biomedical-top.png) | [runtime Build](screenshots/runtime-build-1200x900-biomedical-top.png) |
| 1440×900 | [runtime View](screenshots/runtime-view-1440x900-biomedical-top.png) | [runtime Build](screenshots/runtime-build-1440x900-biomedical-top.png) |
| 768×1024 | [runtime View](screenshots/runtime-view-768x1024-biomedical-top.png) | [runtime Build](screenshots/runtime-build-768x1024-biomedical-top.png) |
| 1024×768 | [runtime View](screenshots/runtime-view-1024x768-biomedical-top.png) | [runtime Build](screenshots/runtime-build-1024x768-biomedical-top.png) |
| 390×844 | [runtime View](screenshots/runtime-view-390x844-biomedical-top.png) | [runtime Build](screenshots/runtime-build-390x844-biomedical-top.png) |

## Runtime measurements

### Canvas bounds and authoring footprint

**Observed — runtime**, except the delta column, which is **calculated**.

`Canvas` means the actual `.dashboard-workspace`, not the surrounding Build editor region. Its `y` coordinate is also the measured vertical footprint of all header and control content before the dashboard canvas.

| Requested viewport | `clientW` | View canvas `x / y / w` | Build canvas `x / y / w` | Canvas width delta | Observed Build editor around the canvas |
|---|---:|---:|---:|---:|---|
| 1200×900 | 1185 | 24 / 614.59 / 1137 | 249 / 396 / 638 | −499 | Region 16 / 395 / 1168; columns 216 / 640 / 280; 16 gaps |
| 1440×900 | 1425 | 24 / 505 / 1377 | 313 / 347 / 743 | −634 | Region 16 / 346 / 1393; columns 280 / 745 / 336; 16 gaps |
| 768×1024 | 753 | 12 / 766.59 / 729 | 17 / 461 / 719 | −10 | Rails hidden; live-canvas wrapper 16 / 460 / 721 |
| 1024×768 | 1009 | 24 / 651.39 / 961 | 17 / 461 / 975 | +14 | Rails hidden; live-canvas wrapper 16 / 460 / 977 |
| 390×844 | 375 | 12 / 1123.19 / 351 | 13 / 1381 / 349 | −2 | Structure is a 351-wide flow block before the canvas; inspector follows the dashboard |

The `+14` outer-canvas result at 1024×768 does not establish equivalence: Build’s additional internal padding makes the grid and every measured panel 18 px narrower than View, and its plot remains shorter.

At 1200 and 1440, persistent structure and inspector columns consume horizontal space beside the live canvas. At 768 and 1024, those rails leave the normal flow, but a nested live-canvas wrapper and canvas padding remain. At 390, the structure and inspector participate in the one-column document flow, placing the dashboard later in the document and increasing the total scroll length.

### Grid tracks, gaps, and breakpoint state

**Observed — runtime**, except the delta column, which is **calculated**.

| Viewport | View grid `x / y / w` | View columns | Build grid `x / y / w` | Build columns | Gap in both | Grid width delta | Same observed breakpoint, order, and spans? |
|---|---:|---:|---:|---:|---:|---:|---|
| 1200×900 | 24 / 687.98 / 1137 | 4 × 272.25 | 265 / 485.39 / 606 | 4 × 139.5 | 16 | −531 | Yes |
| 1440×900 | 24 / 578.39 / 1377 | 4 × 332.25 | 329 / 436.39 / 711 | 4 × 165.75 | 16 | −666 | Yes |
| 768×1024 | 12 / 839.98 / 729 | 1 × 729 | 33 / 550.39 / 687 | 1 × 687 | 16 | −42 | Yes |
| 1024×768 | 24 / 724.78 / 961 | 4 × 228.25 | 33 / 550.39 / 943 | 4 × 223.75 | 16 | −18 | Yes |
| 390×844 | 12 / 1217.58 / 351 | 1 × 351 | 29 / 1491.39 / 317 | 1 × 317 | 16 | −34 | Yes |

No runtime pair changed the observed column count, panel order, or span assignment at the same viewport. That is necessary but not sufficient: track widths differ in every pair, so panel and chart geometry still change.

**Source-derived inference:** the grid classes define four equal tracks by default and collapse to one track under a viewport-level `@media (max-width: 1000px)` rule. This explains why 1024×768 retains four tracks even though Build’s inner grid is only 943 px wide, while 768×1024 collapses to one. The current breakpoint is responding to viewport width, not the width Build leaves for the dashboard. Consequently, persistent desktop rails can narrow tracks without causing a compensating layout-state change.

### Representative panel and plot area

**Observed — runtime**, except delta columns, which are **calculated**. Plot dimensions are the chart rendering area inside the panel. The Build action row is panel-local authoring chrome.

| Viewport | View panel `x / y / w / h` | View plot `w × h` | Build panel `x / y / w / h` | Build plot `w × h` | Build action row `w × h` | Panel delta `w / h` | Plot delta `w / h` |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1200×900 | 24 / 687.98 / 1137 / 418 | 1099 × 380 | 265 / 485.39 / 606 / 418 | 568 × 342 | 568 × 38 | −531 / 0 | −531 / −38 |
| 1440×900 | 24 / 578.39 / 1377 / 418 | 1339 × 380 | 329 / 436.39 / 711 / 418 | 673 × 342 | 673 × 38 | −666 / 0 | −666 / −38 |
| 768×1024 | 12 / 839.98 / 729 / 360 | 691 × 322 | 33 / 550.39 / 687 / 360 | 649 × 284 | 649 × 38 | −42 / 0 | −42 / −38 |
| 1024×768 | 24 / 724.78 / 961 / 418 | 923 × 380 | 33 / 550.39 / 943 / 418 | 905 × 342 | 905 × 38 | −18 / 0 | −18 / −38 |
| 390×844 | 12 / 1217.58 / 351 / 360 | 313 × 322 | 29 / 1491.39 / 317 / 360 | 279 × 284 | 279 × 38 | −34 / 0 | −34 / −38 |

The representative panel keeps the same outer height within each pair, but Build inserts a 38 px action row into that fixed panel height. The chart plot therefore loses exactly 38 px vertically at all five viewports. Horizontally, plot loss matches panel loss exactly. This is direct dashboard densification rather than merely denser authoring chrome.

### Scroll and overflow

**Observed — runtime**, except the height delta, which is **calculated**.

| Viewport | View `documentH` | Build `documentH` | Height delta | Horizontal overflow, View | Horizontal overflow, Build |
|---|---:|---:|---:|---|---|
| 1200×900 | 10161 | 9843 | −318 | None | None |
| 1440×900 | 10052 | 9794 | −258 | None | None |
| 768×1024 | 9995 | 9602 | −393 | None | None |
| 1024×768 | 10198 | 9908 | −290 | None | None |
| 390×844 | 10499 | 10973 | +474 | None | None |

Both modes require substantial vertical scrolling for this page. The differing total heights confirm that switching modes changes the page’s vertical geometry as well as its horizontal geometry. At 390×844, Build becomes taller because its editor regions enter document flow; at the other viewports Build is shorter even though its plots are smaller. No current runtime pair introduces page-level horizontal overflow.

## Equivalence assessment

| Required property at the same viewport | Observed result | Assessment |
|---|---|---|
| Same dashboard canvas width | Different at all five viewports | Fails |
| Same grid breakpoint | Same in all five pairs | Passes narrowly |
| Same grid tracks and gaps | Gap is stable; track widths differ in all five pairs | Fails |
| Same panel arrangement/order/spans | No change observed in the representative page | Passes for tested content |
| Same panel dimensions | Width differs in all five pairs; paired height is stable | Fails |
| Same chart plot area | Width differs and Build is 38 px shorter in all five pairs | Fails |
| No compression from persistent editing rails | 531–666 px grid loss at desktop widths | Fails |
| No page-level horizontal overflow | None observed in either current runtime mode | Passes |

The central constraint is therefore unmet even where the breakpoint and panel order happen to match. The two largest desktop samples are the most severe: Build reduces the grid and representative panel by 531 px at 1200 and by 666 px at 1440. At the three smaller samples, removing or reflowing the rails reduces but does not eliminate the difference because the live-canvas wrapper and panel-local action row continue to alter dashboard geometry.

## Source-derived explanation of the current behavior

These points explain observations; they are not proposed solutions.

- **Source-derived:** `.build-region-grid` uses three persistent columns at desktop sizes: structure, a live canvas with a minimum track, and inspector, separated by 16 px gaps. A special 1200–1319 rule still reserves all three tracks.
- **Source-derived:** between 768 and 1199, `.build-region-grid` becomes a block and side sheets are normally hidden, which matches the absence of persistent rails at 768 and 1024.
- **Source-derived:** below 768, `.build-region-grid` becomes one column but does not hide the side sheets by default. This matches the 390-wide structure/canvas/inspector flow sequence.
- **Source-derived:** `.build-live-canvas .dashboard-workspace` adds 16 px padding. This accounts for persistent inner-width loss after desktop rails disappear.
- **Source-derived:** dashboard layout classes use four equal tracks until the viewport-level 1000 px media query collapses them. They do not adapt to the Build canvas’s narrower containing block.
- **Observed plus source-derived:** Build renders panel-local authoring controls inside the panel’s existing vertical allocation, reducing the chart area while leaving the outer panel height unchanged.

## Static prototype comparison

The prototype was inspected separately at the same five viewport sizes. Values in this section are **Observed — prototype** unless marked calculated.

> **Authority warning:** the static prototype and existing UI specification are audit subjects only. They must not be used as visual or geometric authority for the revised contract. Prototype behavior is included to identify inherited assumptions and failure modes.

| Viewport | Prototype View | Prototype Build | Direct comparison |
|---|---|---|---|
| 1200×900 | `clientW` 1200; grid 1152; 2 × 566 columns | `clientW` 1185; document width 1304; editor columns 280 / 640 / 336; canvas 640; card 606 | Build overflows horizontally by 119 px and compresses the canvas/card |
| 1440×900 | Grid 1392; two 686 × 361 cards | Editor columns 280 / 745 / 336; canvas 745; selected card 711 × 388.4 | No horizontal overflow, but Build changes from two-column View arrangement to one column |
| 768×1024 | Grid/card width 705; one column | Canvas 736; card 702; tablet rails replaced by sheet behavior | Width is close but not equal; editor treatment differs |
| 1024×768 | Grid 976; two 478-wide columns | Rails hidden; canvas 977; card 943; one column | View and Build use different arrangements/breakpoint outcomes |
| 390×844 | Card width 327; one column | Card width 309; one column | Build remains 18 px narrower |

Prototype evidence:

| Viewport | View | Build |
|---|---|---|
| 1200×900 | [prototype View](screenshots/prototype-view-1200x900.png) | [prototype Build](screenshots/prototype-build-1200x900.png) |
| 1440×900 | [prototype View](screenshots/prototype-view-1440x900.png) | [prototype Build](screenshots/prototype-build-1440x900.png) |
| 768×1024 | [prototype View](screenshots/prototype-view-768x1024.png) | [prototype Build](screenshots/prototype-build-768x1024.png) |
| 1024×768 | [prototype View](screenshots/prototype-view-1024x768.png) | [prototype Build](screenshots/prototype-build-1024x768.png) |
| 390×844 | [prototype View](screenshots/prototype-view-390x844.png) | [prototype Build](screenshots/prototype-build-390x844.png) |

The prototype is not a valid baseline for Build/View equivalence. It introduces horizontal overflow at 1200, changes panel arrangement at 1440 and 1024, and narrows Build cards at multiple sizes. Its tablet inspector also covers part of the selected card; that interaction is quantified in the editing-surface audit.

## Geometry invariants for the revised UI contract

These are constraints established by the task and supported by the measured failures, not implementation prescriptions.

1. At a given viewport, the dashboard canvas in Build must use the same bounds available to the dashboard in View.
2. The same viewport and dashboard state must produce the same grid breakpoint, column count, gaps, panel order, spans, panel bounds, and plot bounds in View and Build.
3. Authoring controls may be denser than View controls, but they must not consume grid track width, panel width, or chart plot area.
4. Dashboard-level controls must remain available without reflowing the dashboard or permanently covering its content.
5. Responsive changes to authoring chrome must not silently change the underlying dashboard’s layout state.
6. View–Build equivalence must be assessed against the live application, not the static prototype or an earlier UI specification.
7. Page-level horizontal overflow remains disallowed at all tested sizes.

## Unresolved design questions

The measurements do not answer these choices and this audit does not select among them:

- What is the canonical coordinate system for equivalence when browser chrome, scrollbars, or safe areas change the layout viewport?
- How should authoring controls remain available while preserving the exact View canvas at desktop, tablet, landscape tablet, and phone sizes?
- When controls cannot coexist beside the selected object, should the system reveal them contextually, progressively, through viewport movement, or in a separate live-rendering editor?
- If a larger editor obscures the underlying dashboard, what minimum live context must remain visible and how is exact chart-render fidelity demonstrated?
- How should dashboard-level page, section, layout, and time-group controls remain reachable without reflowing or covering dashboard content?
- Should grid breakpoint behavior remain viewport-based, or must the revised contract define another responsive reference while still guaranteeing View–Build equivalence?
- Where can panel-level actions live so that they do not subtract from chart plot area or alter panel bounds?
- What scroll-position and selected-object anchoring must be preserved when entering Build, opening controls, cancelling, and returning to View?

## Baseline conclusion

The live runtime preserves the tested breakpoint, order, and span assignments, but it does not preserve canvas, track, panel, or plot geometry. Desktop rails cause the largest width losses; nested Build padding keeps smaller discrepancies after the rails disappear; and panel-local actions reduce plot height at every viewport. These measured failures define the equivalence gate for Steps 3 and 4 without deciding which editing hypothesis should satisfy it.
