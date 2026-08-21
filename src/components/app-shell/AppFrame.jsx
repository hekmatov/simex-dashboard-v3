import React from "react";

import DashboardCommandCrown from "./DashboardCommandCrown.jsx";
import PhoneModeNotice from "./PhoneModeNotice.jsx";

export default function AppFrame({
  mode,
  onModeRequest,
  modeDisabled = false,
  blockedReason = "",
  persistenceNotice = "",
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
  lookDrawerOpen = false,
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
      data-look-drawer-open={lookDrawerOpen ? "true" : undefined}
      style={{ ...theme?.cssVariables, ...theme?.styleVariables }}
    >
      {phoneUnsupported && <PhoneModeNotice
        mode={mode}
        onSwitchToView={() => onModeRequest?.("view")}
      />}
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
      {persistenceNotice && (
        <p className="app-persistence-notice" role="status">{persistenceNotice}</p>
      )}
      {children}
    </div>
  );
}
