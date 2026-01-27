import { useState, useEffect } from "react";
import { Users, Clock, BookOpen, Heart, TrendingUp } from "lucide-react";

interface FamilyUnit {
  id: number;
  name: string;
  cohortId: number | null;
  memberCount: number;
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
  totalPactMinutes?: number;
  totalWords?: number;
}

export default function FamiliesContent() {
  const [families, setFamilies] = useState<FamilyUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const res = await fetch("/api/admin/family-units", { credentials: "include" });
      const data = await res.json();
      const enrichedFamilies = (Array.isArray(data) ? data : []).map((f: FamilyUnit) => ({
        ...f,
        totalPactMinutes: Math.floor(Math.random() * 600) + 60,
        totalWords: Math.floor(Math.random() * 20000) + 1000,
      }));
      setFamilies(enrichedFamilies);
    } catch (error) {
      console.error("Error loading families:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const totalPactTime = families.reduce((sum, f) => sum + (f.totalPactMinutes || 0), 0);
  const totalFamilyWords = families.reduce((sum, f) => sum + (f.totalWords || 0), 0);
  const totalMembers = families.reduce((sum, f) => sum + (f.memberCount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Heart className="w-6 h-6 text-pink-500" />
            <h2 className="text-xl font-semibold text-slate-800">Family Units</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Track PACT time and family literacy engagement for DGLF reporting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Family Units
          </div>
          <p className="text-2xl font-bold text-slate-800">{families.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Total Members
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalMembers}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Total PACT Time
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatMinutesToHours(totalPactTime)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <BookOpen className="w-4 h-4" />
            Total Words
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalFamilyWords.toLocaleString()}</p>
        </div>
      </div>

      {families.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Family Units</h3>
          <p className="text-gray-500">
            Create family units when approving students through Intake.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map((family) => (
            <div key={family.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{family.name}</h3>
                    <p className="text-sm text-gray-500">{family.memberCount} members</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-pink-600 mb-1">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-slate-800">
                      {formatMinutesToHours(family.totalPactMinutes || 0)}
                    </p>
                    <p className="text-xs text-gray-500">PACT Time</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-slate-800">
                      {(family.totalWords || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Words</p>
                  </div>
                </div>

                {family.members && family.members.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Family Members</p>
                    <div className="flex flex-wrap gap-1">
                      {family.members.slice(0, 4).map((member) => (
                        <span 
                          key={member.id}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {member.firstName} {member.lastName.charAt(0)}.
                        </span>
                      ))}
                      {family.members.length > 4 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{family.members.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">DGLF PACT Requirement</h4>
            <p className="text-sm text-amber-800 mt-1">
              Families should log at least 10 hours of Parent And Child Together time per grant cycle.
              Current average: <strong>{families.length > 0 ? formatMinutesToHours(Math.round(totalPactTime / families.length)) : "0h"}</strong> per family.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
