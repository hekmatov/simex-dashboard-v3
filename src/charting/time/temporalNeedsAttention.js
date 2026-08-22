import {
  buildDefaultChronoLedger,
  buildSceneFrameLedger,
} from "./frameLedger.js";
import { validateIanaTimeZone } from "./temporalSchema.js";

export function deriveTemporalNeedsAttention(input = {}) {
  const timeZone = input.timeZone ?? input.timezone;
  const groups = (input.groups ?? input.timeSyncGroups ?? [])
    .map((group) => normalizeRuntimeGroup(group, timeZone));
  const scenes = (input.scenes ?? [])
    .map((scene) => normalizeRuntimeScene(scene));
  const charts = input.charts ?? [];
  const schemaRevisions = input.schemaRevisions ?? {};
  const findings = [];
  const chartsById = new Map(charts.map((chart) => [chart.id, chart]));
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  try {
    validateIanaTimeZone(timeZone);
  } catch (error) {
    findings.push(finding("invalid-time-zone", "dashboard", "dashboard", "scope", error.message));
  }

  for (const group of groups) {
    let validPeriod = true;
    try {
      assertPeriod(group.period, `Time Group "${group.id}"`);
    } catch (error) {
      validPeriod = false;
      findings.push(finding("invalid-period", "group", group.id, "period", error.message));
    }

    for (const member of group.members ?? []) {
      const chart = chartsById.get(member.chartId);
      if (!chart) {
        findings.push(finding(
          "missing-chart",
          "group",
          group.id,
          "charts",
          `Time Group "${group.id}" references missing chart "${member.chartId}".`,
        ));
        continue;
      }
      if (validPeriod && !chartHasObservationInPeriod(chart, group.period)) {
        findings.push(finding(
          "member-no-observations",
          "group",
          group.id,
          "charts",
          `Chart "${chart.id}" has no available observations in the Time Group period.`,
        ));
      }
      const effectivePolicy = member.matching ?? group.matching;
      if (policyName(effectivePolicy) === "Interpolate" && chart.interpolationAllowed !== true) {
        findings.push(finding(
          "unsupported-interpolation",
          "group",
          group.id,
          "defaults",
          `Chart "${chart.id}" does not support Interpolate.`,
        ));
      }
    }
  }

  for (const scene of scenes) {
    const group = groupsById.get(scene.groupId);
    let validPeriod = true;
    try {
      assertPeriod(scene.period, `Scene "${scene.id}"`);
      if (
        !group
        || scene.period.startEpochMs < group.period.startEpochMs
        || scene.period.endEpochMs > group.period.endEpochMs
      ) {
        throw new Error(`Scene "${scene.id}" period is outside its parent Time Group.`);
      }
    } catch (error) {
      validPeriod = false;
      findings.push(finding("invalid-period", "scene", scene.id, "scope", error.message));
    }

    for (const chartId of scene.chartIds ?? []) {
      const chart = chartsById.get(chartId);
      if (!chart) {
        findings.push(finding(
          "missing-chart",
          "scene",
          scene.id,
          "composition",
          `Scene "${scene.id}" references missing chart "${chartId}".`,
        ));
      } else if (chart.pageId !== scene.pageId) {
        findings.push(finding(
          "cross-page-chart",
          "scene",
          scene.id,
          "composition",
          `Chart "${chartId}" is not on Scene page "${scene.pageId}".`,
        ));
      }
    }

    const validTimeZone = isValidTimeZone(timeZone);
    const sourceRuleCanStillBeChecked = scene.frameRule?.type === "source";
    if (validPeriod && (validTimeZone || sourceRuleCanStillBeChecked)) {
      try {
        const ledger = buildSceneFrameLedger({
          scene,
          charts,
          timeZone: validTimeZone ? timeZone : "UTC",
        });
        for (const epochMs of ledger.missingSelectedFrames) {
          findings.push(finding(
            "selected-frame-missing",
            "scene",
            scene.id,
            "frames",
            `Selected frame ${epochMs} is no longer available.`,
          ));
        }
        if (ledger.frames.length === 0) {
          findings.push(finding(
            "zero-frame-ledger",
            "scene",
            scene.id,
            "frames",
            `Scene "${scene.id}" has no playable frames.`,
          ));
        }
      } catch (error) {
        findings.push(finding("invalid-frame-rule", "scene", scene.id, "frames", error.message));
      }
    }

    if (!validPresent(scene.present, scene.chartIds ?? [])) {
      findings.push(finding(
        "invalid-present-subset",
        "scene",
        scene.id,
        "composition",
        `Scene "${scene.id}" has an invalid Present subset or layout.`,
      ));
    }
  }

  for (const chart of charts) {
    const expectedRevision = readRevision(schemaRevisions, chart.id);
    if (expectedRevision !== undefined && chart.schemaRevision !== expectedRevision) {
      findings.push(finding(
        "schema-drift",
        "chart",
        chart.id,
        "temporal-behavior",
        `Chart "${chart.id}" schema revision changed from "${expectedRevision}" to "${chart.schemaRevision}".`,
      ));
    }
  }

  return Object.freeze(findings.map(Object.freeze));
}

export function deriveTemporalContentItems({
  dashboard,
  charts = [],
  schemaRevisions = {},
} = {}) {
  const groups = dashboard?.timeSyncGroups ?? [];
  const scenes = dashboard?.scenes ?? [];
  const findings = deriveTemporalNeedsAttention({
    timezone: dashboard?.timezone,
    timeSyncGroups: groups,
    scenes,
    charts,
    schemaRevisions,
  });
  const findingsFor = (targetType, targetId) => findings.filter((finding) => (
    finding.targetType === targetType && finding.targetId === targetId
  ));
  const sceneCountByGroup = new Map();
  for (const scene of scenes) {
    sceneCountByGroup.set(scene.groupId, (sceneCountByGroup.get(scene.groupId) ?? 0) + 1);
  }
  const pageById = new Map((dashboard?.pages ?? []).map((page) => [page.id, page]));
  return [
    ...groups.map((group) => ({
      id: group.id,
      type: "group",
      name: group.name,
      sceneCount: sceneCountByGroup.get(group.id) ?? 0,
      needsAttention: findingsFor("group", group.id),
    })),
    ...scenes.map((scene) => ({
      ...scene,
      type: "scene",
      pageLabel: pageById.get(scene.pageId)?.label
        ?? pageById.get(scene.pageId)?.title
        ?? scene.pageId,
      needsAttention: findingsFor("scene", scene.id),
    })),
  ];
}

function normalizeRuntimeGroup(group, timeZone) {
  return {
    ...group,
    period: normalizeRuntimePeriod(group?.period, timeZone, { inclusiveDateEnd: true }),
  };
}

function normalizeRuntimeScene(scene) {
  const members = scene?.members ?? [];
  const frames = scene?.frames;
  return {
    ...scene,
    period: normalizeRuntimePeriod(scene?.period, "UTC"),
    chartIds: scene?.chartIds ?? members.map(({ chartId }) => chartId),
    frameRule: scene?.frameRule ?? runtimeFrameRule(frames),
  };
}

function runtimeFrameRule(frames) {
  if (!frames) return frames;
  if (frames.mode === "source") {
    return {
      type: "source",
      chartId: frames.chartId,
      mode: frames.selection,
      ...(frames.selection === "selected"
        ? { selectedEpochMs: frames.selectedEpochs }
        : {}),
    };
  }
  if (frames.mode === "calendar") {
    return {
      type: "calendar",
      interval: frames.interval?.value,
      unit: frames.interval?.unit,
    };
  }
  return frames;
}

function normalizeRuntimePeriod(period, timeZone, { inclusiveDateEnd = false } = {}) {
  if (Number.isFinite(period?.startEpochMs) && Number.isFinite(period?.endEpochMs)) {
    return period;
  }
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnly.test(period?.start) && dateOnly.test(period?.end)) {
    const startEpochMs = zonedDateStart(period.start, timeZone);
    const endStart = zonedDateStart(period.end, timeZone);
    return {
      startEpochMs,
      endEpochMs: inclusiveDateEnd ? nextZonedDateStart(period.end, timeZone) - 1 : endStart,
    };
  }
  return {
    startEpochMs: Date.parse(period?.start),
    endEpochMs: Date.parse(period?.end),
  };
}

function nextZonedDateStart(date, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return zonedDateStart(next.toISOString().slice(0, 10), timeZone);
}

function zonedDateStart(date, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day);
  let candidate = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedDateParts(candidate, timeZone);
    const renderedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const next = candidate + (desired - renderedAsUtc);
    if (next === candidate) break;
    candidate = next;
  }
  return candidate;
}

function zonedDateParts(epochMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(epochMs);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function deriveGroupPeriodChangeConsequence({ groupId, nextPeriod, scenes = [] } = {}) {
  assertPeriod(nextPeriod, `Time Group "${groupId}"`);
  const affectedSceneIds = scenes
    .filter((scene) => (
      scene.groupId === groupId
      && (
        scene.period?.startEpochMs < nextPeriod.startEpochMs
        || scene.period?.endEpochMs > nextPeriod.endEpochMs
      )
    ))
    .map(({ id }) => id);
  return Object.freeze({
    consequence: affectedSceneIds.length > 0 ? "edit-or-clamp" : "none",
    affectedSceneIds: Object.freeze(affectedSceneIds),
  });
}

function chartHasObservationInPeriod(chart, period) {
  return (chart.variables ?? []).some((variable) => (
    (variable.observations ?? []).some((observation) => (
      Number.isFinite(observation?.epochMs)
      && observation.value !== null
      && observation.value !== undefined
      && observation.available !== false
      && observation.epochMs >= period.startEpochMs
      && observation.epochMs <= period.endEpochMs
    ))
  ));
}

function validPresent(present, sceneChartIds) {
  if (present === null || typeof present !== "object" || Array.isArray(present)) return false;
  if (!Array.isArray(present.chartIds) || present.chartIds.length < 1 || present.chartIds.length > 4) {
    return false;
  }
  if (new Set(present.chartIds).size !== present.chartIds.length) return false;
  if (present.chartIds.some((chartId) => !sceneChartIds.includes(chartId))) return false;
  const expectedLayouts = { 1: "single", 2: "split", 3: "trio", 4: "quad" };
  return present.layout === expectedLayouts[present.chartIds.length];
}

function assertPeriod(period, description) {
  if (
    period === null
    || typeof period !== "object"
    || Array.isArray(period)
    || !Number.isFinite(period.startEpochMs)
    || !Number.isFinite(period.endEpochMs)
    || period.endEpochMs < period.startEpochMs
  ) {
    throw new Error(`${description} has an invalid inclusive period.`);
  }
}

function policyName(policy) {
  const value = typeof policy === "string" ? policy : policy?.policy;
  return ({
    exact: "Concurrent only",
    lastKnown: "Snap to Latest",
    nearest: "Snap to Closest",
    interpolate: "Interpolate",
  })[value] ?? value;
}

function readRevision(revisions, chartId) {
  if (revisions instanceof Map) return revisions.get(chartId);
  return revisions?.[chartId];
}

function isValidTimeZone(timeZone) {
  try {
    validateIanaTimeZone(timeZone);
    return true;
  } catch {
    return false;
  }
}

function finding(code, targetType, targetId, stage, message) {
  return { code, targetType, targetId, stage, message };
}
