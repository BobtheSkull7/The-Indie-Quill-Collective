import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../App";
import { 
  Users, 
  BookOpen, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Award,
  FileText,
  Video,
  ChevronRight,
  Mail,
  CheckCircle,
  AlertCircle,
  Plus
} from "lucide-react";

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  enrolledAt: string;
  hoursActive: number;
  wordCount: number;
  courseProgress: number;
  lastActivity: string | null;
}

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  studentName: string;
  meetingType: string;
}

interface MentorStats {
  totalStudents: number;
  avgProgress: number;
  avgHoursActive: number;
  upcomingMeetings: number;
}

export default function MentorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MentorStats>({
    totalStudents: 0,
    avgProgress: 0,
    avgHoursActive: 0,
    upcomingMeetings: 0
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    studentId: "",
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    meetingType: "one_on_one"
  });

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "mentor") {
      setLocation("/dashboard");
      return;
    }
    loadDashboardData();
  }, [user, setLocation]);

  const loadDashboardData = async () => {
    try {
      const [studentsRes, meetingsRes, statsRes] = await Promise.all([
        fetch("/api/mentor/students").then(r => r.json()),
        fetch("/api/mentor/meetings").then(r => r.json()),
        fetch("/api/mentor/stats").then(r => r.json())
      ]);

      setStudents(Array.isArray(studentsRes) ? studentsRes : []);
      setMeetings(Array.isArray(meetingsRes) ? meetingsRes : []);
      if (statsRes && typeof statsRes === 'object' && !statsRes.error) {
        setStats(statsRes);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/mentor/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMeeting)
      });
      if (res.ok) {
        const meeting = await res.json();
        setMeetings(prev => [...prev, meeting]);
        setShowScheduleModal(false);
        setNewMeeting({
          studentId: "",
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          meetingType: "one_on_one"
        });
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "text-green-600 bg-green-100";
    if (progress >= 50) return "text-blue-600 bg-blue-100";
    if (progress >= 25) return "text-amber-600 bg-amber-100";
    return "text-red-600 bg-red-100";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const upcomingMeetings = meetings
    .filter(m => new Date(m.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-800">
            Mentor Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.firstName}. Manage your students and schedule sessions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-sm text-gray-500">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalStudents}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Avg. Progress</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.avgProgress}%</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Avg. Hours Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.avgHoursActive}h</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Upcoming Sessions</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.upcomingMeetings}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-500" />
                  Your Students
                </h2>
                <span className="text-sm text-gray-500">{students.length} assigned</span>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No students assigned yet.</p>
                  <p className="text-sm">Students will appear here when they're assigned to you.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div 
                      key={student.id}
                      className="p-4 rounded-lg border border-gray-200 hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-800">
                              {student.firstName} {student.lastName}
                            </h3>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${getProgressColor(student.courseProgress)}`}>
                              {student.courseProgress}%
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{student.hoursActive}h active</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setNewMeeting(prev => ({ ...prev, studentId: student.id.toString() }));
                                setShowScheduleModal(true);
                              }}
                              className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                              title="Schedule session"
                            >
                              <Video className="w-4 h-4" />
                            </button>
                            <a 
                              href={`mailto:${student.email}`}
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                              title="Email student"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {student.wordCount.toLocaleString()} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Last active: {student.lastActivity ? formatDate(student.lastActivity) : 'Never'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Upcoming Sessions
                </h2>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="p-2 rounded-lg bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Video className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No upcoming sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-medium text-slate-800 text-sm">{meeting.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">with {meeting.studentName}</p>
                      <p className="text-xs text-blue-600 mt-2">{formatDate(meeting.startTime)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="font-display text-lg font-bold mb-2">Quick Actions</h3>
              <div className="space-y-2 mt-4">
                <button 
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Schedule Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="font-display text-xl font-bold text-slate-800 mb-4">Schedule Session</h2>
            <form onSubmit={scheduleMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select
                  value={newMeeting.studentId}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Session title..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={newMeeting.startTime}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={newMeeting.endTime}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newMeeting.meetingType}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, meetingType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="one_on_one">One-on-One</option>
                  <option value="group">Group Session</option>
                  <option value="review">Draft Review</option>
                  <option value="workshop">Workshop</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
