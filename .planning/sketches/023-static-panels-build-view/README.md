---
sketch: 023
name: static-panels-build-view
question: "How should saved Free-text and Image panels preserve one canonical composition across Build, View, and fullscreen while exposing editing only in Build?"
status: Proposed for V3 Design approval
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

- Build, View, and fullscreen use the same content renderer and saved layout/transform state.
- Build may add selection and edit chrome without changing saved geometry or content composition.
- Free text supports internal vertical overflow where necessary, never document-level horizontal overflow.
- Image viewer zoom and pan are transient, active-surface state. Build preview and passive contexts start at saved fit/crop.
- Free text has no source/CSV/time/Scene/Present/Audience actions. Image has no CSV/time/Scene actions but is eligible for Present/Audience.

## Rejection record

- **B** is rejected because nested framing spends too much area on decoration and weakens equivalence with ordinary chart panels.
- **C** is rejected because the compression changes the reading hierarchy and makes static content feel like metadata rather than first-class dashboard content.

Final acceptance belongs to the V3 Design master task.
