# Dense Desktop Visual Audit and Redesign Contract

**Date:** 2026-09-02  
**Status:** User-approved; implementation authorized  
**Scope:** Complete visual audit and systemic redesign of the live SimEx dashboard

## Product direction

SimEx is a dense desktop operations dashboard. Build and Present are desktop workspaces. They are not touch-first or mobile-responsive products. View may receive a separate, purpose-built mobile design in the future, but that future work must not constrain the desktop system. Audience is a separate room-display surface.

The redesign replaces the blanket 44px interaction rule with a role-based desktop scale. It reduces vertical and horizontal waste, aligns repeated controls, converts crowded horizontal arrangements into deliberate stacks, and removes redundant headings without changing dashboard data, persistence, chart behavior, or workflow ownership.

## Explicit exclusions

The visual contract does not assess or preserve:

- keyboard navigation, shortcuts, or tab order;
- focus visibility, focus rings, focus containment, or focus-obscuration geometry;
- screen-reader order, ARIA landmarks, accessible names, or other machine semantics;
- touch-first target sizing;
- 200% zoom/reflow behavior;
- responsive Build or Present workspaces below the desktop support boundary; or
- a mobile View design.

Existing runtime behavior in those areas is outside this design programme and cannot justify larger controls, greater spacing, or a different composition.

## Dense desktop scale

| Role | Contract |
|---|---:|
| Checkbox/radio glyph | 16px |
| Utility, icon, and compact menu control | 24px |
| Compact text action, menu row, and choice row | 28px |
| Standard input, select, and ordinary action | 32px |
| Prominent or destructive action | 36px |
| Command-crown row | 36px |
| Control text | 13px / 18px |
| Body text | 14px / 20px |
| Label/helper text | 12px / 16px |

Allowed size variance is ±2px where border geometry or native rendering requires it. A larger control is a defect when its role does not justify the extra height. A smaller control is a defect when its label, state, or pointer acquisition becomes unreliable.

The spacing scale is `2, 4, 8, 12, 16, 24, 32px` with these role aliases:

- label to control: 4px;
- checkbox/radio glyph to label: 8px;
- controls inside one task group: 8px;
- section and form-group separation: 12px;
- panel padding: 12px;
- dialog body padding: 16px;
- major-region separation: 24px.

Existing colour profiles and radius choices remain unchanged in this redesign so density and composition can be evaluated independently from brand styling.

## Choice-control geometry

Checkbox and radio rows use one shared visual arrangement:

- 16px glyph;
- 28px minimum row;
- 8px column gap;
- glyph and single-line text centre lines differ by no more than 1px;
- multiline labels align the glyph with the first text line; and
- helper, validation, and recovery text begins in the text column.

The contract applies to generated chart fields, Dashboard Look, Present, Source Content, static-content editors, Scenario Passport, deletion acknowledgements, and temporal/scene editors.

## Composition rules

1. One region has one visible title. A subtitle adds scope or instruction and never repeats the title.
2. A section containing one identically named structured field renders one heading, not a section heading plus a duplicate legend.
3. Same-role controls use the same height and internal padding across surfaces.
4. Controls are grouped by task ownership. Whole groups stack; individual controls do not wrap into accidental rows.
5. Horizontal clusters that are crowded while adjacent whitespace remains unused are reorganized into compact vertical blocks or balanced grids.
6. Ordinary fields use available columns. Textareas, rich editors, preview canvases, diagnostic lists, and wide tables span the full width only when their content needs it.
7. Dense composition does not mean indiscriminate compression: labels, values, warnings, and state changes remain immediately readable.
8. Contrast is assessed as operational legibility and hierarchy, not as an accessibility programme. It must not change the approved density scale.
9. Human-visible semantics remain binding: labels, action meaning, grouping, title hierarchy, icon meaning, chart units, state distinction, and destructive-action clarity.

## Desktop support contract

| Viewport | Contract |
|---|---|
| Below 1024px | Build and Present are unavailable behind a hard mode gate. View is out of scope for mobile redesign. |
| 1024–1279px | Compact desktop pressure case. |
| 1280–1599px | Standard desktop design target. |
| 1600px and wider | Wide desktop; layouts use available space without stretching controls. |
| Audience | Separate large-display contract, sampled at 1280×720 and 1920×1080. |

The audit uses 1024×768, 1280×720, 1440×900, and 1920×1080 where the surface materially changes. Widths below 1024 are used only to verify the hard Build/Present gate, never to grade their internal composition.

## Complete-audit method

The executable surface manifest is the coverage authority. It includes every fixed top-level mode, every registered first-party dialog/drawer/popover/menu, every major authoring workspace, representative chart and content states, and the separate Audience and source-viewer surfaces.

For each manifest state, the audit records:

- surface ID, production owner, mode, state, viewport, appearance, and setup result;
- screenshot and root geometry;
- visible control role, bounding box, computed typography, padding, and gap;
- choice glyph/text alignment;
- repeated-role height variance;
- panel padding and repeated-gap rhythm;
- overlap, viewport escape, clipped content, and unintended scroll overflow;
- accidental wrapping and stranded whitespace beside crowded groups;
- repeated title/subtitle/legend text;
- visible state and operational-contrast concerns; and
- categories inspected with no issue, so absence of findings is auditable.

The collector contains no keyboard, tab-order, focus, focus-ring, or assistive-technology checks.

## Finding model

- **P0:** blocks, loses, or makes a representative desktop task unusable.
- **P1:** systemic density, hierarchy, clipping, alignment, semantic, or state problem affecting multiple controls or an important surface.
- **P2:** localized inconsistency with a clear production owner.

Every finding names its surface, evidence, systemic owner, proposed arrangement, and cheapest reliable recheck. Recommendations are ordered by propagation:

1. shared tokens and grammar;
2. shared choice/form primitives;
3. shared dialog and command composition;
4. surface families; and
5. isolated polish.

## Acceptance

The redesign is ready for user review when:

- the manifest accounts for all named surface families and transient owners;
- the initial and final audit reports distinguish measured findings from human judgement;
- the blanket 44px control rule no longer drives desktop geometry;
- role-based sizes and spacing are visibly consistent on sampled surfaces;
- checkbox/radio rows meet the shared alignment contract;
- duplicate section/field headings are removed;
- the full chart editor no longer crowds identity, type, and footprint into one competing row;
- Build and Present expose only the unsupported-mode gate below 1024px;
- no P0 or unresolved systemic P1 visual finding remains in the final candidate;
- representative 1024, 1280, 1440, 1920, and Audience states have final screenshots; and
- the isolated worktree is served at a stable local URL for external-browser review.

