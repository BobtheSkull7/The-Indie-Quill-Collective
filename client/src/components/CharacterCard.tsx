import { useState, useEffect } from "react";
import { Award, Backpack, Sword, Shield, Crown, Shirt, Hand, Footprints, RefreshCw } from "lucide-react";

interface EquippedItems {
  main_hand: string | null;
  off_hand: string | null;
  head: string | null;
  body: string | null;
  hands: string | null;
  feet: string | null;
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
}

interface CharacterCardProps {
  userId?: number;
  className?: string;
  apiEndpoint?: string;
}

const SLOT_CONFIG = [
  { key: "main_hand", label: "Main Hand", icon: Sword },
  { key: "off_hand", label: "Off-Hand", icon: Shield },
  { key: "head", label: "Head", icon: Crown },
  { key: "body", label: "Body", icon: Shirt },
  { key: "hands", label: "Hands", icon: Hand },
  { key: "feet", label: "Feet", icon: Footprints },
];

export default function CharacterCard({ userId = 1, className = "", apiEndpoint = "/api/student/game-character" }: CharacterCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterData | null>(null);

  const fetchCharacter = async () => {
    setLoading(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const res = await fetch(`${apiEndpoint}?_t=${timestamp}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      if (!res.ok) {
        let errorMessage = "Failed to fetch character";
        try {
          const data = await res.json();
          errorMessage = data.message || errorMessage;
        } catch {
          const text = await res.text();
          errorMessage = text || `Error ${res.status}`;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setCharacter(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacter();
  }, [userId]);

  // Defensive defaults for all character fields
  const xpIntoLevel = Number(character?.xp_into_current_level) || 0;
  const xpNeededForNext = Number(character?.xp_needed_for_next_level) || 500;
  const totalXp = Number(character?.total_xp) || 0;
  const currentLevel = Number(character?.current_level) || 1;
  const proxyHours = Number(character?.proxy_hours_earned) || 0;
  const displayName = character?.display_name || "Student";
  const activeTitle = character?.active_title || "the Novice";
  
  const xpPercent = xpNeededForNext > 0
    ? Math.round((xpIntoLevel / xpNeededForNext) * 100)
    : 0;

  const questsCompleted = Number(character?.quests_completed) || 0;
  const totalQuests = Number(character?.total_quests) || 0;
  const claimableQuests = Array.isArray(character?.claimable_quests) ? character.claimable_quests : [];
  const hasClaimableQuests = claimableQuests.length > 0;
  const equippedItems: EquippedItems = character?.equipped_items && typeof character.equipped_items === 'object'
    ? character.equipped_items
    : { main_hand: null, off_hand: null, head: null, body: null, hands: null, feet: null };

  const handleClaim = async () => {
    if (!hasClaimableQuests) return;
    alert("Quest claiming will be implemented in the next phase!");
  };

  if (loading && !character) {
    return (
      <div className={`bg-[#121212] border border-[#2a2a2a] rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-[#121212] border border-[#2a2a2a] rounded-xl p-6 ${className}`}>
        <div className="text-center py-6">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={fetchCharacter}
            className="text-[#d4af37] hover:text-[#e5c048] text-sm font-medium flex items-center gap-2 mx-auto"
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
    <div className={`bg-[#121212] border border-[#2a2a2a] rounded-xl p-6 text-white font-inter ${className}`}>
      <div className="mb-5">
        <h2 className="font-playfair text-2xl text-[#d4af37] mb-1">
          {displayName}
        </h2>
        <span className="text-lg text-[#a0a0a0] block">
          {activeTitle}
        </span>
        <div className="mt-2">
          <span className="bg-[#d4af37] text-black font-bold text-xs px-2 py-1 rounded">
            LEVEL {currentLevel}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-[#a0a0a0] mb-1">
          <span>Experience</span>
          <span>{xpIntoLevel} / {xpNeededForNext} XP</span>
        </div>
        <div className="bg-[#2a2a2a] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#d4af37] h-full transition-all duration-500 ease-in-out"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[#666] mt-1">
          <span>{totalXp} Total XP</span>
          <span>{proxyHours.toFixed(1)} Proxy Hours</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Backpack className="w-4 h-4 text-[#a0a0a0]" />
          <span className="text-sm text-[#a0a0a0] font-medium">Equipment</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SLOT_CONFIG.map(({ key, label, icon: Icon }) => {
            const itemName = equippedItems[key as keyof EquippedItems];
            return (
              <div
                key={key}
                className={`bg-[#1a1a1a] border rounded-lg p-3 flex flex-col items-center justify-center min-h-[70px] ${
                  itemName ? "border-[#d4af37]/30" : "border-dashed border-[#444]"
                }`}
                title={label}
              >
                <Icon className={`w-5 h-5 mb-1 ${itemName ? "text-[#d4af37]" : "text-[#555]"}`} />
                <span className="text-[10px] text-center text-[#888] leading-tight">
                  {itemName || label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-[#a0a0a0]" />
          <span className="text-sm text-[#a0a0a0] font-medium">Quests</span>
        </div>
        <div className="flex justify-between text-xs text-[#888]">
          <span>{questsCompleted} / {totalQuests} Complete</span>
          {hasClaimableQuests && (
            <span className="text-[#d4af37] font-medium animate-pulse">
              {claimableQuests.length} Ready to Claim!
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={!hasClaimableQuests}
        className={`w-full py-3 rounded-lg font-bold transition-all ${
          hasClaimableQuests
            ? "bg-[#d4af37] text-black hover:scale-[1.02] animate-pulse"
            : "bg-[#333] text-[#666] cursor-not-allowed"
        }`}
      >
        {hasClaimableQuests ? "CLAIM QUEST REWARD" : "NO QUESTS AVAILABLE"}
      </button>

      <button
        onClick={fetchCharacter}
        disabled={loading}
        className="w-full mt-3 py-2 text-[#888] hover:text-[#d4af37] text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
