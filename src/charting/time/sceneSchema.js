import { isCanonicalUtcInstant } from "./temporalSchema.js";
import { validateTemporalReview } from "./temporalReview.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { assertChronoGroupMemberEligible, assertTimeSyncInterpolationAllowed, validateEffectiveTimeSyncMatching } from "./chronoGroupModel.js";

const FRAME_UNITS = new Set(["day", "month", "year"]);
const MATCHING_POLICIES = new Set([
  "exact",
  "lastKnown",
  "nearest",
  "interpolate",
  "Concurrent only",
  "Snap to Latest",
  "Snap to Closest",
  "Interpolate",
]);
const PRESENT_LAYOUTS = Object.freeze({
  1: ["single"],
  2: ["vertical-divider", "horizontal-divider"],
  3: ["large-top", "large-bottom", "large-left", "large-right"],
  4: ["grid-2x2"],
});
const DEFAULT_DATE_POSITION = Object.freeze({
  xPermille: 680,
  yPermille: 40,
  widthPermille: 280,
});

export function normalizeSceneDefaults(scene) {
  requireRecord(scene, "Scene");
  const normalized = structuredClone(scene);
  if (normalized.secondsPerFrame === undefined) delete normalized.secondsPerFrame;

  const chartIds = Array.isArray(normalized.members)
    ? normalized.members.map((member) => member?.chartId).filter(Boolean)
    : [];
  if (normalized.present === undefined && chartIds.length > 0 && chartIds.length <= 4) {
    normalized.present = {
      chartIds,
      layout: PRESENT_LAYOUTS[chartIds.length][0],
    };
  }

  normalized.audience = {
    ...(normalized.audience ?? {}),
    datePosition: {
      ...DEFAULT_DATE_POSITION,
      ...(normalized.audience?.datePosition ?? {}),
    },
  };
  return normalized;
}

export function validateScene(scene, context = {}) {
  requireRecord(scene, "Scene");
  if (context.nativeVersion === 7) {
    const allowed = ["id", "name", "pageId", "period", "members", "frames", "present", "audience", "secondsPerFrame", "defaultMatching", "view", "temporalReview"];
    for (const key of Object.keys(scene)) if (!allowed.includes(key)) throw new Error(`Unknown native Storyline property "${key}".`);
    if ((context.scenes ?? []).filter(candidate => candidate?.id === scene.id).length > 1) throw new Error(`Duplicate native Storyline id "${scene.id}".`);
    if (scene.period != null) nativeKeys(scene.period, ["start", "end"], "Storyline period");
    for (const member of scene.members ?? []) nativeKeys(member, ["chartId", "timeRole", "matching", "width", "height"], "Storyline member");
    if (scene.view !== undefined) nativeKeys(scene.view, ["layout"], "Storyline View");
    if (scene.present !== undefined) nativeKeys(scene.present, ["chartIds", "layout", "temporalReview"], "Storyline Present");
    if (scene.audience !== undefined) {
      nativeKeys(scene.audience, ["datePosition", "collectionLabel"], "Storyline Audience");
      if (scene.audience.collectionLabel !== undefined) requiredText(scene.audience.collectionLabel, "Original collection label");
    }
    if (scene.frames !== undefined) {
      const keys = { source: ["mode", "chartId", "selection", "selectedEpochs"], calendar: ["mode", "interval"],
        union: ["mode"], unresolved: ["mode", "reason", "previousChartId"] };
      nativeKeys(scene.frames, keys[scene.frames.mode] ?? ["mode"], "Storyline frames");
      if (scene.frames.mode === "calendar") nativeKeys(scene.frames.interval, ["value", "unit"], "Storyline calendar interval");
    }
  }
  if (context.nativeVersion === 7 && (Object.hasOwn(scene, "chronoGroupId") || Object.hasOwn(scene, "groupId"))) {
    throw new Error("Native Storylines cannot retain a parent chronoGroupId or groupId.");
  }
  requiredText(scene.id, "Scene id");
  requiredText(scene.name, "Scene name");
  const hasParent = scene.chronoGroupId !== undefined && scene.chronoGroupId !== null;
  if (hasParent) {
    requiredText(scene.pageId, "Scene pageId");
    requiredText(scene.chronoGroupId, "Scene chronoGroupId");
  } else if (scene.pageId !== undefined && scene.pageId !== null) {
    requiredText(scene.pageId, "Scene pageId");
  }

  const groups = context.chronoGroups ?? [];
  const pages = context.pages ?? [];
  const charts = context.charts ?? [];
  const group = hasParent ? context.group ?? groups.find((candidate) => candidate?.id === scene.chronoGroupId) : null;
  if (hasParent && !group) throw new Error(`Scene parent Chrono Group "${scene.chronoGroupId}" does not exist.`);
  if (scene.pageId != null && !pages.some((page) => page?.id === scene.pageId)) {
    throw new Error(`Scene owning page "${scene.pageId}" does not exist.`);
  }

  const existingScenes = [...(group?.scenes ?? []), ...(context.scenes ?? [])];
  if (existingScenes.some((candidate) => (
    candidate?.id !== scene.id
    && typeof candidate?.name === "string"
    && candidate.name.trim().toLocaleLowerCase() === scene.name.trim().toLocaleLowerCase()
    && (candidate.chronoGroupId === undefined || candidate.chronoGroupId === scene.chronoGroupId)
  ))) {
    throw new Error(`Scene name "${scene.name}" must be unique within its parent Chrono Group.`);
  }

  const scenePeriod = isCalendarUnionPeriod(scene) ? validateCalendarUnionPeriod(scene.period)
    : !hasParent && scene.period == null
    ? { start: -Infinity, end: Infinity }
    : validatePeriod(scene.period, "Scene period");
  const groupPeriod = group ? validateParentPeriod(group.period) : null;
  if (groupPeriod && (scenePeriod.start < groupPeriod.start || scenePeriod.end > groupPeriod.end)) {
    throw new Error("Scene period must be contained within its parent Chrono Group period.");
  }

  if (!Array.isArray(scene.members) || scene.members.length === 0) {
    throw new Error("Scene members must contain at least one chart.");
  }
  const groupChartIds = new Set(
    group?.chartIds
    ?? (group?.members ?? []).map((member) => typeof member === "string" ? member : member?.chartId),
  );
  const chartsById = new Map(charts.map((chart) => [chart?.id, chart]));
  const defaultMatching = scene.defaultMatching === undefined ? undefined
    : validateSceneMatching(scene.defaultMatching, "Scene default", { allowLegacyNearest: hasParent || context.nativeVersion === 7 });
  const memberIds = new Set();
  for (const [index, member] of scene.members.entries()) {
    requireRecord(member, `Scene member ${index + 1}`);
    requiredText(member.chartId, `Scene member ${index + 1} chartId`);
    if (memberIds.has(member.chartId)) {
      throw new Error(`Scene contains duplicate chart "${member.chartId}".`);
    }
    memberIds.add(member.chartId);
    if (group && !groupChartIds.has(member.chartId)) {
      throw new Error(`Scene chart "${member.chartId}" must belong to its parent Chrono Group.`);
    }
    const chart = chartsById.get(member.chartId);
    if (!chart) throw new Error(`Scene chart "${member.chartId}" does not exist.`);
    const timeRole = group ? null : sceneMemberTimeRole(chart, member, context.profiles);
    if (!Number.isInteger(member.width) || member.width < 1 || member.width > 4) {
      throw new Error(`Scene member "${member.chartId}" width must be an integer from 1 to 4 columns.`);
    }
    if (member.height !== undefined && (!Number.isFinite(member.height) || member.height < 0.125 || member.height > 2 || !Number.isInteger(member.height * 8))) {
      throw new Error(`Scene member "${member.chartId}" height must be a supported eighth-row footprint from 0.125 to 2.`);
    }
    const memberMatching = member.matching === undefined ? undefined
      : validateSceneMatching(member.matching, `Scene member "${member.chartId}"`, { allowLegacyNearest: hasParent || context.nativeVersion === 7 });
    const parentMember = group?.members?.find(member => member.chartId === chart.id);
    const effectiveMatching = memberMatching ?? defaultMatching ?? parentMember?.matching
      ?? group?.matching ?? chart.interaction?.timeSync?.matching;
    if (canonicalMatching(effectiveMatching?.policy ?? effectiveMatching) === "interpolate") {
      const resolvedRole = timeRole ?? sceneMemberTimeRole(chart, { ...member, timeRole: member.timeRole ?? parentMember?.timeRole }, context.profiles);
      assertTimeSyncInterpolationAllowed({ chart, timeRole: resolvedRole,
        profile: context.profiles instanceof Map ? context.profiles.get(chart.sourceId) : context.profiles?.[chart.sourceId] });
    }
  }

  validateFrames(scene.frames, memberIds, scenePeriod);
  if (scene.view !== undefined) {
    requireRecord(scene.view, "Scene View composition");
    const layouts = { 1: ["solo"], 2: ["sideBySide", "overUnder"], 3: ["leftFocus", "rightFocus", "topFocus", "bottomFocus"], 4: ["grid2x2"] };
    if (!layouts[memberIds.size]?.includes(scene.view.layout)) throw new Error("Scene View layout must match its member count.");
  }
  validatePresent(scene.present, [...memberIds]);
  if (scene.temporalReview !== undefined) {
    validateTemporalReview(scene.temporalReview, {
      allowedStatuses: ["needs-review"],
      description: `Scene "${scene.id}" temporal review`,
    });
  }
  if (
    scene.secondsPerFrame !== undefined
    && (!Number.isFinite(scene.secondsPerFrame) || scene.secondsPerFrame <= 0)
  ) {
    throw new Error("Scene secondsPerFrame must be a positive finite number when overridden.");
  }
  validateDatePosition(scene.audience?.datePosition);
  return scene;
}

function nativeKeys(value, allowed, description) {
  requireRecord(value, description);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown ${description} property "${key}".`);
}

/** Resolve a real eligible temporal role; presentation-only panels never qualify. */
export function sceneMemberTimeRole(chart, member = {}, profiles = {}) {
  const candidates = member.timeRole ? [member.timeRole] : getChartSchema(chart.typeId).roles
    .filter(role => role.accepts.includes("temporal"))
    .map(role => role.id);
  let failure;
  for (const timeRole of candidates) {
    try {
      assertChronoGroupMemberEligible({ chart, timeRole, profiles });
      return timeRole;
    } catch (error) { failure = error; }
  }
  throw failure ?? new Error(`Scene chart "${chart.id}" has no eligible temporal role.`);
}

function canonicalMatching(policy) {
  return ({ "Concurrent only": "exact", "Snap to Latest": "lastKnown", "Snap to Closest": "nearest", Interpolate: "interpolate" })[policy] ?? policy;
}

function validateSceneMatching(value, description, { allowLegacyNearest } = {}) {
  if (typeof value !== "string") return validateEffectiveTimeSyncMatching(value, description);
  if (!MATCHING_POLICIES.has(value)) throw new Error(`${description} matching policy is unsupported.`);
  const matching = { policy: canonicalMatching(value) };
  // Older parented Scenes persisted label-only nearest overrides. New edits
  // emit explicit bounded objects; migration can review the legacy form.
  return allowLegacyNearest && matching.policy === "nearest" ? matching
    : validateEffectiveTimeSyncMatching(matching, description);
}

function validateFrames(frames, memberIds, period) {
  requireRecord(frames, "Scene frames");
  if (frames.mode === "union") {
    if (Object.keys(frames).join(",") !== "mode") throw new Error("Union frames contain only mode.");
    return;
  }
  if (frames.mode === "unresolved") {
    const keys = Object.keys(frames).sort();
    if (
      keys.join(",") !== "mode,previousChartId,reason"
      || !["source-chart-moved", "source-chart-removed"].includes(frames.reason)
      || typeof frames.previousChartId !== "string"
      || frames.previousChartId.trim() === ""
    ) {
      throw new Error("Scene unresolved Frame source must contain only mode, reason, and previousChartId.");
    }
    return;
  }
  if (frames.mode === "source") {
    if (!memberIds.has(frames.chartId)) {
      throw new Error("Scene Frame source must be a participating Scene chart.");
    }
    if (!new Set(["all", "selected"]).has(frames.selection)) {
      throw new Error('Scene Frame source selection must be "all" or "selected".');
    }
    if (frames.selection === "selected") {
      if (!Array.isArray(frames.selectedEpochs) || frames.selectedEpochs.length === 0) {
        throw new Error("Scene must retain at least one selected frame.");
      }
      let previous = -Infinity;
      for (const epoch of frames.selectedEpochs) {
        if (!Number.isSafeInteger(epoch)) {
          throw new Error("Scene selected frame epochs must be safe integers.");
        }
        if (epoch < period.start || epoch > period.end) {
          throw new Error("Every selected frame must remain inside the Scene period.");
        }
        if (epoch <= previous) {
          throw new Error("Scene selected frame epochs must be unique and ordered.");
        }
        previous = epoch;
      }
    } else if (frames.selectedEpochs !== undefined) {
      throw new Error("All available frames cannot persist selectedEpochs.");
    }
    return;
  }
  if (frames.mode === "calendar") {
    requireRecord(frames.interval, "Scene calendar interval");
    if (!Number.isInteger(frames.interval.value) || frames.interval.value <= 0) {
      throw new Error("Scene calendar interval value must be a positive integer.");
    }
    if (!FRAME_UNITS.has(frames.interval.unit)) {
      throw new Error('Scene calendar interval unit must be "day", "month", or "year".');
    }
    return;
  }
  throw new Error('Scene frames mode must be "union", "source", "calendar", or "unresolved".');
}

/** Legacy collections used calendar dates even when observations were instants.
 * Keep that authored boundary on a parentless union; cursor instants stay UTC.
 */
export function isCalendarUnionPeriod(scene) {
  return scene?.frames?.mode === "union" && /^\d{4}-\d{2}-\d{2}$/.test(scene.period?.start)
    && /^\d{4}-\d{2}-\d{2}$/.test(scene.period?.end);
}

export function validateCalendarUnionPeriod(period) {
  requireRecord(period, "Storyline calendar period");
  if (Object.keys(period).some(key => !["start", "end"].includes(key))
    || ![period.start, period.end].every(value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString().slice(0, 10) === value)
    || period.end < period.start) throw new Error("Storyline union period requires ordered canonical calendar dates.");
  return { start: Date.parse(period.start), end: Date.parse(period.end) + 86400000 - 1 };
}

function validatePresent(present, memberIds) {
  requireRecord(present, "Scene Present composition");
  if (!Array.isArray(present.chartIds) || present.chartIds.length < 1 || present.chartIds.length > 4) {
    throw new Error("Scene Present chartIds must contain one to four charts.");
  }
  if (new Set(present.chartIds).size !== present.chartIds.length) {
    throw new Error("Scene Present chartIds cannot contain duplicates.");
  }
  if (present.chartIds.some((chartId) => !memberIds.includes(chartId))) {
    throw new Error("Scene Present charts must be a subset of Scene members.");
  }
  const allowedLayouts = PRESENT_LAYOUTS[present.chartIds.length] ?? [];
  if (!allowedLayouts.includes(present.layout)) {
    throw new Error(`Scene Present layout must be one of ${allowedLayouts.map((layout) => `"${layout}"`).join(", ")} for this chart count.`);
  }
  if (present.temporalReview !== undefined) {
    validateTemporalReview(present.temporalReview, {
      allowedStatuses: ["degraded"],
      description: "Scene Present temporal review",
    });
  }
}

function validateDatePosition(position) {
  requireRecord(position, "Scene Audience datePosition");
  for (const key of ["xPermille", "yPermille", "widthPermille"]) {
    if (!Number.isInteger(position[key]) || position[key] < 0 || position[key] > 1000) {
      throw new Error(`Scene Audience ${key} must be an integer permille value from 0 to 1000.`);
    }
  }
  if (position.widthPermille < 1) {
    throw new Error("Scene Audience widthPermille must be at least 1.");
  }
  if (position.xPermille + position.widthPermille > 1000) {
    throw new Error("Scene Audience datePosition must fit within the Audience canvas.");
  }
}

function validatePeriod(period, description) {
  requireRecord(period, description);
  if (!isCanonicalUtcInstant(period.start) || !isCanonicalUtcInstant(period.end)) {
    throw new Error(`${description} must use canonical UTC start and end instants.`);
  }
  const start = Date.parse(period.start);
  const end = Date.parse(period.end);
  if (end < start) throw new Error(`${description} end must be on or after start.`);
  return { start, end };
}

function validateParentPeriod(period) {
  if (
    typeof period?.start === "string"
    && typeof period?.end === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(period.start)
    && /^\d{4}-\d{2}-\d{2}$/.test(period.end)
  ) {
    const start = Date.parse(`${period.start}T00:00:00.000Z`);
    const endStart = Date.parse(`${period.end}T00:00:00.000Z`);
    if (!Number.isFinite(start) || !Number.isFinite(endStart) || endStart < start) {
      throw new Error("Parent Chrono Group period is invalid.");
    }
    return { start, end: endStart + 86_400_000 - 1 };
  }
  return validatePeriod(period, "Parent Chrono Group period");
}

function requireRecord(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${description} is required.`);
  }
}
