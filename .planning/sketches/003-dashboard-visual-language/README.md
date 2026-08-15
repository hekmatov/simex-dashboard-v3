---
sketch: 003-dashboard-visual-language
status: Approved
winner: Three visual styles + 15 approved saveable palettes with independent Profile/Standard chart colors and Light/Dark/System
tags: [visual-language, themes, color-profiles, chart-color-mode, charts, light-dark-system, institutional-portfolio, graphpad, monochrome]
---

# 003 — Dashboard visual language

## Status

**Overall status:** Approved

**Winner or synthesis:** Three visual styles plus 15 approved, saveable palettes, with independent Profile/Standard chart colors and Light/Dark/System appearance

The user exercised and approved all three visual grammars: **Evidence Ledger**, **Humanist Standard**, and **Signal Instrument**. The final portfolio contains 15 saveable palettes: the nine style-owned core profiles; **Prismatic Index**, **Chromatic Polarity**, and **Luminance Ladder**; plus **Sunrise — Reference faithful**, **Lakeside — Reference faithful**, and **Monochrome Reserve**. **Original baseline** remains review-only and outside the portfolio. **Sunrise — Contrast tuned** and **Lakeside — Contrast tuned** are rejected as portfolio entries but preserved in the interactive sketch as comparison evidence.

The exact Light and Dark paint tokens for every approved palette are available in the browser-rendered [palette catalogue](palette-catalog.html). [PALETTE-CATALOG.md](PALETTE-CATALOG.md) remains the Markdown source record.

| Portfolio candidate | Current status | Review order |
|---|---|---:|
| Evidence Ledger / Style 1 | **Approved** — all three product profiles retained; Original baseline remains review-only | 1 |
| Humanist Standard / Style 2 | **Approved** — all three product profiles retained; cross-style palettes and independent review rail proven | 2 |
| Signal Instrument / Style 3 | **Approved** — all three core product profiles retained; operational-instrument grammar accepted | 3 |
| Combined three-style portfolio | **Approved** — all three non-colour grammars earn distinct positions | 4 |
| First portfolio-level utility trio | **Approved** — **Prismatic Index**, **Chromatic Polarity**, and **Luminance Ladder** are retained as portable profiles | 5 |
| GraphPad and monochrome expansion | **Approved synthesis** — both Reference-faithful palettes and Monochrome Reserve retained; both Contrast-tuned alternatives rejected and preserved | 6 |

## Design question

What should the V3 dashboard feel like visually across chart surfaces, navigation, and authoring states, and which three complementary aesthetic philosophies can cover a broad range of institutional tastes without changing what the dashboard is or how it works?

## Scope in

- One fixed representative View/Build analytical webpage rendered through one semantic structure, one geometry system, one fixture ledger, and one interaction/state machine. Its first section preserves the existing six-chart grid; later document-flow sections broaden the visual-language test without replacing it.
- Three aesthetic philosophies that differ materially in surface model, contour/elevation grammar, typographic voice, neutral value architecture, UI-to-data colour strategy, affordance finish, and motion/material character.
- Nine approved source-owned core colour profiles: each style contributes a designated **Signature**, a lower-stylization **Restrained**, and a hue-strategy **Counterpoint** profile. Each has a namespaced ID and explicit source-style provenance, but any profile may be previewed and saved with any approved style grammar. Restrained profiles inherit their corresponding Signature chart-series colours while quieting only surface/UI/semantic/focus treatment; **Cool Archive** likewise retains its own cool surface/UI philosophy while inheriting Brighter Vellum's chart-series colours.
- Three approved, portable utility-led profiles whose rationale comes from colour theory or a specific advantage rather than a fourth aesthetic grammar: **Prismatic Index**, **Chromatic Polarity**, and **Luminance Ladder**. Each remains combinable with all three approved styles and preserves the common structure, geometry, data, interactions, and state machine.
- A completed five-candidate comparison round: the Reference-faithful and locally Contrast-tuned forms of GraphPad Prism's colourblind-safe **Sunrise** and **Lakeside** Light series, plus **Monochrome Reserve**. The two Reference-faithful palettes and Monochrome Reserve are approved; the two Contrast-tuned alternatives are rejected and preserved. All five use the same fixture, styles, scenes, appearance resolver, Chart color mode, and state machine.
- One independent dashboard-wide **Chart color mode** with **Profile colors** and **Standard chart colors** choices. It changes only chart data marks/series and their legend swatches; it does not restyle the interface or semantic status system.
- A curated Light and Dark appearance for every style, plus a System preference that selects that style's Light or Dark appearance from the machine preference.
- Application and canvas backgrounds; chart surfaces; section headings; typography voice; controls, fields, tabs, menus, icons, focus; chart-series finish; semantic status treatment; and restrained decorative motion.
- Normal, hover, keyboard-focus, selected, editing, Chrono-member, loading, partial-data, and error chart states, with non-colour equivalents.
- Long chart titles, dense legends, signed values, data-series association, state copy, and contrast in both Light and Dark.
- Ten fixed charts spanning trend, threshold, choropleth, ranked comparison, dense multi-series, table/capacity, mixed column/line, donut/composition, bullet collection, and grouped temporal-bar treatments.
- Representative analytical-page content: management/data-quality notice, About narrative, definitions/methodology disclosure, data-source/freshness information, owner/contact details, related resources, a document-flow footer, and an accessible Feedback & support menu.
- Non-mutating style preview followed by a deliberate **Set as dashboard style** action.
- Style continuity across View, Build, later workflow sketches, Present preview, and Audience chart surfaces. Sketch `009-shared-shell-and-product-chrome` owns the full product-chrome synthesis.
- Explicit geometry and state ledgers that prove a style switch changes paint and visual voice, not structure or behaviour.
- A wide, vertical, independently scrolling review rail outside the fixture. It contains every prototype-only style, palette, appearance, chart-colour, scene, and evidence control without consuming product geometry.

## Scope out

- Changing dashboard structure, grid, panel footprints, panel order, chart plot geometry, control placement, product navigation, interaction paths, state transitions, data, or chart meaning to make a style look better.
- Deciding the final shared page header, mode switcher, page/section navigation, global gutters, dashboard identity, global actions, or whether a footer/status region is persistent, what ultimately owns it, and where it is finally placed. Those belong to Sketch 009.
- Reopening the approved Audience composition or Unit Orbit/footprint directions from Sketches 001 and 002.
- Sector-branded costumes such as “medical teal,” “government navy,” or “emergency red”; role-based control access; institution-specific capabilities; or different interfaces for different user types.
- Network fonts, remote images, a new UI framework, a forked chart renderer, production components, schemas, persistence, tests, Quorum changes, or production CSS.
- Treating the prototype token values as production-final without later implementation calibration.
- Production authorization for changing a dashboard style. The Step 4 prototype exposes the action without role gating; a later dashboard-owner/profile restriction remains a separate product-policy question.
- A whole-app prototype. The surrounding shell stays minimal and invariant so the style decision remains attributable.

### Representative-page boundary

Sketch 003 owns the visual-language treatment of the representative page elements it contains: paint, typography voice within locked line geometry, section rhythm and density, surface contour, dividers, link and button finish, and hover, focus, menu-open, disclosure-open, and confirmation states. It may judge whether the same style remains coherent across charts, notices, prose, metadata, links, disclosures, menus, and a footer-like document ending.

Sketch 009 still decides the final product-chrome structure and synthesis: app-header hierarchy, mode and page/section navigation, overall gutters, final relationship between header and canvas, global action ownership, and whether any footer/status region persists, what it owns, and its ultimate placement. The non-sticky footer in Sketch 003 is a fixed representative document-flow specimen for visual evaluation, not an approval of final shell ownership or persistence.

The additional inventory deliberately includes reasonable analytical-page elements beyond the user's examples. This prevents a style from succeeding only as a chart-container specimen and exposes how it handles realistic reading density, source trust, methodology, support, links, and the end of a long page. It does not authorize new product behaviour or vary content between candidates.

Across every style, profile, Chart color mode, appearance, and review scene, page anatomy, content, chart order, controls, and interaction vocabulary remain identical; a scene may activate only its predeclared state attributes and deterministic transitions.

Prototype-only review controls live in a wide side rail with its own scroll. The representative product fixture scrolls independently beside it. The rail is outside the geometry ledger, is not product chrome, and is not evidence for final settings placement; Sketch 009 still owns the shared-shell and settings synthesis.

## Approved cross-style variation contract

### Governing model

The sketch uses one semantic HTML tree, one shared geometry stylesheet, one fixture/state machine, and paint-only style packs. A style selection may change CSS custom properties and non-layout pseudo-element paint. It must not select alternative markup, JavaScript branches, media-query layouts, component anatomy, content, or interaction behaviour.

Styles have identical structure, geometry, data, chart order, interactions, and state transitions. The shared spacing and density system is locked across the portfolio.

### Immutable across all styles

| Area | Locked requirement |
|---|---|
| Semantics and access | Identical DOM/ARIA structure, labels, copy, icon meaning, keyboard order, focus restoration, and activation targets. |
| Fixture | Identical FIX-DASH-01-derived data, ten chart identities and order, footprints, analytical sections, supporting-content inventory/copy, footer links, filters, synchronized time, long strings, and deterministic state releases. |
| Geometry | Identical application/canvas bounds, grid tracks and gaps, panel x/y/w/h, plot rectangles, title/legend allocation, editor/control rectangles, breakpoints, scroll behaviour, and page overflow. |
| Typography geometry | Identical type sizes, line heights, allocated text boxes, content, number/date formatting, line capacity, truncation policy, and reading order. |
| State machine | Identical View, Build, Unit Orbit, Chrono, loading, partial, error, draft, validation, save, preview, disclosure, Feedback & support menu, confirmation, focus, and reduced-motion scripts. |
| Chart meaning | Identical series IDs, slot order, legend mapping, scales, values, marks, axes, annotations, temporal truth, and hit targets. |
| Control truth | Identical controls, labels, links, disclosure/menu items, order, enabled/disabled/read-only reasons, actions, fake delays, transition event order, Escape/outside-click behaviour, and persistence consequences. |
| Responsive behaviour | Identical breakpoints and adaptation. No style-specific capability, omission, rearrangement, or phone policy. |
| Runtime boundary | No network dependency, production import, new framework, forked renderer/state, Quorum change, or style-specific schema. |

The comparison records a geometry digest before and after every style/appearance switch. Canvas bounds, grid columns, panel rectangles, plot rectangles, stable text-line counts, and root overflow must have zero candidate-attributable delta.

### Colour-profile contract

Every dashboard style authors and owns three approved, saveable core colour profiles. The common profile roles are fixed across the portfolio, while each profile retains its source-style name, ownership, and philosophy:

| Source style | Profile role and namespaced product palette | Authored intent |
|---|---|---|
| Evidence Ledger | **Signature — Brighter Vellum** (`evidence-ledger/brighter-vellum`) | Substantially lighter paper, canvas, and chart surfaces; a calmer mineral series palette; and editorial warmth without the original visual heaviness. |
| Evidence Ledger | **Restrained — Ash Register** (`evidence-ledger/ash-register`) | Near-white limestone surfaces and quieter graphite-led UI, semantic, and focus paint; chart-series colours inherit Brighter Vellum for the resolved Light or Dark appearance. |
| Evidence Ledger | **Counterpoint — Cool Archive** (`evidence-ledger/cool-archive`) | Cool fog and limestone surfaces with archival UI/semantic treatment rather than sector-coded or generic-blue chrome; chart-series colours inherit Brighter Vellum in the resolved appearance. |
| Humanist Standard | **Signature — Common Ground** (`humanist-standard/common-ground`) | Warm cloud and sage neutrals with calm teal/cobalt emphasis: the clearest approachable, matte, institution-neutral expression. |
| Humanist Standard | **Restrained — Quiet Commons** (`humanist-standard/quiet-commons`) | Pearl and soft-stone surfaces with subdued petrol UI, semantic, and focus emphasis; chart-series colours inherit Common Ground for the resolved Light or Dark appearance. |
| Humanist Standard | **Counterpoint — Open Forum** (`humanist-standard/open-forum`) | Lilac-grey neutrals, softened violet emphasis, and a desaturated community-spectrum data palette that broadens taste without becoming a sector costume. |
| Signal Instrument | **Signature — Calibrated Steel** (`signal-instrument/calibrated-steel`) | Cool steel-and-mist Light surfaces and low-glare blue-charcoal Dark surfaces, with disciplined cyan/blue-green emphasis: the clearest calibrated-instrument expression without generic monitoring blue. |
| Signal Instrument | **Restrained — Quiet Telemetry** (`signal-instrument/quiet-telemetry`) | Near-neutral graphite and aluminium relationships with quieter UI, semantic, and focus emphasis; chart-series colours inherit Calibrated Steel for the resolved Light or Dark appearance. |
| Signal Instrument | **Counterpoint — Amber Vector** (`signal-instrument/amber-vector`) | Warm-neutral metal surfaces with restrained amber/copper emphasis and a deliberately different analytic hue strategy that broadens preference without becoming alarm, emergency, or industrial costume. |

**Style grammar and palette are orthogonal preview/save axes.** A palette's source-style provenance never changes, but any product palette may be previewed and saved with any style. Switching style preserves the active namespaced palette ID so a reviewer can compare non-colour grammar with palette held constant. An explicit **Use [style] Signature** shortcut selects that style's native Signature; it is a deliberate palette change, never an implicit side effect of switching style.

**Inherited data-colour invariant:** each Restrained core profile aliases `--data-1` through `--data-6` to the corresponding Signature profile in the same resolved Light or Dark appearance. **Cool Archive** also aliases those six data tokens to **Brighter Vellum**, while retaining its own Counterpoint surface, UI-accent, semantic, focus, rule, and gridline paint. These decisions vary the shell treatment without creating a second chart mapping. The independent **Standard chart colors** mode remains unchanged and overrides profile data colours only for chart marks and matching legend swatches.

The nine core profiles plus **Prismatic Index**, **Chromatic Polarity**, **Luminance Ladder**, **Sunrise — Reference faithful**, **Lakeside — Reference faithful**, and **Monochrome Reserve** are approved, for 15 saveable profiles. The expansion does not create a fourth style, change a style grammar, or reopen an approved profile. Exact Light and Dark values are recorded in [PALETTE-CATALOG.md](PALETTE-CATALOG.md).

For each GraphPad family, **Reference faithful** and **Contrast tuned** deliberately share the same application, canvas, panel, UI-accent, semantic, focus, gridline, and chart-mark tokens. Only `--data-1` through `--data-6` differ, isolating the tested decision to preserve the reference series or raise direct mark-to-plot contrast. The user retained both Reference-faithful palettes and rejected both Contrast-tuned alternatives because the locally retuned variants did not earn a distinct portfolio position beside the accepted reference sequences. The Reference-faithful Light series reproduce the solid-fill colours from GraphPad's official examples exactly and always render at 100% opacity. Because several official colours do not independently reach `3:1` against the light plot surface, every reference-coloured mark receives the same neutral, high-contrast `--chart-mark` outline; fixed labels, legend order, shapes, dashes, and patterns remain the primary redundant associations. The accepted Dark adaptations and rejected Contrast-tuned sets are local, are not GraphPad-certified colourblind-safe palettes, and must not be represented as such.

**Monochrome Reserve** keeps every application, canvas, panel, rule, typography, control, focus, and semantic token achromatic. Under **Profile colors**, its six data-series tokens inherit **Prismatic Index** in the corresponding Light or Dark appearance so evidence remains distinguishable without tinting the surrounding interface. **Standard chart colors** still substitutes only the shared conventional chart series. Light, Dark, and System remain the same independent user-owned appearance axis for every approved palette, and Profile/Standard remains the same independent dashboard-owned chart-colour axis.

The currently rendered Evidence Ledger palette is retained as **Original baseline** (`evidence-ledger/original-baseline`) so the reviewer can identify whether a change actually improves the original concern. It may be previewed under any style grammar, but is always marked **REVIEW ONLY**: it is not a fourth product profile, never appears as a saveable dashboard setting, and always disables **Set as dashboard style**.

All profiles use the same DOM, geometry stylesheet, fixture, state machine, and appearance resolver. A profile switch may update only paint tokens such as background, surface, rule, accent, semantic, focus, and chart-series colour. It must preserve the active scene, selected target, draft, Unit Orbit disclosure, keyboard focus, both independent scroll positions, panel/plot geometry, and deterministic release state. No profile may change typography geometry, spacing, contour, elevation, icon anatomy, series order, or transition behaviour.

### Global Chart color mode contract

**Chart color mode** is an independent global axis across every dashboard style, colour profile, review scene, and Light/Dark/System appearance. It is not a fourth colour profile, a style variant, a chart-specific property, or a user appearance preference.

| Mode | Data-colour source | Cross-style behaviour |
|---|---|---|
| **Profile colors** | Uses the active namespaced palette's authored chart-data colours, regardless of which style grammar is active. | Data colours preserve the selected palette's source-style provenance while fixed series IDs, slot order, encodings, and accessible association remain unchanged. |
| **Standard chart colors** | Uses one shared, conventional, accessibility-conscious analytic palette. | The same data-role palette is used across Evidence Ledger, Humanist Standard, and Signal Instrument. Only appearance-driven contrast adaptation is allowed between curated Light and Dark; System resolves to one of those two adaptations. |

The mode may recolour chart data marks and their directly associated legend swatches: lines, bars, points, map data classes, and equivalent series marks. It never recolours application or canvas backgrounds, chart containers, rules, axes, gridlines, typography, controls, focus, selected/editing/Chrono treatments, loading/partial/error presentation, warning/success/error/destructive roles, or any other UI or semantic token. Series identity, legend order, mark shape/dash/pattern, values, scales, annotations, and hit targets remain fixed.

The four ownership axes are deliberately separate:

| Setting | Owner and persistence | What it controls |
|---|---|---|
| `dashboardStyle` | Dashboard-owned | Evidence Ledger, Humanist Standard, or Signal Instrument visual philosophy. |
| `dashboardColorProfile` | Dashboard-owned namespaced palette ID, independently combinable with any `dashboardStyle` | One of the twelve approved profiles at this checkpoint, or a future approved GraphPad/monochrome candidate. Restrained core profiles use their Signature data colours, Cool Archive uses Brighter Vellum data colours, and Profile colors otherwise uses the selected profile's declared data-colour rule. |
| `chartColorMode` | Dashboard-owned and persisted independently of style/palette | Profile colors or Standard chart colors for chart data marks and legend swatches only. |
| `appearancePreference` | User-owned | Light, Dark, or System resolution for the active style/palette and chosen chart-colour mode. |

Changing Chart color mode begins as a non-mutating preview and preserves the active scene, selected chart, draft, Unit Orbit disclosure, focus, both independent scroll positions, playback, deterministic release progress, and geometry. A separate explicit **Set chart colors** action saves only `chartColorMode`; **Set as dashboard style** continues to save only `dashboardStyle` plus the active namespaced `dashboardColorProfile`. Saving either axis must not reset or silently overwrite the other. If final product chrome later combines these into one settings surface, its labels and confirmation must still disclose both independent consequences.

**Original baseline** remains available for comparison, including both chart-color modes, but remains review-only for style saving. It is never accepted or persisted as a product `dashboardColorProfile`.

### May vary by style

| Visual family | Permitted variation | Binding guardrail |
|---|---|---|
| Application, canvas, and surfaces | Hue, temperature, luminance, subtle CSS gradient or texture. | Surface count, bounds, stacking, padding, and legibility stay fixed. |
| UI emphasis | Hue/value of zero or one non-status accent role. | Its declared semantic use stays fixed and cannot impersonate status or data. |
| Semantic colours | Exact success, warning, error, reconnect, blackout, and destructive hues. | Role names remain distinct; every meaning also has text, icon, shape, or programmatic state. |
| Chart-series palette | Series hues and luminance; restrained dash, marker, or pattern finish. | Series slot order, legend mapping, encodings, values, and hit targets stay fixed. UI and data tokens remain separate namespaces. |
| Surface contour | Radius grammar and painted edge character. | DOM rectangles and plot bounds do not change; layout-reserving border width is shared. Apparent weight uses outline, inset shadow, or paint-only pseudo-elements. |
| Elevation | Shadow softness, spread, opacity, and tonal elevation. | Stacking, reachability, and hit areas stay fixed. |
| Typography voice | Local/system font family, weight distribution, tracking, and numeral character. | Size, line height, allocated boxes, wrapping, clipping, and geometry stay fixed. A font is rejected if the digest or long-content ledger changes. |
| Perceived hierarchy | Weight, contrast, rule, divider, or tonal-band treatment. | Actual scale, baseline, line box, spacing, and information order stay fixed. |
| Controls and fields | Fill, contour, radius, elevation, separators, and fixed icon-container finish. | Anatomy, label, placement, padding box, dimensions, accessible name, and behaviour stay fixed. |
| Icons | Colour and limited outline/filled finish within the shared viewBox. | One generated SimEx glyph meaning and placement is used across styles; there are not three icon languages. |
| Chart finish | Gridline contrast/weight and line/bar/point finish inside the fixed plot host. | Plot geometry, axes/ticks, encodings, annotation, and legend order stay fixed. |
| Section headings | Colour, weight, decorative rule, or tonal band. | Heading box, baseline, rhythm, and spacing stay fixed. |
| Chart states | Outline, tint, shadow, pattern, and icon treatment for normal, hover, selected, editing, Chrono-member, loading, partial, and error. | State inventory, reserved status slot, copy, actions, geometry, and transition sequence stay fixed. Loading anatomy is identical across styles. |
| Focus | Colour and paint-only outline treatment. | Focus order, visibility, offset clearance, restoration, and keyboard operation stay fixed. |
| Motion voice | Short decorative duration/easing differences. | State timing, fake backend delays, playback, focus, and save order stay fixed; reduced motion removes decoration without losing meaning. |
| Light/Dark | Curated colour, elevation, and series values for each appearance. | Dark is not a mechanical inversion and cannot change structure, data, semantics, or interaction. |

### Rejection rules for contract drift

A candidate fails before aesthetic comparison if it changes any fixture, geometry, line allocation, control anatomy, icon metaphor, loading anatomy, state ordering, data encoding, breakpoint, or phone behaviour. A more attractive screenshot cannot compensate for a parity, state-truth, contrast, non-colour, keyboard, or long-content failure.

## Style preview, setting, and appearance

- Opening style controls starts a **non-mutating preview**. Preview is not a dashboard mutation and does not silently update Audience output.
- Preview preserves mode, selected chart, any chart/layout draft, Unit Orbit disclosure, fixture scroll, review-rail scroll, focus, playback, and fake Audience session state.
- Style preview contains two orthogonal paint choices: `dashboardStyle` selects grammar, while the namespaced `dashboardColorProfile` selects palette. Switching either remains non-mutating until explicitly set.
- Switching style preserves the current palette. Each style also exposes an explicit **Use [style] Signature** shortcut for a deliberate return to its source-owned Signature palette.
- **Set as dashboard style** is the only action that changes the fake saved `dashboardStyle` and namespaced `dashboardColorProfile` values. The currently previewed combination is saved together as one dashboard-owned visual choice, including cross-style combinations.
- Chart color preview is a parallel non-mutating choice. **Set chart colors** is the only action that changes the independently saved `chartColorMode`; it does not set, reset, or infer style/profile.
- **Original baseline** is comparison evidence only under every style grammar. The set action is always unavailable for it, and it is never written as `dashboardColorProfile`.
- In Step 4, any user can invoke **Set as dashboard style**. No user type receives different controls. Future restriction to a dashboard owner/profile is deferred rather than simulated.
- `appearancePreference` is a separate user preference from all three dashboard-owned values and offers **Light**, **Dark**, and **System**.
- System follows `prefers-color-scheme`; an explicit Light or Dark selection overrides it.
- Every style/palette combination targets curated Light and Dark appearances. Profile colors uses the selected palette's authored data colours; Standard chart colors uses its shared palette with appearance-only contrast adaptation. System resolves to one curated appearance and is neither a product colour profile, Chart color mode, nor an additional visual pack.
- A saved dashboard style is intended to govern chart surfaces in View, Build, Present preview, and Audience. Sketch 009 later applies the selected visual language to shared product chrome without changing geometry.

All prototype-only controls are in the wide vertical review rail outside the fixture. The rail and fixture each scroll independently, so inspecting or editing lower-page charts never requires the fixture to surrender width or geometry to a horizontal control deck. The rail is intentionally generous for the review screen and is not a proposal for product settings placement.

## Fixed representative analytical webpage

The comparison uses one stable ten-chart materialization grounded in `FIX-DASH-01 — simex-ui-v3/base-biomedical/r1`. Chart identity, section, order, data, grid footprint, axes, legends, synchronized date, and state assignments never change between styles, profiles, Chart color modes, appearances, or scenes.

### Section 1 — Outbreak dynamics

The existing approved six-chart grid remains intact as the first analytical section.

| Page order | Chart identity | Fixed stress purpose |
|---:|---|---|
| 1 | `bio_confirmed_cases` — `1×1` | Primary loaded trend and headline value. |
| 2 | `bio_r_values` — `1×1` | Threshold/reference-line treatment and compact status association. |
| 3 | `bio_municipality_choropleth_animation` — `2×2` | Tall map surface, annotation, and temporal membership. |
| 4 | `bio_region_comparison` — `1×1` | Ranked values and a dense compact comparison. |
| 5 | `bio_vaccination_rate` — `2×1` | Long title and dense multi-series legend stress case. |
| 6 | `bio_hospital_load` — `2×1` | Dense table, capacity signals, and retained-output error treatment. |

### Section 2 — Transmission and response patterns

The second fixed chart section expands visualization coverage without changing the first grid.

| Page order | Chart identity and type | Fixed stress purpose |
|---:|---|---|
| 7 | `bio_daily_new_cases_deaths` — **Daily new cases and deaths**, mixed columns/line | Mark-type distinction, dual-measure association, temporal density, and compact legend clarity. |
| 8 | `bio_mortality_age_group` — **Mortality by age group**, donut/composition | Compact part-to-whole marks, centre annotation, age-band labels, and legend association. |
| 9 | `bio_icu_hospital_capacity` — **ICU and hospital capacity**, bullet collection | Repeated quantitative tracks, targets/capacity thresholds, compact labels, and status-versus-data separation. |
| 10 | `bio_new_icu_hospital_admissions` — **New ICU and hospital admissions**, grouped temporal bars | Closely spaced temporal categories, paired-series comparison, axis rhythm, and dense legend association. |

The ten-chart fixture retains the approved four-track dashboard and chart-owned footprint geometry from Sketch 002. The second section has its own fixed footprints in the prototype ledger. No candidate may tune content, data density, section order, or panel size to favour its aesthetic.

### Section 3 — Supporting context and trust

After the chart sections, one fixed supporting-content section contains:

- a management and data-quality notice with a visible severity label and plain-language implication;
- an **About this dashboard** narrative that explains the exercise context and intended management-review use;
- a keyboard-operable **Definitions and methodology** disclosure with representative long definitions and method notes;
- data sources and freshness metadata, including source names, last-updated information, and limitations;
- dashboard owner and contact details;
- related-resource links with long descriptive labels; and
- an outlined **Feedback & support** button that opens a menu with **Report a bug** and **Request a feature**. The fixed interaction includes hover, keyboard focus, open state, Escape close with focus restoration, outside-click close, item activation, and deterministic confirmation feedback.

The page ends with a non-sticky footer in ordinary document flow. Its fixed contents are copyright/version, Documentation, Accessibility, Data sources, Privacy, a session-only/prototype note, and Back to top. It must not cover content or remain pinned while the page scrolls.

### Coverage purpose

| Coverage family | Representative evidence |
|---|---|
| Chart grammar | Ten charts cover time series, threshold/reference, geographic, ranked, multi-series, tabular, mixed column/line, part-to-whole, bullet/target, and grouped temporal-bar reading. |
| Dense analytical rhythm | Two chart sections test repeated headings, long page scanning, varied legend density, and consistent gutters without changing candidate structure. |
| Trust and provenance | Notice, methodology, sources/freshness, owner/contact, and session note test status-versus-data colour separation and evidence hierarchy. |
| Reading surfaces | Narrative, definitions, metadata, and related resources test body typography, link affordance, wrapping, and vertical rhythm beyond charts. |
| Interactive support | Disclosure and Feedback & support menu test outlined controls, hover/focus/open states, Escape/outside dismissal, focus restoration, and confirmation. |
| Document ending | Non-sticky footer tests low-emphasis navigation, version/provenance copy, privacy/accessibility links, and Back to top without deciding final shell ownership. |

### Fixed long-content ledger

Long-content stress is no longer confined to chart titles and legends. The identical fixture also retains a multi-sentence management/data-quality notice, a substantive About paragraph, long definition and methodology entries, full source/freshness labels, owner name and contact address, descriptive related-resource links, version/copyright copy, and the session-only footer note. The disclosure and Feedback & support confirmation remain readable when open. Every candidate uses the same strings, line allocations, wrapping policy, reading order, and link/menu labels; no style may abbreviate content, shrink type, widen a block, or hide information to pass. Review includes the common 200-percent text condition and narrow supported viewport after a style is selected.

## Five deterministic comparison scenes

| Scene | Fixed state | Visual states exposed |
|---:|---|---|
| 1 — Ordinary View | All ten charts and all supporting-content regions loaded in canonical section/order and geometry; current page/time unchanged. | Normal, hover, keyboard focus, varied chart grammar, controls, long title, dense legend, prose, notice, disclosure, links, menu, and footer. |
| 2 — Selected Build | `bio_region_comparison` selected without mutation or draft. | Selected versus hover/focus, Build context, enabled/disabled/read-only control truth. |
| 3 — Editing Build | `bio_vaccination_rate` is the selected target; approved Unit Orbit is open with one visible chart-property draft. | Editing, selected target, dirty/saved/cancelled treatment, fields, tabs, menus, buttons, focus, validation slot. |
| 4 — Default Chrono | The fixed Time Group includes `bio_r_values`, `bio_municipality_choropleth_animation`, and `bio_vaccination_rate`; the other seven page charts and supporting content stay visible. | Chrono-member treatment, active time, playback state, member/non-member distinction without colour alone. |
| 5 — Resilience | `bio_confirmed_cases` remains loading for inspection; `bio_vaccination_rate` is partial with an explicit refresh action; `bio_hospital_load` retains its last identifiable output under a deterministic source error; the other seven remain loaded and supporting content is unchanged. | Loading, partial-data, error, retained geometry, recovery action, unaffected data, and simultaneous semantic-role separation. |

Every style receives these exact scenes and transitions. Candidate-specific substitutions, state omissions, random values, alternate chart order, or different error severity are invalid comparison evidence.

## Exact exercise task

The style-grammar review began at `1440×900` and is complete: Evidence Ledger, Humanist Standard, and Signal Instrument are approved. The first utility-palette round is also approved. The current round is limited to the five GraphPad/monochrome candidates and does not reopen the approved structure, aesthetic philosophies, or twelve retained palettes.

For each style:

1. Start in Light with the saved dashboard style unchanged and open a non-mutating preview of the candidate.
2. In Ordinary View, inspect all ten charts at rest across both analytical sections; hover and keyboard-focus the same fixed targets; read the long vaccination title and dense legends; compare mixed, composition, bullet, and grouped-bar grammar; confirm controls, chart data, and geometry do not move.
3. Continue down the unchanged document flow. Inspect the management/data-quality notice, About narrative, Definitions and methodology disclosure, source/freshness metadata, owner/contact, related resources, and non-sticky footer. Confirm the style sustains hierarchy and reading rhythm beyond chart containers.
4. Operate the disclosure and outlined **Feedback & support** button/menu by pointer and keyboard. Exercise Report a bug and Request a feature confirmations, Escape close with focus restoration, outside-click close, links, and Back to top.
5. Enter Selected Build and then Editing Build. Inspect selection versus editing, open common and Advanced Unit Orbit content, change the deterministic visible property, exercise validation, Preview, Save, and Cancel, and verify state identity without relying on colour.
6. Enter Default Chrono. Distinguish group members from the other seven page charts, inspect the active time/playback treatment, and toggle the availability/member treatment using the same state transition for every style.
7. Enter Resilience. Inspect the retained loading state, refresh partial data, invoke the deterministic error recovery, and verify all ten charts and supporting regions retain their bounds while semantic roles remain distinct.
8. Switch to the style's Dark appearance without resetting the current scene, target, disclosure/menu state, draft, scroll, or focus. Repeat the long-content, series, focus, selection/editing, Chrono, and simultaneous-state checks.
9. Select System, switch the prototype's simulated machine preference between Light and Dark, and confirm it chooses the same two curated appearances without a geometry or state reset.
10. Exercise keyboard-only operation, visible focus, greyscale/non-colour cues, 200-percent text robustness across charts and supporting content, and reduced motion.
11. Scroll the fixture and the wide review rail separately. Neither scroll may move or reset the other, and the review rail must never enter the fixture geometry ledger or cover the product fixture.
12. Compare the geometry digest before and after every appearance/style/palette switch. Any canvas, grid, section, panel, plot, supporting-content block, footer, stable line-count, or fixture-overflow delta fails the candidate; review-rail width is explicitly excluded because it is not product chrome.
13. Leave preview without setting it and confirm the prior saved style/palette pair is restored. Reopen preview, choose **Set as dashboard style**, and confirm only that explicit action updates the fake saved style plus namespaced palette while Chart color mode and appearance remain intact.
14. Record approval, requested refinement, or rejection for the style before proceeding. All three style grammars passed this exercise and are now portfolio winners.

The three approved styles were compared using the same normal, selected/editing, and resilience scenes with palettes held constant, preserving exact geometry and exposing materially different non-colour grammar. Responsive winner verification remains required at the applicable supported viewports. Every approved palette reuses the same fixture and gates without reopening this style decision.

### Approved portfolio-level utility trio

The user exercised and approved **all three** utility-led candidates in the complete dashboard: **Prismatic Index**, **Chromatic Polarity**, and **Luminance Ladder**. They share the portfolio-level source group **Utility studies**: this is palette provenance, not a fourth style. Each approved profile is portable across Evidence Ledger, Humanist Standard, and Signal Instrument, and style switching continues to preserve the active palette so colour and non-colour grammar can be compared independently.

The round reuses one HTML structure, the fixed ten-chart fixture, exact chart order and data, shared geometry, five deterministic scenes, supporting page content, Unit Orbit, interactions, keyboard order, state transitions, fake persistence, and geometry digest. Candidate selection may change palette paint tokens only. Every candidate provides curated Light and Dark values plus System resolution to those same appearances. **Profile colors** uses the candidate's chart-series strategy; **Standard chart colors** remains an independent dashboard setting and provides the existing shared conventional series palette without changing the candidate's shell, UI, semantic, or focus paint. Preview remains non-mutating until **Set as dashboard style** explicitly saves the current approved style plus the candidate's namespaced palette identity.

| Candidate | Exact philosophy | Utility-led hypothesis | Falsifier / rejection reason |
|---|---|---|---|
| **Prismatic Index** | **Colour as index · six-way categorical separation · quiet neutral shell.** A quiet graphite shell gives six equally salient, deliberately eclectic hues room to separate dense categories. | A maximin categorical strategy should maximize perceptual separation between the fixed six series slots, improving dense legends and adjacent-mark identification without assigning order or status meaning. | Reject or revise if it feels festive or indiscriminately loud, competes with semantic states, creates semantic ambiguity, or leaves unacceptable colour-vision-deficiency-compressed pairs despite the fixed redundant labels, shapes, patterns, and ordering. |
| **Chromatic Polarity** | **One chromatic identity · two luminous poles.** Solarized-inspired but WCAG-recalibrated, rose-limestone/mineral Light and petrol/aubergine Dark preserve the six slot hue identities. | Stable hue identity across two deliberately authored luminance environments should improve low-glare Light/Dark continuity and reduce the relearning caused by mechanical inversion. | Reject or revise if it reads as a code editor, resembles Evidence Ledger's paper/mineral character, resembles Signal Instrument's technical low-glare surfaces, loses slot identity across appearances, or weakens contrast. |
| **Luminance Ladder** | **Hue for recognition · luminance for resilience · legible when colour fades.** The categorical slots use a deliberately permuted luminance order of `2 < 4 < 6 < 1 < 5 < 3` in both appearances rather than a simple ordered ramp. | Redundant hue-and-luminance separation should improve projection, grayscale reproduction, distance viewing, and use with reduced hue perception while retaining categorical rather than sequential intent. | Reject or revise if brightness implies false magnitude or grouping, the green slot is read as success despite the fixed non-colour cues, pair separation fails at realistic density, or the Light/Dark adaptations cease to feel like one profile. |

The approved trio used this exact comparison task:

1. Apply the candidate to Evidence Ledger in Light and inspect Ordinary View across all ten charts, with particular attention to the long title, dense legends, adjacent lines/bars, choropleth classes, small marks, semantic notice, links, focus, and selected chart.
2. Keep the candidate fixed while switching Evidence Ledger → Humanist Standard → Signal Instrument. Confirm only the approved non-colour grammar changes and the candidate remains identifiable without making the three styles converge.
3. Exercise Selected Build and Editing Build with Unit Orbit, then Default Chrono and Resilience. Verify selected, editing, Chrono-member, loading, partial-data, and error meanings remain identifiable through their fixed labels, icons, rules, patterns, and geometry rather than candidate hue alone.
4. Compare **Profile colors** with **Standard chart colors** in the same scene. Confirm only chart marks and corresponding legend swatches change, and decide whether the candidate's specific data-colour utility adds value beyond its shell/UI treatment.
5. Repeat in Dark and System, including both simulated machine preferences, without resetting style, palette, scene, target, draft, focus, scroll, release state, or geometry. For Chromatic Polarity, explicitly track each of the six series slots across the two luminous poles.
6. Inspect Prismatic Index for pair separation and semantic competition, Chromatic Polarity for cross-appearance identity and code-editor/style resemblance, and Luminance Ladder in colour, grayscale, and distance/projection-like viewing for false order or grouping.
7. Compare the geometry digest after every style, palette, appearance, scene, and Chart color mode switch. Any candidate-attributable movement, overflow, state reset, chart remapping, or focus loss fails the candidate.
8. Leave preview without setting and confirm the prior saved style/palette pair returns. Set each profile only through the explicit fake-session action and confirm that no preview silently changes the saved style/palette pair.

The comparison criteria were attributable to the profiles' declared utility: categorical pair separation and semantic isolation for Prismatic Index; recognisable series identity, authored contrast, and low-glare continuity across Light/Dark for Chromatic Polarity; and projection, grayscale, distance, and reduced-hue resilience without false magnitude for Luminance Ladder. The user approved all three for the portfolio after the common contrast, long-content, focus, non-colour-state, UI/data/semantic separation, persistence, and zero-geometry-delta exercise.

### GraphPad and monochrome expansion — accepted synthesis

The user examined both previously proposed GraphPad adaptation paths—**Option 1: Reference faithful** and **Option 3: Contrast tuned**—rather than selecting between them abstractly. Sunrise and Lakeside therefore each remain twice in the disposable sketch. Within a family the two options share one UI/surface environment so feedback is attributable only to the chart-series treatment. **Monochrome Reserve** is the fifth candidate and tests whether a rigorously achromatic shell makes the approved Prismatic Index series more legible and intentional.

| Candidate | Series treatment | Utility-led hypothesis | Status and falsifier |
|---|---|---|---|
| **Sunrise — Reference faithful** | Light uses GraphPad's official solid-fill Sunrise series exactly: `#FB8809`, `#D84420`, `#690001`, `#7F32BD`, `#5770FF`, `#87BEFF`. Dark is a local hue-preserving, raised-luminance adaptation. All marks are fully opaque and use the family's neutral chart-mark outline. | Preserving the recognisable warm-to-cool reference sequence may provide an established colourblind-conscious mapping and strong categorical character without globally retuning it. | **Approved.** The reference sequence earns a portable portfolio position with its neutral mark boundary and redundant associations retained. |
| **Sunrise — Contrast tuned** | Uses the same Sunrise surfaces/UI as Reference faithful, but locally retunes the six Light and Dark series for at least `3:1` direct mark-to-plot contrast. | Direct contrast may improve small marks, projection, and dense legends while retaining enough of Sunrise's sequence identity to remain useful. | **Rejected; preserved.** After direct comparison it did not earn a distinct portfolio role beside the accepted reference sequence; its local divergence from that reference was not selected as a separate palette. |
| **Lakeside — Reference faithful** | Light uses GraphPad's official solid-fill Lakeside series exactly: `#2650CC`, `#3D89DE`, `#65C8E3`, `#81CE6D`, `#5F7B49`, `#29331A`. Dark is a local hue-preserving, raised-luminance adaptation. All marks are fully opaque and use the family's neutral chart-mark outline. | The blue-to-green reference cadence may support calm analytical reading and ordered legend scanning while retaining categorical identity. | **Approved.** The reference cadence earns a portable portfolio position with its neutral mark boundary and redundant associations retained. |
| **Lakeside — Contrast tuned** | Uses the same Lakeside surfaces/UI as Reference faithful, but locally retunes the six Light and Dark series for at least `3:1` direct mark-to-plot contrast. | A contrast-raised blue/green cadence may improve small-mark and projection resilience without losing the family's cool-to-living-green rhythm. | **Rejected; preserved.** After direct comparison it did not earn a distinct portfolio role beside the accepted reference cadence; its local divergence from that reference was not selected as a separate palette. |
| **Monochrome Reserve** | Every non-series token is achromatic; Profile colors aliases the approved Prismatic Index Light/Dark series, while Standard chart colors remains available independently. | Reserving chroma exclusively for evidence may reduce UI/data competition, strengthen state-by-form discipline, and make dense categorical marks feel deliberate. | **Approved.** Its achromatic interface creates a distinct utility position while retaining Prismatic Index for evidence. |

All five candidates use the same three approved style grammars, fixed ten-chart fixture, chart order and data, five deterministic scenes, supporting content, Unit Orbit, interactions, keyboard order, state transitions, geometry digest, and fake persistence. Each has curated Light and Dark tokens, and System resolves to those same two appearances. Profile/Standard chart colour remains independent of palette; applying Standard changes only chart marks and matching legend swatches. Preview is non-mutating until the explicit **Set as dashboard style** action.

The GraphPad naming is recorded transparently: GraphPad's current colourblind-safe FAQ calls the warm palette **Sunrise**, while the Prism 9.5 release notes call the corresponding redesigned palette **Sunset**. This sketch uses the user's requested and current FAQ name, **Sunrise**. The exact Reference-faithful Light values were sampled from matching first-party solid-fill examples because GraphPad does not publish numeric values in the page text. SimEx's UI/surface tokens, neutral outlines, Dark adaptations, and Contrast-tuned series are local prototype work; no GraphPad certification is claimed for them.

The user exercised this exact task for the five-candidate round:

1. Begin with Sunrise — Reference faithful in Signal Instrument, Light, Ordinary View, Profile colors, and compare all ten charts, dense legends, the map, small marks, long titles, and semantic states.
2. Switch only to Sunrise — Contrast tuned. Confirm the shell/UI is pixel-identical, then compare reference recognition, direct mark contrast, outline visibility, pair distinction, and semantic competition.
3. Repeat that paired comparison for Lakeside. Check whether either option implies false order or environmental subject matter and whether neighbouring blues/greens remain separable.
4. Exercise each GraphPad option in Dark and System, then across Evidence Ledger, Humanist Standard, and Signal Instrument and all five scenes. Confirm local Dark/tuned adaptations are visibly disclosed and never presented as official GraphPad palettes.
5. Apply Monochrome Reserve in Light, Dark, and System. Confirm the shell and semantic treatments are genuinely achromatic, Profile colors match Prismatic Index's corresponding series, and non-colour state cues remain efficient.
6. Toggle Profile colors ↔ Standard chart colors for every candidate. Only data marks and corresponding legend swatches may change; style, appearance, scene, focus, scroll, draft, geometry, and saved settings remain intact.
7. Leave preview and verify the saved style/palette pair returns. Use the explicit set action only when intentionally testing fake-session persistence. Record an approval, refinement, or rejection reason for all five before closing Sketch 003.

The resulting synthesis retains **Sunrise — Reference faithful**, **Lakeside — Reference faithful**, and **Monochrome Reserve**. Both Contrast-tuned alternatives are rejected and excluded from the saveable portfolio because neither earned a distinct position beside its accepted reference family; they remain available only as preserved comparison evidence.

Three colour concepts are deliberately deferred because their meaning belongs to a chart's data semantics rather than to a global dashboard paint profile:

- **Cyclic palettes** apply only to genuinely periodic variables such as direction, phase, or time-of-year, where both ends of the scale meet.
- **Sequential palettes, including Cubehelix**, apply only to ordered magnitude and must not globally recolour unordered categorical series.
- **Value-suppressing uncertainty palettes (VSUP)** apply only when the visualization explicitly encodes both value and uncertainty and has the corresponding legend semantics.

These may be specified later as chart-level palette families. They are not candidates in this portfolio round, and their deferral does not limit the approved global palette portfolio.

### Evidence Ledger palette-refinement exercise and accepted result

The first Evidence Ledger rendering established the structural and state baseline, but user review found that its application/canvas background felt too dark and made the overall palette feel more saturated. The refinement therefore tests whether lifting the background values resolves that perception while also providing deliberate alternatives for different aesthetic preferences.

Use the same `1440×900` fixture and this exact sequence:

1. Begin with **Original baseline** in Ordinary View. Note the perceived weight of the application background, canvas, chart surfaces, dividers, and chart-series colours.
2. Switch to **Signature — Brighter Vellum**, **Restrained — Ash Register**, and **Counterpoint — Cool Archive** without changing scene or viewport. Compare the same ten charts, both analytical sections, long title, dense legends, map, table, mixed chart, donut, bullet collection, grouped bars, supporting content, selection accent, and semantic roles.
3. Pin the same hover and keyboard-focus proof, then enter Selected Build and Editing Build. Keep the selected chart and open Unit Orbit while switching profiles; confirm that selection, focus, dirty state, disclosure, and control hierarchy remain clear and stationary.
4. Enter Default Chrono and toggle its availability overlay in each profile. Confirm member/non-member distinction and UI-versus-series colour separation without relying on hue alone.
5. Enter Resilience and compare simultaneous loading, partial-data, and error states in each profile. Exercise deterministic refresh and retry; profile switches must not restart or skip either release.
6. For every product profile, inspect curated Light and Dark, then System with both simulated machine preferences. The active profile, scene, focus, draft, scroll, and geometry must survive every appearance change.
7. Return to **Original baseline** and verify that **Set as dashboard style** cannot save it. Choose a product profile, set it, and verify that the saved pair is `dashboardStyle = Evidence Ledger` plus the chosen `dashboardColorProfile`, while `appearancePreference` remains unchanged.
8. Preview another palette and leave without setting it. Confirm the saved style/namespaced-palette pair returns without resetting the working state.
9. Compare the geometry/state ledger after every profile and appearance switch. Candidate-attributable movement, wrapping, overflow, focus loss, state reset, or chart remapping is a contract failure.

### Palette hypotheses and decision criteria

| Candidate | Hypothesis | Most important comparison |
|---|---|---|
| **Original baseline** — review only | Preserves the evidence that prompted refinement and prevents a merely different palette from being mistaken for an improvement. | Is the background-value problem visibly resolved by a product candidate, rather than merely renamed? |
| **Signature — Brighter Vellum** | A materially brighter paper/canvas hierarchy will reduce perceived saturation while retaining the strongest Evidence Ledger identity. | Does it remain authoritative, tactile, and mineral without feeling dim, yellowed, or heavy? |
| **Restrained — Ash Register** | Near-white limestone surfaces and quieter UI/semantic/focus paint will serve users who prefer minimal stylization without collapsing into an unstyled default dashboard; chart-series colours remain those of Signature. | Is it quieter than Signature while still recognizably Evidence Ledger and while preserving the identical Signature series mapping across ten charts? |
| **Counterpoint — Cool Archive** | A cool archival shell/UI strategy can broaden taste coverage without becoming generic government navy, clinical teal, or a preview of Signal Instrument, while inheriting Brighter Vellum's data series. | Is it a genuinely different interface-colour approach that retains editorial flatness, fine-rule hierarchy, evidence-first character, and stable chart identity? |

The palette round succeeds only if:

- at least one product profile clearly resolves the dark-background concern in Light appearance;
- all three product profiles remain distinguishable by intentional hue/value strategy, not tiny token shifts;
- Signature is the clearest expression of Evidence Ledger, Restrained is credibly lower in stylization intensity, and Counterpoint broadens hue preference without becoming a fourth design philosophy;
- normal, hover, focus, selected, editing, Chrono-member, loading, partial, error, semantic status, and all fixed chart-series roles remain legible in colour and through their non-colour cues;
- long titles, dense legends, map regions, table values, and Light/Dark contrast remain usable;
- UI accents, semantic statuses, and chart-series colours remain separate systems;
- profile/appearance switches preserve scene, draft, focus, scroll, release progress, DOM, geometry, and chart meaning; and
- only an explicit set action persists a product profile, while appearance remains a separate user preference.

A candidate is rejected or revised if the perceived saturation problem remains; the brighter background washes out chart or focus contrast; Restrained becomes visually anonymous or loses series association; Counterpoint reads as sector costume, generic blue analytics, Humanist Standard, or Signal Instrument; Dark is a mechanical inversion; any profile relies on colour alone for state; any switch changes geometry or working state; or Original baseline can be saved.

**Accepted result:** the user exercised and approved Evidence Ledger / Style 1. **Signature — Brighter Vellum**, **Restrained — Ash Register**, and **Counterpoint — Cool Archive** are all retained as product palettes; **Original baseline** remains review-only. The lighter application/canvas hierarchy resolved the original background-weight concern without sacrificing the style's authoritative evidence-first, flat, rule-led grammar. Cool Archive keeps its distinct cool archival shell/UI but now inherits Brighter Vellum's chart series. Evidence Ledger therefore earns the formal, inspectable portfolio position rather than reading as a generic dashboard or a printed report pasted into the browser. The independent **Profile colors / Standard chart colors** axis is retained.

### Humanist Standard first-round and accepted result

The user approved this design contract, the palette-interoperability correction, and the rendered Humanist Standard result. The browser exercise used the identical ten-chart fixture and all five scenes:

1. Start with **Humanist Standard + Signature — Common Ground** in Light. Inspect Ordinary View, Selected Build, Editing Build with Unit Orbit, Default Chrono, and Resilience without changing fixture structure, chart order, state transitions, or data.
2. Repeat the five scenes with **Restrained — Quiet Commons** and **Counterpoint — Open Forum**. Compare chart containers, controls, section rhythm, supporting content, footer, hover/focus, selected/editing, Chrono-member, loading, partial-data, and error treatment.
3. For every Humanist palette, exercise Light, Dark, and System with both simulated machine preferences. Confirm the warm matte philosophy remains authored in both appearances and does not collapse into pastel wellness branding or generic purple-black Dark.
4. Toggle **Profile colors** and **Standard chart colors** in each scene and appearance. Only data marks and their legend swatches may change; style grammar, palette UI/semantic paint, focus, and geometry remain fixed.
5. Apply all three Evidence Ledger product palettes to Humanist Standard. Then apply all three Humanist Standard palettes to Evidence Ledger. Status and saved-value summaries must identify both the active style grammar and the palette's source/name so cross-style combinations are never ambiguous.
6. Hold one palette constant while switching Evidence Ledger ↔ Humanist Standard. The palette must remain selected, while non-colour grammar changes visibly through surface model, contour/elevation, typographic voice, affordance finish, and motion character. Repeat in greyscale and Dark; resemblance is a rejection reason.
7. Use **Use Humanist Signature** and **Use Evidence Ledger Signature** and confirm each explicitly changes only the palette. Neither shortcut may change style, Chart color mode, appearance, scene, focus, or working state.
8. Open a dirty Unit Orbit draft, pin keyboard focus, and scroll deep into the fixture. Switch style, palette, appearance, and Chart color mode in turn; the target, draft, focus, fixture scroll, review-rail scroll, release progress, and geometry must survive.
9. Scroll the wide review rail to its end while leaving the fixture stationary, then scroll the fixture while leaving the rail stationary. The rail must remain outside and never cover or resize the product fixture.
10. Preview a cross-style combination and leave without setting it; the prior saved style/palette pair must return. Reopen and **Set as dashboard style**; confirm it saves the active style plus namespaced palette ID and does not overwrite `chartColorMode` or `appearancePreference`. Original baseline may be previewed with Humanist Standard, but the set action must remain unavailable.

Humanist Standard succeeds only if it feels approachable and institutionally credible without becoming neumorphic, pastel, wellness-coded, generic SaaS, or a medical/education/NGO costume; if Common Ground, Quiet Commons, and Open Forum occupy useful palette roles; and if the same-palette switch remains unmistakably different from Evidence Ledger in colour and greyscale. It is rejected or substantially revised if soft surfaces weaken chart/state clarity, rounding becomes decorative excess, elevation becomes neumorphism, the humanist voice becomes consumer lifestyle branding, any palette is a sector stereotype, or its non-colour grammar converges with Evidence Ledger.

**Accepted result:** the user exercised and approved Humanist Standard / Style 2 with **Signature — Common Ground**, **Restrained — Quiet Commons**, and **Counterpoint — Open Forum** all retained. Its matte layered surfaces, restrained rounding, shallow diffuse elevation, and humanist sans voice make dense institutional analysis feel approachable without weakening chart hierarchy or state truth. The three palettes cover characteristic, lower-stylization, and alternate-hue preferences without becoming medical, education, NGO, or community costumes. Applying Evidence Ledger palettes to Humanist Standard—and Humanist palettes to Evidence Ledger—preserved explicit palette provenance while the same-palette switch still exposed materially different non-colour grammar. The wide independent review rail kept prototype controls outside the fixed product fixture and allowed rail and dashboard content to scroll without resizing or covering one another.

The anticipated rejection risks did not materialize in the accepted browser exercise: surface edge contrast and explicit labels/icons kept chart and state boundaries clear; rounding remained restrained rather than decorative; one-sided shallow shadows avoided neumorphic inset/double-light effects; the typography and palettes did not read as pastel wellness, consumer lifestyle, generic premium SaaS, or sector branding; curated Dark retained deep green-grey warmth rather than generic purple-black; and style/palette/appearance/chart-colour switches preserved geometry and working state. Humanist Standard therefore earns the portfolio's approachable institutional position rather than duplicating Evidence Ledger's publication-like authority or Signal Instrument's status-first technical precision.

### Signal Instrument review exercise and accepted result

The user approved Signal Instrument's rendered result after exercising the identical ten-chart fixture, wide independent review rail, and all five scenes. The recorded exercise was:

1. Start with **Signal Instrument + Signature — Calibrated Steel** in Light. Inspect Ordinary View, Selected Build, Editing Build with Unit Orbit, Default Chrono, and Resilience without changing fixture structure, chart order, state transitions, or data.
2. Repeat the five scenes with **Restrained — Quiet Telemetry** and **Counterpoint — Amber Vector**. Compare crisp contour, fine-rule, low-glare surface, tabular-numeral, technical-affordance, focus, freshness/provenance, and semantic-state treatment across charts and the full representative page.
3. For every Signal Instrument palette, exercise Light, Dark, and System with both simulated machine preferences. Confirm Dark feels like an authored low-glare instrument and Light like a deliberate steel-and-white precision workbench; neither may be a mechanical inversion, neon console, or generic blue dashboard.
4. Toggle **Profile colors** and **Standard chart colors** in every scene and appearance. Only data marks and matching legend swatches may change; technical rules, state signals, UI paint, focus, and geometry remain fixed.
5. Apply all Evidence Ledger and Humanist Standard product palettes to Signal Instrument, then apply all Signal Instrument product palettes to both approved styles. Every status and saved-value summary must name the active style grammar and palette source/name so cross-style combinations remain explicit.
6. Hold one palette constant while switching Evidence Ledger ↔ Humanist Standard ↔ Signal Instrument. Signal Instrument must remain distinct through crisp compact contours, calibrated low-glare layering, tabular numeral voice, technical rules, affordance finish, and terse motion—not hue alone. Repeat in greyscale and Dark.
7. Exercise each **Use [style] Signature** shortcut. Each shortcut changes only the palette; it must preserve style, Chart color mode, appearance, scene, focus, scroll, draft, and release progress.
8. Open a dirty Unit Orbit draft, pin keyboard focus, and scroll deep into the fixture. Switch style, palette, appearance, and Chart color mode in turn; the target, draft, focus, fixture scroll, review-rail scroll, geometry, and deterministic state releases must survive.
9. Scroll the review rail and fixture independently to both extremes. Neither may cover, resize, move, or reset the other; the rail remains prototype instrumentation rather than Signal Instrument product chrome.
10. Preview a cross-style combination and leave without setting it; the prior saved style/palette pair must return. Reopen and use **Set as dashboard style**; confirm it saves only the active style plus namespaced palette and does not overwrite `chartColorMode` or `appearancePreference`. Original baseline remains unsaveable.
11. Compare Signal Instrument directly with both approved styles on an ordinary chart, a selected/editing chart, and simultaneous loading/partial/error states in colour and greyscale. Reject any operational costume, alarm saturation, decorative telemetry, or state treatment that competes with the underlying evidence.

#### Signal Instrument palette hypotheses and accepted result

| Candidate | Hypothesis | Most important comparison |
|---|---|---|
| **Signature — Calibrated Steel** | Cool steel/mist Light surfaces and low-glare blue-charcoal Dark surfaces can express disciplined operational calibration without becoming the generic blue monitoring default. | Is this unmistakably the native Signal Instrument palette in both appearances while keeping state, UI emphasis, and chart-series colour separate? |
| **Restrained — Quiet Telemetry** | Near-neutral graphite/aluminium relationships and quieter UI/semantic/focus paint can offer technical precision with lower stylization intensity without collapsing into an unthemed enterprise dashboard or developer console; chart-series colours remain those of Signature. | Is it materially quieter than Signature while retaining legible technical hierarchy, focus, freshness, provenance, and the identical Calibrated Steel series mapping? |
| **Counterpoint — Amber Vector** | Restrained amber/copper emphasis can broaden the portfolio's hue preference while preserving measured instrument discipline. | Does it feel like an alternate analytic colour strategy rather than warning saturation, industrial decoration, or emergency-response costume? |

The palette round succeeds only if Calibrated Steel is the clearest native expression, Quiet Telemetry is a credible lower-stylization option, and Amber Vector is a genuinely different but non-alarm hue strategy; each works in authored Light/Dark/System appearances; UI accent, semantic state, and chart-data namespaces remain visibly separate; and cross-style palette use preserves both provenance and non-colour style identity. It fails if the candidates are tiny token shifts, if blue/cyan becomes generic monitoring shorthand, if graphite becomes all-mono developer tooling, if amber/copper impersonates warning or incident severity, or if any palette requires HUD brackets, glow, scanning effects, emergency red/green, or sector costume to communicate its philosophy.

Signal Instrument succeeds only if status and freshness become faster to parse while the dashboard remains calm, credible, and equally accessible; its technical character is visible without labels or a palette advantage; Calibrated Steel, Quiet Telemetry, and Amber Vector occupy useful source-owned roles; and it remains distinct from both approved styles with a palette held constant. It is rejected or substantially revised if it becomes a command-centre HUD, military/emergency/cyberpunk costume, developer console, generic blue/dark monitoring dashboard, alarm-heavy, mechanically dense, colour-dependent, or merely Evidence Ledger with sharper corners. HUD brackets, scanning effects, glow, all-monospace typography, and emergency red/green signalling are explicit rejection evidence. Any geometry, content, chart meaning, state, focus, scroll, persistence, or interaction change also fails the candidate.

**Accepted result:** the user exercised and approved Signal Instrument / Style 3 with **Signature — Calibrated Steel**, **Restrained — Quiet Telemetry**, and **Counterpoint — Amber Vector** retained as core profiles. Its crisp compact contours, calibrated low-glare layering, tabular numeric voice, technical rules, explicit state finish, and terse motion earned the portfolio's operational-confidence position without becoming a HUD, command centre, developer console, or emergency costume. Holding palettes constant across styles preserved zero geometry delta while leaving Signal Instrument materially distinct from Evidence Ledger and Humanist Standard.

### Chart color mode exercise and falsifiers

Use this same sequence for Evidence Ledger now and repeat it unchanged for Humanist Standard and Signal Instrument:

1. In Ordinary View, select each product colour profile in turn and toggle **Profile colors** and **Standard chart colors**. Confirm that only data marks and their matching legend swatches change; chart containers, application/canvas paint, typography, controls, focus, and semantic tokens stay visually identical.
2. Compare all ten fixed charts, including multi-series lines, compact bars, map classes, dense legends, table-associated swatches, mixed columns/line, donut composition, bullet tracks, and grouped temporal bars. Check that the conventional Standard palette preserves clear series association without adopting the active namespaced palette's authored hue strategy.
3. Pin hover and keyboard focus, then enter Selected Build and Editing Build with Unit Orbit open and a dirty chart draft. Toggle Chart color mode and confirm target, draft, disclosure, focus, scroll, editor placement, and chart geometry remain unchanged.
4. Enter Default Chrono and toggle the availability overlay. Confirm that member, availability, play-state, and time-status treatments do not change with the data palette.
5. Enter Resilience and exercise loading, partial-data refresh, and error retry. Confirm warning/error/recovery colours remain semantic tokens, unaffected by Chart color mode, and deterministic releases neither restart nor skip.
6. Repeat both modes in Light and Dark, then System with both simulated machine preferences. Standard chart colors must preserve one shared series-role mapping across styles and adapt only the contrast needed for the resolved appearance.
7. Preview a mode and leave without setting it; the saved `chartColorMode` must return without resetting any working state. Reopen, use **Set chart colors**, and verify only `chartColorMode` changes.
8. Change or save dashboard style/namespaced palette and change user appearance. Confirm the saved Chart color mode survives both operations; likewise, setting chart colors must preserve the saved style/palette pair and appearance preference.
9. Exercise both modes while **Original baseline** is visible under each available style grammar. It remains impossible to save Original as a palette, while the independently chosen Chart color mode remains testable and saveable.
10. Compare the geometry/state ledger before and after every mode switch. Any DOM, bounds, wrapping, overflow, focus, draft, scroll, scene, release-progress, series-ID, slot-order, mark-shape, or legend-order change fails the mode.

The global axis is rejected or revised if Standard chart colors differ by dashboard style/palette rather than appearance contrast; Profile colors fail to use the active namespaced palette's authored data colours; either mode recolours UI, backgrounds, semantic statuses, axes, or state treatments; Standard becomes indistinguishable or inaccessible in Light or Dark; a switch changes geometry, meaning, interaction, or working state; preview mutates persistence before explicit setting; saving one ownership axis resets another; or a chart/scene silently opts out.

### Representative-page acceptance and falsifiers

The expanded page succeeds only if the visual philosophy remains coherent from the first chart through the supporting-content section and footer; both chart sections retain a readable shared rhythm despite varied chart grammar; headings, notice, narrative, disclosure, metadata, contact, resources, menu, confirmation, and footer form a clear but calm hierarchy; long titles, municipality/source/resource labels, methodology copy, contact details, and footer links wrap without clipping or losing association; and the page remains scan-friendly at realistic document length rather than feeling like disconnected specimens.

The representative page fails if any candidate changes the ten-chart inventory, order, content, structure, interaction, or state to improve its appearance; the original six-chart section is reduced or rearranged; supporting content becomes decorative filler or overwhelms analytical content; notice/status colour is confused with data series; the footer becomes sticky or covers content; Feedback & support loses its outline, visible focus, Escape restoration, outside dismissal, deterministic confirmation, or either menu item; long content clips, overlaps, or forces candidate-specific geometry; the style works only on chart containers; or any style/profile/Chart color mode/appearance/scene receives a different page anatomy.

## What to compare

For every candidate:

- Does its philosophy remain evident on an ordinary chart, a selected/editing chart, and an error/partial chart without a label?
- Do chart surfaces feel intentionally shaped rather than generically “dashboard-like”?
- Is hierarchy calm and immediate without spending accent colour on unrelated meanings?
- Are UI colour, semantic status colour, and chart-series colour visibly separate systems?
- Can the reviewer distinguish Profile colors from Standard chart colors while every non-data paint token remains unchanged?
- Does Standard chart colors provide a stable, conventional cross-style reading without making Light or Dark series ambiguous?
- Do long titles and dense legends remain readable and associated with the correct chart/mark?
- Are normal, hover, focus, selected, editing, Chrono-member, loading, partial, and error states distinguishable in colour and greyscale?
- Does Dark feel authored rather than inverted, glowing, or collapsed into generic blue-purple charcoal?
- Does System change appearance without changing style, state, or geometry?
- Does Chart color mode survive style/palette and appearance changes without becoming one of those settings?
- When one palette is held constant across styles, is each non-colour grammar still immediately identifiable in colour, Dark, and greyscale?
- Does every cross-style combination disclose both style grammar and palette provenance, and does switching style preserve rather than silently replace the palette?
- Do controls, icons, fields, menus, focus, dividers, and motion speak the same visual language as the charts?
- Does the visual language sustain a long analytical page across varied charts, prose, notices, disclosures, metadata, links, support, and the document ending?
- Are section headings and vertical rhythm strong enough for scanning without turning the supporting content into competing chrome?
- Do Feedback & support and Definitions and methodology communicate hover, focus, open, dismissal, and confirmation states accessibly and without geometry shifts?
- Does the non-sticky footer read as a quiet document ending rather than a persistent status bar or competing application shell?
- Would this style make a credible first impression for management and funders without pretending to be a specific institution?
- Can the fixture and wide review rail scroll independently without either covering, resizing, or resetting the other?
- Does any pair resemble one another closely enough that one is redundant?

For Evidence Ledger specifically:

- Does it feel authoritative and inspectable without becoming austere, antiquated, or like a printed report pasted into a browser?
- Do near-square flat surfaces and fine rules create clarity without making hover, selection, editing, and error too weak?
- Does the editorial heading voice help scanning while the sans-serif UI remains operationally clear?
- Does Night Ledger retain a warm “night paper” identity without muddying chart series or status contrast?
- Does the selected colour profile solve the original dark-background concern while preserving Evidence Ledger's editorial authority?
- Are Signature, Restrained, and Counterpoint each useful preferences within one style rather than near-duplicates or disguised additional styles?

For Humanist Standard specifically:

- Does it feel competent, approachable, and funder-ready without becoming pastel wellness, consumer lifestyle, or generic premium SaaS?
- Do matte layered surfaces, restrained rounding, shallow elevation, and humanist sans voice remain legible at dashboard density without drifting into neumorphism?
- Do **Common Ground**, **Quiet Commons**, and **Open Forum** offer a characteristic, lower-stylization, and alternate-hue choice without becoming sector costumes?
- Does its Dark appearance retain humane warmth and state clarity without converging on Evidence Ledger or generic purple-black analytics?
- With the same Evidence Ledger palette applied to both styles, is Humanist Standard still unmistakably different through non-colour grammar and greyscale evidence?

For Signal Instrument specifically:

- Does it improve status-at-a-glance reading and operational confidence without becoming a command-centre, military, emergency, cyberpunk, or scientific-instrument costume?
- Do compact contours, fine technical rules, calibrated low-glare layers, tabular numerals, and terse motion make dense changes easier to parse without making the page feel harsh or mechanically crowded?
- Do **Calibrated Steel**, **Quiet Telemetry**, and **Amber Vector** cover characteristic, lower-stylization, and alternate-hue preferences while keeping UI, semantic, and chart-data colour roles separate?
- Does Light read as an authored precision workbench and Dark as an authored low-glare instrument, rather than either being an inversion or a generic blue-black analytics theme?
- With the same Evidence Ledger or Humanist Standard palette applied across all styles, is Signal Instrument still unmistakably different in non-colour grammar and greyscale evidence?

## Approved portfolio directions

These three philosophies and their sequence are approved as the visual-style portfolio. All three rendered grammars and all 15 saveable palettes have been accepted. The GraphPad/monochrome round retained Sunrise — Reference faithful, Lakeside — Reference faithful, and Monochrome Reserve; both Contrast-tuned alternatives were rejected and preserved.

### 1. Evidence Ledger — evidence before ornament

**Portfolio position:** authoritative and inspectable; suited to policy, research, government, social-science, and formal management-review contexts without imitating a government website.

**Shared broad strokes:** near-square, flat chart surfaces; fine rule-based separation; almost no cast shadow; strong information alignment; editorial heading voice paired with an operational sans-serif UI; restrained mineral data colours; state treatments built from rule, label, icon, and limited tint rather than saturation.

**Light / Evidence Ledger:** an off-white paper canvas, quiet white-to-parchment surfaces, warm ink text, thin graphite rules, low-gloss controls, and a restrained mineral series palette. Depth comes primarily from adjacency, rules, and value steps.

**Dark / Night Ledger:** warm charcoal “night paper,” bone text, quiet tonal surface separation, and a re-authored light-on-dark mineral series palette. It avoids pure black, pure white, neon glow, glass, and the generic purple-black analytics look.

**Accepted direction:** the disciplined publication-like grammar gives formal review a strong sense of evidence, provenance, and seriousness while remaining a fully interactive application. The user approved Evidence Ledger after exercising the representative page. **Signature — Brighter Vellum**, **Restrained — Ash Register**, and **Counterpoint — Cool Archive** all remain product palettes; **Original baseline** remains review-only. Cool Archive now inherits Brighter Vellum's chart-series mapping while preserving its own cool archival shell/UI treatment. The lighter background hierarchy resolved the initial visual-heaviness concern, while flat surfaces, fine rules, and editorial hierarchy preserved the authoritative portfolio position. The independent Chart color mode remains available.

### 2. Humanist Standard — competence without coldness

**Portfolio position:** approachable institutional polish; suited to health, education, NGOs, community organisations, management, and funder-facing work without clinical stereotypes or generic SaaS gloss.

**Broad strokes:** matte softened surfaces; restrained rounded contour; shallow diffuse elevation; warm-neutral canvas; humanist sans typography; calm teal/cobalt emphasis; gentle but explicit state treatment; motion that feels supportive rather than mechanical.

**Light/Dark intent:** both appearances preserve warmth, humane readability, and matte depth. Dark uses deep desaturated green-grey and umber relationships rather than a purple-black inversion.

**Source-owned product palettes:**

- **Signature — Common Ground:** warm cloud and sage neutrals, calm teal/cobalt emphasis, and an approachable institution-neutral data palette.
- **Restrained — Quiet Commons:** pearl and soft-stone surfaces with subdued petrol UI, semantic, and focus emphasis; chart-series colours inherit Common Ground without losing the Humanist voice.
- **Counterpoint — Open Forum:** lilac-grey neutrals, softened violet emphasis, and a desaturated community-spectrum palette that broadens preference without resembling another pack.

**Hypothesis:** a legible, composed, and quietly warm system will have the broadest immediate acceptance while remaining distinct from Evidence Ledger's editorial flatness and Signal Instrument's technical precision.

**Accepted direction:** the user approved the rendered style after exercising the common fixture and review controls. **Signature — Common Ground**, **Restrained — Quiet Commons**, and **Counterpoint — Open Forum** are retained, including Light/Dark/System appearance, cross-style palette use, and the independent Profile/Standard chart-colour axis. Its non-colour grammar remained recognizably Humanist when palettes were held constant, and its independent rail proved the comparison could expose extensive controls without altering the dashboard under judgment.

**UI/UX Pro Max comparative rationale:** local style, product, palette, typography, chart, and UX searches supported rounded-but-restrained contours, matte elevation, visible focus, accessible chart association, and authored Dark treatment as plausible ingredients for an approachable data-rich institutional interface. The same comparative corpus repeatedly exposed the main failure modes: soft-card recommendations can converge on generic SaaS, high diffusion can become neumorphism, warm pastels can read as wellness, and industry-keyword palettes can become sector costume. Those results are challenger input only; the SimEx contracts and fixed fixture remain authoritative.

**Exact rejection risks:** reject or substantially revise Humanist Standard if it becomes neumorphic; pastel/wellness-coded; generic premium SaaS; a medical, education, NGO, or community-sector costume; dependent on colour to distinguish state; indistinguishable from Evidence Ledger in greyscale or with one palette held constant; or convergent with Evidence Ledger's flat/rule-led grammar in Light or Dark.

### 3. Signal Instrument — status at a glance under pressure

**Portfolio position:** operational confidence; suited to civil protection, first response, infrastructure, science, and technical teams without HUD, military, or cyberpunk cosplay.

**Broad strokes:** compact operational sans typography with DIN-influenced technical headings and short labels; monospace reserved for numeric, time, and provenance strings with tabular numerals; crisp compact contours; fine `1px` technical rules and shallow inner rims; low-glare tonal layering without diffuse shadow; solid dividers with short datum segments; square-recess controls/icons; high-separation but restrained signals; explicit freshness/provenance finish; and terse `90–120ms` paint responses with no bounce, scale, or blink.

The contour grammar uses a restrained `6px` shell, `4px` panel, `3px` control, and `2px` state-tag family. Hover strengthens the perimeter without lift; focus uses a visible two-part perimeter; selected uses a continuous perimeter plus left index; editing uses a dashed maintenance outline; Chrono uses a bottom membership rail; loading uses stepped rotation; partial data uses hatch; and error uses a firm inset rule. These treatments are paint-only and retain the shared DOM, geometry, copy, icons, and state machine.

**Light/Dark intent:** Dark is the low-glare operational instrument, using blue-graphite or neutral/brown-charcoal tonal layers rather than black. Light is a deliberate steel/titanium-and-white precision workbench, not an inverted afterthought. Neither appearance uses neon glow, OLED black, generic analytics blue, or warning-colour theatre.

**Source-owned product palettes:**

- **Signature — Calibrated Steel:** cool steel/mist application and canvas, near-white instrument panels, deep blue-green ink, disciplined steel-petrol emphasis, and a restrained technical categorical spectrum; Dark re-authors these as low-glare blue-graphite layers with softened steel-cyan and luminous-but-not-neon series.
- **Restrained — Quiet Telemetry:** near-neutral silver/graphite or aluminium relationships and nearly achromatic UI, semantic, and focus emphasis; Dark uses carbon-neutral graphite steps while chart-series colours inherit Calibrated Steel in the corresponding appearance.
- **Counterpoint — Amber Vector:** titanium and warm-neutral metal surfaces with subdued copper/umber emphasis and a cool/warm technical data spectrum; Dark uses brown-charcoal low-glare layers and soft copper without warning confusion, glow, or Evidence Ledger's vintage-paper warmth.

**Hypothesis:** calibrated state separation and technical finish will make dense, changing dashboards feel dependable in time-sensitive review while preserving the same calm data hierarchy and accessibility obligations.

**Accepted direction:** the user approved the rendered style and all three core profiles after exercising the common fixture and review controls. Signal Instrument retained operational clarity in Light, Dark, and System; remained recognizably distinct when palettes were held constant; preserved the independent Profile/Standard chart-colour axis; and avoided its explicit HUD, military, cyberpunk, emergency, and developer-console rejection risks.

**UI/UX Pro Max comparative rationale:** retain its useful data-dense rhythm, sans-plus-mono/tabular hierarchy, crisp visible focus, and authored Light/Dark guidance, but reject the generic green/red operational palette and nearest HUD/FUI territory. The comparative material is challenger input only; SimEx's common fixture, accessibility rules, and variation contract remain authoritative.

**Exact rejection risks:** reject or substantially revise Signal Instrument if it becomes generic blue analytics, military/emergency costume, command-centre HUD/FUI, terminal/developer tooling, neon/cyberpunk, pure-black OLED, all-monospace, alarm-colour theatre, or merely Humanist Standard with smaller radii. Reject HUD brackets, scanning lines, glow, blinking, bounce/scale motion, emergency red/green decoration, and any state meaning that depends on colour instead of the fixed label/icon/pattern grammar.

## Portfolio distinctness gate

Each pair is scored `0` (same), `1` (visibly different), or `2` (defining difference) across seven families: surface model; contour/elevation grammar; typographic voice; neutral temperature/value architecture; UI-versus-data colour strategy; icon/affordance finish; and motion/material character.

| Pair | Provisional research score | Defining non-colour differences |
|---|---:|---|
| Evidence Ledger ↔ Humanist Standard | 10/14 | Flat/rule-led versus softly layered surfaces; near-square versus softened contours; editorial heading voice versus humanist sans. |
| Evidence Ledger ↔ Signal Instrument | 13/14 | Publication/evidence character versus calibrated instrument; warm paper adjacency versus low-glare technical layering. |
| Humanist Standard ↔ Signal Instrument | 12/14 | Matte approachable depth versus crisp status-first precision; supportive motion/material versus terse operational response. |

These research scores justified prototyping. The subsequent common-fixture browser exercise and explicit user approval established that all three pairs are sufficiently distinct for the selected portfolio; the scores are retained as provenance rather than as the acceptance decision itself.

A pair is rejected or substantially revised if it:

- scores below `8/14`;
- differs in fewer than four of the seven families;
- has fewer than two defining (`2`) non-colour differences;
- becomes the other through palette and radius changes alone;
- is indistinguishable in greyscale;
- converges in Dark;
- distinguishes only decorative chrome rather than chart surfaces and states;
- shares the same philosophy, reason to choose, or anti-goal;
- reads as an institution stereotype/costume; or
- fails exact geometry, long-content, contrast, non-colour state, focus, or series-association checks.

The final unlabeled test uses an ordinary chart, a selected/editing chart, and an error/partial chart from each style in both colour and greyscale.

## Research method

1. Start from the three normative 12 Aug 2026 contracts and accepted Step 2 evidence so research cannot reopen structure, behaviour, ownership, parity, or accessibility.
2. Use the project-root Gemini report to identify candidate skills and repositories. Treat that report as discovery input, not design authority.
3. Install UI/UX Pro Max locally and use its design-system and focused style/colour/typography/chart/UX searches as comparative input and challenger generation. Query broad institutional contexts—including medical, government, social science, civil protection, and first response—without copying a generated design system into the prototype.
4. Compare its local recommendations with primary design-system/visualisation guidance from public-sector, health, research, enterprise, and geospatial sources.
5. Cluster visual territories by philosophy rather than institution or colour. Test each cluster against the approved variation contract and the seven-family distinctness rubric.
6. Retain three non-overlapping positions; fold or reject territories that are redundant, sector-coded, decorative-only, or incompatible with the fixed dashboard.

The important negative finding was repeated convergence on a generic blue analytics dashboard when sector labels drove the query. Consequently, institution type may motivate a user's choice, but cannot define a style through a sector colour stereotype.

### Attributable research sources

- **Local comparative engine:** installed `ui-ux-pro-max` skill and its local searchable datasets/scripts. It informed challenger generation and accessibility/style checks; it is not normative authority and adds no production dependency.
- **Local discovery report:** `C:\Users\hekma\Documents\Projects\SimEx\(gemini report) Codex Dashboard UI_UX Research.md`. It informed tool discovery and epistemic cautions; its design recommendations are not approved authority.
- **USWDS Data Visualizations:** <https://designsystem.digital.gov/components/data-visualizations/> — public-sector chart clarity, data/semantic colour separation, and accessible visualisation comparison.
- **NHS colour guidance:** <https://service-manual.nhs.uk/design-system/styles/colour> — restrained institutional colour roles, contrast, and non-decorative use.
- **Urban Institute Data Visualization Style Guide:** <https://urbaninstitute.github.io/graphics-styleguide/> — research/publication hierarchy, chart annotation, and evidence-led presentation.
- **IBM Carbon data-visualisation palettes:** <https://v10.carbondesignsystem.com/data-visualization/color-palettes/> — systematic categorical/sequential palette comparison and light/dark data-colour concerns.
- **Esri Calcite colour foundations:** <https://developers.arcgis.com/calcite-design-system/foundations/colors/> — interface, status, data, and light/dark token separation for data-rich geospatial work.
- **Glasbey et al., “Colour Displays for Categorical Images”:** <https://onlinelibrary.wiley.com/doi/10.1002/col.20327> — maximin-style categorical colour separation and the research basis for Prismatic Index's pair-distance utility.
- **Palettailor:** <https://www.yunhaiwang.net/infoVis2020/palettailor/pdf/vis20a-sub1326-i6.pdf> — data-aware categorical palette discrimination as comparative input for Prismatic Index; the fixed SimEx series mapping and accessibility redundancies remain authoritative.
- **Solarized:** <https://ethanschoonover.com/solarized/> — deliberately related Light/Dark value environments and preserved chromatic identity as inspiration for Chromatic Polarity, recalibrated here for the SimEx contrast and state requirements rather than copied as an editor theme.
- **Paul Tol colour schemes:** <https://tol-colors.readthedocs.io/en/latest/colorsets.html> — colour-vision-aware qualitative sets and lightness differentiation as comparative input for Luminance Ladder's projection, grayscale, and reduced-hue resilience.
- **GraphPad colourblind-safe palettes FAQ:** <https://www.graphpad.com/support/faq/colorblind-safe-colors-schemes-and-transparency/> — first-party Sunrise/Lakeside visual references and the requirement to use solid, 100%-opaque colours rather than transparency. The page calls the warm palette **Sunrise**.
- **GraphPad Prism 9.5 release notes:** <https://www.graphpad.com/updates/prism-950-release-notes> — first-party provenance for the redesigned colourblind-safe examples. The release notes call the corresponding warm palette **Sunset**, creating the naming discrepancy recorded in this sketch.

Primary sources are comparative evidence. The three project contracts remain normative when a general recommendation conflicts with SimEx.

## Retained and rejected research territories

### Retained through consolidation

- **Civic Precision** was folded into Evidence Ledger. Keeping it separately would create two flat institutional styles with overlapping reasons to choose.
- **Executive Depth** was folded into Humanist Standard. Its best contribution is quiet polish and assured matte depth; as an independent pack it drifted toward generic premium SaaS.
- **Technical Instrument** was folded into Signal Instrument. Its core precision, numeral, and state-separation ideas already define that position.

### Rejected before prototyping

- **Constructive Signal**, built around bold public colour blocks and neo-brutalist edges, was rejected as too polarising for conservative, healthcare, and corporate review contexts.
- **Palette-only sector skins** were rejected because colour substitutions do not earn distinct portfolio positions and encourage institutional stereotypes.
- **Glassmorphism and neumorphism** were rejected because their material effects weaken dense chart/state clarity, focus, and reliable contrast.
- **Heavy gradients and decorative illustration-led packs** were rejected because they compete with data and are not required to express a durable philosophy.
- **Command-centre HUD, military, cyberpunk, and emergency-red treatments** were rejected because they turn operational confidence into costume and narrow the portfolio's credibility.

Rejected research territories are not the same as rejected interactive variants. Evidence Ledger, Humanist Standard, Signal Instrument, the combined three-style portfolio, and all 15 saveable palettes are approved. The two rejected Contrast-tuned interactive variants remain preserved as evidence; they do not add portable profiles or another visual grammar.

## Decision record

### Winner or synthesis

**Approved synthesis.** Evidence Ledger, Humanist Standard, and Signal Instrument each earned inclusion independently. The portfolio contains 15 saveable palettes: their nine core profiles; Prismatic Index, Chromatic Polarity, and Luminance Ladder; Sunrise — Reference faithful, Lakeside — Reference faithful, and Monochrome Reserve. Original baseline remains review-only. The two Contrast-tuned GraphPad alternatives are rejected as portfolio entries but preserved in the sketch.

### Why Evidence Ledger was accepted or rejected

**Approved by the user.** Evidence Ledger succeeded because its evidence-first, flat, rule-led grammar feels authoritative and inspectable across the full analytical page, rather than depending on decorative dashboard conventions. The palette-refinement round resolved the original dark/heavy background concern while preserving editorial hierarchy and formal credibility. It earns a distinct portfolio position for evidence, policy, research, government, social-science, and management-review contexts without becoming a government-site costume. **Signature — Brighter Vellum**, **Restrained — Ash Register**, and **Counterpoint — Cool Archive** are retained; Cool Archive now inherits Brighter Vellum's chart-series colours while keeping its own cool archival shell/UI. **Original baseline** is rejected as a product palette because its darker value structure caused the weight/saturation concern, but remains review-only evidence. The independent **Profile colors / Standard chart colors** choice is also retained.

### Why Humanist Standard was accepted or rejected

**Approved by the user.** Humanist Standard earned the approachable institutional position through matte softened surfaces, restrained contours, shallow diffuse elevation, and a humanist sans voice that made a dense analytical page feel welcoming without weakening its authority. **Signature — Common Ground**, **Restrained — Quiet Commons**, and **Counterpoint — Open Forum** are retained. The palettes remained portable across styles with source provenance intact, while holding a palette constant still made Humanist Standard visibly distinct from Evidence Ledger through non-colour grammar. The independent wide review rail also succeeded: it kept every prototype-only control outside the fixture, scrolled independently, and did not resize, cover, or enter product geometry. The candidate's principal rejection risks did not materialize: it did not become neumorphic, pastel/wellness-coded, generic premium SaaS, a sector costume, or a duplicate of Evidence Ledger; its Light and Dark treatments preserved explicit focus, state, and series association.

### Why Signal Instrument was accepted or rejected

**Approved by the user.** Signal Instrument succeeded because crisp compact contours, calibrated low-glare layering, tabular numeric emphasis, fine technical rules, explicit state treatments, and terse motion improved operational legibility without becoming a HUD, command centre, military/emergency costume, cyberpunk surface, or developer console. **Signature — Calibrated Steel**, **Restrained — Quiet Telemetry**, and **Counterpoint — Amber Vector** are retained as core profiles. With one palette held constant, its non-colour grammar remained distinct from both approved alternatives while geometry and working state stayed fixed.

### Why the combined portfolio succeeded or failed the redundancy challenge

**Approved by the user.** The portfolio succeeds because the styles offer three different reasons to choose—formal evidence and provenance, approachable institutional polish, and operational confidence—through surface, contour/elevation, typography, affordance, state, and motion differences rather than colour or sector costumes alone. Cross-style palette application did not erase those identities, so none is redundant with another.

### Retained cherry-picks

No cross-style grammar cherry-picks were required. The approved cross-style palette model and independent chart-colour mode are retained. Restrained profiles share their corresponding Signature chart-series palette while preserving their quieter surface/UI/semantic/focus treatment; Cool Archive applies the same inheritance pattern from Brighter Vellum. The first three utility-led profiles are retained as approved portable additions.

### Approved palette-refinement decision

User feedback identified the first Evidence Ledger background as too dark and suspected that this value structure amplified the perceived saturation of the whole palette. The approved response is systematic comparison rather than a single untested lightening pass: retain the old colours as evidence, revise the designated palette, add a lower-stylization profile, and add one deliberately different hue strategy. The names **Signature**, **Restrained**, and **Counterpoint** describe stable product roles; each style may give its profiles a philosophy-specific subtitle.

The browser exercise is complete and the user approved Evidence Ledger with all three product palettes retained. Brighter Vellum resolves the original background-weight concern as the native Signature; Ash Register retains a credible lower-stylization option; Cool Archive provides a different cool archival shell/UI strategy without replacing the Evidence Ledger philosophy. Cool Archive's chart-series colours now inherit Brighter Vellum in both Light and Dark, so the distinction stays in surface/UI/semantic/focus treatment rather than a second data mapping. Original baseline remains evidence only and cannot be saved under any style grammar.

### Approved cross-style palette decision

Style grammar and palette are independent but jointly saved dashboard choices. Product palettes use namespaced IDs and retain explicit source-style ownership/provenance. Any product palette may be previewed and saved with any style; switching style preserves the current palette so the reviewer can isolate grammar; **Use [style] Signature** is the explicit shortcut for adopting the active style's native Signature palette. **Set as dashboard style** saves the active `dashboardStyle` plus namespaced `dashboardColorProfile` combination. It does not overwrite `chartColorMode` or the user-owned `appearancePreference`, and those settings do not overwrite style/palette.

Original baseline may be previewed beneath any style grammar for comparison, but is always labelled **REVIEW ONLY**, always disables style saving, and is never persisted. Cross-style use does not transfer palette authorship: for example, Humanist Standard + Ash Register must still identify Ash Register as an Evidence Ledger palette.

### Approved global Chart color mode decision

The portfolio will retain a global choice between **Profile colors** and **Standard chart colors**. This is an independent dashboard setting rather than another style, palette, or appearance. Profile colors uses the active namespaced palette's authored data colours; Standard chart colors provides a consistent, conventional, accessibility-conscious analytic palette across the entire style portfolio, with only Light/Dark contrast adaptation.

The axis is deliberately narrow: it owns chart data marks/series and their legend swatches only. UI accents, semantic status colours, surfaces, structure, geometry, state transitions, and interactions remain owned elsewhere and cannot respond to it. Preview remains non-mutating until **Set chart colors** explicitly saves `chartColorMode`. The axis and ownership model are approved and retained across all three styles; exact production Standard palette extension tokens remain a low-risk implementation detail.

### Approved portfolio-level utility palette trio

The user exercised and explicitly approved **Prismatic Index**, **Chromatic Polarity**, and **Luminance Ladder** after viewing all three on the complete dashboard. They are retained under the portfolio-level **Utility studies** source group, portable across Evidence Ledger, Humanist Standard, and Signal Instrument, and require no fourth style. Their approval preserves the common geometry, data, chart order, interactions, state, accessibility, Light/Dark/System appearance, provenance, independent Chart color mode, and explicit-save rules.

### GraphPad and monochrome decision

The user explicitly compared both proposed GraphPad paths—**Option 1: Reference faithful** and **Option 3: Contrast tuned**—with each Sunrise pair and Lakeside pair holding application/UI/surface tokens constant and varying only the six chart-series tokens. The Reference-faithful Light sets reproduce GraphPad's official solid colours at 100% opacity and add a neutral chart-mark outline; their Dark adaptations are local. The Contrast-tuned Light/Dark sets are also local and target stronger direct plot contrast. Neither local adaptation is GraphPad-certified. Monochrome Reserve is the fifth candidate: an achromatic shell/semantic system whose Profile-colour data series inherit Prismatic Index.

All five retain the same fixture, three styles, five scenes, Light/Dark/System resolver, Profile/Standard independence, non-mutating preview, explicit set action, accessibility redundancies, and zero-geometry/state-delta requirement. The user approved **Sunrise — Reference faithful**, **Lakeside — Reference faithful**, and **Monochrome Reserve**. Both Contrast-tuned variants were rejected because they did not earn distinct portfolio roles beside the accepted reference palettes; both remain preserved in the interactive sketch. This closes Sketch 003 with 15 approved saveable palettes.

## Responsive and implementation details still unresolved

These are deliberately deferred, low-risk implementation details; they are not permission to change the style philosophies or common geometry:

- Exact production phone breakpoint and unsupported Build/Present banner styling remain owned by Sketch 009.
- After a style is accepted at `1440×900`, verify its common structure at `390×844` View, `768×1024`, `1024×768`, `1200×900`, and `1440×900`; Present/controller uses its supported tablet/desktop sizes, and Audience carries the accepted chart-surface tokens at its fixed `1920×1080` logical canvas.
- Exact production token values, local/system font fallback order, series-palette allocation across the full catalogue, and decorative duration/easing are tuned only after long-content, geometry, contrast, greyscale, and Dark checks pass.
- Exact Standard chart palette tokens, categorical capacity beyond the ten-chart fixture, sequential/diverging map ramps, and deterministic extension rules for unusually large series counts remain low-risk production details. They must preserve the approved shared cross-style identity, appearance-only contrast adaptation, accessible series association, and separation from semantic colours.
- The 15-profile palette portfolio is approved. Exact prototype Light/Dark tokens are catalogued in `PALETTE-CATALOG.md`; production tokens still require later implementation calibration. Original baseline remains review-only, and both rejected Contrast-tuned GraphPad alternatives remain comparison evidence only.
- Production storage scope for `dashboardStyle`, the namespaced `dashboardColorProfile`, `chartColorMode`, `appearancePreference`, the machine-preference listener, and any future dashboard-owner authorization remain later specification/implementation details. Their combinability, provenance, ownership, explicit-setting, style-switch preservation, and non-overwrite relationships are settled even though the final storage mechanism is not.
- Exact production destinations for documentation/accessibility/data-source/privacy/resource links, owner-contact wiring, version text, and Report a bug/Request a feature submission remain low-risk implementation details. The prototype uses deterministic local confirmation and no external mutation.
- Style-token application to the full shared shell, page chrome, and status/footer region remains the final Sketch 009 synthesis task. Its decision may relocate or re-own the representative footer/status content and decide final settings placement, but may not treat Sketch 003's external review rail as product chrome or vary the fixed comparison anatomy between candidates.
- No production component, selector, renderer, schema, migration, test, or file plan is selected here.

## Phone support boundary

- View, including Chrono, is the only supported product mode at phone size. `390×844` is the canonical phone fixture.
- Build and Present may open best-effort beneath a persistent, non-dismissible unsupported-mode notification with a direct **Switch to View** action. They have no phone-layout acceptance requirement.
- Detection does not auto-redirect, disable controls, discard state, or erase an active Build draft.
- `768×1024` remains a supported authoring tablet. Audience is unaffected.
- The exact breakpoint and final banner presentation belong to Sketch 009 and are identical for all three styles.

## Relevant contract clauses

- UI contract §§1–2, `AUTH-01`–`AUTH-05`, `ARCH-02`, `ARCH-04`, `ARCH-08E`, and `ARCH-09`: the three 12 Aug contracts govern; one V3 state and canonical chart renderer remain authoritative; Step 4 is disposable and must require no new UI framework, remote runtime dependency, or production implementation.
- UI contract §4, `PAR-01`–`PAR-09`: View/Build canvas, grid, panel, plot, order, footprint, breakpoint, and density parity remain exact. A style, palette, Chart color mode, or appearance switch cannot consume or move dashboard geometry. The external independently scrolling review rail is prototype instrumentation and is excluded from product parity measurements.
- UI contract §6, `DISC-01`–`DISC-06`: essential/contextual/Advanced/destructive hierarchy, zero geometry cost, truthful labels, and long-content containment remain fixed while their paint treatment varies.
- UI contract §7, particularly `VIS-04`–`VIS-08`: canonical chart/substitute data, geometry, content, interaction, loading/error states, and live draft meaning remain identical across packs. Chart color mode may substitute paint tokens for data marks and matching legend swatches, never renderer meaning, series identity, slot order, or state.
- UI contract §§9 and 14.2, `RESP-01`–`RESP-07`, as corrected by the approved Step-10 phone boundary recorded in Sketch 002 and the manifest: common responsive/input/long-content requirements remain binding; only View/Chrono is supported at `390×844`; Build and Present phone layouts are best-effort beneath the notification.
- UI contract §12, `STATE-02`, `STATE-02A`, `STATE-03`, `STATE-04`, and `STATE-14`: loading, zero-row, error, partial, and control-truth states preserve geometry and meaning. Their visible treatment cannot rely on colour alone.
- UI contract §13, `LEG-04`–`LEG-06`: mandatory chart text/marks do not clip or lose association; critical contrast and non-colour meaning remain binding, including Light/Dark and dense legends. Both Chart color modes retain the same labels, mark-shape/dash/pattern associations, and legend order.
- UI contract §14.1, `FIX-DASH-01`, `FIX-PANEL-STATES`, `FIX-LONG`, and `FIX-ACCESS`: the fixed dashboard, simultaneous panel states, long strings, keyboard/touch/greyscale/200-percent/reduced-motion conditions govern the common comparison.
- UI contract §15, `GATE-H01`, `GATE-H02`, `GATE-H05`, `GATE-H09`, `GATE-H10`, and `GATE-H11`; `CRIT-C07`–`CRIT-C08`: parity, state completeness, architecture neutrality, controlled semantic colour, perceived hierarchy/calmness/coherence, and first-use learnability are acceptance gates or comparative criteria.
- UI contract §15.3, `COLOR-01`–`COLOR-06`: a candidate may have zero or one declared non-status accent role; status and destructive roles remain separate; hue/value/theme are Step 4 choices; every semantic role has a non-colour equivalent. Standard chart colors is interpreted as a data-only palette namespace and cannot recolour, replace, or borrow meaning from UI, status, warning, error, or destructive roles.
- UI contract §17, `DEFER-07`–`DEFER-11`: colour, fonts, type, spacing, shadows, borders, motion, Light/Dark/adaptive direction, and icon finish are Step 4 freedoms only within contrast, wrapping, chart/status meaning, reduced-motion, glyph-authority, and disposable-prototype boundaries. This sketch further locks spacing/type geometry across its three packs under the approved variation contract.
- Sketch-boundary interpretation: Sketch 003 may decide paint, type voice, rhythm/density, contour, focus, hover, disclosure-open, menu-open, and confirmation treatment for its fixed representative notice, narrative, metadata, resources, support menu, and non-sticky footer. Its wide independently scrolling review rail is outside the fixture and has no product authority. Sketch 003 does not decide the final application header/navigation, overall gutters, settings placement, persistent footer/status behaviour, or ultimate ownership/placement of shared chrome; those remain Sketch 009 decisions.
- Temporal contract §13 Step 4 and §14: View Chrono remains one View substate with the approved temporal ownership/behaviour; final iconography, animation, spacing, tokens, and visual arrangement are Step 4 decisions without altering playback, availability, focus, or non-colour semantics.
- Chart-creation contract §§12 and 16, especially `CREATE-ACCESS-09`, `CREATE-ACCESS-10`, `CREATE-DEFER-07`, and `CREATE-DEFER-08`: later chart-creation surfaces inherit the approved visual pack while preserving visible focus, non-colour state, reduced-motion equivalence, long content, canonical chart meaning, generated glyph authority, and the fixed creation state machine.
- Accepted baseline evidence in `docs/audits/2026-08-11-three-mode-dashboard-baseline/` remains regression evidence for content, state, and geometry problems. It is not design authority and does not select a style.
