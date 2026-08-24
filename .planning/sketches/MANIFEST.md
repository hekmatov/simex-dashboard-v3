# V3 Dashboard visual-design sketches

## Design direction

Step 4 compares interactive, disposable design directions for the approved V3 dashboard contracts. Structural sketches use a neutral visual treatment until `003-dashboard-visual-language` approves a three-style institutional portfolio. No sketch is production implementation authority by itself; only an explicitly approved winner or synthesis is carried forward.

## Reference points

- Normative UI contract: `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`
- Normative temporal contract: `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md`
- Normative chart-creation contract: `docs/superpowers/specs/2026-08-12-chart-creation-design.md`
- Accepted baseline evidence: `docs/audits/2026-08-11-three-mode-dashboard-baseline/`
- Approved low-risk integration choices: [`INTEGRATION-DEFAULTS.md`](INTEGRATION-DEFAULTS.md)
- Historical 2026-08-10 prototypes are evidence only and are not approved design authority.

## Sketch register

| # | Name | Design question | Status | Winner | Tags |
|---:|---|---|---|---|---|
| 001 | Audience output | What composition and hierarchy make the fixed 16:9 Audience output legible and calm? | Approved | Synthesis — A top default; B/C settings | Audience, 16:9, composition, legibility |
| 002 | Contextual panel editing | How can a builder edit progressively without changing View-equivalent geometry or losing sight of the target? | Approved | A — Unit Orbit + universal 2×4 footprint picker | Build, parity, contextual editing, chart-owned sizing |
| 003 | Dashboard visual language | What three complementary institutional aesthetic philosophies and portable colour profiles should V3 support? | Approved | Synthesis — three visual styles + 15 saveable palettes; Profile/Standard chart colors; Light/Dark/System | themes, light/dark/system, style portfolio, utility palettes, GraphPad, monochrome |
| 004 | Chart creation | How should guided creation combine canonical preview with non-mutating placement proof? | Approved | A — Staged Proof Studio | Build, workflow, preview, placement proof |
| 005 | Time Group authoring | How should temporal availability and membership remain understandable at realistic density? | Approved | A — Availability Ledger | time groups, availability, authoring |
| 006 | Scene authoring | Which twin-canvas treatment best completes an approved two-stage Scene workflow with a persistent draft panel, familiar availability ledger, direct arrangement, and Unit Orbit? | Approved | A — Balanced Twin Canvas | scenes, two-stage, availability ledger, twin canvas, Unit Orbit |
| 007 | View Chrono | Which viewport-owned controller placement keeps Chrono clear, persistent, and subordinate to the unchanged View dashboard? | Approved | Synthesis — user-selectable Lower Playback Deck / Chrono Mast | View, Chrono, playback, controller placement |
| 008 | Present controller | How should a moderator control Audience output confidently and preserve the last valid output? | Approved | A — Live Sidecar | Present, Audience, controller |
| 009 | Shared shell and product chrome | How should approved winners fit one coherent shell and final visual synthesis? | Approved | A — Layered Command Crown | shell, navigation, chrome, synthesis |
| 010 | Dashboard look controls | How should approved visual settings be placed and applied inside the Layered Command Crown? | Approved | A — Contextual Visual Settings Drawer | shell, settings, visual style, palettes, appearance, preview |
| 011 | Dashboard structure authoring | How should builders manage pages and sections while keeping structural consequences and the actual dashboard understandable? | Approved | D — Inline Build Structure Controls | Build, structure, pages, sections, inline canvas, consequences |
| 012 | Temporal content library | How should builders find, understand, manage, and repair saved Time Groups and page-scoped Scenes without conflating library management with approved authoring workflows? | Approved | D — Page-grouped Relationships | Build, temporal library, Time Groups, Scenes, repair, saved content |
| 013 | Scenario & dashboard package management | How should Build expose one-scenario identity and package operations without implying a package-wide Save or disturbing valid work? | Approved | A — Scenario Passport | Build, scenario, package, import, download, reset, recovery |
| 014 | View exploration and comparison | How should ordinary View support source inspection, Chrono member elevation, and one-to-four-chart comparison without resembling Build or Present? | Approved | D — Immersive View Canvas | View, comparison, source, Chrono, fullscreen, phone, consistency |
| 015 | Integrated Build command surfaces | How should approved Build entry points and transient surfaces coexist in the Layered Command Crown without hiding the active target or obscuring draft ownership? | Approved | B — Context Shelf | Build, integration, Crown, Unit Orbit, focus, drafts, consistency |
| 016 | Collection display runtime interaction | How should non-temporal Collection Display controls and runtime state remain understandable across View, Focus, Comparison, Present, Audience, and Build authoring? | Approved | A — Embedded Header Controls | collection, View, Present, Audience, Build, consistency |
| 017 | Chart data-state continuity | How should a chart preserve canonical bounds and truthful content through Loading, zero-row, Partial, and Error across ordinary View, Focus, Comparison, Build canonical substitute, Present, and passive Audience—and where should recovery actions appear without colliding with Details, Focus, or Collection controls? | Approved | A — Plot-native State Plate | data states, View, Focus, Comparison, Build, Present, Audience, continuity, consistency |
| 018 | Source Evidence Workspace | How should users inspect a chart’s wide source rows, provenance, search, sorting, pagination, and load states, then return to the invoking chart without losing View context? | Approved | A — Dedicated Viewer Window | source data, evidence, View, table, search, pagination, continuity |
| 019 | Application and structural recovery | How should the approved shell expose scope-owned recovery when no valid Scenario or required dashboard structure exists, without implying that valid content is present or introducing generic authoring actions? | Approved | A — Inline Recovery Rails | recovery, empty states, structure, View, Build, Present, consistency |
| 020 | Page and Section command surfaces at scale | How should approved inline Page and Section commands remain target-specific and legible at scale while exposing destination, placement, disposition, and named structural consequences before mutation? | Approved | A — Anchored Local Commands | Build, structure, pages, sections, scale, commands, consequences, responsive |
| 021 | Free-text authoring | How should a separate Add static content workflow balance Free-text QMD source, validation, and production-equivalent preview without entering the chart wizard? | Approved by master; design only | A — Split Source + Production Preview (accepted) | static content, Free text, QMD, preview, Build |
| 022 | Image authoring | How should Image creation and editing separate durable assets and saved transforms from transient viewer interactions? | User-amended after master approval; design only | B — Guided Tool Sections (selected) | static content, Image, crop, rotation, assets, accessibility |
| 023 | Static panels in Build and View | How should saved Free-text and Image panels preserve canonical composition while exposing authoring chrome only in Build? | User-amended after master approval; design only | A — Content-led Canonical Panels; Image actions reveal on hover/focus/touch | static content, Build, View, fullscreen, responsive |
| 024 | Image in Audience | How should Image panels join passive 16:9 Audience output while Free text remains excluded from Present? | Approved by master; design only | A — Quiet Canonical Composition (accepted) | static content, Image, Present, Audience, 16:9 |

## Sequence

Sketches 001–020 are complete and approved. Sketches 021–024 are the isolated Step 7S design evidence accepted by the V3 Design master at `e159db11593f784459e50f7707d93987fa996527` and subsequently amended through the user’s interactive review to 021=A, 022=B, 023=A with intent-revealed Image actions, and 024=A; they remain disposable prototypes rather than implementation. Remaining low-risk integration choices use the recommended approved pattern and are recorded in [`INTEGRATION-DEFAULTS.md`](INTEGRATION-DEFAULTS.md), without allocating another sketch number. A new sketch is opened only for a material change to product scope, ownership, persistence, a major workflow, or primary information architecture.

## Cross-sketch support boundary

- **Phone-sized viewports support View only, including Chrono.** `390×844` is the canonical phone fixture. Build and Present may still open at phone width as best-effort surfaces, but neither mode has phone-layout acceptance requirements.
- In unsupported Build and Present, show a persistent, non-dismissible notification above product chrome with a direct **Switch to View** action. Detection does not automatically redirect, disable controls, or discard state; resizing a dirty Build session to phone width preserves its drafts.
- Audience output is unaffected by this product-controller support boundary. `768×1024` remains a supported tablet viewport for authoring. Sketch `009-shared-shell-and-product-chrome` owns the exact phone breakpoint and final banner presentation.

## Deferred product features

| ID | Feature | Deferred boundary |
|---|---|---|
| AUD-PRESET-01 | **Named Audience composition presets.** Let a presenter save the current ordered chart set, count-valid Audience layout, title visibility, and shared-title placement, then browse and load a list of saved compositions. | Use **Audience composition preset**, not snapshot: it does not capture datasets, resolved values, filters, active frame, playback state, cadence overrides, blackout, connection/session state, or the per-Scene date position. Loading resolves current dashboard data/time and must reject stale or invalid references without changing the last-valid Audience output. Later specification must decide whether presets are standalone dashboard content, browser-local preferences, or projections of saved Scenes. Until then, Present composition remains ephemeral and protocol/schema are unchanged. |
