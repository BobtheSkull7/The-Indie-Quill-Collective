import { useState, useEffect } from "react";
import { Layers, ChevronDown, ChevronRight, Sparkles, BookOpen, FileText, Lock, X } from "lucide-react";
import VibeDeckCard from "./VibeDeckCard";
import ManuscriptEditor from "./ManuscriptEditor";
import PathSelectionModal from "./PathSelectionModal";

interface CardData {
  id: number;
  task: string;
  qualifications: string | null;
  xp_value: number;
  min_word_count: number;
  tome_id: number;
}

interface TomeData {
  id: number;
  deck_id: number;
  title: string;
  content: string;
  order_index: number;
  cards: CardData[];
  absorbed: boolean;
}

interface DeckData {
  id: number;
  title: string;
  description: string | null;
  specialization: string | null;
  curriculum_id: number;
  curriculum_title: string;
  tomes: TomeData[];
}

interface CurriculumData {
  id: number;
  title: string;
  description: string | null;
}

export default function VibeDeckContainer({ onMetricsChange }: { onMetricsChange?: () => void } = {}) {
  const [curriculums, setCurriculums] = useState<CurriculumData[]>([]);
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCurriculum, setExpandedCurriculum] = useState<number | null>(null);
  const [expandedDeck, setExpandedDeck] = useState<number | null>(null);
  const [expandedTome, setExpandedTome] = useState<number | null>(null);
  const [tomeModal, setTomeModal] = useState<TomeData | null>(null);
  const [absorbing, setAbsorbing] = useState(false);
  const [showFolioContent, setShowFolioContent] = useState(false);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());
  const [activeManuscript, setActiveManuscript] = useState<CardData | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [oathTomeId, setOathTomeId] = useState<number | null>(null);
  const [showPathModal, setShowPathModal] = useState(false);
  const [authorPath, setAuthorPath] = useState<string | null>(null);

  useEffect(() => {
    loadVibeDecks();
    checkPathEligibility();
  }, []);

  useEffect(() => {
    if (tomeModal) {
      setShowFolioContent(false);
      const timer = setTimeout(() => setShowFolioContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [tomeModal]);

  const loadVibeDecks = async () => {
    try {
      const [decksRes, subsRes] = await Promise.all([
        fetch("/api/student/vibe-decks", { credentials: "include" }),
        fetch("/api/student/submissions", { credentials: "include" }),
      ]);
      if (decksRes.ok) {
        const data = await decksRes.json();
        setCurriculums(data.curriculums || []);
        setDecks(data.decks || []);
        setOnboardingComplete(data.onboarding_complete !== false);
        setOathTomeId(data.oath_tome_id || null);
        if (data.curriculums?.length > 0) {
          setExpandedCurriculum(data.curriculums[0].id);
          const firstDeck = (data.decks || []).find((d: DeckData) => d.curriculum_id === data.curriculums[0].id);
          if (firstDeck) setExpandedDeck(firstDeck.id);
        }
      }
      if (subsRes.ok) {
        const subs = await subsRes.json();
        const completed = new Set<number>((subs || []).map((s: any) => s.card_id));
        setCompletedCards(completed);
      }
    } catch (err) {
      console.error("Error loading vibe decks:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkPathEligibility = async () => {
    try {
      const res = await fetch(`/api/student/author-metrics?_t=${Date.now()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const badges: string[] = data.badges || [];
        if (badges.includes("foundations_mastery") && !data.authorPath) {
          setShowPathModal(true);
        }
        setAuthorPath(data.authorPath || null);
      }
    } catch (err) {
      console.error("Error checking path eligibility:", err);
    }
  };

  const handlePathSelected = (path: string) => {
    setShowPathModal(false);
    setAuthorPath(path);
    onMetricsChange?.();
    loadVibeDecks();
  };

  const handleAbsorbTome = async (tomeId: number) => {
    setAbsorbing(true);
    try {
      const res = await fetch("/api/student/absorb-tome", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tomeId }),
      });
      if (res.ok) {
        setDecks(prev => prev.map(d => ({
          ...d,
          tomes: d.tomes.map(t =>
            t.id === tomeId ? { ...t, absorbed: true } : t
          ),
        })));
        onMetricsChange?.();
        checkPathEligibility();
        setTimeout(() => {
          setTomeModal(null);
        }, 800);
      }
    } catch (err) {
      console.error("Error absorbing tome:", err);
    } finally {
      setAbsorbing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (curriculums.length === 0) {
    return null;
  }

  return (
    <>
    {showPathModal && (
      <PathSelectionModal onPathSelected={handlePathSelected} />
    )}
    <div className="space-y-6">
      <style>{`
        @keyframes folioBackdropIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes folioSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes folioRuleLine {
          0% { width: 0%; opacity: 0; }
          100% { width: 100%; opacity: 1; }
        }
        @keyframes folioInkIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .folio-backdrop {
          animation: folioBackdropIn 0.3s ease-out forwards;
          background: rgba(10, 15, 40, 0.7);
          backdrop-filter: blur(8px);
        }
        .folio-container {
          animation: folioSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .folio-paper {
          background-color: #FDFBF7;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          border: 1px solid rgba(51, 51, 51, 0.15);
        }
        .folio-rule-line {
          animation: folioRuleLine 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }
        .folio-content-ink {
          animation: folioInkIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        .folio-drop-cap::first-letter {
          float: left; font-family: 'Playfair Display', 'Georgia', serif;
          font-size: 3.8rem; line-height: 0.85; font-weight: 700; color: #2C2C2C;
          margin-right: 8px; margin-top: 4px;
        }
        .locked-cards { filter: blur(4px); opacity: 0.5; pointer-events: none; user-select: none; }
        @media (prefers-reduced-motion: reduce) {
          .folio-container, .folio-backdrop, .folio-rule-line, .folio-content-ink { animation: none !important; }
          .folio-container { opacity: 1; transform: none; }
          .folio-backdrop { opacity: 1; }
          .folio-rule-line { width: 100%; opacity: 1; }
          .folio-content-ink { opacity: 1; transform: none; }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-800">Curriculum</h2>
            <p className="text-sm text-gray-500">Complete tasks to build your author portfolio</p>
          </div>
        </div>
      </div>

      {!onboardingComplete && oathTomeId && (
        <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-2">
            <BookOpen className="w-6 h-6 text-amber-700" />
          </div>
          <h3 className="font-display text-lg font-bold text-amber-900">Begin Your Journey</h3>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            Start with The Scribe's Oath in The Story Engine to begin your writing adventure.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {curriculums.map((curriculum) => {
          const allCurriculumDecks = decks.filter(d => d.curriculum_id === curriculum.id);
          const curriculumDecks = allCurriculumDecks.filter(d => {
            if (!d.specialization) return true;
            if (!authorPath) return false;
            return d.specialization === authorPath;
          });
          const isCurriculumExpanded = expandedCurriculum === curriculum.id;
          const totalTomes = curriculumDecks.reduce((sum, d) => sum + d.tomes.length, 0);
          const totalCards = curriculumDecks.reduce((sum, d) => sum + d.tomes.reduce((ts, t) => ts + t.cards.length, 0), 0);

          return (
            <div key={curriculum.id} className="rounded-xl border border-purple-200 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCurriculum(isCurriculumExpanded ? null : curriculum.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-purple-50/50 transition-colors"
              >
                {isCurriculumExpanded ? (
                  <ChevronDown className="w-5 h-5 text-purple-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-display font-bold text-slate-800 text-lg">{curriculum.title}</h3>
                  {curriculum.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{curriculum.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-gray-500">{curriculumDecks.length} {curriculumDecks.length === 1 ? 'catalog' : 'catalogs'} · {totalTomes} {totalTomes === 1 ? 'lesson' : 'lessons'} · {totalCards} {totalCards === 1 ? 'task' : 'tasks'}</span>
                </div>
              </button>

              {isCurriculumExpanded && (
                <div className="px-5 pb-5 border-t border-purple-100 bg-gradient-to-b from-purple-50/30 to-white">
                  {curriculumDecks.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      No catalogs available in this curriculum yet.
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {curriculumDecks.map((deck) => {
                        const isDeckExpanded = expandedDeck === deck.id;

                        return (
                          <div key={deck.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <button
                              onClick={() => setExpandedDeck(isDeckExpanded ? null : deck.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              {isDeckExpanded ? (
                                <ChevronDown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                                <Layers className="w-4 h-4 text-purple-600" />
                              </div>
                              <div className="flex-1 text-left">
                                <h4 className="font-semibold text-slate-800 text-sm">{deck.title}</h4>
                                {deck.description && (
                                  <p className="text-xs text-gray-500">{deck.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-gray-500">{deck.tomes.length} {deck.tomes.length === 1 ? 'lesson' : 'lessons'}</span>
                              </div>
                            </button>

                            {isDeckExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                                {deck.tomes.length === 0 ? (
                                  <div className="text-center py-6 text-gray-400 text-sm">
                                    No lessons available in this catalog yet.
                                  </div>
                                ) : (
                                  <div className="space-y-3 mt-3">
                                    {deck.tomes.map((tome) => {
                                      const isTomeExpanded = expandedTome === tome.id;
                                      const locked = !tome.absorbed;

                                      return (
                                        <div key={tome.id} className="rounded-lg border border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-white overflow-hidden">
                                          <div className="flex items-center gap-3 px-4 py-3">
                                            <button
                                              onClick={() => setExpandedTome(isTomeExpanded ? null : tome.id)}
                                              className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                                            >
                                              {isTomeExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                              ) : (
                                                <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                              )}
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tome.absorbed ? "bg-green-100" : "bg-amber-100"}`}>
                                                {locked ? (
                                                  <Lock className="w-4 h-4 text-amber-600" />
                                                ) : (
                                                  <BookOpen className="w-4 h-4 text-green-600" />
                                                )}
                                              </div>
                                              <div className="flex-1 text-left">
                                                <h5 className="font-semibold text-slate-800 text-sm">{tome.title}</h5>
                                                <p className="text-xs text-gray-500">
                                                  {locked ? "Read & complete to unlock tasks" : `${tome.cards.length} ${tome.cards.length === 1 ? 'task' : 'tasks'}`}
                                                </p>
                                              </div>
                                            </button>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              {tome.absorbed && (
                                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                                  <BookOpen className="w-3 h-3" />
                                                  Completed
                                                </span>
                                              )}
                                              <button
                                                onClick={(e) => { e.stopPropagation(); setTomeModal(tome); }}
                                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                                  locked
                                                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                    : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                                }`}
                                              >
                                                <BookOpen className="w-3 h-3" />
                                                {locked ? "Read Lesson" : "Re-read"}
                                              </button>
                                            </div>
                                          </div>

                                          {isTomeExpanded && (
                                            <div className="px-4 pb-4 pt-1 border-t border-amber-100">
                                              {locked ? (
                                                <div className="relative">
                                                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                                    <div className="flex flex-col items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl border border-amber-200 shadow-lg">
                                                      <Lock className="w-8 h-8 text-amber-500" />
                                                      <p className="text-sm font-medium text-amber-800">Complete the Lesson to unlock</p>
                                                    </div>
                                                  </div>
                                                  <div className="locked-cards">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                                      {tome.cards.map((card) => (
                                                        <VibeDeckCard
                                                          key={card.id}
                                                          task={card.task}
                                                          qualifications={card.qualifications || "No specific qualifications"}
                                                          xpValue={card.xp_value}
                                                          isCompleted={completedCards.has(card.id)}
                                                        />
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>
                                              ) : (
                                                <>
                                                  {tome.cards.length === 0 ? (
                                                    <div className="text-center py-6 text-gray-400 text-sm">
                                                      No tasks available in this lesson yet.
                                                    </div>
                                                  ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                                      {tome.cards.map((card) => (
                                                        <VibeDeckCard
                                                          key={card.id}
                                                          task={card.task}
                                                          qualifications={card.qualifications || "No specific qualifications"}
                                                          xpValue={card.xp_value}
                                                          isCompleted={completedCards.has(card.id)}
                                                          onStartWriting={() => setActiveManuscript(card)}
                                                        />
                                                      ))}
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={() => setTomeModal(null)}>
          <div className="absolute inset-0 folio-backdrop" />

          <div
            className="relative w-full max-w-2xl folio-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="folio-paper rounded-xl overflow-hidden shadow-2xl shadow-black/20">
              <div className="absolute top-4 right-4 z-30">
                <button
                  onClick={() => setTomeModal(null)}
                  className="p-2 rounded-full bg-[#2C2C2C]/5 hover:bg-[#2C2C2C]/10 text-[#2C2C2C]/40 hover:text-[#2C2C2C]/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative px-8 py-10 sm:px-14 sm:py-14 max-h-[80vh] overflow-y-auto">
                {showFolioContent ? (
                  <div>
                    <div className="text-center mb-8 folio-content-ink">
                      <h2
                        className="text-2xl sm:text-3xl font-semibold text-[#2C2C2C] tracking-tight mb-4"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {tomeModal.title}
                      </h2>
                      <div className="flex justify-center">
                        <div className="h-px bg-[#2C2C2C]/15 folio-rule-line" />
                      </div>
                    </div>

                    <div
                      className="folio-drop-cap folio-content-ink text-[#2C2C2C]/80 leading-[1.9] text-base sm:text-lg whitespace-pre-wrap"
                      style={{ fontFamily: "'EB Garamond', Georgia, serif", animationDelay: '0.4s' }}
                    >
                      {tomeModal.content}
                    </div>

                    <div className="mt-10 pt-6 border-t border-[#33333319] text-center folio-content-ink" style={{ animationDelay: '0.5s' }}>
                      {!tomeModal.absorbed ? (
                        <div className="space-y-3">
                          <p className="text-sm text-[#2C2C2C]/50" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
                            By completing this lesson, you unlock the tasks within.
                          </p>
                          <button
                            onClick={() => handleAbsorbTome(tomeModal.id)}
                            disabled={absorbing}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-[#2C2C2C] text-[#FDFBF7] rounded-lg
                              font-semibold hover:bg-[#1a1a1a] transition-all shadow-lg shadow-black/10
                              disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                          >
                            <BookOpen className="w-5 h-5" />
                            {absorbing ? "Completing..." : "Complete Lesson"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Lesson Completed
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-pulse text-[#2C2C2C]/20">
                      <FileText className="w-8 h-8" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeManuscript && (
        <ManuscriptEditor
          cardId={activeManuscript.id}
          task={activeManuscript.task}
          qualifications={activeManuscript.qualifications || ""}
          xpValue={activeManuscript.xp_value}
          minWordCount={activeManuscript.min_word_count}
          onClose={() => setActiveManuscript(null)}
          onSubmitted={(cardId) => {
            setCompletedCards(prev => new Set([...prev, cardId]));
            setActiveManuscript(null);
            onMetricsChange?.();
            if (!onboardingComplete) {
              loadVibeDecks();
            }
          }}
        />
      )}
    </div>
    </>
  );
}
