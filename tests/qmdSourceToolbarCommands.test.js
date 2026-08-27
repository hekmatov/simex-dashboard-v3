import assert from "node:assert/strict";
import test from "node:test";

import { applyQmdToolbarCommand } from "../src/static-content/qmd/sourceToolbarCommands.js";

test("font choice applies semantic heading or body text to selected lines", () => {
  assert.deepEqual(
    applyQmdToolbarCommand("# Overview\nDetails", 0, 18, { type: "font", value: "heading-2" }),
    { source: "## Overview\n## Details", selectionStart: 0, selectionEnd: 22 },
  );
  assert.deepEqual(
    applyQmdToolbarCommand("## Overview", 0, 11, { type: "font", value: "body" }),
    { source: "Overview", selectionStart: 0, selectionEnd: 8 },
  );
});

test("basic inline formatting is inserted without changing the selected text", () => {
  assert.deepEqual(
    applyQmdToolbarCommand("Brief", 0, 5, { type: "wrap", before: "**", after: "**", placeholder: "bold text" }),
    { source: "**Brief**", selectionStart: 2, selectionEnd: 7 },
  );
  assert.deepEqual(
    applyQmdToolbarCommand("Brief", 0, 5, { type: "wrap", before: "*", after: "*", placeholder: "italic text" }),
    { source: "*Brief*", selectionStart: 1, selectionEnd: 6 },
  );
  assert.deepEqual(
    applyQmdToolbarCommand("Brief", 0, 5, { type: "wrap", before: "++", after: "++", placeholder: "underlined text" }),
    { source: "++Brief++", selectionStart: 2, selectionEnd: 7 },
  );
});

test("bullets toggle by selected line and a simple table inserts editable cells", () => {
  assert.deepEqual(
    applyQmdToolbarCommand("First\nSecond", 0, 12, { type: "line-prefix", prefix: "- " }),
    { source: "- First\n- Second", selectionStart: 0, selectionEnd: 16 },
  );
  assert.deepEqual(
    applyQmdToolbarCommand("", 0, 0, { type: "table" }),
    {
      source: "| Column 1 | Column 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |",
      selectionStart: 40,
      selectionEnd: 46,
    },
  );
});
