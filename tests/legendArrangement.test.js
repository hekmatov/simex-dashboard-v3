import assert from "node:assert/strict";
import test from "node:test";
import * as echarts from "echarts";
import { createChartDraft, validateChartInstance } from "../src/charting/config/chartConfigV3.js";
import { buildEditorFormModel, buildQuickEditorFormModel, buildFormPreparationKey } from "../src/charting/forms/formModel.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import { fitLegendToViewport, fitRenderedLegend } from "../src/charting/rendering/legendLayout.js";

const rows = [{ year: "2026", value: 41, category: "Exposure" }, { year: "2027", value: 52, category: "Concern" }];
const profile = profileDataset(rows);
const roles = {
  line: { observation: { field: "year", interpretation: "category" }, measurements: [{ field: "value", axis: "primary" }] },
  pie: { category: { field: "category" }, value: { field: "value" } },
  scatter: { x: { field: "value" }, y: { field: "value" } },
};
const draft = (typeId = "line", legend = {}) => createChartDraft(typeId, {
  id: "legend-example", title: "Example", sourceId: "example", roles: roles[typeId], presentation: { legend },
});

test("legend arrangement is optional, validated, and preserved through chart serialization", () => {
  const original = draft();
  assert.equal(validateChartInstance(original), original);
  for (const orientation of ["horizontal", "vertical"]) {
    const restored = JSON.parse(JSON.stringify(draft("line", { orientation })));
    assert.equal(validateChartInstance(restored).presentation.legend.orientation, orientation);
  }
  for (const orientation of ["diagonal", "", null, false]) {
    const invalid = draft();
    invalid.presentation.legend.orientation = orientation;
    assert.throws(() => validateChartInstance(invalid), /legend orientation/);
  }
});

test("Quick and Full legend controls project the saved arrangement to every supported renderer", () => {
  for (const typeId of Object.keys(roles)) {
    const chart = draft(typeId, { orientation: "vertical" });
    const result = prepareChartData({ chart, rows, datasetProfile: profile });
    const prepared = { ...result, meta: { ...result.meta, formPreparationKey: buildFormPreparationKey({ chart, profile }) } };
    assert.equal(prepared.status, "ready");
    for (const form of [buildQuickEditorFormModel({ chart }), buildEditorFormModel({ chart, profile, prepared })]) {
      const field = form.sections.flatMap(section => section.fields ?? []).find(field => field.id === "legendOrientation");
      assert.equal(field.label, "Legend arrangement");
      assert.equal(field.control, "select");
      assert.equal(field.value, "vertical");
      assert.deepEqual(field.path, ["presentation", "legend", "orientation"]);
      assert.deepEqual(field.options.map(option => option.value), ["horizontal", "vertical"]);
    }
    assert.equal(buildRenderModel({ chart, prepared }).option.legend.orient, "vertical");
    const defaultChart = draft(typeId);
    assert.equal(buildRenderModel({ chart: defaultChart, prepared }).option.legend.orient, "horizontal");
  }
});

test("rendered vertical and wrapped horizontal legends keep their full height clear of the plot", () => {
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width: 640, height: 360 });
  const names = ["Reported regular exposure to mis- and disinformation (%)", "Concern about online mis- and disinformation (%)"];
  const source = {
    animation: false,
    legend: { type: "scroll", orient: "vertical", top: 12, left: "center", width: "88%", textStyle: { fontSize: 14, width: 120, overflow: "break" } },
    grid: { containLabel: true, top: 44, bottom: 32 },
    xAxis: { type: "category", data: [2026, 2027] },
    yAxis: { type: "value" },
    series: names.map((name, index) => ({ name, type: "line", data: [41 + index, 52 + index] })),
  };
  try {
    for (const orient of ["vertical", "horizontal"]) {
      for (const width of [640, 360]) {
        instance.resize({ width, height: 360 });
        const option = fitLegendToViewport({ ...source, legend: { ...source.legend, orient } }, width, 360);
        instance.setOption(option, { notMerge: true });
        fitRenderedLegend(instance, option, { minimumGridTop: 10 });
        const model = instance.getModel();
        const group = instance.getViewOfComponentModel(model.getComponent("legend")).group;
        const rect = group.getBoundingRect();
        const bottom = group.transformCoordToGlobal(rect.x, rect.y)[1] + rect.height;
        assert.ok(model.getComponent("grid").get("top") >= bottom + 9, `${orient}, ${width}px`);
        assert.equal(model.getComponent("grid").get("bottom"), 32);
      }
    }
    const many = fitLegendToViewport({ ...source, series: Array.from({ length: 20 }, (_, i) => ({ name: `Item ${i}`, type: "line", data: [i, i + 1] })) }, 640, 360);
    instance.setOption(many, { notMerge: true });
    fitRenderedLegend(instance, many, { minimumGridTop: 10 });
    assert.ok(instance.getModel().getComponent("grid").get("top") <= 360 * 0.4 + 32);
    const hidden = { ...many, legend: { ...many.legend, show: false } };
    instance.setOption(hidden, { notMerge: true });
    fitRenderedLegend(instance, hidden, { minimumGridTop: 10 });
    assert.equal(instance.getModel().getComponent("grid").get("top"), 10);
    assert.equal(source.legend.textStyle.width, 120, "viewport fitting must not mutate saved options");
  } finally {
    instance.dispose();
  }
});

test("the final year stays visible on both temporal and thinned category x axes", () => {
  const annual = Array.from({ length: 7 }, (_, i) => ({ Year: 2021 + i, value: 29 + i }));
  for (const interpretation of ["temporal", "category"]) {
    const chart = createChartDraft("line", {
      id: "annual", title: "Annual exposure", sourceId: "annual",
      roles: {
        observation: { field: "Year", interpretation, ...(interpretation === "temporal" ? { format: "YYYY" } : {}) },
        measurements: [{ field: "value", axis: "primary" }],
      },
      presentation: { axes: { x: interpretation === "category" ? { tickFrequency: { every: 4 } } : {} } },
    });
    const prepared = prepareChartData({ chart, rows: annual, datasetProfile: profileDataset(annual) });
    const option = buildRenderModel({ chart, prepared }).option;
    assert.equal(option.xAxis.axisLabel.showMaxLabel, true);
    for (const width of [320, 640]) {
      const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width, height: 360 });
      try {
        instance.setOption(option);
        instance.renderToSVGString();
        const labels = instance.getZr().storage.getDisplayList(true).map(element => String(element.style?.text ?? ""));
        assert.ok(labels.includes("2027"), `${interpretation} at ${width}px must retain its final year`);
      } finally { instance.dispose(); }
    }
  }
});
