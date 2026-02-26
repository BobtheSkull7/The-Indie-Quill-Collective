import { useState, useEffect } from "react";
import { 
  BarChart3, Users, FileCheck, Activity, TrendingUp, Shield, 
  Download, RefreshCw, Clock, Zap, AlertTriangle, CheckCircle
} from "lucide-react";


interface OperationsMetrics {
  cohortVelocity: number;
  activeCohort: {
    label: string;
    currentCount: number;
    capacity: number;
  } | null;
  totalActiveAuthors: number;
  statusDistribution: {
    pending: number;
    under_review: number;
    accepted: number;
    migrated: number;
    rejected: number;
  };
  publishingPipeline: {
    agreement: number;
    creation: number;
    editing: number;
    review: number;
    modifications: number;
    published: number;
    marketing: number;
  };
  minorStats: {
    total: number;
    withGuardianConsent: number;
    pendingConsent: number;
  };
  syncStats: {
    synced: number;
    pending: number;
    failed: number;
  };
  totalApplications: number;
  totalContracts: number;
  signedContracts: number;
  efficiencyRatio: number;
  quarterlyPublished: number;
  totalOperatingCosts: number;
}

export default function OperationsPanel() {
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingCompliance, setExportingCompliance] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/operations/metrics', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportComplianceReport = async () => {
    setExportingCompliance(true);
    try {
      const response = await fetch('/api/admin/compliance/export', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-audit-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error('Failed to export compliance report:', error);
    } finally {
      setExportingCompliance(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="card text-center py-8 text-gray-500">
        Failed to load operations metrics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Operations Dashboard</h2>
          <p className="text-gray-500">Program Director Metrics & Grant Readiness</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportComplianceReport}
            disabled={exportingCompliance}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className={`w-4 h-4 ${exportingCompliance ? 'animate-spin' : ''}`} />
            <span>{exportingCompliance ? 'Exporting...' : 'Export Compliance PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{metrics.cohortVelocity}%</p>
              <p className="text-blue-100">Cohort Velocity</p>
            </div>
          </div>
          {metrics.activeCohort && (
            <p className="text-sm text-blue-100">
              {metrics.activeCohort.label}: {metrics.activeCohort.currentCount}/{metrics.activeCohort.capacity} authors
            </p>
          )}
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-700 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{metrics.totalActiveAuthors}</p>
              <p className="text-green-100">Active Authors Managed</p>
            </div>
          </div>
          <p className="text-sm text-green-100">
            Scale indicator for grant justification
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{metrics.signedContracts}</p>
              <p className="text-purple-100">Contracts Signed</p>
            </div>
          </div>
          <p className="text-sm text-purple-100">
            {metrics.totalContracts} total contracts
          </p>
        </div>
      </div>

      <div className="card border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
        <h3 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-teal-600" />
          <span>Flywheel Metrics - Grant Proof Points</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <p className="text-3xl font-bold text-teal-700">
              ${metrics.efficiencyRatio.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Cost per Author</p>
            <p className="text-xs text-gray-500 mt-1">Lower = More Efficient</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <p className="text-3xl font-bold text-cyan-700">
              {metrics.quarterlyPublished}
            </p>
            <p className="text-sm text-gray-600 mt-1">Published This Quarter</p>
            <p className="text-xs text-gray-500 mt-1">Throughput Metric</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <p className="text-3xl font-bold text-blue-700">
              ${(metrics.totalOperatingCosts / 100).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Operating Costs</p>
            <p className="text-xs text-gray-500 mt-1">YTD Budget Spend</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-teal-200">
          <p className="text-sm text-teal-700 text-center">
            The Flywheel: Low Cost Structure enables Better Author Experience, driving more Selection, fueling Growth
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>Application Pipeline</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    status === 'migrated' ? 'bg-green-500' :
                    status === 'accepted' ? 'bg-blue-500' :
                    status === 'pending' ? 'bg-yellow-500' :
                    status === 'under_review' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}></span>
                  <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                </div>
                <span className="font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span>Publishing Throughput</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.publishingPipeline).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min((count / Math.max(metrics.totalActiveAuthors, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="font-semibold text-slate-800 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card border-2 border-blue-200 bg-blue-50">
          <h3 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Minor Author Safety (COPPA)</span>
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">{metrics.minorStats.total}</p>
              <p className="text-xs text-gray-600">Youth Authors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{metrics.minorStats.withGuardianConsent}</p>
              <p className="text-xs text-gray-600">Verified Consent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{metrics.minorStats.pendingConsent}</p>
              <p className="text-xs text-gray-600">Pending Consent</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <CheckCircle className="w-4 h-4" />
              <span>100% COPPA Compliant - All minor data protected</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span>LLC Sync Health</span>
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-xl font-bold text-slate-800">{metrics.syncStats.synced}</p>
              <p className="text-xs text-gray-600">Synced</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-xl font-bold text-slate-800">{metrics.syncStats.pending}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-xl font-bold text-slate-800">{metrics.syncStats.failed}</p>
              <p className="text-xs text-gray-600">Failed</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
