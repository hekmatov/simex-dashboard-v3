# Screenshot evidence manifest

- **Dates captured:** 2026-08-11 and 2026-08-12
- **Total:** 52 PNG files
- **Directory:** [`screenshots/`](screenshots/)

## Provenance and method

- **Baseline runtime evidence** was captured from the current application on branch `codex/three-mode-dashboard-design`, starting from HEAD `adb6b84`, using a clean Vite session and the in-app browser. The transient local audit server used port 4187.
- **Step 2A runtime evidence** was captured on the same branch from HEAD `35c5eb5`, using the actual dashboard in a clean Vite session at `http://127.0.0.1:4187/` and the in-app browser. The disposable charts created during the walkthrough were removed through the product UI after capture.
- **Prototype evidence** was captured from the existing static artifact at `docs/superpowers/sketches/2026-08-10-three-mode-dashboard/index.html`, served locally for browser inspection on transient port 4188.
- View and Build runtime pairs use the same Biomedical representative page/content and the same requested viewport for direct comparison.
- Browser viewport emulation, DOM bounding boxes, computed grid styles, scroll dimensions, control actions, focus state, and screenshots were recorded together. Geometry conclusions belong in the accompanying tables; screenshots provide visual corroboration.
- The `PNG px` column reports the actual saved raster dimensions. In several captures the in-app browser reported a smaller capturable content area than the requested viewport, including scrollbar allocation. The requested viewport—not the raster filename alone—defines the comparison condition.
- Runtime interactions changed only browser/session state. No production component, CSS, application state implementation, or presentation behavior was modified.

## Authority warning

The static prototype and the existing UI specification are audit subjects, not visual design authority. Prototype screenshots show earlier assumptions and responsive consequences; they do not approve its rail geometry, controller composition, styling, or interaction pattern. Most prototype controls are inert, and its Audience view is a same-document visual swap rather than the runtime session behavior.

## Inventory summary

| Group | Count | Purpose |
| --- | ---: | --- |
| Runtime View/Build matched pairs | 10 | Direct canvas, grid, panel, plot, header, and overflow comparison at five required viewports |
| Runtime Build selections | 7 | Central/edge/top/bottom selection, inspector visibility, target occlusion, focus, and responsive placement |
| Runtime controller | 6 | Empty, connected four-chart, playback, disconnect, and ended states at required controller sizes |
| Runtime Audience | 10 | Empty/title states, one through four charts, layout variants, blackout, reload waiting, and reopen at 1920 × 1080 |
| Static prototype | 13 | Non-authoritative comparison across View, Build, inspector, controller, and Audience |
| Step 2A runtime supplement | 6 | Create-chart validation, ready preview, placement, cancellation, tablet behavior, and View playback |
| **Total** | **52** | Complete baseline plus bounded Step 2A screenshot set |

## Runtime View/Build matched pairs (10)

| File | Requested viewport | PNG px | State | Evidence use |
| --- | ---: | ---: | --- | --- |
| [runtime-view-1200x900-biomedical-top.png](screenshots/runtime-view-1200x900-biomedical-top.png) | 1200 × 900 | 1185 × 889 | View, Biomedical top | Baseline canvas/grid/panel/plot geometry; paired with Build below |
| [runtime-build-1200x900-biomedical-top.png](screenshots/runtime-build-1200x900-biomedical-top.png) | 1200 × 900 | 1185 × 889 | Build, Biomedical top | Persistent-rail compression and action-row footprint |
| [runtime-view-1440x900-biomedical-top.png](screenshots/runtime-view-1440x900-biomedical-top.png) | 1440 × 900 | 1425 × 891 | View, Biomedical top | Wide desktop baseline |
| [runtime-build-1440x900-biomedical-top.png](screenshots/runtime-build-1440x900-biomedical-top.png) | 1440 × 900 | 1425 × 891 | Build, Biomedical top | Wide desktop rail/canvas compression and plot-height loss |
| [runtime-view-768x1024-biomedical-top.png](screenshots/runtime-view-768x1024-biomedical-top.png) | 768 × 1024 | 753 × 1004 | View, Biomedical top | Portrait tablet baseline and one-column breakpoint |
| [runtime-build-768x1024-biomedical-top.png](screenshots/runtime-build-768x1024-biomedical-top.png) | 768 × 1024 | 753 × 1004 | Build, Biomedical top | Hidden-rail/nested-padding difference and action-row footprint |
| [runtime-view-1024x768-biomedical-top.png](screenshots/runtime-view-1024x768-biomedical-top.png) | 1024 × 768 | 1009 × 757 | View, Biomedical top | Landscape tablet/four-column baseline |
| [runtime-build-1024x768-biomedical-top.png](screenshots/runtime-build-1024x768-biomedical-top.png) | 1024 × 768 | 1009 × 757 | Build, Biomedical top | Hidden-rail width difference and plot-height loss |
| [runtime-view-390x844-biomedical-top.png](screenshots/runtime-view-390x844-biomedical-top.png) | 390 × 844 | 375 × 812 | View, Biomedical top | Mobile one-column baseline, long-page/overflow evidence |
| [runtime-build-390x844-biomedical-top.png](screenshots/runtime-build-390x844-biomedical-top.png) | 390 × 844 | 375 × 812 | Build, Biomedical top | Flow-stacked authoring chrome and nested canvas width |

## Runtime Build selections (7)

| File | Requested viewport | PNG px | Selected position/state | Evidence use |
| --- | ---: | ---: | --- | --- |
| [runtime-build-1440x900-selected-top.png](screenshots/runtime-build-1440x900-selected-top.png) | 1440 × 900 | 1425 × 891 | Top panel | Selected target and inspector simultaneously visible; focus behavior |
| [runtime-build-1440x900-selected-left-edge.png](screenshots/runtime-build-1440x900-selected-left-edge.png) | 1440 × 900 | 1425 × 891 | Left-edge panel | Target remains visible while sticky inspector is mostly above viewport |
| [runtime-build-1440x900-selected-right-edge.png](screenshots/runtime-build-1440x900-selected-right-edge.png) | 1440 × 900 | 1425 × 891 | Right-edge panel | Edge equivalence and inspector visibility |
| [runtime-build-1440x900-selected-central.png](screenshots/runtime-build-1440x900-selected-central.png) | 1440 × 900 | 1425 × 891 | Central/tall map panel | Target visible; inspector entirely outside viewport after scroll |
| [runtime-build-1440x900-selected-bottom.png](screenshots/runtime-build-1440x900-selected-bottom.png) | 1440 × 900 | 1425 × 891 | Bottom panel | Deep-page selection; inspector entirely outside viewport |
| [runtime-build-1024x768-selected-top-inspector-sheet.png](screenshots/runtime-build-1024x768-selected-top-inspector-sheet.png) | 1024 × 768 | 1009 × 757 | Top panel with inspector sheet | Fixed sheet covers the complete selected panel; initial Close focus and Escape behavior |
| [runtime-build-390x844-selected-top-inspector.png](screenshots/runtime-build-390x844-selected-top-inspector.png) | 390 × 844 | 375 × 812 | Top panel with flow-stacked inspector | No overlap, but editor controls are approximately 10,975 vertical px from the target |

## Runtime controller (6)

| File | Requested viewport | PNG px | State | Evidence use |
| --- | ---: | ---: | --- | --- |
| [runtime-controller-1440x900-empty-not-open.png](screenshots/runtime-controller-1440x900-empty-not-open.png) | 1440 × 900 | 1425 × 891 | No Audience session; empty scene | Wide controller geometry, monitor/context hierarchy, long chart list, sticky dock |
| [runtime-controller-1024x768-empty-not-open.png](screenshots/runtime-controller-1024x768-empty-not-open.png) | 1024 × 768 | 1009 × 757 | No Audience session; empty scene | Narrower two-column geometry, dock wrapping, scroll requirement |
| [runtime-controller-1440x900-four-chart-connected.png](screenshots/runtime-controller-1440x900-four-chart-connected.png) | 1440 × 900 | 1425 × 891 | Connected, four charts | Realistic dense scene, selection cap, ordering/layout and monitor usefulness |
| [runtime-controller-1440x900-playback-four-chart.png](screenshots/runtime-controller-1440x900-playback-four-chart.png) | 1440 × 900 | 1425 × 891 | Connected four-chart playback | Chrono Group selector, range position, Previous/Next endpoint states |
| [runtime-controller-1440x900-audience-disconnected.png](screenshots/runtime-controller-1440x900-audience-disconnected.png) | 1440 × 900 | 1425 × 891 | Audience window closed/disconnected | Disconnect status and Reopen path |
| [runtime-controller-1024x768-four-chart-ended.png](screenshots/runtime-controller-1024x768-four-chart-ended.png) | 1024 × 768 | 1009 × 757 | Four-chart composition after End Presentation | Ended-state semantics, retained selection, Open Audience return |

## Runtime Audience (10)

All files in this group were captured at the required 1920 × 1080 Audience viewport and saved at exactly 1920 × 1080.

| File | State/layout | Evidence use |
| --- | --- | --- |
| [runtime-audience-1920x1080-empty-title-on.png](screenshots/runtime-audience-1920x1080-empty-title-on.png) | Connected empty scene, title on | Scene-title footprint and empty-grid behavior |
| [runtime-audience-1920x1080-empty-title-off.png](screenshots/runtime-audience-1920x1080-empty-title-off.png) | Connected empty scene, title off | Completely blank light state; distinction from waiting/blackout |
| [runtime-audience-1920x1080-1-chart-solo.png](screenshots/runtime-audience-1920x1080-1-chart-solo.png) | One chart, Single chart | Maximum plot-area and typography reference |
| [runtime-audience-1920x1080-2-chart-side-by-side.png](screenshots/runtime-audience-1920x1080-2-chart-side-by-side.png) | Two charts, Side by side | Equal-column layout and 24 px gap |
| [runtime-audience-1920x1080-2-chart-over-under.png](screenshots/runtime-audience-1920x1080-2-chart-over-under.png) | Two charts, Over-under | Equal-row layout and vertical plot compression |
| [runtime-audience-1920x1080-3-chart-top-focus.png](screenshots/runtime-audience-1920x1080-3-chart-top-focus.png) | Three charts, One on top | Focus layout, full-width top chart, two lower cells |
| [runtime-audience-1920x1080-4-chart-grid-2x2.png](screenshots/runtime-audience-1920x1080-4-chart-grid-2x2.png) | Four charts, 2 by 2 | Densest scene and across-room label/legend/axis risk |
| [runtime-audience-1920x1080-blackout.png](screenshots/runtime-audience-1920x1080-blackout.png) | Blackout | Full black output and Restore reversibility baseline |
| [runtime-audience-1920x1080-reload-waiting.png](screenshots/runtime-audience-1920x1080-reload-waiting.png) | Reload/reconnect waiting state | Waiting copy, hierarchy, and transient recovery evidence |
| [runtime-audience-1920x1080-reopened-four-chart.png](screenshots/runtime-audience-1920x1080-reopened-four-chart.png) | Reopened/restored four-chart scene | Channel/scene persistence after disconnect and reopen |

## Static prototype comparison (13)

| File | Requested viewport | PNG px | State | Evidence use and limitation |
| --- | ---: | ---: | --- | --- |
| [prototype-view-1200x900.png](screenshots/prototype-view-1200x900.png) | 1200 × 900 | 1200 × 900 | Prototype View | Prior two-column canvas assumption; non-authoritative |
| [prototype-build-1200x900.png](screenshots/prototype-build-1200x900.png) | 1200 × 900 | 1180 × 885 | Prototype Build | Fixed rail widths and 119 px document overflow; non-authoritative |
| [prototype-view-1440x900.png](screenshots/prototype-view-1440x900.png) | 1440 × 900 | 1440 × 900 | Prototype View | Wide prior canvas reference |
| [prototype-build-1440x900.png](screenshots/prototype-build-1440x900.png) | 1440 × 900 | 1425 × 891 | Prototype Build | Fixed rails and one-column card arrangement |
| [prototype-view-768x1024.png](screenshots/prototype-view-768x1024.png) | 768 × 1024 | 753 × 1004 | Prototype View | Portrait breakpoint reference |
| [prototype-build-768x1024.png](screenshots/prototype-build-768x1024.png) | 768 × 1024 | 768 × 1024 | Prototype Build | Hidden-rail canvas reference |
| [prototype-view-1024x768.png](screenshots/prototype-view-1024x768.png) | 1024 × 768 | 1024 × 768 | Prototype View | Two-column arrangement reference |
| [prototype-build-1024x768.png](screenshots/prototype-build-1024x768.png) | 1024 × 768 | 1009 × 757 | Prototype Build | One-column arrangement/breakpoint divergence |
| [prototype-view-390x844.png](screenshots/prototype-view-390x844.png) | 390 × 844 | 375 × 812 | Prototype View | Mobile card-width reference |
| [prototype-build-390x844.png](screenshots/prototype-build-390x844.png) | 390 × 844 | 375 × 812 | Prototype Build | Mobile nested-width reference |
| [prototype-build-768x1024-inspector-sheet.png](screenshots/prototype-build-768x1024-inspector-sheet.png) | 768 × 1024 | 768 × 1024 | Prototype selected panel and inspector sheet | Approx. 56% target overlap; focus return after Escape; non-authoritative pattern |
| [prototype-controller-1440x900-default-two-chart.png](screenshots/prototype-controller-1440x900-default-two-chart.png) | 1440 × 900 | 1425 × 891 | Prototype connected two-chart controller | Earlier control hierarchy and 1462 px document; mostly inert |
| [prototype-audience-1920x1080-two-chart.png](screenshots/prototype-audience-1920x1080-two-chart.png) | 1920 × 1080 | 1920 × 1080 | Prototype two-chart Audience | Earlier 900 × 860 card geometry; same-document swap, not runtime lifecycle |

## Step 2A runtime supplement (6)

| File | Requested viewport | PNG px | State | Evidence use |
| --- | ---: | ---: | --- | --- |
| [step2a-wizard-1440x900-prerequisite-validation.png](screenshots/step2a-wizard-1440x900-prerequisite-validation.png) | 1440 × 900 | 1425 × 891 | Data source opened before chart type selection | Direct step navigation, prerequisite explanation, disabled source controls, and modal occlusion |
| [step2a-wizard-1440x900-preview-ready.png](screenshots/step2a-wizard-1440x900-preview-ready.png) | 1440 × 900 | 1425 × 891 | Valid Line chart on Style and layout | Live preview, schema-driven appearance controls, internal scrolling, and create-ready state |
| [step2a-wizard-1440x900-created-placement.png](screenshots/step2a-wizard-1440x900-created-placement.png) | 1440 × 900 | 1425 × 891 | Created Biomedical chart after scrolling to its section end | Successful placement, panel geometry, and separation from the creation viewport |
| [step2a-wizard-1440x900-discard-confirmation.png](screenshots/step2a-wizard-1440x900-discard-confirmation.png) | 1440 × 900 | 1425 × 891 | Nested discard confirmation over a partial Bar draft | Dirty cancellation copy, retained underlying draft, destructive differentiation, and initial focus |
| [step2a-wizard-768x1024-preview-ready.png](screenshots/step2a-wizard-768x1024-preview-ready.png) | 768 × 1024 | 753 × 1004 | Valid Line chart at the tablet boundary | Side-by-side preview/settings retention and internal horizontal overflow |
| [step2a-view-1440x900-playback-group-open.png](screenshots/step2a-view-1440x900-playback-group-open.png) | 1440 × 900 | 1425 × 891 | National Chrono Group in open View playback | Group-only surface, transport/seek/time/speed controls, aggregate availability, and trace/snapshot coexistence |

## Completeness check

- Five matched runtime View/Build viewport pairs: 10 files.
- Desktop Build selections at top, left edge, right edge, central, and bottom: 5 files.
- Responsive selected-panel evidence at 1024 × 768 and 390 × 844: 2 files.
- Controller evidence at 1440 × 900 and 1024 × 768, including empty, dense, playback, disconnect, and end: 6 files.
- Audience evidence at 1920 × 1080, including 0/1/2/3/4 charts, title on/off, layout alternatives, blackout, reload, and reopen: 10 files.
- Static prototype comparison: 13 files.
- Step 2A runtime supplement at 1440 × 900 and 768 × 1024: 6 files.
- **Total: 52 files.**
