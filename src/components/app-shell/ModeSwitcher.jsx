import React from "react";

const MODE_LABELS = {
  view: "View",
  build: "Build",
  present: "Present",
};

export default function ModeSwitcher({ mode, onModeRequest, disabled = false, disabledReason = "" }) {
  return (
    <div className="mode-switcher" aria-label="Dashboard mode">
      {Object.entries(MODE_LABELS).map(([value, label]) => (
        <button
          key={value}
          type="button"
          data-dashboard-mode={value}
          aria-pressed={mode === value}
          aria-describedby={disabled && disabledReason ? "mode-switch-disabled-reason" : undefined}
          disabled={disabled}
          onClick={() => onModeRequest(value)}
        >
          {label}
        </button>
      ))}
      {disabled && disabledReason && (
        <span id="mode-switch-disabled-reason" className="visually-hidden">{disabledReason}</span>
      )}
    </div>
  );
}
