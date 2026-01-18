import { useState, useEffect } from "react";
import { BookOpen, Users, PenTool, Award, FileCheck, Heart } from "lucide-react";

interface ImpactMetrics {
  totalWordsProcessed: number;
  booksInPipeline: number;
  activeAuthors: number;
  publishedBooks: number;
  signedContracts: number;
  youthAuthorsSupported: number;
  lastUpdated: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default function ImpactWidget() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/public/impact');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        } else {
          setError('Unable to load metrics');
        }
      } catch (err) {
        setError('Unable to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <div className="animate-pulse flex items-center justify-center">
          <div className="h-4 w-32 bg-slate-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return null;
  }

  const impactItems = [
    {
      icon: PenTool,
      value: formatNumber(metrics.totalWordsProcessed),
      label: "Words Processed",
      color: "from-red-500 to-red-700",
    },
    {
      icon: BookOpen,
      value: metrics.booksInPipeline,
      label: "Books in Pipeline",
      color: "from-blue-500 to-blue-700",
    },
    {
      icon: Users,
      value: metrics.activeAuthors,
      label: "Active Authors",
      color: "from-green-500 to-green-700",
    },
    {
      icon: Award,
      value: metrics.publishedBooks,
      label: "Published",
      color: "from-purple-500 to-purple-700",
    },
    {
      icon: FileCheck,
      value: metrics.signedContracts,
      label: "Contracts Signed",
      color: "from-teal-500 to-teal-700",
    },
    {
      icon: Heart,
      value: metrics.youthAuthorsSupported,
      label: "Youth Authors",
      color: "from-pink-500 to-pink-700",
    },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <h3 className="font-display text-2xl font-bold text-white mb-2">
          Our Impact
        </h3>
        <p className="text-slate-300 text-sm">
          Real-time progress of The Indie Quill Collective
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {impactItems.map((item, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-colors"
          >
            <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {item.value}
            </div>
            <div className="text-xs text-slate-300">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-slate-400">
          Updated {new Date(metrics.lastUpdated).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
