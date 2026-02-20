import { useState, useEffect } from "react";
import { Scroll, Edit3, Save, X, Loader2, Sparkles } from "lucide-react";

interface CharacterSheetData {
  id: number;
  userId: string;
  vibeCardId: number | null;
  name: string | null;
  archetype: string | null;
  backstory: string | null;
  motivations: string[] | null;
  strengths: string[] | null;
  flaws: string[] | null;
  goals: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VibeCardData {
  archetype: string | null;
  themes: string[] | null;
  tone: string | null;
  backstory: string | null;
}

interface WriterCharacterSheetProps {
  className?: string;
  editable?: boolean;
}

export default function WriterCharacterSheet({ className = "", editable = true }: WriterCharacterSheetProps) {
  const [sheet, setSheet] = useState<CharacterSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formArchetype, setFormArchetype] = useState("");
  const [formBackstory, setFormBackstory] = useState("");
  const [formMotivations, setFormMotivations] = useState("");
  const [formStrengths, setFormStrengths] = useState("");
  const [formFlaws, setFormFlaws] = useState("");
  const [formGoals, setFormGoals] = useState("");

  useEffect(() => {
    fetchSheet();
  }, []);

  const fetchSheet = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/character-sheet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSheet(data);
      if (data) populateForm(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: CharacterSheetData) => {
    setFormName(data.name || "");
    setFormArchetype(data.archetype || "");
    setFormBackstory(data.backstory || "");
    setFormMotivations(Array.isArray(data.motivations) ? data.motivations.join(", ") : "");
    setFormStrengths(Array.isArray(data.strengths) ? data.strengths.join(", ") : "");
    setFormFlaws(Array.isArray(data.flaws) ? data.flaws.join(", ") : "");
    setFormGoals(data.goals || "");
  };

  const seedFromVibeCard = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/student/vibe-card", { credentials: "include" });
      if (!res.ok) throw new Error("No Vibe Card found");
      const vibeCard: VibeCardData = await res.json();
      if (!vibeCard) throw new Error("Create your Vibe Card first");

      if (vibeCard.archetype) setFormArchetype(vibeCard.archetype);
      if (vibeCard.backstory) setFormBackstory(vibeCard.backstory);
      if (Array.isArray(vibeCard.themes) && vibeCard.themes.length > 0) {
        setFormMotivations(vibeCard.themes.join(", "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seed from Vibe Card");
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const toList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/student/character-sheet", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName || null,
          archetype: formArchetype || null,
          backstory: formBackstory || null,
          motivations: toList(formMotivations).length > 0 ? toList(formMotivations) : null,
          strengths: toList(formStrengths).length > 0 ? toList(formStrengths) : null,
          flaws: toList(formFlaws).length > 0 ? toList(formFlaws) : null,
          goals: formGoals || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSheet(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    if (sheet) populateForm(sheet);
    setEditing(true);
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-700/30 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  const isEmpty = !sheet;

  const renderListBadges = (items: string[] | null, color: string) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {items.map((item, i) => (
          <span
            key={i}
            className={`px-2 py-0.5 ${color} rounded-full text-xs`}
          >
            {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-700/30 ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-purple-700/20">
        <div className="flex items-center gap-2">
          <Scroll className="w-5 h-5 text-purple-400" />
          <h3 className="font-['Playfair_Display'] text-lg text-white">Writer Character Sheet</h3>
        </div>
        {editable && !editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition-colors"
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
            <div className="flex justify-end">
              <button
                onClick={seedFromVibeCard}
                disabled={seeding}
                className="flex items-center gap-1 text-teal-400 hover:text-teal-300 text-xs transition-colors"
              >
                {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Seed from Vibe Card
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Character Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Your writer persona name..."
                className="w-full bg-[#1a1a2e] border border-purple-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Archetype</label>
              <input
                type="text"
                value={formArchetype}
                onChange={(e) => setFormArchetype(e.target.value)}
                placeholder="e.g. The Dreamer, The Rebel..."
                className="w-full bg-[#1a1a2e] border border-purple-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Backstory</label>
              <textarea
                value={formBackstory}
                onChange={(e) => setFormBackstory(e.target.value)}
                placeholder="Your character's origin story..."
                rows={3}
                className="w-full bg-[#1a1a2e] border border-purple-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Motivations (comma-separated)</label>
                <input
                  type="text"
                  value={formMotivations}
                  onChange={(e) => setFormMotivations(e.target.value)}
                  placeholder="curiosity, justice, connection..."
                  className="w-full bg-[#1a1a2e] border border-purple-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Strengths (comma-separated)</label>
                <input
                  type="text"
                  value={formStrengths}
                  onChange={(e) => setFormStrengths(e.target.value)}
                  placeholder="vivid imagery, dialogue, empathy..."
                  className="w-full bg-[#1a1a2e] border border-purple-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Flaws (comma-separated)</label>
                <input
                  type="text"
                  value={formFlaws}
                  onChange={(e) => setFormFlaws(e.target.value)}
                  placeholder="overthinking, perfectionism..."
                  className="w-full bg-[#1a1a2e] border border-purple-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Goals</label>
                <input
                  type="text"
                  value={formGoals}
                  onChange={(e) => setFormGoals(e.target.value)}
                  placeholder="Publish my first novel..."
                  className="w-full bg-[#1a1a2e] border border-purple-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
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
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-6">
            <Scroll className="w-10 h-10 text-purple-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">No Character Sheet yet</p>
            <p className="text-gray-500 text-xs">Build your writer persona to guide your creative journey.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sheet.name && (
              <div className="text-center mb-4">
                <h4 className="font-['Playfair_Display'] text-xl text-white">{sheet.name}</h4>
                {sheet.archetype && (
                  <p className="text-purple-400 text-sm italic">{sheet.archetype}</p>
                )}
              </div>
            )}

            {sheet.backstory && (
              <div>
                <p className="text-xs text-purple-400 uppercase tracking-wide mb-1">Backstory</p>
                <p className="text-gray-300 text-sm leading-relaxed">{sheet.backstory}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.isArray(sheet.motivations) && sheet.motivations.length > 0 && (
                <div>
                  <p className="text-xs text-purple-400 uppercase tracking-wide mb-1">Motivations</p>
                  {renderListBadges(sheet.motivations, "bg-purple-800/40 border border-purple-700/30 text-purple-200")}
                </div>
              )}

              {Array.isArray(sheet.strengths) && sheet.strengths.length > 0 && (
                <div>
                  <p className="text-xs text-green-400 uppercase tracking-wide mb-1">Strengths</p>
                  {renderListBadges(sheet.strengths, "bg-green-800/40 border border-green-700/30 text-green-200")}
                </div>
              )}

              {Array.isArray(sheet.flaws) && sheet.flaws.length > 0 && (
                <div>
                  <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">Flaws</p>
                  {renderListBadges(sheet.flaws, "bg-amber-800/40 border border-amber-700/30 text-amber-200")}
                </div>
              )}

              {sheet.goals && (
                <div>
                  <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Goals</p>
                  <p className="text-gray-300 text-sm">{sheet.goals}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}