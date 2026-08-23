# Dashboard Interface Spacing, Action, and Field Audit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Systematically inspect every live dashboard surface for spacing, action-button organization, target sizing, field composition, information alignment, and responsive failures, then produce prioritized implementation-ready recommendations.

**Architecture:** The review combines a source inventory with representative in-app browser journeys and focused geometry readings. Findings are recorded once in a new dated audit so existing dirty review artifacts remain untouched; Step 7 fixes and Step 8 deferrals are distinguished explicitly.

**Tech Stack:** React/CSS source inspection, in-app browser, Playwright geometry checks where repeatable viewport evidence is required, Markdown audit record

**Spec:** `docs/superpowers/specs/2026-08-23-build-command-header-dashboard-map-and-interface-audit-design.md`

## Global Constraints

- Execute after the Build command header/Dashboard Map plan so the review measures the accepted structure.
- Preserve all pre-existing dirty and untracked files.
- Review every listed surface, but create a finding only when evidence can change a concrete UI decision.
- Do not treat screenshot capture, label presence, or static markup alone as visual fidelity.
- Use 1280 × 720, 768 × 1024, and 390 × 844 only where the surface or decision materially changes.
- Information fields, text boxes, selects, numeric controls, radios, checkboxes, descriptions, validation, and recovery messages are in scope.
- Present/Audience findings may be documented but their Step 8 redesign is deferred.

---

### Task 1: Create the live surface and control inventory

**Files:**
- Create: `docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md`

**Interfaces:**
- Consumes: production component tree and CSS selectors.
- Produces: a complete inventory table keyed by surface, state, viewport, owner, and evidence method.

- [x] **Step 1: Enumerate production surfaces from live owners**

Use source search to map these owner groups without changing code:

```text
Application frame and command crown
View canvas and chart panels
Build command header and Dashboard Map
Dashboard Look
New Chart and chart edit
Pages & Sections and Scenario Passport
Chrono Studio, content, and editor
Scene Studio, content, and editor
Time Content and View Chrono
Fullscreen, dialogs, sheets, tooltips, toasts, empty/recovery states
Present and Audience (audit-only Step 8 ownership)
```

For each group, list the React owner and governing CSS file/selector.

- [x] **Step 2: Create the audit record with explicit scoring and finding fields**

Start the document with:

```markdown
# V3 Dashboard Interface Spacing, Actions, and Fields Review

**Status:** In progress
**Review viewports:** 1280 × 720; 768 × 1024; 390 × 844 where material

| Surface | Production owner | Material state/viewports | Actions | Fields/information | Evidence method | Status |
|---|---|---|---|---|---|---|
```

Populate every inventory row immediately; do not leave placeholders such as `TBD`.
Record the structural baseline by running `git rev-parse --short HEAD` after the structural implementation plan and writing the returned commit ID into the audit introduction.

- [x] **Step 3: Record the pre-review baseline**

Document the already observed failures as baseline evidence:

- old Build drawer command wrapping/clipping at 1280 × 720, now replaced by the structural plan;
- Chrono Group content action wrapping and title squeeze, now replaced by the structural plan;
- earlier Chrono editor field-baseline/alignment regression as a mandatory live recheck.

- [x] **Step 4: Commit the complete inventory**

```bash
git add docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md
git commit -m "docs(ui): inventory dashboard controls and fields"
```

---

### Task 2: Review primary Build and authoring surfaces

**Files:**
- Modify: `docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md`

**Interfaces:**
- Consumes: live Build journeys and computed browser geometry.
- Produces: evidence-backed findings for Build header/Map, Look, chart authoring, structure, Scenario Passport, Chrono, and Scene authoring.

- [x] **Step 1: Inspect Build shell and transient ownership**

Exercise: enter Build, change Pages, open/close Dashboard Map, select a chart, open Unit Orbit, Pages & Sections, Dashboard Look, Chrono Studio, and Scene Studio.

For each surface record:

- action groups and visual hierarchy;
- control bounding sizes and adjacent gaps;
- wrap/overflow/scroll behavior;
- focus order and return context;
- whether opening the surface changes saved layout.

- [x] **Step 2: Inspect all Build form and information patterns**

Inspect labels, text inputs, text areas, selects, numeric fields, radio rows, checkboxes, status fields, ledgers, descriptions, validation, and recovery messages. For each field group record computed height, inline padding, label/value baseline relationship, and responsive stacking when visibly relevant.

The Chrono editor regression check must compare the Review-stage text/information boxes and ordinary inputs with geometry readings such as:

```js
({
  labelTop: label.getBoundingClientRect().top,
  controlTop: control.getBoundingClientRect().top,
  controlHeight: control.getBoundingClientRect().height,
  lineHeight: getComputedStyle(control).lineHeight,
  paddingBlock: [getComputedStyle(control).paddingTop, getComputedStyle(control).paddingBottom],
})
```

- [x] **Step 3: Classify each finding**

Use:

- **P0:** blocks or loses the representative task/state;
- **P1:** materially harms hierarchy, reachability, alignment, responsive use, or comprehension;
- **P2:** localized polish inconsistency with a clear owner and repair.

Each finding includes owner, evidence, recommended arrangement, material viewport/state, and cheapest falsifying check. State `No issue found` for inspected categories without a finding so coverage is auditable.

- [x] **Step 4: Commit Build/authoring findings**

```bash
git add docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md
git commit -m "docs(ui): audit build and authoring composition"
```

---

### Task 3: Review View runtime and shared transient surfaces

**Files:**
- Modify: `docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md`

**Interfaces:**
- Consumes: live View, Chrono playback, chart interaction, tooltip, fullscreen, and recovery journeys.
- Produces: evidence-backed View/shared findings with no authoring chrome in View.

- [x] **Step 1: Inspect ordinary View and chart-panel actions**

Exercise Page switching, chart hover/focus tooltips, Collection controls, exploration, comparison, source evidence, single fullscreen, and multi-panel fullscreen. Record chart-header action ownership, target sizes, tooltip clearance/overflow, and responsive wrapping.

- [x] **Step 2: Inspect View Chrono information and controls**

Exercise group selection, Scene selection, playback, cadence entry, seek rail, progress/availability evidence, reveal state, date overlay, and suspension/resumption. Record label/control alignment, numeric field sizing, action order, tooltip behavior, and touch target spacing.

- [x] **Step 3: Inspect shared failure and transient states**

Inspect dialogs, sheets, toasts, warnings, empty states, validation, recovery, and storage/quota messaging. Verify action hierarchy does not present destructive or unrecoverable actions as the default primary choice.

- [x] **Step 4: Commit View/shared findings**

```bash
git add docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md
git commit -m "docs(ui): audit view and shared composition"
```

---

### Task 4: Inspect responsive material states and finalize recommendations

**Files:**
- Modify: `docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md`
- Modify: `docs/audits/2026-08-22-v3-step-7-build-view/MASTER-REVIEW-SUBMISSION.md`

**Interfaces:**
- Consumes: Tasks 1–3 findings and material tablet/touch checks.
- Produces: scored review, prioritized repair order, explicit Step 7/Step 8 ownership, and provisional master-review status.

- [x] **Step 1: Recheck only viewport-dependent decisions**

At 768 × 1024 and 390 × 844, recheck surfaces whose layout can change: command crown, Build command header, Dashboard Map, chart/Chrono/Scene authoring, View Chrono, chart headers/tooltips, dialogs, and fullscreen exit controls.

Record whether whole action/field groups stack, targets remain at least 44px where required, adjacent interactive targets retain at least 8px separation, and no fixed/sticky control covers required content.

- [x] **Step 2: Score the six review pillars**

Score and justify:

```text
Visual Hierarchy
Spacing and Rhythm
Typography and Information Fields
Controls and Interaction
Responsive Composition
Accessibility and State Communication
```

Scores are summaries of recorded evidence, not substitutes for findings.

- [x] **Step 3: Produce the dependency-ordered repair backlog**

Order recommendations as:

1. blocked/lost tasks and inaccessible controls;
2. structural ownership and grouping;
3. responsive clipping/overflow;
4. field/information alignment and validation composition;
5. local spacing and paint polish.

Every recommendation names the production owner, exact change, cheapest test, and whether Step 7 or Step 8 owns implementation.

- [x] **Step 4: Finalize status and master-review language**

Set the audit status to `Complete`. Update the master-review submission to link the audit and remain provisional while any Step 7 P0/P1 finding is open. Distinguish engine implemented, UI implemented, and fidelity verified.

- [x] **Step 5: Commit the completed review**

```bash
git add docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md docs/audits/2026-08-22-v3-step-7-build-view/MASTER-REVIEW-SUBMISSION.md
git commit -m "docs(ui): complete dashboard interface composition review"
```
