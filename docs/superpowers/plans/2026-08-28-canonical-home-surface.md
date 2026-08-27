# Canonical Home Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the package-authored reserved Home page with an application-owned, optionally available canonical Home mode while preserving legacy analytical content, explicit Build Save semantics, safe Clear behavior, and all accepted Step 8 contracts.

**Architecture:** Add a strict Version 6 root preference (`home.enabled`) and migrate the reserved V5-and-older Home page into ordinary analytical content before validation. App remains the sole mode and transaction authority: it renders canonical source-owned Home outside `PlaybackProvider`/`DashboardRenderer`, while authored workspaces continue to operate only on `dashboard.pages`. The existing Scenario Passport owns the explicit Home availability draft, and the existing commit controller remains the durability boundary for Save, import, and Clear.

**Tech Stack:** React 19, JavaScript ES modules, Node test runner, Vite SSR test loading, Playwright, strict dashboard configuration/bundle validators, existing browser storage and serialized commit controller.

**Spec:** `docs/superpowers/specs/2026-08-28-canonical-home-surface-design.md`

## Global Constraints

- Work only on `codex/pre-step9-canonical-home`, based on `content/cloudflare-beta` at `6cd6887678f86f60eb28b606a70cba2a8fdd54c1`; do not start Step 9.
- Treat accepted Step 8/current-source lineage as authoritative; do not copy or transplant discarded Cloudflare-line implementations.
- Home is a top-level application mode, never a synthetic or serialized `dashboard.pages` entry.
- Preserve non-reserved authored landing pages and their existing validation and destination restrictions; only the reserved legacy tuple `id === "home"`, `pageType === "landing"`, and an object `landing` record is extracted.
- Store exactly `home: { enabled: boolean }`; malformed explicit Version 6 values fail, and only `false` with zero ordinary pages normalizes to `true`.
- Preserve the legacy Home section/panel/chart/data/Chrono Group/Scene identities; migrate its analytical sections to collision-safe **Old Homepage Content**.
- Persist navigation changes only after successful Save/import/Clear commits. Failed operations retain the prior dashboard, mode, focus, and recoverable draft.
- Canonical Home must inherit current semantic dashboard theme/style variables, retain the accepted hero focus contrast boundary, and remain passive relative to playback and Present/Audience runtime ownership.
- Do not ask the user to approve plans, documents, tests, implementation details, or ordinary review corrections that directly apply the approved architecture. Stop only for a new product decision, accepted-contract contradiction, destructive/external action, or repeated concrete blocker.
- Use the bundled runtime:

```powershell
$simexNode = "C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$simexPnpm = "C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
```

- Development Playwright runs use `--max-failures=1`; the final required task-specific browser selection is unrestricted.
- Before visual acceptance, build and serve the exact candidate head, verify the URL in-browser, and keep the preview running. A later commit invalidates that preview.

---

### Task 1: Version 6 configuration, migration, package boundaries, and default authored content

**Verification budget:**

- Nearest falsifier: `tests/dashboardMigrationV6.test.js` for extraction, collision, remapping, malformed V6, and the zero-page safety repair.
- Final task gate: the focused migration/bundle/package/default-config selection listed in Step 6.
- Browser evidence: none; this slice changes normalization and serialized data rather than interaction.
- Reserved for final integration: Playwright migration journey, Cloudflare build, static verifier, and exact-head preview.

**Files:**

- Create: `src/charting/config/migrateDashboardV5ToV6.js`
- Create: `tests/dashboardMigrationV6.test.js`
- Modify: `src/charting/config/dashboardConfigStructure.js`
- Modify: `src/charting/config/dashboardBundleV3.js`
- Modify: `src/lib/loadDashboard.js`
- Modify: `src/lib/quorumCatalogue.js`
- Modify: `src/static-content/staticPanelTransaction.js`
- Modify: `src/lib/dashboardPackageCandidate.js`
- Modify: `src/content-library/contentPackageValidation.js`
- Modify: `src/lib/dashboardPackageImportTransaction.js`
- Modify: `tests/helpers/contentLibraryFixtures.js`
- Modify: `tests/dashboardBundleV5.test.js`
- Modify: `tests/dashboardPackageCandidate.test.js`
- Modify: `tests/dashboardPackageExport.test.js`
- Modify: `tests/dashboardPackageImportTransaction.test.js`
- Modify: `tests/contentPackageValidation.test.js`
- Modify: `tests/defaultDashboardV3.test.js`
- Modify: `public/config/dashboard.json`

**Interfaces:**

- Consumes: existing `migrateDashboardV3ToV4(input)`, `migrateDashboardV4ToV5(input)`, `validateDashboardStructure(config, options)`, and current V5 bundle/package normalization.
- Produces:

```js
export const LEGACY_HOME_PAGE_ID = "home";
export const LEGACY_HOME_CONTENT_TITLE = "Old Homepage Content";
export function isLegacyHomePage(page) {} // boolean
export function normalizeDashboardHomePreference(home, { ordinaryPageCount }) {} // { enabled: boolean }
export function migrateDashboardV5ToV6(input) {} // deep-cloned normalized V6 dashboard
```

- Produces current fixture `makeDashboardV6(overrides = {})`; keeps V4/V5 fixtures solely for legacy-input tests.

- [ ] **Step 1: Add RED migration and strict-schema tests**

Create focused cases with concrete assertions:

```js
test("V5 reserved Home analytical sections migrate at the same index", () => {
  const source = makeLegacyDashboard({
    pages: [ordinaryPage("before"), legacyHome({ sections: [homeOverview] }), ordinaryPage("after")],
    scenes: [{ id: "briefing", pageId: "home", chartIds: ["home_case_map"] }],
  });
  const migrated = migrateDashboardV5ToV6(source);
  assert.equal(migrated.configVersion, 6);
  assert.deepEqual(migrated.home, { enabled: true });
  assert.deepEqual(migrated.pages.map(({ id }) => id), ["before", "old-homepage-content", "after"]);
  assert.equal(migrated.pages[1].title, "Old Homepage Content");
  assert.deepEqual(migrated.pages[1].sections, source.pages[1].sections);
  assert.equal(migrated.scenes[0].pageId, "old-homepage-content");
  assert.equal(source.pages[1].id, "home");
});

test("V6 rejects malformed explicit Home and repairs only false plus zero pages", () => {
  for (const home of [null, {}, { enabled: "false" }, { enabled: true, copy: {} }]) {
    assert.throws(() => validateDashboardConfig({ ...makeDashboardV6(), home }));
  }
  assert.deepEqual(
    normalizeStoredDashboardConfig({ ...makeDashboardV6(), pages: [], home: { enabled: false } }).home,
    { enabled: true },
  );
});
```

Also assert deterministic `old-homepage-content-2` / `Old Homepage Content 2` collisions, empty legacy Home removal without placeholder creation, remapping of retained landing `hero.primaryAction.pageId` and `domainRoutes[*].pageId`, idempotent V6 normalization, and preservation of non-reserved landing pages.

- [ ] **Step 2: Run the nearest tests and confirm RED**

Run:

```powershell
& $simexNode --test tests/dashboardMigrationV6.test.js tests/dashboardBundleV5.test.js
```

Expected: failure because `migrateDashboardV5ToV6.js`, Version 6, and required `home` do not exist.

- [ ] **Step 3: Implement the minimal V5-to-V6 migration and strict V6 structure**

Implement the migration with this control flow:

```js
export function migrateDashboardV5ToV6(input) {
  const dashboard = structuredClone(input);
  if (dashboard.configVersion === 6) {
    dashboard.home = normalizeDashboardHomePreference(dashboard.home, {
      ordinaryPageCount: Array.isArray(dashboard.pages) ? dashboard.pages.length : 0,
    });
    return dashboard;
  }
  if (dashboard.configVersion !== 5) {
    throw new Error("Dashboard configuration version 5 or 6 is required.");
  }

  const pages = Array.isArray(dashboard.pages) ? dashboard.pages : [];
  const legacyIndex = pages.findIndex(isLegacyHomePage);
  const legacyHome = legacyIndex >= 0 ? pages[legacyIndex] : null;
  const ordinaryPages = pages.filter((_, index) => index !== legacyIndex);
  let replacementId = null;

  if ((legacyHome?.sections ?? []).length > 0) {
    const identity = uniqueOldHomepageContentIdentity(ordinaryPages);
    replacementId = identity.id;
    ordinaryPages.splice(legacyIndex, 0, {
      id: identity.id,
      label: identity.title,
      title: identity.title,
      description: legacyHome.description,
      sections: structuredClone(legacyHome.sections),
    });
  }

  dashboard.configVersion = 6;
  dashboard.home = { enabled: true };
  dashboard.pages = ordinaryPages;
  if (replacementId) remapLegacyHomePageReferences(dashboard, "home", replacementId);
  return dashboard;
}
```

`normalizeDashboardHomePreference` must require an ordinary object with exactly `enabled`, require a boolean, and return `{ enabled: true }` only when the value is false and `ordinaryPageCount === 0`. Update `DASHBOARD_CONFIG_STRUCTURE.version` to `6`, make root `home` required, add `home: shape(["enabled"])`, and validate it before page traversal. Keep the existing page/landing schema intact for non-reserved authored landing pages.

- [ ] **Step 4: Wire every normalization and package route through V6**

Use the exact chain in each owner:

```js
const v4 = config.configVersion === 3 ? migrateDashboardV3ToV4(config) : config;
const v5 = v4.configVersion === 4 ? migrateDashboardV4ToV5(v4) : v4;
const v6 = migrateDashboardV5ToV6(v5);
```

Make serialization emit bundle/config Version 6; accept legacy bundle envelopes 4 and 5 plus current 6. Update raw-package allowlists to `[3, 4, 5, 6]`, replace hard-coded current-Version-5 guards with `DASHBOARD_CONFIG_STRUCTURE.version`, and retain the existing localStorage key.

- [ ] **Step 5: Convert the shipped default config without discarding analytical content**

Change `public/config/dashboard.json` to Version 6, add root `"home": { "enabled": true }`, remove only the legacy landing metadata, and turn its existing `home_overview` section into the first ordinary page:

```json
{
  "id": "old-homepage-content",
  "label": "Old Homepage Content",
  "title": "Old Homepage Content",
  "description": "Prepared static dashboard content imported from the original PDPC exercise dashboard.",
  "sections": [
    { "id": "home_overview", "title": "Scenario overview", "panels": [] }
  ]
}
```

Retain the complete existing `home_overview.panels` bodies, chart IDs, aliases, data sources, Chrono Groups, and Scenes. Update default-config assertions to prove the new page contains both `home_operational_pressure_kpis` and `home_case_map`, and prove there is no reserved page ID `home`.

- [ ] **Step 6: Run the complete Task 1 deterministic gate**

Run:

```powershell
& $simexNode --test tests/dashboardMigrationV6.test.js tests/dashboardBundleV5.test.js tests/dashboardPackageCandidate.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js tests/contentPackageValidation.test.js tests/defaultDashboardV3.test.js tests/staticPanelTransaction.test.js
```

Expected: all selected tests pass and current outputs are Version 6; deliberate V4/V5 input tests still exercise migration.

- [ ] **Step 7: Commit the coherent data-contract slice**

```powershell
git add src/charting/config/migrateDashboardV5ToV6.js src/charting/config/dashboardConfigStructure.js src/charting/config/dashboardBundleV3.js src/lib/loadDashboard.js src/lib/quorumCatalogue.js src/static-content/staticPanelTransaction.js src/lib/dashboardPackageCandidate.js src/content-library/contentPackageValidation.js src/lib/dashboardPackageImportTransaction.js tests/helpers/contentLibraryFixtures.js tests/dashboardMigrationV6.test.js tests/dashboardBundleV5.test.js tests/dashboardPackageCandidate.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js tests/contentPackageValidation.test.js tests/defaultDashboardV3.test.js tests/staticPanelTransaction.test.js public/config/dashboard.json
git commit -m "feat(config): migrate canonical Home preference to V6"
```

---

### Task 2: Application-owned Home content and four-mode navigation

**Verification budget:**

- Nearest falsifier: `tests/dashboardMode.test.js` plus `tests/landingPage.test.js` for availability and source-owned action behavior.
- Final task gate: focused mode/navigation/landing/footer/shell/destination tests in Step 6.
- Browser evidence: one `showcase-home` journey proving Home first, CTA to View, theme inheritance, focus contrast, and no page navigation.
- Reserved for final integration: toggle, import, Clear, migration browser evidence, production build, and static verifier.

**Files:**

- Create: `src/home/canonicalHomeContent.js`
- Create: `src/components/home/CanonicalHomeWorkspace.jsx`
- Modify: `src/components/LandingPage.jsx`
- Modify: `src/components/dashboard/CanonicalDashboardFrame.jsx`
- Modify: `src/components/app-shell/ModeSwitcher.jsx`
- Modify: `src/components/app-shell/AppFrame.jsx`
- Modify: `src/components/app-shell/DashboardCommandCrown.jsx`
- Modify: `src/components/app-shell/DashboardIdentityRow.jsx`
- Modify: `src/components/app-shell/ModeContextStrip.jsx`
- Modify: `src/lib/dashboardMode.js`
- Modify: `src/App.jsx`
- Modify: `tests/dashboardMode.test.js`
- Modify: `tests/dashboardNavigation.test.js`
- Modify: `tests/landingPage.test.js`
- Modify: `tests/landingPageConfig.test.js`
- Modify: `tests/landingThemeInheritance.test.js`
- Modify: `tests/canonicalDashboardFooter.test.js`
- Modify: `tests/chartDestination.test.js`
- Modify: `tests/staticPanelTransaction.test.js`
- Modify: `tests/e2e/support/landingWorkflow.js`
- Modify: `tests/e2e/showcase-home.spec.js`

**Interfaces:**

- Consumes: V6 `dashboard.home.enabled`, existing semantic `.showcase-*` CSS, `resolveDashboardTheme`, `CanonicalDashboardFrame`, and ordinary page resolver.
- Produces:

```js
export const CANONICAL_HOME_REPOSITORY_URL = "https://github.com/hekmatov/simex-dashboard-v3";
export const CANONICAL_HOME_CONTENT = Object.freeze({ /* accepted hero, capabilities, seven FAQ answers, resources */ });
export const DASHBOARD_MODES = Object.freeze(["home", "view", "build", "present"]);
export function isHomeEnabled(dashboard = {}) {} // boolean
export function availableDashboardModes(dashboard = {}) {} // frozen mode array
export function isAvailableDashboardMode(mode, dashboard = {}) {} // boolean
export function resolveInitialDashboardMode({ requestedMode, storedMode, dashboard } = {}) {} // mode
export function reconcileDashboardMode(mode, dashboard = {}) {} // mode
```

- `CanonicalHomeWorkspace({ dashboard, onModeRequest, focusRequestKey, baseUrl })` renders immutable source content and the canonical footer without any page ID.

- [ ] **Step 1: Add RED mode, canonical content, footer, and destination tests**

Add exact assertions such as:

```js
assert.deepEqual(DASHBOARD_MODES, ["home", "view", "build", "present"]);
assert.equal(resolveInitialDashboardMode({ requestedMode: "home", dashboard: homeOff }), "view");
assert.equal(resolveInitialDashboardMode({ storedMode: "build", dashboard: homeOn }), "build");
assert.equal(resolveInitialDashboardMode({ dashboard: homeOn }), "home");
assert.equal(resolveInitialDashboardMode({ dashboard: homeOff }), "view");
```

Render canonical Home with `onModeRequest` and assert the button invokes exactly `"view"`, the seven approved FAQ answers and repository URL come from source, and no package page ID is consumed. Assert `feedbackUrlForDashboard({ pages: [] })` returns `https://github.com/hekmatov/simex-dashboard-v3/issues`. Assert chart and static destinations resolve only actual ordinary page IDs and reject the non-page string `"home"`.

- [ ] **Step 2: Run the nearest tests and confirm RED**

Run:

```powershell
& $simexNode --test tests/dashboardMode.test.js tests/landingPage.test.js tests/canonicalDashboardFooter.test.js tests/chartDestination.test.js tests/staticPanelTransaction.test.js
```

Expected: failure because Home is not a mode and canonical source content/workspace do not exist.

- [ ] **Step 3: Move the accepted landing content into source and adapt the renderer**

Create `CANONICAL_HOME_CONTENT` by moving, without rewriting, the accepted Cloudflare-beta hero, three capability cards, resources, and all seven FAQ records from the former default Home `landing` object. Replace the package page target with an application action:

```js
hero: Object.freeze({
  deliveryLabel: "Cloudflare beta",
  headline: "SimEx Dashboard",
  summary: "A practical workspace for exploring exercise data, shaping dashboard views, and presenting the situation clearly.",
  primaryAction: Object.freeze({ label: "Open the dashboard", mode: "view" }),
})
```

Refactor `LandingPage.jsx` so shared markup can render either a package-authored landing page or `CANONICAL_HOME_CONTENT`, but canonical action dispatch is `onModeRequest("view")` and never validates against `pages`. Keep package-authored non-reserved landing pages using their existing page-target validation.

Implement `CanonicalHomeWorkspace` as a passive `CanonicalDashboardFrame` with no page identity. Its focusable Home landmark uses `tabIndex={-1}` and focuses only when `focusRequestKey` changes. Reuse the existing semantic `.showcase-*` style rules; do not add palette values.

- [ ] **Step 4: Implement availability-aware four-mode navigation and App ownership**

In `dashboardMode.js`, availability must be explicit:

```js
export function isHomeEnabled(dashboard = {}) {
  return dashboard?.home?.enabled !== false;
}

export function availableDashboardModes(dashboard = {}) {
  return isHomeEnabled(dashboard) ? DASHBOARD_MODES : DASHBOARD_MODES.filter((mode) => mode !== "home");
}

export function resolveInitialDashboardMode({ requestedMode, storedMode, dashboard } = {}) {
  if (isAvailableDashboardMode(requestedMode, dashboard)) return requestedMode;
  if (isAvailableDashboardMode(storedMode, dashboard)) return storedMode;
  return isHomeEnabled(dashboard) ? "home" : "view";
}
```

Pass the available mode list through `AppFrame` and `DashboardCommandCrown` to `ModeSwitcher`; render labels in `Home | View | Build | Present` order. Add `showPageNavigation` to `DashboardIdentityRow` and set it false in Home so neither the fallback page nav nor Build page controls render.

In App, retain requested/stored startup inputs in refs, resolve them after the normalized dashboard first loads, and guard every `requestMode` with `isAvailableDashboardMode`. Keep `activePageId` page-only. Render:

```jsx
<DashboardChartThemeProvider projection={dashboardThemeProjection}>
  <AppFrame availableModes={availableDashboardModes(dashboard)} showPageNavigation={mode !== "home"}>
    {mode === "home" ? (
      <CanonicalHomeWorkspace dashboard={dashboard} onModeRequest={requestMode} focusRequestKey={surfaceFocusRequest.key} />
    ) : (
      <PlaybackProvider {...playbackProps}>
        <DashboardRenderer {...rendererProps} />
      </PlaybackProvider>
    )}
  </AppFrame>
</DashboardChartThemeProvider>
```

The Home branch must not mount `PlaybackProvider`, `DashboardRenderer`, Present runtime, page navigation, or page authoring controls. Add a single post-mode-change focus effect in App that focuses `[data-canonical-mode="home"]` or `[data-canonical-mode="view"]` only when a successful transaction requests it.

- [ ] **Step 5: Update canonical footer ownership and preserve generic landing pages**

Make `CanonicalDashboardFooter` derive its Issues URL from `CANONICAL_HOME_REPOSITORY_URL`, with the existing mailto fallback only if that source URL is invalid. Do not scan `dashboard.pages`. Leave the V6 page/landing schema, generic `LandingPage` wrapper, and current authored-landing restrictions intact; only canonical Home loses page identity.

- [ ] **Step 6: Run the Task 2 deterministic and representative browser gates**

Run:

```powershell
& $simexNode --test tests/dashboardMode.test.js tests/dashboardNavigation.test.js tests/landingPage.test.js tests/landingPageConfig.test.js tests/landingThemeInheritance.test.js tests/canonicalDashboardFooter.test.js tests/chartDestination.test.js tests/staticPanelTransaction.test.js tests/scenarioPassportContainment.test.js
& $simexPnpm test:e2e -- tests/e2e/showcase-home.spec.js --max-failures=1
```

Expected: deterministic selection passes; browser proves Home first, canonical content and exact Issues link, View CTA, no page nav on Home, materially different style/profile/appearance inheritance, and accepted keyboard focus contrast.

- [ ] **Step 7: Commit the coherent canonical surface slice**

```powershell
git add src/home/canonicalHomeContent.js src/components/home/CanonicalHomeWorkspace.jsx src/components/LandingPage.jsx src/components/dashboard/CanonicalDashboardFrame.jsx src/components/app-shell/ModeSwitcher.jsx src/components/app-shell/AppFrame.jsx src/components/app-shell/DashboardCommandCrown.jsx src/components/app-shell/DashboardIdentityRow.jsx src/components/app-shell/ModeContextStrip.jsx src/lib/dashboardMode.js src/App.jsx tests/dashboardMode.test.js tests/dashboardNavigation.test.js tests/landingPage.test.js tests/landingPageConfig.test.js tests/landingThemeInheritance.test.js tests/canonicalDashboardFooter.test.js tests/chartDestination.test.js tests/staticPanelTransaction.test.js tests/scenarioPassportContainment.test.js tests/e2e/support/landingWorkflow.js tests/e2e/showcase-home.spec.js
git commit -m "feat(home): add application-owned canonical Home mode"
```

---

### Task 3: Explicit Build preference, dirty-state safety, and import reconciliation

**Verification budget:**

- Nearest falsifier: Scenario draft reducer tests for edit/discard/failure/retry and package-operation blocking.
- Final task gate: Scenario Passport, App wiring, package import/export, and mode tests in Step 5.
- Browser evidence: one Build Passport journey for Save off/on, reload persistence, and safe fallback.
- Reserved for final integration: Clear and combined migration/import journey, Cloudflare build, static verifier, exact-head preview.

**Files:**

- Modify: `src/components/build/ScenarioAuthoring.jsx`
- Modify: `src/components/app-shell/ScenarioPassportPopover.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/App.jsx`
- Modify: `tests/structureScenarioAuthoring.test.js`
- Modify: `tests/scenarioPassportContainment.test.js`
- Modify: `tests/dashboardPackageExport.test.js`
- Modify: `tests/dashboardPackageImportTransaction.test.js`
- Modify: `tests/e2e/three-mode-prototype.spec.js`
- Modify: `tests/e2e/v3-build-workspace.spec.js`

**Interfaces:**

- Consumes: V6 `home`, `requestMode`, App `mutateDashboard`, existing Passport Save/Discard and package buttons, Renderer `setAuthoredDirtyFlag`/`prepareToLeaveBuild`.
- Produces reducer action `{ type: "SET_HOME_ENABLED", enabled: boolean }`; Scenario draft value gains exact `home: { enabled: boolean }`.
- Produces optional Passport callback `onSaveSucceeded(savedDashboard)` called only after Save has committed and the draft has rebased cleanly.

- [ ] **Step 1: Add RED reducer, containment, and transaction tests**

Add focused reducer assertions:

```js
let draft = createScenarioDraft({ ...identity, home: { enabled: true } });
draft = reduceScenarioDraft(draft, { type: "SET_HOME_ENABLED", enabled: false });
assert.equal(draft.status, "dirty");
assert.deepEqual(draft.value.home, { enabled: false });
assert.deepEqual(reduceScenarioDraft(draft, { type: "DISCARD" }).value.home, { enabled: true });
const failed = reduceScenarioDraft(reduceScenarioDraft(draft, { type: "SAVE_REQUEST" }), {
  type: "SAVE_FAILED",
  error: new Error("Storage unavailable"),
});
assert.deepEqual(failed.value.home, { enabled: false });
assert.deepEqual(failed.baseline.home, { enabled: true });
```

Render the Passport and assert a native checkbox named `Show Home`, explanatory text, Save/Discard buttons, and disabled package actions while dirty. Assert App saves only identity fields plus `next.home = { enabled: value.home.enabled }`, and a successful imported Home-off package reconciles active Home to View only after replacement succeeds.

- [ ] **Step 2: Run the nearest tests and confirm RED**

Run:

```powershell
& $simexNode --test tests/structureScenarioAuthoring.test.js tests/scenarioPassportContainment.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js
```

Expected: failure because the Scenario draft and Passport do not own `home.enabled`.

- [ ] **Step 3: Extend the Scenario draft and Passport with explicit Home Save/Discard**

Change `scenarioValue` to clone the strict preference:

```js
function scenarioValue(dashboard) {
  return {
    scenarioLabel: dashboard?.scenarioLabel ?? "",
    programLabel: dashboard?.programLabel ?? "",
    lastUpdated: dashboard?.lastUpdated ?? "",
    source: clone(dashboard?.source ?? null),
    home: { enabled: dashboard?.home?.enabled !== false },
  };
}
```

Handle only a boolean in `SET_HOME_ENABLED`; preserve it across Save success, failure/retry, Stay, suspension, and Discard. Add to the Passport:

```jsx
<fieldset className="scenario-passport-home">
  <legend>Canonical Home</legend>
  <label>
    <input
      type="checkbox"
      checked={draft.value.home.enabled}
      disabled={busy}
      onChange={(event) => dispatch({ type: "SET_HOME_ENABLED", enabled: event.target.checked })}
    />
    Show Home
  </label>
  <p>When off, Home is unavailable to dashboard visitors. You can turn it back on here.</p>
</fieldset>
```

Include `dashboard.home.enabled` in `identityRevision`. After a successful `onSave`, dispatch `SAVE_SUCCEEDED`, announce the clean state through `onDirtyChange(false)`, then call `onSaveSucceeded(savedDashboard)`.

- [ ] **Step 4: Wire durable Save, dirty blocking, and import fallback in App/Renderer**

In App Passport `onSave`, commit:

```js
onSave={(value) => mutateDashboard((next) => {
  next.scenarioLabel = value.scenarioLabel;
  next.programLabel = value.programLabel;
  next.lastUpdated = value.lastUpdated;
  next.home = { enabled: value.home.enabled };
})}
```

On `onSaveSucceeded`, if Home was saved off, use the existing guarded `requestMode("view")` after the Scenario owner is clean; if another Build draft is dirty, keep Build and report the existing blocker rather than bypassing it. Saving on exposes Home without redirect. Include `externalDirty.scenario` in Renderer `authoredDirty` and `prepareToLeaveBuild`, so mode exit, package import/export, and reset cannot proceed with an unsaved Passport draft.

After a successful package import, call `reconcileDashboardMode(mode, committed)`, persist the resolved mode, request stable View focus only if active Home became unavailable, and rebase the Passport via its `identityRevision`. Do nothing on import failure.

- [ ] **Step 5: Run Task 3 deterministic and representative browser gates**

Run:

```powershell
& $simexNode --test tests/structureScenarioAuthoring.test.js tests/scenarioPassportContainment.test.js tests/dashboardMode.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js
& $simexPnpm test:e2e -- tests/e2e/v3-build-workspace.spec.js --max-failures=1
& $simexPnpm test:e2e -- tests/e2e/three-mode-prototype.spec.js --max-failures=1
```

Expected: Save off persists and removes Home, reload retains Home off, programmatic Home requests resolve View, re-enable exposes Home without redirect, Discard and failed Save preserve the prior live setting, and package operations stay blocked while dirty.

- [ ] **Step 6: Commit the coherent Build preference slice**

```powershell
git add src/components/build/ScenarioAuthoring.jsx src/components/app-shell/ScenarioPassportPopover.jsx src/components/DashboardRenderer.jsx src/App.jsx tests/structureScenarioAuthoring.test.js tests/scenarioPassportContainment.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js tests/e2e/three-mode-prototype.spec.js tests/e2e/v3-build-workspace.spec.js
git commit -m "feat(home): persist explicit Home availability"
```

---

### Task 4: Clear Dashboard safety, copy, focus, and zero-page recovery

**Verification budget:**

- Nearest falsifier: `tests/dashboardContentReset.test.js` for forced-on Home and immutable identity/Look preservation.
- Final task gate: reset plus App/structure transaction tests in Step 5.
- Browser evidence: one successful/failed Clear journey, including focus and zero-page Home recovery.
- Reserved for final integration: complete task-specific aggregate, production build, static verifier, exact-head preview.

**Files:**

- Modify: `src/lib/dashboardContentReset.js`
- Modify: `src/App.jsx`
- Modify: `src/components/build/DeleteDashboardContentDialog.jsx`
- Modify: `tests/dashboardContentReset.test.js`
- Modify: `tests/deleteDashboardContentDialog.test.js`
- Modify: `tests/e2e/v3-build-structure-packages.spec.js`

**Interfaces:**

- Consumes: `createBlankDashboardContent(dashboard)`, App `commitConfiguration`, mode availability helpers, and Home focus request from Task 2.
- Produces a blank V6 dashboard with `pages: []` and `home: { enabled: true }` while preserving identity and Look.

- [ ] **Step 1: Add RED reset and transaction assertions**

Extend reset coverage:

```js
const input = { ...dashboard, home: { enabled: false } };
const blank = createBlankDashboardContent(input);
assert.deepEqual(blank.home, { enabled: true });
assert.deepEqual(blank.pages, []);
assert.deepEqual(blank.globalStyles, input.globalStyles);
assert.notEqual(blank.home, input.home);
assert.deepEqual(input.home, { enabled: false });
```

Add App transaction coverage or source-boundary assertions proving mode/focus change happens after `commitConfiguration` resolves, and failure leaves mode/preference/focus untouched. Update confirmation assertions to the exact copy: `Delete all authored dashboard pages, charts, sources, media, Chrono Groups, and Scenes. Canonical Home remains available.`

- [ ] **Step 2: Run the nearest tests and confirm RED**

Run:

```powershell
& $simexNode --test tests/dashboardContentReset.test.js tests/scenarioPassportContainment.test.js
```

Expected: failure because reset does not force Home on and the confirmation still describes every page disappearing.

- [ ] **Step 3: Implement forced-on Home and post-commit navigation/focus**

In `createBlankDashboardContent` set a fresh record:

```js
blank.home = { enabled: true };
```

In `deleteDashboardContent`, commit first, clean replaced assets, then set/persist Home mode and issue the Home focus key. Any exception before commit completion must skip mode and focus changes. Rebase/close the Scenario Passport after success so an older dirty preference cannot overwrite the blank dashboard. The zero-ordinary-page safety rule in V6 normalization must independently enforce the same invariant for restored packages.

- [ ] **Step 4: Update the live confirmation copy and browser journey**

Replace absolute “every page” wording with the exact authored-content warning from Step 1. In `v3-build-structure-packages.spec.js`, cover:

```js
await clearDashboard(page);
await expect(page.getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
await expect(page.locator('[data-canonical-mode="home"]')).toBeFocused();
await expect(page.locator('[aria-label="Dashboard pages"]')).toHaveCount(0);
```

Also inject one persistence failure and assert the prior pages, `home.enabled`, active mode, and focus remain unchanged.

- [ ] **Step 5: Run Task 4 deterministic and browser gates**

Run:

```powershell
& $simexNode --test tests/dashboardContentReset.test.js tests/dashboardMode.test.js tests/scenarioPassportContainment.test.js
& $simexPnpm test:e2e -- tests/e2e/v3-build-structure-packages.spec.js --max-failures=1
```

Expected: successful Clear deletes only authored content, forces and selects Home after durability, focuses Home, and failed Clear is atomic.

- [ ] **Step 6: Commit the coherent Clear slice**

Stage the exact live confirmation and test file discovered in Step 1 together with:

```powershell
git add src/lib/dashboardContentReset.js src/App.jsx tests/dashboardContentReset.test.js tests/e2e/v3-build-structure-packages.spec.js
git commit -m "feat(home): preserve canonical Home on dashboard clear"
```

---

### Task 5: Integrated verification, scoped review, and exact-head visual candidate

**Verification budget:**

- Nearest falsifier: changed-file static/source scan plus the complete focused Node selection.
- Final task gate: complete task-specific deterministic selection and smallest representative Playwright selection.
- Browser evidence: Home rendering/theme/focus, toggle off/on/reload, legacy migration, import fallback, and Clear.
- Production-only checks: one `build:cloudflare`, `verify:v3-static`, manifest/cache assertions already included by those gates, and an exact-head preview URL.

**Files:**

- Modify only if a concrete scoped review finding requires a correction: files touched by Tasks 1–4 and their directly corresponding tests.
- Do not create a closure/evidence commit after the final visual candidate unless a source correction changes the head.

**Interfaces:**

- Consumes: committed Tasks 1–4 and still-valid Step 8/post-Step-8 evidence.
- Produces: a clean, review-ready branch head and a verified preview URL from that exact commit.

- [ ] **Step 1: Scan for stale three-mode/V5/reserved-Home assumptions**

Run:

```powershell
git grep -n -E 'three-mode|configVersion.?[:=].?5|DASHBOARD_BUNDLE_VERSION.?=.?5|pages\[0\].*landing|page\.id.?===.?["'"']home["'"']' -- src tests public package.json
```

Classify every hit: deliberate legacy fixture/input, unchanged storage-key compatibility, or stale current-contract assumption. Correct only stale current-contract hits, preserving V4/V5 migration tests and the existing storage key.

- [ ] **Step 2: Run the complete task-specific deterministic selection**

Run:

```powershell
& $simexNode --test tests/dashboardMigrationV6.test.js tests/dashboardBundleV5.test.js tests/dashboardMode.test.js tests/dashboardNavigation.test.js tests/dashboardContentReset.test.js tests/dashboardSemanticBoundary.test.js tests/chartDestination.test.js tests/staticPanelTransaction.test.js tests/defaultDashboardV3.test.js tests/landingPage.test.js tests/landingPageConfig.test.js tests/landingThemeInheritance.test.js tests/canonicalDashboardFooter.test.js tests/structureScenarioAuthoring.test.js tests/scenarioPassportContainment.test.js tests/dashboardPackageCandidate.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js tests/contentPackageValidation.test.js
```

Expected: unrestricted pass for the complete task-specific deterministic selection; report the exact count without calling it a repository-wide suite.

- [ ] **Step 3: Run the smallest representative browser selection**

Run changed journeys first if a failure appears, then the final unrestricted selection:

```powershell
& $simexPnpm test:e2e -- tests/e2e/showcase-home.spec.js tests/e2e/three-mode-prototype.spec.js tests/e2e/v3-build-workspace.spec.js tests/e2e/v3-build-structure-packages.spec.js
```

Expected: canonical Home, semantic theme response, exact Issues link, focus visibility, off/on Save and reload, V6 legacy content migration, import fallback, and Clear all pass using stable user-visible assertions.

- [ ] **Step 4: Run one scoped review and at most one bounded correction wave**

Review only the branch diff from `b91b568` through current head against the approved spec. Require concrete findings about data loss, availability/focus sequencing, strict Version 6 validation, transaction atomicity, Home runtime passivity, or accessibility. If a finding is valid, add a focused RED regression, make the minimal fix, rerun only the affected selection, commit with the literal message `fix(home): resolve scoped review finding`, and re-review that finding/boundary only.

- [ ] **Step 5: Build and verify the exact candidate head**

Record the head before building:

```powershell
$candidateHead = git rev-parse HEAD
& $simexPnpm build:cloudflare
& $simexPnpm verify:v3-static
git status --short
```

Expected: build and verifier pass. If the build rewrites the four known biomedical derivatives only by line endings, confirm:

```powershell
git diff --ignore-space-at-eol --exit-code -- public/data/biomedical/municipal_map_timeline.csv public/data/biomedical/municipal_aggregate_timeseries.csv public/data/biomedical/municipal_latest_bubble.csv public/data/biomedical/municipal_derivatives.manifest.json
```

Restore only those four generated side effects after that command proves no semantic diff. Preserve every semantic or unknown change. End with a clean worktree and unchanged `$candidateHead`.

- [ ] **Step 6: Serve and verify the exact visual candidate**

Start the preview in a hidden process on an unused local port, then verify the served files correspond to the just-built `dist` and open an unambiguous URL:

```powershell
& $simexPnpm preview -- --host 127.0.0.1 --port 4189
```

Use `"http://127.0.0.1:4189/?approval=$candidateHead"`. In-browser, verify the page title, Home first/current, all seven FAQs, exact repository Issues href and attributes, a materially different style/profile/appearance, hero focus contrast of at least 3:1, View CTA, Home toggle behavior, and representative **Old Homepage Content** visibility. Keep the preview alive.

- [ ] **Step 7: Present the visual/master handoff without starting Step 9**

Report the exact candidate hash, branch, focused deterministic/browser/build evidence, any intentionally preserved legacy fixtures, and the live exact-head URL. This is the sole visual acceptance boundary; do not merge, push, deploy, delete worktrees/branches, or start Step 9 without a separate user instruction.
