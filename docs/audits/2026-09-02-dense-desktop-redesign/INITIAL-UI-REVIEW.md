# Initial UI Review — Dense Desktop Redesign

**Review date:** 2026-09-02  
**Baseline:** `public/main` before the dense-desktop implementation  
**Contract:** [`2026-09-02-dense-desktop-visual-audit-redesign.md`](../../superpowers/specs/2026-09-02-dense-desktop-visual-audit-redesign.md)

## Baseline judgement

The dashboard content and workflow model were sound, but the visual system read as a touch-first, spacious application rather than a dense desktop operations dashboard. The most important problems were systemic: an inherited 44px minimum shaped ordinary controls, choice glyphs and labels did not share a reliable row geometry, command areas consumed too much vertical space, and several authoring surfaces spent width on competing horizontal clusters while leaving usable whitespace elsewhere.

This is a visual layout and human-visible semantics review. It is not an accessibility audit. Keyboard navigation, focus presentation, tab order, ARIA, screen-reader behavior, touch-target sizing, zoom/reflow, and assistive-technology grading are explicitly outside the programme.

## Before measurements

These measurements were taken manually from the pre-implementation dashboard and are the authoritative baseline. The executable audit harness was built while implementation was already in progress; its early screenshots therefore validate the pipeline/current state and are not represented as before evidence.

| Baseline observation | Measured evidence | Priority | Design consequence |
|---|---:|---:|---|
| Ordinary desktop controls inherited a touch-sized minimum | 44px | P1 | Build, Present, drawers, menus, and dialogs accumulated excess height and weak information density. |
| Checkbox/radio glyphs were oversized | 20px | P1 | Choice rows looked visually heavier than neighboring labels and ordinary fields. |
| Generated sibling-label choices were vertically misaligned | 9px centreline difference | P1 | The glyph appeared detached from its label; the defect repeated in generated authoring forms. |
| Authoring titles repeated field names | `Axes` and `Labels` appeared as both section title and field legend | P1 | Hierarchy was noisy and scanning required parsing duplicate labels. |
| The Build command crown and drawers used oversized rows | 44px-derived controls and tall stacked chrome | P1 | The primary canvas started too low and transient workspaces occupied more area than their tasks required. |
| Horizontal task clusters wrapped or crowded while adjacent space remained unused | observed in authoring, source, and Present arrangements | P1 | Related tasks did not form deliberate stacks or balanced grids. |
| Local padding and gaps used many unrelated values | mixed legacy spacing | P2 | Surfaces felt individually tuned rather than governed by one desktop rhythm. |

No baseline P0 was identified: the dashboard remained operable, but the repeated P1 patterns materially weakened desktop density, alignment, hierarchy, and scanning speed.

## Approved redesign contract

The redesign adopted a role-based scale:

| Role | Target |
|---|---:|
| Choice glyph | 16px |
| Utility/icon control | 24px |
| Compact action/menu/choice row | 28px |
| Standard field or ordinary action | 32px |
| Prominent/destructive action and command-crown row | 36px |

The shared spacing scale is `2 / 4 / 8 / 12 / 16 / 24 / 32px`. Choice rows use a 16px glyph, 28px row, 8px glyph-to-copy gap, no more than 1px single-line centreline difference, first-line alignment for multiline labels, and helper/error copy beginning in the text column.

Operational contrast remains part of the design programme because users must distinguish selected, inactive, warning, destructive, and primary states quickly. Human-visible semantics also remain binding: visible labels, action meaning, grouping, title hierarchy, icon meaning, chart units, state distinction, and destructive-action clarity. Neither consideration changes the approved size scale or reintroduces excluded keyboard/focus/assistive checks.

## Repair order established from the baseline

1. Replace the blanket 44px minimum with shared role tokens and typography.
2. Normalize choice geometry and generated authoring forms.
3. Remove repeated titles and separate identity/type/footprint composition in chart authoring.
4. Densify command crowns, drawers, dialogs, source workspaces, temporal/scene editors, and Present controls.
5. Gate Build and Present below 1024px while keeping their state mounted behind the unsupported-mode notice.
6. Audit every registered surface through an executable inventory, then retain only evidence-backed P2 residuals.

## Baseline evidence boundary

There is intentionally no synthetic “before” screenshot set. The final audit uses an immutable 71-entry manifest and is documented in [`FINAL-UI-REVIEW.md`](FINAL-UI-REVIEW.md), [`SCREENSHOT-MANIFEST.md`](SCREENSHOT-MANIFEST.md), and [`SURFACE-INVENTORY.md`](SURFACE-INVENTORY.md). This separation prevents post-implementation screenshots from being mislabeled as baseline evidence.
