import { validateScene } from "../charting/time/sceneSchema.js";

export function mutateSceneDatePosition(dashboard, sceneId, datePosition) {
  if (!dashboard || typeof dashboard !== "object" || Array.isArray(dashboard)) {
    throw new TypeError("A dashboard is required to save Scene Audience date position.");
  }
  const sceneIndex = (dashboard.scenes ?? []).findIndex(({ id }) => id === sceneId);
  if (sceneIndex < 0) {
    throw new Error(`Scene "${String(sceneId)}" does not exist.`);
  }
  const normalized = normalizeDatePosition(datePosition);
  const currentScene = dashboard.scenes[sceneIndex];
  const candidate = {
    ...currentScene,
    audience: {
      ...(currentScene.audience ?? {}),
      datePosition: normalized,
    },
  };

  validateScene(candidate, {
    chronoGroups: dashboard.chronoGroups ?? [],
    pages: dashboard.pages ?? [],
    charts: chartLocations(dashboard),
    scenes: dashboard.scenes ?? [],
  });
  dashboard.scenes[sceneIndex] = candidate;
  return structuredClone(normalized);
}

export function normalizeDatePosition(position) {
  const widthPermille = clampInteger(position?.widthPermille, 1, 1000);
  return {
    xPermille: clampInteger(position?.xPermille, 0, 1000 - widthPermille),
    yPermille: clampInteger(position?.yPermille, 0, 1000),
    widthPermille,
  };
}

function chartLocations(dashboard) {
  return (dashboard.pages ?? []).flatMap((page) => (
    (page.sections ?? []).flatMap((section) => (
      (section.panels ?? []).map((placement) => ({
        ...(placement.chart ?? placement),
        pageId: page.id,
      }))
    ))
  ));
}

function clampInteger(value, minimum, maximum) {
  const integer = Math.round(Number(value));
  if (!Number.isFinite(integer)) {
    throw new TypeError("Scene Audience date position values must be finite numbers.");
  }
  return Math.max(minimum, Math.min(maximum, integer));
}
