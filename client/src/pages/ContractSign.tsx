import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "../App";
import { FileText, CheckCircle, AlertCircle, PenTool, Download, BookOpen, Edit3, Search, Wrench, Globe, Megaphone, FileCheck } from "lucide-react";

interface Contract {
  id: number;
  applicationId: number;
  contractType: string;
  contractContent: string;
  status: string;
  requiresGuardian: boolean;
  authorSignature: string | null;
  authorSignedAt: string | null;
  authorSignatureIp: string | null;
  authorSignatureUserAgent: string | null;
  guardianSignature: string | null;
  guardianSignedAt: string | null;
  guardianSignatureIp: string | null;
  guardianSignatureUserAgent: string | null;
  createdAt: string;
  authorLegalName?: string;
  guardianLegalName?: string;
  pseudonym?: string;
  identityMode?: "safe" | "public";
}

export default function ContractSign() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [signature, setSignature] = useState("");
  const [signatureType, setSignatureType] = useState<"author" | "guardian">("author");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  const literacyPhases = [
    { name: "Agreement", icon: FileCheck, description: "Legal onboarding & forensic identity verification" },
    { name: "Creation", icon: BookOpen, description: "Supervised authorship with mentorship tools" },
    { name: "Editing", icon: Edit3, description: "Professional manuscript development & ISBN/Copyright registration" },
    { name: "Review", icon: Search, description: "Genre analysis and content evaluation" },
    { name: "Modifications", icon: Wrench, description: "Technical refinement for market standards" },
    { name: "Published", icon: Globe, description: "Deployment into The Publisher's global bookstore" },
    { name: "Marketing", icon: Megaphone, description: "Launch event and promotional cycles" },
  ];

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    fetch(`/api/contracts/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Contract not found");
        return res.json();
      })
      .then(setContract)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, params.id, setLocation]);

  const handleSign = async () => {
    if (!signature.trim()) {
      setError("Please enter your signature");
      return;
    }

    setSigning(true);
    setError("");

    try {
      const res = await fetch(`/api/contracts/${params.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          signature, 
          signatureType
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to sign contract");
      }

      setContract(data);
      setSignature("");

      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || "Contract not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-800 capitalize">
              {contract.contractType.replace("_", " ")}
            </h1>
            <p className="text-gray-600">Review and sign your publishing agreement</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="card mb-6">
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-4">The Literacy Logistics Framework</h2>
          <p className="text-gray-600 mb-4">The Collective agrees to mentor you through the following seven Value-Add Phases:</p>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {literacyPhases.map((phase, index) => (
              <div key={phase.name} className="relative">
                <div className={`p-3 rounded-lg border-2 ${index === 0 ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-gray-50'} text-center`}>
                  <phase.icon className={`w-6 h-6 mx-auto mb-2 ${index === 0 ? 'text-teal-600' : 'text-gray-500'}`} />
                  <p className="font-medium text-sm text-slate-800">{phase.name}</p>
                  <p className="text-xs text-gray-500 mt-1 hidden md:block">{phase.description}</p>
                </div>
                {index < literacyPhases.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-1 transform -translate-y-1/2 text-gray-300">
                    &rarr;
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-4">Contract Terms</h2>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-body text-sm text-gray-700 leading-relaxed">
              {contract.contractContent}
            </pre>
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-4">Signature Status</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border-2 ${contract.authorSignature ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center space-x-3">
                {contract.authorSignature ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <PenTool className="w-6 h-6 text-gray-400" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Author Signature</p>
                  {contract.authorSignature ? (
                    <>
                      <p className="text-sm text-green-600">
                        Signed: {contract.authorSignature} on {new Date(contract.authorSignedAt!).toLocaleDateString()}
                      </p>
                      {contract.authorSignatureIp && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">IP:</span> {contract.authorSignatureIp}
                          </p>
                          {contract.authorSignatureUserAgent && (
                            <p className="text-xs text-gray-500 truncate max-w-xs" title={contract.authorSignatureUserAgent}>
                              <span className="font-medium">Device:</span> {contract.authorSignatureUserAgent.substring(0, 50)}...
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Awaiting signature</p>
                  )}
                </div>
              </div>
            </div>

            {contract.requiresGuardian && (
              <div className={`p-4 rounded-lg border-2 ${contract.guardianSignature ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center space-x-3">
                  {contract.guardianSignature ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <PenTool className="w-6 h-6 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">Guardian Signature</p>
                    {contract.guardianSignature ? (
                      <>
                        <p className="text-sm text-green-600">
                          Signed: {contract.guardianSignature} on {new Date(contract.guardianSignedAt!).toLocaleDateString()}
                        </p>
                        {contract.guardianSignatureIp && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">IP:</span> {contract.guardianSignatureIp}
                            </p>
                            {contract.guardianSignatureUserAgent && (
                              <p className="text-xs text-gray-500 truncate max-w-xs" title={contract.guardianSignatureUserAgent}>
                                <span className="font-medium">Device:</span> {contract.guardianSignatureUserAgent.substring(0, 50)}...
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Awaiting guardian signature</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {contract.status !== "signed" && (
          <div className="card">
            <h2 className="font-display text-xl font-semibold text-slate-800 mb-4">Sign Contract</h2>
            
            {contract.requiresGuardian && (
              <div className="mb-4">
                <label className="label">Signing As</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="signatureType"
                      checked={signatureType === "author"}
                      onChange={() => setSignatureType("author")}
                      disabled={!!contract.authorSignature}
                      className="w-4 h-4 text-teal-500"
                    />
                    <span className={contract.authorSignature ? "text-gray-400" : ""}>Author</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="signatureType"
                      checked={signatureType === "guardian"}
                      onChange={() => setSignatureType("guardian")}
                      disabled={!!contract.guardianSignature}
                      className="w-4 h-4 text-teal-500"
                    />
                    <span className={contract.guardianSignature ? "text-gray-400" : ""}>Guardian</span>
                  </label>
                </div>
              </div>
            )}

            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="font-medium text-slate-800 mb-3">Defined Parties (Locked from Application)</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm text-gray-600">Author (Legal Identity):</span>
                  <span className="font-medium text-slate-800">{contract.authorLegalName || "Loading..."}</span>
                </div>
                
                {contract.requiresGuardian && (
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm text-gray-600">Guardian (Legal Identity):</span>
                    <span className="font-medium text-slate-800">{contract.guardianLegalName || "Not specified"}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm text-gray-600">Pseudonym (Creative Identity):</span>
                  <span className="font-medium text-teal-600">{contract.pseudonym || "Not specified"}</span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm text-gray-600">Identity Mode:</span>
                  <span className={`font-medium ${contract.identityMode === "public" ? "text-blue-600" : "text-green-600"}`}>
                    {contract.identityMode === "public" ? "Public Mode" : "Safe Mode (Protected)"}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                These values were captured during your application and cannot be changed here. If you need to update them, please contact jon@theindiequill.com.
              </p>
            </div>

            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-slate-800 mb-2">Signature Validation</h3>
              <p className="text-sm text-gray-600">
                {signatureType === "author" 
                  ? `Please type your full legal name exactly as: "${contract.authorLegalName || 'Loading...'}"`
                  : `Please type your full legal name exactly as: "${contract.guardianLegalName || 'Loading...'}"`
                }
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This ensures the forensic integrity of the signature record.
              </p>
            </div>

            <div className="mb-4">
              <label className="label">Type Your Full Legal Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your full legal name as signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                By typing your name, you agree to the terms of this contract.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleSign}
              disabled={signing || !signature.trim()}
              className="btn-primary w-full md:w-auto disabled:opacity-50"
            >
              {signing ? "Signing..." : "Sign Contract"}
            </button>
          </div>
        )}

        {contract.status === "signed" && (
          <div className="card bg-green-50 border-green-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-green-800">Contract Fully Signed</h2>
                  <p className="text-green-600">
                    Congratulations! Your publishing agreement is complete. Check your publishing status for updates.
                  </p>
                </div>
              </div>
              <a
                href={`/api/contracts/${contract.id}/pdf`}
                className="mt-4 md:mt-0 btn-secondary inline-flex items-center space-x-2"
                download
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
