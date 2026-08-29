import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePortableQmdEditorDocument,
  serializePortableQmdEditorDocument,
} from "../src/static-content/qmd/portableQmdEditorDocument.js";

const REPRESENTABLE_SOURCE = [
  "A **bold**, *italic*, ++underlined++ [safe link](https://example.test/guide).",
  "",
  "::: {.simex-text-lead}",
  "Lead copy.",
  ":::",
  "",
  "## Heading",
  "",
  "### Subheading",
  "",
  "::: {.simex-text-caption}",
  "Caption copy.",
  ":::",
  "",
  "- First",
  "- Second",
  "",
  "1. One",
  "2. Two",
  "",
  "| Facility | Ready |",
  "| --- | --- |",
  "| North | Yes |",
  "",
  "![Local map](simex-media:map){width=50% align=center flow=block frame=outline caption=\"Map caption\" decorative=false}",
].join("\n");

test("representable Portable QMD round-trips through the visual document idempotently", () => {
  const parsed = parsePortableQmdEditorDocument(REPRESENTABLE_SOURCE);
  assert.equal(parsed.mode, "visual", parsed.reason);
  assert.equal(parsed.document.type, "doc");
  const nodeTypes = JSON.stringify(parsed.document);
  for (const type of ["paragraph", "heading", "lead", "caption", "bulletList", "orderedList", "table", "portableMedia"]) {
    assert.match(nodeTypes, new RegExp(`\\\"type\\\":\\\"${type}\\\"`), type);
  }
  for (const mark of ["bold", "italic", "underline", "link"]) {
    assert.match(nodeTypes, new RegExp(`\\\"type\\\":\\\"${mark}\\\"`), mark);
  }

  const first = serializePortableQmdEditorDocument(parsed.document);
  assert.equal(first.ok, true, JSON.stringify(first.errors));
  assert.match(first.source, /:::\s+\{\.simex-text-lead\}/);
  assert.match(first.source, /:::\s+\{\.simex-text-caption\}/);
  assert.match(first.source, /\+\+underlined\+\+/);
  assert.match(first.source, /simex-media:map/);
  const reparsed = parsePortableQmdEditorDocument(first.source);
  assert.equal(reparsed.mode, "visual", reparsed.reason);
  const second = serializePortableQmdEditorDocument(reparsed.document);
  assert.deepEqual(second, first);
});

test("unsupported valid QMD opens Advanced QMD without changing its exact source", () => {
  const cases = [
    "Inline math $x^2$ stays exact.",
    "::: {.callout-warning}\nTake care.\n:::",
    "```js\nconst safe = true;\n```",
    "A note.[^proof]\n\n[^proof]: Exact.",
    "<span data-authored=\"true\">inert markup</span>",
    "# Exact level-one heading",
    "#### Exact level-four heading",
    "| A | B |\n| --- | --- |\n| only-one-cell |",
  ];
  for (const source of cases) {
    const result = parsePortableQmdEditorDocument(source);
    assert.equal(result.mode, "advanced", source);
    assert.equal(result.source, source);
    assert.match(result.reason, /Advanced QMD/i);
  }
});

test("unsafe links cannot be serialized by the visual document bridge", () => {
  const result = serializePortableQmdEditorDocument({
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "unsafe", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
    }],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /link/i);
});

test("the visual serializer accepts only Composer Heading and Subheading levels", () => {
  for (const level of [1, 4, 5, 6]) {
    const result = serializePortableQmdEditorDocument({
      type: "doc",
      content: [{ type: "heading", attrs: { level }, content: [{ type: "text", text: "Unsupported" }] }],
    });
    assert.equal(result.ok, false, `h${level}`);
    assert.match(result.errors[0], /Heading|Subheading/);
  }
});

test("literal Markdown-like text stays literal through two visual serializations", () => {
  const literals = [
    "_literal emphasis_ and `literal code` and ~~literal strike~~.",
    "# literal heading",
    "- literal bullet",
    "1. literal numbered item",
    "> literal quote",
    "---",
    '<span data-authored="true">literal raw-looking markup</span>',
  ];
  const document = {
    type: "doc",
    content: literals.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  };

  const first = serializePortableQmdEditorDocument(document);
  assert.equal(first.ok, true, JSON.stringify(first.errors));
  const parsed = parsePortableQmdEditorDocument(first.source);
  assert.equal(parsed.mode, "visual", parsed.reason);
  assert.deepEqual(parsed.document, document);
  const second = serializePortableQmdEditorDocument(parsed.document);
  assert.deepEqual(second, first);
  const reparsed = parsePortableQmdEditorDocument(second.source);
  assert.deepEqual(reparsed.document, document);
});

test("aligned tables stay exact in Advanced QMD instead of losing alignment", () => {
  const source = [
    "| Start | Centre | End |",
    "| :--- | :---: | ---: |",
    "| A | B | C |",
  ].join("\n");
  const parsed = parsePortableQmdEditorDocument(source);
  assert.equal(parsed.mode, "advanced");
  assert.equal(parsed.source, source);
  assert.match(parsed.reason, /table shape/i);
});
