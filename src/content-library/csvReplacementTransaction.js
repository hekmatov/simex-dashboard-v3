import { validateChartDataCompatibility } from "../charting/data/prepareChartData.js";
import { validateCsvReplacementCandidate } from "../lib/loadDashboard.js";
import { createUploadedCsvSourceEntry } from "./sourceEntrySchema.js";

const DANGEROUS_COLUMNS = new Set(["__proto__", "constructor", "prototype"]);

export async function prepareCsvReplacement({
  dashboard,
  sourceId,
  candidate = null,
  file = null,
  parseCandidate = null,
} = {}) {
  const previous = cloneRecord(dashboard, "CSV replacement dashboard");
  const id = requiredText(sourceId, "CSV replacement sourceId");
  const currentSource = previous.dataSources?.[id];
  const currentProfile = previous.datasetProfiles?.[id];
  const currentEntry = previous.contentLibrary?.sourceEntries?.[id];
  if (!currentSource || !currentProfile || !currentEntry) throw new Error(`Managed CSV source "${id}" is incomplete.`);

  let parsed = candidate;
  if (!parsed) {
    if (typeof parseCandidate !== "function") throw new TypeError("CSV replacement candidate parser is required.");
    try {
      parsed = await parseCandidate(file);
    } catch (error) {
      return blockedWithoutCandidate(id, currentAuthority(previous, id), classifyCandidateError(error));
    }
  }
  const normalized = normalizeCandidate(parsed);
  const safetyReason = unsafeCandidateReason(normalized.rows);
  if (safetyReason) return blockedWithoutCandidate(id, currentAuthority(previous, id), safetyReason);
  try {
    validateCsvReplacementCandidate(id, normalized.source, normalized.profile, normalized.rows);
  } catch (error) {
    return blockedWithoutCandidate(id, currentAuthority(previous, id), {
      code: "candidate-invalid",
      message: error?.message ?? "The replacement CSV is invalid.",
    });
  }

  const directCharts = configuredCharts(previous)
    .filter(({ chart }) => chart.sourceId === id)
    .sort((left, right) => left.chart.id.localeCompare(right.chart.id));
  const reasons = [];
  for (const { chart } of directCharts) {
    const geoSourceId = chart.presentation?.map?.geoSource;
    const compatibility = validateChartDataCompatibility({
      chart,
      rows: normalized.rows,
      datasetProfile: normalized.profile,
      geoData: geoSourceId ? previous.loadedData?.[geoSourceId] ?? previous.dataSources?.[geoSourceId]?.geoJson : undefined,
    });
    if (!compatibility.ok) {
      reasons.push({
        code: compatibility.missingColumns.length > 0 ? "missing-encoding-column" : "chart-structure-invalid",
        chartId: chart.id,
        fields: compatibility.missingColumns,
        message: compatibility.errors[0]?.message ?? `Chart "${chart.title}" is incompatible with the replacement CSV.`,
      });
    }
  }
  const importSourceId = availableSourceId(normalized.sourceId || normalized.source.fileName, previous.dataSources ?? {});
  const remapTargets = directCharts.map(({ page, section, placement, chart }) => ({
    id: `csv:${id}:${page.id}:${section.id}:${placement.id ?? chart.id}`,
    pageId: page.id,
    pageLabel: page.title ?? page.label ?? page.id,
    sectionId: section.id,
    sectionLabel: section.title ?? section.label ?? section.id,
    panelId: placement.id ?? chart.id,
    panelLabel: placement.title ?? chart.title ?? placement.id ?? chart.id,
  }));
  const temporalReviewReason = reasons.length === 0
    ? changedTemporalObservationReason(directCharts, previous.loadedData?.[id], normalized.rows)
    : null;
  const plan = {
    kind: "csv-replacement",
    sourceId: id,
    status: reasons.length > 0 ? "blocked" : temporalReviewReason ? "requires-temporal-review" : "ready",
    reason: reasons[0] ?? temporalReviewReason,
    reasons,
    canImportAsNew: reasons.length > 0,
    importSourceId,
    remapTargets,
    expectedCurrent: currentAuthority(previous, id),
    candidate: normalized,
    draft: {
      draftId: `csv-replacement-${id}-${normalized.profile.fingerprint.slice(0, 12)}`,
      owner: "manager",
      kind: "csv-replacement",
      payload: { sourceId: id, importSourceId, fingerprint: normalized.profile.fingerprint },
      assetIds: [],
      mediaIds: [],
      sourceIds: [id, importSourceId],
    },
  };
  return deepFreeze(plan);
}

export async function commitCsvReplacement(plan, {
  mode = "replace",
  contentDraftCoordinator,
  commitDraft,
} = {}) {
  if (plan?.kind !== "csv-replacement" || !plan.candidate || !plan.draft) {
    throw new TypeError("A parsed CSV replacement plan is required.");
  }
  if (!contentDraftCoordinator || typeof contentDraftCoordinator.stageDraft !== "function" || typeof contentDraftCoordinator.commitDraft !== "function") {
    throw new TypeError("CSV replacement requires the content draft coordinator.");
  }
  if (mode === "replace" && plan.status === "blocked") {
    throw new Error(plan.reason?.message ?? "The replacement CSV is structurally incompatible.");
  }
  if (mode === "replace" && plan.status === "requires-temporal-review") {
    throw new Error(plan.reason?.message ?? "This CSV replacement requires temporal review before it can be committed.");
  }
  if (mode === "import-as-new" && !plan.canImportAsNew) {
    throw new Error("This CSV candidate cannot be imported as a new managed source.");
  }
  const active = contentDraftCoordinator.getActiveRetainers().records.some(({ ownerId }) => ownerId === plan.draft.draftId);
  if (!active) contentDraftCoordinator.stageDraft(plan.draft);
  const publish = typeof commitDraft === "function"
    ? commitDraft
    : (draftId, buildCandidate) => contentDraftCoordinator.commitDraft(draftId, { buildCandidate });
  const result = await publish(plan.draft.draftId, ({ dashboard }) => replacementCandidate(plan, dashboard, mode));
  return deepFreeze({
    status: mode === "import-as-new" ? "imported" : "committed",
    sourceId: mode === "import-as-new" ? plan.importSourceId : plan.sourceId,
    dashboard: structuredClone(result?.dashboard),
    remapTargets: plan.remapTargets,
  });
}

function replacementCandidate(plan, dashboard, mode) {
  if (!sameAuthority(plan.expectedCurrent, currentAuthority(dashboard, plan.sourceId))) {
    throw new Error("CSV replacement plan is stale; the current source authority changed.");
  }
  const next = structuredClone(dashboard);
  next.dataSources ??= {};
  next.datasetProfiles ??= {};
  next.loadedData ??= {};
  next.contentLibrary ??= { mediaItems: {}, sourceEntries: {} };
  next.contentLibrary.sourceEntries ??= {};
  const targetId = mode === "import-as-new" ? plan.importSourceId : plan.sourceId;
  if (mode === "import-as-new" && (next.dataSources[targetId] || next.contentLibrary.sourceEntries[targetId])) {
    throw new Error(`Data source "${targetId}" already exists.`);
  }
  next.dataSources[targetId] = structuredClone(plan.candidate.source);
  next.datasetProfiles[targetId] = structuredClone(plan.candidate.profile);
  next.loadedData[targetId] = structuredClone(plan.candidate.rows);
  if (mode === "import-as-new") {
    next.contentLibrary.sourceEntries[targetId] = createUploadedCsvSourceEntry({
      sourceId: targetId,
      displayName: displayNameFor(plan.candidate.source.fileName),
      fileName: plan.candidate.source.fileName,
      fingerprint: plan.candidate.profile.fingerprint,
    });
  } else {
    const current = next.contentLibrary.sourceEntries[targetId];
    next.contentLibrary.sourceEntries[targetId] = {
      ...current,
      health: "ready",
      provenance: {
        ...current.provenance,
        fileName: plan.candidate.source.fileName,
        profileFingerprint: plan.candidate.profile.fingerprint,
      },
    };
  }
  return { dashboard: next, commitAssetIds: [], discardAssetIds: [], itemIds: [targetId] };
}

function blockedWithoutCandidate(sourceId, expectedCurrent, reason) {
  return deepFreeze({
    kind: "csv-replacement",
    sourceId,
    status: "blocked",
    reason,
    reasons: [reason],
    canImportAsNew: false,
    importSourceId: null,
    remapTargets: [],
    expectedCurrent,
    candidate: null,
    draft: null,
  });
}

function normalizeCandidate(candidate) {
  cloneRecord(candidate, "CSV replacement candidate");
  return {
    sourceId: typeof candidate.sourceId === "string" ? candidate.sourceId : "",
    source: cloneRecord(candidate.source, "CSV replacement source descriptor"),
    profile: cloneRecord(candidate.profile, "CSV replacement dataset profile"),
    rows: Array.isArray(candidate.rows) ? structuredClone(candidate.rows) : [],
  };
}

function unsafeCandidateReason(rows) {
  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) {
      if (DANGEROUS_COLUMNS.has(key)) return { code: "unsafe-column", message: `CSV column "${key}" is not safe to import.` };
    }
  }
  return null;
}

function classifyCandidateError(error) {
  const message = error?.message ?? "The replacement CSV could not be parsed.";
  if (/too large|too many rows|maximum file size|maximum is/i.test(message)) return { code: "size-exceeded", message };
  if (/unsafe|prototype|constructor|__proto__/i.test(message)) return { code: "safety-failed", message };
  return { code: "parse-failed", message };
}

function configuredCharts(dashboard) {
  const values = [];
  for (const page of dashboard.pages ?? []) for (const section of page.sections ?? []) for (const placement of section.panels ?? []) {
    const chart = placement.chart ?? placement;
    if (chart?.configVersion === 3) values.push({ page, section, placement, chart });
  }
  return values;
}

function changedTemporalObservationReason(directCharts, currentRows, candidateRows) {
  const fields = new Set();
  for (const { chart } of directCharts) collectTemporalFields(chart.roles, fields);
  if (fields.size === 0) return null;
  const changedFields = [...fields].filter((field) => (
    !Array.isArray(currentRows)
    || stableStringify(temporalObservationSeries(currentRows, field))
      !== stableStringify(temporalObservationSeries(candidateRows, field))
  )).sort();
  if (changedFields.length === 0) return null;
  return {
    code: "requires-temporal-review",
    fields: changedFields,
    message: `This replacement changes directly used temporal observations for ${changedFields.map((field) => `"${field}"`).join(", ")} and requires temporal review before it can replace the current source.`,
  };
}

function collectTemporalFields(value, fields) {
  if (Array.isArray(value)) {
    for (const item of value) collectTemporalFields(item, fields);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value.interpretation === "temporal" && typeof value.field === "string" && value.field) fields.add(value.field);
  for (const child of Object.values(value)) collectTemporalFields(child, fields);
}

function temporalObservationSeries(rows, field) {
  return [...new Set(rows
    .map((row) => row?.[field])
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => stableStringify(value)))].sort();
}

function currentAuthority(dashboard, sourceId) {
  return {
    descriptor: structuredClone(dashboard?.dataSources?.[sourceId] ?? null),
    profile: structuredClone(dashboard?.datasetProfiles?.[sourceId] ?? null),
    entry: structuredClone(dashboard?.contentLibrary?.sourceEntries?.[sourceId] ?? null),
  };
}

function sameAuthority(expected, actual) {
  return stableStringify(expected) === stableStringify(actual);
}

function availableSourceId(value, sources) {
  const raw = String(value ?? "replacement-csv").replace(/\.[^.]+$/u, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const base = /^[A-Za-z]/.test(raw) ? raw : `source-${raw || "replacement"}`;
  let candidate = base;
  let suffix = 2;
  while (Object.hasOwn(sources, candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function displayNameFor(fileName) {
  return String(fileName ?? "Imported CSV").replace(/\.csv$/i, "").replace(/[-_]+/g, " ").trim() || "Imported CSV";
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function cloneRecord(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${description} is required.`);
  return structuredClone(value);
}

function requiredText(value, description) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${description} is required.`);
  return value.trim();
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
