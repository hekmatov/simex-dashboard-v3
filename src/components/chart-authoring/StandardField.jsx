import React from "react";
import { IconControl } from "../common/SimExIcon.js";
const STRUCTURED_CONTROLS = new Set(["labels", "axes", "targets", "map", "timeline"]);
const AXIS_PROPERTIES = new Set(["title", "name", "min", "max", "grid", "xTitle", "yTitle", "titlePosition", "titleOrientation", "titleFontSize", "titleBold", "titleOffsetX", "titleOffsetY", "tickFrequency"]);
const X_AXIS_PROPERTIES = new Set(["title", "min", "max", "labelPreset", "tickFrequency"]);
const EXACT_MONTH_TICK_FREQUENCIES = Object.freeze([1, 2, 3]);
const FILTER_OPERATORS = new Set(["equals", "notEquals", "contains", "in", "notIn", "range"]);
function StandardField({
  field,
  value = field?.value,
  onChange = noop,
  columns = []
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
      filterControls(value, columns, onChange)
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
      control = /* @__PURE__ */ React.createElement("select", { ...shared, value: scalar(value ?? "first"), onChange: (event) => onChange(event.target.value) }, optionList([
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
  return /* @__PURE__ */ React.createElement("div", { className: `chart-authoring-field ${className}`.trim(), "data-field-id": field.id, "aria-invalid": fieldHasError(field) ? "true" : void 0 }, /* @__PURE__ */ React.createElement("label", { htmlFor: id }, field.label, field.required ? /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, " *") : null), field.detected ? /* @__PURE__ */ React.createElement("small", { className: "chart-authoring-detected" }, "Detected: ", detectedLabel(field)) : null, children, field.help ? /* @__PURE__ */ React.createElement("small", { id: `${id}-help` }, field.help) : null, field.error ? /* @__PURE__ */ React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null);
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
    /* @__PURE__ */ React.createElement(
      "legend",
      null,
      field.label,
      field.required ? /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, " *") : null
    ),
    field.detected ? /* @__PURE__ */ React.createElement("small", { className: "chart-authoring-detected" }, "Detected: ", detectedLabel(field)) : null,
    children,
    field.help ? /* @__PURE__ */ React.createElement("small", { id: `${id}-help` }, field.help) : null,
    field.error ? /* @__PURE__ */ React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null
  );
}
function filterControls(value, columns, onChange) {
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
      filterOperandControl(filter, (nextFilter) => replace(index, nextFilter)),
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
function filterOperandControl(filter, onChange) {
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
    onChange: (event) => onChange({ ...normalized, value: event.target.value })
  }));
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
function structuredControls(control, value, onChange, field = {}) {
  const current = sanitizeStructuredValue(control, value);
  const emit = (path, nextValue) => onChange(
    updateStructuredFieldValue(control, current, path, nextValue)
  );
  if (control === "labels") {
    return /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-control-grid dashboard-authoring-grid" }, inlineToggle(
      "Show labels",
      current.visible === true,
      (checked) => emit(["visible"], checked)
    ), /* @__PURE__ */ React.createElement("label", null, "Label position", /* @__PURE__ */ React.createElement("select", {
      value: current.position ?? "",
      onChange: (event) => emit(["position"], event.target.value)
    }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Automatic"), ["top", "bottom", "left", "right", "inside", "center"].map((position) => /* @__PURE__ */ React.createElement("option", { key: position, value: position }, sentence(position))))), /* @__PURE__ */ React.createElement("label", null, "Label format", /* @__PURE__ */ React.createElement("input", {
      value: current.format ?? "",
      placeholder: "{value}",
      onChange: (event) => emit(["format"], event.target.value)
    })));
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
    return /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-control-grid dashboard-authoring-grid" }, /* @__PURE__ */ React.createElement("label", null, "Target direction", /* @__PURE__ */ React.createElement("select", {
      value: current.direction ?? "",
      onChange: (event) => emit(["direction"], event.target.value)
    }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Not specified"), /* @__PURE__ */ React.createElement("option", { value: "increase-is-good" }, "Increase is good"), /* @__PURE__ */ React.createElement("option", { value: "decrease-is-good" }, "Decrease is good"), /* @__PURE__ */ React.createElement("option", { value: "neutral" }, "Neutral"))), /* @__PURE__ */ React.createElement("label", null, "Target ranges", /* @__PURE__ */ React.createElement("input", {
      value: Array.isArray(current.ranges) ? current.ranges.filter(Number.isFinite).join(", ") : "",
      placeholder: "50, 80, 100",
      onChange: (event) => emit(["ranges"], commaSeparated(event.target.value).map(Number).filter(Number.isFinite))
    })));
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
    selectControl("Title position", value.titlePosition ?? "center", ["top", "center", "bottom"], (nextValue) => emit([axis, "titlePosition"], nextValue)),
    selectControl("Title orientation", value.titleOrientation ?? "vertical", ["vertical", "horizontal"], (nextValue) => emit([axis, "titleOrientation"], nextValue)),
    fontSizeControl(value.titleFontSize ?? 14, (nextValue) => emit([axis, "titleFontSize"], nextValue)),
    inlineToggle("Bold", value.titleBold === true, (checked) => emit([axis, "titleBold"], checked)),
    boundedNumericControl("Horizontal offset", value.titleOffsetX, -96, 96, (nextValue) => emit([axis, "titleOffsetX"], nextValue)),
    boundedNumericControl("Vertical offset", value.titleOffsetY, -96, 96, (nextValue) => emit([axis, "titleOffsetY"], nextValue)),
    numericControl("Minimum", value.min, (nextValue) => emit([axis, "min"], nextValue)),
    numericControl("Maximum", value.max, (nextValue) => emit([axis, "max"], nextValue)),
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
    React.createElement("label", { htmlFor: id }, field.label),
    field.help ? React.createElement("small", { id: `${id}-help` }, field.help) : null,
    field.error ? React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null,
  );
}
function selectControl(label, value, options, onChange) {
  return React.createElement("label", null, label, React.createElement("select", {
    value,
    onChange: (event) => onChange(event.target.value),
  }, options.map((option) => React.createElement("option", { key: option, value: option }, sentence(option)))));
}
function numericControl(label, value, onChange) {
  return React.createElement("label", null, label, React.createElement("input", {
    type: "number",
    value: numeric(value),
    onChange: (event) => onChange(optionalNumber(event.target.value)),
  }));
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
function fontSizeControl(value, onChange) {
  const size = Number.isInteger(value) ? Math.min(24, Math.max(10, value)) : 14;
  return React.createElement("div", { className: "chart-authoring-axis-title-size" },
    React.createElement("span", null, "Title font size"),
    React.createElement("button", {
      type: "button",
      "aria-label": "Decrease title font size",
      disabled: size <= 10,
      onClick: () => onChange(size - 1),
    }, "−"),
    React.createElement("output", null, size),
    React.createElement("button", {
      type: "button",
      "aria-label": "Increase title font size",
      disabled: size >= 24,
      onClick: () => onChange(size + 1),
    }, "+"),
  );
}
function xAxisControls(value, kind, emit) {
  const ranged = kind === "temporal" || kind === "number";
  return /* @__PURE__ */ React.createElement("fieldset", { className: "chart-authoring-axis-group dashboard-authoring-grid" }, /* @__PURE__ */ React.createElement("legend", null, "X axis"), textControl("X-axis title", value.title, (nextValue) => emit(["x", "title"], nextValue)), ranged ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Minimum", /* @__PURE__ */ React.createElement("input", {
    type: kind === "temporal" ? "datetime-local" : "number",
    value: kind === "number" ? numeric(value.min) : text(value.min),
    onChange: (event) => emit(["x", "min"], kind === "number" ? optionalNumber(event.target.value) : event.target.value)
  })), /* @__PURE__ */ React.createElement("label", null, "Maximum", /* @__PURE__ */ React.createElement("input", {
    type: kind === "temporal" ? "datetime-local" : "number",
    value: kind === "number" ? numeric(value.max) : text(value.max),
    onChange: (event) => emit(["x", "max"], kind === "number" ? optionalNumber(event.target.value) : event.target.value)
  }))) : null, kind === "temporal" ? /* @__PURE__ */ React.createElement("label", null, "Label format", /* @__PURE__ */ React.createElement("select", {
    value: value.labelPreset ?? "adaptive",
    onChange: (event) => emit(["x", "labelPreset"], event.target.value)
  }, [["adaptive", "Adaptive / current hierarchy"], ["ddMmmYearBoundary", "DD MMM (year boundary)"], ["ddMmYyyy", "DD-MM-YYYY"], ["ddMmYy", "DD-MM-YY"], ["hhMm", "HH:mm"], ["ddMmYyyyHhMm", "DD-MM-YYYY HH:mm"]].map(([preset, label]) => /* @__PURE__ */ React.createElement("option", { key: preset, value: preset }, label)))) : null, tickControls("x", value.tickFrequency, kind, emit));
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
    labels: path.length === 1 && ["visible", "position", "format"].includes(section),
    axes: path.length === 2 && ((["primary", "secondary"].includes(section) && AXIS_PROPERTIES.has(property)) || (section === "x" && X_AXIS_PROPERTIES.has(property))),
    targets: path.length === 1 && ["ranges", "direction"].includes(section),
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
  if (control === "axes" && ["titleFontSize", "titleOffsetX", "titleOffsetY"].includes(property)) {
    return Number.isFinite(value) ? value : void 0;
  }
  if (control === "targets" && property === "ranges") {
    return sanitizeRanges(value);
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
      format: nonemptyString(current.format)
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
        : void 0
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
    else if (property === "tickFrequency" && sanitizeTickFrequency(value[property])) axis[property] = sanitizeTickFrequency(value[property]);
    else if (property === "title" && nonemptyString(value[property])) axis[property] = value[property];
    else if (!["grid", "titleBold", "min", "max", "titleFontSize", "titleOffsetX", "titleOffsetY", "title"].includes(property) && nonemptyString(value[property])) axis[property] = value[property].trim();
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
