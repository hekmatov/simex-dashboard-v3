import React from "react";

export default function CanonicalDashboardFrame({
  mode,
  pageType,
  pageId,
  buildPanelOpen = false,
  buildStaticAuthoringOpen = false,
  dashboardHeader,
  workspaceControls = null,
  pageContent,
  overlayLayer,
  footer,
}) {
  return (
    <main
      className={`app-shell canonical-dashboard-frame ${mode}-shell${mode === "build" ? " build-workspace" : ""}`}
      data-canonical-page-id={pageId}
      data-canonical-mode={mode}
      data-page-type={pageType}
      data-dashboard-map-open={mode === "build" ? String(buildPanelOpen) : undefined}
      data-build-static-authoring-open={mode === "build" ? String(buildStaticAuthoringOpen) : undefined}
    >
      <div className="canonical-dashboard-header">{dashboardHeader}</div>
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
