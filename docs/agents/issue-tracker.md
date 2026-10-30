# Issue tracker: GitHub

The default issue tracker is the public repository `hekmatov/simex-dashboard-v3`. Development and review take place in `hekmatov/simex-dashboard-private`.

Use `--repo hekmatov/simex-dashboard-v3` with `gh` issue commands so the local checkout's private remote does not select the wrong tracker.

- Create: `gh issue create --repo hekmatov/simex-dashboard-v3`
- Read: `gh issue view <number> --repo hekmatov/simex-dashboard-v3`
- List: `gh issue list --repo hekmatov/simex-dashboard-v3`
- Comment: `gh issue comment <number> --repo hekmatov/simex-dashboard-v3`
- Label: `gh issue edit <number> --repo hekmatov/simex-dashboard-v3`
- Close: explain the decision in a comment, then use `gh issue close`.

Use GitHub sub-issues for parent-child relationships and native issue dependencies for blockers when available. Otherwise, record `Part of #<number>` or `Blocked by: #<number>` in the issue body.

When a skill says to publish to the issue tracker, create an issue in V3. When it asks for a ticket, read it from V3 unless the user identifies a different tracker.

## Development and publishing

Implement and merge fixes in the private repository. After a fix is merged into private main, publish the approved private main revision to V3 main when the user explicitly approves that publication. Follow the repository's branch, verification, merge, and push policies.

## Pull requests as a triage surface

**PRs as a request surface: no.**
