import React from "react";

import {
  DASHBOARD_COLOR_PROFILES,
  DASHBOARD_STYLES,
  resolveDashboardTheme,
} from "../../theme/dashboardTheme.js";
import { resolveDashboardLookSurfaceAttributes } from "../../theme/dashboardLookDraft.js";
import { SimExIcon } from "../common/SimExIcon.js";
import RightSideDrawer from "../common/RightSideDrawer.jsx";

const APPEARANCE_OPTIONS = Object.freeze([
  Object.freeze({ value: "system", label: "System", iconId: "auto" }),
  Object.freeze({ value: "light", label: "Light", iconId: "appearanceLight" }),
  Object.freeze({ value: "dark", label: "Dark", iconId: "appearanceDark" }),
]);
const PROFILE_SAMPLE_CACHE = new Map();

export function dashboardLookProfileSamples(appearancePreference = "system") {
  const key = appearancePreference;
  if (PROFILE_SAMPLE_CACHE.has(key)) return PROFILE_SAMPLE_CACHE.get(key);
  const samples = Object.freeze(DASHBOARD_COLOR_PROFILES.map((profile) => Object.freeze({
    profile,
    sample: resolveDashboardTheme({
      globalStyles: {
        dashboardColorProfile: profile.id,
        chartColorMode: "profile",
      },
      appearancePreference,
    }),
  })));
  PROFILE_SAMPLE_CACHE.set(key, samples);
  return samples;
}

function AppearanceIcon({ iconId }) {
  if (iconId === "auto") return <SimExIcon iconId="auto" size={20} />;
  return (
    <svg
      className="simex-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      focusable="false"
      aria-hidden="true"
      data-icon-id={iconId}
    >
      {iconId === "appearanceLight" ? (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path className="accent-stroke" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
        </>
      ) : (
        <path className="accent-stroke" d="M18.7 15.2A7.5 7.5 0 0 1 8.8 5.3 7.8 7.8 0 1 0 18.7 15.2Z" />
      )}
    </svg>
  );
}

export default function DashboardLookDrawer({
  open,
  saved,
  preview,
  savingScope = "",
  status = "",
  error = "",
  onCancel,
  onPreviewChange,
}) {
  if (!open || !saved || !preview) return null;
  const busy = savingScope !== "";
  const surface = resolveDashboardLookSurfaceAttributes(preview);
  const profileSamples = dashboardLookProfileSamples(preview.appearancePreference);
  const update = (field, value) => onPreviewChange?.({ ...preview, [field]: value });

  return (
    <RightSideDrawer
      id="look-drawer"
      title="Theme"
      open
      onClose={onCancel}
      modality="dialog"
      eyebrow="Dashboard settings"
      description="Selections are saved automatically and applied to the live dashboard."
      className="look-drawer"
      layerClassName="look-drawer-layer"
      clickCatcherClassName="look-drawer-click-catcher"
      headerClassName="look-drawer-header"
      contentClassName="look-drawer-scroll"
      panelProps={{
        "data-dashboard-style": surface.style,
        "data-dashboard-color-profile": surface.colorProfile,
        "data-resolved-appearance": surface.resolvedAppearance,
        "aria-busy": busy || undefined,
      }}
      footer={(
        <footer className="look-drawer-footer">
          <div className="look-drawer-feedback" aria-live="polite">
            {error
              ? <span className="look-drawer-error" role="alert">{error}</span>
              : status || (busy ? "Saving selection…" : "Selections are saved automatically.")}
          </div>
        </footer>
      )}
    >
          <fieldset className="look-control-section look-appearance-section">
            <legend>Appearance</legend>
            <div className="look-appearance-options">
              {APPEARANCE_OPTIONS.map(({ value, label, iconId }) => (
                <label className="look-appearance-option" key={value}>
                  <input
                    type="radio"
                    name="appearance"
                    value={value}
                    checked={preview.appearancePreference === value}
                    onChange={() => update("appearancePreference", value)}
                  />
                  <AppearanceIcon iconId={iconId} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="look-control-section">
            <legend>Visual style</legend>
            <div className="look-choice-list">
              {DASHBOARD_STYLES.map((style) => (
                <label className="look-style-choice" key={style.id}>
                  <input
                    type="radio"
                    name="dashboard-style"
                    value={style.id}
                    checked={preview.dashboardStyle === style.id}
                    onChange={() => update("dashboardStyle", style.id)}
                  />
                  <span>{style.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="look-control-section">
            <legend>Colour profile</legend>
            <div className="look-profile-grid">
              {profileSamples.map(({ profile, sample }) => {
                return (
                  <label className="look-profile-option" data-profile-option={profile.id} key={profile.id}>
                    <input
                      type="radio"
                      name="dashboard-profile"
                      value={profile.id}
                      checked={preview.dashboardColorProfile === profile.id}
                      onChange={() => update("dashboardColorProfile", profile.id)}
                    />
                    <span className="look-profile-copy">
                      <strong>{profile.name}</strong>
                    </span>
                    <span className="look-profile-swatches" aria-hidden="true">
                      <i style={{ background: sample.cssVariables["--simex-surface-panel"] }} />
                      <i style={{ background: sample.cssVariables["--simex-data-1"] }} />
                      <i style={{ background: sample.cssVariables["--simex-data-2"] }} />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="look-control-section">
            <legend>Chart colors</legend>
            <div className="look-segmented-options look-chart-color-options">
              {[
                ["profile", "Profile colors"],
                ["standard", "Standard chart colors"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="chart-colors"
                    value={value}
                    checked={preview.chartColorMode === value}
                    onChange={() => update("chartColorMode", value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
    </RightSideDrawer>
  );
}
