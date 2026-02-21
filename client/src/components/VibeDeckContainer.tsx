import { useState, useEffect } from "react";
import { Layers, ChevronDown, ChevronRight, Sparkles, BookOpen } from "lucide-react";
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
  curriculum_id: number;
  curriculum_title: string;
  cards: CardData[];
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

  useEffect(() => {
    loadVibeDecks();
  }, []);

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
                                <span className="text-xs text-gray-500">{deck.cards.length} {deck.cards.length === 1 ? 'task' : 'tasks'}</span>
                                {deckTotalXP > 0 && (
                                  <span className="text-xs font-medium text-amber-600">{deckTotalXP} XP</span>
                                )}
                              </div>
                            </button>

                            {isDeckExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
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
    </div>
  );
}
