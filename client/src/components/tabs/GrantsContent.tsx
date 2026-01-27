import { useState, useEffect } from "react";
import { Building2, DollarSign, Users, Target, Lock, TrendingUp, Bell } from "lucide-react";

interface Foundation {
  id: number;
  name: string;
  contactPerson: string | null;
  totalGranted: number;
  grantCount: number;
}

interface Grant {
  id: number;
  foundationName: string;
  amount: number;
  targetAuthorCount: number;
  grantDate: string;
  donorLockedAt: string | null;
  cohort: {
    id: number;
    label: string;
    currentCount: number;
  } | null;
  actualAuthorsServed: number;
  surplusAuthors: number;
  hasSurplus: boolean;
}

export default function GrantsContent() {
  const [foundations, setFoundations] = useState<Foundation[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [foundationsRes, grantsRes] = await Promise.all([
        fetch("/api/admin/foundations", { credentials: "include" }),
        fetch("/api/admin/grants", { credentials: "include" }),
      ]);

      if (foundationsRes.ok) {
        const data = await foundationsRes.json();
        setFoundations(Array.isArray(data) ? data : []);
      }

      if (grantsRes.ok) {
        const data = await grantsRes.json();
        setGrants(Array.isArray(data?.grants) ? data.grants : []);
      }
    } catch (error) {
      console.error("Failed to fetch grants data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const totalGranted = grants.reduce((sum, g) => sum + g.amount, 0);
  const totalAuthorsServed = grants.reduce((sum, g) => sum + g.actualAuthorsServed, 0);
  const totalSurplus = grants.reduce((sum, g) => sum + g.surplusAuthors, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-800">Grant & Donor Logistics</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Foundation CRM with efficiency surplus tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Building2 className="w-4 h-4" />
            Foundations
          </div>
          <p className="text-2xl font-bold text-slate-800">{foundations.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            Total Granted
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalGranted)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            Authors Served
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalAuthorsServed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Efficiency Surplus
          </div>
          <p className="text-2xl font-bold text-purple-600">+{totalSurplus}</p>
          <p className="text-xs text-gray-400 mt-1">Extra authors served</p>
        </div>
      </div>

      {grants.length === 0 && foundations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Grants Yet</h3>
          <p className="text-gray-500">Add foundations and grants to track donor impact.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grants.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-slate-800">Active Grants</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Foundation</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Target</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Served</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Surplus</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((grant) => (
                      <tr key={grant.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{grant.foundationName}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(grant.grantDate).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-green-600">
                          {formatCurrency(grant.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="flex items-center justify-center gap-1">
                            <Target className="w-4 h-4 text-gray-400" />
                            {grant.targetAuthorCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-blue-600">
                          {grant.actualAuthorsServed}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {grant.hasSurplus ? (
                            <span className="text-purple-600 font-medium">+{grant.surplusAuthors}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {grant.donorLockedAt ? (
                            <span className="flex items-center justify-center gap-1 text-green-600">
                              <Lock className="w-4 h-4" />
                              Locked
                            </span>
                          ) : (
                            <span className="text-amber-600">Open</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {foundations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-slate-800">Foundation Directory</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {foundations.map((foundation) => (
                  <div key={foundation.id} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-slate-800 mb-1">{foundation.name}</h4>
                    {foundation.contactPerson && (
                      <p className="text-sm text-gray-600">{foundation.contactPerson}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-500">{foundation.grantCount} grants</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(foundation.totalGranted)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Efficiency Surplus</h4>
            <p className="text-sm text-blue-800 mt-1">
              When cost optimization serves more authors than promised to donors, we report this as an "efficiency surplus" — demonstrating responsible stewardship of grant funds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
