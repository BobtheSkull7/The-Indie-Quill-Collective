import { useState } from "react";
import { Star, CheckCircle, Sparkles } from "lucide-react";

interface VibeDeckCardProps {
  task: string;
  qualifications: string;
  xpValue: number;
  isCompleted?: boolean;
}

export default function VibeDeckCard({ task, qualifications, xpValue, isCompleted = false }: VibeDeckCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="vibe-deck-card-container cursor-pointer"
      style={{ perspective: "1000px", height: "220px" }}
      onClick={() => setIsFlipped(!isFlipped)}
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
          className="vibe-deck-card-front absolute inset-0 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50 to-blue-50 shadow-md hover:shadow-lg p-5 flex flex-col"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            {isCompleted && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          <div className="flex-1 flex items-center">
            <p className="text-slate-800 font-medium text-sm leading-relaxed">{task}</p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 italic">Tap to flip</span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-amber-600">{xpValue} XP</span>
            </div>
          </div>
        </div>

        <div
          className="vibe-deck-card-back absolute inset-0 rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 shadow-md hover:shadow-lg p-5 flex flex-col text-white"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-200">Qualifications</h4>
            {isCompleted && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
          </div>
          <div className="flex-1 flex items-center">
            <p className="text-white/90 text-sm leading-relaxed">{qualifications}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
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
