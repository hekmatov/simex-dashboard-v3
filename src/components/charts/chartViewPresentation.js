const TITLE_ALIGNMENTS = new Set(["left", "center", "right"]);
export { chartDescriptionVisible } from "../../charting/presentation/chartCitation.js";

export function titleAlignment(chart) {
  const align = chart?.presentation?.title?.align;
  return TITLE_ALIGNMENTS.has(align) ? align : "left";
}

export function titleContainerProps(chart) {
  const align = titleAlignment(chart);
  return {
    "data-title-align": align,
    style: { textAlign: align },
  };
}
