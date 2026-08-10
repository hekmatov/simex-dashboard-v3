import React from "react";

export default function BuildStructureRail({
  dashboard = {},
  selection,
  disabled = false,
  onSelect,
  onAddPage,
  onAddSection,
  onRemovePage,
}) {
  const isSelected = (kind, id) => (
    selection?.kind === kind
    && (
      kind === "scenario"
      || (kind === "timeGroup" ? selection?.groupId : selection?.[`${kind}Id`]) === id
    )
  );
  return (
    <nav className="build-structure-rail" aria-label="Dashboard structure">
      <div className="build-region-heading">
        <p className="eyebrow">Structure</p>
        <h2>Dashboard</h2>
      </div>
      <button
        type="button"
        className={isSelected("scenario") ? "active" : "secondary"}
        disabled={disabled}
        onClick={() => onSelect?.({ kind: "scenario" })}
      >
        Scenario
      </button>
      <div className="build-structure-actions">
        <button type="button" disabled={disabled} onClick={onAddPage}>New page</button>
        <button type="button" disabled={disabled} onClick={onAddSection}>New section</button>
      </div>
      <ul className="build-structure-list">
        {(dashboard.pages ?? []).map((page) => (
          <li key={page.id}>
            <div className="build-structure-row">
              <button
                type="button"
                className={isSelected("page", page.id) ? "active" : "secondary"}
                disabled={disabled}
                onClick={() => onSelect?.({ kind: "page", pageId: page.id })}
              >
                {page.label || page.title || "Untitled page"}
              </button>
              {(dashboard.pages?.length ?? 0) > 1 && (
                <button
                  type="button"
                  className="secondary build-structure-remove"
                  disabled={disabled}
                  aria-label={`Remove ${page.label || page.title || "page"}`}
                  onClick={() => onRemovePage?.(page.id)}
                >
                  Remove
                </button>
              )}
            </div>
            <ul>
              {(page.sections ?? []).map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className={isSelected("section", section.id) ? "active" : "secondary"}
                    disabled={disabled}
                    onClick={() => onSelect?.({
                      kind: "section",
                      pageId: page.id,
                      sectionId: section.id,
                    })}
                  >
                    {section.title || "Untitled section"}
                  </button>
                  <ul>
                    {(section.panels ?? []).map((placement) => {
                      const chart = placement.chart ?? placement;
                      return (
                        <li key={placement.id}>
                          <button
                            type="button"
                            className={
                              selection?.kind === "chart"
                              && selection.placementId === placement.id
                                ? "active"
                                : "secondary"
                            }
                            disabled={disabled}
                            onClick={() => onSelect?.({
                              kind: "chart",
                              pageId: page.id,
                              sectionId: section.id,
                              placementId: placement.id,
                              chartId: chart.id,
                            })}
                          >
                            {chart.title || "Untitled chart"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {(dashboard.timeSyncGroups?.length ?? 0) > 0 && (
        <section className="build-time-groups" aria-labelledby="build-time-groups-heading">
          <h3 id="build-time-groups-heading">Time groups</h3>
          <ul className="build-structure-list">
            {dashboard.timeSyncGroups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  className={isSelected("timeGroup", group.id) ? "active" : "secondary"}
                  disabled={disabled}
                  onClick={() => onSelect?.({ kind: "timeGroup", groupId: group.id })}
                >
                  {group.name || "Unnamed time group"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </nav>
  );
}
