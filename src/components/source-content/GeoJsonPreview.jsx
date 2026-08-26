import React from "react";

import EChartsChartView from "../charts/EChartsChartView.jsx";

export default function GeoJsonPreview({ sourceId, geoData, summary, visible = true, active = true }) {
  const mapName = `source-content-preview:${sourceId}`;
  const text = previewText(summary);
  const model = React.useMemo(() => ({
    kind: "echarts",
    mapRegistration: { name: mapName, geoJson: geoData },
    option: {
      animation: false,
      geo: { map: mapName, roam: true, silent: false },
      series: [{ type: "map", map: mapName, data: [], silent: true }],
    },
  }), [geoData, mapName]);
  return (
    <section className="source-content-geojson-preview" aria-labelledby={`geojson-preview-${sourceId}`}>
      <h4 id={`geojson-preview-${sourceId}`}>Map preview</h4>
      <div className="source-content-geojson-preview__map">
        <EChartsChartView
          model={model}
          chart={{ id: `preview-${sourceId}`, title: "GeoJSON map preview" }}
          mapBudgetRequest={{ ownerId: `preview:${sourceId}`, kind: "preview", visible, active }}
        />
      </div>
      <p className="source-content-geojson-preview__fallback" aria-label="GeoJSON preview summary">{text}</p>
    </section>
  );
}

function previewText(summary = {}) {
  const bounds = Array.isArray(summary.boundingBox) ? summary.boundingBox.join(", ") : "not available";
  const types = Object.entries(summary.geometryTypeCounts ?? {})
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ") || "none";
  return `${summary.featureCount ?? 0} features. Geometry ${types}. Bounds ${bounds}.`;
}
