import { useState, useEffect } from "react";
import { BarChart3, Shield, Users, FileCheck, TrendingUp, Clock, AlertTriangle } from "lucide-react";

interface AuditorMetrics {
  totalApplications: number;
  totalApproved: number;
  identityModeDistribution: {
    safe: number;
    public: number;
  };
  statusDistribution: {
    pending: number;
    under_review: number;
    accepted: number;
    rejected: number;
    migrated: number;
    rescinded: number;
  };
  cohortHealth: {
    activeCohortLabel: string | null;
    activeCohortSize: number;
    totalCohorts: number;
    signedInActiveCohort: number;
  };
  lastUpdated: string;
}

export default function AuditorContent() {
  const [metrics, setMetrics] = useState<AuditorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auditor/metrics", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch metrics");
        return res.json();
      })
      .then(setMetrics)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  const conversionRate = metrics && metrics.totalApplications > 0
    ? Math.round((metrics.totalApproved / metrics.totalApplications) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-slate-800">Analytics Command Center</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Zero-PII oversight dashboard for NPO health monitoring
          </p>
        </div>
        {metrics?.lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <FileCheck className="w-4 h-4" />
            Total Applications
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics?.totalApplications || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4 text-green-500" />
            Approved
          </div>
          <p className="text-2xl font-bold text-green-600">{metrics?.totalApproved || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Conversion Rate
          </div>
          <p className="text-2xl font-bold text-blue-600">{conversionRate}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Shield className="w-4 h-4 text-purple-500" />
            Active Cohort
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {metrics?.cohortHealth?.signedInActiveCohort || 0}/10
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {metrics?.cohortHealth?.activeCohortLabel || "No active cohort"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Conversion Funnel
          </h3>
          <div className="space-y-4">
            {Object.entries(metrics?.statusDistribution || {}).map(([status, count]) => {
              const total = metrics?.totalApplications || 1;
              const percentage = Math.round((count / total) * 100);
              const statusLabels: Record<string, string> = {
                pending: "Pending",
                under_review: "Under Review",
                accepted: "Accepted",
                rejected: "Rejected",
                migrated: "Migrated",
                rescinded: "Rescinded",
              };
              const statusColors: Record<string, string> = {
                pending: "bg-amber-500",
                under_review: "bg-blue-500",
                accepted: "bg-green-500",
                rejected: "bg-red-500",
                migrated: "bg-teal-500",
                rescinded: "bg-gray-500",
              };

              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">{statusLabels[status] || status}</span>
                    <span className="text-sm font-medium text-slate-800">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${statusColors[status] || "bg-gray-500"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Identity Mode Distribution
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-3xl font-bold text-green-600">
                {metrics?.identityModeDistribution?.safe || 0}
              </p>
              <p className="text-sm text-green-700 mt-1">Safe Mode</p>
              <p className="text-xs text-green-600">Pseudonym Only</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-3xl font-bold text-blue-600">
                {metrics?.identityModeDistribution?.public || 0}
              </p>
              <p className="text-sm text-blue-700 mt-1">Public Mode</p>
              <p className="text-xs text-blue-600">Legal Name Visible</p>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Cohort Health</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Cohorts</span>
                <span className="font-medium text-slate-800">
                  {metrics?.cohortHealth?.totalCohorts || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Active Cohort Size</span>
                <span className="font-medium text-slate-800">
                  {metrics?.cohortHealth?.activeCohortSize || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Signed Contracts</span>
                <span className="font-medium text-green-600">
                  {metrics?.cohortHealth?.signedInActiveCohort || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-teal-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-teal-900">Zero-PII Architecture</h4>
            <p className="text-sm text-teal-800 mt-1">
              This dashboard displays aggregate metrics only — no individual identifiers. All auditor access is logged for COPPA compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
