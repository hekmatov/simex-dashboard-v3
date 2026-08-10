import React from "react";

import FullscreenDisplay from "../FullscreenDisplay.jsx";
import InstallDashboardPrompt from "../InstallDashboardPrompt.jsx";
import { hasLandingPresentation } from "../LandingPage.jsx";
import PlaybackSurface from "../playback/PlaybackSurface.jsx";
import DashboardCanvas from "../dashboard/DashboardCanvas.jsx";
import DashboardHeader from "../dashboard/DashboardHeader.jsx";
import PageNavigation from "../dashboard/PageNavigation.jsx";

export default function ViewShell({
  activePage,
  dashboard,
  displayState,
  companionStatusLabel,
  iconLanguageStyles,
  geoDataSources,
  onActivePageChange,
  onDisplayAction,
}) {
  return (
    <main className="app-shell view-shell" data-page-type={hasLandingPresentation(activePage) ? "landing" : "analytical"} style={iconLanguageStyles}>
      <DashboardHeader activePage={activePage} dashboard={dashboard} />
      <PageNavigation activePageId={activePage?.id} pages={dashboard.pages} onPageChange={onActivePageChange} />
      <PlaybackSurface accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}>
        <DashboardCanvas
          activePage={activePage}
          dashboard={dashboard}
          surface="view"
          buildState={null}
          displayState={displayState}
          geoDataSources={geoDataSources}
          onNavigate={onActivePageChange}
          onDisplayAction={onDisplayAction}
        />
      </PlaybackSurface>
      <FullscreenDisplay
        dashboard={dashboard}
        displayState={displayState}
        onDisplayAction={onDisplayAction}
        accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
      />
      <DashboardFooter dashboard={dashboard} />
      <div className="dashboard-device-tools">
        <span className="companion-status" role="status">{companionStatusLabel}</span>
        <InstallDashboardPrompt />
      </div>
    </main>
  );
}

function DashboardFooter({ dashboard }) {
  const feedbackUrl = dashboard.feedbackUrl || feedbackMailtoUrl(dashboard.contactEmail);
  const contactUrl = dashboard.contactEmail ? `mailto:${dashboard.contactEmail}` : null;
  return (
    <footer className="dashboard-footer" aria-label="Dashboard information and feedback">
      <div><strong>{dashboard.footerTitle ?? "SimEx Dashboard V3"}</strong><span>{dashboard.footerCredit ?? "Developed by Hekmat Alrouh"}</span></div>
      <nav aria-label="Project links">
        <a href={feedbackUrl} target="_blank" rel="noreferrer">Report a bug / request a feature</a>
        {contactUrl && <a href={contactUrl}>Contact maintainer</a>}
        {dashboard.repositoryUrl && dashboard.showRepositoryLink && <a href={dashboard.repositoryUrl} target="_blank" rel="noreferrer">Project repository</a>}
      </nav>
    </footer>
  );
}

function feedbackMailtoUrl(contactEmail) {
  const email = contactEmail || "hekmat.alrouh@live.com";
  return `mailto:${email}?subject=${encodeURIComponent("SimEx Dashboard feedback")}`;
}
