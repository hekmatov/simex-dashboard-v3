import { inspectGeographyJoinCoverage } from "../charting/data/prepareGeographyData.js";
import { validateGeoJson } from "../lib/geoJsonValidation.js";

export async function prepareGeoJsonReplacement({
  dashboard,
  sourceId,
  candidate = null,
  file = null,
  parseCandidate = null,
} = {}) {
  const previous = cloneRecord(dashboard, "GeoJSON replacement dashboard");
  const id = requiredText(sourceId, "GeoJSON replacement sourceId");
  const expectedCurrent = currentAuthority(previous, id);
  if (!expectedCurrent.descriptor || !expectedCurrent.entry || expectedCurrent.payload == null) {
    throw new Error(`Managed GeoJSON source "${id}" is incomplete.`);
  }

  let parsed = candidate;
  if (!parsed) {
    if (typeof parseCandidate !== "function") throw new TypeError("GeoJSON replacement candidate parser is required.");
    try {
      parsed = await parseCandidate(file);
    } catch (error) {
      return blockedWithoutCandidate(id, expectedCurrent, {
        kind: "schema",
        code: "parse-failed",
        message: error?.message ?? "The replacement GeoJSON could not be parsed.",
      });
    }
  }

  const normalized = normalizeCandidate(parsed);
  const validation = validateGeoJson(normalized.geoJson, { includeDiagnostics: true });
  if (validation.schema.ok !== true) {
    const error = validation.schema.errors[0];
    return blockedWithoutCandidate(id, expectedCurrent, {
      kind: "schema",
      code: error?.code ?? "schema-invalid",
      message: error?.message ?? "The replacement GeoJSON is structurally invalid.",
    });
  }
  if (validation.admission?.status === "rejected") {
    return blockedWithoutCandidate(id, expectedCurrent, {
      kind: "admission",
      code: "admission-limit-exceeded",
      limitKeys: [...validation.admission.violations],
      message: `GeoJSON exceeds the ${validation.admission.violations.join(", ")} admission limit.`,
    }, validation);
  }
  normalized.geoJson = cloneIterative(typeof normalized.geoJson === "string" ? JSON.parse(normalized.geoJson) : normalized.geoJson);
  normalized.source = descriptorWithGeoJson(normalized.source, normalized.geoJson);

  const directMaps = directlyDependentMaps(previous, id);
  const reasons = [];
  const coverage = [];
  for (const direct of directMaps) {
    const joinField = direct.chart.presentation?.map?.joinField ?? null;
    const structural = validateGeoJson(normalized.geoJson, { selectedJoinProperty: joinField });
    if (structural.compatibility?.ok === false) {
      reasons.push({
        ...structural.compatibility.errors[0],
        kind: "compatibility",
        chartId: direct.chart.id,
      });
      continue;
    }
    const candidateCoverage = inspectGeographyJoinCoverage({
      chart: direct.chart,
      rows: previous.loadedData?.[direct.chart.sourceId] ?? [],
      datasetProfile: previous.datasetProfiles?.[direct.chart.sourceId],
      geoData: normalized.geoJson,
    });
    const currentCoverage = inspectGeographyJoinCoverage({
      chart: direct.chart,
      rows: previous.loadedData?.[direct.chart.sourceId] ?? [],
      datasetProfile: previous.datasetProfiles?.[direct.chart.sourceId],
      geoData: expectedCurrent.payload,
    });
    coverage.push({ direct, current: currentCoverage, candidate: candidateCoverage });
    if (!candidateCoverage.ok) {
      reasons.push({ ...candidateCoverage.errors[0], kind: "compatibility", chartId: direct.chart.id });
    }
  }

  const importSourceId = availableSourceId(normalized.sourceId || normalized.source.fileName, previous.dataSources ?? {});
  const remapTargets = directMaps.map(remapTarget);
  const currentValidation = validateGeoJson(expectedCurrent.payload, { includeDiagnostics: true });
  const warnings = reasons.length === 0
    ? replacementWarnings(currentValidation, validation, coverage)
    : [];
  const status = reasons.length > 0 ? "blocked" : warnings.length > 0 ? "requires-confirmation" : "ready";
  const draft = replacementDraft({ id, importSourceId, normalized, validation, expectedCurrent, status });
  return deepFreeze({
    kind: "geojson-replacement",
    sourceId: id,
    status,
    reason: reasons[0] ?? warnings[0] ?? null,
    reasons,
    warnings,
    canImportAsNew: reasons.length > 0,
    importSourceId,
    remapTargets,
    impactContexts: [],
    expectedCurrent,
    candidate: normalized,
    validation,
    draft,
    transactionId: `geojson-replacement:${id}:${validation.summary.encodedBytes}:${validation.summary.featureCount}`,
  });
}

export async function commitGeoJsonReplacement(plan, {
  mode = "replace",
  confirmWarnings = false,
  contentDraftCoordinator,
  commitDraft,
} = {}) {
  if (plan?.kind !== "geojson-replacement" || !plan.candidate || !plan.draft) {
    throw new TypeError("A parsed GeoJSON replacement plan is required.");
  }
  if (!contentDraftCoordinator
    || typeof contentDraftCoordinator.beginTransaction !== "function"
    || typeof contentDraftCoordinator.completeTransaction !== "function"
    || typeof contentDraftCoordinator.failTransaction !== "function"
    || typeof contentDraftCoordinator.stageDraft !== "function"
    || typeof contentDraftCoordinator.commitDraft !== "function") {
    throw new TypeError("GeoJSON replacement requires the content draft coordinator.");
  }
  if (mode === "replace" && plan.status === "blocked") {
    throw new Error(plan.reason?.message ?? "The replacement GeoJSON is structurally incompatible.");
  }
  if (mode === "replace" && plan.status === "requires-confirmation" && confirmWarnings !== true) {
    throw new Error("This GeoJSON replacement requires confirmation before it can be committed.");
  }
  if (mode === "import-as-new" && !plan.canImportAsNew) {
    throw new Error("This GeoJSON candidate cannot be imported as a new managed source.");
  }

  const targetId = mode === "import-as-new" ? plan.importSourceId : plan.sourceId;
  contentDraftCoordinator.beginTransaction({
    transactionId: plan.transactionId,
    kind: "geojson-replacement-publication",
    assetIds: [],
    mediaIds: [],
    sourceIds: [plan.sourceId, targetId],
  });
  try {
    const active = contentDraftCoordinator.getActiveRetainers().records.some(({ ownerId }) => ownerId === plan.draft.draftId);
    if (!active) contentDraftCoordinator.stageDraft(plan.draft);
    const publish = typeof commitDraft === "function"
      ? commitDraft
      : (draftId, buildCandidate) => contentDraftCoordinator.commitDraft(draftId, { buildCandidate });
    const result = await publish(plan.draft.draftId, ({ dashboard }) => replacementCandidate(plan, dashboard, mode));
    contentDraftCoordinator.completeTransaction(plan.transactionId);
    return deepFreeze({
      status: mode === "import-as-new" ? "imported" : "committed",
      sourceId: targetId,
      dashboard: structuredClone(result?.dashboard),
      remapTargets: plan.remapTargets,
      impactContexts: [],
    });
  } catch (error) {
    await contentDraftCoordinator.failTransaction(plan.transactionId, error);
    throw error;
  }
}

export function geoJsonReplacementWarnings(plan) {
  return Object.freeze((plan?.warnings ?? []).map((warning) => structuredClone(warning)));
}

function replacementCandidate(plan, dashboard, mode) {
  if (!sameAuthority(plan.expectedCurrent, currentAuthority(dashboard, plan.sourceId))) {
    throw new Error("GeoJSON replacement plan is stale; the current source authority changed.");
  }
  const next = structuredClone(dashboard);
  next.dataSources ??= {};
  next.loadedData ??= {};
  next.contentLibrary ??= { mediaItems: {}, sourceEntries: {} };
  next.contentLibrary.sourceEntries ??= {};
  const targetId = mode === "import-as-new" ? plan.importSourceId : plan.sourceId;
  if (mode === "import-as-new" && (next.dataSources[targetId] || next.contentLibrary.sourceEntries[targetId])) {
    throw new Error(`Data source "${targetId}" already exists.`);
  }
  if (mode === "import-as-new") {
    next.dataSources[targetId] = cloneIterative(plan.candidate.source);
    next.loadedData[targetId] = cloneIterative(plan.candidate.geoJson);
    next.contentLibrary.sourceEntries[targetId] = managedEntryFor(targetId, plan.candidate.source);
  } else {
    const currentDescriptor = next.dataSources[targetId];
    next.dataSources[targetId] = currentDescriptor?.kind === "geojson"
      ? { ...currentDescriptor, path: plan.candidate.source.path ?? plan.candidate.source.fileName, geoJson: cloneIterative(plan.candidate.geoJson) }
      : cloneIterative(plan.candidate.source);
    next.loadedData[targetId] = cloneIterative(plan.candidate.geoJson);
    const currentEntry = next.contentLibrary.sourceEntries[targetId];
    next.contentLibrary.sourceEntries[targetId] = {
      ...currentEntry,
      health: "ready",
      provenance: {
        ...currentEntry.provenance,
        ...(plan.candidate.source.fileName ? { fileName: plan.candidate.source.fileName } : {}),
        ...(plan.candidate.source.path ? { path: plan.candidate.source.path } : {}),
      },
    };
  }
  return { dashboard: next, commitAssetIds: [], discardAssetIds: [], itemIds: [targetId] };
}

function replacementWarnings(current, candidate, coverage) {
  const warnings = [];
  if (current.summary.featureCount !== candidate.summary.featureCount) warnings.push(warning("feature-count-changed", `Feature count changes from ${current.summary.featureCount} to ${candidate.summary.featureCount}.`));
  if (!sameValue(current.summary.boundingBox, candidate.summary.boundingBox)) warnings.push(warning("bounding-box-changed", "The GeoJSON bounding box changes."));
  if (!sameValue(Object.keys(current.summary.geometryTypeCounts).sort(), Object.keys(candidate.summary.geometryTypeCounts).sort())) warnings.push(warning("geometry-mix-changed", "The GeoJSON geometry-type mix changes."));
  for (const { direct, current: before, candidate: after } of coverage) {
    if (after.ok && before.ok && after.matchedCount > 0 && after.matchedCount < before.matchedCount) {
      warnings.push(warning("join-coverage-reduced", `Usable join coverage for "${direct.chart.title ?? direct.chart.id}" falls from ${before.matchedCount} of ${before.eligibleCount} to ${after.matchedCount} of ${after.eligibleCount}.`, direct.chart.id));
    }
  }
  if (candidate.admission.status === "warning") {
    warnings.push(warning("admission-warning", `GeoJSON reaches the ${candidate.admission.warnings.join(", ")} warning threshold.`));
  }
  return warnings;
}

function replacementDraft({ id, importSourceId, normalized, validation, expectedCurrent, status }) {
  return {
    draftId: `manager-geojson-replacement-${id}-${validation.summary.encodedBytes}-${validation.summary.featureCount}`,
    owner: "manager",
    kind: "geojson-replacement",
    payload: { sourceId: id, importSourceId, status, expectedCurrent, fileName: normalized.source.fileName ?? normalized.source.path ?? "replacement.geojson" },
    assetIds: [],
    mediaIds: [],
    sourceIds: [id, importSourceId],
  };
}

function blockedWithoutCandidate(sourceId, expectedCurrent, reason, validation = null) {
  return deepFreeze({
    kind: "geojson-replacement",
    sourceId,
    status: "blocked",
    reason,
    reasons: [reason],
    warnings: [],
    canImportAsNew: false,
    importSourceId: null,
    remapTargets: [],
    impactContexts: [],
    expectedCurrent,
    candidate: null,
    validation,
    draft: null,
    transactionId: null,
  });
}

function directlyDependentMaps(dashboard, sourceId) {
  const direct = [];
  for (const page of dashboard.pages ?? []) for (const section of page.sections ?? []) for (const placement of section.panels ?? []) {
    const chart = placement.chart ?? placement;
    if (chart?.configVersion === 3 && chart.presentation?.map?.geoSource === sourceId) direct.push({ page, section, placement, chart });
  }
  return direct.sort((left, right) => left.chart.id.localeCompare(right.chart.id));
}

function remapTarget({ page, section, placement, chart }) {
  return {
    id: `geojson:${chart.presentation.map.geoSource}:${page.id}:${section.id}:${placement.id ?? chart.id}`,
    pageId: page.id,
    pageLabel: page.title ?? page.label ?? page.id,
    sectionId: section.id,
    sectionLabel: section.title ?? section.label ?? section.id,
    panelId: placement.id ?? chart.id,
    panelLabel: placement.title ?? chart.title ?? placement.id ?? chart.id,
  };
}

function normalizeCandidate(candidate) {
  record(candidate, "GeoJSON replacement candidate");
  const sourceRecord = record(candidate.source, "GeoJSON replacement source descriptor");
  const geoJson = candidate.geoJson ?? sourceRecord.geoJson;
  if (geoJson == null) throw new TypeError("GeoJSON replacement payload is required.");
  const { geoJson: ignoredPayload, ...sourceWithoutPayload } = sourceRecord;
  return { sourceId: typeof candidate.sourceId === "string" ? candidate.sourceId : "", source: structuredClone(sourceWithoutPayload), geoJson };
}

function descriptorWithGeoJson(source, geoJson) {
  return { ...structuredClone(source), geoJson: cloneIterative(geoJson) };
}

function currentAuthority(dashboard, sourceId) {
  return {
    descriptor: cloneIterative(dashboard?.dataSources?.[sourceId] ?? null),
    payload: cloneIterative(dashboard?.loadedData?.[sourceId] ?? dashboard?.dataSources?.[sourceId]?.geoJson ?? null),
    entry: cloneIterative(dashboard?.contentLibrary?.sourceEntries?.[sourceId] ?? null),
  };
}

function availableSourceId(value, sources) {
  const raw = String(value ?? "replacement-geojson").replace(/\.[^.]+$/u, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const base = /^[A-Za-z]/u.test(raw) ? raw : `source-${raw || "replacement"}`;
  let candidate = base;
  let suffix = 2;
  while (Object.hasOwn(sources, candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function warning(code, message, chartId = null) { return { code, message, ...(chartId ? { chartId } : {}) }; }
function managedEntryFor(sourceId, descriptor) {
  return {
    sourceId,
    origin: descriptor.kind === "geojson" ? "linked-project" : descriptor.browserAssetId ? "uploaded" : "packaged",
    ownership: descriptor.provenance?.ownership === "dashboard" ? "dashboard" : "builder",
    displayName: descriptor.provenance?.label ?? descriptor.fileName ?? descriptor.path?.split(/[\\/]/u).at(-1) ?? sourceId,
    provenance: structuredClone(descriptor.provenance ?? {}),
    health: "ready",
  };
}
function sameAuthority(expected, actual) { return JSON.stringify(expected) === JSON.stringify(actual); }
function sameValue(left, right) { return stableStringify(left) === stableStringify(right); }
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function cloneRecord(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${description} is required.`);
  return structuredClone(value);
}
function record(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${description} is required.`);
  return value;
}
function requiredText(value, description) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${description} is required.`);
  return value.trim();
}
function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  const seen = new Set();
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    for (const child of Object.values(current)) stack.push(child);
    Object.freeze(current);
  }
  return value;
}

function cloneIterative(value) {
  if (!value || typeof value !== "object") return value;
  const root = Array.isArray(value) ? [] : {};
  const seen = new Map([[value, root]]);
  const stack = [[value, root]];
  while (stack.length > 0) {
    const [source, target] = stack.pop();
    for (const key of Object.keys(source)) {
      const child = source[key];
      if (!child || typeof child !== "object") {
        target[key] = child;
        continue;
      }
      if (seen.has(child)) {
        target[key] = seen.get(child);
        continue;
      }
      const cloned = Array.isArray(child) ? [] : {};
      seen.set(child, cloned);
      target[key] = cloned;
      stack.push([child, cloned]);
    }
  }
  return root;
}
