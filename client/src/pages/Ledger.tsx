import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import {
  DollarSign, Plus, TrendingUp, TrendingDown, User,
  Calendar, FileText, ArrowUpRight, ArrowDownRight, PiggyBank
} from "lucide-react";

interface LedgerEntry {
  id: number;
  transactionDate: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string | null;
  linkedAuthorId: number | null;
  authorName: string | null;
  createdAt: string;
}

interface AuthorSpending {
  authorId: number;
  authorName: string;
  pseudonym: string | null;
  sponsorshipReceived: number;
  totalSpent: number;
  remaining: number;
  transactions: LedgerEntry[];
}

interface LedgerMetrics {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  isbnArbitrageSurplus: number;
  reinvestableFunds: number;
  authorBreakdown: AuthorSpending[];
}

const ISBN_LIST_PRICE = 12500; // $125 in cents
const ISBN_ACTUAL_COST = 575; // $5.75 in cents
const ISBN_ARBITRAGE = ISBN_LIST_PRICE - ISBN_ACTUAL_COST; // $119.25

const SPONSORSHIP_AMOUNT = 77700; // $777 in cents

export default function Ledger() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [metrics, setMetrics] = useState<LedgerMetrics | null>(null);
  const [authors, setAuthors] = useState<{ id: number; name: string; pseudonym: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorSpending | null>(null);

  const [newEntry, setNewEntry] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    type: "income" as "income" | "expense",
    amount: "",
    description: "",
    category: "",
    linkedAuthorId: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [entriesRes, authorsRes] = await Promise.all([
        fetch("/api/admin/ledger"),
        fetch("/api/admin/applications"),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(Array.isArray(data?.entries) ? data.entries : []);
        setMetrics(data?.metrics || null);
      }

      if (authorsRes.ok) {
        const appsData = await authorsRes.json();
        const appsArray = Array.isArray(appsData) ? appsData : [];
        const acceptedAuthors = appsArray
          .filter((app: any) => app.status === "accepted")
          .map((app: any) => ({
            id: app.id,
            name: `${app.firstName} ${app.lastName}`,
            pseudonym: app.pseudonym,
          }));
        setAuthors(acceptedAuthors);
      }
    } catch (error) {
      console.error("Failed to fetch ledger data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEntry,
          amount: Math.round(parseFloat(newEntry.amount) * 100),
          linkedAuthorId: newEntry.linkedAuthorId ? parseInt(newEntry.linkedAuthorId) : null,
        }),
      });

      if (res.ok) {
        setShowAddEntry(false);
        setNewEntry({
          transactionDate: new Date().toISOString().split("T")[0],
          type: "income",
          amount: "",
          description: "",
          category: "",
          linkedAuthorId: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-collective-teal"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Pilot Ledger</h1>
            <p className="text-gray-600 mt-1">
              Track $777 sponsorships and publishing costs
            </p>
          </div>
          <button
            onClick={() => setShowAddEntry(true)}
            className="flex items-center gap-2 px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-collective-teal/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">Total Income</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.totalIncome)}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm text-gray-600">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(metrics.totalExpenses)}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600">Net Balance</span>
              </div>
              <p className={`text-2xl font-bold ${metrics.netBalance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(metrics.netBalance)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 shadow-sm border border-amber-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-200 rounded-lg">
                  <PiggyBank className="w-5 h-5 text-amber-700" />
                </div>
                <span className="text-sm text-amber-800">Reinvestable Funds</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(metrics.reinvestableFunds)}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                ISBN Arbitrage: {formatCurrency(ISBN_ARBITRAGE)} per author
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {!entries || entries.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No transactions yet. Add your first sponsorship or expense.
                  </div>
                ) : (
                  (entries || []).map((entry) => (
                    <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            entry.type === "income" ? "bg-green-100" : "bg-red-100"
                          }`}>
                            {entry.type === "income" ? (
                              <ArrowUpRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{entry.description}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(entry.transactionDate).toLocaleDateString()}
                              {entry.category && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                    {entry.category}
                                  </span>
                                </>
                              )}
                              {entry.authorName && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <User className="w-3 h-3" />
                                  {entry.authorName}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={`font-semibold ${
                          entry.type === "income" ? "text-green-600" : "text-red-600"
                        }`}>
                          {entry.type === "income" ? "+" : "-"}
                          {formatCurrency(entry.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Author Spending</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Click to see sponsorship breakdown
                </p>
              </div>
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {!metrics?.authorBreakdown || metrics.authorBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No author sponsorships tracked yet.
                  </div>
                ) : (
                  (metrics.authorBreakdown || []).map((author) => (
                    <button
                      key={author.authorId}
                      onClick={() => setSelectedAuthor(author)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {author.authorName}
                          </p>
                          {author.pseudonym && (
                            <p className="text-sm text-gray-500">"{author.pseudonym}"</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Remaining: <span className={`font-semibold ${author.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(author.remaining)}
                            </span>
                          </p>
                          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                            <div
                              className="h-2 bg-collective-teal rounded-full"
                              style={{
                                width: `${Math.min(100, (author.totalSpent / author.sponsorshipReceived) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Unit Economics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Per Capita Sponsorship</span>
                  <span className="font-medium text-blue-900">{formatCurrency(SPONSORSHIP_AMOUNT)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">ISBN List Price</span>
                  <span className="font-medium text-blue-900">{formatCurrency(ISBN_LIST_PRICE)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">ISBN Actual Cost</span>
                  <span className="font-medium text-blue-900">{formatCurrency(ISBN_ACTUAL_COST)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between">
                  <span className="text-blue-700 font-medium">ISBN Arbitrage Surplus</span>
                  <span className="font-bold text-green-600">{formatCurrency(ISBN_ARBITRAGE)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showAddEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Transaction</h3>
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as "income" | "expense" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                  >
                    <option value="income">Income (Sponsorship)</option>
                    <option value="expense">Expense (ISBN, Copyright, etc.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                    placeholder="777.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    placeholder="Per Capita Sponsorship - Author Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newEntry.category}
                    onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                  >
                    <option value="">Select category...</option>
                    <option value="sponsorship">Sponsorship ($777)</option>
                    <option value="isbn">ISBN ($110)</option>
                    <option value="copyright">Copyright ($130)</option>
                    <option value="editing">Editing</option>
                    <option value="cover_design">Cover Design</option>
                    <option value="printing">Printing</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link to Author (Optional)
                  </label>
                  <select
                    value={newEntry.linkedAuthorId}
                    onChange={(e) => setNewEntry({ ...newEntry, linkedAuthorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                  >
                    <option value="">No linked author</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name} {author.pseudonym ? `(${author.pseudonym})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newEntry.transactionDate}
                    onChange={(e) => setNewEntry({ ...newEntry, transactionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-collective-teal focus:border-collective-teal"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEntry(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-collective-teal/90 transition-colors"
                  >
                    Add Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedAuthor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedAuthor.authorName}
                  {selectedAuthor.pseudonym && (
                    <span className="text-gray-500 font-normal"> "{selectedAuthor.pseudonym}"</span>
                  )}
                </h3>
                <button
                  onClick={() => setSelectedAuthor(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">Sponsorship</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(selectedAuthor.sponsorshipReceived)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600">Spent</p>
                  <p className="text-lg font-bold text-red-700">
                    {formatCurrency(selectedAuthor.totalSpent)}
                  </p>
                </div>
                <div className={`rounded-lg p-3 text-center ${selectedAuthor.remaining >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
                  <p className={`text-xs ${selectedAuthor.remaining >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                    Remaining
                  </p>
                  <p className={`text-lg font-bold ${selectedAuthor.remaining >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {formatCurrency(selectedAuthor.remaining)}
                  </p>
                </div>
              </div>

              <h4 className="font-medium text-gray-700 mb-2">Transactions</h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {!selectedAuthor.transactions || selectedAuthor.transactions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No transactions for this author yet.
                  </div>
                ) : (
                  (selectedAuthor.transactions || []).map((tx) => (
                    <div key={tx.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.transactionDate).toLocaleDateString()}
                          {tx.category && ` • ${tx.category}`}
                        </p>
                      </div>
                      <p className={`font-semibold ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setSelectedAuthor(null)}
                className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
