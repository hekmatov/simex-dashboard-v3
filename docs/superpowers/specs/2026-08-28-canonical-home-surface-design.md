# Canonical Home Surface Design

**Status:** Approved in conversation on 2026-08-28

**Implementation boundary:** Before Step 9

**Starting point:** `content/cloudflare-beta` at `6cd6887678f86f60eb28b606a70cba2a8fdd54c1`

## Purpose

Turn the current package-authored landing page into an application-owned canonical Home surface. Home sits beside View, Build, and Present; it cannot receive authored dashboard content, and its availability is the only Home preference stored in a dashboard package.

This change must preserve existing analytical content safely, retain the accepted Step 8 and post-Step 8 contracts, and stop before Step 9.

## Accepted Product Decisions

- Top-level navigation order is `Home | View | Build | Present` when Home is enabled.
- Home is an application surface, not an entry in `dashboard.pages`.
- Canonical Home content is application-owned and cannot be edited by dashboard authors.
- Home continues to inherit the active dashboard style, color profile, and resolved appearance.
- Home is hidden from normal navigation and cannot be requested when disabled.
- The package stores only `home.enabled`.
- The Home toggle participates in the normal Build draft and explicit Save transaction.
- Clear Dashboard always enables and selects Home.
- A disabled Home with zero ordinary pages normalizes to enabled as a small safety invariant.
- Analytical sections from the legacy Home page migrate to an ordinary page titled **Old Homepage Content**.
- Step 9 does not begin as part of this work.

## Architecture

Home becomes a fourth value in the existing top-level application mode contract. It uses the same mode switcher and transition authority as View, Build, and Present, but it does not enter the dashboard page-selection model.

The separation is structural:

- Application modes decide which top-level workspace is active.
- Dashboard pages exist only inside the authored dashboard workspaces.
- Canonical Home content lives in source code and is rendered only for Home mode.
- Dashboard configuration controls whether Home mode is available.

Because Home is absent from `dashboard.pages`, chart and static-content builders cannot select it, page mutation commands cannot reorder or delete it, and Clear Dashboard cannot remove it. No distributed `page.id === "home"` authorization checks are needed after migration.

## Configuration Contract and Versioning

The next configuration contract is Version 6. It admits one strict root-level record:

```json
{
  "home": {
    "enabled": true
  }
}
```

The record contains exactly one boolean field. Canonical wording, FAQ entries, resources, layout, and navigation actions are never serialized into dashboard configuration or package payloads.

Normalization rules are:

1. Version 5 and older configurations with no Home preference migrate to `home.enabled: true`.
2. Version 6 configurations with a malformed explicit Home record fail validation.
3. `home.enabled: false` with no ordinary pages normalizes to `true`.
4. Package export and import round-trip the normalized preference.
5. Browser-local mode memory remains separate from the package-owned availability preference.

An explicit version migration is required because removing the legacy Home page changes the meaning of the page collection; this is more than adding an optional display flag to Version 5.

## Legacy Home Migration

The migration recognizes the reserved legacy Home by its established identity and landing-page shape. Other ordinary or non-reserved landing pages are not silently reclassified.

For the reserved legacy Home:

1. Discard its package-authored landing metadata because the application now owns canonical Home content.
2. Remove the reserved Home object from `pages`.
3. If the legacy Home has analytical sections, create an ordinary dashboard page at its former relative position.
4. Name the page **Old Homepage Content** and derive a stable ordinary-page ID.
5. Preserve section, panel, chart, data, Chrono Group, and Scene identities. Remap any explicit legacy Home page reference to the new ordinary page while leaving lower-level semantic references intact.
6. If the preferred title or ID collides, add a deterministic numeric suffix. Never overwrite or combine unrelated content.
7. If there are no analytical sections, do not create an empty migration page.

The migration completes during package/config normalization before import or persistence commits. Failure leaves the previously loaded dashboard and its assets untouched.

## Navigation and Startup Resolution

When Home is enabled, the mode switcher exposes Home first, followed by View, Build, and Present. Home mode omits dashboard page navigation and authoring controls.

Initial mode resolution follows this order:

1. A valid explicit entry-mode request.
2. A valid browser-local remembered mode.
3. Home when enabled.
4. View when Home is disabled.

A Home request is invalid while Home is disabled and resolves to View. This makes Home the default for new visitors while preserving deliberate deep links and returning-author workflows.

Canonical Home actions may request application modes or open fixed external resources. They must not depend on package-specific page IDs. For example, **Open dashboard** enters View and lets the existing page resolver choose the first ordinary page.

## Build Toggle and Transaction Semantics

The Home toggle belongs in a dashboard-level Build settings surface, not Dashboard Look. It changes content availability, not visual styling, and it remains reachable while Home is disabled.

The toggle changes only the current Build draft until the user commits it:

- **Save off:** persist `home.enabled: false`; omit Home from the mode switcher; complete the normal post-save transition to View.
- **Save on:** persist `home.enabled: true`; expose Home without unexpectedly redirecting the author.
- **Discard/reset Build edits:** restore the prior persisted preference.
- **Failed Save:** retain the prior live preference, navigation, and active mode; keep the draft recoverable.
- **Imported package:** apply its normalized preference atomically. If a successful import disables the currently active Home, transition to View.

The control must be a labelled native checkbox or switch with clear enabled/disabled language and ordinary keyboard behavior.

## Clear Dashboard Semantics

Clear Dashboard removes all ordinary authored content under its existing guarded transaction. The successful replacement configuration:

- contains zero ordinary pages;
- clears authored data sources, content, assets, Chrono Groups, and Scenes according to the current reset contract;
- preserves dashboard identity and Look according to the current reset contract;
- sets `home.enabled: true`; and
- activates Home after persistence succeeds.

The confirmation wording must no longer claim that literally every page disappears without qualification. It must explain that authored dashboard content is deleted while the canonical Home surface remains available.

A failed clear operation leaves the prior configuration, Home preference, and active mode unchanged.

## Component and Ownership Boundaries

- **Canonical Home content module:** owns immutable wording, FAQs, resources, and application-level actions.
- **Canonical Home renderer:** presents that content using the existing semantic dashboard theme and style variables.
- **Mode/navigation module:** owns the four-mode contract, availability checks, and safe fallback resolution.
- **Configuration validator and V5-to-V6 migration:** own the strict Home record and legacy-page extraction.
- **App:** owns mode state, Build draft baselines, Save/import/clear transactions, and post-commit navigation.
- **Clear-dashboard helper:** owns the canonical empty authored-dashboard result and forced-on Home preference.
- **DashboardRenderer and builder capability boundaries:** operate only on ordinary pages and do not receive a synthetic Home page.

The implementation should adapt the current landing presentation rather than create a parallel styling system. The Home renderer must keep the previously accepted semantic-token inheritance and accessible focus treatment.

## Error Handling and Invariants

- Invalid explicit Version 6 Home data is rejected with a bounded configuration error.
- Missing legacy Home data is normal and defaults to enabled.
- The only automatic contradiction repair is disabled Home plus zero ordinary pages; it becomes enabled.
- Migration and import remain atomic.
- Save and Clear update navigation only after durable persistence succeeds.
- No failure path may strand an unavailable Home as the active mode.
- No migration may discard analytical sections or overwrite an existing page.
- Canonical Home remains passive with respect to Present/Audience runtime ownership and must not start presentation or playback work.

## Accessibility and Interaction Requirements

- The mode switcher exposes a coherent `Home | View | Build | Present` order and the current-mode state to assistive technology.
- The Build toggle has a stable accessible name, state, and explanatory text.
- When a successful operation removes the active Home, focus moves to a stable View destination rather than remaining on a removed control.
- Clear Dashboard returns focus to the active Home surface after the successful transaction.
- Home retains keyboard-visible focus with at least the existing accepted contrast boundary and responds to all dashboard styles, color profiles, and appearances.
- Hiding Home removes it from both visual and programmatic navigation; it is not merely CSS-hidden.

## Verification Strategy

Development uses focused RED-to-GREEN tests at the nearest owner. Each coherent slice identifies its nearest falsifier, one task-level deterministic gate, required browser evidence, and checks reserved for final integration.

Required deterministic coverage includes:

- Version 6 validation, migration, collision handling, and Home preference round-trip;
- legacy analytical-content preservation and empty-Home behavior;
- mode availability, ordering, startup resolution, and disabled fallback;
- canonical Home actions and semantic theme inheritance;
- Build draft Save, discard, failed Save, export/import, and reload behavior;
- Clear Dashboard success/failure and forced-on Home behavior;
- builder destination contracts proving Home cannot receive charts or static panels.

Required browser evidence includes:

- Home visible as the first top-level mode and rendered from canonical content;
- Home reacting to a materially different dashboard style, color profile, and appearance;
- explicit Save off/on behavior, reload persistence, and safe focus/navigation transitions;
- exact package export/import preference behavior where browser evidence changes the decision;
- Clear Dashboard removing ordinary content, enabling Home, and navigating to it;
- representative migration evidence showing **Old Homepage Content** in View with preserved content.

The final candidate runs the complete task-specific deterministic selection, the smallest representative browser selection, one production Cloudflare build, and the V3 static-build verifier. Broader release suites remain outside this pre-Step-9 feature unless a concrete shared-boundary change invalidates prior evidence.

Because the feature has visual output, approval requires a live build from the exact candidate commit containing every commit under review. The approval request must include the exact commit hash and an accessible URL, and the preview must remain running while approval is pending. Any later commit invalidates the preview until it is rebuilt and reverified.

## Non-Goals

- Starting or implementing Step 9.
- Making canonical Home content package-editable.
- Adding generic visibility flags to every dashboard page.
- Redesigning Dashboard Look or the accepted Home visual language.
- Introducing a second navigation, routing, theme, or persistence system.
- Changing Present/Audience protocols, playback ownership, or service-worker update behavior.
- Pushing, deploying, or deleting preserved feature branches or worktrees.
