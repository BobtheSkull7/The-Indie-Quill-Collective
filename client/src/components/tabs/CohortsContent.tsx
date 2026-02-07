import { useState, useEffect } from "react";
import { 
  Users, ChevronDown, ChevronUp, AlertTriangle, 
  UserPlus, CheckCircle, Clock, Plus
} from "lucide-react";

interface CohortMember {
  id: number;
  applicationId: number;
  displayName: string;
  avatar: string;
  isMinor: boolean;
  status: string;
  joinedAt: string;
}

interface Cohort {
  id: number;
  label: string;
  capacity: number;
  currentCount: number;
  status: "open" | "closed";
  members: CohortMember[];
  createdAt: string;
}

export default function CohortsContent() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCohorts, setExpandedCohorts] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCohortLabel, setNewCohortLabel] = useState("");
  const [newCohortCapacity, setNewCohortCapacity] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCohorts();
  }, []);

  const fetchCohorts = async () => {
    try {
      const response = await fetch("/api/admin/cohorts", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const cohortsArray = Array.isArray(data) ? data : [];
        setCohorts(cohortsArray);
        if (cohortsArray.length > 0) {
          setExpandedCohorts(new Set([cohortsArray[0].id]));
        }
      }
    } catch (error) {
      console.error("Failed to fetch cohorts:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCohort = (cohortId: number) => {
    setExpandedCohorts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cohortId)) {
        newSet.delete(cohortId);
      } else {
        newSet.add(cohortId);
      }
      return newSet;
    });
  };

  const handleCreateCohort = async () => {
    if (!newCohortLabel.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          label: newCohortLabel.trim(),
          capacity: newCohortCapacity,
        }),
      });
      if (response.ok) {
        setShowCreateModal(false);
        setNewCohortLabel("");
        setNewCohortCapacity(10);
        fetchCohorts();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to create cohort");
      }
    } catch (error) {
      console.error("Failed to create cohort:", error);
      alert("Failed to create cohort");
    } finally {
      setCreating(false);
    }
  };

  const toggleCohortStatus = async (cohort: Cohort) => {
    try {
      const response = await fetch(`/api/admin/cohorts/${cohort.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: cohort.status === "open" ? "closed" : "open",
        }),
      });
      if (response.ok) {
        fetchCohorts();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update cohort status");
      }
    } catch (error) {
      console.error("Failed to update cohort status:", error);
    }
  };

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 80) return "bg-amber-500";
    if (percentage >= 50) return "bg-teal-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-collective-teal"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-6 h-6 text-collective-teal" />
            <h2 className="text-xl font-semibold text-slate-800">Author Cohorts</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Manage author groups with 10 writers per cohort.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Cohort
        </button>
      </div>

      {cohorts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Cohorts Yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first cohort to start enrolling authors.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Cohort
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cohorts.map((cohort) => {
            const isExpanded = expandedCohorts.has(cohort.id);
            const percentage = getCapacityPercentage(cohort.currentCount, cohort.capacity);
            const showMarketingAlert = percentage >= 80;

            return (
              <div
                key={cohort.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4 flex items-center justify-between">
                  <button
                    onClick={() => toggleCohort(cohort.id)}
                    className="flex items-center space-x-4 flex-1 text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-slate-800 tracking-wide">
                        {cohort.label}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          cohort.status === "open"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {cohort.status === "open" ? "Active" : "Closed"}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleCohortStatus(cohort)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        cohort.status === "open"
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {cohort.status === "open" ? "Close" : "Reopen"}
                    </button>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${getCapacityColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 min-w-[60px]">
                        {cohort.currentCount}/{cohort.capacity}
                      </span>
                    </div>
                    <button onClick={() => toggleCohort(cohort.id)}>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {showMarketingAlert && (
                  <div className="mx-6 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-800">
                      <strong>Capacity reaching limit.</strong> Consider creating a new cohort.
                    </span>
                  </div>
                )}

                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.from({ length: cohort.capacity }).map((_, index) => {
                          const member = cohort.members[index];
                          const slotNumber = index + 1;

                          if (member) {
                            return (
                              <div
                                key={member.id}
                                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                              >
                                <div className="w-8 h-8 flex items-center justify-center text-xl">
                                  {member.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">
                                    {member.displayName}
                                  </p>
                                  <div className="flex items-center space-x-1">
                                    {member.isMinor && (
                                      <span className="text-xs text-blue-600">Youth Author</span>
                                    )}
                                    {member.status === "migrated" && (
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-gray-400">#{slotNumber}</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`empty-${index}`}
                              className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-dashed border-gray-200"
                            >
                              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">
                                <UserPlus className="w-4 h-4 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-400 italic">
                                  Available Slot
                                </p>
                              </div>
                              <span className="text-xs text-gray-300">#{slotNumber}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New Cohort</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cohort Label
                </label>
                <input
                  type="text"
                  value={newCohortLabel}
                  onChange={(e) => setNewCohortLabel(e.target.value)}
                  placeholder="e.g., DGLF Cohort 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={newCohortCapacity}
                  onChange={(e) => setNewCohortCapacity(parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCohort}
                disabled={creating || !newCohortLabel.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Cohort"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
