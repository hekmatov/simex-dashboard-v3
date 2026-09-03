# Ledger Material and Audit Region Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for every production behavior change. This plan is executed in the existing amendment worktree; do not create commits, merge, push, publish, or deploy during the open amendment batch.

**Goal:** Restrict Ledger's repeating horizontal ruling to two explicit data-register regions and replace flat journey-count coverage claims with a journey plus owned-region audit contract that detects unowned nested chrome.

**Architecture:** The existing 71-entry Playwright catalogue remains a journey/state manifest. A production-owned region registry separately declares visual ownership, role, material, lifecycle, and journey witnesses; an independent candidate classifier reports unowned, ambiguous, missing, unwitnessed, and unstyled regions. Dashboard style role paint remains geometry-invariant, while Ledger register ruling is applied as an explicit material layer rather than inherited from a semantic role.

**Tech Stack:** React 19, Vite SSR, CSS custom properties, Node test runner, existing Playwright audit collector (wiring only; browser execution deferred)

**Spec:** `docs/superpowers/specs/2026-09-02-ledger-material-and-audit-coverage-amendment.md`

## Global Constraints

- Repeating Ledger ruling is permitted only on `.chart-table-view` and `.source-viewer-table-wrap`.
- Shell, command-bar, panel, editor, dialog, drawer, menu, status, and chart-cell Ledger role backgrounds resolve to `none`.
- Shared geometry and behavior remain invariant across Ledger, Humanist, and Instrument.
- The Build command header is a persistent `command-bar` region and must carry a production region marker.
- Candidate discovery is independent of the registry it validates.
- Keyboard, focus, tab-order, screen-reader, ARIA-quality, assistive-technology, touch-first, and responsive mobile checks remain excluded.
- Browser/E2E execution remains deferred; use only the targeted deterministic Node selection.
- Preserve all unrelated dirty-worktree changes. Do not commit, merge, push, publish, or deploy.

---

### Task 1: Owned visual-region registry and live Build ownership

**Files:**

- Create: `src/theme/dashboardRegionRegistry.js`
- Create: `tests/dashboardRegionRegistry.test.js`
- Modify: `src/components/build/BuildCommandHeader.jsx`
- Modify: `tests/buildCommandHeader.test.js`

**Interfaces:**

- Produces: `DASHBOARD_REGION_ROLES`, `DASHBOARD_REGION_LIFECYCLES`, `DASHBOARD_REGION_MATERIALS`, `DASHBOARD_OWNED_REGION_REGISTRY`, `dashboardOwnedRegionFor(id)`, `dashboardOwnedRegionProps(id)`, `dashboardOwnedRegionIdsForJourney(journeyId)`, and `validateDashboardOwnedRegionRegistry(registry, journeyManifest)`.
- Region records contain `id`, `owner`, `selector`, `liveSelectors`, `role`, `material`, `lifecycle`, `parentId`, `witnesses`, `styleWitnessRequired`, and `exclusion`.
- `dashboardOwnedRegionProps("build-command-header")` returns `data-dashboard-region`, `data-dashboard-surface-role`, and `data-dashboard-material` props for the live root.

- [ ] **Step 1: Write the failing registry contract**

Create tests that hand-derive the required rules:

```js
test("registers persistent command chrome independently of journey shells", () => {
  const build = dashboardOwnedRegionFor("build-command-header");
  assert.deepEqual({
    owner: build.owner,
    role: build.role,
    material: build.material,
    lifecycle: build.lifecycle,
    witnesses: build.witnesses,
  }, {
    owner: "BuildCommandHeader",
    role: "command-bar",
    material: "flat",
    lifecycle: "persistent",
    witnesses: ["build-compact", "build-standard", "build-page-actions", "build-page-command-form"],
  });
});

test("only the two data registers permit Ledger ruling", () => {
  assert.deepEqual(
    DASHBOARD_OWNED_REGION_REGISTRY
      .filter(({ material }) => material === "ledger-register")
      .map(({ selector }) => selector)
      .sort(),
    [".chart-table-view", ".source-viewer-table-wrap"],
  );
});
```

Add a live SSR assertion to `tests/buildCommandHeader.test.js` requiring the root section to render:

```html
data-dashboard-region="build-command-header"
data-dashboard-surface-role="command-bar"
data-dashboard-material="flat"
```

The production change that makes these tests pass is a real owned-region registry plus a live Build marker; a handwritten test-only fixture cannot satisfy them.

- [ ] **Step 2: Run the RED tests**

Run:

```powershell
node --test tests/dashboardRegionRegistry.test.js tests/buildCommandHeader.test.js
```

Expected: FAIL because the registry module does not exist and the live Build root lacks the three ownership attributes.

- [ ] **Step 3: Implement the immutable registry and validation**

Define the ten roles:

```js
[
  "shell", "command-bar", "panel", "editor", "dialog",
  "drawer", "menu", "status", "table", "chart-cell",
]
```

Seed the registry with these current region families and live selectors:

- application, Home, View, Build, Present, Audience, source-viewer, recovery, and desktop-gate shells;
- global command crown, Build command header, Build page navigation, View playback controls, and Present action dock command bars;
- dashboard headers, Dashboard Map, chart panels, unit orbit, Present context/scene, and Scenario Passport panels;
- chart authoring, source content, temporal/scene, and static-content editor boundaries;
- shared dialog, drawer, menu/popover, status, table, and chart-cell boundaries already styled by the shared grammar;
- `.chart-table-view` and `.source-viewer-table-wrap` as the only `ledger-register` records.

Validation returns issue objects instead of throwing for aggregate errors. It detects duplicate IDs/selectors, invalid enums, missing owner/selector/witnesses, unknown journey witnesses, unknown parents, parent cycles, and `ledger-register` material on a non-table role.

- [ ] **Step 4: Mark the live Build command header from the registry**

Import `dashboardOwnedRegionProps` into `BuildCommandHeader.jsx` and spread the returned props onto the root `<section>`. Do not duplicate role or material string literals in the component.

- [ ] **Step 5: Run the GREEN tests**

Run the same command from Step 2. Expected: PASS with no warnings.

---

### Task 2: Selective Ledger material and shared command-bar paint

**Files:**

- Modify: `src/theme/dashboardStyleGrammar.js`
- Modify: `src/theme/dashboardSurfaceRoles.js`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `tests/dashboardStyleGrammar.test.js`
- Modify: `tests/dashboardStyleSurfaceRoles.test.js`
- Modify: `tests/dashboardSurfaceRoles.test.js`

**Interfaces:**

- Consumes: region roles and the two `ledger-register` selectors from Task 1.
- Produces: `--simex-role-command-bar-background` and `--simex-material-ledger-register-background`.
- Keeps: `resolveDashboardStyleGrammar(dashboardStyle, resolvedAppearance)` public signature unchanged.

- [ ] **Step 1: Write failing resolver and CSS-consumer tests**

Add a resolver test asserting all ten Ledger role backgrounds equal `none`, the Ledger register material begins with `repeating-linear-gradient(`, and Humanist/Instrument register material equals `none`.

Extend role CSS tests so `.dashboard-command-crown`, `.build-command-header`, `.build-page-navigation`, `.playback-controls`, and `.present-action-dock` consume `--simex-role-command-bar-background`.

Add a material-consumer test requiring exactly one shared rule to compose `--simex-material-ledger-register-background` and cover only `.chart-table-view` and `.source-viewer-table-wrap`.

Add a direct-leak test that rejects `repeating-linear-gradient(to bottom, ...)` inside any `[data-dashboard-style="evidence-ledger"]` selector. This must fail on the current Present context/scene override.

Update the journey-level style-signature expectation from `material: "flat-ruled"` to `material: "flat"`; register exceptions now belong to the region registry.

- [ ] **Step 2: Run the RED tests**

Run:

```powershell
node --test tests/dashboardStyleGrammar.test.js tests/dashboardStyleSurfaceRoles.test.js tests/dashboardSurfaceRoles.test.js tests/dashboardRegionRegistry.test.js
```

Expected: FAIL because Ledger still projects one repeated background to every role, no command-bar role/material variable exists, and Present contains a direct ruling override.

- [ ] **Step 3: Separate role and register material in the resolver**

Add `command-bar` to the role list. Configure Ledger with `roleBackground: "none"` and its current repeating gradient as `registerBackground`. Configure Humanist and Instrument with their current role backgrounds and `registerBackground: "none"`. Project the latter through:

```js
"--simex-material-ledger-register-background": grammar.registerBackground
```

- [ ] **Step 4: Apply the material and command-bar CSS**

Add the shared command-bar role rule for the five current chrome selectors. Change the table role to compose:

```css
background-image:
  var(--simex-style-role-rail),
  var(--simex-material-ledger-register-background),
  var(--simex-role-table-background);
```

Remove the direct Ledger repeating background on `.present-context-panel` and `.present-scene-panel`. Retain the single selected-chart top rule. Do not change chart gridline behavior or source-viewer layout.

- [ ] **Step 5: Run the GREEN tests**

Run the same command from Step 2. Expected: PASS with no warnings.

---

### Task 3: Independent region-candidate and closure sentinel

**Files:**

- Create: `tests/e2e/support/dashboard-region-closure.js`
- Create: `tests/dashboardRegionClosure.test.js`
- Modify: `tests/e2e/support/dashboard-density-audit.js`
- Modify: `tests/dashboardSurfaceManifest.test.js`

**Interfaces:**

- Consumes: `DASHBOARD_OWNED_REGION_REGISTRY` and journey IDs.
- Produces: `isDashboardRegionCandidate(facts)` and `classifyDashboardRegionClosure({ journeyId, registry, candidates, mountedRegions, knownJourneyIds })`.
- Closure failures use the exact types `UNOWNED`, `AMBIGUOUS`, `MISSING`, `UNWITNESSED`, and `UNSTYLED`.
- Collector output adds `regionCoverage` beside existing density evidence; it does not collapse coverage failures into ordinary geometry findings.

- [ ] **Step 1: Write failing pure closure tests**

Cover these literal cases:

- a named, paint-bearing, multi-action Build-like bar with only a shell at ancestor distance 2 is `UNOWNED`;
- one exact owner at distance 0 is clean;
- two peer owners at the same nearest distance are `AMBIGUOUS`;
- an expected but absent witness region is `MISSING`;
- a registry record with empty or unknown witnesses is `UNWITNESSED`;
- mismatched role/material markers or an absent shared signature is `UNSTYLED`;
- a bounded exclusion with non-empty owner and reason is accepted; and
- named structure, toolbar/navigation, sticky/fixed chrome, distinct paint, multi-action, dialog, drawer, menu, status, table, and chart-cell signals are candidates independently of registry contents.

- [ ] **Step 2: Run the RED tests**

Run:

```powershell
node --test tests/dashboardRegionClosure.test.js tests/dashboardSurfaceManifest.test.js
```

Expected: FAIL because the closure module and collector region evidence do not exist.

- [ ] **Step 3: Implement the pure classifier**

Use registry-independent candidate facts:

```js
{
  id,
  signals,
  requiresOwnBoundary,
  containingRegions: [{ regionId, distance }],
  exemption: null,
}
```

When `requiresOwnBoundary` is true, only a distance-zero registered boundary owns the candidate. Otherwise the unique nearest registered ancestor owns it. Declared parent/child nesting is valid; conflicting peers at the same nearest distance are ambiguous.

- [ ] **Step 4: Wire raw candidate discovery into the existing collector**

During `page.evaluate`, inspect the selected root and active visible portal roots for structural landmarks, toolbar/navigation roles, sticky/fixed positioning, distinct painted boxes, multiple direct actions, overlays, statuses, tables, and chart cells. Match mounted registry selectors separately and return raw candidate and mounted-region facts.

Run `classifyDashboardRegionClosure` outside `page.evaluate`, attach its result as `snapshot.regionCoverage`, and leave the future Playwright runner able to fail when closure failures are non-empty. Do not run Playwright in this amendment batch.

- [ ] **Step 5: Run the GREEN tests**

Run the same command from Step 2. Expected: PASS with no warnings.

---

### Task 4: Journey terminology, accounting, and audit documentation

**Files:**

- Modify: `tests/e2e/support/dashboard-surface-manifest.js`
- Modify: `src/theme/dashboardSurfaceRoles.js`
- Modify: `tests/dashboardSurfaceManifest.test.js`
- Modify: `tests/dashboardSurfaceRoles.test.js`
- Modify: `docs/superpowers/specs/2026-09-02-dense-desktop-visual-audit-redesign.md`
- Modify: `docs/superpowers/specs/2026-09-02-cross-style-audit-audience-distance-amendment.md`
- Modify: `docs/audits/2026-09-02-dense-desktop-redesign/SURFACE-INVENTORY.md`
- Modify: `docs/audits/2026-09-02-dense-desktop-redesign/CROSS-STYLE-MATRIX.md`

**Interfaces:**

- Produces: `DASHBOARD_JOURNEY_MANIFEST`, `summarizeDashboardJourneyManifest`, and `buildDashboardJourneyStyleDispositionMatrix`.
- Keeps compatibility aliases for existing E2E imports during the open amendment batch; aliases are explicitly documented as journey-level, not region completeness APIs.
- Consumes: registry-derived region/style accounting from Tasks 1–3.

- [ ] **Step 1: Write the failing journey/region accounting tests**

Require the journey export and summary names, assert that `71 × 3 = 213` is labelled journey/style execution accounting, and assert that region/style accounting is generated from the owned-region registry rather than the 71 journey IDs. Remove any test whose only claim is that mapping every already-listed journey proves complete surface coverage.

- [ ] **Step 2: Run the RED accounting tests**

Run:

```powershell
node --test tests/dashboardSurfaceManifest.test.js tests/dashboardSurfaceRoles.test.js tests/dashboardRegionRegistry.test.js tests/dashboardRegionClosure.test.js
```

Expected: FAIL because the old exports and assertions still describe the flat catalogue as exhaustive surfaces.

- [ ] **Step 3: Introduce journey terminology with compatibility aliases**

Export the existing catalogue as `DASHBOARD_JOURNEY_MANIFEST` and retain `DASHBOARD_SURFACE_MANIFEST` only as a compatibility alias. Do the same for its summary function. Rename the style-disposition builder to journey terminology and retain the old name only as a compatibility alias. Journey role classification may remain for contact-sheet grouping but must not be consumed as owned-region coverage.

- [ ] **Step 4: Correct the governing and evidence documents**

Update all four documents so they state:

- 71 entries and 213 cells measure journey/state execution only;
- owned-region coverage has its own registry and generated three-style denominator;
- the Build command header miss was caused by conflating descendant scanning with owned-region closure;
- the independent sentinel is the mechanism that catches future omissions;
- Ledger ruling is restricted to the two explicit data registers; and
- browser contact sheets and rendered closure remain deferred, so deterministic results are not presented as final visual sign-off.

- [ ] **Step 5: Run the complete targeted deterministic selection once**

Run:

```powershell
node --test tests/dashboardRegionRegistry.test.js tests/dashboardRegionClosure.test.js tests/buildCommandHeader.test.js tests/dashboardSurfaceManifest.test.js tests/dashboardSurfaceRoles.test.js tests/dashboardStyleSurfaceRoles.test.js tests/dashboardStyleGrammar.test.js
```

Expected: all selected tests PASS. Do not run Playwright or a full repository suite.

- [ ] **Step 6: Refresh the local review server**

Confirm the existing local server still responds at `http://127.0.0.1:4190/`. Restart the already-approved Vite development command only if the server is unavailable. This is a serving check, not browser/E2E visual sign-off.
