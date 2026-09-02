import React from "react";

const MODE_LABELS = {
  build: "Build",
  present: "Present",
};

export default function PhoneModeNotice({ mode, blockedReason = "", onSwitchToView }) {
  const label = MODE_LABELS[mode];
  if (!label) return null;

  return (
    <section
      className="phone-mode-banner"
      data-phone-mode-notice={mode}
      role="status"
      aria-label={`${label} desktop workspace notice`}
    >
      <div className="phone-mode-banner__copy">
        <strong>{label} requires a desktop workspace at least 1024px wide.</strong>
        <span>View remains available.</span>
        {blockedReason && <span role="alert">{blockedReason}</span>}
      </div>
      <button type="button" onClick={onSwitchToView}>Switch to View</button>
    </section>
  );
}
