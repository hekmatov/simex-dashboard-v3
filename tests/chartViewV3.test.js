import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { profileDataset } from "../src/charting/data/profileDataset.js";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const { default: ChartView } = await import("../src/components/charts/ChartView.jsx");

const deltaRows = [
  { capacity: 8, observed: "2027-05-01" },
  { capacity: 10, observed: "2027-05-02" },
];

const deltaCard = {
  id: "capacity-change",
  typeId: "deltaCard",
  title: "Current capacity",
  description: "Latest capacity compared with the previous observation.",
  roles: {
    measurement: { field: "capacity" },
    time: { field: "observed" },
  },
  presentation: { collection: null, labels: null, accessibility: null },
  interaction: { zoom: { enabled: false } },
};

test("card render models expose labels, values, deltas, and provenance", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartView, {
      chart: deltaCard,
      rows: deltaRows,
      datasetProfile: profileDataset(deltaRows, { observed: { interpretation: "temporal" } }),
    }),
  );

  assert.match(html, /Current capacity/);
  assert.match(html, /\+2/);
  assert.match(html, /Compared with 2027-05-01/);
});

test("invalid prepared data renders a bounded chart error", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartView, { chart: { typeId: "kpi", title: "Capacity", roles: {} }, rows: [] }),
  );

  assert.match(html, /chart-status-error/);
  assert.match(html, /role/i);
});

test("table render models retain headers, values, observation time, and provenance", () => {
  const rows = [{ facility: "Clinic A", score: 7, observed: "2027-05-02" }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "table",
      title: "Facility readiness",
      roles: { columns: [{ field: "facility" }, { field: "score" }], time: { field: "observed" } },
      provenance: "Readiness register",
    },
    rows,
    datasetProfile: profileDataset(rows, { observed: { interpretation: "temporal" } }),
  }));

  assert.match(html, /scope="col">facility/);
  assert.match(html, /Clinic A/);
  assert.match(html, /aria-label="Observed 2027-05-02"/);
  assert.match(html, /Source: Readiness register/);
});

test("image render models use safe sources, alternative text, and fit", () => {
  const imageRows = [{ src: "/maps/readiness.png", alt: "Readiness map", fit: "cover" }];
  const image = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { typeId: "image", title: "Readiness map", roles: {} },
    rows: imageRows,
    datasetProfile: profileDataset(imageRows),
  }));
  const unsafeRows = [{ src: "javascript:alert(1)", alt: "Unsafe" }];
  const unsafe = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { typeId: "image", title: "Unsafe", roles: {} },
    rows: unsafeRows,
    datasetProfile: profileDataset(unsafeRows),
  }));

  assert.match(image, /src="\/maps\/readiness.png"/);
  assert.match(image, /alt="Readiness map"/);
  assert.match(image, /object-fit:cover/);
  assert.match(unsafe, /chart-status-error/);
});

test("ECharts render models remain SSR-safe and describe their content", () => {
  const rows = [{ period: "May", value: 4 }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "bar",
      title: "Monthly capacity",
      description: "Capacity by month.",
      roles: { measurements: { field: "value" }, observation: { field: "period" } },
      interaction: { zoom: { enabled: true } },
    },
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.match(html, /role="img"/);
  assert.match(html, /Monthly capacity contains 1 plotted value/);
  assert.match(html, /data-zoom-modifier="Control"/);
});

test("gauge render models expose their value and target in the accessible summary", () => {
  const rows = [{ actual: 8, target: 10 }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "gauge",
      title: "Supply readiness",
      roles: { value: { field: "actual" }, target: { field: "target" } },
    },
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.match(html, /Value 8; target 10/);
});
