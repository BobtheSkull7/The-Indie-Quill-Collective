import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
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
  contractForensics: Array<{
    id: number;
    pseudonym: string;
    signedAt: string | null;
    hasIpVerification: boolean;
  }>;
  cohortHealth: {
    activeCohortLabel: string | null;
    activeCohortSize: number;
    totalCohorts: number;
    signedInActiveCohort: number;
  };
  lastUpdated: string;
}

export default function Auditor() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [metrics, setMetrics] = useState<AuditorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (user.role !== "auditor" && user.role !== "admin") {
      setLocation("/dashboard");
      return;
    }

    fetch("/api/auditor/metrics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch metrics");
        return res.json();
      })
      .then(setMetrics)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  if (!user || (user.role !== "auditor" && user.role !== "admin")) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <BarChart3 className="w-8 h-8 text-teal-600" />
            <h1 className="font-display text-3xl font-bold text-slate-800">
              Analytics Command Center
            </h1>
          </div>
          <p className="text-gray-600">
            Zero-PII oversight dashboard for NPO health monitoring
          </p>
        </div>

        {metrics && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">{metrics.totalApplications}</p>
                    <p className="text-sm text-gray-500">Total Applications</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">{metrics.totalApproved}</p>
                    <p className="text-sm text-gray-500">Total Approved</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Accepted + Migrated Authors</p>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800">
                      {metrics.cohortHealth.signedInActiveCohort}/10
                    </p>
                    <p className="text-sm text-gray-500">Active Cohort Progress</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {metrics.cohortHealth.activeCohortLabel || "No active cohort"}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <h2 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span>Identity Mode Distribution</span>
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Safe Mode (Protected)</span>
                      <span className="font-medium text-green-600">{metrics.identityModeDistribution.safe}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full" 
                        style={{ 
                          width: `${(metrics.identityModeDistribution.safe / (metrics.identityModeDistribution.safe + metrics.identityModeDistribution.public || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Public Mode</span>
                      <span className="font-medium text-blue-600">{metrics.identityModeDistribution.public}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full" 
                        style={{ 
                          width: `${(metrics.identityModeDistribution.public / (metrics.identityModeDistribution.safe + metrics.identityModeDistribution.public || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  COPPA Compliance: {Math.round((metrics.identityModeDistribution.safe / (metrics.identityModeDistribution.safe + metrics.identityModeDistribution.public || 1)) * 100)}% in Safe Mode
                </p>
              </div>

              <div className="card">
                <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">
                  Conversion Funnel
                </h2>
                <div className="space-y-3">
                  {[
                    { label: "Pending", value: metrics.statusDistribution.pending, color: "bg-yellow-500" },
                    { label: "Under Review", value: metrics.statusDistribution.under_review, color: "bg-blue-500" },
                    { label: "Accepted", value: metrics.statusDistribution.accepted, color: "bg-green-500" },
                    { label: "Migrated", value: metrics.statusDistribution.migrated, color: "bg-purple-500" },
                    { label: "Rejected", value: metrics.statusDistribution.rejected, color: "bg-red-400" },
                    { label: "Rescinded", value: metrics.statusDistribution.rescinded, color: "bg-gray-400" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                      <span className="font-medium text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span>Forensic Health (Recent Signatures)</span>
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Showing pseudonyms only - Zero-PII compliant view
              </p>
              
              {metrics.contractForensics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No signed contracts yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-600 font-medium">Pseudonym</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-medium">Signed At</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-medium">IP Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.contractForensics.map((contract) => (
                        <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{contract.pseudonym}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {contract.signedAt ? new Date(contract.signedAt).toLocaleString() : "—"}
                          </td>
                          <td className="py-3 px-4">
                            {contract.hasIpVerification ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Pending
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

            <p className="text-center text-xs text-gray-400 mt-6">
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
