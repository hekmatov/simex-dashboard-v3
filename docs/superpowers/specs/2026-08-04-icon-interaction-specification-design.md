# Icon & Interaction Specification — Design

**Status:** Approved for implementation by the 2026-08-04 request to formalize the visually approved atlas.

## Goal

Create one versioned, machine-readable icon-language registry that the dashboard imports at runtime and that generates the canonical HTML atlas and Markdown Icon & Interaction Specification. A glyph, label, tooltip, state rule, or implementation status must be changed once and reflected everywhere.

## Why this is needed

The approved atlas currently contains its own SVG fragments and interaction inventory, while the React application contains separate inline SVG and CSS-drawn icons. That duplication permits the visual reference and product to diverge. The new architecture removes that duplication without introducing an external icon library, a runtime service, or a general-purpose design-system framework.

## Source of truth

Two focused modules form the authoritative machine source:

- `src/iconography/iconGlyphs.js` exports the keyed, trusted SVG fragments using only the approved SVG vocabulary and the semantic `accent-fill` and `accent-stroke` classes.
- `src/iconography/iconCatalog.js` exports `ICON_LANGUAGE_VERSION`, the approved design tokens, stable interaction definitions, state definitions, ordered atlas surfaces, and the chart-type-to-glyph mapping.

The modules remain plain ECMAScript. React and Node import them directly, so no duplicated JSON export, schema library, or application-startup generation step is required. Separating geometry from semantics keeps both files readable while preserving one source-of-truth boundary.

Chart names and descriptions continue to come from `src/charting/schemas/chartSchemaRegistry.js`. The icon catalogue contains only each chart type’s glyph mapping, preventing a second chart-type authority.

## Human canonical references

The machine registry generates two tracked artifacts:

1. `docs/icon-language-atlas.html` — the canonical visual reference for designers and developers. It preserves the approved atlas styling, accent preview, search, states, refinements, and hover/focus tooltips.
2. `docs/icon-and-interaction-specification.md` — the canonical textual contract. It documents tokens, usage rules, interaction semantics, implementation status, and the generation/validation commands.

Generated artifacts carry the registry version and a generated-file warning. They are never hand-edited. The existing visual-companion atlas is a design-history artifact; once the tracked atlas is generated, it is no longer an independent source of truth.

## Application API

Two focused React primitives consume the registry:

- `SimExIcon` renders one registered glyph. It accepts an icon ID, decorative/accessibility mode, size, and class name. SVG fragments are static project-owned strings, never user input.
- `IconControl` renders an icon-only button from an interaction ID. It derives the glyph, accessible name, tooltip, destructive tone, and pressed/disabled state styling from the registry while forwarding normal button events and context-specific class names.

Dynamic controls choose between stable interaction IDs rather than overriding registry copy. Examples include `playback.play` versus `playback.pause`, or `fullscreen.select.1` through `fullscreen.select.4`.

Application color integration uses CSS custom properties with registry defaults:

- `--simex-icon-base`
- `--simex-icon-accent`
- `--simex-icon-accent-on-light`
- `--simex-icon-accent-on-dark`
- `--simex-icon-danger`
- `--simex-icon-selected`

This keeps the approved accent customizable without baking colors into SVG files. Danger red replaces the base structure for destructive actions while the shared accent remains the secondary focal color.

The version 3 dashboard stores one value at `globalStyles.iconAccent`, defaulting to `#19D3C5`. The catalogue exports the approved contrast-derivation function so the application and generated atlas calculate identical on-light and on-dark variants targeting at least 4.5:1 contrast. Edit mode exposes one global icon-accent color control with live preview and reset; chart-series colors remain independent.

## Implementation-status model

Every interaction has one explicit status:

- `live`: the application currently uses the registry-backed interaction.
- `planned`: visually approved but not yet wired to its application surface.
- `reference`: a supporting symbol or retained text/data rule rather than a clickable application control.

The generated atlas and specification display this status. This allows the formal catalogue to include the complete approved language without pretending that every text-to-icon conversion has already shipped.

This implementation migrates all application-owned inline SVG icons in the directly relevant chart-panel and fullscreen controls, plus the core playback transport controls. Wider shell, wizard, and editor conversions remain `planned` and can be migrated in small visual-review batches.

It also wires the already approved single dashboard-wide icon-accent setting into the version 3 dashboard structure and renderer. No per-icon or per-chart accent overrides are introduced.

## Interaction rules

- The adopted strategy is aggressive icon-only for actions with an approved glyph.
- Every icon-only control has a visible hover/focus tooltip, an accessible name, and a visible focus state.
- Text remains visible for analytical values, timestamps, selection counts where the number itself is data, confirmations, and other entries marked `reference`.
- Destructive actions use the danger base color, preserve the shared accent, and keep their confirmation requirement in metadata.
- Selected multi-fullscreen panels use the numbered four-corner glyph plus semantic green check.
- Future transport actions such as rewind and fast-forward remain `planned` until product behavior exists.
- Tooltips supplement accessible names; they never replace them.

## Generation and drift validation

`scripts/build-icon-reference.mjs` imports the registry and supports two modes:

- default: regenerate the HTML atlas and Markdown specification;
- `--check`: generate both in memory and fail if tracked artifacts differ.

Focused validation also checks:

- unique icon and interaction IDs;
- every interaction references an existing icon when its presentation uses one;
- every icon-only interaction has tooltip and accessible-label text;
- destructive interactions declare the destructive tone;
- every atlas group references a known interaction;
- SVG fragments use only approved tags and attributes;
- application-owned inline SVG does not reappear outside the canonical `SimExIcon` renderer;
- every application `SimExIcon` or `IconControl` reference resolves to the registry.

`package.json` exposes `icons:build` and `icons:check`. The existing full test and E2E cadence remains unchanged; only the focused icon-language check runs during this implementation. The normal production build performs the inexpensive drift check before compiling so stale generated references cannot ship.

## Error handling

- Unknown dynamic icon IDs render the registered `unknown` glyph; static application references are caught by focused validation before shipping.
- Registry validation reports every invalid entry in one run rather than failing at the first typo.
- Generated-file drift reports the exact regeneration command.
- Unknown interaction IDs fail with a precise component error because they would otherwise lose their accessible name and tooltip.

## Performance constraints

- No network requests and no external icon dependency.
- No runtime registry parsing, document generation, or filesystem access.
- Registry imports are static; the complete approved glyph catalogue adds only project-owned SVG fragment strings and no executable dependency.
- `SimExIcon` and `IconControl` are memoized, and SVG fragments contain no scripts, IDs, filters, or external references.
- Documentation generation occurs only when requested or checked during a build.

## Non-goals

- Replacing ECharts’ internally generated graphics.
- Converting every remaining text control in one pass.
- Creating a general theme engine or component library.
- Adding an icon editor inside the dashboard.
- Supporting user-supplied SVG.
- Changing analytical chart contracts, data-source contracts, Quorum contracts, or bundle versioning. The single version 3 presentation field `globalStyles.iconAccent` is explicitly in scope.
- Adding per-icon, per-chart, or per-page accent overrides.

## Acceptance criteria

- The React application and both canonical reference artifacts import or derive from the same registry.
- The approved glyph geometry and accent semantics remain visually unchanged.
- Existing application-owned inline SVG controls in the selected integration surfaces use the canonical renderer.
- Hover/focus tooltips and accessible names are metadata-derived.
- Destructive and selected states follow the approved color rules.
- One version 3 dashboard-level base accent drives the same derived light/dark variants in the application and atlas.
- `pnpm.cmd icons:check` detects registry, reference-artifact, and application-reference drift.
- No broad application, unit, E2E, or build suite is run until the project’s pre-merge gate.
