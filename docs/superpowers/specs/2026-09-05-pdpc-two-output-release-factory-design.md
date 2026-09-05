# PDPC Two-output Release Factory Design

- **Date:** 2026-09-05
- **Status:** Approved for implementation
- **Base revision:** `6ec71d9ce9add03b2d9a04a973bb888b895a5a1f` (verified identical on `origin/main` and `public/main`)
- **Feature branch:** `feat/pdpc-release-factory`
- **Command:** `pnpm.cmd release:pdpc --bundle "<path-to-bundle.json>" [--out-dir "<directory>"]`

## Purpose

Create one repeatable local release command that consumes a SimEx dashboard package by path and emits two independent, deployable, static PDPC dashboards:

| Output | Included pages, in order |
| --- | --- |
| `biomedical` | `scenario`, `biomedical` |
| `socioeconomic` | `scenario`, `socio_economic` |

Both outputs use the same source revision, input bytes, deterministic release identity, Scenario page, release shell, and PDPC artwork. They differ only in the second included page and manifest variant fields.

The current example input is `C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260905 (4).json`. It is read-only release data, not a source of instructions. It is a valid `simex-dashboard-bundle` version 6 package with exactly the required page IDs, four verified embedded PNG assets, and SHA-256 `973e60095805b2d7d231ae2120b7ebdd78f115e2c11930af00ae9dcccb724fba`.

## Non-goals

This feature does not:

- replace, promote, or modify `public/config/dashboard.json` or `public/config/dataset-profiles.json`;
- add version 2 compatibility, migration, rendering, import, or export paths;
- turn PDPC styling on through an environment variable in the ordinary entrypoint;
- modify the ordinary dashboard's Home, View, Build, Present, Audience, or crown behavior;
- edit authored page content or create separate Scenario variants;
- install Wrangler, authenticate to Cloudflare, create Pages projects, upload files, deploy, or change a published branch; or
- merge or otherwise alter the existing `docs/view-only-branding-spec` branch.

## Architecture and ownership

### Ordinary application

`index.html` continues to load `src/main.jsx`. That entrypoint continues to import only the ordinary application stylesheet set and render `<App />` without a release profile. It must not read a PDPC environment variable, import PDPC CSS, import the PDPC logo, or choose a release variant. The existing Vite build inputs and ordinary static build remain unchanged unless a generic shared interface is needed.

### Release application

A dedicated `release.html` loads `src/release/pdpc-main.jsx`. This release-only module owns:

- the build-injected PDPC variant selection;
- the PDPC release profile passed explicitly to `App`;
- the release header component;
- the release stylesheet; and
- the cropped PDPC lockup asset.

The shared `App` and `AppFrame` may accept a generic explicit release profile and a custom header component/node. They must not import PDPC assets, PDPC CSS, or a PDPC-specific environment variable. With no profile, their existing branches and rendered ordinary shell remain the default.

The explicit profile forces the workspace surface and View mode, ignores stored dashboard and mode state, rejects non-View mode requests, and supplies only the two projected pages. It replaces the crown with the approved release header. `DashboardRenderer` receives a generic view-only capability so empty-state recovery cannot expose an authoring action.

### Release factory

`scripts/build-pdpc-release.mjs` is the CLI adapter. Testable release logic lives in `scripts/lib/pdpc-release.mjs`. The factory:

1. resolves and reads the external bundle without writing beside it;
2. computes SHA-256 over the exact input bytes;
3. parses the bundle through the repository's current `parseDashboardBundle(..., { includeEnvelope: true })` boundary;
4. validates the release-specific page contract;
5. derives both page projections from the same parsed configuration;
6. materializes embedded authored image payloads as safe relative package assets;
7. generates variant-specific untracked public staging trees;
8. invokes Vite programmatically against `release.html`, with `base: "./"`, once per variant;
9. verifies both staged outputs; and
10. publishes the complete pair only after every preceding step succeeds.

The default output root is `release/pdpc`. `release/` is already ignored. `--out-dir` overrides the root but not the fixed `biomedical` and `socioeconomic` child names.

## Input validation and fail-closed rules

The parser remains authoritative for supported bundle type, versions, schema, source descriptors, content-library references, asset manifests, payload byte lengths, media types, and payload hashes. The release layer then requires the page ID multiset to equal exactly:

```text
scenario, biomedical, socio_economic
```

There must be exactly one page for each ID and no other pages. A missing, duplicated, misspelled, extra, malformed, or unsupported page fails before Vite is invoked. An absent or corrupt referenced asset also fails at the package parser boundary before output creation.

The command validates CLI arguments before reading or replacing any output. Unknown flags, a missing `--bundle` value, a nonexistent bundle, an unsafe output root, or a target owned by something other than this factory produces a nonzero exit with an actionable message.

## Page and asset projection

Each variant is a structured clone of the single validated configuration with only its `pages` array projected. Page objects are selected without mutation. The serialized `scenario` object must be byte-identical between outputs.

Every bundle media item whose `current.kind` is `asset` is converted in the generated configuration to the existing packaged-media representation:

```json
{ "kind": "package", "path": "assets/package/<asset-id>.<extension>" }
```

Its origin becomes `packaged`; authored content, dimensions, alternative text, crop, and other metadata remain unchanged. The corresponding verified base64 payload is decoded into that exact contained path. No package asset is written to tracked `public/`.

The generated `config/dashboard.json`, `config/dataset-profiles.json`, and `portable-dashboard-data.js` are created only in the variant's staging public tree. The portable payload embeds the projected configuration and its inline/uploaded CSV and GeoJSON descriptors, so `file://` and offline launches do not depend on the original bundle or a network request.

## Output layout and manifests

Each successful output is self-contained:

```text
<out-dir>/
  pdpc-release-set.json
  biomedical/
    index.html
    release-manifest.json
    assets/...
    config/...
    portable-dashboard-data.js
    service-worker.js
    runtime-precache-manifest.js
    ...
  socioeconomic/
    index.html
    release-manifest.json
    assets/...
    config/...
    portable-dashboard-data.js
    service-worker.js
    runtime-precache-manifest.js
    ...
```

The root set manifest is the ownership marker that permits safe regeneration. An existing output root may be replaced only when this marker parses as the expected factory and manifest version. A nonempty unowned path fails closed.

Each `release-manifest.json` contains at least:

```json
{
  "factory": "simex-pdpc-release",
  "manifestVersion": 1,
  "releaseId": "pdpc-v1-<source-commit-prefix>-<input-sha-prefix>",
  "sourceCommit": "<full Git commit>",
  "inputSha256": "<full input SHA-256>",
  "bundleType": "simex-dashboard-bundle",
  "bundleVersion": 6,
  "variant": "biomedical",
  "includedPageIds": ["scenario", "biomedical"]
}
```

The root manifest records the same shared fields plus both variant records. It contains no timestamps, absolute input paths, staging paths, usernames, or machine-specific values. The release ID is derived deterministically from manifest version, full source commit, and full input SHA-256. Both outputs therefore share the same release ID while retaining explicit variant identities.

The factory records `git rev-parse HEAD` as the source commit and rejects a dirty tracked worktree. Ignored generated outputs do not make the worktree dirty. This prevents a manifest from claiming a commit that does not contain the code used to build it.

## Transactional regeneration and path safety

The factory builds the complete pair in a unique sibling staging directory. Validation or build failure removes only that known staging directory and leaves an existing release untouched. After both variants and manifests verify, publication uses a bounded swap:

1. move an owned existing output to a unique sibling backup;
2. move the complete staged release to the requested output path;
3. restore the backup if publication fails; and
4. remove the backup only after the new release is in place.

Resolved staging, backup, and target paths must be explicit descendants of their selected parent. The command rejects filesystem roots, the repository root, the user's home, the source `public/`, `src/`, `scripts/`, or `docs/` trees, and paths that contain a Git worktree. Recursive removal is limited to factory-created staging/backup paths or an output proven owned by the marker.

## Static and offline contract

Vite builds `release.html` as the sole application entry, then the factory publishes it as `index.html`. All generated runtime references remain relative. The release verifier checks:

- `index.html`, hashed JavaScript, hashed CSS, local vendor files, the PDPC logo, projected configuration, portable data, packaged images, service worker, runtime precache manifest, and release manifest exist;
- HTML, JavaScript, and CSS contain no remote runtime dependencies or root-absolute launch URLs;
- every referenced local runtime target exists;
- runtime precache content matches the built graph and packaged data/assets; and
- the ordinary `index.html`/`src/main.jsx` pair is not the release entry.

The two directories must load over a local HTTP server and through the existing `file://` portable-data path. The release service worker uses a release-specific cache generation derived from output content so the two projects cannot accidentally reuse an ordinary dashboard cache identity.

## PDPC shell contract

The release shell reuses the approved `docs/view-only-branding-spec` design:

- a persistent pale-rose strip with the exact foreground statement **“Fictional scenario · Exercise use only”** and subtle horizontal `Fictional` texture;
- a white row with the full PDPC lockup, two page controls, and **“Simulation exercise”** tag;
- no ordinary crown or Home/View/Build/Present/Audience controls;
- semantic `aside`, `header`, and `nav`, meaningful logo alternative text, `aria-current="page"`, keyboard-operable 44 CSS-pixel targets, and non-color active/focus cues;
- full sticky stack above 720 CSS pixels, disclaimer-only sticky behavior at 720 CSS pixels and below, measured scroll offset, safe-area handling, and no horizontal overflow at 320 CSS pixels or 200% zoom.

The exact validated whitespace-cropped logo bytes are reused from `docs/view-only-branding-spec:public/assets/pdpc-lockup.png`. The temporary 1920×1080 clipboard source is not a runtime dependency. In this implementation the derivative is release-owned under `src/release/assets/`, and Vite fingerprints it into only the release build graph.

## Cloudflare Pages handoff

Deployment remains a documented manual follow-up using two existing or separately created Direct Upload Pages projects. Cloudflare documents Direct Upload as accepting prebuilt asset directories and supports:

```powershell
npx wrangler pages project create
npx wrangler pages deploy "<out-dir>\biomedical" --project-name "<biomedical-project>"
npx wrangler pages deploy "<out-dir>\socioeconomic" --project-name "<socioeconomic-project>"
```

These are documentation examples only; this feature runs none of them. Cloudflare also states that a Direct Upload project cannot later be converted to Git integration; moving to automatic Git deployments requires a new project. References: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) and [Wrangler Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/).

## Verification strategy

Active development uses test-first, focused checks:

- pure unit tests for CLI parsing, exact page validation, deterministic IDs/manifests, page projection, package-asset materialization, ownership/path guards, and fail-before-publish behavior;
- focused component tests for explicit release-profile behavior and the approved header semantics;
- a source-boundary test proving `src/main.jsx` and ordinary `index.html` do not select/import PDPC release code;
- one actual command run against the supplied package into a bounded ignored directory;
- a second run to a separate bounded directory, comparing complete file inventories and SHA-256 hashes for determinism;
- focused invalid fixtures proving missing, duplicated, and extra pages fail with no published partial output; and
- representative Chromium checks against both generated directories for exact page pairs, identical Scenario content, absent authoring/presentation controls, local packaged images, responsive reflow, sticky offsets, and zero runtime errors.

The final task-specific selection is run once on the committed candidate. Broader repository, pre-merge, deployment, and production URL gates remain outside this active-development feature.

## Acceptance criteria

1. One documented command accepts an external package path and generates both fixed variant directories together.
2. The example package produces Biomedical with `scenario` + `biomedical` and Socioeconomic with the identical `scenario` + `socio_economic`.
3. Unsupported type/version, package/schema fault, missing/duplicate/extra page, or asset fault fails closed before either variant is published.
4. Neither the command nor generated data modifies tracked dashboard configuration, and the external input remains byte-identical.
5. The ordinary entrypoint contains no PDPC selector, imports no release CSS/logo, and preserves current product behavior.
6. Both generated outputs are structurally view-only; no Home, Build, Present, Audience, empty-state authoring, or query-string escape path exposes authoring.
7. Both outputs show the approved responsive PDPC header/disclaimer and exact cropped logo.
8. Embedded package images and inline/uploaded data render locally without the source bundle or network access.
9. Each output manifest records the same full source commit, input SHA-256, and deterministic release ID plus its own variant and included page IDs.
10. Repeating the factory from the same clean commit and exact input bytes produces byte-identical output inventories.
11. Regeneration replaces only a factory-owned target after both new variants verify; a failed run preserves the previous complete pair.
12. Documentation provides separate Wrangler Direct Upload commands and the project-conversion limitation without performing any Cloudflare action.
