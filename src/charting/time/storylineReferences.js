const PRESENT_LAYOUTS = Object.freeze({
  1: ["single"], 2: ["vertical-divider", "horizontal-divider"],
  3: ["large-top", "large-bottom", "large-left", "large-right"], 4: ["grid-2x2"],
});

const memberIds = scene => scene.chartIds ?? scene.members?.map(member => member.chartId) ?? [];

/** Remove deleted charts, preserving every surviving member's authored fields. */
export function removeTemporalChartReferences(dashboard, chartIds) {
  const removed = new Set(chartIds);
  const removedGroupIds = new Set();
  const chronoGroups = (dashboard.chronoGroups ?? []).flatMap(group => {
    const members = (group.members ?? []).filter(member => !removed.has(member.chartId));
    if (!members.length) { removedGroupIds.add(group.id); return []; }
    if (members.length === group.members.length) return [group];
    return [{ ...group, members, ...(Array.isArray(group.chartIds) ? { chartIds: group.chartIds.filter(id => !removed.has(id)) } : {}) }];
  });
  const scenes = (dashboard.scenes ?? []).flatMap(scene => {
    if (removedGroupIds.has(scene.chronoGroupId)) return [];
    const next = removeSceneChartReferences(scene, removed);
    return next !== scene && !memberIds(next).length ? [] : [next];
  });
  return { ...dashboard, ...(dashboard.configVersion === 7 ? {} : { chronoGroups }), scenes };
}

/** A removed display anchor must not delete a cross-page composition. */
export function reanchorScenesAfterPageRemoval(dashboard, removedPageIds) {
  const pageForChart = new Map((dashboard.pages ?? []).flatMap(page =>
    (page.sections ?? []).flatMap(section => (section.panels ?? []).map(panel => [(panel.chart ?? panel).id, page.id]))));
  const scenes = (dashboard.scenes ?? []).flatMap(scene => {
    if (!removedPageIds.has(scene.pageId)) return [scene];
    const pageId = memberIds(scene).map(id => pageForChart.get(id)).find(Boolean);
    return pageId ? [{ ...scene, pageId }] : [];
  });
  return scenes.length === (dashboard.scenes ?? []).length && scenes.every((scene, index) => scene === dashboard.scenes[index])
    ? dashboard : { ...dashboard, scenes };
}

function removeSceneChartReferences(scene, removed) {
  if (!memberIds(scene).some(id => removed.has(id))) return scene;
  const members = scene.members?.filter(member => !removed.has(member.chartId));
  const chartIds = scene.chartIds?.filter(id => !removed.has(id));
  const survivingIds = members?.map(member => member.chartId) ?? chartIds ?? [];
  const retainedPresent = scene.present?.chartIds?.filter(id => !removed.has(id));
  const presentIds = retainedPresent?.length ? retainedPresent : survivingIds.slice(0, 1);
  const layouts = PRESENT_LAYOUTS[presentIds.length] ?? [];
  const frames = scene.frames?.mode === "source" && removed.has(scene.frames.chartId)
    ? { mode: "unresolved", reason: "source-chart-removed", previousChartId: scene.frames.chartId }
    : scene.frames;
  const next = {
    ...scene,
    ...(members ? { members } : {}),
    ...(chartIds ? { chartIds } : {}),
    ...(scene.present?.chartIds ? { present: { ...scene.present, chartIds: presentIds, layout: layouts.includes(scene.present.layout) ? scene.present.layout : layouts[0] } } : {}),
    ...(frames !== undefined ? { frames } : {}),
    ...(scene.frameRule?.chartId && removed.has(scene.frameRule.chartId) ? { frameRule: { type: "calendar" } } : {}),
  };
  // Fixed comparison presets are count-specific. Keep each surviving member's
  // geometry and policy, and leave the composition in the custom-width layout.
  if (members && members.length !== scene.members.length) delete next.view;
  return next;
}
