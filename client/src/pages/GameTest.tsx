import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { Gamepad2, RefreshCw, AlertTriangle, User, Award, Briefcase } from "lucide-react";

interface EquippedItem {
  slot: string;
  item_name: string;
  item_type: string;
}

interface CharacterStatus {
  character_id: number;
  full_name: string;
  title: string;
  current_level: number;
  experience_points: number;
  equipped_items: EquippedItem[];
}

export default function GameTest() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterStatus | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "admin") {
      setLocation("/dashboard");
      return;
    }
  }, [user, setLocation]);

  const fetchCharacterStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/admin/game-engine/character/1?_t=${timestamp}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to fetch character status");
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
    if (user?.role === "admin") {
      fetchCharacterStatus();
    }
  }, [user]);

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white font-playfair">
              Game Engine Test
            </h1>
          </div>
          <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
            Admin Only
          </span>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Character Preview</h2>
            <button
              onClick={fetchCharacterStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading && !character && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Connection Error</p>
                <p className="text-red-300/80 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {character && !loading && (
            <div className="space-y-6">
              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-purple-600/30 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white font-playfair">
                      {character.full_name}
                      {character.title && (
                        <span className="text-purple-400 ml-2">the {character.title}</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Award className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">
                        Level {character.current_level}
                      </span>
                      <span className="text-gray-400 text-sm">
                        ({character.experience_points} XP)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  <h4 className="text-lg font-semibold text-white">Equipped Items</h4>
                </div>
                {character.equipped_items && character.equipped_items.length > 0 ? (
                  <div className="grid gap-3">
                    {character.equipped_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-800 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-white font-medium">{item.item_name}</span>
                          <span className="text-gray-400 text-sm ml-2">({item.item_type})</span>
                        </div>
                        <span className="text-purple-400 text-sm capitalize">{item.slot}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No items equipped</p>
                )}
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-3">Raw JSON Response</h4>
                <pre className="bg-gray-900 rounded-lg p-4 text-sm text-green-400 overflow-x-auto">
                  {JSON.stringify(character, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-500 text-sm text-center mt-6">
          This is a hidden testing page for verifying the Game Engine connection.
        </p>
      </div>
    </div>
  );
}
