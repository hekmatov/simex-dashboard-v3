# Fable M0.2 browser GeoJSON authoring and replacement handoff

Date: 27 September 2026. Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`; base: `4274702fc1329645457f9d3ffa254c7e494697e9`. This closes the four assigned historical browser journeys from consolidated roadmap v1.15, section 5. The resulting commit is supplied in the direct steward report.

## Scope and result

The two affected browser specs now use current, valid source and destination data. Fresh chronological choropleth authoring resets into the existing M0 dashboard fixture, uploads a profiled two-date CSV whose municipality code joins the fixture's validated 2026 GeoJSON, selects geometry early, and reaches a ready preview and enabled review. The source-content journeys keep the shipped Biomedical page and its current `biomedical_section`. Manager-created CSV and GeoJSON sources supply the map joins; J/K seed a native V3 chronological choropleth instead of searching for a retired map chart or adding an unowned synthetic boundary descriptor. An idempotent target-page helper avoids opening Page actions by clicking the active tab, and the shared landing helper permits fixture dashboards that have no Home button.

| Historical exact title | Current disposition |
| --- | --- |
| `a fresh chronological choropleth reaches preview through the early GeoJSON selector` | Passed: validated geometry selection, actual profiled geography/value/time fields, one early selector, ready preview, titled review and enabled Create. |
| `Journey I — GeoJSON upload select preview dependency and blocked delete` | Passed: cancel leaves inventory unchanged; uploaded source survives reload; generated source is ineligible and packaged/managed sources are eligible; staged source survives suspend/resume then is discarded on reselection; managed map preview creates, remains used, blocks deletion, and respects desktop/tablet layout and map budget. |
| `Journey J — invalid GeoJSON replacement blocks and imports as new` | Passed: missing selected join property blocks replacement, cancellation preserves identity/render, import-as-new creates a separate managed source, and existing source, chart, temporal and render snapshots remain unchanged on desktop and tablet. |
| `Journey K — valid GeoJSON geometry change warns then confirms` | Passed: bounds, geometry-mix and reduced join-coverage warnings appear; cancellation preserves state; confirmation keeps source/chart/temporal ownership while the rendered map changes and persists on tablet reload. |

## Checks and review

Cheap preflight checked the fixture destination, CSV profile fields, complete GeoJSON property code, V3 chart validity, ready map joins and nonempty prepared marks. JavaScript syntax checks and `git diff --check` passed. The final task-specific command was:

`node node_modules/@playwright/test/cli.js test tests/e2e/dashboard-geography-authoring.spec.js tests/e2e/source-content-geojson.spec.js --project=chromium --grep "a fresh chronological choropleth|Journey I|Journey J|Journey K"`

Result: **4 passed, 0 failed** in 2.1 minutes. The local Playwright run used full filesystem access because sandboxed Vite/esbuild could not read the installed pnpm dependency tree; the normal Vite configuration and localhost test servers were retained. Earlier focused browser attempts isolated the inventory baseline, mismatched Journey I CSV columns, and active-page menu obstruction; no product assertion was weakened to accommodate them. One scoped read-only review found no actionable issue in the source identity/persistence checks, joins, render claims or shared landing guard.

## Limits

Only these four browser titles and directly affected test/helper files were verified. No production code, shipped authored content, public profile/catalogue, generated output, complete browser/repository suite, build, scenario work, main integration, push or deployment changed or ran. Previously accepted component and catalogue evidence remains prior evidence; the other M0.2 cases and M0.3–M0.6 stay with the planning steward.
