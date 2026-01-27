import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, User, Plus } from "lucide-react";

interface LedgerEntry {
  id: number;
  transactionDate: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string | null;
  linkedAuthorId: number | null;
  authorName: string | null;
}

interface AuthorSpending {
  authorId: number;
  authorName: string;
  pseudonym: string | null;
  sponsorshipReceived: number;
  totalSpent: number;
  remaining: number;
}

interface LedgerMetrics {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  isbnArbitrageSurplus: number;
  reinvestableFunds: number;
  authorBreakdown: AuthorSpending[];
}

const ISBN_ARBITRAGE = 11925; // $119.25 in cents
const SPONSORSHIP_AMOUNT = 77700; // $777 in cents

export default function LedgerContent() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [metrics, setMetrics] = useState<LedgerMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/ledger", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data?.entries) ? data.entries : []);
        setMetrics(data?.metrics || null);
      }
    } catch (error) {
      console.error("Failed to fetch ledger data:", error);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-slate-800">Manual Ledger</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Track $777 per-capita sponsorships and ISBN arbitrage surplus
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Total Income
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(metrics?.totalIncome || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Total Expenses
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(metrics?.totalExpenses || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Net Balance
          </div>
          <p className={`text-2xl font-bold ${(metrics?.netBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(metrics?.netBalance || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <PiggyBank className="w-4 h-4 text-purple-500" />
            ISBN Arbitrage
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(metrics?.isbnArbitrageSurplus || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">$119.25/author reinvestable</p>
        </div>
      </div>

      {metrics?.authorBreakdown && metrics.authorBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Author Spending Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Author</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Sponsorship</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Spent</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {metrics.authorBreakdown.map((author) => (
                  <tr key={author.authorId} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{author.pseudonym || author.authorName}</p>
                    </td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {formatCurrency(author.sponsorshipReceived)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      {formatCurrency(author.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(author.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
        </div>
        
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    entry.type === "income" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {entry.type === "income" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{entry.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.transactionDate).toLocaleDateString()}
                      {entry.authorName && ` • ${entry.authorName}`}
                    </p>
                  </div>
                </div>
                <p className={`font-bold ${entry.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
