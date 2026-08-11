export const GEOGRAPHY_BINDING_CONTRACT = deepFreeze({
  version: 1,
  data_source: {
    descriptor_kind: "geojson",
    presentation_field: "geoSource",
    required: true,
  },
  geography_role_id: "geography",
  join: {
    presentation_field: "joinField",
    explicit_strategy: "feature_property",
    inferred_strategies: [
      "feature_id",
      "unique_best_feature_property",
    ],
    default_strategy: null,
    feature_id_precedence: "score_at_least_best_property",
    ambiguous_property_match: "requires_explicit_selection",
  },
});

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}
