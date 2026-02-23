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
          
          {/* Writer's Studio */}
          <div className="mb-5 rounded-xl border border-amber-200/60 bg-[#FDFBF7] p-4 relative overflow-hidden" style={{ height: 220 }}>
            {currentLevel >= 6 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-1.5 shadow-sm" style={{ animation: "studio-fade-in 0.6s ease" }}>
                <Award className="w-5 h-5 text-amber-600" />
                <span className="text-[11px] font-semibold text-amber-800">Published Author</span>
              </div>
            )}

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[85%]">
              <div className="relative h-3 bg-gradient-to-b from-amber-800 to-amber-900 rounded-t-sm" />
              <div className="relative flex justify-between px-2">
                <div className="w-2 h-10 bg-amber-800 rounded-b-sm" />
                <div className="w-2 h-10 bg-amber-800 rounded-b-sm" />
              </div>

              {currentLevel >= 1 && (
                <div className="absolute -top-10 left-4 flex items-end gap-1" style={{ animation: "studio-fade-in 0.4s ease" }}>
                  <Book className="w-7 h-7 text-amber-700" />
                  <Pencil className="w-4 h-4 text-gray-500 -mb-0.5 -ml-1" />
                </div>
              )}

              {currentLevel >= 2 && (
                <div className="absolute -top-9 right-5" style={{ animation: "studio-fade-in 0.5s ease" }}>
                  <Coffee className="w-6 h-6 text-amber-900/70" />
                </div>
              )}

              {currentLevel >= 3 && (
                <div className="absolute -top-16 right-[30%]" style={{ animation: "studio-fade-in 0.5s ease" }}>
                  <div className="relative">
                    <div className="absolute -inset-3 bg-yellow-300/20 rounded-full blur-md" />
                    <Lamp className="w-8 h-8 text-amber-600 relative" />
                  </div>
                </div>
              )}

              {currentLevel >= 4 && (
                <div className="absolute -top-12 left-[35%]" style={{ animation: "studio-fade-in 0.5s ease" }}>
                  <Library className="w-7 h-7 text-stone-600" />
                </div>
              )}

              {currentLevel >= 5 && (
                <div className="absolute -top-8 left-[55%]" style={{ animation: "studio-fade-in 0.5s ease" }}>
                  <PenTool className="w-5 h-5 text-indigo-700" />
                </div>
              )}
            </div>

            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3 text-[10px] text-stone-400">
              <span>Level {currentLevel} Studio</span>
              <span>·</span>
              <span>{Math.min(currentLevel, 6)} / 6 items</span>
            </div>
          </div>

          <style>{`
            @keyframes studio-fade-in {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
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
