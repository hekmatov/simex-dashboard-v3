---
sketch: 020
name: page-section-command-surfaces
question: "How should inline Page and Section commands remain associated with their targets at scale while exposing complete structural consequences before mutation?"
status: Approved
winner: "A — Anchored Local Commands"
tags: [Build, structure, pages, sections, scale, commands, consequences, responsive]
---

# Sketch 020 — Page and Section command surfaces at scale

## Design question

How should the approved inline Build structure controls remain findable, target-specific, and readable when Page navigation contains many long labels and a structural command needs destination, placement, disposition, and named consequence evidence?

This sketch compares **command containment only**. It does not reopen which Page or Section operations exist, what they do, who owns them, or how the dashboard is rendered. **A — Anchored Local Commands** is approved because it retains the strongest spatial association with the affected Page or Section and adds the least new persistent chrome.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/020-page-section-command-surfaces/index.html` while the local sketch server is running.

## Decision boundary

### In

- Compare three ways to contain the same Page and Section command sequence at realistic navigation and consequence density.
- Keep the active Page tab, affected Section header, destination choice, placement choice, disposition, and named consequences visually associated throughout an operation.
- Exercise Page drag reorder plus a compact vertical icon rail beside the active Page tab, ordered **Edit**, **Move earlier**, then **Move later**.
- Exercise Page merge and removal, cross-Page Section movement with placement, Section merge, and Section removal with explicit chart disposition.
- Stress long Page and Section labels, a contained Page-tab scroller, a pinned **Add page** action, and named chart, Time Group, and Scene evidence.
- Preserve the scoped Structure draft, **Save Structure**, **Discard Structure**, cancellation, consequence proof, and reason-disabled protected operations. Reserve the explicit confirmation checkbox for destructive operations or moves that invalidate named references.

### Out

- Adding, removing, or changing the meaning of structure operations approved in Sketch 011 and its Step-10 codification notes.
- Replacing Sketch 015's Context Shelf orchestration for transient Build surfaces or weakening the priority of consequence dialogs.
- Redesigning Sketch 019's application, no-Page, no-Section, no-panel, no-Time-Group, or no-Present-catalogue recovery states.
- Chart data, source evidence, appearance, axes, interaction, footprint, or other chart-local authoring; Unit Orbit and the chart-owned draft remain authoritative.
- Individual chart movement, Time Group or Scene authoring, Dashboard Look, Scenario/package management, Present composition, or Audience behavior.
- Generic global filters, generic recovery commands, unapproved fixture controls, a second structure workspace, or a staged authoring wizard.
- Production components, persistence, schemas, permissions, routing, tests, or implementation architecture.

## Approved foundation and ownership boundaries

- Sketch 011's **Inline Build Structure Controls** remain authoritative. Page commands stay associated with Page navigation; Section commands stay associated with the real Section header; activating a Section title enters inline rename; **Add page** and **Add section** extend their visible collections.
- Selection is non-mutating. Create, rename, reorder, move, merge, and remove mutate only the Structure draft until **Save Structure**; **Discard Structure** restores the last saved hierarchy.
- Harmless reorders update the Structure draft immediately. Destructive actions and moves that invalidate named references require a pre-mutation consequence proof that names affected objects; only those outcomes require the explicit confirmation checkbox.
- Sketch 015's **Context Shelf** still owns coexistence among transient Build surfaces. The structure command treatment being compared here does not become a second shelf, activity stack, Unit Orbit, or persistent structure inspector. A consequence dialog remains topmost and returns focus to its invoking inline control when cancelled.
- Sketch 019's **Inline Recovery Rails** remain authoritative when valid structure is absent. If an explicitly confirmed operation produces a valid zero-Section state, the ordinary Build surface transitions to the approved `This page has no sections.` recovery treatment; this sketch does not redesign it.
- The canonical dashboard renderer, chart identity, chart grid order, and chart-owned footprint remain unchanged by structural command chrome.

## Fixed operation semantics

### Pages

- Page buttons remain selectable and draggable within a horizontally contained navigation region. **Add page** remains pinned and reachable rather than scrolling away with the Page tabs.
- Drag reorder and the compact **Move earlier** or **Move later** controls produce the same Structure-draft order. Keyboard commands are not a second semantic path.
- Merging a Page requires an eligible destination and a named consequence proof. The source Page's Sections, charts, and Time Groups move into the destination in their existing order; named Scene consequences are disclosed, chart properties and footprint do not change, and the source Page is removed only after confirmation.
- Removing a non-empty Page cannot silently cascade. The prototype requires either **Move sections to** an eligible non-Landing Page or **Delete placed charts**, then names the affected Sections, charts, Time Groups, and Scenes before confirmation.
- The protected Landing Page is visibly reason-disabled as an analytical Page-merge or cross-Page Section destination. It is never silently substituted with another destination.
- The final remaining Page cannot be removed. Its unavailable action remains visible with a reason rather than appearing to succeed.

### Sections

- A Section title remains the rename trigger. Move earlier, Move later, Move to Page, Merge, and Remove remain Section-header operations; no separate structure workspace is introduced.
- Moving a Section to another Page requires an eligible destination Page and an explicit placement: first in the destination or after a named destination Section.
- The representative cross-Page move carries every contained chart unchanged. **National outbreak and health-system playback** remains attached; the Page-scoped **National pressure briefing** loses its named `bio_admissions` reference only after the user acknowledges that consequence.
- Removing a Section retains the fixed dispositions **Delete charts**, **Merge into section above**, and **Merge into section below**. Missing adjacent destinations are reason-disabled and are never silently substituted.
- Section merge chooses another available Section on the same Page. Adjacent destinations are preferred; no destination is invented when none exists.
- Removing a Page's last Section is unavailable. **Merge into section above** and **Merge into section below** are also reason-disabled whenever the corresponding adjacent Section does not exist.

## Shared scaled fixture

All variants use one Structure draft and one canonical dashboard fixture:

- Dashboard: **Pandemic & Disaster Preparedness Center**; Scenario: **HeV-A26 Day 2 Simulation**.
- Seven Pages stress the navigation region: protected Landing Page **Dashboard overview & exercise readiness**, active **Operations briefing & hospital demand**, **Epidemiological surveillance & early warnings**, **Regional logistics, supplies & mutual aid**, **Workforce continuity & staffing resilience**, **Public communications & community response**, and **Post-exercise findings & improvement plan**.
- The Landing Page contains **Exercise status at a glance**. The active Page contains selected **Hospital pressure** and **Access & response**.
- The selected Section contains `bio_admissions` — **New ICU and hospital admissions**, plus named occupancy, staffing, transfer, and coordination charts used in the consequence proof.
- Dependent temporal content is **National outbreak and health-system playback** and the Page-scoped Scene **National pressure briefing**.
- The remaining analytical Pages provide eligible destinations and explicit first/after-Section insertion positions; the protected Landing Page does not.
- The fixture content and Structure draft are shared when switching variants; only command containment changes.

## Variants

### A — Anchored Local Commands · Approved winner

The active Page tab exposes a compact vertical rail ordered **Edit**, **Move earlier**, and **Move later**. Edit opens a small non-dimming Page Orbit directly below and visibly connected to that Page panel; it follows the Page during horizontal navigation scrolling and clamps inside the product edge without losing its pointer. The Orbit contains **Rename Page**, **Merge Page**, and **Remove Page** only; selecting the Page itself never expands a command panel. Section commands remain in the affected Section header, and named consequence dialogs stay associated with the object being changed.

**Hypothesis:** the command and its evidence remain easiest to understand when they are attached to the Page or Section already under inspection.

**Least-resistance rationale:** this extends Sketch 011's approved inline pattern with one compact contextual Orbit and does not reserve permanent canvas height or create another Build inspector.

**Reject if:** the Page Orbit obscures the active Page, becomes unstable near viewport edges, or Page-tab scrolling makes the invoking Page difficult to recover.

### B — Selected Target Command Band

Selecting a Page or Section populates one command band immediately below Page navigation. The affected target remains visibly outlined in the real dashboard while the band carries destination, placement, disposition, and consequence evidence.

**Hypothesis:** a consistent command location improves discoverability and makes dense evidence easier to scan without detaching it completely from the canvas.

**Reject if:** the band feels like a second structure workspace, consumes too much persistent vertical space, or forces users to alternate attention between the command band and distant Section headers.

### C — Inline Expansion Sheet

The affected Page strip or Section expands in flow to reveal its command sequence, eligible destinations, dispositions, and named consequences. No overlay covers the dashboard.

**Hypothesis:** reserving space inside the affected structure provides the clearest target relationship and keeps all consequence evidence visible.

**Reject if:** layout shifts obscure before/after relationships, long sheets cause excessive scrolling, or expanding a Section changes the perceived canonical dashboard geometry.

## Representative review exercise

Complete the same task in A, B, and C without reloading:

1. Find and select **Biomedical surveillance and hospital-capacity coordination** in the many-Page navigation. Scroll Page tabs in both directions and confirm **Add page** remains pinned.
2. Reorder the active Page once by drag and once through the compact earlier/later controls. Confirm both paths produce the same dirty Structure draft without a consequence dialog or confirmation checkbox.
3. Open the active Page's edit icon. Confirm its small Orbit contains only **Rename Page**, **Merge Page**, and **Remove Page**, then start a Page merge. Confirm the Landing Page and any other invalid destination are reason-disabled, inspect the named Sections, charts, Time Group, and Scene, then cancel without mutation.
4. Start Page removal from the same Orbit. Inspect the explicit content disposition and full named consequence proof; confirm the destructive confirmation checkbox and final-Page protection are understandable without relying on colour.
5. On **Hospital pressure**, open **Move to Page**, select an eligible analytical Page, and choose a named insertion position.
6. Verify the proof states that all contained charts move unchanged, **National outbreak and health-system playback** remains attached, and **National pressure briefing** loses only its `bio_admissions` reference after acknowledgment. Cancel once, then repeat and confirm.
7. Exercise Section merge and removal. Compare **Delete charts**, **Merge into section above**, and **Merge into section below**; inspect the reason-disabled adjacent dispositions and the unavailable Remove action on a Page's last Section.
8. Confirm the resulting chart geometry, order, properties, and footprints are unchanged. Exercise **Discard Structure**, repeat one operation, then **Save Structure**.
9. Repeat the directly affected command at 1200×900, 1024×768, and 768×1024. At 390×844, confirm View remains available and Build shows the established persistent **Switch to View** boundary without losing the suspended draft.

## What to look for

- Can you identify the command's Page or Section target before reading the evidence?
- Does selecting a Page remain a simple navigation action, with the compact edit Orbit appearing only after its adjacent icon is invoked?
- Do destination, placement, disposition, and consequence proof form one understandable sequence?
- Does the scaled Page navigation remain navigable with long labels while **Add page** stays reachable?
- Are protected and unavailable destinations understandable and keyboard-reachable without relying on colour?
- Can named chart, Time Group, and Scene consequences be inspected without losing the real affected Section and its neighbours?
- Does cancellation restore the exact invoking control and unchanged draft state?
- Does the treatment preserve canonical dashboard geometry closely enough to judge the structural change?
- Does any variant accidentally resemble a parallel structure workspace or reopen another sketch's owner?

## Responsive and accessibility boundary

- Review Build at `1440×900`, `1200×900`, `1024×768`, and `768×1024`. Command surfaces may recompose internally, but Page/Section identity, every eligible choice, named consequences, and **Save Structure**/**Discard Structure** remain reachable without document-level horizontal overflow.
- At `390×844`, View remains the only supported mode. Build and Present retain the persistent, non-dismissible unsupported-mode banner and **Switch to View** action; detection does not redirect or discard a suspended Structure draft.
- Dragging is never the only reorder path. Keyboard and touch users can produce the same draft order through named movement commands.
- Long labels and evidence may wrap but do not truncate the identity needed to understand a consequence. Internal scrolling preserves the invoking target and confirmation controls.
- Opening the Page Orbit or a consequence proof moves focus to a meaningful heading or control. Escape closes only the innermost surface, and Cancel returns focus to the invoking Page or Section control.
- Visible focus, protected-state text, logical reading order, 200-percent text, reduced motion, and non-colour state cues remain available in every variant.

## Architecture declaration

This is a disposable standalone HTML/CSS/JavaScript prototype with fixed fixture data and one in-memory Structure draft. It uses no production React components, persistence, APIs, schema mutations, authorization, chart renderer, Time Group or Scene editor, or generalized command-surface framework.

Selecting a variant will approve only the containment and responsive behavior of these already-fixed Page and Section commands. It will not approve prototype markup, JavaScript state shape, component boundaries, storage, validation, routing, or a new architecture. Sketches 011, 015, and 019 plus the normative UI contract remain authoritative.

## Decision status

**Approved. Winner: A — Anchored Local Commands.** Its compact vertical Page rail keeps navigation and reordering attached to the active Page, while the non-dimming Page Orbit follows that Page during horizontal scrolling and contains only Rename, Merge, and Remove. Section commands remain in their approved headers, and explicit acknowledgment remains reserved for destructive or reference-invalidating outcomes.

**B — Selected Target Command Band is rejected and preserved** because a persistent shared band weakens the direct Page/Section association and consumes vertical space even when no contextual Page Orbit is needed.

**C — Inline Expansion Sheet is rejected and preserved** because expanding the selected object shifts canonical dashboard geometry during structure authoring.
