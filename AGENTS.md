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

## Feature Execution Adapter

During active SimEx feature work:

- Treat implementation as active development unless the user explicitly marks the branch pre-merge or release-ready.
- Before a required browser journey, validate its fixture, destination eligibility, source IDs, and required controls with the cheapest focused preflight.
- If the same long browser journey fails twice for fixture, locator, or setup reasons, isolate that boundary before another full journey run.
- Run the complete task-specific deterministic selection once on the final candidate. During corrections, use the nearest affected checks; rerun the complete selection only when relevant production behavior changed or prior evidence was invalidated.
- Default to one scoped review per coherent slice. Review corrections against the concrete finding and affected boundary unless the fix changes shared architecture, persistence, security, or cross-mode behavior.
- Keep implementation, directly corresponding tests, and fidelity evidence in the same coherent commit where practical. Separate closure-only commits require an explicit audit boundary.
- At an approximately 60-minute checkpoint, narrow to a coherent commit and defer unrelated polish or later-task behavior. Do not weaken acceptance criteria or commit broken work.
- Plans and handoffs must apply the inherited proportional workflow budget. Requiring a named skill does not by itself make all optional workflow ceremony mandatory.

## Rapid Visual Prototyping Mode

### Activation and Scope

Activate this mode when the user explicitly requests "rapid prototyping mode" or identifies dashboard issues for rapid visual correction.

Use it for presentation-layer issues whose correctness is primarily determined by visual inspection, including layout, spacing, sizing, typography, colors, icons, overflow, alignment, and responsive presentation.

Do not use it for data correctness, persistence, schemas, migrations, security, dependencies, deployment, or substantial changes to established product behavior or contracts.

All branch, browser-edit baseline, worktree, and deployment policies remain in force. Reuse one dedicated rapid-visual worktree throughout the review loop.

### Workflow

For each reported group of visual issues:

1. Skip TDD. Do not create or run unit, integration, E2E, snapshot, or visual-regression tests.
2. Rank the likely causes and perform only the cheapest check capable of confirming or rejecting the leading cause.
3. If confirmed, implement the smallest plausible fix immediately. If rejected, repeat with the next most likely cause.
4. Do not request confirmation before editing unless the proposed fix would materially change a design or behavioral contract, modify data or persistence, require a destructive action, or require authority not already granted.
5. Do not perform post-fix testing. If the development server or build process exposes a compilation or startup failure, correct it automatically and serve the dashboard again.
6. Ensure the updated dashboard is running and available for visual inspection. Prefer the existing development server and hot reload over a fresh production build unless a production build is specifically required.
7. Respond only when the updated dashboard is ready. Provide the inspection URL and a concise description of what changed. Do not narrate intermediate diagnosis or implementation steps unless blocked.

The normal outcome of every issue report is an updated, inspectable dashboard without intermediate questions or progress gates.

### Visual Review Loop

- `fixed`: Accept the current issue group as resolved.
- `retry`: Treat the current issue as unresolved, inspect the latest rendering, choose the next most likely cause, implement another fix, and serve the updated dashboard without additional prompting.
- A newly reported issue: Treat the preceding issue group as accepted unless the user explicitly says it remains unresolved.
- The mode remains active for subsequent visual issues until the user explicitly exits it or requests work outside its scope.

Human visual confirmation is the acceptance test. Automated verification remains deferred until the user declares the work ready for pre-merge verification.
