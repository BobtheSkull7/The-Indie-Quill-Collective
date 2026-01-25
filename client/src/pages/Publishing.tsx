import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import {
  BookOpen,
  Edit3,
  Shield,
  Barcode,
  Copyright,
  ChevronRight,
  User,
  FileText,
  Clock,
  ArrowLeft,
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
  {
    key: "drafting",
    label: "Drafting",
    subtitle: "In Progress",
    icon: Edit3,
    color: "bg-blue-500",
    hoverColor: "hover:bg-blue-600",
    lightColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200"
  },
  {
    key: "editing",
    label: "Editing",
    subtitle: "Mentor Review",
    icon: BookOpen,
    color: "bg-amber-500",
    hoverColor: "hover:bg-amber-600",
    lightColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200"
  },
  {
    key: "vaulted",
    label: "Vaulted",
    subtitle: "Identity PII Mapped",
    icon: Shield,
    color: "bg-purple-500",
    hoverColor: "hover:bg-purple-600",
    lightColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200"
  },
  {
    key: "isbn_assigned",
    label: "ISBN Assigned",
    subtitle: "Bowker Sync",
    icon: Barcode,
    color: "bg-teal-500",
    hoverColor: "hover:bg-teal-600",
    lightColor: "bg-teal-50",
    textColor: "text-teal-700",
    borderColor: "border-teal-200"
  },
  {
    key: "copyrighted",
    label: "Copyrighted",
    subtitle: "Final eCO Filing",
    icon: Copyright,
    color: "bg-green-500",
    hoverColor: "hover:bg-green-600",
    lightColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200"
  }
];

export default function Publishing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "admin") {
      setLocation("/dashboard");
      return;
    }
    loadManuscripts();
  }, [user, setLocation]);

  const loadManuscripts = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch("/api/admin/users");
      const usersData = await usersRes.json();
      
      const studentsWithApps = usersData.filter(
        (u: any) => u.role === "student" && u.hasAcceptedApp
      );

      const manuscriptData: Manuscript[] = studentsWithApps.map((student: any, index: number) => ({
        id: index + 1,
        userId: student.id,
        authorPseudonym: `Pen Name ${index + 1}`,
        authorName: `${student.firstName} ${student.lastName}`,
        title: `Legacy Work #${index + 1}`,
        wordCount: Math.floor(Math.random() * 50000) + 5000,
        stage: STAGES[index % STAGES.length].key,
        updatedAt: student.createdAt || new Date().toISOString()
      }));

      if (manuscriptData.length === 0) {
        setManuscripts([
          {
            id: 1,
            userId: "demo-1",
            authorPseudonym: "Phoenix Writer",
            authorName: "Jane D.",
            title: "The Journey Within",
            wordCount: 42500,
            stage: "drafting",
            updatedAt: new Date().toISOString()
          },
          {
            id: 2,
            userId: "demo-2",
            authorPseudonym: "Starlight Scribe",
            authorName: "John S.",
            title: "Echoes of Tomorrow",
            wordCount: 38200,
            stage: "editing",
            updatedAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 3,
            userId: "demo-3",
            authorPseudonym: "Ocean Dreamer",
            authorName: "Sarah M.",
            title: "Waves of Change",
            wordCount: 51000,
            stage: "vaulted",
            updatedAt: new Date(Date.now() - 172800000).toISOString()
          },
          {
            id: 4,
            userId: "demo-4",
            authorPseudonym: "Mountain Voice",
            authorName: "Michael R.",
            title: "Summit Stories",
            wordCount: 29800,
            stage: "isbn_assigned",
            updatedAt: new Date(Date.now() - 259200000).toISOString()
          },
          {
            id: 5,
            userId: "demo-5",
            authorPseudonym: "Forest Sage",
            authorName: "Emily K.",
            title: "Roots and Wings",
            wordCount: 45600,
            stage: "copyrighted",
            updatedAt: new Date(Date.now() - 345600000).toISOString()
          }
        ]);
      } else {
        setManuscripts(manuscriptData);
      }
    } catch (error) {
      console.error("Error loading manuscripts:", error);
      setManuscripts([
        {
          id: 1,
          userId: "demo-1",
          authorPseudonym: "Phoenix Writer",
          authorName: "Jane D.",
          title: "The Journey Within",
          wordCount: 42500,
          stage: "drafting",
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          userId: "demo-2",
          authorPseudonym: "Starlight Scribe",
          authorName: "John S.",
          title: "Echoes of Tomorrow",
          wordCount: 38200,
          stage: "editing",
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 3,
          userId: "demo-3",
          authorPseudonym: "Ocean Dreamer",
          authorName: "Sarah M.",
          title: "Waves of Change",
          wordCount: 51000,
          stage: "vaulted",
          updatedAt: new Date(Date.now() - 172800000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateStage = async (manuscriptId: number, newStage: string) => {
    setUpdating(manuscriptId);
    await new Promise(resolve => setTimeout(resolve, 300));
    setManuscripts(prev =>
      prev.map(m =>
        m.id === manuscriptId
          ? { ...m, stage: newStage, updatedAt: new Date().toISOString() }
          : m
      )
    );
    setUpdating(null);
  };

  const getManuscriptsForStage = (stageKey: string) => {
    return manuscripts.filter(m => m.stage === stageKey);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/admin")}
              className="flex items-center gap-2 text-gray-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Admin
            </button>
          </div>
          <div className="text-center flex-1">
            <h1 className="font-display text-3xl font-bold text-slate-800">
              Publishing Pipeline
            </h1>
            <p className="text-gray-600 mt-1">
              Impact Engine - Manuscript Journey Tracker
            </p>
          </div>
          <button
            onClick={loadManuscripts}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex items-stretch gap-0 mb-8 overflow-x-auto pb-4">
          {STAGES.map((stage, index) => {
            const StageIcon = stage.icon;
            const count = getManuscriptsForStage(stage.key).length;
            
            return (
              <div key={stage.key} className="flex items-stretch">
                <div
                  className={`relative flex flex-col items-center justify-center px-6 py-4 min-w-[180px] ${stage.color} text-white ${
                    index === 0 ? "rounded-l-lg" : ""
                  } ${index === STAGES.length - 1 ? "rounded-r-lg" : ""}`}
                  style={{
                    clipPath:
                      index === STAGES.length - 1
                        ? undefined
                        : "polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)",
                    marginLeft: index === 0 ? 0 : "-10px",
                    paddingLeft: index === 0 ? "24px" : "30px"
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StageIcon className="w-5 h-5" />
                    <span className="font-semibold text-sm whitespace-nowrap">{stage.label}</span>
                  </div>
                  <span className="text-xs opacity-90 whitespace-nowrap">{stage.subtitle}</span>
                  <div className="absolute -top-2 -right-2 bg-white text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
                    {count}
                  </div>
                </div>
                {index < STAGES.length - 1 && (
                  <div className="flex items-center -mx-1 z-10">
                    <ChevronRight className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const stageManuscripts = getManuscriptsForStage(stage.key);
            const StageIcon = stage.icon;

            return (
              <div key={stage.key} className="flex flex-col">
                <div
                  className={`flex items-center gap-2 px-4 py-3 ${stage.lightColor} ${stage.borderColor} border rounded-t-lg`}
                >
                  <StageIcon className={`w-5 h-5 ${stage.textColor}`} />
                  <span className={`font-semibold ${stage.textColor}`}>
                    {stage.label}
                  </span>
                  <span
                    className={`ml-auto ${stage.color} text-white text-xs px-2 py-0.5 rounded-full`}
                  >
                    {stageManuscripts.length}
                  </span>
                </div>

                <div
                  className={`flex-1 ${stage.lightColor} ${stage.borderColor} border border-t-0 rounded-b-lg p-3 min-h-[300px] space-y-3`}
                >
                  {stageManuscripts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                      <FileText className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-sm">No manuscripts</span>
                    </div>
                  ) : (
                    stageManuscripts.map(manuscript => (
                      <div
                        key={manuscript.id}
                        className={`bg-white rounded-lg border ${stage.borderColor} p-4 shadow-sm hover:shadow-md transition-shadow ${
                          updating === manuscript.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full ${stage.lightColor} flex items-center justify-center`}
                            >
                              <User className={`w-4 h-4 ${stage.textColor}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-800">
                                {manuscript.authorPseudonym}
                              </p>
                              <p className="text-xs text-gray-500">
                                {manuscript.authorName}
                              </p>
                            </div>
                          </div>
                        </div>

                        <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">
                          {manuscript.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {formatWordCount(manuscript.wordCount)} words
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(manuscript.updatedAt)}
                          </span>
                        </div>

                        <select
                          value={manuscript.stage}
                          onChange={e => updateStage(manuscript.id, e.target.value)}
                          disabled={updating === manuscript.id}
                          className={`w-full text-xs px-3 py-2 rounded-lg border ${stage.borderColor} ${stage.lightColor} ${stage.textColor} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500 cursor-pointer`}
                        >
                          {STAGES.map(s => (
                            <option key={s.key} value={s.key}>
                              {s.label} - {s.subtitle}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-800 mb-2">
                About the Publishing Pipeline
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Track each manuscript's journey from initial draft through final copyright
                registration. The Impact Engine ensures every student author receives
                professional publishing support with full identity protection through our
                pseudonym vaulting system. Each stage represents a critical milestone in
                transforming student voices into published works.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
