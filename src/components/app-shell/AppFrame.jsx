import React from "react";

import ModeSwitcher from "./ModeSwitcher.jsx";

export default function AppFrame({
  mode,
  onModeRequest,
  modeDisabled = false,
  blockedReason = "",
  density,
  children,
}) {
  return (
    <div
      className="app-frame"
      data-dashboard-mode={mode}
      data-dashboard-density={density}
    >
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
