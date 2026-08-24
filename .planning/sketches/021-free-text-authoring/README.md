---
sketch: 021
name: free-text-authoring
question: "How should a separate Add static content workflow balance Free-text QMD source, validation, and production-equivalent live preview without entering the chart wizard?"
status: Approved by V3 Design master; disposable design evidence only
winner: "A — Split Source + Production Preview (recommended)"
tags: [static-content, free-text, qmd, live-preview, build, accessibility]
---

# Sketch 021: Free-text authoring

## Design question

How should a builder author safe portable QMD while seeing the exact sanitized renderer that Build, View, and fullscreen will use?

## How to view

Open `.planning/sketches/021-free-text-authoring/index.html` in a browser.

## Fixed contract

- Preserve the existing six-stage **Add chart** workflow unchanged.
- Use a separate four-stage **Add static content** workflow: Destination, Content type, Content, Preview and add.
- Free text never exposes CSV, data roles, preparation, time, Scene, Present, or Audience controls.
- The preview calls the same future production render boundary conceptually; this disposable sketch labels its approximation honestly.
- The saved panel and its inline content source form one dirty, reset, cancel, and commit unit. Unsaved authoring is application-session-only, matching chart creation; reload restores only the last saved panel/source pair.
- Invalid source preserves a separately versioned last-valid preview and marks it stale; blocking validation disables progress to a successful final Add.
- At the accepted narrow breakpoint, Variant A becomes mutually exclusive Source and Preview tabs while preserving the draft, validation, selected tab, and focus context.
- Dirty Cancel requires Keep editing or Discard. Keep editing preserves the complete draft/focus; Discard restores the last saved panel/source pair.
- Raw HTML, scripts, iframes, executable cells, extensions, widgets, and remote embedded media are rejected or rendered as inert source text according to the specification.

## Variants

- **A: Split Source + Production Preview — recommended.** Stable source/preview columns when wide and Source/Preview tabs when narrow. Validation is adjacent to source; invalid source retains a visibly stale last-valid preview.
- **B: Preview-first Studio — rejected.** A large preview with a narrower source inspector favors reading but makes long-source editing and diagnostics cramped.
- **C: Focus Tabs — rejected.** Source and preview each receive full width, but the author cannot continuously compare the exact result with the current source.

## What to compare

- Whether source and rendered truth can be compared without implying two rendering pipelines.
- Whether validation is noticeable without interrupting typing or moving focus.
- Whether long tables, URLs, code, math, callouts, and footnotes remain usable at supported tablet widths.
- Whether Save, dirty Cancel, Reset, and the application-session-only boundary have unambiguous scope.

## Rejection record

- **B** is rejected because the narrow source column weakens the primary authoring action and makes line-oriented diagnostics harder to repair.
- **C** is rejected because hiding either source or preview makes equivalence checking slower and increases the chance of saving without seeing the rendered consequence.

Both remain interactive comparison evidence. Variant A was accepted without deviations by the V3 Design master at `e159db11593f784459e50f7707d93987fa996527`; this sketch is not production implementation.
