# Production Files Held Until Step 7 Acceptance

**Gate:** Do not edit these on `codex/static-content-panels-design`. Re-evaluate ownership and line-level changes from the final accepted Step 7 commit before implementation.

## Highest Step 7 overlap

- `src/App.jsx`
- `src/components/app-shell/DashboardCommandCrown.jsx`
- `src/components/dashboard/DashboardModeWorkspace.jsx`
- `src/components/dashboard/DashboardCanvas.jsx`
- `src/components/ChartPanel.jsx`
- `src/components/charts/ChartPanelActions.jsx`
- `src/components/charts/ChartView.jsx`
- `src/components/display/DisplayedChartGrid.jsx`
- `src/components/presentation/PresentWorkspace.jsx`
- `src/components/presentation/AudienceDisplay.jsx`
- `src/components/presentation/AudienceSnapshotMonitor.jsx`
- `src/components/presentation/usePresentationRuntime.js`
- `src/lib/presentationProtocol.js`
- `src/lib/presentationChannel.js`
- `src/styles/presentation.css`
- whichever shared dashboard/action/form CSS files the final Step 7 commit owns

## Chart authoring, registry, and runtime

- `src/components/chart-authoring/ChartWizardV3.jsx`
- `src/components/chart-authoring/ChartEditorV3.jsx`
- `src/components/chart-authoring/ChartEditorModal.jsx`
- `src/components/chart-authoring/DataSourceStep.jsx`
- `src/charting/forms/wizardDraft.js`
- `src/charting/forms/chartCatalogue.js`
- `src/charting/forms/schemaRevision.js`
- `src/charting/schemas/schemaTypes.js`
- `src/charting/schemas/chartSchemaRegistry.js`
- `src/charting/schemas/operationalSchemas.js`
- `src/charting/schemas/validateChartSchema.js`
- `src/charting/data/prepareOperationalData.js`
- `src/charting/rendering/operationalAdapter.js`
- `src/components/charts/ImageChartView.jsx`
- all generated registry/catalogue/revision artifacts

## Persistence, package, and temporal boundaries

- `src/charting/config/dashboardConfigStructure.js`
- `src/charting/config/dashboardBundleV3.js`
- `src/charting/config/dashboardSemanticReferences.js`
- `src/lib/dashboardCommitController.js`
- `src/lib/dashboardPackageCandidate.js`
- `src/lib/dashboardPackageImportTransaction.js`
- `src/lib/loadDashboard.js`
- `src/lib/browserStorage.js`
- `src/charting/time/sceneSchema.js` (regression guard expected; no design-driven weakening)
- `scripts/build-portable-data.mjs`
- `scripts/package-flashdrive.mjs`
- `package.json`
- the project lockfile
- flash-drive/package documentation generated or maintained from production behavior

## Production tests held with their owners

- `tests/wizardDraftV3.test.js`
- `tests/chartWizardProofDeck.test.js`
- `tests/chartViewV3.test.js`
- `tests/dashboardBundleV3.test.js`
- `tests/dashboardPackageCandidate.test.js`
- `tests/dashboardPackageImportTransaction.test.js`
- `tests/presentationProtocol.test.js`
- `tests/presentationChannel.test.js`
- `tests/audienceDisplay.test.js`
- `tests/sceneSchema.test.js`
- all new production unit/integration/e2e files described by the implementation plan

Disposable `.planning/sketches/021-*` through `024-*`, their README files, and the Step 7S design documents are the only intended changes in this discovery worktree.
