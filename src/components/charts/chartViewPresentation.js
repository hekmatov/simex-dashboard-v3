const TITLE_ALIGNMENTS = new Set(["left", "center", "right"]);
const AUDIENCE_DISTANCE_LARGE = Object.freeze({
  tier: "distance-large",
  title: 28,
  text: 18,
  value: 40,
});
const AUDIENCE_DISTANCE_GRID = Object.freeze({
  tier: "distance-grid",
  title: 24,
  text: 16,
  value: 34,
});
export { chartDescriptionVisible } from "../../charting/presentation/chartCitation.js";

export function resolveAudiencePresentationScale(surface, displayedCount) {
  if (
    surface !== "audience"
    || !Number.isInteger(displayedCount)
    || displayedCount <= 0
    || displayedCount > 4
  ) return null;
  return displayedCount <= 2 ? AUDIENCE_DISTANCE_LARGE : AUDIENCE_DISTANCE_GRID;
}

export function titleAlignment(chart) {
  const align = chart?.presentation?.title?.align;
  return TITLE_ALIGNMENTS.has(align) ? align : "left";
}

export function chartTitleVisible(chart) {
  return chart?.presentation?.title?.visible !== false;
}

export function chartTitleClassName(chart) {
  return chartTitleVisible(chart)
    ? "chart-view-title"
    : "chart-view-title chart-view-title--visually-hidden";
}

export function titleContainerProps(chart) {
  const align = titleAlignment(chart);
  return {
    "data-title-align": align,
    style: { textAlign: align },
  };
}
