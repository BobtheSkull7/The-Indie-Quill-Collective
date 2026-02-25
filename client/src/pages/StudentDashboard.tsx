import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import AuthorScorecard from "../components/AuthorScorecard";
import ContactModal from "../components/ContactModal";
import { 
  TrendingUp, 
  MessageCircle,
} from "lucide-react";
import VibeDeckContainer from "../components/VibeDeckContainer";
import { useActivityTracker } from "../hooks/useActivityTracker";

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  joinUrl: string | null;
  meetingType: string;
  mentorName?: string;
}

interface TabeScore {
  id: number;
  testType: string;
  scaleScore: number;
  gradeEquivalent: string;
  eflLevel: string;
  isBaseline: boolean;
  testDate: string;
}

interface StudentStats {
  totalHoursActive: number;
  totalWordCount: number;
  curriculumProgress: number;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tabeScores, setTabeScores] = useState<TabeScore[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [stats, setStats] = useState<StudentStats>({
    totalHoursActive: 0,
    totalWordCount: 0,
    curriculumProgress: 0,
  });
  const [characterRefreshKey, setCharacterRefreshKey] = useState(0);

  useActivityTracker();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (user.role !== "student" && user.role !== "admin") {
      setLocation("/dashboard");
      return;
    }

    loadDashboardData();
  }, [user, setLocation]);

  const loadDashboardData = async () => {
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[StudentDashboard] ${url} returned ${res.status}`);
          return null;
        }
        return await res.json();
      } catch (err) {
        console.warn(`[StudentDashboard] Failed to fetch ${url}:`, err);
        return null;
      }
    };

    try {
      const [meetingsRes, tabeRes, statsRes] = await Promise.all([
        safeFetch("/api/student/meetings"),
        safeFetch("/api/student/tabe-scores"),
        safeFetch("/api/student/stats")
      ]);

      setMeetings(Array.isArray(meetingsRes) ? meetingsRes : []);
      setTabeScores(Array.isArray(tabeRes) ? tabeRes : []);
      if (statsRes && typeof statsRes === 'object' && !Array.isArray(statsRes)) {
        setStats(statsRes);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatEflLevel = (level: string) => {
    const levels: Record<string, string> = {
      'beginning_literacy': 'Beginning Literacy (0-1.9)',
      'beginning_basic': 'Beginning Basic (2.0-3.9)',
      'low_intermediate': 'Low Intermediate (4.0-5.9)',
      'high_intermediate': 'High Intermediate (6.0-8.9)',
      'low_adult_secondary': 'Low Adult Secondary (9.0-10.9)',
      'high_adult_secondary': 'High Adult Secondary (11.0-12.9)'
    };
    return levels[level] || level;
  };

  const getBaselineScore = () => tabeScores.find(s => s.isBaseline);
  const getCurrentScore = () => tabeScores.filter(s => !s.isBaseline).sort((a, b) => 
    new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  )[0];


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const baselineScore = getBaselineScore();
  const currentScore = getCurrentScore();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-800">
            Welcome back, {user?.firstName}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <VibeDeckContainer onMetricsChange={() => setCharacterRefreshKey(k => k + 1)} />
            </div>

            {(baselineScore || currentScore) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Your TABE Progress
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {baselineScore && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Baseline ({baselineScore.testType})</span>
                        <span className="text-xs text-gray-400">{new Date(baselineScore.testDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">Grade {baselineScore.gradeEquivalent}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatEflLevel(baselineScore.eflLevel)}</p>
                    </div>
                  )}

                  {currentScore && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-600">Current ({currentScore.testType})</span>
                        <span className="text-xs text-green-500">{new Date(currentScore.testDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Grade {currentScore.gradeEquivalent}</p>
                      <p className="text-sm text-green-600 mt-1">{formatEflLevel(currentScore.eflLevel)}</p>
                      {baselineScore && parseFloat(currentScore.gradeEquivalent) > parseFloat(baselineScore.gradeEquivalent) && (
                        <div className="mt-2 flex items-center gap-1 text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            +{(parseFloat(currentScore.gradeEquivalent) - parseFloat(baselineScore.gradeEquivalent)).toFixed(1)} grade levels
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <AuthorScorecard refreshKey={characterRefreshKey} />

            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="font-display text-lg font-bold mb-2">Need Help?</h3>
              <p className="text-teal-100 text-sm mb-4">
                Your Legacy Mentors are here to support you on your writing journey.
              </p>
              <button 
                onClick={() => setShowContactModal(true)}
                className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Your Mentor
              </button>
            </div>
          </div>
        </div>
      </div>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        pageSource="Student Dashboard — Mentor Contact"
      />
    </div>
  );
}
