import React from "react";

const MODE_LABELS = {
  build: "Build",
  present: "Present",
};

export default function PhoneModeNotice({ mode, onSwitchToView }) {
  const label = MODE_LABELS[mode];
  if (!label) return null;

  return (
    <section
      className="phone-mode-banner"
      data-phone-mode-notice={mode}
      role="status"
      aria-label={`${label} phone support notice`}
    >
      <span>{label} is not supported at phone size. View remains available.</span>
      <button type="button" onClick={onSwitchToView}>Switch to View</button>
    </section>
  );
}
