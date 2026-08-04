# Icon Language Corrections Design

## Goal

Correct the named icon-language regressions in the shared catalogue so the live application, generated atlas, and generated specification continue to use one visual authority.

## Scope

This pass changes only the icon catalogue, SVG glyph registry, deterministic reference generator, focused icon tests, and generated reference files. It does not broaden the current live-icon migration, alter dashboard data behavior, or introduce an SVG factory framework.

## Root causes

### Stale accent swatches

The atlas renders each token swatch with a generated inline color. Changing the primary accent updates the root CSS variables and hexadecimal labels, but not those inline swatch colors. The fix binds the primary, on-light, and on-dark swatches directly to their live CSS variables.

The shared derivation function also alters every custom color by at least ten percent before checking contrast. The function will first test the selected color itself and preserve it when it already meets the 4.5:1 contextual contrast target. Colors that fail still use the existing dependency-free adjustment toward black or white.

### Selected-panel family

The selected-panel glyphs were promoted with a `success-fill` circle and a white check. The generated atlas did not style `success-fill`, so the circle degraded to a base-color outline and the white check disappeared on the light canvas. That implementation also contradicted the approved visual: the check, not a circular badge, is the semantic accent.

All four `selectPanel1` through `selectPanel4` glyphs will retain the corner frame and count, remove the circle, and use one accent-colored check in the lower-right corner.

## Interaction presentation contract

The existing two render modes will be made literal:

- `icon` renders only the glyph and exposes its wording through the accessible label and hover/focus tooltip.
- `text` renders only visible text or data and does not add a decorative glyph.

Consequences for the requested controls:

- `panel.hold-ctrl-while-scrolling-to-zoom` remains text-only.
- `editor.save-changes` and `editor.reset-changes` become icon-only.
- `playback.playback-speed` remains text-only, displays `1×`, and retains `Playback speed · 1×` as its descriptive tooltip. Runtime values can replace `1` without needing a new pictogram.
- `fullscreen.selection-count` becomes an icon-only collection-status glyph rather than reusing a selected-panel action glyph.

## Glyph corrections

The shared registry will receive the following focused changes:

- `periodic`: rotate the existing arrowhead 180 degrees around its present center without moving the circular path.
- `rerank`: separate the arrowhead from the circular path and rotate only the head 180 degrees in place.
- `chartMapTime`: give the clock a larger foreground footprint and shorten the map geometry so no map line continues under the clock.
- `install`: add a distinct package/tray-and-download glyph.
- `reportIssue`: add a distinct speech-bubble-and-exclamation glyph.
- `calendarTime`: distinguish synchronized-time selection from the retained `time` playback clock.
- `closeAll`: use four smaller close marks in a two-by-two arrangement.
- `selectionCount`: use a compact four-panel collection with three accented panels, distinct from an individual selected-panel action.
- `eyedropper`: replace the current abstract construction with a conventional diagonal pipette, bulb, and sample tip.

`shell.install`, `shell.report-an-issue`, `playback.choose-synchronized-time`, `fullscreen.close-all-fullscreen-charts`, and `fullscreen.selection-count` will point to their new distinct glyph IDs.

## Generated references

The HTML atlas and Markdown specification remain generated artifacts. No correction will be applied directly to either output. The generator will render the updated catalogue and glyphs, and drift validation will require both tracked files to match generation exactly.

## Focused verification

The icon-system test will verify observable contracts:

- readable custom accents are preserved in the applicable context;
- generated token swatches use live contextual variables;
- text-mode references contain no SVG glyph;
- the requested icon-only/text-only metadata is correct;
- duplicate semantic actions no longer reuse the same glyph IDs;
- selected-panel glyphs contain accent checks and no circular success badge;
- new glyph IDs resolve through the catalogue;
- generated references remain deterministic.

After the focused test and drift check pass, every affected glyph will be inspected in the generated atlas at normal browser zoom. No broad build, integration suite, or E2E suite is part of this active visual refinement pass.
