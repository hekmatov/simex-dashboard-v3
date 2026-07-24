# SimEx Showcase Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a management-oriented Home landing page on the Quorum Phase 5-compatible dashboard while preserving standalone Cloudflare operation and all existing analytical and companion behavior.

**Architecture:** Add a dedicated, configuration-driven `LandingPage` presentation selected by `DashboardRenderer` when the first page declares `pageType: "landing"`. Keep landing navigation behind one `onNavigate(pageId)` callback, retain the existing panel renderer as the fallback, and verify the result through Node SSR tests plus Playwright standalone and Quorum regression tests.

**Tech Stack:** React 19, Vite 6, CSS, JSON dashboard configuration, Node test runner, React server rendering, Playwright 1.61, existing Quorum companion test harness

## Global Constraints

- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\simex-dashboard-v2`; do not modify the OneDrive copy.
- Implement on `codex/showcase-home`, which is based on `codex/dashboard-companion-readiness`.
- Promote `packaged-dashboard-bundle.json` before app changes and review any resulting diff.
- Preserve Quorum companion initialization, protocol, catalogue, display control, fullscreen behavior, and analytical-page behavior.
- Cloudflare must work without a companion service and show the normal `Standalone` state.
- Present Quorum as `integration-ready`; do not imply that Cloudflare is actively connected to Quorum.
- Keep landing content in `public/config/dashboard.json`, not hard-coded in the React component.
- Use no new runtime dependencies.
- Preserve the Home page's existing sections as the safe fallback when landing configuration is unusable.
- Run `pnpm.cmd build` before any push; the documented Vite large-bundle warning is non-failing.

---

## File Structure

### Create

- `src/components/LandingPage.jsx` — renders the configured executive narrative and exposes only page navigation.
- `tests/landingPageConfig.test.js` — validates the tracked Home content contract and navigation targets.
- `tests/landingPage.test.js` — SSR coverage for semantic structure, optional sections, invalid targets, and fallback detection.
- `tests/e2e/showcase-home.spec.js` — browser coverage for the standalone Cloudflare-style visitor journey, saved beta reconciliation, preview failure, and mobile layout.
- `scripts/capture-showcase-preview.mjs` — reproducibly captures a real analytical dashboard view for the hero preview.
- `public/assets/showcase-dashboard-preview.png` — generated presentation asset captured from the live app.

### Modify

- `public/config/dashboard.json` — marks Home as a landing page and supplies approved copy, routes, tour items, status, and preview metadata.
- `src/components/DashboardRenderer.jsx` — centralizes page navigation and chooses the landing or analytical renderer.
- `src/styles.css` — adds landing visual hierarchy, compact Home header treatment, responsive rules, focus states, and reduced-motion handling.
- `tests/e2e/quorum-companion.spec.js` — adds one assertion that Quorum chart control still works after starting from the new Home presentation.
- `docs/app-manual.md` — documents Home, the public demonstration journey, preview refresh, and accurate standalone/Quorum status language.

## Interfaces

`src/components/LandingPage.jsx` produces:

```js
export function hasLandingPresentation(page): boolean

export default function LandingPage({
  page,
  pages,
  onNavigate,
  baseUrl,
}): React.ReactElement | null
```

`LandingPage` consumes:

```js
page.landing = {
  hero: {
    deliveryLabel: string,
    headline: string,
    summary: string,
    primaryAction: { label: string, pageId: string },
    secondaryAction: { label: string, anchorId: string },
  },
  previewAsset?: { src: string, alt: string },
  proofPoints?: Array<{ title: string, description: string }>,
  capabilities?: Array<{ number: string, title: string, description: string }>,
  domainRoutes?: Array<{
    eyebrow: string,
    title: string,
    description: string,
    actionLabel: string,
    pageId: string,
    tone: "biomedical" | "socio",
  }>,
  tourAnchorId?: string,
  tourItems?: string[],
  deliveryStatus?: Array<{
    state: "complete" | "ready",
    label: string,
    description: string,
  }>,
}
```

`DashboardRenderer` supplies:

```js
function navigateToPage(pageId) {
  setActivePageId(pageId);
  setSelectedPanelId(null);
}
```

---

### Task 1: Promote the browser baseline and define the landing content contract

**Files:**

- Create: `tests/landingPageConfig.test.js`
- Modify: `public/config/dashboard.json:67-140`

**Interfaces:**

- Consumes: existing dashboard JSON and Home page ID `home`
- Produces: the complete `pageType: "landing"` and `landing` configuration consumed by Tasks 2–5

- [ ] **Step 1: Promote the exported browser baseline**

Run:

```powershell
pnpm.cmd promote:bundle
git diff -- public/config/dashboard.json public/data/uploaded
```

Expected: `Promoted packaged-dashboard-bundle.json into public/config/dashboard.json.` followed by no Git diff. The current bundle and tracked config were confirmed identical during planning. If a diff appears, stop and review it as the user's browser baseline before continuing.

- [ ] **Step 2: Write the failing configuration-contract test**

Create `tests/landingPageConfig.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = JSON.parse(
  await readFile(new URL("../public/config/dashboard.json", import.meta.url), "utf8"),
);

test("Home defines a complete showcase landing contract", () => {
  const home = dashboard.pages.find((page) => page.id === "home");
  assert.equal(home?.pageType, "landing");
  assert.equal(home?.landing?.hero?.headline, "From complex exercise data to shared situational awareness");
  assert.equal(home?.landing?.proofPoints?.length, 3);
  assert.equal(home?.landing?.capabilities?.length, 3);
  assert.equal(home?.landing?.domainRoutes?.length, 2);
  assert.equal(home?.landing?.tourItems?.length, 4);
  assert.equal(home?.landing?.deliveryStatus?.length, 3);
  assert.equal(home?.landing?.previewAsset?.src, "assets/showcase-dashboard-preview.png");
  assert.ok(home.sections?.length > 0, "Home must retain analytical fallback sections");
});

test("all configured landing page targets exist", () => {
  const pageIds = new Set(dashboard.pages.map((page) => page.id));
  const home = dashboard.pages.find((page) => page.id === "home");
  const targets = [
    home.landing.hero.primaryAction.pageId,
    ...home.landing.domainRoutes.map((route) => route.pageId),
  ];
  targets.forEach((target) => assert.ok(pageIds.has(target), `Unknown page target: ${target}`));
});

test("public status copy describes Quorum as ready, not connected", () => {
  const home = dashboard.pages.find((page) => page.id === "home");
  const statusCopy = JSON.stringify(home.landing.deliveryStatus).toLowerCase();
  assert.match(statusCopy, /integration-ready/);
  assert.doesNotMatch(statusCopy, /companion connected|actively connected|quorum connected/);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```powershell
node --test tests/landingPageConfig.test.js
```

Expected: FAIL because `home.pageType` and `home.landing` do not exist.

- [ ] **Step 4: Add the approved landing configuration**

In the Home page object in `public/config/dashboard.json`, keep the existing `sections` array and add:

```json
"pageType": "landing",
"title": "SimEx Dashboard",
"description": "A reusable dashboard platform for simulation exercise decision support.",
"landing": {
  "hero": {
    "deliveryLabel": "First deliverable · Live HeV-A26 demonstration",
    "headline": "From complex exercise data to shared situational awareness",
    "summary": "A reusable dashboard platform that brings biomedical and socio-economic signals into one decision-support environment.",
    "primaryAction": {
      "label": "Explore the live dashboard",
      "pageId": "biomedical"
    },
    "secondaryAction": {
      "label": "See what to try",
      "anchorId": "showcase-tour"
    }
  },
  "previewAsset": {
    "src": "assets/showcase-dashboard-preview.png",
    "alt": "SimEx biomedical dashboard showing epidemiological indicators, charts, and geographic analysis."
  },
  "proofPoints": [
    {
      "title": "Cross-domain overview",
      "description": "Health and societal impacts in one environment."
    },
    {
      "title": "Briefing-ready views",
      "description": "Focused, responsive, and fullscreen presentation."
    },
    {
      "title": "Configurable foundation",
      "description": "Adaptable layouts, charts, and prepared data sources."
    }
  ],
  "capabilities": [
    {
      "number": "01",
      "title": "See the evolving situation",
      "description": "Track cases, mortality, healthcare pressure, testing, wastewater, and vaccination."
    },
    {
      "number": "02",
      "title": "Understand wider impacts",
      "description": "Connect behaviour, trust, wellbeing, economic disruption, and absenteeism."
    },
    {
      "number": "03",
      "title": "Turn insight into a briefing",
      "description": "Use focused charts, multi-view comparison, and responsive presentation layouts."
    }
  ],
  "domainRoutes": [
    {
      "eyebrow": "Biomedical domain",
      "title": "Follow epidemiological pressure",
      "description": "Explore geographic spread, transmission, healthcare demand, surveillance, and vaccination.",
      "actionLabel": "Explore Biomedical",
      "pageId": "biomedical",
      "tone": "biomedical"
    },
    {
      "eyebrow": "Socio-economic domain",
      "title": "See impacts beyond healthcare",
      "description": "Explore behaviour, trust, wellbeing, business disruption, and workforce impacts.",
      "actionLabel": "Explore Socio-economic",
      "pageId": "socio_economic",
      "tone": "socio"
    }
  ],
  "tourAnchorId": "showcase-tour",
  "tourItems": [
    "Filter indicators and time periods",
    "Open one or several charts in fullscreen",
    "Compare desktop, tablet, and phone layouts",
    "Review configurable views without changing the public default"
  ],
  "deliveryStatus": [
    {
      "state": "complete",
      "label": "Dashboard delivered",
      "description": "Working multi-domain dashboard with prepared demonstration data."
    },
    {
      "state": "complete",
      "label": "Cloud-hosted showcase",
      "description": "Browser-accessible demonstration for stakeholder review and orientation."
    },
    {
      "state": "ready",
      "label": "Quorum integration-ready",
      "description": "Compatibility foundation prepared; the hosted demonstration operates independently."
    }
  ]
}
```

- [ ] **Step 5: Run the configuration test**

Run:

```powershell
node --test tests/landingPageConfig.test.js
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit the content contract**

```powershell
git add public/config/dashboard.json tests/landingPageConfig.test.js
git commit -m "feat: define showcase landing content"
```

---

### Task 2: Build the semantic landing-page component

**Files:**

- Create: `src/components/LandingPage.jsx`
- Create: `tests/landingPage.test.js`

**Interfaces:**

- Consumes: the `page.landing` contract from Task 1
- Produces: `LandingPage` and `hasLandingPresentation(page)` for Task 3

- [ ] **Step 1: Write the failing SSR tests**

Create `tests/landingPage.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const landingModule = await vite
  .ssrLoadModule("/src/components/LandingPage.jsx")
  .catch(() => null);
await vite.close();

const page = {
  id: "home",
  pageType: "landing",
  landing: {
    hero: {
      deliveryLabel: "First deliverable",
      headline: "Shared situational awareness",
      summary: "One environment.",
      primaryAction: { label: "Explore", pageId: "biomedical" },
      secondaryAction: { label: "What to try", anchorId: "tour" },
    },
    previewAsset: { src: "assets/preview.png", alt: "Dashboard preview" },
    proofPoints: [{ title: "Cross-domain", description: "One view." }],
    capabilities: [{ number: "01", title: "See", description: "Track change." }],
    domainRoutes: [{
      eyebrow: "Biomedical",
      title: "Follow pressure",
      description: "Explore indicators.",
      actionLabel: "Open Biomedical",
      pageId: "biomedical",
      tone: "biomedical",
    }],
    tourAnchorId: "tour",
    tourItems: ["Use filters"],
    deliveryStatus: [{ state: "ready", label: "Integration-ready", description: "Prepared." }],
  },
};
const pages = [page, { id: "biomedical" }];

test("landing component is available and requires a usable hero", () => {
  assert.equal(typeof landingModule?.default, "function");
  assert.equal(landingModule?.hasLandingPresentation(page), true);
  assert.equal(landingModule?.hasLandingPresentation({ pageType: "landing", landing: {} }), false);
});

test("landing renders semantic, configured content and valid actions", () => {
  const html = renderToStaticMarkup(
    React.createElement(landingModule.default, {
      page,
      pages,
      onNavigate: () => {},
      baseUrl: "/demo/",
    }),
  );
  assert.match(html, /<article[^>]+showcase-landing/);
  assert.match(html, /<h1[^>]*>Shared situational awareness<\/h1>/);
  assert.match(html, /href="#tour"/);
  assert.match(html, /Open Biomedical/);
  assert.match(html, /src="\/demo\/assets\/preview.png"/);
  assert.match(html, /alt="Dashboard preview"/);
});

test("invalid page targets and absent optional sections are omitted", () => {
  const invalid = structuredClone(page);
  invalid.landing.domainRoutes[0].pageId = "missing";
  delete invalid.landing.previewAsset;
  delete invalid.landing.proofPoints;
  const html = renderToStaticMarkup(
    React.createElement(landingModule.default, {
      page: invalid,
      pages,
      onNavigate: () => {},
      baseUrl: "/",
    }),
  );
  assert.doesNotMatch(html, /Open Biomedical/);
  assert.doesNotMatch(html, /showcase-landing-preview/);
  assert.doesNotMatch(html, /showcase-proof-grid/);
  assert.match(html, /Shared situational awareness/);
});
```

- [ ] **Step 2: Run the SSR tests to verify they fail**

Run:

```powershell
node --test tests/landingPage.test.js
```

Expected: FAIL because `LandingPage.jsx` does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/LandingPage.jsx`:

```jsx
import React from "react";

export function hasLandingPresentation(page) {
  return Boolean(
    page?.pageType === "landing"
      && page.landing
      && typeof page.landing === "object"
      && !Array.isArray(page.landing)
      && page.landing.hero?.headline,
  );
}

export default function LandingPage({
  page,
  pages,
  onNavigate,
  baseUrl = import.meta.env.BASE_URL,
}) {
  const [previewVisible, setPreviewVisible] = React.useState(
    Boolean(page?.landing?.previewAsset?.src),
  );
  if (!hasLandingPresentation(page)) {
    return null;
  }

  const landing = page.landing;
  const primaryTarget = validPageTarget(landing.hero.primaryAction?.pageId, pages);
  const proofPoints = arrayOf(landing.proofPoints);
  const capabilities = arrayOf(landing.capabilities);
  const routes = arrayOf(landing.domainRoutes).filter((route) =>
    validPageTarget(route.pageId, pages),
  );
  const tourItems = arrayOf(landing.tourItems);
  const statuses = arrayOf(landing.deliveryStatus);

  return (
    <article className="showcase-landing" aria-labelledby="showcase-landing-title">
      <section className="showcase-hero">
        <div className="showcase-hero-copy">
          {landing.hero.deliveryLabel && <p className="showcase-pill">{landing.hero.deliveryLabel}</p>}
          <h1 id="showcase-landing-title">{landing.hero.headline}</h1>
          {landing.hero.summary && <p className="showcase-hero-summary">{landing.hero.summary}</p>}
          <div className="showcase-actions">
            {primaryTarget && (
              <button type="button" onClick={() => onNavigate(primaryTarget)}>
                {landing.hero.primaryAction.label}
              </button>
            )}
            {landing.hero.secondaryAction?.anchorId && (
              <a className="showcase-secondary-action" href={`#${landing.hero.secondaryAction.anchorId}`}>
                {landing.hero.secondaryAction.label}
              </a>
            )}
          </div>
        </div>
        {previewVisible && landing.previewAsset?.src && (
          <figure className="showcase-landing-preview">
            <img
              src={assetUrl(landing.previewAsset.src, baseUrl)}
              alt={landing.previewAsset.alt ?? ""}
              onError={() => setPreviewVisible(false)}
            />
          </figure>
        )}
      </section>

      {proofPoints.length > 0 && (
        <section className="showcase-proof-grid" aria-label="Dashboard value">
          {proofPoints.map((item) => (
            <div key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </div>
          ))}
        </section>
      )}

      {capabilities.length > 0 && (
        <section className="showcase-section" aria-labelledby="showcase-capabilities-title">
          <p className="showcase-eyebrow">What the dashboard enables</p>
          <h2 id="showcase-capabilities-title">Support the exercise information cycle</h2>
          <div className="showcase-capability-grid">
            {capabilities.map((item) => (
              <article key={item.title}>
                <span className="showcase-capability-number" aria-hidden="true">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {routes.length > 0 && (
        <section className="showcase-section" aria-labelledby="showcase-routes-title">
          <p className="showcase-eyebrow">Explore the live demonstration</p>
          <h2 id="showcase-routes-title">Choose an entry point</h2>
          <div className="showcase-route-grid">
            {routes.map((route) => (
              <article className={`showcase-route showcase-route-${route.tone ?? "default"}`} key={route.pageId}>
                <p>{route.eyebrow}</p>
                <h3>{route.title}</h3>
                <span>{route.description}</span>
                <button type="button" onClick={() => onNavigate(route.pageId)}>{route.actionLabel}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {tourItems.length > 0 && (
        <section
          className="showcase-tour"
          id={landing.tourAnchorId}
          aria-labelledby="showcase-tour-title"
        >
          <h2 id="showcase-tour-title">What to try during the demonstration</h2>
          <ul>{tourItems.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}

      {statuses.length > 0 && (
        <section className="showcase-status" aria-labelledby="showcase-status-title">
          <h2 id="showcase-status-title">First-deliverable status</h2>
          <div>
            {statuses.map((status) => (
              <article className={`showcase-status-${status.state ?? "ready"}`} key={status.label}>
                <strong><span aria-hidden="true">{status.state === "complete" ? "✓" : "→"}</span> {status.label}</strong>
                <p>{status.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function validPageTarget(pageId, pages) {
  return (pages ?? []).some((page) => page.id === pageId) ? pageId : null;
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function assetUrl(path, baseUrl) {
  if (/^(?:data:|https?:)/i.test(path)) {
    return path;
  }
  return `${baseUrl}${String(path).replace(/^\/+/, "")}`;
}
```

- [ ] **Step 4: Run the component and configuration tests**

Run:

```powershell
node --test tests/landingPage.test.js tests/landingPageConfig.test.js
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit the component**

```powershell
git add src/components/LandingPage.jsx tests/landingPage.test.js
git commit -m "feat: render showcase landing page"
```

---

### Task 3: Route Home through the landing presentation

**Files:**

- Create: `tests/e2e/showcase-home.spec.js`
- Modify: `src/components/DashboardRenderer.jsx:1-75, 379-662`

**Interfaces:**

- Consumes: `LandingPage`, `hasLandingPresentation(page)`, and `onNavigate(pageId)`
- Produces: one active-page navigation path shared by tabs and landing actions

- [ ] **Step 1: Write failing browser tests for Home and saved beta reconciliation**

Create `tests/e2e/showcase-home.spec.js`:

```js
import { test, expect } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-v2-config-pages-v2";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("standalone Home orients visitors and routes into both domains", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Standalone", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "From complex exercise data to shared situational awareness",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Explore the live dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Explore Socio-economic" }).click();
  await expect(
    page.getByRole("heading", { name: "HeV-A26 Dashboard: Socio-economic Overview" }),
  ).toBeVisible();
});

test("saved beta configuration receives the new Home presentation", async ({ page, request }) => {
  const response = await request.get("http://127.0.0.1:4173/config/dashboard.json");
  const savedBeta = await response.json();
  delete savedBeta.pages[0].pageType;
  delete savedBeta.pages[0].landing;

  await page.addInitScript(({ key, config }) => {
    localStorage.setItem(key, JSON.stringify(config));
  }, { key: STORAGE_KEY, config: savedBeta });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "From complex exercise data to shared situational awareness",
    }),
  ).toBeVisible();
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  expect(persisted.pages[0].pageType).toBe("landing");
  expect(persisted.pages[0].landing.hero.primaryAction.pageId).toBe("biomedical");
});
```

- [ ] **Step 2: Run the focused E2E tests to verify they fail**

Run:

```powershell
pnpm.cmd build
pnpm.cmd exec playwright test tests/e2e/showcase-home.spec.js
```

Expected: FAIL because Home still renders its KPI/map fallback panels and the new hero is absent.

- [ ] **Step 3: Integrate the landing component and centralize navigation**

At the top of `src/components/DashboardRenderer.jsx`, add:

```jsx
import LandingPage, { hasLandingPresentation } from "./LandingPage.jsx";
```

After `activePage` is resolved, add:

```jsx
const landingActive = hasLandingPresentation(activePage);

function navigateToPage(pageId) {
  if (!(dashboard.pages ?? []).some((page) => page.id === pageId)) {
    return;
  }
  setActivePageId(pageId);
  setSelectedPanelId(null);
}
```

Change the root shell to expose presentation state:

```jsx
<main
  className="app-shell"
  data-device-layout={deviceLayout}
  data-page-type={landingActive ? "landing" : "analytical"}
>
```

Replace both tab button handlers with:

```jsx
onClick={() => navigateToPage(page.id)}
```

Replace the `dashboard-workspace` page-stack content with:

```jsx
<div className="page-stack">
  {landingActive ? (
    <LandingPage
      page={activePage}
      pages={dashboard.pages}
      onNavigate={navigateToPage}
    />
  ) : (
    activePage.sections.map((section) => (
      <section className="dashboard-section" key={section.id}>
        <div className="section-header">
          <div className="section-title-block">
            {editMode ? (
              <>
                <label className="section-edit-field">
                  <span>Section title</span>
                  <input
                    value={(sectionDrafts[section.id]?.title ?? section.title) ?? ""}
                    onChange={(event) => changeSection(section, { title: event.target.value })}
                  />
                </label>
                <label className="section-edit-field">
                  <span>Section subtext</span>
                  <input
                    value={(sectionDrafts[section.id]?.description ?? section.description) ?? ""}
                    onChange={(event) => changeSection(section, { description: event.target.value })}
                  />
                </label>
              </>
            ) : (
              <>
                <h2>{section.title}</h2>
                {section.description && <p>{section.description}</p>}
              </>
            )}
          </div>
          {editMode && (
            <div className="section-actions">
              <button
                type="button"
                className="secondary add-panel-button"
                onClick={() => setChartWizardTarget({
                  pageId: activePage.id,
                  sectionId: section.id,
                })}
              >
                Add chart
              </button>
              <button
                type="button"
                className="secondary add-panel-button"
                onClick={() => removeSectionTitle(section)}
              >
                Remove title
              </button>
            </div>
          )}
        </div>
        <LayoutGrid>
          {section.panels.map((panel) => (
            <ChartPanel
              key={panel.id}
              panel={panel}
              globalPanelColors={globalPanelColors}
              data={dashboard.loadedData[panel.dataSource]}
              geoData={dashboard.loadedData[panel.geoSource]}
              loadedData={dashboard.loadedData}
              filterDefinitions={section.filters ?? []}
              filterValues={filterValues}
              editMode={editMode}
              isDragging={draggingPanelId === panel.id}
              isDragTarget={dragOverPanelId === panel.id}
              isSelected={editMode && selectedPanelId === panel.id}
              multiSelectMode={multiSelectMode}
              isMultiSelected={multiPanelIds.includes(panel.id)}
              onEdit={() => openPanelEditor(panel.id)}
              onRemove={() => removePanel(panel.id)}
              onToggleMultiSelect={() => toggleMultiPanel(panel.id)}
              onFullScreenHold={() => startMultiFullscreenSelection(panel.id)}
              onDisplayAction={onDisplayAction}
              onPointerDragStateChange={handlePointerDragState}
              onPointerReorder={(sourcePanelId, targetPanelId) => {
                onPanelReorder(sourcePanelId, targetPanelId);
                clearDragState();
              }}
              onStartSection={() => startSectionAtPanel(section, panel)}
            />
          ))}
        </LayoutGrid>
      </section>
    ))
  )}
</div>
```

Do not modify the sibling `ChartSettingsPanel`, `AddChartWizard`, `FullscreenDisplay`, `DashboardFooter`, companion-status, install-prompt, or device-control elements.

- [ ] **Step 4: Run unit and focused E2E tests**

Run:

```powershell
node --test tests/landingPage.test.js tests/landingPageConfig.test.js
pnpm.cmd build
pnpm.cmd exec playwright test tests/e2e/showcase-home.spec.js
```

Expected: 6 unit/config tests PASS and 2 E2E tests PASS.

- [ ] **Step 5: Commit routing**

```powershell
git add src/components/DashboardRenderer.jsx tests/e2e/showcase-home.spec.js
git commit -m "feat: route showcase landing page"
```

---

### Task 4: Add the approved visual system, resilience, and preview workflow

**Files:**

- Modify: `src/styles.css`
- Modify: `tests/e2e/showcase-home.spec.js`
- Create: `scripts/capture-showcase-preview.mjs`
- Create: `public/assets/showcase-dashboard-preview.png`

**Interfaces:**

- Consumes: landing class names from Task 2 and `data-page-type` from Task 3
- Produces: responsive desktop/tablet/phone presentation and a reproducible real-dashboard preview

- [ ] **Step 1: Add failing resilience and mobile browser tests**

Append to `tests/e2e/showcase-home.spec.js`:

```js
test("preview failure preserves the complete landing journey", async ({ page }) => {
  await page.route("**/assets/showcase-dashboard-preview.png", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".showcase-landing-preview")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "From complex exercise data to shared situational awareness",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore the live dashboard" })).toBeVisible();
});

test("phone layout remains readable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Support the exercise information cycle" })).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
  await expect(page.locator(".showcase-route")).toHaveCount(2);
  await expect(page.locator(".showcase-hero")).toHaveCSS("display", "grid");
});
```

- [ ] **Step 2: Run the tests to establish the styling gap**

Run:

```powershell
pnpm.cmd build
pnpm.cmd exec playwright test tests/e2e/showcase-home.spec.js
```

Expected: the preview-failure test passes from component behavior; the phone test FAILS because `.showcase-hero` has computed display `block` instead of `grid`.

- [ ] **Step 3: Add the landing styles**

Append a dedicated `/* Showcase landing */` section to `src/styles.css`:

```css
.showcase-landing {
  background: rgb(248 251 255 / 92%);
  border: 1px solid rgb(8 34 74 / 10%);
  border-radius: 24px;
  box-shadow: 0 22px 52px rgb(8 34 74 / 12%);
  color: #102a43;
  overflow: hidden;
}

.showcase-hero {
  background: linear-gradient(135deg, #082b59, #0b5488);
  color: white;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
  min-height: 360px;
}

.showcase-hero-copy {
  align-self: center;
  padding: clamp(34px, 5vw, 64px);
}

.showcase-pill {
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 999px;
  color: #d9ebf7;
  display: inline-flex;
  font-size: 12px;
  font-weight: 700;
  margin: 0;
  padding: 7px 11px;
}

.showcase-hero h1 {
  font-size: clamp(38px, 5vw, 62px);
  letter-spacing: -.035em;
  line-height: 1.02;
  margin: 20px 0 16px;
  max-width: 780px;
}

.showcase-hero-summary {
  color: #d9e8f5;
  font-size: clamp(16px, 1.6vw, 20px);
  line-height: 1.6;
  margin: 0;
  max-width: 720px;
}

.showcase-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.showcase-actions button,
.showcase-secondary-action,
.showcase-route button {
  border-radius: 10px;
  font-weight: 800;
  min-height: 44px;
  padding: 11px 16px;
}

.showcase-actions button {
  background: #f2b54a;
  color: #112e4d;
}

.showcase-secondary-action {
  border: 1px solid rgb(255 255 255 / 28%);
  color: white;
  display: inline-flex;
  text-decoration: none;
}

.showcase-actions button:focus-visible,
.showcase-secondary-action:focus-visible,
.showcase-route button:focus-visible {
  outline: 3px solid #ffd984;
  outline-offset: 3px;
}

.showcase-landing-preview {
  align-self: center;
  margin: 32px 34px 32px 0;
  min-width: 0;
}

.showcase-landing-preview img {
  background: #edf4f8;
  border: 1px solid rgb(255 255 255 / 35%);
  border-radius: 16px;
  box-shadow: 0 24px 54px rgb(0 0 0 / 24%);
  display: block;
  height: 270px;
  object-fit: cover;
  object-position: top left;
  width: 100%;
}

.showcase-proof-grid {
  background: white;
  border-bottom: 1px solid #dfe7ef;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.showcase-proof-grid > div {
  border-right: 1px solid #e3e9ef;
  display: grid;
  gap: 5px;
  padding: 20px 24px;
}

.showcase-proof-grid > div:last-child {
  border-right: 0;
}

.showcase-proof-grid strong {
  color: #0a3767;
}

.showcase-proof-grid span,
.showcase-capability-grid p,
.showcase-status p {
  color: #60778c;
  line-height: 1.5;
  margin: 0;
}

.showcase-section {
  padding: clamp(34px, 5vw, 56px);
}

.showcase-section + .showcase-section {
  padding-top: 8px;
}

.showcase-eyebrow {
  color: #2d6fa4;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .12em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.showcase-section h2,
.showcase-tour h2,
.showcase-status h2 {
  color: #102a43;
  font-size: clamp(26px, 3vw, 36px);
  margin: 0 0 22px;
}

.showcase-capability-grid,
.showcase-status > div {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.showcase-capability-grid article,
.showcase-status article {
  background: white;
  border: 1px solid #dde6ee;
  border-radius: 14px;
  padding: 20px;
}

.showcase-capability-number {
  align-items: center;
  background: #e9f1f7;
  border-radius: 9px;
  color: #175b8c;
  display: inline-flex;
  font-weight: 900;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.showcase-capability-grid h3 {
  color: #123b62;
  margin: 14px 0 7px;
}

.showcase-route-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.showcase-route {
  background: linear-gradient(135deg, #174f7b, #2479a9);
  border-radius: 16px;
  color: white;
  display: grid;
  gap: 10px;
  min-height: 220px;
  padding: 26px;
}

.showcase-route-socio {
  background: linear-gradient(135deg, #68466f, #9b687f);
}

.showcase-route p,
.showcase-route span {
  color: #e6f0f5;
  line-height: 1.5;
  margin: 0;
}

.showcase-route h3 {
  font-size: 24px;
  margin: 0;
}

.showcase-route button {
  align-self: end;
  background: white;
  color: #123b62;
  justify-self: start;
}

.showcase-tour,
.showcase-status {
  margin: 0 clamp(34px, 5vw, 56px) clamp(34px, 5vw, 56px);
}

.showcase-tour {
  background: #fff7e8;
  border: 1px solid #f1d49d;
  border-radius: 14px;
  padding: 22px 24px;
  scroll-margin-top: 16px;
}

.showcase-tour h2,
.showcase-status h2 {
  font-size: 22px;
  margin-bottom: 16px;
}

.showcase-tour ul {
  display: grid;
  gap: 9px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  padding-left: 20px;
}

.showcase-status {
  background: #edf4f8;
  border: 1px solid #d8e4ed;
  border-radius: 16px;
  padding: 24px;
}

.showcase-status-complete strong {
  color: #176646;
}

.showcase-status-ready strong {
  color: #175b8c;
}

.app-shell[data-page-type="landing"] .dashboard-header {
  padding: 18px 22px;
}

.app-shell[data-page-type="landing"] .pdpc-header-mark {
  border-radius: 12px;
  height: 56px;
  width: 56px;
}

.app-shell[data-page-type="landing"] .dashboard-header h1 {
  font-size: 24px;
}

@media (max-width: 900px) {
  .showcase-hero {
    grid-template-columns: 1fr;
  }

  .showcase-landing-preview {
    margin: 0 28px 28px;
  }

  .showcase-proof-grid,
  .showcase-capability-grid,
  .showcase-status > div {
    grid-template-columns: 1fr;
  }

  .showcase-proof-grid > div {
    border-bottom: 1px solid #e3e9ef;
    border-right: 0;
  }

  .showcase-proof-grid > div:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 640px) {
  .showcase-landing {
    border-radius: 18px;
  }

  .showcase-hero-copy {
    padding: 30px 22px;
  }

  .showcase-hero h1 {
    font-size: 39px;
  }

  .showcase-landing-preview {
    margin: 0 18px 20px;
  }

  .showcase-landing-preview img {
    height: 210px;
  }

  .showcase-section {
    padding: 34px 22px;
  }

  .showcase-route-grid,
  .showcase-tour ul {
    grid-template-columns: 1fr;
  }

  .showcase-tour,
  .showcase-status {
    margin: 0 22px 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .showcase-landing *,
  .showcase-landing *::before,
  .showcase-landing *::after {
    scroll-behavior: auto;
    transition-duration: .01ms !important;
  }
}
```

- [ ] **Step 4: Add the reproducible preview capture script**

Create `scripts/capture-showcase-preview.mjs`:

```js
import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4175";
const outputPath = resolve("public/assets/showcase-dashboard-preview.png");
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  const section = page.locator(".dashboard-section").first();
  await section.scrollIntoViewIfNeeded();
  await section.locator(".chart-panel").first().waitFor({ state: "visible" });
  const box = await section.boundingBox();
  if (!box) {
    throw new Error("Could not locate the biomedical dashboard section.");
  }
  await page.screenshot({
    path: outputPath,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(box.width, 1280),
      height: Math.min(box.height, 720),
    },
  });
  console.log(`Captured ${outputPath}`);
} finally {
  await browser.close();
}
```

- [ ] **Step 5: Build, start a local preview, and capture the asset**

In one terminal:

```powershell
pnpm.cmd build
pnpm.cmd preview -- --host 127.0.0.1 --port 4175
```

In a second terminal:

```powershell
node scripts/capture-showcase-preview.mjs http://127.0.0.1:4175
```

Expected: `Captured ...\public\assets\showcase-dashboard-preview.png`. Stop the preview server after capture. Inspect the image and confirm it contains real Biomedical dashboard output without editor panels, browser chrome, private information, or console overlays.

- [ ] **Step 6: Run visual/resilience tests**

Run:

```powershell
pnpm.cmd build
pnpm.cmd exec playwright test tests/e2e/showcase-home.spec.js
```

Expected: 4 E2E tests PASS.

- [ ] **Step 7: Commit visual presentation**

```powershell
git add src/styles.css tests/e2e/showcase-home.spec.js scripts/capture-showcase-preview.mjs public/assets/showcase-dashboard-preview.png
git commit -m "feat: style responsive showcase landing"
```

---

### Task 5: Prove Quorum compatibility and document the showcase

**Files:**

- Modify: `tests/e2e/quorum-companion.spec.js:11-35`
- Modify: `docs/app-manual.md`

**Interfaces:**

- Consumes: completed landing page and existing Quorum mock companion
- Produces: explicit regression evidence and maintenance instructions

- [ ] **Step 1: Add a Quorum regression assertion from the new Home**

Add this test to `tests/e2e/quorum-companion.spec.js`:

```js
test("Quorum chart display remains available when the dashboard starts on showcase Home", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "From complex exercise data to shared situational awareness",
    }),
  ).toBeVisible();
  await expect(page.getByText("Companion connected")).toBeVisible();

  await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });

  await expect(
    page.locator(`[data-displayed-chart-id="${FIRST_CHART}"]`),
  ).toBeVisible();
});
```

- [ ] **Step 2: Run the Quorum test**

Run:

```powershell
pnpm.cmd build
pnpm.cmd exec playwright test tests/e2e/quorum-companion.spec.js
```

Expected: all existing Quorum tests plus the new Home-start regression test PASS.

- [ ] **Step 3: Document Home and preview maintenance**

Add this section to `docs/app-manual.md` near the page-navigation guidance:

```markdown
## Showcase Home

The Home tab is an orienting landing page for first-time visitors and the
Cloudflare-hosted demonstration. It presents SimEx as a reusable platform and
uses the HeV-A26 scenario as the current live example.

The page provides:

- a concise operational-value statement;
- routes to the Biomedical and Socio-economic tabs;
- a short list of demonstration capabilities to try;
- delivery-status language that distinguishes the cloud showcase from Quorum
  integration readiness.

The hosted dashboard operates normally in `Standalone` mode when no Quorum
companion is present. `Quorum integration-ready` means that the compatibility
foundation is included; it does not mean the public Cloudflare page is actively
connected to Quorum.

### Refreshing the dashboard preview

Build and preview the app:

```powershell
pnpm.cmd build
pnpm.cmd preview -- --host 127.0.0.1 --port 4175
```

In a second terminal, capture the approved Biomedical preview:

```powershell
node scripts/capture-showcase-preview.mjs http://127.0.0.1:4175
```

Review `public/assets/showcase-dashboard-preview.png` before committing it.
The image must show only public demonstration data and must not include editor
panels, browser chrome, private information, or console overlays.
```

- [ ] **Step 4: Run the complete verification matrix**

Run:

```powershell
pnpm.cmd test
pnpm.cmd build
pnpm.cmd run build:cloudflare
pnpm.cmd exec playwright test
git diff --check
git status --short
```

Expected:

- All Node tests PASS.
- Standard Vite build succeeds; the documented large-chunk warning may appear.
- Cloudflare build succeeds with embedded portable data disabled.
- All Playwright tests PASS.
- `git diff --check` prints nothing.
- Git status lists only the intended documentation and Quorum regression-test changes before commit.

- [ ] **Step 5: Perform manual accessibility and responsive QA**

Verify at 1440×900, 1024×768, and 390×844:

```text
- Hero headline and primary action are visible and readable.
- Tab and landing actions work by keyboard.
- Focus indicators are clearly visible.
- “See what to try” reaches the guided section.
- No horizontal scrolling appears.
- Preview alternative text is meaningful when the image is unavailable.
- Reduced-motion mode removes nonessential transition duration.
- Status uses symbols and labels, not color alone.
- Analytical pages retain their existing header, charts, editor, and fullscreen layout.
```

Expected: every item passes before the release-candidate check.

- [ ] **Step 6: Commit documentation and regression evidence**

```powershell
git add tests/e2e/quorum-companion.spec.js docs/app-manual.md
git commit -m "docs: document showcase landing workflow"
```

- [ ] **Step 7: Confirm the release candidate without deploying**

Run:

```powershell
git status --short --branch
git log --oneline --decorate -6
```

Expected: clean `codex/showcase-home` working tree with the versioned design and plan plus five focused implementation commits. Do not advance `content/cloudflare-beta`, tag a release, push, or deploy until the user reviews the completed branch.
