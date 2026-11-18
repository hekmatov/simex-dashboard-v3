import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { getChartSchema } from "../src/charting/schemas/chartSchemaRegistry.js";

const vite = await createServer({ root: process.cwd(), configFile: false, optimizeDeps: { noDiscovery: true }, plugins: [reactPlugin()],
  server: { middlewareMode: true, watch: null }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
const [{ default: TimeBar }, { default: TimeSettings }, { default: TimelineScrubber }, { PlaybackProvider },
  { default: ChartView }, { default: SchemaField }, { default: AuthoringStage }] = await Promise.all([
  "playback/TimeBar", "playback/TimeSettings", "playback/TimelineScrubber", "playback/PlaybackProvider", "charts/ChartView",
  "chart-authoring/SchemaField", "chart-authoring/AuthoringStage",
].map(path => vite.ssrLoadModule(`/src/components/${path}.jsx`)));
const editorModule = await vite.ssrLoadModule("/src/components/chart-authoring/ChartEditorV3.jsx");
const wizardModule = await vite.ssrLoadModule("/src/components/chart-authoring/ChartWizardV3.jsx");
const JAN1 = Date.parse("2027-01-01"), JAN2 = Date.parse("2027-01-02"), JAN3 = Date.parse("2027-01-03");
const rows = [{ date: "2027-01-01", value: 10 }, { date: "2027-01-03", value: 20 }], profile = profileDataset(rows);
const chart = createChartDraft("line", { id: "cases", title: "Cases", sourceId: "data", roles: {
  observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
} });
const options = { charts: [chart], pageCharts: [chart], groups: [], scenes: [], loadedData: { data: rows }, profiles: { data: profile }, activePageId: "page" };
const at = { mode: "at", epochMs: JAN2, scope: { kind: "page", id: "page" }, window: null };
const renderBar = extra => renderToStaticMarkup(React.createElement(PlaybackProvider, { ...options, ...extra }, React.createElement(TimeBar)));

test("Time bar exposes Live, actual instant, transport and available scopes without floating controls", () => {
  const html = renderBar({ exerciseTime: "2027-01-02T00:00:00.000Z" });
  assert.match(html, /aria-label="Dashboard time"/);
  assert.match(html, /data-time-mode="live"/);
  assert.match(html, /aria-label="Live, 2027-01-02" aria-pressed="true"/);
  for (const label of ["Previous time", "Play time", "Next time", "Choose time, 2027-01-02", "Time scope"]) assert.ok(html.includes(`aria-label="${label}"`));
  assert.match(html, /value="page" selected/);
  assert.match(html, /value="dashboard"/);
  assert.doesNotMatch(html, /Chrono view|playback-controls--floating/);
});

test("At time has one polite announcement and a distinct Return to Live action", () => {
  const html = renderBar({ initialState: { cursor: at } });
  assert.match(html, /data-time-mode="at"/);
  assert.match(html, /aria-label="Return to Live" aria-pressed="false"/);
  assert.equal((html.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.match(html, /At 2027-01-02/);
});

test("Present Time bar exposes Advance exercise time and readonly reason without a second clock", () => {
  const html = renderToStaticMarkup(React.createElement(PlaybackProvider, { ...options, initialState: { cursor: at } },
    React.createElement(TimeBar, { onAdvanceExerciseTime() {}, advanceDisabledReason: "This dashboard is read-only." })));
  assert.match(html, /<button[^>]*disabled=""[^>]*title="This dashboard is read-only\."[^>]*>Advance exercise time<\/button>/);
  assert.equal((html.match(/aria-label="Dashboard time"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-live="polite"/g) ?? []).length, 1);
});

test("parentless Storylines are available as shared time scopes and empty clocks disable transport clearly", () => {
  const scene = { id: "story", name: "Cases and trust", members: [{ chartId: chart.id, width: 4 }], frames: { mode: "source", chartId: chart.id, selection: "all" } };
  const html = renderBar({ scenes: [scene], initialState: { cursor: { ...at, scope: { kind: "storyline", id: "story" } } } });
  assert.match(html, /value="storyline:story" selected/);
  assert.match(html, /Cases and trust/);
  const empty = renderBar({ charts: [], pageCharts: [], loadedData: {}, profiles: {} });
  assert.match(empty, /No observations in this scope or window/);
  assert.match(empty, /aria-label="Play time" disabled=""/);
  assert.match(empty, /aria-label="Previous time" disabled=""/);
});

test("phone Time bar exposes only Live, play and instant before its disclosure opens", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { matchMedia: () => ({ matches: true }) } });
  try {
    const html = renderBar({});
    const start = html.indexOf('class="time-bar__row"');
    const row = html.slice(start, html.indexOf("</div>", start));
    assert.equal((row.match(/<button/g) ?? []).length, 3);
    assert.doesNotMatch(row, /aria-label="Time scope"|Previous time|Next time/);
    assert.match(html, /class="time-bar__disclosure" hidden=""/);
  } finally { if (previous) Object.defineProperty(globalThis, "window", previous); else delete globalThis.window; }
});

test("Time settings require a visible nearest bound and preserve custom saved speed", () => {
  const html = renderToStaticMarkup(React.createElement(TimeSettings, { playback: { cursor: { window: null }, dispatch() {},
    speed: 0.75, matchingOverride: "closest", nearestToleranceMs: null, traceMode: "reveal", availabilityVisible: false } }));
  assert.match(html, /value="0.75" selected/);
  assert.match(html, /type="number" min="0.001" step="0.001"[^>]*value="0.75"/);
  assert.match(html, /Nearest maximum distance \(hours\)/);
  assert.match(html, /type="number" min="0" step="any" value=""/);
  assert.match(html, /Apply nearest override/);
  assert.match(html, /before closest matching takes effect/);
  assert.doesNotMatch(html, /9007199254740991/);
});

test("timeline disclosure exposes a native millisecond range and declared exercise marker", () => {
  const html = renderToStaticMarkup(React.createElement(TimelineScrubber, { playback: { clock: [JAN1, JAN3], observationClock: [JAN1, JAN3],
    cursor: { window: null }, activeEpochMs: JAN2, exerciseTime: "2027-01-02T00:00:00.000Z", dispatch() {} } }));
  assert.match(html, /aria-label="Timeline scrubber"/);
  assert.match(html, /type="range" aria-label="Selected time"/);
  assert.match(html, new RegExp(`min="${JAN1}" max="${JAN3}" step="1" value="${JAN2}"`));
  assert.match(html, /timeline-scrubber__now/);
});

test("axis time chip shows real carried observation and exact gaps stay quiet beside one Time bar announcement", () => {
  const html = renderToStaticMarkup(React.createElement(PlaybackProvider, { ...options, exerciseTime: "2027-01-02T00:00:00.000Z" },
    React.createElement(React.Fragment, null, React.createElement(TimeBar), React.createElement(ChartView, {
      chart: { ...chart, interaction: { ...chart.interaction, timeSync: { matching: { policy: "lastKnown" } } } },
      rows, datasetProfile: profile, timeContext: { kind: "cursor", mode: "live", scope: at.scope, activeEpochMs: JAN2, matching: { policy: "lastKnown" } }, timeContextAuthority: "explicit",
    }))));
  assert.match(html, /data-chart-time-kind="observed"/);
  assert.match(html, /As of 2027-01-01 · last known/);
  const missing = renderToStaticMarkup(React.createElement(ChartView, { chart, rows, datasetProfile: profile,
    timeContext: { kind: "cursor", mode: "at", scope: at.scope, activeEpochMs: JAN2, matching: { policy: "exact" } }, timeContextAuthority: "explicit" }));
  assert.match(missing, /data-chart-time-kind="missing"/);
  assert.doesNotMatch(missing, /aria-live="polite"/);
});

test("a View gap under a bounded matching policy keeps the title and shows one status", () => {
  const html = renderToStaticMarkup(React.createElement(ChartView, { chart, rows, datasetProfile: profile, surface: "view",
    timeContext: { kind: "cursor", mode: "at", scope: at.scope, activeEpochMs: JAN2, matching: { policy: "nearest", toleranceMs: 0 } },
    timeContextAuthority: "explicit" }));
  assert.match(html, /<h3[^>]*>Cases<\/h3>/);
  assert.equal(html.match(/No observations match this time setting/g)?.length, 1);
  assert.doesNotMatch(html, /No measurement at this time|data-chart-time-fallback/);
});

test("native snapshots show Static only at historical time and Data authoring displays explicit tolerance", () => {
  const snapshot = createChartDraft("kpi", { id: "snapshot", sourceId: "data", title: "Snapshot", roles: { value: { field: "value" } } });
  const html = renderToStaticMarkup(React.createElement(ChartView, { chart: snapshot, rows, datasetProfile: profile, cursorMode: "at", timeContextAuthority: "explicit" }));
  assert.match(html, /data-chart-time-kind="static"/);
  const nearest = { ...chart, interaction: { ...chart.interaction, timeSync: { matching: { policy: "nearest", toleranceMs: 3_600_000 } } } };
  const field = renderToStaticMarkup(React.createElement(SchemaField, { chart: nearest, profile, field: { id: "chartTimeMatching", label: "Time matching", control: "chartTimeMatching", path: ["interaction", "timeSync"] } }));
  assert.match(field, /Chart time matching/);
  assert.match(field, /Chart nearest maximum distance \(hours\)/);
  assert.match(field, /type="number" min="0" step="any" value="1"/);
});

test("Build stage previews a local draft at the current cursor with Live and At controls", () => {
  const html = renderToStaticMarkup(React.createElement(PlaybackProvider, { ...options, initialState: { cursor: at }, exerciseTime: "2027-01-03T00:00:00.000Z" },
    React.createElement(AuthoringStage, { chart: { ...chart, id: "new-draft" }, rows, datasetProfile: profile, canvasWidth: 1200 })));
  assert.match(html, /aria-label="Preview time"/);
  assert.match(html, /aria-pressed="true">At preview/);
  assert.match(html, /Not concurrent · Observed 2027-01-01/);
});

test("matching defaults survive membership adapters and editor save without retaining Group backlinks", () => {
  for (const matching of [{ policy: "lastKnown" }, { policy: "nearest", toleranceMs: 3_600_000 }]) {
    const source = structuredClone(chart), other = { ...structuredClone(chart), id: "other" };
    source.interaction.timeSync = { groupId: "old-backlink", matching };
    const groups = [{ id: "group", name: "Timeline", period: { start: "2027-01-01", end: "2027-01-03" },
      matching: { policy: "exact" }, secondsPerFrame: 1, members: [{ chartId: "other", timeRole: "observation" }] }];
    const before = structuredClone(source);
    const context = { profile, profiles: { data: profile }, loadedData: { data: rows }, existingCharts: [other] };
    let editor = editorModule.createChartEditorState({ chart: source, chronoGroups: groups });
    for (const selected of [true, false]) {
      editor = editorModule.reduceChartEditorState(editor, { type: "updateTimeSyncMembership", groupId: "group", selected, timeRole: "observation" }, context);
      assert.deepEqual(editorModule.saveChartEditorState(editor, context).chart.interaction.timeSync, { matching });
      const proposal = wizardModule.applyWizardMembership({ chart: source, groups, groupId: "group", selected, timeRole: "observation" });
      assert.deepEqual(proposal.chart.interaction.timeSync, { matching });
    }
    assert.deepEqual(source, before);
  }
});

test("chart matching clear remains usable after optional temporal role removal and restores strict save validity", () => {
  const role = getChartSchema("kpi").roles.find(role => role.accepts.includes("temporal")).id;
  const source = createChartDraft("kpi", { id: "snapshot", title: "Snapshot", sourceId: "data", roles: {
    value: { field: "value" }, [role]: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
  } });
  source.interaction.timeSync = { matching: { policy: "nearest", toleranceMs: 3_600_000 } };
  let state = editorModule.createChartEditorState({ chart: source });
  state = editorModule.reduceChartEditorState(state, { type: "updateChart", path: ["roles", role], value: undefined });
  assert.throws(() => editorModule.saveChartEditorState(state, { profile }), /temporal role/i);
  let change;
  const element = SchemaField({ chart: state.draft, profile, field: { id: "chartTimeMatching", label: "Time matching", control: "chartTimeMatching", path: ["interaction", "timeSync"] },
    onChange: (path, value) => { change = { path, value }; } });
  const tree = element.type(element.props);
  const find = node => { if (!React.isValidElement(node)) return null; if (node.type === "button" && node.props.children === "Clear chart time matching") return node;
    return React.Children.toArray(node.props.children).map(find).find(Boolean); };
  const clear = find(tree);
  assert.ok(clear, "A clear action must remain available beside the disabled matching fieldset.");
  assert.notEqual(clear.props.disabled, true);
  assert.deepEqual(state.draft.interaction.timeSync, source.interaction.timeSync);
  clear.props.onClick();
  state = editorModule.reduceChartEditorState(state, { type: "updateChart", path: change.path, value: change.value });
  assert.equal(editorModule.saveChartEditorState(state, { profile }).chart.interaction.timeSync, null);
  assert.deepEqual(state.draft.roles.value, source.roles.value);
});
