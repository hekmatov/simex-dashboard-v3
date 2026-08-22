# SimEx V3 Cutover, Default Dashboard, and Quorum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the live application over to chart configuration version 3, rebuild the default dashboard from the existing exercise datasets, and update Quorum’s fail-closed semantic catalogue contract.

**Architecture:** Generate reusable profiles for the existing local sources, author a curated version-3 dashboard, then wire the new chart, authoring, playback, and collection systems into the live shell. Publish a catalogue-contract version 2 from normalized chart schemas and instances, and validate that exact contract in a separate local Quorum worktree.

**Tech Stack:** React 19, Vite 6, JavaScript ES modules, JSON, Node test runner, Playwright 1.61, Python 3.12, Pydantic 2, pytest

## Global Constraints

- Complete the core, time/collection, and wizard/editor plans first.
- Dashboard work remains in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp`.
- Quorum work uses `C:\Users\hekma\Documents\SimEx Dashboard\quorum\quorum\.worktrees\chart-schema-v3-contract`.
- Dashboard branch remains `codex/chart-wizard-revamp`.
- Create Quorum branch `codex/chart-schema-v3-contract` from exact Phase 5 main commit `0436380`.
- Do not read or write OneDrive.
- Do not modify the existing showcase-home worktree.
- Do not migrate or structurally import version-2 dashboards.
- Preserve the current datasets and analytical coverage, not the old panel arrangement.
- Retain the completed showcase landing page.
- Use catalogue contract version `"2"` and chart schema version `3`.
- Keep the WebSocket companion protocol at version `"1"`; it already authenticates the catalogue by ID and digest.
- Quorum continues to fail closed on unknown fields, versions, digests, chart IDs, or semantics.
- Do not merge, push, deploy, update Cloudflare, or integrate the Quorum branch without user approval.
- Quorum’s durable ledger must end at `awaiting_integration`, not `complete`, because integration is deliberately outside this request.
- Commit each task independently in its owning repository.

---

## Quorum Backlog Review

Reviewed under `C:\Users\hekma\Documents\SimEx Dashboard\quorum\quorum\docs\project-workflow.md`.

- **COMP-001 — Per-engine worker timeout compatibility:** deliberately deferred; this work changes dashboard catalogue compatibility, not engine manifests or worker timeouts.
- **REL-001 — Recover the final in-progress audio interval:** deliberately deferred; no capture durability behavior changes.
- **MOD-001 — Seating-plan speaker-attribution validation:** deliberately deferred; no speaker-attribution UI is introduced.
- **PART-001 — Private participant reflection and sealed personal report:** deliberately deferred; no participant reporting or identity behavior changes.
- **Superseded entries:** none.
- **New deferred item:** add `DASH-001 — Quorum-generated collection priority recommendations`, because the approved design adds an extension point but expressly excludes production recommendation generation.

---

## File Structure

### Dashboard: Create

- `scripts/build-dataset-profiles.mjs` — profiles configured local datasets deterministically.
- `public/config/dataset-profiles.json` — generated type, parsing, example, and provenance metadata.
- `docs/data/chart-v3-dataset-map.md` — maps existing datasets to retained analytical questions and curated panels.
- `tests/datasetProfilesV3.test.js` — source/profile completeness tests.
- `tests/defaultDashboardV3.test.js` — curated configuration and coverage tests.
- `tests/dashboardAppV3.test.js` — storage, bundle, and application cutover tests.
- `tests/quorumCatalogueV2.test.js` — catalogue-contract version-2 tests.
- `tests/fixtures/timeline-events.csv` — small upload fixture with event, start, end, lane, and status roles.
- `docs/chart-data-system-v3.md` — author and maintainer documentation.

### Dashboard: Modify

- `public/config/dashboard.json` — complete curated version-3 dashboard.
- `public/config/chart-aliases.json` — aliases for the curated chart IDs.
- `public/integration/quorum-chart-catalogue.json` — generated contract-version-2 snapshot.
- `src/App.jsx` — version-3 load, storage, save, import, and export.
- `src/lib/loadDashboard.js` — source-descriptor and profile loading.
- `src/lib/quorumCatalogue.js` — version-2 schema and instance semantic catalogue.
- `src/components/DashboardRenderer.jsx` — live wizard/editor/playback wiring.
- `src/components/ChartPanel.jsx` — lean panel shell around version-3 `ChartView`.
- `src/components/FullscreenDisplay.jsx` — version-3 chart rendering.
- `src/styles.css` — final integration and responsive fixes.
- `scripts/build-quorum-catalogue.mjs` — supplies profiles and chart schemas to the generator.
- `scripts/build-portable-data.mjs` — embeds version-3 source descriptors and profiles.
- `scripts/promote-dashboard-bundle.mjs` — accepts version-3 bundles only.
- `package.json` — remove the version-2 migration command.
- `AGENTS.md` — update browser baseline wording from version 2 to version 3.
- `README.md` — version-3 architecture and commands.
- `docs/app-manual.md` — new wizard, editing, playback, and collection guidance.
- `tests/e2e/chart-authoring-v3.spec.js` — complete live authoring flow.
- `tests/e2e/time-collection.spec.js` — synchronized playback and collection flow.
- `tests/e2e/quorum-companion.spec.js` — retain companion flows with the new catalogue digest.

### Dashboard: Delete after cutover

- `src/components/AddChartWizard.jsx`
- `src/components/DataBindingEditor.jsx`
- `src/components/ChartSettingsPanel.jsx`
- `src/components/ChartSettingsPanelV2.jsx`
- `src/lib/buildEchartsOption.js`
- `src/lib/chartDataModel.js`
- `src/lib/chartOptionRegistry.js`
- `src/lib/dashboardCompatibility.js`
- `src/lib/validateConfig.js`
- `scripts/migrate-chart-schema-v2.mjs`
- `tests/chartDataModel.test.js`
- `tests/dashboardBindings.test.js`
- `tests/dashboardCompatibility.test.js`
- `docs/chart-data-system-v2.md`

### Quorum: Modify

- `.superpowers/sdd/progress.md` — compatibility-update controller state and integration gate.
- `docs/roadmap/improvement-backlog.md` — add `DASH-001`.
- `src/quorum_intelligence/contracts.py` — catalogue-contract version-2 Pydantic models.
- `src/quorum_intelligence/catalogue.py` — strict version-2 key, ordering, digest, and semantic validation.
- `tests/test_intelligence_catalogue.py` — version-2 success and fail-closed cases.
- `tests/test_intelligence_contracts.py` — chart type, role, time, and collection contract validation.
- `tests/test_dashboard_gateway.py` — exact generated catalogue fixture continues to initialize the gateway.
- `tests/fixtures/dashboard/quorum-chart-catalogue.json` — exact dashboard-generated snapshot.
- `docs/architecture.md` — document catalogue version 2 and unchanged companion protocol.

## Catalogue Contract Version 2

Top-level shape:

```json
{
  "contract_version": "2",
  "catalogue_id": "simex-dashboard",
  "catalogue_revision": "2026-07-26",
  "chart_schema_version": 3,
  "chart_types": [],
  "charts": [],
  "dashboard_semantic_digest": "lowercase-sha256",
  "digest": "lowercase-sha256"
}
```

Each `chart_types` entry contains:

```json
{
  "type_id": "line",
  "label": "Line",
  "purpose": "trend",
  "role_ids": ["measurements", "observation", "cluster", "filters"],
  "renderer": "axis",
  "capabilities": {
    "collection": false,
    "time_sync": true,
    "zoom": true
  }
}
```

Each configured `charts` entry contains:

```json
{
  "chart_id": "bio_confirmed_cases",
  "type_id": "line",
  "title": "Confirmed cases",
  "description": "Cumulative confirmed HeV-A26 cases over time.",
  "page_id": "biomedical",
  "section_id": "outbreak_dynamics",
  "aliases": ["confirmed cases"],
  "keywords": ["cases", "epidemic", "trend"],
  "role_ids": ["measurements", "observation"],
  "chrono_group_id": "national_outbreak",
  "collection_capability": false,
  "supported_display_modes": ["fullscreen", "multi_fullscreen", "playback"]
}
```

Canonicalization remains UTF-8 JSON with recursively sorted object keys and JavaScript UTF-16 ordering for arrays that the contract declares sorted.

---

### Task 1: Generate deterministic profiles for every retained data source

**Files:**

- Create: `scripts/build-dataset-profiles.mjs`
- Create: `public/config/dataset-profiles.json`
- Create: `tests/datasetProfilesV3.test.js`
- Modify: `src/lib/loadDashboard.js`
- Modify: `scripts/build-portable-data.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: version-3 `dashboard.dataSources` descriptors and local CSV/GeoJSON files
- Produces: deterministic `dataset-profiles.json` keyed by source ID

- [ ] **Step 1: Write the failing completeness and mortality-date tests**

```js
test("every tabular source has a generated reusable profile", async () => {
  const dashboard = JSON.parse(await readFile("public/config/dashboard.json", "utf8"));
  const profiles = JSON.parse(await readFile("public/config/dataset-profiles.json", "utf8"));
  const tabularIds = Object.entries(dashboard.dataSources)
    .filter(([, source]) => source.kind === "csv")
    .map(([sourceId]) => sourceId);
  assert.deepEqual(Object.keys(profiles).toSorted(), tabularIds.toSorted());
});

test("mortality dates use the explicit day-month-year rule", async () => {
  const profiles = JSON.parse(await readFile("public/config/dataset-profiles.json", "utf8"));
  const date = profiles.bio_mortality.columns.find(({ name }) => name === "date");
  assert.deepEqual(date.parsing, {
    interpretation: "temporal",
    format: "DD/MM/YYYY",
    timezone: "date-only",
  });
});
```

- [ ] **Step 2: Run the profile test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/datasetProfilesV3.test.js
```

Expected: FAIL because the generator and output do not exist.

- [ ] **Step 3: Implement source descriptors and profile generation**

```js
dashboard.dataSources.bio_cases = {
  kind: "csv",
  path: "data/biomedical/cases.csv",
  provenance: { label: "Simulation exercise biomedical dataset" },
};

dashboard.dataSources.geo_netherlands_provinces = {
  kind: "geojson",
  path: "data/geo/netherlands-provinces.geojson",
};
```

The build script loads CSV sources through the same parser used at runtime, applies configured parsing overrides, profiles them with `profileDataset`, and writes keys in stable order.

- [ ] **Step 4: Generate profiles and run tests**

Run:

```powershell
node scripts/build-dataset-profiles.mjs
pnpm.cmd test -- tests/datasetProfilesV3.test.js tests/chartTemporalV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add scripts/build-dataset-profiles.mjs scripts/build-portable-data.mjs public/config/dataset-profiles.json public/config/dashboard.json src/lib/loadDashboard.js package.json tests/datasetProfilesV3.test.js
git commit -m "feat: profile version 3 dashboard sources"
```

### Task 2: Rebuild the curated default dashboard from existing exercise data

**Files:**

- Create: `docs/data/chart-v3-dataset-map.md`
- Create: `tests/defaultDashboardV3.test.js`
- Modify: `public/config/dashboard.json`
- Modify: `public/config/chart-aliases.json`

**Interfaces:**

- Consumes: current local datasets and version-3 schemas
- Produces: a valid `configVersion: 3` dashboard retaining the showcase Home page and required analytical coverage

- [ ] **Step 1: Write the failing configuration and coverage test**

```js
test("the curated dashboard is version 3 and every chart validates", async () => {
  const dashboard = await loadTrackedDashboard();
  assert.equal(dashboard.configVersion, 3);
  for (const chart of configuredCharts(dashboard)) {
    assert.deepEqual(validateChartInstance(chart), []);
    assert.ok(getChartSchema(chart.typeId));
  }
});

test("the previous exercise coverage and new useful families are represented", async () => {
  const typeIds = new Set(configuredCharts(await loadTrackedDashboard()).map(({ typeId }) => typeId));
  for (const required of [
    "kpi", "mapScatter", "line", "chronoChoroplethMap", "horizontalBar",
    "deltaList", "mixed", "bar", "gauge", "groupedBar", "table",
    "stackedBar", "pie", "bullet", "bubble", "heatmap",
  ]) {
    assert.ok(typeIds.has(required), `missing curated ${required}`);
  }
});
```

- [ ] **Step 2: Run the default-dashboard test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/defaultDashboardV3.test.js
```

Expected: FAIL because the tracked dashboard still uses version 2.

- [ ] **Step 3: Write the dataset map and curated panel set**

The Markdown map must record source, analytical question, roles, parsing, and chosen chart. Configure this exact coverage:

- Home: KPI Collection for dashboard areas and one map-scatter operational preview.
- Outbreak dynamics: confirmed-cases line, cases/deaths mixed chart, R-value line, province horizontal bar, mortality pie, province delta list, municipality chronological choropleth, municipality aggregate line, and population/infection bubble chart.
- Health system: ICU and hospital bullet collection, ICU occupancy line, hospital occupancy line, admissions grouped bar, delayed-care grouped bar, testing mixed chart, and occupancy gauge collection.
- Environmental surveillance: wastewater map scatter and province horizontal bar.
- Vaccination: current-status table and vaccination-rate line.
- Public response: risk-perception heatmap, risk delta list, adherence stacked bar, citizen-values horizontal bar, and values delta list.
- Trust and wellbeing: trust line, trust gauge, loneliness line, wellbeing stacked bar, lifestyle stacked bar, and resilience stacked bar.
- Economy and staffing: business-closures grouped bar, unemployment line, healthcare absenteeism line, and school absenteeism line.

Create a `municipal_outbreak` synchronization group whose primary clock is the chronological choropleth source and whose members include the choropleth and municipality aggregate line. Create a `national_outbreak` group from `bio_cases` for compatible national line, mixed, bar, KPI, gauge, and bullet views.

Document that timeline and swimlane remain available in the chart builder but are not seeded into the default dashboard because the current exercise datasets contain no event-start/event-end source suitable for an honest timeline.

A representative configured chart uses:

```json
{
  "id": "bio_mortality_composition",
  "typeId": "pie",
  "title": "Mortality by age group",
  "sourceId": "bio_mortality",
  "roles": {
    "category": { "field": "Age group" },
    "value": { "field": "deaths" }
  },
  "transformations": {
    "filters": [],
    "aggregation": "sum"
  },
  "presentation": {
    "title": { "align": "center" }
  }
}
```

- [ ] **Step 4: Run configuration, profile, schema, and data tests**

Run:

```powershell
pnpm.cmd test -- tests/defaultDashboardV3.test.js tests/datasetProfilesV3.test.js tests/chartSchemasV3.test.js tests/chartDataPipelineV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add docs/data/chart-v3-dataset-map.md public/config/dashboard.json public/config/chart-aliases.json tests/defaultDashboardV3.test.js
git commit -m "feat: curate version 3 default dashboard"
```

### Task 3: Cut application state, bundles, rendering, and authoring over to version 3

**Files:**

- Create: `tests/dashboardAppV3.test.js`
- Modify: `src/App.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/ChartPanel.jsx`
- Modify: `src/components/FullscreenDisplay.jsx`
- Modify: `scripts/promote-dashboard-bundle.mjs`
- Modify: `package.json`
- Modify: `AGENTS.md`
- Delete: version-2 components, libraries, script, tests, and documentation listed above

**Interfaces:**

- Consumes: tracked version-3 dashboard, schema-generated authoring components, and version-3 bundle API
- Produces: live version-3 application using localStorage key `simex-dashboard-config-v3`

- [ ] **Step 1: Write failing app-policy tests**

```js
test("the app uses only the version 3 storage and bundle contracts", async () => {
  const source = await readFile("src/App.jsx", "utf8");
  assert.match(source, /simex-dashboard-config-v3/);
  assert.doesNotMatch(source, /migrateDashboardToDataModel/);
  assert.doesNotMatch(source, /simex-dashboard-v2-bundle/);
});

test("the live renderer imports version 3 authoring and chart views", async () => {
  const source = await readFile("src/components/DashboardRenderer.jsx", "utf8");
  assert.match(source, /ChartWizardV3/);
  assert.match(source, /ChartEditorV3/);
  assert.match(source, /PlaybackProvider/);
});
```

- [ ] **Step 2: Run the app-policy test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/dashboardAppV3.test.js
```

Expected: FAIL because the live shell still imports version-2 modules.

- [ ] **Step 3: Wire the new system and remove legacy code**

```jsx
<PlaybackProvider
  groups={dashboard.chronoGroups}
  loadedData={dashboard.loadedData}
  profiles={dashboard.datasetProfiles}
>
  <DashboardRenderer
    dashboard={dashboard}
    onCreateChart={addVersion3Chart}
    onSaveChart={saveVersion3Chart}
  />
</PlaybackProvider>
```

`ChartPanel` becomes the panel chrome and action shell around `ChartView`. `FullscreenDisplay` uses the same `ChartView`. App import/export delegates to `parseDashboardBundle` and `serializeDashboardBundle`. Ignore the old localStorage key; do not migrate it. Rewrite bundle promotion to accept version 3 only.

- [ ] **Step 4: Run the full unit suite**

Run:

```powershell
pnpm.cmd test
```

Expected: PASS after obsolete version-2 tests are removed and all new tests remain green.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: cut dashboard over to chart system v3"
```

### Task 4: Complete live authoring, playback, collection, and zoom browser tests

**Files:**

- Create: `tests/e2e/chart-authoring-v3.spec.js`
- Create: `tests/e2e/time-collection.spec.js`
- Create: `tests/fixtures/timeline-events.csv`
- Modify: `tests/e2e/showcase-home.spec.js`
- Modify: `tests/e2e/quorum-companion.spec.js`
- Modify only in-scope app files if tests expose defects

**Interfaces:**

- Consumes: live version-3 dashboard
- Produces: end-to-end proof of all requested interaction changes

- [ ] **Step 1: Enable and complete authoring assertions**

Remove the pre-cutover conditional skip. Cover:

```js
await expect(page.getByRole("tab", { name: "Style and layout" })).toBeEnabled();
await page.getByRole("button", { name: "Close" }).click();
await expect(page.getByRole("dialog", { name: "Discard chart?" })).toBeVisible();
await page.getByRole("button", { name: "Continue editing" }).click();
```

Add actual chart creation for pie, scatter, heatmap, bullet, timeline, and delta card; contextual editor sections; compatible and incompatible conversion; Save/Reset placement; reset confirmation; centered title; and shared background color picker.

Use `tests/fixtures/timeline-events.csv` through the upload control for the timeline flow:

```csv
event,start,end,lane,status
Hospital escalation,2027-05-01T09:00:00Z,2027-05-01T11:00:00Z,Health coordination,active
Evacuation decision,2027-05-01T10:00:00Z,2027-05-01T12:30:00Z,Civil protection,planned
```

- [ ] **Step 2: Complete playback, collection, and zoom assertions**

```js
await page.getByRole("button", { name: "Open synchronized playback" }).click();
await page.getByRole("button", { name: "Next time" }).click();
await expect(page.getByTestId("municipality-map-active-time"))
  .toHaveText(await page.getByTestId("municipality-line-active-time").textContent());

await page.getByTestId("zoomable-chart").hover();
await page.mouse.wheel(0, -200);
await expect(page.getByText("Hold Ctrl while scrolling to zoom")).toBeVisible();
```

Use a keyboard modifier wheel event for the positive zoom assertion and verify plain wheel changes page scroll position.

- [ ] **Step 3: Run the complete browser suite**

Run:

```powershell
pnpm.cmd test:e2e
```

Expected: all showcase, authoring, playback, collection, and Quorum companion tests PASS.

- [ ] **Step 4: Run unit tests and build**

Run:

```powershell
pnpm.cmd test
pnpm.cmd build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add tests/e2e src
git commit -m "test: verify chart system v3 workflows"
```

### Task 5: Generate dashboard catalogue contract version 2

**Files:**

- Create: `tests/quorumCatalogueV2.test.js`
- Modify: `src/lib/quorumCatalogue.js`
- Modify: `scripts/build-quorum-catalogue.mjs`
- Modify: `public/integration/quorum-chart-catalogue.json`
- Delete: `tests/quorumCatalogue.test.js`

**Interfaces:**

- Consumes: chart schemas, curated dashboard, aliases, and normalized instance semantics
- Produces: deterministic contract-version-2 catalogue and semantic digest

- [ ] **Step 1: Write failing contract-version and semantic tests**

```js
test("catalogue v2 contains normalized chart types and instances", async () => {
  const snapshot = await buildTrackedSnapshot();
  assert.equal(snapshot.contract_version, "2");
  assert.equal(snapshot.chart_schema_version, 3);
  assert.equal(snapshot.chart_types.length, listChartSchemas().length);
  assert.ok(snapshot.charts.some(({ type_id }) => type_id === "pie"));
  assert.ok(snapshot.charts.some(({ chrono_group_id }) => chrono_group_id === "municipal_outbreak"));
});

test("time or collection semantic changes invalidate the dashboard digest", async () => {
  const dashboard = await trackedDashboard();
  const changed = structuredClone(dashboard);
  changed.chronoGroups[0].members[0].matching.policy = "lastKnown";
  assert.notEqual(
    canonicalDashboardSemanticsBytes(changed),
    canonicalDashboardSemanticsBytes(dashboard),
  );
});
```

- [ ] **Step 2: Run the catalogue test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/quorumCatalogueV2.test.js
```

Expected: FAIL because the generator still emits contract version 1.

- [ ] **Step 3: Implement normalized schema and instance semantics**

```js
export function buildChartCatalogue(dashboard, aliases) {
  return {
    contract_version: "2",
    catalogue_id: "simex-dashboard",
    catalogue_revision: dashboard.lastUpdated,
    chart_schema_version: CHART_SCHEMA_VERSION,
    chart_types: semanticChartTypes(listChartSchemas()),
    charts: semanticCharts(dashboard, aliases),
    dashboard_semantic_digest: "",
  };
}
```

Reject runtime metadata, loaded rows, generated profiles, preview state, and compatibility timestamps at the packaged semantic boundary so they cannot be silently omitted from or confused with the semantic digest.

- [ ] **Step 4: Generate and verify the snapshot**

Run:

```powershell
node scripts/build-quorum-catalogue.mjs
pnpm.cmd test -- tests/quorumCatalogueV2.test.js
```

Expected: PASS with lowercase SHA-256 digests.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/quorumCatalogue.js scripts/build-quorum-catalogue.mjs public/integration/quorum-chart-catalogue.json tests/quorumCatalogueV2.test.js
git rm tests/quorumCatalogue.test.js
git commit -m "feat: publish Quorum catalogue contract v2"
```

### Task 6: Create the isolated Quorum compatibility worktree and durable ledger

**Files:**

- Modify in Quorum: `.superpowers/sdd/progress.md`
- Modify in Quorum: `docs/roadmap/improvement-backlog.md`

**Interfaces:**

- Consumes: Quorum main commit `0436380`
- Produces: isolated branch `codex/chart-schema-v3-contract` and an `in_progress` compatibility ledger

- [ ] **Step 1: Verify the exact Phase 5 base**

Run in `C:\Users\hekma\Documents\SimEx Dashboard\quorum\quorum`:

```powershell
git status --short --branch
git rev-parse HEAD
git merge-base --is-ancestor 0436380 HEAD
```

Expected: clean `main`, HEAD `0436380`, ancestor check exits zero.

- [ ] **Step 2: Create the isolated worktree**

Run:

```powershell
git worktree add "C:\Users\hekma\Documents\SimEx Dashboard\quorum\quorum\.worktrees\chart-schema-v3-contract" -b codex/chart-schema-v3-contract 0436380
```

Expected: new worktree on `codex/chart-schema-v3-contract`; the main worktree remains unchanged.

- [ ] **Step 3: Record the controller ledger**

Set:

```markdown
Status: in_progress
Task: Dashboard catalogue contract version 2 compatibility
Base: 0436380
Branch: codex/chart-schema-v3-contract
Current gate: contract tests
Next action: add failing version-2 catalogue tests
Integration: prohibited until user approval
```

- [ ] **Step 4: Add the required deferred backlog entry**

Add:

```markdown
### DASH-001 — Quorum-generated collection priority recommendations

- **Status:** Deferred.
- **Trigger:** Phase 6 moderator decision-support planning or implementation of a dashboard collection-priority provider.
- **Scope:** Generate evidence-linked, explainable priority inputs for collection-capable dashboard charts without directly mutating dashboard order.
- **Prerequisites:** Catalogue contract version 2, approved risk semantics, bounded recommendation protocol, moderator confirmation, and replayable evidence provenance.
- **Acceptance criteria:** Recommendations name the chart and entity, expose score components and evidence references, never execute dashboard expressions, remain advisory until confirmed, and are covered by fail-closed contract, replay, and privacy tests.
- **Source:** SimEx chart configuration and wizard revamp design, 2026-07-26.
```

- [ ] **Step 5: Commit the Quorum planning state**

Run in the Quorum worktree:

```powershell
git add .superpowers/sdd/progress.md docs/roadmap/improvement-backlog.md
git commit -m "docs: start dashboard catalogue v2 compatibility"
```

### Task 7: Update Quorum’s strict catalogue contract and fixture

**Files:**

- Modify in Quorum: `src/quorum_intelligence/contracts.py`
- Modify in Quorum: `src/quorum_intelligence/catalogue.py`
- Modify in Quorum: `tests/test_intelligence_catalogue.py`
- Modify in Quorum: `tests/test_intelligence_contracts.py`
- Modify in Quorum: `tests/test_dashboard_gateway.py`
- Modify in Quorum: `tests/fixtures/dashboard/quorum-chart-catalogue.json`
- Modify in Quorum: `docs/architecture.md`
- Modify in Quorum: `.superpowers/sdd/progress.md`

**Interfaces:**

- Consumes: the exact dashboard-generated contract-version-2 snapshot
- Produces: strict Pydantic models and canonical validation matching JavaScript bytes

- [ ] **Step 1: Write failing contract-version-2 tests**

```python
def test_loads_catalogue_v2_with_schema_time_and_collection_semantics() -> None:
    catalogue = load_catalogue(FIXTURE)
    assert catalogue.contract_version == "2"
    assert catalogue.chart_schema_version == 3
    assert any(item.type_id == "pie" for item in catalogue.chart_types)
    assert any(item.chrono_group_id for item in catalogue.charts)


def test_rejects_unknown_capability_role_and_semantic_fields(tmp_path: Path) -> None:
    for mutation in (
        add_unknown_chart_type_key,
        add_unknown_capability,
        add_unknown_role,
        change_dashboard_semantic_digest,
    ):
        with pytest.raises(CatalogueValidationError):
            load_catalogue(write_mutated_fixture(tmp_path, mutation))
```

- [ ] **Step 2: Run focused Quorum tests and confirm they fail**

Run in the Quorum worktree:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_intelligence_catalogue.py tests/test_intelligence_contracts.py -q
```

Expected: FAIL because contract version 2 is unsupported.

- [ ] **Step 3: Implement strict version-2 models and canonical validation**

```python
class ChartCapabilities(StrictModel):
    collection: bool
    time_sync: bool
    zoom: bool


class ChartTypeDescriptor(StrictModel):
    type_id: NonEmptyText
    label: NonEmptyText
    purpose: NonEmptyText
    role_ids: tuple[NonEmptyText, ...]
    renderer: NonEmptyText
    capabilities: ChartCapabilities


class ChartDescriptor(StrictModel):
    chart_id: NonEmptyText
    type_id: NonEmptyText
    title: NonEmptyText
    description: NonEmptyText
    page_id: NonEmptyText
    section_id: NonEmptyText
    aliases: tuple[NonEmptyText, ...]
    keywords: tuple[NonEmptyText, ...]
    role_ids: tuple[NonEmptyText, ...]
    chrono_group_id: NonEmptyText | None
    collection_capability: bool
    supported_display_modes: tuple[NonEmptyText, ...]


class ChartCatalogue(StrictModel):
    contract_version: Literal["2"]
    catalogue_id: NonEmptyText
    catalogue_revision: NonEmptyText
    chart_schema_version: Literal[3]
    chart_types: tuple[ChartTypeDescriptor, ...]
    charts: tuple[ChartDescriptor, ...]
    dashboard_semantic_digest: Digest
    digest: Digest
```

Update exact key sets, UTF-16 ordering checks, digest-body construction, unique IDs, known type references, allowed role IDs, playback display mode, time-sync group normalization, and collection capability consistency. Do not change `PROTOCOL_VERSION`.

- [ ] **Step 4: Copy the exact generated fixture and run focused tests**

Copy:

```text
C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp\public\integration\quorum-chart-catalogue.json
```

to:

```text
C:\Users\hekma\Documents\SimEx Dashboard\quorum\quorum\.worktrees\chart-schema-v3-contract\tests\fixtures\dashboard\quorum-chart-catalogue.json
```

Then run:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_intelligence_catalogue.py tests/test_intelligence_contracts.py tests/test_dashboard_gateway.py -q
```

Expected: PASS.

- [ ] **Step 5: Document and commit**

```powershell
git add src/quorum_intelligence/contracts.py src/quorum_intelligence/catalogue.py tests/test_intelligence_catalogue.py tests/test_intelligence_contracts.py tests/test_dashboard_gateway.py tests/fixtures/dashboard/quorum-chart-catalogue.json docs/architecture.md .superpowers/sdd/progress.md
git commit -m "feat: validate dashboard catalogue contract v2"
```

Update the ledger’s next action to full verification before committing it.

### Task 8: Verify both repositories and stop at the integration approval gate

**Files:**

- Create in dashboard: `docs/verification/2026-07-26-chart-system-v3.md`
- Modify in dashboard: `README.md`
- Modify in dashboard: `docs/app-manual.md`
- Create in dashboard: `docs/chart-data-system-v3.md`
- Modify in Quorum: `.superpowers/sdd/progress.md`
- Create in Quorum: `docs/verification/2026-07-26-dashboard-catalogue-v2.md`

**Interfaces:**

- Consumes: final dashboard and Quorum branch tips
- Produces: reproducible verification evidence and an explicit no-integration handoff

- [ ] **Step 1: Run final dashboard verification**

Run in the dashboard worktree:

```powershell
pnpm.cmd test
pnpm.cmd test:e2e
pnpm.cmd build
git diff --check
```

Expected: all tests and build PASS; only documented Vite warnings are present.

- [ ] **Step 2: Run full Quorum verification**

Run in the Quorum worktree:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
git diff --check
```

Expected: full Quorum suite PASS.

- [ ] **Step 3: Write verification and user documentation**

Record:

```markdown
- exact branch-tip commit;
- exact generated catalogue digest;
- exact dashboard semantic digest;
- unit, browser, build, and Quorum commands;
- pass counts;
- documented non-failing warnings;
- proof that version-2 bundles are rejected;
- proof that no merge, push, deployment, or Cloudflare update occurred.
```

Update the app manual with chart discovery, source profiling, data roles, style/preview, contextual editing, type conversion, time playback, Collection Display, delta comparisons, Ctrl-wheel zoom, and bundle version 3.

- [ ] **Step 4: Commit verification in each repository**

Dashboard:

```powershell
git add README.md docs/app-manual.md docs/chart-data-system-v3.md docs/verification/2026-07-26-chart-system-v3.md
git commit -m "docs: verify chart system v3"
```

Quorum:

```powershell
git add docs/verification/2026-07-26-dashboard-catalogue-v2.md .superpowers/sdd/progress.md
git commit -m "docs: verify dashboard catalogue v2"
```

Set the Quorum ledger to `awaiting_integration` with the specific blocker `User approval required for push, pull request, merge, and Phase Integration Gate`.

- [ ] **Step 5: Confirm branch isolation**

Run:

```powershell
git status --short --branch
git log -1 --oneline
```

in both worktrees.

Expected: both feature branches are clean; neither feature branch has been pushed or merged; the existing showcase-home and Quorum main worktrees remain unchanged.
