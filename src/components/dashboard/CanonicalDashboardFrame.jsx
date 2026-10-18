import React from "react";
import { CANONICAL_HOME_REPOSITORY_URL } from "../../home/canonicalHomeContent.js";
import { APP_VERSION } from "../../lib/appVersion.js";

export default function CanonicalDashboardFrame({
  mode,
  deviceLayout,
  pageType,
  pageId,
  buildStaticAuthoringOpen = false,
  dashboardHeader,
  workspaceControls = null,
  pageContent,
  overlayLayer,
  footer,
  landmarkRef,
  landmarkTabIndex,
  landmarkLabelledBy,
}) {
  return (
    <main
      ref={landmarkRef}
      className={`app-shell canonical-dashboard-frame ${mode}-shell${mode === "build" ? " build-workspace" : ""}`}
      data-canonical-page-id={pageId}
      data-canonical-mode={mode}
      data-device-layout={deviceLayout}
      data-page-type={pageType}
      data-build-static-authoring-open={mode === "build" ? String(buildStaticAuthoringOpen) : undefined}
      tabIndex={landmarkTabIndex ?? (["home", "view"].includes(mode) ? -1 : undefined)}
      aria-labelledby={landmarkLabelledBy}
    >
      {dashboardHeader != null ? (
        <div className="canonical-dashboard-header">{dashboardHeader}</div>
      ) : null}
      {workspaceControls ? (
        <div className="canonical-dashboard-workspace-controls">{workspaceControls}</div>
      ) : null}
      <div className="canonical-dashboard-content">{pageContent}</div>
      {footer}
      {overlayLayer && <div className="canonical-dashboard-overlay">{overlayLayer}</div>}
    </main>
  );
}

export function CanonicalDashboardFooter({ dashboard }) {
  const feedbackUrl = feedbackUrlForDashboard(dashboard);
  const contactUrl = dashboard.contactEmail ? `mailto:${dashboard.contactEmail}` : null;
  return (
    <footer className="dashboard-footer" aria-label="Dashboard information and feedback">
      <div><strong>{dashboard.footerTitle ?? "SimEx Dashboard V3"}</strong><span>{dashboard.footerCredit ?? "Developed by Hekmat Alrouh"}</span><span>App version {APP_VERSION}</span></div>
      <nav aria-label="Project links">
        <a href={feedbackUrl} target="_blank" rel="noreferrer">Report a bug / request a feature</a>
        {contactUrl && <a href={contactUrl}>Contact maintainer</a>}
        {dashboard.repositoryUrl && dashboard.showRepositoryLink && <a href={dashboard.repositoryUrl} target="_blank" rel="noreferrer">Project repository</a>}
        <a href={`${CANONICAL_HOME_REPOSITORY_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">Changelog</a>
      </nav>
    </footer>
  );
}

export function feedbackUrlForDashboard(dashboard) {
  try {
    const repository = new URL(CANONICAL_HOME_REPOSITORY_URL);
    if (!["http:", "https:"].includes(repository.protocol)) throw new TypeError();
    repository.pathname = `${repository.pathname.replace(/\/+$/, "")}/issues`;
    repository.search = "";
    repository.hash = "";
    return repository.href;
  } catch {
    return feedbackMailtoUrl(dashboard?.contactEmail);
  }
}

function feedbackMailtoUrl(contactEmail) {
  const email = contactEmail || "hekmat.alrouh@live.com";
  return `mailto:${email}?subject=${encodeURIComponent("SimEx Dashboard feedback")}`;
}
