# V3 Step 9 Final Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the final cross-mode accessibility, keyboard, touch, responsive, screen-reader, and room-distance Audience acceptance gate for the authoritative V3 dashboard.

**Architecture:** Step 9 is an acceptance phase, not a new feature phase. It reuses the public workflow drivers and stable semantic identities left by Steps 6–8 and Canonical Home, fills only evidence gaps, and applies a narrowly owned correction only when a new acceptance check falsifies current behavior. Existing passing journeys remain authoritative and are not duplicated.

**Tech Stack:** React 19, Vite 6, JavaScript ES modules, Node test runner, Playwright Chromium, CSS semantic tokens, BroadcastChannel, production Cloudflare/static build.

**Spec:** `docs/superpowers/plans/2026-08-19-v3-dashboard-reconciliation-index.md` §10–12, with `docs/superpowers/specs/2026-08-28-canonical-home-surface-design.md` as the accepted pre-Step-9 amendment.

## Global Constraints

- Start from `content/cloudflare-beta` at `4032903b2b8a13060cc17157ed4b7a6482c191d8` on `codex/v3-step-9-final-acceptance`.
- Home, View, Build, and Present remain the accepted application mode hierarchy; Home content is application-owned and `dashboard.home.enabled` is the only saved Home package preference.
- View and Build retain the same canonical renderer, saved layout, stable identities, responsive rules, and `--simex-canonical-canvas-max-width`; exact View/Build rectangles are not required.
- At `390×844`, Build and Present remain mounted and state-preserving beneath the persistent notice; **Switch to View** remains the only recovery action.
- Audience remains passive, last-valid safe, and free of interactive descendants. Preserve the approved D2 disconnected and R2 reconnecting glyphs.
- Preserve authored matching, explicit camelCase-to-wire Audience mapping, sequence-gap rejection, one safety-gated playback timer, fallible teardown, ready-driven reconnect, frozen Quorum/schema hash `a876d0…`, content-addressed runtime precaching, and waiting service-worker generations.
- Do not add a private browser backdoor. All acceptance journeys use public controls, persisted package state, and the production presentation protocol.
- Essential product controls keep the accepted project minimum of `44×44` CSS pixels. Focus remains at least partially unobscured, and accepted focus treatments retain at least `3:1` contrast against their adjacent surface.
- At actual 200% page zoom, text and actions remain available; root horizontal overflow is forbidden. Deliberately wide tables/code may scroll only inside labelled, keyboard-reachable containers.
- Step 9 does not absorb known Step 6–8 defects or unrelated refactors. A newly observed defect receives one focused RED test, the smallest live-owner fix, affected reruns, and at most one bounded re-review wave.
- No merge, push, deploy, branch/worktree deletion, or Step 10 work occurs during this plan.

## Proportional Verification Budget

- **Nearest falsifiers:** focused Node files for stale harnesses; the new Step 9 Playwright spec for acceptance gaps; one exact representative browser journey before any selection.
- **Task-level gates:** each task's focused deterministic/browser command, with `--max-failures=1` during diagnosis.
- **Real-use evidence:** actual page-scale factor `2`, touch-capable context, role/name/ARIA state capture, all required viewports, and a current `1920×1080` Audience screenshot.
- **Final integration only:** complete Node suite, unrestricted Playwright suite, Cloudflare production build, runtime/static checks, exact-head preview, scoped review, and the single final human visual judgment.

---

### Task 1: Restore a trustworthy full-suite baseline

**Files:**
- Modify: `tests/fixtures/async-image-harness.jsx`
- Modify: `tests/fullscreenDisplay.test.js`
- Reference: `tests/helpers/contentLibraryFixtures.js`
- Reference: `tests/viewCrown.test.js`

**Interfaces:**
- Consumes: current static Image placement `{ kind: "staticImage", sourceVersion: 2, mediaId, alt, decorative, fit, crop, rotation }` and MediaItem `{ mediaId, revision, current, ... }`.
- Produces: an async Image harness that exercises current runtime ownership and a non-duplicated fullscreen test boundary.

**Verification budget:** nearest falsifier is the two failing test files; the final task gate is both files together. No browser/UAT evidence is required. The complete Node suite is reserved for Task 6.

- [ ] **Step 1: Confirm the focused RED boundary**

Run:

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --test-concurrency=1 tests\fullscreenDisplay.test.js tests\imageChartAsync.test.js
```

Expected: the obsolete View-owned **Compare charts** assertion fails, and the eight async Image tests fail because the fixture still emits `sourceVersion: 1` without a MediaItem.

- [ ] **Step 2: Upgrade only the async fixture ownership contract**

Replace the fixture's legacy source builder with current placement and MediaItem builders:

```js
function placement(mediaId, alt) {
  return {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId,
    alt,
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
}

function mediaItem(mediaId, assetId, storageState = "durable") {
  return {
    mediaId,
    revision: 1,
    current: { kind: "asset", assetId },
    displayName: mediaId,
    defaultDescription: "",
    origin: "uploaded",
    health: storageState === "durable" ? "ready" : "staged",
    dimensions: { width: 1, height: 1 },
    byteLength: 68,
    mediaType: "image/png",
  };
}
```

Pass `contentLibrary.mediaItems` through `renderContext`/`ChartPanel` using the actual current prop owner discovered in live code; keep every resolver/release assertion unchanged.

- [ ] **Step 3: Remove the superseded ownership duplicate**

Delete only `fullscreenDisplay.test.js`'s test named `View provides a visible Compare charts entry to the existing multi-select flow`. The current owner and exact one-button contract remain covered by `tests/viewCrown.test.js` (`AppFrame crown owns page location without a duplicate View-local row`). Do not add a weaker replacement.

- [ ] **Step 4: Run the focused GREEN gate**

Run the Step 1 command again.

Expected: `tests 14`, `fail 0` (adjust only if the current file's test count changed before execution; every named behavior must pass).

- [ ] **Step 5: Commit the harness correction**

```powershell
git add tests/fixtures/async-image-harness.jsx tests/fullscreenDisplay.test.js
git commit -m "test(step9): align final acceptance harnesses"
```

---

### Task 2: Add reusable final-acceptance measurement helpers

**Files:**
- Create: `tests/e2e/support/final-acceptance.js`
- Test through: `tests/e2e/v3-step9-final-acceptance.spec.js` (Task 3)

**Interfaces:**
- Produces: `WORKSPACE_VIEWPORTS`, `setActualPageZoom`, `expectNoViewportOverflow`, `expectMinimumTouchTargets`, `captureCheckpoint`, and `readFocusVisibility`.
- Consumes: Playwright `expect`, `Page`, `BrowserContext`, and `TestInfo` APIs only.

**Verification budget:** helper behavior is proven through the Task 3 browser spec rather than a second synthetic harness. Production builds and broad journeys remain Task 6.

- [ ] **Step 1: Implement the exact helper module**

```js
import { expect } from "@playwright/test";

export const WORKSPACE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 768, height: 1024 }),
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1200, height: 900 }),
  Object.freeze({ width: 1440, height: 900 }),
]);

export async function setActualPageZoom(page, context, scale = 2) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: scale });
  await expect.poll(() => page.evaluate(() => window.visualViewport?.scale)).toBe(scale);
  return async () => cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
}

export async function expectNoViewportOverflow(page, { vertical = false } = {}) {
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    vertical: document.documentElement.scrollHeight > window.innerHeight,
  }));
  expect(overflow.horizontal).toBe(false);
  if (vertical) {
    expect(overflow.vertical).toBe(false);
  }
}

export async function expectMinimumTouchTargets(locator, minimum = 44) {
  const undersized = await locator.evaluateAll((controls, threshold) => controls.map((control) => {
    const box = control.getBoundingClientRect();
    return {
      label: control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName,
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  }).filter(({ width, height }) => width < threshold || height < threshold), minimum);
  expect(undersized, JSON.stringify(undersized)).toEqual([]);
}

export async function captureCheckpoint(page, testInfo, name) {
  const path = testInfo.outputPath(name);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
  return path;
}

export async function readFocusVisibility(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      visible: bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth,
    };
  });
}
```

- [ ] **Step 2: Keep the module generic**

Do not import application source, mutate storage, or add test-only globals. Product-specific actions stay in the spec and existing workflow drivers.

---

### Task 3: Fill the 200% text, keyboard, touch, and screen-reader evidence gaps

**Files:**
- Create: `tests/e2e/v3-step9-final-acceptance.spec.js`
- Consume: `tests/e2e/support/final-acceptance.js`
- Consume: `tests/e2e/support/landingWorkflow.js`
- Consume: `tests/e2e/support/present-audience-workflow.js`
- Modify production only after a focused RED result identifies the exact live owner.

**Interfaces:**
- Consumes: public Home/View/Build/Present controls, canonical `data-*` identities, ARIA roles/states, and the real Scene/Presentation workflow.
- Produces: deterministic Step 9 accessibility and input-parity evidence without a private state backdoor.

**Verification budget:** nearest falsifier is this one spec with `--max-failures=1`. One exact test is run first, then the file. Existing modal, phone-state, interface-contract, Step 7, and Step 8 journeys remain the final task selection rather than being copied.

- [ ] **Step 1: Add actual 200% text reflow coverage**

Create a test that:

1. opens canonical Home at `1200×900`;
2. applies actual CDP page scale `2`;
3. focuses **Open the dashboard** and verifies a visible non-none outline;
4. enters View and Build through public controls;
5. opens **Dashboard map**, focuses its first tree item, and verifies the full focused control remains in the viewport;
6. confirms all relevant text/actions remain visible and the document has no root horizontal overflow; and
7. restores scale `1` in `finally`.

Use this assertion shape:

```js
const focus = await readFocusVisibility(target);
expect(focus.visible).toBe(true);
expect(focus.outlineStyle).not.toBe("none");
expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
```

- [ ] **Step 2: Add the keyboard and screen-reader semantics journey**

Drive Home → View → Build using `Tab`, arrow keys where the mode group requires them, `Enter`, and `Escape`. Assert:

- one `navigation`/group named **Dashboard mode** with the active mode exposed as pressed/current;
- the Dashboard map dialog/complementary landmark has a visible name;
- tree items expose `aria-expanded` and `aria-selected` truthfully;
- closing the surface restores focus to **Dashboard map**;
- live validation/status copy uses `status` or `alert` roles where consequential; and
- an `ariaSnapshot()` attachment contains Home, View, Build, and the focused authoring landmark names.

Attach the snapshot through `testInfo.attach("step9-screen-reader-journey.yml", { body: snapshot, contentType: "text/yaml" })`.

- [ ] **Step 3: Add one touch-capable real interaction**

Using `browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } })`, open the app, tap Build, verify the persistent phone notice, verify **Switch to View** is at least `44×44`, tap it, and assert View becomes active. Close the context in `finally`.

- [ ] **Step 4: Run the first representative journey**

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' exec playwright test tests/e2e/v3-step9-final-acceptance.spec.js --config tests/e2e/support/playwright-present.config.js --grep "200%" --max-failures=1
```

Expected: pass, or a focused product failure with the exact obscured/clipped owner.

- [ ] **Step 5: Run the complete new spec**

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' exec playwright test tests/e2e/v3-step9-final-acceptance.spec.js --config tests/e2e/support/playwright-present.config.js --max-failures=1
```

- [ ] **Step 6: Apply at most one bounded correction wave if RED**

For each real behavior failure, name the actual current component/CSS owner, add or retain the failing assertion, implement the smallest semantic-token/layout/focus fix, rerun the failed test, then rerun the spec. Do not change architecture or weaken thresholds.

- [ ] **Step 7: Commit the acceptance harness**

```powershell
git add tests/e2e/support/final-acceptance.js tests/e2e/v3-step9-final-acceptance.spec.js
git commit -m "test(step9): add final accessibility acceptance"
```

Include any directly required production fix and its assertion in the same coherent commit.

---

### Task 4: Complete cross-mode viewport acceptance without duplicating prior proof

**Files:**
- Modify: `tests/e2e/v3-step9-final-acceptance.spec.js`
- Reuse: `tests/e2e/v3-step7-fidelity.spec.js`
- Reuse: `tests/e2e/v3-shell-fidelity.spec.js`
- Reuse: `tests/e2e/v3-step8-fidelity.spec.js`

**Interfaces:**
- Consumes: `WORKSPACE_VIEWPORTS`, canonical Home/analytical identities, existing View/Build canvas proof, and existing Present/Audience viewport fan-out.
- Produces: the missing four-mode integration proof after Canonical Home.

**Verification budget:** add only the missing Home/cross-mode transition assertions. Existing View/Build geometry, phone state preservation, and Audience fan-out stay in their owner specs. The final task-level gate is the smallest four-spec selection.

- [ ] **Step 1: Add the missing Home viewport fan-out**

For each `WORKSPACE_VIEWPORTS` entry:

- open `/` and assert `.app-frame[data-dashboard-mode="home"]`;
- assert the landing main/hero/FAQ content is present, theme-token driven, and has no root horizontal overflow;
- at `390×844`, assert Home has no unsupported-mode notice;
- activate **Open the dashboard**, assert View and one canonical analytical canvas;
- switch to Build; at phone size assert the workspace remains mounted behind the notice, otherwise assert the canonical canvas IDs match View; and
- return to Home through the mode group without changing stored package content.

- [ ] **Step 2: Run the new viewport test first**

Use the Task 3 file command with `--grep "viewport" --max-failures=1`.

- [ ] **Step 3: Run the smallest complete cross-mode selection**

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' exec playwright test tests/e2e/v3-step9-final-acceptance.spec.js tests/e2e/v3-step7-fidelity.spec.js tests/e2e/v3-shell-fidelity.spec.js --config playwright.config.js --max-failures=1
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' exec playwright test tests/e2e/v3-step8-fidelity.spec.js --config tests/e2e/support/playwright-present.config.js --max-failures=1
```

- [ ] **Step 4: Commit only if Task 4 changed files after Task 3**

```powershell
git add tests/e2e/v3-step9-final-acceptance.spec.js
git commit -m "test(step9): cover canonical Home viewport transitions"
```

Fold this into Task 3 when implemented as one coherent file change; do not manufacture an empty or documentation-only boundary.

---

### Task 5: Capture current 1920×1080 Audience room-distance evidence

**Files:**
- Modify: `tests/e2e/v3-step9-final-acceptance.spec.js`
- Create at finalization: `docs/audits/2026-08-28-v3-step-9-final-acceptance/screenshots/audience-1920x1080-room-distance.png`
- Consume: `tests/e2e/support/present-audience-workflow.js`

**Interfaces:**
- Consumes: a real saved Scene, Present's public source selection, the real Audience popup/channel, and the accepted passive projection.
- Produces: exact current-head room-distance geometry plus one durable visual artifact.

**Verification budget:** nearest falsifier is the one Audience test under the presentation config. Existing lifecycle/reconnect/Ended tests are preserved and run in Task 6. Final human visual judgment occurs once from the exact candidate preview.

- [ ] **Step 1: Add the current-output room-distance test**

Use `createSavedPresentationScene`, `enterPresentWithScene`, and `openAudienceSession`; set the popup to `1920×1080`; assert:

- `.audience-display` is exactly viewport-sized with no overflow;
- there are no `button`, `nav`, `a`, or `[tabindex]` descendants;
- every saved Scene Present chart is rendered once;
- title/date/chart bounds are non-zero and contained;
- every rendered chart cell has non-zero bounds, stays within the Scene canvas, and remains large enough for its current saved composition to expose its title/primary visual without clipping; and
- the screenshot is captured with animations disabled.

Copy the generated screenshot to the durable audit path only after the test passes. Do not hand-edit the image.

- [ ] **Step 2: Run the exact Audience test**

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' exec playwright test tests/e2e/v3-step9-final-acceptance.spec.js --config tests/e2e/support/playwright-present.config.js --grep "room-distance" --max-failures=1
```

- [ ] **Step 3: If scale needs calibration, stay inside the accepted owner**

Only Audience typography/spacing tokens may change. Do not change Scene/Audience information structure, composition ownership, protocol, or layout modes. Preserve current theme inheritance and all Step 8 geometry assertions.

- [ ] **Step 4: Commit the evidence-bearing slice**

```powershell
git add tests/e2e/v3-step9-final-acceptance.spec.js docs/audits/2026-08-28-v3-step-9-final-acceptance/screenshots/audience-1920x1080-room-distance.png
git commit -m "test(step9): capture final Audience acceptance"
```

Fold into the existing Step 9 acceptance commit when no production correction is needed.

---

### Task 6: Run the final integration and release gates

**Files:**
- Read: every changed source/test file since `4032903`
- Create after all checks: `docs/audits/2026-08-28-v3-step-9-final-acceptance/FINAL-ACCEPTANCE.md`

**Interfaces:**
- Consumes: all still-valid Steps 6–8/Canonical Home evidence plus Tasks 1–5.
- Produces: one exact candidate hash, complete release evidence, scoped review verdict, and runnable approval build.

**Verification budget:** this is the only broad gate. Run changed representatives first, then complete Node/Playwright and production/static checks. Do not describe a partial selection as the complete gate.

- [ ] **Step 1: Search for retired workflow contracts before aggregate**

Search live-app specs/support for retired three-mode-only assumptions, legacy Home Page ownership, old Present control labels, V5 current-output assertions, and direct display-label navigation where semantic drivers exist. Classify intentional migration fixtures; correct only stale current-output/workflow hits.

- [ ] **Step 2: Run the complete Node suite serially**

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --test-concurrency=1
```

Expected: all tests pass. If environment setup makes later output non-diagnostic, isolate the shared boundary and rerun only failed and previously unrun selections.

- [ ] **Step 3: Run the unrestricted Playwright suite**

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' exec playwright test --config playwright.config.js
```

Run presentation-config-only specs separately when they require port `4185`; do not start two servers on the same port.

- [ ] **Step 4: Run production/static/runtime gates**

```powershell
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' build:cloudflare
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' verify:v3-static
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' check:v3-runtime-boundaries
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' icons:check
& 'C:\Users\hekma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' check:biomedical-derivatives
```

Confirm any biomedical generated changes are semantic before staging; restore only proven build side effects.

- [ ] **Step 5: Run one scoped final review**

Review `4032903..HEAD` for acceptance holes, weakened assertions, unstable fixtures, private backdoors, theme hard-coding, protocol drift, and scope expansion. Apply at most one bounded correction/re-review wave unless a concrete unresolved risk remains.

- [ ] **Step 6: Write the final acceptance record before the exact-head build**

Record:

- exact branch/base/candidate hashes;
- complete commands and pass/fail counts;
- viewport, 200% text, keyboard, touch, and ARIA evidence;
- Audience screenshot path and measured geometry;
- known intentionally retained compatibility fixtures;
- review verdict; and
- explicit confirmation that no Step 10 work, merge, push, or deploy occurred.

- [ ] **Step 7: Commit the final record, then rebuild once**

```powershell
git add docs/audits/2026-08-28-v3-step-9-final-acceptance/FINAL-ACCEPTANCE.md
git commit -m "docs(step9): record final V3 acceptance"
```

After this commit, rerun `build:cloudflare` and `verify:v3-static` from the exact final head. Do not add another evidence-only commit afterward.

- [ ] **Step 8: Serve and verify the exact candidate**

Start the production preview on an unused port (default `4190`) with a hidden process. Verify the URL includes `?approval=<full-head>`, serves the current `dist`, and visibly exposes representative Home, View, Build, Present, and Audience outcomes. Keep it alive for the single final human visual acceptance checkpoint.

- [ ] **Step 9: Stop for final acceptance**

Present the exact candidate hash, branch, complete gate summary, review verdict, durable Audience screenshot, and live URL. This is the only Step 9 approval checkpoint. Do not merge, push, deploy, delete worktrees/branches, or begin Step 10 without explicit instruction.
