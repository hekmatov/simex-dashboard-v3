# Cross-Style Surface Audit and Audience Distance Amendment

**Date:** 2026-09-02

**Status:** User-approved; implementation authorized
**Parent contract:** `docs/superpowers/specs/2026-09-02-dense-desktop-visual-audit-redesign.md`

## Outcome

Every surface in the dense-desktop audit catalogue must visibly belong to Ledger, Humanist, or Instrument when that style is active, while preserving the catalogue's shared geometry and behavior. Audience output must be legible on a 75–85-inch 1920×1080 display from 4–6 metres without changing saved chart configuration or the moderator workspaces.

## Cross-style audit scope

The historical catalogue remains 71 journey/state entries: 64 executable journeys, six journey aliases, and one intentional exclusion. The retired Page Orbit slot is represented by the live Page command form, preserving that journey-accounting boundary. Evaluating those entries in all three styles produces 192 rendered journey dispositions and 21 mapped alias/exclusion dispositions, for 213 journey/style cells. This number does not claim complete visual-region coverage.

Owned visual regions are catalogued separately with production owners, boundaries, roles, material policies, lifecycles, and journey witnesses. Complete style accounting is generated from distinct reachable region variants across all three styles. An independent candidate census must reject significant unowned nested chrome even when its containing journey completed successfully.

The audit holds colour profile, appearance, data, state, viewport, and geometry constant while changing only dashboard style. Light appearance is the primary matrix. Dark appearance receives one representative sample per surface family to detect style-variable or portal leakage.

Each journey and region matrix cell is graded:

- `PASS`: the surface expresses its style signature and preserves shared geometry;
- `WEAK`: the signature is present but one or more role treatments are too faint;
- `GENERIC`: only common tokens are visible and the style is not identifiable;
- `LEAK`: a surface or portal inherits the wrong style or bypasses its theme root; or
- `MISSING`: the surface cannot be reached or classified.

The audit examines typography, contour, elevation, material treatment, divider/accent construction, semantic paint, portal inheritance, and geometry invariance. Colour-profile differences are not credited as style differences.

## Style signatures

### Ledger

- square or near-square contour;
- flat archival material with repeating ruling reserved for explicitly registered table/data-register regions;
- serif heading and data typography;
- dividers and register-like section construction;
- no decorative elevation.

### Humanist

- rounded contours;
- soft elevation and tonal grouping;
- approachable sans-serif typography;
- gentle surface separation rather than technical rails;
- restrained, non-mechanical accents.

### Instrument

- precise compact frames;
- technical accent rails, notches, or calibration marks;
- monospaced operational data;
- crisp separators and low-profile elevation;
- no ornamental softness.

Style differences are implemented through shared surface roles—shell, command bar, panel, editor, dialog, drawer, menu, status, table, and chart cell—not through one-off per-page decoration. Role describes operational function; material describes style paint. Ledger ruling is therefore an explicit `ledger-register` material on chart-table and Source Viewer table regions, never an inherited role default. Geometry, information hierarchy, and workflow behavior remain invariant across styles.

## Audience distance scale

Audience typography is count-aware and scoped only to `[data-display-surface="audience"]` plus its ECharts presentation payload.

| Role | 1–2 displayed items | 3–4 displayed items |
|---|---:|---:|
| Chart title | 28px | 24px |
| Description, provenance, legend, axes, series labels, table text | 18px | 16px |
| KPI/value emphasis | approximately 40px | approximately 34px |
| Target/gauge detail | approximately 36–40px | approximately 32–34px |

Associated legend symbols, axis-title measurement, grid gutters, line spacing, table rows, target labels, embedded charts, free-text content, image captions, empty states, and error states scale with the text. Label collision is resolved by auto-skipping or suppressing lower-priority labels; the implementation must not shrink below the count tier to force every label into view.

No root `transform`, `zoom`, or saved-chart mutation is permitted. Build, View, Present control surfaces, scene previews, and fullscreen editor output retain their existing chart scale.

## Explicit exclusions retained

Keyboard, focus, assistive-technology semantics, touch-first sizing, responsive Build/Present behavior, and mobile design remain outside the visual contract. Human-visible contrast and semantics remain binding because they communicate operational hierarchy, state, units, and action meaning.

## Verification boundary

During the current amendment batch, deterministic component, region-closure, style-material, and presentation-option tests are required. Browser/E2E capture, the 213-cell journey contact sheet, and generated region/style visual sign-off remain intentionally deferred until the user closes the amendment batch.
