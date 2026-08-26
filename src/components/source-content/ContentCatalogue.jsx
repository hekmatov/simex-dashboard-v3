import React from "react";

export default function ContentCatalogue({
  label = "Content catalogue",
  searchLabel,
  items = [],
  query,
  filters,
  kindOptions = null,
  selectedId,
  onQueryChange,
  onFilterChange,
  onSelect,
  addLabel,
}) {
  return (
    <section className="source-content-catalogue" aria-label={label}>
      <header className="source-content-catalogue__header">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h3>{label}</h3>
        </div>
        <button type="button" className="secondary" disabled title="Available in a later implementation step">
          {addLabel}
        </button>
      </header>
      <div className="source-content-filters">
        <label className="source-content-search">
          <span>{searchLabel}</span>
          <input
            type="search"
            aria-label={searchLabel}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <Filter label="Filter by origin" value={filters.origin} values={["all", "uploaded", "packaged", "external", "linked-project", "legacy-import"]} onChange={(value) => onFilterChange("origin", value)} />
        <Filter label="Filter by status" value={filters.status} values={["all", "ready", "external", "missing", "corrupt", "needs-relink", "needs-review"]} onChange={(value) => onFilterChange("status", value)} />
        <Filter label="Filter by usage" value={filters.usage} values={["all", "used", "unused"]} onChange={(value) => onFilterChange("usage", value)} />
        {kindOptions && <Filter label="Filter by kind" value={filters.kind} values={["all", ...kindOptions]} onChange={(value) => onFilterChange("kind", value)} />}
      </div>
      {items.length === 0 ? (
        <p className="source-content-empty">No content matches these filters.</p>
      ) : (
        <ul className="source-content-list" aria-label={`${label} items`}>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="source-content-row"
                aria-pressed={selectedId === item.id}
                onClick={() => onSelect(item.id)}
              >
                <span className="source-content-row__name">{item.record.displayName}</span>
                <span className="source-content-row__meta">
                  <span>{item.typeLabel}</span>
                  <span>{item.record.origin}</span>
                  <span>{item.record.health}</span>
                  {Number.isSafeInteger(item.usageCount) && <span>{item.usageCount === 1 ? "1 use" : `${item.usageCount} uses`}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Filter({ label, value, values, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((entry) => <option key={entry} value={entry}>{filterLabel(entry)}</option>)}
      </select>
    </label>
  );
}

function filterLabel(value) {
  if (value === "all") return "All";
  if (value === "linked-project") return "Linked project";
  if (value === "legacy-import") return "Legacy import";
  if (value === "needs-relink") return "Needs relink";
  if (value === "needs-review") return "Needs review";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
