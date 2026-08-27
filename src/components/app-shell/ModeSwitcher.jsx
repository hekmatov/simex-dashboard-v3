import React from "react";

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
    <div className="mode-switcher" aria-label="Dashboard mode">
      {availableModes.map((value) => (
        <button
          key={value}
          type="button"
          data-dashboard-mode={value}
          aria-pressed={mode === value}
          aria-describedby={disabled && disabledReason ? "mode-switch-disabled-reason" : undefined}
          disabled={disabled}
          onClick={() => onModeRequest(value)}
        >
          {MODE_LABELS[value] ?? value}
        </button>
      ))}
      {disabled && disabledReason && (
        <span id="mode-switch-disabled-reason" className="visually-hidden">{disabledReason}</span>
      )}
    </div>
  );
}
