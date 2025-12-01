import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  Users, FileText, CheckCircle, Clock, TrendingUp, 
  Eye, Check, X 
} from "lucide-react";

interface Application {
  id: number;
  userId: number;
  penName: string | null;
  dateOfBirth: string;
  isMinor: boolean;
  guardianName: string | null;
  bookTitle: string;
  genre: string;
  bookSummary: string;
  manuscriptStatus: string;
  whyCollective: string;
  status: string;
  createdAt: string;
}

interface Stats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  migratedAuthors: number;
  signedContracts: number;
  pendingContracts: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/dashboard");
      return;
    }

    Promise.all([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
    ])
      .then(([apps, statsData]) => {
        setApplications(apps);
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  const updateStatus = async (status: string) => {
    if (!selectedApp) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/applications/${selectedApp.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes }),
      });

      if (res.ok) {
        const updated = await res.json();
        setApplications((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        setSelectedApp(null);
        setReviewNotes("");

        const statsRes = await fetch("/api/admin/stats");
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      under_review: "bg-blue-100 text-blue-700",
      accepted: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      migrated: "bg-purple-100 text-purple-700",
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-slate-800 mb-8">Admin Dashboard</h1>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalApplications}</p>
                  <p className="text-xs text-gray-500">Total Apps</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.pendingApplications}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.acceptedApplications}</p>
                  <p className="text-xs text-gray-500">Accepted</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.migratedAuthors}</p>
                  <p className="text-xs text-gray-500">Migrated</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.signedContracts}</p>
                  <p className="text-xs text-gray-500">Signed</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.pendingContracts}</p>
                  <p className="text-xs text-gray-500">Awaiting Sign</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-4">Applications</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Book Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Genre</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Minor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{app.bookTitle}</td>
                    <td className="py-3 px-4 text-gray-600">{app.genre}</td>
                    <td className="py-3 px-4">
                      {app.isMinor ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Minor</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Adult</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(app.status)}`}>
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold text-slate-800">
                    {selectedApp.bookTitle}
                  </h2>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Genre</p>
                    <p className="text-slate-800">{selectedApp.genre}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`text-sm px-2 py-1 rounded capitalize ${getStatusColor(selectedApp.status)}`}>
                      {selectedApp.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Author Type</p>
                    <p className="text-slate-800">{selectedApp.isMinor ? "Minor (Requires Guardian)" : "Adult"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Manuscript Status</p>
                    <p className="text-slate-800">{selectedApp.manuscriptStatus}</p>
                  </div>
                </div>

                {selectedApp.isMinor && selectedApp.guardianName && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Guardian: {selectedApp.guardianName}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Book Summary</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedApp.bookSummary}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Why They Want to Join</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedApp.whyCollective}</p>
                </div>

                {(selectedApp.status === "pending" || selectedApp.status === "under_review") && (
                  <div className="border-t pt-4 mt-4">
                    <label className="label">Review Notes</label>
                    <textarea
                      rows={3}
                      className="input-field"
                      placeholder="Add notes for the applicant..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />

                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={() => updateStatus("accepted")}
                        disabled={updating}
                        className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Check className="w-5 h-5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => updateStatus("under_review")}
                        disabled={updating}
                        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Mark Under Review
                      </button>
                      <button
                        onClick={() => updateStatus("rejected")}
                        disabled={updating}
                        className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <X className="w-5 h-5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
