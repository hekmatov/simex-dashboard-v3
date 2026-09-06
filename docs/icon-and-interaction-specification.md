# Icon & Interaction Specification

Version: **1.1.0**

> This document is generated. Do not edit it directly.
>
> Designers use `docs/icon-language-atlas.html` as the canonical visual reference. The application and both generated references consume `src/iconography/iconCatalog.js` and `src/iconography/iconGlyphs.js`; those metadata modules are the technical authority.

## Purpose

The SimEx dashboard uses a compact, icon-first interaction language. Controls that can be understood as actions use an icon without a persistent text label and reveal their accessible name in a tooltip on hover and keyboard focus. Analytical values and other text marked `reference` remain text when meaning would otherwise be lost.

The shared metadata prevents three kinds of drift:

1. the application rendering a different glyph from the design reference;
2. tooltips and accessible labels diverging from the interaction specification;
3. implementation status, destructive tone, or confirmation requirements being documented differently from the application contract.

## Authority and generation

- Glyph geometry: `src/iconography/iconGlyphs.js`
- Interaction, state, token, surface, and chart mappings: `src/iconography/iconCatalog.js`
- Deterministic generator: `scripts/build-icon-reference.mjs`
- Generated visual atlas: `docs/icon-language-atlas.html`
- Generated written specification: `docs/icon-and-interaction-specification.md`

The generated files contain no timestamps, machine paths, random identifiers, or environment-specific content. Run `pnpm.cmd icons:build` after editing the metadata and `pnpm.cmd icons:check` to detect drift.

## Core interaction rules

1. **Icon-only by default.** Action controls render as icons. Their metadata label is the accessible name and their tooltip appears on hover and keyboard focus.
2. **Text remains purposeful.** `renderMode: text` and `status: reference` identify analytical values or controls whose meaning still requires visible words.
3. **One dashboard accent.** The base accent is selected at dashboard level; readable light and dark variants are derived to meet the approved contrast target.
4. **Destructive actions are unmistakable.** A destructive control uses the danger red as its base while retaining the same secondary accent as the rest of the dashboard.
5. **Selection is semantic.** Selected controls use the shared success green. Multi-fullscreen selection also carries the announced ordinal.
6. **Confirmation is metadata.** `confirmation: none`, `required`, or `conditional` is part of the interaction contract. Required confirmation always applies; conditional confirmation is decided by the application flow from the analyzed consequences.
7. **Geometry is immutable at render time.** Application components select registered glyph IDs; they do not patch SVG paths or load alternate icon assets.

## Catalogue summary

| Measure | Count |
| --- | ---: |
| Approved glyphs | 116 |
| Unique interaction records | 130 |
| Surface interaction references | 141 |
| Surfaces | 14 |
| Chart pictograms | 27 |
| Visual states | 7 |

Repeated interaction concepts may appear on more than one surface. The surface-reference count intentionally preserves those appearances, while the unique-record count describes the current metadata keys.

## Color tokens

| Token | Default | Meaning |
| --- | --- | --- |
| base | #17191B | Base icon color on light surfaces |
| accentBase | #19D3C5 | Dashboard-level author-selected accent |
| accentOnLight | #0D746D | Derived accent used on light surfaces |
| accentOnDark | #32DED1 | Derived accent used on dark surfaces |
| danger | #D64545 | Destructive icon base; the secondary accent remains shared |
| success | #2AA876 | Selected and confirmed state |

The base icon color is contextual: dark ink on light surfaces and light ink on dark surfaces. Accent derivation falls back to the approved defaults when input is invalid.

## Required visual states

| State | Meaning |
| --- | --- |
| default | Available, idle action |
| hover | Pointer is over the action; tooltip is visible |
| active | Action is being pressed |
| selected | Action or panel is selected; semantic green is used |
| disabled | Action is unavailable and non-interactive |
| busy | Action is processing; motion respects reduced-motion preferences |
| danger | Destructive action; red base with the shared secondary accent |

## Metadata fields

| Field | Contract |
| --- | --- |
| `id` | Stable dot-separated interaction identifier |
| `glyphId` | Key in the glyph authority |
| `label` | Accessible name announced by assistive technology |
| `tooltip` | Concise text shown on hover and keyboard focus |
| `renderMode` | `icon` for icon-only controls; `text` for retained visible text/data |
| `tone` | `standard` or `danger` |
| `status` | `live`, `planned`, or `reference` |
| `confirmation` | `none`, `required`, or `conditional` |
| `note` | Surface-specific implementation or design guidance |

## Status meanings

- **live** — the application currently renders this interaction from the shared catalogue.
- **planned** — approved visual and semantic contract whose product behavior is deferred.
- **reference** — retained text or analytical data, shown in the atlas for context rather than forced into icon-only rendering.

## Surface contracts

## Approved refinements

Surface ID: `refinements` · 12 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shell.open-editable-tab | open | Open editable tab | Open editable tab | icon | standard | live | none | Arrow spacing balanced above and beside the box |
| image.zoom-reset | zoomReset | Reset image zoom | Reset image zoom | icon | standard | live | none | Approved reset arc with inset magnifier |
| transport.fast-forward | fastForward | Fast forward | Fast forward | icon | standard | planned | none | Exact horizontal mirror of rewind |
| fullscreen.select.1 | selectPanel1 | 1 of 4 selected | 1 of 4 selected | icon | standard | live | none | Accent check; number offset upper-left |
| fullscreen.open | fullscreen | Open chart fullscreen | Fullscreen | icon | standard | live | none | Complete top-right corner uses the accent |
| panel.description | description | Description | Description | icon | standard | planned | none | Top and bottom lines accented |
| collection.loop | loop | Loop | Loop | icon | standard | live | none | Arrowheads terminate the path and point down/up |
| collection.periodic | periodic | Periodic rotation | Periodic rotation | icon | standard | planned | none | Arrowhead follows the circular direction |
| chart.mixed-axis | chartMixed | Mixed axis | Mixed axis | icon | standard | reference | none | Three bars with a lower accent line |
| chart.pie | chartPie | Pie | Pie | icon | standard | reference | none | Equal horizontal and vertical slice separation |
| chart.chronological-choropleth | chartMapTime | Chronological choropleth | Chronological choropleth | icon | standard | reference | none | Larger time clock |
| chart.table | chartTable | Table | Table | icon | standard | reference | none | Top row and left column accented with inset fills |

## Dashboard shell

Surface ID: `shell` · 28 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shell.open-editable-tab | open | Open editable tab | Open editable tab | icon | standard | live | none | Arrow spacing balanced above and beside the box |
| shell.auto-viewport | auto | Auto | Auto | icon | standard | live | none | — |
| shell.tablet-preview | tablet | Tablet | Tablet | icon | standard | live | none | — |
| shell.phone-preview | phone | Phone | Phone | icon | standard | live | none | — |
| shell.background | background | Background | Background | icon | standard | live | none | — |
| shell.add-chart | addChart | Add chart | Add chart | icon | standard | live | none | — |
| shell.edit-chart | edit | Edit chart | Edit chart | icon | standard | live | none | — |
| chart.remove | trash | Remove chart | Remove chart | icon | danger | live | required | Destructive chart action; confirmation required |
| shell.add-tab | addTab | Add tab | Add tab | icon | standard | live | none | — |
| image.zoom-reset | zoomReset | Reset image zoom | Reset image zoom | icon | standard | live | none | Approved reset arc with inset magnifier |
| shell.save-edits | save | Save edits | Save edits | icon | standard | live | none | — |
| shell.reset-edits | reset | Reset edits | Reset edits | icon | standard | live | none | — |
| shell.remove-tab | trash | Remove tab | Remove tab | icon | danger | live | required | Scope-changing confirmation |
| shell.import | import | Import | Import | icon | standard | live | none | — |
| shell.export | export | Export | Export | icon | standard | live | none | — |
| shell.global-panel-colors | palette | Global panel colors | Global panel colors | icon | standard | live | none | — |
| shell.chart-accessibility | accessibility | Chart accessibility | Chart accessibility | text | standard | reference | none | — |
| shell.apply-background | check | Apply background | Apply background | icon | standard | live | none | — |
| shell.save-background | save | Save background | Save background | icon | standard | live | none | — |
| shell.reset-background | reset | Reset background | Reset background | icon | standard | live | none | — |
| shell.remove-title | trash | Remove title | Remove title | icon | danger | live | required | Content-changing confirmation |
| shell.start-section | section | Start section | Start section | icon | standard | live | none | — |
| shell.install | install | Install | Install | icon | standard | live | none | — |
| shell.report-an-issue | reportIssue | Report an issue | Report an issue | icon | standard | reference | none | — |
| shell.contact | open | Contact | Contact | text | standard | reference | none | — |
| shell.repository | open | Repository | Repository | text | standard | reference | none | — |
| panel.move | moveFourWay | Move panel | Move panel | icon | standard | live | conditional | Four-arrow drag handle with keyboard and single-pointer destination alternatives |
| shell.icon-accent | palette | Icon accent | Icon accent | icon | standard | live | none | Sets the dashboard-wide secondary icon accent |

## Synchronized playback

Surface ID: `playback` · 11 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| playback.open-synchronized-playback | playback | Synchronized playback | Synchronized playback | icon | standard | live | none | — |
| playback.previous-time-point | previous | Previous | Previous | icon | standard | live | none | — |
| playback.play | play | Play | Play | icon | standard | live | none | — |
| playback.pause | pause | Pause | Pause | icon | standard | live | none | — |
| playback.next-time-point | next | Next | Next | icon | standard | live | none | — |
| playback.playback-group | group | Playback group | Playback group | text | standard | reference | none | — |
| playback.choose-synchronized-time | timeSelect | Choose synchronized time | Choose synchronized time | icon | standard | reference | none | — |
| playback.playback-time | time | Playback time | Playback time | text | standard | reference | none | — |
| playback.current-time | time | Current time: 2027-04-17 | Current time: 2027-04-17 | text | standard | reference | none | — |
| playback.playback-speed | — | 1× | Playback speed | text | standard | reference | none | Runtime value uses {speed}× |
| playback.live-playback-status | playback | Live playback status | Live playback status | text | standard | reference | none | — |

## Planned transport

Surface ID: `transport` · 4 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| transport.rewind | rewind | Rewind | Rewind | icon | standard | planned | none | Continuous or multi-step scan |
| transport.fast-forward | fastForward | Fast forward | Fast forward | icon | standard | planned | none | Exact horizontal mirror of rewind |
| transport.jump-to-first-time-point | jumpStart | Jump to start | Jump to start | icon | standard | planned | none | — |
| transport.jump-to-last-time-point | jumpEnd | Jump to end | Jump to end | icon | standard | planned | none | — |

## Fullscreen

Surface ID: `fullscreen` · 13 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fullscreen.open | fullscreen | Open chart fullscreen | Fullscreen | icon | standard | live | none | Complete top-right corner uses the accent |
| fullscreen.select.1 | selectPanel1 | 1 of 4 selected | 1 of 4 selected | icon | standard | live | none | Accent check; number offset upper-left |
| fullscreen.select.2 | selectPanel2 | 2 of 4 selected | 2 of 4 selected | icon | standard | live | none | Accent check; number offset upper-left |
| fullscreen.select.3 | selectPanel3 | 3 of 4 selected | 3 of 4 selected | icon | standard | live | none | Accent check; number offset upper-left |
| fullscreen.select.4 | selectPanel4 | 4 of 4 selected | 4 of 4 selected | icon | standard | live | none | Accent check; maximum selection reached |
| fullscreen.enter-multi-fullscreen | enterMulti | Enter multi-fullscreen | Enter multi-fullscreen | icon | standard | live | none | — |
| fullscreen.cancel-multi-selection | close | Cancel | Cancel | text | standard | reference | none | — |
| fullscreen.previous-displayed-chart | reorderPrevious | Previous | Previous | icon | standard | live | none | Reorder, not time step |
| fullscreen.next-displayed-chart | reorderNext | Next | Next | icon | standard | live | none | Reorder, not time step |
| fullscreen.close-chart | close | Close | Close | icon | standard | live | none | — |
| fullscreen.close-all-fullscreen-charts | closeAll | Close all | Close all | icon | standard | live | none | — |
| fullscreen.displayed-chart-position | layoutGrid | 1 of 4 | 1 of 4 | text | standard | reference | none | Numeric badge retained |
| fullscreen.selection-count | selectionCount | 3 charts selected | 3 charts selected | icon | standard | reference | none | Numeric status remains dynamic |

## Layouts

Surface ID: `layouts` · 8 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| layout.solo | layoutSolo | Solo | Solo | icon | standard | live | none | — |
| layout.side-by-side | layoutSide | Side by side | Side by side | icon | standard | live | none | — |
| layout.over-and-under | layoutOver | Over and under | Over and under | icon | standard | live | none | — |
| layout.top-dominant | layoutTop | Top dominant | Top dominant | icon | standard | live | none | — |
| layout.bottom-dominant | layoutBottom | Bottom dominant | Bottom dominant | icon | standard | live | none | — |
| layout.left-dominant | layoutLeft | Left dominant | Left dominant | icon | standard | live | none | — |
| layout.right-dominant | layoutRight | Right dominant | Right dominant | icon | standard | live | none | — |
| layout.2-2-grid | layoutGrid | 2 × 2 | 2 × 2 | icon | standard | live | none | — |

## Chart panels

Surface ID: `panels` · 7 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| panel.view-source-information | info | Source information | Source information | icon | standard | live | none | Hover-revealed lower-right action |
| panel.view-source-csv | table | View source CSV | View source CSV | icon | standard | live | none | Opens bare table window |
| fullscreen.open | fullscreen | Open chart fullscreen | Fullscreen | icon | standard | live | none | Complete top-right corner uses the accent |
| panel.description | description | Description | Description | icon | standard | planned | none | Top and bottom lines accented |
| panel.edit-chart | edit | Edit chart | Edit chart | icon | standard | live | none | — |
| chart.remove | trash | Remove chart | Remove chart | icon | danger | live | required | Destructive chart action; confirmation required |
| panel.hold-ctrl-while-scrolling-to-zoom | — | Hold Ctrl while scrolling | Hold Ctrl while scrolling | text | standard | reference | none | Inconspicuous top-left hint |

## Chart wizard

Surface ID: `wizard` · 12 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wizard.close-wizard | close | Close | Close | icon | standard | live | none | — |
| wizard.select-chart-type | chartType | Chart type | Chart type | icon | standard | live | none | — |
| wizard.select-data-source | dataSource | Data source | Data source | icon | standard | live | none | — |
| wizard.configure-data-roles | roles | Data roles | Data roles | icon | standard | live | none | — |
| wizard.style-and-layout | style | Style & layout | Style & layout | icon | standard | live | none | — |
| wizard.create-chart | addChart | Create chart | Create chart | icon | standard | live | none | — |
| wizard.upload-csv | upload | Upload CSV | Upload CSV | text | standard | reference | none | — |
| wizard.enter-data-manually | manual | Enter data manually | Enter data manually | icon | standard | live | none | — |
| wizard.view-source-csv | table | View source CSV | View source CSV | icon | standard | live | none | — |
| wizard.remove-data-source | trash | Remove source | Remove source | icon | danger | live | required | Scope-changing |
| wizard.add-row | addRow | Add row | Add row | icon | standard | live | none | — |
| wizard.remove-row | removeRow | Remove row | Remove row | icon | danger | live | required | Destructive row action |

## Editor tabs

Surface ID: `editor-tabs` · 8 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| editor.tab.data | dataTab | Data | Data | icon | standard | live | none | — |
| editor.tab.appearance | palette | Appearance | Appearance | icon | standard | live | none | — |
| editor.tab.axes | axes | Axes | Axes | icon | standard | live | none | — |
| editor.tab.map | map | Map | Map | icon | standard | live | none | — |
| editor.tab.timeline | timeline | Timeline | Timeline | icon | standard | live | none | — |
| editor.tab.collection | collection | Collection | Collection | icon | standard | live | none | — |
| editor.tab.interactions | interactions | Interactions | Interactions | icon | standard | live | none | — |
| editor.tab.advanced | advanced | Advanced | Advanced | icon | standard | live | none | — |

## Editor actions

Surface ID: `editor-actions` · 16 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| editor.add-measurement | addChart | Add measurement | Add measurement | icon | standard | live | none | — |
| editor.add-column | addRow | Add column | Add column | text | standard | reference | none | — |
| editor.add-filter | addTab | Add filter | Add filter | icon | standard | live | none | — |
| editor.add-factor | roles | Add factor | Add factor | icon | standard | live | none | — |
| editor.add-color | palette | Add color | Add color | icon | standard | live | none | — |
| editor.remove-measurement | trash | Remove measurement | Remove measurement | icon | danger | live | required | Destructive field action |
| editor.pick-color-from-dashboard | eyedropper | Eyedropper | Eyedropper | icon | standard | live | none | — |
| editor.use-default-colors | palette | Use default colors | Use default colors | icon | standard | live | none | — |
| editor.apply-to-source-sharing-charts | dataSource | Apply to source-sharing charts | Apply to source-sharing charts | icon | standard | live | none | Cross-chart propagation must stay explicit |
| editor.save-changes | save | Save changes | Save changes | icon | standard | live | none | — |
| editor.reset-changes | reset | Reset changes | Reset changes | icon | standard | live | none | — |
| editor.cancel | close | Cancel | Cancel | icon | standard | live | none | — |
| chart.remove | trash | Remove chart | Remove chart | icon | danger | live | required | Destructive chart action; confirmation required |
| editor.previous-source-page | previous | Previous | Previous | icon | standard | planned | none | — |
| editor.next-source-page | next | Next | Next | icon | standard | planned | none | — |
| editor.add-reference-line | referenceLine | Reference line | Reference line | icon | standard | planned | none | Planned for line graphs |

## Collection modes

Surface ID: `collection-modes` · 4 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| collection.mode.fixed-grid | fixedGrid | Fixed Grid | Fixed Grid | icon | standard | live | none | — |
| collection.mode.scrollable-grid | scrollGrid | Scrollable Grid | Scrollable Grid | icon | standard | live | none | — |
| collection.mode.auto-carousel | carousel | Auto Carousel | Auto Carousel | icon | standard | live | none | — |
| collection.mode.priority-mode | priority | Priority Mode | Priority Mode | icon | standard | planned | none | — |

## Collection controls

Surface ID: `collection-controls` · 16 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| collection.pause-carousel | pause | Pause | Pause | icon | standard | live | none | — |
| collection.resume-carousel | play | Resume | Resume | icon | standard | live | none | — |
| collection.previous-page | previous | Previous | Previous | icon | standard | live | none | — |
| collection.next-page | next | Next | Next | icon | standard | live | none | — |
| collection.loop | loop | Loop | Loop | icon | standard | live | none | Arrowheads terminate the path and point down/up |
| collection.sort-ascending | sortAsc | Ascending | Ascending | icon | standard | live | none | — |
| collection.sort-descending | sortDesc | Descending | Descending | icon | standard | live | none | — |
| collection.re-rank-now | rerank | Re-rank | Re-rank | icon | standard | live | none | — |
| collection.keep-stable-order | lock | Stable order | Stable order | icon | standard | live | none | — |
| collection.continuous-scroll | continuous | Continuous | Continuous | icon | standard | planned | none | — |
| collection.periodic | periodic | Periodic rotation | Periodic rotation | icon | standard | planned | none | Arrowhead follows the circular direction |
| collection.page-status | carousel | Page 1 of 4 | Page 1 of 4 | text | standard | reference | none | — |
| collection.rotation-speed | speed | Rotation speed | Rotation speed | text | standard | reference | none | — |
| collection.rows | fixedGrid | Rows · 3 | Rows · 3 | text | standard | reference | none | — |
| collection.columns | fixedGrid | Columns · 3 | Columns · 3 | text | standard | reference | none | — |
| collection.ranking-method | priority | Ranking method | Ranking method | text | standard | reference | none | — |

## Present and Audience

Surface ID: `presentation` · 2 references

| Interaction ID | Glyph | Accessible label | Tooltip | Rendering | Tone | Status | Confirmation | Implementation note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| presentation.connection-disconnected | connectionDisconnected | Audience display disconnected | Audience display disconnected | icon | standard | live | none | Approved D2 display-offline glyph |
| presentation.connection-reconnecting | connectionReconnecting | Audience display reconnecting | Audience display reconnecting | icon | standard | live | none | Approved R2 display-recovery glyph |

## Chart-type pictograms

Chart labels and descriptions remain owned by the chart schema registry. The icon catalogue maps each registered chart type to exactly one glyph.

| Chart type ID | Label | Glyph | Group | Purpose |
| --- | --- | --- | --- | --- |
| bar | Bar | chartBar | comparison | Compare values across categories. |
| groupedBar | Grouped bar | chartGrouped | comparison | Compare series side by side across categories. |
| stackedBar | Stacked bar | chartStacked | comparison | Compare totals and their composition across categories. |
| horizontalBar | Horizontal bar | chartHBar | comparison | Compare category values when labels need more room. |
| horizontalStackedBar | Horizontal stacked bar | chartHStacked | comparison | Compare horizontal totals and their composition. |
| line | Line | chartLine | trends | Show how one or more measurements change. |
| area | Area | chartArea | trends | Show how a measurement changes and accumulates over time. |
| mixed | Mixed axis | chartMixed | trends | Compare measures using bars and lines with primary or secondary axes. |
| pie | Pie | chartPie | composition | Show how categories contribute to a whole. |
| donut | Donut | chartDonut | composition | Show category shares while leaving room for a central summary. |
| kpi | KPI card | chartKpi | targets | Display one key measurement with optional context. |
| gauge | Gauge | chartGauge | targets | Show a current value against configured threshold ranges. |
| bullet | Bullet / target | chartBullet | targets | Compare actual performance against a target and performance ranges. |
| deltaCard | Delta card | chartDelta | targets | Show change between observations for a single measurement. |
| deltaList | Delta list | chartDeltaList | targets | Compare change across multiple entities. |
| scatter | Scatter | chartScatter | relationships | Show the relationship between two measurements. |
| bubble | Bubble | chartBubble | relationships | Show a relationship with a third measurement encoded by size. |
| heatmap | Heatmap | chartHeatmap | readiness | Show the intensity of values across two categories. |
| readinessMatrix | Readiness matrix | chartReadiness | readiness | Show readiness states across entities and criteria. |
| timeline | Timeline | chartTimeline | timeline | Show events and intervals over time. |
| swimlane | Swimlane | chartSwimlane | timeline | Show events over time organized into lanes. |
| choroplethMap | Choropleth | chartMap | geography | Show a value by geographic region. |
| chronoChoroplethMap | Chronological choropleth | chartMapTime | geography | Show how geographic values change over time. |
| mapScatter | Map scatter | chartMapScatter | geography | Show measured points or values at geographic locations. |
| table | Table | chartTable | operational | Show detailed operational records in rows and columns. |
| image | Image | chartImage | operational | Display a saved image with accessible alternative text and nondestructive presentation transforms. |
| freeText | Free text | description | operational | Display portable QMD-style formatted text as static dashboard content. |

## Validation and change workflow

1. Change glyph geometry or interaction metadata only in the source modules.
2. Run `pnpm.cmd icons:build` to regenerate the HTML atlas and this specification.
3. Inspect the generated atlas at normal and enlarged browser zoom. Verify hover and keyboard-focus tooltips, light/dark accent contrast, destructive red, selected green, and all seven visual states.
4. Run `pnpm.cmd icons:check`. A stale generated file fails with instructions to regenerate.
5. Review the source and both generated files together. Never edit a generated reference to conceal a metadata mismatch.

Broad application tests are governed by the project’s normal verification cadence; icon reference generation itself is dependency-free and deterministic.
