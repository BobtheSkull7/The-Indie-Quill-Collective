import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Gift, X, Loader2 } from "lucide-react";

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

interface DingData {
  message: string;
  unlocked_item?: string | null;
  new_titles?: string[] | null;
}

const PAPER_DOLL_SLOTS: SlotConfig[] = [
  { key: "head", label: "Graduation Cap", icon: "🎓", unlockLevel: 1 },
  { key: "off_hand", label: "Briefcase", icon: "💼", unlockLevel: 2 },
  { key: "main_hand", label: "Quill", icon: "🪶", unlockLevel: 3 },
  { key: "body", label: "Shirt", icon: "👕", unlockLevel: 4 },
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

  const [proofModalQuestId, setProofModalQuestId] = useState<number | null>(null);
  const [proofText, setProofText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completingQuestId, setCompletingQuestId] = useState<number | null>(null);
  const [claimingQuestId, setClaimingQuestId] = useState<number | null>(null);
  const [dingData, setDingData] = useState<DingData | null>(null);

  const isAdmin = apiEndpoint.includes("admin");

  const getQuestEndpointBase = useCallback(() => {
    if (isAdmin) {
      const match = apiEndpoint.match(/\/character\/(\d+)/);
      const charId = match ? match[1] : "1";
      return { base: "/api/admin/game-engine/quest", query: `?userId=${charId}` };
    }
    return { base: "/api/student/game-engine/quest", query: "" };
  }, [apiEndpoint, isAdmin]);

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
          if (data.noCharacter) {
            setApiLog(`Info (${elapsed}ms): No character assigned yet`);
            setError(data.message || "No game character assigned yet.");
            setLoading(false);
            return;
          }
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

  useEffect(() => {
    if (!dingData) return;
    const timer = setTimeout(() => setDingData(null), 4000);
    return () => clearTimeout(timer);
  }, [dingData]);

  const checkForDing = (data: any) => {
    if (data.ding || data.unlocked_item || data.new_titles) {
      setDingData({
        message: data.ding || data.message || "Quest completed!",
        unlocked_item: data.unlocked_item,
        new_titles: data.new_titles,
      });
    }
  };

  const handleSubmitProof = (questId: number) => {
    setProofModalQuestId(questId);
    setProofText("");
  };

  const handleProofSubmit = async () => {
    if (!proofModalQuestId || !proofText.trim()) return;
    setSubmitting(true);
    const startTime = Date.now();
    const { base, query } = getQuestEndpointBase();

    try {
      const res = await fetch(`${base}/submit/${proofModalQuestId}${query}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof: proofText.trim() }),
      });
      const elapsed = Date.now() - startTime;
      const data = await res.json();

      if (!res.ok) {
        setApiLog(`Submit Proof Error (${elapsed}ms): ${data.message || "Failed"}`);
      } else {
        setApiLog(`Submit Proof Success (${elapsed}ms): Quest #${proofModalQuestId} - ${JSON.stringify(data).slice(0, 120)}`);
        checkForDing(data);
        fetchCharacter();
      }
      setProofModalQuestId(null);
      setProofText("");
    } catch (err) {
      const elapsed = Date.now() - startTime;
      setApiLog(`Submit Proof Error (${elapsed}ms): ${err instanceof Error ? err.message : "Network error"}`);
      setProofModalQuestId(null);
      setProofText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickComplete = async (questId: number) => {
    setCompletingQuestId(questId);
    const startTime = Date.now();
    const { base, query } = getQuestEndpointBase();

    try {
      const res = await fetch(`${base}/complete/${questId}${query}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const elapsed = Date.now() - startTime;
      const data = await res.json();

      if (!res.ok) {
        setApiLog(`Quick Complete Error (${elapsed}ms): ${data.message || "Failed"}`);
      } else {
        setApiLog(`Quick Complete Success (${elapsed}ms): Quest #${questId} - ${JSON.stringify(data).slice(0, 120)}`);
        checkForDing(data);
        fetchCharacter();
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      setApiLog(`Quick Complete Error (${elapsed}ms): ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setCompletingQuestId(null);
    }
  };

  const handleClaimReward = async (questId: number) => {
    setClaimingQuestId(questId);
    const startTime = Date.now();
    const { base, query } = getQuestEndpointBase();

    try {
      const res = await fetch(`${base}/claim/${questId}${query}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const elapsed = Date.now() - startTime;
      const data = await res.json();

      if (!res.ok) {
        setApiLog(`Claim Reward Error (${elapsed}ms): ${data.message || "Failed"}`);
      } else {
        setApiLog(`Claim Reward Success (${elapsed}ms): Quest #${questId} - ${JSON.stringify(data).slice(0, 120)}`);
        checkForDing(data);
        fetchCharacter();
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      setApiLog(`Claim Reward Error (${elapsed}ms): ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setClaimingQuestId(null);
    }
  };

  const handleResetProgress = async () => {
    if (!confirm("Are you sure you want to reset your creative profile (Vibe Card & Character Sheet)? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch("/api/student/reset-creative-profile", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setApiLog("Creative profile reset successfully");
        fetchCharacter();
      } else {
        const data = await res.json();
        setApiLog(`Reset failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setApiLog(`Reset error: ${err instanceof Error ? err.message : "Network error"}`);
    }
  };

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
    <div className={`bg-[#1a1a2e] rounded-xl text-white relative ${className}`}>
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

      {/* Proof Submission Modal */}
      {proofModalQuestId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!submitting) { setProofModalQuestId(null); setProofText(""); } }}
        >
          <div
            className="bg-[#252542] rounded-xl p-6 border border-[#3a3a5e] shadow-2xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Playfair_Display'] text-xl text-white">Submit Proof</h3>
              <button
                onClick={() => { if (!submitting) { setProofModalQuestId(null); setProofText(""); } }}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Quest #{proofModalQuestId} — Describe what you did to complete this quest:
            </p>
            <textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Enter your proof here..."
              className="w-full bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none h-32 mb-4"
              disabled={submitting}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setProofModalQuestId(null); setProofText(""); }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleProofSubmit}
                disabled={submitting || !proofText.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Submitting..." : "Submit Proof"}
              </button>
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

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        
        {/* Left Panel - Character Sheet */}
        <div className="lg:w-80 shrink-0 bg-[#252542] rounded-xl p-5">
          <h3 className="font-['Playfair_Display'] text-xl text-white mb-4">
            Character Sheet
          </h3>
          
          {/* Paper Doll - Humanoid Layout */}
          <div className="mb-5">
            {/* Row 1: Graduation Cap (top center) */}
            <div className="flex justify-center mb-2">
              {(() => {
                const slot = PAPER_DOLL_SLOTS[0];
                const isUnlocked = currentLevel >= slot.unlockLevel;
                return (
                  <div
                    className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      isUnlocked 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30" 
                        : "bg-[#3a3a4a]"
                    }`}
                    title={isUnlocked ? slot.label : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-2xl ${!isUnlocked ? "grayscale opacity-40" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })()}
            </div>
            
            {/* Row 2: Briefcase | Face Oval | Quill */}
            <div className="flex justify-center items-center gap-2 mb-2">
              {/* Briefcase (off_hand) */}
              {(() => {
                const slot = PAPER_DOLL_SLOTS[1];
                const isUnlocked = currentLevel >= slot.unlockLevel;
                return (
                  <div
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      isUnlocked 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30" 
                        : "bg-[#3a3a4a]"
                    }`}
                    title={isUnlocked ? slot.label : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-xl ${!isUnlocked ? "grayscale opacity-40" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })()}
              
              {/* Face Oval (Student Picture placeholder) */}
              <div className="w-16 h-20 rounded-full bg-gradient-to-b from-[#3a3a5e] to-[#252542] border-2 border-[#4a4a6e] flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
              
              {/* Quill (main_hand) */}
              {(() => {
                const slot = PAPER_DOLL_SLOTS[2];
                const isUnlocked = currentLevel >= slot.unlockLevel;
                return (
                  <div
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      isUnlocked 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30" 
                        : "bg-[#3a3a4a]"
                    }`}
                    title={isUnlocked ? slot.label : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-xl ${!isUnlocked ? "grayscale opacity-40" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })()}
            </div>
            
            {/* Row 3: Shirt | Pants | Sneakers */}
            <div className="flex justify-center gap-2">
              {PAPER_DOLL_SLOTS.slice(3).map((slot) => {
                const isUnlocked = currentLevel >= slot.unlockLevel;
                return (
                  <div
                    key={slot.key}
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all relative ${
                      isUnlocked 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30" 
                        : "bg-[#3a3a4a]"
                    }`}
                    title={isUnlocked ? slot.label : `Unlocks at Level ${slot.unlockLevel}`}
                  >
                    <span className={`text-xl ${!isUnlocked ? "grayscale opacity-40" : ""}`}>{slot.icon}</span>
                    {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500"></span> Equipped</span>
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
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        Submit Proof
                      </button>
                      <button
                        onClick={() => handleQuickComplete(quest.id)}
                        disabled={completingQuestId !== null}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 justify-center"
                      >
                        {completingQuestId === quest.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        Quick Complete
                      </button>
                      {quest.is_claimable && (
                        <button
                          onClick={() => handleClaimReward(quest.id)}
                          disabled={claimingQuestId !== null}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 justify-center animate-pulse"
                        >
                          {claimingQuestId === quest.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          <Gift className="w-3 h-3" />
                          Claim Reward
                        </button>
                      )}
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
