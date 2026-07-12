import React from "react";

export default function InstallDashboardPrompt() {
  const [installPrompt, setInstallPrompt] = React.useState(null);
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = isAppleMobile && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone;

  React.useEffect(() => {
    function captureInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function clearInstallPrompt() {
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  if (isStandalone) return null;

  if (isAppleMobile) {
    return (
      <details className="install-dashboard-prompt">
        <summary>Install on this iPhone or iPad</summary>
        <p>{isSafari ? "Tap Share, then choose " : "Open this page in Safari, then tap Share and choose "}<strong>Add to Home Screen</strong>.</p>
      </details>
    );
  }

  if (!installPrompt) return null;

  return (
    <button type="button" className="install-dashboard-button" onClick={installApp}>
      Install dashboard app
    </button>
  );
}
