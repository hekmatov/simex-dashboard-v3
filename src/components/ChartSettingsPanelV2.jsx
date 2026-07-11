import React from "react";
import ColorField from "./ColorField.jsx";
import { CHART_OPTION_SECTIONS, CHART_SETTING_TABS, getSectionsForPanelType } from "../lib/chartOptionRegistry.js";

const CHART_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "horizontalBar", label: "Horizontal bar" },
  { value: "horizontalStackedBar", label: "Horizontal stacked bar" },
  { value: "groupedBar", label: "Grouped bar" },
  { value: "stackedBar", label: "Stacked bar" },
  { value: "mixed", label: "Mixed bar/line" },
  { value: "gauge", label: "Gauge" },
  { value: "mapScatter", label: "Map" },
  { value: "choroplethMap", label: "Choropleth map" },
  { value: "chronoChoroplethMap", label: "Animated choropleth" },
  { value: "image", label: "Image" },
  { value: "table", label: "Table" },
  { value: "deltaList", label: "Delta list" },
  { value: "kpi", label: "KPI cards" },
];

const COLOR_SCHEMES = [
  { value: "manual", label: "Manual series colors" },
  { value: "pdpc", label: "PDPC mixed" },
  { value: "redGreen5", label: "Likert red to green" },
  { value: "likertInfographic5", label: "Likert infographic" },
  { value: "caseIntensity", label: "Case intensity" },
  { value: "blueYellow5", label: "Likert blue to yellow" },
  { value: "cool", label: "Cool blues/teals" },
  { value: "warm", label: "Warm alert" },
];

const LEGEND_POSITIONS = [
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "insideTopLeft", label: "Inside top-left" },
  { value: "insideTopRight", label: "Inside top-right" },
  { value: "insideBottomLeft", label: "Inside bottom-left" },
  { value: "insideBottomRight", label: "Inside bottom-right" },
];

const LINE_STYLE_OPTIONS = ["solid", "dashed", "dotted", "shadow"];
const MARKER_STYLE_OPTIONS = ["none", "circle", "emptyCircle", "rect", "diamond", "triangle"];
const AXIS_TYPES = new Set(["bar", "line", "area", "horizontalBar", "horizontalStackedBar", "groupedBar", "stackedBar", "mixed"]);
const BAR_TYPES = new Set(["bar", "horizontalBar", "horizontalStackedBar", "groupedBar", "stackedBar"]);
const SERIES_TYPES = new Set([...AXIS_TYPES]);
const ECHART_TYPES = new Set([...AXIS_TYPES, "gauge", "mapScatter", "choroplethMap", "chronoChoroplethMap"]);
const FONT_CONTROLS = {
  title: { label: "Chart title", defaultValue: 17 },
  axis: { label: "Axis labels", defaultValue: 12 },
  legend: { label: "Legend / scale labels", defaultValue: 12 },
  gaugeValue: { label: "Gauge value", defaultValue: 28 },
  gaugeLabel: { label: "Gauge label", defaultValue: 13 },
  gaugeAxis: { label: "Gauge axis labels", defaultValue: 12 },
  mapLabel: { label: "Map hover labels", defaultValue: 12 },
};
export default function ChartSettingsPanelV2({ panel, dataSources, dataColumns, dataRows = [], globalPanelColors, onChange, onSave, onCancel, onRemove }) {
  const [activeTab, setActiveTab] = React.useState("data");
  const [openSections, setOpenSections] = React.useState({});
  const sectionsByTab = getSectionsForPanelType(panel.type);
  const sectionIds = sectionsByTab[activeTab] ?? [];
  const dateColumn = inferDateColumn(dataColumns, panel);
  const dateOptions = collectUniqueValues(dataRows, dateColumn).sort(compareDateishValues);
  const categoryOptions = AXIS_TYPES.has(panel.type) && !axisIsDate(panel) ? collectUniqueValues(dataRows, panel.x) : [];
  const dataSourcePath = panel.dataSource ? dataSources?.[panel.dataSource] : "";

  React.useEffect(() => {
    if (!sectionsByTab[activeTab]) setActiveTab("data");
  }, [activeTab, panel.type, sectionsByTab]);

  function patch(updates) {
    onChange(updates);
  }

  function patchSeries(index, updates) {
    patch({ series: (panel.series ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item) });
  }

  function addSeries() {
    patch({ series: [...(panel.series ?? []), defaultSeries(panel, dataColumns, panel.series?.length ?? 0)] });
  }

  function duplicateSeries(index) {
    const source = panel.series?.[index];
    if (!source) return;
    const copy = { ...source, name: `${source.name ?? "Series"} copy` };
    patch({ series: [...panel.series.slice(0, index + 1), copy, ...panel.series.slice(index + 1)] });
  }

  function removeSeries(index) {
    patch({ series: (panel.series ?? []).filter((_, itemIndex) => itemIndex !== index) });
  }

  function patchSeriesFrom(updates) {
    patch({ seriesFrom: { ...(panel.seriesFrom ?? {}), ...updates } });
  }

  function patchFields(updates) {
    patch({ fields: { ...(panel.fields ?? {}), ...updates } });
  }

  function patchReferenceLine(index, updates) {
    patch({ referenceLines: (panel.referenceLines ?? []).map((line, lineIndex) => lineIndex === index ? { ...line, ...updates } : line) });
  }

  function addReferenceLine() {
    patch({ referenceLines: [...(panel.referenceLines ?? []), { y: 0, label: "Reference", color: "#08224A", lineStyle: "dashed" }] });
  }

  function removeReferenceLine(index) {
    patch({ referenceLines: (panel.referenceLines ?? []).filter((_, lineIndex) => lineIndex !== index) });
  }

  function updateFontSize(key, delta, defaultValue) {
    const current = Number(panel.fontSizes?.[key] ?? defaultValue);
    patch({ fontSizes: { ...(panel.fontSizes ?? {}), [key]: Math.min(48, Math.max(8, current + delta)) } });
  }
  function renderSection(sectionId) {
    switch (sectionId) {
      case "source": return <SourceSection panel={panel} dataSources={dataSources} dataSourcePath={dataSourcePath} dataRows={dataRows} patch={patch} />;
      case "dateSelection": return <DateSection column={dateColumn} options={dateOptions} selection={panel.dateSelection} patch={patch} />;
      case "singleDateSelection": return <SingleDateSection column={dateColumn} options={dateOptions} selection={panel.dateSelection} patch={patch} />;
      case "categorySelection": return <CategorySection column={panel.x} options={categoryOptions} selection={panel.categorySelection} patch={patch} />;
      case "categoryOrder": return <CategoryOrderSection panel={panel} dataColumns={dataColumns} patch={patch} />;
      case "seriesList": return <SeriesSection panel={panel} dataColumns={dataColumns} patchSeries={patchSeries} addSeries={addSeries} duplicateSeries={duplicateSeries} removeSeries={removeSeries} />;
      case "seriesFrom": return <SeriesFromSection panel={panel} dataColumns={dataColumns} patchSeriesFrom={patchSeriesFrom} />;
      case "barAppearance": return <BarAppearanceSection panel={panel} patch={patch} />;
      case "axisFields": return <AxisFieldsSection panel={panel} dataColumns={dataColumns} patch={patch} />;
      case "axisScale": return <AxisScaleSection panel={panel} patch={patch} />;
      case "secondaryAxis": return hasSecondaryAxis(panel) ? <SecondaryAxisSection panel={panel} patch={patch} /> : <p className="settings-note">Secondary y-axis options appear after a series is assigned to the secondary y-axis.</p>;
      case "referenceLines": return <ReferenceLinesSection panel={panel} patchReferenceLine={patchReferenceLine} addReferenceLine={addReferenceLine} removeReferenceLine={removeReferenceLine} />;
      case "titleLayout": return <TitleLayoutSection panel={panel} patch={patch} />;
      case "legend": return <LegendSection panel={panel} patch={patch} />;
      case "palette": return <PaletteSection panel={panel} patch={patch} />;
      case "textSize": return <TextSizeSection panel={panel} updateFontSize={updateFontSize} />;
      case "panelLayout": return <PanelLayoutSection panel={panel} globalPanelColors={globalPanelColors} patch={patch} />;
      case "tooltip": return <TooltipSection panel={panel} patch={patch} />;
      case "gaugeData": return <GaugeDataSection panel={panel} dataColumns={dataColumns} patch={patch} />;
      case "gaugeRedZone": return <GaugeRedZoneSection panel={panel} patch={patch} />;
      case "mapData": return <MapSection panel={panel} dataColumns={dataColumns} patch={patch} />;
      case "choroplethData": return <ChoroplethSection panel={panel} dataSources={dataSources} dataColumns={dataColumns} patch={patch} />;
      case "imageSource": return <ImageSection panel={panel} patch={patch} />;
      case "tableFields": return <TableSection panel={panel} patch={patch} />;
      case "deltaFields": return <DeltaSection panel={panel} dataColumns={dataColumns} patch={patch} patchFields={patchFields} />;
      case "kpiFields": return <p className="settings-note">KPI card fields are read from the configured data source columns.</p>;
      default: return null;
    }
  }

  return (
    <aside className="settings-panel" aria-label="Panel settings">
      <div className="settings-panel-header">
        <div>
          <p className="eyebrow">Panel settings</p>
          <h2>{panel.title}</h2>
        </div>
        <div className="settings-panel-actions">
          <button type="button" onClick={onSave}>Save</button>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Chart setting groups">
        {CHART_SETTING_TABS.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : "secondary"} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-tab-panel">
        {sectionIds.length === 0 && <p className="settings-note">No settings are available in this tab for this panel type.</p>}
        {sectionIds.map((sectionId) => {
          const section = CHART_OPTION_SECTIONS[sectionId];
          if (!section) return null;
          const open = openSections[sectionId] ?? true;
          return (
            <section className="settings-section settings-collapsible-section" key={sectionId}>
              <button type="button" className="settings-section-toggle" onClick={() => setOpenSections((current) => ({ ...current, [sectionId]: !open }))} aria-expanded={open}>
                <span>{section.title}</span>
                <span aria-hidden="true">{open ? "-" : "+"}</span>
              </button>
              {open && <div className="settings-section-body">{renderSection(sectionId)}</div>}
            </section>
          );
        })}
      </div>

      <section className="settings-section settings-danger-zone">
        <h3>Panel</h3>
        <button type="button" className="danger" onClick={() => { if (window.confirm("Remove this panel?")) onRemove(); }}>
          Remove panel
        </button>
      </section>
    </aside>
  );
}

function SourceSection({ panel, dataSources, dataSourcePath, dataRows, patch }) {
  function changePanelType(nextType) {
    patch(defaultsForPanelType(nextType, panel, dataSources));
  }

  return (
    <>
      <label>Title<input value={panel.title ?? ""} onChange={(event) => patch({ title: event.target.value })} /></label>
      <label>
        Data source
        <select value={panel.dataSource ?? ""} onChange={(event) => patch({ dataSource: event.target.value, dateSelection: undefined, categorySelection: undefined })}>
          <option value="">No data source</option>
          {Object.entries(dataSources ?? {}).map(([sourceId, source]) => <option key={sourceId} value={sourceId}>{dataSourceLabel(sourceId, source)}</option>)}
        </select>
      </label>
      <div className="settings-button-row">
        <button type="button" className="secondary" disabled={!dataSourcePath} onClick={() => openDataSourceTable(panel.title, dataSourceDisplayPath(dataSourcePath), dataRows)}>View source CSV</button>
      </div>
      <label>
        Panel type
        <select value={panel.type} onChange={(event) => changePanelType(event.target.value)}>
          {CHART_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </>
  );
}

function DateSection({ column, options, selection, patch }) {
  if (!column || options.length === 0) return <p className="settings-note">No date-like column was found for this data source.</p>;
  if (options.length <= 5) {
    const selected = new Set(selectedDateValues(selection, column, options).map(String));
    return <Checklist title="Date range" subtitle={column} options={options} selected={selected} onChange={(values) => patch({ dateSelection: { column, mode: "list", values } })} />;
  }
  const range = selectedDateRange(selection, column, options);
  return (
    <div className="date-checklist-control date-range-control">
      <div className="date-checklist-header"><span className="settings-field-label">Date range</span><small>{column} · {options.length} dates</small></div>
      <div className="date-range-fields">
        <label>From<input type="date" value={range.start} min={options[0]} max={options[options.length - 1]} onChange={(event) => patch({ dateSelection: { column, mode: "range", start: event.target.value, end: range.end } })} /></label>
        <label>To<input type="date" value={range.end} min={options[0]} max={options[options.length - 1]} onChange={(event) => patch({ dateSelection: { column, mode: "range", start: range.start, end: event.target.value } })} /></label>
      </div>
      <button type="button" className="secondary" onClick={() => patch({ dateSelection: { column, mode: "range", start: options[0], end: options[options.length - 1] } })}>Full range</button>
    </div>
  );
}

function SingleDateSection({ column, options, selection, patch }) {
  if (!column || options.length === 0) return <p className="settings-note">No date-like column was found for this data source.</p>;
  const selected = selection?.column === column && selection.mode === "single" ? selection.value : options[options.length - 1];
  return (
    <div className="date-checklist-control date-range-control">
      <div className="date-checklist-header"><span className="settings-field-label">Date</span><small>{column} · {options.length} dates</small></div>
      <label>
        Display date
        <input
          type="date"
          value={selected ?? ""}
          min={options[0]}
          max={options[options.length - 1]}
          onChange={(event) => patch({ dateSelection: { column, mode: "single", value: nearestAvailableDate(event.target.value, options) } })}
        />
      </label>
      <label>
        Available dates
        <select value={selected ?? ""} onChange={(event) => patch({ dateSelection: { column, mode: "single", value: event.target.value } })}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    </div>
  );
}

function ImageSection({ panel, patch }) {
  function uploadImage(file) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ imageSrc: reader.result, imageName: file.name });
    reader.readAsDataURL(file);
  }

  return (
    <>
      <label>Title<input value={panel.title ?? ""} onChange={(event) => patch({ title: event.target.value })} /></label>
      <label>
        Image file
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0])} />
      </label>
      {panel.imageName && <p className="settings-note">Current image: {panel.imageName}</p>}
      <label>Image fit<select value={panel.imageFit ?? "contain"} onChange={(event) => patch({ imageFit: event.target.value })}><option value="contain">Fit full image</option><option value="cover">Crop to fill panel</option><option value="fill">Stretch to fill</option></select></label>
      <label>Zoom<input type="range" min="1" max="3" step="0.05" value={panel.imageZoom ?? 1} onChange={(event) => patch({ imageZoom: Number(event.target.value) })} /></label>
      <label>Horizontal position<input type="range" min="0" max="100" step="1" value={panel.imagePositionX ?? 50} onChange={(event) => patch({ imagePositionX: Number(event.target.value) })} /></label>
      <label>Vertical position<input type="range" min="0" max="100" step="1" value={panel.imagePositionY ?? 50} onChange={(event) => patch({ imagePositionY: Number(event.target.value) })} /></label>
      <label>Alt text<input value={panel.imageAlt ?? ""} onChange={(event) => patch({ imageAlt: event.target.value })} /></label>
    </>
  );
}

function CategorySection({ column, options, selection, patch }) {
  if (!column || options.length === 0) return <p className="settings-note">Choose a categorical x-axis column to enable category filtering.</p>;
  const selected = new Set(selectedCategoryValues(selection, column, options).map(String));
  return <Checklist title="Categories" subtitle={column} options={options} selected={selected} onChange={(values) => patch({ categorySelection: { column, values } })} />;
}

function Checklist({ title, subtitle, options, selected, onChange }) {
  function commit(nextSelected) {
    onChange(options.filter((option) => nextSelected.has(String(option))));
  }
  return (
    <div className="date-checklist-control">
      <div className="date-checklist-header"><span className="settings-field-label">{title}</span><small>{subtitle}</small></div>
      <div className="date-checklist-actions">
        <button type="button" className="secondary" onClick={() => onChange(options)}>Select all</button>
        <button type="button" className="secondary" onClick={() => onChange([])}>Deselect all</button>
      </div>
      <div className="date-checklist" role="group" aria-label={title}>
        {options.map((option) => (
          <label className="date-checkbox-row" key={option}>
            <input type="checkbox" checked={selected.has(String(option))} onChange={(event) => {
              const next = new Set(selected);
              if (event.target.checked) next.add(String(option)); else next.delete(String(option));
              commit(next);
            }} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CategoryOrderSection({ panel, dataColumns, patch }) {
  if (!AXIS_TYPES.has(panel.type) || axisIsDate(panel)) return <p className="settings-note">Category ordering is available for categorical axes.</p>;
  return (
    <>
      <label>Category order<select value={panel.categoryOrder ?? "csv"} onChange={(event) => patch({ categoryOrder: event.target.value })}><option value="csv">Order of appearance in CSV</option><option value="alphabetical">Alphabetical</option><option value="valueColumn">By selected value column</option></select></label>
      {panel.categoryOrder === "valueColumn" && <>
        <label>Sort value column<select value={panel.categorySortColumn ?? ""} onChange={(event) => patch({ categorySortColumn: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
        <label>Sort direction<select value={panel.categorySortDirection ?? "desc"} onChange={(event) => patch({ categorySortDirection: event.target.value })}><option value="desc">Highest first</option><option value="asc">Lowest first</option></select></label>
      </>}
    </>
  );
}

function SeriesSection({ panel, dataColumns, patchSeries, addSeries, duplicateSeries, removeSeries }) {
  const series = panel.series ?? [];
  if (!SERIES_TYPES.has(panel.type)) return <p className="settings-note">This panel type does not use editable ECharts series.</p>;
  return (
    <div className="settings-series-list">
      <button type="button" onClick={addSeries}>Add series</button>
      {series.length === 0 && <p className="settings-note">No series yet. Add a series to connect this chart to a value column.</p>}
      {series.map((item, index) => <SeriesCard key={`${panel.id}-${item.y}-${index}`} panel={panel} series={item} index={index} count={series.length} dataColumns={dataColumns} patchSeries={patchSeries} duplicateSeries={duplicateSeries} removeSeries={removeSeries} />)}
    </div>
  );
}

function SeriesCard({ panel, series, index, count, dataColumns, patchSeries, duplicateSeries, removeSeries }) {
  const resolvedType = series.type ?? (panel.type === "mixed" ? "line" : seriesTypeForPanel(panel.type));
  const lineLike = isLineLike(panel.type, resolvedType);
  const barLike = resolvedType === "bar" || BAR_TYPES.has(panel.type);
  return (
    <div className="settings-series">
      <div className="settings-series-header"><strong>{series.name || `Series ${index + 1}`}</strong><div><button type="button" className="secondary" onClick={() => duplicateSeries(index)}>Duplicate</button><button type="button" className="secondary" disabled={count <= 1} onClick={() => removeSeries(index)}>Remove</button></div></div>
      {panel.type === "mixed" && <label>Series type<select value={resolvedType} onChange={(event) => patchSeries(index, { type: event.target.value })}><option value="bar">Bar</option><option value="line">Line</option></select></label>}
      <label>Name<input value={series.name ?? ""} onChange={(event) => patchSeries(index, { name: event.target.value })} /></label>
      <label>Value column<select value={series.y ?? ""} onChange={(event) => patchSeries(index, { y: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Axis<select value={series.yAxisIndex ?? 0} onChange={(event) => patchSeries(index, { yAxisIndex: Number(event.target.value) })}><option value={0}>Primary y-axis</option><option value={1}>Secondary y-axis</option></select></label>
      <ColorField label="Color" value={series.color ?? "#043BCB"} onChange={(color) => patchSeries(index, { color })} />
      <label>Opacity<input type="number" min="0.1" max="1" step="0.05" value={series.opacity ?? 1} onChange={(event) => patchSeries(index, { opacity: Number(event.target.value) })} /></label>
      {lineLike && <LineSeriesOptions series={series} index={index} patchSeries={patchSeries} />}
      {barLike && <BarSeriesOptions series={series} index={index} patchSeries={patchSeries} />}
    </div>
  );
}

function LineSeriesOptions({ series, index, patchSeries }) {
  return <>
    <label>Line width<input type="number" min="1" max="16" value={series.lineWidth ?? 3} onChange={(event) => patchSeries(index, { lineWidth: Number(event.target.value) })} /></label>
    <label>Line style<select value={series.lineStyle ?? "solid"} onChange={(event) => patchSeries(index, { lineStyle: event.target.value })}>{LINE_STYLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
    {series.lineStyle === "shadow" && <ColorField label="Shadow color" value={series.shadowColor ?? "#4F6F8C"} onChange={(color) => patchSeries(index, { shadowColor: color })} />}
    <label className="checkbox-row"><input type="checkbox" checked={series.smooth ?? false} onChange={(event) => patchSeries(index, { smooth: event.target.checked })} />Smooth line</label>
    <label>Marker<select value={series.markerStyle ?? "none"} onChange={(event) => patchSeries(index, { markerStyle: event.target.value })}>{MARKER_STYLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
    <label>Marker size<input type="number" min="2" max="24" value={series.markerSize ?? 6} onChange={(event) => patchSeries(index, { markerSize: Number(event.target.value) })} /></label>
  </>;
}

function BarSeriesOptions({ series, index, patchSeries }) {
  return <label>Stack group<input value={series.stack ?? ""} onChange={(event) => patchSeries(index, { stack: event.target.value || undefined })} /></label>;
}

function SeriesFromSection({ panel, dataColumns, patchSeriesFrom }) {
  if (!["groupedBar", "stackedBar", "horizontalStackedBar", "line", "area"].includes(panel.type)) {
    return <p className="settings-note">Long-form series mapping is most useful for grouped, stacked, line, and area charts.</p>;
  }
  return (
    <>
      <label>Series name column<select value={panel.seriesFrom?.nameField ?? ""} onChange={(event) => patchSeriesFrom({ nameField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Series value column<select value={panel.seriesFrom?.valueField ?? ""} onChange={(event) => patchSeriesFrom({ valueField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <p className="settings-note">Use this when one CSV column contains the group name and another contains the numeric value.</p>
    </>
  );
}

function BarAppearanceSection({ panel, patch }) {
  const horizontal = panel.type === "horizontalBar" || panel.type === "horizontalStackedBar";
  return (
    <>
      <label>{horizontal ? "Bar height" : "Bar width"}<input value={panel.barWidth ?? ""} placeholder="auto, 18, 60%" onChange={(event) => patch({ barWidth: event.target.value })} /></label>
      <label>Bar gap<input value={panel.barGap ?? ""} placeholder="30%" onChange={(event) => patch({ barGap: event.target.value })} /></label>
      <label>Category gap<input value={panel.barCategoryGap ?? ""} placeholder="20%" onChange={(event) => patch({ barCategoryGap: event.target.value })} /></label>
      <label className="checkbox-row"><input type="checkbox" checked={panel.showValueLabels ?? false} onChange={(event) => patch({ showValueLabels: event.target.checked })} />Show value labels</label>
      <label>Label position<select value={panel.valueLabelPosition ?? "top"} onChange={(event) => patch({ valueLabelPosition: event.target.value })}><option value="top">Top</option><option value="inside">Inside</option><option value="right">Right</option><option value="left">Left</option></select></label>
      <label>Label font size<input type="number" min="8" max="30" value={panel.valueLabelFontSize ?? 11} onChange={(event) => patch({ valueLabelFontSize: Number(event.target.value) })} /></label>
    </>
  );
}

function AxisFieldsSection({ panel, dataColumns, patch }) {
  if (!AXIS_TYPES.has(panel.type)) return <p className="settings-note">This panel type does not use x/y axes.</p>;
  return (
    <>
      <label>X / category field<select value={panel.x ?? ""} onChange={(event) => patch({ x: event.target.value, dateSelection: undefined, categorySelection: undefined })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>X-axis type<select value={panel.xAxisMode ?? "auto"} onChange={(event) => patch({ xAxisMode: event.target.value })}><option value="auto">Auto</option><option value="date">Date</option><option value="category">Category</option></select></label>
      <label>X-axis title<input value={panel.xAxisTitle ?? ""} onChange={(event) => patch({ xAxisTitle: event.target.value })} /></label>
      <label>Y-axis title<input value={panel.yAxisTitle ?? ""} onChange={(event) => patch({ yAxisTitle: event.target.value })} /></label>
    </>
  );
}

function AxisScaleSection({ panel, patch }) {
  if (!AXIS_TYPES.has(panel.type)) return <p className="settings-note">Scale controls are available for axis-based charts.</p>;
  return (
    <>
      <label>Y-axis scale<select value={panel.yScale ?? "zero"} onChange={(event) => patch({ yScale: event.target.value })}><option value="zero">Start at zero</option><option value="auto">Auto</option></select></label>
      <label>Y min<input type="number" value={panel.yMin ?? ""} onChange={(event) => patch({ yMin: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
      <label>Y max<input type="number" value={panel.yMax ?? ""} onChange={(event) => patch({ yMax: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
      <label>X label rotation<input type="number" min="-90" max="90" value={panel.axisLabelRotation ?? 0} onChange={(event) => patch({ axisLabelRotation: Number(event.target.value) })} /></label>
      <label className="checkbox-row"><input type="checkbox" checked={panel.showGrid ?? true} onChange={(event) => patch({ showGrid: event.target.checked })} />Show grid lines</label>
      <label>Number format<select value={panel.numberFormat ?? "compact"} onChange={(event) => patch({ numberFormat: event.target.value })}><option value="compact">Compact</option><option value="full">Full number</option><option value="percent">Percent</option></select></label>
    </>
  );
}

function SecondaryAxisSection({ panel, patch }) {
  return (
    <>
      <label>Secondary y-axis title<input value={panel.secondaryAxisTitle ?? ""} onChange={(event) => patch({ secondaryAxisTitle: event.target.value })} /></label>
      <label>Secondary min<input type="number" value={panel.secondaryAxisMin ?? ""} onChange={(event) => patch({ secondaryAxisMin: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
      <label>Secondary max<input type="number" value={panel.secondaryAxisMax ?? ""} onChange={(event) => patch({ secondaryAxisMax: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
      <p className="settings-note">Assign a series to the secondary y-axis in the Series tab.</p>
    </>
  );
}

function ReferenceLinesSection({ panel, patchReferenceLine, addReferenceLine, removeReferenceLine }) {
  const hasSecondaryAxis = (panel.series ?? []).some((item) => Number(item.yAxisIndex ?? 0) === 1);
  return (
    <div className="settings-series-list">
      <button type="button" onClick={addReferenceLine}>Add reference line</button>
      {(panel.referenceLines ?? []).map((line, index) => (
        <div className="settings-series" key={`${panel.id}-reference-line-${index}`}>
          <div className="settings-series-header"><strong>{line.label || `Reference ${index + 1}`}</strong><button type="button" className="secondary" onClick={() => removeReferenceLine(index)}>Remove</button></div>
          <label>Label<input value={line.label ?? ""} onChange={(event) => patchReferenceLine(index, { label: event.target.value })} /></label>
          <label>Value<input type="number" value={line.y ?? 0} onChange={(event) => patchReferenceLine(index, { y: Number(event.target.value) })} /></label>
          <ColorField label="Color" value={line.color ?? "#08224A"} fallback="#08224A" onChange={(color) => patchReferenceLine(index, { color })} />
          <label>Style<select value={line.lineStyle ?? "dashed"} onChange={(event) => patchReferenceLine(index, { lineStyle: event.target.value })}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
          {hasSecondaryAxis && (
            <label>Y-axis<select value={line.yAxisIndex ?? 0} onChange={(event) => patchReferenceLine(index, { yAxisIndex: Number(event.target.value) })}><option value={0}>Primary</option><option value={1}>Secondary</option></select></label>
          )}
          <label>Label position<select value={line.labelPosition ?? "end"} onChange={(event) => patchReferenceLine(index, { labelPosition: event.target.value })}><option value="start">Start</option><option value="middle">Middle</option><option value="end">End</option><option value="insideStartTop">Inside start top</option><option value="insideEndTop">Inside end top</option><option value="insideEndBottom">Inside end bottom</option></select></label>
        </div>
      ))}
    </div>
  );
}

function TitleLayoutSection({ panel, patch }) {
  return (
    <>
      <label>Chart title<input value={panel.title ?? ""} onChange={(event) => patch({ title: event.target.value })} /></label>
      <label>Title alignment<select value={panel.titleAlign ?? "left"} onChange={(event) => patch({ titleAlign: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <label>Source hover text<textarea rows="4" value={panel.infoSource ?? ""} onChange={(event) => patch({ infoSource: event.target.value })} /></label>
    </>
  );
}

function LegendSection({ panel, patch }) {
  if (!supportsLegend(panel.type)) return <p className="settings-note">This panel type does not use a chart legend.</p>;
  return (
    <>
      <label className="checkbox-row"><input type="checkbox" checked={panel.legend ?? true} onChange={(event) => patch({ legend: event.target.checked })} />Show legend</label>
      <label>Legend position<select value={panel.legendPosition ?? "top"} onChange={(event) => patch({ legendPosition: event.target.value })}>{LEGEND_POSITIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Symbol size<input type="number" min="6" max="36" value={panel.legendSize ?? 14} onChange={(event) => patch({ legendSize: Number(event.target.value) })} /></label>
      <label>Legend font size<input type="number" min="8" max="28" value={panel.fontSizes?.legend ?? 12} onChange={(event) => patch({ fontSizes: { ...(panel.fontSizes ?? {}), legend: Number(event.target.value) } })} /></label>
    </>
  );
}

function PaletteSection({ panel, patch }) {
  if (!supportsColorScheme(panel.type)) return <p className="settings-note">Palette controls are not used for this panel type.</p>;
  return (
    <>
      <label>Color scheme<select value={panel.colorScheme ?? "manual"} onChange={(event) => patch({ colorScheme: event.target.value })}>{COLOR_SCHEMES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="checkbox-row"><input type="checkbox" checked={panel.reverseColorScheme ?? false} onChange={(event) => patch({ reverseColorScheme: event.target.checked })} />Reverse palette</label>
      <ColorSchemePreview scheme={panel.colorScheme ?? "manual"} reverse={panel.reverseColorScheme ?? false} />
    </>
  );
}

function TextSizeSection({ panel, updateFontSize }) {
  const controls = fontControlsForPanel(panel.type);
  return <div className="font-control-list">{controls.map((key) => <FontSizeControl key={key} settingKey={key} panel={panel} updateFontSize={updateFontSize} />)}</div>;
}

function PanelLayoutSection({ panel, globalPanelColors, patch }) {
  const colors = {
    panelBackgroundColor: globalPanelColors?.panelBackgroundColor ?? "#f5f8fb",
    panelBorderColor: globalPanelColors?.panelBorderColor ?? "#d8e2ec",
    chartAreaColor: globalPanelColors?.chartAreaColor ?? "#eaf1f6",
    chartAreaBorderColor: globalPanelColors?.chartAreaBorderColor ?? "#d8e2ec",
  };
  const useGlobalColors = panel.useGlobalPanelColors !== false;
  return (
    <>
      <label>Panel size<select value={normalizePanelSize(panel.size)} onChange={(event) => patch({ size: event.target.value })}><option value="half">Half - 0.5 x 1</option><option value="normal">Normal - 1 x 1</option><option value="wide">Wide - 2 x 1</option><option value="tall">Tall - 1 x 2</option><option value="large">Large - 2 x 2</option></select></label>
      <label className="checkbox-row"><input type="checkbox" checked={panel.fullscreenScaling ?? true} onChange={(event) => patch({ fullscreenScaling: event.target.checked })} />Scale fonts in fullscreen</label>
      <label className="checkbox-row"><input type="checkbox" checked={useGlobalColors} onChange={(event) => patch({ useGlobalPanelColors: event.target.checked })} />Use global panel colors</label>
      {useGlobalColors ? (
        <div className="global-color-preview">
          <span style={{ backgroundColor: colors.panelBackgroundColor, borderColor: colors.panelBorderColor }}>Panel</span>
          <span style={{ backgroundColor: colors.chartAreaColor, borderColor: colors.chartAreaBorderColor }}>Chart</span>
        </div>
      ) : (
        <>
          <ColorField label="Panel background" value={panel.panelBackgroundColor ?? "#f5f8fb"} fallback="#f5f8fb" onChange={(color) => patch({ panelBackgroundColor: color })} />
          <ColorField label="Panel border" value={panel.panelBorderColor ?? "#d8e2ec"} fallback="#d8e2ec" onChange={(color) => patch({ panelBorderColor: color })} />
          <ColorField label="Chart area background" value={panel.chartAreaColor ?? "#eaf1f6"} fallback="#eaf1f6" onChange={(color) => patch({ chartAreaColor: color })} />
          <ColorField label="Chart area border" value={panel.chartAreaBorderColor ?? "#d8e2ec"} fallback="#d8e2ec" onChange={(color) => patch({ chartAreaBorderColor: color })} />
        </>
      )}
      <div className="settings-button-row">
        <button type="button" className="secondary" onClick={() => patch({ useGlobalPanelColors: false, panelBackgroundColor: undefined, panelBorderColor: undefined, chartAreaColor: undefined, chartAreaBorderColor: undefined })}>Reset custom colors</button>
      </div>
    </>
  );
}

function TooltipSection({ panel, patch }) {
  return <label>Tooltip mode<select value={panel.tooltipTrigger ?? "axis"} onChange={(event) => patch({ tooltipTrigger: event.target.value })}><option value="axis">Compare along axis</option><option value="item">Single item</option></select></label>;
}

function GaugeDataSection({ panel, dataColumns, patch }) {
  return (
    <>
      <label>Value field<select value={panel.valueField ?? ""} onChange={(event) => patch({ valueField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Label field<select value={panel.labelField ?? ""} onChange={(event) => patch({ labelField: event.target.value || undefined })}><option value="">No label - number only</option><ColumnOptions columns={dataColumns} /></select></label>
      <label>Unit<input value={panel.unit ?? "%"} onChange={(event) => patch({ unit: event.target.value })} /></label>
      <label>Maximum value<input type="number" min="1" value={panel.max ?? 100} onChange={(event) => patch({ max: Number(event.target.value) })} /></label>
    </>
  );
}

function GaugeRedZoneSection({ panel, patch }) {
  return (
    <>
      <label>Low zone end<input type="number" min="0.05" max="0.95" step="0.05" value={panel.gaugeLowStop ?? 0.3} onChange={(event) => patch({ gaugeLowStop: Number(event.target.value) })} /></label>
      <label>Mid zone end<input type="number" min="0.05" max="0.95" step="0.05" value={panel.gaugeMidStop ?? 0.7} onChange={(event) => patch({ gaugeMidStop: Number(event.target.value) })} /></label>
      <ColorField label="Low color" value={panel.gaugeLowColor ?? "#67e0e3"} fallback="#67e0e3" onChange={(color) => patch({ gaugeLowColor: color })} />
      <ColorField label="Mid color" value={panel.gaugeMidColor ?? "#37a2da"} fallback="#37a2da" onChange={(color) => patch({ gaugeMidColor: color })} />
      <ColorField label="High color" value={panel.gaugeHighColor ?? "#fd666d"} fallback="#fd666d" onChange={(color) => patch({ gaugeHighColor: color })} />
      <label>Arc width<input type="number" min="12" max="48" value={panel.gaugeArcWidth ?? 30} onChange={(event) => patch({ gaugeArcWidth: Number(event.target.value) })} /></label>
    </>
  );
}

function MapSection({ panel, dataColumns, patch }) {
  return (
    <>
      <label>Name field<select value={panel.nameField ?? ""} onChange={(event) => patch({ nameField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Latitude field<select value={panel.latField ?? ""} onChange={(event) => patch({ latField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Longitude field<select value={panel.lonField ?? ""} onChange={(event) => patch({ lonField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Value field<select value={panel.valueField ?? ""} onChange={(event) => patch({ valueField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Point scale<input type="number" min="0.2" max="4" step="0.1" value={panel.pointScale ?? 1} onChange={(event) => patch({ pointScale: Number(event.target.value) })} /></label>
    </>
  );
}

function ChoroplethSection({ panel, dataSources, dataColumns, patch }) {
  return (
    <>
      <label>
        GeoJSON source
        <select value={panel.geoSource ?? ""} onChange={(event) => patch({ geoSource: event.target.value })}>
          <option value="">No GeoJSON source</option>
          {Object.entries(dataSources ?? {}).map(([sourceId, source]) => (
            <option key={sourceId} value={sourceId}>{dataSourceLabel(sourceId, source)}</option>
          ))}
        </select>
      </label>
      <label>CSV join field<select value={panel.joinField ?? ""} onChange={(event) => patch({ joinField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Value field<select value={panel.valueField ?? ""} onChange={(event) => patch({ valueField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Label field<select value={panel.labelField ?? ""} onChange={(event) => patch({ labelField: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>GeoJSON code property<input value={panel.geoNameProperty ?? "statcode"} onChange={(event) => patch({ geoNameProperty: event.target.value })} /></label>
      <label>GeoJSON label property<input value={panel.geoLabelProperty ?? "statnaam"} onChange={(event) => patch({ geoLabelProperty: event.target.value })} /></label>
      <label>Value legend label<input value={panel.valueLabel ?? ""} onChange={(event) => patch({ valueLabel: event.target.value })} /></label>
      <label>Map fill size<input type="range" min="60" max="96" step="1" value={Number(String(panel.mapLayoutSize ?? "82").replace("%", ""))} onChange={(event) => patch({ mapLayoutSize: `${event.target.value}%` })} /></label>
      <label>Minimum color scale<input type="number" value={panel.visualMin ?? ""} onChange={(event) => patch({ visualMin: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
      <label>Maximum color scale<input type="number" value={panel.visualMax ?? ""} onChange={(event) => patch({ visualMax: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
      <ColorField label="Missing-data color" value={panel.missingColor ?? "#DDE7EF"} fallback="#DDE7EF" onChange={(color) => patch({ missingColor: color })} />
      <ColorField label="Border color" value={panel.mapBorderColor ?? "#F8FBFF"} fallback="#F8FBFF" onChange={(color) => patch({ mapBorderColor: color })} />
      <label>Border width<input type="number" min="0" max="5" step="0.1" value={panel.mapBorderWidth ?? 0.8} onChange={(event) => patch({ mapBorderWidth: Number(event.target.value) })} /></label>
      {panel.type === "chronoChoroplethMap" && <p className="settings-note">Playback speed is controlled in the chart play bar to keep the timelapse responsive.</p>}
      <label className="checkbox-row"><input type="checkbox" checked={Boolean(panel.showProvinceOverlay)} onChange={(event) => patch({ showProvinceOverlay: event.target.checked })} /> Show province borders</label>
      <label>
        Province GeoJSON source
        <select value={panel.provinceOverlaySource ?? "geo_netherlands_provinces"} onChange={(event) => patch({ provinceOverlaySource: event.target.value })}>
          <option value="">No province source</option>
          {Object.entries(dataSources ?? {}).map(([sourceId, source]) => (
            <option key={sourceId} value={sourceId}>{dataSourceLabel(sourceId, source)}</option>
          ))}
        </select>
      </label>
      <ColorField label="Province border color" value={panel.provinceBorderColor ?? "#08224A"} fallback="#08224A" onChange={(color) => patch({ provinceBorderColor: color })} />
      <label>Province border thickness<input type="number" min="0" max="8" step="0.1" value={panel.provinceBorderWidth ?? 1.4} onChange={(event) => patch({ provinceBorderWidth: Number(event.target.value) })} /></label>
      <label className="checkbox-row"><input type="checkbox" checked={panel.showProvinceNames ?? true} onChange={(event) => patch({ showProvinceNames: event.target.checked })} /> Show province names</label>
      <label>Province name font size<input type="number" min="6" max="36" step="1" value={panel.provinceNameFontSize ?? 12} onChange={(event) => patch({ provinceNameFontSize: Number(event.target.value) })} /></label>
      <ColorField label="Province name color" value={panel.provinceNameColor ?? "#08224A"} fallback="#08224A" onChange={(color) => patch({ provinceNameColor: color })} />
      <p className="settings-note">Municipality codes such as 14 are normalized to GM0014 before joining to Cartomap's statcode property.</p>
    </>
  );
}

function TableSection({ panel, patch }) {
  return <label>Visible columns<textarea rows="4" value={(panel.columns ?? []).join(", ")} onChange={(event) => patch({ columns: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></label>;
}

function DeltaSection({ panel, dataColumns, patchFields }) {
  return (
    <>
      <label>Title field<select value={panel.fields?.title ?? ""} onChange={(event) => patchFields({ title: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Value field<select value={panel.fields?.value ?? ""} onChange={(event) => patchFields({ value: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
      <label>Detail field<select value={panel.fields?.detail ?? ""} onChange={(event) => patchFields({ detail: event.target.value })}><ColumnOptions columns={dataColumns} /></select></label>
    </>
  );
}

function ColumnOptions({ columns }) {
  return <>{(columns ?? []).map((column) => <option key={column} value={column}>{column}</option>)}</>;
}

function ColorSchemePreview({ scheme, reverse }) {
  const colors = previewColors(scheme, reverse);
  return <div className="color-scheme-preview">{colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</div>;
}

function FontSizeControl({ settingKey, panel, updateFontSize }) {
  const control = FONT_CONTROLS[settingKey];
  const value = panel.fontSizes?.[settingKey] ?? control.defaultValue;
  return (
    <div className="font-size-control">
      <span>{control.label}</span>
      <div><button type="button" className="secondary" onClick={() => updateFontSize(settingKey, -1, control.defaultValue)}>-</button><strong>{value}</strong><button type="button" className="secondary" onClick={() => updateFontSize(settingKey, 1, control.defaultValue)}>+</button></div>
    </div>
  );
}

function openDataSourceTable(title, path, rows) {
  const windowRef = window.open("", "_blank", "width=980,height=720");
  if (!windowRef) return;
  windowRef.document.write(renderCsvTable(title, path, rows));
  windowRef.document.close();
}

function renderCsvTable(title, path, rows) {
  const columns = collectColumns(rows);
  const body = rows.slice(0, 1000).map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><title>${escapeHtml(title)} source CSV</title><style>body{font-family:Inter,Arial,sans-serif;margin:0;color:#08224a;background:#f5f8fb}header{position:sticky;top:0;background:white;padding:16px 20px;border-bottom:1px solid #d8e2ec}main{padding:20px}.table-wrap{overflow:auto;max-height:calc(100vh - 120px);border:1px solid #d8e2ec;background:white;border-radius:10px}table{border-collapse:collapse;min-width:100%;font-size:13px}th,td{border-bottom:1px solid #e6eef5;padding:8px 10px;text-align:left;white-space:nowrap}th{position:sticky;top:0;background:#eaf2f8}small{color:#506a82}</style></head><body><header><strong>${escapeHtml(title)}</strong><br/><small>${escapeHtml(path)} · showing ${Math.min(rows.length, 1000).toLocaleString()} of ${rows.length.toLocaleString()} rows</small></header><main><div class="table-wrap"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div></main></body></html>`;
}

function dataSourceLabel(sourceId, source) {
  if (source?.type === "uploadedCsv") {
    return `${sourceId} - uploaded ${source.fileName ?? "CSV"}`;
  }
  return sourceId;
}

function dataSourceDisplayPath(source) {
  if (source?.type === "uploadedCsv") {
    return `Uploaded CSV: ${source.fileName ?? "unnamed file"}`;
  }
  return source;
}

function defaultsForPanelType(type, panel, dataSources) {
  if (type === "choroplethMap" || type === "chronoChoroplethMap") {
    const municipalDataSource = chooseDataSource(dataSources, [
      "bio_municipal_infections_harmonized_2021",
      "municipal_infections_2021_harmonized",
      "municipal",
    ], false);
    const municipalGeoSource = chooseDataSource(dataSources, [
      "geo_netherlands_municipalities_2021",
      "gemeente_2021",
      "municipalities",
      "gemeente",
    ], true);
    const animated = type === "chronoChoroplethMap";

    return {
      type,
      title: panel.title && panel.title !== "New chart"
        ? panel.title
        : animated ? "Municipality Infection Rate Timelapse" : "Municipality Infection Rate Choropleth",
      dataSource: municipalDataSource ?? panel.dataSource,
      geoSource: municipalGeoSource ?? panel.geoSource,
      joinField: panel.joinField ?? "MunicipalityCode",
      valueField: panel.valueField ?? "infectionsPer10000",
      labelField: panel.labelField ?? "Gemeentenaam",
      geoNameProperty: panel.geoNameProperty ?? "statcode",
      geoLabelProperty: panel.geoLabelProperty ?? "statnaam",
      valueLabel: panel.valueLabel ?? "Infections per 10,000 residents",
      mapName: panel.mapName ?? (animated ? "nl-gemeente-2021-animation" : "nl-gemeente-2021"),
      mapLayoutCenter: panel.mapLayoutCenter ?? ["50%", "55%"],
      mapLayoutSize: panel.mapLayoutSize ?? "82%",
      colorScheme: panel.colorScheme ?? "caseIntensity",
      legend: false,
      size: panel.size === "half" ? "normal" : panel.size,
      provinceOverlaySource: panel.provinceOverlaySource ?? "geo_netherlands_provinces",
      provinceBorderColor: panel.provinceBorderColor ?? "#08224A",
      provinceBorderWidth: panel.provinceBorderWidth ?? 1.4,
      provinceNameFontSize: panel.provinceNameFontSize ?? 12,
      provinceNameColor: panel.provinceNameColor ?? "#08224A",
      dateSelection: animated
        ? {
            column: panel.dateSelection?.column ?? "Datum",
            mode: "range",
            start: panel.dateSelection?.start ?? "2020-02-27",
            end: panel.dateSelection?.end ?? "2021-04-17",
          }
        : {
            column: panel.dateSelection?.column ?? "Datum",
            mode: "single",
            value: panel.dateSelection?.value ?? "2021-04-17",
          },
    };
  }

  return { type };
}

function chooseDataSource(dataSources, preferredClues, geoOnly) {
  const entries = Object.entries(dataSources ?? {});
  const matchingEntries = geoOnly
    ? entries.filter(([sourceId, source]) => sourceId.startsWith("geo_") || String(source).toLowerCase().includes(".geojson"))
    : entries.filter(([sourceId, source]) => !sourceId.startsWith("geo_") && !String(source).toLowerCase().includes(".geojson"));

  for (const clue of preferredClues) {
    const normalizedClue = clue.toLowerCase();
    const match = matchingEntries.find(([sourceId, source]) => `${sourceId} ${String(source)}`.toLowerCase().includes(normalizedClue));
    if (match) {
      return match[0];
    }
  }
  return matchingEntries[0]?.[0];
}

function collectColumns(rows) {
  return [...new Set((rows ?? []).flatMap((row) => Object.keys(row ?? {})))];
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function collectUniqueValues(rows, column) {
  if (!column) return [];
  return [...new Set((rows ?? []).map((row) => row?.[column]).filter((value) => value !== undefined && value !== null && value !== ""))];
}

function compareDateishValues(a, b) {
  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function inferDateColumn(columns, panel) {
  if (axisIsDate(panel)) return panel.x;
  return (columns ?? []).find(isDateLikeColumn) ?? "";
}

function isDateLikeColumn(column) {
  const normalized = String(column ?? "").toLowerCase();
  return normalized.includes("date") || normalized.includes("datum") || normalized.includes("snapshot") || normalized.includes("time");
}

function axisIsDate(panel) {
  return panel.xAxisMode === "date" || (panel.xAxisMode !== "category" && isDateLikeColumn(panel.x));
}

function selectedDateValues(selection, column, options) {
  if (selection?.column === column && selection.mode === "list" && Array.isArray(selection.values)) return selection.values;
  return options;
}

function selectedDateRange(selection, column, options) {
  if (selection?.column === column && selection.mode === "range") return { start: selection.start ?? options[0] ?? "", end: selection.end ?? options[options.length - 1] ?? "" };
  return { start: options[0] ?? "", end: options[options.length - 1] ?? "" };
}

function selectedCategoryValues(selection, column, options) {
  if (selection?.column === column && Array.isArray(selection.values)) return selection.values;
  return options;
}

function defaultSeries(panel, columns, index) {
  const valueColumn = firstValueColumn(columns, panel.x);
  return { name: `Series ${index + 1}`, y: valueColumn, type: panel.type === "mixed" ? (index === 0 ? "bar" : "line") : undefined, color: ["#043BCB", "#00A676", "#4496D1", "#8F1D2C"][index % 4] };
}

function firstValueColumn(columns, exclude) {
  return (columns ?? []).find((column) => column !== exclude && !isDateLikeColumn(column)) ?? columns?.[0] ?? "";
}

function seriesTypeForPanel(panelType) {
  if (["bar", "groupedBar", "stackedBar", "horizontalBar", "horizontalStackedBar"].includes(panelType)) return "bar";
  return panelType === "area" ? "line" : panelType;
}

function isLineLike(panelType, resolvedType) {
  return resolvedType === "line" || panelType === "line" || panelType === "area";
}

function hasSecondaryAxis(panel) {
  return (panel.series ?? []).some((series) => Number(series.yAxisIndex ?? 0) === 1);
}

function supportsLegend(type) {
  return ECHART_TYPES.has(type) && type !== "gauge" && type !== "mapScatter" && type !== "choroplethMap" && type !== "chronoChoroplethMap";
}

function supportsColorScheme(type) {
  return ECHART_TYPES.has(type);
}

function normalizePanelSize(size) {
  if (typeof size === "string") return size;
  if (size?.columns === 2 && size?.rows === 2) return "large";
  if (size?.columns === 2) return "wide";
  if (size?.rows === 2) return "tall";
  return "normal";
}

function fontControlsForPanel(type) {
  if (type === "gauge") return ["title", "gaugeValue", "gaugeLabel", "gaugeAxis"];
  if (type === "mapScatter" || type === "choroplethMap" || type === "chronoChoroplethMap") return ["title", "legend", "mapLabel"];
  if (AXIS_TYPES.has(type)) return ["title", "axis", "legend"];
  return ["title"];
}

function nearestAvailableDate(value, options) {
  if (options.includes(value)) return value;
  const target = Date.parse(value);
  if (Number.isNaN(target)) return options[options.length - 1] ?? "";
  return options.reduce((best, option) => {
    const currentDistance = Math.abs(Date.parse(option) - target);
    const bestDistance = Math.abs(Date.parse(best) - target);
    return currentDistance < bestDistance ? option : best;
  }, options[0]);
}

function previewColors(scheme, reverse) {
  const colors = {
    manual: ["#043BCB", "#00A676", "#4496D1", "#8F1D2C"],
    pdpc: ["#043BCB", "#00A676", "#4496D1", "#2456A6", "#007C89"],
    redGreen5: ["#8F1D2C", "#E16B5A", "#F3D37A", "#7FDEC1", "#00A676"],
    likertInfographic5: ["#43A047", "#AEBB2E", "#F6A21A", "#F47C20", "#D71920"],
    caseIntensity: ["#FFF3E8", "#F3D37A", "#E16B5A", "#D71920", "#8F1D2C"],
    blueYellow5: ["#08224A", "#043BCB", "#4496D1", "#F3D37A", "#C98700"],
    cool: ["#08224A", "#2456A6", "#4496D1", "#007C89", "#7FDEC1"],
    warm: ["#8F1D2C", "#C98700", "#F3D37A", "#E16B5A", "#08224A"],
  };
  const palette = colors[scheme] ?? colors.manual;
  return reverse ? [...palette].reverse() : palette;
}


