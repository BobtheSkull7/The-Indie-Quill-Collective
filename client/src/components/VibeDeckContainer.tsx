import { useState, useEffect } from "react";
import { Layers, ChevronDown, ChevronRight, Sparkles, BookOpen, ScrollText, Lock, X } from "lucide-react";
import VibeDeckCard from "./VibeDeckCard";
import ManuscriptEditor from "./ManuscriptEditor";

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
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());
  const [activeManuscript, setActiveManuscript] = useState<CardData | null>(null);

  useEffect(() => {
    loadVibeDecks();
  }, []);

  useEffect(() => {
    if (tomeModalDeck) {
      setShowScrollContent(false);
      const timer = setTimeout(() => setShowScrollContent(true), 600);
      return () => clearTimeout(timer);
    }
  }, [tomeModalDeck]);

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
        @keyframes scrollUnrollCenter {
          0% {
            clip-path: inset(50% 0 50% 0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            clip-path: inset(0% 0 0% 0);
            opacity: 1;
          }
        }
        @keyframes dowelTop {
          0% { top: 50%; }
          100% { top: 0%; }
        }
        @keyframes dowelBottom {
          0% { bottom: 50%; }
          100% { bottom: 0%; }
        }
        @keyframes fadeInContent {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes backdropFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes candleFlicker {
          0%   { box-shadow: 0 0 15px 3px rgba(217, 164, 65, 0.25), 0 0 40px 8px rgba(217, 164, 65, 0.10), inset 0 0 20px rgba(180, 130, 50, 0.05); }
          15%  { box-shadow: 0 0 20px 5px rgba(230, 170, 60, 0.30), 0 0 50px 12px rgba(230, 170, 60, 0.12), inset 0 0 25px rgba(180, 130, 50, 0.07); }
          30%  { box-shadow: 0 0 12px 2px rgba(200, 150, 55, 0.20), 0 0 35px 6px rgba(200, 150, 55, 0.08), inset 0 0 18px rgba(180, 130, 50, 0.04); }
          50%  { box-shadow: 0 0 22px 6px rgba(240, 180, 70, 0.32), 0 0 55px 14px rgba(240, 180, 70, 0.14), inset 0 0 28px rgba(180, 130, 50, 0.08); }
          70%  { box-shadow: 0 0 14px 3px rgba(210, 155, 58, 0.22), 0 0 38px 7px rgba(210, 155, 58, 0.09), inset 0 0 20px rgba(180, 130, 50, 0.05); }
          85%  { box-shadow: 0 0 18px 4px rgba(225, 168, 62, 0.28), 0 0 45px 10px rgba(225, 168, 62, 0.11), inset 0 0 22px rgba(180, 130, 50, 0.06); }
          100% { box-shadow: 0 0 15px 3px rgba(217, 164, 65, 0.25), 0 0 40px 8px rgba(217, 164, 65, 0.10), inset 0 0 20px rgba(180, 130, 50, 0.05); }
        }
        .scroll-backdrop {
          animation: backdropFadeIn 0.4s ease-out forwards;
          background: rgba(10, 15, 40, 0.85);
          backdrop-filter: blur(6px);
        }
        .scroll-container {
          animation: scrollUnrollCenter 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
          position: relative;
        }
        .scroll-candlelight {
          animation: candleFlicker 3s ease-in-out infinite;
          animation-delay: 0.8s;
        }
        .dowel {
          position: absolute;
          left: -8px;
          right: -8px;
          height: 20px;
          z-index: 20;
          border-radius: 10px;
          background: linear-gradient(180deg, #8B6914 0%, #c9a227 20%, #dbb84d 40%, #c9a227 60%, #a07d1a 80%, #8B6914 100%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .dowel::before, .dowel::after {
          content: '';
          position: absolute;
          top: 2px;
          bottom: 2px;
          width: 24px;
          border-radius: 8px;
          background: linear-gradient(180deg, #7a5c10 0%, #b8921f 30%, #d4ac35 50%, #b8921f 70%, #7a5c10 100%);
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .dowel::before { left: -4px; }
        .dowel::after { right: -4px; }
        .dowel-top {
          animation: dowelTop 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        .dowel-bottom {
          animation: dowelBottom 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        .scroll-parchment {
          background-color: #f2e8cf;
          background-image:
            radial-gradient(ellipse at 20% 50%, rgba(180, 150, 100, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(160, 130, 80, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(170, 140, 90, 0.07) 0%, transparent 50%),
            linear-gradient(180deg, rgba(139, 105, 20, 0.06) 0%, transparent 5%, transparent 95%, rgba(139, 105, 20, 0.06) 100%);
        }
        .scroll-parchment::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
        }
        .scroll-edge-left, .scroll-edge-right {
          position: absolute;
          top: 20px;
          bottom: 20px;
          width: 12px;
          z-index: 5;
          pointer-events: none;
        }
        .scroll-edge-left {
          left: 0;
          background: linear-gradient(to right, rgba(139, 105, 20, 0.12), transparent);
          border-left: 1px solid rgba(139, 105, 20, 0.15);
        }
        .scroll-edge-right {
          right: 0;
          background: linear-gradient(to left, rgba(139, 105, 20, 0.12), transparent);
          border-right: 1px solid rgba(139, 105, 20, 0.15);
        }
        .scroll-content-reveal {
          animation: fadeInContent 0.5s ease-out 0.6s both;
        }
        .tome-drop-cap::first-letter {
          float: left;
          font-family: 'Playfair Display', 'Georgia', serif;
          font-size: 4.2rem;
          line-height: 0.8;
          font-weight: 700;
          color: #6b4c11;
          margin-right: 8px;
          margin-top: 6px;
          text-shadow: 1px 1px 2px rgba(107, 76, 17, 0.2);
        }
        .locked-cards {
          filter: blur(4px);
          opacity: 0.5;
          pointer-events: none;
          user-select: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-container,
          .dowel-top,
          .dowel-bottom,
          .scroll-content-reveal,
          .scroll-backdrop,
          .scroll-candlelight {
            animation: none !important;
          }
          .scroll-container { clip-path: none; opacity: 1; }
          .dowel-top { top: 0%; }
          .dowel-bottom { bottom: 0%; }
          .scroll-content-reveal { opacity: 1; }
          .scroll-backdrop { opacity: 1; }
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
                                            isCompleted={completedCards.has(card.id)}
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

      {tomeModalDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={() => setTomeModalDeck(null)}>
          <div className="absolute inset-0 scroll-backdrop" />

          <div
            className="relative w-full max-w-2xl scroll-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dowel dowel-top" />
            <div className="dowel dowel-bottom" />

            <div className="relative scroll-parchment rounded-sm overflow-hidden scroll-candlelight" style={{ margin: '10px 0' }}>
              <div className="scroll-edge-left" />
              <div className="scroll-edge-right" />

              <div className="absolute top-3 right-3 z-30">
                <button
                  onClick={() => setTomeModalDeck(null)}
                  className="p-2 rounded-full bg-amber-800/20 hover:bg-amber-800/40 text-amber-900/60 hover:text-amber-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative px-8 py-10 sm:px-14 sm:py-14 max-h-[80vh] overflow-y-auto">
                {showScrollContent ? (
                  <div className="scroll-content-reveal">
                    <div className="text-center mb-10">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-800/10 mb-5">
                        <ScrollText className="w-7 h-7 text-amber-800/70" />
                      </div>
                      <h2
                        className="text-2xl sm:text-3xl font-bold text-amber-900 mb-1 tracking-wide"
                        style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
                      >
                        {tomeModalDeck.tome_title}
                      </h2>
                      <div className="flex items-center justify-center gap-3 mt-5">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-700/40" />
                        <div className="w-2 h-2 rounded-full bg-amber-700/30" />
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-700/40" />
                      </div>
                    </div>

                    <div
                      className="tome-drop-cap text-amber-900/80 leading-[1.9] text-base sm:text-lg whitespace-pre-wrap"
                      style={{ fontFamily: "'EB Garamond', 'Georgia', serif" }}
                    >
                      {tomeModalDeck.tome_content}
                    </div>

                    <div className="mt-12 pt-8">
                      <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="h-px w-20 bg-gradient-to-r from-transparent to-amber-700/30" />
                        <ScrollText className="w-4 h-4 text-amber-700/30" />
                        <div className="h-px w-20 bg-gradient-to-l from-transparent to-amber-700/30" />
                      </div>

                      {!tomeModalDeck.tome_absorbed ? (
                        <div className="text-center">
                          <p
                            className="text-sm text-amber-800/60 mb-5 italic"
                            style={{ fontFamily: "'EB Garamond', 'Georgia', serif", fontSize: '1.05rem' }}
                          >
                            By absorbing this wisdom, you unlock the tasks within this deck.
                          </p>
                          <button
                            onClick={() => handleAbsorbTome(tomeModalDeck.id)}
                            disabled={absorbing}
                            className="inline-flex items-center gap-2.5 px-10 py-3.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 disabled:opacity-50 text-amber-50 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.03] active:scale-[0.98]"
                            style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.05em' }}
                          >
                            <Sparkles className="w-5 h-5" />
                            {absorbing ? "Absorbing..." : "Absorb Wisdom"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-800/10 border border-green-700/20">
                            <Sparkles className="w-4 h-4 text-green-700" />
                            <p className="text-green-800 font-semibold text-sm" style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.05rem' }}>
                              Wisdom Absorbed
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-800/20 border-t-amber-800/60"></div>
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
          cardTask={activeManuscript.task}
          cardXp={activeManuscript.xp_value}
          isCompleted={completedCards.has(activeManuscript.id)}
          onClose={() => setActiveManuscript(null)}
          onSubmitted={() => {
            setCompletedCards(prev => new Set([...prev, activeManuscript.id]));
          }}
        />
      )}
    </div>
  );
}
