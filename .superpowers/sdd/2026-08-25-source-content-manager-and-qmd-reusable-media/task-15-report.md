# Task 15 Report — V5 Persistence, Package, and Offline Retention

**BASE:** `748b9d685025feb360c04d15a80b8460f8393a35`

**Rows:** SCM-S01/S02/S12/R07

**Journey:** G — V5 offline round trip and V4 migration retain library

## RED

The focused contract failed on the absent `contentPackageValidation.js`. The new tests first established the complete logical-library/package boundary: unused records, one deduped physical payload, corrupt/missing/animated rejection, managed-source/profile correspondence, lean GeoJSON facts, and QMD reference behavior.

## Implementation

- Added one cross-layer V5 content-package validator and invoked it at serialize, parse, and the pre-mutation import boundary.
- Retained every committed logical MediaItem/SourceEntry separately from physical asset payload authority. Used and unused MediaItems may share one SHA-addressed physical asset.
- Required every local asset-backed MediaItem to be ready and backed by a durable manifest plus matching decoded bytes, MIME, byte length, SHA, raster signature, and single-frame image.
- Required builder-managed sources to have SourceEntries, uploaded CSV to carry package text, dataset profiles to remain CSV-only, and uploaded GeoJSON to pass the canonical schema/four-gate validator with only lean facts/summary fields.
- Kept QMD references as `simex-media`; known local references must be ready, while unknown references remain inert for the existing bounded fallback.
- Ran validation before import preparation/replacement. Existing asset staging/rollback remains the sole transactional mutation owner.

## Deterministic evidence

- Focused content validation: **5/5**.
- Bundle plus content validation: **9/9**.
- Import transaction: **9/9**.
- Package export/candidate/portable boundary: **17/17**.
- Storage-boundary correction: **10/10**.
- Final exact nine-file candidate was **49/51** before that storage assertion correction. The corrected source/product boundary is **50/50 green**; overall remains **50/51** because PS-04 exercises the deliberately unrebuilt tracked generated client. It launched outside the sandbox but timed out on the missing accepted Biomedical surface. The established ruling forbids a Task 15 build/`dist` edit and assigns this residual to Task 17 pre-merge verification.

## Journey G

- Final named Chromium selection: **1/1 passing**, 1.5 m test / 1.6 m total.
- Build 1440×900: controlled V4 import became canonical V5, charts remained V3, used/unused logical media retained exact revisions and one shared hash/payload, CSV retained its profile, GeoJSON retained no profile, and QMD retained `simex-media`.
- Fresh V5 import rendered Image, QMD, and map.
- View 390×844 switched offline after live-source load and retained Image/QMD/map plus QMD fullscreen, with zero horizontal overflow and zero subsequent HTTP requests.
- No cold-start/service-worker portability is claimed; PS-04 remains explicit.

## Disposition

- **SCM-S01:** Passing for live-source V4→V5/package version fidelity.
- **SCM-S02:** Passing.
- **SCM-S12:** Passing for live-source package/offline retention.
- **SCM-R07:** Passing for the named bounded Journey G acceptance.
- **Residual:** PS-04 cold generated-client launch, deferred unchanged to Task 17 pre-merge.
- **Out of scope:** Task 16 health/repair/cleanup, build/`dist`, full and release suites.

## Scoped review correction

- **R15-01 resolved:** import now snapshots the exact prior asset records and dashboard after preparation, stages/preflights every payload, commits assets atomically before dashboard replacement, and compensates every transaction asset plus the prior dashboard on asset-commit, replacement, or rebase failure. The recovery-required `dashboardCommitted` partial-success contract and its institutionalizing test were removed.
- The live App uses the existing `browserAuthoredAssetStore.snapshot/restore` atomic adapter and serialized dashboard controller `getCurrent`/durable replacement boundary; no second store or persistence owner was added.
- Focused import RED was **7/10** and GREEN is **10/10**. Asset-commit and dashboard-replacement injections both leave the exact prior dashboard, exact prior asset Map, and no staged import records.
- **R15-02 resolved:** `imageAssetValidation.js` now exports `inspectRasterMetadata`, a thin public wrapper over its existing private structural PNG/JPEG/WebP parser. Package validation compares intrinsic MIME and dimensions with payload, manifest, and MediaItem metadata, while the existing animation inspector retains frame policy.
- Focused raster/package RED rejected neither a PNG self-declared as JPEG nor forged 8×6 metadata and lacked the exported inspector. GREEN is **20/20**, including the existing valid PNG/JPEG/WebP fixture loop plus both new rejection cases.
- Final corrected nine-file selection: **53/54**, with PS-04 the sole failure after successfully launching the copied package; no fail/skip/todo exists in the 53 live-source/product cases. No build or `dist` edit was made.
- Final corrected Journey G: **1/1 passing**, 1.3 m test / 1.4 m total, retaining the same bounded online-load→offline acceptance and zero subsequent HTTP requests.
