import React from "react";

import { MOBILE_VIEW_QUERY, useMediaQuery } from "../common/useMediaQuery.js";
import CompactCrownDisclosure from "./CompactCrownDisclosure.jsx";
import DashboardIdentityRow from "./DashboardIdentityRow.jsx";
import ModeContextStrip from "./ModeContextStrip.jsx";
import ModeSwitcher from "./ModeSwitcher.jsx";

export default function DashboardCommandCrown({
  mode,
  availableModes,
  showPageNavigation = true,
  dashboardIdentity,
  activePage,
  pages,
  contextNode,
  statusNode,
  pageActions,
  pageNavigationNode,
  onModeRequest,
  onPageRequest,
  onScenarioRequest,
  scenarioExpanded,
  scenarioDirty,
  scenarioNode,
  noticeNode,
  disabled = false,
  disabledReason = "",
  contextDisabledReason = disabledReason,
}) {
  const compact = useMediaQuery(MOBILE_VIEW_QUERY) && mode === "view";
  const [disclosureOpen, setDisclosureOpen] = React.useState(false);
  const disclosureTriggerRef = React.useRef(null);
  const closeDisclosure = React.useCallback(() => {
    setDisclosureOpen(false);
    disclosureTriggerRef.current?.focus();
  }, []);
  React.useEffect(() => { if (!compact) setDisclosureOpen(false); }, [compact]);
  if (compact) {
    const pageLabel = activePage?.label || activePage?.title || activePage?.id || "Pages";
    return (
      <div className="dashboard-command-crown" data-crown-compact="true" data-sticky-location={noticeNode ? "true" : undefined} style={{ "--dashboard-mode-context-block-size": "var(--simex-command-crown-row)" }}>
        <section className="dashboard-identity-row crown-compact-row" data-command-crown-layer="location" aria-label="Dashboard location and Page tools">
          <span className="app-frame-identity">SimEx</span>
          <ModeSwitcher mode={mode} availableModes={availableModes} onModeRequest={onModeRequest} disabled={disabled} disabledReason={disabledReason} />
          <button
            ref={disclosureTriggerRef}
            type="button"
            className="secondary crown-disclosure-trigger"
            aria-expanded={disclosureOpen}
            aria-controls="crown-disclosure"
            onClick={() => setDisclosureOpen((open) => !open)}
          >
            {pageLabel}
          </button>
        </section>
        <CompactCrownDisclosure
          open={disclosureOpen}
          onClose={closeDisclosure}
          dashboardIdentity={dashboardIdentity}
          activePage={activePage}
          pages={pages}
          onPageRequest={onPageRequest}
          pageActions={pageActions}
        />
        {noticeNode}
        <ModeContextStrip mode={mode} contextNode={contextNode} statusNode={statusNode} disabledReason={contextDisabledReason} />
      </div>
    );
  }
  return (
    <div
      className="dashboard-command-crown"
      data-sticky-location={noticeNode ? "true" : undefined}
      style={{ "--dashboard-mode-context-block-size": "var(--simex-command-crown-row)" }}
    >
      <header className="command-crown-mode-row" data-command-crown-layer="mode">
        <span className="app-frame-identity">SimEx</span>
        <ModeSwitcher
          mode={mode}
          availableModes={availableModes}
          onModeRequest={onModeRequest}
          disabled={disabled}
          disabledReason={disabledReason}
        />
      </header>
      <DashboardIdentityRow
        showPageNavigation={showPageNavigation}
        dashboardIdentity={dashboardIdentity}
        activePage={activePage}
        pages={pages}
        onPageRequest={onPageRequest}
        onScenarioRequest={onScenarioRequest}
        scenarioExpanded={scenarioExpanded}
        scenarioDirty={scenarioDirty}
        scenarioNode={scenarioNode}
        pageActions={pageActions}
        pageNavigationNode={pageNavigationNode}
      />
      {noticeNode}
      <ModeContextStrip
        mode={mode}
        contextNode={contextNode}
        statusNode={statusNode}
        disabledReason={contextDisabledReason}
      />
    </div>
  );
}
