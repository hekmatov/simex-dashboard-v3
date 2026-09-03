import React from "react";

const MODE_LABELS = {
  build: "Build",
  present: "Present",
};

export default function DesktopWidthNotice({ mode }) {
  const label = MODE_LABELS[mode];
  if (!label) return null;

  return (
    <p
      className="desktop-width-notice"
      data-desktop-width-notice={mode}
      role="status"
    >
      A minimum width of 1024px is recommended for {label}.
    </p>
  );
}
