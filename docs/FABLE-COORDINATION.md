# Fable sprint coordination agreement

Version 2 · 27 September 2026 · adopted by user instruction.

Applies to every Fable dashboard planning steward, high-level coordinator, milestone owner and replacement in those roles. This is the canonical workflow; [ROADMAP.md](ROADMAP.md) locates the authoritative product plan and current assignment. Product criteria, explicit user decisions and repository approval/verification policies govern. This agreement supersedes the earlier Fable instructions to hand back after every small repair, repeatedly reproduce the operating rules, or report only to the user.

## Roles and authority

- **Steward or high-level coordinator:** owns milestone outcomes, dependencies, package assignments, reconciliation and the next authorized action. Keeps the current planning owner and operational owner recorded in the plan. Reads evidence needed for a decision; leaves routine diagnosis and sequencing with the operational owner.
- **Operational owner:** owns a complete bounded work package, including implementation, internal repair order, coherent commits, verification and proportionate review. With one implementation task, this owner also coordinates; a separate coordinator adds no required role.
- **Additional workers:** use only for independently useful responsibilities with clear ownership. Parallel work is most useful for independent investigation or review; coordinate shared writes. Do not add agents just to fill roles.

Proceed through accepted scope under the Approval Delegation Policy. Preserve genuine product, contract, human-acceptance, task-creation and restricted-action boundaries. New user-facing tasks still need applicable creation authority. A named Fable assignment must explicitly authorize direct reports to its registered coordinator; no user relay or repeat permission is needed. This covers the user-authorized sprint coordination, not unrelated contacts.

## Delegate outcomes, then advance

1. **Choose a coherent package.** Derive it from the current milestone criteria, dependencies and latest closeout. Usually group two or three related repairs sharing context and a useful outcome; this is a starting heuristic, not a quota. Split at a genuine contract, ownership or risk boundary. Do not use a test count as the definition of done.
2. **Delegate internal sequencing.** State the accepted outcome, writable scope, code baseline, evidence, exit and escalation conditions once. The owner may diagnose, implement, verify, commit and move to the next internal step without a steward turn. Finishing one test group or commit does not end the package. Work outside the package requires a new assignment.
3. **Report at meaningful boundaries.** Send a direct package closeout or material blocker. Include a changed product assumption or evidence-invalidating discovery promptly. Avoid routine acknowledgments, repeated unchanged blockers and stop/restart messages after every internal repair.
4. **Reconcile once.** Compare the outcome and evidence with the agreed criteria. Check missing or ambiguous evidence selectively. Do not routinely reread the implementation or repeat a completed review. Deduplicate by package and commit. Return a bounded correction if needed; otherwise record the supported result and dispatch the next authorized package.
5. **Keep progress owned.** End with an active owner, a next assignment sent, or a concrete decision/blocker with its owner. While actively following work, use bounded native waits with cursors. After the coordinator's turn ends, the owner's authorized message can start the next turn. This is a handoff arrangement, not a scheduled monitor.

A time checkpoint means preserve a correct, reviewable boundary and name remaining work. It does not mean expand process, weaken acceptance or commit broken work. If only part of a package is complete, record that limit explicitly. Milestone completion, integration and human acceptance remain distinct.

## Verification, review and commits

Apply the repository's proportional workflow budget. Use the nearest useful check during repair and the final package-specific selection once; reuse unaffected passing evidence. A changed shared boundary can invalidate prior checks and requires the relevant consumers to be considered. Full suites/builds remain governed by explicit integration or release requirements.

Retain independent judgment where contracts, safety or assertion quality warrant it. Default to one scoped review per coherent implementation slice with a meaningful risk boundary, not one review per tiny test group. Re-review the correction and affected boundary when needed. The coordinator verifies acceptance and material gaps rather than acting as another mandatory code reviewer.

Keep implementation, corresponding tests and concise evidence together. Update the roadmap at package completion, a changed dependency/decision or milestone transition. Batch routine planning edits with the next substantive planning update; do not produce separate status, closure or ledger commits for each internal repair. An explicitly requested policy/documentation change can have one coherent documentation commit.

## Model and context budget

- **Routine stewardship and straightforward repairs:** start with GPT-6 Sol / Medium. A user's explicit override wins. Apply an authorized model setting through the task controls when supported; prose alone does not change a running model.
- **Complex debugging, semantic contracts or demanding review:** Sol / High is appropriate. Use Astra or higher effort for concrete unresolved ambiguity or material consequences; record a brief reason for the exception. Do not use Extra High simply because a role is called steward.
- Record the current choice once in the assignment/checkpoint; repeat its rationale only when the choice changes. Assess accepted results and rework on comparable work, not just the speed of one turn. Raw cumulative tokens include repeated and cached input; they are not a bill or an account-quota measurement.
- Read this agreement at role startup, replacement or a material version change. For ordinary continuation, read the compact checkpoint/current assignment and changed evidence sections. Search into detailed plans/contracts as needed; do not reload the full roadmap, prompt pack or transcripts by default.
- Keep one concise **current checkpoint** in the existing plan or linked existing brief: goal and acceptance, authorized scope/limits, active task IDs, worktree/branch/commit, completed evidence and limitations, unresolved decisions and next action. Aim for about 200–350 words with links to detail. Older closeouts remain evidence, not required startup reading.
- Initial package briefs may need 300–600 words. Routine continuation messages should usually be 100–200 words: identify the current brief, changed scope/baseline and return route. These are targets, never reasons to omit acceptance or authorization. Keep standing rules here and broadly applicable repository rules in AGENTS.md; do not duplicate them in every message. Return summaries and evidence paths rather than raw test logs.
- Reuse a task while its work remains coherent. Consider renewal at a substantive milestone/workstream boundary, repeated rediscovery or demonstrated instruction drift. Automatic compaction alone is not a reason to replace it. Save the current checkpoint before renewal; the record must support recovery without the full conversation.

## Reusable prompts

Fill brackets before sending. These templates are entry points, not additional mandatory ceremonies.

### A — onboard or replace any coordinator

```text
Act as [FABLE ROLE] for [AUTHORIZED SCOPE]. Read docs/FABLE-COORDINATION.md, then docs/ROADMAP.md and the authoritative plan's compact checkpoint/current assignment. Resolve paths in [CANONICAL REPOSITORY]. Inspect only relevant new evidence; do not replay historical work.

Own package assignment, direct closeout reconciliation and continuation within accepted authority. Let operational owners sequence internal repairs. Use Sol / Medium for routine stewardship unless I specify otherwise; justify exceptions. Confirm actual settings when they can be controlled.

Check existing task state before dispatch. Preserve active work and accepted evidence. If replacing a coordinator, register your task ID, transfer the reporting route to active owners with explicit message authority, and obtain acknowledgment before ending the old assignment. Keep one owner per mutable boundary. Finish startup with the current package owned and its next action clear, not another general planning document.
```

### B — assign a package or send a concise continuation

```text
Own [PACKAGE OUTCOME] under the Fable coordination agreement. The authoritative brief is [ABSOLUTE PATH/SECTION/REVISION]; code starts at [WORKTREE/BRANCH/COMMIT]. Accepted scope and exit: [CRITERIA OR PRECISE LINKS]. Changed scope/baseline since your last assignment: [DELTA]. Internal steps you may sequence without handback: [RELATED WORK]. Escalate [REAL CONTRACT/OWNERSHIP/AUTHORITY BOUNDARIES]. Use [MODEL/EFFORT; REASON ONLY IF CHANGED/EXCEPTIONAL].

Use the brief's targeted checks and retain valid prior evidence. Commit coherent internal slices; continue until package completion or a material blocker. The user authorizes direct closeout/blocker messages to [COORDINATOR TASK ID/HOST]. Send outcome, commit/worktree, evidence path and limits, unresolved decisions and remaining work. Preserve other owners' edits. Begin the authorized work.
```

### C — reconcile and continue

```text
Reconcile [PACKAGE/COMMIT/CLOSEOUT] against its accepted criteria. Read only the changed evidence needed to resolve gaps. Record partial versus complete scope accurately; retain valid checks and resolved reviews. Update the existing current checkpoint. Send a bounded correction or the next eligible package to the appropriate authorized owner, with direct reporting authority. Ask only for a concrete missing decision. Routine internal progress does not require this reconciliation cycle.
```

## Renewal and adoption without disruption

Apply this agreement at the next coherent boundary. Keep an in-flight assignment's acceptance intact; broader autonomy starts with an explicitly defined package. A replacement receives the current checkpoint, relevant contracts, latest closeout and operating agreement. Transfer both task ownership and reporting destination; preserve useful workers, commits and evidence. Do not reset a checkout, archive a task or create a new roster just to renew context. If an older worktree lacks this agreement, provide its current canonical absolute path; do not merge main solely to read instructions.

The coordinator maintains the plan's current owner identity so templates never depend on a predecessor's hard-coded ID. A replacement inherits only the scope and authority actually assigned to it. New milestone briefing is derived from that milestone's criteria and dependencies, including the current number of implementers. Reuse the compact format; do not copy the previous milestone's team, checks or restrictions blindly.

## Version note and basis

Version 2 replaces the September 27 version 1 prompt pack after observed successful handoffs exposed excessive per-repair coordination. The existing outer FABLE-WORKFLOW-PROMPTS.md remains a discovery pointer. Historical task IDs, baseline commits and slice assignments in old messages are not restart instructions.

Guidance consulted September 27: [OpenAI best practices](https://learn.chatgpt.com/guides/best-practices), [subagents and reasoning](https://learn.chatgpt.com/docs/agent-configuration/subagents), and [durable project memory](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex). These inform the workflow; this project has no measured optimal package size or token-savings guarantee.
