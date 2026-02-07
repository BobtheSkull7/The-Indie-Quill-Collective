import { useState, useEffect } from "react";
import { Plus, Calendar, Target } from "lucide-react";

interface GrantCohort {
  id: number;
  label: string;
  cohortType: string;
  capacity: number;
  currentCount: number;
  status: string;
  grantId: number | null;
  grantName: string | null;
  grantYear: number | null;
  description: string | null;
  createdAt: string;
  familyCount: number;
  studentCount: number;
}

export default function GrantCohortsContent() {
  const [cohorts, setCohorts] = useState<GrantCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [newCohort, setNewCohort] = useState({
    label: "",
    grantName: "",
    grantYear: new Date().getFullYear(),
    capacity: 20,
    description: "",
  });

  useEffect(() => {
    fetchCohorts();
  }, []);

  const fetchCohorts = async () => {
    try {
      const res = await fetch("/api/admin/grant-cohorts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCohorts(data.cohorts || []);
      }
    } catch {
      console.error("Failed to fetch grant cohorts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohort.label.trim()) return;
    
    setCreating(true);
    setMessage(null);
    
    try {
      const res = await fetch("/api/admin/grant-cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newCohort),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Grant cohort created successfully!' });
        setShowCreateForm(false);
        setNewCohort({ label: "", grantName: "", grantYear: new Date().getFullYear(), capacity: 20, description: "" });
        fetchCohorts();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to create cohort' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Grant Cohorts</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Grant Cohort
        </button>
      </div>
      
      {showCreateForm && (
        <form onSubmit={handleCreateCohort} className="bg-gray-50 rounded-xl p-6 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Label</label>
              <input
                type="text"
                value={newCohort.label}
                onChange={(e) => setNewCohort({ ...newCohort, label: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="e.g., DGLF 2026 Family Literacy"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grant Name</label>
              <input
                type="text"
                value={newCohort.grantName}
                onChange={(e) => setNewCohort({ ...newCohort, grantName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="e.g., Dollar General Literacy Foundation"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grant Year</label>
              <input
                type="number"
                value={newCohort.grantYear}
                onChange={(e) => setNewCohort({ ...newCohort, grantYear: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                min={2020}
                max={2030}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                value={newCohort.capacity}
                onChange={(e) => setNewCohort({ ...newCohort, capacity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                min={1}
                max={100}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newCohort.description}
                onChange={(e) => setNewCohort({ ...newCohort, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                rows={2}
                placeholder="Optional description of this grant cohort..."
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Cohort"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      
      {cohorts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No Grant Cohorts Yet</h3>
          <p className="text-gray-500">Create your first grant-funded cohort to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cohorts.map((cohort) => (
            <div key={cohort.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{cohort.label}</h3>
                  {cohort.grantName && (
                    <p className="text-sm text-teal-600">{cohort.grantName} {cohort.grantYear}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  cohort.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {cohort.status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-800">{cohort.currentCount}/{cohort.capacity}</div>
                  <div className="text-xs text-gray-500">Capacity</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-purple-600">{cohort.familyCount}</div>
                  <div className="text-xs text-gray-500">Families</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-teal-600">{cohort.studentCount}</div>
                  <div className="text-xs text-gray-500">Students</div>
                </div>
              </div>
              
              {cohort.description && (
                <p className="mt-3 text-sm text-gray-600 line-clamp-2">{cohort.description}</p>
              )}
              
              <div className="mt-3 flex items-center text-xs text-gray-400">
                <Calendar className="w-3 h-3 mr-1" />
                Created {new Date(cohort.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
