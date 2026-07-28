import { parseTemporalValue } from "./temporal.js";

export function bindingList(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

export function bindingField(binding) {
  return typeof binding === "string" ? binding : binding?.field;
}

export function bindingForField(chart, field) {
  let fallback = null;
  for (const assigned of Object.values(chart?.roles ?? {})) {
    for (const binding of bindingList(assigned)) {
      if (bindingField(binding) !== field) continue;
      if (typeof binding === "object" && binding?.interpretation) return binding;
      fallback ??= binding;
    }
  }
  return fallback ?? { field };
}

export function profileColumn(profile, field) {
  return profile?.columns?.find(({ name }) => name === field) ?? null;
}

export function canonicalColumnType(type) {
  return ({
    auto: null,
    numeric: "number",
    number: "number",
    text: "text",
  })[type] ?? type ?? null;
}

export function resolveEffectiveBinding(binding, column = null) {
  const normalized = typeof binding === "string" ? { field: binding } : (binding ?? {});
  const declared = canonicalColumnType(normalized.interpretation);
  const detected = canonicalColumnType(column?.type);
  const type = declared ?? detected ?? "category";
  const profileTemporal = column?.parsingMetadata
    ?? column?.temporal?.parsingMetadata
    ?? {};
  const temporal = type === "temporal"
    ? {
        interpretation: "temporal",
        ...profileTemporal,
        ...(normalized.format === undefined ? {} : { format: normalized.format }),
        ...(normalized.timezone === undefined ? {} : { timezone: normalized.timezone }),
      }
    : null;
  return {
    field: bindingField(normalized),
    type,
    temporal,
  };
}

export function resolveBindingValue(value, binding, column = null, {
  allowCanonicalTemporal = false,
} = {}) {
  const effective = resolveEffectiveBinding(binding, column);
  if (isMissing(value)) return { ok: true, value: null, ...effective };
  if (effective.type === "number") {
    const number = Number(value);
    return Number.isFinite(number)
      ? { ok: true, value: number, ...effective }
      : failed("invalid-numeric-value", value, effective);
  }
  if (effective.type === "temporal") {
    const parsed = parseTemporalValue(value, effective.temporal ?? {});
    if (parsed.ok) return { ok: true, value: parsed.canonical, ...effective };
    if (allowCanonicalTemporal) {
      const canonical = parseTemporalValue(String(value), { interpretation: "temporal" });
      if (canonical.ok) return { ok: true, value: canonical.canonical, ...effective };
    }
    return {
      ok: false,
      value: null,
      ...effective,
      diagnostic: parsed.diagnostic,
    };
  }
  if (effective.type === "boolean") {
    if (typeof value === "boolean") return { ok: true, value, ...effective };
    if (typeof value === "string" && /^(?:true|false)$/i.test(value.trim())) {
      return { ok: true, value: value.trim().toLowerCase() === "true", ...effective };
    }
    return failed("invalid-boolean-value", value, effective);
  }
  return { ok: true, value, ...effective };
}

export function readBoundValue(row, binding, datasetProfile) {
  if (!binding) return null;
  const field = bindingField(binding);
  const resolved = resolveBindingValue(row?.[field], binding, profileColumn(datasetProfile, field));
  return resolved.ok ? resolved.value : null;
}

export function isMissing(value) {
  return value === null
    || value === undefined
    || (typeof value === "string" && value.trim() === "");
}

function failed(code, value, effective) {
  return {
    ok: false,
    value: null,
    ...effective,
    diagnostic: { code, value },
  };
}
