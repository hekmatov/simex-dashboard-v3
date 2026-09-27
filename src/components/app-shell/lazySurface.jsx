import React from "react";

function LazySurfaceStatus({ label, overlay, error = false }) {
  const content = (
    <div className="lazy-surface-status">
      <p>{error ? `${label} could not be loaded.` : `Loading ${label}…`}</p>
      {error && <button type="button" onClick={() => window.location.reload()}>Retry</button>}
    </div>
  );
  if (overlay) {
    return (
      <div className="dashboard-dialog-backdrop" role={error ? "alert" : "status"}>
        {content}
      </div>
    );
  }
  return <div role={error ? "alert" : "status"}>{content}</div>;
}

class LazySurfaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <LazySurfaceStatus label={this.props.label} overlay={this.props.overlay} error />;
    }
    return this.props.children;
  }
}

export function lazySurface(load, label, { overlay = false } = {}) {
  const Component = React.lazy(load);
  return function LazySurface(props) {
    return (
      <LazySurfaceErrorBoundary label={label} overlay={overlay}>
        <React.Suspense fallback={<LazySurfaceStatus label={label} overlay={overlay} />}>
          <Component {...props} />
        </React.Suspense>
      </LazySurfaceErrorBoundary>
    );
  };
}
