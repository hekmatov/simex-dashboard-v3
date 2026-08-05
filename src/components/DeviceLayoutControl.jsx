import React from "react";
import { IconControl } from "./common/SimExIcon.js";

const OPTIONS = [
  ["auto", "shell.auto-viewport"],
  ["tablet", "shell.tablet-preview"],
  ["phone", "shell.phone-preview"],
];

export default function DeviceLayoutControl({ value, onChange }) {
  return (
    <div className="device-layout-control" aria-label="Device layout">
      <span>Layout</span>
      <div role="group" aria-label="Choose a layout for this device">
        {OPTIONS.map(([id, interactionId]) => (
          <IconControl
            key={id}
            interactionId={interactionId}
            className={value === id ? "active" : "secondary"}
            pressed={value === id}
            onClick={() => onChange(id)}
          />
        ))}
      </div>
    </div>
  );
}
