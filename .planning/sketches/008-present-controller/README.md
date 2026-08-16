---
sketch: 008
name: present-controller
question: "How should a moderator control Audience output confidently and preserve the last valid output?"
status: Approved
winner: "A — Live Sidecar"
tags: [present, audience, controller, live-preview, composition, playback, lifecycle, safety]
---

# Sketch 008: Present controller

## Design question

How should the Present controller contain and prioritize a live Audience monitor, composition tools, playback, lifecycle status, and safety actions so a moderator can operate confidently without losing sight of the last valid output?

This sketch compares only the controller's **containment and attention hierarchy**. Every variant uses the same fixture, controller authority, session state, Audience output, interaction vocabulary, validation, and lifecycle transitions. Switching A/B/C preserves the complete live presentation session; it does not reset the selected source, chart set, order, layout, title state, active frame, seconds per frame, Scene-date position, playback, connection, blank, blackout, or last-valid snapshot.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/008-present-controller/index.html?round=1` while the local sketch server is running.

## Decision boundary

The sketch decides:

- the relative prominence of the 16:9 Audience monitor and moderator controls;
- whether composition tools are persistent, tray-based, or drawer-based;
- the placement and grouping of lifecycle, transport, and safety controls;
- catalogue disclosure and independent scrolling; and
- how the controller retains operational context at `1440×900` and `1024×768`.

It does **not** reconsider:

- controller authority, one-to-four-chart limits, count-valid layouts, playback semantics, lifecycle transitions, or Audience passivity;
- saved Scene or Time Group ownership, temporal matching, chart semantics, dashboard order, or canonical chart geometry;
- the approved visual-style and palette portfolio;
- named Audience composition presets, which remain deferred as `AUD-PRESET-01`;
- cross-device presentation, remote control, identity/permissions, or a network service;
- Quorum protocol/schema, serialized dashboard format, renderer/state ownership, or production persistence; or
- production architecture, implementation modules, final responsive breakpoint, or physical Audience legibility evidence.

The prototype contains no proof-review gate, **Take Live** staging, or second approval step. A complete valid controller change updates preview and Audience immediately. An invalid or **Needs attention** selection is rejected, the controller explains why, and the last-valid Audience output remains unchanged.

## Shared reconciled fixture

- Dashboard: **Regional Respiratory Preparedness**
- Page: **Executive surveillance**
- Time Group: **Winter response 2026**
- Scene: **March operational pressure briefing**
- Dashboard timezone: **Europe/Berlin**
- Initial Scene composition, in authored order: **Confirmed cases**, **Municipality outbreak map**, and **Hospital load**
- Scene frame: **15 Mar 2026**, initially paused
- Effective playback interval: **2.5 seconds per frame**
- Group matching policy: **Interpolate**
- Initial Present layout: **Large left**
- Complete six-chart catalogue: **Confirmed cases**, **Regional R values**, **Municipality outbreak map**, **Regional comparison**, **Vaccination rate by dose and priority cohort with dense legend**, and **Hospital load**

All variants use the same chart identities, values, legends, annotations, temporal provenance, source selection, and session ledger. The fixture supports loading the saved Scene, loading the Time Group for manual composition, and exercising a mixed composition in which a chart outside the active group remains visibly static.

## Fixed shared behavior

### Composition and monitor

- The controller may load a saved Scene or Time Group, or compose manually from zero to four charts.
- Selected chart order determines Audience reading order. A fifth chart is reason-disabled until a selected chart is removed; no chart is silently replaced.
- The complete count-valid layout catalogue is available:
  - one chart: **Single**;
  - two charts: **Side by side** or **Over under**;
  - three charts: **One on top**, **One on bottom**, **One on left**, or **One on right**; and
  - four charts: **2 × 2**.
- The compact 16:9 monitor shows chart identity and order, chosen layout, shared-title state and placement, active date, key values, annotations, blackout, and connection truth. It is operational evidence, not a substitute for physical `1920×1080` Audience legibility validation.
- Five shared Audience facts are independently optional session controls: **Dashboard name**, **Page**, **Parent Time Group**, **Scene name**, and **Scene date**. Hiding one retains its value. Hiding all four header facts collapses the shared header so charts reclaim that space; hiding Scene date retains its position and reason-disables **Save date position to Scene** until the date is shown again.
- Chart-local titles, axes, legends, annotations, values, and temporal provenance remain mandatory regardless of these choices. Connected-empty holding, deliberate blank, active output, and Blackout are distinct.

### Playback and temporal state

- Manual transport includes Previous, Next, and direct seek. Play/Pause is available for compatible authored content.
- First activation starts paused at the first valid frame. Returning to a source within the session restores its last-valid frame, still paused.
- Scene/Time Group change, direct seek, Previous/Next, composition changes, Blackout, disconnection, reconnection, or leaving Present pauses autoplay.
- Autoplay stops at the final frame and remains paused; it does not loop or reset.
- Playback timing uses a positive finite numeric **Seconds per frame** value. The initial value is `2.5`; a moderator override is ephemeral and does not mutate the saved Scene or Time Group.
- This numeric vocabulary supersedes the older UI-contract wording that named Slow/Normal/Fast cadence tiers. The prototype must not translate the value back into qualitative speed labels.
- Reveal to frame versus Full timeline, authored matching, and any compatible session override remain temporally truthful and shared across variants.

### Lifecycle, recovery, and safety

- Frequent and safety controls stay persistently reachable without catalogue scrolling: **Open Audience Display/Reopen Audience Display**, connection status, Previous, Next, Play/Pause, direct seek, Seconds per frame, **Blackout Audience/Restore Audience**, and **End Presentation**.
- Connection states remain distinct: **Not opened**, **Opening/Waiting**, **Connected**, **Disconnected**, **Reconnecting**, **Restored**, and **Ended**.
- Output states remain distinct from connection state: **Holding**, **Deliberate blank**, **Active**, and **Blackout**. Needs attention is a rejected update/validation condition, not a connection state.
- Disconnection or reconnection retains the last-valid output fully readable when an Audience surface still exists. The Audience adds only the required nontechnical, noninteractive, programmatically named corner indicator; controller detail and recovery actions stay in Present.
- Reopen sends one complete fresh snapshot and preserves composition, order, layout, title, blank, time source and position, and Blackout. Playback remains paused after restoration.
- Blackout/Restore is reversible and does not clear composition, deliberate-blank choice, filters, source, or saved dashboard state.
- End Presentation stops playback and ends the channel without confusing Ended with recoverable disconnection. The ephemeral controller workspace may remain available for starting a new session.

### Audience and Scene-date boundary

- Audience is passive and chrome-free. It exposes no composition, playback, connection-recovery, or moderator actions.
- The moderator may drag the Scene date only in the Present live monitor, with keyboard movement available. The session position survives composition, layout, lifecycle, and variant changes.
- **Save date position to Scene** deliberately copies the session position into the saved Scene. This user-approved Sketch 001 contract expansion still requires later production specification for its schema, mutation authority, concurrency, validation, and save-failure behavior.

## Live variants

### A — Live Sidecar · Approved winner

A viewport-owned workspace places the dominant 16:9 Audience monitor on the left, a persistent composition sidecar on the right, and a direct cue-and-safety dock below. Selected charts stay above an independently scrolling catalogue.

**Hypothesis:** output proof, composition, lifecycle status, and safety actions remain simultaneously visible, especially on wide moderator displays.

**Reject if:** the sidecar truncates chart identity or state copy, the monitor becomes too small to verify required content, or catalogue position can hide frequent or safety actions.

### B — Broadcast Bench · Rejected, preserved

A full-width Program Monitor sits above a bounded command bench containing composition, cue/time, and session/safety zones. The catalogue opens as an internally scrolling tray within the bench.

**Hypothesis:** the horizontal production-console model gives timelines and long labels generous width and carries forward the familiar lower-controller placement from Sketch 007.

**Reject if:** the bench squeezes the monitor at `1024×768`, wraps critical actions ambiguously, or opening the catalogue tray causes document travel or hides the state being changed.

**Decision:** rejected because its vertical pressure at the supported `1024×768` controller size did not earn a meaningful operational advantage over A's persistent sidecar. Preserved as containment evidence.

### C — Focus Stage · Rejected, preserved

A near-full-viewport Program Monitor is framed by a compact lifecycle header and persistent transport/safety ribbon. Composition and output settings open in keyboard-accessible side drawers.

**Hypothesis:** maximum monitor fidelity produces the calmest resting state while progressive disclosure contains occasional setup controls.

**Reject if:** drawers obscure the evidence being changed, create avoidable switching or focus burden, or make composition, recovery, and last-valid status difficult to inspect together.

**Decision:** rejected because hiding composition and output settings behind drawers adds working-memory and recovery cost during live moderation. Preserved as progressive-disclosure evidence.

## Representative lifecycle task

1. Open the Audience display and distinguish Not opened, Opening/Waiting, Connected empty, and active output.
2. Load **March operational pressure briefing** and confirm its three charts, order, Large-left layout, active date, temporal provenance, and `2.5` seconds per frame.
3. Add and reorder a fourth chart, inspect **2 × 2**, then attempt a fifth chart and confirm the cap is explained without changing Audience.
4. Exercise every count-valid one-, two-, three-, and four-chart layout. Toggle Dashboard name, Page, Parent Time Group, Scene name, and Scene date independently; hide all header facts and confirm charts reclaim the space; show the date again and confirm its position was retained. Then exercise holding and deliberate blank.
5. Play, pause, seek, step Previous/Next, change Seconds per frame, and confirm manual and safety actions leave playback paused as specified.
6. Drag and keyboard-move the Scene date in the monitor, switch variants, then use **Save date position to Scene** and confirm session-only versus Scene-saved status remains explicit.
7. Invoke Blackout and Restore; confirm the retained composition and time return while playback remains paused.
8. Attempt an invalid or Needs-attention Scene/output change and confirm the reason appears only in the controller while the previous valid Audience output remains unchanged.
9. Disconnect, inspect the retained stale output, Reopen, verify the complete fresh snapshot, and confirm Restored remains paused.
10. End Presentation and confirm the ended channel does not silently reconnect. Repeat the core composition and safety path at `1024×768`, then inspect the unsupported phone boundary.

## What to compare

- Whether live output remains the strongest visual anchor without starving composition and playback of usable space.
- Whether the moderator can understand source, composition, time, connection, output, and safety state at a glance.
- Whether long chart names and lifecycle copy remain legible without hiding identity or actions.
- Whether catalogue scrolling stays bounded and independent from the monitor and persistent safety controls.
- Whether A's persistent sidecar earns its width, B's command bench earns its height, or C's drawers earn their additional disclosure and focus transitions.
- Whether each containment model remains workable at `1440×900` and `1024×768` without document-level horizontal overflow or essential off-screen controls.
- Whether invalid selection, Blackout, disconnection, reopening, restoration, and ending always preserve truthful distinctions and last-valid output.

## Responsive and accessibility boundary

Present controller acceptance covers `1440×900` and `1024×768`. At supported widths, content may recompose, but the monitor, current source and time, connection/output truth, and frequent/safety actions remain reachable without document-level horizontal scrolling. Long catalogues scroll within their own bounded region.

Phone-sized Present is unsupported. At the canonical `390×844` fixture, the sketch shows the persistent, non-dismissible unsupported-mode banner above product chrome with a direct **Switch to View** action. Detection does not redirect automatically, discard session state, or redefine Audience output.

Every action is keyboard and touch operable, with visible focus, meaningful accessible names, and 44-pixel activation targets. Drawers contain focus only while open and restore it to their invoker. Playback and lifecycle changes are announced without moving focus on every tick. Colour and motion are never the sole expression of state; reduced motion removes non-essential transitions.

## Architecture declaration for all candidates

Each variant makes the same Step 4 architecture declaration:

- it introduces no runtime-only remote dependency, generic dashboard framework, or new asset service;
- it remains feasible with the existing React, Vite, CSS, ECharts, and SimEx glyph foundations;
- Present and Audience use the approved same-computer, same-origin lightweight display-state channel;
- the canonical V3 renderer and one shared state/session ledger remain the only chart and presentation truth—variant switching changes containment only;
- presentation composition, playback, blank, Blackout, and moderator timing overrides remain ephemeral and are excluded from the serialized dashboard bundle;
- no Quorum protocol, schema, message, fallback, or availability contract changes; and
- the controller/Audience path remains compatible with the existing static/offline authority.

These declarations demonstrate candidate compatibility only. This disposable Step 4 sketch does not implement production components, exercise the production static build, prove offline/PWA behavior, run a Quorum diff, or replace later canonical-renderer verification.

## Decision status

**Approved — A: Live Sidecar.** It keeps the monitor, selected composition, independently scrolling catalogue, output settings, transport, lifecycle truth, and safety actions simultaneously available with the least disclosure burden. B is rejected for avoidable vertical pressure at `1024×768`; C is rejected for drawer-driven working-memory and recovery cost. Both remain preserved, switchable evidence. The five optional shared Audience facts are part of the approved controller behavior; chart-local evidence remains mandatory.

## Relevant authority

- `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md` — `ARCH-01`–`ARCH-09`, `PRES-01`–`PRES-12` except the corrected cadence vocabulary, `LIFE-01`–`LIFE-15`, `STATE-08`–`STATE-14`, controller/Audience copy, coverage, accessibility, and Step 4 declaration boundaries.
- `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md` — numeric Seconds per frame, Scene/Time Group loading, session-only presentation changes, safety pauses, invalid/Needs-attention rejection, last-valid retention, passive Audience behavior, and `TEMP-FIX-13`.
- `.planning/sketches/001-audience-output/README.md` — approved passive `1920×1080` Audience composition, complete count-valid layouts, title placement, lifecycle output, and moderator-owned Scene-date movement/save behavior.
- `.planning/sketches/003-dashboard-visual-language/README.md` — approved visual styles, portable palette roles, state grammar, and long-content treatment.
- `.planning/sketches/006-scene-authoring/README.md` — approved two-stage Scene fixture, Present subset/order/layout, matching hierarchy, and numeric playback timing.
- `.planning/sketches/007-view-chrono/README.md` — approved View playback vocabulary and lower-deck placement evidence; Present remains a separate controller surface.
- `docs/audits/2026-08-11-three-mode-dashboard-baseline/PRESENT-AUDIENCE-FINDINGS.md` — accepted evidence for existing controller hierarchy, catalogue travel, and current Present/Audience behavior; its geometry is not approved design authority.
- `.planning/sketches/MANIFEST.md` — sketch sequence, deferred Audience presets, and the View-only phone boundary.
