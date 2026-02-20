import { useState, useEffect } from "react";
import { Sparkles, Edit3, Save, X, Loader2 } from "lucide-react";

interface VibeCardData {
  id: number;
  userId: string;
  archetype: string | null;
  themes: string[] | null;
  tone: string | null;
  backstory: string | null;
  rawVibeData: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VibeCardProps {
  className?: string;
  editable?: boolean;
}

const ARCHETYPE_OPTIONS = [
  "The Dreamer",
  "The Explorer",
  "The Rebel",
  "The Storyteller",
  "The Observer",
  "The Healer",
  "The Builder",
  "The Poet",
  "The Philosopher",
  "The Adventurer",
];

const TONE_OPTIONS = [
  "Whimsical",
  "Dark & Gritty",
  "Hopeful",
  "Mysterious",
  "Humorous",
  "Lyrical",
  "Raw & Honest",
  "Contemplative",
  "Energetic",
  "Nostalgic",
];

export default function VibeCard({ className = "", editable = true }: VibeCardProps) {
  const [card, setCard] = useState<VibeCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formArchetype, setFormArchetype] = useState("");
  const [formThemes, setFormThemes] = useState("");
  const [formTone, setFormTone] = useState("");
  const [formBackstory, setFormBackstory] = useState("");

  useEffect(() => {
    fetchCard();
  }, []);

  const fetchCard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/vibe-card", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCard(data);
      if (data) {
        setFormArchetype(data.archetype || "");
        setFormThemes(Array.isArray(data.themes) ? data.themes.join(", ") : "");
        setFormTone(data.tone || "");
        setFormBackstory(data.backstory || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const themes = formThemes.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/student/vibe-card", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype: formArchetype || null,
          themes: themes.length > 0 ? themes : null,
          tone: formTone || null,
          backstory: formBackstory || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setCard(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setFormArchetype(card?.archetype || "");
    setFormThemes(Array.isArray(card?.themes) ? card.themes.join(", ") : "");
    setFormTone(card?.tone || "");
    setFormBackstory(card?.backstory || "");
    setEditing(true);
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-teal-900/40 to-blue-900/40 rounded-xl border border-teal-700/30 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
        </div>
      </div>
    );
  }

  const isEmpty = !card;

  return (
    <div className={`bg-gradient-to-br from-teal-900/40 to-blue-900/40 rounded-xl border border-teal-700/30 ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-teal-700/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-400" />
          <h3 className="font-['Playfair_Display'] text-lg text-white">Your Vibe Card</h3>
        </div>
        {editable && !editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 text-teal-400 hover:text-teal-300 text-sm transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            {isEmpty ? "Create" : "Edit"}
          </button>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 p-2 bg-red-900/30 border border-red-700/30 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="p-4">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Writer Archetype</label>
              <select
                value={formArchetype}
                onChange={(e) => setFormArchetype(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-teal-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
              >
                <option value="">Select your archetype...</option>
                {ARCHETYPE_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Themes (comma-separated)</label>
              <input
                type="text"
                value={formThemes}
                onChange={(e) => setFormThemes(e.target.value)}
                placeholder="family, adventure, growing up, mystery..."
                className="w-full bg-[#1a1a2e] border border-teal-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Writing Tone</label>
              <select
                value={formTone}
                onChange={(e) => setFormTone(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-teal-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
              >
                <option value="">Select your tone...</option>
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Creative Origin Story</label>
              <textarea
                value={formBackstory}
                onChange={(e) => setFormBackstory(e.target.value)}
                placeholder="What sparks your creativity? What story do you carry?"
                rows={3}
                className="w-full bg-[#1a1a2e] border border-teal-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 text-teal-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Your Vibe Card is empty</p>
            <p className="text-gray-500 text-xs">Capture your creative essence to begin your journey.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {card.archetype && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">&#x1f3ad;</span>
                <div>
                  <p className="text-xs text-teal-400 uppercase tracking-wide">Archetype</p>
                  <p className="text-white font-medium">{card.archetype}</p>
                </div>
              </div>
            )}

            {Array.isArray(card.themes) && card.themes.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">&#x1f3a8;</span>
                <div>
                  <p className="text-xs text-teal-400 uppercase tracking-wide">Themes</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {card.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-teal-800/40 border border-teal-700/30 rounded-full text-teal-200 text-xs"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {card.tone && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">&#x1f50a;</span>
                <div>
                  <p className="text-xs text-teal-400 uppercase tracking-wide">Tone</p>
                  <p className="text-white">{card.tone}</p>
                </div>
              </div>
            )}

            {card.backstory && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">&#x1f4d6;</span>
                <div>
                  <p className="text-xs text-teal-400 uppercase tracking-wide">Creative Origin</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{card.backstory}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}