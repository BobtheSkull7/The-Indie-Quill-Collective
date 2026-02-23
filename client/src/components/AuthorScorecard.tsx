import { useState, useEffect, useRef } from "react";
import { RefreshCw, Mic, PenTool, FileText, ChevronDown } from "lucide-react";

interface AuthorMetrics {
  wordsSpoken: number;
  wordsWritten: number;
  totalOutput: number;
  badges: string[];
  authorPath: string | null;
  displayName: string;
  activeTitle: string;
  unlockedTitles: string[];
}

interface AuthorScorecardProps {
  className?: string;
  refreshKey?: number;
}

const BADGE_DEFINITIONS: { key: string; label: string; icon: string }[] = [
  { key: "entry_of_record", label: "The Entry of Record", icon: "📜" },
  { key: "structural_integrity", label: "Structural Integrity", icon: "🏗️" },
  { key: "readers_mark", label: "The Reader's Mark", icon: "🖋️" },
  { key: "foundations_mastery", label: "Foundations Mastery", icon: "🏛️" },
  { key: "voice_seal", label: "Voice", icon: "🎙️" },
  { key: "ink_seal", label: "Ink", icon: "✒️" },
  { key: "specialist_seal", label: "Specialist", icon: "🧭" },
  { key: "5k_club", label: "5K Club", icon: "⭐" },
  { key: "10k_club", label: "10K Club", icon: "🌟" },
];

function NibIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17 3L21 7L12 16H8V12L17 3Z" />
      <path d="M8 16L3 21" />
      <path d="M15 5L19 9" />
    </svg>
  );
}

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    if (start === end) {
      setDisplay(end);
      return;
    }
    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export default function AuthorScorecard({ className = "", refreshKey = 0 }: AuthorScorecardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AuthorMetrics | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/author-metrics?_t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });

      if (!res.ok) {
        let errorMessage = "Failed to fetch author metrics";
        try {
          const data = await res.json();
          errorMessage = data.message || errorMessage;
        } catch {
          errorMessage = `Error ${res.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setMetrics(data);
      setSelectedTitle(data.activeTitle || "the Novice");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [refreshKey]);

  const sectionBorder = "border-[#33333319]";

  if (loading && !metrics) {
    return (
      <div className={`scorecard-paper rounded-xl p-6 ${sectionBorder} border ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`scorecard-paper rounded-xl p-6 ${sectionBorder} border ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="text-amber-700 hover:text-amber-900 text-sm font-medium flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const earnedBadges = new Set(metrics.badges || []);

  return (
    <>
      <style>{`
        .scorecard-paper {
          background-color: #FDFBF7;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }
      `}</style>
      <div className={`scorecard-paper rounded-xl text-[#2C2C2C] relative overflow-hidden ${sectionBorder} border ${className}`}>
        <div className="flex flex-col p-6">

          <div className={`text-center border-b ${sectionBorder} pb-4 mb-6`}>
            <h2 className="font-['Playfair_Display',_Georgia,_serif] text-2xl text-[#2C2C2C] font-semibold tracking-tight">
              Author Scorecard
            </h2>
            <p className="text-amber-700/70 text-sm mt-1 italic">Your writing journey, measured in words</p>
          </div>

          <div className={`bg-white/60 rounded-xl p-5 border ${sectionBorder} mb-5`}>
            <h3 className="font-['Playfair_Display',_Georgia,_serif] text-sm uppercase tracking-widest text-amber-800/60 mb-4">
              Progress Odometer
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-amber-700" />
                  </div>
                  <span className="text-[#2C2C2C]/70 text-sm">Words Spoken</span>
                </div>
                <span className="font-['Playfair_Display',_Georgia,_serif] text-xl font-bold text-[#2C2C2C] tabular-nums">
                  <AnimatedNumber value={metrics.wordsSpoken} />
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <PenTool className="w-4 h-4 text-amber-700" />
                  </div>
                  <span className="text-[#2C2C2C]/70 text-sm">Words Written</span>
                </div>
                <span className="font-['Playfair_Display',_Georgia,_serif] text-xl font-bold text-[#2C2C2C] tabular-nums">
                  <AnimatedNumber value={metrics.wordsWritten} />
                </span>
              </div>

              <div className={`border-t ${sectionBorder} pt-3 mt-1`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-amber-800" />
                    </div>
                    <span className="text-[#2C2C2C] text-sm font-semibold">Total Output</span>
                  </div>
                  <span className="font-['Playfair_Display',_Georgia,_serif] text-2xl font-bold text-amber-800 tabular-nums">
                    <AnimatedNumber value={metrics.totalOutput} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-white/60 rounded-xl p-5 border ${sectionBorder} mb-5`}>
            <h3 className="font-['Playfair_Display',_Georgia,_serif] text-sm uppercase tracking-widest text-amber-800/60 mb-4">
              Legacy Seals
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {BADGE_DEFINITIONS.map((badge) => {
                const earned = earnedBadges.has(badge.key);
                return (
                  <div
                    key={badge.key}
                    className={`relative flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                      earned
                        ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-400/60 shadow-sm"
                        : `bg-gray-50/50 border ${sectionBorder}`
                    }`}
                    title={earned ? badge.label : "Unclaimed"}
                  >
                    {earned ? (
                      <div className="text-2xl mb-1.5">{badge.icon}</div>
                    ) : (
                      <NibIcon className="w-6 h-6 text-gray-300 mb-1.5" />
                    )}
                    <span
                      className={`text-[10px] font-medium leading-tight ${
                        earned
                          ? "text-amber-900"
                          : "text-gray-300"
                      }`}
                    >
                      {earned ? badge.label : "Unclaimed"}
                    </span>
                    {earned && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-white text-[8px]">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`bg-white/60 rounded-xl p-4 border ${sectionBorder} mb-4`}>
            <div className="text-center mb-3">
              <p className="font-['Playfair_Display',_Georgia,_serif] text-lg text-[#2C2C2C] font-semibold">
                {metrics.displayName || "Author"}
              </p>
              <p className="text-amber-700/70 text-sm italic">{selectedTitle}</p>
            </div>

            {metrics.unlockedTitles && metrics.unlockedTitles.length > 1 && (
              <div className="mt-2">
                <label className="text-xs text-[#2C2C2C]/50 block mb-1">Active Title:</label>
                <select
                  value={selectedTitle}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                  className="w-full bg-[#FDFBF7] border border-amber-200 rounded-lg px-3 py-2 text-[#2C2C2C] text-sm focus:outline-none focus:border-amber-500 appearance-none"
                >
                  {metrics.unlockedTitles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className={`px-3 py-1.5 bg-white/60 hover:bg-amber-50/80 text-[#2C2C2C]/60 text-xs rounded-lg flex items-center gap-2 transition-colors mx-auto border ${sectionBorder}`}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
