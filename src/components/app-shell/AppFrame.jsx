import React from "react";

import DashboardCommandCrown from "./DashboardCommandCrown.jsx";
import OperationStatusViewport from "./OperationStatusViewport.jsx";
import DesktopWidthNotice from "./DesktopWidthNotice.jsx";
import { rightSideDrawerTopFromCrown } from "../common/RightSideDrawer.jsx";

const useBrowserLayoutEffect = typeof window === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function AppFrame({
  mode,
  releaseProfileId = null,
  commandHeader = null,
  suppressCommandCrown = false,
  availableModes,
  showPageNavigation = true,
  onModeRequest,
  modeDisabled = false,
  modeDisabledReason = "",
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
  rightDrawer = null,
}) {
  const showsDesktopWidthNotice = mode === "build" || mode === "present";
  const frameRef = React.useRef(null);
  const [rightSideDrawerTop, setRightSideDrawerTop] = React.useState(12);

  useBrowserLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const crownBottom = frameRef.current
        ?.querySelector(".dashboard-command-crown")
        ?.getBoundingClientRect().bottom;
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const next = rightSideDrawerTopFromCrown({ crownBottom, viewportTop });
      setRightSideDrawerTop((current) => current === next ? current : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const crown = frameRef.current?.querySelector(".dashboard-command-crown");
    const observer = typeof ResizeObserver === "function" && crown
      ? new ResizeObserver(schedule)
      : null;
    observer?.observe(crown);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="app-frame"
      data-dashboard-mode={mode}
      data-release-profile={releaseProfileId ?? undefined}
      data-dashboard-density={density}
      data-dashboard-style={theme?.dashboardStyle}
      data-dashboard-color-profile={theme?.dashboardColorProfile}
      data-chart-color-mode={theme?.chartColorMode}
      data-appearance-preference={theme?.appearancePreference}
      data-resolved-appearance={theme?.resolvedAppearance}
      data-look-drawer-open={lookDrawerOpen ? "true" : undefined}
      style={{
        ...theme?.cssVariables,
        ...theme?.styleVariables,
        "--right-side-drawer-top": `${rightSideDrawerTop}px`,
      }}
    >
      {showsDesktopWidthNotice && <DesktopWidthNotice mode={mode} />}
      {commandHeader}
      {!suppressCommandCrown && (
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
          disabledReason={modeDisabledReason || blockedReason}
          contextDisabledReason={blockedReason}
        />
      )}
      {blockedReason && <p className="mode-switch-error" role="alert">{blockedReason}</p>}
      {persistenceNotice && (
        <p className="app-persistence-notice" role="status">{persistenceNotice}</p>
      )}
      {children}
      <OperationStatusViewport rightDrawer={rightDrawer} theme={theme} />
    </div>
  );
}
