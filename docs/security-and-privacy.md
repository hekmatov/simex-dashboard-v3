# Security and privacy

This document describes the release candidate under development. Built-candidate browser observations, dependency assessment and human release decisions are still pending; this is not a security certification or an approval to publish.

SimEx is a static browser application. The selected HeV-A26 exercise is fictional. Do not place confidential or personal information in a publicly hosted exercise package. A participant output contains its packaged sources and assets: hiding a chart, choosing an earlier time, or closing a Storyline does not remove data from that package. Release only information participants are allowed to receive, including source rows, media and provenance companions.

## Data handling

| Action | Source-confirmed behavior | Release verification |
|---|---|---|
| Open a hosted dashboard | Downloads the application, configuration, datasets, maps, images and fonts from its host. Hosting infrastructure receives ordinary request metadata. | Record actual requests on the exact built candidate. Hosting-provider retention/settings are separate from application storage. |
| Import or author locally | Parses the selected file in the browser; stores committed configuration and preferences in localStorage, with source/media/runtime assets in IndexedDB. Drafts and recovery state can survive reopening. | Verify browser storage and cancellation on the final candidate. No claim of encrypted or automatically expiring storage. |
| Reopen offline | A service worker caches the application and required lazy runtime. Activation retires older SimEx caches. A single-file output embeds its runtime/assets and has no service-worker installation requirement. | Verify a warmed static output and first launch of each offline HTML; a first hosted visit requires a network connection. |
| Export a package | Creates a downloadable file. Exported data is accessible to anyone receiving that file. | Verify integrity/citation metadata and readable backups before clearing storage or upgrading. |
| Open Audience | Uses a same-origin BroadcastChannel for presentation state and captured frames. Images are transient and must not be written to diagnostic logs. | Check actual frame capture, teardown, reconnect and local storage/network behavior. |
| Use a companion-enabled host | Discovers `/companion/bootstrap`; when available, connects to a same-origin WebSocket and exchanges supported chart/display protocol messages. A normal static host can return404 and run standalone. | Record whether the release exercised this optional integration. Do not describe it as having no network communication. |
| Import remote references or follow links | Authored HTTP(S) dataset/media references can make requests to their hosts; external links navigate to those services. | Review package network dependencies before sharing. A self-contained factory release must demonstrate that required sources/assets are local. |

No analytics client was identified in the current source inventory. An absence of telemetry requests must be established by observing the exact built outputs; source inspection does not establish hosting-provider behavior. There is no new backend, account system or data-access control in this RC.

Browser storage belongs to the specific origin and browser profile. Clearing site data, private browsing, storage eviction, a new port/origin, or another device can lose access to local edits. Export a complete package and retain a compatible application before changing or clearing that environment. Do not clear unrelated origins to recover one exercise.

## Content and request controls

QMD rich-text paste passes through DOMPurify and the existing portable-content policy. V7 package import verifies its whole-package SHA256 before migration, then validates supported schemas, references, media constraints and asset SHA256 values before its commit transaction. The export identifies its application version. These checks do not authenticate an author or approve the exercise's meaning; import review and source provenance remain the preparer's responsibility.

Supported legacy packages and raw configuration imports have their respective validation paths. A raw configuration is not a complete packaged export and has no export-integrity metadata; export a native package for portable sharing and citation.

Static build finalization writes a global security block into `_headers`, preserving cache rules. Cloudflare Pages applies that file as response headers. Exact inline bootstrap scripts receive SHA256 authorizations; arbitrary inline scripts and eval are not enabled. Dynamic inline styles remain permitted for React, ECharts, the editor and capture. Images/media support local, embedded and authored remote references; connections retain supported remote-data and companion transports. **This CSP contains scripts; it is not a network-data firewall.** Same-origin frames remain available for the capture renderer's temporary document clone.

Local `vite preview` and the PDPC output-test server read the generated security block so browser verification tests the same policy. Development HMR does not establish production CSP acceptance. The factory's single-file HTML embeds a matching hash-based meta policy with network connections denied. That policy must be checked against actual offline launch, fonts, media and required interactions.

Hosting-only `_headers` and `_redirects` files are excluded from the PDPC runtime precache: Cloudflare consumes them rather than serving them as application assets. The files remain in deployment artifacts.

## Dependency assessment — 9 November 2026

The initial native registry audit reported23advisories, including1critical. Compatible updates select DOMPurify3.4.17, Markdown-it15.0.3 and Vite6.4.5, with fixed same-major build-tool dependencies. Direct HTML-paste sanitization and portable-Markdown policy checks pass38/38. This is bounded regression evidence, not a blanket security claim.

ECharts remains pinned to5.6.0 to preserve the accepted rendering engine. The versioned [pnpm patch](../patches/echarts@5.6.0.patch) backports [Apache's Lines-tooltip fix](https://github.com/apache/echarts/commit/1e39b00): names pass through escaped tooltip markup instead of becoming raw HTML. It covers the application ES-module implementation, package main and full distribution ES-module entry. Both the ES-module and package-main regressions first reproduced the raw-HTML result and then passed with malicious names and ordinary values. The application does not serve the package's standalone CDN/minified entry files; importing a different entry later requires reassessment.

The final native registry audit still exits nonzero with **one moderate ECharts version-range finding**, because it identifies the upstream package version rather than inspecting this backport. It reports no high or critical findings in the changed dependency tree. Preserve this finding and its tested remediation in final RC review; do not report a clean/zero-vulnerability audit. Native reports are retained under `.superpowers/dependency-audit*.json` for copying into the exact-candidate release evidence.

Relevant primary records: [ECharts advisory](https://github.com/advisories/GHSA-fgmj-fm8m-jvvx), [DOMPurify3.4.17](https://github.com/cure53/DOMPurify/releases/tag/3.4.17), and [the Vite6.4.5 advisory/fix boundary](https://github.com/vitejs/vite/security/advisories/GHSA-8g5g-mxqh-grgj). The CSP is additional containment and does not replace dependency remediation or sanitization.

The implementation follows [Cloudflare Pages header handling](https://developers.cloudflare.com/pages/configuration/headers/) and [the browser CSP model](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP). Dependency findings, supported-scope exceptions and observed release results must identify an exact candidate and date.

## Open release evidence

- Built standard, paired participant and offline network/storage recordings, including remote-reference behavior and absence/presence of telemetry.
- Browser CSP enforcement with real chart paint, fonts, rich text, media, capture and offline reopening; no silent blank surfaces.
- Final-candidate dependency disposition, retaining the native ECharts range finding and reviewed upstream backport; any exception still requires explicit acceptance with owner and rationale.
- Photographable source/as-of/static/fictional/uncertainty context and version across View, fullscreen, Storyline and Audience.
- Exact app/package/cache rollback, named support route and final content/scope decisions. PDPC name, logo, colors and notice wording were approved on 9 November 2026.

These items remain release gates until observed or explicitly adjusted by the human with their impact recorded in the RC checkpoint.
