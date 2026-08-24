---
sketch: 023
name: static-panels-build-view
question: "How should saved Free-text and Image panels preserve one canonical composition across Build, View, and fullscreen while exposing editing only in Build?"
status: Approved by V3 Design master, amended by user sketch review; disposable design evidence only
winner: "A — Content-led canonical panels with intent-revealed Image actions (selected)"
tags: [static-content, build, view, fullscreen, responsive, canonical-renderer]
---

# Sketch 023: Static panels in Build and View

## Design question

How should representative saved Free-text and Image panels fit the existing dashboard grid without inheriting chart-only source, CSV, time, or visualization chrome?

## How to view

Open `.planning/sketches/023-static-panels-build-view/index.html` in a browser.

## Variants

- **A: Content-led canonical panels — selected.** The panel frame stays consistent, while content uses its own typographic or image treatment. Image actions are hidden at rest and revealed without layout shift on pointer hover, keyboard focus within, or touch/tap; Audience remains passive.
- **B: Strong framed cards — rejected.** Additional inner cards clarify content boundaries but duplicate the dashboard panel frame and reduce useful content area.
- **C: Dense bulletin layout — rejected as a separate concept.** Its smaller rows, gaps, heading, and padding are density parameters within A rather than a materially different composition.

## Fixed contract

- Build, View, and fullscreen use the same canonical renderer, saved layout model, responsive rules, and maximum-width ownership.
- Build may transiently compress or reposition its canvas while authoring chrome is open. Opening never mutates saved layout; closing restores the prior Build canvas, selection, focus, and scroll. Exact View/Build rectangles and zero overlap are not required.
- Free text supports internal vertical overflow where necessary, never document-level horizontal overflow.
- Image authoring and viewer actions are hidden at rest. They reveal without layout shift on pointer hover, keyboard focus within the Image surface, or explicit touch/tap; the controls remain keyboard-discoverable transient actions in View and fullscreen. Build preview and passive contexts start at saved fit/crop, and Audience exposes no controls.
- Image failure actions are capability-specific: Build offers Retry/Replace/Edit; ordinary View and fullscreen each offer Retry plus a non-authoring explanation; Audience remains passive. The fullscreen sketch exposes its own Asset failure → Retry journey.
- Free text has no source/CSV/time/Scene/Present/Audience actions. Image has no CSV/time/Scene actions but is eligible for Present/Audience.

## Rejection record

- **B** is rejected because nested framing spends too much area on decoration and weakens equivalence with ordinary chart panels.
- **C** is rejected as a separate variant because the user found no meaningful compositional difference from A. Its compact spacing may be treated as a future density setting, not a competing layout direction.

Variant A was accepted without deviations by the V3 Design master at `e159db11593f784459e50f7707d93987fa996527`. During the interactive sketch review on 2026-08-24, the user retained A and explicitly required Image actions to be hidden at rest and revealed on hover; equivalent focus-within and touch/tap reveal is retained for keyboard and touch accessibility. This sketch is not production implementation.
