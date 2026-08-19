import React from "react";

import DashboardIdentityRow from "./DashboardIdentityRow.jsx";
import ModeContextStrip from "./ModeContextStrip.jsx";
import ModeSwitcher from "./ModeSwitcher.jsx";

export default function DashboardCommandCrown({
  mode,
  dashboardIdentity,
  activePage,
  pages,
  contextNode,
  statusNode,
  pageActions,
  onModeRequest,
  onPageRequest,
  onScenarioRequest,
  disabled = false,
  disabledReason = "",
}) {
  return (
    <div className="dashboard-command-crown" style={{ "--dashboard-mode-context-block-size": "52px" }}>
      <header className="command-crown-mode-row" data-command-crown-layer="mode">
        <span className="app-frame-identity">SimEx</span>
        <ModeSwitcher
          mode={mode}
          onModeRequest={onModeRequest}
          disabled={disabled}
          disabledReason={disabledReason}
        />
      </header>
      <DashboardIdentityRow
        dashboardIdentity={dashboardIdentity}
        activePage={activePage}
        pages={pages}
        onPageRequest={onPageRequest}
        onScenarioRequest={onScenarioRequest}
        pageActions={pageActions}
      />
      <ModeContextStrip
        mode={mode}
        contextNode={contextNode}
        statusNode={statusNode}
        disabledReason={disabledReason}
      />
    </div>
  );
}
