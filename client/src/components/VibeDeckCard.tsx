import { useState } from "react";
import { Star, CheckCircle, Sparkles, PenLine } from "lucide-react";

interface VibeDeckCardProps {
  task: string;
  qualifications: string;
  xpValue: number;
  isCompleted?: boolean;
  onStartWriting?: () => void;
}

export default function VibeDeckCard({ task, qualifications, xpValue, isCompleted = false, onStartWriting }: VibeDeckCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className="vibe-deck-card-container cursor-pointer"
      style={{ perspective: "1000px", height: "260px" }}
      onClick={handleCardClick}
    >
      <div
        className="vibe-deck-card-inner relative w-full h-full transition-transform duration-600"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className={`vibe-deck-card-front absolute inset-0 rounded-xl border-2 ${isCompleted ? "border-green-300 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" : "border-purple-200 bg-gradient-to-br from-white via-purple-50 to-blue-50"} shadow-md hover:shadow-lg p-5 flex flex-col`}
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCompleted ? "bg-green-100" : "bg-purple-100"}`}>
              {isCompleted ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Sparkles className="w-4 h-4 text-purple-500" />}
            </div>
            {isCompleted && (
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Done</span>
            )}
          </div>
          <div className="flex-1 flex items-center">
            <p className="text-slate-800 font-medium text-sm leading-relaxed">{task}</p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 italic">Tap to flip</span>
            <div className="flex items-center gap-1">
              <Star className={`w-3.5 h-3.5 ${isCompleted ? "text-green-400 fill-green-400" : "text-amber-400 fill-amber-400"}`} />
              <span className={`text-xs font-bold ${isCompleted ? "text-green-600" : "text-amber-600"}`}>{xpValue} XP</span>
            </div>
          </div>
        </div>

        <div
          className={`vibe-deck-card-back absolute inset-0 rounded-xl border-2 ${isCompleted ? "border-green-300 bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800" : "border-teal-200 bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800"} shadow-md hover:shadow-lg p-5 flex flex-col text-white`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-200">Your Assignment</h4>
            {isCompleted && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
          </div>
          <div className="flex-1 flex items-center">
            <p className="text-white/90 text-sm leading-relaxed">{qualifications}</p>
          </div>

          {onStartWriting && !isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartWriting(); }}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors border border-white/20"
            >
              <PenLine className="w-4 h-4" />
              Start Writing
            </button>
          )}

          {isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartWriting?.(); }}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/20 text-green-200"
            >
              <CheckCircle className="w-4 h-4" />
              View Submission
            </button>
          )}

          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
            <span className="text-xs text-teal-200 italic">Tap to flip back</span>
            <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span className="text-sm font-bold text-amber-200">{xpValue} XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
