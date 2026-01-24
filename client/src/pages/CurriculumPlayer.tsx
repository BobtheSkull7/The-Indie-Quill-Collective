import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "../App";
import { 
  BookOpen, 
  Play, 
  Pause,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Volume2,
  VolumeX,
  RotateCcw,
  Award
} from "lucide-react";

interface CurriculumModule {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  orderIndex: number;
  durationHours: number;
  contentType: string;
}

interface ModuleProgress {
  moduleId: number;
  percentComplete: number;
  hoursSpent: number;
  startedAt: string | null;
  completedAt: string | null;
}

export default function CurriculumPlayer() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/student/module/:id");
  const moduleId = params?.id ? parseInt(params.id) : null;
  
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<CurriculumModule | null>(null);
  const [allModules, setAllModules] = useState<CurriculumModule[]>([]);
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "student") {
      setLocation("/dashboard");
      return;
    }
    loadModuleData();
  }, [user, moduleId, setLocation]);

  useEffect(() => {
    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadModuleData = async () => {
    if (!moduleId) {
      setLoading(false);
      return;
    }

    try {
      const [moduleRes, allModulesRes, progressRes] = await Promise.all([
        fetch(`/api/student/curriculum/${moduleId}`).then(r => r.json()),
        fetch("/api/student/curriculum").then(r => r.json()),
        fetch("/api/student/progress").then(r => r.json())
      ]);

      if (moduleRes.error) {
        console.error(moduleRes.error);
        setLocation("/student");
        return;
      }

      setModule(moduleRes);
      setAllModules(Array.isArray(allModulesRes) ? allModulesRes : []);
      
      const moduleProgress = (progressRes as ModuleProgress[])?.find(
        (p: ModuleProgress) => p.moduleId === moduleId
      );
      setProgress(moduleProgress || null);

      if (!moduleProgress) {
        await fetch("/api/student/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId, percentComplete: 0 })
        });
      }
    } catch (error) {
      console.error("Error loading module:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (percent: number) => {
    if (!moduleId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/student/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, percentComplete: percent })
      });
      if (res.ok) {
        setProgress(prev => prev ? { ...prev, percentComplete: percent } : null);
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    await updateProgress(100);
  };

  const toggleTTS = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (module?.content) {
      const utterance = new SpeechSynthesisUtterance(module.content);
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
    setTtsEnabled(!ttsEnabled);
  };

  const restartTTS = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (module?.content && ttsEnabled) {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(module.content!);
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }, 100);
    }
  };

  const navigateModule = (direction: "prev" | "next") => {
    if (!module || allModules.length === 0) return;
    const currentIndex = allModules.findIndex(m => m.id === module.id);
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allModules.length) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setLocation(`/student/module/${allModules[newIndex].id}`);
    }
  };

  const getCurrentModuleIndex = () => {
    if (!module) return -1;
    return allModules.findIndex(m => m.id === module.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Module Not Found</h2>
          <button 
            onClick={() => setLocation("/student")}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = getCurrentModuleIndex();
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allModules.length - 1;
  const isCompleted = progress?.completedAt || progress?.percentComplete === 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setLocation("/student")}
              className="flex items-center gap-2 text-gray-600 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {module.durationHours}h
              </div>
              
              <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
                <button
                  onClick={toggleTTS}
                  className={`p-2 rounded-lg transition-colors ${
                    ttsEnabled 
                      ? "bg-teal-100 text-teal-600" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title={ttsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
                >
                  {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                
                {ttsEnabled && (
                  <>
                    <button
                      onClick={restartTTS}
                      className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      title="Restart from beginning"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          window.speechSynthesis.pause();
                          setIsSpeaking(false);
                        } else {
                          window.speechSynthesis.resume();
                          setIsSpeaking(true);
                        }
                      }}
                      className="p-2 rounded-lg bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors"
                    >
                      {isSpeaking ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
            isCompleted ? "bg-green-500" : "bg-teal-500"
          }`}>
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : module.orderIndex}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">{module.title}</h1>
            <p className="text-gray-500">{module.contentType} • Module {module.orderIndex} of {allModules.length}</p>
          </div>
        </div>

        {progress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Your Progress</span>
              <span className="text-sm font-medium text-teal-600">{progress.percentComplete}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${isCompleted ? "bg-green-500" : "bg-teal-500"}`}
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
          {module.description && (
            <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-100">
              <p className="text-teal-800">{module.description}</p>
            </div>
          )}

          <div className="prose prose-slate max-w-none">
            {module.content ? (
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {module.content}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Content for this module is being prepared.</p>
                <p className="text-sm">Check back soon!</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateModule("prev")}
            disabled={!hasPrev}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasPrev 
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous Module
          </button>

          <div className="flex items-center gap-3">
            {!isCompleted && (
              <button
                onClick={markComplete}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Award className="w-5 h-5" />
                {saving ? "Saving..." : "Mark Complete"}
              </button>
            )}

            {isCompleted && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                Completed
              </div>
            )}
          </div>

          <button
            onClick={() => navigateModule("next")}
            disabled={!hasNext}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasNext 
                ? "bg-teal-600 text-white hover:bg-teal-700" 
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
          >
            Next Module
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
