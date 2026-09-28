"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import TurndownService from "turndown";

interface Props {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
// Preserve underline as HTML since standard Markdown has no underline syntax
turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `<u>${content}</u>`,
});

function markdownToHtml(md: string): string {
  if (!md) return "";
  const raw = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["u", "img", "s"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt"],
      a: ["href", "target", "rel"],
    },
  });
}

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

// Toolbar button component
function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded px-1.5 py-1 text-xs transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted hover:bg-surface hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-4 w-px self-center bg-border" />;
}

export default function RichTextField({ id, value, onChange, rows = 8 }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder: "Hier Inhalt eingeben…" }),
    ],
    content: markdownToHtml(value),
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChangeRef.current(htmlToMarkdown(editor.getHTML()));
    },
  });

  // Sync external value changes (e.g. form reset) without losing cursor when
  // the HTML equivalent is identical to what the editor already holds.
  useEffect(() => {
    if (!editor) return;
    const incoming = markdownToHtml(value);
    const current = editor.getHTML();
    if (incoming !== current) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // Only run when value changes from outside (not from editor's own onUpdate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("Bild-URL eingeben:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL eingeben:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-background focus-within:border-accent transition-colors">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-2 px-2 py-1.5">
        {/* Headings */}
        <ToolbarButton
          title="Überschrift H1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="Überschrift H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Überschrift H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inline formatting */}
        <ToolbarButton
          title="Fett (Strg+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          title="Kursiv (Strg+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          title="Unterstrichen (Strg+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          title="Durchgestrichen"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          title="Aufzählung"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="Nummerierte Liste"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" strokeLinecap="round" /><line x1="3" y1="10" x2="5" y2="10" />
            <path d="M3 14h2a1 1 0 0 1 0 2H3v2h2" strokeLinecap="round" />
          </svg>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block elements */}
        <ToolbarButton
          title="Zitat"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="Code-Block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="Horizontale Linie"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link & Image */}
        <ToolbarButton
          title="Link setzen / entfernen"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Bild einfügen" onClick={addImage}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Undo / Redo */}
        <ToolbarButton
          title="Rückgängig (Strg+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" strokeLinecap="round" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="Wiederholen (Strg+Y)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" strokeLinecap="round" />
          </svg>
        </ToolbarButton>
      </div>

      {/* ── Editor area ─────────────────────────────────────────── */}
      <EditorContent
        id={id}
        editor={editor}
        className="rich-editor flex-1 px-4 py-3 text-sm text-foreground outline-none"
        style={{ minHeight: `${rows * 1.625}rem` }}
      />
    </div>
  );
}
