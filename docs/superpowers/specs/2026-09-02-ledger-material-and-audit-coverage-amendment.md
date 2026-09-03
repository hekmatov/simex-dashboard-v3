# Ledger Material and Audit Coverage Amendment

**Date:** 2026-09-02
**Status:** User-approved; implementation authorized
**Parent contracts:**

- `docs/superpowers/specs/2026-09-02-dense-desktop-visual-audit-redesign.md`
- `docs/superpowers/specs/2026-09-02-cross-style-audit-audience-distance-amendment.md`

## Outcome

Ledger uses horizontal ruling as a selective register material, not as a universal background. The visual audit separately proves journey reachability and owned visual-region coverage so that persistent nested chrome, including the Build command bar, cannot be omitted while the audit still reports complete coverage.

## Ledger material contract

Repeating horizontal ruling is permitted only on current data-register surfaces:

- the Source Viewer table wrapper; and
- chart table views.

A future surface may receive repeating ruling only through an explicit `ledger-register` material declaration in the owned-region registry. A semantic role alone never implies a ruled background.

All other Ledger surfaces use clean, flat paper:

| Surface family | Ledger treatment |
| --- | --- |
| Shells and workspaces | Flat paper with structural single dividers |
| Panels | Flat paper with register-like framing, never repeating ruling |
| Editors and forms | Flat paper with single section dividers |
| Dialogs and drawers | Flat framed paper |
| Menus and popovers | Flat compact paper |
| Status, warning, and recovery regions | Flat band with one boundary rule |
| Command bars, navigation bars, and action docks | Flat command band with one top or bottom rule |
| Chart panels, chart cells, and chart canvases | Clean data field; chart-owned gridlines are the only repeated rules |
| Present and Audience output | Clean presentation field without paper ruling |

Ledger remains identifiable through square or near-square contours, serif display and data typography, flat elevation, compact register labels, strong single dividers, and precise borders. Present may retain the existing single selected-chart top rule; it must not retain a repeating paper background.

## Two-layer audit model

The historical 71-entry catalogue is reclassified as the **journey/state manifest**. It proves that required workflows, transient states, viewports, aliases, and exclusions can be reached. It is not a census of every visual region mounted inside those journeys.

A separate **owned surface-region registry** is the coverage authority for visual surfaces. Each region record declares:

- a stable region ID;
- production component owner;
- live selector or production data marker;
- semantic visual role;
- material capability, including whether `ledger-register` is permitted;
- persistent, conditional, or portal lifecycle;
- parent journey witnesses;
- style-witness requirement; and
- an optional bounded exclusion with owner and reason.

At minimum the role vocabulary includes `shell`, `command-bar`, `panel`, `editor`, `dialog`, `drawer`, `menu`, `status`, `table`, and `chart-cell`. Role describes the region's operational function; material describes how the selected style paints it. The two concepts must not be collapsed into one property.

The `command-bar` family covers persistent operational chrome rather than one Build-only exception. Its current members include the global dashboard command crown, the Build command header, Build page navigation, View playback controls, and the Present action dock or controller. Status content inside chrome remains a separately owned `status` region when it has an independent boundary and lifecycle.

## Region-closure sentinel

The audit collector must independently discover visible region candidates inside the selected journey root and active portals. Candidate signals include:

- named `section`, `header`, `nav`, `aside`, and equivalent structural regions;
- toolbar or navigation containers;
- sticky or fixed operational chrome;
- paint-bearing containers with a distinct background, border, or elevation;
- containers that own multiple direct actions; and
- visible dialogs, drawers, menus, popovers, status regions, tables, and chart cells.

Every candidate must be contained by exactly one registered region boundary or carry a bounded, owner-specific non-surface exemption. The collector reports the following as coverage failures:

- `UNOWNED`: a significant visible candidate has no region owner;
- `AMBIGUOUS`: a candidate belongs to more than one conflicting region boundary;
- `MISSING`: a required registered region is not present after its witness journey setup;
- `UNWITNESSED`: a registered region has no reachable journey witness; or
- `UNSTYLED`: a role-bearing region has no shared style/material treatment.

Candidate discovery must be independent of the registry it validates. A handwritten list may seed expected regions, but it cannot be the only source used to claim completeness.

Structural labels and roles may be used as discovery signals. This does not add keyboard, focus, tab-order, screen-reader, ARIA-quality, or assistive-technology checks to the visual contract.

## Evidence and accounting

Audit evidence is recorded at two levels:

1. **Journey evidence:** setup result, viewport, state, root geometry, and screenshot reachability.
2. **Region evidence:** owner, role, material, bounding geometry, style signature, containment, spacing, and visual finding provenance.

The historical `71 × 3 = 213` matrix remains valid only as journey/style execution accounting. It must not be described as exhaustive surface coverage. Complete style accounting is generated from distinct reachable region variants multiplied by the three styles, with aliases and exclusions shown separately.

For every applicable region variant, the audit checks:

- ownership and journey witness closure;
- shared geometry invariance across Ledger, Humanist, and Instrument;
- contour, typography, material, separator, and elevation signature;
- role-appropriate spacing, alignment, wrapping, occupancy, clipping, and overflow;
- visible text/control clearance of at least the nearest painted-edge depth plus 4px, measured independently on all four logical edges;
- boundary separation from adjacent regions;
- operational contrast and human-visible label/state meaning; and
- absence of inherited style leakage across portals and nested theme roots.

## Deterministic contract checks

Before deferred browser capture, deterministic tests must prove:

- every registered region has exactly one owner, role, lifecycle, and material policy;
- every required region has at least one declared journey witness;
- every journey references only known regions;
- every role-bearing production marker maps to a registered region;
- every shared grammar selector or marker maps back to a registered region;
- candidate classification detects an unregistered named, paint-bearing command bar;
- edge-clearance classification rejects a 3px Instrument rail with content beginning at 3px and a 1px Ledger border with content beginning at 4px, while accepting an 8px inset;
- edge-clearance exemptions apply only to the explicitly named full-bleed edge;
- generic role/material/painted-boundary markers discover decorated surfaces without chart- or feature-specific class-name rules, while transparent borders and unrelated shadows remain excluded;
- the live Build command header is registered as persistent `command-bar` chrome;
- the Ledger repeating background resolves only for `ledger-register` regions; and
- shell, command-bar, panel, editor, dialog, drawer, menu, status, and chart-cell Ledger backgrounds resolve without repeating ruling.

Browser/E2E capture and rendered cross-style sign-off remain deferred until the user closes the amendment batch.

## Acceptance

This amendment is ready for local review when:

- Ledger ruling appears only on Source Viewer and chart table registers;
- chart data fields, command chrome, workspaces, overlays, Present, and Audience are visibly free of repeating paper lines;
- the Build command header consumes the shared `command-bar` style grammar;
- the journey manifest and region registry are distinct sources with distinct accounting;
- the independent sentinel would reject the pre-amendment unowned Build command header;
- stale claims that 71 journeys or 213 journey/style cells constitute complete visual-region coverage are corrected; and
- the targeted deterministic contract selection passes without running the deferred browser/E2E suite.
