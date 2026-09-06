# PDPC Two-output Release Factory Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task by task. Execute inline in the dedicated worktree; do not delegate.

**Goal:** Add one deterministic command that validates an external SimEx bundle and emits two self-contained PDPC-branded, view-only static dashboards without activating PDPC code in the ordinary entrypoint.

**Architecture:** A testable Node release model validates and projects the package, a CLI stages and atomically publishes both Vite builds, and a dedicated `release.html` / `src/release/pdpc-main.jsx` graph owns PDPC activation, CSS, header, and artwork. Shared application components accept only generic explicit release-profile inputs; `src/main.jsx` remains the structural ordinary-product selector.

**Tech stack:** Node.js ESM, Vite 6, React 19, Node test runner, Playwright Chromium, SHA-256, filesystem staging/rename.

**Approved design:** `docs/superpowers/specs/2026-09-05-pdpc-two-output-release-factory-design.md`

**Verified base:** `6ec71d9ce9add03b2d9a04a973bb888b895a5a1f` on both `origin/main` and `public/main`.

---

## Task 1: Define the pure release contract

**Files:**

- Create: `tests/pdpcReleaseFactory.test.js`
- Create: `scripts/lib/pdpc-release.mjs`

### Step 1: Write failing contract tests

Add table-driven tests using literal expectations for:

- `parsePdpcReleaseArgs()` accepting `--bundle` plus optional `--out-dir`, rejecting missing values and unknown flags;
- `validatePdpcReleasePages()` accepting exactly one each of `scenario`, `biomedical`, and `socio_economic`, rejecting missing, duplicate, and extra pages;
- `projectPdpcVariants()` returning the literal pairs `scenario + biomedical` and `scenario + socio_economic`, with identical serialized Scenario objects and no input mutation;
- `createPdpcReleaseMetadata()` returning the same deterministic `releaseId`, full `sourceCommit`, and full `inputSha256` for both literal variant manifests;
- `materializePdpcPackageAssets()` validating payload-to-manifest correspondence, returning contained `assets/package/...` files, converting media origins to `packaged`, and leaving the input unchanged; and
- output ownership/path guards rejecting an unowned existing target and dangerous repository/root targets.

Use a minimal valid package fixture assembled in the test. Expected IDs, paths, hashes, and error fragments must be literals, not values computed by production helpers.

### Step 2: Verify RED

Run:

```powershell
pnpm.cmd exec node --test tests/pdpcReleaseFactory.test.js
```

Expected: FAIL because `scripts/lib/pdpc-release.mjs` does not exist.

### Step 3: Implement the minimal pure module

Export:

```js
export const PDPC_RELEASE_FACTORY = "simex-pdpc-release";
export const PDPC_RELEASE_MANIFEST_VERSION = 1;
export const PDPC_RELEASE_VARIANTS = Object.freeze({
  biomedical: Object.freeze({ pageIds: Object.freeze(["scenario", "biomedical"]) }),
  socioeconomic: Object.freeze({ pageIds: Object.freeze(["scenario", "socio_economic"]) }),
});

export function parsePdpcReleaseArgs(argv) {}
export function validatePdpcReleasePages(config) {}
export function projectPdpcVariants(config) {}
export function createPdpcReleaseMetadata(input) {}
export function materializePdpcPackageAssets(envelope) {}
export async function assertPdpcOutputTarget(options) {}
```

Use `structuredClone`, fixed variant order, lower-case SHA-256 validation, safe extension mapping (`image/png`, `image/jpeg`, `image/webp`), and existing `validateMediaItem()` semantics. The release ID format is:

```text
pdpc-v1-<first 12 source-commit characters>-<first 12 input-sha256 characters>
```

### Step 4: Verify GREEN

Run the same focused test. Expected: all Task 1 tests pass.

### Step 5: Refactor under green

Keep filesystem policy separate from projection logic, freeze public constants/results where practical, and ensure errors identify the violated contract without including bundle contents.

### Step 6: Commit the coherent slice

```powershell
git add -- tests/pdpcReleaseFactory.test.js scripts/lib/pdpc-release.mjs
git commit -m "feat: define PDPC release projection contract"
```

## Task 2: Add the structurally isolated release runtime

**Files:**

- Create: `tests/pdpcReleaseRuntime.test.js`
- Create: `tests/pdpcReleaseHeader.test.js`
- Create: `tests/fixtures/pdpc-release-header.html`
- Create: `tests/fixtures/pdpc-release-header.jsx`
- Create: `release.html`
- Create: `src/release/pdpc-main.jsx`
- Create: `src/release/pdpcReleaseProfile.js`
- Create: `src/release/PdpcReleaseHeader.jsx`
- Create: `src/release/pdpc-release.css`
- Create: `src/release/assets/pdpc-lockup.png`
- Modify: `src/App.jsx`
- Modify: `src/components/app-shell/AppFrame.jsx`
- Modify: `src/components/DashboardRenderer.jsx`

### Step 1: Write failing runtime/profile tests

In `tests/pdpcReleaseRuntime.test.js`, compile the actual modules with the existing Vite SSR test pattern and assert observable behavior:

- an explicit release profile normalizes any search entry to workspace/View;
- stored dashboard and stored mode readers are bypassed for a release profile;
- mode requests other than View return `{ ok: false, mode: "view" }`;
- the profile supplies exactly the injected variant's two page IDs; and
- the ordinary `App` call with no profile retains its existing mode/navigation path.

Add a source-boundary assertion that builds the ordinary Vite input and inspects its emitted graph: no module or CSS path under `src/release/` and no `pdpc-lockup` asset may be present. This tests built behavior rather than grepping source text.

### Step 2: Write failing semantic header tests

Render the real `PdpcReleaseHeader` fixture and assert:

- one `aside` named `Exercise disclaimer` containing the foreground statement once;
- one `nav` named `Dashboard pages` with the literal expected two controls;
- active-page `aria-current="page"`;
- logo alternative `Pandemic and Disaster Preparedness Center (PDPC)`;
- no Home, View, Build, Present, or Audience control; and
- page request callback receives only a rendered page ID.

### Step 3: Verify RED

Run:

```powershell
pnpm.cmd exec node --test tests/pdpcReleaseRuntime.test.js tests/pdpcReleaseHeader.test.js
```

Expected: FAIL because the release runtime and shared profile interface do not exist.

### Step 4: Implement the generic shared boundary

Adapt the proven behavior from `docs/view-only-branding-spec` without copying its `src/main.jsx` activation:

- `App({ releaseProfile = null })` passes an explicit profile into `AppContent`;
- release mode normalizes the dashboard entry, ignores browser-stored dashboard/mode state, stays in View, rejects other modes, and passes the profile's view-only flag;
- `App` creates a release header node from `releaseProfile.HeaderComponent` and passes the node to `AppFrame`;
- `AppFrame({ commandHeader = null, suppressCommandCrown = false })` renders the provided header or the unchanged ordinary crown;
- `DashboardRenderer({ viewOnly = false })` removes empty-section authoring recovery when true.

Do not import anything from `src/release/` in `src/main.jsx`, `src/App.jsx`, `AppFrame.jsx`, or `DashboardRenderer.jsx`.

### Step 5: Implement the release-only graph

`release.html` mirrors only the launch scaffolding needed by the release app and points to `%BASE_URL%src/release/pdpc-main.jsx`.

`pdpc-main.jsx` imports the ordinary shared styles plus `pdpc-release.css`, imports the release profile/header/logo graph, resolves the compile-time `__SIMEX_PDPC_VARIANT__`, and renders:

```jsx
<OperationStatusProvider>
  <App releaseProfile={createPdpcReleaseProfile(__SIMEX_PDPC_VARIANT__)} />
</OperationStatusProvider>
```

The profile imports and exposes `PdpcReleaseHeader` as `HeaderComponent`; the shared app does not know that component's implementation.

Reuse the exact binary from `docs/view-only-branding-spec:public/assets/pdpc-lockup.png` at `src/release/assets/pdpc-lockup.png`. Preserve the proven intrinsic dimensions `1394 × 834` and alternative text.

### Step 6: Apply the approved responsive shell

Port the accepted pale-rose disclaimer, white three-column/two-row responsive header, 44-pixel controls, semantic landmarks, measured `--simex-view-only-sticky-offset`, safe-area insets, 720-pixel breakpoint, 320-pixel reflow, and reduced-motion behavior into `src/release/pdpc-release.css`.

### Step 7: Verify GREEN

Run the Task 2 focused tests. Expected: all pass, including the ordinary built-graph isolation assertion.

### Step 8: Commit the coherent slice

```powershell
git add -- release.html src/App.jsx src/components/app-shell/AppFrame.jsx src/components/DashboardRenderer.jsx src/release tests/pdpcReleaseRuntime.test.js tests/pdpcReleaseHeader.test.js tests/fixtures/pdpc-release-header.html tests/fixtures/pdpc-release-header.jsx
git commit -m "feat: add isolated PDPC view-only runtime"
```

## Task 3: Build, verify, and atomically publish both static variants

**Files:**

- Create: `tests/pdpcReleaseBuild.test.js`
- Create: `scripts/build-pdpc-release.mjs`
- Create: `scripts/verify-pdpc-static-build.mjs`
- Modify: `scripts/lib/pdpc-release.mjs`
- Modify: `package.json`

### Step 1: Write failing build-orchestration tests

Use temporary directories and dependency injection only at the Vite/Git process boundary. Test real filesystem effects:

- validation happens before `buildVariant` is called;
- both fixed variants build in order from one parsed envelope;
- a second-variant build failure publishes neither a new target nor partial children and preserves an existing owned release;
- a successful run publishes both complete variant trees plus root/variant manifests;
- an existing unowned target is not replaced;
- regenerating an owned target swaps the pair together;
- generated configs have literal page pairs, identical serialized Scenario, converted package-media paths, and no asset payload envelope; and
- sorted manifests contain no timestamps or absolute paths.

### Step 2: Verify RED

Run:

```powershell
pnpm.cmd exec node --test tests/pdpcReleaseFactory.test.js tests/pdpcReleaseBuild.test.js
```

Expected: new orchestration tests fail because the builder/verifier do not exist.

### Step 3: Implement the CLI and builder

Add:

```json
"release:pdpc": "node scripts/build-pdpc-release.mjs"
```

The CLI must:

- resolve the repository root from `import.meta.url`;
- reject a dirty tracked tree using `git status --porcelain --untracked-files=no`;
- read the exact input bytes, hash them, and parse with `parseDashboardBundle(text, { includeEnvelope: true })`;
- use `git rev-parse HEAD` for `sourceCommit`;
- copy `public/` into per-variant staging public directories, then replace only staged config/profiles/portable-data files;
- decode verified asset payloads into `assets/package/`;
- call Vite programmatically with `release.html` as sole input, `publicDir` set to the staging public tree, `base: "./"`, per-variant `define.__SIMEX_PDPC_VARIANT__`, and a variant output directory;
- rename the built `release.html` to `index.html`;
- write stable JSON with recursively sorted object keys and a trailing newline;
- verify each output, write both manifests, verify the pair, then perform the ownership-guarded swap; and
- clean only its explicit staging/backup directories in `finally`.

The generated portable script assigns a deterministic sorted payload to `window.SIMEX_PORTABLE_DASHBOARD`; because the package sources are inline/uploaded, `sources` is `{}` and the descriptors themselves remain embedded.

### Step 4: Implement the release verifier

`verifyPdpcStaticBuild()` must inspect an output directory and enforce:

- expected local files and variant manifest;
- exactly the manifest's two page IDs in `config/dashboard.json`;
- all packaged-media paths are safe, relative, exist, and match asset manifest hashes;
- `index.html` launches the hashed release graph using relative URLs;
- no remote runtime URLs or root-absolute launch URLs occur in HTML/CSS/JS;
- no ordinary source entrypoint is emitted;
- every referenced local runtime asset exists; and
- a deterministic `runtime-precache-manifest.js` includes the release shell, configuration, portable data, packaged images, and transitive built graph.

Reuse focused URL-graph helpers from `verify-v3-static-build.mjs` where practical, but do not change the ordinary verifier contract.

### Step 5: Verify GREEN

Run the Task 1 + Task 3 selection. Expected: all pass.

### Step 6: Commit the coherent slice

```powershell
git add -- package.json scripts/build-pdpc-release.mjs scripts/verify-pdpc-static-build.mjs scripts/lib/pdpc-release.mjs tests/pdpcReleaseFactory.test.js tests/pdpcReleaseBuild.test.js
git commit -m "feat: build paired PDPC static releases"
```

## Task 4: Document release operation and Cloudflare handoff

**Files:**

- Create: `docs/pdpc-release-factory.md`

### Step 1: Write the operator guide

Document the exact local command and default output:

```powershell
pnpm.cmd release:pdpc --bundle "C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260905 (4).json"
```

Document custom output, validation failure behavior, safe regeneration/ownership marker, both manifests, deterministic identity, and the rule that updated bundles regenerate both variants together.

Include manual Cloudflare examples without running them:

```powershell
npx wrangler pages project create
npx wrangler pages deploy "release\pdpc\biomedical" --project-name "simex-pdpc-biomedical"
npx wrangler pages deploy "release\pdpc\socioeconomic" --project-name "simex-pdpc-socioeconomic"
```

Link only to Cloudflare's official [Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/) and [Wrangler Pages command reference](https://developers.cloudflare.com/workers/wrangler/commands/pages/). State that Direct Upload projects cannot later switch to Git integration; a new project is required.

### Step 2: Self-review and commit

Run `git diff --check`, inspect the rendered Markdown structure, and commit with the implementation if still uncommitted; otherwise use:

```powershell
git add -- docs/pdpc-release-factory.md
git commit -m "docs: explain PDPC release operation"
```

## Task 5: Execute the real release and browser journey

**Files:**

- Create: `tests/e2e/pdpc-release-output.spec.js`
- Create: `playwright.pdpc.config.js`
- Modify: `package.json`

### Step 1: Add the generated-output journey

Configure two local Vite preview servers over `release/pdpc/biomedical` and `release/pdpc/socioeconomic` on ports 4191 and 4192. The spec must assert against each real generated directory:

- the exact two page controls and active Scenario state;
- the exact disclaimer, logo alternative, and simulation tag;
- absence of Home/View/Build/Present/Audience controls and ordinary crown;
- excluded page and `?mode=build`, `?mode=present`, and audience-style query attempts stay on the view-only surface;
- each expected second page navigates and renders;
- package images load with natural dimensions;
- no page errors, failed local responses, remote requests, or console errors;
- at desktop width the full shell is sticky;
- at 720 and 320 CSS pixels only the disclaimer is sticky and the document has no horizontal overflow; and
- at 200% emulation/text scaling required controls remain visible.

Compare the two loaded Scenario page DOM content projections after stripping variant-manifest identity so Scenario content is equal.

### Step 2: Verify RED without generated outputs

Run the new spec with a deliberately empty temporary release root. Expected: it fails preflight because both generated directories are absent. This proves the journey exercises outputs rather than source mode.

### Step 3: Commit the browser contract

```powershell
git add -- package.json playwright.pdpc.config.js tests/e2e/pdpc-release-output.spec.js
git commit -m "test: cover generated PDPC release outputs"
```

### Step 4: Run the actual factory from the clean committed tree

Record the input hash before and after, and record the tracked config hashes before and after:

```powershell
Get-FileHash "C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260905 (4).json" -Algorithm SHA256
Get-FileHash public/config/dashboard.json,public/config/dataset-profiles.json -Algorithm SHA256
pnpm.cmd release:pdpc --bundle "C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260905 (4).json"
Get-FileHash "C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260905 (4).json" -Algorithm SHA256
Get-FileHash public/config/dashboard.json,public/config/dataset-profiles.json -Algorithm SHA256
```

Expected: command exits 0; input and tracked hashes are unchanged; both manifests report the same `sourceCommit`, `inputSha256`, and `releaseId`.

### Step 5: Run the focused generated-output browser journey

```powershell
pnpm.cmd test:e2e:pdpc
```

Expected: both variants pass in Chromium.

### Step 6: Verify deterministic rerun

Generate a second pair into `release/pdpc-determinism-check`, hash every relative file in sorted path order, and compare it with `release/pdpc`. Expected: identical path and SHA-256 inventories. Remove only the verified ignored determinism-check directory afterward.

### Step 7: Verify invalid input is nonpublishing

Create missing-page, duplicate-page, and extra-page fixtures under an explicit temporary directory. For each fixture, invoke the real command with a fresh bounded output path. Expected: nonzero exit and no output directory. Remove only that verified temporary directory.

## Task 6: Final task-specific verification and handoff

### Step 1: Run the complete task-specific deterministic selection once

```powershell
pnpm.cmd exec node --test tests/pdpcReleaseFactory.test.js tests/pdpcReleaseRuntime.test.js tests/pdpcReleaseHeader.test.js tests/pdpcReleaseBuild.test.js tests/appThemeShell.test.js tests/dashboardAppV3.test.js tests/dashboardBundleV3.test.js tests/v3StaticBoundary.test.js
pnpm.cmd test:e2e:pdpc
git diff --check 6ec71d9ce9add03b2d9a04a973bb888b895a5a1f..HEAD
git status --short --branch
```

This is the complete task-specific gate, not the complete repository/pre-merge suite. Run it once on the final committed candidate. If it exposes a defect, use systematic debugging and the smallest affected check, commit the correction, then rerun only the complete selection invalidated by that behavior change.

### Step 2: Inspect the release manifests and isolation boundary

Confirm manually from generated data and build metadata:

- both page pairs and identical serialized Scenario;
- matching source commit/input hash/release ID;
- ordinary `index.html` still points to `src/main.jsx`;
- ordinary build graph excludes `src/release/` and the PDPC lockup;
- `git diff -- public/config/dashboard.json public/config/dataset-profiles.json` is empty; and
- the worktree contains no tracked generated outputs.

### Step 3: Start inspection URLs

Start hidden local preview servers for the final Biomedical and Socioeconomic directories and report both URLs. Do not deploy them.

### Step 4: Finish the branch

Use `superpowers:verification-before-completion`, then `superpowers:finishing-a-development-branch`. Present exactly:

```text
Implementation complete. What would you like to do?

1. Merge back to main locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

Do not merge, push, deploy, or remove the worktree before the user chooses.
