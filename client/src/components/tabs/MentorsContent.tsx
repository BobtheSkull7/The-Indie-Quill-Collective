import { useState, useEffect } from "react";
import { Users, Mail, Calendar, Clock, TrendingUp, CheckCircle } from "lucide-react";

interface Mentor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  studentCount?: number;
  avgStudentProgress?: number;
  upcomingMeetings?: number;
}

export default function MentorsContent() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    try {
      const res = await fetch("/api/admin/mentor-stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const mentorUsers = (Array.isArray(data) ? data : []).map((m: any) => ({
          id: m.id,
          firstName: m.firstName || "",
          lastName: m.lastName || "",
          email: m.email || "",
          role: "mentor",
          createdAt: "",
          studentCount: Number(m.studentCount) || 0,
          avgStudentProgress: Math.round(Number(m.avgStudentProgress) || 0),
          upcomingMeetings: Number(m.upcomingMeetings) || 0,
        }));
        setMentors(mentorUsers);
      } else {
        const fallbackRes = await fetch("/api/admin/users", { credentials: "include" });
        const allUsers = await fallbackRes.json();
        const mentorUsers = (Array.isArray(allUsers) ? allUsers : [])
          .filter((u: Mentor) => u.role === "mentor")
          .map((m: Mentor) => ({ ...m, studentCount: 0, avgStudentProgress: 0, upcomingMeetings: 0 }));
        setMentors(mentorUsers);
      }
    } catch (error) {
      console.error("Error loading mentors:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const totalStudentsAssigned = mentors.reduce((sum, m) => sum + (m.studentCount || 0), 0);
  const avgMentorProgress = mentors.length > 0 
    ? Math.round(mentors.reduce((sum, m) => sum + (m.avgStudentProgress || 0), 0) / mentors.length) 
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-800">Mentor Management</h2>
          </div>
          <p className="text-gray-600 text-sm">
            View mentor assignments and student mentorship progress
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Active Mentors
          </div>
          <p className="text-2xl font-bold text-slate-800">{mentors.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Students Assigned
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalStudentsAssigned}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Avg. Student Progress
          </div>
          <p className="text-2xl font-bold text-slate-800">{avgMentorProgress}%</p>
        </div>
      </div>

      {mentors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Mentors Assigned</h3>
          <p className="text-gray-500">
            Promote users to mentor role through Intake to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {(mentor.firstName || "?").charAt(0)}{(mentor.lastName || "?").charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{mentor.firstName || "Unknown"} {mentor.lastName || ""}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {mentor.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-800">{mentor.studentCount}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-800">{mentor.avgStudentProgress}%</p>
                  <p className="text-xs text-gray-500">Avg. Progress</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-800">{mentor.upcomingMeetings}</p>
                  <p className="text-xs text-gray-500">Meetings</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {new Date(mentor.createdAt).toLocaleDateString()}
                </span>
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
