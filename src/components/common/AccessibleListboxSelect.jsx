import React from "react";
import ControlTooltip from "./ControlTooltip.jsx";

export default function AccessibleListboxSelect({
  id = "",
  label = "",
  value = "",
  options = [],
  getLabel = defaultOptionLabel,
  getValue = defaultOptionValue,
  placeholder = "Choose an option",
  width = "24rem",
  disabled = false,
  defaultOpen = false,
  onChange = noop,
} = {}) {
  const reactId = React.useId().replaceAll(":", "");
  const baseId = normalizedId(id) || `accessible-listbox-${reactId}`;
  const labelId = `${baseId}-label`;
  const triggerId = `${baseId}-trigger`;
  const valueId = `${baseId}-value`;
  const listboxId = `${baseId}-listbox`;
  const rootRef = React.useRef(null);
  const optionRefs = React.useRef([]);
  const normalizedOptions = normalizeOptions(options, getLabel, getValue);
  const normalizedValue = scalarText(value);
  const selectedIndex = normalizedOptions.findIndex((option) => option.value === normalizedValue);
  const [open, setOpen] = React.useState(Boolean(defaultOpen) && !disabled && normalizedOptions.length > 0);
  const [activeIndex, setActiveIndex] = React.useState(() => (
    defaultOpen && !disabled && normalizedOptions.length > 0
      ? selectedIndex >= 0 ? selectedIndex : 0
      : -1
  ));

  React.useEffect(() => {
    if (disabled || normalizedOptions.length === 0) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (open && (activeIndex < 0 || activeIndex >= normalizedOptions.length)) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [activeIndex, disabled, normalizedOptions.length, open, selectedIndex]);

  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  React.useEffect(() => {
    scrollActiveListboxOptionIntoView({
      open,
      activeIndex,
      optionRefs: optionRefs.current,
    });
  }, [activeIndex, open]);

  const selectedLabel = selectedIndex >= 0
    ? normalizedOptions[selectedIndex].label
    : normalizedText(placeholder) || "Choose an option";
  const activeLabel = open && activeIndex >= 0
    ? normalizedOptions[activeIndex]?.label ?? selectedLabel
    : selectedLabel;
  const fixedWidth = normalizedWidth(width);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const selectIndex = (index) => {
    const option = normalizedOptions[index];
    if (!option) return;
    close();
    if (option.value !== normalizedValue) onChange(option.value);
  };

  const toggle = () => {
    if (disabled || normalizedOptions.length === 0) return;
    if (open) {
      close();
      return;
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    const action = getAccessibleListboxKeyAction({
      key: event.key,
      optionCount: normalizedOptions.length,
      selectedIndex,
      open,
      activeIndex,
    });
    if (!action.handled) return;
    if (action.preventDefault) event.preventDefault();
    setOpen(action.open);
    setActiveIndex(action.activeIndex);
    if (action.selectionIndex !== null) selectIndex(action.selectionIndex);
  };

  return (
    <div
      ref={rootRef}
      className="accessible-listbox-select"
      style={{ "--accessible-listbox-width": fixedWidth }}
    >
      <label id={labelId} htmlFor={triggerId} className="accessible-listbox-label">
        {normalizedText(label)}
      </label>
      <ControlTooltip
        explain
        reason={activeLabel}
        className="accessible-listbox-trigger-tooltip"
      >
        <button
          id={triggerId}
          type="button"
          className="accessible-listbox-trigger"
          role="combobox"
          aria-autocomplete="none"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeIndex >= 0
            ? `${baseId}-option-${activeIndex}`
            : undefined}
          aria-labelledby={`${labelId} ${valueId}`}
          disabled={disabled}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (open) close();
          }}
        >
          <span id={valueId} className="accessible-listbox-value">
            {selectedLabel}
          </span>
        </button>
      </ControlTooltip>
      <ul
        id={listboxId}
        className="accessible-listbox-popup"
        role="listbox"
        aria-labelledby={labelId}
        hidden={!open}
      >
        {normalizedOptions.map((option, index) => (
          <li
            ref={(node) => { optionRefs.current[index] = node; }}
            id={`${baseId}-option-${index}`}
            key={`${option.value}-${index}`}
            className="accessible-listbox-option"
            role="option"
            aria-selected={option.value === normalizedValue}
            data-active={index === activeIndex ? "true" : "false"}
            data-full-value={option.label}
            title={option.label}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => selectIndex(index)}
          >
            <span className="accessible-listbox-option-label">{option.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function getAccessibleListboxKeyAction({
  key = "",
  optionCount = 0,
  selectedIndex = -1,
  open = false,
  activeIndex = -1,
} = {}) {
  const count = Number.isInteger(optionCount) && optionCount > 0 ? optionCount : 0;
  const selected = validIndex(selectedIndex, count) ? selectedIndex : -1;
  const active = validIndex(activeIndex, count) ? activeIndex : -1;
  const closed = {
    handled: true,
    preventDefault: key !== "Tab",
    open: false,
    activeIndex: -1,
    selectionIndex: null,
  };
  const opened = (index) => ({
    handled: true,
    preventDefault: true,
    open: true,
    activeIndex: index,
    selectionIndex: null,
  });
  const unchanged = {
    handled: false,
    preventDefault: false,
    open: Boolean(open),
    activeIndex: active,
    selectionIndex: null,
  };

  if (key === "Escape") return open ? closed : unchanged;
  if (key === "Tab") return open ? closed : unchanged;
  if (count === 0) return unchanged;

  if (key === "ArrowDown") {
    return opened(open ? Math.min((active >= 0 ? active : 0) + 1, count - 1) : selected >= 0 ? selected : 0);
  }
  if (key === "ArrowUp") {
    return opened(open ? Math.max((active >= 0 ? active : count - 1) - 1, 0) : selected >= 0 ? selected : count - 1);
  }
  if (key === "Home") return opened(0);
  if (key === "End") return opened(count - 1);
  if (["Enter", " ", "Space", "Spacebar"].includes(key)) {
    if (!open) return opened(selected >= 0 ? selected : 0);
    const selectionIndex = active >= 0 ? active : selected >= 0 ? selected : 0;
    return {
      handled: true,
      preventDefault: true,
      open: false,
      activeIndex: -1,
      selectionIndex,
    };
  }
  return unchanged;
}

export function scrollActiveListboxOptionIntoView({
  open = false,
  activeIndex = -1,
  optionRefs = [],
} = {}) {
  if (!open || !Number.isInteger(activeIndex) || activeIndex < 0) return false;
  const activeOption = Array.isArray(optionRefs) ? optionRefs[activeIndex] : null;
  if (typeof activeOption?.scrollIntoView !== "function") return false;
  activeOption.scrollIntoView({ block: "nearest" });
  return true;
}

function normalizeOptions(options, getLabel, getValue) {
  if (!Array.isArray(options)) return [];
  const labelReader = typeof getLabel === "function" ? getLabel : defaultOptionLabel;
  const valueReader = typeof getValue === "function" ? getValue : defaultOptionValue;
  return options.flatMap((option, index) => {
    const optionValue = scalarText(valueReader(option, index));
    const optionLabel = normalizedText(labelReader(option, index));
    return optionValue !== "" && optionLabel !== ""
      ? [{ option, value: optionValue, label: optionLabel }]
      : [];
  });
}

function defaultOptionLabel(option) {
  return option?.label ?? option?.displayName ?? option?.value ?? option?.sourceId ?? "";
}

function defaultOptionValue(option) {
  return option?.value ?? option?.id ?? option?.sourceId ?? "";
}

function normalizedId(value) {
  return normalizedText(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function normalizedWidth(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return `${value}px`;
  return normalizedText(value) || "24rem";
}

function validIndex(value, count) {
  return Number.isInteger(value) && value >= 0 && value < count;
}

function normalizedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function scalarText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function noop() {}
