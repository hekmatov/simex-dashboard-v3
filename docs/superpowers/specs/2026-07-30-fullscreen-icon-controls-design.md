# Fullscreen icon controls

## Goal

Reduce fullscreen toolbar clutter while keeping layout and chart actions understandable.

## Design

- Remove the visible `Displayed charts` heading.
- Replace layout letters and abbreviations with small inline SVG diagrams that show the actual panel divisions.
- Preserve each layout button’s descriptive tooltip and accessible label.
- Replace `Close all` with an icon-only `×` button.
- Keep each chart’s numeric position badge.
- Replace `Prev`, `Next`, and `Close` with compact `‹`, `›`, and `×` buttons.
- Disabled reorder controls remain visible but subdued at the collection boundaries.

SVG layout diagrams are preferred over text glyphs because they distinguish all supported two-, three-, and four-chart arrangements at a glance.

## Verification

Automated checks remain deferred until visual approval.
