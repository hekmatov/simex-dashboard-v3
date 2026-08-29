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

test("Composer input rules and shortcuts cannot create unsupported schema", () => {
  const editor = new Editor({
    extensions: module.createPortableQmdEditorExtensions(),
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Boundary" }] }] },
  });
  const names = [...Object.keys(editor.schema.nodes), ...Object.keys(editor.schema.marks)];
  for (const unsupported of ["blockquote", "code", "codeBlock", "strike", "horizontalRule", "hardBreak"]) {
    assert.equal(names.includes(unsupported), false, unsupported);
  }
  assert.equal(editor.commands.setHeading({ level: 1 }), false);
  assert.equal(editor.commands.setHeading({ level: 2 }), true);
  assert.equal(editor.getJSON().content[0].attrs.level, 2);
  assert.equal(editor.commands.setHeading({ level: 4 }), false);
  assert.equal(editor.getJSON().content[0].attrs.level, 2);
  editor.destroy();
});

test("a serialization failure restores the last persistable document and returns a visible error", () => {
  assert.equal(typeof module?.reconcilePortableQmdEditorUpdate, "function");
  if (typeof module?.reconcilePortableQmdEditorUpdate !== "function") return;
  const stableDocument = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Stable text" }] }],
  };
  const editor = new Editor({ extensions: module.createPortableQmdEditorExtensions(), content: stableDocument });
  editor.commands.insertContent({ type: "portableMedia", attrs: { mediaId: "" } });
  const accepted = { source: "Stable text", document: stableDocument };
  const result = module.reconcilePortableQmdEditorUpdate({ editor, accepted });
  assert.equal(result.ok, false);
  assert.deepEqual(editor.getJSON(), stableDocument);
  assert.equal(result.accepted, accepted);
  assert.match(result.announcement, /could not be saved/i);
  assert.match(result.announcement, /restored/i);
  editor.destroy();
});

test("pending reasons override intrinsic Undo and Redo unavailability", () => {
  assert.equal(typeof module?.portableQmdComposerControlState, "function");
  if (typeof module?.portableQmdComposerControlState !== "function") return;
  const editor = new Editor({
    extensions: module.createPortableQmdEditorExtensions(),
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Stable" }] }] },
  });
  assert.deepEqual(module.portableQmdComposerControlState({ disabled: true, editor, action: "undo" }), {
    disabled: true,
    reason: "Text/Image authoring is unavailable while this draft action is pending.",
  });
  assert.deepEqual(module.portableQmdComposerControlState({ disabled: false, editor, action: "undo" }), {
    disabled: true,
    reason: "Nothing to undo.",
  });
  assert.deepEqual(module.portableQmdComposerControlState({ disabled: false, editor, action: "redo" }), {
    disabled: true,
    reason: "Nothing to redo.",
  });
  editor.destroy();
});
