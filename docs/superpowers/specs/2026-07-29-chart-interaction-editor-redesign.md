# Chart Interaction and Editor Redesign

Date: 2026-07-29  
Status: Approved design  
Target: SimEx Dashboard chart system v3

## Purpose

Reduce persistent visual clutter in chart panels, make source information available on demand, provide direct access to source CSV data, and replace the space-constrained editor sidebar with a focused preview-first overlay.

The implementation must remain schema-generated and chart-type-aware. Display behavior must be represented in declarative chart configuration rather than stored as disconnected UI state.

## Approved product decisions

- Chart descriptions are hidden by default for existing and newly created charts.
- Authors can enable a description per chart from the Appearance tab.
- The displayed source is a citation such as RIVM, WHO, or a municipality. It is not the CSV filename.
- Editing a citation changes only the selected chart by default.
- Authors can explicitly apply the citation to every chart sharing the same `sourceId`.
- The source CSV viewer displays the complete untransformed source dataset.
- The chart editor uses the approved preview-first modal layout.
- The fullscreen and source-information controls become compact hover/focus icons.
- The eyedropper runs directly from the current page without opening an intermediary popup.

## Chart configuration contract

Chart presentation gains two declarative settings:

```json
{
  "presentation": {
    "description": {
      "visible": false
    },
    "citation": {
      "label": "RIVM"
    }
  }
}
```

`presentation.description.visible` defaults to `false` when absent.

`presentation.citation.label` is an optional chart-specific override. Citation resolution follows this order:

1. Non-empty chart citation override
2. Data-source provenance label
3. Chart `sourceId`
4. `Unavailable`

Changing the citation does not rename or mutate the configured CSV source.

## Chart-panel interactions

The permanently visible source line and large Fullscreen button are removed.

Each chart panel gets a compact action rail anchored to the bottom-right:

- Information icon: opens an anchored citation popover.
- Fullscreen icon: opens the existing fullscreen presentation.

The action rail appears when the chart panel is hovered, contains keyboard focus, or is selected in edit mode. Devices without reliable hover keep the controls visible.

The information popover:

- Shows the resolved citation.
- Is associated with the triggering button.
- Closes on Escape, outside click, a second click on its trigger, or opening another chart's popover.
- Does not expose the CSV filename as the human-readable citation.

Description visibility applies consistently to dashboard panels, fullscreen views, and authoring previews.

## Authoring controls

### Wizard

The data-source step includes a `View source CSV` action after a CSV source is selected. The description visibility control remains a presentation option and defaults off.

### Editor

The Data tab includes:

- Resolved source name
- Editable chart citation
- `Apply to charts sharing this data source`
- `View source CSV`

The bulk-apply action reports the number of other affected charts and requires confirmation. It writes the citation override to charts with the same `sourceId`. If no other charts share the source, the action is disabled.

The Appearance tab includes a `Show description` toggle. The description text remains editable even while hidden so authors can prepare it before enabling display.

## Source CSV viewer

The viewer is a dedicated lightweight application entry opened from a direct user click. It has no dashboard header, navigation, chart controls, or background animation.

The viewer displays:

- Source/citation heading
- Loading and error states
- Sticky column headers
- Complete untransformed source columns
- 100 rows per page
- Previous and next page controls
- Current range and total row count
- Text search across all source columns

Configured CSV sources are fetched and parsed by the viewer window so loading and parsing do not block dashboard interaction. Uploaded CSV sources are transferred as their original CSV text after the viewer confirms readiness. Inline/manual sources that did not originate from CSV show that no CSV file is available.

Dataset values are rendered as text through React. The viewer does not use dynamic document writing or treat CSV values as markup.

Popup failure leaves the authoring surface intact and shows a concise retry message.

## Preview-first chart editor modal

Editing a chart opens a centered modal above the existing dashboard:

- The dashboard remains in place, blurred, visually recognizable, and non-interactive.
- The modal traps focus and restores focus to the invoking chart when closed.
- A large live chart preview spans the top of the modal.
- Contextual tabs appear directly below the preview.
- Generated fields use two columns where space allows.
- The settings region scrolls within the modal.
- Header, preview, tabs, and Save/Reset/Cancel actions remain accessible.
- Small screens use a near-fullscreen modal and one-column fields.

The modal reuses the current editor draft, validation, conversion, time-sync, reset-confirmation, save, cancel, and remove-chart behavior. This is a presentation and interaction-shell change, not a second editor implementation.

Closing or cancelling follows the existing edit-session semantics. Unsaved draft data is not silently committed.

## Direct eyedropper interaction

The eyedropper invokes the browser EyeDropper API directly from the current page.

Interaction sequence:

1. The user activates the pipette button.
2. The editor modal and dashboard blur temporarily disappear.
3. The dashboard becomes visible for pixel sampling.
4. The browser presents its pixel-selection crosshair.
5. A successful selection applies the color and restores the modal.
6. Escape or API cancellation restores the modal without changing the draft.

The modal returns to the same active tab, internal scroll position, and draft state.

Browsers without EyeDropper support retain the inline color input, hexadecimal field, presets, gradients, and transparency controls. No popup fallback is used.

## Component boundaries

Implementation should introduce or consolidate the following focused units:

- `ChartPanelActions`: hover/focus action rail and info-popover coordination.
- `ChartCitation`: deterministic citation resolution and chart/source update helpers.
- `SourceCsvViewerLauncher`: validates source eligibility, opens the viewer, and handles readiness/error messaging.
- `source-viewer` application entry: fetches or receives CSV text, parses it, and owns table search/pagination.
- `ChartEditorModal`: modal shell, blur state, focus handling, preview placement, and responsive layout.
- `EyeDropperCoordinator`: temporarily suppresses the modal shell and restores it after success or cancellation.

Existing schema-generated form sections remain authoritative for fields. The new controls must enter through the form model rather than bypassing it with editor-only special cases.

## Error handling

- Popup blocked: show an inline error and allow retry.
- Missing or unsupported CSV source: disable the viewer action or show an explicit unavailable state.
- CSV fetch or parse failure: keep the viewer open and display the source label with a bounded error message.
- Citation bulk update: confirm the affected chart count before mutation.
- Empty citation override: remove the override and return to inherited citation resolution.
- EyeDropper cancellation: restore the editor without changing the color.
- Unsupported EyeDropper: keep the existing inline tools available.
- Info popover: close deterministically on Escape, outside interaction, or competing popover activation.

## Deferred verification

Automated tests and regression checks are intentionally deferred until the user approves the visual result.

After visual approval, verification should cover:

- Chart schema normalization and validation for description and citation settings
- Default-hidden descriptions across dashboard, preview, and fullscreen
- Citation inheritance and source-sharing propagation
- Source-viewer eligibility, popup messaging, CSV loading, pagination, and search
- Chart-panel hover, focus, touch, popover, and fullscreen behavior
- Modal focus containment, restoration, responsive layout, and draft preservation
- Direct EyeDropper success, cancellation, and unsupported-browser behavior

## Out of scope

- Editing CSV filenames or paths from the chart editor
- Displaying chart-filtered or transformed rows in the source viewer
- Renaming the underlying data source when a citation changes
- Replacing browser pixel sampling with a custom screenshot-based color picker
- Running automated verification before visual approval
