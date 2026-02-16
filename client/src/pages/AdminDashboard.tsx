import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  Users, FileText, CheckCircle, Clock, TrendingUp, 
  Eye, Check, X, RefreshCw, AlertTriangle, Zap, Calendar, Mail, User, BookOpen, Shield,
  Plus, Trash2, MapPin, BarChart3, Download, Activity, ChevronLeft, ChevronRight, UserPlus
} from "lucide-react";
import OperationsPanel from "../components/OperationsPanel";
import WikiContent from "../components/tabs/WikiContent";

interface Application {
  id: number;
  userId: number;
  pseudonym: string | null;
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
  contractId?: number | null;
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

interface EmailLog {
  id: number;
  emailType: string;
  recipientEmail: string;
  recipientName: string | null;
  userId: number | null;
  applicationId: number | null;
  status: string;
  errorMessage: string | null;
  sentAt: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"applicants" | "calendar" | "operations" | "wiki">("applicants");
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
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
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
  const [sendingTestEmails, setSendingTestEmails] = useState(false);
  const [availableCohorts, setAvailableCohorts] = useState<Array<{ id: number; label: string; currentCount: number; capacity: number }>>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [inlineActionId, setInlineActionId] = useState<number | null>(null);
  const [assignCohortApp, setAssignCohortApp] = useState<any>(null);
  const [assignCohortId, setAssignCohortId] = useState<number | null>(null);
  const [assigningCohort, setAssigningCohort] = useState(false);

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
      const [appsRes, statsRes, syncRes, usersRes, calendarRes, gcalStatusRes, emailLogsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/sync-status"),
        fetch("/api/admin/users"),
        fetch("/api/board/calendar"),
        fetch("/api/board/calendar/sync-status"),
        fetch("/api/admin/email-logs"),
      ]);

      const apps = appsRes.ok ? await appsRes.json() : [];
      const statsData = statsRes.ok ? await statsRes.json() : null;
      const syncData = syncRes.ok ? await syncRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const calendarData = calendarRes.ok ? await calendarRes.json() : [];
      const gcalStatus = gcalStatusRes.ok ? await gcalStatusRes.json() : { connected: false };
      const emailLogsData = emailLogsRes.ok ? await emailLogsRes.json() : [];

      setApplications(Array.isArray(apps) ? apps : []);
      setStats(statsData);
      setSyncRecords(Array.isArray(syncData) ? syncData : []);
      setAllUsers(Array.isArray(usersData) ? usersData : []);
      setGoogleCalendarStatus(gcalStatus);
      setEmailLogs(Array.isArray(emailLogsData) ? emailLogsData : []);
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
      // Fetch ALL cohorts so admins can override and assign to any cohort
      const res = await fetch("/api/admin/cohorts", { credentials: "include" });
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

  const quickUpdateStatus = async (appId: number, status: "accepted" | "rejected") => {
    setInlineActionId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Quick update failed:", error);
    } finally {
      setInlineActionId(null);
    }
  };

  const handleAssignCohort = async () => {
    if (!assignCohortApp || !assignCohortId) return;
    setAssigningCohort(true);
    try {
      const res = await fetch(`/api/admin/applications/${assignCohortApp.id}/assign-cohort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cohortId: assignCohortId }),
      });
      if (res.ok) {
        setAssignCohortApp(null);
        setAssignCohortId(null);
        await loadData();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to assign cohort");
      }
    } catch (error) {
      console.error("Failed to assign cohort:", error);
      alert("Failed to assign cohort");
    } finally {
      setAssigningCohort(false);
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

  const resetSync = async (id: number) => {
    setRetrying(id);
    try {
      const res = await fetch(`/api/admin/reset-sync/${id}`, { method: "POST" });
      if (res.ok) {
        await loadData();
      } else {
        console.error("Reset failed");
      }
    } catch (error) {
      console.error("Reset failed:", error);
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
        setActiveTab("applicants");
        setStatusFilter("sync_pending");
        break;
      case "synced":
        setActiveTab("applicants");
        setStatusFilter("sync_synced");
        break;
      case "failed":
        setActiveTab("applicants");
        setStatusFilter("sync_failed");
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

  const deleteUser = async (userId: number) => {
    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAllUsers((prev) => prev.filter((u) => u.id !== userId));
        setShowDeleteConfirm(null);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Delete user failed:", error);
      alert("Failed to delete user");
    } finally {
      setDeletingUserId(null);
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

  const connectGoogleCalendar = () => {
    window.location.href = "/api/admin/google/auth";
  };

  const disconnectGoogleCalendar = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar?")) return;
    try {
      const res = await fetch("/api/admin/google/disconnect", { method: "POST" });
      if (res.ok) {
        setGoogleCalendarStatus({ connected: false });
        setSyncResult(null);
      }
    } catch (error) {
      console.error("Failed to disconnect Google Calendar:", error);
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "applicants"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Applicants</span>
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
            onClick={() => setActiveTab("wiki")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "wiki"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Wiki</span>
          </button>
        </div>

        {activeTab === "applicants" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-slate-800">
                Applicants & Users
                <span className="text-sm font-normal text-gray-500 ml-2">({allUsers.length} total)</span>
              </h2>
              <div className="flex items-center space-x-2">
                {statusFilter && (
                  <button
                    onClick={() => setStatusFilter(null)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear filter: {
                      statusFilter === "pending_review" ? "Pending Review" :
                      statusFilter === "sync_pending" ? "Pending Sync" :
                      statusFilter === "sync_synced" ? "Synced" :
                      statusFilter === "sync_failed" ? "Failed Sync" :
                      statusFilter
                    } &times;
                  </button>
                )}
                {stats && stats.failedSync > 0 && (
                  <button
                    onClick={retryAllFailed}
                    disabled={retrying === -1}
                    className="btn-primary text-sm py-2 px-3 flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${retrying === -1 ? "animate-spin" : ""}`} />
                    <span>{retrying === -1 ? "Retrying..." : "Retry Failed Syncs"}</span>
                  </button>
                )}
              </div>
            </div>

            {retryAllResult && (
              <div className={`p-3 rounded-lg mb-4 ${retryAllResult.error || retryAllResult.succeeded === 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                <p className="text-sm font-medium text-slate-800">
                  {retryAllResult.error 
                    ? `Retry Failed: ${retryAllResult.error}` 
                    : `Retry Complete: ${retryAllResult.retried} attempted, ${retryAllResult.succeeded} succeeded`
                  }
                </p>
              </div>
            )}
            
            {allUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users yet.</p>
            ) : (
              <div className="space-y-3">
                {allUsers
                  .filter(u => {
                    if (!statusFilter) return true;
                    const app = applications.find(a => a.userId === u.id);
                    const syncRecord = syncRecords.find(s => s.userId === u.id);
                    if (statusFilter === "pending_review") {
                      return app && (app.status === "pending" || app.status === "under_review");
                    }
                    if (statusFilter === "sync_pending") {
                      return syncRecord?.syncStatus === "pending" || (app?.status === "migrated" && !syncRecord);
                    }
                    if (statusFilter === "sync_synced") {
                      return syncRecord?.syncStatus === "synced";
                    }
                    if (statusFilter === "sync_failed") {
                      return syncRecord?.syncStatus === "failed";
                    }
                    return app?.status === statusFilter;
                  })
                  .map((u) => {
                    const app = applications.find(a => a.userId === u.id);
                    const syncRecord = syncRecords.find(s => s.userId === u.id);
                    return (
                      <div key={u.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-2">
                          <div className="min-w-[180px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Real Name</p>
                            <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                          </div>
                          <div className="min-w-[140px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Pseudonym</p>
                            <p className="text-slate-700">{app?.pseudonym || <span className="text-gray-400 italic">Not set</span>}</p>
                          </div>
                          <div className="min-w-[200px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                            <p className="text-slate-700 text-sm">{u.email}</p>
                          </div>
                          <div className="min-w-[100px]">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
                            <span className={`text-xs px-2 py-1 rounded capitalize ${getRoleColor(u.role)}`}>
                              {u.role.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-y-2 pt-2 border-t border-slate-200">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div>
                              <span className="text-xs text-gray-500 mr-1">Age:</span>
                              {app ? (
                                app.isMinor ? (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Minor</span>
                                ) : (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Adult</span>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 mr-1">Status:</span>
                              {app ? (
                                <span className={`text-xs px-2 py-0.5 rounded capitalize ${getStatusColor(app.status)}`}>
                                  {app.status.replace("_", " ")}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">No application</span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 mr-1">LLC:</span>
                              {syncRecord ? (
                                <>
                                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${getSyncStatusColor(syncRecord.syncStatus)}`}>
                                    {syncRecord.syncStatus}
                                  </span>
                                  {syncRecord.syncError && (
                                    <span className="text-xs text-red-500 ml-1" title={syncRecord.syncError}>⚠</span>
                                  )}
                                </>
                              ) : app?.status === "migrated" ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">pending</span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              Joined {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {app && (
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setViewOnlyMode(true);
                                  if (app.isMinor) {
                                    initCoppaState(app);
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 transition-colors p-1.5 rounded hover:bg-blue-50"
                                title="View Application"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                // Default to persona type from application if user is applicant
                                const suggestedRole = (u.role === "applicant" && app?.personaType) 
                                  ? app.personaType 
                                  : u.role;
                                setNewRole(suggestedRole);
                              }}
                              className="text-gray-600 hover:text-gray-800 transition-colors p-1.5 rounded hover:bg-gray-100"
                              title="Edit User"
                            >
                              <User className="w-4 h-4" />
                            </button>
                            {app && (app.status === "pending" || app.status === "under_review") && (
                              <>
                                <button
                                  onClick={() => quickUpdateStatus(app.id, "accepted")}
                                  disabled={inlineActionId === app.id}
                                  className="text-green-600 hover:text-green-800 transition-colors p-1.5 rounded hover:bg-green-50 disabled:opacity-50"
                                  title="Approve"
                                >
                                  <Check className={`w-4 h-4 ${inlineActionId === app.id ? "animate-pulse" : ""}`} />
                                </button>
                                <button
                                  onClick={() => quickUpdateStatus(app.id, "rejected")}
                                  disabled={inlineActionId === app.id}
                                  className="text-red-600 hover:text-red-800 transition-colors p-1.5 rounded hover:bg-red-50 disabled:opacity-50"
                                  title="Reject"
                                >
                                  <X className={`w-4 h-4 ${inlineActionId === app.id ? "animate-pulse" : ""}`} />
                                </button>
                              </>
                            )}
                            {app && app.contractId && (
                              <button
                                onClick={() => setLocation(`/contracts/${app.contractId}`)}
                                className="text-purple-600 hover:text-purple-800 transition-colors p-1.5 rounded hover:bg-purple-50"
                                title="View Contract"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            {app && !app.cohortId && (
                              <button
                                onClick={() => {
                                  setAssignCohortApp(app);
                                  setAssignCohortId(null);
                                  fetchAvailableCohorts();
                                }}
                                className="text-teal-600 hover:text-teal-800 transition-colors p-1.5 rounded hover:bg-teal-50"
                                title="Assign to Cohort"
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                            )}
                            {syncRecord?.syncStatus === "failed" && (
                              <button
                                onClick={() => retrySync(syncRecord.id)}
                                disabled={retrying === syncRecord.id}
                                className="text-red-600 hover:text-red-800 transition-colors p-1.5 rounded hover:bg-red-50"
                                title="Retry Sync"
                              >
                                <RefreshCw className={`w-4 h-4 ${retrying === syncRecord.id ? "animate-spin" : ""}`} />
                              </button>
                            )}
                            {u.id !== user?.id && (
                              <>
                                {showDeleteConfirm === u.id ? (
                                  <div className="flex items-center space-x-1 bg-red-50 rounded px-2 py-1">
                                    <span className="text-xs text-red-700">Delete?</span>
                                    <button
                                      onClick={() => deleteUser(u.id)}
                                      disabled={deletingUserId === u.id}
                                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                                    >
                                      {deletingUserId === u.id ? "..." : "Yes"}
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteConfirm(null)}
                                      className="text-gray-600 hover:text-gray-800 text-xs"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShowDeleteConfirm(u.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                
                <div className="flex items-center space-x-2">
                  {googleCalendarStatus?.connected ? (
                    <>
                      <button
                        onClick={syncWithGoogleCalendar}
                        disabled={syncing}
                        className="bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                      <button
                        onClick={disconnectGoogleCalendar}
                        className="bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={connectGoogleCalendar}
                      className="bg-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center space-x-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Connect Indie Quill Collective Calendar</span>
                    </button>
                  )}
                </div>
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
                  Click the button above to connect your Google Calendar. This creates a permanent link using your own credentials.
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
                    {(calendarEvents || []).map((event) => (
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
          <div className="space-y-8">
            <OperationsPanel />
            
            {/* Email Logs Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-teal-600" />
                  Email Logs
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    All emails CC'd to jon@theindiequill.com
                  </span>
                  <button
                    onClick={async () => {
                      setSendingTestEmails(true);
                      try {
                        const res = await fetch('/api/admin/send-test-emails', { 
                          method: 'POST',
                          credentials: 'include'
                        });
                        if (res.ok) {
                          alert('Test emails sent! Check your inbox.');
                          loadData();
                        } else {
                          alert('Failed to send test emails');
                        }
                      } catch (e) {
                        alert('Error sending test emails');
                      } finally {
                        setSendingTestEmails(false);
                      }
                    }}
                    disabled={sendingTestEmails}
                    className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingTestEmails ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {sendingTestEmails ? 'Sending...' : 'Send Test Emails'}
                  </button>
                </div>
              </div>
              
              {emailLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No emails sent yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Sent</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Recipient</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-600">
                            {new Date(log.sentAt).toLocaleDateString()} {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              log.emailType === 'application_received' ? 'bg-blue-100 text-blue-800' :
                              log.emailType === 'application_accepted' ? 'bg-green-100 text-green-800' :
                              log.emailType === 'application_rejected' ? 'bg-red-100 text-red-800' :
                              log.emailType === 'active_author' ? 'bg-teal-100 text-teal-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.emailType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div>
                              <span className="text-gray-800">{log.recipientEmail}</span>
                              {log.recipientName && (
                                <span className="text-gray-500 text-xs ml-1">({log.recipientName})</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {log.status === 'sent' ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600" title={log.errorMessage || undefined}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Failed
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
        )}

        {assignCohortApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-slate-800">
                    Assign to Cohort
                  </h2>
                  <button
                    onClick={() => {
                      setAssignCohortApp(null);
                      setAssignCohortId(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Author</p>
                  <p className="font-medium text-slate-800">{assignCohortApp.pseudonym || `Application #${assignCohortApp.id}`}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Cohort
                  </label>
                  <select
                    value={assignCohortId || ""}
                    onChange={(e) => setAssignCohortId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Choose a cohort...</option>
                    {availableCohorts.map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.label} ({cohort.currentCount}/{cohort.capacity} slots){(cohort as any).status === "closed" ? " - CLOSED" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setAssignCohortApp(null);
                    setAssignCohortId(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCohort}
                  disabled={assigningCohort || !assignCohortId}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {assigningCohort ? "Assigning..." : "Assign to Cohort"}
                </button>
              </div>
            </div>
          </div>
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
                    <option value="writer">Writer</option>
                    <option value="student">Student</option>
                    <option value="mentor">Mentor</option>
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

        {activeTab === "wiki" && (
          <div className="card">
            <WikiContent />
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
                    onClick={() => { setSelectedApp(null); setViewOnlyMode(false); }}
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
                      <p className="text-sm text-gray-500">Pseudonym</p>
                      <p className="text-slate-800">{selectedApp.pseudonym || "Not provided"}</p>
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

                {!viewOnlyMode && (selectedApp.status === "pending" || selectedApp.status === "under_review") && (
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
                            {cohort.label} ({cohort.currentCount}/{cohort.capacity} slots){cohort.status === "closed" ? " - CLOSED" : ""}
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
