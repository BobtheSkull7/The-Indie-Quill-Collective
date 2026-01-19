import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  Users, FileText, CheckCircle, Clock, TrendingUp, 
  Eye, Check, X, RefreshCw, AlertTriangle, Zap, Calendar, Mail, User, BookOpen, Shield,
  Plus, Trash2, MapPin, BarChart3, Download, Activity, ChevronLeft, ChevronRight
} from "lucide-react";
import OperationsPanel from "../components/OperationsPanel";

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
  guardianConsentMethod: string | null;
  guardianConsentVerified: boolean | null;
  dataRetentionUntil: string | null;
  hasStoryToTell: boolean;
  personalStruggles: string;
  expressionTypes: string;
  expressionOther: string | null;
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
  expressionTypes: string;
  authorName: string;
  email: string;
  status: string;
}

const PUBLISHING_STAGES = [
  { key: "agreement", label: "Agreement" },
  { key: "creation", label: "Creation" },
  { key: "editing", label: "Editing" },
  { key: "review", label: "Review" },
  { key: "modifications", label: "Modifications" },
  { key: "published", label: "Published" },
  { key: "marketing", label: "Marketing" },
];

const legacyToNewStageMap: Record<string, string> = {
  'not_started': 'agreement',
  'manuscript_received': 'creation',
  'cover_design': 'editing',
  'formatting': 'editing',
};

const normalizeStage = (status: string): string => {
  return legacyToNewStageMap[status] || status;
};

interface UserRecord {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  applicationCount: number;
  hasAcceptedApp: boolean;
}

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  eventType: string;
  location: string | null;
  createdBy: number;
  createdAt: string;
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
  const [activeTab, setActiveTab] = useState<"applicants" | "sync" | "users" | "calendar" | "operations">("applicants");
  const [retrying, setRetrying] = useState<number | null>(null);
  const [updatingStage, setUpdatingStage] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    allDay: false,
    eventType: "meeting",
    location: "",
  });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<{ connected: boolean; email?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; pushedToGoogle: number; pulledFromGoogle: number; error?: string } | null>(null);
  const [coppaConsentMethod, setCoppaConsentMethod] = useState<string>("");
  const [coppaConsentVerified, setCoppaConsentVerified] = useState<boolean>(false);
  const [coppaRetentionDate, setCoppaRetentionDate] = useState<string>("");
  const [updatingCoppa, setUpdatingCoppa] = useState(false);
  const [coppaOriginalState, setCoppaOriginalState] = useState({ method: "", verified: false, date: "" });
  const [forceSyncing, setForceSyncing] = useState(false);
  const [forceSyncResult, setForceSyncResult] = useState<{ total: number; queued: number; alreadySynced: number; failed: number; idsGenerated?: number; errors: string[] } | null>(null);
  const [retryAllResult, setRetryAllResult] = useState<{ retried: number; succeeded: number; error?: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [availableCohorts, setAvailableCohorts] = useState<Array<{ id: number; label: string; currentCount: number; capacity: number }>>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "admin") {
      setLocation("/dashboard");
      return;
    }
    loadData();
  }, [user, setLocation]);

  const loadData = async () => {
    setError(null);
    try {
      const [appsRes, statsRes, syncRes, usersRes, calendarRes, gcalStatusRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/sync-status"),
        fetch("/api/admin/users"),
        fetch("/api/board/calendar"),
        fetch("/api/board/calendar/sync-status"),
      ]);

      const apps = appsRes.ok ? await appsRes.json() : [];
      const statsData = statsRes.ok ? await statsRes.json() : null;
      const syncData = syncRes.ok ? await syncRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const calendarData = calendarRes.ok ? await calendarRes.json() : [];
      const gcalStatus = gcalStatusRes.ok ? await gcalStatusRes.json() : { connected: false };

      setApplications(Array.isArray(apps) ? apps : []);
      setStats(statsData);
      setSyncRecords(Array.isArray(syncData) ? syncData : []);
      setAllUsers(Array.isArray(usersData) ? usersData : []);
      setGoogleCalendarStatus(gcalStatus);
      const sortedCalendarEvents = Array.isArray(calendarData) 
        ? calendarData.sort((a: CalendarEvent, b: CalendarEvent) => 
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          )
        : [];
      setCalendarEvents(sortedCalendarEvents);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError("Failed to load dashboard data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCohorts = async () => {
    try {
      const res = await fetch("/api/admin/cohorts/available", { credentials: "include" });
      if (res.ok) {
        const cohorts = await res.json();
        setAvailableCohorts(cohorts);
      }
    } catch (error) {
      console.error("Failed to fetch cohorts:", error);
    }
  };

  useEffect(() => {
    if (selectedApp && (selectedApp.status === "pending" || selectedApp.status === "under_review")) {
      fetchAvailableCohorts();
      setSelectedCohortId(null);
    }
  }, [selectedApp]);

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
        
        if (status === "accepted") {
          await fetch(`/api/admin/applications/${selectedApp.id}/assign-cohort`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ cohortId: selectedCohortId }),
          });
        }
        
        setApplications((prev) =>
          prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
        );
        setSelectedApp(null);
        setReviewNotes("");
        setSelectedCohortId(null);
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
    setRetryAllResult(null);
    try {
      const res = await fetch("/api/admin/retry-all-failed", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setRetryAllResult(result);
      } else {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        setRetryAllResult({ retried: 0, succeeded: 0, error: errorData.message || "Request failed" });
      }
      await loadData();
    } catch (error: any) {
      console.error("Retry all failed:", error);
      setRetryAllResult({ retried: 0, succeeded: 0, error: error.message || "Connection failed" });
    } finally {
      setRetrying(null);
    }
  };

  const updatePublishingStage = async (id: number, newStatus: string) => {
    setUpdatingStage(id);
    try {
      const res = await fetch(`/api/admin/publishing-status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Update stage failed:", error);
    } finally {
      setUpdatingStage(null);
    }
  };

  const getStageIndex = (status: string) => {
    const normalized = normalizeStage(status);
    return PUBLISHING_STAGES.findIndex(s => s.key === normalized);
  };

  const forceSyncAllMigrated = async () => {
    setForceSyncing(true);
    setForceSyncResult(null);
    try {
      const res = await fetch("/api/admin/force-sync-all-migrated", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setForceSyncResult(result);
        await loadData();
      } else {
        setForceSyncResult({ total: 0, queued: 0, alreadySynced: 0, failed: 1, errors: ["Request failed"] });
      }
    } catch (error) {
      console.error("Force sync failed:", error);
      setForceSyncResult({ total: 0, queued: 0, alreadySynced: 0, failed: 1, errors: ["Connection error"] });
    } finally {
      setForceSyncing(false);
    }
  };

  const handleTileClick = (filter: string) => {
    switch (filter) {
      case "applications":
        setActiveTab("applicants");
        setStatusFilter("pending_review");
        break;
      case "pendingSync":
        setActiveTab("sync");
        setStatusFilter("pending");
        break;
      case "synced":
        setActiveTab("sync");
        setStatusFilter("synced");
        break;
      case "failed":
        setActiveTab("sync");
        setStatusFilter("failed");
        break;
    }
  };

  const updateUserRole = async () => {
    if (!editingUser || !newRole) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAllUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u))
        );
        setEditingUser(null);
        setNewRole("");
      }
    } catch (error) {
      console.error("Update user role failed:", error);
    } finally {
      setUpdating(false);
    }
  };

  const createCalendarEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) return;
    setCreatingEvent(true);

    try {
      const startDateISO = new Date(newEvent.startDate).toISOString();
      let endDateISO = newEvent.endDate ? new Date(newEvent.endDate).toISOString() : null;
      
      if (newEvent.allDay && !endDateISO) {
        endDateISO = startDateISO;
      }

      const res = await fetch("/api/board/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description || null,
          startDate: startDateISO,
          endDate: endDateISO,
          allDay: newEvent.allDay,
          eventType: newEvent.eventType,
          location: newEvent.location || null,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setCalendarEvents((prev) => [...prev, created].sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        ));
        setNewEvent({
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          allDay: false,
          eventType: "meeting",
          location: "",
        });
        setShowEventForm(false);
      }
    } catch (error) {
      console.error("Create calendar event failed:", error);
    } finally {
      setCreatingEvent(false);
    }
  };

  const deleteCalendarEvent = async (id: number) => {
    setDeletingEventId(id);
    try {
      const res = await fetch(`/api/board/calendar/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error("Delete calendar event failed:", error);
    } finally {
      setDeletingEventId(null);
    }
  };

  const syncWithGoogleCalendar = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/board/calendar/sync", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setSyncResult(result);
        if (result.success) {
          await loadData();
        }
      } else {
        setSyncResult({ success: false, pushedToGoogle: 0, pulledFromGoogle: 0, error: "Sync request failed" });
      }
    } catch (error) {
      console.error("Google Calendar sync failed:", error);
      setSyncResult({ success: false, pushedToGoogle: 0, pulledFromGoogle: 0, error: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      meeting: "bg-blue-100 text-blue-700",
      board_meeting: "bg-purple-100 text-purple-700",
      deadline: "bg-red-100 text-red-700",
      event: "bg-green-100 text-green-700",
      other: "bg-gray-100 text-gray-700",
    };
    return colors[type] || colors.other;
  };

  const formatEventType = (type: string) => {
    const labels: Record<string, string> = {
      meeting: "Meeting",
      board_meeting: "Board Meeting",
      deadline: "Deadline",
      event: "Event",
      other: "Other",
    };
    return labels[type] || type;
  };

  const initCoppaState = (app: Application) => {
    const method = app.guardianConsentMethod || "";
    const verified = app.guardianConsentVerified || false;
    const date = app.dataRetentionUntil ? app.dataRetentionUntil.split("T")[0] : "";
    setCoppaConsentMethod(method);
    setCoppaConsentVerified(verified);
    setCoppaRetentionDate(date);
    setCoppaOriginalState({ method, verified, date });
  };

  const hasCoppaChanges = () => {
    return coppaConsentMethod !== coppaOriginalState.method ||
           coppaConsentVerified !== coppaOriginalState.verified ||
           coppaRetentionDate !== coppaOriginalState.date;
  };

  const updateCoppaCompliance = async () => {
    if (!selectedApp) return;
    setUpdatingCoppa(true);

    try {
      const res = await fetch(`/api/applications/${selectedApp.id}/coppa-compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianConsentMethod: coppaConsentMethod || null,
          guardianConsentVerified: coppaConsentVerified,
          dataRetentionUntil: coppaRetentionDate || null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Update the applications list with only COPPA fields
        setApplications((prev) =>
          prev.map((a) => (a.id === updated.id ? { 
            ...a, 
            guardianConsentMethod: updated.guardianConsentMethod,
            guardianConsentVerified: updated.guardianConsentVerified,
            dataRetentionUntil: updated.dataRetentionUntil,
          } : a))
        );
        // Update the selected app with the server response
        const newSelectedApp = { 
          ...selectedApp, 
          guardianConsentMethod: updated.guardianConsentMethod,
          guardianConsentVerified: updated.guardianConsentVerified,
          dataRetentionUntil: updated.dataRetentionUntil,
        };
        setSelectedApp(newSelectedApp);
        // Refresh local state from API response to ensure consistency
        initCoppaState(newSelectedApp);
      }
    } catch (error) {
      console.error("Update COPPA compliance failed:", error);
    } finally {
      setUpdatingCoppa(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      applicant: "bg-gray-100 text-gray-700",
      admin: "bg-red-100 text-red-700",
      board_member: "bg-purple-100 text-purple-700",
    };
    return colors[role] || colors.applicant;
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

  const formatExpressionTypes = (types: string) => {
    const typeLabels: Record<string, string> = {
      novel: "Novel",
      short_story: "Short Story",
      poems: "Poems",
      graphic_novel: "Graphic Novel",
      other: "Other",
    };
    return types.split(",").map(t => typeLabels[t.trim()] || t.trim()).join(", ");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gray-50">
        <div className="card max-w-md text-center">
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Please Sign In</h2>
          <p className="text-gray-600">You need to be logged in to view this page.</p>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gray-50">
        <div className="card max-w-md text-center">
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gray-50">
        <div className="card max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-slate-800 mb-8">Admin Dashboard</h1>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleTileClick("applications")}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.pendingApplications}</p>
                  <p className="text-xs text-gray-500">Applications</p>
                </div>
              </div>
            </div>
            <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleTileClick("pendingSync")}>
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
            <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleTileClick("synced")}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.syncedToLLC}</p>
                  <p className="text-xs text-gray-500">Done</p>
                </div>
              </div>
            </div>
            <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleTileClick("failed")}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.failedSync}</p>
                  <p className="text-xs text-gray-500">Failed</p>
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
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "users"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "calendar"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "operations"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Operations</span>
          </button>
        </div>

        {activeTab === "applicants" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-slate-800">Applicants</h2>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filter: {statusFilter === "pending_review" ? "Pending Review" : statusFilter} &times;
                </button>
              )}
            </div>
            
            {applications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No applications yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Author</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Expression Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Has Story</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Age</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Applied</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications
                      .filter(app => !statusFilter || 
                        (statusFilter === "pending_review" ? (app.status === "pending" || app.status === "under_review") : app.status === statusFilter))
                      .map((app) => (
                      <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-800">{app.authorName || "Unknown"}</p>
                            <p className="text-xs text-gray-500">{app.authorEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{formatExpressionTypes(app.expressionTypes)}</td>
                        <td className="py-3 px-4">
                          {app.hasStoryToTell ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Yes</span>
                          ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Not Sure</span>
                          )}
                        </td>
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
                            onClick={() => {
                              setSelectedApp(app);
                              if (app.isMinor) {
                                initCoppaState(app);
                              }
                            }}
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
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-800">
                  The Indie Quill LLC Sync Status
                </h2>
                {statusFilter && (
                  <button
                    onClick={() => setStatusFilter(null)}
                    className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Clear filter: {statusFilter} &times;
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={forceSyncAllMigrated}
                  disabled={forceSyncing}
                  className="bg-purple-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Zap className={`w-4 h-4 ${forceSyncing ? "animate-pulse" : ""}`} />
                  <span>{forceSyncing ? "Syncing..." : "Force Sync All Migrated"}</span>
                </button>
                {stats && stats.failedSync > 0 && (
                  <button
                    onClick={retryAllFailed}
                    disabled={retrying === -1}
                    className="btn-primary text-sm py-2 px-4 flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${retrying === -1 ? "animate-spin" : ""}`} />
                    <span>{retrying === -1 ? "Retrying..." : "Retry All Failed"}</span>
                  </button>
                )}
              </div>
            </div>

            {forceSyncResult && (
              <div className={`p-4 rounded-lg mb-4 ${forceSyncResult.failed > 0 ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}>
                <p className="font-medium text-slate-800">
                  Force Sync Complete: {forceSyncResult.queued} synced, {forceSyncResult.alreadySynced} already synced, {forceSyncResult.failed} failed
                  {forceSyncResult.idsGenerated ? `, ${forceSyncResult.idsGenerated} IDs generated` : ""}
                </p>
                {forceSyncResult.errors.length > 0 && (
                  <ul className="text-sm text-red-600 mt-2 list-disc list-inside">
                    {forceSyncResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {forceSyncResult.errors.length > 5 && (
                      <li>...and {forceSyncResult.errors.length - 5} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {retryAllResult && (
              <div className={`p-4 rounded-lg mb-4 ${retryAllResult.error || retryAllResult.succeeded === 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                <p className="font-medium text-slate-800">
                  {retryAllResult.error 
                    ? `Retry Failed: ${retryAllResult.error}` 
                    : `Retry Complete: ${retryAllResult.retried} attempted, ${retryAllResult.succeeded} succeeded, ${retryAllResult.retried - retryAllResult.succeeded} failed`
                  }
                </p>
              </div>
            )}

            {syncRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No sync records yet. Use "Force Sync All Migrated" to queue migrated authors for sync.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Author</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Expression Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Sync Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Chevron Stage</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">LLC Author ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Attempts</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncRecords
                      .filter(record => !statusFilter || record.syncStatus === statusFilter)
                      .map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{record.authorName}</p>
                          <p className="text-xs text-gray-500">{record.email}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{formatExpressionTypes(record.expressionTypes)}</td>
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
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                const currentIdx = getStageIndex(record.status);
                                if (currentIdx > 0) {
                                  updatePublishingStage(record.id, PUBLISHING_STAGES[currentIdx - 1].key);
                                }
                              }}
                              disabled={updatingStage === record.id || getStageIndex(record.status) <= 0}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move to previous stage"
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className={`text-xs px-2 py-1 rounded capitalize ${
                              normalizeStage(record.status) === 'published' || normalizeStage(record.status) === 'marketing' ? 'bg-green-100 text-green-700' :
                              normalizeStage(record.status) === 'review' || normalizeStage(record.status) === 'modifications' ? 'bg-purple-100 text-purple-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {PUBLISHING_STAGES.find(s => s.key === normalizeStage(record.status))?.label || normalizeStage(record.status) || 'Agreement'}
                            </span>
                            <button
                              onClick={() => {
                                const currentIdx = getStageIndex(record.status);
                                if (currentIdx < PUBLISHING_STAGES.length - 1) {
                                  updatePublishingStage(record.id, PUBLISHING_STAGES[currentIdx + 1].key);
                                }
                              }}
                              disabled={updatingStage === record.id || getStageIndex(record.status) >= PUBLISHING_STAGES.length - 1}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move to next stage"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                          {updatingStage === record.id && (
                            <p className="text-xs text-blue-500 mt-1">Updating...</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-sm">
                          {record.indieQuillAuthorId || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {record.syncAttempts}
                        </td>
                        <td className="py-3 px-4 flex items-center space-x-2">
                          {record.syncStatus === "failed" && (
                            <button
                              onClick={() => retrySync(record.id)}
                              disabled={retrying === record.id}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded flex items-center space-x-1 transition-colors"
                              title="Retry sync to LLC"
                            >
                              <RefreshCw className={`w-4 h-4 ${retrying === record.id ? "animate-spin" : ""}`} />
                              <span>Retry Sync</span>
                            </button>
                          )}
                          {record.syncStatus === "pending" && (
                            <span className="text-xs text-gray-500 italic">Queued...</span>
                          )}
                          {record.syncStatus === "syncing" && (
                            <span className="text-xs text-blue-500 flex items-center space-x-1">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Syncing...</span>
                            </span>
                          )}
                          {record.syncStatus === "synced" && (
                            <span className="text-xs text-green-600 flex items-center space-x-1" title="Successfully synced">
                              <Zap className="w-4 h-4" />
                              <span>Synced</span>
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
        )}

        {activeTab === "users" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-slate-800">
                User Management
              </h2>
              <p className="text-sm text-gray-500">{allUsers.length} total users</p>
            </div>

            {allUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Applications</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${getRoleColor(u.role)}`}>
                            {u.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-600">{u.applicationCount}</span>
                          {u.hasAcceptedApp && (
                            <CheckCircle className="w-4 h-4 text-green-500 inline ml-2" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {formatDateTime(u.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setNewRole(u.role);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
                          >
                            Edit Role
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

        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-slate-800 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-red-500" />
                  <span>Google Calendar Sync</span>
                </h2>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${googleCalendarStatus?.connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {googleCalendarStatus?.connected ? 'Connected' : 'Not Connected'}
                    </p>
                    {googleCalendarStatus?.email && (
                      <p className="text-sm text-gray-500">{googleCalendarStatus.email}</p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={syncWithGoogleCalendar}
                  disabled={!googleCalendarStatus?.connected || syncing}
                  className="bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
              
              {syncResult && (
                <div className={`mt-4 p-3 rounded-lg ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {syncResult.success ? (
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Sync complete: {syncResult.pushedToGoogle} events pushed to Google, {syncResult.pulledFromGoogle} events pulled from Google
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{syncResult.error || 'Sync failed'}</span>
                    </div>
                  )}
                </div>
              )}
              
              {!googleCalendarStatus?.connected && (
                <p className="mt-3 text-sm text-gray-500">
                  Google Calendar is not connected. The admin needs to configure the Google Calendar integration in the Replit dashboard.
                </p>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-slate-800">
                  Calendar Events
                </h2>
                <button
                  onClick={() => setShowEventForm(!showEventForm)}
                  className="btn-primary text-sm py-2 px-4 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showEventForm ? "Cancel" : "Add Event"}</span>
                </button>
              </div>

            {showEventForm && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">Create New Event</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Event title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Event description (optional)"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="datetime-local"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="datetime-local"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select
                      value={newEvent.eventType}
                      onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="meeting">Meeting</option>
                      <option value="board_meeting">Board Meeting</option>
                      <option value="deadline">Deadline</option>
                      <option value="event">Event</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Location (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allDay"
                      checked={newEvent.allDay}
                      onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="allDay" className="text-sm text-gray-700">All day event</label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end items-center space-x-3">
                  {(!newEvent.title || !newEvent.startDate) && (
                    <span className="text-sm text-amber-600">Please fill in title and start date</span>
                  )}
                  <button
                    onClick={createCalendarEvent}
                    disabled={creatingEvent || !newEvent.title || !newEvent.startDate}
                    className="bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingEvent ? "Creating..." : "Create Event"}
                  </button>
                </div>
              </div>
            )}

            {calendarEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No calendar events yet. Click "Add Event" to create one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Event</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date & Time</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarEvents.map((event) => (
                      <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">{event.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {event.allDay 
                                ? new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : formatDateTime(event.startDate)
                              }
                            </span>
                          </div>
                          {event.endDate && (
                            <div className="text-xs text-gray-400 mt-1">
                              to {event.allDay 
                                ? new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : formatDateTime(event.endDate)
                              }
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded ${getEventTypeColor(event.eventType)}`}>
                            {formatEventType(event.eventType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {event.location ? (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => deleteCalendarEvent(event.id)}
                            disabled={deletingEventId === event.id}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className={`w-5 h-5 ${deletingEventId === event.id ? "animate-pulse" : ""}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <OperationsPanel />
        )}

        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-slate-800">
                    Edit User Role
                  </h2>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setNewRole("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium text-slate-800">{editingUser.firstName} {editingUser.lastName}</p>
                  <p className="text-sm text-gray-500">{editingUser.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="applicant">Applicant</option>
                    <option value="admin">Admin</option>
                    <option value="board_member">Board Member</option>
                  </select>
                </div>

                <p className="text-xs text-gray-500">
                  Role changes will be synced to The Indie Quill LLC production database.
                </p>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setNewRole("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateUserRole}
                  disabled={updating || newRole === editingUser.role}
                  className="btn-primary"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-800">
                      Application from {selectedApp.authorName || "Unknown"}
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

                {selectedApp.isMinor && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-amber-600" />
                      COPPA Compliance
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-amber-700 block mb-1">Consent Method</label>
                          <select
                            value={coppaConsentMethod}
                            onChange={(e) => setCoppaConsentMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">Select method...</option>
                            <option value="e-signature">E-Signature</option>
                            <option value="mail-in form">Mail-in Form</option>
                            <option value="verbal">Verbal Confirmation</option>
                            <option value="in-person">In-Person Verification</option>
                            <option value="video-call">Video Call Verification</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-amber-700 block mb-1">Data Retention Until</label>
                          <input
                            type="date"
                            value={coppaRetentionDate}
                            onChange={(e) => setCoppaRetentionDate(e.target.value)}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="consentVerified"
                          checked={coppaConsentVerified}
                          onChange={(e) => setCoppaConsentVerified(e.target.checked)}
                          className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                        />
                        <label htmlFor="consentVerified" className="text-sm text-amber-800">
                          Guardian consent has been verified by staff
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                        <div className="text-xs text-amber-600">
                          {selectedApp.guardianConsentVerified ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Consent verified
                            </span>
                          ) : (
                            <span className="flex items-center text-amber-600">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Consent not yet verified
                            </span>
                          )}
                        </div>
                        <button
                          onClick={updateCoppaCompliance}
                          disabled={updatingCoppa || !hasCoppaChanges()}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingCoppa ? "Saving..." : "Save Compliance Info"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-red-500" />
                    Their Story
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Has a Story to Tell?</p>
                      <p className="text-slate-800 font-medium">
                        {selectedApp.hasStoryToTell ? "Yes" : "Not sure yet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Expression Type(s)</p>
                      <p className="text-slate-800">{formatExpressionTypes(selectedApp.expressionTypes)}</p>
                    </div>
                    {selectedApp.expressionOther && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Other Expression Details</p>
                        <p className="text-slate-800">{selectedApp.expressionOther}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Personal Struggles & Background</p>
                    <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{selectedApp.personalStruggles}</p>
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

                    <div className="mt-4">
                      <label className="label">Assign to Cohort (optional)</label>
                      <select
                        className="input-field"
                        value={selectedCohortId || ""}
                        onChange={(e) => setSelectedCohortId(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">Auto-assign to first available</option>
                        {availableCohorts.map((cohort) => (
                          <option key={cohort.id} value={cohort.id}>
                            {cohort.label} ({cohort.currentCount}/{cohort.capacity} slots filled)
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        If no cohort is selected, the system will assign to the first open cohort with available space.
                      </p>
                    </div>

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
