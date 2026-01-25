import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, BookOpen, AlertCircle, Download, Trash2, Shield, ExternalLink } from "lucide-react";

interface Application {
  id: number;
  pseudonym: string | null;
  status: string;
  createdAt: string;
  reviewNotes: string | null;
  publicIdentityEnabled: boolean;
  syncStatus?: string;
  syncError?: string | null;
}

interface Contract {
  id: number;
  applicationId: number;
  status: string;
  authorSignature: string | null;
}

interface PublishingUpdate {
  id: number;
  applicationId: number;
  syncStatus: string;
  syncError: string | null;
  statusMessage: string | null;
}

const STATUS_STEPS = [
  { key: "pending", label: "Applied", description: "Application submitted" },
  { key: "under_review", label: "Under Review", description: "Being evaluated" },
  { key: "accepted", label: "Contract Ready", description: "Awaiting signature" },
  { key: "signed", label: "Signed", description: "Publishing journey begins" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [publishingUpdates, setPublishingUpdates] = useState<PublishingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescinding, setRescinding] = useState<number | null>(null);
  const [showRescindConfirm, setShowRescindConfirm] = useState<number | null>(null);
  const [retryingSyncId, setRetryingSyncId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (user.role === "auditor") {
      setLocation("/auditor");
      return;
    }

    if (user.role === "admin") {
      setLocation("/admin/intake");
      return;
    }

    if (user.role === "board_member") {
      setLocation("/board");
      return;
    }

    if (user.role === "student") {
      setLocation("/student");
      return;
    }

    if (user.role === "mentor") {
      setLocation("/mentor");
      return;
    }

    Promise.all([
      fetch("/api/applications").then((res) => res.json()),
      fetch("/api/contracts").then((res) => res.json()),
      fetch("/api/publishing-updates").then((res) => res.json()),
    ])
      .then(([apps, cons, updates]) => {
        const appsArray = Array.isArray(apps) ? apps : [];
        const consArray = Array.isArray(cons) ? cons : [];
        const updatesArray = Array.isArray(updates) ? updates : [];
        setApplications(appsArray.filter((a: Application) => a.status !== 'rescinded'));
        setContracts(consArray);
        setPublishingUpdates(updatesArray);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  const getStatusStep = (appStatus: string, contract: Contract | undefined) => {
    if (contract?.status === "signed") return 3;
    if (appStatus === "accepted") return 2;
    if (appStatus === "under_review") return 1;
    if (appStatus === "migrated") return 3;
    return 0;
  };

  const handleRescind = async (applicationId: number) => {
    setRescinding(applicationId);
    try {
      const res = await fetch(`/api/applications/${applicationId}/rescind`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to rescind application");
      }
      
      setApplications(applications.filter(a => a.id !== applicationId));
      setShowRescindConfirm(null);
    } catch (err) {
      console.error("Rescind error:", err);
      alert("Failed to rescind application. Please try again.");
    } finally {
      setRescinding(null);
    }
  };

  const getContractForApp = (appId: number) => {
    return contracts.find(c => c.applicationId === appId);
  };

  const getPublishingUpdateForApp = (appId: number) => {
    return publishingUpdates.find(u => u.applicationId === appId);
  };

  const handleRetrySync = async (applicationId: number) => {
    setRetryingSyncId(applicationId);
    try {
      const res = await fetch(`/api/publishing-updates/${applicationId}/retry-sync`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to retry sync");
      }
      
      // Refresh publishing updates
      const updatesRes = await fetch("/api/publishing-updates");
      const updates = await updatesRes.json();
      setPublishingUpdates(Array.isArray(updates) ? updates : []);
    } catch (err) {
      console.error("Retry sync error:", err);
      alert("Failed to retry sync. Please contact support if the problem persists.");
    } finally {
      setRetryingSyncId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gray-50">
        <div className="card max-w-md text-center">
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to view your dashboard.</p>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-800">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-gray-600 mt-1">Track your applications and publishing journey</p>
          </div>
          <Link href="/apply" className="mt-4 md:mt-0 btn-primary inline-flex items-center space-x-2">
            <span>New Application</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-800 mb-3">
              No Applications Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Ready to share your story with the world? Start your publishing journey 
              by submitting your first application.
            </p>
            <Link href="/apply" className="btn-primary inline-flex items-center space-x-2">
              <span>Apply Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => {
              const contract = getContractForApp(app.id);
              const currentStep = getStatusStep(app.status, contract);
              const canRescind = app.status === "pending" || app.status === "under_review";
              const canDownload = contract?.status === "signed";

              return (
                <div key={app.id} className="card">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <h3 className="font-display text-xl font-semibold text-slate-800">
                          {app.pseudonym || "Your Application"}
                        </h3>
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          app.publicIdentityEnabled 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{app.publicIdentityEnabled ? "Public" : "Safe Mode"}</span>
                        </span>
                      </div>

                      <div className="mb-6">
                        <p className="text-sm text-gray-500 mb-3">Publishing Pipeline Status</p>
                        <div className="flex items-center space-x-2">
                          {STATUS_STEPS.map((step, index) => (
                            <div key={step.key} className="flex items-center">
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  index <= currentStep
                                    ? "bg-teal-500 text-white"
                                    : "bg-gray-200 text-gray-500"
                                }`}>
                                  {index < currentStep ? (
                                    <CheckCircle className="w-5 h-5" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <p className={`text-xs mt-1 ${
                                  index <= currentStep ? "text-teal-600 font-medium" : "text-gray-400"
                                }`}>
                                  {step.label}
                                </p>
                              </div>
                              {index < STATUS_STEPS.length - 1 && (
                                <div className={`w-8 h-1 mx-1 ${
                                  index < currentStep ? "bg-teal-500" : "bg-gray-200"
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Submitted {new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3 lg:items-end">
                      {app.status === "accepted" && !contract?.authorSignature && (
                        <Link 
                          href="/contracts" 
                          className="btn-primary text-sm py-2 px-4 inline-flex items-center space-x-2"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Sign Contract</span>
                        </Link>
                      )}

                      {canDownload && contract && (
                        <>
                          <a 
                            href={`/api/contracts/${contract.id}/pdf`}
                            download
                            className="btn-primary text-sm py-2 px-4 inline-flex items-center space-x-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Contract</span>
                          </a>
                          {app.syncStatus === "synced" && (
                            <a 
                              href="https://www.theindiequill.com/login"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary text-sm py-2 px-4 inline-flex items-center space-x-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Go to Indie Quill</span>
                            </a>
                          )}
                        </>
                      )}

                      {canRescind && (
                        <>
                          {showRescindConfirm === app.id ? (
                            <div className="flex flex-col space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-sm text-red-700">Rescind this application? This will remove your personal data.</p>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleRescind(app.id)}
                                  disabled={rescinding === app.id}
                                  className="text-sm py-1 px-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {rescinding === app.id ? "Rescinding..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setShowRescindConfirm(null)}
                                  className="text-sm py-1 px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowRescindConfirm(app.id)}
                              className="text-sm py-2 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg inline-flex items-center space-x-2 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Rescind Application</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {app.reviewNotes && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Review Notes</p>
                          <p className="text-sm text-gray-600 mt-1">{app.reviewNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {app.status === "rejected" && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start space-x-2">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Application Not Approved</p>
                          <p className="text-sm text-red-600 mt-1">
                            Unfortunately, your application was not approved at this time. 
                            You may submit a new application in the future.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sync Status Display */}
                  {(() => {
                    const pubUpdate = getPublishingUpdateForApp(app.id);
                    if (!pubUpdate) return null;
                    
                    if (pubUpdate.syncStatus === "failed") {
                      return (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Sync Failed</p>
                                <p className="text-sm text-red-600 mt-1">
                                  There was an issue syncing your account with The Indie Quill. 
                                  Please try again or contact support if the problem persists.
                                </p>
                                {pubUpdate.syncError && (
                                  <p className="text-xs text-red-500 mt-2 font-mono bg-red-100 p-2 rounded">
                                    Error: {pubUpdate.syncError}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRetrySync(app.id)}
                              disabled={retryingSyncId === app.id}
                              className="ml-4 text-sm py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex-shrink-0"
                            >
                              {retryingSyncId === app.id ? "Retrying..." : "Retry Sync"}
                            </button>
                          </div>
                        </div>
                      );
                    }
                    
                    if (pubUpdate.syncStatus === "syncing" || pubUpdate.syncStatus === "pending") {
                      return (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <div>
                              <p className="text-sm font-medium text-blue-800">Syncing with The Indie Quill...</p>
                              <p className="text-sm text-blue-600 mt-1">
                                Your account is being set up. This usually takes just a moment.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
