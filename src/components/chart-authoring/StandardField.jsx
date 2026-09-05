import React from "react";
import { IconControl, SimExIcon } from "../common/SimExIcon.js";
const STRUCTURED_CONTROLS = new Set(["labels", "axes", "targets", "map", "timeline"]);
const AXIS_PROPERTIES = new Set(["title", "name", "unit", "min", "max", "grid", "xTitle", "yTitle", "titlePosition", "titleOrientation", "titleFontSize", "labelFontSize", "titleBold", "titleOffsetX", "titleOffsetY", "tickFrequency"]);
const X_AXIS_PROPERTIES = new Set(["title", "titleFontSize", "min", "max", "labelPreset", "hoverLabelPreset", "tickFrequency", "labelFontSize", "labelWrap", "labelMaxWidth"]);
const EXACT_MONTH_TICK_FREQUENCIES = Object.freeze([1, 2, 3]);
const FILTER_OPERATORS = new Set(["equals", "notEquals", "contains", "in", "notIn", "range"]);
function StandardField({
  field,
  value = field?.value,
  onChange = noop,
  columns = [],
  rows = []
} = {}) {
  if (!validField(field)) return null;
  const id = fieldControlId(field);
  const describedBy = fieldDescribedBy(field);
  const shared = {
    id,
    "aria-describedby": describedBy || void 0,
    "aria-invalid": fieldHasError(field) ? "true" : void 0
  };
  if (field.control === "filters") {
    return /* @__PURE__ */ React.createElement(
      GroupShell,
      { field, className: "chart-authoring-filters" },
      filterControls(value, columns, rows, onChange)
    );
  }
  if (STRUCTURED_CONTROLS.has(field.control)) {
    return /* @__PURE__ */ React.createElement(
      GroupShell,
      { field, className: `chart-authoring-${field.control}` },
      structuredControls(field.control, value, onChange, field)
    );
  }
  if (field.control === "toggle") {
    return React.createElement(BooleanFieldShell, {
      field,
      control: React.createElement("input", {
        ...shared,
        type: "checkbox",
        checked: value === true,
        onChange: (event) => onChange(event.target.checked),
      }),
    });
  }
  let control;
  switch (field.control) {
    case "textarea":
      control = /* @__PURE__ */ React.createElement("textarea", { ...shared, value: text(value), onChange: (event) => onChange(event.target.value) });
      break;
    case "select":
      control = /* @__PURE__ */ React.createElement("select", { ...shared, value: scalar(value), onChange: (event) => onChange(event.target.value) }, optionList(field.options).map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label)));
      break;
    case "grouping":
      control = /* @__PURE__ */ React.createElement(
        "select",
        {
          ...shared,
          multiple: true,
          value: Array.isArray(value) ? value : [],
          onChange: (event) => onChange(
            [...event.target.selectedOptions].map(({ value: optionValue }) => optionValue)
          )
        },
        columnOptions(columns).map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label))
      );
      break;
    case "duplicates":
      control = /* @__PURE__ */ React.createElement("select", { ...shared, value: scalar(value ?? "error"), onChange: (event) => onChange(event.target.value) }, optionList([
        ["error", "Flag as an error"],
        ["first", "Use first observation"],
        ["last", "Use last observation"],
        ["aggregate", "Aggregate observations"]
      ]).map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label)));
      break;
    case "accessibility":
      control = objectText(id, describedBy, value, "description", "Accessible description", onChange);
      break;
    default:
      control = /* @__PURE__ */ React.createElement(
        "input",
        {
          ...shared,
          type: field.control === "number" ? "number" : "text",
          min: field.control === "number" ? field.min : void 0,
          max: field.control === "number" ? field.max : void 0,
          step: field.control === "number" ? field.step ?? "any" : void 0,
          required: field.required === true,
          value: field.control === "number" ? numeric(value) : text(value),
          onChange: (event) => onChange(
            field.control === "number"
              ? optionalNumber(event.target.value)
              : event.target.value
          )
        }
      );
  }
  return /* @__PURE__ */ React.createElement(
    FieldShell,
    { field, className: field.control === "textarea" ? "dashboard-authoring-field--wide" : "" },
    control,
  );
}
function FieldShell({ field, children, className = "" }) {
  if (!validField(field)) return null;
  const id = fieldControlId(field);
  return /* @__PURE__ */ React.createElement("div", { className: `chart-authoring-field ${field.compactLabel ? "chart-authoring-field--label-hidden " : ""}${className}`.trim(), "data-field-id": field.id, "aria-invalid": fieldHasError(field) ? "true" : void 0 }, /* @__PURE__ */ React.createElement("label", { htmlFor: id }, React.createElement("span", { className: field.compactLabel ? "chart-authoring-field-label visually-hidden" : "chart-authoring-field-label" }, field.label, requiredMarker(field))), field.detected ? /* @__PURE__ */ React.createElement("small", { className: "chart-authoring-detected" }, "Detected: ", detectedLabel(field)) : null, children, field.help ? /* @__PURE__ */ React.createElement("small", { id: `${id}-help` }, field.help) : null, field.error ? /* @__PURE__ */ React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null);
}
function GroupShell({ field, children, className = "" }) {
  if (!validField(field)) return null;
  const id = fieldControlId(field);
  return /* @__PURE__ */ React.createElement(
    "fieldset",
    {
      className: `chart-authoring-field ${className}`.trim(),
      "data-field-id": field.id,
      "aria-invalid": fieldHasError(field) ? "true" : void 0,
      "aria-describedby": fieldDescribedBy(field) || void 0
    },
    field.suppressLegend === true
      ? null
      : /* @__PURE__ */ React.createElement(
          "legend",
          null,
          React.createElement("span", { className: "chart-authoring-field-label" },
            field.label,
            requiredMarker(field)
          )
        ),
    field.detected ? /* @__PURE__ */ React.createElement("small", { className: "chart-authoring-detected" }, "Detected: ", detectedLabel(field)) : null,
    children,
    field.help ? /* @__PURE__ */ React.createElement("small", { id: `${id}-help` }, field.help) : null,
    field.error ? /* @__PURE__ */ React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null
  );
}
function filterControls(value, columns, rows, onChange) {
  const filters = Array.isArray(value) ? value.filter(isRecord) : [];
  const options = columnOptions(columns);
  const replace = (index, filter) => onChange(
    filters.map((current, itemIndex) => itemIndex === index ? filter : current)
  );
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "chart-authoring-filter-list" },
    filters.map((filter, index) => /* @__PURE__ */ React.createElement(
      "div",
      { className: "chart-authoring-filter-row", key: `${filter.field ?? "filter"}-${index}` },
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        "Filter column",
        /* @__PURE__ */ React.createElement(
          "select",
          {
            value: typeof filter.field === "string" ? filter.field : "",
            onChange: (event) => replace(index, {
              ...filterForOperator(filter, filter.operator),
              field: event.target.value
            })
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }, "Select a column"),
          options.map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label))
        )
      ),
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        "Condition",
        /* @__PURE__ */ React.createElement(
          "select",
          {
            value: typeof filter.operator === "string" ? filter.operator : "equals",
            onChange: (event) => replace(index, filterForOperator(filter, event.target.value))
          },
          [
            ["equals", "Equals"],
            ["notEquals", "Does not equal"],
            ["contains", "Contains"],
            ["in", "Is one of"],
            ["notIn", "Is not one of"],
            ["range", "Is within range"]
          ].map(([operator, label]) => /* @__PURE__ */ React.createElement("option", { key: operator, value: operator }, label))
        )
      ),
      filterOperandControl(filter, (nextFilter) => replace(index, nextFilter), detectedFilterValues(columns, filter.field, rows), `chart-filter-values-${index}`),
      /* @__PURE__ */ React.createElement(IconControl, {
        interactionId: "editor.remove-measurement",
        className: "secondary",
        ariaLabel: `Remove filter ${index + 1}`,
        tooltip: `Remove filter ${index + 1}`,
        onClick: () => onChange(filters.filter((_, itemIndex) => itemIndex !== index))
      })
    )),
    /* @__PURE__ */ React.createElement(IconControl, {
      interactionId: "editor.add-filter",
      className: "secondary",
      disabled: options.length === 0,
      onClick: () => onChange([
          ...filters,
          { field: options[0]?.value ?? "", operator: "equals", value: "" }
        ])
    })
  );
}
function filterForOperator(filter, operator) {
  const current = isRecord(filter) ? filter : {};
  const nextOperator = FILTER_OPERATORS.has(operator) ? operator : "equals";
  const field = typeof current.field === "string" ? current.field : "";
  const seed = filterSeed(current);
  if (nextOperator === "in" || nextOperator === "notIn") {
    const values = Array.isArray(current.values) && current.values.length > 0
      ? current.values.filter(filterScalar)
      : [seed];
    return { field, operator: nextOperator, values: values.length > 0 ? values : [seed] };
  }
  if (nextOperator === "range") {
    return {
      field,
      operator: nextOperator,
      min: filterScalar(current.min) ? current.min : seed,
      max: filterScalar(current.max) ? current.max : seed
    };
  }
  return { field, operator: nextOperator, value: seed };
}
function filterOperandControl(filter, onChange, suggestions = [], listId = undefined) {
  const normalized = filterForOperator(filter, filter.operator);
  if (normalized.operator === "range") {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Minimum", /* @__PURE__ */ React.createElement("input", {
      value: scalar(normalized.min),
      onChange: (event) => onChange({ ...normalized, min: event.target.value })
    })), /* @__PURE__ */ React.createElement("label", null, "Maximum", /* @__PURE__ */ React.createElement("input", {
      value: scalar(normalized.max),
      onChange: (event) => onChange({ ...normalized, max: event.target.value })
    })));
  }
  if (normalized.operator === "in" || normalized.operator === "notIn") {
    return /* @__PURE__ */ React.createElement("label", null, "Values", /* @__PURE__ */ React.createElement("input", {
      value: normalized.values.join(", "),
      onChange: (event) => onChange({
        ...normalized,
        values: commaSeparated(event.target.value, { retainEmpty: true })
      })
    }));
  }
  return /* @__PURE__ */ React.createElement("label", null, "Value", /* @__PURE__ */ React.createElement("input", {
    value: scalar(normalized.value),
    list: suggestions.length > 0 ? listId : undefined,
    onChange: (event) => onChange({ ...normalized, value: event.target.value })
  }), suggestions.length > 0 ? /* @__PURE__ */ React.createElement("datalist", { id: listId }, suggestions.map((suggestion) => /* @__PURE__ */ React.createElement("option", { key: `${typeof suggestion}:${String(suggestion)}`, value: String(suggestion) }))) : null);
}

export function detectedFilterValues(columns, field, rows, limit = 100) {
  const column = Array.isArray(columns) ? columns.find(({ name }) => name === field) : null;
  if (column?.type !== "category" || !Array.isArray(rows)) return [];
  const seen = new Set();
  const values = [];
  for (const row of rows) {
    const value = row?.[field];
    if (!filterScalar(value) || (typeof value === "string" && value.trim() === "")) continue;
    const key = `${typeof value}:${String(value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length >= limit) break;
  }
  return values;
}
function filterSeed(filter) {
  if (filterScalar(filter.value)) return filter.value;
  if (Array.isArray(filter.values) && filter.values.some(filterScalar)) {
    return filter.values.find(filterScalar);
  }
  if (filterScalar(filter.min)) return filter.min;
  if (filterScalar(filter.max)) return filter.max;
  return "";
}
function filterScalar(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function TargetRangesControl({ ranges, onChange }) {
  const normalized = Array.isArray(ranges) ? ranges.filter(Number.isFinite) : [];
  const canonical = normalized.join(", ");
  const [rawValue, setRawValue] = React.useState(canonical);
  const committedValue = React.useRef(canonical);

  React.useEffect(() => {
    if (committedValue.current === canonical) return;
    committedValue.current = canonical;
    setRawValue(canonical);
  }, [canonical]);

  const commit = (value) => {
    const parsed = parseTargetRangesInput(value);
    if (parsed.complete) onChange(parsed.values);
    return parsed;
  };

  return /* @__PURE__ */ React.createElement("label", null, "Status-band upper limits", /* @__PURE__ */ React.createElement("input", {
    value: rawValue,
    placeholder: "50, 80, 100",
    onChange: (event) => {
      const value = event.target.value;
      setRawValue(value);
      commit(value);
    },
    onBlur: () => {
      if (!commit(rawValue).complete) setRawValue(canonical);
    }
  }));
}

export function parseTargetRangesInput(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return { values: [], complete: true };
  }
  const trailingDelimiter = /,\s*$/.test(value);
  const tokens = value.split(",").map((token) => token.trim());
  const values = tokens.flatMap((token) => {
    if (token === "") return [];
    const parsed = Number(token);
    return Number.isFinite(parsed) ? [parsed] : [];
  });
  return {
    values,
    complete: !trailingDelimiter && tokens.every((token) => (
      token !== "" && Number.isFinite(Number(token))
    )),
  };
}

function structuredControls(control, value, onChange, field = {}) {
  const current = sanitizeStructuredValue(control, value);
  const emit = (path, nextValue) => onChange(
    updateStructuredFieldValue(control, current, path, nextValue)
  );
  if (control === "labels") {
    const controls = new Set(field.controls ?? ["visible", "position", "format"]);
    return /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-control-grid dashboard-authoring-grid" }, controls.has("visible") ? inlineToggle(
      "Show labels",
      current.visible === true,
      (checked) => emit(["visible"], checked)
    ) : null, controls.has("position") ? /* @__PURE__ */ React.createElement("label", null, "Label position", /* @__PURE__ */ React.createElement("select", {
      value: current.position ?? "",
      onChange: (event) => emit(["position"], event.target.value)
    }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Automatic"), ["top", "bottom", "left", "right", "inside", "center"].map((position) => /* @__PURE__ */ React.createElement("option", { key: position, value: position }, sentence(position))))) : null, controls.has("format") ? /* @__PURE__ */ React.createElement("label", null, "Label format", /* @__PURE__ */ React.createElement("input", {
      value: current.format ?? "",
      placeholder: "{value}",
      onChange: (event) => emit(["format"], event.target.value)
    })) : null, controls.has("valueMode") ? pieValueModeControls(current, emit, field.id) : null, controls.has("valueFontSize") ? boundedNumericControl("Value/percentage font size", current.valueFontSize ?? 14, 8, 32, (nextValue) => emit(["valueFontSize"], nextValue)) : null, controls.has("labelFontSize") ? boundedNumericControl("Label font size", current.labelFontSize ?? 12, 8, 32, (nextValue) => emit(["labelFontSize"], nextValue)) : null, controls.has("labelWrap") ? inlineToggle("Wrap long category labels", current.labelWrap === true, (checked) => emit(["labelWrap"], checked)) : null);
  }
  if (control === "axes") {
    return /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-axis-groups" }, xAxisControls(
      current.x ?? {},
      field.xKind ?? "category",
      emit
    ), axisControls("Primary axis", "primary", current.primary ?? {}, emit), field.hasSecondary === true
      ? axisControls("Secondary axis", "secondary", current.secondary ?? {}, emit)
      : null);
  }
  if (control === "targets") {
    const controls = new Set(field.controls ?? ["direction", "ranges"]);
    return /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-control-grid dashboard-authoring-grid" }, controls.has("direction") ? /* @__PURE__ */ React.createElement("label", null, "Which change is favorable", /* @__PURE__ */ React.createElement("select", {
      value: current.direction ?? "",
      onChange: (event) => emit(["direction"], event.target.value)
    }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Not specified"), /* @__PURE__ */ React.createElement("option", { value: "increase-is-good" }, "Increase is favorable"), /* @__PURE__ */ React.createElement("option", { value: "decrease-is-good" }, "Decrease is favorable"), /* @__PURE__ */ React.createElement("option", { value: "neutral" }, "Neutral"))) : null, controls.has("ranges") ? /* @__PURE__ */ React.createElement(TargetRangesControl, {
      ranges: current.ranges,
      onChange: (nextRanges) => emit(["ranges"], nextRanges)
    }) : null, controls.has("readoutLabel") ? textControl("Readout label", current.readoutLabel, (nextValue) => emit(["readoutLabel"], nextValue)) : null, controls.has("showReadoutLabel") ? inlineToggle(
      "Show readout label",
      current.showReadoutLabel !== false,
      (checked) => emit(["showReadoutLabel"], checked)
    ) : null, controls.has("unit") ? textControl("Unit", current.unit, (nextValue) => emit(["unit"], nextValue)) : null);
  }
  if (control === "map") {
    return /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-control-grid dashboard-authoring-grid" }, textControl("Scale", current.scale, (nextValue) => emit(["scale"], nextValue)));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-control-grid dashboard-authoring-grid" }, /* @__PURE__ */ React.createElement("label", null, "Timeline lanes", /* @__PURE__ */ React.createElement("input", {
    value: Array.isArray(current.lanes) ? current.lanes.join(", ") : "",
    placeholder: "Response, Recovery",
    onChange: (event) => emit(["lanes"], commaSeparated(event.target.value))
  })), textControl("Marker", current.marker, (nextValue) => emit(["marker"], nextValue)));
}
function axisControls(label, axis, value, emit) {
  return React.createElement(
    "fieldset",
    { className: "chart-authoring-axis-group dashboard-authoring-grid" },
    React.createElement("legend", null, label),
    textControl("Title", value.title, (nextValue) => emit([axis, "title"], nextValue)),
    textControl("Unit", value.unit, (nextValue) => emit([axis, "unit"], nextValue)),
    selectControl("Title position", value.titlePosition ?? "center", ["top", "center", "bottom"], (nextValue) => emit([axis, "titlePosition"], nextValue)),
    selectControl("Title orientation", value.titleOrientation ?? "vertical", ["vertical", "horizontal"], (nextValue) => emit([axis, "titleOrientation"], nextValue)),
    fontSizeControl(value.titleFontSize ?? 14, (nextValue) => emit([axis, "titleFontSize"], nextValue)),
    boundedNumericControl("Tick label font size", value.labelFontSize, 8, 20, (nextValue) => emit([axis, "labelFontSize"], nextValue)),
    inlineToggle("Bold", value.titleBold === true, (checked) => emit([axis, "titleBold"], checked)),
    numericPair("chart-authoring-axis-offsets", [
      boundedNumericControl("Horizontal offset", value.titleOffsetX, -96, 96, (nextValue) => emit([axis, "titleOffsetX"], nextValue)),
      boundedNumericControl("Vertical offset", value.titleOffsetY, -96, 96, (nextValue) => emit([axis, "titleOffsetY"], nextValue)),
    ]),
    numericPair("chart-authoring-axis-bounds", [
      numericControl("Minimum", value.min, (nextValue) => emit([axis, "min"], nextValue)),
      numericControl("Maximum", value.max, (nextValue) => emit([axis, "max"], nextValue)),
    ]),
    tickControls(axis, value.tickFrequency, "number", emit),
    inlineToggle("Show grid", value.grid !== false, (checked) => emit([axis, "grid"], checked)),
  );
}
function BooleanFieldShell({ field, control }) {
  const id = fieldControlId(field);
  return React.createElement(
    "div",
    {
      className: "chart-authoring-field dashboard-authoring-boolean-row",
      "data-field-id": field.id,
      "aria-invalid": fieldHasError(field) ? "true" : void 0,
    },
    control,
    React.createElement(
      "div",
      { className: "dashboard-authoring-boolean-copy" },
      React.createElement(
        "label",
        { htmlFor: id },
        field.label,
        field.helpTooltip
          ? React.createElement(
              "span",
              {
                className: "chart-authoring-inline-help",
                title: field.helpTooltip,
                role: "img",
                "aria-label": field.helpTooltip,
              },
              React.createElement(SimExIcon, { iconId: "eye", size: 14 }),
            )
          : null,
      ),
      field.help && !field.helpTooltip ? React.createElement("small", { id: `${id}-help` }, field.help) : null,
      field.error ? React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null,
    ),
  );
}
function requiredMarker(field) {
  return field.required
    ? React.createElement("span", { className: "chart-authoring-field-required-marker", "aria-hidden": "true" }, "\u00a0*")
    : null;
}
function selectControl(label, value, options, onChange) {
  return React.createElement("label", null, label, React.createElement("select", {
    value,
    onChange: (event) => onChange(event.target.value),
  }, options.map((option) => React.createElement("option", { key: option, value: option }, sentence(option)))));
}
function optionSelectControl(label, value, options, onChange) {
  return React.createElement("label", null, label, React.createElement(
    "select",
    { value, onChange: (event) => onChange(event.target.value) },
    options.map(([optionValue, optionLabel]) => React.createElement(
      "option",
      { key: optionValue, value: optionValue },
      optionLabel,
    )),
  ));
}
function numericControl(label, value, onChange) {
  return React.createElement("label", null, label, React.createElement("input", {
    type: "number",
    value: numeric(value),
    onChange: (event) => onChange(optionalNumber(event.target.value)),
  }));
}
function numericPair(className, controls) {
  return React.createElement(
    "div",
    { className: `chart-authoring-number-pair ${className}` },
    ...controls,
  );
}
function boundedNumericControl(label, value, min, max, onChange) {
  return React.createElement("label", null, label, React.createElement("input", {
    type: "number",
    min: String(min),
    max: String(max),
    step: "1",
    value: numeric(value),
    onChange: (event) => onChange(optionalNumber(event.target.value)),
  }));
}
function fontSizeControl(value, onChange, label = "Title") {
  const size = Number.isInteger(value) ? Math.min(24, Math.max(10, value)) : 14;
  return React.createElement("div", { className: "chart-authoring-axis-title-size" },
    React.createElement("span", null, `${label} font size`),
    React.createElement("button", {
      type: "button",
      "aria-label": `Decrease ${label.toLowerCase()} font size`,
      disabled: size <= 10,
      onClick: () => onChange(size - 1),
    }, "−"),
    React.createElement("output", null, size),
    React.createElement("button", {
      type: "button",
      "aria-label": `Increase ${label.toLowerCase()} font size`,
      disabled: size >= 24,
      onClick: () => onChange(size + 1),
    }, "+"),
  );
}
function xAxisControls(value, kind, emit) {
  const ranged = kind === "temporal" || kind === "number";
  const bounds = ranged ? numericPair("chart-authoring-axis-bounds", [
    React.createElement("label", { key: "min" }, "Minimum", React.createElement("input", {
      type: kind === "temporal" ? "datetime-local" : "number",
      value: kind === "number" ? numeric(value.min) : text(value.min),
      onChange: (event) => emit(["x", "min"], kind === "number" ? optionalNumber(event.target.value) : event.target.value),
    })),
    React.createElement("label", { key: "max" }, "Maximum", React.createElement("input", {
      type: kind === "temporal" ? "datetime-local" : "number",
      value: kind === "number" ? numeric(value.max) : text(value.max),
      onChange: (event) => emit(["x", "max"], kind === "number" ? optionalNumber(event.target.value) : event.target.value),
    })),
  ]) : null;
  return React.createElement(
    "fieldset",
    { className: "chart-authoring-axis-group dashboard-authoring-grid" },
    React.createElement("legend", null, "X axis"),
    textControl("X-axis title", value.title, (nextValue) => emit(["x", "title"], nextValue)),
    fontSizeControl(value.titleFontSize ?? 14, (nextValue) => emit(["x", "titleFontSize"], nextValue), "X-axis title"),
    boundedNumericControl("Tick label font size", value.labelFontSize, 8, 20, (nextValue) => emit(["x", "labelFontSize"], nextValue)),
    kind === "category" ? React.createElement(
      React.Fragment,
      null,
      inlineToggle("Wrap long labels", value.labelWrap === true, (checked) => emit(["x", "labelWrap"], checked)),
      value.labelWrap === true ? boundedNumericControl("Wrapped label width", value.labelMaxWidth ?? 96, 40, 240, (nextValue) => emit(["x", "labelMaxWidth"], nextValue)) : null,
    ) : null,
    bounds,
    kind === "temporal" ? optionSelectControl("Label format", value.labelPreset ?? "adaptive", [["adaptive", "Adaptive / current hierarchy"], ["ddMmmYearBoundary", "DD MMM (year boundary)"], ["ddMmYyyy", "DD-MM-YYYY"], ["ddMmYy", "DD-MM-YY"], ["hhMm", "HH:mm"], ["ddMmYyyyHhMm", "DD-MM-YYYY HH:mm"]], (nextValue) => emit(["x", "labelPreset"], nextValue)) : null,
    kind === "temporal" ? optionSelectControl("Hover date/time", value.hoverLabelPreset ?? "auto", [["auto", "Auto (match source)"], ["year", "Year (YYYY)"], ["date", "Date (YYYY-MM-DD)"], ["dateTime", "Date and time (YYYY-MM-DD HH:mm)"]], (nextValue) => emit(["x", "hoverLabelPreset"], nextValue)) : null,
    tickControls("x", value.tickFrequency, kind, emit),
  );
}
function tickControls(axis, value, kind, emit) {
  const monthCadence = kind === "temporal" && value?.unit === "month";
  const everyControl = monthCadence
    ? React.createElement("select", {
        value: String(EXACT_MONTH_TICK_FREQUENCIES.includes(value?.every) ? value.every : 1),
        onChange: (event) => emit([axis, "tickFrequency"], {
          ...(value ?? {}),
          every: Number(event.target.value),
          unit: "month",
        }),
      }, EXACT_MONTH_TICK_FREQUENCIES.map((frequency) => React.createElement(
        "option",
        { key: frequency, value: String(frequency) },
        String(frequency),
      )))
    : React.createElement("input", {
        type: "number",
        min: "1",
        step: "1",
        value: numeric(value?.every),
        placeholder: "Auto",
        onChange: (event) => emit([axis, "tickFrequency"], event.target.value === "" ? undefined : { ...(value ?? {}), every: Number(event.target.value), ...(kind === "temporal" ? { unit: value?.unit ?? "day" } : {}) }),
      });
  const every = React.createElement("label", null, "Tick frequency", everyControl);
  if (kind !== "temporal") return every;
  return React.createElement(React.Fragment, null, every, React.createElement("label", null, "Tick unit", React.createElement("select", {
    value: value?.unit ?? "day",
    onChange: (event) => {
      const unit = event.target.value;
      const currentEvery = Number.isInteger(value?.every) ? value.every : 1;
      const every = unit === "month" && !EXACT_MONTH_TICK_FREQUENCIES.includes(currentEvery)
        ? 1
        : currentEvery;
      emit([axis, "tickFrequency"], { ...(value ?? {}), every, unit });
    },
  }, ["minute", "hour", "day", "week", "month", "year"].map((unit) => React.createElement("option", { key: unit, value: unit }, sentence(unit))))));
}
function textControl(label, value, onChange) {
  return /* @__PURE__ */ React.createElement("label", null, label, /* @__PURE__ */ React.createElement("input", {
    value: typeof value === "string" ? value : "",
    onChange: (event) => onChange(event.target.value)
  }));
}
function inlineToggle(label, checked, onChange) {
  return /* @__PURE__ */ React.createElement("label", { className: "chart-authoring-inline-toggle dashboard-authoring-boolean-row" }, /* @__PURE__ */ React.createElement("input", {
    type: "checkbox",
    checked,
    onChange: (event) => onChange(event.target.checked)
  }), label);
}
function pieValueModeControls(value, emit, id) {
  return React.createElement("fieldset", { className: "chart-authoring-inline-options" },
    React.createElement("legend", null, "Slice readout"),
    React.createElement("label", { className: "dashboard-authoring-boolean-row" }, React.createElement("input", {
      type: "radio",
      name: `${id}-value-mode`,
      checked: value.valueMode === undefined,
      onChange: () => emit(["valueMode"], undefined),
    }), "No slice readout"),
    React.createElement("label", { className: "dashboard-authoring-boolean-row" }, React.createElement("input", {
      type: "radio",
      name: `${id}-value-mode`,
      checked: value.valueMode === "value",
      onChange: () => emit(["valueMode"], "value"),
    }), "Show value"),
    React.createElement("label", { className: "dashboard-authoring-boolean-row" }, React.createElement("input", {
      type: "radio",
      name: `${id}-value-mode`,
      checked: value.valueMode === "percentage",
      onChange: () => emit(["valueMode"], "percentage"),
    }), "Show percentage"),
  );
}
function updateStructuredFieldValue(control, current, path, value) {
  if (!STRUCTURED_CONTROLS.has(control)) {
    throw new Error(`Unsupported structured control "${control}".`);
  }
  if (!Array.isArray(path) || path.length < 1 || path.length > 2) {
    throw new Error("Structured field updates require a one- or two-part path.");
  }
  assertStructuredPath(control, path);
  const next = sanitizeStructuredValue(control, current);
  const [section, property] = path;
  if (property === void 0) {
    setOptional(next, section, normalizeStructuredInput(control, path, value));
  } else {
    const nested = isRecord(next[section]) ? { ...next[section] } : {};
    setOptional(nested, property, normalizeStructuredInput(control, path, value));
    if (control === "axes" && section !== "x" && Number.isFinite(nested.min) && Number.isFinite(nested.max) && nested.min > nested.max) {
      delete nested[property === "min" ? "max" : "min"];
    }
    if (Object.keys(nested).length > 0) next[section] = nested;
    else delete next[section];
  }
  return sanitizeStructuredValue(control, next);
}
function assertStructuredPath(control, path) {
  const [section, property] = path;
  const valid = {
    labels: path.length === 1 && ["visible", "position", "format", "valueMode", "valueFontSize", "labelFontSize"].includes(section),
    axes: path.length === 2 && ((["primary", "secondary"].includes(section) && AXIS_PROPERTIES.has(property)) || (section === "x" && X_AXIS_PROPERTIES.has(property))),
    targets: path.length === 1 && ["ranges", "direction", "readoutLabel", "showReadoutLabel", "unit"].includes(section),
    map: path.length === 1 && ["scale", "geoSource", "joinField"].includes(section),
    timeline: path.length === 1 && ["lanes", "marker"].includes(section)
  }[control];
  if (!valid) throw new Error(`Unsupported ${control} field path "${path.join(".")}".`);
}
function normalizeStructuredInput(control, path, value) {
  const property = path.at(-1);
  if (control === "labels" && property === "visible" || control === "axes" && property === "grid") {
    return value === true;
  }
  if (control === "labels" && ["valueFontSize", "labelFontSize"].includes(property)) {
    return Number.isInteger(value) && value >= 8 && value <= 32 ? value : void 0;
  }
  if (control === "labels" && property === "valueMode") {
    return ["value", "percentage"].includes(value) ? value : void 0;
  }
  if (control === "axes" && ["min", "max"].includes(property) && path[0] !== "x") {
    return Number.isFinite(value) ? value : void 0;
  }
  if (control === "axes" && path[0] === "x" && ["min", "max"].includes(property)) {
    return Number.isFinite(value) || nonemptyString(value) ? value : void 0;
  }
  if (control === "axes" && property === "tickFrequency") {
    return sanitizeTickFrequency(value);
  }
  if (control === "axes" && property === "title") {
    return typeof value === "string" && value.trim() ? value : void 0;
  }
  if (control === "axes" && property === "titleBold") {
    return value === true;
  }
  if (control === "axes" && property === "labelFontSize") {
    return Number.isInteger(value) && value >= 8 && value <= 20 ? value : void 0;
  }
  if (control === "axes" && ["titleFontSize", "titleOffsetX", "titleOffsetY"].includes(property)) {
    return Number.isFinite(value) ? value : void 0;
  }
  if (control === "targets" && property === "ranges") {
    return sanitizeRanges(value);
  }
  if (control === "targets" && property === "showReadoutLabel") {
    return value === true;
  }
  if (control === "timeline" && property === "lanes") {
    return sanitizeStringArray(value);
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed || void 0;
}
function sanitizeStructuredValue(control, value) {
  const current = isRecord(value) ? value : {};
  if (control === "labels") {
    return compact({
      visible: typeof current.visible === "boolean" ? current.visible : void 0,
      position: nonemptyString(current.position),
      format: nonemptyString(current.format),
      valueMode: ["value", "percentage"].includes(current.valueMode) ? current.valueMode : void 0,
      valueFontSize: Number.isInteger(current.valueFontSize) && current.valueFontSize >= 8 && current.valueFontSize <= 32 ? current.valueFontSize : void 0,
      labelFontSize: Number.isInteger(current.labelFontSize) && current.labelFontSize >= 8 && current.labelFontSize <= 32 ? current.labelFontSize : void 0,
    });
  }
  if (control === "axes") {
    return compact({
      primary: sanitizeAxis(current.primary),
      secondary: sanitizeAxis(current.secondary),
      x: sanitizeXAxis(current.x)
    }, true);
  }
  if (control === "targets") {
    return compact({
      ranges: sanitizeRanges(current.ranges),
      direction: ["increase-is-good", "decrease-is-good", "neutral"].includes(current.direction)
        ? current.direction
        : void 0,
      readoutLabel: nonemptyString(current.readoutLabel),
      showReadoutLabel: typeof current.showReadoutLabel === "boolean"
        ? current.showReadoutLabel
        : void 0,
      unit: nonemptyString(current.unit),
    }, true);
  }
  if (control === "map") {
    return compact({
      scale: nonemptyString(current.scale),
      geoSource: nonemptyString(current.geoSource),
      joinField: nonemptyString(current.joinField)
    });
  }
  return compact({
    lanes: sanitizeStringArray(current.lanes),
    marker: nonemptyString(current.marker)
  }, true);
}
function sanitizeAxis(value) {
  if (!isRecord(value)) return void 0;
  const axis = {};
  for (const property of AXIS_PROPERTIES) {
    if (["grid", "titleBold"].includes(property) && typeof value[property] === "boolean") axis[property] = value[property];
    else if (["min", "max", "titleFontSize", "titleOffsetX", "titleOffsetY"].includes(property) && Number.isFinite(value[property])) axis[property] = value[property];
    else if (property === "labelFontSize" && Number.isInteger(value[property]) && value[property] >= 8 && value[property] <= 20) axis[property] = value[property];
    else if (property === "tickFrequency" && sanitizeTickFrequency(value[property])) axis[property] = sanitizeTickFrequency(value[property]);
    else if (property === "title" && nonemptyString(value[property])) axis[property] = value[property];
    else if (!["grid", "titleBold", "min", "max", "titleFontSize", "labelFontSize", "titleOffsetX", "titleOffsetY", "title"].includes(property) && nonemptyString(value[property])) axis[property] = value[property].trim();
  }
  if (Number.isFinite(axis.min) && Number.isFinite(axis.max) && axis.min > axis.max) {
    delete axis.max;
  }
  return Object.keys(axis).length > 0 ? axis : void 0;
}
function sanitizeXAxis(value) {
  if (!isRecord(value)) return void 0;
  const axis = {};
  for (const property of X_AXIS_PROPERTIES) {
    if (["min", "max"].includes(property) && (Number.isFinite(value[property]) || nonemptyString(value[property]))) axis[property] = typeof value[property] === "string" ? value[property].trim() : value[property];
    else if (property === "tickFrequency" && sanitizeTickFrequency(value[property])) axis[property] = sanitizeTickFrequency(value[property]);
    else if (property === "title" && nonemptyString(value[property])) axis[property] = value[property];
    else if (property === "labelPreset" && nonemptyString(value[property]) && value[property].trim() !== "adaptive") axis[property] = value[property].trim();
    else if (property === "hoverLabelPreset" && nonemptyString(value[property]) && value[property].trim() !== "auto") axis[property] = value[property].trim();
    else if (property === "labelWrap" && typeof value[property] === "boolean") axis[property] = value[property];
    else if (["titleFontSize", "labelFontSize"].includes(property) && Number.isInteger(value[property]) && value[property] >= (property === "titleFontSize" ? 10 : 8) && value[property] <= (property === "titleFontSize" ? 24 : 20)) axis[property] = value[property];
    else if (property === "labelMaxWidth" && Number.isInteger(value[property]) && value[property] >= 40 && value[property] <= 240) axis[property] = value[property];
  }
  return Object.keys(axis).length > 0 ? axis : void 0;
}
function sanitizeTickFrequency(value) {
  if (!isRecord(value) || !Number.isInteger(value.every) || value.every < 1) return void 0;
  const frequency = { every: value.every };
  if (nonemptyString(value.unit)) frequency.unit = value.unit.trim();
  return frequency;
}
function sanitizeRanges(value) {
  if (!Array.isArray(value)) return void 0;
  const ranges = value.flatMap((range) => {
    if (Number.isFinite(range)) return [range];
    if (!isRecord(range)) return [];
    const endProperty = Number.isFinite(range.max)
      ? "max"
      : Number.isFinite(range.to)
        ? "to"
        : Number.isFinite(range.value)
          ? "value"
          : null;
    if (!endProperty) return [];
    const end = range[endProperty];
    if (Number.isFinite(range.min) && range.min > end) return [];
    return [compact({
      min: Number.isFinite(range.min) ? range.min : void 0,
      [endProperty]: end,
      label: typeof range.label === "string" ? range.label : void 0,
      color: nonemptyString(range.color)
    })];
  });
  return ranges.length > 0 ? ranges : void 0;
}
function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return void 0;
  const strings = value.flatMap((item) => nonemptyString(item) ? [item.trim()] : []);
  return strings.length > 0 ? strings : void 0;
}
function compact(value, omitEmptyObjects = false) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => (
    item !== void 0 && (!omitEmptyObjects || !isRecord(item) || Object.keys(item).length > 0)
  )));
}
function setOptional(target, property, value) {
  if (value === void 0) delete target[property];
  else target[property] = value;
}
function optionalNumber(value) {
  if (value === "") return void 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function commaSeparated(value, { retainEmpty = false } = {}) {
  if (typeof value !== "string") return retainEmpty ? [""] : [];
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : retainEmpty ? [""] : [];
}
function nonemptyString(value) {
  return typeof value === "string" && value.trim() ? value : void 0;
}
function fieldControlId(field) {
  return `chart-field-${safeId(field?.id)}`;
}
function fieldDescribedBy(field) {
  const id = fieldControlId(field);
  return [
    field?.help ? `${id}-help` : null,
    field?.error ? `${id}-error` : null,
    ...Array.isArray(field?.diagnosticIds)
      ? field.diagnosticIds.filter((diagnosticId) => typeof diagnosticId === "string" && diagnosticId)
      : []
  ].filter(Boolean).join(" ");
}
function fieldHasError(field) {
  return Boolean(field?.error) || Array.isArray(field?.diagnosticIds) && field.diagnosticIds.length > 0;
}
function objectToggle(id, describedBy, value, key, label, onChange) {
  const current = record(value);
  return /* @__PURE__ */ React.createElement("label", { className: "chart-authoring-inline-toggle" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      id,
      type: "checkbox",
      checked: current[key] === true,
      "aria-describedby": describedBy || void 0,
      onChange: (event) => onChange({ ...current, [key]: event.target.checked })
    }
  ), label);
}
function objectText(id, describedBy, value, key, placeholder, onChange) {
  const current = record(value);
  return /* @__PURE__ */ React.createElement(
    "input",
    {
      id,
      value: text(current[key]),
      placeholder,
      "aria-describedby": describedBy || void 0,
      onChange: (event) => onChange({ ...current, [key]: event.target.value })
    }
  );
}
function validField(field) {
  return field !== null && typeof field === "object" && typeof field.id === "string" && field.id.trim() !== "" && typeof field.label === "string" && field.label.trim() !== "";
}
function optionList(options) {
  if (!Array.isArray(options)) return [];
  return options.flatMap((option) => {
    if (Array.isArray(option) && option.length >= 2) {
      return [{ value: String(option[0]), label: String(option[1]) }];
    }
    if (option && typeof option === "object" && typeof option.value === "string" && typeof option.label === "string") {
      return [option];
    }
    return [];
  });
}
function columnOptions(columns) {
  return Array.isArray(columns) ? columns.flatMap((column) => typeof column?.name === "string" ? [{ value: column.name, label: column.name }] : []) : [];
}
function detectedLabel(field) {
  const option = optionList(field.options).find(({ value }) => value === field.detected);
  return option?.label ?? text(field.detected);
}
function safeId(value) {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_-]/g, "-") : "unknown";
}
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function scalar(value) {
  return ["string", "number"].includes(typeof value) ? String(value) : "";
}
function text(value) {
  return typeof value === "string" ? value : "";
}
function sentence(value) {
  return typeof value === "string" && value
    ? value[0].toUpperCase() + value.slice(1)
    : "";
}
function numeric(value) {
  return Number.isFinite(value) ? value : "";
}
function noop() {
}
export {
  FieldShell,
  GroupShell,
  StandardField as default,
  fieldHasError,
  fieldControlId,
  fieldDescribedBy,
  filterForOperator,
  updateStructuredFieldValue
};
