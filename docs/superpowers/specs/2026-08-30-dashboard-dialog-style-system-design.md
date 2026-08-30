# Dashboard Dialog Style System

**Status:** Approved design direction; implementation pending

**Date:** 2026-08-30

**Scope:** Every wizard, workspace modal, confirmation prompt, recovery prompt, and utility dialog in the dashboard

## Context

The dashboard currently has a strong visual grammar, but dialog surfaces have evolved independently. The chart editor already uses much of the dashboard token system, while authoring, build, source-content, recovery, display, scene, and confirmation dialogs use a mixture of component-specific styling and generic browser-like controls.

The rich-text composer established the intended visual direction: dashboard typography, restrained surfaces, explicit selection states, compact controls, and clear content hierarchy. This design extends that direction to every dialog without changing any workflow behavior or data flow.

## Goals

- Give every dialog a consistent dashboard-native shell, hierarchy, spacing system, and action treatment.
- Reuse the existing `--simex-*` semantic tokens instead of introducing parallel colors, type scales, shadows, or radii.
- Preserve the distinct needs of multi-step wizards, focused workspaces, utility prompts, and destructive confirmations.
- Make dialog layouts responsive, keyboard-visible, and usable at narrow viewport widths.
- Migrate existing components incrementally while keeping their current component-specific classes and behavior intact.

## Non-goals

- Reworking wizard steps, validation rules, content models, navigation logic, or persistence.
- Replacing dialog implementations with a new modal library.
- Applying a global style to every element with `[role="dialog"]`; third-party and future dialogs must opt into the contract deliberately.
- Redesigning the underlying dashboard page, navigation, or non-dialog panels.
- Changing the already approved rich-text editor interaction model.

## In-scope surfaces

| Family | Known surfaces | Contract variant |
| --- | --- | --- |
| Static content | Add Text/Image wizard and rich-text authoring surface | Wizard |
| Charts | Chart creation wizard and chart editor | Wizard / workspace |
| Source content | Source Content workspace and content action dialog | Workspace / utility |
| Build | Layout creation, move, package review, delete content, and section structure dialogs | Utility / danger |
| Application shell | Recovery and restore-online-dashboard dialogs | Utility / danger where applicable |
| Display and time | Fullscreen display controls and scene observation editor | Workspace / utility |
| Confirmations | Existing confirmation dialogs | Utility / danger |

New first-party dialogs should adopt the same contract when created.

## Design approach

Create a shared, opt-in dashboard dialog contract. Existing dialog roots retain their current classes and receive a semantic contract class or data attribute. This provides one visual system without coupling business logic to CSS or relying on a broad role selector.

The contract will live in a focused stylesheet, `src/styles/dashboard-dialogs.css`, imported after the base dashboard style grammar so it can compose existing tokens and provide intentional dialog-level refinements. Component-specific styles remain responsible only for unique content layouts.

### Semantic contract

Dialog roots use the base class and one variant:

```text
dashboard-dialog
├── dashboard-dialog--wizard
├── dashboard-dialog--workspace
├── dashboard-dialog--utility
└── dashboard-dialog--danger
```

Optional size modifiers describe layout intent rather than component identity:

```text
dashboard-dialog--compact
dashboard-dialog--standard
dashboard-dialog--wide
dashboard-dialog--fullscreen
```

Structural regions provide predictable styling hooks:

```text
dashboard-dialog__header
dashboard-dialog__eyebrow
dashboard-dialog__title
dashboard-dialog__description
dashboard-dialog__progress
dashboard-dialog__body
dashboard-dialog__section
dashboard-dialog__footer
dashboard-dialog__actions
```

Existing classes such as `static-content-dialog`, `chart-wizard`, `source-content-workspace`, `build-move-dialog`, and `confirm-dialog` remain in place. The semantic classes are additive and do not become JavaScript selectors.

## Visual hierarchy

### Shell and backdrop

- The backdrop uses the existing dashboard overlay treatment and must maintain sufficient separation from the page beneath it.
- The shell uses the panel surface, strong border, dashboard panel radius, and shell shadow tokens.
- Compact utility dialogs remain visually lighter than authoring workspaces, but share the same border, typography, and action language.
- Wide and fullscreen workspaces may use the canvas surface internally so tools and editable content remain distinct from the outer shell.

### Header

- Eyebrows use the accent color and compact uppercase dashboard label treatment.
- Titles use the dashboard heading font and strong text token.
- Supporting descriptions use the body font and muted text token.
- Close controls are quiet icon buttons aligned with the title, with a visible hover and focus state.

### Wizard progress

- Multi-step flows expose a distinct progress/navigation region directly beneath the header.
- The current step uses the selected surface and selected border/text treatment.
- Completed and available steps remain clearly interactive; unavailable steps are visibly disabled without relying only on opacity.
- At narrow widths, steps wrap or become a horizontally scrollable, keyboard-accessible strip without forcing the dialog body to overflow.
- Utility dialogs omit this region entirely.

### Body and sections

- The body uses the dashboard spacing rhythm and groups related content into explicit sections.
- Section boundaries use subtle borders or alternate panel surfaces, not arbitrary box shadows.
- Labels, hints, validation messages, and empty states use a consistent type hierarchy.
- Inputs, selects, text areas, toggles, segmented choices, cards, and upload areas share the existing control radius, minimum target size, border, and focus tokens.
- Component-specific layouts such as footprint selectors, chart configuration panels, and source-content inspectors retain their functional geometry while inheriting the shared surface and control treatment.

### Footer and actions

- The footer is visually separated from the body with a subtle border and panel surface.
- The primary action appears once, at the trailing edge.
- Secondary navigation actions are adjacent to the primary action; cancellation or dismissal remains visually quieter.
- Destructive actions use the established danger semantics and never appear identical to the normal primary action.
- Narrow layouts may stack actions, with the primary action remaining easiest to reach and understand.

## Token mapping

The contract consumes existing semantic tokens rather than raw color or geometry values.

| Purpose | Existing token |
| --- | --- |
| Dialog shell | `--simex-surface-panel` |
| Interior section / toolbar | `--simex-surface-panel-alt` |
| Authoring canvas | `--simex-surface-canvas` |
| Backdrop context | `--simex-surface-outer` plus the established overlay treatment |
| Default boundary | `--simex-border-subtle` |
| Emphasized boundary | `--simex-border-strong` |
| Primary text | `--simex-text-strong` |
| Supporting text | `--simex-text-muted` |
| Accent labels and affordances | `--simex-accent` / `--simex-accent-soft` |
| Selected or active state | `--simex-selected` / `--simex-selected-soft` |
| Keyboard focus | `--simex-focus` / `--simex-component-focus-width` |
| Body, heading, and data type | `--simex-style-body-font`, `--simex-style-heading-font`, `--simex-style-data-font` |
| Control and shell geometry | `--simex-style-control-radius`, `--simex-style-panel-radius`, `--simex-style-surface-radius` |
| Elevation | `--simex-style-panel-shadow`, `--simex-style-shell-shadow` |
| Minimum interactive target | `--simex-control-min` |

If a required semantic state is genuinely absent, it should be added once to the dashboard token layer rather than defined locally in a dialog.

## Interaction and accessibility

- All interactive controls retain visible keyboard focus using the shared focus token.
- Icon-only controls include accessible names and do not depend on tooltips for meaning.
- Interactive targets meet the dashboard minimum control size and aim for a 44 × 44 pixel target where layout permits.
- Selected, current, invalid, disabled, and destructive states are communicated with more than color alone.
- Dialog headings remain programmatically associated with their dialogs, and descriptions are associated where present.
- Existing focus trapping, Escape handling, return-focus behavior, and validation announcements are preserved. Missing behavior discovered during migration is reported separately rather than silently bundled into styling work.
- Motion is restrained and respects reduced-motion preferences.

## Responsive behavior

- Compact dialogs remain centered and constrained to the viewport with safe outer gutters.
- Standard and wide dialogs use viewport-relative maximum dimensions; their bodies scroll internally while headers and action regions remain stable where the current component structure permits.
- Two-column content collapses to one column before controls become cramped.
- Toolbars wrap into additional rows without clipping controls.
- Tables and intentionally wide data regions receive their own overflow container; the full dialog must not create page-level horizontal scrolling.
- Fullscreen workspaces preserve a clear close/exit action and usable editor height on short viewports.

## Migration boundaries

1. Add the shared stylesheet and import it after the dashboard style grammar.
2. Add semantic contract classes to every known first-party dialog root and its structural regions while preserving existing classes.
3. Remove or narrow component-specific declarations only when the shared contract replaces them exactly.
4. Keep unique layout rules with their owning component stylesheet.
5. Replace raw visual values encountered within the migrated dialog boundary with the closest existing semantic token.
6. Do not alter handlers, state transitions, validation, persistence, or API calls as part of the styling migration.

This is an additive migration: a dialog becomes compliant when it opts into the contract, and unrelated surfaces remain unaffected.

## Verification strategy

Implementation verification should be proportional and targeted:

- Add a deterministic contract test that inventories the in-scope dialog roots and verifies each opts into a recognized dashboard-dialog variant.
- Retain and run existing behavior tests for any component whose markup changes.
- Run the nearest style or component tests during migration and the task-specific selection once on the final candidate.
- Build the application once after the final implementation candidate is ready.
- Perform one representative browser pass covering a multi-step wizard, an authoring workspace, a utility dialog, and a destructive confirmation at desktop and narrow widths.
- Confirm keyboard focus visibility, action hierarchy, internal scrolling, and absence of page-level horizontal overflow.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Shared selectors unintentionally alter non-dialog UI | Require explicit semantic opt-in and avoid broad role-based selectors. |
| Existing component CSS overrides the contract unpredictably | Import the contract after the base grammar, keep selectors low-specificity, and narrow legacy rules during each migration. |
| Large workspaces lose useful density | Preserve component-specific geometry and use the workspace/fullscreen variants rather than forcing utility-dialog spacing everywhere. |
| Styling changes break tests that depend on markup | Make classes additive, preserve accessible names and structural semantics, and update only assertions tied to the new contract. |
| Narrow screens overflow | Define internal scroll ownership and validate representative narrow layouts before completion. |

## Acceptance criteria

- Every in-scope first-party wizard and dialog explicitly adopts the shared dashboard dialog contract.
- Multi-step wizards consistently present header, progress, body, and footer regions.
- Single-step and confirmation dialogs use the same shell, typography, control, and action hierarchy without unnecessary progress UI.
- Surfaces, borders, text, focus, selection, radii, shadows, and control sizing use dashboard semantic tokens.
- No migrated dialog introduces raw visual values when an equivalent dashboard token exists.
- Existing workflows and data behavior remain unchanged.
- Representative dialogs are usable by keyboard and at narrow viewport widths, with no page-level horizontal overflow.
- The rich-text composer remains visually consistent with the approved sketch while participating in the shared dialog shell.
