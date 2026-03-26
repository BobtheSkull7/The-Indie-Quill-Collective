import { useState, useEffect } from "react";
import {
  BookOpen,
  Edit3,
  Shield,
  Barcode,
  Copyright,
  ChevronRight,
  RefreshCw,
  FileText,
  Palette,
  Layout,
  FileCheck,
  PenTool,
  Eye,
  Wrench,
  CheckCircle,
  Megaphone
} from "lucide-react";

interface PipelineItem {
  id: number;
  applicationId: number;
  userId: string;
  stage: string;
  statusMessage: string | null;
  updatedAt: string;
  authorPseudonym: string | null;
  manuscriptTitle: string | null;
  manuscriptWordCount: number | null;
  firstName: string;
  lastName: string;
}

const STAGES = [
  { key: "not_started", label: "Not Started", subtitle: "Awaiting Work", icon: FileText, color: "bg-gray-500", lightColor: "bg-gray-50", textColor: "text-gray-700" },
  { key: "manuscript_received", label: "Received", subtitle: "Manuscript In", icon: BookOpen, color: "bg-blue-500", lightColor: "bg-blue-50", textColor: "text-blue-700" },
  { key: "cover_design", label: "Cover Design", subtitle: "Art in Progress", icon: Palette, color: "bg-pink-500", lightColor: "bg-pink-50", textColor: "text-pink-700" },
  { key: "formatting", label: "Formatting", subtitle: "Layout & Style", icon: Layout, color: "bg-indigo-500", lightColor: "bg-indigo-50", textColor: "text-indigo-700" },
  { key: "agreement", label: "Agreement", subtitle: "Contract Phase", icon: FileCheck, color: "bg-amber-500", lightColor: "bg-amber-50", textColor: "text-amber-700" },
  { key: "creation", label: "Creation", subtitle: "Writing Phase", icon: PenTool, color: "bg-cyan-500", lightColor: "bg-cyan-50", textColor: "text-cyan-700" },
  { key: "editing", label: "Editing", subtitle: "Mentor Review", icon: Edit3, color: "bg-orange-500", lightColor: "bg-orange-50", textColor: "text-orange-700" },
  { key: "review", label: "Review", subtitle: "Final Review", icon: Eye, color: "bg-purple-500", lightColor: "bg-purple-50", textColor: "text-purple-700" },
  { key: "modifications", label: "Modifications", subtitle: "Revisions", icon: Wrench, color: "bg-yellow-500", lightColor: "bg-yellow-50", textColor: "text-yellow-700" },
  { key: "published", label: "Published", subtitle: "Live", icon: CheckCircle, color: "bg-green-500", lightColor: "bg-green-50", textColor: "text-green-700" },
  { key: "marketing", label: "Marketing", subtitle: "Promotion", icon: Megaphone, color: "bg-teal-500", lightColor: "bg-teal-50", textColor: "text-teal-700" }
];

export default function PipelineContent() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPipeline();
  }, []);

  const loadPipeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pipeline", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch pipeline data");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading pipeline:", err);
      setError("Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  };

  const advanceStage = async (item: PipelineItem) => {
    const currentIndex = STAGES.findIndex(s => s.key === item.stage);
    if (currentIndex >= STAGES.length - 1) return;

    const newStage = STAGES[currentIndex + 1].key;
    setUpdating(item.id);

    try {
      const res = await fetch(`/api/admin/publishing-status/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStage }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to advance stage");
      }

      const confirmed = await res.json().catch(() => ({ status: newStage }));
      const confirmedStage = confirmed.status || newStage;

      setItems(prev =>
        prev.map(m => m.id === item.id ? { ...m, stage: confirmedStage, updatedAt: new Date().toISOString() } : m)
      );
    } catch (err: any) {
      console.error("Error advancing stage:", err);
      alert(err.message || "Failed to advance stage");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const stageCounts = STAGES.reduce((acc, stage) => {
    acc[stage.key] = items.filter(m => m.stage === stage.key).length;
    return acc;
  }, {} as Record<string, number>);

  const activeStages = STAGES.filter(s => (stageCounts[s.key] || 0) > 0 || ["not_started", "manuscript_received", "editing", "review", "published", "marketing"].includes(s.key));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <BookOpen className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-slate-800">Publishing Pipeline</h2>
          </div>
          <p className="text-gray-600 text-sm">Track manuscripts through the publishing stages</p>
        </div>
        <button
          onClick={loadPipeline}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
        {activeStages.map((stage) => {
          const StageIcon = stage.icon;
          return (
            <div key={stage.key} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 rounded-lg ${stage.lightColor} flex items-center justify-center mb-3`}>
                <StageIcon className={`w-5 h-5 ${stage.textColor}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stageCounts[stage.key] || 0}</p>
              <p className="text-sm text-gray-600">{stage.label}</p>
              <p className="text-xs text-gray-400">{stage.subtitle}</p>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Manuscripts Yet</h3>
          <p className="text-gray-500">Manuscripts will appear when students begin the publishing process.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Author</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Words</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Stage</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const stage = STAGES.find(s => s.key === item.stage) || STAGES[0];
                const StageIcon = stage.icon;
                const isLast = item.stage === STAGES[STAGES.length - 1].key;

                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{item.manuscriptTitle || "Untitled"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-700">{item.authorPseudonym || "No pseudonym"}</p>
                      <p className="text-xs text-gray-500">{item.firstName} {item.lastName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{(item.manuscriptWordCount || 0).toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stage.lightColor} ${stage.textColor}`}>
                        <StageIcon className="w-3 h-3" />
                        {stage.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {!isLast && (
                        <button
                          onClick={() => advanceStage(item)}
                          disabled={updating === item.id}
                          className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50"
                        >
                          {updating === item.id ? "..." : "Advance"} <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
