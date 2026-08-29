const TITLE_ALIGNMENTS = new Set(["left", "center", "right"]);
export { chartDescriptionVisible } from "../../charting/presentation/chartCitation.js";

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
