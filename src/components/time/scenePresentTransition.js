import { scenePresentLayoutToDisplayLayout } from "./scenePresentLayout.js";

export function presentationSceneTransitionReady(previousSignature, scene, {
  enabled = true,
} = {}) {
  if (!scene || !enabled) return true;
  const transition = resolveScenePresentTransition(previousSignature, scene);
  return transition.error === null && transition.signature === previousSignature;
}

export function resolveScenePresentTransition(
  previousSignature,
  scene,
  { enabled = true } = {},
) {
  if (!scene) {
    return Object.freeze({ signature: null, action: null, error: null });
  }

  if (!enabled) {
    return Object.freeze({
      signature: previousSignature,
      action: null,
      error: null,
    });
  }

  const chartIds = Array.isArray(scene.present?.chartIds)
    ? [...scene.present.chartIds]
    : [];
  const signature = JSON.stringify([
    scene.id ?? null,
    scene.present?.layout ?? null,
    ...chartIds,
  ]);

  if (signature === previousSignature) {
    return Object.freeze({ signature, action: null, error: null });
  }

  try {
    const layout = scenePresentLayoutToDisplayLayout(
      scene.present?.layout,
      chartIds.length,
    );
    return Object.freeze({
      signature,
      action: Object.freeze({
        type: "scene_applied",
        chart_ids: Object.freeze(chartIds),
        layout,
      }),
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      signature,
      action: null,
      error: error?.message ?? "The saved Scene Present composition is invalid.",
    });
  }
}
