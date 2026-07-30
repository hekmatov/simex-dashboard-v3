# Fullscreen Icon Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace verbose fullscreen controls with clear compact icons.

**Architecture:** `FullscreenDisplay.jsx` will render semantic SVG layout diagrams and glyph-based action buttons while preserving the existing display-controller actions. `styles.css` will provide consistent icon-button dimensions and visual states.

**Tech Stack:** React, JSX, inline SVG, CSS.

## Global Constraints

- Keep all existing accessible labels and descriptive tooltips.
- Do not change fullscreen layout or reorder behavior.
- Automated tests and builds remain deferred until visual approval.
- Runtime changes remain uncommitted.

---

### Task 1: Fullscreen toolbar icons

**Files:**
- Modify: `src/components/FullscreenDisplay.jsx`

**Interfaces:**
- Consumes: `multiLayoutOptions(count)` and `onDisplayAction`.
- Produces: `LayoutIcon({ layout })` and icon-only toolbar controls.

- [ ] Remove the visible `Displayed charts` heading.
- [ ] Return layout identifiers from `multiLayoutOptions` and render each through `LayoutIcon`.
- [ ] Draw solo, split, focus, and grid arrangements with an outer SVG rectangle and internal divider lines.
- [ ] Replace `Close all` text with `×` while retaining the full accessible label and tooltip.

### Task 2: Individual chart icons

**Files:**
- Modify: `src/components/FullscreenDisplay.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: existing manual reorder and manual close actions.
- Produces: compact `‹`, `›`, and `×` chart controls.

- [ ] Replace `Prev`, `Next`, and `Close` visible labels with glyphs.
- [ ] Preserve disabled boundary states, accessible labels, and tooltips.
- [ ] Give global and per-chart icon controls consistent square dimensions.

### Task 3: Visual handoff

**Files:**
- No code changes.

- [ ] Leave runtime changes uncommitted.
- [ ] Ask the user to inspect every supported multi-chart arrangement.
- [ ] Do not run automated verification until visual approval.
