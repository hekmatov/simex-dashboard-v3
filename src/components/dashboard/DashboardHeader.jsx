import React from "react";

import { MOBILE_VIEW_QUERY, useMediaQuery } from "../common/useMediaQuery.js";
import { hasLandingPresentation } from "../LandingPage.jsx";

export default function DashboardHeader({ activePage, dashboard, mode = "view" }) {
  const compact = useMediaQuery(MOBILE_VIEW_QUERY) && mode === "view";
  const landingActive = hasLandingPresentation(activePage);
  const title = activePage?.title ?? dashboard.title;
  const description = activePage?.description ?? dashboard.description;
  const hasDescription = typeof description === "string" && description.trim() !== "";

  if (compact) {
    return (
      <header className="dashboard-header" data-header-compact="true">
        <div className="dashboard-brand-block">
          <div>
            {landingActive ? <div className="dashboard-page-title">{title}</div> : <h1>{title}</h1>}
            {hasDescription && <p className="subtitle">{description}</p>}
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="dashboard-header">
      <div className="dashboard-brand-block">
        <img className="pdpc-header-mark" src={`${import.meta.env.BASE_URL}assets/pdpc-logo.png`} alt="" />
        <div>
          <p className="eyebrow">{dashboard.programLabel}</p>
          {landingActive ? (
            <div className="dashboard-page-title">{title}</div>
          ) : (
            <h1>{title}</h1>
          )}
          {hasDescription && <p className="subtitle">{description}</p>}
        </div>
      </div>
      <div className="header-right-rail">
        <dl className="dashboard-meta">
          <div><dt>Scenario</dt><dd>{dashboard.scenarioLabel}</dd></div>
          <div><dt>Updated</dt><dd>{dashboard.lastUpdated}</dd></div>
        </dl>
      </div>
    </header>
  );
}
