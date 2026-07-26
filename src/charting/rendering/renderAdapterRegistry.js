import { buildAxisRenderModel } from "./axisAdapter.js";
import { buildCompositionRenderModel } from "./compositionAdapter.js";
import { buildGeographyRenderModel } from "./geographyAdapter.js";
import { buildMatrixRenderModel } from "./matrixAdapter.js";
import { buildOperationalRenderModel } from "./operationalAdapter.js";
import { buildRelationshipRenderModel } from "./relationshipAdapter.js";
import { buildTargetRenderModel } from "./targetAdapter.js";
import { buildTimelineRenderModel } from "./timelineAdapter.js";

const ADAPTERS = Object.freeze({
  axis: buildAxisRenderModel,
  composition: buildCompositionRenderModel,
  relationship: buildRelationshipRenderModel,
  matrix: buildMatrixRenderModel,
  timeline: buildTimelineRenderModel,
  target: buildTargetRenderModel,
  geography: buildGeographyRenderModel,
  operational: buildOperationalRenderModel,
});

export function getRenderAdapter(renderer) {
  const adapter = ADAPTERS[renderer];
  if (!adapter) throw new Error(`Unknown render adapter "${renderer}".`);
  return adapter;
}
