# Icon Visual Corrections Design

## Goal

Correct the five glyphs rejected during visual review and require rendered-image inspection before the atlas is regenerated.

## Root causes

- `selectPanel1` changed from 7.5px to only 9px, while its check retained a partial-quadrant footprint. A subsequent custom-path experiment filled the quadrant but made the numerals look hand drawn and let the check collide visually with the frame.
- `save` accents a U-shaped notch, but the base disk outline still supplies the top edge in the base color.
- `chartMapTime` was reconstructed as detached map fragments rather than derived from the complete three-fold `chartMap` geometry.
- `eyedropper` uses a shelf-ended outline, a detached rectangular liquid insert, and a drop offset left of the tip.
- `rerank` currently uses the inverse L-shaped head from the approved 180-degree orientation.

## Corrected geometry

- **Selected-panel family:** use the dashboard's professional UI font stack (`Inter`, `Segoe UI`, sans-serif) at a bold weight for all four counts, centered in the upper-left quadrant. Use a shared lower-right accent check that remains large but is inset far enough that its stroke never overlaps the outer corner frame.
- **Save:** overlay the full upper rectangle—including its top edge—with the accent stroke while retaining the disk body and lower rectangle in the base color.
- **Chronological choropleth:** begin with the standard three-fold map coordinates. Remove only line segments mathematically inside the foreground clock and terminate every surviving map segment at the clock circumference so the clock reads as sitting over one continuous map.
- **Eyedropper:** use a rounded diagonal base-color bulb, tapered base-color glass outline, elongated tapered accent liquid contained within the glass, and an accent drop centered directly below the tip with visible separation.
- **Re-rank:** rotate the current L-shaped arrowhead 180 degrees in place, restoring the approved direction without changing the ranked lines or circular arc.

## Visual verification contract

Before touching generated references, render the canonical fragments into a local contact sheet using the production 24×24 view box, 1.8 stroke width, round joins/caps, and actual base/accent colors. Inspect each glyph enlarged and again at its normal application size. Iterate on source geometry until both views are balanced and legible.

After source inspection, regenerate the atlas and run only the focused icon drift/geometry checks. Do not run broad dashboard, build, integration, or E2E suites during this correction pass.

## Scope

Modify only `src/iconography/iconGlyphs.js` and generated icon references. Do not change interaction behavior, renderer architecture, SVG validation, chart behavior, tokens, or unrelated glyphs.
