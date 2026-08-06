# Icon Geometry Refinements Design

## Goal

Refine seven approved 24×24 glyphs so their geometry is balanced, legible, and faithful to the established SimEx two-color icon language.

## Approach

Correct the existing vector fragments in `src/iconography/iconGlyphs.js`. This preserves the canonical metadata-driven system and keeps the live application, generated atlas, and generated specification aligned. Raster reference images are visual guidance only; they will not become application assets.

## Geometry contract

- **Selected panels:** enlarge the quadrant number and accent check so each clearly fills its upper-left and lower-right quadrant. Apply the same scale and placement to the complete one-through-four family.
- **Enter multi-fullscreen:** use four equal square outlines on a mathematically even two-by-two grid; retain the lower-right accent check.
- **Save changes:** retain the floppy-disk silhouette, replace the accent dot with an accent vertical slot, and accent the upper U-shaped notch. Keep the outer body and lower open rectangle in the base color.
- **Delta list:** move the internal row marks and change arrows up and left as one group while leaving the outer card fixed.
- **Chronological choropleth:** restore the visible lower portion of the third map fold, clipped geometrically before the foreground clock so no map stroke runs beneath it.
- **Re-rank:** reposition the existing arrowhead onto the circular path while preserving its intended direction and the ranked-line geometry.
- **Eyedropper:** use a conventional diagonal pipette silhouette based on the supplied reference. The liquid inside the tube and the detached sample drop use the accent color; the bulb, outline, and tip use the contextual base color.

## Scope boundaries

No interaction behavior, chart behavior, layout, color-token logic, renderer abstraction, or unrelated glyph changes are included. The generated atlas and Markdown specification will be regenerated from source rather than edited directly.

## Verification

Run the deterministic icon reference generator and its drift check. Inspect the affected source fragments and regenerated atlas entries at enlarged scale. Broad application, E2E, and build suites remain deferred under the project’s active-development verification policy.
