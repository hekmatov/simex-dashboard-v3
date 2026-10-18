const EMPTY_FILTERS = Object.freeze({ origin: "all", status: "all", usage: "all", kind: "all" });

export function createSourceContentViewState(input = {}) {
  const queries = input.queries ?? {};
  const filters = input.filters ?? {};
  const selections = input.selections ?? {};
  return {
    tab: input.tab === "sources" ? "sources" : "media",
    queries: {
      media: String(queries.media ?? ""),
      sources: String(queries.sources ?? ""),
    },
    filters: {
      media: normalizedFilters(filters.media),
      sources: normalizedFilters(filters.sources),
    },
    selections: {
      media: optionalId(selections.media),
      sources: optionalId(selections.sources),
    },
    tabletDetailOpen: input.tabletDetailOpen === true,
  };
}

function normalizedFilters(value = {}) {
  return {
    origin: String(value.origin ?? EMPTY_FILTERS.origin),
    status: String(value.status ?? EMPTY_FILTERS.status),
    usage: String(value.usage ?? EMPTY_FILTERS.usage),
    kind: String(value.kind ?? EMPTY_FILTERS.kind),
  };
}

function optionalId(value) {
  return typeof value === "string" && value ? value : null;
}
