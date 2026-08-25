import { validateImageOrigin } from "../../static-content/image/imageAssetValidation.js";

export function migrateDashboardV3ToV4(input) {
  if (!isRecord(input)) throw new TypeError("Dashboard migration input must be an object.");
  if (input.configVersion !== 3 && input.configVersion !== 4) {
    throw new Error("Dashboard migration supports version 3 or version 4 input.");
  }
  const dashboard = structuredClone(input);
  const staticChartIds = new Set();
  if (dashboard.configVersion === 3) {
    migrateLegacyImageSources(dashboard, staticChartIds);
    dashboard.configVersion = 4;
  } else {
    collectStaticChartIds(dashboard, staticChartIds);
  }
  return isolateStaticTemporalMembership(dashboard, staticChartIds);
}

export function isolateStaticTemporalMembership(input, suppliedStaticChartIds = null) {
  const dashboard = structuredClone(input);
  const staticChartIds = suppliedStaticChartIds === null
    ? collectStaticChartIds(dashboard, new Set())
    : new Set(suppliedStaticChartIds);
  const groupsRemovedByStaticIsolation = new Set();
  dashboard.chronoGroups = (dashboard.chronoGroups ?? []).flatMap((group) => {
    if (!Array.isArray(group?.members)) return [group];
    const containsStatic = group.members.some(({ chartId }) => staticChartIds.has(chartId));
    if (!containsStatic) return [group];
    const members = group.members.filter(({ chartId }) => !staticChartIds.has(chartId));
    if (members.length === 0) {
      groupsRemovedByStaticIsolation.add(group.id);
      return [];
    }
    return [{ ...group, members }];
  });
  dashboard.scenes = (dashboard.scenes ?? []).flatMap((scene) => {
    if (groupsRemovedByStaticIsolation.has(scene?.chronoGroupId)) return [];
    const staticFrame = staticChartIds.has(scene?.frames?.chartId);
    const staticMembers = Array.isArray(scene?.members)
      && scene.members.some(({ chartId }) => staticChartIds.has(chartId));
    const staticPresent = Array.isArray(scene?.present?.chartIds)
      && scene.present.chartIds.some((id) => staticChartIds.has(id));
    if (!staticFrame && !staticMembers && !staticPresent) return [scene];
    if (staticFrame) return [];
    const members = staticMembers
      ? scene.members.filter(({ chartId }) => !staticChartIds.has(chartId))
      : scene.members;
    const chartIds = staticPresent
      ? scene.present.chartIds.filter((id) => !staticChartIds.has(id))
      : scene.present?.chartIds;
    if (members?.length === 0 || chartIds?.length === 0) return [];
    return [{
      ...scene,
      ...(staticMembers ? { members } : {}),
      ...(staticPresent ? {
        present: { ...scene.present, chartIds },
      } : {}),
    }];
  });
  return dashboard;
}

function migrateLegacyImageSources(dashboard, staticChartIds) {
  const usages = sourceUsage(dashboard);
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      section.panels = (section.panels ?? []).map((placement) => {
        const wrapped = isRecord(placement) && Object.hasOwn(placement, "chart");
        const chart = wrapped ? placement.chart : placement;
        if (!isRecord(chart) || chart.typeId !== "image") return placement;
        staticChartIds.add(chart.id);
        const legacySource = dashboard.dataSources?.[chart.sourceId];
        if (legacySource?.kind === "staticImage") return placement;
        if (legacySource?.kind !== "inline" || !Array.isArray(legacySource.rows)) {
          return placement;
        }
        if (legacySource.rows.length !== 1) {
          throw new Error(`Legacy Image chart "${chart.id}" manual data must contain exactly one row.`);
        }
        const mixedUse = usages.get(chart.sourceId)?.some(({ typeId }) => typeId !== "image");
        const sourceId = mixedUse
          ? uniqueSourceId(dashboard.dataSources, `${chart.sourceId}--static-${chart.id}`)
          : chart.sourceId;
        dashboard.dataSources[sourceId] = migrateLegacyImageRow(legacySource.rows[0]);
        const migratedChart = { ...chart, sourceId };
        return wrapped ? { ...placement, chart: migratedChart } : migratedChart;
      });
    }
  }
}

function migrateLegacyImageRow(row = {}) {
  if (!isRecord(row)) throw new Error("Legacy Image manual data row must be an object.");
  for (const field of Object.keys(row)) {
    if (!["src", "alt", "fit"].includes(field)) {
      throw new Error(`Legacy Image manual data field "${field}" is not allowed.`);
    }
  }
  const warnings = [];
  const fit = row.fit === "cover" ? "cover" : "contain";
  if (row.fit === "fill") warnings.push("legacy-fit-fill");
  const alt = typeof row.alt === "string" ? row.alt : "";
  if (alt.trim() === "") warnings.push("missing-alt");
  const origin = migrateLegacyOrigin(row.src);
  if (origin.kind === "replacementRequired") warnings.push("replacement-required");
  return {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 1,
    origin,
    alt,
    decorative: false,
    fit,
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
    ...(warnings.length > 0 ? { migrationWarnings: warnings } : {}),
  };
}

function migrateLegacyOrigin(value) {
  if (typeof value === "string" && /^https:\/\//i.test(value)) {
    try {
      const normalized = validateImageOrigin({ kind: "url", url: value });
      return { kind: "url", url: normalized.url };
    } catch {
      return replacementRequired();
    }
  }
  if (typeof value === "string" && !/^(?:blob:|data:|[a-z]+:)/i.test(value)) {
    try {
      const normalized = validateImageOrigin({ kind: "package", path: value });
      return { kind: "package", path: normalized.path };
    } catch {
      return replacementRequired();
    }
  }
  return replacementRequired();
}

function replacementRequired() {
  return { kind: "replacementRequired", reason: "Legacy image source requires replacement." };
}

function collectStaticChartIds(dashboard, target) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const placement of section.panels ?? []) {
        const chart = placement?.chart ?? placement;
        const source = dashboard.dataSources?.[chart?.sourceId];
        if (source?.kind === "staticText" || source?.kind === "staticImage") {
          target.add(chart.id);
        }
      }
    }
  }
  return target;
}

function sourceUsage(dashboard) {
  const usages = new Map();
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const placement of section.panels ?? []) {
        const chart = placement?.chart ?? placement;
        if (typeof chart?.sourceId !== "string") continue;
        const entries = usages.get(chart.sourceId) ?? [];
        entries.push({ id: chart.id, typeId: chart.typeId });
        usages.set(chart.sourceId, entries);
      }
    }
  }
  return usages;
}

function uniqueSourceId(dataSources, proposed) {
  let value = proposed.replace(/[^A-Za-z0-9_-]/g, "-");
  let suffix = 2;
  while (Object.hasOwn(dataSources, value)) {
    value = `${proposed}-${suffix}`.replace(/[^A-Za-z0-9_-]/g, "-");
    suffix += 1;
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
