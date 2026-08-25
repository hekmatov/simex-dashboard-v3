import {
  normalizeStaticSource,
  validateStaticSource,
} from "../staticSourceSchema.js";
import { createChartDraft } from "../../charting/config/chartConfigV3.js";
import { parsePortableQmd } from "../qmd/parsePortableQmd.js";
import {
  normalizeImageTransform,
  resetImageTransform,
} from "../image/imageTransform.js";

let fallbackIdentitySequence = 0;

export const STATIC_CONTENT_STAGES = Object.freeze([
  "destination",
  "content-type",
  "content",
  "preview-and-add",
]);

export const STATIC_CONTENT_STAGE_LABELS = Object.freeze([
  "Destination",
  "Content type",
  "Content",
  "Preview & add",
]);

export function createStaticContentDraft(options = {}) {
  const mode = options.mode === "edit" ? "edit" : "create";
  const contentTypeId = normalizeTypeId(options.contentTypeId ?? options.panel?.typeId ?? null);
  const draftIdentity = createDraftIdentity(options.panel);
  const panel = normalizePanel(options.panel, contentTypeId, draftIdentity);
  const source = normalizeSource(options.source, contentTypeId);
  const imageEditing = createImageEditing(source);
  const destination = clone(options.destination);
  const baselineStage = mode === "edit" ? "content" : "destination";
  const baseline = {
    destination: clone(destination),
    contentTypeId,
    panel: clone(panel),
    source: clone(source),
    assets: clone(options.assets ?? {}),
  };
  const restoration = normalizeRestoration(options.restoration, baselineStage);
  return {
    mode,
    persistence: "application-session-only",
    stage: STATIC_CONTENT_STAGES.includes(options.stage) ? options.stage : baselineStage,
    status: "editing",
    destination,
    contentTypeId,
    draftIdentity,
    panel,
    source,
    imageEditing,
    assets: clone(options.assets ?? {}),
    draftRevision: Number.isInteger(options.draftRevision) && options.draftRevision >= 0
      ? options.draftRevision
      : 0,
    validation: { errors: [], warnings: [] },
    confirmation: null,
    restoration,
    baselineRestoration: clone(restoration),
    focusRequest: null,
    baseline,
  };
}

export function reduceStaticContentDraft(state, action = {}) {
  requireDraft(state);
  switch (action.type) {
    case "setStage": {
      requireStage(action.stage);
      validateStageEntry(state, action.stage);
      return { ...state, stage: action.stage, validation: { errors: [], warnings: [] }, focusRequest: null };
    }
    case "next": {
      const currentIndex = STATIC_CONTENT_STAGES.indexOf(state.stage);
      if (currentIndex >= STATIC_CONTENT_STAGES.length - 1) return state;
      const stage = STATIC_CONTENT_STAGES[currentIndex + 1];
      validateStageEntry(state, stage);
      return { ...state, stage, validation: { errors: [], warnings: [] }, focusRequest: null };
    }
    case "previous": {
      const currentIndex = STATIC_CONTENT_STAGES.indexOf(state.stage);
      return currentIndex <= 0 ? state : { ...state, stage: STATIC_CONTENT_STAGES[currentIndex - 1], focusRequest: null };
    }
    case "setDestination":
      return authored(state, { destination: clone(action.destination), status: "editing" });
    case "setContentType": {
      if (state.stage === "preview-and-add") throw new Error("Content type changes belong to the Content type stage.");
      const contentTypeId = normalizeTypeId(action.contentTypeId);
      if (!contentTypeId) throw new Error("Static content type is required.");
      const panel = normalizePanel(
        { ...state.panel, typeId: contentTypeId },
        contentTypeId,
        state.draftIdentity,
      );
      const source = state.contentTypeId === contentTypeId
        ? state.source
        : normalizeSource(null, contentTypeId);
      return authored(state, {
        contentTypeId,
        panel,
        source,
        imageEditing: createImageEditing(source),
        status: "editing",
      });
    }
    case "setPanel":
      requireContentStage(state);
      return authored(state, {
        panel: normalizePanel(
          { ...state.panel, ...(action.updates ?? {}) },
          state.contentTypeId,
          state.draftIdentity,
        ),
        status: "editing",
      });
    case "updateSource":
      requireContentStage(state);
      {
        const source = normalizeStaticSource({ ...state.source, ...(action.updates ?? {}) });
        return authored(state, {
          source,
          imageEditing: source.kind === "staticImage" && !source.decorative && source.alt.trim()
            ? { ...state.imageEditing, preservedAlt: source.alt }
            : state.imageEditing,
          status: "editing",
        });
      }
    case "setImageAlt": {
      requireImageContentStage(state);
      const alt = String(action.alt ?? "");
      return authored(state, {
        source: state.source.decorative
          ? state.source
          : normalizeStaticSource({ ...state.source, alt }),
        imageEditing: { ...state.imageEditing, preservedAlt: alt, altReviewRequired: false },
        status: "editing",
      });
    }
    case "setImageDecorative": {
      requireImageContentStage(state);
      const decorative = action.decorative === true;
      const preservedAlt = decorative
        ? state.source.alt || state.imageEditing?.preservedAlt || ""
        : state.imageEditing?.preservedAlt || "";
      return authored(state, {
        source: normalizeStaticSource({
          ...state.source,
          decorative,
          alt: decorative ? "" : preservedAlt,
        }),
        imageEditing: { ...state.imageEditing, preservedAlt },
        status: "editing",
      });
    }
    case "replaceImage": {
      requireImageContentStage(state);
      const assets = action.manifestEntry
        ? { ...state.assets, [action.origin?.assetId]: clone(action.manifestEntry) }
        : state.assets;
      return authored(state, {
        source: normalizeStaticSource({
          ...state.source,
          ...resetImageTransform(),
          origin: clone(action.origin),
        }),
        assets,
        imageEditing: {
          ...state.imageEditing,
          altReviewRequired: true,
          replacementUndo: {
            source: clone(state.source),
            assets: clone(state.assets),
          },
        },
        status: "editing",
      });
    }
    case "undoImageReplacement": {
      requireImageContentStage(state);
      const undo = state.imageEditing?.replacementUndo;
      if (!undo) return state;
      return authored(state, {
        source: clone(undo.source),
        assets: clone(undo.assets),
        imageEditing: {
          ...createImageEditing(undo.source),
          replacementUndo: null,
          altReviewRequired: false,
        },
        status: "editing",
      });
    }
    case "setImageTransform": {
      requireImageContentStage(state);
      return authored(state, {
        source: normalizeStaticSource({
          ...state.source,
          ...normalizeImageTransform({
            crop: action.crop ?? state.source.crop,
            rotation: action.rotation ?? state.source.rotation,
            fit: action.fit ?? state.source.fit,
          }),
        }),
        status: "editing",
      });
    }
    case "resetImage":
      requireImageContentStage(state);
      return authored(state, {
        source: normalizeStaticSource({ ...state.source, ...resetImageTransform() }),
        status: "editing",
      });
    case "setAssets":
      requireContentStage(state);
      return authored(state, { assets: clone(action.assets ?? {}), status: "editing" });
    case "requestCancel": {
      if (!isStaticContentDraftDirty(state)) return { ...state, status: "discarded", confirmation: null };
      return {
        ...state,
        confirmation: "discard",
        restoration: normalizeRestoration(action.restoration, state.stage),
        focusRequest: null,
      };
    }
    case "keepEditing":
      return {
        ...state,
        confirmation: null,
        status: "editing",
        focusRequest: state.restoration.focusId,
      };
    case "discard":
      return {
        ...state,
        destination: clone(state.baseline.destination),
        contentTypeId: state.baseline.contentTypeId,
        panel: clone(state.baseline.panel),
        source: clone(state.baseline.source),
        imageEditing: createImageEditing(state.baseline.source),
        assets: clone(state.baseline.assets),
        stage: state.mode === "edit" ? "content" : "destination",
        status: "discarded",
        confirmation: null,
        validation: { errors: [], warnings: [] },
        focusRequest: state.mode === "edit"
          ? state.baselineRestoration?.focusId ?? state.baselineRestoration?.invokerId
          : state.baselineRestoration?.invokerId,
        baseline: clone(state.baseline),
      };
    case "commitStarted":
      return { ...state, status: "committing", validation: { errors: [], warnings: [] } };
    case "commitFailed":
      return {
        ...state,
        status: "failed",
        validation: { errors: [{ message: action.error?.message ?? "Static content could not be saved." }], warnings: [] },
      };
    case "committed":
      return { ...state, status: "committed", confirmation: null, focusRequest: state.restoration.invokerId };
    default:
      throw new Error(`Unknown static content draft action "${String(action.type)}".`);
  }
}

export function finalizeStaticContentDraft(state) {
  requireDraft(state);
  if (state.stage !== "preview-and-add") throw new Error("Static content must reach Preview & add before finalization.");
  validateDestinationValue(state.destination);
  if (!state.contentTypeId) throw new Error("Static content type is required.");
  const source = sourceForAuthoringSave(state.source, { assets: state.assets });
  validateFreeTextContent(source);
  const panel = normalizePanel(state.panel, state.contentTypeId, state.draftIdentity);
  requiredText(panel.title, "Static panel title");
  requiredText(panel.sourceId, "Static panel source id");
  return {
    destination: clone(state.destination),
    panel: clone(panel),
    source: clone(source),
    assets: clone(state.assets),
    draftRevision: state.draftRevision,
  };
}

export function isStaticContentDraftDirty(state) {
  if (!state?.baseline) return false;
  const current = {
    destination: state.destination,
    contentTypeId: state.contentTypeId,
    panel: state.panel,
    source: state.source,
    assets: state.assets,
  };
  return JSON.stringify(current) !== JSON.stringify(state.baseline);
}

function authored(state, updates) {
  return {
    ...state,
    ...updates,
    draftRevision: state.draftRevision + 1,
    confirmation: null,
    focusRequest: null,
    validation: { errors: [], warnings: [] },
  };
}

function normalizePanel(panel, contentTypeId, draftIdentity) {
  if (!panel && !contentTypeId) return null;
  const value = panel ?? {};
  const id = value.id ?? draftIdentity.panelId;
  const sourceId = value.sourceId ?? draftIdentity.sourceId;
  const defaults = createChartDraft({
    typeId: contentTypeId,
    id,
    title: value.title ?? "",
    description: value.description ?? "",
    sourceId,
  });
  return {
    ...defaults,
    ...clone(value),
    id,
    typeId: contentTypeId,
    title: value.title ?? "",
    description: value.description ?? "",
    sourceId,
  };
}

function createDraftIdentity(panel) {
  const token = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${(fallbackIdentitySequence += 1).toString(36)}`;
  const panelId = panel?.id ?? `static-${token}`;
  return Object.freeze({
    panelId,
    sourceId: panel?.sourceId ?? `${panelId}-source`,
  });
}

function normalizeSource(source, contentTypeId) {
  if (source) return normalizeStaticSource(source);
  if (contentTypeId === "freeText") return normalizeStaticSource({ kind: "staticText", qmd: "" });
  if (contentTypeId === "image") {
    return normalizeStaticSource({
      kind: "staticImage",
      origin: { kind: "replacementRequired", reason: "Choose an image." },
      alt: "",
    });
  }
  return null;
}

function normalizeTypeId(value) {
  if (value === null || value === undefined || value === "") return null;
  if (!["freeText", "image"].includes(value)) throw new Error(`Unknown static content type "${String(value)}".`);
  return value;
}

function validateStageEntry(state, stage) {
  if (STATIC_CONTENT_STAGES.indexOf(stage) >= 1) validateDestinationValue(state.destination);
  if (STATIC_CONTENT_STAGES.indexOf(stage) >= 2 && !state.contentTypeId) throw new Error("Choose a static content type before continuing.");
  if (stage === "preview-and-add") {
    sourceForAuthoringSave(state.source, { assets: state.assets });
    validateFreeTextContent(state.source);
    requiredText(state.panel?.title, "Static panel title");
  }
}

function sourceForAuthoringSave(source, { assets } = {}) {
  validateStaticSource(source, { assets });
  const normalized = normalizeStaticSource(source);
  if (
    normalized.kind === "staticImage"
    && !normalized.decorative
    && normalized.alt.trim() === ""
  ) {
    throw new Error("A non-decorative image requires alternative text before save.");
  }
  if (normalized.kind === "staticImage") delete normalized.migrationWarnings;
  validateStaticSource(normalized, { assets });
  return normalized;
}

function validateFreeTextContent(source) {
  if (source?.kind !== "staticText") return;
  const parsed = parsePortableQmd(source.qmd);
  if (parsed.ok) return;
  const first = parsed.errors[0];
  throw new Error(`${first.message} Line ${first.location.line}, column ${first.location.column}. ${first.guidance}`);
}

function validateDestinationValue(destination) {
  requiredText(destination?.pageId, "Static destination page id");
  requiredText(destination?.sectionId, "Static destination section id");
}

function normalizeRestoration(restoration, stage) {
  return {
    stage: STATIC_CONTENT_STAGES.includes(restoration?.stage) ? restoration.stage : stage,
    focusId: typeof restoration?.focusId === "string" ? restoration.focusId : null,
    invokerId: typeof restoration?.invokerId === "string" ? restoration.invokerId : null,
  };
}

function requireDraft(state) {
  if (!state || typeof state !== "object") throw new TypeError("Static content draft state is required.");
}

function requireStage(stage) {
  if (!STATIC_CONTENT_STAGES.includes(stage)) throw new Error(`Unknown static content stage "${String(stage)}".`);
}

function requireContentStage(state) {
  if (state.stage !== "content") throw new Error("Static source and panel controls belong to the Content stage.");
}

function requireImageContentStage(state) {
  requireContentStage(state);
  if (state.source?.kind !== "staticImage") throw new Error("Image authoring requires a static Image source.");
}

function createImageEditing(source) {
  if (source?.kind !== "staticImage") return null;
  return {
    preservedAlt: source.decorative ? "" : source.alt ?? "",
    altReviewRequired: false,
    replacementUndo: null,
  };
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
