import { useEffect, useState } from "react";

import DashboardRenderer from "./components/DashboardRenderer.jsx";
import { loadDashboard } from "./lib/loadDashboard.js";

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard("/config/dashboard.json")
      .then(setDashboard)
      .catch((loadError) => setError(loadError));
  }, []);

  if (error) {
    return (
      <main className="app-shell">
        <section className="status-panel status-panel-error">
          <h1>Dashboard configuration error</h1>
          <p>{error.message}</p>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="app-shell">
        <section className="status-panel">
          <h1>Loading dashboard</h1>
          <p>Reading configuration and prepared data files.</p>
        </section>
      </main>
    );
  }

  return <DashboardRenderer dashboard={dashboard} />;
}
