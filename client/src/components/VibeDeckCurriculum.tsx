import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Layers,
  Sparkles,
  Plus,
  GripVertical,

  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface VibeCardData {
  id: number;
  tome_id: number;
  task: string;
  qualifications: string | null;
  task_type: string;
  order_index: number;
}

interface TomeData {
  id: number;
  deck_id: number;
  title: string;
  content: string;
  order_index: number;
  card_count: number;
  cards?: VibeCardData[];
}

interface VibeDeckData {
  id: number;
  curriculum_id: number;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  tome_count: number;
  card_count: number;
  tomes?: TomeData[];
}

interface CurriculumData {
  id: number;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  deck_count: number;
  decks?: VibeDeckData[];
}

export default function VibeDeckCurriculum() {
  const [curriculums, setCurriculums] = useState<CurriculumData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCurricula, setExpandedCurricula] = useState<Set<number>>(new Set());
  const [expandedDecks, setExpandedDecks] = useState<Set<number>>(new Set());
  const [expandedTomes, setExpandedTomes] = useState<Set<number>>(new Set());

  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ task: "", qualifications: "", taskType: "writing" });
  const [editingCurriculum, setEditingCurriculum] = useState<number | null>(null);
  const [editCurrForm, setEditCurrForm] = useState({ title: "", description: "" });
  const [editingDeck, setEditingDeck] = useState<number | null>(null);
  const [editDeckForm, setEditDeckForm] = useState({ title: "", description: "" });
  const [editingTome, setEditingTome] = useState<number | null>(null);
  const [editTomeForm, setEditTomeForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);

  const [addingCurriculum, setAddingCurriculum] = useState(false);
  const [newCurrTitle, setNewCurrTitle] = useState("");
  const [newCurrDesc, setNewCurrDesc] = useState("");

  const [addingDeckFor, setAddingDeckFor] = useState<number | null>(null);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");

  const [addingTomeFor, setAddingTomeFor] = useState<number | null>(null);
  const [newTomeTitle, setNewTomeTitle] = useState("");
  const [newTomeContent, setNewTomeContent] = useState("");

  const [addingCardFor, setAddingCardFor] = useState<number | null>(null);
  const [newCardTask, setNewCardTask] = useState("");
  const [newCardQuals, setNewCardQuals] = useState("");
  const [newCardTaskType, setNewCardTaskType] = useState("writing");

  useEffect(() => {
    loadCurriculums();
  }, []);

  const loadCurriculums = async () => {
    try {
      const res = await fetch("/api/admin/curriculums", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCurriculums(prev => {
          if (prev.length === 0) return data;
          return data.map((c: any) => {
            const existing = prev.find((p: any) => p.id === c.id);
            return existing ? { ...c, decks: existing.decks } : c;
          });
        });
      }
    } catch (err) {
      console.error("Error loading curriculums:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDecks = async (curriculumId: number) => {
    try {
      const res = await fetch(`/api/admin/curriculums/${curriculumId}/decks`, { credentials: "include" });
      if (res.ok) {
        const decks = await res.json();
        setCurriculums(prev => prev.map(c => {
          if (c.id !== curriculumId) return c;
          const mergedDecks = decks.map((d: any) => {
            const existing = c.decks?.find((ed: any) => ed.id === d.id);
            return existing ? { ...d, tomes: d.tomes || existing.tomes } : d;
          });
          return { ...c, decks: mergedDecks };
        }));
      }
    } catch (err) {
      console.error("Error loading decks:", err);
    }
  };

  const loadTomes = async (deckId: number) => {
    try {
      const res = await fetch(`/api/admin/decks/${deckId}/tomes`, { credentials: "include" });
      if (res.ok) {
        const tomes = await res.json();
        setCurriculums(prev => prev.map(c => ({
          ...c,
          decks: c.decks?.map(d => {
            if (d.id !== deckId) return d;
            const mergedTomes = tomes.map((t: any) => {
              const existing = d.tomes?.find((et: any) => et.id === t.id);
              return existing ? { ...t, cards: existing.cards } : t;
            });
            return { ...d, tomes: mergedTomes };
          }),
        })));
      }
    } catch (err) {
      console.error("Error loading tomes:", err);
    }
  };

  const loadCards = async (tomeId: number) => {
    try {
      const res = await fetch(`/api/admin/tomes/${tomeId}/cards`, { credentials: "include" });
      if (res.ok) {
        const cards = await res.json();
        setCurriculums(prev => prev.map(c => ({
          ...c,
          decks: c.decks?.map(d => ({
            ...d,
            tomes: d.tomes?.map(t =>
              t.id === tomeId ? { ...t, cards } : t
            ),
          })),
        })));
      }
    } catch (err) {
      console.error("Error loading cards:", err);
    }
  };

  const toggleCurriculum = async (id: number) => {
    const next = new Set(expandedCurricula);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      const curr = curriculums.find(c => c.id === id);
      if (!curr?.decks) await loadDecks(id);
    }
    setExpandedCurricula(next);
  };

  const toggleDeck = async (id: number) => {
    const next = new Set(expandedDecks);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      const deck = curriculums.flatMap(c => c.decks || []).find(d => d.id === id);
      if (!deck?.tomes) await loadTomes(id);
    }
    setExpandedDecks(next);
  };

  const toggleTome = async (id: number) => {
    const next = new Set(expandedTomes);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      const tome = curriculums.flatMap(c => (c.decks || []).flatMap(d => d.tomes || [])).find(t => t.id === id);
      if (!tome?.cards) await loadCards(id);
    }
    setExpandedTomes(next);
  };

  const handleAddCurriculum = async () => {
    if (!newCurrTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/curriculums", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newCurrTitle, description: newCurrDesc }),
      });
      if (res.ok) {
        await loadCurriculums();
        setNewCurrTitle(""); setNewCurrDesc(""); setAddingCurriculum(false);
      }
    } catch (err) { console.error("Error adding curriculum:", err); }
    finally { setSaving(false); }
  };

  const handleAddDeck = async (curriculumId: number) => {
    if (!newDeckTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/decks", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculumId, title: newDeckTitle, description: newDeckDesc }),
      });
      if (res.ok) {
        await loadDecks(curriculumId); await loadCurriculums();
        setNewDeckTitle(""); setNewDeckDesc(""); setAddingDeckFor(null);
      }
    } catch (err) { console.error("Error adding deck:", err); }
    finally { setSaving(false); }
  };

  const handleAddTome = async (deckId: number) => {
    if (!newTomeTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tomes", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, title: newTomeTitle, content: newTomeContent }),
      });
      if (res.ok) {
        await loadTomes(deckId);
        const deck = curriculums.flatMap(c => c.decks || []).find(d => d.id === deckId);
        if (deck) await loadDecks(deck.curriculum_id);
        setNewTomeTitle(""); setNewTomeContent(""); setAddingTomeFor(null);
      }
    } catch (err) { console.error("Error adding tome:", err); }
    finally { setSaving(false); }
  };

  const handleAddCard = async (tomeId: number) => {
    if (!newCardTask.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tomeId, task: newCardTask, qualifications: newCardQuals, taskType: newCardTaskType }),
      });
      if (res.ok) {
        await loadCards(tomeId);
        const tome = curriculums.flatMap(c => (c.decks || []).flatMap(d => d.tomes || [])).find(t => t.id === tomeId);
        if (tome) {
          await loadTomes(tome.deck_id);
          const deck = curriculums.flatMap(c => c.decks || []).find(d => d.id === tome.deck_id);
          if (deck) await loadDecks(deck.curriculum_id);
        }
        setNewCardTask(""); setNewCardQuals(""); setNewCardXp(100); setNewCardTaskType("writing"); setAddingCardFor(null);
      }
    } catch (err) { console.error("Error adding card:", err); }
    finally { setSaving(false); }
  };

  const startEditCard = (card: VibeCardData) => {
    setEditingCurriculum(null); setEditingDeck(null); setEditingTome(null);
    setEditingCard(card.id);
    setEditForm({ task: card.task, qualifications: card.qualifications || "", taskType: card.task_type || "writing" });
  };

  const handleSaveCard = async (cardId: number, tomeId: number) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cards/${cardId}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: editForm.task, qualifications: editForm.qualifications, taskType: editForm.taskType }),
      });
      if (res.ok) { await loadCards(tomeId); setEditingCard(null); }
    } catch (err) { console.error("Error updating card:", err); }
    finally { setSaving(false); }
  };

  const handleDeleteCard = async (cardId: number, tomeId: number) => {
    if (!confirm("Delete this Task?")) return;
    try {
      const res = await fetch(`/api/admin/cards/${cardId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        await loadCards(tomeId);
        const tome = curriculums.flatMap(c => (c.decks || []).flatMap(d => d.tomes || [])).find(t => t.id === tomeId);
        if (tome) await loadTomes(tome.deck_id);
      }
    } catch (err) { console.error("Error deleting card:", err); }
  };

  const handleDeleteTome = async (tomeId: number, deckId: number) => {
    if (!confirm("Delete this Lesson and all its tasks?")) return;
    try {
      const res = await fetch(`/api/admin/tomes/${tomeId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        await loadTomes(deckId);
        const deck = curriculums.flatMap(c => c.decks || []).find(d => d.id === deckId);
        if (deck) await loadDecks(deck.curriculum_id);
      }
    } catch (err) { console.error("Error deleting tome:", err); }
  };

  const handleDeleteDeck = async (deckId: number, curriculumId: number) => {
    if (!confirm("Delete this Catalog and all its lessons and tasks?")) return;
    try {
      const res = await fetch(`/api/admin/decks/${deckId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { await loadDecks(curriculumId); await loadCurriculums(); }
    } catch (err) { console.error("Error deleting deck:", err); }
  };

  const handleDeleteCurriculum = async (id: number) => {
    if (!confirm("Delete this Curriculum and all its catalogs, lessons, and tasks?")) return;
    try {
      const res = await fetch(`/api/admin/curriculums/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) await loadCurriculums();
    } catch (err) { console.error("Error deleting curriculum:", err); }
  };

  const handleTogglePublish = async (type: "curriculum" | "deck", id: number, currentlyPublished: boolean, parentId?: number) => {
    try {
      const endpoint = type === "curriculum" ? `/api/admin/curriculums/${id}` : `/api/admin/decks/${id}`;
      const res = await fetch(endpoint, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !currentlyPublished }),
      });
      if (res.ok) {
        if (type === "curriculum") await loadCurriculums();
        else if (parentId) await loadDecks(parentId);
      }
    } catch (err) { console.error("Error toggling publish:", err); }
  };

  const startEditCurriculum = (curriculum: CurriculumData) => {
    setEditingDeck(null); setEditingCard(null); setEditingTome(null);
    setEditingCurriculum(curriculum.id);
    setEditCurrForm({ title: curriculum.title, description: curriculum.description || "" });
  };

  const handleSaveCurriculum = async (id: number) => {
    if (!editCurrForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curriculums/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editCurrForm.title, description: editCurrForm.description }),
      });
      if (res.ok) { await loadCurriculums(); setEditingCurriculum(null); }
    } catch (err) { console.error("Error updating curriculum:", err); }
    finally { setSaving(false); }
  };

  const startEditDeck = (deck: VibeDeckData) => {
    setEditingCurriculum(null); setEditingCard(null); setEditingTome(null);
    setEditingDeck(deck.id);
    setEditDeckForm({ title: deck.title, description: deck.description || "" });
  };

  const handleSaveDeck = async (deckId: number, curriculumId: number) => {
    if (!editDeckForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/decks/${deckId}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editDeckForm.title, description: editDeckForm.description }),
      });
      if (res.ok) { await loadDecks(curriculumId); setEditingDeck(null); }
    } catch (err) { console.error("Error updating deck:", err); }
    finally { setSaving(false); }
  };

  const startEditTome = (tome: TomeData) => {
    setEditingCurriculum(null); setEditingDeck(null); setEditingCard(null);
    setEditingTome(tome.id);
    setEditTomeForm({ title: tome.title, content: tome.content || "" });
  };

  const handleSaveTome = async (tomeId: number, deckId: number) => {
    if (!editTomeForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tomes/${tomeId}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTomeForm.title, content: editTomeForm.content }),
      });
      if (res.ok) { await loadTomes(deckId); setEditingTome(null); }
    } catch (err) { console.error("Error saving tome:", err); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-500" />
          Curriculum Builder
        </h2>
        <button
          onClick={() => setAddingCurriculum(!addingCurriculum)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Curriculum
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Organize your training into Curricula &gt; Catalogs &gt; Lessons &gt; Tasks. Click to expand each level.
      </p>

      {addingCurriculum && (
        <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
          <h3 className="text-sm font-medium text-slate-800 mb-3">New Curriculum</h3>
          <div className="space-y-3">
            <input type="text" value={newCurrTitle} onChange={(e) => setNewCurrTitle(e.target.value)} placeholder="Curriculum title (e.g., Published Writer)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500" autoFocus />
            <input type="text" value={newCurrDesc} onChange={(e) => setNewCurrDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setAddingCurriculum(false); setNewCurrTitle(""); setNewCurrDesc(""); }} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={handleAddCurriculum} disabled={saving || !newCurrTitle.trim()} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? "Adding..." : "Add Curriculum"}
              </button>
            </div>
          </div>
        </div>
      )}

      {curriculums.length === 0 && !addingCurriculum ? (
        <div className="text-center py-12 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No curricula yet. Click "Add Curriculum" to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {curriculums.map((curriculum) => {
            const isCurrExpanded = expandedCurricula.has(curriculum.id);
            return (
              <div key={curriculum.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {editingCurriculum === curriculum.id ? (
                  <div className="px-4 py-3 bg-teal-50 border-b border-teal-200">
                    <div className="space-y-2">
                      <input type="text" value={editCurrForm.title} onChange={(e) => setEditCurrForm({ ...editCurrForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500" placeholder="Curriculum title" autoFocus />
                      <input type="text" value={editCurrForm.description} onChange={(e) => setEditCurrForm({ ...editCurrForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500" placeholder="Description (optional)" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingCurriculum(null)} className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"><X className="w-4 h-4" /></button>
                        <button onClick={() => handleSaveCurriculum(curriculum.id)} disabled={saving || !editCurrForm.title.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-teal-50 hover:to-white transition-colors">
                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <button onClick={() => toggleCurriculum(curriculum.id)} className="flex items-center gap-3 flex-1 text-left">
                      {isCurrExpanded ? <ChevronDown className="w-5 h-5 text-teal-500 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                      <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{curriculum.title}</h3>
                        {curriculum.description && <p className="text-xs text-gray-500">{curriculum.description}</p>}
                      </div>
                    </button>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">
                      {curriculum.deck_count} {Number(curriculum.deck_count) === 1 ? "Catalog" : "Catalogs"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePublish("curriculum", curriculum.id, curriculum.is_published); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${curriculum.is_published ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200" : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${curriculum.is_published ? "bg-green-500" : "bg-amber-500"}`} />
                      {curriculum.is_published ? "Live" : "Draft"}
                    </button>
                    <button onClick={() => startEditCurriculum(curriculum)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteCurriculum(curriculum.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}

                {isCurrExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    <div className="px-4 py-2 flex justify-end">
                      <button
                        onClick={() => { setAddingDeckFor(addingDeckFor === curriculum.id ? null : curriculum.id); setNewDeckTitle(""); setNewDeckDesc(""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Catalog
                      </button>
                    </div>

                    {addingDeckFor === curriculum.id && (
                      <div className="mx-4 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="space-y-2">
                          <input type="text" value={newDeckTitle} onChange={(e) => setNewDeckTitle(e.target.value)} placeholder="Deck title" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" autoFocus />
                          <input type="text" value={newDeckDesc} onChange={(e) => setNewDeckDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setAddingDeckFor(null)} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs transition-colors">Cancel</button>
                            <button onClick={() => handleAddDeck(curriculum.id)} disabled={saving || !newDeckTitle.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                              {saving ? "Adding..." : "Add Deck"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 px-4 pb-3">
                      {(curriculum.decks || []).map((deck) => {
                        const isDeckExpanded = expandedDecks.has(deck.id);
                        return (
                          <div key={deck.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            {editingDeck === deck.id ? (
                              <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                                <div className="space-y-2">
                                  <input type="text" value={editDeckForm.title} onChange={(e) => setEditDeckForm({ ...editDeckForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="Deck title" autoFocus />
                                  <input type="text" value={editDeckForm.description} onChange={(e) => setEditDeckForm({ ...editDeckForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="Description (optional)" />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingDeck(null)} className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"><X className="w-4 h-4" /></button>
                                    <button onClick={() => handleSaveDeck(deck.id, curriculum.id)} disabled={saving || !editDeckForm.title.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                      Save
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 transition-colors">
                                <div className="w-4" />
                                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                <button onClick={() => toggleDeck(deck.id)} className="flex items-center gap-3 flex-1 text-left">
                                  {isDeckExpanded ? <ChevronDown className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                  <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-slate-700 text-sm">{deck.title}</h4>
                                    {deck.description && <p className="text-xs text-gray-400">{deck.description}</p>}
                                  </div>
                                </button>
                                <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                                  {deck.tome_count || 0} {Number(deck.tome_count || 0) === 1 ? "Lesson" : "Lessons"}
                                </span>
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                  {deck.card_count} {Number(deck.card_count) === 1 ? "Task" : "Tasks"}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleTogglePublish("deck", deck.id, deck.is_published, curriculum.id); }}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${deck.is_published ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200" : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"}`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${deck.is_published ? "bg-green-500" : "bg-amber-500"}`} />
                                  {deck.is_published ? "Live" : "Draft"}
                                </button>
                                <button onClick={() => startEditDeck(deck)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteDeck(deck.id, curriculum.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}

                            {isDeckExpanded && (
                              <div className="border-t border-gray-100 bg-slate-50/50">
                                <div className="px-4 py-2 flex justify-end">
                                  <button
                                    onClick={() => { setAddingTomeFor(addingTomeFor === deck.id ? null : deck.id); setNewTomeTitle(""); setNewTomeContent(""); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Lesson
                                  </button>
                                </div>

                                {addingTomeFor === deck.id && (
                                  <div className="mx-4 mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="space-y-2">
                                      <input type="text" value={newTomeTitle} onChange={(e) => setNewTomeTitle(e.target.value)} placeholder="Lesson title" className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white" autoFocus />
                                      <textarea value={newTomeContent} onChange={(e) => setNewTomeContent(e.target.value)} placeholder="Write your lesson content here..." rows={6} className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white resize-y" />
                                      <div className="flex justify-end gap-2">
                                        <button onClick={() => setAddingTomeFor(null)} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs transition-colors">Cancel</button>
                                        <button onClick={() => handleAddTome(deck.id)} disabled={saving || !newTomeTitle.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                                          {saving ? "Adding..." : "Add Lesson"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-1 px-4 pb-3">
                                  {(deck.tomes || []).map((tome) => {
                                    const isTomeExpanded = expandedTomes.has(tome.id);
                                    return (
                                      <div key={tome.id} className="border border-amber-200 rounded-lg overflow-hidden bg-white">
                                        {editingTome === tome.id ? (
                                          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200">
                                            <div className="space-y-2">
                                              <input type="text" value={editTomeForm.title} onChange={(e) => setEditTomeForm({ ...editTomeForm, title: e.target.value })} className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white" placeholder="Lesson title" autoFocus />
                                              <textarea value={editTomeForm.content} onChange={(e) => setEditTomeForm({ ...editTomeForm, content: e.target.value })} placeholder="Lesson content..." rows={6} className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white resize-y" />
                                              <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingTome(null)} className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"><X className="w-4 h-4" /></button>
                                                <button onClick={() => handleSaveTome(tome.id, deck.id)} disabled={saving || !editTomeForm.title.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                                                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                  Save
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/50 transition-colors">
                                            <div className="w-8" />
                                            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                            <button onClick={() => toggleTome(tome.id)} className="flex items-center gap-3 flex-1 text-left">
                                              {isTomeExpanded ? <ChevronDown className="w-4 h-4 text-amber-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                                              <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                              </div>
                                              <div className="flex-1">
                                                <h5 className="font-medium text-slate-700 text-sm">{tome.title}</h5>
                                                <p className="text-xs text-gray-400 line-clamp-1">{tome.content || "No content yet"}</p>
                                              </div>
                                            </button>
                                            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                                              {tome.card_count} {Number(tome.card_count) === 1 ? "Task" : "Tasks"}
                                            </span>
                                            <button onClick={() => startEditTome(tome)} className="p-1 text-gray-400 hover:text-amber-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDeleteTome(tome.id, deck.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                          </div>
                                        )}

                                        {isTomeExpanded && (
                                          <div className="border-t border-amber-100 bg-amber-50/30">
                                            <div className="px-4 py-2 flex justify-end">
                                              <button
                                                onClick={() => { setAddingCardFor(addingCardFor === tome.id ? null : tome.id); setNewCardTask(""); setNewCardQuals(""); setNewCardXp(100); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                                              >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Task
                                              </button>
                                            </div>

                                            {addingCardFor === tome.id && (
                                              <div className="mx-4 mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                <div className="space-y-2">
                                                  <input type="text" value={newCardTask} onChange={(e) => setNewCardTask(e.target.value)} placeholder="Task (e.g., Write a 500-word personal essay)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" autoFocus />
                                                  <input type="text" value={newCardQuals} onChange={(e) => setNewCardQuals(e.target.value)} placeholder="Qualifications (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
                                                  <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs text-gray-500 font-medium">Task Mode</span>
                                                      <select value={newCardTaskType} onChange={(e) => setNewCardTaskType(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white">
                                                        <option value="writing">Writing</option>
                                                        <option value="speaking">Speaking (VibeScribe)</option>
                                                        <option value="comprehension">Comprehension (Logic/Check)</option>
                                                      </select>
                                                    </div>
                                                    <div className="flex-1" />
                                                    <button onClick={() => setAddingCardFor(null)} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs transition-colors">Cancel</button>
                                                    <button onClick={() => handleAddCard(tome.id)} disabled={saving || !newCardTask.trim()} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                                                      {saving ? "Adding..." : "Add Task"}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            <div className="space-y-1 px-4 pb-3">
                                              {(tome.cards || []).map((card) => (
                                                <div key={card.id} className="bg-white border border-gray-150 rounded-lg hover:border-purple-200 hover:shadow-sm transition-all">
                                                  {editingCard === card.id ? (
                                                    <div className="p-3 space-y-2">
                                                      <input type="text" value={editForm.task} onChange={(e) => setEditForm({ ...editForm, task: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" placeholder="Task" />
                                                      <input type="text" value={editForm.qualifications} onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" placeholder="Qualifications" />
                                                      <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-xs text-gray-500 font-medium">Task Mode</span>
                                                          <select value={editForm.taskType} onChange={(e) => setEditForm({ ...editForm, taskType: e.target.value })} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white">
                                                            <option value="writing">Writing</option>
                                                            <option value="speaking">Speaking (VibeScribe)</option>
                                                            <option value="comprehension">Comprehension (Logic/Check)</option>
                                                          </select>
                                                        </div>
                                                        <div className="flex-1" />
                                                        <button onClick={() => setEditingCard(null)} className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"><X className="w-4 h-4" /></button>
                                                        <button onClick={() => handleSaveCard(card.id, tome.id)} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                                                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                          Save
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center gap-3 px-4 py-2.5">
                                                      <div className="w-12" />
                                                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                      <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                        <Sparkles className="w-3 h-3 text-purple-600" />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-slate-700 truncate">{card.task}</p>
                                                        <p className="text-xs text-gray-400 truncate">{card.qualifications || "No qualifications set"}</p>
                                                      </div>
                                                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                        card.task_type === "speaking" ? "bg-blue-100 text-blue-700" :
                                                        card.task_type === "comprehension" ? "bg-orange-100 text-orange-700" :
                                                        "bg-green-100 text-green-700"
                                                      }`}>
                                                        {card.task_type === "speaking" ? "Speaking" : card.task_type === "comprehension" ? "Comprehension" : "Writing"}
                                                      </span>
                                                      <button onClick={() => startEditCard(card)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                      <button onClick={() => handleDeleteCard(card.id, tome.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                              {(tome.cards || []).length === 0 && (
                                                <div className="text-center py-4 text-gray-400 text-sm">
                                                  No tasks yet. Add your first Task above.
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {(deck.tomes || []).length === 0 && (
                                    <div className="text-center py-4 text-gray-400 text-sm">
                                      No lessons yet. Add your first Lesson above.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(curriculum.decks || []).length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No catalogs yet. Add your first Catalog above.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
