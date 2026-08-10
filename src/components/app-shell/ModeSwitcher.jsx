import React from "react";

const MODE_LABELS = {
  view: "View",
  build: "Build",
  present: "Present",
};

export default function ModeSwitcher({ mode, onModeRequest, disabled = false }) {
  return (
    <div className="mode-switcher" aria-label="Dashboard mode">
      {Object.entries(MODE_LABELS).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          disabled={disabled}
          onClick={() => onModeRequest(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
