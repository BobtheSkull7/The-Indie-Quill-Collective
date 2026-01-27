import { useState, useEffect } from "react";
import { Heart, DollarSign, Users, TrendingUp, Calendar, Lock } from "lucide-react";

interface Donation {
  id: number;
  donorInitial: string;
  donorEmoji: string;
  amount: number;
  donationDate: string;
  lockedToAuthorId: number | null;
  authorPseudonym: string | null;
  isRecurring: boolean;
}

interface DonationMetrics {
  totalDonations: number;
  totalDonated: number;
  lockedDonations: number;
  recurringDonors: number;
}

export default function DonationsContent() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [metrics, setMetrics] = useState<DonationMetrics>({
    totalDonations: 0,
    totalDonated: 0,
    lockedDonations: 0,
    recurringDonors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/donations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDonations(Array.isArray(data?.donations) ? data.donations : []);
        if (data?.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (error) {
      console.error("Failed to fetch donations data:", error);
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
            <Heart className="w-6 h-6 text-pink-500" />
            <h2 className="text-xl font-semibold text-slate-800">Donation Tracking</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Zero-PII donor impact reporting with author-to-donation locking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Heart className="w-4 h-4 text-pink-500" />
            Total Donations
          </div>
          <p className="text-2xl font-bold text-slate-800">{metrics.totalDonations}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            Total Donated
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalDonated)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Lock className="w-4 h-4 text-purple-500" />
            Locked to Authors
          </div>
          <p className="text-2xl font-bold text-purple-600">{metrics.lockedDonations}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Recurring Donors
          </div>
          <p className="text-2xl font-bold text-blue-600">{metrics.recurringDonors}</p>
        </div>
      </div>

      {donations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Donations Yet</h3>
          <p className="text-gray-500">Donations will appear here as they are received.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Donor</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Locked To</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Recurring</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((donation) => (
                  <tr key={donation.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{donation.donorEmoji}</span>
                        <span className="font-medium text-slate-800">
                          {donation.donorInitial}.
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">
                      {formatCurrency(donation.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(donation.donationDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {donation.authorPseudonym ? (
                        <span className="flex items-center gap-1 text-purple-600">
                          <Lock className="w-4 h-4" />
                          {donation.authorPseudonym}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {donation.isRecurring ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          <TrendingUp className="w-3 h-3" />
                          Monthly
                        </span>
                      ) : (
                        <span className="text-gray-400">One-time</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-pink-50 rounded-xl border border-pink-200">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-pink-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-pink-900">Zero-PII Donor Display</h4>
            <p className="text-sm text-pink-800 mt-1">
              Donors are shown using Initial + Emoji format (e.g., "J. 🌟") to comply with privacy requirements while still allowing immutable impact tracking per author.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
