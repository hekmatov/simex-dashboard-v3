import test from "node:test";
import assert from "node:assert/strict";

const ledgerModule = await import(
  "../src/charting/rendering/canonicalRuntimeLedger.js"
).catch(() => null);

test("canonical ledger projects stable semantics and excludes paint density", () => {
  assert.equal(typeof ledgerModule?.projectCanonicalRuntimeLedger, "function");
  const ledger = ledgerModule.projectCanonicalRuntimeLedger({
    chart: {
      id: "bio_confirmed_cases",
      typeId: "line",
      transformations: {
        filters: [{ field: "region", operator: "equals", value: "North" }],
      },
      presentation: {
        background: { color: "#ffffff", transparent: false },
        title: { align: "center" },
      },
      layout: { size: "wide" },
    },
    timeContext: {
      activeEpochMs: Date.UTC(2027, 4, 2),
      frameIndex: 1,
      traceMode: "reveal",
    },
    resolution: {
      status: "available",
      schema: { typeId: "line" },
      prepared: { status: "ready" },
      model: {
        kind: "echarts",
        option: {
          series: [{
            id: "national_total_cases",
            name: "National total cases",
            data: [["2027-05-01", 4], ["2027-05-02", 6]],
            markLine: {
              data: [{ yAxis: 5, name: "Preparedness threshold" }],
            },
            markPoint: {
              data: [{ coord: ["2027-05-02", 6], name: "Active frame", active: true }],
            },
          }],
        },
      },
    },
  });

  assert.deepEqual(ledger, {
    annotations: [{ name: "Preparedness threshold", yAxis: 5 }],
    filters: [{ field: "region", operator: "equals", value: "North" }],
    panelId: "bio_confirmed_cases",
    render: { kind: "echarts", resolution: "available", status: "ready", typeId: "line" },
    series: [{
      id: "national_total_cases",
      name: "National total cases",
      values: [["2027-05-01", 4], ["2027-05-02", 6]],
    }],
    time: { activeEpochMs: Date.UTC(2027, 4, 2), frameIndex: 1, traceMode: "reveal" },
  });
  assert.equal(JSON.stringify(ledger).includes("#ffffff"), false);
  assert.equal(JSON.stringify(ledger).includes("wide"), false);
});

test("canonical ledger serialization is deterministic and browser-readable", () => {
  assert.equal(typeof ledgerModule?.serializeCanonicalRuntimeLedger, "function");
  const first = ledgerModule.serializeCanonicalRuntimeLedger({
    chart: { id: "panel-a", typeId: "kpi", transformations: { filters: [] } },
    resolution: {
      status: "unavailable",
      schema: { typeId: "kpi" },
      prepared: null,
      model: { kind: "error", message: "Unavailable" },
    },
  });
  const second = ledgerModule.serializeCanonicalRuntimeLedger({
    chart: { id: "panel-a", typeId: "kpi", transformations: { filters: [] } },
    resolution: {
      status: "unavailable",
      schema: { typeId: "kpi" },
      prepared: null,
      model: { kind: "error", message: "Unavailable" },
    },
  });

  assert.equal(first, second);
  assert.deepEqual(JSON.parse(first), {
    annotations: [],
    filters: [],
    panelId: "panel-a",
    render: { kind: "error", resolution: "unavailable", status: null, typeId: "kpi" },
    series: [],
    time: { activeEpochMs: null, frameIndex: null, traceMode: null },
  });
});
