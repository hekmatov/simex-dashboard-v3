import React from "react";

import { MOBILE_VIEW_QUERY, useMediaQuery } from "../common/useMediaQuery.js";
import CompactCrownDisclosure from "./CompactCrownDisclosure.jsx";
import DashboardIdentityRow from "./DashboardIdentityRow.jsx";
import ModeContextStrip from "./ModeContextStrip.jsx";
import ModeSwitcher from "./ModeSwitcher.jsx";
import { SimExIcon } from "../common/SimExIcon.js";

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
    const menuIcon = <svg className="simex-icon" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    return (
      <div className="dashboard-command-crown" data-crown-compact="true" data-sticky-location={noticeNode ? "true" : undefined} style={{ "--dashboard-mode-context-block-size": "var(--simex-command-crown-row)" }}>
        <section className="dashboard-identity-row crown-compact-row" data-command-crown-layer="location" aria-label="Dashboard location and Page tools">
          <button
            ref={disclosureTriggerRef}
            type="button"
            className="secondary crown-disclosure-trigger"
            aria-label="Dashboard menu"
            title="Dashboard menu"
            aria-expanded={disclosureOpen}
            aria-controls="crown-disclosure"
            onClick={() => disclosureOpen ? closeDisclosure() : setDisclosureOpen(true)}
          >
            {disclosureOpen ? <SimExIcon iconId="close" size={20} /> : menuIcon}
          </button>
          {showPageNavigation && <nav className="crown-compact-pages" aria-label="Dashboard pages">
            {(pages ?? []).map((page) => {
              const current = page.id === activePage?.id;
              return <button key={page.id} type="button" className={current ? "active" : "secondary"}
                data-dashboard-page-id={page.id} aria-current={current ? "page" : undefined}
                onClick={() => { onPageRequest?.(page.id); if (disclosureOpen) closeDisclosure(); }}>
                {page.label || page.title || page.id}
              </button>;
            })}
          </nav>}
        </section>
        <CompactCrownDisclosure
          open={disclosureOpen}
          onClose={closeDisclosure}
          pageActions={pageActions}
        >
          <ModeSwitcher mode={mode} availableModes={availableModes}
            onModeRequest={(next) => { onModeRequest?.(next); closeDisclosure(); }}
            disabled={disabled} disabledReason={disabledReason} />
        </CompactCrownDisclosure>
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
