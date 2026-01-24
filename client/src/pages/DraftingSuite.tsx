import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  FileText, 
  Save, 
  Clock,
  ChevronLeft,
  Plus,
  Trash2,
  Edit3,
  Volume2,
  VolumeX,
  Pause,
  Play,
  CheckCircle,
  AlertCircle,
  Send,
  PartyPopper
} from "lucide-react";

interface DraftingDocument {
  id: number;
  title: string;
  content: string | null;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  isPublished?: boolean;
  publishedAt?: string | null;
}

export default function DraftingSuite() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DraftingDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DraftingDocument | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showNewDocForm, setShowNewDocForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "student") {
      setLocation("/dashboard");
      return;
    }
    loadDocuments();
  }, [user, setLocation]);

  useEffect(() => {
    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasChanges && selectedDoc) {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      autoSaveRef.current = setTimeout(() => {
        saveDocument();
      }, 3000);
    }
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [content, title, hasChanges, selectedDoc]);

  const loadDocuments = async () => {
    try {
      const res = await fetch("/api/student/drafts");
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    if (!newDocTitle.trim()) return;
    
    try {
      const res = await fetch("/api/student/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDocTitle.trim() })
      });
      
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments(prev => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setContent("");
        setTitle(newDoc.title);
        setNewDocTitle("");
        setShowNewDocForm(false);
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const selectDocument = (doc: DraftingDocument) => {
    if (hasChanges && selectedDoc) {
      saveDocument();
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSelectedDoc(doc);
    setContent(doc.content || "");
    setTitle(doc.title);
    setHasChanges(false);
    setLastSaved(new Date(doc.updatedAt));
  };

  const saveDocument = useCallback(async () => {
    if (!selectedDoc || saving) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/student/drafts/${selectedDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
        setSelectedDoc(updated);
        setLastSaved(new Date());
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Error saving document:", error);
    } finally {
      setSaving(false);
    }
  }, [selectedDoc, saving, title, content]);

  const deleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const res = await fetch(`/api/student/drafts/${docId}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setContent("");
          setTitle("");
        }
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  };

  const toggleTTS = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (content) {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
    setTtsEnabled(!ttsEnabled);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const publishDocument = async () => {
    if (!selectedDoc || publishing) return;
    
    if (hasChanges) {
      await saveDocument();
    }
    
    const wordCount = countWords(content);
    if (wordCount < 500) {
      alert("Your manuscript must be at least 500 words before publishing.");
      return;
    }

    if (!confirm("Ready to submit your Legacy Work for review? This will send your manuscript to The Indie Quill Collective for publishing consideration.")) {
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`/api/student/drafts/${selectedDoc.id}/publish`, {
        method: "POST"
      });
      
      if (res.ok) {
        const updated = { ...selectedDoc, isPublished: true, publishedAt: new Date().toISOString() };
        setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
        setSelectedDoc(updated);
        setShowPublishSuccess(true);
        setTimeout(() => setShowPublishSuccess(false), 5000);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to publish");
      }
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const wordCount = countWords(content);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setLocation("/student")}
              className="flex items-center gap-2 text-gray-600 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            
            <h1 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-teal-500" />
              Legacy Work Drafting Suite
            </h1>
            
            <div className="flex items-center gap-3">
              {selectedDoc && (
                <>
                  <button
                    onClick={toggleTTS}
                    className={`p-2 rounded-lg transition-colors ${
                      ttsEnabled 
                        ? "bg-teal-100 text-teal-600" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={ttsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
                  >
                    {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  
                  {ttsEnabled && (
                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          window.speechSynthesis.pause();
                          setIsSpeaking(false);
                        } else {
                          window.speechSynthesis.resume();
                          setIsSpeaking(true);
                        }
                      }}
                      className="p-2 rounded-lg bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors"
                    >
                      {isSpeaking ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                  )}
                  
                  <button
                    onClick={saveDocument}
                    disabled={saving || !hasChanges}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      hasChanges 
                        ? "bg-teal-600 text-white hover:bg-teal-700" 
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>

                  {!selectedDoc?.isPublished && wordCount >= 500 && (
                    <button
                      onClick={publishDocument}
                      disabled={publishing}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      title="Submit for publishing"
                    >
                      <Send className="w-4 h-4" />
                      {publishing ? "Submitting..." : "Publish"}
                    </button>
                  )}

                  {selectedDoc?.isPublished && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      Published
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-slate-800">Your Documents</h2>
                <button
                  onClick={() => setShowNewDocForm(true)}
                  className="p-2 rounded-lg bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showNewDocForm && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Document title..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={createDocument}
                      disabled={!newDocTitle.trim()}
                      className="flex-1 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowNewDocForm(false);
                        setNewDocTitle("");
                      }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No documents yet</p>
                  <p className="text-xs">Create your first Legacy Work</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => selectDocument(doc)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                        selectedDoc?.id === doc.id 
                          ? "bg-teal-50 border border-teal-200" 
                          : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-slate-800 truncate">{doc.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{doc.wordCount.toLocaleString()} words</span>
                            <span>•</span>
                            <span>{formatDate(doc.updatedAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                          className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedDoc ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full text-xl font-display font-bold text-slate-800 border-none focus:ring-0 p-0"
                    placeholder="Document title..."
                  />
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {wordCount.toLocaleString()} words
                    </span>
                    {lastSaved && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Last saved {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                    {hasChanges && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        Unsaved changes
                      </span>
                    )}
                    {saving && (
                      <span className="flex items-center gap-1 text-teal-600">
                        <CheckCircle className="w-4 h-4" />
                        Saving...
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-4">
                  <textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full min-h-[50vh] resize-none border-none focus:ring-0 text-gray-700 leading-relaxed text-lg"
                    placeholder="Start writing your Legacy Work..."
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex items-center justify-center">
                <div className="text-center py-12 text-gray-500">
                  <Edit3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Document</h2>
                  <p className="mb-4">Choose a document from the sidebar or create a new one</p>
                  <button
                    onClick={() => setShowNewDocForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPublishSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 text-center max-w-md animate-pulse">
            <PartyPopper className="w-16 h-16 mx-auto mb-4 text-purple-500" />
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Congratulations!
            </h2>
            <p className="text-gray-600 mb-4">
              Your Legacy Work has been submitted for review! The Indie Quill Collective team will be in touch soon.
            </p>
            <button
              onClick={() => setShowPublishSuccess(false)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Continue Writing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
