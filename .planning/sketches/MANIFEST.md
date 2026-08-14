# V3 Dashboard visual-design sketches

## Design direction

Step 4 compares interactive, disposable design directions for the approved V3 dashboard contracts. Structural sketches use a neutral visual treatment until `003-dashboard-visual-language` approves a three-style institutional portfolio. No sketch is production implementation authority by itself; only an explicitly approved winner or synthesis is carried forward.

## Reference points

- Normative UI contract: `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`
- Normative temporal contract: `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md`
- Normative chart-creation contract: `docs/superpowers/specs/2026-08-12-chart-creation-design.md`
- Accepted baseline evidence: `docs/audits/2026-08-11-three-mode-dashboard-baseline/`
- Historical 2026-08-10 prototypes are evidence only and are not approved design authority.

## Sketch register

| # | Name | Design question | Status | Winner | Tags |
|---:|---|---|---|---|---|
| 001 | Audience output | What composition and hierarchy make the fixed 16:9 Audience output legible and calm? | Approved | Synthesis — A top default; B/C settings | Audience, 16:9, composition, legibility |
| 002 | Contextual panel editing | How can a builder edit progressively without changing View-equivalent geometry or losing sight of the target? | Approved | A — Unit Orbit + universal 2×4 footprint picker | Build, parity, contextual editing, chart-owned sizing |
| 003 | Dashboard visual language | What three complementary institutional aesthetic philosophies should V3 support? | Pending | Pending | themes, light/dark/system, style portfolio |
| 004 | Chart creation | How should guided creation combine canonical preview with non-mutating placement proof? | Pending | Pending | Build, workflow, preview |
| 005 | Time Group authoring | How should temporal availability and membership remain understandable at realistic density? | Pending | Pending | time groups, availability, authoring |
| 006 | Scene authoring | How should composition connect to increasingly advanced temporal behavior? | Pending | Pending | scenes, composition, temporal authoring |
| 007 | View Chrono | How should View enter Chrono without losing dashboard usability or playback clarity? | Pending | Pending | View, Chrono, playback |
| 008 | Present controller | How should a moderator control Audience output confidently and preserve the last valid output? | Pending | Pending | Present, Audience, controller |
| 009 | Shared shell and product chrome | How should approved winners fit one coherent shell and final visual synthesis? | Pending | Pending | shell, navigation, chrome, synthesis |

## Sequence

Sketches proceed in ascending order. Only the current sketch is built before review. Rejected variants remain in their sketch, and no winner is recorded before the representative task has been exercised.

## Deferred product features

| ID | Feature | Deferred boundary |
|---|---|---|
| AUD-PRESET-01 | **Named Audience composition presets.** Let a presenter save the current ordered chart set, count-valid Audience layout, title visibility, and shared-title placement, then browse and load a list of saved compositions. | Use **Audience composition preset**, not snapshot: it does not capture datasets, resolved values, filters, active frame, playback state, cadence overrides, blackout, connection/session state, or the per-Scene date position. Loading resolves current dashboard data/time and must reject stale or invalid references without changing the last-valid Audience output. Later specification must decide whether presets are standalone dashboard content, browser-local preferences, or projections of saved Scenes. Until then, Present composition remains ephemeral and protocol/schema are unchanged. |
