import React from "react";

export default function DashboardIdentityRow({
  dashboardIdentity = {},
  activePage,
  pages = [],
  onPageRequest,
  onScenarioRequest,
  pageActions,
}) {
  const scenarioLabel = dashboardIdentity.scenarioLabel || "Scenario unavailable";
  const title = dashboardIdentity.title || dashboardIdentity.programLabel || "SimEx Dashboard";

  return (
    <section className="dashboard-identity-row" data-command-crown-layer="location" aria-label="Dashboard location and Page tools">
      <div className="dashboard-identity-summary">
        <strong>{title}</strong>
        {typeof onScenarioRequest === "function" ? (
          <button type="button" className="dashboard-scenario-trigger" onClick={onScenarioRequest}>
            {scenarioLabel}
          </button>
        ) : (
          <span>{scenarioLabel}</span>
        )}
      </div>
      <nav className="dashboard-command-page-scroller" aria-label="Dashboard pages">
        {pages.map((page) => {
          const active = page.id === activePage?.id;
          return (
            <button
              key={page.id}
              type="button"
              className={active ? "active" : "secondary"}
              aria-current={active ? "page" : undefined}
              onClick={() => onPageRequest?.(page.id)}
            >
              {page.label || page.title || page.id}
            </button>
          );
        })}
      </nav>
      <div className="dashboard-command-pinned-actions" data-command-crown-pinned-actions="true">
        {pageActions}
      </div>
    </section>
  );
}
