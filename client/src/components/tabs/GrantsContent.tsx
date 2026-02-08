import { useState, useEffect } from "react";
import { Building2, DollarSign, Users, Target, Lock, TrendingUp, Plus, ChevronDown, ChevronUp, Globe, Mail, Phone, User, Calendar, X } from "lucide-react";

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
  const [expandedFoundations, setExpandedFoundations] = useState<Set<number>>(new Set());
  const [showFoundationForm, setShowFoundationForm] = useState(false);
  const [addingGrantForFoundation, setAddingGrantForFoundation] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        setMessage({ type: "success", text: "Foundation added successfully!" });
        setShowFoundationForm(false);
        setNewFoundation({ name: "", contactPerson: "", contactEmail: "", contactPhone: "", contactRole: "", mission: "", website: "", category: "", geographyScope: "", notes: "" });
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
          className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Foundation
        </button>
      </div>

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
                              </tr>
                            </thead>
                            <tbody>
                              {foundationGrants.map((grant) => (
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
                                </tr>
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
