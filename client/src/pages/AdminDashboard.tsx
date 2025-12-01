import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  Users, FileText, CheckCircle, Clock, TrendingUp, 
  Eye, Check, X, RefreshCw, AlertTriangle, Zap, Calendar, Mail, User, BookOpen
} from "lucide-react";

interface Application {
  id: number;
  userId: number;
  penName: string | null;
  dateOfBirth: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  bookTitle: string;
  genre: string;
  wordCount: number | null;
  bookSummary: string;
  manuscriptStatus: string;
  previouslyPublished: boolean;
  publishingDetails: string | null;
  whyCollective: string;
  goals: string | null;
  hearAboutUs: string | null;
  status: string;
  createdAt: string;
  authorName?: string;
  authorEmail?: string;
}

interface Stats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  migratedAuthors: number;
  signedContracts: number;
  pendingContracts: number;
  syncedToLLC: number;
  pendingSync: number;
  failedSync: number;
}

interface SyncRecord {
  id: number;
  applicationId: number;
  userId: number;
  indieQuillAuthorId: string | null;
  syncStatus: string;
  syncError: string | null;
  syncAttempts: number;
  lastSyncAttempt: string | null;
  lastSyncedAt: string | null;
  bookTitle: string;
  authorName: string;
  email: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"applicants" | "sync">("applicants");
  const [retrying, setRetrying] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/dashboard");
      return;
    }

    loadData();
  }, [user, setLocation]);

  const loadData = async () => {
    try {
      const [apps, statsData, syncData] = await Promise.all([
        fetch("/api/applications").then((r) => r.json()),
        fetch("/api/admin/stats").then((r) => r.json()),
        fetch("/api/admin/sync-status").then((r) => r.json()),
      ]);
      setApplications(apps);
      setStats(statsData);
      setSyncRecords(syncData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

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
          prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
        );
        setSelectedApp(null);
        setReviewNotes("");
        loadData();
      }
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setUpdating(false);
    }
  };

  const retrySync = async (id: number) => {
    setRetrying(id);
    try {
      await fetch(`/api/admin/retry-sync/${id}`, { method: "POST" });
      await loadData();
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setRetrying(null);
    }
  };

  const retryAllFailed = async () => {
    setRetrying(-1);
    try {
      await fetch("/api/admin/retry-all-failed", { method: "POST" });
      await loadData();
    } catch (error) {
      console.error("Retry all failed:", error);
    } finally {
      setRetrying(null);
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

  const getSyncStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      syncing: "bg-blue-100 text-blue-700",
      synced: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };
    return colors[status] || colors.pending;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
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
                  <p className="text-2xl font-bold text-slate-800">{stats.syncedToLLC}</p>
                  <p className="text-xs text-gray-500">Synced to LLC</p>
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
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.pendingSync}</p>
                  <p className="text-xs text-gray-500">Pending Sync</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.failedSync}</p>
                  <p className="text-xs text-gray-500">Failed Sync</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab("applicants")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "applicants"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Applicants
          </button>
          <button
            onClick={() => setActiveTab("sync")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "sync"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            LLC Sync Status
          </button>
        </div>

        {activeTab === "applicants" && (
          <div className="card">
            <h2 className="font-display text-xl font-semibold text-slate-800 mb-4">Applicants</h2>
            
            {applications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No applications yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Author</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Book Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Genre</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Applied</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-800">{app.authorName || "Unknown"}</p>
                            <p className="text-xs text-gray-500">{app.authorEmail}</p>
                          </div>
                        </td>
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
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateTime(app.createdAt)}</span>
                          </div>
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
            )}
          </div>
        )}

        {activeTab === "sync" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-slate-800">
                The Indie Quill LLC Sync Status
              </h2>
              {stats && stats.failedSync > 0 && (
                <button
                  onClick={retryAllFailed}
                  disabled={retrying === -1}
                  className="btn-primary text-sm py-2 px-4 flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${retrying === -1 ? "animate-spin" : ""}`} />
                  <span>Retry All Failed</span>
                </button>
              )}
            </div>

            {syncRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No sync records yet. Authors will appear here once contracts are signed.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Author</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Book</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Sync Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">LLC Author ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Attempts</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{record.authorName}</p>
                          <p className="text-xs text-gray-500">{record.email}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{record.bookTitle}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${getSyncStatusColor(record.syncStatus)}`}>
                            {record.syncStatus}
                          </span>
                          {record.syncError && (
                            <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={record.syncError}>
                              {record.syncError}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-sm">
                          {record.indieQuillAuthorId || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {record.syncAttempts}
                        </td>
                        <td className="py-3 px-4">
                          {record.syncStatus === "failed" && (
                            <button
                              onClick={() => retrySync(record.id)}
                              disabled={retrying === record.id}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Retry Sync"
                            >
                              <RefreshCw className={`w-5 h-5 ${retrying === record.id ? "animate-spin" : ""}`} />
                            </button>
                          )}
                          {record.syncStatus === "synced" && (
                            <Zap className="w-5 h-5 text-green-500" title="Synced" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-800">
                      {selectedApp.bookTitle}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Applied: {formatDateTime(selectedApp.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2 text-red-500" />
                    Author Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-slate-800 font-medium">{selectedApp.authorName || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-slate-800">{selectedApp.authorEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pen Name</p>
                      <p className="text-slate-800">{selectedApp.penName || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="text-slate-800">{selectedApp.dateOfBirth}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Author Type</p>
                      <p className="text-slate-800">{selectedApp.isMinor ? "Minor (Under 18)" : "Adult"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Status</p>
                      <span className={`text-sm px-2 py-1 rounded capitalize ${getStatusColor(selectedApp.status)}`}>
                        {selectedApp.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedApp.isMinor && selectedApp.guardianName && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-3">Guardian Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-blue-600">Guardian Name</p>
                        <p className="text-blue-900">{selectedApp.guardianName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Relationship</p>
                        <p className="text-blue-900">{selectedApp.guardianRelationship || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Email</p>
                        <p className="text-blue-900">{selectedApp.guardianEmail || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Phone</p>
                        <p className="text-blue-900">{selectedApp.guardianPhone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-red-500" />
                    Book Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Title</p>
                      <p className="text-slate-800 font-medium">{selectedApp.bookTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Genre</p>
                      <p className="text-slate-800">{selectedApp.genre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Word Count</p>
                      <p className="text-slate-800">{selectedApp.wordCount?.toLocaleString() || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Manuscript Status</p>
                      <p className="text-slate-800">{selectedApp.manuscriptStatus}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Previously Published</p>
                      <p className="text-slate-800">{selectedApp.previouslyPublished ? "Yes" : "No"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Book Summary</p>
                    <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{selectedApp.bookSummary}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-800 mb-3">Motivation & Goals</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Why They Want to Join The Collective</p>
                      <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{selectedApp.whyCollective}</p>
                    </div>
                    {selectedApp.goals && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Publishing Goals</p>
                        <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{selectedApp.goals}</p>
                      </div>
                    )}
                    {selectedApp.hearAboutUs && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">How They Heard About Us</p>
                        <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{selectedApp.hearAboutUs}</p>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedApp.status === "pending" || selectedApp.status === "under_review") && (
                  <div className="border-t pt-6 mt-6">
                    <label className="label">Review Notes (optional)</label>
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
                        className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2 font-medium"
                      >
                        <Check className="w-5 h-5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => updateStatus("rejected")}
                        disabled={updating}
                        className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2 font-medium"
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
