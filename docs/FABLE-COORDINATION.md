# Fable sprint coordination agreement

Version 3 · adopted 27 September 2026 · amended 29 September for effort floors, 1 October for implementation-slice review and practitioner previews, and 18 October for focused hosted verification and evidence reuse, by user instruction.

Applies to every Fable dashboard planning steward, high-level coordinator, milestone owner and replacement in those roles. This is the canonical workflow; [ROADMAP.md](ROADMAP.md) locates the authoritative product plan and current assignment. Product criteria, explicit user decisions and repository approval/verification policies govern. Version 3 removes per-test-group reassignment: the owner carries an approved milestone workstream inventory through its defined exit, choosing internal batches without coordinator permission. Earlier small-package return instructions are superseded.

## Roles and authority

- **Steward or high-level coordinator:** owns milestone outcomes, dependencies, delegation of workstream inventories, terminal reconciliation and the next authorized workstream. Keeps owner IDs and scope recorded. Consults evidence for decisions; leaves routine diagnosis, test selection and repair order with the operational owner. Remains idle while that owner advances accepted work; idle stewardship is expected during execution.
- **Operational owner:** carries the entire assigned inventory, selecting internal batches, implementing, checking, reviewing and committing coherent changes, then continuing to the next unresolved item. One implementation task also coordinates its work. Completion of a batch, test family or commit does not require a new assignment.
- **Additional workers:** use only for independently useful responsibilities with clear ownership. Parallel work is most useful for independent investigation or review; coordinate shared writes. Do not add agents just to fill roles.

Proceed through accepted scope under the Approval Delegation Policy. Preserve genuine product, contract, human-acceptance, task-creation and restricted-action boundaries. New user-facing tasks still need applicable creation authority. A named Fable assignment must explicitly authorize direct reports to its registered coordinator; no user relay or repeat permission is needed. This covers the user-authorized sprint coordination, not unrelated contacts.

## Delegate outcomes, then advance

1. **Delegate a complete implementation slice once.** Define its source records/revision, accepted outcome, exclusions and terminal exit. The owner receives the whole slice, including implementation, verification, subagent review and necessary revisions. A smaller delegation needs a concrete authority, dependency or ownership boundary; filename, test count and model choice are not sufficient reasons.
2. **Keep batch decisions local.** The owner selects the next unresolved in-scope item and all internal batches. It may diagnose, repair, check, review, commit and continue without a steward turn. Freeze the initial inventory using the referenced reports and accepted closeouts; include directly caused regressions, but do not absorb unrelated work or later milestones. Preserve in-flight acceptance when broadening the assignment.
3. **Message only when the coordinator is needed.** Permitted triggers are (a) the delegated inventory reaches its terminal exit, with evidence and explicit exclusions; (b) a concrete decision, contradiction, missing authority or external dependency requires coordinator/user action; or (c) the user explicitly requests a report or ownership transfer. Ordinary test failures, successful commits, time checkpoints, internal batch completion and questions the owner can resolve within its authority do not trigger messages. A blocker report states the decision needed, evidence/options, affected work and independent work that can continue.
4. **Prevent reply loops.** Keep routine progress in one local checkpoint and commit history, without cross-task messages or a new closeout document per batch. The steward does not acknowledge internal progress or select the next batch. Late closeouts from superseded small assignments are internal progress, not terminal completion; read if needed, then remain idle. No acknowledgment-of-acknowledgment messages. Deduplicate terminal reports by inventory and commit; respond only with an actionable decision, bounded correction or next authorized workstream.
5. **Reconcile at the terminal boundary.** Compare the inventory dispositions and targeted evidence with the agreed criteria once. Reuse valid checks/reviews; inspect only material gaps. Record exactly what closed and what remains outside the assignment. The owner has no authority to claim later gates complete or silently cross into another milestone. The steward continues the plan when a real transition is reached.

The coordinator may take one bounded startup/status snapshot to confirm work is owned, then end its turn. Do not repeatedly poll an active owner or dispatch an acknowledgment to keep the chat alive. Authorized terminal/decision messages resume the coordinator when needed. No scheduler is implied.

A time checkpoint means preserve a correct, reviewable boundary and name remaining work. It does not mean expand process, weaken acceptance or commit broken work. If only part of a package is complete, record that limit explicitly. Milestone completion, integration and human acceptance remain distinct.

## Verification, review and commits

Apply the repository's proportional workflow budget. Use the nearest useful check during repair and the final implementation-slice selection once; reuse unaffected passing evidence. An inventory delegation does not authorize a full-suite aggregate. A changed shared boundary can invalidate prior checks and requires relevant consumers to be considered. Full suites/builds remain governed by explicit integration or release requirements.

For the rest of this sprint, use these execution rules for local and hosted verification:

- Before execution, state the unresolved question, the smallest relevant test selection/platforms, and which passing results remain valid. Put this briefly in the existing checkpoint or execution update; no new plan or evidence system is required.
- For a bounded correction, continue failed or previously unrun cases. Reuse unaffected passes across commits when the relevant production behavior, contract and test setup remain unchanged. A new commit hash alone does not invalidate evidence. Broaden only for a concrete changed dependency or an explicitly requested integration/pre-merge gate.
- Before a push or dispatch, inspect its effective CI triggers and selected jobs. Select focused execution before publication; automatic workflow behavior is not authorization to run the full gate. Keep complete gates available for explicit integration requests, with their execution mode documented alongside the workflow.
- Distinguish required setup from acceptance: dependency installation, browser preparation and a source build may be necessary for a hosted browser test without authorizing unit, Cloudflare or other unrelated suites.
- Report continuation evidence honestly: name the inherited run, correction revision, focused native titles/platform results and exclusions. A completed failed historical run remains failed; inherited passes plus successful corrections do not constitute a single all-green full run. Stop when the authorized acceptance question is resolved.

Retain independent judgment where contracts, safety or assertion quality warrant it. Default to one scoped review per coherent implementation slice with a meaningful risk boundary, not one review per tiny test group. Re-review the correction and affected boundary when needed. The coordinator verifies acceptance and material gaps rather than acting as another mandatory code reviewer.

For each substantive implementation slice, the owner is explicitly authorized and expected to spawn a scoped review subagent, resolve actionable findings, and obtain affected-boundary re-review when needed before the terminal handover. Review and ordinary revisions stay within the owner task; they do not require steward turns. Purely mechanical status/documentation updates still follow the proportional workflow budget.

At a practitioner-acceptance boundary, prepare a local candidate accessible in an external browser, preflight its content and required controls, and give the user the URL, build/commit identity and short user-facing checklist. Keep the preview available through feedback and provide stop/restart instructions. The user's observations and explicit acceptance are required; automated checks do not supply human acceptance.

Keep implementation, corresponding tests and concise evidence together. The owner maintains one rolling checkpoint/inventory in an existing suitable worker record, or one lightweight Markdown file if none fits, preserving historical evidence. Record identity/disposition, evidence or exclusion, current code tip and next item; do not build a separate tracking system. Update it alongside meaningful implementation commits. The steward updates the canonical roadmap at delegated-inventory completion, an actual decision/dependency change or milestone transition, not per internal batch. An explicitly requested policy/documentation change can have one coherent documentation commit.

## Model and context budget

- **Routine stewardship and straightforward repairs:** start with GPT-6 Sol / Medium. A user's explicit override wins. Apply an authorized model setting through the task controls when supported; prose alone does not change a running model.
- **Complex debugging, semantic contracts or demanding review:** Sol / High is appropriate. Use Astra or higher effort for concrete unresolved ambiguity or material consequences; record a brief reason for the exception. Do not use Extra High simply because a role is called steward.
- **Effort floor within a task:** after increasing a task's reasoning effort, keep that level or higher for every later continuation unless the user explicitly directs a decrease. A new task may still start at a lower setting when its work warrants it. Apply the setting through task controls when available.
- Record the current choice once in the assignment/checkpoint; repeat its rationale only when the choice changes. Assess accepted results and rework on comparable work, not just the speed of one turn. Raw cumulative tokens include repeated and cached input; they are not a bill or an account-quota measurement.
- Read this agreement at role startup, replacement or a material version change. For ordinary continuation, read the compact checkpoint/current assignment and changed evidence sections. Search into detailed plans/contracts as needed; do not reload the full roadmap, prompt pack or transcripts by default.
- Keep one concise **current checkpoint** in the existing plan or linked existing brief: goal and acceptance, authorized scope/limits, active task IDs, worktree/branch/commit, completed evidence and limitations, unresolved decisions and next action. Aim for about 200–350 words with links to detail. Older closeouts remain evidence, not required startup reading.
- Initial delegation briefs may need 300–600 words. Necessary decision/transition messages should usually be 100–200 words; routine batch continuations need no message. These are targets, never reasons to omit acceptance or authorization. Keep standing rules here and broadly applicable repository rules in AGENTS.md; do not duplicate them in every message. Return summaries and evidence paths rather than raw test logs.
- Reuse a task while its work remains coherent. Consider renewal at a substantive milestone/workstream boundary, repeated rediscovery or demonstrated instruction drift. Automatic compaction alone is not a reason to replace it. Save the current checkpoint before renewal; the record must support recovery without the full conversation.

## Reusable prompts

Fill brackets before sending. These templates are entry points, not additional mandatory ceremonies.

### A — onboard or replace any coordinator

```text
Act as [FABLE ROLE] for [AUTHORIZED SCOPE]. Read docs/FABLE-COORDINATION.md, then docs/ROADMAP.md and the authoritative plan's compact checkpoint/current assignment. Resolve paths in [CANONICAL REPOSITORY]. Inspect only relevant new evidence; do not replay historical work.

Own workstream delegation, terminal closeout reconciliation and milestone continuation within accepted authority. Leave the assigned inventory's repair sequence and commits with its owner; remain idle during routine progress. Use Sol / Medium for routine stewardship unless I specify otherwise; justify exceptions. Confirm actual settings when they can be controlled.

Check existing task state before dispatch. Preserve active work and accepted evidence. If replacing a coordinator, register your task ID, transfer the reporting route to active owners with explicit message authority, and obtain acknowledgment before ending the old assignment. Keep one owner per mutable boundary. Finish startup with the delegated inventory owned and its next action clear, not another general planning document.
```

### B — delegate an inventory or change a real boundary

```text
Own [APPROVED WORKSTREAM INVENTORY/OUTCOME] under Fable coordination agreement v3. The authoritative brief is [ABSOLUTE PATH/SECTION/REVISION]; inventory sources and accepted predecessor evidence are [RECORDS/REVISION]. Continue from [WORKTREE/BRANCH/LATEST VERIFIED TIP]. Acceptance, exclusions and terminal exit: [CRITERIA OR PRECISE LINKS]. Preserve [IN-FLIGHT WORK]. Use [MODEL/EFFORT; REASON ONLY IF CHANGED/EXCEPTIONAL].

Choose and execute internal batches yourself. Use targeted checks, retain valid evidence, commit coherent changes and continue to the next unresolved inventory item. Maintain one rolling local checkpoint; do not ask for the next batch, send per-batch closeouts or create per-batch handoff files. The user authorizes direct contact with [COORDINATOR ID/HOST] only for inventory completion, a decision requiring its authority, or an explicitly requested report/transfer. Resolve ordinary failures within your authority. Continue independent authorized work while a real decision is pending. Begin or continue now.
```

### C — reconcile and continue

```text
Classify [REPORT] before responding. If it is ordinary internal progress or a late closeout from a superseded small assignment, do not acknowledge it or dispatch another batch. If it requests a real decision, resolve that decision within your authority or escalate it, preserving independent work. If the delegated inventory is complete, reconcile criteria, dispositions and evidence once; record actual completion/limits and send a necessary correction or the next authorized workstream. Reuse valid checks/reviews. Update the existing checkpoint only for a real decision or transition.
```

## Renewal and adoption without disruption

Keep an in-flight assignment's acceptance intact. An explicitly authorized inventory delegation replaces its old requirement to hand back after that group: finish the group, record evidence locally and continue. A replacement receives the current checkpoint, inventory, relevant contracts and agreement. Transfer ownership and reporting destination; preserve useful workers, commits and evidence. Do not reset a checkout, archive a task or create a roster merely to renew context. If an older worktree lacks this agreement, give its current canonical absolute path; do not merge main solely to read instructions.

The coordinator maintains the plan's current owner identity so templates never depend on a predecessor's hard-coded ID. A replacement inherits only the scope and authority actually assigned to it. New milestone briefing is derived from that milestone's criteria and dependencies, including the current number of implementers. Reuse the compact format; do not copy the previous milestone's team, checks or restrictions blindly.

## Version note and basis

Version 3 supersedes versions 1 and 2. Shorter messages did not prevent version 2's packages shrinking to one-to-five tests, recreating constant reassignment. The control boundary is now a delegated workstream inventory, with explicit message eligibility and local sequencing. The outer FABLE-WORKFLOW-PROMPTS.md remains a discovery pointer. Old task IDs, commits and per-group instructions are historical, not restart or return instructions.

Guidance consulted September 27: [OpenAI best practices](https://learn.chatgpt.com/guides/best-practices), [subagents and reasoning](https://learn.chatgpt.com/docs/agent-configuration/subagents), and [durable project memory](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex). These inform the workflow; this project has no measured optimal package size or token-savings guarantee.
