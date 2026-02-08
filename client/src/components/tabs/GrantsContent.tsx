import { useState, useEffect } from "react";
import { Building2, DollarSign, Users, Target, Lock, TrendingUp, Plus, ChevronDown, ChevronUp, Globe, Mail, Phone, User, Calendar, X, Pencil, Trash2 } from "lucide-react";

interface FoundationData {
  id: number;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactRole: string | null;
  mission: string | null;
  website: string | null;
  notes: string | null;
  category: string | null;
  geographyScope: string | null;
  status: string;
  totalGranted: number;
  grantCount: number;
  createdAt: string;
  lastContact: {
    contactDate: string;
    contactMethod: string;
    purpose: string;
    response: string | null;
  } | null;
}

interface GrantData {
  id: number;
  foundationId: number;
  foundationName: string;
  amount: number;
  targetAuthorCount: number;
  grantDate: string;
  grantPurpose: string | null;
  donorLockedAt: string | null;
  actualAuthorsServed: number;
  surplusAuthors: number;
  hasSurplus: boolean;
  cohort: {
    id: number;
    label: string;
    currentCount: number;
  } | null;
}

export default function GrantsContent() {
  const [foundations, setFoundations] = useState<FoundationData[]>([]);
  const [grants, setGrants] = useState<GrantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);
  const [expandedFoundations, setExpandedFoundations] = useState<Set<number>>(new Set());
  const [showFoundationForm, setShowFoundationForm] = useState(false);
  const [addingGrantForFoundation, setAddingGrantForFoundation] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editingFoundation, setEditingFoundation] = useState<number | null>(null);
  const [editingGrant, setEditingGrant] = useState<number | null>(null);

  const [editFoundationData, setEditFoundationData] = useState({
    name: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    contactRole: "",
    mission: "",
    website: "",
    category: "",
    geographyScope: "",
    notes: "",
  });

  const [editGrantData, setEditGrantData] = useState({
    amount: "",
    targetAuthorCount: "",
    grantDate: "",
    grantPurpose: "",
  });

  const [newFoundation, setNewFoundation] = useState({
    name: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    contactRole: "",
    mission: "",
    website: "",
    category: "",
    geographyScope: "",
    notes: "",
  });

  const [newGrant, setNewGrant] = useState({
    amount: "",
    targetAuthorCount: "",
    grantDate: new Date().toISOString().split("T")[0],
    grantPurpose: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [foundationsRes, grantsRes] = await Promise.all([
        fetch("/api/admin/grants/foundations", { credentials: "include" }),
        fetch("/api/admin/grants", { credentials: "include" }),
      ]);

      if (foundationsRes.status === 401 || grantsRes.status === 401) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      if (foundationsRes.ok) {
        const data = await foundationsRes.json();
        setFoundations(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setExpandedFoundations(new Set(data.map((f: FoundationData) => f.id)));
        }
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

  const toggleFoundation = (id: number) => {
    setExpandedFoundations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateFoundation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoundation.name.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/grants/foundations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newFoundation.name,
          contactPerson: newFoundation.contactPerson || null,
          contactEmail: newFoundation.contactEmail || null,
          contactPhone: newFoundation.contactPhone || null,
          contactRole: newFoundation.contactRole || null,
          mission: newFoundation.mission || null,
          website: newFoundation.website || null,
          category: newFoundation.category || null,
          geographyScope: newFoundation.geographyScope || null,
          notes: newFoundation.notes || null,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setMessage({ type: "success", text: "Foundation added successfully!" });
        setShowFoundationForm(false);
        setNewFoundation({ name: "", contactPerson: "", contactEmail: "", contactPhone: "", contactRole: "", mission: "", website: "", category: "", geographyScope: "", notes: "" });
        if (created && created.id) {
          setFoundations(prev => [{
            ...created,
            totalGranted: 0,
            grantCount: 0,
            lastContact: null,
          }, ...prev]);
        }
        fetchData();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Failed to create foundation" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditFoundation = async (e: React.FormEvent, foundationId: number) => {
    e.preventDefault();
    if (!editFoundationData.name.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/grants/foundations/${foundationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editFoundationData.name,
          contactPerson: editFoundationData.contactPerson || null,
          contactEmail: editFoundationData.contactEmail || null,
          contactPhone: editFoundationData.contactPhone || null,
          contactRole: editFoundationData.contactRole || null,
          mission: editFoundationData.mission || null,
          website: editFoundationData.website || null,
          category: editFoundationData.category || null,
          geographyScope: editFoundationData.geographyScope || null,
          notes: editFoundationData.notes || null,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Foundation updated successfully!" });
        setEditingFoundation(null);
        setFoundations(prev => prev.map(f => f.id === foundationId ? { ...f, ...editFoundationData } : f));
        fetchData();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Failed to update foundation" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFoundation = async (foundationId: number, foundationName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${foundationName}" and all its grants? This cannot be undone.`)) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/grants/foundations/${foundationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Foundation deleted successfully!" });
        setFoundations(prev => prev.filter(f => f.id !== foundationId));
        setGrants(prev => prev.filter(g => g.foundationId !== foundationId));
        fetchData();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Failed to delete foundation" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGrant = async (e: React.FormEvent, foundationId: number) => {
    e.preventDefault();
    if (!newGrant.amount || !newGrant.targetAuthorCount || !newGrant.grantDate) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          foundationId,
          amount: Math.round(parseFloat(newGrant.amount) * 100),
          targetAuthorCount: parseInt(newGrant.targetAuthorCount),
          grantDate: newGrant.grantDate,
          grantPurpose: newGrant.grantPurpose || null,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Grant recorded successfully!" });
        setAddingGrantForFoundation(null);
        setNewGrant({ amount: "", targetAuthorCount: "", grantDate: new Date().toISOString().split("T")[0], grantPurpose: "" });
        fetchData();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Failed to record grant" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditGrant = async (e: React.FormEvent, grantId: number) => {
    e.preventDefault();
    if (!editGrantData.amount || !editGrantData.targetAuthorCount || !editGrantData.grantDate) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/grants/${grantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: Math.round(parseFloat(editGrantData.amount) * 100),
          targetAuthorCount: parseInt(editGrantData.targetAuthorCount),
          grantDate: editGrantData.grantDate,
          grantPurpose: editGrantData.grantPurpose || null,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Grant updated successfully!" });
        setEditingGrant(null);
        setGrants(prev => prev.map(g => g.id === grantId ? {
          ...g,
          amount: Math.round(parseFloat(editGrantData.amount) * 100),
          targetAuthorCount: parseInt(editGrantData.targetAuthorCount),
          grantDate: editGrantData.grantDate,
          grantPurpose: editGrantData.grantPurpose || null,
        } : g));
        fetchData();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Failed to update grant" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrant = async (grantId: number) => {
    if (!window.confirm("Are you sure you want to delete this grant? This cannot be undone.")) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/grants/${grantId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Grant deleted successfully!" });
        setGrants(prev => prev.filter(g => g.id !== grantId));
        fetchData();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Failed to delete grant" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setSaving(false);
    }
  };

  const startEditFoundation = (foundation: FoundationData) => {
    setEditingFoundation(foundation.id);
    setEditFoundationData({
      name: foundation.name,
      contactPerson: foundation.contactPerson || "",
      contactEmail: foundation.contactEmail || "",
      contactPhone: foundation.contactPhone || "",
      contactRole: foundation.contactRole || "",
      mission: foundation.mission || "",
      website: foundation.website || "",
      category: foundation.category || "",
      geographyScope: foundation.geographyScope || "",
      notes: foundation.notes || "",
    });
  };

  const startEditGrant = (grant: GrantData) => {
    setEditingGrant(grant.id);
    setEditGrantData({
      amount: (grant.amount / 100).toFixed(2),
      targetAuthorCount: grant.targetAuthorCount.toString(),
      grantDate: grant.grantDate.split("T")[0],
      grantPurpose: grant.grantPurpose || "",
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getGrantsForFoundation = (foundationId: number) => {
    return grants.filter((g) => g.foundationId === foundationId);
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
          <p className="text-gray-600 text-sm">Foundation CRM with efficiency surplus tracking</p>
        </div>
        <button
          onClick={() => { setShowFoundationForm(!showFoundationForm); setMessage(null); }}
          disabled={!authenticated}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${authenticated ? "bg-teal-500 text-white hover:bg-teal-600" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
        >
          <Plus className="w-4 h-4" />
          Add Foundation
        </button>
      </div>

      {!authenticated && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm">
          <strong>Session expired.</strong> Please log out and log back in, then return to this page.
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.text}
        </div>
      )}

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

      {showFoundationForm && (
        <form onSubmit={handleCreateFoundation} className="bg-white rounded-xl shadow-sm border border-teal-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-lg">New Foundation</h3>
            <button type="button" onClick={() => setShowFoundationForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Foundation Name *</label>
              <input
                type="text"
                value={newFoundation.name}
                onChange={(e) => setNewFoundation({ ...newFoundation, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="e.g., Dollar General Literacy Foundation"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={newFoundation.contactPerson}
                onChange={(e) => setNewFoundation({ ...newFoundation, contactPerson: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Role</label>
              <input
                type="text"
                value={newFoundation.contactRole}
                onChange={(e) => setNewFoundation({ ...newFoundation, contactRole: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="e.g., Program Officer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="text"
                value={newFoundation.contactEmail}
                onChange={(e) => setNewFoundation({ ...newFoundation, contactEmail: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="contact@foundation.org"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={newFoundation.contactPhone}
                onChange={(e) => setNewFoundation({ ...newFoundation, contactPhone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="text"
                value={newFoundation.website}
                onChange={(e) => setNewFoundation({ ...newFoundation, website: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="https://foundation.org"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={newFoundation.category}
                onChange={(e) => setNewFoundation({ ...newFoundation, category: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="e.g., Literacy, Arts, Education"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geography / Scope</label>
              <input
                type="text"
                value={newFoundation.geographyScope}
                onChange={(e) => setNewFoundation({ ...newFoundation, geographyScope: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="e.g., National, Southeast US"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mission</label>
              <textarea
                value={newFoundation.mission}
                onChange={(e) => setNewFoundation({ ...newFoundation, mission: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                rows={2}
                placeholder="Foundation's mission statement..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={newFoundation.notes}
                onChange={(e) => setNewFoundation({ ...newFoundation, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:opacity-50 text-sm font-medium">
              {saving ? "Saving..." : "Add Foundation"}
            </button>
            <button type="button" onClick={() => setShowFoundationForm(false)} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {foundations.length === 0 && !showFoundationForm ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Foundations Yet</h3>
          <p className="text-gray-500 mb-6">Add a foundation to start tracking grant opportunities.</p>
          <button
            onClick={() => setShowFoundationForm(true)}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors inline-flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Your First Foundation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {foundations.map((foundation) => {
            const foundationGrants = getGrantsForFoundation(foundation.id);
            const isExpanded = expandedFoundations.has(foundation.id);

            return (
              <div key={foundation.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {editingFoundation === foundation.id ? (
                  <form onSubmit={(e) => handleEditFoundation(e, foundation.id)} className="p-6 border-b border-teal-200 bg-teal-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-800 text-lg">Edit Foundation</h3>
                      <button type="button" onClick={() => setEditingFoundation(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Foundation Name *</label>
                        <input
                          type="text"
                          value={editFoundationData.name}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                        <input
                          type="text"
                          value={editFoundationData.contactPerson}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, contactPerson: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Role</label>
                        <input
                          type="text"
                          value={editFoundationData.contactRole}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, contactRole: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="text"
                          value={editFoundationData.contactEmail}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, contactEmail: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={editFoundationData.contactPhone}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, contactPhone: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <input
                          type="text"
                          value={editFoundationData.website}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, website: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={editFoundationData.category}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, category: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Geography / Scope</label>
                        <input
                          type="text"
                          value={editFoundationData.geographyScope}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, geographyScope: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mission</label>
                        <textarea
                          value={editFoundationData.mission}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, mission: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={editFoundationData.notes}
                          onChange={(e) => setEditFoundationData({ ...editFoundationData, notes: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:opacity-50 text-sm font-medium">
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button type="button" onClick={() => setEditingFoundation(null)} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 text-sm">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => toggleFoundation(foundation.id)}
                    className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-slate-800">{foundation.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            foundation.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {foundation.status}
                          </span>
                          {authenticated && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); startEditFoundation(foundation); }}
                                className="p-1 text-gray-400 hover:text-teal-600 rounded hover:bg-teal-50 transition-colors"
                                title="Edit foundation"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFoundation(foundation.id, foundation.name); }}
                                className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                title="Delete foundation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                          {foundation.contactPerson && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {foundation.contactPerson}
                              {foundation.contactRole && <span className="text-gray-400">({foundation.contactRole})</span>}
                            </span>
                          )}
                          {foundation.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {foundation.contactEmail}
                            </span>
                          )}
                          {foundation.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {foundation.contactPhone}
                            </span>
                          )}
                          {foundation.website && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5" />
                              <a
                                href={foundation.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Website
                              </a>
                            </span>
                          )}
                        </div>

                        {foundation.mission && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{foundation.mission}</p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="text-green-600 font-medium">{formatCurrency(foundation.totalGranted)} granted</span>
                          <span className="text-gray-500">{foundation.grantCount} grant{foundation.grantCount !== 1 ? "s" : ""}</span>
                          {foundation.category && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{foundation.category}</span>
                          )}
                          {foundation.geographyScope && (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs">{foundation.geographyScope}</span>
                          )}
                          {foundation.lastContact && (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Last contact: {new Date(foundation.lastContact.contactDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>
                )}

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Grants</h4>
                        <button
                          onClick={() => {
                            setAddingGrantForFoundation(addingGrantForFoundation === foundation.id ? null : foundation.id);
                            setMessage(null);
                          }}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add Grant
                        </button>
                      </div>

                      {addingGrantForFoundation === foundation.id && (
                        <form onSubmit={(e) => handleCreateGrant(e, foundation.id)} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($) *</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newGrant.amount}
                                onChange={(e) => setNewGrant({ ...newGrant, amount: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                placeholder="5000.00"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Target Authors *</label>
                              <input
                                type="number"
                                min="1"
                                value={newGrant.targetAuthorCount}
                                onChange={(e) => setNewGrant({ ...newGrant, targetAuthorCount: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                placeholder="10"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Grant Date *</label>
                              <input
                                type="date"
                                value={newGrant.grantDate}
                                onChange={(e) => setNewGrant({ ...newGrant, grantDate: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Purpose</label>
                              <input
                                type="text"
                                value={newGrant.grantPurpose}
                                onChange={(e) => setNewGrant({ ...newGrant, grantPurpose: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                placeholder="Family Literacy"
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-4 py-1.5 rounded-lg hover:bg-teal-600 disabled:opacity-50 text-sm font-medium">
                              {saving ? "Saving..." : "Record Grant"}
                            </button>
                            <button type="button" onClick={() => setAddingGrantForFoundation(null)} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-300 text-sm">
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {foundationGrants.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-3">No grants recorded yet for this foundation.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Target</th>
                                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Served</th>
                                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Surplus</th>
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Purpose</th>
                                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {foundationGrants.map((grant) => (
                                editingGrant === grant.id ? (
                                  <tr key={grant.id} className="border-b border-gray-100 bg-teal-50">
                                    <td colSpan={8} className="py-3 px-3">
                                      <form onSubmit={(e) => handleEditGrant(e, grant.id)} className="flex flex-wrap items-end gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editGrantData.amount}
                                            onChange={(e) => setEditGrantData({ ...editGrantData, amount: e.target.value })}
                                            className="w-32 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Target Authors</label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={editGrantData.targetAuthorCount}
                                            onChange={(e) => setEditGrantData({ ...editGrantData, targetAuthorCount: e.target.value })}
                                            className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Grant Date</label>
                                          <input
                                            type="date"
                                            value={editGrantData.grantDate}
                                            onChange={(e) => setEditGrantData({ ...editGrantData, grantDate: e.target.value })}
                                            className="w-40 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Purpose</label>
                                          <input
                                            type="text"
                                            value={editGrantData.grantPurpose}
                                            onChange={(e) => setEditGrantData({ ...editGrantData, grantPurpose: e.target.value })}
                                            className="w-40 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent text-sm"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <button type="submit" disabled={saving} className="bg-teal-500 text-white px-3 py-1.5 rounded-lg hover:bg-teal-600 disabled:opacity-50 text-sm font-medium">
                                            {saving ? "Saving..." : "Save"}
                                          </button>
                                          <button type="button" onClick={() => setEditingGrant(null)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 text-sm">
                                            Cancel
                                          </button>
                                        </div>
                                      </form>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={grant.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-2.5 px-3 text-gray-700">
                                      {new Date(grant.grantDate).toLocaleDateString()}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-medium text-green-600">
                                      {formatCurrency(grant.amount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className="flex items-center justify-center gap-1 text-gray-600">
                                        <Target className="w-3.5 h-3.5 text-gray-400" />
                                        {grant.targetAuthorCount}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-medium text-blue-600">
                                      {grant.actualAuthorsServed}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {grant.hasSurplus ? (
                                        <span className="text-purple-600 font-medium">+{grant.surplusAuthors}</span>
                                      ) : (
                                        <span className="text-gray-400">--</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-600">
                                      {grant.grantPurpose || <span className="text-gray-400">--</span>}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {grant.donorLockedAt ? (
                                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                          <Lock className="w-3.5 h-3.5" />
                                          Locked
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 text-xs font-medium">Open</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={() => startEditGrant(grant)}
                                          disabled={!authenticated || !!grant.donorLockedAt}
                                          className={`p-1 rounded transition-colors ${!authenticated || grant.donorLockedAt ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-teal-600 hover:bg-teal-50"}`}
                                          title={grant.donorLockedAt ? "Cannot edit locked grant" : "Edit grant"}
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteGrant(grant.id)}
                                          disabled={!authenticated || !!grant.donorLockedAt}
                                          className={`p-1 rounded transition-colors ${!authenticated || grant.donorLockedAt ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                                          title={grant.donorLockedAt ? "Cannot delete locked grant" : "Delete grant"}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
