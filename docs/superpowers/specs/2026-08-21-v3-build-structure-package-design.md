# V3 Build Structure and Dashboard Package Design

**Date:** 2026-08-21
**Status:** Approved
**Scope:** Build structure navigation, renaming, shared section density, and dashboard package import/export

## Purpose

Refine the V3 Build workspace so its hierarchy behaves like a professional tree navigator, cross-page selections always bring their targets into view before authoring opens, names can be edited directly from the hierarchy, shared section headings use content-responsive density, and dashboard packages can be imported and exported without silently losing unsaved authored content.

This design preserves the existing ownership boundaries:

- `App` remains the persisted dashboard and package owner.
- `DashboardRenderer` remains the Build selection, authoring-draft, and workspace transaction owner.
- `BuildWorkspace` and the shared crown receive projections and callbacks.
- The Structure tree owns local interaction presentation only.
- Dashboard appearance remains cosmetic state and does not become authored-content dirty state.

## Design References

- Carbon Tree View usage: <https://carbondesignsystem.com/components/tree-view/usage/>
- Carbon Tree View styling: <https://carbondesignsystem.com/components/tree-view/style/>
- Material UI spacing scale: <https://mui.com/material-ui/customization/spacing/>
- Material UI official dashboard template: <https://github.com/mui/material-ui/blob/master/docs/data/material/getting-started/templates/dashboard/Dashboard.tsx>

Carbon supplies the hierarchy, selection, caret, icon-alignment, and keyboard model. SimEx retains 44px activation targets because those are already part of the dashboard accessibility contract, even though Carbon supports visually denser tree rows. Material UI's 8px scale and official 16px dashboard rhythm inform the revised section spacing.

## Shared Section Density

Section headers remain content-height and have no fixed or minimum visual height.

- Shared padding is `10px 18px 8px`.
- A title that wraps grows only by its additional rendered line height.
- A present, non-empty description adds its own line height and a `4px` title-to-description gap.
- A missing description contributes neither height nor gap.
- The section-header border to the first panel is `16px`.
- Panel grid row and column gaps remain `16px`.
- The same geometry applies to View and Build.
- Build's 44px rename target must be layered without inflating the visible title measurement.

The three dashboard styles retain their accepted paint grammar. Only shared geometry changes.

## Structure Tree

### Hierarchy

The first visible level is Page. The redundant Scenario node is removed.

```text
Page
└── Section
    └── Chart
```

Time Groups remain a separate authored collection below the Page hierarchy and continue to expose Scene authoring from their inspector.

### Semantics

The Structure area follows the WAI-ARIA/Carbon tree model:

- One `tree` container.
- Page and Section branches are `treeitem` elements with `aria-expanded` and nested `group` elements.
- Charts are leaf `treeitem` elements.
- The selected item uses `aria-selected`.
- Arrow keys move through visible nodes and expand or collapse branches.
- Enter activates the focused node.
- F2 begins renaming for Page, Section, or Chart.
- Escape cancels renaming; Enter commits it.
- Focus remains in the tree after a rename completes or is cancelled.

### Visual anatomy

Every node uses the same alignment columns:

1. Caret for branches, or an equal-width spacer for leaves.
2. Small SimEx type icon.
3. Node label or inline rename input.

Icons distinguish Page, Section, and Chart with existing SimEx glyphs. Icon usage is consistent across every node to avoid label misalignment.

Node buttons have no box outline in their resting state. Selection is conveyed through a style-aware row fill or rail plus text/icon treatment, with a visible 3px keyboard focus treatment and a non-colour selection cue.

Branch connectors vary by style without changing geometry:

- **Evidence Ledger:** crisp one-pixel ledger lines and square elbows.
- **Humanist Standard:** softer subtle lines and gently rounded elbows.
- **Signal Instrument:** precise accent signal rails and angular terminals.

## Selection, Navigation, and Renaming

### Click timing

- A node press receives immediate pressed-state feedback.
- A node single-click schedules activation after 500ms.
- A second click inside the double-click interval cancels the scheduled activation.
- The double-click path navigates to and selects the target first, keeps it highlighted, and then opens its inline rename input.
- Caret activation never waits 500ms; it expands or collapses immediately and does not select the node.

### Single-click outcomes

- **Page:** navigate to the Page and select its node.
- **Section:** navigate to its Page if necessary, select it, then scroll the canonical Section into view.
- **Chart:** navigate to its Page if necessary, select it, scroll the canonical Chart into view, and open its Unit Orbit editor only after the destination has mounted.

### Renderer-owned selection transaction

All Build tree selections pass through one renderer-owned request rather than separately mutating selection and active Page state.

The transaction order is:

1. Classify whether the current authoring surface has genuinely dirty content.
2. If leaving a different dirty editor would discard authored work, keep the current target mounted and show the existing resolution reason.
3. Navigate to the destination Page.
4. Reconcile the destination selection after the Page is active.
5. Wait until the canonical Section or Chart element is mounted.
6. Scroll the element into view with reduced-motion-aware behavior.
7. Open Unit Orbit for a Chart selection.
8. Focus the selected tree node or inline rename field as appropriate.

This removes the existing race in which a Chart editor can open before its Page becomes active and then block the Page transition.

### Inline rename

Page, Section, and Chart names are edited directly in the selected tree row.

- Double-click or F2 enters rename.
- The existing label is selected for replacement.
- Enter commits a non-empty trimmed value.
- Escape restores the previous value.
- Blur commits a valid changed value and cancels an unchanged or empty value.
- A pending changed rename counts as unsaved authored content for import protection.

Page action controls are removed from the Build side panel. Existing Page tabs remain draggable for pointer reordering. A keyboard reorder command remains available without adding visible action buttons, satisfying the required non-drag alternative.

## Dirty-State Classification

Import protection is based on genuinely unsaved authored content, not whether a surface is merely open.

The following changed-but-unsaved states are dirty:

- Chart editor changes.
- Changed Add Chart wizard fields.
- Pending Page, Section, or Chart inline rename.
- Pending Page or Section content edits.
- Pending Time Group or Scene authoring.
- Pending Program, Scenario, or Updated-date metadata.

The following are not content-dirty:

- Opening an untouched Chart editor.
- Opening an untouched Add Chart wizard.
- Selecting or navigating between items.
- Expanding or collapsing tree branches.
- Dashboard style, appearance, color-profile, or palette changes.

Saved mutations, including completed Page reordering, do not remain dirty after their persistence transaction succeeds.

## Dashboard Package Controls

Build's command area gains style-aware **Import package** and **Export package** controls. They use existing SimEx import/export iconography with visible text labels.

### Import flow

1. The user activates Import package.
2. If authored content is dirty, show a first confirmation:
   > Unsaved changes to this dashboard will be lost.
3. Cancelling leaves every editor, draft, selection, and Page unchanged.
4. Confirming opens the file picker. If there is no dirty authored content, the picker opens immediately.
5. Read, parse, and validate the selected package without mutating the live dashboard.
6. Invalid packages show a bounded error and stop.
7. A valid package opens a second review dialog showing:
   - Package creation date and time.
   - Every imported Page.
   - Each Page's Sections.
   - Each Section's Panels/Charts.
8. A valid older package without creation metadata displays `Creation date unavailable`.
9. Cancelling the review preserves the current dashboard and drafts.
10. Load package atomically replaces the dashboard only after the second confirmation.
11. Successful replacement closes obsolete editors/wizards, resets Build selection to a valid Page, and reports completion through the existing operation-status channel.

### Export flow

- Export flushes pending Page, Section, Time Group, Scene, and dashboard-metadata edits before serialization.
- An actively changed Chart editor or Add Chart wizard must be saved or cancelled before export because those drafts are not yet part of the dashboard contract.
- Untouched authoring surfaces do not block export.
- The exported package includes the saved dashboard style and color profile.
- Cosmetic appearance changes never affect import-warning eligibility.

## Error and Cancellation Behaviour

- Selection failure leaves the current Page, selection, and draft mounted.
- Import parse or validation failure never mutates the dashboard.
- Package-load persistence failure leaves the current dashboard active and keeps the reviewed candidate available for retry or cancellation.
- Rename persistence failure restores the input with its pending value and presents a visible error.
- All errors use existing bounded Build or package-review error surfaces; no alerts are colour-only.
- Timers, observers, and pending scroll requests are cancelled when the tree unmounts or a newer selection supersedes them.

## Component Boundaries

- `BuildStructureRail`: tree rendering, expansion, focus, delayed-click arbitration, and inline rename presentation.
- `BuildWorkspace`: projects structure data and callbacks; owns no dashboard content or persistence.
- `DashboardRenderer`: selection transaction, canonical scrolling, authoring dirty registry, rename mutations, and package-action readiness.
- `App`: package parsing candidate, package replacement, persisted dashboard ownership, and import/export side effects.
- Package review component: pure candidate summary and confirmation UI.
- Shared dashboard section component/CSS: content-responsive heading geometry shared by View and Build.

## Accessibility and Motion

- All essential controls retain at least 44×44px activation targets.
- Keyboard focus remains a visible 3px treatment.
- Selected, expanded, dragging, dirty, and error states use non-colour cues.
- Tree keyboard behaviour follows Carbon/WAI-ARIA conventions.
- Page reordering has a keyboard alternative to dragging.
- Scroll-to-target uses instant movement when reduced motion is requested and restrained smooth movement otherwise.
- Inline inputs have explicit accessible names including item type and current name.

## Verification Strategy

Use TDD for each behavior and the cheapest check that can falsify it.

- Unit coverage for tree semantics, expansion, delayed single-click, double-click cancellation, selection-before-rename, keyboard rename, dirty classification, and package-summary generation.
- Focused browser coverage for cross-page Section/Chart selection, canonical scrolling, Unit Orbit ordering, and double-click rename.
- Focused browser coverage for conditional first import confirmation, second package-content review, cancellation preservation, and final replacement.
- Focused style checks for the three connector grammars and content-responsive header states.
- Existing exact View/Build geometry test after the shared spacing change.
- Production build and `git diff --check`.
- Staged-diff review before each atomic commit so the preserved user dirty boundary is never swept in.

## Atomic Delivery Slices

1. Shared content-responsive Section density.
2. Carbon-style Structure tree and style-specific branch grammar.
3. Renderer-owned cross-page selection and inline rename behavior.
4. Dirty-state classification and dashboard package controls/review.

## Out of Scope

- Replacing the V3 dashboard configuration/runtime contract.
- Moving persisted dashboard ownership out of `App`.
- A general file manager or package history browser.
- New chart, Time Group, or Scene authoring models beyond the access and dirty-state integration described here.
- Removing the protocol fields needed for existing dashboard or audience compatibility.

## Acceptance Criteria

- Section headers use `10px 18px 8px` padding and grow only with real title/description content.
- View and Build retain exact canonical chart-area geometry equality.
- Structure begins with Page and uses accessible Page/Section/Chart tree semantics, icons, carets, and style-specific connectors without resting box outlines.
- Single-click activates after 500ms; double-click cancels it, navigates/selects/highlights the target, then opens inline rename.
- Cross-page Section and Chart selection brings the target into view before Unit Orbit opens.
- Page action controls are absent; Page tabs remain draggable and keyboard reorderable.
- Import warns only for dirty authored content, never for cosmetic style/palette changes.
- Import review lists the creation timestamp and nested Page/Section/Panel contents before replacement.
- Export and import controls operate through existing ownership and persistence boundaries.
- No unrelated dirty work is staged or committed.
