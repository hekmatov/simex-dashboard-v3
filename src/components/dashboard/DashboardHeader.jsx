import React from "react";

import { hasLandingPresentation } from "../LandingPage.jsx";

export default function DashboardHeader({ activePage, dashboard }) {
  const landingActive = hasLandingPresentation(activePage);
  const title = activePage?.title ?? dashboard.title;
  const description = activePage?.description ?? dashboard.description;
  const hasDescription = typeof description === "string" && description.trim() !== "";

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
