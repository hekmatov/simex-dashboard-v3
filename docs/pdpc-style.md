# PDPC style

PDPC is a selectable visual style (`pdpc`) and colour profile (`pdpc/brand`). It inherits Ledger geometry and surface treatment. Existing dashboard content and default selections are unchanged.

The only font-family style tokens are `--simex-style-body-font` and `--simex-style-heading-font`. CSS, text boxes, controls, tables and icon text reference these tokens. The chart renderer resolves them from computed styles before drawing, including rich labels, tooltips, legend pagination and custom graphics. Numeric labels use the heading token; code and other supporting copy use the body token. The internal chart adapter's `dataFont` property reads the heading token and does not introduce another style token.

PDPC assigns the same family stack to both tokens: Avenir, Avenir Next, Calibri, then the bundled SimEx Inter. Headings use weight 900. Font names belong in the JavaScript style definition, not component CSS. Avenir font files were not supplied and are not distributed by this change. Calibri is available on the development machine; other systems fall back as needed. Text embedded in raster images cannot respond to CSS tokens. Mathematical notation retains the existing specialised KaTeX glyph renderer.

Ledger retains its Inter/Georgia pairing. Humanist retains its text/display pairing. Instrument now uses its heading family for numeric text instead of a third monospace family. The former data and monospace CSS tokens have been removed rather than retained as aliases.

The palette follows the explicit hexadecimal values in page 1 of `PDPC_STYLEGUIDE-1.pdf`: navy `#253162`, green `#258161`, cyan `#139cd8`, red `#d72628` and lavender `#8d88ad`. The guide's lavender RGB and hex specifications disagree; this profile follows the printed hex and swatch. Dark appearance uses lighter tints. Small text uses darker semantic colours for contrast. The sixth chart colour is a supplementary ochre.

The attached scenario bundle is context only. The fictional Eldoria CSV and proposed section copy are delivered separately under `exports/eldoria/`.

Development baseline: `5457fc14e982c4a7f2b97815c3e6d2c9150c3740`, verified against refreshed `origin/main` and `public/main` on 2026-09-06. Work is isolated on `codex/pdpc-profile`; no merge or deployment is included.

Validation: 148 focused tests passed across PDPC/theme resolution, style projection, authored typography, chart rendering, visual contracts and Free Text rendering. Browser inspection of light and dark socio-economic View found one computed font-family stack across 67 visible text elements; canvas text projection was checked by the chart renderer tests. The CSV parsed as six numeric rows through the dashboard CSV reader. `git diff --check` passed and the diff under `public/` is empty. Full release gates were not run for this development change.
