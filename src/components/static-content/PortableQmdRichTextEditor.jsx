import React from "react";
import { Node } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";

import ControlTooltip from "../common/ControlTooltip.jsx";
import { validatePortableHref } from "../../static-content/qmd/portableQmdPolicy.js";
import {
  projectPortableQmdEditorDocument,
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
      frameWeight: { default: null }, frameColor: { default: null },
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
  initialMode = "formatted",
  rawSourceId,
  rawInvalid = false,
  rawDescribedBy,
  onModeChange,
  onSourceChange,
  onMediaSelect,
} = {}) {
  const projected = React.useMemo(() => projectPortableQmdEditorDocument(source), [source]);
  const [mode, setMode] = React.useState(initialMode === "raw" ? "raw" : "formatted");
  const [announcement, setAnnouncement] = React.useState({ message: "", kind: "status" });
  const [sessionReport, setSessionReport] = React.useState(null);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState("");
  const [linkError, setLinkError] = React.useState("");
  const disabledRef = React.useRef(disabled);
  const sourceRef = React.useRef(source);
  const sessionRisksRef = React.useRef(new Set(projected.report.likelyAltered));
  disabledRef.current = disabled;
  sourceRef.current = source;
  for (const construct of projected.report.likelyAltered) sessionRisksRef.current.add(construct);
  const acceptedRef = React.useRef({
    source,
    document: projected.document,
  });
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: createPortableQmdEditorExtensions(),
    content: projected.document,
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
      if (!result.ok) setSessionReport({ kind: "failure", constructs: [] });
      else if (result.accepted.source !== sourceRef.current) {
        const constructs = [...sessionRisksRef.current];
        setSessionReport({
          kind: constructs.length ? "altered" : "normalized",
          constructs,
        });
      }
    },
  });

  React.useEffect(() => { editor?.setEditable(!disabled, false); }, [disabled, editor]);
  React.useEffect(() => {
    if (mode === "raw") setLinkOpen(false);
  }, [mode]);
  React.useEffect(() => {
    if (!editor || source === acceptedRef.current.source) return;
    acceptedRef.current = { source, document: projected.document };
    editor.commands.setContent(projected.document, { emitUpdate: false });
  }, [editor, projected, source]);

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
    if (disabled || mode !== "formatted" || !editor) return;
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
  const standardState = portableQmdComposerControlState({ disabled, editor, inactive: mode !== "formatted" });
  const undoState = portableQmdComposerControlState({ disabled, editor, action: "undo", inactive: mode !== "formatted" });
  const redoState = portableQmdComposerControlState({ disabled, editor, action: "redo", inactive: mode !== "formatted" });
  const wordCount = countWords(source);

  return (
    <section
      className="portable-qmd-composer"
      aria-label="Portable QMD Composer"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          if (disabledRef.current || mode !== "formatted" || !editor) return;
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
          <ComposerButton label="Insert image" {...standardState} onClick={() => onMediaSelect?.()} />
        </div>
        <div className="portable-qmd-composer__toolbar-group" role="group" aria-label="History">
          <ComposerButton label="Undo" {...undoState} onClick={() => command((chain) => chain.undo())} />
          <ComposerButton label="Redo" {...redoState} onClick={() => command((chain) => chain.redo())} />
        </div>
        <div className="portable-qmd-composer__toolbar-group portable-qmd-composer__toolbar-group--mode" role="group" aria-label="Editing mode">
          <ComposerButton
            label={mode === "formatted" ? "Raw text" : "Formatted text"}
            disabled={disabled}
            reason={disabled ? PENDING_REASON : ""}
            onClick={() => {
              const next = mode === "formatted" ? "raw" : "formatted";
              setMode(next);
              onModeChange?.(next);
            }}
          />
        </div>
      </div>
      <FormattedSourceWarning constructs={projected.report.likelyAltered} sessionReport={sessionReport} />
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
      {mode === "formatted"
        ? <><EditorContent editor={editor} /><TableCellActions editor={editor} disabled={disabled} /></>
        : <textarea id={rawSourceId} className="portable-qmd-composer__raw-source" aria-label="Portable QMD raw source" aria-invalid={rawInvalid ? "true" : undefined} aria-describedby={rawDescribedBy} disabled={disabled} value={source} onChange={(event) => onSourceChange?.(event.target.value)} />}
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
    "Raw text": "Raw",
    "Formatted text": "Fmt",
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

export function portableQmdComposerControlState({ disabled = false, editor = null, action = "command", inactive = false } = {}) {
  if (disabled) return { disabled: true, reason: PENDING_REASON };
  if (inactive) return { disabled: true, reason: "Formatting is unavailable while editing raw Portable QMD." };
  if (!editor) return { disabled: true, reason: LOADING_REASON };
  if (action === "undo" && !editor.can().undo()) return { disabled: true, reason: "Nothing to undo." };
  if (action === "redo" && !editor.can().redo()) return { disabled: true, reason: "Nothing to redo." };
  return { disabled: false, reason: "" };
}

function FormattedSourceWarning({ constructs, sessionReport }) {
  const initial = constructs.length
    ? `Formatted editing may rewrite ${constructs.join(", ")}. Raw text avoids formatted-editor rewrites.`
    : "Formatted editing can normalize Portable QMD syntax. Raw text avoids formatted-editor rewrites.";
  const followUp = sessionReport?.kind === "failure"
    ? "The last formatted change could not be serialized; the last accepted Portable QMD was kept."
    : sessionReport?.kind === "altered"
      ? `This formatted session may have altered ${sessionReport.constructs.join(", ")} from the original source.`
      : sessionReport?.kind === "normalized"
        ? "Formatted editing normalized the Portable QMD source. Review the rendered preview before saving."
        : "";
  return <div className="portable-qmd-composer__source-warning" role="note"><strong>Source fidelity</strong><span>{initial}</span>{followUp && <span>{followUp}</span>}</div>;
}

function TableCellActions({ editor, disabled }) {
  const [cell, setCell] = React.useState(null);
  const [position, setPosition] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const buttonRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const refresh = React.useCallback((target) => {
    const next = target?.closest?.("td, th") ?? null;
    const connected = next?.isConnected ? next : null;
    setCell(connected);
    return connected;
  }, []);
  const updatePosition = React.useCallback(() => {
    if (!cell?.isConnected) {
      setPosition(null);
      setMenuOpen(false);
      return;
    }
    const rect = cell.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom <= 8 || rect.top >= viewportHeight - 8 || rect.right <= 8 || rect.left >= viewportWidth - 8) {
      setPosition(null);
      setMenuOpen(false);
      return;
    }
    const left = Math.max(8, Math.min(rect.right - 30, viewportWidth - 36));
    const top = Math.max(8, Math.min(rect.top + 2, viewportHeight - 36));
    const menuWidth = Math.min(180, viewportWidth - 16);
    const desiredMenuLeft = left + 28 - menuWidth;
    const menuLeft = Math.max(8, Math.min(desiredMenuLeft, viewportWidth - menuWidth - 8));
    const spaceAbove = Math.max(0, top - 10);
    const spaceBelow = Math.max(0, viewportHeight - (top + 38));
    const placement = spaceBelow < 264 && spaceAbove > spaceBelow ? "above" : "below";
    setPosition({
      left,
      top,
      menuOffset: menuLeft - left,
      placement,
      maxHeight: Math.max(48, placement === "above" ? spaceAbove : spaceBelow),
    });
  }, [cell]);
  React.useEffect(() => {
    const surface = editor?.view?.dom;
    if (!surface) return undefined;
    const onPointer = (event) => refresh(event.target);
    const onFocus = (event) => refresh(event.target);
    const onSelection = () => {
      const anchor = window.getSelection?.()?.anchorNode;
      refresh(anchor?.nodeType === 1 ? anchor : anchor?.parentElement);
    };
    const onKeyboardMenu = (event) => {
      if (!event.shiftKey || event.key !== "F10") return;
      const anchor = window.getSelection?.()?.anchorNode;
      const next = refresh(anchor?.nodeType === 1 ? anchor : anchor?.parentElement);
      if (!next) return;
      event.preventDefault();
      setMenuOpen(true);
    };
    surface.addEventListener("mouseover", onPointer);
    surface.addEventListener("focusin", onFocus);
    surface.addEventListener("keydown", onKeyboardMenu, true);
    editor.on("selectionUpdate", onSelection);
    return () => {
      surface.removeEventListener("mouseover", onPointer);
      surface.removeEventListener("focusin", onFocus);
      surface.removeEventListener("keydown", onKeyboardMenu, true);
      editor.off("selectionUpdate", onSelection);
    };
  }, [editor, refresh]);
  React.useLayoutEffect(() => {
    if (!cell) {
      setPosition(null);
      return undefined;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [cell, updatePosition]);
  React.useEffect(() => {
    if (!menuOpen || !menuRef.current) return undefined;
    const first = menuRef.current.querySelector("button");
    first?.focus();
    return undefined;
  }, [menuOpen]);
  if (!cell || !position || !editor || disabled) return null;
  const run = (command) => {
    focusTableCell(editor, cell);
    editor.chain().focus()[command]().run();
    setMenuOpen(false);
  };
  const style = {
    left: position.left,
    top: position.top,
    "--table-menu-left": `${position.menuOffset}px`,
    "--table-menu-max-height": `${position.maxHeight}px`,
  };
  return <div className={`portable-qmd-composer__table-actions portable-qmd-composer__table-actions--${position.placement}`} style={style} onMouseDown={(event) => event.preventDefault()}>
    <button ref={buttonRef} type="button" aria-label="Table cell actions" aria-haspopup="menu" aria-expanded={menuOpen} aria-keyshortcuts="Shift+F10" onClick={() => setMenuOpen((open) => !open)}>⋯</button>
    {menuOpen && <div ref={menuRef} role="menu" aria-label="Table cell actions" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); buttonRef.current?.focus(); } }}>
      <button type="button" role="menuitem" onClick={() => run("addRowBefore")}>Add row above</button>
      <button type="button" role="menuitem" onClick={() => run("addRowAfter")}>Add row below</button>
      <button type="button" role="menuitem" onClick={() => run("addColumnBefore")}>Add column before</button>
      <button type="button" role="menuitem" onClick={() => run("addColumnAfter")}>Add column after</button>
      <button type="button" role="menuitem" onClick={() => run("deleteRow")}>Remove current row</button>
      <button type="button" role="menuitem" onClick={() => run("deleteColumn")}>Remove current column</button>
    </div>}
  </div>;
}

export function focusTableCell(editor, cell) {
  const position = editor?.view?.posAtDOM?.(cell, 0);
  if (!Number.isInteger(position)) return false;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, Math.min(position + 1, editor.state.doc.content.size))));
  return true;
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
