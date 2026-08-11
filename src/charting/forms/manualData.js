import { resolveBindingValue } from "../data/bindings.js";
import { parseTemporalValue } from "../data/temporal.js";

const MAX_CONCISE_ROWS = 50;
const SAFE_FIELD_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function manualDataAllowed(schema) {
  try {
    return readManualContract(schema).allowed;
  } catch {
    return false;
  }
}

export function createManualDataTemplate(schema) {
  const contract = readManualContract(schema);
  if (!contract.allowed) {
    throw new Error("This chart schema does not support concise manual data.");
  }
  const starterRowCount = Math.max(
    1,
    contract.minRows,
    contract.comparison ? 2 : 0,
  );
  const rows = Array.from(
    { length: starterRowCount },
    () => Object.fromEntries(contract.columns.map(({ fieldId }) => [fieldId, ""])),
  );
  return {
    maxRows: contract.maxRows,
    columns: contract.columns.map(cloneColumn),
    rows,
    ...(contract.comparison
      ? {
          comparison: {
            temporalRoleIds: [...contract.comparison.temporalRoleIds],
          },
        }
      : {}),
  };
}

export function validateManualData(schema, input) {
  let contract;
  try {
    contract = readManualContract(schema);
  } catch (cause) {
    return invalidResult(cause);
  }
  if (!contract.allowed) {
    return {
      valid: false,
      errors: ["This chart schema does not support concise manual data."],
    };
  }

  const errors = [];
  let parsed;
  try {
    parsed = parseTableInput(input, contract, errors);
  } catch (cause) {
    return invalidResult(cause);
  }
  if (!parsed) return { valid: false, errors };

  const { columns, rows } = parsed;
  validateColumnRoles(columns, contract, errors);
  if (rows.length > contract.maxRows) {
    errors.push(
      `Manual data exceeds the concise limit of ${contract.maxRows} rows.`,
    );
  }
  if (rows.length < contract.minRows) {
    errors.push(
      `Manual data requires at least ${contract.minRows} rows.`,
    );
  }

  const comparableTimes = new Map(
    (contract.comparison?.temporalRoleIds ?? [])
      .map((roleId) => [roleId, []]),
  );
  let usableRowCount = 0;
  for (const row of rows) {
    if (!row) continue;
    const rowResult = validateRow(row, columns, errors);
    if (rowResult.usable) usableRowCount += 1;
    if (
      contract.comparison
      && rowResult.validRoleValues.get("measurement") === true
    ) {
      for (const roleId of contract.comparison.temporalRoleIds) {
        const temporalValue = rowResult.temporalRoleValues.get(roleId);
        if (typeof temporalValue === "string") {
          comparableTimes.get(roleId).push(temporalValue);
        }
      }
    }
  }
  if (usableRowCount === 0) {
    errors.push("Manual data must contain at least one usable row.");
  }
  if (contract.comparison) {
    for (const [roleId, temporalValues] of comparableTimes) {
      const label = contract.columns
        .find((column) => column.roleId === roleId)?.header ?? roleId;
      if (temporalValues.length < 2) {
        errors.push(
          `A comparison chart requires at least two usable temporal observations for "${label}".`,
        );
      } else if (new Set(temporalValues).size < 2) {
        errors.push(
          `A comparison chart requires two distinct temporal observations for "${label}".`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function readManualContract(schema) {
  const schemaDescriptors = strictRecordDescriptors(schema, "Chart schema");
  const sources = strictStringArray(
    requiredValue(schemaDescriptors, "sources", "Chart schema"),
    "Chart schema sources",
  );
  const roles = strictArrayValues(
    requiredValue(schemaDescriptors, "roles", "Chart schema"),
    "Chart schema roles",
  ).map((chartRole, index) => readRole(chartRole, index));
  const manualData = requiredValue(
    schemaDescriptors,
    "manualData",
    "Chart schema",
  );
  if (manualData === null) {
    return {
      allowed: false,
      columns: [],
      comparison: null,
      minRows: 0,
      maxRows: 0,
    };
  }
  const manualDescriptors = strictRecordDescriptors(
    manualData,
    "Chart schema manualData",
  );
  const maxRows = requiredValue(
    manualDescriptors,
    "maxRows",
    "Chart schema manualData",
  );
  const minRows = optionalValue(manualDescriptors, "minRows") ?? 0;
  const fields = optionalValue(manualDescriptors, "fields");
  const columns = buildColumns(
    roles,
    fields === undefined
      ? []
      : strictStringArray(fields, "Chart schema manualData fields"),
  );
  const comparisonDescriptor = schemaDescriptors.comparison;
  if (
    comparisonDescriptor
    && !Object.hasOwn(comparisonDescriptor, "value")
  ) {
    throw new TypeError(
      'Chart schema property "comparison" must be a data property.',
    );
  }
  const hasComparison = comparisonDescriptor?.value !== undefined;
  const temporalRoleIds = hasComparison
    ? roles
        .filter(({ min, accepts }) => min > 0 && accepts.includes("temporal"))
        .map(({ id }) => id)
    : [];
  if (hasComparison && temporalRoleIds.length === 0) {
    throw new Error(
      "A comparison chart schema requires a required temporal role.",
    );
  }
  const comparison = hasComparison ? { temporalRoleIds } : null;
  const bounded = Number.isInteger(maxRows)
    && maxRows > 0
    && maxRows <= MAX_CONCISE_ROWS
    && Number.isInteger(minRows)
    && minRows >= 0
    && minRows <= maxRows;
  return {
    allowed: sources.includes("inline") && bounded && columns.length > 0,
    columns,
    comparison,
    minRows,
    maxRows,
  };
}

function readRole(chartRole, index) {
  const description = `Chart schema role ${index + 1}`;
  const descriptors = strictRecordDescriptors(chartRole, description);
  const id = requiredValue(descriptors, "id", description);
  const label = requiredValue(descriptors, "label", description);
  const accepts = strictStringArray(
    requiredValue(descriptors, "accepts", description),
    `${description} accepts`,
  );
  const min = requiredValue(descriptors, "min", description);
  const max = requiredValue(descriptors, "max", description);
  if (!safeFieldId(id)) {
    throw new Error(`${description} field ID "${display(id)}" is unsafe.`);
  }
  if (typeof label !== "string" || label.trim() === "") {
    throw new Error(`${description} label must be a non-empty string.`);
  }
  if (accepts.length === 0) {
    throw new Error(`${description} must accept at least one value type.`);
  }
  if (!Number.isInteger(min) || min < 0) {
    throw new Error(`${description} minimum cardinality is invalid.`);
  }
  if (max !== null && (!Number.isInteger(max) || max < min)) {
    throw new Error(`${description} maximum cardinality is invalid.`);
  }
  return { id, label: label.trim(), accepts, min, max };
}

function buildColumns(roles, manualFields) {
  const columns = [];
  const fieldIds = new Set();
  for (const chartRole of roles) {
    if (fieldIds.has(chartRole.id)) {
      throw new Error(`Chart schema role field ID "${chartRole.id}" is duplicated.`);
    }
    fieldIds.add(chartRole.id);
    columns.push({
      fieldId: chartRole.id,
      header: chartRole.label,
      roleId: chartRole.id,
      expectedType: preferredType(chartRole.accepts),
      accepts: [...chartRole.accepts],
      required: chartRole.min > 0,
      cardinality: { min: chartRole.min, max: chartRole.max },
    });
  }
  for (const fieldId of manualFields) {
    if (!safeFieldId(fieldId)) {
      throw new Error(
        `Chart schema manualData field ID "${display(fieldId)}" is unsafe.`,
      );
    }
    if (fieldIds.has(fieldId)) continue;
    fieldIds.add(fieldId);
    columns.push({
      fieldId,
      header: humanizeFieldId(fieldId),
      roleId: fieldId,
      expectedType: "any",
      accepts: ["any"],
      required: true,
      cardinality: { min: 1, max: 1 },
    });
  }
  return columns;
}

function parseTableInput(input, contract, errors) {
  if (Array.isArray(input)) {
    const rows = parseRows(input, errors);
    const providedFieldIds = new Set();
    for (const row of rows) {
      if (!row) continue;
      for (const fieldId of Object.keys(row.descriptors)) {
        providedFieldIds.add(fieldId);
      }
    }
    const known = new Map(
      contract.columns.map((column) => [column.fieldId, column]),
    );
    for (const fieldId of providedFieldIds) {
      if (!safeFieldId(fieldId)) {
        errors.push(`Manual-data field ID "${fieldId}" is unsafe.`);
      } else if (!known.has(fieldId)) {
        errors.push(`Unknown manual-data field "${fieldId}".`);
      }
    }
    const columns = contract.columns
      .filter(({ fieldId }) => providedFieldIds.has(fieldId))
      .map(cloneColumn);
    return { columns, rows };
  }

  const descriptors = strictRecordDescriptors(input, "Manual data table");
  const columns = parseColumns(
    requiredValue(descriptors, "columns", "Manual data table"),
    contract,
    errors,
  );
  const rows = parseRows(
    requiredValue(descriptors, "rows", "Manual data table"),
    errors,
  );
  return { columns, rows };
}

function parseColumns(value, contract, errors) {
  const columnValues = strictArrayValues(value, "Manual data columns");
  const expected = new Map(
    contract.columns.map((column) => [column.roleId, column]),
  );
  const columns = [];
  const fieldIds = new Set();
  const headers = new Set();
  for (let index = 0; index < columnValues.length; index += 1) {
    const description = `Manual data column ${index + 1}`;
    let descriptors;
    try {
      descriptors = strictRecordDescriptors(columnValues[index], description);
    } catch (cause) {
      errors.push(safeMessage(cause));
      continue;
    }
    const fieldId = optionalValue(descriptors, "fieldId");
    const header = optionalValue(descriptors, "header");
    const roleId = optionalValue(descriptors, "roleId") ?? fieldId;
    let usable = true;
    if (!safeFieldId(fieldId)) {
      errors.push(`${description} field ID "${display(fieldId)}" is unsafe.`);
      usable = false;
    } else if (fieldIds.has(fieldId)) {
      errors.push(`${description} field ID "${fieldId}" is duplicated.`);
      usable = false;
    } else {
      fieldIds.add(fieldId);
    }
    if (typeof header !== "string" || header.trim() === "") {
      errors.push(`${description} requires a non-empty header.`);
      usable = false;
    } else {
      const normalizedHeader = header.trim().toLocaleLowerCase("en");
      if (headers.has(normalizedHeader)) {
        errors.push(`${description} header "${header.trim()}" is duplicated.`);
        usable = false;
      } else {
        headers.add(normalizedHeader);
      }
    }
    const expectedColumn = expected.get(roleId);
    if (!expectedColumn) {
      errors.push(
        `${description} references unknown manual-data role "${display(roleId)}".`,
      );
      usable = false;
    }
    if (usable) {
      columns.push({
        ...cloneColumn(expectedColumn),
        fieldId,
        header: header.trim(),
      });
    }
  }
  return columns;
}

function parseRows(value, errors) {
  const rowValues = strictArrayValues(value, "Manual data rows");
  const rows = [];
  for (let index = 0; index < rowValues.length; index += 1) {
    const description = `Manual data row ${index + 1}`;
    try {
      rows.push({
        index,
        descriptors: strictRecordDescriptors(rowValues[index], description),
      });
    } catch (cause) {
      errors.push(safeMessage(cause));
      rows.push(null);
    }
  }
  return rows;
}

function validateColumnRoles(columns, contract, errors) {
  const counts = new Map();
  for (const { roleId } of columns) {
    counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
  }
  for (const expected of contract.columns) {
    const count = counts.get(expected.roleId) ?? 0;
    const { min, max } = expected.cardinality;
    if (count < min) {
      errors.push(
        `Required manual-data role "${expected.header}" is missing.`,
      );
    }
    if (max !== null && count > max) {
      errors.push(
        `Manual-data role "${expected.header}" allows at most ${max} columns.`,
      );
    }
  }
}

function validateRow(row, columns, errors) {
  const rowNumber = row.index + 1;
  const columnsByField = new Map(
    columns.map((column) => [column.fieldId, column]),
  );
  for (const fieldId of Object.keys(row.descriptors)) {
    if (!safeFieldId(fieldId)) continue;
    if (!columnsByField.has(fieldId)) {
      errors.push(`Row ${rowNumber} contains unknown field "${fieldId}".`);
    }
  }

  let usable = false;
  const validRoleValues = new Map();
  const temporalRoleValues = new Map();
  for (const column of columns) {
    const value = row.descriptors[column.fieldId]?.value;
    const missing = isMissing(value);
    if (!missing) usable = true;
    if (column.required && missing) {
      errors.push(`Row ${rowNumber} requires "${column.header}".`);
      validRoleValues.set(column.roleId, false);
      continue;
    }
    if (missing) continue;
    if (!isPlainScalar(value)) {
      errors.push(
        `Row ${rowNumber} field "${column.fieldId}" must be a plain scalar value.`,
      );
      validRoleValues.set(column.roleId, false);
      continue;
    }
    if (column.expectedType === "number") {
      const resolved = resolveBindingValue(value, {
        field: column.fieldId,
        interpretation: "number",
      });
      if (!resolved.ok) {
        errors.push(
          `Row ${rowNumber} field "${column.fieldId}" must be numeric.`,
        );
        validRoleValues.set(column.roleId, false);
      } else {
        validRoleValues.set(column.roleId, true);
      }
      continue;
    }
    if (column.expectedType === "temporal") {
      const parsed = parseTemporalValue(value);
      if (!parsed.ok) {
        errors.push(
          `Row ${rowNumber} field "${column.fieldId}" must be a valid temporal value.`,
        );
        validRoleValues.set(column.roleId, false);
      } else {
        validRoleValues.set(column.roleId, true);
        temporalRoleValues.set(column.roleId, parsed.canonical);
      }
      continue;
    }
    validRoleValues.set(column.roleId, true);
  }
  if (!usable) errors.push(`Row ${rowNumber} is empty.`);
  return { usable, validRoleValues, temporalRoleValues };
}

function strictRecordDescriptors(value, description) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new TypeError(`${description} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${description} must be a plain object.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${description} cannot contain symbol properties.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (UNSAFE_KEYS.has(key)) {
      throw new Error(`${description} contains unsafe property "${key}".`);
    }
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new TypeError(
        `${description} must contain only enumerable data properties; "${key}" is not one.`,
      );
    }
  }
  return descriptors;
}

function strictArrayValues(value, description) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${description} must be an ordinary array.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${description} cannot contain symbol properties.`);
  }
  const expectedNames = new Set([
    "length",
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  for (const name of Object.getOwnPropertyNames(value)) {
    if (!expectedNames.has(name)) {
      throw new TypeError(`${description} contains unknown property "${name}".`);
    }
  }
  const values = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor
      || !Object.hasOwn(descriptor, "value")
      || !descriptor.enumerable
    ) {
      throw new TypeError(
        `${description} must contain only direct data entries.`,
      );
    }
    values.push(descriptor.value);
  }
  return values;
}

function strictStringArray(value, description) {
  const values = strictArrayValues(value, description);
  for (const item of values) {
    if (typeof item !== "string" || item.trim() === "") {
      throw new TypeError(`${description} must contain non-empty strings.`);
    }
  }
  return [...values];
}

function requiredValue(descriptors, key, description) {
  if (!Object.hasOwn(descriptors, key)) {
    throw new Error(`${description} property "${key}" is required.`);
  }
  const descriptor = descriptors[key];
  if (!Object.hasOwn(descriptor, "value")) {
    throw new TypeError(
      `${description} property "${key}" must be a data property.`,
    );
  }
  return descriptor.value;
}

function optionalValue(descriptors, key) {
  if (!Object.hasOwn(descriptors, key)) return undefined;
  const descriptor = descriptors[key];
  if (!Object.hasOwn(descriptor, "value")) {
    throw new TypeError(`Property "${key}" must be a data property.`);
  }
  return descriptor.value;
}

function cloneColumn(column) {
  return {
    fieldId: column.fieldId,
    header: column.header,
    roleId: column.roleId,
    expectedType: column.expectedType,
    accepts: [...column.accepts],
    required: column.required,
    cardinality: { ...column.cardinality },
  };
}

function preferredType(accepts) {
  if (accepts.includes("number")) return "number";
  if (accepts.includes("temporal")) return "temporal";
  return accepts[0];
}

function safeFieldId(value) {
  return typeof value === "string"
    && SAFE_FIELD_ID.test(value)
    && !UNSAFE_KEYS.has(value);
}

function humanizeFieldId(fieldId) {
  const spaced = fieldId
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

function isMissing(value) {
  return value === null
    || value === undefined
    || (typeof value === "string" && value.trim() === "");
}

function isPlainScalar(value) {
  return typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean";
}

function invalidResult(cause) {
  return { valid: false, errors: [safeMessage(cause)] };
}

function safeMessage(cause) {
  const message = typeof cause?.message === "string"
    ? cause.message
    : "Manual data is invalid.";
  return message.length <= 240 ? message : `${message.slice(0, 239)}…`;
}

function display(value) {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  return typeof value;
}
