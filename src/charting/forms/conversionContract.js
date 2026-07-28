import { canonicalColumnType } from "../data/bindings.js";

export const CHART_CONVERSION_CONTRACT = deepFreeze({
  version: 1,
  compatible_when: [
    "same_type",
    "source_declares_target_compatible",
  ],
  otherwise: "remap",
  preserve_roles_when: [
    "same_role_id",
    "target_accepts_assignment",
  ],
  missing_required_target_roles: "require_binding",
});

export function chartConversionKind(sourceSchema, targetSchema) {
  return (
    sourceSchema.typeId === targetSchema.typeId
    || sourceSchema.conversions.includes(targetSchema.typeId)
  )
    ? "compatible"
    : CHART_CONVERSION_CONTRACT.otherwise;
}

export function preservedTargetRoleAssignments(
  sourceRoles,
  targetSchema,
  {
    cloneAssignment = (assignment) => structuredClone(assignment),
  } = {},
) {
  if (!isRecord(sourceRoles)) return {};
  const retained = {};
  for (const role of targetSchema.roles) {
    if (
      Object.hasOwn(sourceRoles, role.id)
      && targetRoleAssignmentAccepted(sourceRoles[role.id], role)
    ) {
      retained[role.id] = cloneAssignment(sourceRoles[role.id], role);
    }
  }
  return retained;
}

export function targetRoleAssignmentCount(assignment, role) {
  if (assignment === undefined || assignment === null) return 0;
  if (role.max === null) {
    return Array.isArray(assignment) ? assignment.length : 0;
  }
  return Array.isArray(assignment) ? assignment.length : 1;
}

export function targetRoleAssignmentAccepted(assignment, role) {
  const count = targetRoleAssignmentCount(assignment, role);
  if (
    count < role.min
    || (role.max !== null && count > role.max)
  ) {
    return false;
  }
  if (count === 0) return true;
  if (role.max === null && !Array.isArray(assignment)) return false;
  if (role.max !== null && Array.isArray(assignment)) return false;
  const bindings = Array.isArray(assignment) ? assignment : [assignment];
  return bindings.every((binding) => bindingAccepted(binding, role));
}

function bindingAccepted(binding, role) {
  if (!isRecord(binding)) return false;
  if (typeof binding.field !== "string" || binding.field.trim() === "") {
    return false;
  }
  if (binding.interpretation === undefined) return true;
  if (typeof binding.interpretation !== "string") return false;
  const interpretation = canonicalColumnType(binding.interpretation);
  return (
    role.accepts.includes("any")
    || role.accepts.includes(interpretation)
  );
}

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}
