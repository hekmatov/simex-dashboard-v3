const UNHEALTHY = new Set(["missing", "corrupt", "needs-relink", "needs-review"]);

/**
 * Classifies a persisted content record without replacing its identity or
 * dependency-facing fields.  Byte/read evidence is deliberately supplied by
 * the caller: this module never probes storage or silently changes content.
 */
export function deriveContentHealth({
  item,
  asset = undefined,
  failure = null,
  requiresRelink = false,
  requiresReview = false,
} = {}) {
  requireRecord(item, "Content item");
  const health = item?.current?.kind === "url"
    ? "external"
    : requiresRelink === true
    ? "needs-relink"
    : requiresReview === true
    ? "needs-review"
    : failure
    ? "corrupt"
    : item?.current?.kind === "asset" && asset === null
    ? "missing"
    : "ready";
  const result = {
    health,
    item: Object.freeze({ ...structuredClone(item), health }),
    repair: recoveryFor(health),
  };
  return Object.freeze(result);
}

/**
 * Routes recovery through a caller-owned, already validated replacement or
 * relink transaction.  It deliberately has no direct persistence path.
 */
export async function repairContentItem({
  dashboard,
  itemKind,
  itemId,
  prepare,
  commit,
  replacement = null,
  context = undefined,
} = {}) {
  requireRecord(dashboard, "Content repair dashboard");
  requiredText(itemKind, "Content repair item kind");
  requiredText(itemId, "Content repair item id");
  if (typeof prepare !== "function" || typeof commit !== "function") {
    throw new TypeError("Content repair requires validated prepare and commit transactions.");
  }
  const identity = identityFor(dashboard, itemKind, itemId);
  if (!identity) throw new Error(`Managed ${itemKind} "${itemId}" is unavailable for repair.`);
  const plan = await prepare({
    dashboard: structuredClone(dashboard),
    itemKind,
    itemId,
    replacement: structuredClone(replacement),
    context,
  });
  const committed = await commit(plan, { itemKind, itemId, context });
  return Object.freeze({
    itemKind,
    itemId,
    identity: Object.freeze(structuredClone(identity)),
    ...(committed && typeof committed === "object" ? committed : { result: committed }),
  });
}

export function contentHealthMessage(health) {
  if (health === "missing") return "The saved content bytes are missing. Repair it in Build.";
  if (health === "corrupt") return "The saved content bytes are corrupt. Repair it in Build.";
  if (health === "needs-relink") return "This saved content needs relinking in Build.";
  if (health === "needs-review") return "This saved content needs review in Build.";
  return "This saved content is unavailable.";
}

function recoveryFor(health) {
  if (health === "missing" || health === "corrupt") return Object.freeze({ action: "replace" });
  if (health === "needs-relink") return Object.freeze({ action: "relink" });
  if (health === "needs-review") return Object.freeze({ action: "review" });
  return null;
}

function identityFor(dashboard, itemKind, itemId) {
  if (itemKind === "media") return dashboard.contentLibrary?.mediaItems?.[itemId] ?? null;
  if (itemKind === "source") return dashboard.contentLibrary?.sourceEntries?.[itemId] ?? null;
  throw new Error(`Content repair item kind "${itemKind}" is unsupported.`);
}

function requireRecord(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}

export { UNHEALTHY };
