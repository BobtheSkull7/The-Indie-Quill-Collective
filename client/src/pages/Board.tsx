import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { 
  Users, FileText, CheckCircle, Clock, TrendingUp, 
  Calendar, DollarSign, Plus, X, Target, ChevronLeft, ChevronRight,
  AlertTriangle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface Stats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  migratedAuthors: number;
  signedContracts: number;
  pendingContracts: number;
  syncedToLLC: number;
  pendingSync: number;
  failedSync: number;
}

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  eventType: string;
  location: string | null;
}

interface FundraisingCampaign {
  id: number;
  name: string;
  description: string | null;
  goalAmount: number;
  currentAmount: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

interface Donation {
  id: number;
  campaignId: number | null;
  donorName: string;
  donorEmail: string | null;
  amount: number;
  isAnonymous: boolean;
  notes: string | null;
  donatedAt: string;
  campaignName?: string;
}

export default function Board() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "fundraising">("overview");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    allDay: false,
    eventType: "meeting",
    location: ""
  });

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    goalAmount: "",
    startDate: "",
    endDate: ""
  });

  const [newDonation, setNewDonation] = useState({
    campaignId: "",
    donorName: "",
    donorEmail: "",
    amount: "",
    isAnonymous: false,
    notes: ""
  });

  useEffect(() => {
    if (!user || user.role !== "board_member") {
      setLocation("/dashboard");
      return;
    }
    loadData();
  }, [user, setLocation]);

  const loadData = async () => {
    try {
      const [statsData, eventsData, campaignsData, donationsData] = await Promise.all([
        fetch("/api/board/stats").then((r) => r.json()),
        fetch("/api/board/calendar").then((r) => r.json()),
        fetch("/api/board/campaigns").then((r) => r.json()),
        fetch("/api/board/donations").then((r) => r.json()),
      ]);
      if (statsData && typeof statsData === 'object' && !statsData.error) {
        setStats(statsData);
      }
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      setDonations(Array.isArray(donationsData) ? donationsData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDateTime = newEvent.allDay 
        ? new Date(newEvent.startDate).toISOString()
        : new Date(`${newEvent.startDate}T${newEvent.startTime}`).toISOString();
      
      const endDateTime = newEvent.endDate 
        ? (newEvent.allDay 
            ? new Date(newEvent.endDate).toISOString()
            : new Date(`${newEvent.endDate}T${newEvent.endTime || "23:59"}`).toISOString())
        : null;

      const res = await fetch("/api/board/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description || null,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay: newEvent.allDay,
          eventType: newEvent.eventType,
          location: newEvent.location || null
        }),
      });

      if (res.ok) {
        await loadData();
        setShowEventModal(false);
        setNewEvent({
          title: "",
          description: "",
          startDate: "",
          startTime: "",
          endDate: "",
          endTime: "",
          allDay: false,
          eventType: "meeting",
          location: ""
        });
      }
    } catch (error) {
      console.error("Failed to add event:", error);
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/board/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaign.name,
          description: newCampaign.description || null,
          goalAmount: parseInt(newCampaign.goalAmount) * 100,
          startDate: new Date(newCampaign.startDate).toISOString(),
          endDate: newCampaign.endDate ? new Date(newCampaign.endDate).toISOString() : null
        }),
      });

      if (res.ok) {
        await loadData();
        setShowCampaignModal(false);
        setNewCampaign({
          name: "",
          description: "",
          goalAmount: "",
          startDate: "",
          endDate: ""
        });
      }
    } catch (error) {
      console.error("Failed to add campaign:", error);
    }
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/board/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: newDonation.campaignId ? parseInt(newDonation.campaignId) : null,
          donorName: newDonation.donorName,
          donorEmail: newDonation.donorEmail || null,
          amount: parseInt(newDonation.amount) * 100,
          isAnonymous: newDonation.isAnonymous,
          notes: newDonation.notes || null
        }),
      });

      if (res.ok) {
        await loadData();
        setShowDonationModal(false);
        setNewDonation({
          campaignId: "",
          donorName: "",
          donorEmail: "",
          amount: "",
          isAnonymous: false,
          notes: ""
        });
      }
    } catch (error) {
      console.error("Failed to add donation:", error);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      meeting: "bg-blue-500",
      event: "bg-purple-500",
      deadline: "bg-red-500",
      fundraiser: "bg-green-500",
      other: "bg-gray-500"
    };
    return colors[type] || colors.other;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const totalDonations = (donations || []).reduce((sum, d) => sum + d.amount, 0);
  const totalGoal = (campaigns || []).filter(c => c.isActive).reduce((sum, c) => sum + c.goalAmount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-slate-800 mb-8">Board Dashboard</h1>

        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "calendar"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("fundraising")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "fundraising"
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Fundraising
          </button>
        </div>

        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalApplications}</p>
                    <p className="text-xs text-gray-500">Total Apps</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.pendingApplications}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.syncedToLLC}</p>
                    <p className="text-xs text-gray-500">Synced to LLC</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.migratedAuthors}</p>
                    <p className="text-xs text-gray-500">Migrated</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.pendingSync}</p>
                    <p className="text-xs text-gray-500">Pending Sync</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.failedSync}</p>
                    <p className="text-xs text-gray-500">Failed Sync</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="font-display text-xl font-semibold text-slate-800 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-red-500" />
                  Upcoming Events
                </h2>
                {events.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No upcoming events</p>
                ) : (
                  <div className="space-y-3">
                    {(events || []).slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-3 h-3 rounded-full mt-1.5 ${getEventTypeColor(event.eventType)}`} />
                        <div>
                          <p className="font-medium text-slate-800">{event.title}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(event.startDate), "MMM d, yyyy")}
                            {!event.allDay && ` at ${format(new Date(event.startDate), "h:mm a")}`}
                          </p>
                          {event.location && (
                            <p className="text-xs text-gray-400">{event.location}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2 className="font-display text-xl font-semibold text-slate-800 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                  Fundraising Summary
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total Raised</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDonations)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Active Campaigns Goal</p>
                      <p className="text-lg font-semibold text-gray-700">{formatCurrency(totalGoal)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Active Campaigns</p>
                    {(campaigns || []).filter(c => c.isActive).slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{campaign.name}</span>
                          <span className="text-gray-500">
                            {formatCurrency(campaign.currentAmount)} / {formatCurrency(campaign.goalAmount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="font-display text-xl font-semibold text-slate-800">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setShowEventModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg" />
              ))}
              {getDaysInMonth().map((day) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`h-24 p-2 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${
                      isToday ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                    onClick={() => {
                      setSelectedDate(day);
                      setNewEvent(prev => ({ ...prev, startDate: format(day, "yyyy-MM-dd") }));
                      setShowEventModal(true);
                    }}
                  >
                    <p className={`text-sm font-medium ${isToday ? "text-red-500" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </p>
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs text-white px-1 py-0.5 rounded truncate ${getEventTypeColor(event.eventType)}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-xs text-gray-400">+{dayEvents.length - 2} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Meeting</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Event</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Deadline</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Fundraiser</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fundraising" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{formatCurrency(totalDonations)}</p>
                <p className="text-sm opacity-80">Total Raised</p>
              </div>
              <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <Target className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{formatCurrency(totalGoal)}</p>
                <p className="text-sm opacity-80">Active Campaign Goals</p>
              </div>
              <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <Users className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{donations.length}</p>
                <p className="text-sm opacity-80">Total Donations</p>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-slate-800">Campaigns</h2>
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Campaign</span>
                </button>
              </div>

              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No campaigns yet</p>
              ) : (
                <div className="space-y-4">
                  {(campaigns || []).map((campaign) => (
                    <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-800">{campaign.name}</h3>
                          {campaign.description && (
                            <p className="text-sm text-gray-500">{campaign.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${campaign.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {campaign.isActive ? "Active" : "Ended"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          {formatCurrency(campaign.currentAmount)} / {formatCurrency(campaign.goalAmount)}
                          ({Math.round((campaign.currentAmount / campaign.goalAmount) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Started: {format(new Date(campaign.startDate), "MMM d, yyyy")}
                        {campaign.endDate && ` - Ends: ${format(new Date(campaign.endDate), "MMM d, yyyy")}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-slate-800">Recent Donations</h2>
                <button
                  onClick={() => setShowDonationModal(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Donation</span>
                </button>
              </div>

              {donations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No donations recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Donor</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(donations || []).map((donation) => (
                        <tr key={donation.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">
                              {donation.isAnonymous ? "Anonymous" : donation.donorName}
                            </p>
                            {!donation.isAnonymous && donation.donorEmail && (
                              <p className="text-xs text-gray-500">{donation.donorEmail}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-green-600">
                            {formatCurrency(donation.amount)}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {donation.campaignName || "General Fund"}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-sm">
                            {format(new Date(donation.donatedAt), "MMM d, yyyy")}
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

        {showEventModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-800">Add Event</h2>
                <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  {!newEvent.allDay && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                        className="input"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                    <input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  {!newEvent.allDay && newEvent.endDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        className="input"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={newEvent.allDay}
                    onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="allDay" className="text-sm text-gray-700">All day event</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={newEvent.eventType}
                    onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                    className="input"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="event">Event</option>
                    <option value="deadline">Deadline</option>
                    <option value="fundraiser">Fundraiser</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="input"
                  />
                </div>
                <button type="submit" className="btn-primary w-full">Add Event</button>
              </form>
            </div>
          </div>
        )}

        {showCampaignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-800">New Campaign</h2>
                <button onClick={() => setShowCampaignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddCampaign} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal Amount ($)</label>
                  <input
                    type="number"
                    value={newCampaign.goalAmount}
                    onChange={(e) => setNewCampaign({ ...newCampaign, goalAmount: e.target.value })}
                    className="input"
                    min="1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                    <input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full">Create Campaign</button>
              </form>
            </div>
          </div>
        )}

        {showDonationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-800">Record Donation</h2>
                <button onClick={() => setShowDonationModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddDonation} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign (optional)</label>
                  <select
                    value={newDonation.campaignId}
                    onChange={(e) => setNewDonation({ ...newDonation, campaignId: e.target.value })}
                    className="input"
                  >
                    <option value="">General Fund</option>
                    {(campaigns || []).filter(c => c.isActive).map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name</label>
                  <input
                    type="text"
                    value={newDonation.donorName}
                    onChange={(e) => setNewDonation({ ...newDonation, donorName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Donor Email (optional)</label>
                  <input
                    type="email"
                    value={newDonation.donorEmail}
                    onChange={(e) => setNewDonation({ ...newDonation, donorEmail: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={newDonation.amount}
                    onChange={(e) => setNewDonation({ ...newDonation, amount: e.target.value })}
                    className="input"
                    min="1"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={newDonation.isAnonymous}
                    onChange={(e) => setNewDonation({ ...newDonation, isAnonymous: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="anonymous" className="text-sm text-gray-700">Anonymous donation</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={newDonation.notes}
                    onChange={(e) => setNewDonation({ ...newDonation, notes: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <button type="submit" className="btn-primary w-full">Record Donation</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
