---
sketch: 009
name: shared-shell-and-product-chrome
question: "How should approved winners fit one coherent shell and final visual synthesis?"
status: Approved
winner: "A — Layered Command Crown"
tags: [shell, navigation, chrome, synthesis, modes, responsive]
---

# Sketch 009 — Shared shell and product chrome

## Decision boundary

This sketch decides the shared SimEx product shell and chrome only. The approved dashboard geometry, data, chart order, mode behavior, authoring interactions, Chrono placements, Present Live Sidecar, Audience output, visual styles, palettes, and state transitions are fixed inputs rather than competing ideas.

All three candidates use one identical fixture and state model. Switching shell variants, visual styles, or View / Build / Present must preserve the active page, time position, scroll position, draft state, Chrono state, and Present session. View and Build use exactly the same dashboard geometry; Build chrome must not resize or shift the canvas.

## Candidates

### A — Layered Command Crown (approved winner)

A slim SimEx and mode bar sits above a visible dashboard/page row, followed by an equal-height contextual strip in View and Build. This makes product, location, and mode context easiest to scan, at the cost of the most vertical chrome. Reject A if the added height materially crowds the dashboard at the review sizes.

### B — Navigation Ledger

A persistent desktop rail holds identity, modes, and utilities while dashboard/page context stays above the content. At narrower desktop/tablet sizes the rail becomes a top bar. This offers persistent orientation and vertical capacity, but spends horizontal space and may constrain Present. Reject B if the rail competes with chart or Live Sidecar width, or if the responsive transformation feels like a different product.

### C — Adaptive Command Bar

One compact top bar combines identity, modes, dashboard breadcrumb, page selection, and utilities; a separate invariant strip carries View/Build context. This maximizes canvas height, but increases control density and weakens page scanability. Reject C if page context becomes hard to find or the bar crowds at supported desktop/tablet widths.

## Fixed interaction fixture

The review fixture supports View, Build, and Present in every candidate. The representative task is to select a dashboard page, open and move Chrono between its two approved positions, enter Build without changing dashboard geometry, edit a selected chart through Unit Orbit, inspect a geometry-neutral authoring overlay, and enter/leave Present while retaining the same working session.

- Unit Orbit relates spatially to the selected panel and protected product chrome; unrelated charts do not participate in placement calculations.
- Present uses the approved Live Sidecar. Audience output remains product-chrome-free.
- The review rail is external to the product viewport and scrolls independently, so evaluation controls cannot alter product geometry.
- Applying Evidence Ledger, Humanist Standard, or Signal Instrument—and any approved palette—changes material treatment only. Shell structure and geometry remain invariant.

## Responsive boundary

Phone View is supported. At an exact viewport width of `<= 767px`, Build and Present are unsupported and show a persistent, non-dismissible notification banner above the product chrome with a direct switch to View. The banner does not discard or mutate preserved work. At `>= 768px`, all three modes remain available.

## Architecture fit

The candidates map to the existing AppFrame, ModeSwitcher, dashboard header/page navigation, View/Build contextual row, and Present workspace boundaries. This is an architecture-fit check, not authorization to refactor or change approved behavior. A stable shared shell should own mode and location context while mode workspaces own their approved tools and content.

## Approved decision

**A — Layered Command Crown** is the approved Sketch 009 winner. Its explicit product, location, and mode hierarchy proved easiest to scan, and its equal-height View/Build contextual strip preserves the approved dashboard start line and geometry. The additional vertical chrome is an accepted tradeoff.

B and C remain interactive as preserved alternatives. B was not selected because the persistent rail spends chart and Live Sidecar width and changes form at narrower sizes. C was not selected because combining identity, modes, breadcrumb, page selection, and utilities weakens page scanability and crowds the supported tablet range.
