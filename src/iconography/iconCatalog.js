import { ICON_GLYPHS } from "./iconGlyphs.js";
export const ICON_LANGUAGE_VERSION="1.0.0";
export const ICON_TOKENS=Object.freeze({accentBase:"#19D3C5",accentOnLight:"#0D746D",accentOnDark:"#32DED1",danger:"#D64545",success:"#2AA876"});
export const ICON_STATES=Object.freeze(["default","hover","active","selected","disabled","busy","danger"]);
const inventory=[{"id":"refinements","title":"Approved refinements","entries":[{"id":"shell.open-editable-tab","glyphId":"open","label":"Open editable tab","tooltip":"Open editable tab","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Arrow spacing balanced above and beside the box"},{"id":"image.zoom-reset","glyphId":"zoomReset","label":"Reset image zoom","tooltip":"Reset image zoom","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Approved reset arc with inset magnifier"},{"id":"transport.fast-forward","glyphId":"fastForward","label":"Fast forward","tooltip":"Fast forward","renderMode":"icon","tone":"standard","status":"planned","confirmation":"none","note":"Exact horizontal mirror of rewind"},{"id":"fullscreen.select.1","glyphId":"selectPanel1","label":"1 of 4 selected","tooltip":"1 of 4 selected","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Number offset upper-left of the semantic check"},{"id":"fullscreen.open","glyphId":"fullscreen","label":"Fullscreen","tooltip":"Fullscreen","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Complete top-right corner uses the accent"},{"id":"panel.description","glyphId":"description","label":"Description","tooltip":"Description","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Top and bottom lines accented"},{"id":"collection.loop","glyphId":"loop","label":"Loop","tooltip":"Loop","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Arrowheads terminate the path and point down/up"},{"id":"collection.periodic","glyphId":"periodic","label":"Periodic rotation","tooltip":"Periodic rotation","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Arrowhead follows the circular direction"},{"id":"chart.mixed-axis","glyphId":"chartMixed","label":"Mixed axis","tooltip":"Mixed axis","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Three bars with a lower accent line"},{"id":"chart.pie","glyphId":"chartPie","label":"Pie","tooltip":"Pie","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Equal horizontal and vertical slice separation"},{"id":"chart.chronological-choropleth","glyphId":"chartMapTime","label":"Chronological choropleth","tooltip":"Chronological choropleth","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Larger time clock"},{"id":"chart.table","glyphId":"chartTable","label":"Table","tooltip":"Table","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Top row and left column accented with inset fills"}]},{"id":"shell","title":"Dashboard shell","entries":[{"id":"shell.open-editable-tab.1","glyphId":"open","label":"Open editable tab","tooltip":"Open editable tab","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.auto-viewport","glyphId":"auto","label":"Auto","tooltip":"Auto","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.tablet-preview","glyphId":"tablet","label":"Tablet","tooltip":"Tablet","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.phone-preview","glyphId":"phone","label":"Phone","tooltip":"Phone","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.background","glyphId":"background","label":"Background","tooltip":"Background","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.add-chart","glyphId":"addChart","label":"Add chart","tooltip":"Add chart","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.edit-chart","glyphId":"edit","label":"Edit chart","tooltip":"Edit chart","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.remove-chart","glyphId":"trash","label":"Remove chart","tooltip":"Remove chart","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Destructive color"},{"id":"shell.add-tab","glyphId":"addTab","label":"Add tab","tooltip":"Add tab","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.reset-image-zoom","glyphId":"zoomReset","label":"Reset image zoom","tooltip":"Reset image zoom","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"shell.save-edits","glyphId":"save","label":"Save edits","tooltip":"Save edits","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.reset-edits","glyphId":"reset","label":"Reset edits","tooltip":"Reset edits","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.remove-tab","glyphId":"trash","label":"Remove tab","tooltip":"Remove tab","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Scope-changing confirmation"},{"id":"shell.import","glyphId":"import","label":"Import","tooltip":"Import","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.export","glyphId":"export","label":"Export","tooltip":"Export","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.global-panel-colors","glyphId":"palette","label":"Global panel colors","tooltip":"Global panel colors","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.chart-accessibility","glyphId":"accessibility","label":"Chart accessibility","tooltip":"Chart accessibility","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.apply-background","glyphId":"check","label":"Apply background","tooltip":"Apply background","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.save-background","glyphId":"save","label":"Save background","tooltip":"Save background","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.reset-background","glyphId":"reset","label":"Reset background","tooltip":"Reset background","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.remove-title","glyphId":"trash","label":"Remove title","tooltip":"Remove title","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Content-changing confirmation"},{"id":"shell.start-section","glyphId":"section","label":"Start section","tooltip":"Start section","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.install","glyphId":"open","label":"Install","tooltip":"Install","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.report-an-issue","glyphId":"open","label":"Report an issue","tooltip":"Report an issue","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.contact","glyphId":"open","label":"Contact","tooltip":"Contact","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"shell.repository","glyphId":"open","label":"Repository","tooltip":"Repository","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""}]},{"id":"playback","title":"Synchronized playback","entries":[{"id":"playback.open-synchronized-playback","glyphId":"playback","label":"Synchronized playback","tooltip":"Synchronized playback","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"playback.previous-time-point","glyphId":"previous","label":"Previous","tooltip":"Previous","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"playback.play","glyphId":"play","label":"Play","tooltip":"Play","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"playback.pause","glyphId":"pause","label":"Pause","tooltip":"Pause","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"playback.next-time-point","glyphId":"next","label":"Next","tooltip":"Next","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"playback.playback-group","glyphId":"group","label":"Playback group","tooltip":"Playback group","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"playback.choose-synchronized-time","glyphId":"time","label":"Choose synchronized time","tooltip":"Choose synchronized time","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"playback.playback-time","glyphId":"time","label":"Playback time","tooltip":"Playback time","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"playback.current-time","glyphId":"time","label":"Current time: 2027-04-17","tooltip":"Current time: 2027-04-17","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"playback.playback-speed","glyphId":"speed","label":"Playback speed · 1×","tooltip":"Playback speed · 1×","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"playback.live-playback-status","glyphId":"playback","label":"Live playback status","tooltip":"Live playback status","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""}]},{"id":"transport","title":"Planned transport","entries":[{"id":"transport.rewind","glyphId":"rewind","label":"Rewind","tooltip":"Rewind","renderMode":"icon","tone":"standard","status":"planned","confirmation":"none","note":"Continuous or multi-step scan"},{"id":"transport.fast-forward.2","glyphId":"fastForward","label":"Fast forward","tooltip":"Fast forward","renderMode":"icon","tone":"standard","status":"planned","confirmation":"none","note":"Continuous or multi-step scan"},{"id":"transport.jump-to-first-time-point","glyphId":"jumpStart","label":"Jump to start","tooltip":"Jump to start","renderMode":"icon","tone":"standard","status":"planned","confirmation":"none","note":""},{"id":"transport.jump-to-last-time-point","glyphId":"jumpEnd","label":"Jump to end","tooltip":"Jump to end","renderMode":"icon","tone":"standard","status":"planned","confirmation":"none","note":""}]},{"id":"fullscreen","title":"Fullscreen","entries":[{"id":"fullscreen.fullscreen","glyphId":"fullscreen","label":"Fullscreen","tooltip":"Fullscreen","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"fullscreen.selected-panel-1-of-4","glyphId":"selectPanel1","label":"1 of 4 selected","tooltip":"1 of 4 selected","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Green check + announced count"},{"id":"fullscreen.selected-panels-2-of-4","glyphId":"selectPanel2","label":"2 of 4 selected","tooltip":"2 of 4 selected","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Green check + announced count"},{"id":"fullscreen.selected-panels-3-of-4","glyphId":"selectPanel3","label":"3 of 4 selected","tooltip":"3 of 4 selected","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Green check + announced count"},{"id":"fullscreen.selected-panels-4-of-4","glyphId":"selectPanel4","label":"4 of 4 selected","tooltip":"4 of 4 selected","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Maximum reached"},{"id":"fullscreen.enter-multi-fullscreen","glyphId":"enterMulti","label":"Enter multi-fullscreen","tooltip":"Enter multi-fullscreen","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"fullscreen.cancel-multi-selection","glyphId":"close","label":"Cancel","tooltip":"Cancel","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"fullscreen.previous-displayed-chart","glyphId":"reorderPrevious","label":"Previous","tooltip":"Previous","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Reorder, not time step"},{"id":"fullscreen.next-displayed-chart","glyphId":"reorderNext","label":"Next","tooltip":"Next","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Reorder, not time step"},{"id":"fullscreen.close-chart","glyphId":"close","label":"Close","tooltip":"Close","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"fullscreen.close-all-fullscreen-charts","glyphId":"close","label":"Close all","tooltip":"Close all","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"fullscreen.displayed-chart-position","glyphId":"layoutGrid","label":"1 of 4","tooltip":"1 of 4","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":"Numeric badge retained"},{"id":"fullscreen.selection-count","glyphId":"selectPanel","label":"3 charts selected","tooltip":"3 charts selected","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":"Numeric status retained"}]},{"id":"layouts","title":"Layouts","entries":[{"id":"layout.solo","glyphId":"layoutSolo","label":"Solo","tooltip":"Solo","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"layout.side-by-side","glyphId":"layoutSide","label":"Side by side","tooltip":"Side by side","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"layout.over-and-under","glyphId":"layoutOver","label":"Over and under","tooltip":"Over and under","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"layout.top-dominant","glyphId":"layoutTop","label":"Top dominant","tooltip":"Top dominant","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"layout.bottom-dominant","glyphId":"layoutBottom","label":"Bottom dominant","tooltip":"Bottom dominant","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"layout.left-dominant","glyphId":"layoutLeft","label":"Left dominant","tooltip":"Left dominant","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"layout.right-dominant","glyphId":"layoutRight","label":"Right dominant","tooltip":"Right dominant","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"layout.2-2-grid","glyphId":"layoutGrid","label":"2 × 2","tooltip":"2 × 2","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""}]},{"id":"panels","title":"Chart panels","entries":[{"id":"panel.view-source-information","glyphId":"info","label":"Source information","tooltip":"Source information","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Hover-revealed lower-right action"},{"id":"panel.view-source-csv","glyphId":"table","label":"View source CSV","tooltip":"View source CSV","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Opens bare table window"},{"id":"panel.fullscreen","glyphId":"fullscreen","label":"Fullscreen","tooltip":"Fullscreen","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Hover-revealed lower-right action"},{"id":"panel.show-description","glyphId":"description","label":"Description","tooltip":"Description","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":"Toggleable chart content"},{"id":"panel.edit-chart","glyphId":"edit","label":"Edit chart","tooltip":"Edit chart","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"panel.remove-chart","glyphId":"trash","label":"Remove chart","tooltip":"Remove chart","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Destructive color"},{"id":"panel.hold-ctrl-while-scrolling-to-zoom","glyphId":"zoomReset","label":"Hold Ctrl while scrolling","tooltip":"Hold Ctrl while scrolling","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":"Inconspicuous top-left hint"}]},{"id":"wizard","title":"Chart wizard","entries":[{"id":"wizard.close-wizard","glyphId":"close","label":"Close","tooltip":"Close","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"wizard.select-chart-type","glyphId":"chartType","label":"Chart type","tooltip":"Chart type","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"wizard.select-data-source","glyphId":"dataSource","label":"Data source","tooltip":"Data source","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"wizard.configure-data-roles","glyphId":"roles","label":"Data roles","tooltip":"Data roles","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"wizard.style-and-layout","glyphId":"style","label":"Style & layout","tooltip":"Style & layout","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"wizard.create-chart","glyphId":"addChart","label":"Create chart","tooltip":"Create chart","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"wizard.upload-csv","glyphId":"upload","label":"Upload CSV","tooltip":"Upload CSV","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"wizard.enter-data-manually","glyphId":"manual","label":"Enter data manually","tooltip":"Enter data manually","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"wizard.view-source-csv","glyphId":"table","label":"View source CSV","tooltip":"View source CSV","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"wizard.remove-data-source","glyphId":"trash","label":"Remove source","tooltip":"Remove source","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Scope-changing"},{"id":"wizard.add-row","glyphId":"addRow","label":"Add row","tooltip":"Add row","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"wizard.remove-row","glyphId":"removeRow","label":"Remove row","tooltip":"Remove row","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Destructive row action"}]},{"id":"editortabs","title":"Editor tabs","entries":[{"id":"editor.tab.data","glyphId":"dataTab","label":"Data","tooltip":"Data","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.tab.appearance","glyphId":"palette","label":"Appearance","tooltip":"Appearance","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.tab.axes","glyphId":"axes","label":"Axes","tooltip":"Axes","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.tab.map","glyphId":"map","label":"Map","tooltip":"Map","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.tab.timeline","glyphId":"timeline","label":"Timeline","tooltip":"Timeline","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.tab.collection","glyphId":"collection","label":"Collection","tooltip":"Collection","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.tab.interactions","glyphId":"interactions","label":"Interactions","tooltip":"Interactions","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.tab.advanced","glyphId":"advanced","label":"Advanced","tooltip":"Advanced","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""}]},{"id":"editoractions","title":"Editor actions","entries":[{"id":"editor.add-measurement","glyphId":"addChart","label":"Add measurement","tooltip":"Add measurement","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.add-column","glyphId":"addRow","label":"Add column","tooltip":"Add column","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.add-filter","glyphId":"addTab","label":"Add filter","tooltip":"Add filter","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.add-factor","glyphId":"roles","label":"Add factor","tooltip":"Add factor","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.add-color","glyphId":"palette","label":"Add color","tooltip":"Add color","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.remove-measurement","glyphId":"trash","label":"Remove measurement","tooltip":"Remove measurement","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Destructive field action"},{"id":"editor.pick-color-from-dashboard","glyphId":"eyedropper","label":"Eyedropper","tooltip":"Eyedropper","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.use-default-colors","glyphId":"palette","label":"Use default colors","tooltip":"Use default colors","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.apply-to-source-sharing-charts","glyphId":"dataSource","label":"Apply to source-sharing charts","tooltip":"Apply to source-sharing charts","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":"Cross-chart propagation must stay explicit"},{"id":"editor.save-changes","glyphId":"save","label":"Save changes","tooltip":"Save changes","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.reset-changes","glyphId":"reset","label":"Reset changes","tooltip":"Reset changes","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.cancel","glyphId":"close","label":"Cancel","tooltip":"Cancel","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"editor.remove-chart","glyphId":"trash","label":"Remove chart","tooltip":"Remove chart","renderMode":"icon","tone":"danger","status":"live","confirmation":"required","note":"Confirmation required"},{"id":"editor.previous-source-page","glyphId":"previous","label":"Previous","tooltip":"Previous","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.next-source-page","glyphId":"next","label":"Next","tooltip":"Next","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"editor.add-reference-line","glyphId":"referenceLine","label":"Reference line","tooltip":"Reference line","renderMode":"icon","tone":"standard","status":"planned","confirmation":"none","note":"Planned for line graphs"}]},{"id":"collectionmodes","title":"Collection modes","entries":[{"id":"collection.mode.fixed-grid","glyphId":"fixedGrid","label":"Fixed Grid","tooltip":"Fixed Grid","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.mode.scrollable-grid","glyphId":"scrollGrid","label":"Scrollable Grid","tooltip":"Scrollable Grid","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.mode.auto-carousel","glyphId":"carousel","label":"Auto Carousel","tooltip":"Auto Carousel","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.mode.priority-mode","glyphId":"priority","label":"Priority Mode","tooltip":"Priority Mode","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""}]},{"id":"collectioncontrols","title":"Collection controls","entries":[{"id":"collection.pause-carousel","glyphId":"pause","label":"Pause","tooltip":"Pause","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.resume-carousel","glyphId":"play","label":"Resume","tooltip":"Resume","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.previous-page","glyphId":"previous","label":"Previous","tooltip":"Previous","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.next-page","glyphId":"next","label":"Next","tooltip":"Next","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.loop.5","glyphId":"loop","label":"Loop","tooltip":"Loop","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.sort-ascending","glyphId":"sortAsc","label":"Ascending","tooltip":"Ascending","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.sort-descending","glyphId":"sortDesc","label":"Descending","tooltip":"Descending","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.re-rank-now","glyphId":"rerank","label":"Re-rank","tooltip":"Re-rank","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.keep-stable-order","glyphId":"lock","label":"Stable order","tooltip":"Stable order","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.continuous-scroll","glyphId":"continuous","label":"Continuous","tooltip":"Continuous","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.periodic-rotation","glyphId":"periodic","label":"Periodic","tooltip":"Periodic","renderMode":"icon","tone":"standard","status":"live","confirmation":"none","note":""},{"id":"collection.page-status","glyphId":"carousel","label":"Page 1 of 4","tooltip":"Page 1 of 4","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"collection.rotation-speed","glyphId":"speed","label":"Rotation speed","tooltip":"Rotation speed","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"collection.rows","glyphId":"fixedGrid","label":"Rows · 3","tooltip":"Rows · 3","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"collection.columns","glyphId":"fixedGrid","label":"Columns · 3","tooltip":"Columns · 3","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""},{"id":"collection.ranking-method","glyphId":"priority","label":"Ranking method","tooltip":"Ranking method","renderMode":"text","tone":"standard","status":"reference","confirmation":"none","note":""}]},{"id":"chart-types","title":"Chart types","chartTypeIds":["bar","groupedBar","stackedBar","horizontalBar","horizontalStackedBar","line","area","mixed","pie","donut","kpi","gauge","bullet","deltaCard","deltaList","scatter","bubble","heatmap","readinessMatrix","timeline","swimlane","choroplethMap","chronoChoroplethMap","mapScatter","table","image"]}];
const CANONICAL_INTERACTION_IDS = Object.freeze({
  "shell.open-editable-tab.1": "shell.open-editable-tab",
  "shell.reset-image-zoom": "image.zoom-reset",
  "transport.fast-forward.2": "transport.fast-forward",
  "fullscreen.fullscreen": "fullscreen.open",
  "fullscreen.selected-panel-1-of-4": "fullscreen.select.1",
  "fullscreen.selected-panels-2-of-4": "fullscreen.select.2",
  "fullscreen.selected-panels-3-of-4": "fullscreen.select.3",
  "fullscreen.selected-panels-4-of-4": "fullscreen.select.4",
  "panel.fullscreen": "fullscreen.open",
  "panel.show-description": "panel.description",
  "shell.remove-chart": "chart.remove",
  "panel.remove-chart": "chart.remove",
  "editor.remove-chart": "chart.remove",
  "collection.loop.5": "collection.loop",
  "collection.periodic-rotation": "collection.periodic",
});

export const INTERACTION_ALIASES = CANONICAL_INTERACTION_IDS;

const CANONICAL_SURFACE_IDS = Object.freeze({
  editortabs: "editor-tabs",
  editoractions: "editor-actions",
  collectionmodes: "collection-modes",
  collectioncontrols: "collection-controls",
});

const REFERENCE_INTERACTION_IDS = new Set([
  "chart.mixed-axis",
  "chart.pie",
  "chart.chronological-choropleth",
  "chart.table",
]);

// A control becomes live only after its application surface renders this registry.
export const LIVE_INTERACTION_IDS = Object.freeze([]);
const liveInteractionIds = new Set(LIVE_INTERACTION_IDS);

const canonicalInteractionId = (id) => CANONICAL_INTERACTION_IDS[id] ?? id;
const records = {};

for (const surface of inventory) {
  for (const entry of surface.entries ?? []) {
    const id = canonicalInteractionId(entry.id);
    if (records[id]) continue;
    records[id] = Object.freeze({
      ...entry,
      id,
      status: entry.status === "reference" || REFERENCE_INTERACTION_IDS.has(id)
        ? "reference"
        : liveInteractionIds.has(id) ? "live" : "planned",
    });
  }
}

records["fullscreen.open"] = Object.freeze({
  ...records["fullscreen.open"],
  label: "Open chart fullscreen",
});
records["chart.remove"] = Object.freeze({
  ...records["chart.remove"],
  note: "Destructive chart action; confirmation required",
});

export const INTERACTIONS = Object.freeze(records);

export const ATLAS_SURFACES = Object.freeze(inventory.map(({ entries, ...surface }) => (
  Object.freeze({
    ...surface,
    id: CANONICAL_SURFACE_IDS[surface.id] ?? surface.id,
    ...(entries ? {
      interactionIds: Object.freeze(entries.map(({ id }) => canonicalInteractionId(id))),
    } : {}),
  })
)));

export const CHART_TYPE_GLYPHS = Object.freeze({
  bar: "chartBar",
  groupedBar: "chartGrouped",
  stackedBar: "chartStacked",
  horizontalBar: "chartHBar",
  horizontalStackedBar: "chartHStacked",
  line: "chartLine",
  area: "chartArea",
  mixed: "chartMixed",
  pie: "chartPie",
  donut: "chartDonut",
  kpi: "chartKpi",
  gauge: "chartGauge",
  bullet: "chartBullet",
  deltaCard: "chartDelta",
  deltaList: "chartDeltaList",
  scatter: "chartScatter",
  bubble: "chartBubble",
  heatmap: "chartHeatmap",
  readinessMatrix: "chartReadiness",
  timeline: "chartTimeline",
  swimlane: "chartSwimlane",
  choroplethMap: "chartMap",
  chronoChoroplethMap: "chartMapTime",
  mapScatter: "chartMapScatter",
  table: "chartTable",
  image: "chartImage",
});

export const getInteraction = (id) => INTERACTIONS[canonicalInteractionId(id)];

const defaultAccentVariants = Object.freeze({
  base: "#19D3C5",
  onLight: "#0D746D",
  onDark: "#32DED1",
});

const parseHexColor = (value) => {
  const match = String(value ?? "").trim().match(/^#([0-9a-f]{6})$/i);
  return match && {
    r: parseInt(match[1].slice(0, 2), 16),
    g: parseInt(match[1].slice(2, 4), 16),
    b: parseInt(match[1].slice(4, 6), 16),
  };
};

const toHexColor = (color) => `#${[color.r, color.g, color.b]
  .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
  .join("")
  .toUpperCase()}`;

const luminance = (color) => {
  const normalize = (channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(color.r)
    + 0.7152 * normalize(color.g)
    + 0.0722 * normalize(color.b);
};

const contrastRatio = (first, second) => (
  (Math.max(luminance(first), luminance(second)) + 0.05)
  / (Math.min(luminance(first), luminance(second)) + 0.05)
);

const deriveReadableColor = (base, background, target) => {
  for (let step = 2; step <= 20; step += 1) {
    const color = {
      r: base.r + (target.r - base.r) * step / 20,
      g: base.g + (target.g - base.g) * step / 20,
      b: base.b + (target.b - base.b) * step / 20,
    };
    if (contrastRatio(color, background) >= 4.5) return color;
  }
  return target;
};

export function deriveIconAccentVariants(value) {
  const parsed = parseHexColor(value);
  if (!parsed) return { ...defaultAccentVariants };
  const base = toHexColor(parsed);
  if (base === defaultAccentVariants.base) return { ...defaultAccentVariants };
  return {
    base,
    onLight: toHexColor(deriveReadableColor(
      parsed,
      { r: 255, g: 255, b: 255 },
      { r: 0, g: 0, b: 0 },
    )),
    onDark: toHexColor(deriveReadableColor(
      parsed,
      { r: 8, g: 34, b: 74 },
      { r: 255, g: 255, b: 255 },
    )),
  };
}

export function validateIconCatalog() {
  const errors = [];
  const interactionReferences = new Set();
  const chartTypeReferences = new Set();
  const surfaceIds = new Set();
  const approvedTags = new Set(["circle", "path", "rect", "text", "ellipse"]);
  const approvedAttributes = new Set([
    "class",
    "cx",
    "cy",
    "r",
    "d",
    "x",
    "y",
    "width",
    "height",
    "rx",
    "ry",
    "text-anchor",
    "style",
    "opacity",
    "stroke-dasharray",
    "stroke-width",
  ]);

  for (const surface of ATLAS_SURFACES) {
    if (!surface.id || !surface.title) errors.push("Surface is missing an ID or title");
    if (surfaceIds.has(surface.id)) errors.push(`Duplicate surface ID: ${surface.id}`);
    surfaceIds.add(surface.id);
    for (const id of surface.interactionIds ?? []) {
      interactionReferences.add(id);
      if (!INTERACTIONS[id]) errors.push(`Missing interaction reference: ${id}`);
    }
    for (const id of surface.chartTypeIds ?? []) {
      chartTypeReferences.add(id);
      if (!CHART_TYPE_GLYPHS[id]) errors.push(`Missing chart type reference: ${id}`);
    }
  }

  for (const [alias, id] of Object.entries(INTERACTION_ALIASES)) {
    if (!INTERACTIONS[id]) errors.push(`Unknown interaction alias target: ${alias} -> ${id}`);
  }

  for (const [id, interaction] of Object.entries(INTERACTIONS)) {
    if (!interactionReferences.has(id)) errors.push(`Unreferenced interaction: ${id}`);
    if (!ICON_GLYPHS[interaction.glyphId]) errors.push(`Unknown glyph for ${id}`);
    if (!interaction.label || !interaction.tooltip) {
      errors.push(`Missing accessibility copy for ${id}`);
    }
    if (
      !["icon", "text"].includes(interaction.renderMode)
      || !["standard", "danger"].includes(interaction.tone)
      || !["live", "planned", "reference"].includes(interaction.status)
    ) {
      errors.push(`Invalid metadata for ${id}`);
    }
    if (interaction.status === "live" && !liveInteractionIds.has(id)) {
      errors.push(`Interaction falsely marked live: ${id}`);
    }
  }

  for (const [id, glyphId] of Object.entries(CHART_TYPE_GLYPHS)) {
    if (!chartTypeReferences.has(id)) errors.push(`Unreferenced chart type: ${id}`);
    if (!ICON_GLYPHS[glyphId]) errors.push(`Missing chart glyph: ${id}`);
  }

  for (const [id, fragment] of Object.entries(ICON_GLYPHS)) {
    for (const match of fragment.matchAll(/<([a-z]+)([^>]*)>/g)) {
      if (!approvedTags.has(match[1])) errors.push(`Invalid SVG tag in ${id}`);
      for (const attribute of match[2].matchAll(/\s([:\w-]+)=/g)) {
        if (!approvedAttributes.has(attribute[1])) {
          errors.push(`Invalid SVG attribute in ${id}: ${attribute[1]}`);
        }
      }
    }
  }

  return errors;
}
