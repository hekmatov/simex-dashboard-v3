# SimEx Dashboard V3 Project Instructions

## Branch Policy

- Version 3 chart configuration is the only supported live dashboard contract.
- Do not add version 2 migration, compatibility, storage, authoring, rendering, import, or export paths.
- Develop isolated feature work in a dedicated Git worktree under the repository-managed `.worktrees` directory.
- Do not merge, push, deploy, or update a Cloudflare-published branch without explicit approval.

## Browser Edit Baseline Policy

Browser edit-mode changes are not visible to Git until they are exported as a version 3 bundle and promoted into source files.

Before making app updates or adding features, check whether the user has exported current browser edits as `packaged-dashboard-bundle.json` in the project root. If it exists, run:

```powershell
pnpm.cmd promote:bundle
```

Then rebuild dataset profiles, review, and commit the resulting changes to `public/config/dashboard.json`, `public/config/dataset-profiles.json`, and any files under `public/data/uploaded/` before applying new code changes. This makes the user's browser-edited dashboard the new baseline that future updates build on.

If no `packaged-dashboard-bundle.json` exists but the user says they changed the dashboard in the browser, ask them to export the package default first.

## Data Update Policy

To update dashboard data from the original `sree2712/pdpcDashApp` repository:

1. Pull the latest `pdpcDashApp` main branch.
2. Run `scripts/export_old_dashboard_data.py` from this repo using the old dashboard environment.
3. Commit the resulting generated CSV changes under `public/data/`.
4. Apply the data commit to other branches only when the user explicitly approves that propagation.

## Test and Verification Cadence

Performance and implementation progress take priority during active development.

- Do not run the complete unit, integration, E2E, visual-regression, or build-verification suites during implementation.
- During implementation, run only the smallest targeted check needed to diagnose a specific failure or validate the directly changed behavior.
- Never rerun a previously green test or build when no relevant production code has changed.
- Preserve the complete test suites, but defer running them until the user explicitly declares the branch ready for pre-merge verification.
- At the pre-merge stage, run each required full gate once: `pnpm.cmd test`, `pnpm.cmd build`, and `pnpm.cmd test:e2e -- --project=chromium`.
- If a pre-merge gate fails, use focused tests while correcting it. Rerun the complete affected gate only once after its focused failures are green.
- Do not expand test coverage or add process-oriented tests unless required by changed product behavior or explicitly requested by the user.
- This project policy overrides default TDD, E2E, and workflow verification cadence. A direct user instruction may override it for a specific task.
- The Vite large-bundle warning is expected and is not a failed build.

### Browser Workflow Driver and Playwright Discovery Policy

- Update a browser workflow driver and every affected consumer in the same implementation slice.
- Key driver navigation to stable workflow IDs such as `chart-type`, with explicit fresh and resumed entry points and actions for controls that move between stages. Ordinary journeys must use those stable primitives instead of transient visible labels or status suffixes.
- Keep one explicit interface-contract journey responsible for asserting the visible stage labels, order, and statuses.
- Before validating a changed browser workflow, search live E2E specs and harnesses for retired controls, labels, and entry-state assumptions, and correct every proven stale consumer.
- Validate workflow changes with the smallest focused representative journey. During development, use `pnpm.cmd test:e2e:dev`; the accepted final aggregate remains unrestricted.
- When a slice changes a canonical identity, schema/version normalization, callback or transaction owner, or browser-observable workflow contract, identify the directly affected production adapters, unit fixtures, shared browser drivers and consumers, integration catalogues or generated semantic artifacts, and documentation that assert that contract. Update only proven affected consumers in the same vertical-slice commit. Verify with the nearest owner check and the smallest representative consumer at each boundary that actually changed; do not run broad suites during ordinary development.
- For an explicit pre-merge or release gate, retain a machine-readable or durably saved ledger of exact test titles with pass, fail, or not-run disposition and root-cause cluster and correction-commit attribution. Console-only output is insufficient when truncation can erase failures. Continue failed and previously unrun selections without rerunning passing cases. This requirement applies to integration and pre-release gates, not every subtask, and should use native reporter output or one lightweight file rather than a new evidence system.
- Deferred follow-up: after this slice is review-clean, or in the next accepted chart-workflow slice, create the shared chart workflow driver from the `chart-authoring-v3` primitives. Do not mass-migrate consumers in an unrelated repair wave.
