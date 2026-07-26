# SimEx Chart System V3 Core Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the selected subagent-driven development workflow and strict test-driven development.

**Goal:** Close the two remaining whole-plan review findings so the version-3 core has one truthful transformation dialect and never accepts an aggregation setting it will ignore.

**Architecture:** Keep the production transformation contract as the strict version-3 object already introduced by the final integration fix. Remove the test-only legacy array adapter, and make duplicate/aggregation relationship validation exactly match the arithmetic behavior implemented by `applyTransforms`.

**Tech Stack:** JavaScript ES modules, Node test runner, existing React/ECharts/Vite stack

## Global Constraints

- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp`.
- Remain on `codex/chart-wizard-revamp`, descended from `8abca5e`.
- Do not read or write a OneDrive path.
- Do not modify the existing `codex/showcase-home` worktree.
- Do not merge, push, deploy, or update Cloudflare.
- Keep version 3 as a clean break; do not add array transformation compatibility to production.
- Add no runtime dependency.
- Use TDD for behavior changes and commit the task atomically.

---

### Task 1: Make transformation fixtures and aggregation validation truthful

**Files:**

- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `tests/chartDataPipelineV3.test.js`
- Modify: `tests/chartSystemV3IntegrationFixes.test.js`
- Modify only if required for direct validation coverage: `tests/dashboardBundleV3.test.js`

**Interfaces:**

- Consumes the canonical transformation object:

```js
{
  filters: [],
  grouping: [],
  aggregation: null,
  duplicates: null,
  missingValues: "gap",
  temporalMatch: "exact",
}
```

- Enforces these duplicate/aggregation relationships:
  - `duplicates: null | "error" | "first" | "last"` requires `aggregation: null`.
  - Arithmetic shorthand `duplicates: "sum" | "mean" | "average" | "min" | "max" | "count"` may omit `aggregation`, or repeat the same method; a different method is invalid.
  - `duplicates: "aggregate"` requires an explicit supported arithmetic `aggregation` method.
  - No accepted combination may silently ignore `aggregation`.

- [ ] **Step 1: Write failing validation tests**

Add behavioral tests proving `duplicates: "first", aggregation: "sum"`, `duplicates: null, aggregation: "sum"`, and `duplicates: "error", aggregation: "count"` fail actionably. Retain passing coverage for shorthand-without-method, matching shorthand/method, and aggregate-with-method.

- [ ] **Step 2: Run the focused test and confirm RED**

```powershell
pnpm.cmd test -- tests/chartSystemV3IntegrationFixes.test.js tests/dashboardBundleV3.test.js
```

Expected: the newly invalid combinations are currently accepted.

- [ ] **Step 3: Implement the minimal relationship validator**

Update version-3 chart validation so every accepted aggregation value is used by the selected duplicate strategy. Keep existing arithmetic behavior unchanged.

- [ ] **Step 4: Remove the test-only legacy transformation adapter**

Rewrite `tests/chartDataPipelineV3.test.js` fixtures to author the canonical object directly. Delete the helper that translates array-shaped transformations. Preserve each test's original behavior and expected outcome; do not add production array compatibility.

- [ ] **Step 5: Run focused and vertical tests**

```powershell
pnpm.cmd test -- tests/chartDataPipelineV3.test.js tests/chartSystemV3IntegrationFixes.test.js tests/dashboardBundleV3.test.js
```

Expected: PASS with production arrays still rejected and all transformation behavior expressed through the object contract.

- [ ] **Step 6: Run the complete verification gate**

```powershell
pnpm.cmd test
pnpm.cmd build
pnpm.cmd test:e2e
git diff --check
git status --short
```

Expected: all unit/build/browser checks pass; only the intentional source/test files are changed before commit.

- [ ] **Step 7: Commit**

```powershell
git add src/charting/config/chartConfigV3.js tests/chartDataPipelineV3.test.js tests/chartSystemV3IntegrationFixes.test.js tests/dashboardBundleV3.test.js
git commit -m "fix: enforce canonical chart transformations"
```
