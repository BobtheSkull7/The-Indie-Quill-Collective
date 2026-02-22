import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronLeft,
  Mic,
  FileText,
  BookOpen,
  Save,
  Loader2,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowDownToLine,
  Eye,
  X,
  PenTool,
  ScrollText,
  RefreshCw,
} from "lucide-react";

interface VibeCard {
  id: number;
  task: string;
  qualifications: string | null;
  xp_value: number;
  tome_id: number;
  tome_title: string;
  deck_title: string;
  curriculum_title: string;
  manuscript_content: string | null;
  manuscript_word_count: number | null;
  is_submitted: boolean;
  xp_earned: number | null;
}

interface Transcript {
  id: number;
  content: string;
  source_type: string;
  is_used: boolean;
  created_at: string;
}

type ViewMode = "master" | "task";

export default function Workspace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [viewMode, setViewMode] = useState<ViewMode>("master");
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cards, setCards] = useState<VibeCard[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  const [masterTitle, setMasterTitle] = useState("My Master Manuscript");
  const [masterWordCount, setMasterWordCount] = useState(0);
  const [masterSaving, setMasterSaving] = useState(false);
  const [masterLastSaved, setMasterLastSaved] = useState<Date | null>(null);

  const [taskWordCount, setTaskWordCount] = useState(0);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskLastSaved, setTaskLastSaved] = useState<Date | null>(null);

  const [referenceCard, setReferenceCard] = useState<VibeCard | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"transcripts" | "tasks">("tasks");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);

  const masterAutoSave = useRef<NodeJS.Timeout | null>(null);
  const taskAutoSave = useRef<NodeJS.Timeout | null>(null);
  const transcriptPoll = useRef<NodeJS.Timeout | null>(null);

  const masterEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Begin your master manuscript here... This is your book.",
      }),
      CharacterCount,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[60vh] px-8 py-6 text-slate-800 leading-relaxed text-lg",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
      setMasterWordCount(words);

      if (masterAutoSave.current) clearTimeout(masterAutoSave.current);
      masterAutoSave.current = setTimeout(() => {
        saveMasterManuscript(editor);
      }, 2000);
    },
  });

  const taskEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Write your response to this task...",
      }),
      CharacterCount,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[60vh] px-8 py-6 text-slate-800 leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
      setTaskWordCount(words);

      if (taskAutoSave.current) clearTimeout(taskAutoSave.current);
      taskAutoSave.current = setTimeout(() => {
        saveTaskManuscript(editor);
      }, 2000);
    },
  });

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "student" && user.role !== "writer") {
      setLocation("/dashboard");
      return;
    }
    loadWorkspaceData();

    transcriptPoll.current = setInterval(fetchTranscripts, 10000);

    return () => {
      if (masterAutoSave.current) clearTimeout(masterAutoSave.current);
      if (taskAutoSave.current) clearTimeout(taskAutoSave.current);
      if (transcriptPoll.current) clearInterval(transcriptPoll.current);
    };
  }, [user, setLocation]);

  useEffect(() => {
    if (masterEditor && viewMode === "master") {
      loadMasterManuscript();
    }
  }, [masterEditor]);

  useEffect(() => {
    if (taskEditor && activeCardId && viewMode === "task") {
      loadTaskManuscript(activeCardId);
    }
  }, [taskEditor, activeCardId, viewMode]);

  const loadWorkspaceData = async () => {
    try {
      const [cardsRes, transcriptsRes] = await Promise.all([
        fetch("/api/student/workspace-cards", { credentials: "include" }),
        fetch("/api/student/vibescribe-transcripts", { credentials: "include" }),
      ]);
      if (cardsRes.ok) {
        const data = await cardsRes.json();
        setCards(Array.isArray(data) ? data : []);
      }
      if (transcriptsRes.ok) {
        const data = await transcriptsRes.json();
        setTranscripts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscripts = async () => {
    try {
      const res = await fetch("/api/student/vibescribe-transcripts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTranscripts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error polling transcripts:", err);
    }
  };

  const loadMasterManuscript = async () => {
    try {
      const res = await fetch("/api/student/master-manuscript", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.content && masterEditor) {
          const contentObj = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
          if (contentObj && contentObj.type === "doc" && contentObj.content) {
            masterEditor.commands.setContent(contentObj);
          }
        }
        setMasterTitle(data.title || "My Master Manuscript");
        setMasterWordCount(data.word_count || 0);
        if (data.updated_at) setMasterLastSaved(new Date(data.updated_at));
      }
    } catch (err) {
      console.error("Error loading master manuscript:", err);
    }
  };

  const loadTaskManuscript = async (cardId: number) => {
    try {
      const res = await fetch(`/api/student/manuscripts/${cardId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (taskEditor) {
          if (data.content) {
            taskEditor.commands.setContent(data.content);
            setTaskWordCount(data.word_count || 0);
            if (data.updated_at) setTaskLastSaved(new Date(data.updated_at));
          } else {
            const card = cards.find(c => c.id === cardId);
            if (card?.manuscript_content) {
              taskEditor.commands.setContent(card.manuscript_content);
              setTaskWordCount(card.manuscript_word_count || 0);
            } else {
              taskEditor.commands.setContent("");
              setTaskWordCount(0);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading task manuscript:", err);
    }
  };

  const saveMasterManuscript = useCallback(async (editor: Editor) => {
    setMasterSaving(true);
    try {
      const json = editor.getJSON();
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;

      await fetch("/api/student/master-manuscript", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: masterTitle,
          content: json,
          wordCount: words,
        }),
      });
      setMasterLastSaved(new Date());
    } catch (err) {
      console.error("Error saving master manuscript:", err);
    } finally {
      setMasterSaving(false);
    }
  }, [masterTitle]);

  const saveTaskManuscript = useCallback(async (editor: Editor) => {
    if (!activeCardId) return;
    setTaskSaving(true);
    try {
      const html = editor.getHTML();
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;

      await fetch(`/api/student/manuscripts/${activeCardId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html, wordCount: words }),
      });
      setTaskLastSaved(new Date());
    } catch (err) {
      console.error("Error saving task manuscript:", err);
    } finally {
      setTaskSaving(false);
    }
  }, [activeCardId]);

  const handleMoveToMaster = () => {
    if (!taskEditor || !masterEditor) return;
    const taskJson = taskEditor.getJSON();
    if (!taskJson.content || taskJson.content.length === 0) return;

    const masterJson = masterEditor.getJSON();
    const separator = {
      type: "horizontalRule",
    };
    const heading = {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: `From: ${cards.find(c => c.id === activeCardId)?.task?.slice(0, 60) || "Task"}` }],
    };

    const merged = {
      ...masterJson,
      content: [
        ...(masterJson.content || []),
        separator,
        heading,
        ...(taskJson.content || []),
      ],
    };

    masterEditor.commands.setContent(merged);
    saveMasterManuscript(masterEditor);

    setViewMode("master");
  };

  const handleInjectSnippet = (transcript: Transcript) => {
    const activeEditor = viewMode === "master" ? masterEditor : taskEditor;
    if (!activeEditor) return;

    activeEditor.chain().focus().insertContent(transcript.content).run();

    fetch(`/api/student/vibescribe-transcripts/${transcript.id}/used`, {
      method: "PATCH",
      credentials: "include",
    }).catch(console.error);

    setTranscripts(prev => prev.map(t => t.id === transcript.id ? { ...t, is_used: true } : t));
  };

  const handleOpenTask = (card: VibeCard) => {
    setActiveCardId(card.id);
    setViewMode("task");
    setTaskWordCount(card.manuscript_word_count || 0);
    setTaskLastSaved(null);
  };

  const currentEditor = viewMode === "master" ? masterEditor : taskEditor;
  const currentWordCount = viewMode === "master" ? masterWordCount : taskWordCount;
  const currentSaving = viewMode === "master" ? masterSaving : taskSaving;
  const currentLastSaved = viewMode === "master" ? masterLastSaved : taskLastSaved;
  const activeCard = cards.find(c => c.id === activeCardId);
  const readingTime = Math.max(1, Math.ceil(currentWordCount / 250));

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/student")}
            className="flex items-center gap-1 text-gray-500 hover:text-slate-800 transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </button>

          <div className="h-6 w-px bg-gray-200" />

          <h1 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-teal-600" />
            Scribe's Sanctum
          </h1>
          {user?.vibeScribeId && (
            <div className="ml-4 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1">
              <span className="text-xs font-medium text-teal-500 uppercase tracking-wide">Scribe ID</span>
              <span className="text-sm font-mono font-semibold text-teal-700">{user.vibeScribeId}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("master")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "master"
                  ? "bg-white shadow-sm text-teal-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1.5" />
              Master Manuscript
            </button>
            <button
              onClick={() => setViewMode("task")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "task"
                  ? "bg-white shadow-sm text-purple-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1.5" />
              Task View
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div className="flex items-center gap-2 text-xs text-gray-500">
            {currentSaving && (
              <span className="flex items-center gap-1 text-blue-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            {!currentSaving && currentLastSaved && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>

          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={`p-2 rounded-lg transition-colors ${
              leftPanelOpen ? "bg-teal-50 text-teal-600" : "bg-gray-100 text-gray-500"
            }`}
            title="Toggle sidebar"
          >
            <ScrollText className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {leftPanelOpen && (
          <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setSidebarTab("tasks")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  sidebarTab === "tasks"
                    ? "text-teal-700 border-b-2 border-teal-500 bg-teal-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <FileText className="w-4 h-4 inline mr-1.5" />
                Cards ({cards.length})
              </button>
              <button
                onClick={() => setSidebarTab("transcripts")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  sidebarTab === "transcripts"
                    ? "text-purple-700 border-b-2 border-purple-500 bg-purple-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Mic className="w-4 h-4 inline mr-1.5" />
                Voice ({transcripts.filter(t => !t.is_used).length})
                {transcripts.some(t => !t.is_used) && (
                  <span className="absolute top-2 right-3 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "tasks" ? (
                <div className="p-3 space-y-2">
                  {cards.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm">No tasks available yet</p>
                    </div>
                  ) : (
                    cards.map((card) => (
                      <div
                        key={card.id}
                        className={`rounded-lg border transition-all cursor-pointer ${
                          activeCardId === card.id && viewMode === "task"
                            ? "border-purple-300 bg-purple-50 shadow-sm"
                            : card.is_submitted
                            ? "border-green-200 bg-green-50/50"
                            : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                        }`}
                      >
                        <div
                          className="p-3"
                          onClick={() => handleOpenTask(card)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800 line-clamp-2 flex-1">
                              {card.task}
                            </p>
                            {card.is_submitted && (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span className="text-purple-500 font-medium">{card.xp_value} XP</span>
                            <span>·</span>
                            <span>{card.deck_title}</span>
                            {card.manuscript_word_count ? (
                              <>
                                <span>·</span>
                                <span>{card.manuscript_word_count} words</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReferenceCard(card);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-bl-lg"
                          >
                            <Eye className="w-3 h-3" />
                            Reference
                          </button>
                          <div className="w-px bg-gray-100" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTask(card);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors rounded-br-lg"
                          >
                            <PenTool className="w-3 h-3" />
                            Write
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <button
                    onClick={fetchTranscripts}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh Feed
                  </button>
                  {transcripts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Mic className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm">No voice snippets yet</p>
                      <p className="text-xs mt-1">Use VibeScribe to record voice notes</p>
                    </div>
                  ) : (
                    transcripts.map((t) => (
                      <div
                        key={t.id}
                        className={`rounded-lg border p-3 transition-all ${
                          t.is_used
                            ? "border-gray-100 bg-gray-50 opacity-60"
                            : "border-purple-200 bg-white hover:shadow-sm"
                        }`}
                      >
                        <p className="text-sm text-slate-700 line-clamp-3">{t.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {!t.is_used && (
                            <button
                              onClick={() => handleInjectSnippet(t)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors font-medium"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              Inject
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === "master" && (
            <div className="px-8 pt-4 pb-2 bg-white border-b border-gray-100">
              <input
                type="text"
                value={masterTitle}
                onChange={(e) => setMasterTitle(e.target.value)}
                className="w-full text-2xl font-display font-bold text-slate-800 border-none focus:ring-0 focus:outline-none p-0 bg-transparent"
                placeholder="Manuscript Title..."
              />
            </div>
          )}

          {viewMode === "task" && activeCard && (
            <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-800 truncate">{activeCard.task}</p>
                <p className="text-xs text-purple-500 mt-0.5">{activeCard.deck_title} · {activeCard.xp_value} XP</p>
              </div>
              <button
                onClick={handleMoveToMaster}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm shrink-0 ml-4"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Move to Master
              </button>
            </div>
          )}

          {viewMode === "task" && !activeCard && (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Task</h2>
                <p className="text-gray-500">Choose a Vibe Card from the sidebar to start writing</p>
              </div>
            </div>
          )}

          {currentEditor && (viewMode === "master" || (viewMode === "task" && activeCard)) && (
            <>
              <EditorToolbar editor={currentEditor} />

              <div className="flex-1 overflow-y-auto bg-white">
                <EditorContent editor={currentEditor} />
              </div>

              <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="font-medium">{currentWordCount.toLocaleString()} words</span>
                  <span>~{readingTime} min read</span>
                </div>
                <div className="flex items-center gap-3">
                  {currentSaving ? (
                    <span className="flex items-center gap-1 text-blue-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Auto-saving...
                    </span>
                  ) : currentLastSaved ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Last saved {currentLastSaved.toLocaleTimeString()}
                    </span>
                  ) : null}
                  <button
                    onClick={() => {
                      if (viewMode === "master" && masterEditor) saveMasterManuscript(masterEditor);
                      if (viewMode === "task" && taskEditor) saveTaskManuscript(taskEditor);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    Save Now
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {referenceCard && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/30" onClick={() => setReferenceCard(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-blue-50">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Task Reference
              </h3>
              <button
                onClick={() => setReferenceCard(null)}
                className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Task</p>
                <p className="text-slate-800">{referenceCard.task}</p>
              </div>
              {referenceCard.qualifications && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Qualifications</p>
                  <p className="text-slate-700 text-sm">{referenceCard.qualifications}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  {referenceCard.xp_value} XP
                </span>
                <span>{referenceCard.deck_title}</span>
                <span>{referenceCard.curriculum_title}</span>
              </div>
              <button
                onClick={() => {
                  handleOpenTask(referenceCard);
                  setReferenceCard(null);
                }}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Open in Task View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-100 bg-gray-50 flex-wrap shrink-0">
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        icon={<Bold className="w-4 h-4" />}
        title="Bold (Ctrl+B)"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        icon={<Italic className="w-4 h-4" />}
        title="Italic (Ctrl+I)"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        icon={<UnderlineIcon className="w-4 h-4" />}
        title="Underline (Ctrl+U)"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        icon={<Strikethrough className="w-4 h-4" />}
        title="Strikethrough"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        icon={<Heading1 className="w-4 h-4" />}
        title="Heading 1"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        icon={<Heading2 className="w-4 h-4" />}
        title="Heading 2"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        icon={<Heading3 className="w-4 h-4" />}
        title="Heading 3"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <ToolBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        icon={<List className="w-4 h-4" />}
        title="Bullet List"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        icon={<ListOrdered className="w-4 h-4" />}
        title="Numbered List"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        icon={<Quote className="w-4 h-4" />}
        title="Blockquote"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        icon={<AlignLeft className="w-4 h-4" />}
        title="Align Left"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        icon={<AlignCenter className="w-4 h-4" />}
        title="Align Center"
      />
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        icon={<AlignRight className="w-4 h-4" />}
        title="Align Right"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <ToolBtn
        onClick={() => editor.chain().focus().undo().run()}
        active={false}
        icon={<Undo className="w-4 h-4" />}
        title="Undo (Ctrl+Z)"
        disabled={!editor.can().undo()}
      />
      <ToolBtn
        onClick={() => editor.chain().focus().redo().run()}
        active={false}
        icon={<Redo className="w-4 h-4" />}
        title="Redo (Ctrl+Shift+Z)"
        disabled={!editor.can().redo()}
      />
    </div>
  );
}

function ToolBtn({
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
          ? "bg-teal-100 text-teal-700"
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
