import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, AlertCircle, Users, Download, ExternalLink } from "lucide-react";

interface Contract {
  id: number;
  applicationId: number;
  contractType: string;
  status: string;
  requiresGuardian: boolean;
  authorSignature: string | null;
  guardianSignature: string | null;
  createdAt: string;
  authorName?: string;
  pseudonym?: string;
}

export default function ContractsContent() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const res = await fetch("/api/admin/contracts", { credentials: "include" });
      const data = await res.json();
      setContracts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (contract: Contract) => {
    if (contract.status === "signed") {
      return { icon: CheckCircle, text: "Fully Signed", color: "bg-green-100 text-green-700" };
    }
    if (contract.status === "pending_guardian") {
      return { icon: Users, text: "Awaiting Guardian", color: "bg-blue-100 text-blue-700" };
    }
    if (contract.status === "pending_signature") {
      return { icon: Clock, text: "Awaiting Signature", color: "bg-yellow-100 text-yellow-700" };
    }
    return { icon: AlertCircle, text: contract.status, color: "bg-gray-100 text-gray-700" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const signed = contracts.filter(c => c.status === "signed").length;
  const pending = contracts.filter(c => c.status !== "signed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-slate-800">Contract Management</h2>
          </div>
          <p className="text-gray-600 text-sm">Track publishing agreements and signatures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <FileText className="w-4 h-4" />
            Total Contracts
          </div>
          <p className="text-2xl font-bold text-slate-800">{contracts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Fully Signed
          </div>
          <p className="text-2xl font-bold text-green-600">{signed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending
          </div>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Contracts Yet</h3>
          <p className="text-gray-500">Contracts are generated when applications are accepted.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Contract</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Author</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const statusInfo = getStatusInfo(contract);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">Contract #{contract.id}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(contract.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-700">{contract.pseudonym || `App #${contract.applicationId}`}</p>
                      {contract.requiresGuardian && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Requires Guardian
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600 capitalize">
                        {contract.contractType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/contract/${contract.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg"
                          title="View Contract"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {contract.status === "signed" && (
                          <button
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
