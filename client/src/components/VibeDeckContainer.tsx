import { useState } from "react";
import { Layers, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import VibeDeckCard from "./VibeDeckCard";

interface CardData {
  id: string;
  task: string;
  qualifications: string;
  xpValue: number;
  isCompleted?: boolean;
}

interface DeckData {
  id: string;
  title: string;
  description: string;
  cards: CardData[];
}

const PLACEHOLDER_DECKS: DeckData[] = [
  {
    id: "deck-1",
    title: "Finding Your Voice",
    description: "Discover your unique writing style and narrative voice",
    cards: [
      { id: "c1", task: "Write a 500-word personal essay about a moment that changed you", qualifications: "Complete the Voice Discovery module. Must demonstrate personal reflection and narrative structure.", xpValue: 150, isCompleted: true },
      { id: "c2", task: "Read and annotate 3 different author voice examples", qualifications: "Submit annotated PDFs or notes for each reading. Identify tone, word choice, and rhythm patterns.", xpValue: 100 },
      { id: "c3", task: "Record a VibeScribe voice reflection on your writing style", qualifications: "Minimum 2-minute recording. Discuss what makes your voice unique and areas to develop.", xpValue: 75 },
    ],
  },
  {
    id: "deck-2",
    title: "Character Building",
    description: "Create compelling, multi-dimensional characters",
    cards: [
      { id: "c4", task: "Create a full character profile sheet for your protagonist", qualifications: "Include backstory, motivations, strengths, flaws, and goals. Use the Writer Character Sheet format.", xpValue: 200 },
      { id: "c5", task: "Write a dialogue scene between two contrasting characters", qualifications: "Minimum 300 words. Characters must have distinct, recognizable voices.", xpValue: 175 },
    ],
  },
  {
    id: "deck-3",
    title: "World Building",
    description: "Craft immersive settings for your stories",
    cards: [
      { id: "c6", task: "Create a detailed map or diagram of your story's world", qualifications: "Include at least 5 key locations with brief descriptions of each place's significance.", xpValue: 125 },
      { id: "c7", task: "Write a 400-word immersive setting description", qualifications: "Engage all 5 senses. The reader should feel transported to this place.", xpValue: 150, isCompleted: true },
    ],
  },
];

export default function VibeDeckContainer() {
  const [expandedDeck, setExpandedDeck] = useState<string | null>("deck-1");

  const totalXP = PLACEHOLDER_DECKS.flatMap((d) => d.cards).reduce((sum, c) => sum + c.xpValue, 0);
  const earnedXP = PLACEHOLDER_DECKS.flatMap((d) => d.cards)
    .filter((c) => c.isCompleted)
    .reduce((sum, c) => sum + c.xpValue, 0);

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
          <span className="text-sm text-amber-700 font-medium">{earnedXP} / {totalXP} XP</span>
        </div>
      </div>

      <div className="space-y-4">
        {PLACEHOLDER_DECKS.map((deck) => {
          const isExpanded = expandedDeck === deck.id;
          const deckEarnedXP = deck.cards.filter((c) => c.isCompleted).reduce((sum, c) => sum + c.xpValue, 0);
          const deckTotalXP = deck.cards.reduce((sum, c) => sum + c.xpValue, 0);
          const completedCount = deck.cards.filter((c) => c.isCompleted).length;

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
                  <span className="text-xs text-gray-500">{completedCount}/{deck.cards.length} done</span>
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${deck.cards.length > 0 ? (completedCount / deck.cards.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-amber-600 min-w-[60px] text-right">
                    {deckEarnedXP}/{deckTotalXP} XP
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {deck.cards.map((card) => (
                      <VibeDeckCard
                        key={card.id}
                        task={card.task}
                        qualifications={card.qualifications}
                        xpValue={card.xpValue}
                        isCompleted={card.isCompleted}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
