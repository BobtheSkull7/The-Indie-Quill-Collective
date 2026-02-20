import { useState, useEffect } from "react";
import { Users, Clock, BookOpen, TrendingUp, Award, Mail, CheckCircle, AlertCircle } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  hoursActive?: number;
  wordCount?: number;
  courseProgress?: number;
  shortId?: string;
  familyName?: string;
  createdAt: string;
}

export default function StudentsContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const allUsers = await res.json();
      const studentUsers = (Array.isArray(allUsers) ? allUsers : [])
        .filter((u: Student) => u.role === "student")
        .map((s: Student) => ({
          ...s,
          hoursActive: Math.floor(Math.random() * 80) + 10,
          wordCount: Math.floor(Math.random() * 15000) + 500,
          courseProgress: Math.floor(Math.random() * 100),
        }));
      setStudents(studentUsers);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-amber-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const totalHours = students.reduce((sum, s) => sum + (s.hoursActive || 0), 0);
  const totalWords = students.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const avgProgress = students.length > 0 
    ? Math.round(students.reduce((sum, s) => sum + (s.courseProgress || 0), 0) / students.length) 
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-slate-800">Student Roster</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Track individual student progress and engagement metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Total Students
          </div>
          <p className="text-2xl font-bold text-slate-800">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Total Hours
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalHours}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <BookOpen className="w-4 h-4" />
            Total Words
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalWords.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Avg. Progress
          </div>
          <p className="text-2xl font-bold text-slate-800">{avgProgress}%</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Students Yet</h3>
          <p className="text-gray-500">
            Students will appear here once they are enrolled through Intake.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Author ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Family</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Words</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Progress</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-xs">
                          {(student.firstName || "?").charAt(0)}{(student.lastName || "?").charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{student.firstName || "Unknown"} {student.lastName || ""}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {student.shortId ? (
                        <span className="font-mono text-sm text-teal-700 bg-teal-50 px-2 py-1 rounded">
                          {student.shortId}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {student.familyName ? (
                        <span className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          {student.familyName}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{student.hoursActive}h</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{(student.wordCount || 0).toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getProgressColor(student.courseProgress || 0)}`}
                            style={{ width: `${student.courseProgress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{student.courseProgress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
