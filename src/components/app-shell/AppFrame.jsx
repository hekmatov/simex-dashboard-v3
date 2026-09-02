import React from "react";

import DashboardCommandCrown from "./DashboardCommandCrown.jsx";
import OperationStatusViewport from "./OperationStatusViewport.jsx";
import PhoneModeNotice from "./PhoneModeNotice.jsx";
import { rightSideDrawerTopFromCrown } from "../common/RightSideDrawer.jsx";

const useBrowserLayoutEffect = typeof window === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function AppFrame({
  mode,
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
  const desktopOnlyMode = mode === "build" || mode === "present";
  const frameRef = React.useRef(null);
  const [rightSideDrawerTop, setRightSideDrawerTop] = React.useState(12);
  const compactViewportRestorationRef = React.useRef({
    scrollX: 0,
    scrollY: 0,
  });

  React.useEffect(() => {
    if (!desktopOnlyMode || typeof window.matchMedia !== "function") return undefined;
    const desktopGateQuery = window.matchMedia("(max-width: 1023px)");
    let desktopGateActive = desktopGateQuery.matches;
    let restoreFrame = 0;

    const captureSupportedState = () => {
      if (desktopGateQuery.matches) return;
      compactViewportRestorationRef.current.scrollX = window.scrollX;
      compactViewportRestorationRef.current.scrollY = window.scrollY;
    };
    const handleViewportChange = ({ matches }) => {
      const wasDesktopGateActive = desktopGateActive;
      desktopGateActive = matches;
      if (matches || !wasDesktopGateActive) return;
      restoreFrame = window.requestAnimationFrame(() => {
        window.scrollTo({
          left: compactViewportRestorationRef.current.scrollX,
          top: compactViewportRestorationRef.current.scrollY,
          behavior: "auto",
        });
      });
    };

    captureSupportedState();
    window.addEventListener("scroll", captureSupportedState, { passive: true });
    desktopGateQuery.addEventListener("change", handleViewportChange);
    return () => {
      window.removeEventListener("scroll", captureSupportedState);
      desktopGateQuery.removeEventListener("change", handleViewportChange);
      if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
    };
  }, [desktopOnlyMode]);

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
      {desktopOnlyMode && <PhoneModeNotice
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
        disabledReason={modeDisabledReason || blockedReason}
        contextDisabledReason={blockedReason}
      />
      {blockedReason && <p className="mode-switch-error" role="alert">{blockedReason}</p>}
      {persistenceNotice && (
        <p className="app-persistence-notice" role="status">{persistenceNotice}</p>
      )}
      {children}
      <OperationStatusViewport rightDrawer={rightDrawer} theme={theme} />
    </div>
  );
}
