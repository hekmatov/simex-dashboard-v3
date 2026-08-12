# Three-Mode Dashboard UI Contract

Date: 2026-08-10
Status: Approved prototype reference

> **Superseded on 2026-08-12.** This historical UI contract is preserved as evidence of the assumptions that produced the prototype. The current visual, responsive, and interaction authority is the [V3 Three-Mode Dashboard UI Contract](./2026-08-12-three-mode-dashboard-ui-spec.md).

## Mode switch position and states

- Place the `View | Build | Present` segmented switch in the 64 px application-frame bar, after the SimEx identity and before the scenario summary. The bar is above page navigation on every controller surface; the audience surface has neither bar nor switch.
- View is the fallback selection. Each mode is always available to every user. The active segment uses `aria-pressed="true"`, navy fill, and white text; inactive segments use transparent fill and navy text; keyboard focus uses a 3 px amber outline with 2 px offset.
- A mode change preserves the active page. While a Build draft requires save or discard, keep the requested segment pending and leave Build visibly active until that choice completes.

## Header and page navigation

- The application-frame bar is 64 px high with 16 px horizontal padding and a 12 px gap. It contains, in order, SimEx identity, mode switch, flexible space, scenario name, and updated date.
- The page header follows the frame: scenario/program eyebrow, page title, concise subtitle, then scenario and updated metadata. View uses a 136 px header and Build uses an 88 px compact header. Present uses the shared frame followed directly by its 64 px status strip.
- Page navigation is a distinct 52 px row immediately below the header. It contains Home, Biomedical, and Socio-economic in configured order; the active page uses text plus programmatic current state, never color alone.
- Build adds one 52 px utility row after page navigation for workspace context and Save/Add actions. It is part of the Build shell, not a fourth navigation layer.

## Desktop Build geometry

- At viewport widths of 1200 px and above, use a full-width grid below page navigation with 16 px outer padding and 16 px gutters. From 1200 through 1319 px, fluid rails preserve a 640 px canvas; at 1320 px and above the grid is `280px minmax(640px, 1fr) 336px`.
- The 280 px structure rail lists scenario, pages, sections, panels, and time groups. The center is the live dashboard canvas. The 336 px inspector contains Content, Data, Chart, Interaction, and Layout sections for the selected item.
- Rail and inspector are independently scrollable beneath the 64 px frame, 88 px Build header, 52 px page row, and 52 px utility row. The canvas owns document scrolling and never becomes a second renderer.

## Tablet Build sheet behavior

- From 768 px through 1199 px, show the canvas at full available width and replace both side columns with 44 px `Structure` and `Inspector` triggers in a sticky canvas toolbar.
- Open exactly one modal bottom sheet at a time. The sheet is viewport width, at most `min(70vh, 760px)` high, has a 20 px top radius, and scrolls internally. Structure opens to the current item; Inspector opens to the current property group.
- Trap focus inside the open sheet, close with its Close button or Escape, and return focus to the invoking trigger. Sheet open/close never changes the draft or canvas selection.

## Present controller regions

- Below the shared 64 px frame, constrain the controller to 1440 px with 24 px padding. Put connection state and `Open audience display` in a full-width 64 px status strip.
- The controller body uses `360px minmax(0, 1fr)` with a 20 px gutter. The left region holds current page, audience status, and title visibility. The right region holds the one-to-four-chart scene list, ordering, and layout preview; return/close actions follow the action dock in DOM and visual order.
- A 72 px sticky action dock spans the body for synchronized time, `Blackout`, and `Restore`; blackout remains visually separated from scene editing.

## Audience title and chart layouts

- The audience surface uses a 48 px safe inset at 16:9. When enabled, the title band is 96 px high and contains a 48 px title plus a 24 px context line; hiding it returns that height to charts.
- Use a 24 px chart gap. One chart fills the chart region; two charts use equal columns; three use a 60% left hero with two stacked right charts; four use a 2 by 2 grid. Preserve controller order in reading order.
- The waiting state centers the SimEx mark, `Audience display ready`, and `Waiting for the moderator` without setup detail. The blackout state is a uniform `#020816` surface with no visible copy or chrome.

## Density tokens

| Token | Compact | Comfortable | Spacious |
| --- | ---: | ---: | ---: |
| Base space | 4 px | 4 px | 8 px |
| Control gap | 8 px | 12 px | 16 px |
| Region gap | 16 px | 20 px | 24 px |
| Region padding | 16 px | 24 px | 32 px |
| Body / line-height | 14 / 20 px | 16 / 24 px | 24 / 34 px |
| Section title / line-height | 18 / 24 px | 24 / 32 px | 32 / 40 px |
| Page title / line-height | 28 / 34 px | 36 / 44 px | 48 / 56 px |
| Corner radius | 8 px | 12 px | 16 px |
| Primary target | 44 px | 44 px | 56 px |
| Chart minimum height | 280 px | 360 px | 420 px |

## Focus order and primary targets

- View: mode switch, page navigation, page controls, then chart actions in visual order.
- Build desktop: mode switch, page navigation, structure rail, canvas actions, inspector. Build tablet: mode switch, page navigation, Structure/Inspector triggers, canvas actions, then the open sheet.
- Present controller: mode switch, display status/action, page and title controls, scene selection/order, synchronized time, Blackout/Restore, return/close actions. Audience has no interactive focus targets.
- Mode segments, page tabs, sheet triggers, chart actions, display actions, reorder controls, and blackout/restore are at least 44 by 44 px. Dense text-entry fields may be 36 px high only when their adjacent save, discard, and destructive actions remain 44 px.
