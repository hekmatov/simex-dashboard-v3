import React from "react";

import FullscreenDisplay from "../FullscreenDisplay.jsx";
import InstallDashboardPrompt from "../InstallDashboardPrompt.jsx";
import { IconControl } from "../common/SimExIcon.js";
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
  multiSelectMode = false,
  multiPanelIds = [],
  multiSelectNotice,
  onActivePageChange,
  onCompareCharts,
  onOpenDashboardLook,
  onDisplayAction,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
  onOpenMultiFullscreen,
  onCancelMultiSelection,
}) {
  return (
    <main className="app-shell view-shell" data-page-type={hasLandingPresentation(activePage) ? "landing" : "analytical"} style={iconLanguageStyles}>
      <section className="dashboard-location-row" aria-label="Dashboard location and Page tools">
        <DashboardHeader activePage={activePage} dashboard={dashboard} />
        <div className="page-navigation-line">
          <PageNavigation activePageId={activePage?.id} pages={dashboard.pages} onPageChange={onActivePageChange} />
          <div className="page-navigation-actions" aria-label="View page actions">
            <button
              type="button"
              className="secondary dashboard-look-trigger"
              onClick={onOpenDashboardLook}
            >
              Dashboard look
            </button>
            <button
              type="button"
              className="secondary view-comparison-button"
              disabled={multiSelectMode}
              onClick={onCompareCharts}
            >
              Compare charts
            </button>
          </div>
        </div>
      </section>
      <PlaybackSurface accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}>
        <DashboardCanvas
          activePage={activePage}
          dashboard={dashboard}
          surface="view"
          buildState={null}
          displayState={displayState}
          multiSelectMode={multiSelectMode}
          multiPanelIds={multiPanelIds}
          geoDataSources={geoDataSources}
          onNavigate={onActivePageChange}
          onDisplayAction={onDisplayAction}
          onToggleMultiPanel={onToggleMultiPanel}
          onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
        />
      </PlaybackSurface>
      {multiSelectMode && (
        <section className="multi-select-dock" aria-label="Multi-fullscreen selection">
          <span className="multi-select-count">
            <strong>{multiPanelIds.length}</strong>
            <span>of 4 selected</span>
          </span>
          <IconControl
            interactionId="fullscreen.enter-multi-fullscreen"
            disabled={multiPanelIds.length < 2}
            onClick={onOpenMultiFullscreen}
          />
          <IconControl
            interactionId="editor.cancel"
            className="secondary"
            ariaLabel="Cancel multi-fullscreen selection"
            tooltip="Cancel multi-fullscreen selection"
            onClick={onCancelMultiSelection}
          />
        </section>
      )}
      {multiSelectNotice && (
        <div className="multi-select-limit-notice" role="alert" key={multiSelectNotice.id}>
          {multiSelectNotice.message}
        </div>
      )}
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
