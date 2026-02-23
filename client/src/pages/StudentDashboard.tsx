import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import AuthorScorecard from "../components/AuthorScorecard";
import { 
  Clock, 
  Calendar, 
  Video, 
  TrendingUp, 
  Award,
  Send,
  X,
  MessageCircle,
  PenLine
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
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mentorMessage, setMentorMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [mentorMessageStatus, setMentorMessageStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
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

  const handleSendMentorMessage = async () => {
    if (!mentorMessage.trim()) return;
    setSendingMessage(true);
    setMentorMessageStatus(null);
    try {
      const res = await fetch("/api/contact-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: mentorMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        setMentorMessageStatus({ type: 'success', text: data.message });
        setMentorMessage("");
        setTimeout(() => { setShowMentorModal(false); setMentorMessageStatus(null); }, 2000);
      } else {
        setMentorMessageStatus({ type: 'error', text: data.message || "Failed to send message" });
      }
    } catch {
      setMentorMessageStatus({ type: 'error', text: "Network error. Please try again." });
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const baselineScore = getBaselineScore();
  const currentScore = getCurrentScore();
  const upcomingMeetings = meetings.filter(m => new Date(m.startTime) > new Date()).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-800">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-600 mt-1">Continue your journey in the Architecture of Authorship</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-sm text-gray-500">Hours Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalHoursActive.toFixed(1)} hrs</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Word Count</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalWordCount.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Curriculum Progress</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.curriculumProgress}%</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <PenLine className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Total Output</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalWordCount.toLocaleString()} words</p>
          </div>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-500" />
                Upcoming Sessions
              </h2>

              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Video className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No upcoming sessions scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-slate-800">{meeting.title}</h3>
                        <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                          {meeting.meetingType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {new Date(meeting.startTime).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })} at {new Date(meeting.startTime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {meeting.joinUrl && (
                        <a 
                          href={meeting.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          Join Session
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="font-display text-lg font-bold mb-2">Need Help?</h3>
              <p className="text-teal-100 text-sm mb-4">
                Your Legacy Mentors are here to support you on your writing journey.
              </p>
              <button 
                onClick={() => { setShowMentorModal(true); setMentorMessageStatus(null); }}
                className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Your Mentor
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMentorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Contact Your Mentor</h3>
              <button onClick={() => setShowMentorModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Send a message to your mentor. They'll receive your email and get back to you as soon as possible.
              </p>
              <textarea
                value={mentorMessage}
                onChange={(e) => setMentorMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full h-32 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={sendingMessage}
              />
              {mentorMessageStatus && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  mentorMessageStatus.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {mentorMessageStatus.text}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button 
                onClick={() => setShowMentorModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                disabled={sendingMessage}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMentorMessage}
                disabled={sendingMessage || !mentorMessage.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sendingMessage ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
