import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight, Users, Download } from "lucide-react";

interface Contract {
  id: number;
  applicationId: number;
  contractType: string;
  status: string;
  requiresGuardian: boolean;
  authorSignature: string | null;
  guardianSignature: string | null;
  createdAt: string;
}

export default function Contracts() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    fetch("/api/contracts")
      .then((res) => res.json())
      .then(setContracts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, setLocation]);

  const getStatusInfo = (contract: Contract) => {
    if (contract.status === "signed") {
      return { icon: CheckCircle, text: "Fully Signed", color: "text-green-600 bg-green-100" };
    }
    if (contract.status === "pending_guardian") {
      return { icon: Users, text: "Awaiting Guardian", color: "text-blue-600 bg-blue-100" };
    }
    if (contract.status === "pending_signature") {
      return { icon: Clock, text: "Awaiting Signature", color: "text-yellow-600 bg-yellow-100" };
    }
    return { icon: AlertCircle, text: contract.status, color: "text-gray-600 bg-gray-100" };
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-gray-50">
        <div className="card max-w-md text-center">
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to view your contracts.</p>
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-800">Your Contracts</h1>
          <p className="text-gray-600 mt-1">Review and sign your publishing agreements</p>
        </div>

        {contracts.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-800 mb-3">
              No Contracts Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Once your application is accepted, your publishing agreement will appear here for signing.
            </p>
            <Link href="/dashboard" className="btn-secondary inline-block">
              View Applications
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => {
              const statusInfo = getStatusInfo(contract);
              const StatusIcon = statusInfo.icon;

              return (
                <div key={contract.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-semibold text-slate-800 capitalize">
                          {contract.contractType.replace("_", " ")}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Created {new Date(contract.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span>{statusInfo.text}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-col items-end space-y-2">
                      {contract.requiresGuardian && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Guardian Required
                        </span>
                      )}
                      
                      {contract.status !== "signed" && (
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="btn-primary text-sm py-2 px-4 inline-flex items-center space-x-2"
                        >
                          <span>Review & Sign</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}

                      {contract.status === "signed" && (
                        <div className="flex flex-col space-y-2">
                          <Link
                            href={`/contracts/${contract.id}`}
                            className="btn-secondary text-sm py-2 px-4 text-center"
                          >
                            View Contract
                          </Link>
                          <a
                            href={`/api/contracts/${contract.id}/pdf`}
                            className="btn-primary text-sm py-2 px-4 inline-flex items-center justify-center space-x-2"
                            download
                          >
                            <Download className="w-4 h-4" />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {contract.requiresGuardian && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          {contract.authorSignature ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="text-gray-600">Author Signature</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {contract.guardianSignature ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="text-gray-600">Guardian Signature</span>
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
