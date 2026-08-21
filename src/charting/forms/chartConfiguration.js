const IDENTITY_FIELDS = new Set([
  "title",
  "titleOrigin",
  "description",
  "showTitle",
  "showDescription",
  "accessibilityLabel",
]);

export function validateChartConfiguration({ schema, configuration } = {}) {
  if (!schema || typeof schema !== "object") {
    throw new TypeError("A chart schema is required to validate configuration.");
  }
  const input = configuration && typeof configuration === "object"
    ? configuration
    : {};
  const errors = [];
  const warnings = [];
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    errors.push(problem(
      "title-required",
      "Enter a human-readable chart title for Structure and accessibility.",
    ));
  } else if (input.titleOrigin === "suggested") {
    errors.push(problem(
      "title-suggestion-unaccepted",
      "Accept or edit the suggested title before continuing.",
    ));
  }

  const supported = new Set([
    ...IDENTITY_FIELDS,
    ...(schema.form?.appearance ?? []),
  ]);
  const value = {};
  const unsupported = [];
  for (const [key, nested] of Object.entries(input)) {
    if (!supported.has(key)) {
      unsupported.push(key);
      continue;
    }
    value[key] = structuredClone(nested);
  }
  if (title) value.title = title;
  if (unsupported.length > 0) {
    errors.push(problem(
      "unsupported-configuration",
      `This chart type does not support: ${unsupported.join(", ")}. Return to Configure chart to repair these values.`,
    ));
  }
  return {
    valid: errors.length === 0,
    value,
    errors,
    warnings,
  };
}

function problem(code, message) {
  return { code, message, stage: "configure-chart", retryable: true };
}
