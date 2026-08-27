import React from "react";

export default function DashboardIdentityRow({
  dashboardIdentity = {},
  activePage,
  pages = [],
  onPageRequest,
  onScenarioRequest,
  scenarioExpanded = false,
  scenarioDirty = false,
  scenarioNode,
  pageActions,
  pageNavigationNode,
}) {
  const scenarioLabel = dashboardIdentity.scenarioLabel || "Scenario unavailable";
  const title = dashboardIdentity.title || dashboardIdentity.programLabel || "SimEx Dashboard";

  return (
    <section className="dashboard-identity-row" data-command-crown-layer="location" aria-label="Dashboard location and Page tools">
      <div className="dashboard-identity-summary dashboard-scenario-anchor">
        <strong>{title}</strong>
        {typeof onScenarioRequest === "function" ? (
          <button
            type="button"
            className="dashboard-scenario-trigger"
            aria-expanded={scenarioExpanded}
            aria-controls="scenario-passport-popover"
            data-dirty={scenarioDirty ? "true" : undefined}
            onClick={onScenarioRequest}
          >
            {scenarioLabel}
            {scenarioDirty && <span className="scenario-unsaved-indicator">Unsaved</span>}
          </button>
        ) : (
          <span>{scenarioLabel}</span>
        )}
        {scenarioNode}
      </div>
      {pageNavigationNode ?? <nav className="dashboard-command-page-scroller" aria-label="Dashboard pages">
        {pages.map((page) => {
          const active = page.id === activePage?.id;
          return (
            <button
              key={page.id}
              type="button"
              data-dashboard-page-id={page.id}
              className={active ? "active" : "secondary"}
              aria-current={active ? "page" : undefined}
              onClick={() => onPageRequest?.(page.id)}
            >
              {page.label || page.title || page.id}
            </button>
          );
        })}
      </nav>}
      <div className="dashboard-command-pinned-actions" data-command-crown-pinned-actions="true">
        {pageActions}
      </div>
    </section>
  );
}
