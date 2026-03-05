import { useState, useEffect } from "react";
import { Users, Mail, Calendar, Clock, TrendingUp, CheckCircle, Plus, X, Trash2, UserPlus } from "lucide-react";

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

interface Assignment {
  id: number;
  mentorId: string;
  studentId: string;
  assignedAt: string;
  isActive: boolean;
  mentorName: string;
  studentName: string;
  studentEmail: string;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function MentorsContent() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mentorRes, assignRes, usersRes] = await Promise.all([
        fetch("/api/admin/mentor-stats", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/admin/mentor-assignments", { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch("/api/admin/users", { credentials: "include" }).then(r => r.ok ? r.json() : []),
      ]);

      const mentorUsers = (Array.isArray(mentorRes) ? mentorRes : []).map((m: any) => ({
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
      setAssignments(Array.isArray(assignRes) ? assignRes : []);
      setAllUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (error) {
      console.error("Error loading mentors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedMentorId || !selectedStudentId) {
      setAssignError("Please select both a mentor and a student.");
      return;
    }
    setAssigning(true);
    setAssignError("");
    try {
      const res = await fetch("/api/admin/mentor-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mentorId: selectedMentorId, studentId: selectedStudentId }),
      });
      if (res.ok) {
        setShowAssignModal(false);
        setSelectedMentorId("");
        setSelectedStudentId("");
        loadData();
      } else {
        const data = await res.json();
        setAssignError(data.error || "Failed to create assignment");
      }
    } catch (error) {
      setAssignError("Network error. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    if (!confirm("Remove this student-mentor assignment?")) return;
    try {
      const res = await fetch(`/api/admin/mentor-assignments/${assignmentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
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

  const mentorOptions = allUsers.filter(u => u.role === "mentor");
  const studentOptions = allUsers.filter(u => u.role === "student" || u.role === "writer");

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
        <button
          onClick={() => { setShowAssignModal(true); setAssignError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Assign Student
        </button>
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

      {assignments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            Current Assignments
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Mentor</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Student</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Assigned</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-slate-800">{a.mentorName}</td>
                    <td className="py-2 px-3 text-slate-800">{a.studentName}</td>
                    <td className="py-2 px-3 text-gray-500">{a.studentEmail}</td>
                    <td className="py-2 px-3 text-gray-500">{new Date(a.assignedAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleRemoveAssignment(a.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                <button
                  onClick={() => {
                    setSelectedMentorId(mentor.id);
                    setSelectedStudentId("");
                    setAssignError("");
                    setShowAssignModal(true);
                  }}
                  className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Assign Student
                </button>
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Assign Student to Mentor</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {assignError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
                <select
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a mentor...</option>
                  {mentorOptions.map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a student...</option>
                  {studentOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={assigning}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
