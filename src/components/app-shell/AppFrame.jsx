import React from "react";

import ModeSwitcher from "./ModeSwitcher.jsx";

export default function AppFrame({
  mode,
  onModeRequest,
  modeDisabled = false,
  blockedReason = "",
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
      style={theme?.cssVariables}
    >
      {phoneUnsupported && (
        <section className="phone-mode-banner" role="status" aria-label={`${mode} phone support notice`}>
          <span>
            {mode === "build" ? "Build" : "Present"} is not supported at phone width. Your current state is retained.
          </span>
          <button type="button" onClick={() => onModeRequest?.("view")}>Switch to View</button>
        </section>
      )}
      <header className="app-frame-bar">
        <span className="app-frame-identity">SimEx</span>
        <ModeSwitcher
          mode={mode}
          onModeRequest={onModeRequest}
          disabled={modeDisabled}
        />
      </header>
      {blockedReason && <p className="mode-switch-error" role="alert">{blockedReason}</p>}
      {children}
    </div>
  );
}
