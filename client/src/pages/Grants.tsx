import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import {
  Building2, Phone, Mail, Globe, Calendar, DollarSign,
  Plus, ChevronDown, ChevronUp, MessageSquare, AlertTriangle,
  TrendingUp, Users, Lock, FileText, Target, Clock, Bell, ExternalLink
} from "lucide-react";

interface Foundation {
  id: number;
  name: string;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  mission: string | null;
  website: string | null;
  notes: string | null;
  lastContact: {
    contactDate: string;
    contactMethod: string;
    response: string | null;
  } | null;
  totalGranted: number;
  grantCount: number;
}

interface Grant {
  id: number;
  foundationId: number;
  foundationName: string;
  amount: number;
  targetAuthorCount: number;
  assignedCohortId: number | null;
  grantDate: string;
  grantPurpose: string | null;
  donorLockedAt: string | null;
  cohort: {
    id: number;
    label: string;
    currentCount: number;
  } | null;
  actualAuthorsServed: number;
  costPerAuthor: number;
  potentialAuthors: number;
  surplusAuthors: number;
  hasSurplus: boolean;
}

interface GrantsData {
  grants: Grant[];
  metrics: {
    costPerAuthor: number;
    totalAuthors: number;
    totalGrantsReceived: number;
  };
}

interface GrantProgram {
  id: number;
  foundationId: number;
  foundationName: string;
  programName: string;
  maxAmount: number;
  maxAmountFormatted: string;
  openDate: string | null;
  deadline: string | null;
  fundedItems: string | null;
  eligibilityNotes: string | null;
  twoYearRestriction: boolean;
  lastAwardedYear: number | null;
  applicationStatus: 'not_started' | 'preparing' | 'submitted' | 'awarded' | 'declined' | 'ineligible';
  applicationUrl: string | null;
  indieQuillAlignment: string | null;
  notes: string | null;
}

interface CalendarAlert {
  id: number;
  programId: number;
  programName: string;
  foundationName: string;
  alertType: string;
  daysBefore: number;
  alertDate: string;
  deadline: string | null;
  maxAmount: number | null;
}

export default function Grants() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [foundations, setFoundations] = useState<Foundation[]>([]);
  const [grantsData, setGrantsData] = useState<GrantsData | null>(null);
  const [programs, setPrograms] = useState<GrantProgram[]>([]);
  const [alerts, setAlerts] = useState<CalendarAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"foundations" | "grants" | "programs">("programs");
  const [expandedFoundation, setExpandedFoundation] = useState<number | null>(null);
  const [expandedProgram, setExpandedProgram] = useState<number | null>(null);
  const [showAddFoundation, setShowAddFoundation] = useState(false);
  const [showAddGrant, setShowAddGrant] = useState(false);
  const [showAddLog, setShowAddLog] = useState<number | null>(null);

  const [newFoundation, setNewFoundation] = useState({
    name: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    mission: "",
    website: "",
    notes: "",
  });

  const [newGrant, setNewGrant] = useState({
    foundationId: "",
    amount: "",
    targetAuthorCount: "",
    grantDate: new Date().toISOString().split("T")[0],
    grantPurpose: "",
  });

  const [newLog, setNewLog] = useState({
    contactDate: new Date().toISOString().split("T")[0],
    contactMethod: "email",
    purpose: "",
    response: "",
    notes: "",
  });

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "board_member")) {
      setLocation("/");
      return;
    }
    fetchData();
  }, [user, setLocation]);

  const fetchData = async () => {
    try {
      const [foundationsRes, grantsRes, programsRes, alertsRes] = await Promise.all([
        fetch("/api/admin/grants/foundations", { credentials: "include" }),
        fetch("/api/admin/grants", { credentials: "include" }),
        fetch("/api/admin/grants/programs", { credentials: "include" }),
        fetch("/api/admin/grants/alerts", { credentials: "include" }),
      ]);

      if (foundationsRes.ok) {
        const foundationsData = await foundationsRes.json();
        setFoundations(Array.isArray(foundationsData) ? foundationsData : []);
      }
      if (grantsRes.ok) {
        const grantsJson = await grantsRes.json();
        if (grantsJson && typeof grantsJson === 'object' && !grantsJson.error) {
          setGrantsData(grantsJson);
        }
      }
      if (programsRes.ok) {
        const programsData = await programsRes.json();
        setPrograms(Array.isArray(programsData) ? programsData : []);
      }
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFoundation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/grants/foundations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newFoundation),
      });

      if (res.ok) {
        setShowAddFoundation(false);
        setNewFoundation({ name: "", contactPerson: "", contactEmail: "", contactPhone: "", mission: "", website: "", notes: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add foundation:", error);
    }
  };

  const handleAddGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          foundationId: parseInt(newGrant.foundationId),
          amount: Math.round(parseFloat(newGrant.amount) * 100),
          targetAuthorCount: parseInt(newGrant.targetAuthorCount),
          grantDate: newGrant.grantDate,
          grantPurpose: newGrant.grantPurpose,
        }),
      });

      if (res.ok) {
        setShowAddGrant(false);
        setNewGrant({ foundationId: "", amount: "", targetAuthorCount: "", grantDate: new Date().toISOString().split("T")[0], grantPurpose: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add grant:", error);
    }
  };

  const handleAddLog = async (foundationId: number) => {
    try {
      const res = await fetch(`/api/admin/grants/foundations/${foundationId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newLog),
      });

      if (res.ok) {
        setShowAddLog(null);
        setNewLog({ contactDate: new Date().toISOString().split("T")[0], contactMethod: "email", purpose: "", response: "", notes: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add log:", error);
    }
  };

  const handleLockGrant = async (grantId: number) => {
    if (!confirm("Lock authors to this grant? This cannot be undone and will freeze the author list for donor reporting.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/grants/${grantId}/lock`, {
        method: "PUT",
        credentials: "include",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to lock grant:", error);
    }
  };

  const handleUpdateProgramStatus = async (programId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/grants/programs/${programId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ applicationStatus: status }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update program status:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      not_started: { bg: "bg-gray-100", text: "text-gray-700", label: "Not Started" },
      preparing: { bg: "bg-blue-100", text: "text-blue-700", label: "Preparing" },
      submitted: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Submitted" },
      awarded: { bg: "bg-green-100", text: "text-green-700", label: "Awarded" },
      declined: { bg: "bg-red-100", text: "text-red-700", label: "Declined" },
      ineligible: { bg: "bg-slate-100", text: "text-slate-500", label: "Ineligible" },
    };
    const badge = badges[status] || badges.not_started;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  if (!user || (user.role !== "admin" && user.role !== "board_member")) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-collective-teal"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Building2 className="w-8 h-8 text-collective-teal" />
            <h1 className="font-display text-3xl font-bold text-slate-800">
              Grant & Donor Logistics
            </h1>
          </div>
          <p className="text-gray-600">
            Track foundation relationships, solicitations, and grant allocations with efficiency metrics.
          </p>
        </div>

        {grantsData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Grants Received</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(grantsData.metrics.totalGrantsReceived)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Cost Per Author</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(grantsData.metrics.costPerAuthor)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-3">
                <Building2 className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Foundation Partners</p>
                  <p className="text-2xl font-bold text-slate-800">{foundations.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                onClick={() => setActiveTab("foundations")}
                className={`flex-1 px-6 py-4 text-sm font-medium ${
                  activeTab === "foundations"
                    ? "text-collective-teal border-b-2 border-collective-teal bg-teal-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                Foundation CRM
              </button>
              <button
                onClick={() => setActiveTab("grants")}
                className={`flex-1 px-6 py-4 text-sm font-medium ${
                  activeTab === "grants"
                    ? "text-collective-teal border-b-2 border-collective-teal bg-teal-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Grant Allocations
              </button>
              <button
                onClick={() => setActiveTab("programs")}
                className={`flex-1 px-6 py-4 text-sm font-medium ${
                  activeTab === "programs"
                    ? "text-collective-teal border-b-2 border-collective-teal bg-teal-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Grant Programs
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "foundations" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">Foundation Profiles</h2>
                  <button
                    onClick={() => setShowAddFoundation(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Foundation</span>
                  </button>
                </div>

                {showAddFoundation && (
                  <form onSubmit={handleAddFoundation} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Foundation Name *"
                        value={newFoundation.name}
                        onChange={(e) => setNewFoundation({ ...newFoundation, name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Contact Person"
                        value={newFoundation.contactPerson}
                        onChange={(e) => setNewFoundation({ ...newFoundation, contactPerson: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                      />
                      <input
                        type="email"
                        placeholder="Contact Email"
                        value={newFoundation.contactEmail}
                        onChange={(e) => setNewFoundation({ ...newFoundation, contactEmail: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                      />
                      <input
                        type="tel"
                        placeholder="Contact Phone"
                        value={newFoundation.contactPhone}
                        onChange={(e) => setNewFoundation({ ...newFoundation, contactPhone: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                      />
                      <input
                        type="url"
                        placeholder="Website"
                        value={newFoundation.website}
                        onChange={(e) => setNewFoundation({ ...newFoundation, website: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Mission/Focus Area"
                        value={newFoundation.mission}
                        onChange={(e) => setNewFoundation({ ...newFoundation, mission: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                      />
                    </div>
                    <textarea
                      placeholder="Notes"
                      value={newFoundation.notes}
                      onChange={(e) => setNewFoundation({ ...newFoundation, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent mb-4"
                      rows={2}
                    />
                    <div className="flex space-x-2">
                      <button type="submit" className="px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-teal-600">
                        Save Foundation
                      </button>
                      <button type="button" onClick={() => setShowAddFoundation(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {foundations.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No foundations added yet. Start building your CRM.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(foundations || []).map((foundation) => (
                      <div key={foundation.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedFoundation(expandedFoundation === foundation.id ? null : foundation.id)}
                          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <Building2 className="w-6 h-6 text-gray-400" />
                            <div className="text-left">
                              <h3 className="font-medium text-slate-800">{foundation.name}</h3>
                              <p className="text-sm text-gray-500">
                                {foundation.contactPerson || "No contact set"} | {foundation.grantCount} grants | {formatCurrency(foundation.totalGranted)} total
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {foundation.lastContact && (
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                foundation.lastContact.response === "funded" ? "bg-green-100 text-green-700" :
                                foundation.lastContact.response === "interested" ? "bg-blue-100 text-blue-700" :
                                foundation.lastContact.response === "declined" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {foundation.lastContact.response || "Pending"}
                              </span>
                            )}
                            {expandedFoundation === foundation.id ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {expandedFoundation === foundation.id && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                              {foundation.contactEmail && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  <span>{foundation.contactEmail}</span>
                                </div>
                              )}
                              {foundation.contactPhone && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{foundation.contactPhone}</span>
                                </div>
                              )}
                              {foundation.website && (
                                <a href={foundation.website} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-blue-600 hover:underline">
                                  <Globe className="w-4 h-4" />
                                  <span>Website</span>
                                </a>
                              )}
                            </div>
                            {foundation.mission && (
                              <p className="text-sm text-gray-600 mb-4">
                                <strong>Mission:</strong> {foundation.mission}
                              </p>
                            )}

                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-700">Contact Log</h4>
                              <button
                                onClick={() => setShowAddLog(showAddLog === foundation.id ? null : foundation.id)}
                                className="text-sm text-collective-teal hover:underline flex items-center space-x-1"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Log Contact</span>
                              </button>
                            </div>

                            {showAddLog === foundation.id && (
                              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                  <input
                                    type="date"
                                    value={newLog.contactDate}
                                    onChange={(e) => setNewLog({ ...newLog, contactDate: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                  <select
                                    value={newLog.contactMethod}
                                    onChange={(e) => setNewLog({ ...newLog, contactMethod: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="email">Email</option>
                                    <option value="phone">Phone</option>
                                    <option value="in-person">In-Person</option>
                                    <option value="letter">Letter</option>
                                  </select>
                                  <select
                                    value={newLog.response}
                                    onChange={(e) => setNewLog({ ...newLog, response: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="">Response Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="interested">Interested</option>
                                    <option value="declined">Declined</option>
                                    <option value="funded">Funded</option>
                                  </select>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Purpose of contact *"
                                  value={newLog.purpose}
                                  onChange={(e) => setNewLog({ ...newLog, purpose: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
                                  required
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleAddLog(foundation.id)}
                                    className="px-3 py-1.5 bg-collective-teal text-white rounded text-sm hover:bg-teal-600"
                                  >
                                    Save Log
                                  </button>
                                  <button
                                    onClick={() => setShowAddLog(null)}
                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {foundation.lastContact ? (
                              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Last contact: {new Date(foundation.lastContact.contactDate).toLocaleDateString()} via {foundation.lastContact.contactMethod}
                              </div>
                            ) : (
                              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span>No contact logged yet - avoid double-solicitation!</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "grants" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">Grant Allocations</h2>
                  <button
                    onClick={() => setShowAddGrant(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Grant</span>
                  </button>
                </div>

                {showAddGrant && (
                  <form onSubmit={handleAddGrant} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <select
                        value={newGrant.foundationId}
                        onChange={(e) => setNewGrant({ ...newGrant, foundationId: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                        required
                      >
                        <option value="">Select Foundation *</option>
                        {foundations.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount ($) *"
                        value={newGrant.amount}
                        onChange={(e) => setNewGrant({ ...newGrant, amount: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Target Author Count *"
                        value={newGrant.targetAuthorCount}
                        onChange={(e) => setNewGrant({ ...newGrant, targetAuthorCount: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                        required
                      />
                      <input
                        type="date"
                        value={newGrant.grantDate}
                        onChange={(e) => setNewGrant({ ...newGrant, grantDate: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent"
                        required
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Grant Purpose / Notes"
                      value={newGrant.grantPurpose}
                      onChange={(e) => setNewGrant({ ...newGrant, grantPurpose: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-transparent mb-4"
                    />
                    <div className="flex space-x-2">
                      <button type="submit" className="px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-teal-600">
                        Record Grant
                      </button>
                      <button type="button" onClick={() => setShowAddGrant(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {!grantsData || !Array.isArray(grantsData.grants) || grantsData.grants.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No grants recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {grantsData.grants.map((grant) => (
                      <div key={grant.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-slate-800">{grant.foundationName}</h3>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(grant.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(grant.grantDate).toLocaleDateString()} | Target: {grant.targetAuthorCount} authors
                            </p>
                          </div>
                          <div className="text-right">
                            {grant.hasSurplus && (
                              <div className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span>+{grant.surplusAuthors} Surplus Impact</span>
                              </div>
                            )}
                            {grant.donorLockedAt ? (
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Lock className="w-4 h-4" />
                                <span>Locked for Reporting</span>
                              </div>
                            ) : grant.cohort ? (
                              <button
                                onClick={() => handleLockGrant(grant.id)}
                                className="flex items-center space-x-1 text-sm text-collective-teal hover:underline"
                              >
                                <Lock className="w-4 h-4" />
                                <span>Lock for Donor Report</span>
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {grant.cohort && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Assigned to <strong>{grant.cohort.label}</strong> ({grant.cohort.currentCount} authors)
                              </span>
                              <a
                                href={`/api/admin/grants/${grant.id}/impact`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-blue-600 hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                <span>View Impact Report</span>
                              </a>
                            </div>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-3 gap-4 text-center text-sm bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="text-gray-500">Target</p>
                            <p className="font-semibold">{grant.targetAuthorCount} authors</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Potential</p>
                            <p className="font-semibold text-green-600">{grant.potentialAuthors} authors</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Cost/Author</p>
                            <p className="font-semibold">{formatCurrency(grant.costPerAuthor)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "programs" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">Grant Programs Pipeline</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Track deadlines and application status</span>
                  </div>
                </div>

                {alerts.length > 0 && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Bell className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-amber-800">Upcoming Deadlines</h3>
                    </div>
                    <div className="space-y-2">
                      {alerts.slice(0, 5).map((alert) => {
                        const daysUntil = getDaysUntil(alert.alertDate);
                        return (
                          <div key={alert.id} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium text-amber-900">{alert.programName}</span>
                              <span className="text-amber-700"> - {alert.foundationName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                daysUntil !== null && daysUntil <= 3 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {daysUntil !== null && daysUntil <= 0 ? "TODAY" : `${daysUntil} days`}
                              </span>
                              <span className="text-amber-600">{formatDate(alert.deadline)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {programs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No grant programs found. Add programs from the Foundation CRM tab.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {programs.map((program) => {
                      const daysUntilDeadline = getDaysUntil(program.deadline);
                      const daysUntilOpen = getDaysUntil(program.openDate);
                      const isOpen = daysUntilOpen !== null && daysUntilOpen <= 0;
                      const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline > 0;
                      const isPassed = daysUntilDeadline !== null && daysUntilDeadline < 0;

                      return (
                        <div
                          key={program.id}
                          className={`border rounded-lg overflow-hidden ${
                            program.applicationStatus === "ineligible" ? "bg-gray-50 border-gray-200" :
                            isUrgent ? "border-amber-300 bg-amber-50/30" :
                            isPassed ? "bg-gray-50 border-gray-200" :
                            "border-gray-200 bg-white"
                          }`}
                        >
                          <div
                            className="p-4 cursor-pointer"
                            onClick={() => setExpandedProgram(expandedProgram === program.id ? null : program.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="font-semibold text-slate-800">{program.programName}</h3>
                                  {program.twoYearRestriction && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">2-Year Rule</span>
                                  )}
                                  {program.notes?.includes("PRIMARY") && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">PRIMARY TARGET</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{program.foundationName}</p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-lg font-bold text-green-600">{program.maxAmountFormatted}</span>
                                {getStatusBadge(program.applicationStatus)}
                                {expandedProgram === program.id ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-6 mt-3 text-sm">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">Opens: {formatDate(program.openDate)}</span>
                                {isOpen && daysUntilOpen === 0 && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">OPEN NOW</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className={`${isUrgent ? "text-amber-700 font-medium" : isPassed ? "text-gray-400 line-through" : "text-gray-600"}`}>
                                  Deadline: {formatDate(program.deadline)}
                                </span>
                                {isUrgent && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                                    {daysUntilDeadline} days left
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {expandedProgram === program.id && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Funded Items</h4>
                                  <p className="text-sm text-gray-700">{program.fundedItems || "Not specified"}</p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Indie Quill Alignment</h4>
                                  <p className="text-sm text-gray-700">{program.indieQuillAlignment || "Not specified"}</p>
                                </div>
                              </div>

                              {program.eligibilityNotes && (
                                <div className="mb-4">
                                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Eligibility Notes</h4>
                                  <p className="text-sm text-gray-700">{program.eligibilityNotes}</p>
                                </div>
                              )}

                              {program.notes && (
                                <div className="mb-4">
                                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Strategic Notes</h4>
                                  <p className="text-sm text-gray-700">{program.notes}</p>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Update Status:</span>
                                  <select
                                    value={program.applicationStatus}
                                    onChange={(e) => handleUpdateProgramStatus(program.id, e.target.value)}
                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="not_started">Not Started</option>
                                    <option value="preparing">Preparing</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="awarded">Awarded</option>
                                    <option value="declined">Declined</option>
                                    <option value="ineligible">Ineligible</option>
                                  </select>
                                </div>
                                {program.applicationUrl && (
                                  <a
                                    href={program.applicationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1 text-sm text-blue-600 hover:underline"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Application Portal</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
