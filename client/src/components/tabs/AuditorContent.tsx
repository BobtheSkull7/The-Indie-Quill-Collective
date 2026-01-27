import { useState, useEffect } from "react";
import { BarChart3, Shield, Users, FileCheck, TrendingUp, Clock, AlertTriangle, FileText, Download, X } from "lucide-react";

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

interface DGLFImpactReport {
  reportTitle: string;
  generatedAt: string;
  cohortInfo: {
    label: string;
    studentCount: number;
  };
  tabeAssessments: {
    studentsWithTabe: number;
    baselineTestsCompleted: number;
    postTestsCompleted: number;
    studentsShowingEflGain: number;
  };
  pactTime: {
    familiesParticipating: number;
    totalPactHours: number;
    totalSessions: number;
    avgSessionMinutes: number;
    familyProgress: Array<{
      id: number;
      family_name: string;
      total_pact_minutes: number;
      target_pact_hours: number;
      pact_completion_percent: number;
    }>;
  };
  curriculumProgress: {
    studentsActive: number;
    totalInstructionHours: number;
    avgModuleCompletion: number;
  };
}

export default function AuditorContent() {
  const [metrics, setMetrics] = useState<AuditorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<DGLFImpactReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

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

  const generateImpactReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch("/api/auditor/dglf-impact-report", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setReport(data);
      setShowReport(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

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
        <div className="flex items-center gap-4">
          <button
            onClick={generateImpactReport}
            disabled={reportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {reportLoading ? "Generating..." : "Generate DGLF Impact Report"}
          </button>
          {metrics?.lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {showReport && report && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{report.reportTitle}</h3>
              <button onClick={() => setShowReport(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-sm text-gray-500">
                Generated: {new Date(report.generatedAt).toLocaleString()}
              </div>

              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                <h4 className="font-semibold text-teal-900 mb-2">Cohort Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Cohort:</span>
                    <p className="font-medium text-slate-800">{report.cohortInfo.label}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Students:</span>
                    <p className="font-medium text-slate-800">{report.cohortInfo.studentCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">TABE Assessment Results (EFL Gains)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.tabeAssessments.studentsWithTabe}</p>
                    <p className="text-xs text-gray-600">Students Tested</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.tabeAssessments.baselineTestsCompleted}</p>
                    <p className="text-xs text-gray-600">Baseline Tests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.tabeAssessments.postTestsCompleted}</p>
                    <p className="text-xs text-gray-600">Post Tests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{report.tabeAssessments.studentsShowingEflGain}</p>
                    <p className="text-xs text-gray-600">Showing EFL Gain</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3">PACT Time (Parent and Child Together)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{report.pactTime.familiesParticipating}</p>
                    <p className="text-xs text-gray-600">Families Participating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{report.pactTime.totalPactHours}</p>
                    <p className="text-xs text-gray-600">Total PACT Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{report.pactTime.totalSessions}</p>
                    <p className="text-xs text-gray-600">Total Sessions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{report.pactTime.avgSessionMinutes}</p>
                    <p className="text-xs text-gray-600">Avg Session (min)</p>
                  </div>
                </div>
                {report.pactTime.familyProgress.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Family Progress</h5>
                    <div className="space-y-2">
                      {report.pactTime.familyProgress.map((family) => (
                        <div key={family.id} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-32 truncate">{family.family_name}</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500" 
                              style={{ width: `${Math.min(family.pact_completion_percent || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-16 text-right">
                            {family.pact_completion_percent || 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-3">Curriculum Progress (120-Hour Course)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{report.curriculumProgress.studentsActive}</p>
                    <p className="text-xs text-gray-600">Active Students</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{report.curriculumProgress.totalInstructionHours}</p>
                    <p className="text-xs text-gray-600">Total Instruction Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{report.curriculumProgress.avgModuleCompletion}%</p>
                    <p className="text-xs text-gray-600">Avg Module Completion</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  <Download className="w-4 h-4" />
                  Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
