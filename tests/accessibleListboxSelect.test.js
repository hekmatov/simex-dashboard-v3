import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const viteModuleUrl = import.meta.resolve("vite");
register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    const { transformWithEsbuild } = await import(${JSON.stringify(viteModuleUrl)});
    const transformed = await transformWithEsbuild(loaded.source.toString(), url, { loader: "jsx", format: "esm" });
    return { format: "module", source: transformed.code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const {
  default: AccessibleListboxSelect,
  getAccessibleListboxKeyAction,
  scrollActiveListboxOptionIntoView,
} = await import("../src/components/common/AccessibleListboxSelect.jsx");

test("select-only listbox exposes fixed-width combobox semantics and complete truncated values", () => {
  const longLabel = "Municipal infections reported across every participating simulation municipality";
  const html = renderToStaticMarkup(React.createElement(AccessibleListboxSelect, {
    label: "Managed data source",
    value: "municipal",
    width: "22rem",
    defaultOpen: true,
    options: [
      { value: "cases", label: "Cases" },
      { value: "municipal", label: longLabel },
    ],
    getLabel: ({ label }) => label,
    onChange: () => {},
  }));

  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-controls="[^"]+"/);
  assert.match(html, /aria-activedescendant="[^"]+"/);
  assert.match(html, /role="listbox"/);
  assert.equal([...html.matchAll(/role="option"/g)].length, 2);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /role="tooltip"/);
  assert.match(html, new RegExp(`data-full-value="${longLabel}"`));
  assert.match(html, new RegExp(`title="${longLabel}"`));
  assert.match(html, /data-control-tooltip-kind="explanation"/);
  assert.match(html, /style="--accessible-listbox-width:22rem"/);
  assert.doesNotMatch(html, /type="search"|role="searchbox"|<input/i);

  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.accessible-listbox-select\s*\{[^}]*width:\s*var\(--accessible-listbox-width/s);
  assert.match(styles, /\.accessible-listbox-popup\s*\{[^}]*width:\s*100%/s);
  assert.match(
    styles,
    /\.accessible-listbox-value,\s*\.accessible-listbox-option-label\s*\{[^}]*text-overflow:\s*ellipsis/s,
  );
  assert.match(styles, /\.accessible-listbox-trigger:focus-visible\s*\{[^}]*outline:/s);
  assert.match(styles, /\.control-tooltip\[data-control-tooltip-anchor="true"\]:hover[^}]*\.control-tooltip__reason/s);
  assert.doesNotMatch(styles, /\.control-tooltip[^,{]*(?::focus|:focus-within|:focus-visible)/s);
});

test("listbox key actions support Arrow, Home, End, Enter, Space, Escape, and Tab", () => {
  const action = (key, state = {}) => getAccessibleListboxKeyAction({
    key,
    optionCount: 3,
    selectedIndex: 1,
    open: false,
    activeIndex: -1,
    ...state,
  });

  assert.deepEqual(action("ArrowDown"), {
    handled: true,
    preventDefault: true,
    open: true,
    activeIndex: 1,
    selectionIndex: null,
  });
  assert.equal(action("ArrowDown", { open: true, activeIndex: 1 }).activeIndex, 2);
  assert.equal(action("ArrowUp", { open: true, activeIndex: 1 }).activeIndex, 0);
  assert.equal(action("ArrowUp", { selectedIndex: -1 }).activeIndex, 2);
  assert.equal(action("Home", { open: true, activeIndex: 2 }).activeIndex, 0);
  assert.equal(action("End", { open: true, activeIndex: 0 }).activeIndex, 2);

  assert.deepEqual(action("Enter", { open: true, activeIndex: 2 }), {
    handled: true,
    preventDefault: true,
    open: false,
    activeIndex: -1,
    selectionIndex: 2,
  });
  assert.deepEqual(action(" "), {
    handled: true,
    preventDefault: true,
    open: true,
    activeIndex: 1,
    selectionIndex: null,
  });
  assert.equal(action("Spacebar", { open: true, activeIndex: 0 }).selectionIndex, 0);
  assert.deepEqual(action("Escape", { open: true, activeIndex: 2 }), {
    handled: true,
    preventDefault: true,
    open: false,
    activeIndex: -1,
    selectionIndex: null,
  });
  assert.deepEqual(action("Tab", { open: true, activeIndex: 2 }), {
    handled: true,
    preventDefault: false,
    open: false,
    activeIndex: -1,
    selectionIndex: null,
  });
});

test("open listbox scrolls the active option into view without moving DOM focus", () => {
  assert.equal(typeof scrollActiveListboxOptionIntoView, "function");
  const scrollCalls = [];
  let focusCalls = 0;
  const optionRefs = [
    { scrollIntoView: () => scrollCalls.push("first") },
    {
      scrollIntoView: (options) => scrollCalls.push(options),
      focus: () => { focusCalls += 1; },
    },
  ];

  assert.equal(scrollActiveListboxOptionIntoView({
    open: true,
    activeIndex: 1,
    optionRefs,
  }), true);
  assert.deepEqual(scrollCalls, [{ block: "nearest" }]);
  assert.equal(focusCalls, 0);

  assert.equal(scrollActiveListboxOptionIntoView({
    open: false,
    activeIndex: 0,
    optionRefs,
  }), false);
  assert.equal(scrollActiveListboxOptionIntoView({
    open: true,
    activeIndex: 3,
    optionRefs,
  }), false);
  assert.deepEqual(scrollCalls, [{ block: "nearest" }]);
});
