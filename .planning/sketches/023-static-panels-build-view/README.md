---
sketch: 023
name: static-panels-build-view
question: "How should saved Free-text and Image panels preserve one canonical composition across Build, View, and fullscreen while exposing editing only in Build?"
status: Approved by V3 Design master; disposable design evidence only
winner: "A — Content-led canonical panels (recommended)"
tags: [static-content, build, view, fullscreen, responsive, canonical-renderer]
---

# Sketch 023: Static panels in Build and View

## Design question

How should representative saved Free-text and Image panels fit the existing dashboard grid without inheriting chart-only source, CSV, time, or visualization chrome?

## How to view

Open `.planning/sketches/023-static-panels-build-view/index.html` in a browser.

## Variants

- **A: Content-led canonical panels — recommended.** The panel frame stays consistent, while content uses its own typographic or image treatment. Build adds only the standard selection/edit rail.
- **B: Strong framed cards — rejected.** Additional inner cards clarify content boundaries but duplicate the dashboard panel frame and reduce useful content area.
- **C: Dense bulletin layout — rejected.** Compact hierarchy suits operational lists but makes long-form QMD and image inspection feel secondary.

## Fixed contract

- Build, View, and fullscreen use the same canonical renderer, saved layout model, responsive rules, and maximum-width ownership.
- Build may transiently compress or reposition its canvas while authoring chrome is open. Opening never mutates saved layout; closing restores the prior Build canvas, selection, focus, and scroll. Exact View/Build rectangles and zero overlap are not required.
- Free text supports internal vertical overflow where necessary, never document-level horizontal overflow.
- Image viewer zoom, pan, and Reset view are keyboard-discoverable transient controls in View and fullscreen. Build preview and passive contexts start at saved fit/crop.
- Image failure actions are capability-specific: Build offers Retry/Replace/Edit; ordinary View and fullscreen each offer Retry plus a non-authoring explanation; Audience remains passive. The fullscreen sketch exposes its own Asset failure → Retry journey.
- Free text has no source/CSV/time/Scene/Present/Audience actions. Image has no CSV/time/Scene actions but is eligible for Present/Audience.

## Rejection record

- **B** is rejected because nested framing spends too much area on decoration and weakens equivalence with ordinary chart panels.
- **C** is rejected because the compression changes the reading hierarchy and makes static content feel like metadata rather than first-class dashboard content.

Variant A was accepted without deviations by the V3 Design master at `e159db11593f784459e50f7707d93987fa996527`; this sketch is not production implementation.
