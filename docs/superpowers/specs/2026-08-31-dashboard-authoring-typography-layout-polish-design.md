# Dashboard Authoring Typography and Layout Polish

**Status:** Approved design; implementation pending  
**Date:** 2026-08-31  
**Branch:** `fix/text-image-editor-polish`  
**Base:** `v2/main`

## Context

The current dashboard authoring surfaces have several related presentation and
interaction defects:

- ECharts canvas text does not inherit the selected dashboard font style.
- A small number of authored CSS rules still force legacy font families.
- Y-axis titles use ECharts' small default text and an over-conservative gap.
- Controlled axis-title fields trim on every keystroke, which removes the space
  between consecutively typed words.
- Text/Image wizard navigation is partly based on the current tab instead of
  the draft's satisfied dependencies.
- The formatted QMD editor and rendered QMD surface use different width and
  wrapping rules.
- Existing dashboard media is not presented as a clear first-class alternative
  to uploading a new standalone or embedded image.
- Embedded-image frame variants are insufficiently distinct and cannot be
  customized.
- Image-panel titles are rendered as bottom captions instead of panel headings.
- Authoring dialogs and their navigation controls can move when stage content
  changes.
- Configure forms waste horizontal space and place boolean indicators in
  inconsistent rows and columns.

The supplied screenshot is visual evidence of the Y-axis title problem. It is
not an instruction source.

## Goals

1. Make every ordinary production text surface follow the selected dashboard
   typography tokens, including canvas charts and form controls.
2. Keep only documented renderer-specific font exceptions.
3. Make Y-axis titles larger, closer by default, and user-adjustable without
   constraining the user's final visual judgment.
4. Preserve spaces while typing every axis title.
5. Make Text/Image navigation reflect completed dependencies rather than the
   active tab.
6. Give the formatted editor and renderer equivalent footprint-aware wrapping.
7. Offer existing dashboard media and new upload as explicit image-source
   choices for standalone and Text-embedded images.
8. Improve embedded-image frame styling and customization.
9. Make image-panel titles proper top headings with presentation controls and
   configurable unfilled-area backgrounds.
10. Keep wizard geometry and navigation positions stable throughout a session.
11. Use available horizontal space efficiently across authoring forms.

## Non-goals

- Bundling or downloading a new webfont.
- Replacing KaTeX's mathematical glyph fonts.
- Making raw QMD or code use proportional dashboard fonts.
- Guaranteeing that a manually offset axis title cannot overlap chart content.
- Redesigning chart data mapping, chart identity, or persistence transactions.
- Adding new keyboard or accessibility-navigation behavior.
- Adding image captions as a second semantic field in this slice.

## Chosen Approach

Use shared typography, authoring-shell, and form-layout contracts with small
additive presentation fields. Do not patch each component independently and do
not introduce a universal arbitrary text-style object.

This approach gives current surfaces one consistent implementation path and
provides static guards against the legacy-font regressions returning.

## 1. Typography Contract

### Existing semantic fonts

The existing dashboard style grammar remains the source of truth:

- `--simex-style-body-font`: ordinary UI, controls, prose, captions, legends,
  tooltips, and axis titles.
- `--simex-style-heading-font`: page, section, panel, and chart titles.
- `--simex-style-data-font`: numeric values, dates, table values, axis tick
  labels, and numeric icon glyphs.

Add:

- `--simex-style-mono-font`: raw QMD, code, source/repair text, fence metadata,
  and inert technical fallbacks.

The mono token has a stable system stack and is intentionally independent of
the selected dashboard body's proportional font.

### DOM and controls

- Buttons, inputs, selects, textareas, dialogs, panels, and detached authoring
  roots inherit the body token unless a more specific semantic token applies.
- The rich-text toolbar must no longer force Georgia.
- Dead legacy font rules are removed rather than tokenized.
- KPI and delta SVG numerals use the data token, matching the existing numbered
  panel-selection glyphs.

### ECharts canvas projection

CSS inheritance cannot reach canvas-rendered text. `EChartsChartView` therefore
reads the resolved body, heading, and data font stacks from the active theme
root and projects them into chart options:

- Chart title: heading font and heading weight.
- Legend and tooltip prose: body font.
- Axis title: body font.
- Axis tick labels and numeric series labels: data font.
- Gauge title: body font.
- Gauge detail/value: data font.

The projection applies to initial options, chart updates, resizes, and live
dashboard-style changes. `EChartsChartView` consumes the existing dashboard
chart-theme projection/revision and includes the resolved typography key in its
option-application dependency. The same revision path is required in dashboard,
fullscreen, preview, and detached authoring roots.

### Approved exceptions

Only these fixed-font families are approved:

1. KaTeX's bundled glyph fonts, required for mathematical layout and metrics.
2. The new mono token on raw/code/technical source surfaces.

The configured dashboard font stacks retain their current system fallbacks.
This slice does not bundle Inter or any other font asset.

### Durable scan guard

Add a production-source test that scans authored CSS, JS, JSX, inline SVG text,
and canvas text configuration. It rejects fixed/raw family declarations in
`font-family`, `font` shorthand, `fontFamily`, and text-renderer configuration
outside:

- the dashboard style grammar definitions;
- the mono-token definition and uses;
- the KaTeX import/approved renderer files; and
- an explicit, documented allowlist for unavoidable dependency boundaries.

`font: inherit` and shorthands whose family is a dashboard token are explicitly
valid and do not require per-selector allowlisting.

The implementation report must state the scan scope, every exception, and the
reason each exception does not follow the dashboard style.

## 2. Axis-title Contract

### Authoring text preservation

All controlled axis-title fields preserve their raw string while editing:

- X-axis title;
- primary Y-axis title; and
- secondary Y-axis title.

The shared structured-field updater must not trim after each keystroke. Optional
canonical trimming may occur only when a title is normalized for save or render.
Sequentially typing `Cumulative Cases` must persist the internal space on every
axis.

### Value-axis defaults and controls

The shared paths `presentation.axes.primary.*` and
`presentation.axes.secondary.*` gain these optional presentation fields:

```js
{
  titleFontSize: 14,  // integer, 10..24
  titleBold: false,
  titleOffsetX: 0,    // finite pixels, -96..96
  titleOffsetY: 0     // finite pixels, -96..96
}
```

Absent `titleFontSize` uses the new 14px default. Size controls use minus/plus
buttons with one-pixel steps. Bold uses the dashboard's supported strong weight.

Offset semantics are authoring coordinates:

- positive X moves right;
- negative X moves left;
- positive Y moves up; and
- negative Y moves down.

These settings are orientation-aware value-axis controls. In standard vertical
charts they style the primary and secondary Y axes. In horizontal bars, where the
same primary/secondary settings drive value X axes, they style those physical X
axes with the same semantics.

The automatic zero-offset position maintains at least 8px separation from tick
labels. Manual offsets are applied after automatic placement and are not
collision-clamped. The user may intentionally move a title into chart content.

### Placement and geometry

The current default gap estimator remains responsible for collision-safe
automatic placement, with these corrections:

- measure the chosen title size and weight;
- account for the resolved font contract;
- include a negative numeric envelope only when the resolved domain can be
  negative; and
- reserve title gutters from the resulting footprint rather than ECharts'
  12px default assumptions.

Exact screen-space X/Y offsets cannot be represented consistently by ECharts'
`nameGap`, because its direction changes with title location. A dedicated ECharts
`graphic` text projection positions value-axis titles from the resolved chart
grid and physical axis side, then applies orientation, position, and
authoring-coordinate offsets. It is recomputed after option application, resize,
fullscreen changes, and theme changes. Keeping the title inside ECharts ensures
canvas capture and dashboard snapshots include it. Native duplicate value-axis
names are suppressed.

`presentation.axes.x.title` is the observation/category-axis title and receives
the typography and whitespace fixes but no new offset, size, or bold controls in
this slice. It is distinct from the orientation-aware primary/secondary value
axes: on a horizontal chart those value axes are physically horizontal, but they
remain configured through `axes.primary` and `axes.secondary`.

## 3. Chart Heading Order

Every chart surface follows this order:

1. chart title;
2. chart description, when visible; and
3. chart content.

For ECharts views, render the title and description as DOM content before the
canvas host and suppress the duplicate canvas title. Preserve title alignment,
hidden-title behavior, dashboard heading fonts, presentation snapshots, and the
canvas host's ability to consume remaining panel height.

Existing non-ECharts chart views already follow this order and remain unchanged
except for `ImageChartView`, which adopts the shared heading primitive in Section
9. The final Text/Image preview removes its outer preview-owned heading and lets
the rendered `ChartView` remain the sole panel-title owner, preventing duplicate
titles.

## 4. Stable Authoring-shell Contract

Chart and Text/Image add/edit dialogs use a shared stable shell:

```text
header
stage tabs
scrolling workbench/body
footer/navigation
```

- Width and viewport-relative height remain constant for the life of a wizard
  session.
- Header, tabs, previous/next controls, discard controls, and primary action
  retain the same coordinates across stages.
- Only the workbench/body scrolls when stage content is taller than available
  space.
- Responsive breakpoints may change the shell layout when the viewport itself
  changes, but changing tabs at one viewport size cannot resize it.
- Proof/preview areas occupy stable grid tracks and scroll internally when
  necessary.

The chart primary action (`Create chart` or `Save changes`) remains mounted in
the same footer slot on every stage. When submission is unavailable, it is
disabled and visibly greyed instead of hidden. Its disabled state derives from
stage readiness, render/placement validity, operation state, and edit dirtiness.

Text/Image uses named footer slots for Cancel, Reset, Back, and the primary
Continue/Add/Save action. Cancel and the primary action remain mounted. Back
remains mounted and disabled on the first available stage. Edit-mode Reset remains
mounted and is disabled until the draft is dirty. Create mode reserves the same
Reset slot without moving the other controls. Labels may change with stage, but
the slot and button width do not. Tabs also use stable grid tracks so changing
availability or current stage cannot move them.

## 5. Efficient Authoring-form Layout

Apply one responsive control-layout system to Add Chart, the full Chart Editor,
Add/Edit Text/Image, and other wizard-style authoring surfaces.

### Field placement

- Use a responsive multi-column grid wherever the available width supports it.
- Ordinary compact fields use columns with a practical minimum width rather
  than consuming an entire row.
- Related minimum/maximum, position/orientation, size/weight, and format/cadence
  fields remain visually grouped.
- Textareas, rich editors, preview surfaces, palettes, tables, diagnostic lists,
  and controls that genuinely need horizontal room span the full width.
- At narrow widths, the grid collapses cleanly to one column without clipping.

### Boolean controls

- A checkbox/check indicator sits immediately to the left of the option label it
  controls.
- Boolean groups use one fixed indicator column and one content column.
- Rows between boolean options may contain other fields, but every checkbox in
  the group starts on the same vertical alignment line.
- A checkbox never receives a standalone full-width row merely because it is a
  boolean field.

### Configure tab

The Configure tab in both Add Chart and the full editor is the first adopter of
the shared layout. It must use its entire content width, remove unnecessary blank
tracks, and keep semantically related controls together. The same primitives are
then used by other wizard tabs so the improvement is systematic rather than a
Configure-only override.

## 6. Text/Image Stage Readiness

Stage availability is derived from satisfied dependencies, not the active stage
index:

- Destination is always available.
- Content type requires a valid destination.
- Content requires a valid destination and selected content type.
- Preview & Add requires valid destination, selected type, and content that
  passes its content-specific validation.

One pure target-stage readiness selector is shared by navigation rendering and
stage transitions. Returning to Destination does not grey out Content or Preview
when their dependencies remain satisfied.

The current-stage indicator is purely presentational and cannot make another
otherwise-ready stage unavailable.

## 7. Footprint-aware Text Editing and Rendering

### Authoring width

The selected panel footprint controls the inner width of both:

- the formatted/raw text-entry frame; and
- the Rendered preview frame.

The surrounding authoring dialog retains its stable shell width. Inside it, a
four-column authoring projection uses the same footprint resolver and gap logic
as dashboard panels. A 1-, 2-, 3-, or 4-column panel therefore previews at the
corresponding projected width. On viewports too narrow to show that width, the
projection scales down to 100% without horizontal page overflow.

### Shared content geometry

Formatted editor content and rendered QMD share semantic typography and geometry
rules:

- equivalent prose line-height and paragraph spacing;
- `max-width: 100%` for media;
- tables fit the projected panel width by default;
- table cells wrap ordinary prose and may break long tokens where necessary;
- fixed `min-width: max-content` is removed from ordinary rendered tables; and
- genuinely unbreakable technical content retains an internal horizontal scroll
  region rather than expanding the dashboard root.

The QMD renderer remains canonical. The formatted editor is a close visual
projection, while any QMD preservation failure continues to be tracked and
reported under the existing policy.

## 8. Embedded QMD Image Frames

### Shared dashboard-media choice

Image selection in both Text QMD and standalone Image authoring uses the shared
dashboard media picker. The UI presents two explicit, equal-status paths:

1. Use existing dashboard media.
2. Upload new image.

For Text-embedded images:

- ready local asset and packaged media items are selectable directly;
- selecting an existing item reuses its `mediaId` and bytes rather than creating
  a duplicate media item or asset;
- valid external items remain visible and can be imported as a new local copy
  before insertion, preserving the portable-QMD boundary; and
- missing, corrupt, relink-required, or review-required items remain visible but
  disabled with their reason.

For standalone Image panels, every currently renderable dashboard image-media
item is selectable under its existing media identity. Uploading remains available
from the same chooser and creates a new media item only after validation.

The Add and Edit paths use the same picker and selection transaction. Choosing
existing media must update the draft preview immediately and must not mutate the
chosen library item.

### Frame presentation

Existing `none`, `outline`, and `card` frame semantics remain. Add normalized,
round-trippable media attributes:

```js
{
  frameWeight: 1,       // integer pixels, 1..8; rendered when framed
  frameColor: undefined // undefined uses the dashboard border token; otherwise hex
}
```

JavaScript uses `frameWeight` and `frameColor`. Portable QMD serializes them as
the parser-compatible lowercase keys `frameweight` and `framecolor`, with an
explicit mapping in both directions. Absent values remain absent: opening the
formatted editor or switching modes must not inject defaults into existing QMD.
Chosen weight/color values are retained while `frame="none"` is active so the
user can restore the previous customization by re-enabling a frame; the renderer
ignores them until a framed mode is selected.

Whenever present, `frameWeight` must be an integer from 1 through 8 regardless
of the current frame mode. `frameColor` must match six-digit `#RRGGBB`; accepted
lowercase input is normalized to uppercase on deliberate field update/save, not
merely by opening or mode-switching the editor. Both values are rendered only for
Outline or Card.

The media inspector exposes line-weight adjustment and a color picker/reset when
`outline` or `card` is selected.

- Outline: transparent background, chosen border color/weight, minimal padding.
- Card: chosen border plus clearly distinct alternate surface, larger padding,
  stronger radius, and shadow.

The attributes must survive formatted/raw switching and QMD serialization. They
apply to images embedded in Text/Image QMD, not standalone image panels.

## 9. Standalone Image Panels

### Title

`chart.title` is a panel heading, not an image caption. `ImageChartView` renders
it before the image viewport using the shared chart-title primitive. Decorative
image status affects alt semantics only and never suppresses the panel heading.

Extend the existing title presentation object with bounded optional fields:

```js
{
  align: "left" | "center" | "right",
  visible: true,
  fontSize: 16,       // integer, 12..32; minus/plus step 1
  bold: false,
  italic: false,
  underline: false
}
```

The new appearance fields are valid only for the `image` chart type in this
slice; `align` and `visible` remain part of the existing shared title contract.
Defaults are 16px, normal weight, non-italic, non-underlined, and the existing
alignment default. `visible: false` remains authoritative. The static wizard's
No title choice controls only whether `chart.title` is empty and disables
title-appearance controls while checked. Typing a title does not mutate an
explicit `presentation.title.visible` value. The title always uses the active
dashboard heading font. Add and edit flows expose the same controls and preview
the result in the footprint-aware frame.

### Unfilled-area background

Store image-viewport presentation separately from image media semantics:

```js
presentation: {
  image: {
    background: {
      mode: "default" | "white" | "custom",
      color: "#RRGGBB" // required only for custom
    }
  }
}
```

- Default uses the existing `--simex-surface-panel-alt` token.
- White uses fixed white.
- Custom requires a valid six-digit hex color.

The background applies only to viewport areas left uncovered by `contain`, crop,
rotation, or image aspect ratio. It does not recolor the title region.
The last valid custom color is retained when the user switches temporarily to
Default or White, but the renderer uses it only while mode is Custom.

## 10. Compatibility and Persistence

- All schema additions are optional and additive.
- Existing dashboards render with the new typography and 14px Y-axis title
  default without migration.
- Existing image panels retain dashboard-default viewport backgrounds.
- Existing embedded images retain their current frame mode and default 1px token
  border until customized.
- Unknown-key validation is extended only for the new documented fields.
- Static-content source/media ownership and chart identity remain unchanged.

## 11. Verification Strategy

### Deterministic regressions

Add focused tests for:

1. Sequential typing of `Cumulative Cases` into X, primary Y, and secondary Y
   titles.
2. Axis-title schema validation, size/bold projection, positive-Y-up offsets,
   primary/secondary positioning on vertical and horizontal charts, and the
   collision-safe zero-offset default.
3. ECharts font projection for every text category under each dashboard style.
4. The production typography scan and documented exception allowlist.
5. Chart title/description/host DOM order with no duplicate canvas title.
6. Stable Chart and Text/Image shell structure, named footer slots, and
   always-mounted disabled primary actions.
7. Responsive form-grid classes and aligned checkbox/control markup.
8. Stage readiness after navigating backward in Text/Image creation.
9. Footprint width projection for all four panel widths.
10. Editor/renderer table wrapping and bounded media.
11. Existing-media reuse for standalone and embedded images, including no asset
    duplication and external-to-local import for portable QMD.
12. Embedded frame weight/color normalization, QMD serialization, and distinct
    outline/card styling.
13. Image title top placement, alignment, size, emphasis, decorative independence,
    and viewport background modes.

### Final candidate checks

- Run the complete task-specific test selection once on the final candidate.
- Run the production build once after the relevant tests pass.
- Conduct a final read-only production-font scan and report its scope and
  exceptions.
- Perform one scoped implementation review for the combined authoring slice.

The inspection server may be started after the implementation commit. Return its
URL after every commit and do not open an internal browser window.

## Acceptance Criteria

- Changing the dashboard style changes the font of buttons, text boxes, panels,
  chart titles, legends, tooltips, axis titles/ticks, and other ordinary text.
- Every text surface that intentionally does not change font has a documented
  semantic or renderer-specific reason.
- All axis titles accept and retain spaces.
- Primary/secondary value-axis titles are visibly larger and closer at zero
  offset, with adjustable size, bold, X offset, and positive-Y-up offset controls
  on both vertical and horizontal charts.
- Zero offset avoids tick collisions; manual offsets are not clamped.
- Chart titles appear above descriptions.
- Wizard tabs and navigation controls do not move between stages, and chart save
  remains visible but disabled when unavailable. Text/Image Back, Reset, and
  primary action slots also remain fixed.
- Configure and other wizard tabs use horizontal space efficiently; checkboxes
  sit left of and align with the options they control.
- Text/Image later tabs remain available whenever their actual dependencies are
  satisfied.
- Editor and renderer widths reflect the chosen footprint and produce materially
  equivalent wrapping.
- Standalone and Text-embedded image flows clearly offer existing dashboard media
  and new upload; existing local media is reused without duplicating its asset.
- Outline and Card image frames are visibly different and support border weight
  and color customization.
- Image-panel titles appear at the top with the requested styling controls.
- Unfilled image viewport areas support dashboard-default, white, and custom
  backgrounds.
