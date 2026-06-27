import ChartPanel from "./ChartPanel.jsx";
import LayoutGrid from "./LayoutGrid.jsx";

export default function DashboardRenderer({ dashboard }) {
  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{dashboard.programLabel}</p>
          <h1>{dashboard.title}</h1>
          <p className="subtitle">{dashboard.description}</p>
        </div>
        <dl className="dashboard-meta">
          <div>
            <dt>Scenario</dt>
            <dd>{dashboard.scenarioLabel}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{dashboard.lastUpdated}</dd>
          </div>
        </dl>
      </header>

      <LayoutGrid layout={dashboard.layout}>
        {dashboard.charts.map((chart) => (
          <ChartPanel
            key={chart.id}
            chart={chart}
            data={dashboard.loadedData[chart.dataSource]}
          />
        ))}
      </LayoutGrid>
    </main>
  );
}
