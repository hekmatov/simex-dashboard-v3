import React from "react";

import {
  DASHBOARD_COLOR_PROFILES,
  DASHBOARD_STYLES,
  resolveDashboardTheme,
} from "../../theme/dashboardTheme.js";
import { signatureProfileForStyle } from "../../theme/dashboardLookDraft.js";
import ModalFocusScope from "../common/ModalFocusScope.jsx";

const STYLE_NAMES = new Map(DASHBOARD_STYLES.map(({ id, name }) => [id, name]));
const PROFILE_NAMES = new Map(DASHBOARD_COLOR_PROFILES.map(({ id, name }) => [id, name]));

export default function DashboardLookDrawer({
  open,
  saved,
  preview,
  savingScope = "",
  status = "",
  error = "",
  onCancel,
  onPreviewChange,
  onSetDashboardLook,
  onSetChartColors,
  onSetAppearance,
}) {
  if (!open || !saved || !preview) return null;
  const lookChanged = saved.dashboardStyle !== preview.dashboardStyle
    || saved.dashboardColorProfile !== preview.dashboardColorProfile;
  const chartColorsChanged = saved.chartColorMode !== preview.chartColorMode;
  const appearanceChanged = saved.appearancePreference !== preview.appearancePreference;
  const busy = savingScope !== "";

  const update = (field, value) => onPreviewChange?.({ ...preview, [field]: value });

  return (
    <div className="look-drawer-layer" data-open="true">
      <div
        className="look-drawer-click-catcher"
        aria-hidden="true"
        onMouseDown={onCancel}
      />
      <ModalFocusScope
        as="aside"
        open
        className="look-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="look-drawer-title"
        aria-describedby="look-drawer-description"
        aria-busy={busy || undefined}
        onEscape={onCancel}
      >
        <header className="look-drawer-header">
          <div>
            <p className="eyebrow">Dashboard settings</p>
            <h2 id="look-drawer-title">Dashboard look</h2>
            <p id="look-drawer-description">Preview the live dashboard, then set only the scope you intend.</p>
          </div>
          <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Close</button>
        </header>

        <div className="look-drawer-scroll">
          <section className="look-state-summary" aria-label="Saved and preview values">
            <div>
              <strong>Saved</strong>
              <span>{STYLE_NAMES.get(saved.dashboardStyle)}</span>
              <span>{PROFILE_NAMES.get(saved.dashboardColorProfile)}</span>
              <span>{chartColorLabel(saved.chartColorMode)}</span>
              <span>{appearanceLabel(saved.appearancePreference)}</span>
            </div>
            <div data-preview-changed={lookChanged || chartColorsChanged || appearanceChanged || undefined}>
              <strong>Preview</strong>
              <span>{STYLE_NAMES.get(preview.dashboardStyle)}</span>
              <span>{PROFILE_NAMES.get(preview.dashboardColorProfile)}</span>
              <span>{chartColorLabel(preview.chartColorMode)}</span>
              <span>{appearanceLabel(preview.appearancePreference)}</span>
            </div>
          </section>

          <fieldset className="look-control-section" disabled={busy}>
            <legend>Visual style</legend>
            <p>Changing style preserves the selected colour profile.</p>
            <div className="look-choice-list">
              {DASHBOARD_STYLES.map((style) => (
                <div className="look-style-choice" key={style.id}>
                  <label>
                    <input
                      type="radio"
                      name="dashboard-style"
                      checked={preview.dashboardStyle === style.id}
                      onChange={() => update("dashboardStyle", style.id)}
                    />
                    <span>{style.name}</span>
                  </label>
                  <button
                    type="button"
                    className="secondary look-signature-button"
                    onClick={() => update("dashboardColorProfile", signatureProfileForStyle(style.id))}
                  >
                    Use {style.name} Signature
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="look-control-section" disabled={busy}>
            <legend>Colour profile</legend>
            <p>All approved profiles remain available independently of style.</p>
            <div className="look-profile-grid">
              {DASHBOARD_COLOR_PROFILES.map((profile) => {
                const sample = resolveDashboardTheme({
                  globalStyles: {
                    dashboardColorProfile: profile.id,
                    chartColorMode: "profile",
                  },
                  appearancePreference: preview.appearancePreference,
                });
                return (
                  <label className="look-profile-option" data-profile-option={profile.id} key={profile.id}>
                    <input
                      type="radio"
                      name="dashboard-profile"
                      checked={preview.dashboardColorProfile === profile.id}
                      onChange={() => update("dashboardColorProfile", profile.id)}
                    />
                    <span className="look-profile-copy">
                      <strong>{profile.name}</strong>
                      <small>{provenanceLabel(profile.sourceStyle)}</small>
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

          <fieldset className="look-control-section" disabled={busy}>
            <legend>Chart colors</legend>
            <p>This changes chart marks and matching legend swatches only.</p>
            <div className="look-segmented-options">
              {[
                ["profile", "Profile colors"],
                ["standard", "Standard chart colors"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="chart-colors"
                    checked={preview.chartColorMode === value}
                    onChange={() => update("chartColorMode", value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="look-control-section" disabled={busy}>
            <legend>Personal appearance</legend>
            <p>Stored for this browser user, separately from the dashboard.</p>
            <div className="look-segmented-options">
              {["light", "dark", "system"].map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="appearance"
                    checked={preview.appearancePreference === value}
                    onChange={() => update("appearancePreference", value)}
                  />
                  <span>{appearanceLabel(value)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="look-drawer-footer">
          <div className="look-drawer-feedback" aria-live="polite">
            {error ? <span className="look-drawer-error" role="alert">{error}</span> : status}
          </div>
          <button
            type="button"
            disabled={busy || !lookChanged}
            onClick={onSetDashboardLook}
          >
            {savingScope === "look" ? "Setting dashboard look…" : "Set dashboard look"}
          </button>
          <button
            type="button"
            disabled={busy || !chartColorsChanged}
            onClick={onSetChartColors}
          >
            {savingScope === "charts" ? "Setting chart colors…" : "Set chart colors"}
          </button>
          <button
            type="button"
            disabled={busy || !appearanceChanged}
            onClick={onSetAppearance}
          >
            {savingScope === "appearance" ? "Setting appearance…" : "Set appearance"}
          </button>
        </footer>
      </ModalFocusScope>
    </div>
  );
}

function chartColorLabel(value) {
  return value === "standard" ? "Standard chart colors" : "Profile colors";
}

function appearanceLabel(value) {
  return value === "light" ? "Light" : value === "dark" ? "Dark" : "System";
}

function provenanceLabel(sourceStyle) {
  if (sourceStyle === "utility") return "Portfolio utility profile";
  if (sourceStyle === "graphpad") return "Accepted GraphPad reference profile";
  return `${STYLE_NAMES.get(sourceStyle)} profile`;
}
