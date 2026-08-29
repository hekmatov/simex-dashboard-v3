import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { Editor } from "@tiptap/core";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const module = await vite.ssrLoadModule("/src/components/static-content/PortableQmdRichTextEditor.jsx").catch(() => null);
const freeTextModule = await vite.ssrLoadModule("/src/components/static-content/FreeTextSourceEditor.jsx").catch(() => null);
await vite.close();

test("the constrained Composer exposes every visible labelled authoring command", () => {
  assert.equal(typeof module?.default, "function");
  if (typeof module?.default !== "function") return;
  const html = renderToStaticMarkup(React.createElement(module.default, {
    source: "Composer text",
    onSourceChange() {},
    onMediaSelect() {},
  }));
  assert.match(html, /aria-label="Portable QMD Composer"/);
  assert.match(html, />Semantic text style</);
  for (const label of [
    "Paragraph", "Lead", "Heading", "Subheading", "Caption",
    "Bold", "Italic", "Underline", "Bullet list", "Numbered list",
    "Link", "Table", "Insert image", "Clear formatting", "Undo", "Redo",
  ]) assert.match(html, new RegExp(`(?:aria-label=\\\"${label}\\\"|>${label}<)`), label);
  assert.match(html, /aria-live="polite"/);
});

test("representable source opens Composer with the trimmed panel title in Preview", () => {
  const html = renderToStaticMarkup(React.createElement(freeTextModule.FreeTextSourceEditor, {
    value: "Ordinary **formatted** text.",
    panelTitle: "  Situation note  ",
  }));
  assert.match(html, /role="tab"[^>]*aria-selected="true"[^>]*>Composer</);
  assert.match(html, />Advanced QMD</);
  assert.match(html, /<h3>Situation note<\/h3>/);
  assert.doesNotMatch(html, /Canonical preview/);
});

test("unsupported valid source opens non-destructive Advanced QMD with the exact source", () => {
  const source = "```js\nconst exact = true;\n```";
  const html = renderToStaticMarkup(React.createElement(freeTextModule.FreeTextSourceEditor, { value: source }));
  assert.match(html, /role="tab"[^>]*aria-selected="true"[^>]*>Advanced QMD</);
  assert.match(html, /Advanced QMD is required/);
  assert.match(html, /<textarea[^>]*>```js\nconst exact = true;\n```<\/textarea>/);
});

test("the Tiptap extension set uses TableKit and the constrained semantic nodes", () => {
  assert.equal(typeof module?.createPortableQmdEditorExtensions, "function");
  if (typeof module?.createPortableQmdEditorExtensions !== "function") return;
  const editor = new Editor({ extensions: module.createPortableQmdEditorExtensions(), content: { type: "doc", content: [{ type: "paragraph" }] } });
  const names = [...Object.keys(editor.schema.nodes), ...Object.keys(editor.schema.marks)];
  for (const name of ["paragraph", "heading", "lead", "caption", "bold", "italic", "underline", "link", "bulletList", "orderedList", "table", "tableRow", "tableHeader", "tableCell", "portableMedia"]) {
    assert.ok(names.includes(name), `${name}: ${names.join(", ")}`);
  }
  editor.destroy();
});
