import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Heart, CheckCircle, ArrowLeft, Loader2, Gift } from "lucide-react";

export default function DonationSuccess() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session_id");
  
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState<{
    success: boolean;
    amount: number;
    donorName: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/donations/verify/${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          setDonation(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your donation...</p>
        </div>
      </div>
    );
  }

  if (!donation?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Gift className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-800 mb-4">
            Donation Status Unknown
          </h1>
          <p className="text-gray-600 mb-8">
            We couldn't verify your donation. If you completed the payment, you should receive a confirmation email shortly.
          </p>
          <Link
            href="/donations"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Donations
          </Link>
        </div>
      </div>
    );
  }

  const amountFormatted = (donation.amount / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="relative">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <div className="absolute -top-2 -right-8 animate-bounce">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          </div>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">
          Thank You{donation.donorName && donation.donorName !== "Anonymous" ? `, ${donation.donorName}` : ""}!
        </h1>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-green-100">
          <p className="text-xl text-gray-700 mb-4">
            Your generous donation of
          </p>
          <p className="text-5xl font-bold text-teal-600 mb-4">
            ${amountFormatted}
          </p>
          <p className="text-gray-600">
            will directly support an emerging author on their publishing journey.
          </p>
        </div>

        <div className="bg-teal-50 rounded-xl p-6 mb-8 border border-teal-100">
          <h2 className="font-display text-lg font-bold text-slate-800 mb-2">
            What Happens Next?
          </h2>
          <ul className="text-left text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>A receipt has been sent to {donation.email || "your email"}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>Your donation is now part of the Author's Fund</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>An emerging author will benefit from your generosity</span>
            </li>
          </ul>
        </div>

        <p className="text-gray-500 mb-8 text-sm">
          The Indie Quill Collective is a registered 501(c)(3) nonprofit organization.
          Your donation may be tax-deductible. EIN available upon request.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Return Home
          </Link>
          <Link
            href="/donations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50"
          >
            <Heart className="w-4 h-4" />
            Donate Again
          </Link>
        </div>
      </div>
    </div>
  );
}
