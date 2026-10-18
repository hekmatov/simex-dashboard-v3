# Fable M0.2: V4 migration and V6 offline round trip

Date: 27 September 2026. This closes the bounded Journey G package in section 5 of the authoritative roadmap. It checks browser import/export and retained content; it does not close the separate fresh-build, platform or release gates.

The Journey G seed now reconstructs the shipped image placement as a valid V4 `sourceVersion: 1` descriptor before removing the V6 content library. The V4 import migrates it back to a V6 logical media item with its packaged origin and revision, and creates managed source entries. The test asserts those results rather than merely checking that an import dialog appears.

The current Biomedical page has no historical municipal map template. The V6 fixture therefore authors a native V3 chronological choropleth with a profiled two-row CSV and matching two-feature GeoJSON. A direct `prepareChartData` preflight requires two joined marks. Browser-stored shipped GeoJSON is hydrated from the bundled configuration and its browser-only asset reference is removed only in the portable fixture. The CSV profile fingerprint and absence of a GeoJSON profile are asserted in storage, export and the fresh-context round trip.

Journey G passed with the existing media and offline checks intact: two logical media revisions share one hashed PNG asset; V6 export retains source, QMD and media identity; a separate browser context imports the saved package and renders image, QMD and map; mobile View and QMD fullscreen still render after the browser goes offline, without HTTP requests or root overflow.

| Check | Result |
| --- | --- |
| Direct V4 package-parser preflight using current shipped content | V6 migration, one media item, eleven source entries |
| Direct native map preflight | Ready, two joined marks, no diagnostics |
| Direct serializer boundary check | Browser GeoJSON asset reference rejected; inline geometry serializes to V6 after removal |
| `node --check tests/e2e/source-content-portability.spec.js` and `git diff --check` | Passed |
| Final exact Chromium Journey G selection | 1 passed (41 seconds) |

A scoped read-only review found no actionable issue in the migration seed, GeoJSON hydration, map/profile preflight or retained round-trip assertions. No product, migration, bundle or render code changed. Other M0.2 consumers, M0.3 fresh-checkout/platform/build verification, broader browser suites, main integration and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
