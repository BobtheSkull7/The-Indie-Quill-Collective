import { useState, useEffect } from "react";
import { RefreshCw, X, Book, Pencil, Coffee, Lamp, Library, PenTool, Award } from "lucide-react";

interface EquippedItems {
  main_hand: string | null;
  off_hand: string | null;
  head: string | null;
  body: string | null;
  hands: string | null;
  feet: string | null;
}

interface CharacterData {
  user_id: string;
  username: string;
  display_name: string;
  full_name: string;
  total_xp: number;
  current_level: number;
  xp_into_current_level: number;
  xp_needed_for_next_level: number;
  proxy_hours_earned: number;
  active_title: string;
  unlocked_titles: string[];
  equipped_items: EquippedItems;
  unlocked_items: string[];
  quests_completed: number;
  total_quests: number;
}

interface CharacterCardProps {
  userId?: number;
  className?: string;
  apiEndpoint?: string;
  refreshKey?: number;
}

interface DingData {
  message: string;
  unlocked_item?: string | null;
  new_titles?: string[] | null;
}


export default function CharacterCard({ userId = 1, className = "", apiEndpoint = "/api/student/game-character", refreshKey = 0 }: CharacterCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [dingData, setDingData] = useState<DingData | null>(null);

  const fetchCharacter = async () => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();
    try {
      const timestamp = Date.now();
      const url = `${apiEndpoint}?_t=${timestamp}`;
      
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      
      const elapsed = Date.now() - startTime;
      
      if (!res.ok) {
        let errorMessage = "Failed to fetch character";
        try {
          const data = await res.json();
          if (data.noCharacter) {
            setError(data.message || "No game character assigned yet.");
            setLoading(false);
            return;
          }
          errorMessage = data.message || errorMessage;
        } catch {
          const text = await res.text();
          errorMessage = text || `Error ${res.status}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setCharacter(data);
      setSelectedTitle(data.active_title || "the Novice");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacter();
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!dingData) return;
    const timer = setTimeout(() => setDingData(null), 4000);
    return () => clearTimeout(timer);
  }, [dingData]);

  const xpIntoLevel = Number(character?.xp_into_current_level) || 0;
  const xpNeededForNext = Number(character?.xp_needed_for_next_level) || 500;
  const totalXp = Number(character?.total_xp) || 0;
  const currentLevel = Number(character?.current_level) || 1;
  const proxyHours = Number(character?.proxy_hours_earned) || 0;
  const username = character?.username || "test_student";
  const displayName = character?.display_name || "Test Student";
  const activeTitle = selectedTitle || character?.active_title || "the Novice";
  const unlockedTitles = Array.isArray(character?.unlocked_titles) ? character.unlocked_titles : ["the Novice"];
  const unlockedItems = Array.isArray(character?.unlocked_items) ? character.unlocked_items : [];
  
  const questsCompleted = Number(character?.quests_completed) || 0;
  const totalQuests = Number(character?.total_quests) || 24;
  
  const equippedItems: EquippedItems = character?.equipped_items && typeof character.equipped_items === 'object'
    ? character.equipped_items
    : { main_hand: null, off_hand: null, head: null, body: null, hands: null, feet: null };

  if (loading && !character) {
    return (
      <div className={`bg-[#1a1a2e] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-[#1a1a2e] rounded-xl p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchCharacter}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!character) return null;

  return (
    <div className={`bg-[#1a1a2e] rounded-xl text-white relative overflow-hidden ${className}`}>
      {/* Ding/Level-Up Overlay */}
      {dingData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setDingData(null)}
        >
          <div
            className="relative p-8 rounded-2xl border-2 border-yellow-400 bg-gradient-to-b from-[#2a2a4e] to-[#1a1a2e] shadow-2xl max-w-md w-full mx-4"
            style={{
              animation: "ding-glow 1.5s ease-in-out infinite alternate",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDingData(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div
                className="text-6xl font-bold text-yellow-400 mb-4"
                style={{
                  animation: "ding-pulse 0.6s ease-in-out infinite alternate",
                  textShadow: "0 0 20px rgba(250, 204, 21, 0.5), 0 0 40px rgba(250, 204, 21, 0.3)",
                }}
              >
                DING!
              </div>
              <p className="text-xl text-white font-semibold mb-4">
                {dingData.message}
              </p>
              {dingData.unlocked_item && (
                <div className="bg-[#252542] rounded-lg p-3 mb-3 border border-yellow-400/30">
                  <span className="text-2xl mr-2">🎁</span>
                  <span className="text-yellow-300 font-medium">New Item: {dingData.unlocked_item}</span>
                </div>
              )}
              {dingData.new_titles && dingData.new_titles.length > 0 && (
                <div className="bg-[#252542] rounded-lg p-3 mb-3 border border-purple-400/30">
                  <span className="text-2xl mr-2">📜</span>
                  <span className="text-purple-300 font-medium">New Titles: {dingData.new_titles.join(", ")}</span>
                </div>
              )}
              <p className="text-gray-500 text-xs mt-4">Click anywhere to dismiss</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ding-pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        @keyframes ding-glow {
          0% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.2), 0 0 40px rgba(250, 204, 21, 0.1); }
          100% { box-shadow: 0 0 40px rgba(250, 204, 21, 0.4), 0 0 80px rgba(250, 204, 21, 0.2); }
        }
      `}</style>

      <div className="flex flex-col gap-6 p-6">
        
        <div className="text-center">
          <p className="text-cyan-400 text-lg font-medium">
            {displayName} {activeTitle}
          </p>
        </div>

        {/* Character Sheet */}
        <div className="w-full bg-[#252542] rounded-xl p-5">
          <h3 className="font-['Playfair_Display'] text-xl text-white mb-4">
            Character Sheet
          </h3>
          
          {/* Writer's Studio — Aerial Desk View */}
          <div className="mb-5 rounded-xl overflow-hidden" style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)" }}>
            <div className="relative" style={{ height: 260 }}>
              <div className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(145deg, #5C3D2E 0%, #4A3122 40%, #3E2A1C 100%)" }}>
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.15) 18px, rgba(0,0,0,0.15) 19px), repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(0,0,0,0.08) 80px, rgba(0,0,0,0.08) 81px)" }} />
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 36px, rgba(255,255,255,0.1) 36px, rgba(255,255,255,0.1) 37px)" }} />
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/15 to-transparent" />
                <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-black/8 to-transparent" />
                <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black/8 to-transparent" />
              </div>

              {currentLevel >= 1 && (
                <div className="absolute top-6 left-5 z-10" style={{ animation: "studio-pop 0.4s ease" }}>
                  <div className="relative">
                    <div className="w-[72px] h-[92px] rounded-sm bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-300/60" style={{ boxShadow: "2px 3px 8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.3)" }}>
                      <div className="absolute top-2 left-2 right-2 space-y-1.5">
                        <div className="h-[2px] bg-amber-300/40 rounded" />
                        <div className="h-[2px] bg-amber-300/30 rounded w-[80%]" />
                        <div className="h-[2px] bg-amber-300/40 rounded" />
                        <div className="h-[2px] bg-amber-300/30 rounded w-[60%]" />
                        <div className="h-[2px] bg-amber-300/40 rounded w-[90%]" />
                      </div>
                      <div className="absolute left-1 top-0 w-[3px] h-full bg-gradient-to-b from-red-400/60 to-red-500/40 rounded-r" />
                    </div>
                    <Pencil className="w-10 h-10 text-amber-600/80 absolute -bottom-3 -right-4 rotate-[135deg] drop-shadow-md" strokeWidth={1.2} />
                  </div>
                </div>
              )}

              {currentLevel >= 2 && (
                <div className="absolute top-4 right-5 z-10" style={{ animation: "studio-pop 0.5s ease" }}>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full border-[3px] border-stone-200/80 bg-gradient-to-br from-stone-100 to-stone-200" style={{ boxShadow: "2px 3px 8px rgba(0,0,0,0.35), inset 0 -2px 4px rgba(0,0,0,0.1)" }}>
                      <div className="absolute inset-[5px] rounded-full bg-gradient-to-br from-amber-800 to-amber-950" />
                    </div>
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-4 rounded-r-full border-[2px] border-stone-200/80 border-l-0 bg-stone-100/50" />
                  </div>
                </div>
              )}

              {currentLevel >= 3 && (
                <div className="absolute bottom-10 right-6 z-10" style={{ animation: "studio-pop 0.5s ease" }}>
                  <div className="relative">
                    <div className="absolute -inset-6 rounded-full blur-2xl" style={{ background: "radial-gradient(circle, rgba(253,224,71,0.35) 0%, rgba(253,224,71,0.1) 50%, transparent 70%)" }} />
                    <div className="absolute -inset-3 rounded-full blur-lg" style={{ background: "radial-gradient(circle, rgba(255,241,170,0.4) 0%, transparent 60%)" }} />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-200 to-amber-300 flex items-center justify-center relative" style={{ boxShadow: "0 0 20px rgba(253,224,71,0.4), 2px 3px 6px rgba(0,0,0,0.3)" }}>
                      <Lamp className="w-5 h-5 text-amber-800" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              )}

              {currentLevel >= 4 && (
                <div className="absolute top-[52px] right-[55px] z-10" style={{ animation: "studio-pop 0.5s ease" }}>
                  <div className="flex gap-[2px]">
                    {[
                      { color: "from-red-800 to-red-900", h: "h-[52px]" },
                      { color: "from-blue-800 to-blue-950", h: "h-[48px]" },
                      { color: "from-green-800 to-green-900", h: "h-[50px]" },
                      { color: "from-amber-700 to-amber-800", h: "h-[46px]" },
                    ].map((book, i) => (
                      <div key={i} className={`w-[10px] ${book.h} rounded-[1px] bg-gradient-to-r ${book.color} self-end`} style={{ boxShadow: "1px 2px 4px rgba(0,0,0,0.25)" }} />
                    ))}
                  </div>
                </div>
              )}

              {currentLevel >= 5 && (
                <div className="absolute bottom-12 left-8 z-10" style={{ animation: "studio-pop 0.5s ease" }}>
                  <div className="relative">
                    <div className="w-[6px] h-[100px] rounded-full bg-gradient-to-b from-stone-800 via-stone-700 to-stone-600 rotate-[25deg] origin-bottom" style={{ boxShadow: "2px 2px 6px rgba(0,0,0,0.3)" }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[10px] border-l-transparent border-r-transparent border-b-stone-800" style={{ transform: "translateY(-8px)" }} />
                      <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[2px] h-3 bg-gradient-to-b from-yellow-600 to-yellow-700" />
                    </div>
                  </div>
                </div>
              )}

              {currentLevel >= 6 && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10" style={{ animation: "studio-pop 0.6s ease" }}>
                  <div className="bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-600/40 rounded-sm px-5 py-2.5 relative" style={{ boxShadow: "2px 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6)" }}>
                    <div className="absolute inset-[3px] border border-amber-400/30 rounded-sm pointer-events-none" />
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
                      <span className="text-[10px] font-bold text-amber-900 tracking-widest uppercase" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Published Author</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                <span className="text-[10px] font-medium text-amber-200/90 tracking-wide uppercase" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Lvl {currentLevel}</span>
                <span className="text-[10px] text-amber-200/50">·</span>
                <span className="text-[10px] text-amber-200/60">{Math.min(currentLevel, 6)}/6</span>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes studio-pop {
              from { opacity: 0; transform: scale(0.85); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>

          {/* Stats */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Username:</span>
              <span className="text-white font-medium">{username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Level:</span>
              <span className="text-green-400 font-bold text-lg">{currentLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total XP:</span>
              <span className="text-yellow-400 font-bold">{totalXp}</span>
            </div>
            
            {/* XP Progress Bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Level Progress</span>
                <span>{xpIntoLevel} / {xpNeededForNext} XP</span>
              </div>
              <div className="bg-[#1a1a2e] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (xpIntoLevel / xpNeededForNext) * 100)}%` }}
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Proxy Hours:</span>
              <span className="text-cyan-400 font-bold">{proxyHours.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Quests Done:</span>
              <span className="text-white">{questsCompleted} / {totalQuests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Items Unlocked:</span>
              <span className="text-white">{unlockedItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Titles Unlocked:</span>
              <span className="text-white">{unlockedTitles.length}</span>
            </div>
          </div>

          {/* Active Title Dropdown */}
          <div className="mt-5">
            <label className="text-xs text-gray-400 block mb-1">Active Title:</label>
            <select
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {unlockedTitles.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Unlocked Titles */}
        {unlockedTitles.length > 1 && (
          <div className="bg-[#252542] rounded-xl p-4 border border-[#3a3a5e]">
            <h3 className="font-['Playfair_Display'] text-sm text-white mb-2">Unlocked Titles</h3>
            <div className="flex flex-wrap gap-2">
              {unlockedTitles.map((title) => (
                <span
                  key={title}
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    title === activeTitle
                      ? "bg-purple-600/30 border-purple-400 text-purple-300"
                      : "bg-[#1a1a2e] border-[#3a3a5e] text-gray-400"
                  }`}
                >
                  {title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unlocked Items */}
        {unlockedItems.length > 0 && (
          <div className="bg-[#252542] rounded-xl p-4 border border-[#3a3a5e]">
            <h3 className="font-['Playfair_Display'] text-sm text-white mb-2">Inventory</h3>
            <div className="flex flex-wrap gap-2">
              {unlockedItems.map((item) => (
                <span
                  key={item}
                  className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-600/20 border border-yellow-400/30 text-yellow-300"
                >
                  {item.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={fetchCharacter}
            disabled={loading}
            className="px-3 py-1.5 bg-[#252542] hover:bg-[#3a3a5e] text-gray-300 text-xs rounded-lg flex items-center gap-2 transition-colors mx-auto"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
