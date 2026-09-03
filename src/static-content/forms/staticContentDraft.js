import {
  normalizeStaticSource,
  validateStaticSource,
} from "../staticSourceSchema.js";
import { createChartDraft } from "../../charting/config/chartConfigV3.js";
import { legacySizeForFootprint, resolveChartFootprint } from "../../components/chartPanelLayout.js";
import { parsePortableQmdWithMedia, serializePortableMediaReference } from "../qmd/portableQmdMedia.js";
import {
  normalizeImageTransform,
  resetImageTransform,
} from "../image/imageTransform.js";
import { validateMediaItem } from "../../content-library/mediaItems.js";

let fallbackIdentitySequence = 0;
const finalizedStaticContentResults = new WeakSet();

export function isFinalizedStaticContentResult(value) {
  return Boolean(value && typeof value === "object" && finalizedStaticContentResults.has(value));
}

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

export function staticContentStageReadiness(state, stage, { previewReady = true } = {}) {
  requireStage(stage);
  try {
    validateStageEntry(state, stage);
    if (stage === "preview-and-add" && !previewReady) {
      throw new Error("Wait for the current content preview to finish validating.");
    }
    return Object.freeze({ ready: true, reason: "" });
  } catch (error) {
    return Object.freeze({
      ready: false,
      reason: error?.message || "This stage is not ready.",
    });
  }
}

export function createStaticContentDraft(options = {}) {
  const mode = options.mode === "edit" ? "edit" : "create";
  const contentTypeId = normalizeTypeId(options.contentTypeId ?? options.panel?.typeId ?? null);
  const draftIdentity = createDraftIdentity(options.panel);
  const panel = normalizePanel(options.panel, contentTypeId, draftIdentity);
  const placement = normalizeSource(options.placement ?? options.source, contentTypeId, draftIdentity);
  const mediaItem = normalizeDraftMediaItem(options.mediaItem, placement, panel, options.assets);
  const imageEditing = createImageEditing(placement);
  const destination = clone(options.destination);
  const baselineStage = mode === "edit" ? "content" : "destination";
  const noTitle = initialNoTitleChoice(options, mode, panel);
  const baseline = {
    destination: clone(destination),
    contentTypeId,
    noTitle,
    panel: clone(panel),
    placement: clone(placement),
    mediaItem: clone(mediaItem),
    assets: clone(options.assets ?? {}),
    pendingMediaItems: {},
  };
  const restoration = normalizeRestoration(options.restoration, baselineStage);
  return {
    mode,
    persistence: "application-session-only",
    stage: STATIC_CONTENT_STAGES.includes(options.stage) ? options.stage : baselineStage,
    status: "editing",
    destination,
    contentTypeId,
    noTitle,
    draftIdentity,
    panel,
    source: placement,
    placement,
    mediaItem,
    imageEditing,
    assets: clone(options.assets ?? {}),
    pendingMediaItems: {},
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
    case "trySetStage": {
      requireStage(action.stage);
      return tryStageTransition(state, action.stage, { previewReady: action.previewReady });
    }
    case "tryNext": {
      const currentIndex = STATIC_CONTENT_STAGES.indexOf(state.stage);
      if (currentIndex >= STATIC_CONTENT_STAGES.length - 1) return state;
      return tryStageTransition(state, STATIC_CONTENT_STAGES[currentIndex + 1], {
        previewReady: action.previewReady,
      });
    }
    case "setStage": {
      requireStage(action.stage);
      requireStaticContentStageReady(state, action.stage);
      return { ...state, stage: action.stage, validation: { errors: [], warnings: [] }, focusRequest: null };
    }
    case "next": {
      const currentIndex = STATIC_CONTENT_STAGES.indexOf(state.stage);
      if (currentIndex >= STATIC_CONTENT_STAGES.length - 1) return state;
      const stage = STATIC_CONTENT_STAGES[currentIndex + 1];
      requireStaticContentStageReady(state, stage);
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
        ? state.placement
        : normalizeSource(null, contentTypeId, state.draftIdentity);
      const mediaItem = normalizeDraftMediaItem(null, source, panel, state.assets);
      return authored(state, {
        contentTypeId,
        panel,
        source,
        placement: source,
        mediaItem,
        pendingMediaItems: {},
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
    case "setNoTitle":
      requireContentStage(state);
      return authored(state, {
        noTitle: action.noTitle === true,
        status: "editing",
      });
    case "updateSource":
      requireContentStage(state);
      {
        const source = normalizeStaticSource({ ...state.source, ...(action.updates ?? {}) });
        return authored(state, {
          source,
          placement: source,
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
        placement: state.source.decorative
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
        placement: normalizeStaticSource({ ...state.source, decorative, alt: decorative ? "" : preservedAlt }),
        imageEditing: { ...state.imageEditing, preservedAlt },
        status: "editing",
      });
    }
    case "selectMediaItem": {
      requireImageContentStage(state);
      const mediaItem = clone(action.mediaItem);
      const assets = action.manifestEntry
        ? { ...state.assets, [mediaItem.current?.assetId]: clone(action.manifestEntry) }
        : state.assets;
      validateMediaItem(mediaItem, { assets });
      const isNewPlacement = state.mode === "create"
        && (!state.mediaItem || state.mediaItem.health === "needs-relink");
      const preservedAlt = isNewPlacement
        ? initialNonDecorativeAlt(mediaItem)
        : state.source.decorative ? "" : state.source.alt;
      const placement = normalizeStaticSource({
        ...state.source,
        mediaId: mediaItem.mediaId,
        alt: state.source.decorative ? "" : preservedAlt,
        ...(isNewPlacement ? {} : resetImageTransform()),
      });
      return authored(state, {
        source: placement,
        placement,
        mediaItem,
        assets,
        imageEditing: {
          ...state.imageEditing,
          preservedAlt,
          altReviewRequired: !isNewPlacement,
          replacementUndo: isNewPlacement ? null : {
            source: clone(state.source),
            mediaItem: clone(state.mediaItem),
            assets: clone(state.assets),
          },
        },
        status: "editing",
      });
    }
    case "stageQmdMedia": {
      requireContentStage(state);
      if (state.source?.kind !== "staticText") throw new Error("QMD media staging requires Free text content.");
      const mediaItem = clone(action.mediaItem);
      const assets = action.manifestEntry
        ? { ...state.assets, [mediaItem.current?.assetId]: clone(action.manifestEntry) }
        : state.assets;
      validateMediaItem(mediaItem, { assets });
      if (!["asset", "package"].includes(mediaItem.current.kind) || mediaItem.health !== "ready") {
        throw new Error("QMD can stage only ready stored or packaged media.");
      }
      return authored(state, {
        assets,
        pendingMediaItems: action.manifestEntry
          ? { ...state.pendingMediaItems, [mediaItem.mediaId]: mediaItem }
          : state.pendingMediaItems,
        status: "editing",
      });
    }
    case "insertQmdMedia": {
      requireContentStage(state);
      if (state.source?.kind !== "staticText") throw new Error("QMD media insertion requires Free text content.");
      const mediaItem = clone(action.mediaItem);
      const assets = action.manifestEntry
        ? { ...state.assets, [mediaItem.current?.assetId]: clone(action.manifestEntry) }
        : state.assets;
      validateMediaItem(mediaItem, { assets });
      if (!["asset", "package"].includes(mediaItem.current.kind) || mediaItem.health !== "ready") {
        throw new Error("QMD can insert only ready stored or packaged media.");
      }
      const reference = serializePortableMediaReference({
        mediaId: mediaItem.mediaId,
        alt: initialNonDecorativeAlt(mediaItem),
      });
      const separator = state.source.qmd.trim() ? "\n\n" : "";
      const source = normalizeStaticSource({ ...state.source, qmd: `${state.source.qmd}${separator}${reference}` });
      return authored(state, {
        source,
        placement: source,
        assets,
        pendingMediaItems: action.manifestEntry
          ? { ...state.pendingMediaItems, [mediaItem.mediaId]: mediaItem }
          : state.pendingMediaItems,
        status: "editing",
      });
    }
    case "replaceImage": {
      requireImageContentStage(state);
      const assets = action.manifestEntry
        ? { ...state.assets, [action.origin?.assetId]: clone(action.manifestEntry) }
        : state.assets;
      {
        const placement = normalizeStaticSource({
          ...state.source,
          ...resetImageTransform(),
        });
        const current = clone(action.current ?? action.origin);
        const mediaItem = mediaItemForCurrent(
          state.mediaItem,
          placement,
          state.panel,
          current,
          action.manifestEntry,
          draftMediaRevision(state),
        );
        return authored(state, {
        source: placement,
        placement,
        mediaItem,
        assets,
        imageEditing: {
          ...state.imageEditing,
          altReviewRequired: true,
          replacementUndo: {
            source: clone(state.source),
            mediaItem: clone(state.mediaItem),
            assets: clone(state.assets),
          },
        },
        status: "editing",
      });
      }
    }
    case "undoImageReplacement": {
      requireImageContentStage(state);
      const undo = state.imageEditing?.replacementUndo;
      if (!undo) return state;
      return authored(state, {
        source: clone(undo.source),
        placement: clone(undo.source),
        mediaItem: clone(undo.mediaItem),
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
      {
        const placement = normalizeStaticSource({
          ...state.source,
          ...normalizeImageTransform({
            crop: action.crop ?? state.source.crop,
            rotation: action.rotation ?? state.source.rotation,
            fit: action.fit ?? state.source.fit,
          }),
        });
        return authored(state, { source: placement, placement,
        status: "editing",
      });
      }
    }
    case "resetImage":
      requireImageContentStage(state);
      {
        const placement = normalizeStaticSource({ ...state.source, ...resetImageTransform() });
        return authored(state, {
        source: placement,
        placement,
        status: "editing",
      });
      }
    case "setMediaCurrent": {
      requireImageContentStage(state);
      const current = clone(action.current);
      const mediaItem = mediaItemForCurrent(
        state.mediaItem,
        state.placement,
        state.panel,
        current,
        undefined,
        draftMediaRevision(state),
      );
      return authored(state, { mediaItem, status: "editing" });
    }
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
    case "reset":
      return restoreStaticContentBaseline(state, { status: "editing" });
    case "discard":
      return restoreStaticContentBaseline(state, { status: "discarded" });
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
  const placement = sourceForAuthoringSave(state.placement, { assets: state.assets });
  if (placement.kind === "staticImage") validateMediaItem(state.mediaItem, { assets: state.assets });
  validateFreeTextContent(placement);
  const title = validateStaticPanelTitleChoice(state.panel?.title, state.noTitle);
  const panel = {
    ...normalizePanel(state.panel, state.contentTypeId, state.draftIdentity),
    title,
  };
  requiredText(panel.sourceId, "Static panel source id");
  const result = {
    destination: clone(state.destination),
    panel: clone(panel),
    placement: clone(placement),
    mediaItem: clone(state.mediaItem),
    assets: finalizedAssetsForSource(placement, state.mediaItem, state.assets),
    stagedAssetIds: stagedAssetIdsForSource(state.mediaItem, state.assets),
  };
  finalizedStaticContentResults.add(result);
  return result;
}

function finalizedAssetsForSource(source, mediaItem, assets = {}) {
  if (source?.kind !== "staticImage" || mediaItem?.current?.kind !== "asset") return {};
  const entry = assets[mediaItem.current.assetId];
  return entry ? { [mediaItem.current.assetId]: clone(entry) } : {};
}

function stagedAssetIdsForSource(mediaItem, assets = {}) {
  const assetId = mediaItem?.current?.kind === "asset" ? mediaItem.current.assetId : null;
  return assetId && assets[assetId]?.storageState === "staged" ? [assetId] : [];
}

export function isStaticContentDraftDirty(state) {
  if (!state?.baseline) return false;
  if (state.mode === "create") return hasRetainableStaticContentMutation(state);
  const current = {
    destination: state.destination,
    contentTypeId: state.contentTypeId,
    noTitle: state.noTitle,
    panel: state.panel,
    placement: state.placement,
    mediaItem: state.mediaItem,
    assets: state.assets,
    pendingMediaItems: state.pendingMediaItems,
  };
  return JSON.stringify(current) !== JSON.stringify(state.baseline);
}

export function hasRetainableStaticContentMutation(state) {
  if (!state?.contentTypeId || !state?.draftIdentity) return false;
  if (state.mode === "edit") {
    const current = {
      destination: state.destination,
      contentTypeId: state.contentTypeId,
      noTitle: state.noTitle,
      panel: state.panel,
      placement: state.placement,
      mediaItem: state.mediaItem,
      assets: state.assets,
      pendingMediaItems: state.pendingMediaItems,
    };
    return JSON.stringify(current) !== JSON.stringify(state.baseline);
  }
  const defaultPanel = normalizePanel(null, state.contentTypeId, state.draftIdentity);
  const defaultPlacement = normalizeSource(null, state.contentTypeId, state.draftIdentity);
  const defaultMediaItem = normalizeDraftMediaItem(null, defaultPlacement, defaultPanel, state.baseline?.assets ?? {});
  return JSON.stringify({
    noTitle: state.noTitle,
    panel: state.panel,
    placement: state.placement,
    mediaItem: state.mediaItem,
    pendingMediaItems: state.pendingMediaItems ?? {},
  }) !== JSON.stringify({
    noTitle: false,
    panel: defaultPanel,
    placement: defaultPlacement,
    mediaItem: defaultMediaItem,
    pendingMediaItems: {},
  });
}

function restoreStaticContentBaseline(state, { status }) {
  return {
    ...state,
    destination: clone(state.baseline.destination),
    contentTypeId: state.baseline.contentTypeId,
    noTitle: state.baseline.noTitle,
    panel: clone(state.baseline.panel),
    source: clone(state.baseline.placement),
    placement: clone(state.baseline.placement),
    mediaItem: clone(state.baseline.mediaItem),
    imageEditing: createImageEditing(state.baseline.placement),
    assets: clone(state.baseline.assets),
    pendingMediaItems: clone(state.baseline.pendingMediaItems ?? {}),
    stage: state.mode === "edit" ? "content" : "destination",
    status,
    confirmation: null,
    validation: { errors: [], warnings: [] },
    focusRequest: state.mode === "edit"
      ? state.baselineRestoration?.focusId ?? state.baselineRestoration?.invokerId
      : state.baselineRestoration?.invokerId,
    baseline: clone(state.baseline),
  };
}

export function projectStaticContentDraftOwner({
  draft,
  dirty = isStaticContentDraftDirty(draft),
  active = true,
  placementId = null,
  status = "dirty",
  surface = "composer",
  focusId = null,
  scrollTop = 0,
} = {}) {
  if (!draft || dirty !== true || !["dirty", "saving", "error"].includes(status)) return null;
  const edit = draft.mode === "edit";
  if (!edit && !hasRetainableStaticContentMutation(draft)) return null;
  const scopeId = edit ? String(placementId ?? "").trim() : String(draft.draftIdentity?.panelId ?? "").trim();
  if (!scopeId) return null;
  const kind = edit ? "text-image-edit" : "text-image-create";
  return Object.freeze({
    draftId: `${kind}:${scopeId}`,
    kind,
    scopeId,
    targetId: scopeId,
    status,
    activity: active ? "active" : "suspended",
    surface,
    restoration: Object.freeze({
      surface,
      focusId: typeof focusId === "string" && focusId ? focusId : null,
      scrollTop: Number.isFinite(scrollTop) && scrollTop >= 0 ? scrollTop : 0,
    }),
  });
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

function tryStageTransition(state, stage, { previewReady = true } = {}) {
  const readiness = staticContentStageReadiness(state, stage, { previewReady });
  if (readiness.ready) {
    return {
      ...state,
      stage,
      validation: { errors: [], warnings: [] },
      focusRequest: null,
    };
  }
  const detail = transitionValidationDetail(state, stage, readiness.reason);
  return {
    ...state,
    status: "editing",
    validation: {
      errors: [{
        ...(detail.field ? { field: detail.field } : {}),
        ...(detail.focusId ? { focusId: detail.focusId } : {}),
        message: readiness.reason,
      }],
      warnings: [],
    },
    focusRequest: detail.focusId ?? null,
  };
}

function transitionValidationDetail(state, stage, fallbackMessage) {
  try {
    validateStageEntry(state, stage);
  } catch (error) {
    return error ?? new Error(fallbackMessage);
  }
  return new Error(fallbackMessage);
}

function requireStaticContentStageReady(state, stage, options) {
  const readiness = staticContentStageReadiness(state, stage, options);
  if (!readiness.ready) throw new Error(readiness.reason);
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
  const footprint = resolveChartFootprint(value.layout ?? defaults.layout);
  return {
    ...defaults,
    ...clone(value),
    id,
    typeId: contentTypeId,
    title: value.title ?? "",
    description: value.description ?? "",
    sourceId,
    layout: {
      ...(defaults.layout ?? {}),
      ...(clone(value.layout) ?? {}),
      size: legacySizeForFootprint(footprint),
      width: footprint.columns,
      height: footprint.rows,
    },
  };
}

function initialNoTitleChoice(options, mode, panel) {
  if (typeof options.noTitle === "boolean") return options.noTitle;
  return mode === "edit" && String(panel?.title ?? "").trim() === "";
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

function normalizeSource(source, contentTypeId, draftIdentity) {
  if (source) return normalizeStaticSource(source);
  if (contentTypeId === "freeText") return normalizeStaticSource({ kind: "staticText", qmd: "" });
  if (contentTypeId === "image") {
    return normalizeStaticSource({
      kind: "staticImage",
      mediaId: `media-${draftIdentity.panelId}`,
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
    if (state.source?.kind === "staticImage") validateMediaItem(state.mediaItem, { assets: state.assets });
    validateFreeTextContent(state.source);
    validateStaticPanelTitleChoice(state.panel?.title, state.noTitle);
  }
}

export function validateStaticPanelTitleChoice(value, noTitle = false) {
  const title = String(value ?? "");
  const hasTitle = title.trim() !== "";
  if (!hasTitle && noTitle !== true) {
    throw draftValidationError(
      "Enter a panel title or select No title.",
      "static-panel-title",
    );
  }
  if (hasTitle && noTitle === true) {
    throw draftValidationError(
      "Clear the title or unselect No title.",
      "static-panel-no-title",
    );
  }
  return noTitle === true ? "" : title;
}

function draftValidationError(message, focusId) {
  const error = new Error(message);
  error.field = "title";
  error.focusId = focusId;
  return error;
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
  validateStaticSource(normalized, { assets });
  return normalized;
}

function normalizeDraftMediaItem(value, placement, panel, assets = {}) {
  if (placement?.kind !== "staticImage") return null;
  if (value) {
    validateMediaItem(value, { assets: assets ?? {} });
    if (value.mediaId !== placement.mediaId) throw new Error("Image placement mediaId must match its MediaItem.");
    return clone(value);
  }
  return {
    mediaId: placement.mediaId,
    revision: 1,
    current: { kind: "asset", assetId: `missing-${placement.mediaId}` },
    displayName: panel?.title || placement.mediaId,
    defaultDescription: placement.decorative ? "" : placement.alt ?? "",
    origin: "legacy-import",
    health: "needs-relink",
  };
}

function mediaItemForCurrent(previous, placement, panel, current, manifestEntry, revision) {
  return {
    mediaId: placement.mediaId,
    revision,
    current,
    displayName: previous?.displayName ?? panel?.title ?? placement.mediaId,
    defaultDescription: previous?.defaultDescription ?? (placement.decorative ? "" : placement.alt ?? ""),
    origin: current.kind === "asset" ? "uploaded" : current.kind === "package" ? "packaged" : "external",
    health: current.kind === "url" ? "external" : "ready",
    ...(manifestEntry ? {
      dimensions: { width: manifestEntry.width, height: manifestEntry.height },
      byteLength: manifestEntry.byteLength,
      mediaType: manifestEntry.mediaType,
    } : {}),
  };
}

function draftMediaRevision(state) {
  const baseline = state.baseline?.mediaItem;
  if (state.mode === "create" && baseline === null) return 1;
  if (state.mode === "create" && baseline?.health === "needs-relink") return 1;
  return (baseline?.revision ?? state.mediaItem?.revision ?? 0) + 1;
}

function validateFreeTextContent(source) {
  if (source?.kind !== "staticText") return;
  const parsed = parsePortableQmdWithMedia(source.qmd);
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

function initialNonDecorativeAlt(mediaItem) {
  const description = typeof mediaItem?.defaultDescription === "string"
    ? mediaItem.defaultDescription.trim()
    : "";
  if (description) return description;
  return typeof mediaItem?.displayName === "string" ? mediaItem.displayName.trim() : "";
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
