import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../App";
import CharacterCard from "../components/CharacterCard";
import VibeCard from "../components/VibeCard";
import WriterCharacterSheet from "../components/WriterCharacterSheet";
import { 
  BookOpen, 
  Clock, 
  Calendar, 
  Video, 
  TrendingUp, 
  Award,
  FileText,
  Play,
  CheckCircle,
  ChevronRight,
  Edit3,
  Mic,
  Scroll
} from "lucide-react";

interface CurriculumModule {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
  durationHours: number;
  contentType: string;
  isPublished: boolean;
}

interface ModuleProgress {
  moduleId: number;
  percentComplete: number;
  hoursSpent: number;
  startedAt: string | null;
  completedAt: string | null;
}

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
  overallProgress: number;
  modulesCompleted: number;
  totalModules: number;
}

interface StudentWorkEntry {
  id: number;
  questId: number | null;
  contentType: string;
  contentBody: string;
  wordCount: number;
  sourceDevice: string | null;
  createdAt: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [progress, setProgress] = useState<ModuleProgress[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tabeScores, setTabeScores] = useState<TabeScore[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'manuscript'>('overview');
  const [studentWork, setStudentWork] = useState<StudentWorkEntry[]>([]);
  const [stats, setStats] = useState<StudentStats>({
    totalHoursActive: 0,
    totalWordCount: 0,
    overallProgress: 0,
    modulesCompleted: 0,
    totalModules: 0
  });

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (user.role !== "student") {
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
      const [modulesRes, progressRes, meetingsRes, tabeRes, statsRes, workRes] = await Promise.all([
        safeFetch("/api/student/curriculum"),
        safeFetch("/api/student/progress"),
        safeFetch("/api/student/meetings"),
        safeFetch("/api/student/tabe-scores"),
        safeFetch("/api/student/stats"),
        safeFetch("/api/student/work")
      ]);

      setModules(Array.isArray(modulesRes) ? modulesRes : []);
      setProgress(Array.isArray(progressRes) ? progressRes : []);
      setMeetings(Array.isArray(meetingsRes) ? meetingsRes : []);
      setTabeScores(Array.isArray(tabeRes) ? tabeRes : []);
      setStudentWork(Array.isArray(workRes) ? workRes : []);
      if (statsRes && typeof statsRes === 'object' && !Array.isArray(statsRes)) {
        setStats(statsRes);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getModuleProgress = (moduleId: number): ModuleProgress | undefined => {
    return progress.find(p => p.moduleId === moduleId);
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
            <p className="text-2xl font-bold text-slate-800">{stats.totalHoursActive}h</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
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
              <span className="text-sm text-gray-500">Course Progress</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.overallProgress}%</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Modules Done</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.modulesCompleted}/{stats.totalModules}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('manuscript')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'manuscript'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Scroll className="w-4 h-4" />
            My Manuscript
            {studentWork.length > 0 && (
              <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                {studentWork.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'manuscript' ? (
          /* My Manuscript Tab Content */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                <Scroll className="w-5 h-5 text-purple-500" />
                My Manuscript
              </h2>
              <div className="text-sm text-gray-500">
                {studentWork.reduce((sum, w) => sum + w.wordCount, 0).toLocaleString()} total words
              </div>
            </div>

            {studentWork.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mic className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No entries yet</p>
                <p className="text-sm">
                  Use the VibeScribe app to record your voice and your snippets will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentWork.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border ${
                      entry.contentType === 'vibescribe_snippet'
                        ? 'bg-teal-50 border-teal-200'
                        : 'bg-purple-50 border-purple-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {entry.contentType === 'vibescribe_snippet' ? (
                          <Mic className="w-4 h-4 text-teal-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-purple-600" />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {entry.contentType === 'vibescribe_snippet' ? 'Voice Recording' : 'Draft'}
                        </span>
                        {entry.questId && (
                          <span className="bg-white px-2 py-0.5 rounded text-xs text-gray-500">
                            Chapter {entry.questId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{entry.wordCount} words</span>
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3">{entry.contentBody}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Overview Tab Content (Original) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-500" />
                  Your Curriculum
                </h2>
                <span className="text-sm text-gray-500">120-Hour Course</span>
              </div>

              {modules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Curriculum modules are being prepared for you.</p>
                  <p className="text-sm">Check back soon!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.slice(0, 6).map((module) => {
                    const moduleProgress = getModuleProgress(module.id);
                    const isCompleted = moduleProgress?.completedAt;
                    const inProgress = moduleProgress && !isCompleted && moduleProgress.percentComplete > 0;
                    
                    return (
                      <div 
                        key={module.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isCompleted 
                            ? 'bg-green-50 border-green-200' 
                            : inProgress 
                              ? 'bg-teal-50 border-teal-200' 
                              : 'bg-gray-50 border-gray-200 hover:border-teal-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              isCompleted 
                                ? 'bg-green-500 text-white' 
                                : inProgress 
                                  ? 'bg-teal-500 text-white' 
                                  : 'bg-gray-300 text-gray-600'
                            }`}>
                              {isCompleted ? <CheckCircle className="w-4 h-4" /> : module.orderIndex}
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-800">{module.title}</h3>
                              <p className="text-sm text-gray-500">{module.durationHours}h • {module.contentType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {moduleProgress && (
                              <div className="w-24">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-teal-500 transition-all"
                                    style={{ width: `${moduleProgress.percentComplete}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 text-right mt-1">{moduleProgress.percentComplete}%</p>
                              </div>
                            )}
                            <Link 
                              href={`/student/module/${module.id}`}
                              className="p-2 rounded-lg hover:bg-white transition-colors"
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <Play className="w-5 h-5 text-teal-500" />
                              )}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {modules.length > 6 && (
                    <button className="w-full py-3 text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center gap-1">
                      View All {modules.length} Modules <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
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
            <CharacterCard className="w-full" />

            <VibeCard className="w-full" />
            <WriterCharacterSheet className="w-full" />

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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Edit3 className="w-5 h-5 text-purple-500" />
                Your Legacy Work
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Write, edit, and develop your manuscript in the Drafting Suite.
              </p>
              <Link 
                href="/student/drafts"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Open Drafting Suite
              </Link>
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="font-display text-lg font-bold mb-2">Need Help?</h3>
              <p className="text-teal-100 text-sm mb-4">
                Your Legacy Mentors are here to support you on your writing journey.
              </p>
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                Contact Your Mentor
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
