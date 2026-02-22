import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
  X,
  Save,
  Send,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface ManuscriptEditorProps {
  cardId: number;
  cardTask: string;
  cardXp: number;
  minWordCount: number;
  isCompleted: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ManuscriptEditor({
  cardId,
  cardTask,
  cardXp,
  minWordCount,
  isCompleted,
  onClose,
  onSubmitted,
}: ManuscriptEditorProps) {
  const requiredWords = minWordCount || 10;
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(isCompleted);
  const [wordCount, setWordCount] = useState(0);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const pastedCharsRef = useRef(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Begin writing your response here...",
      }),
      CharacterCount,
      Underline,
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[300px] px-6 py-4 text-slate-800 leading-relaxed",
      },
      handlePaste: (_view, event) => {
        const pastedText = event.clipboardData?.getData("text/plain") || "";
        if (pastedText.length > 0) {
          pastedCharsRef.current += pastedText.length;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      setWordCount(words);

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveDraft(editor.getHTML(), words);
      }, 2000);
    },
  });

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (editor) {
      loadDraft();
    }
  }, [editor]);

  const loadDraft = async () => {
    try {
      const res = await fetch(`/api/student/manuscripts/${cardId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.content && editor) {
          editor.commands.setContent(data.content);
          setWordCount(data.word_count || 0);
          if (data.updated_at) setLastSaved(new Date(data.updated_at));
        }
        if (data.submitted) {
          setSubmitted(true);
        }
      }
    } catch (err) {
      console.error("Error loading draft:", err);
    } finally {
      setLoadingDraft(false);
    }
  };

  const saveDraft = useCallback(
    async (content: string, words: number) => {
      if (submitted) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/student/manuscripts/${cardId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, wordCount: words }),
        });
        if (res.ok) {
          setLastSaved(new Date());
        }
      } catch (err) {
        console.error("Error saving draft:", err);
      } finally {
        setSaving(false);
      }
    },
    [cardId, submitted]
  );

  const handleManualSave = () => {
    if (!editor) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    saveDraft(editor.getHTML(), wordCount);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editor) {
        await saveDraft(editor.getHTML(), wordCount);
      }
      const res = await fetch(`/api/student/submissions/${cardId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection: "", pasteCount: pastedCharsRef.current }),
      });
      if (res.ok) {
        setSubmitted(true);
        onSubmitted();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to submit. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className="font-bold text-slate-800 text-lg"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Manuscript
              </h2>
              <p className="text-xs text-gray-500 max-w-md truncate">
                {cardTask}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`font-medium ${wordCount < requiredWords ? 'text-amber-600' : 'text-green-600'}`}>{wordCount} / {requiredWords} words</span>
              {saving && (
                <span className="flex items-center gap-1 text-blue-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              {!saving && lastSaved && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!submitted && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              icon={<Bold className="w-4 h-4" />}
              title="Bold"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              icon={<Italic className="w-4 h-4" />}
              title="Italic"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              icon={<UnderlineIcon className="w-4 h-4" />}
              title="Underline"
            />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
              icon={<Heading2 className="w-4 h-4" />}
              title="Heading"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              icon={<List className="w-4 h-4" />}
              title="Bullet List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              icon={<ListOrdered className="w-4 h-4" />}
              title="Numbered List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              icon={<Quote className="w-4 h-4" />}
              title="Quote"
            />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              active={false}
              icon={<Undo className="w-4 h-4" />}
              title="Undo"
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              active={false}
              icon={<Redo className="w-4 h-4" />}
              title="Redo"
              disabled={!editor.can().redo()}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loadingDraft ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <EditorContent
              editor={editor}
              className={submitted ? "opacity-75 pointer-events-none" : ""}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                Submitted! You earned {cardXp} XP
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={handleManualSave}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                disabled={wordCount < requiredWords || submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm shadow-sm transition-all"
                title={
                  wordCount < requiredWords
                    ? `Write at least ${requiredWords} words before submitting`
                    : ""
                }
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? "Submitting..." : `Submit & Earn ${cardXp} XP`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon,
  title,
  disabled = false,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded transition-colors ${
        active
          ? "bg-purple-100 text-purple-700"
          : disabled
          ? "text-gray-300 cursor-not-allowed"
          : "text-gray-600 hover:bg-gray-200 hover:text-gray-800"
      }`}
      title={title}
    >
      {icon}
    </button>
  );
}
