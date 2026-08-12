# Three-Mode Dashboard Redesign

Date: 2026-08-10
Status: Approved for implementation planning
Branch: `codex/three-mode-dashboard-design`
Baseline: `main` at `9f0878e`

> **Partially superseded on 2026-08-12.** The [V3 Three-Mode Dashboard UI Contract](./2026-08-12-three-mode-dashboard-ui-spec.md) overrides this document for visual, responsive, and interaction details. This document remains authoritative for architecture, scope, non-goals, universal mode access, shared V3 state, transactional editing, and the same-computer presentation channel.

## Purpose

Refine the SimEx Dashboard into one coherent product that supports three tasks
without creating three products or three user classes:

1. **Build** — prepare the exercise, information structure, data sources,
   charts, synchronized time groups, and portable package.
2. **View** — explore and interpret the dashboard on a personal computer or
   tablet with minimal authoring noise.
3. **Present** — let a moderator control a clean, legible audience display on a
   large screen while retaining controls on the moderator's own screen.

These are interface modes, not roles. Every person can enter every mode. This
design introduces no accounts, permissions, feature gates, or read-only build.

The redesign should make the existing capabilities easier to understand and
operate while preserving the dashboard's strict version-3 configuration,
offline/static deployment, portable package, ECharts rendering, generated icon
authority, and optional Quorum companion boundary.

## Prototype Delivery Constraint

This work is an educational and training prototype. It is non-commercial and
is supplied without guarantees of availability, accuracy, suitability,
security, support, or continued compatibility.

Agile prototype delivery is an explicit product requirement:

- Implement the smallest direct behavior that satisfies the acceptance tasks.
- Do not add speculative abstractions, generic frameworks, feature flags,
  analytics, telemetry, observability, audit infrastructure, deployment
  automation, or release-grade documentation.
- Safety and security work is limited to the minimum needed for correct local
  browser behavior and preservation of existing repository boundaries: basic
  input/message validation, same-origin browser APIs, bounded chart selection,
  and keeping datasets out of presentation messages.
- Do not add authentication, authorization, encryption, security tokens,
  threat-model infrastructure, rate limiting, security scanning, compliance
  claims, or privacy certification.
- Do not weaken or remove security behavior that already exists. Simply avoid
  expanding it beyond what the prototype requires.
- A newly discovered idea is out of scope unless it blocks an approved
  acceptance criterion. Record it for possible future work instead of
  implementing it.
- Tests and review must be proportional and acceptance-driven. Do not create
  extra test infrastructure or duplicate deterministic checks.

## Current Baseline

At the selected baseline, SimEx is a React 19 and Vite single-page application
with ECharts visualizations, three configured pages, forty panels, responsive
preview modes, chart authoring, synchronized-time groups, portable bundles,
one-to-four-chart fullscreen comparison, and optional Quorum companion support.
Page selection is application state rather than URL routing.

The capability set is stronger than its current operating model:

- Viewing, editing, layout preview, fullscreen comparison, packaging, and
  companion status coexist in one broad shell.
- Edit mode exposes substantial authoring power, but it is not organized as an
  explicit exercise-building workspace.
- Fullscreen is an in-window overlay. It is useful for focused analysis, but it
  is not yet a moderator/controller plus audience-display workflow.
- Responsive behavior exists, including tablet and phone previews, but mode-
  specific density and large-room legibility are not explicit design contracts.
- The current icon system and chart configuration are already intentional
  product assets. A generic dashboard template or component-library rewrite
  would discard useful constraints and introduce avoidable migration work.

## Design Principles

1. **Tasks, not identities.** Mode labels describe what someone is doing. They
   never imply authorization or a different class of user.
2. **One content truth.** All modes render the same version-3 dashboard
   configuration, chart registry, datasets, filters, and saved edits.
3. **Distinct shells, shared core.** Each task gets the amount of chrome,
   density, and control it needs without forking data or chart behavior.
4. **Progressive disclosure.** Common viewing actions remain prominent;
   structural and data-authoring controls appear in Build; display controls
   appear in Present.
5. **Presentation is a relationship.** A moderator screen and an audience
   screen have different responsibilities even when they run on one computer.
6. **Legibility follows viewing distance.** Compact desktop authoring,
   comfortable personal viewing, and spacious projected display use related
   tokens but different density profiles.
7. **Preserve working contracts.** Existing transaction guarantees, fullscreen
   selection, synchronized time, icon semantics, static hosting, PWA behavior,
   and standalone Quorum fallback remain intact unless a later reviewed plan
   explicitly changes them. This does not promise compatibility with browser-
   saved dashboard state or package files created before the redesign.
8. **Evidence before ornament.** Visual changes must improve hierarchy,
   comprehension, touch use, or presentation clarity—not merely make the
   dashboard look newer.

## Chosen Architecture

Use three mode shells over a shared dashboard runtime.

```text
Application frame
├── Mode switcher: View | Build | Present
├── Shared dashboard runtime
│   ├── V3 configuration and persistence
│   ├── Data loading and filtering
│   ├── Page, section, panel, and chart rendering
│   ├── Synchronized-time state
│   └── Fullscreen selection and chart interactions
├── View shell
├── Build shell
└── Present workspace
    ├── Moderator controller
    └── Audience display window
```

The mode switch belongs at the application-frame level, above page navigation.
Changing mode should preserve the active page and compatible exploration state.
It must not duplicate or transform the dashboard configuration.

The initial mode is **View**. The last mode may be remembered locally as a
convenience, but an audience-display URL always opens directly into its display
shell. If remembered state is absent or invalid, the application falls back to
View.

### Why this architecture

- A single shell with an `editing` boolean cannot clearly express the different
  navigation, density, and screen relationships required by all three tasks.
- Separate applications or persona-specific builds would duplicate rendering
  behavior, allow configuration drift, and falsely turn a UX distinction into
  a deployment or permission distinction.
- Shared rendering keeps View and Present faithful to what was built.
- Shell boundaries allow gradual implementation: the shared mode foundation
  can land before Build and Present are visually complete.

## Mode Contracts

### View

View is the default personal exploration experience for desktop and tablet.

It provides:

- Scenario identity and concise orientation
- Page navigation and landing content
- Dashboard filters and synchronized-time controls
- Chart interactions, details, data-source inspection, and existing focused or
  multi-chart fullscreen comparison
- A visible, understandable route to Build and Present
- Comfortable spacing and touch targets without sacrificing useful analytical
  density

It omits persistent authoring inspectors, configuration warnings that only an
author can act on, and presentation-controller chrome. View is not enforced
read-only: a person can switch to Build at any time.

### Build

Build reframes the existing edit capabilities as an exercise-authoring
workspace. The preferred desktop composition is:

```text
Global frame and mode switcher
├── Structure rail: scenario, pages, sections, panels, time groups
├── Live dashboard canvas
└── Context inspector: content, data, chart, interaction, layout
```

The canvas remains the shared dashboard renderer rather than a second preview
implementation. Selecting an item in the structure rail focuses the matching
canvas item and inspector. Existing modal/wizard flows may remain where a task
benefits from a sequence, but routine property changes should not require
opening multiple overlapping dialogs.

Build must preserve the existing transactional action contract:

1. Lock the initiating controls.
2. Await pending debounced edits.
3. Await the serialized configuration commit.
4. Close the editor or leave edit state only after success.
5. On failure, keep the draft and context visible and offer an actionable retry.

On narrower tablets, the structure rail and inspector become explicit drawers
or sheets; they do not compress the canvas into an unusable center column.
Build is desktop-first but remains operable by touch.

### Present

Present opens a moderator workspace and, through a user-initiated action, a
separate audience window suitable for a projector or large display.

The moderator controller provides:

- Display connection state and an explicit `Open audience display` action
- Current page and selected scene summary
- Selection of one to four charts using the existing fullscreen-selection
  contract
- Reordering and count-appropriate layouts
- Relevant synchronized-time controls for the presented content
- Clear-screen/blackout and restore controls
- Return-to-dashboard and close-display actions

The audience window provides:

- Presented title and context only when useful to interpretation
- The selected charts or dashboard scene at presentation density
- No app navigation, authoring controls, hover-dependent instructions, setup
  messages, or technical connection details
- A calm holding state before the first scene arrives

The controller is the authority for presentation state. The audience window
renders the same configuration and data locally and receives only lightweight
display state such as selected panel IDs, order, layout, time position, title
visibility, and blackout state.

## Presentation Session Model

The first implementation supports a moderator and audience display on the same
computer and origin. It uses a browser-native `BroadcastChannel` with a unique,
ephemeral channel identifier. A query such as
`?mode=present&surface=audience&channel=<id>` is sufficient to open the display
shell; `surface=audience` is a Present surface, not a fourth product mode. React
Router is not required.

Session lifecycle:

1. The moderator enters Present and activates `Open audience display`.
2. The application creates an ephemeral channel ID and opens a display window
   in the same user gesture so browser popup rules are satisfied.
3. The display loads the normal application assets and sends a `ready` message.
4. The controller responds with one complete, versioned presentation snapshot.
5. Subsequent controller actions send the complete lightweight presentation
   state. The state is small enough that a patch protocol is unnecessary for
   this prototype.
6. If the display reloads, it sends `ready` again and receives a fresh snapshot.
7. If the channel is interrupted, the display retains the last valid scene;
   the controller shows the reconnection problem and offers to reopen it.
8. Closing Present ends the ephemeral session but does not change dashboard
   content or saved configuration.

Presentation messages must have a small explicit schema and version. Unknown
or malformed messages are ignored. No dataset, secret, user identity, or
authoring command is sent through the channel.

Cross-device remote control is deliberately excluded. It would require a
transport, discovery, session-security, and failure model that is unnecessary
for the first useful large-screen workflow. This prototype schema is designed
only for the direct same-origin BroadcastChannel implementation.

## Navigation and State

Mode and content navigation are separate dimensions:

- **Mode:** View, Build, or Present
- **Content:** Home, Biomedical, Socio-economic, or future configured pages
- **Focus:** selected section, panel, or presented chart set

Mode changes preserve the active content page. View-to-Build may also preserve
the focused chart. Build-to-View must complete or explicitly discard any open
draft using the existing transaction rules; it must never silently abandon an
edit. Leaving Present closes or detaches the ephemeral display session only
after confirmation when an audience window is active.

Mode is interface preference state, not part of the portable dashboard bundle.
Presentation scene state is ephemeral. Dashboard content and supported chart
settings continue to use the existing version-3 persistence authority.

## Visual System Direction

The redesign extends the current SimEx visual language rather than importing a
template wholesale.

### Shared foundations

- Retain the existing institutional navy/blue foundation, restrained amber
  emphasis, and biomedical/socio-economic domain identities.
- Add semantic tokens only for values used by the new or directly touched mode
  shells. Do not refactor unrelated chart or legacy component styling.
- Keep the generated SimEx glyph registry as the icon authority. New icons must
  follow its geometry, naming, accessible-label, and tooltip contracts.
- Keep chart color semantics stable across modes. Shell styling must not make
  the same series or status mean different things.
- Prefer hierarchy from spacing, scale, grouping, and typography before adding
  borders, shadows, or additional colors.

### Density profiles

| Profile | Primary use | Intent |
| --- | --- | --- |
| Compact | Build on desktop | Efficient scanning and adjacent controls without reducing controls below accessible target sizes |
| Comfortable | View on desktop/tablet | Balanced analytical density, readable labels, and touch-friendly interaction |
| Spacious | Audience display | Large type, simplified chrome, stronger spacing, and legibility at distance |

The profiles are token-level variations, not separate component libraries.
Charts receive presentation-aware container dimensions and label guidance, but
the configuration is not rewritten when modes change.

### Responsive targets

- Build desktop: wide workspace with persistent rail, canvas, and inspector
- Build tablet: canvas plus one overlay panel at a time
- View desktop/tablet: responsive dashboard with at least 44-by-44-pixel touch
  targets for primary interactive controls
- View phone: existing one-column behavior remains usable, although phone is
  not the main redesign target
- Present controller: desktop or landscape tablet
- Audience display: 16:9 is the primary target, with safe scaling for other
  common projector and display ratios

No essential action may rely on right-click, hover, or color alone.

## Accessibility and Usability Contract

- Mode switching, page navigation, authoring controls, and presentation
  controls are fully keyboard reachable with visible focus.
- Each mode exposes a clear heading and landmark structure.
- The active mode is communicated by text and programmatic state, not only
  color.
- Dialogs and sheets retain focus trapping and restore focus to their trigger.
- Touch targets meet the 44-by-44-pixel baseline where controls are not part of
  a dense text-entry surface.
- Audience-display text and chart annotations are evaluated at realistic
  viewing distance, not solely through desktop screenshots.
- Reduced-motion preferences apply to shell transitions, chart-adjacent
  animation, and the presentation holding state.
- Automated accessibility checks support, but do not replace, keyboard, touch,
  and projected-display review.

## Error and Recovery Behavior

- Mode-shell failures do not invalidate the last-good dashboard configuration.
- Build errors remain beside the operation that can resolve them and retain the
  draft.
- View suppresses author-only diagnostics unless they prevent interpretation;
  user-relevant data errors remain visible and actionable.
- Present controller reports disconnected, blocked-popup, missing-panel, and
  unsupported-channel states in plain language.
- The audience display never exposes stack traces or setup instructions. When
  content is temporarily unavailable, it keeps the last valid scene or shows a
  neutral holding state.
- Companion absence continues to be a normal standalone condition and does not
  block any of the three modes.

## Versioning and Cutover

- Version 3 remains the only configuration contract. No version-2 compatibility
  or migration path is added.
- The redesign may revise the version-3 configuration, browser-persistence, and
  package shapes where that produces a cleaner mode architecture.
- Browser-saved dashboards and packaged bundles created before the redesign
  have no compatibility guarantee. No automatic migration, reconciliation, or
  adapter path is required for them.
- If an old saved state or package cannot be safely interpreted, the application
  rejects or ignores it explicitly and starts from the new source configuration
  rather than partially merging stale data. Users can then make new edits and
  export a new package.
- Existing page, panel, fullscreen, filtering, data-source, and Quorum behaviors
  remain available through the shared runtime when represented in the new
  source configuration.
- The redesign may reorganize controls, but destructive or closing authoring
  actions retain their transactional guarantees.
- Mode preference and redesigned saved state use new namespaced keys or an
  explicit schema revision so pre-redesign values cannot be silently applied.
- Presentation state is never written into the dashboard bundle.

## Alternatives Rejected

### Persona-specific applications or builds

Rejected because all users should access all views, and separate builds would
create drift in charts, data, configuration, and accessibility behavior.

### Role-based hiding or permissions

Rejected because the current distinction is conceptual UX framing, not an
authorization requirement. Adding RBAC would solve a different problem.

### Keep only the current View/Edit toggle

Rejected because it does not model the Build workspace or the two-screen
presentation relationship. It would continue to overload one shell.

### Adopt a generic dashboard template or new UI framework

Rejected for this redesign. Next.js, Tailwind, MUI, shadcn, or a wholesale
template would add architectural migration without addressing the product's
actual task model. React, Vite, CSS, ECharts, and the icon registry remain.

### Add React Router for modes

Rejected as unnecessary. The application already owns page state, and a small
display-entry query can be parsed without introducing routing infrastructure.

### Add networked cross-device presentation control now

Deferred because it requires authentication/session security, discovery,
transport, and network-failure decisions. Same-computer dual-window control
delivers the requested moderated large-screen workflow with much less risk.

## Skill and Repository Strategy

Gemini's report is treated as discovery material, not design authority. The
implementation should rely first on skills that can inspect this repository and
produce artifacts tied to its actual V3, ECharts, icon, and offline contracts.

- `superpowers:brainstorming` is the decision-making skill for this design. It
  produced the task-mode architecture and explicit scope boundaries.
- `gsd-ui-review`, `gsd-ui-phase`, and `gsd-sketch` are stronger next tools than
  a generic template because they can audit, specify, and prototype against the
  live application.
- UI/UX Pro Max is a useful optional reference during token and sketch work if
  its exact version is inspected and pinned. Its generated guidance must be
  reconciled with tablet touch targets, presentation distance, chart semantics,
  and the existing icon authority.
- Existing Playwright checks plus direct keyboard, touch, and projected-display
  review are sufficient for this prototype. Do not add an accessibility
  dependency or claim comprehensive conformance.
- Screenshot heuristic review is suitable for cheap comparison of visual
  hierarchy across modes, but it cannot validate keyboard, touch, state
  transitions, or moderator/display synchronization.
- Product Designer and Figma-oriented skills are optional only if real
  observation data or a maintained Figma source becomes available. Neither is
  required to begin.

## Phased Redesign Plan

Each step names the skills needed for that step. A skill is invoked only when
its step begins; listing it here does not authorize unrelated changes.

| Step | Outcome | Skills and supporting tools | Exit evidence |
| ---: | --- | --- | --- |
| 1 | Isolate the work on a clean branch based on current `main`; preserve the stale checkout and its uncommitted files. | `superpowers:using-git-worktrees` | Managed worktree on `codex/three-mode-dashboard-design`; baseline and branch recorded. |
| 2 | Audit the live baseline at desktop, iPad-sized portrait/landscape, and 16:9 display sizes. Record hierarchy, density, touch, authoring, and presentation gaps without redesigning from screenshots alone. | `gsd-ui-review`; `browser:control-in-app-browser`; screenshot heuristic reference | Prioritized baseline findings with screenshots and explicit observations versus inferences. |
| 3 | Convert this architecture into a UI contract covering navigation, tokens, component states, responsive behavior, accessibility, Build workspace, View shell, and Present controller/display. | `gsd-ui-phase`; `superpowers:brainstorming` only if a new material decision emerges | Reviewed `UI-SPEC.md` with no unresolved structural decisions. |
| 4 | Create disposable HTML sketches for the application frame and the three mode shells; compare at realistic widths before touching production components. | `gsd-sketch`; optional pinned UI/UX Pro Max reference | Approved sketch direction for View, Build, controller, and audience display. |
| 5 | Translate the approved UI contract and sketches into a file-by-file implementation plan with small vertical slices and focused verification. | `superpowers:writing-plans` | Reviewed implementation plan naming files, dependencies, behaviors, and acceptance checks. |
| 6 | Add the shared mode foundation: typed/validated mode model, app-frame switcher, mode persistence, shared-state preservation, saved-state cutover, and display-entry parsing. | `gsd-execute-phase`; project test policy; `superpowers:test-driven-development` scaled to focused changed behavior | All three shells are reachable by every user; no permission model is introduced; any persisted-state cutover is explicit; focused mode-state checks pass. |
| 7 | Refine View and build the Build workspace around the existing transactional authoring flows. Introduce semantic tokens and compact/comfortable density without replacing the icon or chart systems. | `gsd-execute-phase`; `browser:control-in-app-browser`; focused component tests | Core exploration and authoring tasks work on desktop and tablet; failed edits retain context; accepted sketches are faithfully implemented. |
| 8 | Implement Present controller and audience window with handshake, full snapshot, incremental state, selection/reorder, synchronized time, blackout, and reconnect behavior. | `gsd-execute-phase`; `superpowers:systematic-debugging` only for observed failures; focused Playwright checks | A moderator controls a separate 16:9 audience window on one computer; reload/reconnect and blocked-popup paths are understandable. |
| 9 | Validate the complete experience proportionally across the three tasks, then address only findings that affect acceptance. | `gsd-ui-review`; `gsd-verify-work`; `superpowers:verification-before-completion` | Task-based UAT, keyboard/touch checks, realistic audience-display review, and the repository's explicitly requested pre-merge gates pass once. |
| 10 | Update concise user documentation and prepare the reviewed branch for integration without deploying it. | `gsd-docs-update`; `gsd-ship` | Manuals explain all three modes and the prototype disclaimer; approved PR candidate is ready. |

## Acceptance Criteria

- A visible mode switch lets every user enter View, Build, and Present; there is
  no role lookup, permission check, or persona-specific build.
- All modes render the same version-3 dashboard content and chart behavior.
- Switching mode preserves the active page and compatible state; unsaved Build
  drafts are never silently discarded.
- View is calm and usable on desktop and iPad-sized portrait and landscape
  viewports without exposing persistent authoring chrome.
- Build provides clear structure, canvas, and contextual editing regions while
  preserving transactional save, reset, create, and removal behavior.
- Present lets a moderator open and control a separate, chrome-free audience
  display on the same computer.
- The audience display supports one to four selected charts, ordering, layout,
  synchronized time where relevant, blackout, reload handshake, and a neutral
  holding state.
- Presentation controls and payloads do not mutate or duplicate dashboard
  configuration or datasets.
- Density changes across Compact, Comfortable, and Spacious profiles retain
  stable chart and status semantics.
- Keyboard, touch, reduced-motion, focus, and large-room legibility checks cover
  the interactions each mode actually requires.
- Static hosting, PWA/offline behavior, new-package export, standalone operation,
  Quorum compatibility, and the generated icon authority remain intact. Loading
  pre-redesign browser saves and package files is not required.

## Explicit Non-goals

- Authentication, accounts, permissions, RBAC, or persona-specific access
- Networked control between separate computers or tablets
- Participant rosters, invitations, scheduling, or exercise administration
  beyond dashboard and package preparation
- A second dashboard configuration version or version-2 compatibility
- Automatic migration or reconciliation for pre-redesign browser-saved
  dashboards or packaged bundles
- React Router, a backend service, or a new frontend framework
- Replacing ECharts, the chart registry, or the generated icon system
- Redesigning the Quorum protocol
- Deploying, merging, or advancing the Cloudflare branch as part of design work
- Commercialization, production hardening, warranties, service guarantees,
  compliance work, or release-grade security infrastructure
