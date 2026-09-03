# Chart authoring control audit

## Scope

This audit traces each chart type from the authoring form through preparation and its renderer. A control is retained only when its change has a visible or semantic effect on that chart. The automated contract covers all 27 registered chart types, including the two static content types.

## Findings and corrections

| Chart family | Finding | Correction |
| --- | --- | --- |
| Axis charts | Label visibility, position, and format are all rendered. | Retained all three label controls. |
| Pie and donut | Only label visibility is rendered; position and format were inert. | Expose only the visibility control. |
| Scatter and bubble | The form offered label controls but the renderer ignored them. | Render the Label role beside points when enabled, with the chosen position. |
| KPI and delta cards | A mapped target was only announced to assistive technology. Direction was not reflected consistently in card status styling. | Show the target on the card. Delta cards now use favorable, unfavorable, or neutral styling based on the configured direction. |
| Gauge | Status-band endpoints colour the dial, but target direction had no effect and the mapped target was not shown. | Expose only status-band upper limits, explain their visual effect, and show the target in the gauge detail. |
| Bullet | The target role already renders as a target marker; target ranges and direction do not apply. | Remove those inapplicable controls. |
| Heatmap and readiness matrix | Heatmaps can show values in cells; readiness matrices always show their categorical values. Position and format controls were inert. | Heatmaps retain only label visibility; readiness matrices expose no label configuration. |
| Timeline and swimlane | The Timeline lanes and marker settings were inert. Lane and Status roles were described as visual but were not consistently rendered. | Remove the inert settings. Assigned lanes create rows for either timeline type; status values create coloured series and a legend when more than one status is present. |
| Maps | GeoJSON source and join field are effective Data choices. The separate scale setting was persisted but never read by the renderer. | Keep source and join mapping in Data and remove the inert scale control and default value. |
| Tables and static content | Generic label configuration did not alter the rendered table, image, or text. | Remove the inapplicable label section. |

## Data mapping and preparation

Every data-backed chart retains chart-specific visual explanations for each role. The existing duplicate blocker remains part of the contract: it names the colliding mapped roles and leaves the resolution control in the same step, rather than blocking save with a generic preview failure.

## Regression contract

`tests/chartFormModelV3.test.js` names the permitted Label, Target, Map, and Timeline controls for every registered chart type. The rendering and component tests additionally verify the visible gauge target, card target/favorability, relationship labels, and timeline lanes/statuses. Adding a control that no renderer honors, or removing a supported control, fails the audit.
