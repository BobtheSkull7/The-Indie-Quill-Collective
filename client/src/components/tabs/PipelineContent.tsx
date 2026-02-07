import { useState, useEffect } from "react";
import {
  BookOpen,
  Edit3,
  Shield,
  Barcode,
  Copyright,
  ChevronRight,
  RefreshCw
} from "lucide-react";

interface Manuscript {
  id: number;
  userId: string;
  authorPseudonym: string;
  authorName: string;
  title: string;
  wordCount: number;
  stage: string;
  updatedAt: string;
}

const STAGES = [
  { key: "drafting", label: "Drafting", subtitle: "In Progress", icon: Edit3, color: "bg-blue-500", lightColor: "bg-blue-50", textColor: "text-blue-700" },
  { key: "editing", label: "Editing", subtitle: "Mentor Review", icon: BookOpen, color: "bg-amber-500", lightColor: "bg-amber-50", textColor: "text-amber-700" },
  { key: "vaulted", label: "Vaulted", subtitle: "Identity Mapped", icon: Shield, color: "bg-purple-500", lightColor: "bg-purple-50", textColor: "text-purple-700" },
  { key: "isbn_assigned", label: "ISBN Assigned", subtitle: "Bowker Sync", icon: Barcode, color: "bg-teal-500", lightColor: "bg-teal-50", textColor: "text-teal-700" },
  { key: "copyrighted", label: "Copyrighted", subtitle: "Final Filing", icon: Copyright, color: "bg-green-500", lightColor: "bg-green-50", textColor: "text-green-700" }
];

export default function PipelineContent() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    loadManuscripts();
  }, []);

  const loadManuscripts = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch("/api/admin/users", { credentials: "include" });
      const usersData = await usersRes.json();
      
      const studentsWithApps = (Array.isArray(usersData) ? usersData : []).filter(
        (u: any) => u.role === "student"
      );

      const manuscriptData: Manuscript[] = studentsWithApps.map((student: any, index: number) => ({
        id: index + 1,
        userId: student.id,
        authorPseudonym: student.pseudonym || `Pen Name ${index + 1}`,
        authorName: `${student.firstName} ${student.lastName}`,
        title: `Legacy Work #${index + 1}`,
        wordCount: Math.floor(Math.random() * 50000) + 5000,
        stage: STAGES[index % STAGES.length].key,
        updatedAt: student.createdAt || new Date().toISOString()
      }));

      setManuscripts(manuscriptData);
    } catch (error) {
      console.error("Error loading manuscripts:", error);
    } finally {
      setLoading(false);
    }
  };

  const advanceStage = async (manuscript: Manuscript) => {
    const currentIndex = STAGES.findIndex(s => s.key === manuscript.stage);
    if (currentIndex >= STAGES.length - 1) return;

    setUpdating(manuscript.id);
    const newStage = STAGES[currentIndex + 1].key;
    
    setManuscripts(prev => 
      prev.map(m => m.id === manuscript.id ? { ...m, stage: newStage } : m)
    );
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const stageCounts = STAGES.reduce((acc, stage) => {
    acc[stage.key] = manuscripts.filter(m => m.stage === stage.key).length;
    return acc;
  }, {} as Record<string, number>);

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
          onClick={loadManuscripts}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {STAGES.map((stage) => {
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

      {manuscripts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Manuscripts Yet</h3>
          <p className="text-gray-500">Manuscripts will appear when students begin drafting.</p>
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
              {manuscripts.map((manuscript) => {
                const stage = STAGES.find(s => s.key === manuscript.stage) || STAGES[0];
                const StageIcon = stage.icon;
                const isLast = manuscript.stage === "copyrighted";
                
                return (
                  <tr key={manuscript.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{manuscript.title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-700">{manuscript.authorPseudonym}</p>
                      <p className="text-xs text-gray-500">{manuscript.authorName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{manuscript.wordCount.toLocaleString()}</span>
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
                          onClick={() => advanceStage(manuscript)}
                          disabled={updating === manuscript.id}
                          className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                        >
                          Advance <ChevronRight className="w-4 h-4" />
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
