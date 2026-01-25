import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import {
  DollarSign, TrendingUp, Users, Target, Clock, BookOpen,
  Building2, FileText, ArrowRight, PiggyBank, Award, BarChart3,
  GraduationCap, Heart, CheckCircle2, AlertCircle
} from "lucide-react";

interface LedgerMetrics {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  isbnArbitrageSurplus: number;
  reinvestableFunds: number;
  authorBreakdown: Array<{
    authorId: number;
    authorName: string;
    sponsorshipReceived: number;
    totalSpent: number;
    remaining: number;
  }>;
}

interface Foundation {
  id: number;
  name: string;
  contactPerson: string | null;
  totalGranted: number;
  grantCount: number;
  lastContact: {
    contactDate: string;
    contactMethod: string;
  } | null;
}

interface AuditorMetrics {
  totalApplications: number;
  totalApproved: number;
  statusDistribution: {
    pending: number;
    under_review: number;
    accepted: number;
    rejected: number;
    migrated: number;
    rescinded: number;
  };
  cohortHealth: {
    activeCohortLabel: string | null;
    activeCohortSize: number;
    totalCohorts: number;
    signedInActiveCohort: number;
  };
}

interface Grant {
  id: number;
  foundationName: string;
  amount: number;
  targetAuthorCount: number;
  grantDate: string;
  cohort: {
    id: number;
    label: string;
    currentCount: number;
  } | null;
  donorLockedAt: string | null;
}

const ISBN_ARBITRAGE_PER_AUTHOR = 11925; // $119.25 in cents
const SPONSORSHIP_PER_AUTHOR = 77700; // $777 in cents
const TOTAL_HOURS_GOAL = 2400;

export default function Outcomes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"financials" | "impact" | "grants">("financials");
  const [ledgerMetrics, setLedgerMetrics] = useState<LedgerMetrics | null>(null);
  const [foundations, setFoundations] = useState<Foundation[]>([]);
  const [auditorMetrics, setAuditorMetrics] = useState<AuditorMetrics | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock impact data - in production, this would come from a dedicated API
  const impactData = {
    averageEflGain: 2.3,
    totalHoursLogged: 1847,
    completionRate: 78,
    familyPactHours: 342,
    studentsServed: 24,
  };

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "board_member" && user.role !== "auditor")) {
      setLocation("/");
      return;
    }
    fetchData();
  }, [user, setLocation]);

  const fetchData = async () => {
    try {
      const [ledgerRes, foundationsRes, auditorRes, grantsRes] = await Promise.all([
        fetch("/api/admin/ledger", { credentials: "include" }),
        fetch("/api/admin/grants/foundations", { credentials: "include" }),
        fetch("/api/auditor/metrics", { credentials: "include" }),
        fetch("/api/admin/grants", { credentials: "include" }),
      ]);

      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setLedgerMetrics(data?.metrics || null);
      }

      if (foundationsRes.ok) {
        const data = await foundationsRes.json();
        setFoundations(Array.isArray(data) ? data : []);
      }

      if (auditorRes.ok) {
        const data = await auditorRes.json();
        setAuditorMetrics(data);
      }

      if (grantsRes.ok) {
        const data = await grantsRes.json();
        setGrants(Array.isArray(data?.grants) ? data.grants : []);
      }
    } catch (error) {
      console.error("Failed to fetch outcomes data:", error);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!user || (user.role !== "admin" && user.role !== "board_member" && user.role !== "auditor")) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const totalAuthors = auditorMetrics?.totalApproved || 0;
  const hoursProgress = (impactData.totalHoursLogged / TOTAL_HOURS_GOAL) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Impact Engine</h1>
          </div>
          <p className="text-gray-600">
            Executive dashboard for financial outcomes and program impact
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
          <button
            onClick={() => setActiveTab("financials")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === "financials"
                ? "bg-teal-500 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Financials
          </button>
          <button
            onClick={() => setActiveTab("impact")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === "impact"
                ? "bg-teal-500 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Impact Reports
          </button>
          <button
            onClick={() => setActiveTab("grants")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === "grants"
                ? "bg-teal-500 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Grant Management
          </button>
        </div>

        {/* Financials Tab */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-amber-200 rounded-xl">
                    <PiggyBank className="w-6 h-6 text-amber-700" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-amber-700">
                  {formatCurrency(ISBN_ARBITRAGE_PER_AUTHOR)}
                </p>
                <p className="text-amber-800 font-medium mt-1">ISBN Arbitrage / Author</p>
                <p className="text-sm text-amber-600 mt-2">
                  $125 list - $5.75 cost = surplus
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-blue-200 rounded-xl">
                    <Users className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-blue-700">
                  {formatCurrency(SPONSORSHIP_PER_AUTHOR)}
                </p>
                <p className="text-blue-800 font-medium mt-1">Per-Capita Cost</p>
                <p className="text-sm text-blue-600 mt-2">
                  Full sponsorship per author
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-green-200 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-green-700" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-green-700">
                  {formatCurrency(ledgerMetrics?.totalIncome || 0)}
                </p>
                <p className="text-green-800 font-medium mt-1">Total Sponsorships</p>
                <p className="text-sm text-green-600 mt-2">
                  All incoming funds
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-purple-200 rounded-xl">
                    <Award className="w-6 h-6 text-purple-700" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-purple-700">
                  {formatCurrency(ledgerMetrics?.reinvestableFunds || 0)}
                </p>
                <p className="text-purple-800 font-medium mt-1">Reinvestable Surplus</p>
                <p className="text-sm text-purple-600 mt-2">
                  Available for growth
                </p>
              </div>
            </div>

            {/* Ledger Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  Ledger Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Total Income</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(ledgerMetrics?.totalIncome || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Total Expenses</span>
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(ledgerMetrics?.totalExpenses || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-900 font-medium">Net Balance</span>
                    <span className={`text-2xl font-bold ${(ledgerMetrics?.netBalance || 0) >= 0 ? "text-teal-600" : "text-red-600"}`}>
                      {formatCurrency(ledgerMetrics?.netBalance || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  Author Economics
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Authors Served</span>
                    <span className="text-xl font-bold text-gray-900">{totalAuthors}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Total ISBN Surplus</span>
                    <span className="text-xl font-bold text-amber-600">
                      {formatCurrency(totalAuthors * ISBN_ARBITRAGE_PER_AUTHOR)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600">Avg Cost/Author</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(SPONSORSHIP_PER_AUTHOR)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Impact Reports Tab */}
        {activeTab === "impact" && (
          <div className="space-y-6">
            {/* Zero-PII Notice */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-green-800 font-medium">Zero-PII Reporting Mode</p>
                <p className="text-green-700 text-sm">
                  All metrics are aggregated. No personally identifiable information is displayed.
                </p>
              </div>
            </div>

            {/* Impact KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-teal-100 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900">+{impactData.averageEflGain}</p>
                <p className="text-gray-600 font-medium mt-1">Avg EFL Gain</p>
                <p className="text-sm text-gray-500 mt-2">TABE score improvement</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900">{impactData.studentsServed}</p>
                <p className="text-gray-600 font-medium mt-1">Students Served</p>
                <p className="text-sm text-gray-500 mt-2">Current program cohort</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900">{impactData.completionRate}%</p>
                <p className="text-gray-600 font-medium mt-1">Completion Rate</p>
                <p className="text-sm text-gray-500 mt-2">Program milestone achievement</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-pink-100 rounded-xl">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900">{impactData.familyPactHours}</p>
                <p className="text-gray-600 font-medium mt-1">Family PACT Hours</p>
                <p className="text-sm text-gray-500 mt-2">Guardian engagement time</p>
              </div>
            </div>

            {/* 2,400-Hour Goal Tracker */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-600" />
                2,400-Hour Annual Goal Tracker
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Progress to Goal</span>
                  <span className="text-lg font-bold text-gray-900">
                    {impactData.totalHoursLogged.toLocaleString()} / {TOTAL_HOURS_GOAL.toLocaleString()} hours
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-teal-400 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                    style={{ width: `${Math.min(hoursProgress, 100)}%` }}
                  >
                    {hoursProgress >= 15 && (
                      <span className="text-white text-sm font-medium">
                        {Math.round(hoursProgress)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {(TOTAL_HOURS_GOAL - impactData.totalHoursLogged).toLocaleString()} hours remaining
                  </span>
                  <span className={`font-medium ${hoursProgress >= 75 ? "text-green-600" : hoursProgress >= 50 ? "text-amber-600" : "text-gray-600"}`}>
                    {hoursProgress >= 100 ? "Goal Achieved! 🎉" : hoursProgress >= 75 ? "On Track" : hoursProgress >= 50 ? "Progressing" : "Building Momentum"}
                  </span>
                </div>
              </div>
            </div>

            {/* Impact Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                  TABE Gain Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "3+ Grade Levels", percent: 25, color: "bg-green-500" },
                    { label: "2-3 Grade Levels", percent: 35, color: "bg-teal-500" },
                    { label: "1-2 Grade Levels", percent: 30, color: "bg-blue-500" },
                    { label: "< 1 Grade Level", percent: 10, color: "bg-gray-400" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium text-gray-900">{item.percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${item.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-600" />
                  Hours Breakdown
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Classroom Instruction</span>
                    <span className="font-bold text-gray-900">1,245 hrs</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Writing Workshop</span>
                    <span className="font-bold text-gray-900">420 hrs</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Family PACT Sessions</span>
                    <span className="font-bold text-gray-900">{impactData.familyPactHours} hrs</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">Independent Study</span>
                    <span className="font-bold text-gray-900">182 hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grant Management Tab */}
        {activeTab === "grants" && (
          <div className="space-y-6">
            {/* Grant KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <Building2 className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900">{foundations.length}</p>
                <p className="text-gray-600 font-medium mt-1">Active Foundations</p>
                <p className="text-sm text-gray-500 mt-2">In CRM pipeline</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900">
                  {formatCurrency(foundations.reduce((sum, f) => sum + (f.totalGranted || 0), 0))}
                </p>
                <p className="text-gray-600 font-medium mt-1">Total Granted</p>
                <p className="text-sm text-gray-500 mt-2">All-time funding received</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <FileText className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900">{grants.length}</p>
                <p className="text-gray-600 font-medium mt-1">Active Grants</p>
                <p className="text-sm text-gray-500 mt-2">With cohort assignments</p>
              </div>
            </div>

            {/* Foundation CRM Overview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  Foundation CRM Overview
                </h3>
                <button
                  onClick={() => setLocation("/grants")}
                  className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  View Full Grants Page
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Foundation
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Granted
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grants
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {foundations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No foundations in CRM yet
                        </td>
                      </tr>
                    ) : (
                      foundations.slice(0, 5).map((foundation) => (
                        <tr key={foundation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{foundation.name}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {foundation.contactPerson || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-green-600">
                              {formatCurrency(foundation.totalGranted || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {foundation.grantCount || 0}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {foundation.lastContact
                              ? formatDate(foundation.lastContact.contactDate)
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Grants with Cohort Assignments */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-teal-600" />
                  Active Grants & Cohort Assignments
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {grants.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No active grants yet
                  </div>
                ) : (
                  grants.slice(0, 5).map((grant) => (
                    <div key={grant.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{grant.foundationName}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(grant.grantDate)} · Target: {grant.targetAuthorCount} authors
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(grant.amount)}
                          </p>
                          {grant.cohort ? (
                            <span className="inline-flex items-center px-2 py-1 mt-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                              {grant.cohort.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 mt-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                      {grant.donorLockedAt && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                          <AlertCircle className="w-3 h-3" />
                          Locked on {formatDate(grant.donorLockedAt)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              {grants.length > 5 && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={() => setLocation("/grants")}
                    className="w-full text-center text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    View all {grants.length} grants
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Link Card */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Full Grant Management</h3>
                  <p className="text-teal-100 mt-1">
                    Access complete foundation CRM, solicitation logs, and grant programs
                  </p>
                </div>
                <button
                  onClick={() => setLocation("/grants")}
                  className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-colors flex items-center gap-2"
                >
                  Go to Grants
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
