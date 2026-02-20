import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Clock, 
  Users, 
  TrendingUp, 
  Award,
  Target,
  BarChart3,
  CheckCircle,
  AlertCircle,
  BookMarked,
  Pencil
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

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  hoursActive?: number;
  courseProgress?: number;
  trainingPath?: string;
}

interface AggregatedStats {
  totalStudents: number;
  totalHoursCompleted: number;
  totalHoursGoal: number;
  averageCompletion: number;
  writingToReadCount: number;
  professionalAuthorCount: number;
}

export default function CurriculumContent() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<AggregatedStats>({
    totalStudents: 0,
    totalHoursCompleted: 0,
    totalHoursGoal: 2400,
    averageCompletion: 0,
    writingToReadCount: 0,
    professionalAuthorCount: 0
  });

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      const [usersRes, curriculumRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }).then(r => r.json()),
        fetch("/api/student/curriculum", { credentials: "include" }).then(r => r.json())
      ]);

      const allUsers = Array.isArray(usersRes) ? usersRes : [];
      const studentUsers = allUsers.filter((u: Student) => u.role === "student");
      
      let enrichedStudents = studentUsers;
      try {
        const statsRes = await fetch("/api/admin/training-stats", { credentials: "include" });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const statsMap = new Map((Array.isArray(statsData) ? statsData : []).map((s: any) => [s.id, s]));
          enrichedStudents = studentUsers.map((student: Student) => {
            const stat = statsMap.get(student.id) as any;
            return {
              ...student,
              hoursActive: stat ? Number(stat.hoursActive) || 0 : 0,
              courseProgress: stat ? Number(stat.courseProgress) || 0 : 0,
              trainingPath: stat?.trainingPath === "family_student" ? "writing-to-read" : "professional-author",
            };
          });
        } else {
          enrichedStudents = studentUsers.map((s: Student) => ({
            ...s, hoursActive: 0, courseProgress: 0, trainingPath: "professional-author"
          }));
        }
      } catch {
        enrichedStudents = studentUsers.map((s: Student) => ({
          ...s, hoursActive: 0, courseProgress: 0, trainingPath: "professional-author"
        }));
      }

      setStudents(enrichedStudents);
      setModules(Array.isArray(curriculumRes) ? curriculumRes : []);

      const writingToReadCount = enrichedStudents.filter((s: Student) => s.trainingPath === "writing-to-read").length;
      const professionalAuthorCount = enrichedStudents.filter((s: Student) => s.trainingPath === "professional-author").length;
      const totalHoursCompleted = enrichedStudents.reduce((sum: number, s: Student) => sum + (s.hoursActive || 0), 0);
      const averageCompletion = enrichedStudents.length > 0 
        ? Math.round(enrichedStudents.reduce((sum: number, s: Student) => sum + (s.courseProgress || 0), 0) / enrichedStudents.length)
        : 0;

      setStats({
        totalStudents: enrichedStudents.length,
        totalHoursCompleted,
        totalHoursGoal: 2400,
        averageCompletion,
        writingToReadCount,
        professionalAuthorCount
      });
    } catch (error) {
      console.error("Error loading training data:", error);
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

  const getProgressTextColor = (progress: number) => {
    if (progress >= 75) return "text-green-600";
    if (progress >= 50) return "text-blue-600";
    if (progress >= 25) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const hoursPercentage = Math.min((stats.totalHoursCompleted / stats.totalHoursGoal) * 100, 100);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-sm text-gray-500">Total Students</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalStudents}</p>
          <p className="text-xs text-gray-400 mt-1">Enrolled in program</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Hours Completed</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalHoursCompleted.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">of {stats.totalHoursGoal.toLocaleString()} goal</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Avg. Completion</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.averageCompletion}%</p>
          <p className="text-xs text-gray-400 mt-1">Course progress</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Modules</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{modules.length}</p>
          <p className="text-xs text-gray-400 mt-1">Curriculum modules</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="font-display text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-teal-500" />
          Program Progress
        </h2>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Total Hours Progress</span>
              <span className="text-sm font-bold text-teal-600">
                {stats.totalHoursCompleted.toLocaleString()} / {stats.totalHoursGoal.toLocaleString()} hours
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-500"
                style={{ width: `${hoursPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Goal: 20 students x 120 hours = 2,400 hours
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Average Course Completion</span>
              <span className="text-sm font-bold text-blue-600">{stats.averageCompletion}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getProgressColor(stats.averageCompletion)}`}
                style={{ width: `${stats.averageCompletion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <BookMarked className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-800">Writing-to-Read Path</h3>
              <p className="text-sm text-gray-500">DGLF Literacy Grants</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.writingToReadCount}</p>
              <p className="text-xs text-gray-500">Students</p>
            </div>
            <div className="flex-1 mx-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500"
                  style={{ width: stats.totalStudents > 0 ? `${(stats.writingToReadCount / stats.totalStudents) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">
                {stats.totalStudents > 0 ? Math.round((stats.writingToReadCount / stats.totalStudents) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Focus:</strong> Adult literacy development through creative writing.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Pencil className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-800">Professional Author Path</h3>
              <p className="text-sm text-gray-500">General Grants</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{stats.professionalAuthorCount}</p>
              <p className="text-xs text-gray-500">Students</p>
            </div>
            <div className="flex-1 mx-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500"
                  style={{ width: stats.totalStudents > 0 ? `${(stats.professionalAuthorCount / stats.totalStudents) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">
                {stats.totalStudents > 0 ? Math.round((stats.professionalAuthorCount / stats.totalStudents) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-sm text-indigo-800">
              <strong>Focus:</strong> Professional author development and publishing skills.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-500" />
            Curriculum Modules
          </h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            120 Hours Total
          </span>
        </div>

        {modules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No curriculum modules configured yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <div 
                key={module.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-teal-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">
                    {module.orderIndex}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{module.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {module.durationHours}h
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {module.contentType}
                      </span>
                      {module.isPublished ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-500" />
            Student Progress
          </h2>
          <span className="text-sm text-gray-500">{students.length} students enrolled</span>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No students enrolled yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Training Path</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Hours</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Progress</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
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
                          <p className="font-medium text-slate-800">
                            {student.firstName || "Unknown"} {student.lastName || ""}
                          </p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        student.trainingPath === "writing-to-read" 
                          ? "bg-amber-100 text-amber-700" 
                          : "bg-indigo-100 text-indigo-700"
                      }`}>
                        {student.trainingPath === "writing-to-read" ? "Writing-to-Read" : "Professional Author"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{student.hoursActive}h</span>
                      <span className="text-xs text-gray-500"> / 120h</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${getProgressColor(student.courseProgress || 0)}`}
                            style={{ width: `${student.courseProgress}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getProgressTextColor(student.courseProgress || 0)}`}>
                          {student.courseProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {(student.courseProgress || 0) >= 100 ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </span>
                      ) : (student.courseProgress || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                          <TrendingUp className="w-4 h-4" />
                          In Progress
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                          <AlertCircle className="w-4 h-4" />
                          Not Started
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
