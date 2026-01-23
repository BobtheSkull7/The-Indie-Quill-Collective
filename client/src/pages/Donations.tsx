import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Heart, BookOpen, Users, Star, ArrowLeft, Gift, Sparkles, DollarSign, Loader2 } from "lucide-react";

const DONATION_TIERS = [
  {
    id: "micro",
    name: "Micro-Donation",
    range: "$1 - $25",
    description: "Buy a kid a notebook. Every dollar helps an emerging author take the next step.",
    icon: Gift,
    color: "teal",
    defaultAmount: 10,
    minAmount: 1,
    maxAmount: 25,
  },
  {
    id: "supporter",
    name: "Supporter",
    range: "$26 - $100",
    description: "Cover editing software, ISBN registration, or copyright filing fees for an author.",
    icon: Star,
    color: "blue",
    defaultAmount: 50,
    minAmount: 26,
    maxAmount: 100,
  },
  {
    id: "champion",
    name: "Champion",
    range: "$101 - $599",
    description: "Fund professional cover design, advanced editing, or marketing materials.",
    icon: Users,
    color: "purple",
    defaultAmount: 250,
    minAmount: 101,
    maxAmount: 599,
  },
  {
    id: "sponsor",
    name: "Author's Kit",
    range: "$600",
    description: "Sponsor one full publication cycle for a disadvantaged author. The complete journey from manuscript to published book.",
    icon: Sparkles,
    color: "amber",
    defaultAmount: 600,
    minAmount: 600,
    maxAmount: 600,
    featured: true,
  },
];

export default function Donations() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const selectedTierData = DONATION_TIERS.find(t => t.id === selectedTier);

  const handleTierSelect = (tierId: string) => {
    const tier = DONATION_TIERS.find(t => t.id === tierId);
    if (tier) {
      setSelectedTier(tierId);
      setCustomAmount(tier.defaultAmount);
    }
  };

  const handleDonate = async () => {
    if (!selectedTier || customAmount < 1) {
      setError("Please select a donation tier and amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/donations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(customAmount * 100),
          donorName,
          donorEmail,
          message,
          tier: selectedTier,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || "Failed to create checkout session");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
      teal: {
        bg: selected ? "bg-teal-50" : "bg-white",
        border: selected ? "border-teal-500" : "border-gray-200",
        text: "text-teal-600",
        accent: "bg-teal-500",
      },
      blue: {
        bg: selected ? "bg-blue-50" : "bg-white",
        border: selected ? "border-blue-500" : "border-gray-200",
        text: "text-blue-600",
        accent: "bg-blue-500",
      },
      purple: {
        bg: selected ? "bg-purple-50" : "bg-white",
        border: selected ? "border-purple-500" : "border-gray-200",
        text: "text-purple-600",
        accent: "bg-purple-500",
      },
      amber: {
        bg: selected ? "bg-amber-50" : "bg-white",
        border: selected ? "border-amber-500" : "border-gray-200",
        text: "text-amber-600",
        accent: "bg-amber-500",
      },
    };
    return colors[color] || colors.teal;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-teal-600 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Support Emerging Authors
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your donation directly funds the publishing journey of emerging authors who
            might otherwise never see their work in print.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {DONATION_TIERS.map((tier) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === tier.id;
            const colors = getColorClasses(tier.color, isSelected);

            return (
              <button
                key={tier.id}
                onClick={() => handleTierSelect(tier.id)}
                className={`relative p-6 rounded-xl border-2 transition-all text-left ${colors.bg} ${colors.border} ${
                  isSelected ? "shadow-lg scale-105" : "hover:shadow-md hover:scale-102"
                } ${tier.featured ? "ring-2 ring-amber-300" : ""}`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST IMPACT
                  </div>
                )}
                <div className={`w-12 h-12 rounded-lg ${colors.accent} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-800 mb-1">
                  {tier.name}
                </h3>
                <p className={`text-2xl font-bold ${colors.text} mb-3`}>{tier.range}</p>
                <p className="text-sm text-gray-600">{tier.description}</p>
                {isSelected && (
                  <div className={`absolute top-4 right-4 w-6 h-6 ${colors.accent} rounded-full flex items-center justify-center`}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedTier && selectedTierData && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-teal-600" />
              Complete Your Donation
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Donation Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (selectedTierData.id === "sponsor") {
                        setCustomAmount(600);
                      } else {
                        setCustomAmount(Math.max(selectedTierData.minAmount, Math.min(selectedTierData.maxAmount, val)));
                      }
                    }}
                    min={selectedTierData.minAmount}
                    max={selectedTierData.maxAmount}
                    disabled={selectedTierData.id === "sponsor"}
                    className="w-full pl-10 pr-4 py-3 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-50"
                  />
                </div>
                {selectedTierData.id !== "sponsor" && (
                  <p className="text-sm text-gray-500 mt-1">
                    Range: ${selectedTierData.minAmount} - ${selectedTierData.maxAmount}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (for receipt)
                  </label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share why you're supporting emerging authors..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleDonate}
                disabled={loading || customAmount < 1}
                className="w-full py-4 bg-teal-600 text-white text-lg font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5" />
                    Donate ${customAmount.toFixed(2)}
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Secure payment processed by Stripe. The Indie Quill Collective is a 501(c)(3) nonprofit.
                Your donation may be tax-deductible.
              </p>
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 mb-4">
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Where Your Money Goes</span>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-600 mb-2">$777</div>
              <p className="text-gray-600">Per-capita sponsorship covers the full publishing journey</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">$119.25</div>
              <p className="text-gray-600">ISBN Arbitrage Surplus reinvested per author</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">100%</div>
              <p className="text-gray-600">Of donations go directly to author services</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Questions? Reach out to{" "}
            <a
              href="mailto:Jon@theindiequill.com?subject=Donation Inquiry"
              className="text-teal-600 hover:text-teal-700 underline"
            >
              Jon@theindiequill.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
