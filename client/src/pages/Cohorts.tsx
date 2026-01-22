import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  Users, ChevronDown, ChevronUp, AlertTriangle, 
  UserPlus, CheckCircle, Clock
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

export default function Cohorts() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCohorts, setExpandedCohorts] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
      return;
    }
    fetchCohorts();
  }, [user, setLocation]);

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

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 80) return "bg-amber-500";
    if (percentage >= 50) return "bg-collective-teal";
    return "bg-green-500";
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-collective-teal"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-8 h-8 text-collective-teal" />
            <h1 className="font-display text-3xl font-bold text-slate-800">
              Author Cohorts
            </h1>
          </div>
          <p className="text-gray-600">
            Manage author groups with 10 writers per cohort. Visual inventory of your publishing pipeline.
          </p>
        </div>

        {cohorts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Cohorts Yet</h3>
            <p className="text-gray-500">
              Cohorts will be created automatically when authors are approved.
            </p>
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
                  <button
                    onClick={() => toggleCohort(cohort.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
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
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${getCapacityColor(percentage)}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600 min-w-[60px]">
                          {cohort.currentCount}/{cohort.capacity} Slots
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {showMarketingAlert && (
                    <div className="mx-6 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span className="text-sm text-amber-800">
                        <strong>Capacity reaching limit.</strong> Prepare marketing for next Cohort.
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
                                    Available Slot - Recruiting Now
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
      </div>
    </div>
  );
}
