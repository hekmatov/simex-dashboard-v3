import React from "react";

import ApplicationRecovery from "./ApplicationRecovery.jsx";

export function isLazyChunkFailure(error) {
  return /(?:failed to fetch dynamically imported module|loading chunk [\w-]+ failed|importing a module script failed|failed to load module script|unable to preload css)/i
    .test(String(error?.message ?? error ?? ""));
}

export default class ApplicationErrorBoundary extends React.Component {
  state = { error: null, revision: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  retry = () => {
    this.setState(({ revision }) => ({ error: null, revision: revision + 1 }));
  };

  render() {
    if (this.state.error) {
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("surface") === "audience") {
        return <main className="audience-display audience-display-waiting" data-connection-status="waiting">
          <section className="status-panel" role="status">
            <h1>Audience display is waiting for a valid dashboard.</h1>
          </section>
        </main>;
      }
      const chunkFailure = isLazyChunkFailure(this.state.error);
      return <ApplicationRecovery
        kind={chunkFailure ? "chunk" : "render"}
        onRetry={chunkFailure ? undefined : this.retry}
        onReloadPage={() => window.location.reload()}
      />;
    }
    return <React.Fragment key={this.state.revision}>{this.props.children}</React.Fragment>;
  }
}
