import assert from "node:assert/strict";
import test from "node:test";

import { validateDashboardStructure } from "../src/charting/config/dashboardConfigStructure.js";
import {
  ATTENTION_STRIP_CHART_TYPES,
  attentionRoleIssues,
  drillTargetsForPage,
  partitionPageSections,
  resolveDrillTarget,
  sectionRole,
} from "../src/charting/config/sectionRoles.js";

const kpi = (id) => ({ id, typeId: "kpi", title: `KPI ${id}`, sourceId: "s" });
const bar = (id) => ({ id, typeId: "bar", title: `Bar ${id}`, sourceId: "s" });

function page({ attentionPanels = [kpi("k1")], role = "attention" } = {}) {
  return {
    id: "ops",
    sections: [
      { id: "top", title: "At a glance", role, panels: attentionPanels },
      { id: "body", title: "Hospital pressure", panels: [bar("b1")] },
    ],
  };
}

function dashboard(pages) {
  return {
    configVersion: 6,
    id: "d",
    title: "D",
    timezone: "UTC",
    contentLibrary: {},
    dataSources: {},
    home: { enabled: true },
    pages,
  };
}

test("sectionRole defaults to standard", () => {
  assert.equal(sectionRole({ id: "x", panels: [] }), "standard");
  assert.equal(sectionRole({ id: "x", panels: [], role: "attention" }), "attention");
});

test("partitionPageSections lifts the attention section out of the body order", () => {
  const result = partitionPageSections(page());
  assert.equal(result.attention.id, "top");
  assert.deepEqual(result.body.map(({ id }) => id), ["body"]);
  assert.equal(partitionPageSections({ id: "p", sections: [] }).attention, null);
});

test("attentionRoleIssues names disallowed charts and an existing attention section", () => {
  const withBar = page({ attentionPanels: [kpi("k1"), bar("b2")], role: undefined });
  assert.deepEqual(attentionRoleIssues(withBar, withBar.sections[0]), [
    'Bar b2 is a bar chart. Only KPI card and Delta card charts can sit in the attention strip.',
  ]);
  const second = page();
  assert.deepEqual(attentionRoleIssues(second, second.sections[1]), [
    "At a glance is already this page's attention strip.",
    "Bar b1 is a bar chart. Only KPI card and Delta card charts can sit in the attention strip.",
  ]);
  assert.deepEqual(attentionRoleIssues(page({ role: undefined }), page().sections[0]), []);
});

test("drill targets exclude the attention section and resolve titles", () => {
  const p = page();
  assert.deepEqual(drillTargetsForPage(p, "top"), [
    { kind: "section", id: "body", title: "Hospital pressure" },
    { kind: "chart", id: "b1", title: "Bar b1" },
  ]);
  assert.deepEqual(resolveDrillTarget(p, { kind: "chart", chartId: "b1" }), { kind: "chart", id: "b1", title: "Bar b1" });
  assert.equal(resolveDrillTarget(p, { kind: "section", sectionId: "missing" }), null);
});

test("validateDashboardStructure accepts a valid attention section with drills", () => {
  const p = page({ attentionPanels: [{ id: "w1", chart: kpi("k1"), drill: { kind: "section", sectionId: "body" } }] });
  assert.doesNotThrow(() => validateDashboardStructure(dashboard([p])));
});

test("validateDashboardStructure rejects role, count, chart type, and drill violations", () => {
  assert.throws(() => validateDashboardStructure(dashboard([page({ role: "hero" })])), /role must be one of: standard, attention/);
  const two = page();
  two.sections[1].role = "attention";
  assert.throws(() => validateDashboardStructure(dashboard([two])), /at most one attention section/);
  assert.throws(() => validateDashboardStructure(dashboard([page({ attentionPanels: [bar("b9")] })])), /chart "b9" must be one of: kpi, deltaCard/);
  const badDrill = page({ attentionPanels: [{ id: "w1", chart: kpi("k1"), drill: { kind: "chart", chartId: "k1" } }] });
  assert.throws(() => validateDashboardStructure(dashboard([badDrill])), /drill target "k1" must be outside the attention section/);
  const bodyDrill = page();
  bodyDrill.sections[1].panels = [{ id: "w2", chart: bar("b1"), drill: { kind: "section", sectionId: "top" } }];
  assert.throws(() => validateDashboardStructure(dashboard([bodyDrill])), /drill is only allowed inside an attention section/);
});

test("ATTENTION_STRIP_CHART_TYPES is the two card types", () => {
  assert.deepEqual([...ATTENTION_STRIP_CHART_TYPES], ["kpi", "deltaCard"]);
});
