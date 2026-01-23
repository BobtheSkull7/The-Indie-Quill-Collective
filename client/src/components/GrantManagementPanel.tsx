import { useState, useEffect } from "react";
import {
  Building2, Plus, Edit2, Archive, ExternalLink, Phone, Mail, User,
  Star, MapPin, Target, ChevronDown, ChevronUp, Search, Filter, X, Save, RefreshCw
} from "lucide-react";

interface Foundation {
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
  acceptanceCriteria: string | null;
  fitRank: number | null;
  status: string;
  createdAt: string;
  lastContact: {
    contactDate: string;
    contactMethod: string;
    response: string | null;
  } | null;
  totalGranted: number;
  grantCount: number;
}

const CATEGORIES = [
  "Literacy",
  "Poverty",
  "Technology",
  "Education",
  "Arts & Culture",
  "Youth Development",
  "Community Development",
  "Publishing",
  "Other"
];

const GEOGRAPHY_SCOPES = ["Local", "Regional", "National", "Global"];

const emptyFoundation = {
  name: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  contactRole: "",
  mission: "",
  website: "",
  notes: "",
  category: "",
  geographyScope: "",
  acceptanceCriteria: "",
  fitRank: 5,
  status: "active"
};

export default function GrantManagementPanel() {
  const [foundations, setFoundations] = useState<Foundation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFoundation, setEditingFoundation] = useState<Foundation | null>(null);
  const [formData, setFormData] = useState(emptyFoundation);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchFoundations();
  }, []);

  const fetchFoundations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/grants/foundations", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setFoundations(data);
      }
    } catch (error) {
      console.error("Failed to fetch foundations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingFoundation
        ? `/api/admin/grants/foundations/${editingFoundation.id}`
        : "/api/admin/grants/foundations";
      const method = editingFoundation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddModal(false);
        setEditingFoundation(null);
        setFormData(emptyFoundation);
        fetchFoundations();
      } else {
        alert("Failed to save foundation");
      }
    } catch (error) {
      console.error("Failed to save foundation:", error);
      alert("Failed to save foundation");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (foundation: Foundation) => {
    const newStatus = foundation.status === "active" ? "archived" : "active";
    try {
      const response = await fetch(`/api/admin/grants/foundations/${foundation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...foundation, status: newStatus }),
      });
      if (response.ok) {
        fetchFoundations();
      }
    } catch (error) {
      console.error("Failed to archive foundation:", error);
    }
  };

  const openEditModal = (foundation: Foundation) => {
    setEditingFoundation(foundation);
    setFormData({
      name: foundation.name,
      contactPerson: foundation.contactPerson || "",
      contactEmail: foundation.contactEmail || "",
      contactPhone: foundation.contactPhone || "",
      contactRole: foundation.contactRole || "",
      mission: foundation.mission || "",
      website: foundation.website || "",
      notes: foundation.notes || "",
      category: foundation.category || "",
      geographyScope: foundation.geographyScope || "",
      acceptanceCriteria: foundation.acceptanceCriteria || "",
      fitRank: foundation.fitRank || 5,
      status: foundation.status,
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingFoundation(null);
    setFormData(emptyFoundation);
    setShowAddModal(true);
  };

  const filteredFoundations = foundations
    .filter((f) => showArchived || f.status === "active")
    .filter((f) => !categoryFilter || f.category === categoryFilter)
    .filter((f) =>
      searchQuery === "" ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.contactPerson && f.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => (b.fitRank || 0) - (a.fitRank || 0));

  const getRankColor = (rank: number | null) => {
    if (!rank) return "bg-gray-100 text-gray-600";
    if (rank >= 8) return "bg-green-100 text-green-700";
    if (rank >= 5) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Grant Management</h2>
          <p className="text-gray-500">Foundation CRM and Grant Prospect Tracking</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchFoundations}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Foundation
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search foundations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={categoryFilter || ""}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <span className="text-sm text-gray-600">Show Archived</span>
          </label>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          {filteredFoundations.length} foundation{filteredFoundations.length !== 1 ? "s" : ""} 
          {categoryFilter && ` in ${categoryFilter}`}
          {showArchived && " (including archived)"}
        </div>

        {filteredFoundations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No foundations found</p>
            <button
              onClick={openAddModal}
              className="mt-3 text-teal-600 hover:text-teal-700 font-medium"
            >
              Add your first foundation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFoundations.map((foundation) => (
              <div
                key={foundation.id}
                className={`border rounded-lg overflow-hidden ${
                  foundation.status === "archived" ? "opacity-60 bg-gray-50" : "bg-white"
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === foundation.id ? null : foundation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800">{foundation.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRankColor(foundation.fitRank)}`}>
                          <Star className="w-3 h-3 inline mr-1" />
                          {foundation.fitRank || "-"}/10
                        </span>
                        {foundation.category && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {foundation.category}
                          </span>
                        )}
                        {foundation.geographyScope && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {foundation.geographyScope}
                          </span>
                        )}
                        {foundation.status === "archived" && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        {foundation.contactPerson && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {foundation.contactPerson}
                            {foundation.contactRole && ` (${foundation.contactRole})`}
                          </span>
                        )}
                        {foundation.contactEmail && (
                          <a
                            href={`mailto:${foundation.contactEmail}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-teal-600 hover:text-teal-700"
                          >
                            <Mail className="w-3 h-3" />
                            {foundation.contactEmail}
                          </a>
                        )}
                        {foundation.website && (
                          <a
                            href={foundation.website.startsWith("http") ? foundation.website : `https://${foundation.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-teal-600 hover:text-teal-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {foundation.grantCount > 0 && (
                        <div className="text-right mr-4">
                          <p className="text-sm font-medium text-green-600">
                            ${(foundation.totalGranted / 100).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">{foundation.grantCount} grant{foundation.grantCount !== 1 ? "s" : ""}</p>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(foundation);
                        }}
                        className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(foundation);
                        }}
                        className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                        title={foundation.status === "active" ? "Archive" : "Restore"}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      {expandedId === foundation.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedId === foundation.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Mission</h4>
                        <p className="text-sm text-gray-600">{foundation.mission || "Not specified"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Acceptance Criteria</h4>
                        <p className="text-sm text-gray-600">{foundation.acceptanceCriteria || "Not specified"}</p>
                      </div>
                      {foundation.notes && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                          <p className="text-sm text-gray-600">{foundation.notes}</p>
                        </div>
                      )}
                      {foundation.contactPhone && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Phone</h4>
                          <a
                            href={`tel:${foundation.contactPhone}`}
                            className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {foundation.contactPhone}
                          </a>
                        </div>
                      )}
                      {foundation.lastContact && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Last Contact</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(foundation.lastContact.contactDate).toLocaleDateString()} via {foundation.lastContact.contactMethod}
                            {foundation.lastContact.response && ` - ${foundation.lastContact.response}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-slate-800">
                  {editingFoundation ? "Edit Foundation" : "Add New Foundation"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingFoundation(null);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foundation Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Foundation Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geography Scope</label>
                  <select
                    value={formData.geographyScope}
                    onChange={(e) => setFormData({ ...formData, geographyScope: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Scope</option>
                    {GEOGRAPHY_SCOPES.map((scope) => (
                      <option key={scope} value={scope}>{scope}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fit Rank (1-10) - Likelihood of Funding
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.fitRank}
                    onChange={(e) => setFormData({ ...formData, fitRank: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className={`px-3 py-1 rounded font-medium ${getRankColor(formData.fitRank)}`}>
                    {formData.fitRank}/10
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={formData.contactRole}
                      onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Program Officer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="contact@foundation.org"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="https://foundation.org"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mission Summary</label>
                <textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="Brief summary of the foundation's mission..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acceptance Criteria / Target Info
                </label>
                <textarea
                  value={formData.acceptanceCriteria}
                  onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="What they look for in grant applications..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingFoundation(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save Foundation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
