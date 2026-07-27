const PRIORITY_METRICS = new Set([
  "current",
  "absoluteDelta",
  "percentageDelta",
  "target",
  "distanceFromTarget",
  "riskScore",
]);
const EXPRESSION_KEYS = new Set(["operator", "terms"]);
const TERM_KEYS = new Set(["metric", "weight"]);
const MAX_WEIGHTED_SUM_TERMS = 64;

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function assertSafeRecord(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${description} must be a plain object with own fields.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${description} must be a plain object with own fields.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error(`${description} cannot contain symbol properties.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value")) {
      throw new Error(`${description} must contain data properties, not executable accessors.`);
    }
    if (!descriptor.enumerable) {
      throw new Error(`${description} property "${key}" must be enumerable.`);
    }
  }
  return descriptors;
}

function assertKnownKeys(descriptors, knownKeys, description) {
  for (const key of Object.keys(descriptors)) {
    if (!knownKeys.has(key)) {
      throw new Error(`Unknown ${description} property "${key}".`);
    }
  }
}

function requiredValue(descriptors, key, description) {
  if (!Object.hasOwn(descriptors, key)) {
    throw new Error(`${description} property "${key}" is required.`);
  }
  return descriptors[key].value;
}

function assertSafeTerms(terms) {
  if (!Array.isArray(terms) || Object.getPrototypeOf(terms) !== Array.prototype) {
    throw new Error("Priority weightedSum terms must be an array.");
  }
  if (Object.getOwnPropertySymbols(terms).length > 0) {
    throw new Error("Priority weightedSum terms cannot contain symbol properties.");
  }
  if (terms.length < 1) {
    throw new Error("Priority weightedSum requires at least one term.");
  }
  if (terms.length > MAX_WEIGHTED_SUM_TERMS) {
    throw new Error(`Priority weightedSum accepts at most ${MAX_WEIGHTED_SUM_TERMS} terms.`);
  }
  const expectedKeys = new Set([
    "length",
    ...Array.from({ length: terms.length }, (_, index) => String(index)),
  ]);
  for (const key of Object.getOwnPropertyNames(terms)) {
    if (!expectedKeys.has(key)) {
      throw new Error(`Unknown priority weightedSum terms property "${key}".`);
    }
  }
  for (let index = 0; index < terms.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(terms, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new Error("Priority weightedSum terms must contain only direct data entries.");
    }
  }
}

/**
 * Validates and creates an immutable, safely detached weighted-sum expression.
 */
export function normalizePriorityExpression(expression) {
  const descriptors = assertSafeRecord(expression, "Priority expression");
  assertKnownKeys(descriptors, EXPRESSION_KEYS, "priority expression");
  const operator = requiredValue(descriptors, "operator", "Priority expression");
  if (typeof operator !== "string") {
    throw new Error(`Priority expression operator must be a string; received type ${valueType(operator)}.`);
  }
  if (operator !== "weightedSum") {
    throw new Error(`Unsupported priority expression operator "${operator}".`);
  }
  const terms = requiredValue(descriptors, "terms", "Priority expression");
  assertSafeTerms(terms);

  const normalizedTerms = terms.map((term, index) => {
    const termDescriptors = assertSafeRecord(term, `Priority expression term ${index + 1}`);
    assertKnownKeys(termDescriptors, TERM_KEYS, "priority expression term");
    const metric = requiredValue(termDescriptors, "metric", "Priority expression term");
    const weight = requiredValue(termDescriptors, "weight", "Priority expression term");
    if (typeof metric !== "string") {
      throw new Error(`Priority metric must be a string; received type ${valueType(metric)}.`);
    }
    if (!PRIORITY_METRICS.has(metric)) {
      throw new Error(`Unknown priority metric "${metric}".`);
    }
    if (!Number.isFinite(weight)) {
      throw new Error(`Priority expression weight for "${metric}" must be finite.`);
    }
    return Object.freeze({ metric, weight });
  });

  return Object.freeze({
    operator,
    terms: Object.freeze(normalizedTerms),
  });
}

function finiteMetric(metrics, metric) {
  if (metrics === null || typeof metrics !== "object") {
    throw new Error("Priority metrics must be an object.");
  }
  const descriptor = Object.getOwnPropertyDescriptor(metrics, metric);
  if (!descriptor || !Object.hasOwn(descriptor, "value") || !Number.isFinite(descriptor.value)) {
    throw new Error(`Priority metric "${metric}" must be finite.`);
  }
  return descriptor.value;
}

/**
 * Evaluates the bounded declarative weighted-sum AST without executing source.
 */
export function evaluatePriorityExpression(expression, metrics) {
  const normalized = normalizePriorityExpression(expression);
  let result = 0;
  for (const { metric, weight } of normalized.terms) {
    result += finiteMetric(metrics, metric) * weight;
    if (!Number.isFinite(result)) {
      throw new Error("Priority expression must produce a finite result.");
    }
  }
  return result;
}
