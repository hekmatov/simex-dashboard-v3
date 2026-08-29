import React from "react";
import { Node } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";

import ControlTooltip from "../common/ControlTooltip.jsx";
import { validatePortableHref } from "../../static-content/qmd/portableQmdPolicy.js";
import {
  parsePortableQmdEditorDocument,
  serializePortableQmdEditorDocument,
} from "../../static-content/qmd/portableQmdEditorDocument.js";
import { sanitizePortableQmdHtmlPaste } from "../../static-content/qmd/portableQmdHtmlPaste.js";

const Lead = fixedSemanticParagraph("lead", "portable-qmd-lead");
const Caption = fixedSemanticParagraph("caption", "portable-qmd-caption");
const PortableMedia = Node.create({
  name: "portableMedia",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      mediaId: { default: "" }, alt: { default: "" }, width: { default: "100%" },
      align: { default: "center" }, flow: { default: "block" }, frame: { default: "none" },
      caption: { default: "" }, decorative: { default: false },
    };
  },
  parseHTML() { return []; },
  renderHTML({ node }) {
    return ["span", {
      "data-portable-qmd-media": node.attrs.mediaId,
      "data-portable-qmd-media-alt": node.attrs.alt,
      contenteditable: "false",
    }, node.attrs.decorative ? "Decorative image" : node.attrs.alt || "Local image"];
  },
});

export function createPortableQmdEditorExtensions() {
  return [
    StarterKit.configure({ link: false, underline: false }),
    Underline,
    Link.configure({ openOnClick: false, autolink: false, linkOnPaste: false, protocols: ["http", "https"] }),
    TableKit.configure({ table: { resizable: false, allowTableNodeSelection: true } }),
    Lead,
    Caption,
    PortableMedia,
  ];
}

export default function PortableQmdRichTextEditor({
  source = "",
  disabled = false,
  onSourceChange,
  onMediaSelect,
} = {}) {
  const parsed = React.useMemo(() => parsePortableQmdEditorDocument(source), [source]);
  const [announcement, setAnnouncement] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState("");
  const [linkError, setLinkError] = React.useState("");
  const lastEmitted = React.useRef(source);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: createPortableQmdEditorExtensions(),
    content: parsed.mode === "visual" ? parsed.document : { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        id: "portable-qmd-composer-surface",
        "aria-label": "Portable QMD Composer editing area",
        class: "portable-qmd-composer__surface",
      },
      handlePaste(view, event) {
        const html = event.clipboardData?.getData("text/html");
        if (!html) return false;
        event.preventDefault();
        const imported = sanitizePortableQmdHtmlPaste(html);
        const nodes = imported.document.content.map((node) => view.state.schema.nodeFromJSON(node));
        const slice = new Slice(Fragment.fromArray(nodes), 0, 0);
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        setAnnouncement(imported.removed.length
          ? "Some unsupported paste formatting was removed; the visible text was kept where possible."
          : "Formatted content pasted.");
        return true;
      },
    },
    onUpdate({ editor: current }) {
      const serialized = serializePortableQmdEditorDocument(current.getJSON());
      if (!serialized.ok || serialized.source === lastEmitted.current) return;
      lastEmitted.current = serialized.source;
      onSourceChange?.(serialized.source);
    },
  });

  React.useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
  React.useEffect(() => {
    if (!editor || parsed.mode !== "visual" || source === lastEmitted.current) return;
    lastEmitted.current = source;
    editor.commands.setContent(parsed.document, { emitUpdate: false });
  }, [editor, parsed, source]);

  const command = (callback) => {
    if (disabled || !editor) return;
    callback(editor.chain().focus()).run();
  };
  const applyLink = () => {
    const href = validatePortableHref(linkValue);
    if (!href) {
      setLinkError("Enter an HTTP, HTTPS, or local #heading destination.");
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkError("");
    setLinkOpen(false);
  };
  const disabledReason = "Text/Image authoring is unavailable while this draft action is pending.";

  return (
    <section
      className="portable-qmd-composer"
      aria-label="Portable QMD Composer"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setLinkValue(editor?.getAttributes("link")?.href ?? "");
          setLinkOpen(true);
        }
      }}
    >
      <div role="toolbar" aria-label="Composer formatting" className="portable-qmd-composer__toolbar">
        <label>
          <span>Semantic text style</span>
          <select
            aria-label="Semantic text style"
            disabled={disabled || !editor}
            value={currentSemanticStyle(editor)}
            onChange={(event) => applySemanticStyle(editor, event.target.value)}
          >
            <option value="paragraph">Paragraph</option>
            <option value="lead">Lead</option>
            <option value="heading">Heading</option>
            <option value="subheading">Subheading</option>
            <option value="caption">Caption</option>
          </select>
        </label>
        <ComposerButton label="Bold" pressed={editor?.isActive("bold")} disabled={disabled || !editor} reason={disabledReason} onClick={() => command((chain) => chain.toggleBold())} />
        <ComposerButton label="Italic" pressed={editor?.isActive("italic")} disabled={disabled || !editor} reason={disabledReason} onClick={() => command((chain) => chain.toggleItalic())} />
        <ComposerButton label="Underline" pressed={editor?.isActive("underline")} disabled={disabled || !editor} reason={disabledReason} onClick={() => command((chain) => chain.toggleUnderline())} />
        <ComposerButton label="Bullet list" pressed={editor?.isActive("bulletList")} disabled={disabled || !editor} reason={disabledReason} onClick={() => command((chain) => chain.toggleBulletList())} />
        <ComposerButton label="Numbered list" pressed={editor?.isActive("orderedList")} disabled={disabled || !editor} reason={disabledReason} onClick={() => command((chain) => chain.toggleOrderedList())} />
        <ComposerButton label="Link" pressed={editor?.isActive("link")} disabled={disabled || !editor} reason={disabledReason} onClick={() => {
          setLinkValue(editor?.getAttributes("link")?.href ?? ""); setLinkError(""); setLinkOpen(true);
        }} />
        <ComposerButton label="Table" disabled={disabled || !editor} reason={disabledReason} onClick={() => command((chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))} />
        <ComposerButton label="Insert image" disabled={disabled} reason={disabledReason} onClick={() => onMediaSelect?.()} />
        <ComposerButton label="Clear formatting" disabled={disabled || !editor} reason={disabledReason} onClick={() => command((chain) => chain.unsetAllMarks().clearNodes())} />
        <ComposerButton label="Undo" disabled={disabled || !editor?.can().undo()} reason={disabledReason} onClick={() => command((chain) => chain.undo())} />
        <ComposerButton label="Redo" disabled={disabled || !editor?.can().redo()} reason={disabledReason} onClick={() => command((chain) => chain.redo())} />
      </div>
      {linkOpen && (
        <div className="portable-qmd-composer__link-editor" role="group" aria-label="Link editor">
          <label htmlFor="portable-qmd-link-destination">Link destination</label>
          <input
            id="portable-qmd-link-destination"
            value={linkValue}
            aria-invalid={linkError ? "true" : undefined}
            aria-describedby={linkError ? "portable-qmd-link-error" : undefined}
            onChange={(event) => setLinkValue(event.target.value)}
          />
          {linkError && <p id="portable-qmd-link-error" className="form-error">{linkError}</p>}
          <button type="button" onClick={applyLink}>Apply link</button>
          <button type="button" className="secondary" onClick={() => { editor?.chain().focus().unsetLink().run(); setLinkOpen(false); setLinkError(""); }}>Remove link</button>
          <button type="button" className="secondary" onClick={() => { setLinkOpen(false); setLinkError(""); }}>Cancel</button>
        </div>
      )}
      <EditorContent editor={editor} />
      <p className="portable-qmd-composer__announcement" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}

function ComposerButton({ label, pressed, disabled, reason, onClick }) {
  return (
    <ControlTooltip disabled={disabled} reason={reason}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed === undefined ? undefined : Boolean(pressed)}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      >{label}</button>
    </ControlTooltip>
  );
}

function fixedSemanticParagraph(name, className) {
  return Node.create({
    name,
    group: "block",
    content: "inline*",
    parseHTML() { return [{ tag: `p[data-simex-text-style=\"${name}\"]` }]; },
    renderHTML() { return ["p", { class: className, "data-simex-text-style": name }, 0]; },
  });
}

function currentSemanticStyle(editor) {
  if (!editor) return "paragraph";
  if (editor.isActive("lead")) return "lead";
  if (editor.isActive("caption")) return "caption";
  if (editor.isActive("heading", { level: 2 })) return "heading";
  if (editor.isActive("heading", { level: 3 })) return "subheading";
  return "paragraph";
}

function applySemanticStyle(editor, style) {
  if (!editor) return;
  const chain = editor.chain().focus();
  if (style === "lead") chain.setNode("lead").run();
  else if (style === "caption") chain.setNode("caption").run();
  else if (style === "heading") chain.setHeading({ level: 2 }).run();
  else if (style === "subheading") chain.setHeading({ level: 3 }).run();
  else chain.setParagraph().run();
}
