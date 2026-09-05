# PDPC release factory

The PDPC release factory turns one validated SimEx dashboard package into two independent, view-only static sites:

| Directory | Included pages |
| --- | --- |
| `release/pdpc/biomedical` | Scenario and Biomedical |
| `release/pdpc/socioeconomic` | Scenario and Socio-economic |

Both sites are generated together from the same package bytes and Git revision. The Scenario page is selected from one parsed configuration and serialized identically into both outputs.

## Generate the example release

Run this command from the repository root on a clean tracked worktree:

```powershell
pnpm.cmd release:pdpc --bundle "C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260905 (4).json"
```

The default output root is `release/pdpc`. To use another location:

```powershell
pnpm.cmd release:pdpc --bundle "C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260905 (4).json" --out-dir "C:\Users\hekma\Documents\SimEx PDPC Release"
```

The command reads the external bundle in place. It does not copy it into the repository, modify it, or promote it over `public/config/dashboard.json`.

## Validation and regeneration

The command fails without publishing a partial pair when:

- the input is not a supported SimEx dashboard bundle;
- the bundle or one of its embedded assets fails schema, length, media-type, or SHA-256 validation;
- its page IDs are anything other than exactly one each of `scenario`, `biomedical`, and `socio_economic`;
- the tracked Git worktree is dirty; or
- the selected output path is dangerous or contains files not owned by this factory.

A successful output root contains `pdpc-release-set.json`. That file is the ownership marker that permits the next run to replace the pair. Regeneration builds and verifies both new sites in a sibling staging directory before swapping them into place. A failed regeneration leaves the prior complete release untouched.

For an updated dashboard package, rerun the same command with its new path. Always regenerate both outputs together; do not hand-edit, copy, or independently version one output.

## Release identity

The root `pdpc-release-set.json` and each site's `release-manifest.json` record:

- factory and manifest version;
- deterministic release ID;
- full source Git commit;
- SHA-256 of the exact input bytes;
- bundle type and version; and
- variant plus included page IDs.

The deterministic release ID has this form:

```text
pdpc-v1-<source-commit-prefix>-<input-sha256-prefix>
```

No timestamp, local input path, staging path, or machine identity is included. The Biomedical and Socioeconomic manifests must report the same release ID, source commit, and input SHA-256.

## Static and offline use

Each child directory is a complete static site. Its runtime, configuration, uploaded/inline data, embedded package images, PDPC lockup, service worker, and precache manifest use contained relative paths. Serve the directory as a website or open its `index.html` through the supported portable `file://` path.

Do not serve the shared `release/pdpc` parent as one site. The two child directories are separate deployment roots.

## Cloudflare Pages Direct Upload

The intended hosting architecture is two separate Cloudflare Pages Direct Upload projects. Project creation and deployment are manual release steps and are not performed by the factory.

If the projects do not yet exist, authenticate and create each one interactively:

```powershell
npx wrangler login
npx wrangler pages project create
```

Use these recommended project names when prompted:

- `simex-pdpc-biomedical`
- `simex-pdpc-socioeconomic`

After reviewing the generated release, upload the two prebuilt directories independently:

```powershell
npx wrangler pages deploy "release\pdpc\biomedical" --project-name "simex-pdpc-biomedical"
npx wrangler pages deploy "release\pdpc\socioeconomic" --project-name "simex-pdpc-socioeconomic"
```

Cloudflare's Direct Upload workflow accepts a prebuilt asset directory. Cloudflare also states that a project created for Direct Upload cannot later switch to Git integration; moving to automatic Git integration requires creating a new Pages project. See the official [Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/) and [Wrangler Pages command reference](https://developers.cloudflare.com/workers/wrangler/commands/pages/).

## Release checklist

Before any upload:

1. Run the factory once from the exact source commit intended for release.
2. Confirm both `release-manifest.json` files share the expected source commit, input SHA-256, and release ID.
3. Confirm Biomedical contains only Scenario and Biomedical.
4. Confirm Socioeconomic contains only Scenario and Socio-economic.
5. Inspect both local sites and confirm the PDPC disclaimer/header, page navigation, package images, and responsive layout.
6. Confirm there are no Home, View, Build, Present, or Audience controls.
7. Upload each child directory to its matching Direct Upload project only after explicit deployment approval.
