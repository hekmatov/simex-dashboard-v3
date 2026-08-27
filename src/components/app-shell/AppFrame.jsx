import React from "react";

import DashboardCommandCrown from "./DashboardCommandCrown.jsx";
import PhoneModeNotice from "./PhoneModeNotice.jsx";

export default function AppFrame({
  mode,
  availableModes,
  showPageNavigation = true,
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
  pageNavigationNode,
  onPageRequest,
  onScenarioRequest,
  scenarioExpanded,
  scenarioDirty,
  scenarioNode,
  density,
  children,
  theme,
  lookDrawerOpen = false,
}) {
  const phoneUnsupported = mode === "build" || mode === "present";
  const frameRef = React.useRef(null);
  const phoneRestorationRef = React.useRef({
    scrollX: 0,
    scrollY: 0,
    focusTarget: null,
  });

  React.useEffect(() => {
    if (!phoneUnsupported || typeof window.matchMedia !== "function") return undefined;
    const phoneQuery = window.matchMedia("(max-width: 767px)");
    let phoneLayoutActive = phoneQuery.matches;
    let restoreFrame = 0;

    const captureSupportedState = () => {
      if (phoneQuery.matches) return;
      phoneRestorationRef.current.scrollX = window.scrollX;
      phoneRestorationRef.current.scrollY = window.scrollY;
    };
    const captureFocus = (event) => {
      const belongsToAuthoringSurface = frameRef.current?.contains(event.target)
        || event.target.closest?.(".unit-orbit, .build-authoring-auxiliary");
      if (phoneQuery.matches || !belongsToAuthoringSurface) return;
      phoneRestorationRef.current.focusTarget = event.target;
    };
    const handleViewportChange = ({ matches }) => {
      const wasPhoneLayoutActive = phoneLayoutActive;
      phoneLayoutActive = matches;
      if (matches || !wasPhoneLayoutActive) return;
      restoreFrame = window.requestAnimationFrame(() => {
        window.scrollTo({
          left: phoneRestorationRef.current.scrollX,
          top: phoneRestorationRef.current.scrollY,
          behavior: "auto",
        });
        const focusTarget = phoneRestorationRef.current.focusTarget;
        if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
      });
    };

    captureSupportedState();
    window.addEventListener("scroll", captureSupportedState, { passive: true });
    document.addEventListener("focusin", captureFocus);
    phoneQuery.addEventListener("change", handleViewportChange);
    return () => {
      window.removeEventListener("scroll", captureSupportedState);
      document.removeEventListener("focusin", captureFocus);
      phoneQuery.removeEventListener("change", handleViewportChange);
      if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
    };
  }, [phoneUnsupported]);

  return (
    <div
      ref={frameRef}
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
        blockedReason={blockedReason}
        onSwitchToView={() => onModeRequest?.("view")}
      />}
      <DashboardCommandCrown
        mode={mode}
        availableModes={availableModes}
        showPageNavigation={showPageNavigation}
        dashboardIdentity={dashboardIdentity}
        activePage={activePage}
        pages={pages}
        contextNode={contextNode}
        statusNode={statusNode}
        pageActions={pageActions}
        pageNavigationNode={pageNavigationNode}
        onModeRequest={onModeRequest}
        onPageRequest={onPageRequest}
        onScenarioRequest={onScenarioRequest}
        scenarioExpanded={scenarioExpanded}
        scenarioDirty={scenarioDirty}
        scenarioNode={scenarioNode}
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
