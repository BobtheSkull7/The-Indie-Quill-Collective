import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Layers,
  Sparkles,
  Plus,
  GripVertical,
  Clock,
  Star,
} from "lucide-react";

interface VibeDeckCard {
  id: string;
  task: string;
  qualifications: string;
  xpValue: number;
}

interface VibeDeck {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  cards: VibeDeckCard[];
}

interface Curriculum {
  id: string;
  title: string;
  description: string;
  deckCount: number;
  decks: VibeDeck[];
}

const PLACEHOLDER_DATA: Curriculum[] = [
  {
    id: "curr-1",
    title: "Professional Writer",
    description: "Full curriculum for aspiring professional authors",
    deckCount: 3,
    decks: [
      {
        id: "deck-1a",
        title: "Lesson A: Finding Your Voice",
        description: "Discover your unique writing style and narrative voice",
        cardCount: 3,
        cards: [
          { id: "card-1", task: "Write a 500-word personal essay", qualifications: "Complete Voice Discovery module", xpValue: 150 },
          { id: "card-2", task: "Read and analyze 3 author voice examples", qualifications: "Submit annotated readings", xpValue: 100 },
          { id: "card-3", task: "Record a VibeScribe voice reflection", qualifications: "Minimum 2-minute recording", xpValue: 75 },
        ],
      },
      {
        id: "deck-1b",
        title: "Lesson B: Character Building",
        description: "Learn to create compelling, multi-dimensional characters",
        cardCount: 2,
        cards: [
          { id: "card-4", task: "Create a character profile sheet", qualifications: "Include backstory, motivations, flaws", xpValue: 200 },
          { id: "card-5", task: "Write a dialogue scene between two characters", qualifications: "Minimum 300 words, distinct voices", xpValue: 175 },
        ],
      },
      {
        id: "deck-1c",
        title: "Lesson C: World Building",
        description: "Craft immersive settings and environments for your stories",
        cardCount: 2,
        cards: [
          { id: "card-6", task: "Sketch a world map or setting diagram", qualifications: "Include 5+ key locations", xpValue: 125 },
          { id: "card-7", task: "Write a 400-word setting description", qualifications: "Use all 5 senses", xpValue: 150 },
        ],
      },
    ],
  },
  {
    id: "curr-2",
    title: "Writing-to-Read",
    description: "Literacy-focused curriculum for adult learners",
    deckCount: 2,
    decks: [
      {
        id: "deck-2a",
        title: "Lesson A: My Story Matters",
        description: "Building confidence through personal narrative",
        cardCount: 2,
        cards: [
          { id: "card-8", task: "Tell your story using VibeScribe", qualifications: "Record at least 1 minute", xpValue: 100 },
          { id: "card-9", task: "Read your transcription aloud", qualifications: "Practice reading your own words", xpValue: 75 },
        ],
      },
      {
        id: "deck-2b",
        title: "Lesson B: Words Around Me",
        description: "Connecting literacy to everyday life",
        cardCount: 1,
        cards: [
          { id: "card-10", task: "Photograph 10 signs and read them aloud", qualifications: "Use VibeScribe to record readings", xpValue: 125 },
        ],
      },
    ],
  },
];

export default function VibeDeckCurriculum() {
  const [expandedCurricula, setExpandedCurricula] = useState<Set<string>>(new Set(["curr-1"]));
  const [expandedDecks, setExpandedDecks] = useState<Set<string>>(new Set());

  const toggleCurriculum = (id: string) => {
    setExpandedCurricula((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDeck = (id: string) => {
    setExpandedDecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-500" />
          Vibe Deck Builder
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Add Curriculum
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Organize your training into Curricula, Vibe Decks (lessons), and Vibe Cards (tasks). Click to expand each level.
      </p>

      <div className="space-y-2">
        {PLACEHOLDER_DATA.map((curriculum) => {
          const isCurrExpanded = expandedCurricula.has(curriculum.id);
          return (
            <div key={curriculum.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCurriculum(curriculum.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-teal-50 hover:to-white transition-colors"
              >
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                {isCurrExpanded ? (
                  <ChevronDown className="w-5 h-5 text-teal-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-slate-800">{curriculum.title}</h3>
                  <p className="text-xs text-gray-500">{curriculum.description}</p>
                </div>
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">
                  {curriculum.deckCount} {curriculum.deckCount === 1 ? "Deck" : "Decks"}
                </span>
              </button>

              {isCurrExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  <div className="px-4 py-2 flex justify-end">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Add Vibe Deck
                    </button>
                  </div>

                  <div className="space-y-1 px-4 pb-3">
                    {curriculum.decks.map((deck) => {
                      const isDeckExpanded = expandedDecks.has(deck.id);
                      return (
                        <div key={deck.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <button
                            onClick={() => toggleDeck(deck.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 transition-colors"
                          >
                            <div className="w-4" />
                            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            {isDeckExpanded ? (
                              <ChevronDown className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Layers className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="font-medium text-slate-700 text-sm">{deck.title}</h4>
                              <p className="text-xs text-gray-400">{deck.description}</p>
                            </div>
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                              {deck.cardCount} {deck.cardCount === 1 ? "Card" : "Cards"}
                            </span>
                          </button>

                          {isDeckExpanded && (
                            <div className="border-t border-gray-100 bg-slate-50/50">
                              <div className="px-4 py-2 flex justify-end">
                                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                  Add Vibe Card
                                </button>
                              </div>

                              <div className="space-y-1 px-4 pb-3">
                                {deck.cards.map((card) => (
                                  <div
                                    key={card.id}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-150 rounded-lg hover:border-purple-200 hover:shadow-sm transition-all"
                                  >
                                    <div className="w-8" />
                                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                    <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center flex-shrink-0">
                                      <Sparkles className="w-3 h-3 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-slate-700 truncate">{card.task}</p>
                                      <p className="text-xs text-gray-400 truncate">{card.qualifications}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <Star className="w-3.5 h-3.5 text-amber-400" />
                                      <span className="text-xs font-bold text-amber-600">{card.xpValue} XP</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
