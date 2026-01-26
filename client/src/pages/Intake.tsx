import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import {
  Users,
  Eye,
  Edit,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Mail,
  User,
  Shield,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  UserCheck,
  GraduationCap,
  Loader2,
} from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  pseudonym?: string;
  role: string;
  status?: string;
  dateOfBirth?: string;
  isMinor?: boolean;
  syncStatus?: string;
  indieQuillAuthorId?: string | null;
  shortId?: string | null;
  createdAt: string;
  cohortId?: number | null;
  grantId?: number | null;
  grantLabel?: string | null;
}

interface Cohort {
  id: number;
  label: string;
  currentCount: number;
  capacity: number;
  grantId?: number | null;
  grantType?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "student", label: "Student" },
  { value: "mentor", label: "Mentor" },
];

const ROLE_OPTIONS = [
  { value: "applicant", label: "Applicant" },
  { value: "student", label: "Student" },
  { value: "mentor", label: "Mentor" },
  { value: "admin", label: "Admin" },
  { value: "board", label: "Board" },
  { value: "auditor", label: "Auditor" },
];

const getStatusBadge = (status: string | undefined) => {
  const statusMap: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <Clock className="w-3 h-3" /> },
    under_review: { bg: "bg-blue-100", text: "text-blue-700", icon: <Eye className="w-3 h-3" /> },
    accepted: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { bg: "bg-red-100", text: "text-red-700", icon: <X className="w-3 h-3" /> },
    student: { bg: "bg-purple-100", text: "text-purple-700", icon: <GraduationCap className="w-3 h-3" /> },
    mentor: { bg: "bg-indigo-100", text: "text-indigo-700", icon: <UserCheck className="w-3 h-3" /> },
  };
  const config = statusMap[status || "pending"] || { bg: "bg-gray-100", text: "text-gray-700", icon: <AlertCircle className="w-3 h-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status ? status.replace("_", " ").charAt(0).toUpperCase() + status.slice(1).replace("_", " ") : "Unknown"}
    </span>
  );
};

const getSyncBadge = (syncStatus: string | undefined, authorId: string | null | undefined) => {
  if (authorId) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" />
        Synced
      </span>
    );
  }
  if (syncStatus === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  if (syncStatus === "syncing") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
};

const calculateAge = (dateOfBirth: string | undefined): string => {
  if (!dateOfBirth) return "N/A";
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

export default function Intake() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [approvalResult, setApprovalResult] = useState<{ shortId: string; grantLabel: string; firstName: string } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "board_member") {
      setLocation("/dashboard");
      return;
    }
    loadData();
  }, [user, setLocation]);

  const loadData = async () => {
    setError(null);
    setLoading(true);
    try {
      const [usersRes, cohortsRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/cohorts/available", { credentials: "include" }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } else {
        throw new Error("Failed to fetch users");
      }

      if (cohortsRes.ok) {
        const cohortsData = await cohortsRes.json();
        setCohorts(Array.isArray(cohortsData) ? cohortsData : []);
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError("Failed to load intake data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesStatus =
      statusFilter === "all" ||
      u.status === statusFilter ||
      u.role === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.pseudonym && u.pseudonym.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleViewUser = (u: UserRecord) => {
    setSelectedUser(u);
    setShowApprovalModal(true);
    setSelectedCohortId(null);
  };

  const handleEditRole = (u: UserRecord) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setShowRoleModal(true);
    setSelectedCohortId(null);
  };

  const updateUserRole = async () => {
    if (!selectedUser || !newRole) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          role: newRole,
          cohortId: newRole === "student" ? selectedCohortId : null,
        }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u))
        );
        setShowRoleModal(false);
        setSelectedUser(null);
        setNewRole("");
        setSelectedCohortId(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Update role failed:", error);
      alert("Failed to update role");
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = async (u: UserRecord) => {
    if (newRole === "student" && !selectedCohortId) {
      alert("Please select a cohort and grant tag before approving as student");
      return;
    }
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: "student",
          cohortId: selectedCohortId,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowApprovalModal(false);
        setApprovalResult({
          shortId: data.shortId || "N/A",
          grantLabel: data.grantLabel || "General",
          firstName: u.firstName,
        });
        setShowSuccessModal(true);
        setSelectedUser(null);
        setSelectedCohortId(null);
        loadData();
      } else {
        alert(data.message || "Failed to approve user");
      }
    } catch (error) {
      console.error("Approve failed:", error);
      alert("Failed to approve user");
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (u: UserRecord) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: "rejected" }),
      });

      if (res.ok) {
        setShowApprovalModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to reject user");
      }
    } catch (error) {
      console.error("Reject failed:", error);
      alert("Failed to reject user");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-collective-teal animate-spin" />
          <p className="text-gray-600">Loading intake data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-collective-teal" />
                Intake Management
              </h1>
              <p className="mt-2 text-gray-600">
                Review and manage all applicants and candidates
              </p>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or pseudonym..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 text-sm text-gray-600 border-b border-gray-100">
            Showing {filteredUsers.length} of {users.length} candidates
          </div>

          <div className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No candidates found matching your criteria</p>
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {u.firstName} {u.lastName}
                        </h3>
                        {u.pseudonym && (
                          <span className="text-sm text-gray-500 italic">
                            "{u.pseudonym}"
                          </span>
                        )}
                        {getStatusBadge(u.status || u.role)}
                        {getSyncBadge(u.syncStatus, u.indieQuillAuthorId)}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {u.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Shield className="w-4 h-4" />
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Age: {calculateAge(u.dateOfBirth)}
                          {u.isMinor && (
                            <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                              Minor
                            </span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined: {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                        {u.cohortId && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            Cohort #{u.cohortId}
                          </span>
                        )}
                        {u.shortId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md font-mono text-sm">
                            ID: {u.shortId}
                          </span>
                        )}
                        {u.grantLabel && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-sm font-medium">
                            {u.grantLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewUser(u)}
                        className="p-2 text-gray-600 hover:text-collective-teal hover:bg-collective-teal/10 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditRole(u)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit role"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {(u.role === "applicant" || u.status === "pending" || u.status === "under_review") && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRole("student");
                              setShowApprovalModal(true);
                            }}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(u)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Edit Role: {selectedUser.firstName} {selectedUser.lastName}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      setNewRole(e.target.value);
                      if (e.target.value !== "student") {
                        setSelectedCohortId(null);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {newRole === "student" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Assign Grant Tag / Cohort
                    </label>
                    <select
                      value={selectedCohortId || ""}
                      onChange={(e) => setSelectedCohortId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                    >
                      <option value="">Select a cohort...</option>
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} ({c.currentCount}/{c.capacity}){" "}
                          {c.grantType && `- ${c.grantType}`}
                          {c.grantId && ` [Grant #${c.grantId}]`}
                        </option>
                      ))}
                    </select>
                    {newRole === "student" && !selectedCohortId && (
                      <p className="mt-2 text-sm text-amber-600">
                        A cohort with grant tag is required for student enrollment
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setNewRole("");
                    setSelectedCohortId(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={updateUserRole}
                  disabled={updating || (newRole === "student" && !selectedCohortId)}
                  className="px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-collective-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showApprovalModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Approve Candidate
              </h2>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                {selectedUser.pseudonym && (
                  <p className="text-sm text-gray-500 italic mt-1">
                    Pseudonym: "{selectedUser.pseudonym}"
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    Assign to Student Status
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    To move this candidate to Student status, you must assign them to a cohort with a grant tag.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Select Grant Tag / Cohort
                  </label>
                  <select
                    value={selectedCohortId || ""}
                    onChange={(e) => setSelectedCohortId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                  >
                    <option value="">Select a cohort...</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.currentCount}/{c.capacity}){" "}
                        {c.grantType && `- ${c.grantType}`}
                        {c.grantId && ` [Grant #${c.grantId}]`}
                      </option>
                    ))}
                  </select>
                  {!selectedCohortId && (
                    <p className="mt-2 text-sm text-amber-600">
                      A Grant ID and Cohort are required to approve as Student
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <button
                  onClick={() => handleReject(selectedUser)}
                  disabled={updating}
                  className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <X className="w-4 h-4" />
                  Reject
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedUser(null);
                      setSelectedCohortId(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApprove(selectedUser)}
                    disabled={updating || !selectedCohortId}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Check className="w-4 h-4" />
                    Approve as Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSuccessModal && approvalResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Student Approved!
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    <span className="font-medium text-gray-900">{approvalResult.firstName}</span> has been approved for the <span className="font-medium text-teal-700">{approvalResult.grantLabel}</span> program.
                  </p>
                  
                  <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-teal-300">
                    <p className="text-sm text-gray-500 mb-2">VibeScribe Author ID</p>
                    <p className="text-4xl font-mono font-bold text-teal-700 tracking-wider">
                      {approvalResult.shortId}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Share this ID with the author for mobile login
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      setApprovalResult(null);
                    }}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
