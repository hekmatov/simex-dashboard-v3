# Changelog

SimEx Dashboard uses an application version separate from dashboard configuration, chart, and package schema versions. App releases remain in the `0.x` series until pilot acceptance. Local candidate tags identify validation inputs; published releases require approval and a new immutable release tag.

## 0.2.0-rc.1 — engineering candidate, 9 November 2026

Prepared for local verification and human RC acceptance. Deployment and a real pilot remain separate.

- Save cross-page chart comparisons as reusable Storylines, with a coverage picker and separate View and Present layouts. Opening a Storyline keeps ordinary page content available.
- Use the shared View/Present Time bar for Live/At inspection, scoped playback, elapsed-time seeking, observation coverage and explicit bounded-nearest overrides. Chart authoring exposes saved matching defaults and current-cursor previews.
- Keep Audience on the controller's accepted time and matching state, with passive observation/as-of context and durable, guarded exercise-time advancement.
- Migrate supported older dashboard packages to Version 7 Storylines with an explicit change review, preserve native chart Version 3, and verify whole-package export integrity before import.
- Preserve profile-declared temporal fields when validating migrated legacy charts across loading, catalogue generation and content edits; retain categorical and stale-profile rejection.
- Preserve source attribution on chart outputs, including untitled images and image-load errors, and show the exercise-use notice with the actual application version.
- Improve phone View chart readability, touch targets, fullscreen gestures, deferred mounting and reachable card overflow.
- Clip rehearsal derivatives to explicit publication cutoffs and isolate each PDPC participant variant's sources and assets before building it.
- Include the approved shared Scenario instructions and three saved HeV-A26 cross-page comparisons; keep historical municipality dates and sparse observation/as-of meaning intact.
- Refresh sanitization dependencies, apply the pinned ECharts tooltip security fix and generate script-hash security policies for static and standalone outputs.
- Added recoverable application failure screens and retained saved dashboard bytes when loading the shipped source during recovery.
- Made storage denial visible as a session-only warning and kept Audience failure screens passive.
- Added smoke coverage for every shipped Page in View and Build and for eligible Present content.
- Prepared Windows and Ubuntu source CI, visible app version identity, and a practitioner launch/navigation walkthrough.

## 0.1.0

- Initial pre-pilot application version. Dashboard configuration and package formats carry their own versions.
