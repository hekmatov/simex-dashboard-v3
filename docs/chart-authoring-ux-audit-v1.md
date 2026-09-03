# Chart authoring UX audit v1

**Audited:** 2026-09-03  
**Scope:** Version 3 chart creation, editing, and conversion. This report is based on the live schema registry, form model, preparation pipeline, authoring components, and focused test catalogue.

## Executive findings

1. **Duplicate observations block creation without a fix-oriented explanation.** The preparation pipeline detects duplicate mark keys and reports a count, but the authoring UI presents the resulting diagnostic as a generic preview failure. An author who selects the `Adherence to public health measures` rows has to infer that filtering `behaviour type = adherence` and one date will produce one observation per intended mark. This is a creation blocker.
2. **Axis chart roles use domain words without chart-specific consequences.** `Cluster` and transformation `Grouping` are especially easy to conflate. In the data pipeline, cluster separates series/marks; grouping changes how input rows are consolidated before marks are made. The form gives neither field a concrete explanation or example.
3. **Labels are exposed for every schema that declares a labels section, even when the renderer does not have a meaningful visible data-label treatment.** The generic editor presents `Labels` without identifying whether it controls mark labels, composition labels, tooltip text, or no visible result. The temporal-axis `Label format` setting is only shown when temporal but does not explain that it changes x-axis tick text—not source values or hover formatting.
4. **The creation type switch and edit conversion differ in quality.** Edit conversion has a planning/confirmation path, preserves same-id compatible role bindings, transformations, presentation settings, source, and layout, then lists removed settings. The new-chart type switch calls `applyChartTypeSelection`, which only retains target role IDs and target appearance configuration: it drops transformation state and compatible fields are not surfaced as a retained/remapping summary. This violates the expected preserve-compatible rule.
5. **Conversion copy exposes implementation paths rather than author outcomes.** The conversion dialog says `roles.cluster` and “Role is not valid,” instead of naming the chart role and explaining the visual consequence. It also does not distinguish retained source, filters, aggregation, and label/axis settings from selections requiring attention.

## Evidence and data-flow map

| Area | Current evidence | Consequence |
| --- | --- | --- |
| Type schemas | `src/charting/schemas/chartSchemaRegistry.js` declares roles, sections, transforms, and capabilities for 28 chart types. | The registry is the correct single source for progressive disclosure. |
| Form model | `src/charting/forms/formModel.js` materializes all schema roles and generic `Labels`; transformations are schema-gated. | Controls can be given per-role/per-chart help without ad hoc component branches. |
| Axis preparation | `prepareAxisData.js` computes a key from observation, measurement, cluster, label, and grouping. | Cluster and grouping have distinct, explainable semantics; duplicates are a measurable data-shape condition. |
| Readiness and preview | `prepareChartData.js` produces diagnostics, duplicate count, row counts, and renderable mark count; `ChartPreview.jsx` shows only messages. | A diagnostic can point directly to Filters/Grouping/Aggregation rather than leaving the author at a dead end. |
| New-chart selection | `chartCatalogue.js:applyChartTypeSelection()` retains roles and appearance keys only. | Filters, aggregation, duplicate strategy, missing-value strategy, and compatible presentation can be silently cleared. |
| Edit conversion | `chartConversion.js` plans preserved roles, required remapping, and removals before atomic conversion. | The right safety pattern exists but needs plain-language summaries and alignment with creation. |

## Chart-type / authoring-control matrix

`*` means required. “Always” means each data-backed chart supports Filters, Aggregation, duplicate resolution, and missing-value handling unless the schema says otherwise.

| Types | Required roles; optional roles | Relevant controls and why | Labels, axes, interactions |
| --- | --- | --- | --- |
| Bar, grouped bar, stacked bar, horizontal bar, horizontal stacked bar | Measurements*, Observation/X-axis*; Cluster, Label | Filters limit rows to the intended subject/date; Grouping consolidates rows; Cluster splits a category into visual series; Aggregation/duplicate resolution handle multiple values per final mark. | Labels and axes; zoom/time sync. Label format only when Observation is temporal. |
| Line, area, mixed axis | Measurements*, Observation/X-axis*; Cluster, Label | Same as bars; measurements may use primary/secondary axes. Mixed axis also needs line/bar and width choices. | Labels, axes, zoom/time sync. Temporal tick format is meaningful only for a temporal observation. |
| Pie, donut | Category*, Value* | Filters and aggregation determine the included whole; grouping consolidates categories before slices. | Labels are slice labels/values; no axes or zoom. |
| KPI, gauge | Value*; Target, Entity, Label, Time | Filters/aggregation must reduce data to the intended current value; entity/time can provide context or synchronized time. | Labels, targets/thresholds, collection (where supported), time sync; no axes. |
| Bullet (retired from new authoring, still editable) | Actual*, Target*; Entity, Label, Time | Same target-data reduction, plus paired actual/target. | Labels, targets, collection, time sync; no axes. |
| Delta card, delta list | Measurement*, Time*; Entity/Target (entity required for list) | Filters and comparison transformation select and compare the correct time values. | Labels, targets, time sync; collection only for list; no axes. |
| Scatter, bubble | X*, Y*; Size, Label, Cluster | Filters/grouping define point population; Cluster creates visual series; Size changes bubble area. | Labels and numeric axes, zoom; no time sync unless a supported temporal mapping exists. |
| Heatmap, readiness matrix | Row*, Column*, Value*; Time | Filters/grouping determine each cell; duplicate resolution/aggregation must result in one value per row-column-time cell. | Labels, no axis editor, time sync. |
| Timeline, swimlane | Event*, Start*; End, Lane, Status | Filters/grouping determine events; lane/status organize event display rather than numeric aggregation. | Labels, timeline settings, time sync; no axes. |
| Choropleth, chrono choropleth, map scatter | Geography*, Value*; Time (* for chrono) | Filters/grouping define geographic values; GeoJSON source and matching property are required before rendering. | Labels, map scale/join, time sync; no axes. |
| Table | Columns*; Time | Filters/aggregation reduce or summarize rows; selected columns are the displayed result. | Labels; no axes/zoom. |
| Image, free text | No chart-data roles | Appearance/content authoring only. | Labels section should be hidden unless it has a visible renderer effect; no data transforms, axes, or interactions. |

## Recommended changes

| Priority | Change | Confidence | Acceptance criterion |
| --- | --- | --- | --- |
| P0 | Add an actionable duplicate-observation diagnostic that states the duplicate count, explains the “one value per final mark” requirement, and directs the author to Filters, Grouping, or Aggregation. Include remaining-row and intended-key context when available. | High | A duplicate stacked-bar preview explains why it cannot render/save and tells the author what type of filter or consolidation will resolve it. |
| P0 | Preserve compatible source, role bindings, filters, aggregation, duplicate/missing strategies, and compatible presentation when a new draft changes type. Report the small set of removed or remapping-required choices. | High | Changing line ↔ bar/stacked bar keeps Measurements, Observation, source, Filters, and compatible transforms; no compatible value silently disappears. |
| P0 | Make edit conversion summaries author-readable: role labels rather than path keys; explicitly list source/roles/transforms that remain; keep required remapping and removals distinct. | High | A conversion review tells an author what remains, what is removed, and why—with no implementation-path language. |
| P1 | Attach chart-specific role help, starting with axis charts: Measurement (value), Observation (one mark position/category), Cluster (separate visual series), Label (optional displayed/tooltip text), and Grouping (combine rows before rendering). | High | Line, bar, grouped bar, and stacked bar each explain role behavior and show that Cluster is not Grouping. |
| P1 | Make Labels progressive: show it only where the renderer applies it, name its target (marks/slices), and clarify temporal `Label format` as x-axis tick formatting. Keep hover date/time separate. | High | No irrelevant labels control appears; temporal axis examples distinguish tick labels from hover text. |
| P1 | Include schema descriptions in chart-type cards so an author can compare purpose before selecting. | Medium | Type cards show a plain-language purpose in addition to name and compatibility. |
| P2 | Add direct links/focus from creation issues to affected data controls. | Medium | A duplicate diagnostic’s action takes the author to the Filters/Grouping section. |

## Deferred ambiguity

- Whether axis-chart `Label` should affect only tooltips, visible marks, or both needs a renderer-level product decision; this audit will not invent a visible-label behavior.
- The desired aggregation default for public-health datasets is not known. The implementation will explain the decision and retain an author’s choice rather than silently defaulting to a potentially misleading sum/mean.
- Axis chart `Cluster` has a well-defined data meaning, but whether grouped and stacked variants should use an identical series key or different renderer vocabulary is an information-design choice. The implementation uses consistent role language and chart-specific examples without changing render semantics.

## Implementation summary

Implemented in the follow-on authoring slice:

- New-chart compatible type changes now reuse the existing conversion contract, preserving the source, compatible role bindings, filters, aggregation, duplicate strategy, missing-value strategy, presentation, and layout. Incompatible target roles still require remapping rather than being guessed.
- Every schema-generated data role now has plain-language help. Axis charts explicitly distinguish Measurements, Observation/X-axis, Cluster, Label, and Grouping; filter guidance includes the public-health subject/date use case.
- Duplicate blockers now state the one-value-per-final-mark rule and name the available routes: Filters, Grouping, Aggregation, or duplicate resolution. The editable duplicate field repeats that context.
- Labels are hidden for image and free-text types with no chart-data marks. Other label help explains its visible target and that labels do not create series or change values. Temporal axis help separates tick `Label format` from hover date/time format.
- Chart type cards now show the schema’s purpose description. The edit conversion dialog uses author-facing setting names (for example, “Axis settings”) instead of implementation paths.

Focused verification passed:

```text
node --test tests/wizardDraftV3.test.js tests/chartDataPipelineV3.test.js tests/chartFormModelV3.test.js tests/chartConversionV3.test.js tests/chartCatalogueSelection.test.js
# 133 passed

node --test tests/chartAuthoringComponentsV3.test.js
# 102 passed
```
