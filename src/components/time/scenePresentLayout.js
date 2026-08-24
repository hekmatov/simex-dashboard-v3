const DISPLAY_LAYOUT_BY_SCENE_LAYOUT = Object.freeze({
  single: Object.freeze({ count: 1, layout: "solo" }),
  "vertical-divider": Object.freeze({ count: 2, layout: "sideBySide" }),
  "horizontal-divider": Object.freeze({ count: 2, layout: "overUnder" }),
  "large-left": Object.freeze({ count: 3, layout: "leftFocus" }),
  "large-top": Object.freeze({ count: 3, layout: "topFocus" }),
  "grid-2x2": Object.freeze({ count: 4, layout: "grid2x2" }),
});

export function scenePresentLayoutToDisplayLayout(sceneLayout, chartCount) {
  const mapping = DISPLAY_LAYOUT_BY_SCENE_LAYOUT[sceneLayout];
  if (!mapping || mapping.count !== chartCount) {
    throw new Error(
      `Scene Present layout "${String(sceneLayout)}" is unsupported for ${chartCount} charts.`,
    );
  }
  return mapping.layout;
}
