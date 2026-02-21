import { useState, useEffect } from "react";
import { Layers, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
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
  curriculum_title: string;
  cards: CardData[];
}

export default function VibeDeckContainer() {
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeck, setExpandedDeck] = useState<number | null>(null);

  useEffect(() => {
    loadVibeDecks();
  }, []);

  const loadVibeDecks = async () => {
    try {
      const res = await fetch("/api/student/vibe-decks", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDecks(data.decks || []);
        if (data.decks?.length > 0) {
          setExpandedDeck(data.decks[0].id);
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

  if (decks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No Vibe Decks available yet</p>
        <p className="text-sm mt-1">Your training materials are being prepared. Check back soon!</p>
      </div>
    );
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
            <h2 className="font-display text-xl font-bold text-slate-800">Your Vibe Decks</h2>
            <p className="text-sm text-gray-500">Complete tasks to earn XP and level up</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
          <span className="text-sm text-amber-700 font-medium">{totalXP} XP available</span>
        </div>
      </div>

      <div className="space-y-4">
        {decks.map((deck) => {
          const isExpanded = expandedDeck === deck.id;
          const deckTotalXP = deck.cards.reduce((sum, c) => sum + c.xp_value, 0);

          return (
            <div key={deck.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedDeck(isExpanded ? null : deck.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-purple-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-slate-800">{deck.title}</h3>
                  <p className="text-xs text-gray-500">{deck.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-500">{deck.cards.length} tasks</span>
                  <span className="text-xs font-medium text-amber-600 min-w-[60px] text-right">
                    {deckTotalXP} XP
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                  {deck.cards.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      No tasks available in this deck yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
    </div>
  );
}
