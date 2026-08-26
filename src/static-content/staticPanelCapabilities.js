import { listChartTypeOptions } from "../charting/forms/chartCatalogue.js";
import {
  chartSchemaRegistry,
  getChartSchema,
} from "../charting/schemas/chartSchemaRegistry.js";
import { validateMediaItem } from "../content-library/mediaItems.js";
import { validateStaticImageSource } from "./staticSourceSchema.js";

const TEMPORAL_DESTINATION_KEYS = Object.freeze([
  "chronoGroupId",
  "sceneId",
  "frameId",
  "time",
  "timeContext",
]);
const PRESENTATION_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function getStaticPanelCapabilities(typeOrSchema) {
  const schema = typeof typeOrSchema === "string"
    ? getChartSchema(typeOrSchema)
    : typeOrSchema;
  if (!schema || schema.authoringWorkflow !== "static") {
    throw new Error(`Chart type "${schema?.typeId ?? String(typeOrSchema)}" is not static content.`);
  }
  const surfaceSet = new Set(schema.capabilities.surfaces);
  return {
    typeId: schema.typeId,
    authoringWorkflow: "static",
    sourceKind: schema.sources.find((kind) => kind === "staticText" || kind === "staticImage"),
    surfaces: {
      build: surfaceSet.has("build"),
      view: surfaceSet.has("view"),
      fullscreen: surfaceSet.has("fullscreen"),
      present: surfaceSet.has("present"),
      audience: surfaceSet.has("audience"),
    },
    sourceCsv: false,
    timeContext: false,
    chronoGroups: false,
    scenes: false,
  };
}

export function listStaticContentTypeOptions({
  registry = chartSchemaRegistry,
  ...options
} = {}) {
  return listChartTypeOptions({
    ...options,
    registry,
    authoringWorkflow: "static",
  }).map((option) => ({
    ...option,
    capabilities: getStaticPanelCapabilities(registry.get(option.id)),
  }));
}

export function buildPresentableItemIndex(dashboard = {}) {
  const index = new Map();
  for (const page of dashboard?.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const placement of section.panels ?? []) {
        const panel = placement.chart ?? placement;
        if (!PRESENTATION_IDENTIFIER.test(panel?.id ?? "")) continue;
        if (panel.typeId === "freeText") continue;
        const descriptor = panel.typeId === "image"
          ? imagePresentationDescriptor(panel, dashboard?.dataSources, dashboard?.contentLibrary, dashboard?.assets)
          : { kind: "chart", chart_id: panel.id };
        if (!descriptor) continue;
        index.set(panel.id, {
          id: panel.id,
          title: panel.title,
          typeId: panel.typeId,
          pageId: page.id,
          sectionId: section.id,
          descriptor,
        });
      }
    }
  }
  return index;
}

function imagePresentationDescriptor(panel, sources = {}, contentLibrary = {}, assets = {}) {
  if (!PRESENTATION_IDENTIFIER.test(panel.sourceId ?? "")) return null;
  const source = sources?.[panel.sourceId];
  try {
    validateStaticImageSource(source, { assets });
  } catch {
    return null;
  }
  const mediaItem = contentLibrary?.mediaItems?.[source.mediaId];
  try {
    validateMediaItem(mediaItem, { assets });
  } catch {
    return null;
  }
  if (
    mediaItem.mediaId !== source.mediaId
    || ["missing", "corrupt", "needs-relink", "needs-review"].includes(mediaItem.health)
  ) return null;
  if (!source.decorative && source.alt.trim() === "") return null;
  if (
    mediaItem.current.kind === "asset"
    && assets[mediaItem.current.assetId]?.storageState !== "durable"
  ) return null;
  return {
    kind: "image",
    panel_id: panel.id,
    media_id: mediaItem.mediaId,
    revision: mediaItem.revision,
  };
}

export function validateStaticDestination(destination, dashboard = {}) {
  if (!destination || typeof destination !== "object" || Array.isArray(destination)) {
    throw new TypeError("Static content destination is required.");
  }
  for (const key of TEMPORAL_DESTINATION_KEYS) {
    if (destination[key] !== undefined && destination[key] !== null) {
      const label = key === "sceneId" ? "Scene" : key === "chronoGroupId" ? "Chrono Group" : "Temporal";
      throw new Error(`${label} destinations are not available for static content.`);
    }
  }
  const page = (dashboard.pages ?? []).find(({ id }) => id === destination.pageId);
  if (!page) throw new Error(`Static content destination page "${String(destination.pageId)}" does not exist.`);
  const section = (page.sections ?? []).find(({ id }) => id === destination.sectionId);
  if (!section) throw new Error(`Static content destination section "${String(destination.sectionId)}" does not exist.`);
  return { pageId: page.id, sectionId: section.id };
}
