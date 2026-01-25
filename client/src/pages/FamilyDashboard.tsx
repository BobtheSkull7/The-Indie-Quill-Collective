import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { Users, Clock, BookOpen, Pen, Play, Square, Heart, Star } from "lucide-react";

interface FamilyMember {
  id: number;
  firstName: string;
  lastName: string;
  familyRole: string;
  hoursActive: number;
  wordCount: number;
  courseProgress: number;
}

interface FamilyData {
  id: number;
  familyName: string;
  targetPactHours: number;
  totalPactMinutes: number;
  anthologyTitle: string | null;
  anthologyContent: string | null;
  anthologyWordCount: number;
  members: FamilyMember[];
  totalHoursActive: number;
  totalWordCount: number;
  avgCourseProgress: number;
}

interface PactSession {
  id: number;
  sessionTitle: string;
  sessionType: string;
  durationMinutes: number;
  wordsWritten: number;
  createdAt: string;
}

export default function FamilyDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [recentSessions, setRecentSessions] = useState<PactSession[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    type: "writing",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    loadFamilyData();
  }, [user, setLocation]);

  const loadFamilyData = async () => {
    try {
      const [familyRes, sessionsRes] = await Promise.all([
        fetch("/api/family/dashboard").then(r => r.json()),
        fetch("/api/family/pact-sessions").then(r => r.json()),
      ]);
      setFamilyData(familyRes);
      setRecentSessions(sessionsRes || []);
    } catch (error) {
      console.error("Error loading family data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStart) {
      interval = setInterval(() => {
        setSessionTimer(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStart]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startSession = async () => {
    if (!sessionForm.title) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/family/pact-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionForm),
      });
      if (res.ok) {
        setIsSessionActive(true);
        setSessionStart(new Date());
        setShowNewSession(false);
        setSessionForm({ title: "", type: "writing", description: "" });
      }
    } catch (error) {
      console.error("Error starting session:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const endSession = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/family/pact-sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordsWritten: 0 }),
      });
      if (res.ok) {
        setIsSessionActive(false);
        setSessionStart(null);
        setSessionTimer(0);
        loadFamilyData();
      }
    } catch (error) {
      console.error("Error ending session:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const pactProgress = familyData 
    ? Math.min(100, (familyData.totalPactMinutes / 60 / familyData.targetPactHours) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading family dashboard...</div>
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-display text-2xl font-bold text-slate-800">Family Dashboard</h2>
            <p className="text-slate-600 mt-2">
              You are not currently assigned to a family unit. Please contact your program coordinator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Heart className="w-8 h-8 text-teal-600" />
              {familyData.familyName}
            </h1>
            <p className="text-slate-600 mt-1">One Family, One Legacy, One Pen</p>
          </div>
          
          {isSessionActive ? (
            <div className="flex items-center gap-4">
              <div className="bg-teal-100 text-teal-800 px-4 py-2 rounded-lg font-mono text-xl">
                {formatTime(sessionTimer)}
              </div>
              <button 
                onClick={endSession}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                End PACT Session
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewSession(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start PACT Session
            </button>
          )}
        </div>

        {showNewSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="font-display text-xl font-bold text-slate-800 mb-2">Start a PACT Session</h3>
              <p className="text-slate-600 text-sm mb-4">
                Track your Parent and Child Together time for DGLF reporting.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Session Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Story Writing Time"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Activity Type</label>
                  <select
                    value={sessionForm.type}
                    onChange={(e) => setSessionForm({ ...sessionForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="writing">Writing Together</option>
                    <option value="reading">Reading Aloud</option>
                    <option value="discussion">Story Discussion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">What are you working on?</label>
                  <textarea
                    placeholder="Describe your family activity..."
                    value={sessionForm.description}
                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewSession(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startSession}
                    disabled={!sessionForm.title || submitting}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    Begin Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-4">
            <div className="text-sm font-medium text-teal-800 flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" />
              Family Members
            </div>
            <div className="text-3xl font-bold text-teal-900">{familyData.members.length}</div>
            <p className="text-sm text-teal-700 mt-1">household participants</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="text-sm font-medium text-blue-800 flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              PACT Time
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {Math.floor(familyData.totalPactMinutes / 60)}h {familyData.totalPactMinutes % 60}m
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300" 
                style={{ width: `${pactProgress}%` }}
              />
            </div>
            <p className="text-sm text-blue-700 mt-1">of {familyData.targetPactHours}h target</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
            <div className="text-sm font-medium text-purple-800 flex items-center gap-2 mb-2">
              <Pen className="w-4 h-4" />
              Family Word Count
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {familyData.totalWordCount.toLocaleString()}
            </div>
            <p className="text-sm text-purple-700 mt-1">words written together</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
            <div className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4" />
              Course Progress
            </div>
            <div className="text-3xl font-bold text-amber-900">
              {Math.round(familyData.avgCourseProgress)}%
            </div>
            <p className="text-sm text-amber-700 mt-1">family average</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-teal-600" />
              Family Members
            </h3>
            <p className="text-slate-600 text-sm mb-4">Individual progress for each household member</p>
            <div className="space-y-4">
              {familyData.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold">
                      {member.firstName?.[0] || "?"}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        {member.firstName} {member.lastName}
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                        {member.familyRole || "Member"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-slate-600">{member.wordCount.toLocaleString()} words</div>
                    <div className="text-teal-600">{member.courseProgress}% complete</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              Family Anthology
            </h3>
            <p className="text-slate-600 text-sm mb-4">Your shared "Legacy Work" - co-authored by the whole family</p>
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="text-lg font-semibold text-amber-900">
                  {familyData.anthologyTitle || "Untitled Family Story"}
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  {familyData.anthologyWordCount.toLocaleString()} words
                </div>
              </div>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                <Pen className="w-4 h-4" />
                Continue Writing Together
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Recent PACT Sessions
          </h3>
          <p className="text-slate-600 text-sm mb-4">Parent and Child Together time logged for DGLF compliance</p>
          {recentSessions && recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-800">{session.sessionTitle}</div>
                    <div className="text-sm text-slate-600">
                      {new Date(session.createdAt).toLocaleDateString()} - {session.sessionType}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-teal-600">{session.durationMinutes} min</div>
                    {session.wordsWritten > 0 && (
                      <div className="text-sm text-slate-600">{session.wordsWritten} words</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No PACT sessions logged yet.</p>
              <p className="text-sm">Start a session to track your family time together!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
