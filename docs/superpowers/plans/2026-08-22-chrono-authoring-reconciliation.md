# Chrono Authoring Reconciliation Implementation Plan

> **Execution protocol:** Use `superpowers:executing-plans`, `superpowers:test-driven-development`, and `gsd-execute-phase` to implement this plan task-by-task without subagent delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporal authoring domain with Chrono Group terminology and schema, then deliver read-first Chrono and Scene studios whose creation and editing flows match accepted Sketches 005, 006, and 012.

**Architecture:** One canonical dashboard object owns `chronoGroups` and Scenes whose parent field is `chronoGroupId`; chart drafts use `chronoGroupMemberships`. A shared pure content-navigation reducer supplies two studio projections, while focused library, detail, and editor components keep browsing separate from mutation. Build owns auxiliary lifecycle and transactional commits; View and Present consume the same renamed state without compatibility aliases.

**Tech Stack:** React 18, JavaScript ES modules, Vite 6, Node test runner, Playwright, CSS custom-property design tokens.

**Spec:** `docs/superpowers/specs/2026-08-22-chrono-authoring-reconciliation-design.md`

## Global Constraints

- Preserve every pre-existing dirty and untracked file. Never reset, clean, or overwrite unrelated work; stage only the current task's intended hunks.
- No compatibility alias, fallback reader, dual-write behavior, or legacy migration may remain for the renamed temporal-group domain.
- The persisted root collection is `chronoGroups`; Scene ownership is `chronoGroupId`; chart-draft membership is `chronoGroupMemberships`.
- Chrono Studio alone owns Create Chrono Group. Scene Studio and a Chrono Group content page own Create Scene.
- Selecting a Chrono Group or Scene opens a read-first content page; only its Edit action opens a populated editor.
- One dashboard-content truth supplies Build, View, and Present. Studio navigation state must never duplicate authored content.
- Chrono Group and Scene drafts stay independent from layout and selected-chart drafts.
- Failed saves retain the live draft and distinguish storage unavailable, session-only persistence, and quota exhaustion.
- A running View or Present temporal session remains an immutable snapshot.
- Native checkbox/radio visuals are 18–22 CSS pixels; their label or row retains the larger activation target.
- Do not redesign View Chrono playback, Present/Audience, Dashboard Look, or the canonical renderer beyond renamed fields and terminology required by this plan.

---

### Task 1: Rename the persisted Chrono Group domain end to end

**Files:**
- Rename: `src/charting/time/timeSyncModel.js` → `src/charting/time/chronoGroupModel.js`
- Rename: `src/charting/time/migrateTemporalConfig.js` → `src/charting/time/normalizeTemporalConfig.js`
- Rename: `src/components/chart-authoring/TimeSyncSettingsField.jsx` → `src/components/chart-authoring/ChronoMembershipSettingsField.jsx`
- Rename: `src/components/time/chronoGroupDraft.js` → `src/components/time/chronoGroupDraft.js`
- Rename: `src/components/time/ChronoGroupStudio.jsx` → `src/components/time/ChronoGroupEditor.jsx`
- Rename: `tests/timeSyncModelV3.test.js` → `tests/chronoGroupModelV3.test.js`
- Rename: `tests/chronoGroupStudio.test.js` → `tests/chronoGroupEditor.test.js`
- Rename: `tests/chronoGroupAuthoringAuthority.test.js` → `tests/chronoGroupAuthoringAuthority.test.js`
- Rename: `tests/buildChronoGroupAccess.test.js` → `tests/buildChronoGroupAccess.test.js`
- Rename: `tests/temporalSchemaMigration.test.js` → `tests/chronoSchemaNormalization.test.js`
- Create: `tests/chronoTerminology.test.js`
- Modify: `public/config/dashboard.json`
- Modify: `public/portable-dashboard-data.js`
- Modify: `public/integration/quorum-chart-catalogue.json`
- Modify: `src/App.jsx`
- Modify: `src/charting/config/dashboardBundleV3.js`
- Modify: `src/charting/config/dashboardConfigStructure.js`
- Modify: `src/charting/forms/chartMapping.js`
- Modify: `src/charting/forms/formModel.js`
- Modify: `src/charting/forms/wizardDraft.js`
- Modify: `src/charting/runtime/authoredChartRuntimeArtifact.js`
- Modify: `src/charting/time/applyTimeContext.js`
- Modify: `src/charting/time/dashboardTemporalConfig.js`
- Modify: `src/charting/time/playbackReducer.js`
- Modify: `src/charting/time/sceneSchema.js`
- Modify: `src/charting/time/temporalNeedsAttention.js`
- Modify: `src/charting/time/temporalSchema.js`
- Modify: `src/components/build/buildDirtyState.js`
- Modify: `src/components/build/BuildInspector.jsx`
- Modify: `src/components/build/buildSelectionModel.js`
- Modify: `src/components/build/BuildStructureRail.jsx`
- Modify: `src/components/build/buildTreeInteraction.js`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/components/build/panelEditingModel.js`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/playback/ChronoController.jsx`
- Modify: `src/components/playback/PlaybackControls.jsx`
- Modify: `src/components/playback/PlaybackPageActions.jsx`
- Modify: `src/components/playback/PlaybackProvider.jsx`
- Modify: `src/components/presentation/AudienceDisplay.jsx`
- Modify: `src/components/presentation/PresentWorkspace.jsx`
- Modify: `src/lib/loadDashboard.js`
- Modify: `src/lib/presentationProtocol.js`
- Modify: `src/lib/quorumCatalogue.js`
- Modify: `tests/applicationRecovery.test.js`
- Modify: `tests/audienceDisplay.test.js`
- Modify: `tests/buildAuthoringExitProtection.test.js`
- Modify: `tests/buildDirtyState.test.js`
- Modify: `tests/buildSelectionModel.test.js`
- Modify: `tests/buildStructureModel.test.js`
- Modify: `tests/buildStructureRail.test.js`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `tests/chartCompanionHandoffs.test.js`
- Modify: `tests/chartCreateController.test.js`
- Modify: `tests/chartFormModelV3.test.js`
- Modify: `tests/chartMappingPreparation.test.js`
- Modify: `tests/chartPlacementCommit.test.js`
- Modify: `tests/chartSystemV3IntegrationFixes.test.js`
- Modify: `tests/collectionTemporalBoundary.test.js`
- Modify: `tests/dashboardAppV3.test.js`
- Modify: `tests/dashboardBundleV3.test.js`
- Modify: `tests/dashboardPackageCandidate.test.js`
- Modify: `tests/dashboardSemanticBoundary.test.js`
- Modify: `tests/datasetProfilesV3.test.js`
- Modify: `tests/defaultDashboardV3.test.js`
- Modify: `tests/e2e/dashboard-review-regressions.spec.js`
- Modify: `tests/e2e/modal-focus-harness.jsx`
- Modify: `tests/e2e/moderator-transactions.spec.js`
- Modify: `tests/e2e/time-collection.spec.js`
- Modify: `tests/e2e/v3-authoring-theme-propagation.spec.js`
- Modify: `tests/e2e/v3-build-structure-packages.spec.js`
- Modify: `tests/e2e/v3-shell-fidelity.spec.js`
- Modify: `tests/e2e/v3-style-fidelity.spec.js`
- Modify: `tests/e2e/v3-temporal-authoring.spec.js`
- Modify: `tests/modalFocusMarkupV3.test.js`
- Modify: `tests/panelEditingV3.test.js`
- Modify: `tests/playbackComponentsV3.test.js`
- Modify: `tests/presentWorkspace.test.js`
- Modify: `tests/quorumCatalogueV2.test.js`
- Modify: `tests/sceneSchema.test.js`
- Modify: `tests/structureScenarioAuthoring.test.js`
- Modify: `tests/temporalRuntimeIntegration.test.js`
- Modify: `tests/wizardDraftV3.test.js`

**Interfaces:**
- Consumes: canonical dashboard V3 configuration and existing temporal validation/runtime behavior.
- Produces: `dashboard.chronoGroups`, `scene.chronoGroupId`, `chartDraft.chronoGroupMemberships`, `validateChronoGroups(groups, charts)`, `createChronoGroupDraft(input)`, `reduceChronoGroupDraft(state, action)`, and `toSavedChronoGroup(state)`.

- [ ] **Step 1: Write the failing terminology and schema tests**

```js
// tests/chronoTerminology.test.js
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const retired = [
  ["time", "Sync", "Groups"].join(""),
  ["Time", "Group"].join(""),
  ["time", "Group"].join(""),
  ["Time", " Group"].join(""),
  ["time", " group"].join(""),
  ["Time", " groups"].join(""),
  ["time", "-group"].join(""),
  ["time", "_group"].join(""),
  ["TIME", "_GROUP"].join(""),
  ["time synchronization", " group"].join(""),
];

test("source, tests, scripts, and packaged config use only the Chrono Group domain", async () => {
  const findings = [];
  for (const root of ["src", "tests", "scripts", "public/config"]) {
    for (const file of await filesUnder(root)) {
      if (file.endsWith("chronoTerminology.test.js")) continue;
      const text = await readFile(file, "utf8");
      for (const token of retired) if (text.includes(token)) findings.push(`${file}: ${token}`);
      for (const token of retired) if (path.basename(file).includes(token)) findings.push(file);
    }
  }
  assert.deepEqual(findings, []);
});
```

Add schema assertions to `tests/dashboardBundleV3.test.js`, `tests/sceneSchema.test.js`, and `tests/wizardDraftV3.test.js` proving the serialized shapes contain `chronoGroups`, `chronoGroupId`, and `chronoGroupMemberships` respectively.

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```powershell
node --test tests/chronoTerminology.test.js tests/dashboardBundleV3.test.js tests/sceneSchema.test.js tests/wizardDraftV3.test.js tests/chronoSchemaNormalization.test.js
```

Expected: FAIL with retired source identifiers and missing canonical Chrono fields.

- [ ] **Step 3: Perform the direct schema and symbol rename**

Use these exact semantic mappings:

```js
// dashboard/config/runtime
dashboard.chronoGroups
validateChronoGroups(dashboard.chronoGroups, charts)

// Scene
scene.chronoGroupId

// chart creation/editing
draft.chronoGroupMemberships
action.type === "updateChronoGroupMemberships"

// Build selection and drafts
selection.kind === "chronoGroup"
selection.chronoGroupId
localDrafts.chronoGroup
```

Rename imports, exports, reducer actions, test descriptions, accessibility strings, validation messages, CSS hooks, fixtures, and filenames. Remove legacy group-shape normalization from `dashboardTemporalConfig.js`; canonical input must already provide `chronoGroups`. Retain timezone normalization only where the current canonical dashboard contract still requires it.

- [ ] **Step 4: Regenerate deterministic packaged outputs**

Run:

```powershell
node scripts/build-portable-data.mjs
node scripts/build-quorum-catalogue.mjs
```

Expected: generated outputs contain canonical Chrono fields and no retired domain tokens.

- [ ] **Step 5: Run the focused schema/runtime suite**

Run:

```powershell
node --test tests/chronoTerminology.test.js tests/chronoGroupModelV3.test.js tests/chronoGroupEditor.test.js tests/chronoGroupAuthoringAuthority.test.js tests/buildChronoGroupAccess.test.js tests/dashboardBundleV3.test.js tests/sceneSchema.test.js tests/wizardDraftV3.test.js tests/playbackComponentsV3.test.js tests/presentWorkspace.test.js tests/quorumCatalogueV2.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the direct domain rename**

Stage every renamed/new file listed in this task directly. For any path already dirty at the Task 1 baseline—including `src/App.jsx`, `BuildWorkspace.jsx`, generated public files, and overlapping tests—use `git add -p -- <exact-path>` and accept only Task 1 hunks. Then run:

```powershell
git diff --cached --check
git diff --cached --name-only
git commit -m "refactor(chrono): rename Chrono Group domain"
```

Expected staged-file inventory: only Task 1 paths; no pre-existing unrelated hunk.

---

### Task 2: Define shared studio navigation and read projections

**Files:**
- Rename: `src/components/time/timeContentState.js` → `src/components/time/chronoContentState.js`
- Rename: `tests/timeContentLibrary.test.js` → `tests/chronoContentState.test.js`
- Modify: `src/charting/time/temporalNeedsAttention.js`
- Test: `tests/chronoContentState.test.js`

**Interfaces:**
- Consumes: saved `chronoGroups`, saved Scenes, derived Needs-attention findings, and Build return context.
- Produces: `createChronoContentState(options)`, `reduceChronoContent(state, action)`, `selectChronoStudioCards(state)`, `selectSceneStudioSections(state)`, `selectChronoGroupContent(state, id)`, and `selectSceneContent(state, id)`.

- [ ] **Step 1: Write failing reducer and projection tests**

```js
test("studio selection opens read-first content before edit", () => {
  let state = createChronoContentState({ chronoGroups, scenes, studio: "chrono" });
  state = reduceChronoContent(state, { type: "OPEN_CONTENT", itemType: "chronoGroup", itemId: "chrono-a" });
  assert.equal(state.view, "content");
  assert.equal(state.selectedItemId, "chrono-a");

  state = reduceChronoContent(state, { type: "START_EDIT" });
  assert.equal(state.view, "editor");
  assert.deepEqual(state.operation, { intent: "edit", itemType: "chronoGroup", itemId: "chrono-a" });
});

test("Chrono Group content and Scene Studio are grouped by owning page", () => {
  const state = createChronoContentState({ chronoGroups, scenes, pages, studio: "scene" });
  assert.deepEqual(selectSceneStudioSections(state).map(({ pageId }) => pageId), ["biomedical", "operations"]);
  assert.deepEqual(selectChronoGroupContent(state, "chrono-a").pageSections[0].sceneIds, ["scene-a"]);
});
```

Also test Create Chrono Group ownership, both Create Scene origins, Edit return-to-content, content return-to-studio, query/filter/scroll/focus restoration, empty versus no-results, draft conflict, retry, and immutable running-session snapshots.

- [ ] **Step 2: Run the reducer test and verify failure**

Run:

```powershell
node --test tests/chronoContentState.test.js
```

Expected: FAIL because the read-first navigation and page projections do not exist.

- [ ] **Step 3: Implement the navigation state machine**

Use this state shape:

```js
{
  studio: "chrono" | "scene",
  view: "library" | "content" | "editor",
  selectedItemType: "chronoGroup" | "scene" | null,
  selectedItemId: string | null,
  query: string,
  statusFilter: "all" | "ready" | "needs-attention",
  returnContext: { studio, view, selectedItemId, pageId, scrollTop, focusId, query, statusFilter },
  operation: null | { intent: "create" | "edit" | "duplicate" | "remove" | "repair", itemType, itemId, parentChronoGroupId },
  conflict: null | { status, pendingOperation, options: ["save", "discard", "stay"] },
  runningSession,
  authoredContentChanged: boolean
}
```

Selectors must derive cards and page sections from saved objects each time; navigation stores IDs only.

- [ ] **Step 4: Run the reducer test and verify pass**

Run:

```powershell
node --test tests/chronoContentState.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit studio navigation state**

```powershell
git add -- src/components/time/chronoContentState.js src/charting/time/temporalNeedsAttention.js tests/chronoContentState.test.js
git commit -m "feat(chrono): add read-first studio navigation"
```

---

### Task 3: Build Chrono Studio and the Chrono Group content page

**Files:**
- Create: `src/components/time/ChronoStudio.jsx`
- Create: `src/components/time/ChronoGroupContent.jsx`
- Remove: `src/components/time/TimeContentLibrary.jsx`
- Create: `tests/chronoStudio.test.js`
- Modify: `src/styles/modes.css`
- Modify: `src/styles/dashboard-style-grammar.css`

**Interfaces:**
- Consumes: Task 2 state/selectors and dispatches content actions without mutating saved objects.
- Produces: `<ChronoStudio state onAction />` and `<ChronoGroupContent content onAction />`.

- [ ] **Step 1: Write failing component tests**

```js
test("Chrono Studio owns only Create Chrono Group and opens content on card activation", () => {
  const actions = [];
  const { html } = renderChronoStudio({ onAction: (action) => actions.push(action) });
  assert.match(html, />Create Chrono Group</);
  assert.doesNotMatch(html, />Create Scene</);
  assert.match(html, /Municipal outbreak playback/);
});

test("Chrono Group content is read-first and offers Edit plus Create Scene", () => {
  const html = renderChronoGroupContent(groupContentFixture());
  assert.match(html, />Edit</);
  assert.match(html, />Create Scene</);
  assert.match(html, /Biomedical/);
  assert.match(html, /member chart/i);
});
```

Assert buttons dispatch `OPEN_CONTENT`, `START_CREATE_CHRONO_GROUP`, `START_EDIT`, `START_CREATE_SCENE` with the selected `chronoGroupId`, and `RETURN_TO_STUDIO`.

- [ ] **Step 2: Run the component test and verify failure**

Run:

```powershell
node --test tests/chronoStudio.test.js
```

Expected: FAIL with missing components.

- [ ] **Step 3: Implement library and content components**

`ChronoStudio` renders search/status controls and one button-card per Chrono Group. Card activation dispatches `OPEN_CONTENT`; it never dispatches Edit. `ChronoGroupContent` renders summary metadata followed by page sections containing member charts and child Scenes. Its action row dispatches:

```js
onAction({ type: "START_EDIT", itemType: "chronoGroup", itemId: content.id });
onAction({ type: "START_CREATE_SCENE", parentChronoGroupId: content.id });
```

Use the accepted dashboard tokens and existing `time-content-card` visual grammar renamed to Chrono-specific classes.

- [ ] **Step 4: Run the component test and verify pass**

Run:

```powershell
node --test tests/chronoStudio.test.js tests/chronoContentState.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Chrono Studio**

```powershell
git add -- src/components/time/ChronoStudio.jsx src/components/time/ChronoGroupContent.jsx src/components/time/TimeContentLibrary.jsx src/styles/modes.css src/styles/dashboard-style-grammar.css tests/chronoStudio.test.js
git commit -m "feat(chrono): add Chrono Studio content flow"
```

---

### Task 4: Reconcile Create/Edit Chrono Group with Sketch 005

**Files:**
- Modify: `src/components/time/ChronoGroupEditor.jsx`
- Modify: `src/components/time/AvailabilityLedger.jsx`
- Modify: `src/components/time/chronoGroupDraft.js`
- Modify: `src/styles/modes.css`
- Test: `tests/chronoGroupEditor.test.js`

**Interfaces:**
- Consumes: saved or default Chrono Group, availability rows, Scene consequences, and atomic commit callback.
- Produces: stages `identity`, `charts`, `defaults`, `review`; saved `{ id, name, period, chartIds, defaultMatching, memberFallbacks, secondsPerFrame }`.

- [ ] **Step 1: Write failing stage and ledger tests**

```js
test("Chrono Group name is owned by the first stage", () => {
  assert.deepEqual(CHRONO_GROUP_STAGES, ["identity", "charts", "defaults", "review"]);
  const html = renderEditor(createChronoGroupDraft({ chronoGroup: fixture(), initialStage: "identity" }));
  assert.match(html, /Chrono Group name/);
  assert.match(html, /Start date/);
  assert.match(html, /End date/);
  assert.doesNotMatch(renderEditorForStage("review"), /Chrono Group name/);
});

test("ordinary editor actions do not expose Stay", () => {
  const html = renderEditor(createChronoGroupDraft({ chronoGroup: fixture() }));
  assert.match(html, />Save Chrono Group</);
  assert.match(html, />Discard</);
  assert.doesNotMatch(html, />Stay</);
});
```

Add ledger assertions for headings `Selected for this Chrono Group`, `Needs attention`, and `Available`, selected-row movement, zero-observation retention, page/section labels, observation counts, ticks, and non-colour status.

- [ ] **Step 2: Run the editor test and verify failure**

Run:

```powershell
node --test tests/chronoGroupEditor.test.js
```

Expected: FAIL because name is still in Review, the ledger is flat, and Stay is permanently visible.

- [ ] **Step 3: Implement the four accepted stages**

Rename `period` to `identity`; validate unique non-empty name and inclusive period together. Partition availability rows without duplicating records:

```js
const selected = rows.filter((row) => row.selected && !row.needsAttention);
const needsAttention = rows.filter((row) => row.needsAttention);
const available = rows.filter((row) => !row.selected);
```

Render the three regions in that order, keep stage body independently scrollable, and keep the action footer fixed. Remove the ordinary `STAY` action and reducer case; retain Stay only in Task 2's dirty-exit conflict reducer.

- [ ] **Step 4: Run the Chrono editor tests**

Run:

```powershell
node --test tests/chronoGroupEditor.test.js tests/chronoContentState.test.js tests/temporalNeedsAttention.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Sketch 005 reconciliation**

```powershell
git add -- src/components/time/ChronoGroupEditor.jsx src/components/time/AvailabilityLedger.jsx src/components/time/chronoGroupDraft.js src/styles/modes.css tests/chronoGroupEditor.test.js
git commit -m "feat(chrono): reconcile Chrono Group editor"
```

---

### Task 5: Build Scene Studio/content and reconcile Scene editing with Sketch 006

**Files:**
- Create: `src/components/time/SceneContent.jsx`
- Rename: `src/components/time/SceneStudio.jsx` → `src/components/time/SceneEditor.jsx`
- Create: `src/components/time/SceneStudio.jsx`
- Modify: `src/components/time/BalancedTwinCanvas.jsx`
- Modify: `src/components/time/sceneDraft.js`
- Modify: `src/styles/modes.css`
- Modify: `tests/sceneStudio.test.js`
- Create: `tests/sceneEditor.test.js`

**Interfaces:**
- Consumes: Task 2 Scene page sections and saved Scene detail; Scene editor consumes a populated or default Scene draft.
- Produces: `<SceneStudio state onAction />`, `<SceneContent content onAction />`, and `<SceneEditor draft charts onAction />` with stages `select` and `arrange`.

- [ ] **Step 1: Write failing Scene library/content tests**

```js
test("Scene Studio groups cards by page and owns Create Scene", () => {
  const html = renderSceneStudio(sceneStateFixture());
  assert.match(html, />Create Scene</);
  assert.match(html, />Biomedical</);
  assert.match(html, /Municipal response/);
});

test("Scene selection opens content whose Edit action owns mutation", () => {
  const html = renderSceneContent(sceneContentFixture());
  assert.match(html, /Parent Chrono Group/);
  assert.match(html, /Frame source/);
  assert.match(html, />Edit</);
  assert.doesNotMatch(html, />Save Scene</);
});
```

- [ ] **Step 2: Write failing Scene editor tests**

```js
test("Scene name is in Select and define", () => {
  const selectHtml = renderSceneEditor({ stage: "select" });
  assert.match(selectHtml, /Scene name/);
  assert.match(selectHtml, /Available from parent Chrono Group/);
  assert.doesNotMatch(renderSceneEditor({ stage: "arrange" }), /Scene name/);
});
```

Retain tests for separate Scene View/Present order, width, Present subset/layout, matching overrides, cadence, Audience date position, atomic save/retry/discard, and restoration.

- [ ] **Step 3: Run the Scene tests and verify failure**

Run:

```powershell
node --test tests/sceneStudio.test.js tests/sceneEditor.test.js
```

Expected: FAIL with missing read-first components and name/ledger differences.

- [ ] **Step 4: Implement Scene library, content, and populated editor**

`SceneStudio` renders page sections from `selectSceneStudioSections`. Scene card activation dispatches `OPEN_CONTENT`. `SceneContent` summarizes the complete saved contract and dispatches only Edit/back actions. `SceneEditor` stage one renders name first, then parent, page, period, and membership regions `Selected for this Scene`, `Needs attention`, and `Available from parent Chrono Group`; stage two retains the Balanced Twin Canvas and shared settings except name.

Both Create Scene origins call one defaulting function:

```js
createSceneDraft(initialScene({
  dashboard,
  activePageId,
  chronoGroupId: action.parentChronoGroupId ?? preferredChronoGroupId,
}), sceneValidationContext(dashboard));
```

- [ ] **Step 5: Run the Scene tests and verify pass**

Run:

```powershell
node --test tests/sceneStudio.test.js tests/sceneEditor.test.js tests/sceneSchema.test.js tests/chronoContentState.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Sketch 006 reconciliation**

```powershell
git add -- src/components/time/SceneStudio.jsx src/components/time/SceneContent.jsx src/components/time/SceneEditor.jsx src/components/time/BalancedTwinCanvas.jsx src/components/time/sceneDraft.js src/styles/modes.css tests/sceneStudio.test.js tests/sceneEditor.test.js
git commit -m "feat(scene): add read-first Scene Studio"
```

---

### Task 6: Integrate both studios into Build and remove legacy Layout controls

**Files:**
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles/modes.css`
- Modify: `tests/buildAuthoringLifecycle.test.js`
- Modify: `tests/buildAuthoringExitProtection.test.js`
- Modify: `tests/dashboardAppV3.test.js`
- Modify: `tests/e2e/v3-temporal-authoring.spec.js`

**Interfaces:**
- Consumes: Task 2 navigation state and Tasks 3–5 components/drafts.
- Produces: Build auxiliary surfaces `chrono-studio` and `scene-studio`, content/editor handoffs, atomic commits, and exact return-context restoration.

- [ ] **Step 1: Write failing Build markup and lifecycle tests**

```js
test("Build exposes two content-first studios and no legacy device Layout", () => {
  const source = readFileSync("src/components/build/BuildWorkspace.jsx", "utf8");
  assert.match(source, />Chrono Studio</);
  assert.match(source, />Scene Studio</);
  assert.doesNotMatch(source, />Time Content</);
  assert.doesNotMatch(source, /DeviceLayoutControl/);
});
```

Add lifecycle assertions that Chrono Studio opens its library, Scene Studio opens its library, card → content → Edit initializes the selected saved record, Create Scene from group content preselects that parent, closing editor returns to content, closing content returns to the originating studio/focus/scroll, and saved layout/panel identities do not change merely by opening authoring chrome.

- [ ] **Step 2: Run Build tests and verify failure**

Run:

```powershell
node --test tests/buildAuthoringLifecycle.test.js tests/buildAuthoringExitProtection.test.js tests/dashboardAppV3.test.js
```

Expected: FAIL because Build still exposes the old command split and device Layout fieldset.

- [ ] **Step 3: Rewire Build auxiliary ownership**

Replace auxiliary values with `chrono-studio` and `scene-studio`. BuildWorkspace owns one `chronoContentState`, one optional `chronoGroupDraft`, and one optional `sceneDraft`. It passes saved IDs to selectors and initializes editors only for create/edit actions. Remove the `DeviceLayoutControl` import, `build-device-layout-fieldset`, and the now-unused BuildWorkspace callback prop. Preserve existing uncommitted deferred-initialization and canonical-canvas separation changes in this file.

Route the crown's Chrono Groups button to the same Chrono Studio library. Do not route it to the legacy inspector selection.

- [ ] **Step 4: Run Build tests and verify pass**

Run:

```powershell
node --test tests/buildAuthoringLifecycle.test.js tests/buildAuthoringExitProtection.test.js tests/dashboardAppV3.test.js tests/chronoStudio.test.js tests/sceneStudio.test.js tests/sceneEditor.test.js
```

Expected: PASS.

- [ ] **Step 5: Run the temporal browser workflow**

Run:

```powershell
pnpm exec playwright test tests/e2e/v3-temporal-authoring.spec.js
```

Expected: PASS through both studio libraries, both content pages, populated edits, both Create Scene origins, save, and return restoration.

- [ ] **Step 6: Commit Build integration**

Stage the clean Task 6 files directly. Use partial staging for `src/App.jsx`, `src/components/DashboardRenderer.jsx`, `src/components/build/BuildWorkspace.jsx`, and any other file dirty at the Task 6 baseline. Then run:

```powershell
git diff --cached --check
git diff --cached --name-only
git commit -m "feat(build): integrate Chrono and Scene studios"
```

Expected staged-file inventory: only Task 6 paths and hunks.

---

### Task 7: Normalize every dashboard checkbox and radio control

**Files:**
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `src/styles/modes.css`
- Modify: `src/styles.css`
- Modify: `src/styles/presentation.css`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/chart-authoring/CollectionSettingsField.jsx`
- Modify: `src/components/chart-authoring/ReferenceLineField.jsx`
- Modify: `src/components/chart-authoring/StandardField.jsx`
- Modify: `src/components/chart-authoring/ChronoMembershipSettingsField.jsx`
- Modify: `src/components/time/AvailabilityLedger.jsx`
- Modify: `src/components/time/SceneEditor.jsx`
- Modify: `src/components/presentation/PresentWorkspace.jsx`
- Modify: `src/components/ColorField.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Create: `tests/authoringControlSizing.test.js`
- Create: `tests/e2e/v3-authoring-control-sizing.spec.js`

**Interfaces:**
- Consumes: dashboard style tokens and existing semantic labels.
- Produces: `.simex-choice-control` for the 20-pixel native input and `.simex-choice-target` for the minimum activation area.

- [ ] **Step 1: Write the failing CSS/markup contract test**

```js
test("choice inputs use native size and never inherit text-field geometry", () => {
  const css = readStyles();
  assert.match(css, /\.simex-choice-control\s*\{[^}]*inline-size:\s*20px/s);
  assert.match(css, /\.simex-choice-target\s*\{[^}]*min-block-size:\s*44px/s);
  assert.doesNotMatch(css, /\.chrono-group-editor input,\s*\.scene-editor input/);
});
```

Add a source scan covering every checkbox/radio input and requiring either `simex-choice-control` or an approved component wrapper that applies it.

- [ ] **Step 2: Run the sizing test and verify failure**

Run:

```powershell
node --test tests/authoringControlSizing.test.js
```

Expected: FAIL on the broad editor input rule and uncovered controls.

- [ ] **Step 3: Implement the shared choice-control grammar**

```css
.simex-choice-control {
  accent-color: var(--simex-selected);
  block-size: 20px;
  flex: 0 0 20px;
  inline-size: 20px;
  margin: 0;
  min-block-size: 20px;
  padding: 0;
}

.simex-choice-target {
  align-items: center;
  display: flex;
  gap: 10px;
  min-block-size: 44px;
}
```

Change every broad form selector to `input:not([type="checkbox"]):not([type="radio"])`. Apply the classes to Chrono availability, Scene membership, New Chart membership/configuration, Build accessibility, View toggles, and Present choices.

- [ ] **Step 4: Run focused component and sizing tests**

Run:

```powershell
node --test tests/authoringControlSizing.test.js tests/chartAuthoringComponentsV3.test.js tests/chronoGroupEditor.test.js tests/sceneEditor.test.js tests/playbackComponentsV3.test.js tests/presentWorkspace.test.js
```

Expected: PASS.

- [ ] **Step 5: Run the browser geometry check**

Run:

```powershell
pnpm exec playwright test tests/e2e/v3-authoring-control-sizing.spec.js
```

The test opens every surface with fixtures that reveal its choices and evaluates:

```js
for (const input of document.querySelectorAll('input[type="checkbox"],input[type="radio"]')) {
  const rect = input.getBoundingClientRect();
  expect(rect.width).toBeGreaterThanOrEqual(18);
  expect(rect.width).toBeLessThanOrEqual(22);
  expect(rect.height).toBeGreaterThanOrEqual(18);
  expect(rect.height).toBeLessThanOrEqual(22);
  expect(input.closest("label").getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
}
```

Expected: PASS in Chrono Group editor, Scene editor, New Chart, Build commands, View, and Present at desktop and tablet widths.

- [ ] **Step 6: Commit control normalization**

Stage only the Task 7 files listed above. Use partial staging for pre-existing dirty files, then run:

```powershell
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(ui): normalize dashboard choice controls"
```

---

### Task 8: Complete documentation rename and final integration evidence

**Files:**
- Modify: every `.md`, `.html`, and `.txt` file under `docs/` containing retired temporal-group terminology, including this plan and its governing specification if a mechanical scan still finds it
- Modify: `README.md` if the final scan finds retired terminology
- Create: `tests/docsChronoTerminology.test.js`
- Modify: `docs/audits/2026-08-22-v3-step-7-build-view/MASTER-REVIEW-SUBMISSION.md`

**Interfaces:**
- Consumes: completed implementation and canonical terminology from Tasks 1–7.
- Produces: zero retired domain occurrences in dashboard documentation and a concise Step 7 amendment recording test/browser evidence without declaring master acceptance.

- [ ] **Step 1: Write the failing documentation scan**

```js
test("documentation uses only Chrono Group terminology", async () => {
  const findings = await scanTextFiles(["README.md", "docs"], [
    ["Time", " Group"].join(""),
    ["time", " group"].join(""),
    ["Time", " groups"].join(""),
    ["time", "Sync", "Groups"].join(""),
    ["Time", "Group"].join(""),
    ["time", "Group"].join(""),
    ["time", "-group"].join(""),
    ["time", "_group"].join(""),
    ["TIME", "_GROUP"].join(""),
    ["time synchronization", " group"].join(""),
  ]);
  assert.deepEqual(findings, []);
});
```

- [ ] **Step 2: Run the documentation scan and verify failure**

Run:

```powershell
node --test tests/docsChronoTerminology.test.js
```

Expected: FAIL with the existing planning, specification, audit, manual, and data-system files.

- [ ] **Step 3: Apply the bounded documentation rename**

Replace domain terminology in all reported files. Update headings, prose, diagrams, tables, test names, and code examples. Preserve generic uses of `group` that do not represent a Chrono Group. Update this plan's renamed-file references to their canonical final paths so the documentation scan finishes at zero.

- [ ] **Step 4: Record implementation evidence**

Append to `MASTER-REVIEW-SUBMISSION.md`:

- commits and changed-file groups;
- focused Node and Playwright commands with pass counts;
- production-build result;
- browser checkpoints exercised for both libraries, both content pages, populated editors, both Create Scene origins, and checkbox geometry; and
- remaining limitations, explicitly leaving master acceptance to V3 Design review.

- [ ] **Step 5: Run deterministic terminology and focused integration tests**

Run:

```powershell
node --test tests/chronoTerminology.test.js tests/docsChronoTerminology.test.js tests/chronoContentState.test.js tests/chronoStudio.test.js tests/chronoGroupEditor.test.js tests/sceneStudio.test.js tests/sceneEditor.test.js tests/authoringControlSizing.test.js tests/buildAuthoringLifecycle.test.js
```

Expected: PASS.

- [ ] **Step 6: Run the affected browser checks and production build**

Run:

```powershell
pnpm exec playwright test tests/e2e/v3-temporal-authoring.spec.js tests/e2e/v3-authoring-control-sizing.spec.js
pnpm build
```

Expected: both browser specifications and the production build pass.

- [ ] **Step 7: Exercise the in-app browser checkpoint**

Open the live dashboard and manually exercise:

1. Build → Chrono Studio → Chrono Group content → Edit → return;
2. Chrono Group content → Create Scene → return;
3. Build → Scene Studio → Scene content → Edit → return;
4. Scene Studio → Create Scene;
5. New Chart with Chrono membership choices visible; and
6. desktop and tablet checkbox/radio sizing and activation targets.

Capture the resulting URL and any material limitation in the review amendment. Do not declare master acceptance.

- [ ] **Step 8: Commit documentation and evidence**

Stage `tests/docsChronoTerminology.test.js` directly. Use partial staging for every documentation file that was dirty before Task 8, and stage clean documentation files directly. Then run:

```powershell
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: complete Chrono Group terminology"
```

Expected staged-file inventory: the terminology-scan test, the scan-reported documentation files, and the Step 7 review amendment only.
