---
sketch: 013
name: scenario-package-management
question: "How should Build expose one-scenario identity and dashboard-package operations without implying a package-wide Save or disturbing valid work?"
status: Approved
winner: "A — Scenario Passport"
tags: [build, scenario, package, import, download, reset, recovery]
---

# Sketch 013 — Scenario & dashboard package management

## Design question

How should Build expose one-scenario identity and dashboard-package operations without implying a package-wide Save, confusing source provenance with editable metadata, or putting the last-good dashboard at risk?

This sketch compares only the containment and hierarchy of the approved scenario and package operations. It does not reopen their contract semantics, the Layered Command Crown, approved dashboard geometry, visual-style portfolio, or phone support boundary.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/013-scenario-package-management/index.html?round=1` while the local sketch server is running.

## Decision boundary

### In

- Compare an identity-anchored popover, right-side management drawer, and centred management dialog using one identical scenario, dashboard, package-state fixture, and consequence model.
- Expose the one active Scenario's identity, editable name, Program, Updated metadata, and source provenance without presenting a Scenario collection.
- Exercise Rename Scenario, Import Dashboard Package, Download Dashboard Package, Reset Dashboard to Source, and no-valid-dashboard recovery.
- Show sequential, scope-specific resolution when package work encounters the approved dashboard-layout and selected-chart property drafts.
- Preserve the last-good dashboard through invalid package input, rejected package shape, failed reset, and cancelled operations.

### Out

- Multi-scenario browse, select, duplicate, delete, merge, history, branching, collaboration, or conflict resolution.
- A package-wide Save, Save All, generic Export, or a second persistence model.
- Changes to chart, layout, Page, Section, Time Group, Scene, View Chrono, Present, or Audience authoring.
- Changes to the approved Layered Command Crown, chart geometry, Unit Orbit, phone boundary, style portfolio, palettes, or canonical renderer.
- Production schemas, persistence implementation, filesystem APIs, browser-storage mechanics, download encoding, authorization, telemetry, tests, or release planning.

## Fixed mode and ownership semantics

- The product has exactly one active Scenario. Its Scenario name and Program are the visible Crown orientation; the sketch never implies a selectable Scenario library or a second dashboard-title object.
- Full scenario and package management is **Build-only**. View shows Scenario details but no Rename, Import, Download, or Reset actions. Present exposes no scenario or package actions.
- When no valid dashboard can load, recovery sits in the application frame outside mode content. It offers **Reload Dashboard** and **Import Dashboard Package** without implying that View or Present owns package mutation.
- Scenario name, Program, and Updated are activated by clicking their displayed values in **Scenario details**. Scenario name remains its own Scenario draft; Program and Updated remain the separate metadata edit.
- Opening any Scenario-details editor changes only that card. Source provenance, dirty-scope status, and Dashboard package content remain visible; package actions are reason-disabled until the edit is saved or cancelled.
- There is no package-wide Save. Object, chart, layout, structure, and temporal changes keep their approved scoped Save/Discard ownership.
- Import and Reset are package-replacement operations. They do not start until every draft scope they can invalidate has been explicitly resolved.
- Download produces only the last successfully committed current-V3 dashboard. It excludes unresolved drafts and Present/Audience session state.
- Invalid input and reset failure retain the last-good dashboard and never partially apply package contents.

## Exact draft-contract interpretation

Sketch 002's approved dual-draft correction supersedes the base UI contract's global singular wording only for the narrow Build layout/chart case. Where the base contract says **“its active object draft”** (`MODE-05`), **“An active object draft”** (`PKG-03` and `PKG-07`), **“exactly one selected-object draft”** (`PKG-05`), **“An unresolved object draft”** (`PKG-06`), or **“Single-object transactional draft”** (`GATE-H04`), Sketch 013 must instead recognize:

1. at most one dashboard-layout draft; and
2. at most one selected-chart property draft, which may coexist with that layout draft.

Package operations resolve those two named scopes **sequentially and independently** using their approved scoped actions: **Save Layout Changes / Discard Layout Changes / Stay in Build**, then **Save Chart Changes / Discard Chart Changes / Stay with Current Chart** (or the opposite sequence when the invoked context makes that clearer). A failed save stops the package operation and retains both drafts and the last-good dashboard. No aggregate Save or Discard action is introduced.

This correction does not permit multiple chart drafts, general concurrent object drafting, or concurrent chart-creation, Time Group, Scene, structure, or Scenario drafts. Rename Scenario remains the Scenario object's own transactional edit and respects the existing mutually exclusive authoring boundary.

## Shared operation contract

| Operation | Entry and consequence | Required failure or boundary state |
|---|---|---|
| Select / inspect Scenario | The Scenario details anchor exposes the one active Scenario, Program, Updated, and source facts. Selection creates no draft. | No Scenario list, duplicate, delete, or switch affordance appears. |
| Rename Scenario | Click the displayed Scenario name, edit it in place, validate it, and commit only through the Scenario object's **Save Changes**. | Cancel/Discard restores the committed name; failure retains the name draft and last-good dashboard. |
| Import Dashboard Package | Resolve affected drafts, choose one package, review its current-V3 identity and replacement consequences, then explicitly confirm replacement. | Malformed current-V3, V2, and multi-scenario envelopes are rejected. The existing dashboard remains unchanged and **Choose Another Package** remains available. |
| Download Dashboard Package | Resolve any dirty scopes, then serialize the last successfully committed current-V3 dashboard through one Download action. | It never includes a draft, Present/Audience session state, or a second generic Export action. |
| Reset Dashboard to Source | Resolve affected drafts, name the browser-state/source-baseline consequence, and require explicit destructive confirmation. | Reason-disabled when no differing source baseline exists. Failure preserves the last-good dashboard and offers a scoped retry/cancel path. |
| No-valid-dashboard recovery | In the application frame, state that no valid Scenario is available and offer **Reload Dashboard** and supported V3 **Import Dashboard Package**. | Do not render a blank dashboard, partial invalid state, mode-owned recovery, or an implied valid Scenario. |

## Shared fixture and state

All variants use the same fixture and state machine; switching A/B/C changes containment only.

- Active Scenario: **HeV-A26 Day 2 Simulation**.
- Program: **Pandemic & Disaster Preparedness Center**.
- Updated: **27 July 2026**.
- Source: **Authoritative source package · hev-a26-dashboard.v3.json**; browser state differs from source for the reset-ready state.
- Current dashboard: three Pages, eight Sections, 40 charts, three Time Groups, and the saved Scene relationships established by Sketch 012.
- Valid import: one current-V3 Scenario named **Coastal Response Coordination**, with a review summary that clearly identifies the incoming Scenario and the current dashboard it would replace.
- Rejected inputs: one malformed current-V3 package, one V2 package, and one envelope containing two Scenarios.
- Download state: clean committed dashboard, layout-dirty, chart-dirty, and dual-dirty.
- Reset states: source matches, source differs, confirmation open, deterministic failure, and retry success.
- Recovery states: no valid source or cached dashboard; reload failure; valid current-V3 recovery import.
- Long-content state: the approved 96-character Scenario name and 240-character error explanation.

Variant switching preserves the active mode, current Page, dashboard scroll, open package step, selected operation, focused control, and every unresolved draft. It never re-runs an import, reset, download, or rename consequence.

## Variants

### A — Scenario Passport · Approved winner

The Scenario details anchor in the approved Crown opens a compact popover. Scenario name, Program, and Updated appear as direct text-edit targets with no separate Rename or Edit buttons; source provenance and package operations follow. Import and Reset continue into focused consequence dialogs.

**Hypothesis:** anchoring management to the Scenario identity makes ownership immediately understandable while progressive disclosure keeps package operations available but appropriately quiet.

**Least-resistance rationale:** it adds the least persistent chrome, preserves the approved Crown hierarchy, and uses ordinary popover-to-dialog escalation for actions whose consequences need more room.

**Reject if:** the anchor makes package operations too difficult to discover, metadata becomes cramped with realistic text, or nested disclosure and confirmation produce unclear focus return.

### B — Scenario Cabinet · Rejected · Preserved

The same identity anchor opens a transparent-scrim right drawer. The drawer dedicates stable regions to Scenario identity, source status, package actions, and the current operation's consequence or error details.

**Hypothesis:** a persistent side surface gives provenance and package consequences enough space to remain legible while builders refer to the unchanged dashboard.

**Reject if:** the drawer feels like a second settings centre, overstates the importance of infrequent package operations, obscures meaningful dashboard context, or competes with Unit Orbit and the approved look drawer.

**Why it was not selected:** its persistent spatial weight overstates infrequent package work and competes with other approved contextual surfaces without improving the direct Scenario-to-management relationship.

### C — Dashboard Management Dialog · Rejected · Preserved

A centred dialog contains Scenario identity, source facts, and the complete package-operation set. Rename stays object-scoped inside the dialog; Import and Reset advance within a protected, explicit consequence sequence.

**Hypothesis:** a strong interruption boundary makes replacement and destructive consequences clearest and reduces the chance that package management is mistaken for ordinary dashboard editing.

**Reject if:** routine identity inspection feels unnecessarily blocking, the dialog loses the relationship to the Crown's Scenario identity, or combining rename and package operations implies one shared save boundary.

**Why it was not selected:** the modal boundary is appropriate for consequential Import and Reset steps, but using it as the primary entry makes routine Scenario inspection and direct editing feel too interruptive.

## Representative exercise

1. In View, inspect the Crown and confirm the Scenario remains orienting context with no package actions. Enter Build without shifting dashboard geometry; confirm the package entry becomes available. Enter Present and confirm every package action is absent.
2. Open each A/B/C container from the same Scenario details anchor. Click the displayed Scenario name, Program, and Updated values and confirm each opens the corresponding focused editor without a separate Rename/Edit action button.
3. Rename **HeV-A26 Day 2 Simulation**. Verify that only the Scenario name becomes dirty, that no package-wide Save appears, and that Save, Discard, validation failure, and save failure retain their object-scoped meaning.
4. Create both approved Sketch 002 scopes by reordering a chart and changing that chart's property. Invoke Import. Resolve the two explicitly named scopes one at a time, exercise Save for one and Discard for the other, and confirm **Stay** cancels the pending package operation without losing either draft.
5. Choose the valid **Coastal Response Coordination** current-V3 package. Review incoming identity and replacement consequences, cancel once, then confirm. Verify replacement occurs only after successful validation and confirmation.
6. Repeat Import with the malformed current-V3, V2, and two-Scenario inputs. Confirm each reason is explicit, **Choose Another Package** remains available, and the last-good dashboard, Page, and package-management entry remain unchanged.
7. With clean committed state, Download the dashboard package. Repeat from layout-dirty, chart-dirty, and dual-dirty states; confirm sequential scoped resolution and verify the promised output is committed dashboard state only, never a draft or Present/Audience session.
8. With browser state different from the authoritative source, choose Reset. Confirm the consequence names both states, cancel once, then trigger the deterministic reset failure. Verify the last-good dashboard remains and retry succeeds only after a new explicit attempt. Confirm Reset is reason-disabled when source and browser state match.
9. Enter the no-valid-dashboard fixture. Confirm recovery occupies the application frame outside View/Build/Present and exposes the exact **Reload Dashboard** and **Import Dashboard Package** actions. Exercise reload failure and valid V3 recovery without rendering partial dashboard content.
10. Repeat identity, import error, and reset consequence states with the long Scenario name, 200-percent text, keyboard-only input, and the approved tablet viewport. Confirm actions and consequences remain reachable without document-level horizontal overflow.

## What to compare

- Which container makes the relationship between Scenario details and dashboard-package operations clearest?
- Does clicking the displayed Scenario name make its object-scoped edit discoverable without looking like a package-wide save?
- Are Scenario name, Program, and Updated individually editable from their displayed values without suggesting a second identity model?
- Are Import, Download, and Reset discoverable without dominating normal Build work?
- Can users understand exactly which dashboard will be replaced, downloaded, or restored before committing?
- Does sequential dual-draft resolution name and preserve both Sketch 002 scopes without inventing Save All?
- Do malformed, V2, multi-scenario, reset-failure, and no-valid-dashboard states explain what failed and what remains safe?
- Does A remain usable at realistic content lengths, does B avoid becoming a settings centre, and does C avoid overstating routine identity inspection?

## Responsive and phone boundary

The Build management surface is reviewed at `1440×900`, `1200×900`, `1024×768`, and `768×1024`. Popover, drawer, or dialog may recompose at supported tablet sizes, but Scenario identity, source facts, package consequences, draft resolution, and every action remain reachable without changing dashboard geometry or causing document-level horizontal overflow.

At `390×844`, View remains the only supported product mode. Build and Present show the approved persistent, non-dismissible unsupported-mode notification above product chrome with **Switch to View**. Detection does not redirect, discard drafts, or expand Sketch 013 into phone Build acceptance. View retains Scenario orientation only. No-valid-dashboard recovery remains available because it belongs to the application frame, not an unsupported product mode.

## Accessibility, focus, and state

- Scenario details, direct-edit values, source, dirty scope, operation step, validation result, and destructive consequence have explicit programmatic names and never rely on colour alone.
- Popover, disclosure, drawer, dialog, file-choice proxy, confirmations, and recovery actions are keyboard and touch operable with visible focus and at least 44-by-44 CSS-pixel essential targets.
- Escape closes only the innermost transient layer and never resolves a draft, confirms replacement, triggers reset, or changes the last-good dashboard.
- Closing or cancelling restores focus to the invoking Scenario identity or operation. Sequential draft resolution moves focus to the next named scope; failure returns to the failed scope without losing the pending operation context.
- Long text, 200-percent text, logical reading order, greyscale, reduced motion, and internal scrolling retain every identity fact, consequence, error, and action.
- Successful rename/import/download/reset, rejected input, save failure, and recovery state are announced without unexpected focus movement.

## Architecture fit

All three candidates fit the existing React, Vite, CSS, AppFrame, Layered Command Crown, portal/dialog, shared dashboard state, and canonical renderer foundations. They differ only in transient containment: anchored popover, right drawer, or centred dialog. The prototype may simulate file selection, validation, download, source reset, and recovery outcomes with fixture state; it does not select production storage or file APIs.

No candidate introduces a runtime-only dependency, remote service, Scenario collection, new package schema, package-wide commit layer, forked renderer, alternate draft store, Quorum change, or Audience persistence. The dashboard remains visible through the approved visual style, palette, appearance, and chart-colour settings; package containment does not add a fourth style or mutate the portfolio.

## Step-10 codification notes

After a winner is selected, later specification should codify the Build-only entry, View orientation boundary, Present exclusion, application-frame recovery, direct Scenario-name ownership, source-provenance treatment, package review/consequence sequence, last-good retention, and focus return.

That correction must also replace the base contract's global singular draft language with Sketch 002's narrow layout-plus-selected-chart interpretation wherever package replacement, committed download, reset, or Build departure can encounter both scopes. Scoped resolution remains sequential; **Save Layout Changes** and **Save Chart Changes** stay separate, and no package-wide Save is created.

This Step 4 sketch makes no new production commitment. Exact storage, serialization, browser persistence, filesystem integration, validation engine, progress reporting, security boundary, and implementation architecture remain deferred to specification and planning.

## Low-risk tuning left after selection

- Exact container width, metadata density, disclosure depth, dialog step copy, icon choices, source-label wrapping, error-summary length, and tablet internal-scroll thresholds.
- Final focus-ring tokens, destructive-role treatment, reduced-motion timing, and concise accessible names.

## Decision status

**Approved — A: Scenario Passport.** It keeps Scenario details and infrequent package operations attached to the Scenario identity in the approved Crown, preserves the visible dashboard, and escalates only consequential Import and Reset steps into stronger confirmation surfaces. B and C remain fully exercisable as rejected evidence.

## Relevant approved inputs

- `.planning/sketches/002-contextual-panel-editing/README.md` — approved dashboard-layout plus selected-chart dual-draft correction and scoped prompt matrix.
- `.planning/sketches/003-dashboard-visual-language/README.md` — approved style, palette, appearance, and chart-colour portfolio.
- `.planning/sketches/009-shared-shell-and-product-chrome/README.md` — Layered Command Crown, product-mode hierarchy, application chrome, and phone boundary.
- `.planning/sketches/010-dashboard-look-controls/README.md` — approved Crown-attached visual-settings containment and transparent dashboard context.
- `.planning/sketches/011-dashboard-structure-authoring/README.md` — approved inline Build structure controls and scoped consequence ownership.
- `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md` — base Scenario/package operations, fixtures, recovery copy, and Step-10 clauses subject to the explicit Sketch 002 correction above.
- `.planning/sketches/MANIFEST.md` — sketch sequence, cross-sketch support boundary, and deferred-feature boundary.
