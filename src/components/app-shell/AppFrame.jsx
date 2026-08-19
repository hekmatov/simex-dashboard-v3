import React from "react";

import DashboardCommandCrown from "./DashboardCommandCrown.jsx";

export default function AppFrame({
  mode,
  onModeRequest,
  modeDisabled = false,
  blockedReason = "",
  dashboardIdentity,
  activePage,
  pages,
  contextNode,
  statusNode,
  pageActions,
  onPageRequest,
  onScenarioRequest,
  density,
  children,
  theme,
}) {
  const phoneUnsupported = mode === "build" || mode === "present";
  return (
    <div
      className="app-frame"
      data-dashboard-mode={mode}
      data-dashboard-density={density}
      data-dashboard-style={theme?.dashboardStyle}
      data-dashboard-color-profile={theme?.dashboardColorProfile}
      data-chart-color-mode={theme?.chartColorMode}
      data-appearance-preference={theme?.appearancePreference}
      data-resolved-appearance={theme?.resolvedAppearance}
      style={{ ...theme?.cssVariables, ...theme?.styleVariables }}
    >
      {phoneUnsupported && (
        <section className="phone-mode-banner" role="status" aria-label={`${mode} phone support notice`}>
          <span>
            {mode === "build" ? "Build" : "Present"} is not supported at phone width. Your current state is retained.
          </span>
          <button type="button" onClick={() => onModeRequest?.("view")}>Switch to View</button>
        </section>
      )}
      <DashboardCommandCrown
        mode={mode}
        dashboardIdentity={dashboardIdentity}
        activePage={activePage}
        pages={pages}
        contextNode={contextNode}
        statusNode={statusNode}
        pageActions={pageActions}
        onModeRequest={onModeRequest}
        onPageRequest={onPageRequest}
        onScenarioRequest={onScenarioRequest}
        disabled={modeDisabled}
        disabledReason={blockedReason}
      />
      {blockedReason && <p className="mode-switch-error" role="alert">{blockedReason}</p>}
      {children}
    </div>
  );
}
