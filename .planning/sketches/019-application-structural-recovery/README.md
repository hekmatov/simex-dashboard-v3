---
sketch: 019
name: application-structural-recovery
question: "How should the approved shell expose scope-owned recovery when no valid Scenario or required dashboard structure exists, without implying that valid content is present or introducing generic authoring actions?"
status: Approved
winner: "A — Inline Recovery Rails"
tags: [recovery, empty-states, structure, View, Build, Present, consistency]
---

# Sketch 019 — Application and structural recovery

## Design question

How should the approved **Layered Command Crown** preserve orientation and expose the correct scope-owned recovery when there is no valid Scenario, no Pages, no Sections, no panels, no Time Groups, or no Present catalogue—without showing an unexplained blank, a generic **Add** action, or controls owned by another mode?

This sketch compares recovery containment only. Exact state semantics, copy, eligible actions, object ownership, the approved shell, ordinary valid-dashboard geometry, and the phone support boundary are fixed across all variants.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/019-application-structural-recovery/index.html?round=1` while the local sketch server is running.

## Decision boundary

### In scope

- `STATE-00` and `STATE-01` through `STATE-01D`, using `COPY-21` through `COPY-26` exactly.
- Recovery location and visual containment in the application frame, View, Build, and Present controller.
- The transition from each empty state to the next truthful structure state or restored baseline.
- Preservation of product, Scenario, Page, Section, and Audience context when that context remains valid.
- Keyboard focus, local scrolling, long copy, 200-percent text, reduced motion, and the approved phone boundary deeply enough to compare variants.

### Out of scope

- Chart-local Loading, zero-row, Partial, and Error states, which remain owned by Sketch 017.
- Source evidence Loading/Error/no-match states, which remain owned by Sketch 018.
- Package-management redesign, package validation, multi-Scenario behavior, or a second Import flow; Sketch 013 remains authoritative.
- Page/Section authoring redesign; Sketch 011's inline controls remain authoritative once valid structure exists.
- Time Group or Scene authoring redesign; Sketches 005, 006, and 012 remain authoritative.
- Present composition or Audience lifecycle redesign; Sketches 001 and 008 remain authoritative.
- A generic recovery centre, notification queue, global **Add**, new persistence layer, production implementation, or schema change.

## Fixed state and copy contract

| State | Surface and exact copy | Exact action | Fixed consequence |
|---|---|---|---|
| `STATE-00` / `COPY-21` | Application frame: `Dashboard couldn’t load. No valid scenario is available.` | `Reload Dashboard`; `Import Dashboard Package` | Keep any cached last-good dashboard. With none, render no mode-owned workspace or implied Scenario. Reload failure stays here; a valid current-V3 recovery installs one complete dashboard atomically. |
| `STATE-01` / `COPY-22` | View or Build: `This dashboard has no pages.` | `Create Page` | Preserve valid Scenario identity and zero-page geometry. Creation produces one selected empty Page and therefore `STATE-01A`. |
| `STATE-01A` / `COPY-23` | View or Build: `This page has no sections.` | `Create Section` | Preserve selected Page identity. Creation produces one selected empty Section and therefore `STATE-01B`. |
| `STATE-01B` / `COPY-24` | View or Build: `This section has no panels.` | `Add Panel to Section` | Preserve Page and Section identity. The representative action creates one valid panel without changing the approved chart-authoring workflow. |
| `STATE-01C` / `COPY-25` | Build: `No time groups have been created.` | `Create Time Group` | Build owns creation. View and Present only state that synchronized playback is unavailable because no Time Group exists; they do not imply an editable group. |
| `STATE-01D` / `COPY-26` | Present controller: `No charts are available to present from this dashboard.` | `Open Build to Add Charts` | Route to the relevant Build recovery without creating a chart or Scene silently. Audience retains its current valid holding/output state and exposes no recovery action. |

Exact copy may wrap but may not truncate. State meaning and available action never rely on colour alone. No variant adds a generic **Add**, **Fix everything**, or **Continue** command.

## Shared fixture and transitions

All variants use one in-memory fixture and switching variants preserves the selected state, mode, Page context, Audience holding output, focused control, and any open recovery dialog.

- Valid recovered baseline: Program **Pandemic & Disaster Preparedness Center**, Scenario **SimEx Training Exercise**, Page **Biomedical**, Section **Outbreak dynamics**, panel **Confirmed cases**, and Time Group **National outbreak**.
- No-valid-dashboard recovery starts outside View/Build/Present. **Reload Dashboard** has one deterministic failure and one success path; **Import Dashboard Package** reuses only the compact valid-current-V3 recovery consequence established by Sketch 013.
- The structural ladder is deterministic: no Pages → **Create Page** → empty **Operations briefing** Page → **Create Section** → empty **Briefing highlights** Section → **Add Panel to Section** → recovered panel.
- Zero Time Groups and zero Present catalogue are independent fixtures because adding a panel changes catalogue eligibility. Their recovery actions route to the correct owner rather than pretending the entire ladder is one wizard.
- The Present fixture keeps a passive Audience monitor on its last valid holding state. It contains no controller action, focus target, or repair copy.

## Variants

### A — Inline Recovery Rails · Approved winner

The exact state plate and eligible action occupy the missing object's own canonical region. Application failure fills the application frame; zero Pages sits in the dashboard canvas; zero Sections sits inside the selected Page; zero panels sits inside the named Section; zero Time Groups sits in Build's temporal context; and zero catalogue sits in the Present sidecar.

**Hypothesis:** placing the problem and next valid action exactly where the missing object would appear gives the clearest ownership and extends the approved inline Build and chart-native state patterns with the least new interface.

**Least-resistance rationale:** this reuses current shell/canvas boundaries and existing named creation entry points. It adds no global recovery state, persistent inspector, or modal sequence.

**Reject if:** the recovery plate is visually lost inside large empty geometry, the affected scope cannot be identified without scanning surrounding chrome, or transitions cause the plate to jump unpredictably.

### B — Context Shelf Recovery · Rejected · Preserved

The canonical empty geometry remains visible while the approved Build Context Shelf carries the current recovery message and exact action. A compact structural path identifies the first missing scope; selecting it focuses the corresponding empty region. In View and Present, the same shelf treatment is represented as a temporary context strip rather than a persistent authoring inspector.

**Hypothesis:** one stable action surface makes nested structural gaps easier to scan and keeps recovery commands reachable while the empty canvas demonstrates what remains valid.

**Reject if:** the shelf separates the problem from its location, becomes a generic status centre, obscures which mode owns creation, or adds more persistent chrome than the rare recovery states justify.

**Decision:** rejected because the persistent shelf separates recovery from the missing region and gives rare recovery states too much permanent visual weight.

### C — Guided Structural Navigator · Rejected · Preserved

A focused recovery workspace shows the valid-to-missing structural path and one active repair card. The application-frame failure uses the same centered hierarchy without implying that Build is available. After repair, the user returns to the normal shell at the newly valid scope; the navigator never becomes a parallel dashboard editor.

**Hypothesis:** a guided path makes ancestor/descendant dependency clearest and prevents actions on structure whose parent does not yet exist.

**Reject if:** it feels like a wizard for simple empty states, duplicates Page/Section authoring, hides too much valid context, or makes recovery seem like a separate product mode.

**Decision:** rejected because a separate navigator turns direct empty-state repair into a parallel workflow and hides valid surrounding context.

## Representative review exercise

1. Switch among A/B/C in the recovered baseline and confirm the dashboard fixture does not change.
2. Select **No valid Scenario**. Confirm mode/Page chrome disappears, exact `COPY-21` appears in the application frame, and only **Reload Dashboard** and **Import Dashboard Package** are offered. Exercise one reload failure, then recover.
3. Select **No Pages** in View and Build. Confirm valid Scenario context remains, exact `COPY-22` appears, and **Create Page** produces selected Page **Operations briefing** with exact `COPY-23` rather than skipping ahead.
4. Create **Briefing highlights** from the no-Sections state. Confirm exact `COPY-24` then appears inside that named Section.
5. Add the representative **Confirmed cases** panel and confirm ordinary recovered geometry replaces the empty state without retaining stale recovery chrome.
6. Select **No Time Groups**. In Build, use exact **Create Time Group**; in View and Present, confirm synchronized playback is only labelled unavailable and no editable group is implied.
7. Select **No Present catalogue**. Confirm exact `COPY-26`, use **Open Build to Add Charts**, and verify the passive Audience monitor retains its holding output with no recovery action.
8. Repeat the directly affected states at 768×1024 and 1024×768. At 390×844, confirm View remains usable and Build/Present show the persistent **Switch to View** boundary without losing the selected fixture.
9. Use keyboard-only navigation, Escape on the import consequence, reduced motion, and 200-percent text. Confirm focus returns to the invoking recovery action and no document-level horizontal overflow appears.

## What to compare

- Which variant makes the missing scope and its owner understandable before reading the action?
- Does recovery feel like a direct continuation of the approved interface rather than a new workspace?
- Is exact copy readable at realistic empty-region sizes without dominating the entire application?
- Does the Page → Section → panel transition remain truthful at every step?
- Are View, Build, Present controller, and passive Audience responsibilities unmistakable?
- Does the treatment remain coherent for both application failure and nested structural absence?
- Is A's low implementation resistance worth any discoverability tradeoff, or does B/C materially improve orientation?

## Responsive and accessibility boundary

- Supported Build review sizes remain 768×1024, 1024×768, 1200×900, and 1440×900. No variant introduces document-level horizontal overflow.
- At `<= 767px`, Build and Present retain the approved persistent unsupported-mode banner and explicit **Switch to View** action. State and context remain retained; no automatic redirect occurs.
- Primary recovery actions have at least 44×44 px activation targets, visible focus, explicit labels, and equivalent keyboard operation.
- Dialog focus is contained; Escape closes only the innermost consequence without mutation; Close/Cancel restores the invoking recovery action.
- Exact state copy is exposed programmatically, and transitions are announced through a polite live region.
- Reduced motion removes nonessential movement without hiding state change or focus location.

## Architecture declaration

The artifact is a disposable standalone HTML/CSS/JavaScript prototype with fixed fixture data and in-memory transitions. It uses no production loader, package parser, persistence, router, schema mutation, chart renderer, Time Group builder, Present channel, or Audience window.

Approval will select only the recovery containment and continuity rules. It will not approve prototype markup, state-object structure, timing, modal implementation, production component boundaries, validation, storage, or error taxonomy. The normative UI contract and earlier approved sketches remain authoritative.

## Decision status

**Approved. Winner: A — Inline Recovery Rails.** It keeps the exact recovery copy and eligible action in the affected canonical scope, preserves the approved shell and surrounding valid context, and introduces the least new recovery interface. B and C remain interactive as rejected, preserved alternatives.
