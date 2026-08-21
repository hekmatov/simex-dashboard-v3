export function compareSchemaRevision(profileRevision, currentRevision) {
  const changed = profileRevision !== currentRevision;
  return {
    changed,
    currentRevision,
    invalidates: changed
      ? ["map-and-prepare-data", "render-proof"]
      : [],
  };
}

export function reconcileSourceChange(state, profile, { confirmLoss = false } = {}) {
  const fields = new Set((profile?.fields ?? []).map(({ id }) => id));
  const removedPaths = [];
  const retainedPaths = [];
  const mapping = Object.fromEntries(Object.entries(state.mapping ?? {}).flatMap(
    ([roleId, value]) => {
      if (Array.isArray(value)) {
        const retained = value.filter((binding, index) => {
          const keep = bindingFieldExists(binding, fields);
          (keep ? retainedPaths : removedPaths).push(`mapping.${roleId}[${index}]`);
          return keep;
        });
        return retained.length > 0 ? [[roleId, retained]] : [];
      }
      const keep = bindingFieldExists(value, fields);
      (keep ? retainedPaths : removedPaths).push(`mapping.${roleId}`);
      return keep ? [[roleId, structuredClone(value)]] : [];
    },
  ));
  const filters = (state.preparation?.filters ?? []).filter((filter, index) => {
    const keep = fields.has(filter?.field);
    (keep ? retainedPaths : removedPaths).push(`preparation.filters[${index}]`);
    return keep;
  });

  if (removedPaths.length > 0 && !confirmLoss) {
    return {
      state,
      retainedPaths,
      removedPaths,
      needsAttention: [`Confirm the source change to remove: ${removedPaths.join(", ")}.`],
    };
  }
  return {
    state: {
      ...state,
      source: {
        sourceId: profile.sourceId,
        schemaRevision: profile.schemaRevision,
      },
      mapping,
      preparation: {
        ...(state.preparation ?? {}),
        filters,
      },
      renderProofRevision: null,
    },
    retainedPaths,
    removedPaths,
    needsAttention: [],
  };
}

function bindingFieldExists(binding, fields) {
  return binding && typeof binding === "object" && fields.has(binding.field);
}
