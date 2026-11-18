import { normalizeSceneDefaults, validateCalendarUnionPeriod } from "../time/sceneSchema.js";
import { resolveCursorMatching, unambiguousLegacyChartMatching } from "../time/playbackPageScope.js";
import { validateEffectiveTimeSyncMatching } from "../time/chronoGroupModel.js";
import { mergeTemporalReview } from "../time/temporalReview.js";
import { isCanonicalUtcInstant } from "../time/temporalSchema.js";

const PRESENT_LAYOUT = { 1: "single", 2: "vertical-divider", 3: "large-left", 4: "grid-2x2" };

/** Retire the parent collection without changing its effective time semantics.
 * Review entries describe deterministic proposals; the input remains the rollback original.
 */
export function migrateDashboardV6ToV7(input, { onReview = () => {} } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Dashboard V7 migration input must be an object.");
  if (![6, 7].includes(input.configVersion)) throw new Error("Dashboard configuration version 6 or 7 is required.");
  const dashboard = structuredClone(input);
  if (dashboard.configVersion === 7) return dashboard;
  const groups = dashboard.chronoGroups ?? [], scenes = dashboard.scenes ?? [];
  if (!Array.isArray(groups) || !Array.isArray(scenes)) throw new TypeError("Legacy temporal collections must be arrays.");
  const charts = (dashboard.pages ?? []).flatMap(page => (page.sections ?? []).flatMap(section =>
    (section.panels ?? []).map(panel => panel.chart ?? panel)));
  const chartsById = new Map(charts.map(chart => [chart.id, chart]));
  const groupsById = uniqueIndex(groups, "Group"), ids = new Set(uniqueIndex(scenes, "Storyline").keys()), names = new Set();
  const children = new Set();
  const report = entry => onReview(Object.freeze(structuredClone(entry)));
  for (const group of groups) {
    rejectUnknown(group, ["id", "name", "period", "matching", "secondsPerFrame", "members", "temporalReview"], "Chrono Group");
    validateCalendarUnionPeriod(group.period);
    if (typeof group.name !== "string" || !group.name.trim()) throw new Error("Legacy Group name is required.");
    validateEffectiveTimeSyncMatching(group.matching, "Legacy Group");
    if (!Number.isFinite(group.secondsPerFrame) || group.secondsPerFrame <= 0) throw new Error("Legacy Group secondsPerFrame must be positive.");
    if (!Array.isArray(group.members) || !group.members.length) throw new Error("Legacy Group members are required.");
    const memberIds = new Set();
    for (const member of group.members) {
      rejectUnknown(member, ["chartId", "timeRole", "matching"], "time synchronization member");
      if (memberIds.has(member.chartId)) throw new Error(`Duplicate member chart ${member.chartId}.`);
      memberIds.add(member.chartId);
      const chart = requireChart(member.chartId);
      if (typeof member.timeRole !== "string" || !chart.roles?.[member.timeRole]) throw new Error(`Legacy chart ${member.chartId} has no configured time role ${member.timeRole}.`);
      if (member.matching !== undefined) validateEffectiveTimeSyncMatching(member.matching, "Legacy member");
    }
  }
  for (const scene of scenes) {
    if (scene.chronoGroupId != null) {
      if (!groupsById.has(scene.chronoGroupId)) throw new Error(`Storyline parent "${scene.chronoGroupId}" is missing.`);
      const period = scene.period, parent = groupsById.get(scene.chronoGroupId);
      if (!period || !isCanonicalUtcInstant(period.start) || !isCanonicalUtcInstant(period.end)
        || period.end < period.start || Date.parse(period.start) < Date.parse(parent.period.start)
        || Date.parse(period.end) > Date.parse(parent.period.end) + 86400000 - 1) {
        throw new Error(`Legacy parented Storyline "${scene.id}" requires a valid contained period.`);
      }
      children.add(scene.chronoGroupId);
    }
    for (const member of scene.members ?? []) requireChart(member.chartId);
  }
  // Page/Dashboard previously used only an unambiguous inherited policy. Keep
  // explicit chart defaults and ambiguous memberships unchanged.
  for (const chart of charts) {
    if (chart.interaction?.timeSync?.matching !== undefined) continue;
    const matching = unambiguousLegacyChartMatching(chart.id, groups);
    if (!matching || matching.policy === "nearest" && !Number.isFinite(matching.toleranceMs)) continue;
    chart.interaction = { ...chart.interaction, timeSync: { matching: structuredClone(matching) } };
  }
  const migrated = scenes.map(scene => flattenScene(scene, groupsById.get(scene.chronoGroupId)));
  for (const group of groups) {
    if (children.has(group.id)) continue;
    const id = reserveIdentity(group.id, ids, "-storyline");
    if (id !== group.id) report({ code: "identity", previousId: group.id, storylineId: id });
    const memberIds = group.members.map(member => member.chartId), presentChartIds = memberIds.slice(0, 4);
    if (!presentChartIds.length) throw new Error(`Legacy Group "${group.id}" has no members.`);
    const present = { chartIds: presentChartIds, layout: PRESENT_LAYOUT[presentChartIds.length] };
    if (memberIds.length > 4) report({ code: "present-subset", storylineId: id, memberIds,
      presentChartIds, omittedChartIds: memberIds.slice(4), layout: present.layout });
    report({ code: "calendar-period", storylineId: id, period: group.period, timezone: dashboard.timezone ?? "UTC" });
    migrated.push(flattenScene({ id, name: group.name, period: structuredClone(group.period),
      frames: { mode: "union" }, secondsPerFrame: group.secondsPerFrame,
      members: group.members.map(member => ({ chartId: member.chartId, width: 2, timeRole: member.timeRole })),
      present, ...(group.temporalReview ? { temporalReview: group.temporalReview } : {}),
    }, group));
  }
  dashboard.scenes = migrated;
  delete dashboard.chronoGroups;
  dashboard.configVersion = 7;
  return dashboard;

  function requireChart(id) {
    const chart = chartsById.get(id);
    if (!chart) throw new Error(`Legacy temporal chart "${id}" is missing.`);
    return chart;
  }
  function flattenScene(scene, parent) {
    const saved = structuredClone(scene);
    if (parent && saved.secondsPerFrame === undefined) saved.secondsPerFrame = parent.secondsPerFrame;
    if (parent?.temporalReview) saved.temporalReview = mergeTemporalReview(saved.temporalReview, parent.temporalReview);
    saved.members = (saved.members ?? []).map(member => {
      const chart = requireChart(member.chartId), inherited = parent?.members?.find(item => item.chartId === member.chartId);
      if (parent && !inherited) throw new Error(`Storyline chart "${member.chartId}" is missing from parent "${parent.id}".`);
      if (inherited?.timeRole && member.timeRole && inherited.timeRole !== member.timeRole) report({
        code: "time-role", storylineId: saved.id, chartId: member.chartId,
        authoredRole: member.timeRole, effectiveRole: inherited.timeRole,
      });
      const matching = resolveCursorMatching({ chart, member, sceneDefault: saved.defaultMatching,
        inheritedMatching: inherited?.matching ?? parent?.matching });
      if (matching.policy === "nearest" && matching.toleranceMs === undefined) {
        report({ code: "unbounded-nearest", storylineId: saved.id, chartId: member.chartId });
      }
      return { ...member, ...(inherited?.timeRole ?? member.timeRole ? { timeRole: inherited?.timeRole ?? member.timeRole } : {}),
        matching: matching.policy === "nearest" && matching.toleranceMs === undefined ? "Snap to Closest" : { ...matching } };
    });
    // Every member now carries the resolved policy; removing this default cannot
    // expose a different chart default or lose a legacy inherited tolerance.
    delete saved.defaultMatching;
    delete saved.chronoGroupId;
    delete saved.groupId;
    if (parent) {
      saved.audience = { ...saved.audience, collectionLabel: parent.name };
      report({ code: "collection-label", storylineId: saved.id, label: parent.name });
    }
    const previousName = saved.name;
    saved.name = reserveName(saved.name, names);
    if (saved.name !== previousName) report({ code: "name", storylineId: saved.id, previousName, name: saved.name });
    return normalizeSceneDefaults(saved);
  }
}

function uniqueIndex(items, description) {
  const index = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== "string" || !item.id.trim()) throw new Error(`${description} id is required.`);
    if (index.has(item.id)) throw new Error(`Duplicate ${description} id "${item.id}".`);
    index.set(item.id, item);
  }
  return index;
}
function reserveIdentity(original, used, suffix) {
  let id = original, index = 1;
  while (used.has(id)) {
    const ending = `${suffix}${index === 1 ? "" : `-${index}`}`;
    id = `${original.slice(0, 128 - ending.length)}${ending}`;
    index++;
  }
  used.add(id);
  return id;
}
function reserveName(original, used) {
  if (typeof original !== "string" || !original.trim()) throw new Error("Storyline name is required.");
  let name = original, index = 2;
  while (used.has(name.trim().toLocaleLowerCase())) name = `${original} (${index++})`;
  used.add(name.trim().toLocaleLowerCase());
  return name;
}
function rejectUnknown(value, allowed, description) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown ${description} property "${key}".`);
}
