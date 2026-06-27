import React from "react";

const LAYOUT_CLASS = {
  "single-column": "layout-grid layout-single",
  "two-column": "layout-grid layout-two-column",
  "two-by-two": "layout-grid layout-two-by-two",
  "focus-plus-grid": "layout-grid layout-focus-plus-grid",
};

export default function LayoutGrid({ layout, children }) {
  return (
    <section className={LAYOUT_CLASS[layout] ?? LAYOUT_CLASS["two-column"]}>
      {children}
    </section>
  );
}
