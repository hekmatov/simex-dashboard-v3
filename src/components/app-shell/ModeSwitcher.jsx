import React from "react";

import ControlTooltip from "../common/ControlTooltip.jsx";

const MODE_LABELS = {
  home: "Home",
  view: "View",
  build: "Build",
  present: "Present",
};

export default function ModeSwitcher({
  mode,
  availableModes = Object.keys(MODE_LABELS),
  onModeRequest,
  disabled = false,
  disabledReason = "",
}) {
  return (
    <nav className="mode-switcher" aria-label="Dashboard mode">
      {availableModes.map((value) => (
        <ControlTooltip
          key={value}
          disabled={disabled}
          reason={disabledReason}
        >
          <button
            type="button"
            data-dashboard-mode={value}
            aria-pressed={mode === value}
            disabled={disabled}
            onClick={() => onModeRequest(value)}
          >
            {MODE_LABELS[value] ?? value}
          </button>
        </ControlTooltip>
      ))}
    </nav>
  );
}
