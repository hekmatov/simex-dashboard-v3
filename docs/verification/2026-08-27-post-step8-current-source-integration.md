# Post-Step 8 Current-Source Integration — Master Review Handoff

## Scope and lineage

- Worktree: `post-step8-current-source-integration`
- Branch: `codex/post-step8-current-source-integration`
- Accepted starting commit: `965a69ed95f22651431ab2a2b766f0d9b2d6f18a`
- Integration commits:
  - `0f11fd4 feat(qmd): add basic source toolbar`
  - `52a4398 fix(recovery): identify stale dataset profiles`
  - `920ee57 feat(home): integrate beta landing and safe updates`

The worktree was verified as linked, on the required branch and clean before edits. The divergent `codex/cloudflare-homepage-update` and `refs/remotes/v3/main` implementations were not merged, rebased, cherry-picked, copied, or otherwise reused. Their code is not an implementation ancestor of these commits.

## Delivered behavior

- The portable-QMD editor provides font choice, bold, underline, italics, bullet lists, and simple table insertion. Underline is parsed and rendered as semantic `<u>` content.
- Profile/source identity mismatches now receive targeted recovery guidance while preserving the existing content-addressed recovery model.
- The current landing configuration presents the Cloudflare-beta orientation, View / Build / Present basics, seven builder FAQ answers, and a repository navigation link. The configuration contract has explicit FAQ and resource records.
- The landing browser suite uses a shared semantic entry driver and retains an exact visible-content contract journey.
- Service-worker registration checks for updates without forced takeover: no `skipWaiting`, no `clients.claim`, and first installation does not reload the first controlled page. HTML and service-worker responses revalidate; hashed assets remain content addressed.
- The Linux Cloudflare script scopes portable-data and compatibility environment variables to their actual consuming commands and still finalizes every static production build.
- Bounded correction commit `db1cd9c5e294fcac367fb774a1ee0463e5a95252` makes the landing inherit the existing dashboard semantic palette and style grammar. The Showcase block has no independent raw color literals; it uses the active surface, text, border, accent, focus, warning, font, radius, shadow, and transition tokens already emitted by the AppFrame theme flow.
- The live `CanonicalDashboardFooter` derives its feedback destination from `pages[*].landing.resources.repository.destination`: validated HTTP(S) repository URLs gain `/issues` (the accepted configuration renders `https://github.com/hekmatov/simex-dashboard-v3/issues`); invalid or absent repository values use the existing mailto fallback. The link remains `target="_blank" rel="noreferrer"`.

No cache/profile change was made beyond the targeted mismatch recovery. Worktree-ignore hygiene was already satisfied by the existing worktree-ignore policy, so no change was made.

## Verification evidence

Final task-level deterministic selection: **146 passing**

```text
node --test tests/qmdSourceToolbarCommands.test.js tests/portableQmdPolicy.test.js tests/staticContentEditor.test.js tests/applicationRecovery.test.js tests/landingPage.test.js tests/landingPageConfig.test.js tests/dashboardSemanticBoundary.test.js tests/serviceWorkerRegistration.test.js tests/cloudflareBuildContract.test.js tests/v3StaticBoundary.test.js
```

Production build and static verification: **passing**

```text
pnpm build:cloudflare
pnpm verify:v3-static
```

The finalized build retained frozen Quorum/schema hash `a876d0b83c9f40ea5179723b9c4304f8873b393142e4a790711af80ed363662c`, generated the content-addressed runtime precache manifest, and passed graph/cache assertions.

Representative real-use evidence: **passing**

```text
playwright test tests/e2e/static-free-text.spec.js --grep "Free-text toolbar authors portable font, emphasis, lists, and tables"
playwright test tests/e2e/showcase-home.spec.js
playwright test -c playwright.static.config.js tests/e2e/v3-static-offline.spec.js
```

Results: QMD action 1/1, homepage journeys 8/8, static offline journeys 2/2.

### Bounded correction verification

Focused deterministic selection: **13 passing**

```text
node --test tests/appThemeShell.test.js tests/landingThemeInheritance.test.js tests/canonicalDashboardFooter.test.js tests/landingPage.test.js tests/landingPageConfig.test.js tests/canonicalWorkspaceControls.test.js
```

The two added contracts were observed RED before production changes, then GREEN: the landing block initially lacked semantic canvas-token coverage and the real footer initially rendered mailto feedback rather than a repository Issues link.

Affected browser selection: **9 passing**

```text
playwright test tests/e2e/showcase-home.spec.js
```

The added journey switches Dashboard Look to Signal + Instrument / Calibrated Steel and dark appearance, then checks landing root, card, CTA, FAQ, heading, radius, typography, paint, and focus against the live semantic-token probes. It also asserts the exact Issues destination and link safety attributes.

Exact correction-source build and static verification: **passing** at `db1cd9c5e294fcac367fb774a1ee0463e5a95252`

```text
pnpm build:cloudflare
pnpm verify:v3-static
```

That finalized build retained the frozen Quorum/schema hash `a876d0b83c9f40ea5179723b9c4304f8873b393142e4a790711af80ed363662c` and content-addressed runtime cache `simex-dashboard-v3-9dbaeaf684882809`.

Dedicated runnable approval preview remains available at [http://127.0.0.1:4188/](http://127.0.0.1:4188/). Direct browser evidence: HTTP 200; title `SimEx Dashboard V3`; active metadata `evidence-ledger` / `evidence-ledger/brighter-vellum` / `light`; landing surface equaled its live `--simex-surface-canvas` probe (`rgb(247, 242, 232)`); and the visible footer link had the exact Issues href, `_blank` target, and `noreferrer` relationship.

## Scoped review verdict

PASS — reviewed the source/config/schema, generated catalogue digest, landing driver and journeys, service-worker registration behavior, Cloudflare headers, and build-script scoping. The bounded correction re-review covered the real footer owner, semantic-token-only Showcase block, direct browser contract, and exact-head build. `git diff --check` passed. The production build emitted only existing Vite bundle-size and non-module vendor-script warnings; it completed and finalized successfully.

## Review focus

- Confirm the beta landing wording and seven FAQ answers meet product expectations.
- Confirm the explicit `resources.repository.destination` shape correctly represents an outbound user navigation while keeping remote runtime dependency checks intact.
- Confirm waiting-update behavior remains the intended rollout policy on Cloudflare.

No merge, push, deploy, branch/worktree deletion, or Step 9 work has been performed.
