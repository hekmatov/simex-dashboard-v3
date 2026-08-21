import { isCanonicalUtcInstant } from "./temporalSchema.js";

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
  1: "single",
  2: "split",
  3: "trio",
  4: "quad",
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
      layout: PRESENT_LAYOUTS[chartIds.length],
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
  requiredText(scene.id, "Scene id");
  requiredText(scene.name, "Scene name");
  requiredText(scene.pageId, "Scene pageId");
  requiredText(scene.groupId, "Scene groupId");

  const groups = context.groups ?? context.timeGroups ?? [];
  const pages = context.pages ?? [];
  const charts = context.charts ?? [];
  const group = context.group ?? groups.find((candidate) => candidate?.id === scene.groupId);
  if (!group) throw new Error(`Scene parent Time Group "${scene.groupId}" does not exist.`);
  if (!pages.some((page) => page?.id === scene.pageId)) {
    throw new Error(`Scene owning page "${scene.pageId}" does not exist.`);
  }

  const existingScenes = [...(group.scenes ?? []), ...(context.scenes ?? [])];
  if (existingScenes.some((candidate) => (
    candidate?.id !== scene.id
    && typeof candidate?.name === "string"
    && candidate.name.trim().toLocaleLowerCase() === scene.name.trim().toLocaleLowerCase()
    && (candidate.groupId === undefined || candidate.groupId === scene.groupId)
  ))) {
    throw new Error(`Scene name "${scene.name}" must be unique within its parent Time Group.`);
  }

  const scenePeriod = validatePeriod(scene.period, "Scene period");
  const groupPeriod = validateParentPeriod(group.period);
  if (scenePeriod.start < groupPeriod.start || scenePeriod.end > groupPeriod.end) {
    throw new Error("Scene period must be contained within its parent Time Group period.");
  }

  if (!Array.isArray(scene.members) || scene.members.length === 0) {
    throw new Error("Scene members must contain at least one chart.");
  }
  const groupChartIds = new Set(
    group.chartIds
    ?? (group.members ?? []).map((member) => typeof member === "string" ? member : member?.chartId),
  );
  const chartsById = new Map(charts.map((chart) => [chart?.id, chart]));
  const memberIds = new Set();
  for (const [index, member] of scene.members.entries()) {
    requireRecord(member, `Scene member ${index + 1}`);
    requiredText(member.chartId, `Scene member ${index + 1} chartId`);
    if (memberIds.has(member.chartId)) {
      throw new Error(`Scene contains duplicate chart "${member.chartId}".`);
    }
    memberIds.add(member.chartId);
    if (!groupChartIds.has(member.chartId)) {
      throw new Error(`Scene chart "${member.chartId}" must belong to its parent Time Group.`);
    }
    const chart = chartsById.get(member.chartId);
    if (!chart) throw new Error(`Scene chart "${member.chartId}" does not exist.`);
    if (chart.pageId !== scene.pageId) {
      throw new Error(`Scene chart "${member.chartId}" must remain on the Scene owning page.`);
    }
    if (!Number.isInteger(member.width) || member.width < 1 || member.width > 4) {
      throw new Error(`Scene member "${member.chartId}" width must be an integer from 1 to 4 columns.`);
    }
    if (member.matching !== undefined && !MATCHING_POLICIES.has(member.matching)) {
      throw new Error(`Scene member "${member.chartId}" matching policy is unsupported.`);
    }
  }

  validateFrames(scene.frames, memberIds, scenePeriod);
  validatePresent(scene.present, [...memberIds]);
  if (
    scene.secondsPerFrame !== undefined
    && (!Number.isFinite(scene.secondsPerFrame) || scene.secondsPerFrame <= 0)
  ) {
    throw new Error("Scene secondsPerFrame must be a positive finite number when overridden.");
  }
  validateDatePosition(scene.audience?.datePosition);
  return scene;
}

function validateFrames(frames, memberIds, period) {
  requireRecord(frames, "Scene frames");
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
  throw new Error('Scene frames mode must be "source" or "calendar".');
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
  if (memberIds.length <= 4 && (
    present.chartIds.length !== memberIds.length
    || present.chartIds.some((chartId) => !memberIds.includes(chartId))
  )) {
    throw new Error("Scenes with four or fewer charts must include all Scene members in their authored Present order.");
  }
  if (present.layout !== PRESENT_LAYOUTS[present.chartIds.length]) {
    throw new Error(`Scene Present layout must be "${PRESENT_LAYOUTS[present.chartIds.length]}" for this chart count.`);
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
      throw new Error("Parent Time Group period is invalid.");
    }
    return { start, end: endStart + 86_400_000 - 1 };
  }
  return validatePeriod(period, "Parent Time Group period");
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
