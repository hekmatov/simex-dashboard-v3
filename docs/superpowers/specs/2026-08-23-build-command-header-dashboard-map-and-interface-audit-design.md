# Build Command Header, Dashboard Map, and Interface Audit Design

**Date:** 2026-08-23  
**Status:** User-approved design  
**Scope:** V3 Step 7 Build structure plus a systematic spacing, control-sizing, field, and action-arrangement review across dashboard surfaces

## Problem statement

Build commands currently live inside the narrow Build side panel. At a 1280 × 720 browser viewport, eight commands wrap into five arbitrary rows inside a roughly 343px-wide command region, `Finish Build` is clipped, and the Structure and Inspector regions are displaced far down the same scroll container. The wrapping is controlled by available width rather than by task hierarchy.

The Chrono Group content page exposes the same class of issue elsewhere: page navigation, creation, editing, duplication, removal, and modal closure compete for one header row. The action cluster wraps unpredictably, constrains the identity block, and produces uneven vertical whitespace. Earlier Chrono authoring findings also showed inconsistent field heights, text baselines, padding, and information-field alignment.

These are evidence of a dashboard-wide composition problem rather than isolated margin defects. The repair must establish explicit ownership and grouping for actions, then audit every surface against the same rules.

## Accepted structural contract

### Build command header

Build mode receives an always-present command header in normal document flow directly above the canonical chart canvas. It is independent of whether Dashboard Map is open. It must not overlay the canvas or rely on fixed-height offsets.

The header groups commands by user intent:

1. **Content:** `Add chart`, `Pages & sections`.
2. **Time:** `Chrono Studio`, `Scene Studio`.
3. **Layout draft:** layout/chart draft status, `Save layout`, `Discard layout`.
4. **Session:** `Reset`, with `Finish Build` as the primary completion action.

Whole command groups may wrap at responsive breakpoints. Individual buttons must not form accidental rows based only on remaining inline space. The default rhythm is 8px between controls inside a group and 16px between groups. Buttons use the established 44px control height unless a documented compact-control exception applies.

Suspended-draft, recovery, and validation messages occupy a separate status rail. They do not interrupt the primary command order. DOM order and keyboard order match the visual order.

### Dashboard Map

The current Build panel is renamed **Dashboard map**. The application-level trigger, panel heading, accessible name, controlled-region ID, tests, and documentation use that name.

Dashboard Map retains:

- the Page/Section/chart structure tree;
- the selected-target Inspector and structural commands;
- selection and focus coordination with the canonical canvas;
- the accepted transient Build canvas-compression behavior.

Dashboard Map removes:

- the Build command area, because those commands move to the Build command header;
- the Chrono Group summary/list at the bottom of the structure tree;
- obsolete selectors and Unit Orbit anchors that reference the retired command location.

Structure and Inspector receive explicit region ownership. At widths where stacking makes the panel excessively long, they use a clear region switch rather than placing both at distant positions in one scroll sequence. Closing and reopening Dashboard Map preserves the selected dashboard target and usable canvas context.

### Application command crown

The Build-mode crown retains `Dashboard look` and replaces `Build panel` with `Dashboard map`. The redundant `Chrono Groups` shortcut is removed; `Chrono Studio` in the Build command header is the single library entry point for Chrono Groups.

### Chrono Group content-page composition

The Chrono Group content page uses distinct action ownership:

- page navigation owns `Back to Chrono Studio`;
- contextual primary actions own `Edit` and `Create Scene`;
- item-management actions own `Duplicate` and `Remove`;
- the hosting auxiliary surface owns `Close`.

These groups must not compete for the same undifferentiated flex row. At narrower widths, groups stack as units while retaining hierarchy and 44px targets. `Remove` remains visually and semantically destructive. The identity block keeps sufficient width for the group name and period metadata.

## Systematic interface review

The review covers all live dashboard surfaces, including:

1. application frame, mode navigation, command crown, Page tabs, and footer;
2. View dashboard canvas, chart headers, tooltips, exploration, comparison, Collection, and fullscreen;
3. Build command header, Dashboard Map, structure tree, Inspector, Context Shelf, and Unit Orbit;
4. Dashboard Look;
5. New Chart wizard and chart-edit surfaces;
6. Pages & Sections, Scenario Passport, structural dialogs, and recovery states;
7. Chrono Studio library, Chrono Group content, and Chrono Group editor;
8. Scene Studio library, Scene content, Scene editor, ledgers, and twin canvases;
9. Time Content, availability information, and Chrono View/playback controls;
10. transient drawers, dialogs, sheets, toasts, warnings, empty states, and failure states;
11. Present and Audience only as review findings where Step 8 owns the repair.

### Review dimensions

Every action cluster is assessed for:

- functional owner and task grouping;
- primary, secondary, navigation, destructive, and recovery hierarchy;
- target height, target width, adjacent spacing, and density;
- alignment, wrapping, clipping, overflow, and scroll reachability;
- tab order, focus visibility, accessible name, and disabled-state meaning;
- responsive behavior at the material viewport and state.

Every form and information region is assessed for:

- labels, inputs, text areas, selects, numeric fields, checkboxes, and radio groups;
- read-only information fields, summaries, metadata, status rows, and proof/evidence fields;
- label/value alignment and text baselines;
- field height, internal padding, width, and multiline behavior;
- spacing between labels, controls, descriptions, validation, and recovery messages;
- logical field grouping and scan order;
- responsive stacking without irregular baselines or oversized full-row controls.

The earlier Chrono editor alignment failure is a named regression case. It requires browser geometry or interaction evidence; a test that merely finds field labels is insufficient.

### Material viewports and states

The default evidence set is limited to decisions that can change with viewport or state:

- 1280 × 720 desktop;
- 768 × 1024 tablet;
- 390 × 844 touch/mobile;
- clean, dirty, validation, recovery, empty, populated, and open-transient states only where material.

### Review output

The audit produces a dated `UI-REVIEW.md` that records, for each finding:

- surface and production owner;
- observed evidence;
- severity and user impact;
- proposed control or field arrangement;
- material viewport/state;
- cheapest deterministic acceptance check;
- browser task or screenshot/geometry evidence;
- Step 7 repair status or explicitly deferred Step 8 ownership.

Implemented changes and audit-only recommendations are clearly distinguished. A surface is not reported as corrected solely because markup exists or a screenshot was captured.

## Implementation architecture

`BuildWorkspace` remains the state and draft-coordination owner but is decomposed into two visible regions:

- a normal-flow Build command header passed through `DashboardRenderer` and `DashboardModeWorkspace` into `CanonicalDashboardFrame` before dashboard content;
- the fixed/transient Dashboard Map containing structure and Inspector regions.

This avoids positioning the command area outside its inert panel with CSS and avoids lifting draft state into the application shell. Auxiliary authoring surfaces remain portaled and continue to use the existing single V3 dashboard-content truth.

Tests must prove the live application imports and renders the command header, the Dashboard Map trigger controls only the map, and opening/closing the map does not relocate or disable Build commands. Existing draft, restoration, storage, and canvas contracts remain binding.

## Verification strategy

The implementation uses test-driven vertical slices:

1. live command ownership and accessible naming;
2. responsive command grouping and Dashboard Map behavior;
3. structure/Inspector reachability and removal of the Chrono summary;
4. Chrono Group content-page composition;
5. systematic audit and prioritized follow-up slices.

Each slice uses the cheapest focused semantic and composition check, followed by the representative browser task when geometry or responsive behavior is part of the decision. The production build runs after the affected slices pass. Existing unrelated dirty and untracked files are preserved.

## Boundaries

- Do not implement the Step 8 Present/Audience redesign through this work.
- Do not alter saved dashboard layout merely by opening authoring chrome.
- Do not duplicate Build, temporal, or dashboard state between shells.
- Do not introduce a new visual direction; use the accepted V3 design language and tokens.
- Do not report Step 7 master acceptance; submit the resulting work for master review.
