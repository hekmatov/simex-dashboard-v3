# Changelog

SimEx Dashboard uses an application version separate from dashboard configuration, chart, and package schema versions. App releases remain in the `0.x` series until pilot acceptance. This file records user-visible changes; a tagged release will be created only at an approved release boundary.

## Unreleased

- Added recoverable application failure screens and retained saved dashboard bytes when loading the shipped source during recovery.
- Made storage denial visible as a session-only warning and kept Audience failure screens passive.
- Added smoke coverage for every shipped Page in View and Build and for eligible Present content.
- Prepared Windows and Ubuntu source CI, visible app version identity, and a practitioner launch/navigation walkthrough.

## 0.1.0

- Initial pre-pilot application version. Dashboard configuration and package formats carry their own versions.
