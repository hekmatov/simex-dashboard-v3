---
sketch: 024
name: image-audience-rendering
question: "How should Image panels join passive 16:9 Audience output while Free text remains excluded from Present?"
status: Proposed for V3 Design approval
winner: "A — Quiet canonical composition (recommended)"
tags: [static-content, image, present, audience, 16-9, passive]
---

# Sketch 024: Image in passive Audience output

## Design question

How should Present expose saved Image panels as non-temporal composition items while Audience renders them passively beside charts and never admits Free text?

## How to view

Open `.planning/sketches/024-image-audience-rendering/index.html` in a browser.

## Variants

- **A: Quiet canonical composition — recommended.** Image and chart occupy the existing count-valid grid with equal framing; shared context stays in the Audience header.
- **B: Strong panel frames — rejected.** Heavier labels make type identity explicit but reduce image and chart area at distance.
- **C: Editorial image focus — rejected.** A dominant image can be useful, but treating type as layout priority conflicts with the presenter's explicit layout choice.

## Fixed contract

- Free text never appears in Present selection, presentation messages, Audience recovery, or Audience DOM.
- Image is selectable directly in Present as a non-temporal item; it is not a Chrono Group or Scene member.
- Audience always uses saved crop, rotation, fit, and alt/decorative semantics. Viewer zoom/pan controls and Build actions are absent.
- Missing assets preserve the rest of the last-valid composition and show a passive bounded image-cell failure; they never introduce authoring actions.
- Image inclusion does not create a time context and does not change the active Scene/Chrono clock.

## Rejection record

- **B** is rejected because redundant chrome reduces legibility and useful content area at the 16:9 distance fixture.
- **C** is rejected because automatic image dominance would override the presenter's authored composition intent.

Final acceptance belongs to the V3 Design master task.
