import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

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

test("the Composer keeps its familiar format rail commands in accessible groups", () => {
  const html = renderToStaticMarkup(React.createElement(module.default, {
    source: "Composer text",
    onSourceChange() {},
    onMediaSelect() {},
  }));
  assert.match(html, /data-qmd-format-rail="true"/);
  for (const label of ["Text style", "Inline formatting", "Block formatting", "Insert content", "History"]) {
    assert.match(html, new RegExp(`role="group"[^>]*aria-label="${label}"`), label);
  }
});

test("representable source uses the single-card writer layout without authoring tabs or a status panel", () => {
  const html = renderToStaticMarkup(React.createElement(freeTextModule.FreeTextSourceEditor, {
    value: "Ordinary **formatted** text.",
    panelTitle: "  Situation note  ",
  }));
  assert.match(html, />Write a text post</);
  assert.match(html, />Rendered preview</);
  assert.match(html, />Portable Markdown</);
  assert.doesNotMatch(html, /role="tab"/);
  assert.doesNotMatch(html, /Preview is up to date\./);
});

test("unsupported valid source remains visible in the Portable Markdown card without restoring authoring tabs", () => {
  const source = "```js\nconst exact = true;\n```";
  const html = renderToStaticMarkup(React.createElement(freeTextModule.FreeTextSourceEditor, { value: source }));
  assert.match(html, />Portable Markdown</);
  assert.match(html, /```js\nconst exact = true;\n```/);
  assert.doesNotMatch(html, /role="tab"/);
});

test("the Tiptap extension set uses TableKit and the constrained semantic nodes", () => {
  assert.equal(typeof module?.createPortableQmdEditorExtensions, "function");
  if (typeof module?.createPortableQmdEditorExtensions !== "function") return;
  const editor = new Editor({ extensions: module.createPortableQmdEditorExtensions(), content: { type: "doc", content: [{ type: "paragraph" }] } });
  const names = [...Object.keys(editor.schema.nodes), ...Object.keys(editor.schema.marks)];
  for (const name of ["paragraph", "heading", "lead", "caption", "bold", "italic", "underline", "link", "bulletList", "orderedList", "table", "tableRow", "tableHeader", "tableCell", "portableMedia"]) {
    assert.ok(names.includes(name), `${name}: ${names.join(", ")}`);
  }
  const media = editor.schema.nodes.portableMedia.create({ mediaId: "map", alt: "Field map" });
  assert.equal(media.isAtom, true);
  assert.equal(NodeSelection.isSelectable(media), true);
  const dom = media.type.spec.toDOM(media);
  assert.equal(dom[2][2], "Field map");
  assert.equal(dom[2][1].contenteditable, "false");
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
