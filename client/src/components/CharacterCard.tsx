import { useState, useEffect } from "react";
import { RefreshCw, Gift } from "lucide-react";

interface EquippedItems {
  main_hand: string | null;
  off_hand: string | null;
  head: string | null;
  body: string | null;
  hands: string | null;
  feet: string | null;
}

interface Quest {
  id: number;
  title: string;
  description: string;
  phase: number;
  chapter: number;
  xp_reward: number;
  proxy_hours_reward: number;
  is_claimable: boolean;
  is_completed: boolean;
}

interface CharacterData {
  user_id: number;
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
  claimable_quests: string[];
  completed_quests: string[];
  available_quests?: Quest[];
}

interface CharacterCardProps {
  userId?: number;
  className?: string;
  apiEndpoint?: string;
}

interface SlotConfig {
  key: keyof EquippedItems;
  label: string;
  icon: string;
  unlockLevel: number;
}

const PAPER_DOLL_SLOTS: SlotConfig[] = [
  { key: "head", label: "Fedora", icon: "🤠", unlockLevel: 1 },
  { key: "off_hand", label: "Backpack", icon: "🎒", unlockLevel: 2 },
  { key: "main_hand", label: "Quill", icon: "🪶", unlockLevel: 3 },
  { key: "body", label: "Shirt", icon: "😊", unlockLevel: 4 },
  { key: "hands", label: "Pants", icon: "👖", unlockLevel: 5 },
  { key: "feet", label: "Sneakers", icon: "👟", unlockLevel: 6 },
];

const PHASE_COLORS: Record<number, string> = {
  1: "bg-blue-600",
  2: "bg-green-600",
  3: "bg-yellow-500 text-black",
  4: "bg-purple-600",
  5: "bg-red-600",
};

export default function CharacterCard({ userId = 1, className = "", apiEndpoint = "/api/student/game-character" }: CharacterCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [apiLog, setApiLog] = useState<string>("");

  const fetchCharacter = async () => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();
    try {
      const timestamp = Date.now();
      const url = `${apiEndpoint}?_t=${timestamp}`;
      setApiLog(`Fetching: ${url}`);
      
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
          errorMessage = data.message || errorMessage;
        } catch {
          const text = await res.text();
          errorMessage = text || `Error ${res.status}`;
        }
        setApiLog(`Error (${elapsed}ms): ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setCharacter(data);
      setSelectedTitle(data.active_title || "the Novice");
      setApiLog(`Success (${elapsed}ms): Level ${data.current_level}, ${data.total_xp} XP`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacter();
  }, [userId]);

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
  const claimableQuests = Array.isArray(character?.claimable_quests) ? character.claimable_quests : [];
  
  const equippedItems: EquippedItems = character?.equipped_items && typeof character.equipped_items === 'object'
    ? character.equipped_items
    : { main_hand: null, off_hand: null, head: null, body: null, hands: null, feet: null };

  const sampleQuests: Quest[] = character?.available_quests || [
    { id: 1, title: "Crossing the Finish Line", description: "Write the final scene and the words \"The End\".", phase: 2, chapter: 9, xp_reward: 250, proxy_hours_reward: 1.5, is_claimable: true, is_completed: false },
    { id: 2, title: "Being Your Own Coach", description: "Find one part of your story that needs to be explained better.", phase: 3, chapter: 10, xp_reward: 250, proxy_hours_reward: 1.5, is_claimable: false, is_completed: false },
    { id: 3, title: "The Big Fix-Up", description: "Delete or rewrite one paragraph to make it more exciting.", phase: 3, chapter: 11, xp_reward: 250, proxy_hours_reward: 1.5, is_claimable: false, is_completed: false },
    { id: 4, title: "Polish Your Prose", description: "Read your story aloud and fix any awkward sentences.", phase: 3, chapter: 12, xp_reward: 250, proxy_hours_reward: 1.5, is_claimable: false, is_completed: false },
  ];

  const handleSubmitProof = (questId: number) => {
    alert(`Submit Proof for Quest #${questId} - Coming soon!`);
  };

  const handleQuickComplete = (questId: number) => {
    alert(`Quick Complete for Quest #${questId} - Coming soon!`);
  };

  const handleResetProgress = () => {
    if (confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
      alert("Reset Progress - Coming soon!");
    }
  };

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
    <div className={`bg-[#1a1a2e] rounded-xl text-white ${className}`}>
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        
        {/* Left Panel - Character Sheet */}
        <div className="lg:w-80 shrink-0 bg-[#252542] rounded-xl p-5">
          <h3 className="font-['Playfair_Display'] text-xl text-white mb-4">
            Character Sheet
          </h3>
          
          {/* Paper Doll - Humanoid Layout */}
          <div className="mb-5">
            {/* Row 1: Hat (top center) */}
            <div className="flex justify-center mb-2">
              {(() => {
                const slot = PAPER_DOLL_SLOTS[0];
                const isUnlocked = currentLevel >= slot.unlockLevel;
                const itemName = equippedItems[slot.key as keyof EquippedItems];
                const hasItem = isUnlocked && !!itemName;
                return (
                  <div
                    className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      hasItem 
                        ? "bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30" 
                        : isUnlocked 
                          ? "bg-[#1a1a2e] border-2 border-dashed border-[#4a4a6e]"
                          : "bg-[#0d0d1a] border border-[#2a2a3e] opacity-50"
                    }`}
                    title={isUnlocked ? (itemName || slot.label) : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-2xl ${!isUnlocked ? "grayscale" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })()}
            </div>
            
            {/* Row 2: Satchel | Face Oval | Quill */}
            <div className="flex justify-center items-center gap-2 mb-2">
              {/* Satchel (off_hand) */}
              {(() => {
                const slot = PAPER_DOLL_SLOTS[1];
                const isUnlocked = currentLevel >= slot.unlockLevel;
                const itemName = equippedItems[slot.key as keyof EquippedItems];
                const hasItem = isUnlocked && !!itemName;
                return (
                  <div
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      hasItem 
                        ? "bg-gradient-to-br from-amber-600 to-orange-600 shadow-lg shadow-amber-500/30" 
                        : isUnlocked 
                          ? "bg-[#1a1a2e] border-2 border-dashed border-[#4a4a6e]"
                          : "bg-[#0d0d1a] border border-[#2a2a3e] opacity-50"
                    }`}
                    title={isUnlocked ? (itemName || slot.label) : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-xl ${!isUnlocked ? "grayscale" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })()}
              
              {/* Face Oval (Avatar placeholder) */}
              <div className="w-16 h-20 rounded-full bg-gradient-to-b from-[#3a3a5e] to-[#252542] border-2 border-[#4a4a6e] flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
              
              {/* Quill (main_hand) */}
              {(() => {
                const slot = PAPER_DOLL_SLOTS[2];
                const isUnlocked = currentLevel >= slot.unlockLevel;
                const itemName = equippedItems[slot.key as keyof EquippedItems];
                const hasItem = isUnlocked && !!itemName;
                return (
                  <div
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      hasItem 
                        ? "bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/30" 
                        : isUnlocked 
                          ? "bg-[#1a1a2e] border-2 border-dashed border-[#4a4a6e]"
                          : "bg-[#0d0d1a] border border-[#2a2a3e] opacity-50"
                    }`}
                    title={isUnlocked ? (itemName || slot.label) : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-xl ${!isUnlocked ? "grayscale" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })()}
            </div>
            
            {/* Row 3: Shirt | Pants | Sneakers */}
            <div className="flex justify-center gap-2">
              {PAPER_DOLL_SLOTS.slice(3).map((slot) => {
                const isUnlocked = currentLevel >= slot.unlockLevel;
                const itemName = equippedItems[slot.key as keyof EquippedItems];
                const hasItem = isUnlocked && !!itemName;
                const bgColor = slot.key === "body" 
                  ? "from-green-600 to-emerald-600 shadow-green-500/30"
                  : slot.key === "hands"
                    ? "from-indigo-600 to-violet-600 shadow-indigo-500/30"
                    : "from-rose-600 to-pink-600 shadow-rose-500/30";
                return (
                  <div
                    key={slot.key}
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      hasItem 
                        ? `bg-gradient-to-br ${bgColor} shadow-lg` 
                        : isUnlocked 
                          ? "bg-[#1a1a2e] border-2 border-dashed border-[#4a4a6e]"
                          : "bg-[#0d0d1a] border border-[#2a2a3e] opacity-50"
                    }`}
                    title={isUnlocked ? (itemName || slot.label) : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-xl ${!isUnlocked ? "grayscale" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500"></span> Equipped</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded border border-dashed border-gray-500"></span> Empty</span>
              <span className="flex items-center gap-1">🔒 Locked</span>
            </div>
          </div>

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

          {/* Reset Progress Button */}
          <button
            onClick={handleResetProgress}
            className="w-full mt-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Reset Progress
          </button>
        </div>

        {/* Right Panel - Quest Dashboard */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-['Playfair_Display'] text-3xl lg:text-4xl text-white mb-1">
              Indie Quill Collective
            </h1>
            <p className="text-gray-400 text-sm mb-3">
              Game Engine - Admin Test Dashboard
            </p>
            <p className="text-cyan-400 text-lg font-medium">
              {displayName} {activeTitle}
            </p>
          </div>

          {/* Available Quests */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Playfair_Display'] text-xl text-white">
                Available Quests
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-green-400">Glowing</span>
                <span className="text-gray-500">= Ready to Claim</span>
              </div>
            </div>

            {/* Quest List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {sampleQuests.map((quest) => (
                <div
                  key={quest.id}
                  className={`bg-[#252542] rounded-lg p-4 border-l-4 transition-all ${
                    quest.is_claimable 
                      ? "border-green-400 shadow-lg shadow-green-400/10" 
                      : "border-[#3a3a5e]"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${PHASE_COLORS[quest.phase] || "bg-gray-600"}`}>
                          Phase {quest.phase}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">
                          Ch. {quest.chapter}
                        </span>
                        {quest.is_claimable && (
                          <span className="px-2 py-0.5 bg-red-600 rounded text-xs font-bold flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            Phase Reward
                          </span>
                        )}
                      </div>
                      
                      {/* Title & Description */}
                      <h4 className="font-semibold text-white mb-1">{quest.title}</h4>
                      <p className="text-gray-400 text-sm mb-2">{quest.description}</p>
                      
                      {/* Rewards */}
                      <div className="flex gap-3 text-xs">
                        <span className="text-yellow-400">+{quest.xp_reward} XP</span>
                        <span className="text-cyan-400">+{quest.proxy_hours_reward} Proxy Hours</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex lg:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleSubmitProof(quest.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        Submit Proof
                      </button>
                      <button
                        onClick={() => handleQuickComplete(quest.id)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        Quick Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* API Response Log */}
      <div className="border-t border-[#3a3a5e] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-['Playfair_Display'] text-lg text-white mb-1">API Response Log</h4>
            <p className="text-gray-500 text-sm font-mono">{apiLog || "Quest submission responses will appear here..."}</p>
          </div>
          <button
            onClick={fetchCharacter}
            disabled={loading}
            className="px-4 py-2 bg-[#252542] hover:bg-[#3a3a5e] text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
