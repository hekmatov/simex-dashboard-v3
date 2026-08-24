# Static Content Security and Portability Decision Record

**Status:** Approved by V3 Design master at `e159db11593f784459e50f7707d93987fa996527`; Slice 1 contract and Slice 2 Free-text implementation status recorded below, later persistence/Image/Audience slices pending
**Applies to:** `portable-qmd-v1`, enhanced `image`, bundle v4, flash-drive package

## Slice 1 implementation status

- SP-18 is partial: the registry surface policy and identity/revision-only presentable index are implemented; Present protocol and separate Audience enforcement remain pending Slice 6.
- SP-21 is unchanged and pending: Slice 1 keeps contained chart configuration v3 and teaches Quorum to read the dashboard structure version authority; dashboard/bundle v4 migration remains owned by Slice 4.
- SP-22 engine policy is implemented: static drafts declare `application-session-only`, expose no storage key, and are held only in React/application-session state. Reload/storage inspection remains a later browser/persistence check.
- No security or portability decision is marked fully verified by this slice; browser-dependent evidence remains pending.

## Slice 2 Free-text implementation status

- SP-01 through SP-07 have passing engine evidence from the explicit policy/parser/renderer corpus and real-browser final-DOM tests. The production renderer uses bundled local `markdown-it@15.0.0`, `dompurify@3.4.14`, and `katex@0.18.4`; exact pins and licenses are recorded in `SLICE-2-EVIDENCE-STATUS.md`.
- SP-02 and SP-03 are enforced both before save and at the final DOM boundary. Raw HTML (including comments, declarations, and CDATA), thematic breaks, active content, iframe/media/widget/cell/extension syntax, and arbitrary fence options cannot finalize. The browser sanitizer test mounts no forbidden tag, authored style, foreign namespace, or resource URL; only renderer-marked KaTeX classes and a property/value allow-list of numeric-em geometry survive.
- SP-04 is implemented by `compilePortableQmd` and `FreeTextChartView`: one parser → renderer → sanitizer path obtains a `DocumentFragment`, enforces the 5,000-node budget on that actual fragment, and mounts only a clone of it with `replaceChildren`. There is no post-sanitize string/template rewriting path.
- SP-05 is passing at the engine/DOM layer for `https:`, `http:`, scoped fragments, protocol case/encoding/entity/whitespace/control bypasses, and external `target="_blank"` plus `rel="noopener noreferrer"`. The retained production journey does not claim exhaustive keyboard/pointer link activation.
- SP-07 renders restricted local math as HTML-only KaTeX with an accessible math label. The sanitizer preserves only renderer-marked structural classes and safe numeric-em geometry needed for superscripts, fractions, roots, and sums; authored styles, MathML, SVG, resources, and foreign content remain outside the allow-list. Citations and unsafe commands remain hard errors.
- SP-18 is now passing for the Free-text capability, trusted presentable index, Present catalogue, and production Present absence. Protocol injection and separate-Audience enforcement remain pending Slice 6, so SP-18 is still partial overall.
- SP-22 is verified in-session: the production journey inspects the stored saved QMD while an unsaved edit is dirty, after Discard, and after Save. Reload restoration remains pending Slice 4's dashboard/bundle v4 bridge, so reload-dependent SP-22 fidelity is not claimed.
- The production audit has no high or critical findings. It reports one pre-existing moderate ECharts advisory (`GHSA-fgmj-fm8m-jvvx`); none of the three Slice 2 dependencies is implicated.

## Decision table

| ID | Decision | Reason | Consequence / verification |
|---|---|---|---|
| SP-01 | QMD is parsed as a versioned portable Markdown profile, not executed by Quarto. | A dashboard must render offline without an external runtime or executable document semantics. | No Quarto/Pandoc process or network dependency in the runtime; fixtures distinguish formatting from execution syntax. |
| SP-02 | Raw HTML, scripts, event attributes, iframes, executable cells, extensions, filters, shortcodes, widgets, custom elements, and embedded media are hard validation errors. | These constructs introduce execution, remote-resource, parser, or portability boundaries that the static panel does not need. | Malicious/unsupported fixture corpus cannot save and produces no active DOM or resource request. |
| SP-03 | The text pipeline uses an AST allow-list plus a separate HTML-only DOM sanitizer. | Parser policy communicates author errors; the sanitizer is a second safety boundary against parser defects. | Unit tests inspect AST decisions and final DOM. The sanitizer forbids authored styles, resource elements, foreign namespaces, custom elements, and event attributes; renderer-marked KaTeX may retain only approved classes and numeric-em geometry properties. |
| SP-04 | Sanitized fragments are mounted without later string/template rewriting. | Post-sanitize mutation or re-parsing can invalidate sanitizer guarantees. | `compilePortableQmd` creates the fragment and enforces its actual DOM budget; `FreeTextChartView` mounts only `prepared.fragment.cloneNode(true)` through `replaceChildren`, with no intervening rewrite or reparse. |
| SP-05 | Text links allow `https:`, `http:`, and local fragments only. | This blocks script/data/file protocols and avoids implicit OS/app launches. | Protocol matrix test; external links receive separate-window and `noopener noreferrer` behavior. |
| SP-06 | QMD embedded images are rejected; images use the Image static panel. | One asset path gives consistent alt, persistence, quota, failure, export, and Audience behavior. | Parser fixture rejects media syntax; Add static content provides the Image path. |
| SP-07 | Math uses a bundled restricted renderer; citations are deferred in v1. | Math can remain deterministic and local with a restricted grammar. Citations require bibliography and cite-processing state that is not otherwise needed. | Offline HTML-only math renders superscript, fraction, root, and sum with accessible labels and non-flattened geometry; unsafe commands and citation syntax fail validation. |
| SP-08 | Uploaded image formats are single-frame PNG, JPEG, and WebP only; signature, decoded format, dimensions, and animation metadata are verified. APNG and animated WebP are explicitly rejected. | These are passive raster formats broadly suited to offline rendering only when decoded as one frame. User SVG can execute/load content; animation and less universal formats complicate deterministic presentation. | Spoofed extension/MIME, APNG, animated-WebP, corruption, dimensions, and frame-count fixtures fail; accepted files decode as exactly one frame within limits. |
| SP-09 | Local upload copies bytes into a dedicated authored-asset store; original paths are never retained. | Browser file paths are neither durable nor portable and may expose local information. | Reload and export/import journey works after the original file is unavailable. |
| SP-10 | Linked images allow `https:` only and are explicitly nonportable. | Some dashboards need references, but the product must not promise offline availability or silently fetch/embed content. | Export preflight lists every network dependency; offline failure is panel-scoped. |
| SP-11 | Relative paths are allowed only for validated dashboard-owned packaged assets. | Arbitrary relative traversal and `file:` access are unsafe and nonportable. | Path validator rejects absolute paths, traversal, encoded traversal, and device paths. |
| SP-12 | Crop is integer permille geometry after quarter-turn rotation. | Normalized metadata is resolution-independent, deterministic, and nondestructive. Quarter turns avoid interpolation and crop-axis ambiguity. | Property tests enforce bounds and rotate/crop round trips; original hash never changes. |
| SP-13 | Saved image transforms and transient viewer state are separate. | Author intent must persist, while exploratory zoom/pan must not alter the dashboard or surprise another surface. | Save/reload preserves crop/rotation/fit; closing/reopening viewer resets zoom/pan. |
| SP-14 | Non-decorative images require explicit alt; decorative is an explicit state. | Title fallback hides missing accessibility work and can produce incorrect descriptions. | Validator requires exactly one valid state; runtime renders authored alt or `alt=""`/excluded semantics. |
| SP-15 | Bundle v4 embeds referenced local image bytes with hash and size; linked URLs remain links. | This makes local uploads portable without changing the semantics or privacy of linked content. | Round-trip test verifies byte hashes and render; export refuses missing/corrupt referenced assets. |
| SP-16 | Import stages and validates the whole asset/reference graph before mutation. | Partial imports can leave quota-consuming or unrenderable state. | Invalid hash, MIME, dimensions, quota, or reference aborts with the prior dashboard intact. |
| SP-17 | Asset cleanup is reference-counted with staging/recovery grace. | Immediate deletion risks destroying bytes still needed by a saved panel, draft, undo, or interrupted transaction. | Cleanup test never removes referenced assets and reclaims an orphan after successful commit/grace. |
| SP-18 | Free text never crosses the Present protocol; Image is a direct non-temporal composition item. | The product requirement excludes text from Audience, and current Scenes are strictly temporal. | Present selector/protocol tests reject Free text and accept Image without Chrono/Scene membership or time mutation. |
| SP-19 | Audience receives asset identity/revision, not an object URL. | Object URLs are window-scoped and not durable across the separate Audience window. | Separate-window journey resolves local bytes independently and revokes its own URL. |
| SP-20 | A static-panel failure is isolated to its cell. | One missing asset or unsupported source must not blank View, fullscreen, or an Audience composition. | Browser task forces failure and proves sibling panels remain rendered and controllable. |
| SP-21 | Versioning is fixed at dashboard schema v4 and export bundle v4; chart config remains v3 unless an implementation-proven chart-shape change receives a separate accepted deviation. | Typed sources/assets change dashboard and bundle envelopes but do not currently require a different per-chart shape. | Migration/bundle tests assert the exact versions; the design spec Versions section, plan Preconditions/schema slice, and fidelity PS-02/PS-03 must change together. |
| SP-22 | User-approved: unsaved static-content authoring is application-session-only, matching chart creation. Asset staging persists only as a transaction/orphan journal and never reconstructs unsaved authoring fields. | Reload-persistent source/alt/transform drafts introduce privacy, expiry, migration, and stale-revision policy that the feature does not need. | Reload after an unsaved edit restores only the last saved panel/source pair; inspect IndexedDB/config to prove no unsaved source, alt, crop, rotation, or fit draft is recoverable. Cross-reference spec Source editing, matrix/ledger PS-01, plan shared/persistence slices, and master submission. |

## Resource and quota limits

| Resource | Limit | Failure behavior |
|---|---:|---|
| Free-text source | 100 KiB UTF-8 | Blocking validation; draft remains recoverable. |
| Sanitized fragment DOM descendants | 5,000 | Blocking complexity error before progression, final save, or mount; exact-limit content is preserved and one-over is rejected without partial rendering. |
| QMD nesting | 6 levels | Blocking validation at the source location. |
| Table | 100 rows × 20 columns | Blocking validation; no partial silent truncation. |
| Uploaded image | 12 MiB encoded | Reject before durable staging. |
| Image dimensions | 16,384 px per side, 50 MP total | Reject after safe metadata/decode probe. |
| Dashboard authored assets | 200 MiB; warning at 80% | Preflight before staging; distinguish product budget from browser quota. |

## Threat boundaries

Trusted inputs are production-owned parser/sanitizer policy, bundled renderer code, and generated package paths. Untrusted inputs are all authored QMD, imported bundles, uploaded bytes, URL/path strings, image metadata, and migrated legacy sources.

No authored input may create script, CSS, custom-element behavior, external subresources from text, arbitrary local-path access, or executable code. Remote Image URLs are the only intentional network subresource and are visible as such to the author before save/export.

## Recovery guarantees

- The last saved dashboard remains authoritative until a complete transaction succeeds.
- A failed text render preserves source for editing but does not mount unsafe fallback HTML.
- A failed uploaded-image replacement preserves the prior saved asset.
- Corrupt or missing bytes produce a typed error state and do not fall back to a remote URL.
- Quota failures keep the draft and identify whether the product budget or browser storage quota blocked the save.
- Import/export errors never advertise a complete portable bundle when a referenced local asset is absent.

## Source basis

Quarto documents that its Markdown is Pandoc-based and includes broader constructs such as raw HTML/iframes, callouts, citations, executable computation, and extensions. Those capabilities motivate an explicit subset rather than general QMD compatibility. DOMPurify’s project guidance motivates an HTML-only allow-list, removal of authored styles/resource-loading constructs, sink-specific sanitization, and avoidance of post-sanitize transformation. Renderer-marked KaTeX numeric-em geometry is admitted only inside that generated math subtree so approved HTML-only math remains structurally usable without admitting authored CSS. These sources inform the design; the production dependency and exact version remain an implementation-time approval decision.
