# V3 Step 7S — Static Content Panels Design Specification

**Status:** Proposed for V3 Design master approval
**Design baseline:** committed Step 7 HEAD `e5419142e8b56b6c2dc56570a961048960a31027`
**Design branch:** `codex/static-content-panels-design`
**Scope:** discovery, specification, and disposable prototypes only
**Production implementation:** blocked until Step 7 is accepted

## Decision summary

Static content is a peer authoring concept, not a special case inside chart creation.

- Keep the existing six-stage **Add chart** workflow exactly unchanged.
- Add a separate four-stage **Add static content** workflow: Destination, Content type, Content, Preview & add.
- Add **Free text** as a new non-temporal static panel type.
- Enhance the existing `image` type in place; do not register a second image type.
- Free text is available in Build, ordinary View, and fullscreen only.
- Image is available in Build, View, fullscreen, and as an explicitly selected passive Present/Audience item.
- Neither static type joins Chrono groups or Scenes. An Audience image is a non-temporal composition item and never changes the active time context.
- A saved authoring crop/rotation/fit is durable. Viewer zoom/pan is transient and local to the current surface.

This boundary removes data-source and time exceptions from chart creation, keeps the Image renderer identity stable, and limits the Present/Audience integration to the one static type that needs it.

## Goals and non-goals

### Goals

1. Author portable formatted text without running Quarto or arbitrary code in the dashboard.
2. Create and edit image panels with durable, nondestructive presentation transforms.
3. Preserve one canonical saved rendering model across Build preview, View, fullscreen, and—only for Image—Audience.
4. Store uploaded images durably and include them in export/import and offline packages.
5. Make panel plus content-source changes atomic and recoverable.

### Non-goals

- Running Quarto, Pandoc, Jupyter, R, Python, JavaScript, Lua, or shell cells.
- Supporting arbitrary Quarto extensions, widgets, shortcodes, filters, themes, or document formats.
- Turning static panels into temporal Scene members.
- Presenting Free text in the Audience window.
- Editing original image bytes. Crop and rotation are metadata only.

## Authoring architecture

### Separate Add static content workflow

The dashboard Add menu exposes two commands: **Add chart** and **Add static content**. The chart command retains its exact six stages:

1. Destination
2. Chart type
3. Data source
4. Map and prepare data
5. Configure chart
6. Review and create

The static command has four stages:

1. **Destination** — dashboard placement only; no Chrono group or Scene destination.
2. **Content type** — Free text or the existing Image type.
3. **Content** — type-specific source and accessibility controls.
4. **Preview & add** — canonical production renderer, validation summary, and final atomic commit.

No seventh chart stage is introduced. CSV, role mapping, transformations, time, Chrono, and Scene controls never appear in the static workflow. Registry metadata routes `freeText` and the existing `image` type to `authoringWorkflow: "static"`; the Add chart catalogue filters them out without changing its six-stage state machine.

For Image, stage ownership is strict: stage 3 owns origin/upload state, alternative/decorative state, crop, rotation, fit, replacement, and Reset image. Stage 4 contains only the passive canonical saved-result preview, validation and portability summaries, and final atomic Add. It exposes no source, accessibility, crop, rotation, replacement, or reset authoring controls. Ordinary editing may reuse the stage-3 Content editor body but is never labelled stage 4.

### Ordinary editing

Build-mode panel actions open the matching static editor in the ordinary editing surface. The editor uses the same Content and Preview concepts as creation, without replaying Destination and Content type. Save is one atomic panel-plus-source transaction. Cancel restores the last saved panel and source. View mode has no authoring controls.

### Shared static-content contract

Static panels remain dashboard panels and continue to use the existing panel identity, placement, title, description, and presentation fields. Their content lives in typed source records referenced by `sourceId`; it is not represented as CSV rows.

Proposed source kinds:

```js
// dataSources[sourceId]
{
  kind: "staticText",
  sourceVersion: 1,
  qmd: "...",
  renderingPolicy: "portable-qmd-v1"
}

{
  kind: "staticImage",
  sourceVersion: 1,
  origin: { kind: "asset", assetId: "asset-..." }, // or { kind: "url", url: "https://..." }
  alt: "...",
  decorative: false,
  fit: "contain",
  crop: { x: 0, y: 0, width: 1000, height: 1000 },
  rotation: 0
}
```

`assets[assetId]` is a durable manifest entry containing media type, byte length, dimensions, SHA-256, and storage state. Browser bytes live in a dedicated authored-asset IndexedDB store. They must not use the existing derived runtime artifact store.

The runtime resolver turns a typed source into a render model. That model is rendered through the same canonical panel dispatch used by ordinary panels, fullscreen, and Audience. Build preview mounts that renderer rather than a separate approximation.

## Free text

### Meaning of “QMD-style”

QMD-style means a documented portable authoring syntax inspired by Quarto/Pandoc Markdown. It does not mean a Quarto runtime. Quarto itself supports much more—including raw HTML, executable computations, extensions, and external bibliography workflows—than an offline dashboard should accept. The dashboard therefore parses an explicit allow-listed profile named `portable-qmd-v1`.

### QMD feature table

| Feature | `portable-qmd-v1` decision | Authoring and rendering rule |
|---|---|---|
| Headings | Supported | Source levels 1–4. Relative hierarchy is preserved and shifted to fit the host panel so the page keeps one logical top-level heading. |
| Emphasis | Supported | Bold, italic, and strikethrough. No inline style attributes. |
| Lists | Supported | Ordered, unordered, and task-like visual markers; maximum six levels of nesting. Task markers are passive, not editable controls. |
| Links | Supported with restrictions | `https:`, `http:`, and same-panel `#fragment` only. External links show an external indicator, open separately, and use `noopener noreferrer`. All other protocols are rejected. |
| Tables | Supported | Pipe tables only, with an identifiable header row. Maximum 100 rows × 20 columns. A labelled internal horizontal scroller contains overflow. Raw HTML tables are rejected. |
| Blockquotes | Supported | Semantic `blockquote`; nesting follows the global depth limit. |
| Inline code | Supported | Escaped text in semantic `code`; never interpreted. |
| Fenced code | Supported as display only | Escaped, non-executable `pre > code`; optional language label only. Cell options and execution markers are validation errors. |
| Math | Supported with a restricted local renderer | Inline and display TeX through a bundled renderer. No remote assets, user macros, HTML commands, URL commands, or executable extensions. Accessible MathML/text is required. |
| Footnotes | Supported | Panel-local numbered notes with unique IDs, forward links, and backlinks. |
| Callouts | Supported | Fixed `note`, `tip`, `important`, `warning`, and `caution` types. Static and non-collapsible; no Bootstrap or extension dependency. |
| Citations | Not supported in v1 | `[@key]`, bibliography metadata, CSL, and cite processing produce a clear validation error. Authors may write a human-readable reference or safe link. |
| Embedded media | Not supported | QMD images, audio, video, object, embed, and iframe are rejected. Use the Image static panel for images. |
| Raw HTML | Rejected | Reported before save; never passed through as trusted markup. |
| Scripts and event handlers | Rejected | `script`, inline handlers, scriptable URLs, and template syntax are hard errors. |
| Iframes | Rejected | No exceptions or sandbox variants. |
| Executable cells | Rejected | Code fences are display-only; cell execution syntax and options are errors. |
| Extensions, filters, shortcodes | Rejected | No discovery, download, execution, or passthrough. |
| Widgets and HTML dependencies | Rejected | No custom elements, widget payloads, remote JavaScript, CSS, or dependency manifests. |

### Parsing and sanitization

The same versioned pipeline runs in live preview and saved production rendering:

1. Enforce UTF-8 source and resource limits: 100 KiB source, 5,000 rendered nodes, six nesting levels, and the table limits above.
2. Tokenize into an inert Markdown AST with raw HTML and executable constructs disabled.
3. Validate the AST against `portable-qmd-v1`; unsupported constructs are errors, not silently active fallbacks.
4. Render only allow-listed semantic HTML. Math is rendered by a bundled local dependency with unsafe commands disabled.
5. Apply a second DOM allow-list sanitizer configured for HTML-only output. Forbid `style`, `class` from source, `id` outside generated panel-scoped IDs, all event attributes, resource-loading elements, SVG, MathML input, custom elements, and unknown attributes.
6. Validate `href` protocols in both the AST and sanitizer hook. Insert a sanitized DOM fragment directly and perform no string or framework-template post-processing afterward.

Sanitization is a safety backstop, not the feature parser. Validation remains visible so an author knows why content was refused.

### Layout, responsiveness, and accessibility

- Prose wraps without causing dashboard-root horizontal scrolling.
- Long code and tables have their own keyboard-focusable horizontal scroll containers with accessible labels.
- Ordinary panels use an internal vertical content scroller when their allocated grid height is insufficient. Fullscreen uses the available viewport while preserving the same content model.
- Typography scales within bounded tokens; it does not continuously shrink to make all content fit.
- Heading levels are host-aware; table headers use `th`; lists, blockquotes, code, and footnotes remain semantic.
- Link purpose is visible, keyboard focus is not obscured, and external behavior is announced in accessible text.
- Callouts have a text label and icon is never the only signal. Informational callouts do not create noisy live regions.
- Math has an accessible representation. Validation and save status use a single polite status region.

### Source editing and recovery

- Content stage uses a labelled source editor and live canonical preview. At wide widths they are side-by-side; at narrow widths they become mutually exclusive Source/Preview tabs while preserving the draft, validation state, selected tab, and logical focus context.
- Parsing is debounced by 200 ms. The last valid preview remains visible with a clearly stale badge while the current source has an error.
- Errors include source location, rule, and recovery guidance. Warnings do not block save; errors do.
- Save revalidates the exact draft, then atomically commits panel and `staticText` source.
- Cancel with no changes closes immediately. Dirty Cancel offers **Keep editing** and **Discard**. Keep editing preserves the complete draft and returns focus to the author’s prior context. Discard restores the last saved panel/source pair.
- **User-approved draft lifetime: application-session-only.** Unsaved Free-text/Image source, alt, crop, rotation, and fit drafts do not survive reload, matching chart creation. Reload restores only the last saved panel/source pair. The Image asset staging journal may persist solely for transaction rollback and orphan cleanup and cannot reconstruct unsaved authoring fields.
- A failed save leaves the in-session draft and preview intact. A successful save clears transaction staging only after the dashboard transaction completes.

## Image

### Existing type identity and authoring entry

The operational registry key remains `image`. Existing dashboards continue to resolve to the same type. Registry metadata sends new creation to Add static content, and existing Image panels open the enhanced static image editor. There is no `staticImage` chart type duplicate.

### Origins

| Origin | Decision |
|---|---|
| Local upload | Recommended. Copy accepted bytes into the authored-asset store, fingerprint them, and include them in export/import. The original browser file path is never retained. |
| Packaged relative path | Allowed only for validated dashboard-owned paths already included in the portable package. Arbitrary OS paths and `file:` URLs are rejected. |
| URL | Optional linked mode, `https:` only. It is explicitly marked network-dependent and nonportable. Export preserves the URL but does not silently fetch or embed it. |

Existing safe relative-path images migrate without copying if their package asset is available. Existing `https:` images migrate as linked sources. Existing `blob:` URLs are non-durable and migrate to a recoverable “replacement required” state.

### File rules and quotas

- Local formats: PNG, JPEG, and WebP. Detect by file signature and verify the decoded type; do not trust extension or declared MIME alone.
- Every accepted raster must decode as exactly one frame. PNG, JPEG, and WebP are accepted only after signature, decoded format, dimensions, and animation metadata are verified. APNG and animated WebP are explicitly rejected even when their base format is otherwise accepted.
- User-uploaded SVG, GIF, AVIF, BMP, ICO, TIFF, PDF, APNG, animated WebP, and other animated images are unsupported in v1. SVG is unsupported because it is an active document format; animation is excluded for deterministic/passive presentation.
- Maximum encoded file size: 12 MiB.
- Maximum decoded dimensions: 16,384 px on either side and 50 megapixels total.
- Dashboard authored-asset budget: 200 MiB, with a warning at 80%. Browser quota errors remain a separate, explicitly reported condition.
- Deduplicate identical local assets by SHA-256 while preserving independent panel metadata.

### Alternative text and decorative images

- Non-decorative images require concise alternative text before save. Empty or whitespace-only alt is an error.
- **Decorative image** is an explicit mutually exclusive setting; it stores `decorative: true`, renders `alt=""`, and removes the image from the accessibility tree.
- Panel title and description are not silently substituted for missing alt text. Present selection uses the panel title, not alt text.
- Replacement retains alt text but marks it “Review after replacement.” Switching to decorative preserves the authored alt in the draft for undo, but does not expose it at runtime.

### Saved authoring transforms

Crop is nondestructive metadata over the original decoded image. Coordinates are integers in a normalized 0–1000 space:

```js
{ x, y, width, height }
```

The rectangle is expressed in the image’s coordinate system **after** the saved rotation is applied. Required invariants are `0 ≤ x,y < 1000`, `1 ≤ width,height ≤ 1000`, `x + width ≤ 1000`, and `y + height ≤ 1000`. Rotation is limited to quarter turns: `0`, `90`, `180`, or `270` degrees clockwise. This avoids interpolation ambiguity and makes crop migration deterministic.

Saved fit is `contain` or `cover`; distorted `fill` is removed from new authoring. The renderer applies saved rotation, then normalized crop, then fit. It never rewrites original bytes.

Crop interactions provide pointer drag/resize plus keyboard-accessible numeric/step controls and nudge buttons. Crop handles meet target-size requirements. Rotation has explicit left/right buttons. **Reset image** restores full crop, `0°`, and `contain`, but does not remove the asset or accessibility text.

Replacing an asset resets crop/rotation/fit by default because intrinsic geometry changes. The whole change remains undoable until Save. Delete removes the panel/source reference atomically; bytes are reclaimed only by safe reference-counted cleanup.

### Transient viewer zoom and pan

Viewer zoom/pan is not persisted in the image source and does not change crop:

- zoom 1×–3× in 0.25 increments;
- button, keyboard, Ctrl+wheel, and accessible reset controls;
- pan is available only above 1× and is clamped so the saved image cannot be lost completely off-canvas;
- each ordinary panel/fullscreen viewer owns its transient state and resets when that surface closes or the saved source changes;
- passive Audience disables viewer zoom, pan, and all controls.

The two reset actions are named distinctly: **Reset view** for transient zoom/pan and **Reset image** for the authoring transform draft.

### Failure and recovery states

- Loading shows a stable skeleton without changing the grid size.
- Missing, corrupt, hash-mismatched, unsupported, or network-unavailable assets render a bounded error state with the panel title and reason category. Raw URLs and local storage details are not exposed to Audience.
- Build offers Retry, Replace, and Edit. View/fullscreen offer Retry and a non-authoring explanation. Audience is passive: the failed image cell shows a neutral “Image unavailable” state while all other selected items remain visible.
- A failed replacement or save retains the previous saved asset. Draft object URLs are revoked on discard/close.

## Persistence, migration, and portability

### Versions

- **Chart config remains v3** unless implementation evidence proves an actual chart-shape change is required and a new master decision records it.
- **Dashboard schema becomes v4** for typed static sources plus the `assets` manifest.
- **Export bundle becomes v4** because it gains an asset payload envelope.
- Increment registry/catalogue revision for `freeText` and the `authoringWorkflow` capability. Generated registry/catalogue artifacts wait for Step 7 acceptance.

These three version decisions are binding across the implementation plan, fidelity rows PS-02/PS-03, and security decisions SP-15/SP-21; a slice may not change one without updating all cross-references and obtaining an accepted deviation.

### Migration

Migration is deterministic and idempotent:

1. Existing non-image charts are unchanged.
2. Existing `image` inline rows become `staticImage` source records while retaining the same panel/type ID.
3. `https:` remains a linked URL; safe relative paths remain package paths; `blob:` becomes replacement-required.
4. Existing `fit: fill` becomes `contain` with a migration warning; contain/cover remain unchanged.
5. Missing alt is not fabricated. The panel remains viewable with a migration warning, but must be corrected before a later authoring save.
6. Default crop is full frame, rotation `0`.

The importer validates references after migration and isolates invalid static panels rather than rejecting unrelated valid dashboard content. Any static panel carrying Chrono Group or Scene membership is rejected from that membership during creation/editing and rejected or isolated during import/migration; migration never fabricates temporal fields for static content.

### Browser storage and atomicity

Use a dedicated authored-asset IndexedDB database with asset bytes, hashes, status, and staged transaction IDs. The dashboard config owns the durable manifest/reference graph.

For create/edit/replace:

1. validate and stage new bytes;
2. prepare the complete next panel, source, and manifest in memory;
3. persist staged bytes;
4. commit the dashboard config once;
5. mark referenced bytes durable and clear the recovery journal;
6. reclaim newly orphaned bytes after commit.

If steps 1–4 fail, the old saved state remains authoritative and staged bytes are eligible for cleanup. If post-commit cleanup fails, startup reconciliation follows manifest references and never removes a referenced asset.

### Export/import and offline package

- Bundle v4 includes asset manifest records and base64 payloads for referenced local uploads, with SHA-256 and byte length. Linked URLs remain links and are reported as network dependencies before export.
- Export fails clearly if a referenced local asset cannot be read or verified; it does not produce a silently incomplete bundle.
- Import validates bundle version, MIME signature, hash, size, dimensions, total quota, source references, and duplicate IDs before mutation. It stages all bytes and commits the imported dashboard atomically.
- Flash-drive packaging extracts/bundles local assets under safe generated names and serves correct PNG/JPEG/WebP content types. Paths are relative and traversal-safe.
- Asset URLs are resolved in the main window and separate Audience window through a shared origin-safe resolver; object URLs are created per window and revoked when unused.
- Cleanup is reference-counted across saved config, active draft, undo/recovery journal, and import staging. Orphans are swept only after a successful commit or after a 24-hour staging grace period. Quota UI offers a storage inventory and deletion of genuinely unreferenced assets.

## Surface behavior

| Surface | Free text | Image |
|---|---|---|
| Add flow | Add static content | Add static content, existing type ID |
| Build panel | Canonical render + Edit | Canonical render + Edit; viewer controls may be active |
| Build preview | Same production renderer | Same production renderer including saved crop/rotation/fit |
| View | Canonical render, internal scrolling | Canonical render, transient viewer zoom/pan |
| Fullscreen | Canonical render, larger viewport | Canonical render, transient viewer zoom/pan |
| Present composer | Not listed/selectable | Listed as a non-temporal static item |
| 16:9 Audience | Never sent or rendered | Passive saved image; no controls; isolated failure state |

The Present protocol filters Free text at both selection and receiving boundaries. Image messages carry panel/source identity and revision, not blob URLs. The Audience window resolves the asset locally, applies the saved transform, ignores global time, and keeps other cells alive if it fails.

## Scenes and temporal behavior

Static panels do not participate in Scenes. Current Scenes require a parent Chrono group, group membership, and temporal frame bounds; weakening those invariants would turn this discovery into a Scene-model redesign. Images selected in Present are therefore direct composition members beside Scene/chart members. They do not have frames, do not receive time filters, and do not advance or reset the clock. Free text is excluded from Present entirely.

## Validation and recovery boundaries

- Static source validators are registry-selected and never run CSV/role/time validators.
- Dashboard validation verifies panel→source, image source→asset, manifest→bytes (at runtime/import), crop bounds, rotation enum, fit enum, alt/decorative exclusivity, and allowed URL/path protocols.
- One broken static source produces a panel-scoped recovery state; it does not blank the whole dashboard or Audience composition.
- Unknown future rendering policies/source versions are preserved for round-trip where safe but rendered as unsupported until migrated.
- Transaction recovery records only the staged asset transaction ID, source/panel target, and last saved revision needed for rollback/orphan cleanup. It contains no recoverable unsaved source, alt, crop, rotation, or fit draft. Reload restores the last saved pair.

Runtime time filtering treats both static types as out of domain: no static resolver receives a time filter or mutates time context. Image Present messages contain only panel/source identity and revision plus composition placement; they contain no Chrono Group, Scene, frame, or time fields. Advancing a sibling chart clock must leave the Image render revision unchanged.

## Acceptance and implementation evidence

Implementation uses three verification layers:

1. **Semantic correctness** — parser policy, sanitizer policy, source/asset schema, crop math, migration, validation, and atomic transactions.
2. **Composition correctness** — real routed UI owns the intended dimensions, controls, scrolling, transforms, passive behavior, and responsive states.
3. **Real-use correctness** — live production journeys prove creation, existing-panel editing, ordinary View, fullscreen, and Image Present/Audience. Free text must be proven absent from Present/Audience.

A parser, transform utility, schema record, catalogue entry, isolated component, or sketch never counts as the implemented feature. Acceptance requires live production integration journeys with saved reloadable state and real surfaces.

## Sketch decisions

The proposed interactive sketches are:

- `021-free-text-authoring` — Variant A, wide source/live preview with narrow tabs, last-valid stale-preview handling, and dirty Keep/Discard.
- `022-image-authoring` — Variant A, stage-3 source/accessibility/nondestructive transforms followed by passive stage-4 Preview & add.
- `023-static-panels-build-view` — Variant A, canonical saved panels, reversible Build compression, active keyboard Image controls in View/fullscreen, and surface-specific failures.
- `024-image-audience-rendering` — Variant A, passive Image plus temporal chart in 16:9 Audience; Free text absent.

They are disposable design evidence, not production components. Detailed acceptance and rejection records are in the Step 7S audit directory.

## Approval gate

This specification becomes **Approved** only when the V3 Design master task accepts the separate static workflow, the Free-text Audience exclusion, the non-temporal Image Present model, and the proposed sketch winners. Any accepted deviation must update this specification, the sketch record, fidelity matrix, and implementation plan together before production work begins.

Even after design approval, production execution remains blocked until Step 7 is accepted and the implementation plan’s hard ownership-resolution gate commits an exact inventory from that final Step 7 commit. Every provisional/generic production owner in the fidelity matrix and ledger must be replaced by exact source/function/CSS/test ownership before implementation begins.
