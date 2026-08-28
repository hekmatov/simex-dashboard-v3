# V3 Step 9 Final Acceptance

Date: 2026-08-28  
Branch: `codex/v3-step-9-final-acceptance`  
Accepted base: `4032903b2b8a13060cc17157ed4b7a6482c191d8`  
Reviewed implementation candidate: `234bb3a707894ed405f1041159e539bae68e8ff3`

## Verdict

**Technical acceptance: PASS. Final human visual approval: pending exact-head preview.**

No open P0 or P1 finding remains in the Step 9 acceptance boundary. Work intentionally stopped before merge, push, deploy, branch/worktree removal, or Step 10.

## Closed P1 boundaries

| Boundary | Accepted behavior | Verification |
| --- | --- | --- |
| Dashboard-map reflow | Actual 200% page zoom retains the first usable map row without root overflow. An open desktop map now compresses the Build command grid to two columns; actionable controls do not intersect the drawer and command overflow is `0` (focused RED was `126px`). | Focused 200% journey `1/1`; focused desktop obstruction journey `1/1`. |
| Authored Audience endpoint propagation | The public workflow durably saves and publishes the authored Scene position `{ xPermille: 0, yPermille: 1000, widthPermille: 280 }`; the bottom endpoint remains fully visible. | Focused public-workflow journey `1/1`; Step 8 endpoint journey passed in the presentation selection. |
| Scene pruning integrity | Removing a Page or Chrono Group prunes only Scenes whose exact saved parent was removed; unrelated and partially surviving Scenes remain intact. | Focused Node selection `16/16`. |

The final root-browser aggregate also exposed two P1 manifestations inside existing acceptance contracts. Both were closed without expanding Step 9:

- An accepted Quorum `companion_set` issued while canonical Home is active now routes to View and mounts the existing `DashboardRenderer`-owned immersive surface. It does not alter the frozen protocol or persist a new mode preference. The complete focused companion journey is `9/9`.
- A compressed desktop frame no longer leaves the four-column Build command grid beneath the higher-z-index Dashboard-map drawer. The focused geometry and preserved 200% journeys are both green.

The bounded correction review returned **CLEAN**, with no P0/P1 finding.

## Final verification

### Deterministic

- Complete Node suite: **1797/1797 passed**, 0 failed (`273290ms`).
- Static/runtime boundary: **passed**; no remote runtime dependency.
- Frozen normalized Quorum contract: **passed**, SHA-256 `a876d0b83c9f40ea5179723b9c4304f8873b393142e4a790711af80ed363662c`.
- Icon catalogue: **current**.
- Biomedical derivatives: **current** (`146080` map rows, `415` aggregate rows, `352` bubble rows, `415` dates, `352` municipalities).

### Browser and real use

- Root unrestricted aggregate: **172/201 passed; 29 failed** before the final bounded corrections.
  - Four Quorum failures were closed; the complete affected spec is now `9/9`.
  - One real desktop Dashboard-map obstruction was closed; its focused check and the preserved 200% check are green.
  - One Dashboard-map failure is a retired ordinary-Home tree selector and is deferred.
  - The remaining 23 results were classified as P2 test/theme/performance debt or invalid static-gate setup. No additional P0/P1 was found.
- Present/Audience selection: **9/10 passed** on its unrestricted run. The sole miss was the synthetic liveness glyph transition while both pages shared a renderer during an 8-second event-loop block; its immediate focused rerun passed `1/1`, while deterministic channel contracts remained green. No product change was justified.
- Independent 1920 public-workflow Audience acceptance: **1/1 passed**.
- Production static/offline selection under `playwright.static.config.js`: **2/2 passed**, including cold-offline Present and Audience launch from the finalized transitive runtime graph.
- Production `build:cloudflare`: **passed** and finalized the content-addressed runtime-precache manifest.
- Independent `verify:v3-static`: **passed**.

## Accessibility and layout evidence

- Actual page-scale factor `2` preserves text/actions and forbids root horizontal overflow.
- Keyboard focus, screen-reader names/states, `44×44` touch targets, and phone recovery behavior passed their Step 9 acceptance journeys.
- The 1920×1080 Audience root measures the full viewport from `(0,0)`, with no document overflow. Header, Scene name, authored date, grid, chart frames, and primary visuals remain contained; cells are pairwise non-overlapping, each cell is at least `480×300`, and each primary visual occupies at least half its cell in both dimensions.
- Durable screenshot: [Audience 1920×1080 room-distance](./screenshots/audience-1920x1080-room-distance.png).

## Deferred post-Step-9 backlog

These lower-severity findings do not invalidate Step 9 and were deliberately not repaired:

- stale canonical-Home/page-navigation/reload drivers and one retired Dashboard-map Home tree selector;
- two ambiguous unscoped Build-state locators;
- three P2 theme leaks in secondary authoring/presentation surfaces;
- one large-package import timing threshold that completed shortly after its assertion timeout; and
- robustness of the synthetic same-renderer liveness-stall fixture.

The root-run static-offline failure is not backlog: it used the wrong server configuration and was superseded by the correctly finalized production gate at `2/2`.

## Scope confirmation

- No assertion was weakened to fit a fixture.
- No private browser backdoor was introduced.
- The accepted Step 6–8, canonical Home, Present/Audience, Quorum, offline-cache, and service-worker ownership contracts remain unchanged.
- No Step 10 implementation, merge, push, publish, deploy, or branch/worktree deletion occurred.
