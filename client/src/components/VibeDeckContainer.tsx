import { useState, useEffect } from "react";
import { Layers, ChevronDown, ChevronRight, Sparkles, BookOpen, ScrollText, Lock, X } from "lucide-react";
import VibeDeckCard from "./VibeDeckCard";

interface CardData {
  id: number;
  task: string;
  qualifications: string | null;
  xp_value: number;
  deck_id: number;
}

interface DeckData {
  id: number;
  title: string;
  description: string | null;
  tome_title: string | null;
  tome_content: string | null;
  curriculum_id: number;
  curriculum_title: string;
  cards: CardData[];
  tome_absorbed: boolean;
}

interface CurriculumData {
  id: number;
  title: string;
  description: string | null;
}

export default function VibeDeckContainer() {
  const [curriculums, setCurriculums] = useState<CurriculumData[]>([]);
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCurriculum, setExpandedCurriculum] = useState<number | null>(null);
  const [expandedDeck, setExpandedDeck] = useState<number | null>(null);
  const [tomeModalDeck, setTomeModalDeck] = useState<DeckData | null>(null);
  const [absorbing, setAbsorbing] = useState(false);
  const [showScrollContent, setShowScrollContent] = useState(false);

  useEffect(() => {
    loadVibeDecks();
  }, []);

  useEffect(() => {
    if (tomeModalDeck) {
      setShowScrollContent(false);
      const timer = setTimeout(() => setShowScrollContent(true), 400);
      return () => clearTimeout(timer);
    }
  }, [tomeModalDeck]);

  const loadVibeDecks = async () => {
    try {
      const res = await fetch("/api/student/vibe-decks", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCurriculums(data.curriculums || []);
        setDecks(data.decks || []);
        if (data.curriculums?.length > 0) {
          setExpandedCurriculum(data.curriculums[0].id);
          const firstDeck = (data.decks || []).find((d: DeckData) => d.curriculum_id === data.curriculums[0].id);
          if (firstDeck) setExpandedDeck(firstDeck.id);
        }
      }
    } catch (err) {
      console.error("Error loading vibe decks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbsorbTome = async (deckId: number) => {
    setAbsorbing(true);
    try {
      const res = await fetch("/api/student/absorb-tome", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId }),
      });
      if (res.ok) {
        setDecks(prev => prev.map(d =>
          d.id === deckId ? { ...d, tome_absorbed: true } : d
        ));
        setTimeout(() => {
          setTomeModalDeck(null);
        }, 800);
      }
    } catch (err) {
      console.error("Error absorbing tome:", err);
    } finally {
      setAbsorbing(false);
    }
  };

  const hasTome = (deck: DeckData) => !!(deck.tome_title && deck.tome_content);
  const isLocked = (deck: DeckData) => hasTome(deck) && !deck.tome_absorbed;

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

  const totalXP = decks.flatMap(d => d.cards).reduce((sum, c) => sum + c.xp_value, 0);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes scrollUnroll {
          0% { max-height: 0; opacity: 0; transform: scaleY(0.3); }
          30% { opacity: 0.6; transform: scaleY(0.7); }
          100% { max-height: 2000px; opacity: 1; transform: scaleY(1); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .scroll-unroll {
          animation: scrollUnroll 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: top center;
        }
        .scroll-content-fade {
          animation: fadeInUp 0.5s ease-out 0.4s both;
        }
        .parchment-bg {
          background: linear-gradient(180deg, #f5e6c8 0%, #faf0dc 15%, #f8ead0 50%, #f5e2c0 85%, #ede0b8 100%);
        }
        .parchment-border {
          border-image: linear-gradient(to bottom, #c4a265, #a88a4a, #c4a265) 1;
        }
        .locked-cards {
          filter: blur(4px);
          opacity: 0.5;
          pointer-events: none;
          user-select: none;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-800">Your Curriculum</h2>
            <p className="text-sm text-gray-500">Complete tasks to earn XP and level up</p>
          </div>
        </div>
        {totalXP > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
            <span className="text-sm text-amber-700 font-medium">{totalXP} XP available</span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {curriculums.map((curriculum) => {
          const curriculumDecks = decks.filter(d => d.curriculum_id === curriculum.id);
          const isCurriculumExpanded = expandedCurriculum === curriculum.id;
          const curriculumXP = curriculumDecks.flatMap(d => d.cards).reduce((sum, c) => sum + c.xp_value, 0);
          const totalCards = curriculumDecks.reduce((sum, d) => sum + d.cards.length, 0);

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
                  <span className="text-xs text-gray-500">{curriculumDecks.length} {curriculumDecks.length === 1 ? 'deck' : 'decks'} · {totalCards} {totalCards === 1 ? 'task' : 'tasks'}</span>
                  {curriculumXP > 0 && (
                    <span className="text-xs font-medium text-amber-600">{curriculumXP} XP</span>
                  )}
                </div>
              </button>

              {isCurriculumExpanded && (
                <div className="px-5 pb-5 border-t border-purple-100 bg-gradient-to-b from-purple-50/30 to-white">
                  {curriculumDecks.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      No decks available in this curriculum yet.
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {curriculumDecks.map((deck) => {
                        const isDeckExpanded = expandedDeck === deck.id;
                        const deckTotalXP = deck.cards.reduce((sum, c) => sum + c.xp_value, 0);
                        const locked = isLocked(deck);
                        const hasTomeContent = hasTome(deck);

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
                                {locked && (
                                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                    <Lock className="w-3 h-3" />
                                    Locked
                                  </span>
                                )}
                                {hasTomeContent && deck.tome_absorbed && (
                                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                    <ScrollText className="w-3 h-3" />
                                    Absorbed
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">{deck.cards.length} {deck.cards.length === 1 ? 'task' : 'tasks'}</span>
                                {deckTotalXP > 0 && (
                                  <span className="text-xs font-medium text-amber-600">{deckTotalXP} XP</span>
                                )}
                              </div>
                            </button>

                            {isDeckExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                                {hasTomeContent && (
                                  <div className="mb-4 mt-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTomeModalDeck(deck); }}
                                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                                        locked
                                          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 shadow-sm"
                                          : "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100"
                                      }`}
                                    >
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${locked ? "bg-amber-100" : "bg-green-100"}`}>
                                        <ScrollText className={`w-5 h-5 ${locked ? "text-amber-600" : "text-green-600"}`} />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <p className={`font-semibold text-sm ${locked ? "text-amber-800" : "text-green-800"}`}>
                                          {deck.tome_title}
                                        </p>
                                        <p className={`text-xs ${locked ? "text-amber-600" : "text-green-600"}`}>
                                          {locked ? "Read & absorb to unlock cards" : "Wisdom absorbed - tap to re-read"}
                                        </p>
                                      </div>
                                      <ScrollText className={`w-5 h-5 ${locked ? "text-amber-400" : "text-green-400"}`} />
                                    </button>
                                  </div>
                                )}

                                {locked && (
                                  <div className="relative">
                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                      <div className="flex flex-col items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl border border-amber-200 shadow-lg">
                                        <Lock className="w-8 h-8 text-amber-500" />
                                        <p className="text-sm font-medium text-amber-800">Absorb the Tome to unlock</p>
                                      </div>
                                    </div>
                                    <div className="locked-cards">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                        {deck.cards.map((card) => (
                                          <VibeDeckCard
                                            key={card.id}
                                            task={card.task}
                                            qualifications={card.qualifications || "No specific qualifications"}
                                            xpValue={card.xp_value}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {!locked && (
                                  <>
                                    {deck.cards.length === 0 ? (
                                      <div className="text-center py-6 text-gray-400 text-sm">
                                        No tasks available in this deck yet.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                        {deck.cards.map((card) => (
                                          <VibeDeckCard
                                            key={card.id}
                                            task={card.task}
                                            qualifications={card.qualifications || "No specific qualifications"}
                                            xpValue={card.xp_value}
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

      {tomeModalDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setTomeModalDeck(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-lg shadow-2xl scroll-unroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setTomeModalDeck(null)}
                className="p-2 rounded-full bg-amber-900/30 hover:bg-amber-900/50 text-amber-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="parchment-bg border-4 border-amber-700/30 rounded-lg overflow-y-auto max-h-[85vh]">
              <div className="relative px-8 py-10 sm:px-12 sm:py-14">
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-amber-900/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-amber-900/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-amber-900/10 to-transparent pointer-events-none" />

                {showScrollContent && (
                  <div className="scroll-content-fade">
                    <div className="text-center mb-8">
                      <ScrollText className="w-10 h-10 text-amber-700 mx-auto mb-4" />
                      <h2
                        className="text-2xl sm:text-3xl font-bold text-amber-900 mb-2"
                        style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
                      >
                        {tomeModalDeck.tome_title}
                      </h2>
                      <div className="w-24 h-0.5 bg-amber-700/30 mx-auto mt-4" />
                    </div>

                    <div
                      className="text-amber-900/85 leading-relaxed text-base sm:text-lg whitespace-pre-wrap"
                      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                      {tomeModalDeck.tome_content}
                    </div>

                    <div className="mt-10 pt-6 border-t border-amber-700/20">
                      {!tomeModalDeck.tome_absorbed ? (
                        <div className="text-center">
                          <p
                            className="text-sm text-amber-700 mb-4 italic"
                            style={{ fontFamily: "'Georgia', serif" }}
                          >
                            By absorbing this wisdom, you unlock the tasks within this deck.
                          </p>
                          <button
                            onClick={() => handleAbsorbTome(tomeModalDeck.id)}
                            disabled={absorbing}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                          >
                            <Sparkles className="w-5 h-5" />
                            {absorbing ? "Absorbing..." : "Absorb Wisdom"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-green-700 font-semibold flex items-center justify-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
                            <Sparkles className="w-5 h-5 text-green-600" />
                            Wisdom Absorbed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!showScrollContent && (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
