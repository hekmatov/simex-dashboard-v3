import React from "react";
import { Node } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
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
const PENDING_REASON = "Text/Image authoring is unavailable while this draft action is pending.";
const LOADING_REASON = "The Composer is still loading.";
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
    const label = node.attrs.decorative ? "Decorative image" : node.attrs.alt || "Local image";
    return ["span", {
      "data-portable-qmd-media": node.attrs.mediaId,
      "data-portable-qmd-media-alt": node.attrs.alt,
      contenteditable: "true",
    }, ["span", { contenteditable: "false" }, label]];
  },
});

export function createPortableQmdEditorExtensions() {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      hardBreak: false,
      heading: { levels: [2, 3] },
      horizontalRule: false,
      link: false,
      strike: false,
      underline: false,
    }),
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
  const [announcement, setAnnouncement] = React.useState({ message: "", kind: "status" });
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState("");
  const [linkError, setLinkError] = React.useState("");
  const disabledRef = React.useRef(disabled);
  disabledRef.current = disabled;
  const acceptedRef = React.useRef({
    source,
    document: parsed.mode === "visual" ? parsed.document : { type: "doc", content: [{ type: "paragraph" }] },
  });
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
        if (disabledRef.current) {
          setAnnouncement({ message: PENDING_REASON, kind: "status" });
          return true;
        }
        const imported = sanitizePortableQmdHtmlPaste(html);
        const nodes = imported.document.content.map((node) => view.state.schema.nodeFromJSON(node));
        const slice = new Slice(Fragment.fromArray(nodes), 0, 0);
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        setAnnouncement({
          message: imported.removed.length
            ? "Some unsupported paste formatting was removed; the visible text was kept where possible."
            : "Formatted content pasted.",
          kind: "status",
        });
        return true;
      },
    },
    onUpdate({ editor: current }) {
      const result = reconcilePortableQmdEditorUpdate({
        editor: current,
        accepted: acceptedRef.current,
        onSourceChange,
      });
      acceptedRef.current = result.accepted;
      if (result.announcement) {
        setAnnouncement({ message: result.announcement, kind: result.ok ? "status" : "error" });
      }
    },
  });

  React.useEffect(() => { editor?.setEditable(!disabled, false); }, [disabled, editor]);
  React.useEffect(() => {
    if (!editor || parsed.mode !== "visual" || source === acceptedRef.current.source) return;
    acceptedRef.current = { source, document: parsed.document };
    editor.commands.setContent(parsed.document, { emitUpdate: false });
  }, [editor, parsed, source]);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      semanticStyle: currentSemanticStyle(current),
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      underline: current?.isActive("underline") ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      link: current?.isActive("link") ?? false,
      table: current?.isActive("table") ?? false,
    }),
  });

  const command = (callback) => {
    if (disabled || !editor) return;
    callback(editor.chain().focus()).run();
  };
  const applyLink = () => {
    if (disabledRef.current || !editor) return;
    const href = validatePortableHref(linkValue);
    if (!href) {
      setLinkError("Enter an HTTP, HTTPS, or local #heading destination.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkError("");
    setLinkOpen(false);
  };
  const standardState = portableQmdComposerControlState({ disabled, editor });
  const undoState = portableQmdComposerControlState({ disabled, editor, action: "undo" });
  const redoState = portableQmdComposerControlState({ disabled, editor, action: "redo" });
  const wordCount = countWords(source);

  return (
    <section
      className="portable-qmd-composer"
      aria-label="Portable QMD Composer"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          if (disabledRef.current || !editor) return;
          setLinkValue(editor?.getAttributes("link")?.href ?? "");
          setLinkOpen(true);
        }
      }}
    >
      <div role="toolbar" aria-label="Composer formatting" className="portable-qmd-composer__toolbar" data-qmd-format-rail="true">
        <div className="portable-qmd-composer__toolbar-group" role="group" aria-label="Text style">
          <ControlTooltip disabled={standardState.disabled} reason={standardState.reason}>
            <label>
              <span>Semantic text style</span>
              <select
                id="portable-qmd-semantic-style"
                aria-label="Semantic text style"
                disabled={standardState.disabled}
                value={toolbarState.semanticStyle}
                onChange={(event) => { if (!disabledRef.current) applySemanticStyle(editor, event.target.value); }}
              >
                <option value="paragraph">Paragraph</option>
                <option value="lead">Lead</option>
                <option value="heading">Heading</option>
                <option value="subheading">Subheading</option>
                <option value="caption">Caption</option>
              </select>
            </label>
          </ControlTooltip>
        </div>
        <div className="portable-qmd-composer__toolbar-group" role="group" aria-label="Inline formatting">
          <ComposerButton label="Bold" pressed={toolbarState.bold} {...standardState} onClick={() => command((chain) => chain.toggleBold())} />
          <ComposerButton label="Italic" pressed={toolbarState.italic} {...standardState} onClick={() => command((chain) => chain.toggleItalic())} />
          <ComposerButton label="Underline" pressed={toolbarState.underline} {...standardState} onClick={() => command((chain) => chain.toggleUnderline())} />
          <ComposerButton label="Link" pressed={toolbarState.link} {...standardState} onClick={() => {
            setLinkValue(editor?.getAttributes("link")?.href ?? ""); setLinkError(""); setLinkOpen(true);
          }} />
          <ComposerButton label="Clear formatting" {...standardState} onClick={() => command((chain) => chain.unsetAllMarks().clearNodes())} />
        </div>
        <div className="portable-qmd-composer__toolbar-group" role="group" aria-label="Block formatting">
          <ComposerButton label="Bullet list" pressed={toolbarState.bulletList} {...standardState} onClick={() => command((chain) => chain.toggleBulletList())} />
          <ComposerButton label="Numbered list" pressed={toolbarState.orderedList} {...standardState} onClick={() => command((chain) => chain.toggleOrderedList())} />
          <ComposerButton label="Table" pressed={toolbarState.table} {...standardState} onClick={() => command((chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))} />
        </div>
        <div className="portable-qmd-composer__toolbar-group" role="group" aria-label="Insert content">
          <ComposerButton label="Insert image" disabled={disabled} reason={disabled ? PENDING_REASON : ""} onClick={() => onMediaSelect?.()} />
        </div>
        <div className="portable-qmd-composer__toolbar-group" role="group" aria-label="History">
          <ComposerButton label="Undo" {...undoState} onClick={() => command((chain) => chain.undo())} />
          <ComposerButton label="Redo" {...redoState} onClick={() => command((chain) => chain.redo())} />
        </div>
      </div>
      {linkOpen && (
        <div className="portable-qmd-composer__link-editor" role="group" aria-label="Link editor">
          <label htmlFor="portable-qmd-link-destination">Link destination</label>
          <input
            id="portable-qmd-link-destination"
            value={linkValue}
            disabled={disabled || !editor}
            aria-invalid={linkError ? "true" : undefined}
            aria-describedby={[linkError ? "portable-qmd-link-error" : "", disabled ? "portable-qmd-pending-reason" : ""].filter(Boolean).join(" ") || undefined}
            onChange={(event) => setLinkValue(event.target.value)}
          />
          {linkError && <p id="portable-qmd-link-error" className="form-error">{linkError}</p>}
          <ComposerButton label="Apply link" {...standardState} onClick={applyLink} />
          <ComposerButton label="Remove link" {...standardState} onClick={() => { if (disabledRef.current || !editor) return; editor.chain().focus().unsetLink().run(); setLinkOpen(false); setLinkError(""); }} />
          <button type="button" className="secondary" onClick={() => { setLinkOpen(false); setLinkError(""); }}>Cancel</button>
        </div>
      )}
      {disabled && <p id="portable-qmd-pending-reason" className="visually-hidden">{PENDING_REASON}</p>}
      <EditorContent editor={editor} />
      <footer className="portable-qmd-composer__footer"><span>Saved as draft</span><span>{wordCount} {wordCount === 1 ? "word" : "words"}</span></footer>
      <p className="portable-qmd-composer__announcement" role={announcement.kind === "error" ? "alert" : "status"} aria-live={announcement.kind === "error" ? "assertive" : "polite"} aria-atomic="true">{announcement.message}</p>
    </section>
  );
}

function ComposerButton({ label, pressed, disabled, reason, onClick }) {
  return (
    <ControlTooltip disabled={disabled} reason={reason}>
      <button
        type="button"
        id={`portable-qmd-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        aria-label={label}
        aria-pressed={pressed === undefined ? undefined : Boolean(pressed)}
        disabled={disabled}
        title={label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      ><span aria-hidden="true" className={`portable-qmd-composer__icon portable-qmd-composer__icon--${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{composerGlyph(label)}</span></button>
    </ControlTooltip>
  );
}

function composerGlyph(label) {
  return ({
    Bold: "B",
    Italic: "I",
    Underline: "U",
    Link: "↗",
    "Clear formatting": "Tx",
    "Bullet list": "•≡",
    "Numbered list": "1≡",
    Table: "▦",
    "Insert image": "▧",
    Undo: "↶",
    Redo: "↷",
    "Apply link": "✓",
    "Remove link": "×",
  })[label] ?? label;
}

function countWords(source) {
  const text = String(source ?? "").replace(/[`*_+\[\]<>#|]/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

export function reconcilePortableQmdEditorUpdate({ editor, accepted, onSourceChange } = {}) {
  const serialized = serializePortableQmdEditorDocument(editor?.getJSON?.());
  if (!serialized.ok) {
    if (accepted?.document) editor?.commands?.setContent?.(accepted.document, { emitUpdate: false });
    return {
      ok: false,
      accepted,
      announcement: "That Composer change could not be saved as Portable QMD, so the last saved Composer content was restored.",
    };
  }
  const next = { source: serialized.source, document: editor.getJSON() };
  if (serialized.source !== accepted?.source) onSourceChange?.(serialized.source);
  return { ok: true, accepted: next, announcement: "" };
}

export function portableQmdComposerControlState({ disabled = false, editor = null, action = "command" } = {}) {
  if (disabled) return { disabled: true, reason: PENDING_REASON };
  if (!editor) return { disabled: true, reason: LOADING_REASON };
  if (action === "undo" && !editor.can().undo()) return { disabled: true, reason: "Nothing to undo." };
  if (action === "redo" && !editor.can().redo()) return { disabled: true, reason: "Nothing to redo." };
  return { disabled: false, reason: "" };
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
