# SimEx Dashboard: Direction, Planning, and Deployment Readiness

An outside assessment written on 2026-09-19 after a full pass through the codebase, the test suites, the shipped bundle, and four design exercises (decision surface, preview fidelity, mobile, time cursor). It is opinionated by intent. Sections: what is strong, what puts the goal at risk, the direction I would set, how to plan and run the work, the milestones to "ready for deployment", and what "PDPC would be happy to put their name on it" means in checkable terms.

## What is strong

- **The contracts are real.** Version 6 configuration, Version 3 charts with schema-generated authoring, a validated structure boundary, deterministic package migration, a region registry that ties CSS to owned surfaces, and a density audit that measures geometry. Few prototypes have this; it is why three parallel agents could change the product without breaking each other.
- **Static and offline by design.** No backend, portable packages, a release factory, a service worker. For exercise rooms with unreliable networks this is the right architecture and a genuine differentiator.
- **One renderer for View and Build**, and now one draft projection into the real canvas. Fidelity problems are solvable because there is one source of truth to converge on.
- **Documentation discipline.** Specs, plans, audits, and an operation contract exist and are current enough to plan from. AGENTS.md encodes real operating rules, including a test cadence that keeps development fast.
- **The style grammar.** Four dashboard styles and a colour-profile system that survive across modes and the audience display. This is what makes a PDPC-branded output cheap to produce.

## What puts the goal at risk

1. **The test suites no longer describe the product.** Since the public/main merge, 53 unit tests and most browser journeys assume charts, sections, and sources the shipped dashboard does not have. Gates run for hours and end in fixture drift. Real regressions can hide in that noise, and every contributor, human or agent, re-discovers the drift. This is the single largest risk to shipping with confidence.
2. **Basic commands fail on the shipped content.** `pnpm dev` and `pnpm build` both fail in the pre-dev step because two data sources are browser-uploaded GeoJSON. Anyone cloning the repo hits a wall before seeing the app.
3. **Breadth ahead of depth.** Chrono Groups, Scenes, Quorum companion, PDPC release variants, source content management, static content, multi-fullscreen compare, Present with audience display. Each is real, but the reference bundle has zero Scenes and two Groups, and the two fidelity gaps (editor preview, audience monitor) sat unaddressed in core flows. Exercise staff will judge the tool by whether the core loop is flawless, not by the feature list.
4. **One monolithic bundle and one 40,000-line config file.** Static content and assets inline in `dashboard.json`; every surface in one chunk. It slows phones, bloats diffs, and makes package review hard.
5. **Process weight for a one-person product.** The spec and plan corpus is large relative to the team. Rigor is a strength only if it stays proportional; several audit documents describe the same surfaces, and plans predate the current shipped content.
6. **No evidence from users yet.** I found no record of an exercise run with the tool by moderators who did not build it. Readiness cannot be argued from the codebase alone.

## The direction I would set

Narrow the product to the exercise loop and make each step of it excellent:

1. **Prepare**: an author imports data, builds pages, sets footprints, and sees exactly what participants will see (preview fidelity).
2. **Run**: participants read the situation now and how it evolved (time cursor, attention strip, page time); the moderator presents compositions to the room (Present, faithful monitor, Storylines).
3. **Debrief**: the same Storylines replayed with key moments, and a package export that a report can cite.

Everything else is supporting cast. Concretely: finish the four designs on this branch's documents in this order, stabilise first (below), retire Chrono Groups once Storylines exist, and defer new surfaces until an exercise has been run end to end with the tool.

Two principles worth writing into AGENTS.md:

- **Shipped content is the test fixture.** Tests describe the dashboard that ships, or a committed fixture derived from it, never a historical one.
- **Fidelity over features.** A change that makes any surface show something different from what participants will see is a defect, regardless of how the feature list reads.

## How to define and plan the work

Given a single owner, a budget for model time, and Codex as the implementer, the planning method should be lighter than the current corpus but stricter about exit criteria:

- **One roadmap file** (`docs/ROADMAP.md`) with milestones, each with three to six exit criteria that a stranger can check (a command that passes, a journey that runs, a demo that happened). Everything not on the roadmap is a backlog line, not a spec.
- **One design document per milestone**, at most, in the shape of the fidelity document: problem stated from code evidence, one principle, the design, an inventory of what changes, an implementation order with checks. Skip separate plans when the design already names files and checks; the four documents on this branch are that shape.
- **Agent lanes by ownership, not by feature.** Give each Codex lane files it owns outright and a shared-file protocol (append-only blocks, named owners). The decision-surface branch showed three lanes merging with five small conflicts; that is a repeatable pattern.
- **Verification budget per change**: targeted checks during work, one integration run per merge, full gates only at milestone exit. Keep the ledger outside `test-results` and compare failures against the base commit by name before calling anything a regression.
- **A demo at every milestone** to at least one person who runs exercises, with notes kept in `docs/demos/`. Their sentences are the requirements for the next milestone.
- **Version and change log.** Adopt semantic versions for the package format and the app (`0.x` until deployment readiness), a `CHANGELOG.md` with user-facing lines, and tag releases. PDPC will ask "which version is this?" on day one.

## Milestones to "ready for deployment"

### M0: Stable ground (first)

Exit criteria:

- A committed test dashboard fixture under `tests/fixtures/`, loaded by the e2e harness; every unit test and journey rewritten against it or deleted with a reason. `pnpm test` passes; the three e2e suites pass on chromium in under 30 minutes.
- `pnpm dev`, `pnpm build`, and `pnpm build:cloudflare` all succeed on a fresh clone of the shipped content.
- Continuous integration on every push (GitHub Actions on Windows and Ubuntu) running unit, build, and the source e2e suite, with the reporter ledger as an artefact.
- Build and Present code-split from View; View's entry chunk under a stated budget.
- No blank screens: an application-level error boundary with recovery text, and a smoke journey that loads every page in View, Build, and Present.

### M1: Fidelity

The preview-fidelity design shipped: authoring stage at true size, audience monitor as a stream of real display snapshots, declared presentation resolution. Exit: the two fidelity journeys pass; a moderator confirms on a projector that the monitor matches the room.

### M2: Time and story

The time cursor design and the Storyline model shipped: live and at modes, the Time bar and scrubber, chart-owned sync, cross-page Storylines saved from compare, coverage picker, Groups retired in a Version 7 migration. Exit: the reference exercise's three most-wanted comparisons exist as Storylines and play on the audience display.

### M3: Exercise rehearsal

A full mock exercise run by PDPC staff who did not build the tool: prepare, run for a day, debrief. Exit: a findings list, every blocking finding fixed, an accessibility pass (keyboard-only operation of View and Present, screen-reader announcements for time changes, contrast at AA in all four styles), a performance budget met on the least capable machine PDPC will use, and the mobile Option 1 tasks done.

### M4: Deployment readiness

Exit criteria, each a document or a check:

- **Security and privacy statement**: static hosting, no telemetry, no data leaves the machine except by explicit export; a content security policy on the Cloudflare output; dependency audit clean; the exercise-use disclaimer on every surface that can be photographed.
- **Data governance**: every chart shows provenance and time; packages carry a checksum and version; the import review names everything that changes.
- **Documentation set**: quick start for authors, moderator runbook for the room (including the second-screen setup and what to do when the audience display disconnects), maintainer guide (build, release, rollback), and a one-page "what this tool is and is not".
- **Support plan**: who fixes what, within what time, for the exercise season; a known-issues list; a rollback path to the previous release.
- **Branding approval**: PDPC sign-off on name, logo use, colour profile, and disclaimer wording; the PDPC release variant produced by the release factory from a tagged version.
- **A pilot**: one real exercise on the deployed release, findings triaged, and the release re-tagged as 1.0.

## What "PDPC would be happy to put their name on it" means

In checkable terms, and roughly in the order participants will notice:

1. It never shows a blank screen or a stale number without saying so.
2. Every number on screen carries its source and its time, and the room's display shows the same thing the moderator sees.
3. It looks like one product: one style, consistent controls, sentence-case copy, no developer vocabulary in the interface.
4. It works offline in the room and on the machines PDPC actually has.
5. Anyone on the exercise staff can run it from the runbook without the author present.
6. It is honest: exercise-use disclaimers, fictional-data labelling, and a version number on the screen.
7. It is maintained: green gates, a changelog, and a person who answers.

The codebase is closer to this than its test results suggest. The gap is not capability; it is stabilisation, fidelity, and one real exercise. Do those three, in that order, before adding anything new.
