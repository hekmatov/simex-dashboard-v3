# V3 dashboard interface audit: spacing, actions, and fields

Date: 2026-08-23  
Scope: all current dashboard modes and Step 7 authoring/view surfaces; Present/Audience is inspected but remains Step 8-owned.  
Audit status: **Complete**  
Review status: **Step 7 master-review submission remains provisional.**

Structural baseline: `b3dad79` (grouped Build command rails); Dashboard map implementation begins at `1fd1510`.

## Outcome

The requested Build structural change is implemented: Build commands now live above the canonical canvas, the former Build panel is the **Dashboard map**, the map switches explicitly between Structure and Inspector, and the obsolete Chrono Group summary/list is removed. A live visual check then found and repaired two composition defects: Build commands are now arranged as a primary authoring/session rail plus a separate layout-draft rail, and Chrono Group content no longer stretches its header/action/status rows to fill the studio height.

The systematic scan found four open Step 7 priority themes:

1. Several component-specific rules bypass the accepted 44px control token.
2. Active Page commands remain a 20px-high three-button micro-rail and are especially poor at narrow widths.
3. Dashboard map Structure has an inherited foreground/background contrast mismatch in the selected Look.
4. View Chrono's movable date overlay collides with mast controls at tablet and phone widths.

These findings should be repaired as shared rule slices rather than by individually padding each instance.

## Method and evidence

- Source inventory: 40 React components with interactive declarations, including 132 button declarations and 100 field declarations. Dynamic collections mean these counts are lower bounds.
- Live browser inspection: Build command header, Dashboard map Structure and Inspector, New Chart wizard, Pages and Sections, Chrono Studio, Chrono Group content, Chrono Group editor stages 1 and 3, Scene Studio, Create Scene, Dashboard Look, View charts, View Chrono, comparison mode, and Present/Audience controls.
- Material viewports: 1280×720, 768×1024, 390×844, plus the normal 1352×1270 browser viewport. The Chrono/Scene integration journey also ran at 1200×900.
- Geometry readings: control boxes, field boxes, action-group relationships, page overflow, and grid-row heights.
- Human visual inspection: desktop Build rails, Dashboard map, Chart Wizard, Chrono Studio/content/defaults, Scene Studio/editor, View dashboard, and View Chrono at desktop/tablet/phone.
- Guidance applied: preserve the accepted visual language; use the project 44px control contract; keep at least 8px between adjacent touch targets; keep labels associated and validation local; allow whole action groups to stack rather than wrapping individual buttons unpredictably.

## Priority findings

| ID | Priority | Finding | Production owner | Evidence | Recommended repair | Cheapest acceptance check | Step |
|---|---|---|---|---|---|---|---|
| UI-01 | P1 | Active Page actions use three 56×20px buttons beside the active Page tab. At phone width their labels are visibly clipped into `Ed / Er / La`, and the Page strip gains an internal horizontal scrollbar. | `BuildPageNavigation.jsx`; `.build-page-command-rail` in `modes.css` | 1280×720 and 390×844 geometry + screenshot | Replace the micro-rail with one 44px **Page actions** trigger opening an anchored menu, or a 44px segmented group at wide widths. Keep move/delete/edit in one named Page-management group. | Browser: every active Page command target ≥44px; labels do not clip; switching pages stays available; no new document overflow. | 7 |
| UI-02 | P1 | Build chart authoring icons are 36px and chart evidence/exploration icons resolve to 32px in Build and phone layouts. This contradicts the project's touch-friendly View and 44px authoring-control contract. | `DashboardCanvas.jsx`, `ChartPanelActions.jsx`; `styles.css`, `modes.css`, `dashboard-style-grammar.css` | 1280×720 and 390×844 geometry | Make the shared `.simex-icon-control`/chart action target 44px in View and Build; keep glyph size visually compact inside the target. Do not solve this per chart type. | Component geometry test plus one phone browser case: all visible chart header/footer actions ≥44×44 with ≥8px gaps. | 7 |
| UI-03 | P1 | Chart Wizard close/previous/next controls are 36px; destination selects are 32px; chart-type search is 39px and purpose select is 35px. | `ChartWizardV3.jsx`, schema field components; wizard rules in `dashboard-style-grammar.css` and `styles.css` | Live stage 1/2 measurements | Apply one wizard control-height token: 44px for buttons, inputs, and selects. Exempt native check/radio glyphs while keeping their label row ≥44px. | Wizard browser case measuring all visible interactive boxes by stage. | 7 |
| UI-04 | P1 | Dashboard map Structure can render a pale panel with near-white tree text under the selected Look. The hierarchy is present but visually unreadable. | `BuildStructureRail.jsx`; tree rules in `modes.css` and Look overrides in `dashboard-style-grammar.css` | Desktop Structure screenshot; Inspector does not show the same failure | Tokenize the tree surface and text pair together. Remove `color: inherit !important` where it defeats the selected Look. Check default, hover, focus, selected, and disabled tree rows. | Computed contrast/token assertion plus one live screenshot in the affected Look. | 7 |
| UI-05 | P1 | View Chrono's date overlay covers Chrono/Compare controls at 768×1024 and 390×844. It also obscures part of the dashboard header on phone. | `ChronoDateOverlay.jsx`, View shell positioning coordinator; `.chrono-date-overlay` and responsive playback rules in `styles.css` | Tablet and phone screenshots; no document-wide horizontal overflow | Add collision-aware safe zones for the mast and floating playback panel. On narrow widths, dock or reduce the overlay and preserve its user position only within the usable rectangle. Keep the accepted focus/comparison suspension rules. | Browser geometry assertion: overlay rectangle does not intersect mast interactive rectangles or playback controls at 768×1024 and 390×844. | 7 |
| UI-06 | P1 | Dashboard map Inspector's Page title input is 32px while the textarea is 82px. The textarea height is appropriate; the single-line field is not aligned with the 44px editor field system. | `BuildInspector.jsx`; `.build-inspector input` in `modes.css` | Live Inspector measurement and screenshot | Give Inspector input/textarea/select rules the same label, border, color, padding, and 44px minimum used by Chrono/Scene editors. Replace hard-coded `#49627a` labels with semantic tokens. | Focused render/style test and live Inspector geometry. | 7 |
| UI-07 | P2 | Many ordinary buttons resolve to 39–41px because base padding/line-height wins over the 44px token: Dashboard map, Chrono view, Pages/Sections add/save/discard, Scene Studio create, Scene observation actions, and Chrono footer actions. | Shared button grammar plus the listed surface styles | Cross-surface geometry scan | Put `min-block-size: var(--simex-control-min)` on the shared dashboard button grammar and remove narrower component overrides. Keep compact badges/non-interactive chips exempt. | One deterministic scan that fails only for visible button targets below 44px, with an explicit exemption list. | 7 |
| UI-08 | P2 | Build's header, map, playback, and some legacy data-state rules still contain raw colors alongside Look tokens. They risk another style-profile escape. | `modes.css`, `styles.css`, `chart-data-state.css` | Source scan found `#49627a` Inspector labels and legacy playback surface/status colors | Replace raw component colors with semantic dashboard tokens in the same slice that edits each surface. Do not mass-replace chart series palette values. | Token-source test scoped to UI chrome selectors. | 7 |
| UI-09 | P2 | Phone Build correctly warns that authoring is unsupported, but it still renders the complete authoring command/canvas surface below the warning. This is visually noisy and exposes undersized authoring actions in an unsupported state. | `PhoneModeNotice.jsx`, Build workspace mode boundary | 390×844 screenshot | After the warning, provide only **Switch to View** and a concise read-only status, or mark the continued Build rendering as an explicit later decision. | Phone browser task has one clear recovery action and no enabled authoring commands. | 7 or approved defer |
| UI-10 | Deferred | Present/Audience contains normal 20px checkbox glyphs and no undersized buttons in the sampled state. Its overall arrangement is Step 8-owned and must not be redesigned in Step 7. | `PresentWorkspace.jsx`, `presentation.css` | Live static and geometry inspection | Carry field-row and action-group rules into Step 8; do not enlarge checkbox glyphs beyond normal size—enlarge the clickable row instead. | Step 8 browser cases. | 8 |

## Surface-by-surface coverage

| Surface | Actions and arrangement | Fields and information | Spacing/responsive result | Status |
|---|---|---|---|---|
| App crown and mode switcher | Mode buttons are distinct and usable. | Dashboard/scenario identity remains readable. | Page micro-rail is the main failure; see UI-01. | Partial |
| Build command header | Content, Time, and Session now share one aligned rail; Layout draft has its own status/action rail. | Draft states are paired with their actions. | 1280×720 header is below 170px and no longer has the earlier scattered vertical placement. | Passing |
| Dashboard map — Structure | Structure/Inspector ownership is explicit; no Chrono summary remains. | Tree carries the full Page/Section/chart hierarchy. | Structure tree contrast is broken in the inspected Look; see UI-04. | Partial |
| Dashboard map — Inspector | Destructive Page action is contained in Page context. | Labels are visible, but the title field is only 32px and uses a hard-coded legacy label color. | Compact, but control grammar is inconsistent; see UI-06. | Partial |
| Pages and Sections | Page and Section commands are grouped by owned item; destructive labels are explicit. | Empty/recovery states remain available in production logic. | Primary/footer buttons resolve to 39px; see UI-07. | Partial |
| New Chart wizard | Six stages fit one line at desktop; canonical render and placement proof stay persistent; destination/size controls are present. | Labels and proof information are clear. | Several 32–39px controls and 36px navigation icons; see UI-03. Maximum-height composition itself is correct. | Partial |
| Chart edit / Unit Orbit | Context remains tied to the selected chart and canonical canvas. | Existing schema labels/validation were source-scanned. | Shared 36px authoring icons remain; see UI-02. | Partial |
| Chrono Studio | Create/Close are clearly separated; saved cards open content before edit. | Search/status/Page fields are 44px and aligned. | Compact composition; no excess track stretching. | Passing |
| Chrono Group content | Navigation, primary, and management actions are distinct; Remove is destructive. | Status and Page-grouped membership remain visible. | Fixed during this review: content tracks now size to content; action groups remain on one row at desktop and stack whole on phone. | Passing |
| Chrono Group editor | Four-stage navigation is complete; footer owns Back/Continue/Discard. | Stage 1 fields are 44px and aligned; Stage 3 radio rows pair names and explanations; cadence is a 128×44 numeric field. | Composition matches the corrected staged format. Footer buttons still inherit 39px; see UI-07. | Partial |
| Availability Ledger | Availability and matching evidence remain structured by member/region. | Information hierarchy and ledger rows were source-scanned. | No new composition defect found; shared 38–40px legacy rules should be normalized only where interactive. | Passing with shared-token follow-up |
| Scene Studio | Create is studio-owned; saved content remains separate from editing. | Search/status/Page fields follow the studio pattern. | Empty state is compact. Create button is 37px; see UI-07. | Partial |
| Create/Edit Scene | Persistent draft panel, Stage 1 ledger, and balanced canvas ownership are present. | Text/select/date/numeric fields are 44px; check/radio glyphs are a normal 20px inside labelled rows. | Inspector-style actions at 39px need shared normalization; otherwise hierarchy is coherent. | Partial |
| Scene content | Read-first route and edit transition remain distinct. | Scene identity/provenance is present. | Source scan found no unique spacing defect beyond shared tokens. | Passing with shared-token follow-up |
| Dashboard Look | Style/profile/system controls use normal 20px radio glyphs with full labelled rows; Close is not blocked by async persistence. | Current selection and persistence state are communicated. | No new spacing defect found. | Passing |
| View chart canvas | View has no authoring chrome; chart evidence/details/focus actions are grouped per chart. | Chart status and provenance remain available. | Desktop chart actions are 44px; Build/phone overrides shrink them to 32–36px; see UI-02. | Partial |
| View comparison/fullscreen | Comparison entry remains in the View crown and chart selection remains contextual. | No field defect found in sampled state. | Shared chart target issue applies on phone. | Partial |
| View Chrono | Source/scope/matching/trace form a coherent session group; transport, cadence, availability, and position controls are present. | Selects are 44px; cadence is 44px; range is intentionally shorter but has a broad horizontal target. | Date overlay collision is a blocking responsive defect; see UI-05. Transport buttons are 40px; see UI-07. | Partial |
| Tooltips and source evidence | Chart evidence buttons are named; prior tooltip clipping repair remains represented in code. | Dedicated source-viewer route remains the intended evidence journey. | No new spacing-specific defect was reproduced in this pass. | Passing for this audit dimension |
| Recovery, confirmation, toast | Actions are named and recovery state is bounded. | Error/recovery copy remains local to its surface. | Source scan shows 44px recovery actions. No new issue found. | Passing |
| Present/Audience | Audited only. | Checkbox glyphs are normal-sized. | Step 8 owns arrangement changes. | Intentionally deferred |

## Six-pillar scorecard

| Pillar | Score | Evidence summary |
|---|---:|---|
| Visual hierarchy | 7.5/10 | Build and temporal ownership are substantially clearer; Dashboard map Structure contrast remains a material failure. |
| Spacing and rhythm | 7/10 | Chrono content and Build rails were repaired; shared 39–41px controls and component-specific spacing still fragment the rhythm. |
| Typography and information fields | 7.5/10 | Chrono/Scene labels, helper copy, and 44px fields are coherent; Inspector and Wizard fields use a smaller legacy grammar. |
| Controls and interaction | 6.5/10 | Actions are generally named and grouped, but the 20px Page rail and 32–40px icon/transport targets remain below the project contract. |
| Responsive composition | 5.5/10 | The document avoids root horizontal overflow, but the Chrono date overlay collides with required mast controls at tablet and phone widths. |
| Accessibility and state communication | 7/10 | Accessible names, focus semantics, validation, and status text are broadly present; target size and Dashboard map contrast prevent a higher score. |

Scores summarize the recorded findings; they do not convert a Partial surface into Passing.

## Shared repair sequence

1. Fix the shared interactive-size grammar and remove component overrides that shrink controls below 44px. This resolves UI-02, UI-03, and most of UI-07 without repeated per-surface patches.
2. Replace the active Page micro-rail with one coherent Page-management control (UI-01).
3. Correct Dashboard map token pairing and Inspector field grammar together (UI-04 and UI-06).
4. Add the responsive date-overlay safe-zone coordinator (UI-05).
5. Decide whether unsupported phone Build should render any authoring surface (UI-09).
6. Re-run only the representative desktop/tablet/phone journeys affected by those changes; do not expand this into Step 9 cross-mode UAT.

## Verification recorded during this review

- `tests/e2e/v3-dashboard-map.spec.js`: command rail composition, persistent commands, Structure/Inspector switching, and map closure — passing.
- `tests/e2e/v3-temporal-authoring.spec.js`: Chrono content action grouping and row height, edit/save, Scene create/save, and persistence — passing.
- `tests/buildChronoGroupAccess.test.js`: read-first route plus navigation/primary/management grouping — passing.
- Production Vite bundle — passing. The existing large-chunk warning remains and is not a spacing/action defect.

The audit distinguishes implemented structure from open visual debt. Step 7 should not be submitted for master acceptance until the open P1 rows above are repaired or explicitly approved as later-step deviations.
