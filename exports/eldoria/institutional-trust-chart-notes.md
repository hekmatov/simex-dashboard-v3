# Public trust in institutions: show the decline

Use **paired horizontal bars**: two bars for each institution, one for the 2022 baseline and one for the current scenario briefing. This makes the earlier level and the remaining trust visible together and fits the dashboard's existing Horizontal bar chart type. A dumbbell chart would also work visually, but the current dashboard catalogue does not include that chart type.

The supplied package contains only current levels. The 2022 values below are **fictional exercise assumptions**, added solely to illustrate a moderate decline. Current levels and institution names are preserved exactly from the package. The comparison does not claim a real survey or establish what caused the decline.

| Institution | 2022 baseline | Current briefing | Change |
| --- | ---: | ---: | ---: |
| Ministry of Health | 77% | 69% | −8 pp |
| Regional health authorities | 71% | 62% | −9 pp |
| National government | 67% | 54% | −13 pp |
| Parliament | 55% | 41% | −14 pp |
| International organisations (e.g. WHO) | 66% | 58% | −8 pp |

## Construct the chart

Import `eldoria-institutional-trust-comparison-fictional.csv` and select **Horizontal bar**. Use `Institution` as the observation/category and add **both** `2022 baseline (%)` and `Current briefing (%)` as measurements on the primary axis. Show them side by side, not stacked. Do not include the change column as a third bar series.

- Title: **Public trust in institutions: 2022 and current briefing**.
- Value axis: **Respondents who trust the institution (%)**, fixed at 0–100.
- Legend: **2022 baseline** and **Current briefing**.
- Baseline bars: PDPC cyan. Current bars: PDPC navy. Keep the same colour mapping for every institution, rather than giving every institution its own colour.
- Show percentage labels at the bar ends and retain the full institution names with wrapping.
- Caption: **Fictional exercise data. The 2022 baseline is constructed for comparison; current levels are from the scenario package.**

The CSV stores percentages as numbers from 0 to 100. Change equals current minus baseline in percentage points. The current briefing is left undated because the source table supplies no measurement date; it should not be presented as a completed 2027 annual survey.

## Suggested supporting sentence

> In the exercise comparison, trust has declined across all five institutions since the illustrative 2022 baseline. The largest falls are in Parliament (14 percentage points) and national government (13 points). Health authorities retain comparatively higher trust, despite declines of 8–9 points.

The adjacent text can highlight **Parliament: −14 pp** and **National government: −13 pp**. If the sole purpose is ranking the declines, a separate horizontal change chart using the final CSV column is an alternative; it loses the context of current trust levels.

Source for current values: `SimEx-dashboard-bundle-20260906 (6).json`, source `upload-eldoria-trust-in-government`, originally `eldoria_trust_in_government.csv`. The package is context only. No scenario content in main or in the supplied package has been edited.
